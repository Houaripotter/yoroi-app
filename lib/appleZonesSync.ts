/**
 * Zones Apple Sante automatiques pour chaque utilisateur (iOS 27), cote effets (14 octobre 2026, agent ios27).
 * La logique (qui gagne, quand relire, comment fusionner) est pure : lib/v2/seances/appleZonesSync.ts.
 *
 *  - syncAppleZones : lit tes zones dans Sante (HKHealthStore.preferredWorkoutZoneConfiguration) et les met
 *    comme zones actives, sauf si tu as saisi les tiennes a la main. A la connexion a Sante (force), puis au
 *    plus une fois par jour a chaque synchronisation.
 *  - backfillAppleZones : complete en tache de fond, par petits lots, les seances deja importees avec les
 *    temps par zone d'Apple (HKWorkout.zoneGroupsByType). Cache versionne : chaque seance n'est lue qu'une fois.
 *  - refreshTrainingAppleZones : la meme chose pour une seance, a son ouverture.
 *
 * iOS seulement : sur Android et le web, chaque fonction rend la main sans rien appeler (le calcul estime reste).
 * Avant iOS 27, le module natif repond ios27 false : rien n'est ecrit.
 */
import { DeviceEventEmitter, Platform } from 'react-native';
import { logger } from '@/lib/security/logger';
import { getUserSettings, saveUserSettings } from '@/lib/storage';
import { getTrainings, linkTrainingHealthKitUUID, updateTrainingDetails } from '@/lib/database';
import type { Training } from '@/lib/database';
import { getAppleWorkoutExtrasNative, getApplePreferredHeartRateZonesNative, getNativeWorkouts } from '@/lib/yoroiHealthKit';
import { parseAppleZones } from '@/lib/v2/seances/appleExtras';
import { backfillCandidates, decideZonesSync, matchWatchWorkout, mergeAppleZones, needsAppleZonesCheck, parseZoneTimes } from '@/lib/v2/seances/appleZonesSync';
import type { AppleZonesCheck, AppleZoneTimes } from '@/lib/v2/seances/appleZonesSync';
import type { AppleWorkoutExtras } from '@/lib/yoroiHealthKit';
import { ZONE_COLORS } from '@/lib/hrZones';

// Meme valeur que DATA_CHANGED_EVENT (lib/v2/useWeightData), sans importer ce module de hooks
const DATA_CHANGED_EVENT = 'YOROI_DATA_CHANGED';

/** Emis quand tes zones actives viennent de changer (nouvelles zones d'Apple). */
export const APPLE_ZONES_CHANGED_EVENT = 'YOROI_APPLE_ZONES_CHANGED';

export type AppleZonesSyncResult = 'ecrit' | 'inchange' | 'manuel' | 'deja_verifie' | 'indisponible';

let syncing: Promise<AppleZonesSyncResult> | null = null;

export function syncAppleZones(opts: { force?: boolean } = {}): Promise<AppleZonesSyncResult> {
  if (Platform.OS !== 'ios') return Promise.resolve('indisponible');
  if (syncing) return syncing;
  syncing = (async (): Promise<AppleZonesSyncResult> => {
    try {
      const settings = await getUserSettings();
      const meta = settings.heartRateZonesMeta ?? null;
      const current = settings.heartRateZones ?? null;
      const now = new Date();
      // Deja verifie aujourd'hui : on n'appelle meme pas Sante
      const pre = decideZonesSync({ current, meta, apple: null, now, force: opts.force });
      if (pre.kind === 'skip' && pre.reason === 'deja_verifie') return 'deja_verifie';
      const pref = await getApplePreferredHeartRateZonesNative();
      const apple = pref.ios27 ? parseAppleZones(pref) : null;
      const d = decideZonesSync({ current, meta, apple, now, force: opts.force });
      if (d.kind === 'write') {
        await saveUserSettings({ heartRateZones: d.zones, heartRateZonesMeta: d.meta });
        logger.info('[ZonesApple] Zones d’Apple actives', d.zones);
        DeviceEventEmitter.emit(APPLE_ZONES_CHANGED_EVENT);
        return 'ecrit';
      }
      if (d.kind === 'touch') {
        await saveUserSettings({ heartRateZonesMeta: d.meta });
        return 'inchange';
      }
      return d.reason === 'manuel' ? 'manuel' : d.reason === 'deja_verifie' ? 'deja_verifie' : 'indisponible';
    } catch (e) {
      logger.warn('[ZonesApple] Synchronisation des zones impossible', e);
      return 'indisponible';
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

/** Le message « Tes zones viennent d'Apple Santé » a ete montre : on ne le remontre plus. */
export async function markAppleZonesNoticeShown(): Promise<void> {
  try {
    const s = await getUserSettings();
    if (s.heartRateZonesMeta && !s.heartRateZonesMeta.noticeShown) {
      await saveUserSettings({ heartRateZonesMeta: { ...s.heartRateZonesMeta, noticeShown: true } });
    }
  } catch {
    // sans gravite : le message reviendra une fois
  }
}

type DetailsLike = Parameters<typeof mergeAppleZones>[0] & { effortScore?: number; effortEstimated?: boolean; applePowerZones?: AppleZoneTimes };

/** Ajoute aussi les zones de puissance velo (iOS 27) et l'effort lie a la seance (iOS 18) s'il manque. */
function withExtras<T extends DetailsLike>(d: T, ex: AppleWorkoutExtras): T {
  if (!ex.found) return d;
  let out = d;
  const pz = parseZoneTimes(ex.cyclingPowerZones);
  if (pz) out = { ...out, applePowerZones: pz };
  const effort = ex.effort;
  if (out.effortScore || !effort) return out;
  const u = effort.user;
  const e = effort.estimated;
  if (u != null && u >= 1 && u <= 10) return { ...out, effortScore: Math.round(u), effortEstimated: false };
  if (e != null && e >= 1 && e <= 10) return { ...out, effortScore: Math.round(e), effortEstimated: true };
  return out;
}

/** source des seances de la montre YOROI (SOURCE_MONTRE, lib/v2/montre/actions.ts) */
const SOURCE_MONTRE = 'yoroi_montre';
const WATCH_DAYS = 90;

/**
 * Seances de la montre YOROI des 90 derniers jours sans lien Sante : on retrouve leur HKWorkout (meme source,
 * meme heure) et on garde son UUID. Leur ouverture lit alors la courbe de FC et les zones d'Apple.
 * Renvoie les seances reliees (la liste en memoire est mise a jour).
 */
async function linkWatchSessions(list: Training[]): Promise<Training[]> {
  const since = Date.now() - WATCH_DAYS * 86400e3;
  const watch = list.filter((t) => t.source === SOURCE_MONTRE && !t.healthkit_uuid && t.id && t.date && Date.parse(String(t.date).slice(0, 10)) >= since);
  if (!watch.length) return [];
  const workouts = await getNativeWorkouts(WATCH_DAYS + 5);
  if (!workouts.length) return [];
  const taken = new Set(list.map((t) => String(t.healthkit_uuid ?? '')).filter(Boolean));
  const linked: Training[] = [];
  for (const t of watch) {
    const uuid = matchWatchWorkout(t, workouts, taken);
    if (!uuid) continue;
    if (await linkTrainingHealthKitUUID(t.id as number, uuid)) {
      taken.add(uuid);
      t.healthkit_uuid = uuid;
      linked.push(t);
    }
  }
  if (linked.length) logger.info(`[ZonesApple] ${linked.length} séances de la montre reliées à Apple Santé`);
  return linked;
}

const BACKFILL_LIMIT = 40;
const BACKFILL_EVERY_MS = 10 * 60 * 1000;
let lastBackfill = 0;
let backfilling = false;

/**
 * Seances deja importees : temps par zone d'Apple, par lots de 40 au plus, toutes les 10 minutes au plus.
 * Renvoie le nombre de seances qui ont recu des zones d'Apple.
 */
export async function backfillAppleZones(limit = BACKFILL_LIMIT): Promise<number> {
  if (Platform.OS !== 'ios' || backfilling) return 0;
  if (Date.now() - lastBackfill < BACKFILL_EVERY_MS) return 0;
  backfilling = true;
  lastBackfill = Date.now();
  let changed = 0;
  try {
    const list = await getTrainings();
    // Montre YOROI : utile a toutes les versions d'iOS (courbe de FC a l'ouverture), pas seulement iOS 27
    const linked = await linkWatchSessions(list).catch(() => [] as Training[]);
    const pref = await getApplePreferredHeartRateZonesNative();
    if (!pref.ios27) {
      if (linked.length) DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
      return 0;
    }
    const now = new Date();
    // une seance de la montre reliee a l'instant n'a pas encore de details : on part d'un cache vide
    for (const t of linked) if (!t.workout_details_json) t.workout_details_json = '{}';
    const todo = backfillCandidates(list, now, limit);
    for (const t of todo) {
      const ex = await getAppleWorkoutExtrasNative(String(t.healthkit_uuid));
      if (ex.missing) break;
      // Sante verrouillee (iPhone verrouille) ou autre erreur : on reessaiera, sans marquer la seance
      if (!ex.found && ex.error !== 'introuvable') continue;
      let details: DetailsLike;
      try {
        details = JSON.parse(String(t.workout_details_json));
      } catch {
        continue;
      }
      if (!details || typeof details !== 'object') continue;
      const az = parseAppleZones(ex.heartRateZones);
      const merged = withExtras(mergeAppleZones(details, az, now, ZONE_COLORS), ex);
      await updateTrainingDetails(t.id as number, JSON.stringify(merged));
      if (az) changed++;
    }
    if (changed > 0 || linked.length > 0) {
      logger.info(`[ZonesApple] ${changed} séances complétées avec les zones d’Apple`);
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    }
  } catch (e) {
    logger.warn('[ZonesApple] Historique des zones incomplet', e);
  } finally {
    backfilling = false;
  }
  return changed;
}

/**
 * A l'ouverture d'une seance deja en cache : si Apple n'a pas encore ete interroge (cache d'avant iOS 27,
 * ou d'avant cette version), lit ses zones, met a jour le cache et renvoie les details completes. Sinon null.
 */
export async function refreshTrainingAppleZones<T extends DetailsLike>(trainingId: number, uuid: string, details: T): Promise<T | null> {
  if (Platform.OS !== 'ios' || !uuid || uuid === 'fallback') return null;
  const now = new Date();
  if (!needsAppleZonesCheck((details as { appleZonesCheck?: AppleZonesCheck }).appleZonesCheck ?? null, now)) return null;
  try {
    const ex = await getAppleWorkoutExtrasNative(uuid);
    if (ex.missing || !ex.ios27) return null;
    const merged = withExtras(mergeAppleZones(details, parseAppleZones(ex.heartRateZones), now, ZONE_COLORS), ex);
    await updateTrainingDetails(trainingId, JSON.stringify(merged));
    return merged;
  } catch (e) {
    logger.warn('[ZonesApple] Zones de la séance illisibles', e);
    return null;
  }
}
