/**
 * Zones Apple Sante automatiques pour chaque utilisateur sur iOS 27 (14 octobre 2026, agent ios27).
 * Logique pure, testee dans __tests__/unit/appleZonesSync.test.ts :
 *  - choix de la source des zones actives : celles d'Apple (HKHealthStore.preferredWorkoutZoneConfiguration)
 *    remplacent les zones par defaut, estimees ou deja venues d'Apple, jamais des zones saisies a la main ;
 *  - au plus une verification par jour, sauf juste apres la connexion a Sante ;
 *  - fusion des temps par zone d'Apple (HKWorkout.zoneGroupsByType) dans le cache d'une seance :
 *    versionnee, sans doublon, l'estimation reste la ou Apple ne donne rien.
 * Les effets (lecture native, enregistrement) sont dans lib/appleZonesSync.ts, iOS seulement.
 */
import type { AppleZones } from './appleExtras';
import { roundedLowers } from './appleExtras';
import { lowerBounds, zonesFromLowers } from './workoutMath';
import type { LowerBounds, ZoneSettingsLike } from './workoutMath';

/** D'ou viennent tes zones actives. */
export type ZonesOrigin = 'apple' | 'manual' | 'estimee';

export interface ZonesMeta {
  origin: ZonesOrigin;
  /** Quand les zones actives ont ete ecrites (ISO). */
  updatedAt: string;
  /** Pour origin apple : automatiques (system) ou saisies dans Sante (user). */
  appleSource?: AppleZones['source'];
  /** Derniere lecture reussie des zones d'Apple (ISO). */
  appleCheckedAt?: string;
  /** « Tes zones viennent d'Apple Santé » deja montre une fois. */
  noticeShown?: boolean;
}

export type StoredZones = ReturnType<typeof zonesFromLowers>;

export const APPLE_ZONES_CHECK_EVERY_MS = 24 * 3600 * 1000;

export type ZonesSyncDecision =
  | { kind: 'skip'; reason: 'pas_de_zones_apple' | 'manuel' | 'deja_verifie' }
  | { kind: 'touch'; meta: ZonesMeta }
  | { kind: 'write'; zones: StoredZones; meta: ZonesMeta };

export function sameLowers(a: LowerBounds, b: LowerBounds): boolean {
  return a.length === 4 && b.length === 4 && a.every((v, i) => Math.round(v) === Math.round(b[i]));
}

/**
 * Que faire des zones d'Apple lues a l'instant ?
 *  - pas de zones Apple (avant iOS 27, Sante refuse) : rien ;
 *  - verifiees il y a moins d'un jour (sauf force) : rien ;
 *  - aucune zone enregistree, ou zones par defaut, estimees, deja d'Apple : on ecrit celles d'Apple ;
 *  - zones saisies a la main (origin manual) : jamais touchees ;
 *  - zones d'avant cette version (sans origine) : gardees ; si elles valent deja celles d'Apple au battement
 *    pres, elles deviennent « Zones Apple Santé » (memes valeurs) et suivront Apple ensuite.
 */
export function decideZonesSync(input: {
  current?: ZoneSettingsLike | null;
  meta?: ZonesMeta | null;
  apple: AppleZones | null;
  now: Date;
  force?: boolean;
}): ZonesSyncDecision {
  const { current, meta, apple, now, force } = input;
  if (!force && meta?.appleCheckedAt) {
    const last = Date.parse(meta.appleCheckedAt);
    const age = now.getTime() - last;
    if (isFinite(last) && age >= 0 && age < APPLE_ZONES_CHECK_EVERY_MS) return { kind: 'skip', reason: 'deja_verifie' };
  }
  if (!apple) return { kind: 'skip', reason: 'pas_de_zones_apple' };
  const lb = roundedLowers(apple.lowers);
  const nowIso = now.toISOString();
  const write = (): ZonesSyncDecision => ({
    kind: 'write',
    zones: zonesFromLowers(lb, 0),
    meta: { origin: 'apple', updatedAt: nowIso, appleSource: apple.source, appleCheckedAt: nowIso, noticeShown: meta?.noticeShown === true },
  });
  if (!current) return write();
  const same = sameLowers(lowerBounds(current), lb);
  if (!meta) return same ? write() : { kind: 'skip', reason: 'manuel' };
  if (meta.origin === 'manual') return { kind: 'skip', reason: 'manuel' };
  if (meta.origin === 'apple' && same && meta.appleSource === apple.source) {
    return { kind: 'touch', meta: { ...meta, appleCheckedAt: nowIso } };
  }
  return write();
}

/**
 * Origine a enregistrer quand tu enregistres l'ecran des zones : si tu n'as rien change aux zones venues
 * d'Apple (ou estimees), elles gardent leur origine ; des que tu changes une valeur, elles sont a toi.
 */
export function originOnSave(saved: LowerBounds, meta: ZonesMeta | null | undefined, loaded: LowerBounds | null): ZonesOrigin {
  if (meta && meta.origin !== 'manual' && loaded && sameLowers(saved, loaded)) return meta.origin;
  return 'manual';
}

/** true quand le message discret « Tes zones viennent d'Apple Santé » doit s'afficher (une seule fois). */
export function shouldShowAppleNotice(meta: ZonesMeta | null | undefined): boolean {
  return meta?.origin === 'apple' && meta.noticeShown !== true;
}

// ---------- Historique des seances ----------

/** Version du cache des zones Apple dans workout_details_json. L'augmenter relit toutes les seances. */
export const APPLE_ZONES_CACHE_VERSION = 1;
/** Sans zones la derniere fois, on redemande a Apple apres ce delai. */
export const APPLE_ZONES_RETRY_MS = 14 * 24 * 3600 * 1000;

export interface AppleZonesCheck { v: number; at: string; found: boolean }

/** Lit la marque de verification sans parser tout le JSON (une seance avec trace GPS pese lourd). */
export function checkFromJson(json: string | null | undefined): AppleZonesCheck | null {
  if (!json) return null;
  const m = /"appleZonesCheck":\{"v":(\d+),"at":"([^"]+)","found":(true|false)\}/.exec(json);
  return m ? { v: Number(m[1]), at: m[2], found: m[3] === 'true' } : null;
}

export function needsAppleZonesCheck(check: AppleZonesCheck | null | undefined, now: Date): boolean {
  if (!check || check.v !== APPLE_ZONES_CACHE_VERSION) return true;
  if (check.found) return false;
  const at = Date.parse(check.at);
  return !isFinite(at) || now.getTime() - at > APPLE_ZONES_RETRY_MS;
}

const UUID_RE = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/i;

export interface TrainingLike {
  id?: number;
  date?: string;
  healthkit_uuid?: string | null;
  workout_details_json?: string | null;
}

/**
 * Seances a completer en tache de fond : un vrai UUID HealthKit, un cache de details deja la (sinon
 * l'ouverture de la seance fera la lecture complete), pas encore verifiees. Les plus recentes d'abord.
 */
export function backfillCandidates<T extends TrainingLike>(list: T[], now: Date, limit: number): T[] {
  return list
    .filter((t) => !!t.id && !!t.healthkit_uuid && UUID_RE.test(String(t.healthkit_uuid)) && !!t.workout_details_json)
    .filter((t) => needsAppleZonesCheck(checkFromJson(t.workout_details_json), now))
    .sort((a, b) => String(b.date ?? '').localeCompare(String(a.date ?? '')))
    .slice(0, Math.max(0, limit));
}

export interface ZoneRow { zone: number; name: string; minBpm: number; maxBpm: number; durationSeconds: number; color: string }

/**
 * Fusionne les zones d'Apple dans les details d'une seance. Les temps d'Apple remplacent heartRateZones
 * (une seule liste, celle que lisent la carte de partage, le planning et les statistiques), l'estimation
 * reste si Apple ne donne rien. La marque appleZonesCheck est posee en dernier, avec ses cles dans cet
 * ordre, pour que checkFromJson la retrouve.
 */
export function mergeAppleZones<T extends { heartRateZones?: ZoneRow[]; appleZones?: AppleZones; appleZonesCheck?: AppleZonesCheck }>(
  details: T,
  az: AppleZones | null,
  now: Date,
  colors: readonly string[] = [],
): T & { appleZones?: AppleZones; appleZonesCheck: AppleZonesCheck } {
  const { appleZonesCheck: _old, ...rest } = details;
  void _old;
  const out = { ...rest } as T & { appleZones?: AppleZones; appleZonesCheck: AppleZonesCheck };
  const ok = !!az && az.seconds.length === 5 && az.seconds.some((x) => x > 0);
  if (ok && az) {
    const lb = roundedLowers(az.lowers);
    out.appleZones = az;
    out.heartRateZones = az.seconds.map((sec, i) => ({
      zone: i + 1,
      name: `Zone ${i + 1}`,
      minBpm: i === 0 ? 0 : lb[i - 1],
      maxBpm: i === 4 ? 250 : lb[i] - 1,
      durationSeconds: Math.round(sec),
      color: details.heartRateZones?.[i]?.color ?? colors[i] ?? '',
    }));
  }
  out.appleZonesCheck = { v: APPLE_ZONES_CACHE_VERSION, at: now.toISOString(), found: ok || !!details.appleZones };
  return out;
}

// ---------- Zones de puissance velo (iOS 27) ----------

export interface AppleZoneTimes {
  source: AppleZones['source'];
  /** Zones dans l'ordre, bornes en watts (la premiere sans minimum, la derniere sans maximum). */
  zones: { index: number; min?: number; max?: number; seconds: number }[];
}

/**
 * Zones de puissance velo lues chez Apple (cyclingPowerZones du module natif). Apple en propose 6 par defaut,
 * d'autres apps 5, 7 ou 8 : on accepte de 3 a 9 zones (limites d'Apple). null si rien d'exploitable.
 */
export function parseZoneTimes(src: { source?: string; zones?: { index: number; min?: number; max?: number; seconds?: number }[] } | null | undefined): AppleZoneTimes | null {
  const raw = (src?.zones ?? []).filter((z) => typeof z?.index === 'number').slice().sort((a, b) => a.index - b.index);
  if (raw.length < 3 || raw.length > 9) return null;
  const num = (v: unknown) => (typeof v === 'number' && isFinite(v) ? v : undefined);
  const zones = raw.map((z) => ({ index: z.index, min: num(z.min), max: num(z.max), seconds: Math.max(0, num(z.seconds) ?? 0) }));
  if (!zones.some((z) => z.seconds > 0)) return null;
  const s = src?.source;
  return { source: s === 'system' || s === 'user' || s === 'app' ? s : 'autre', zones };
}

// ---------- Seances de la montre YOROI ----------

export interface NativeWorkoutLike { uuid: string; startDate: number; endDate: number; sourceName?: string }

/**
 * Retrouve l'entrainement Apple Sante (HKWorkout) d'une seance enregistree par la montre YOROI : la montre
 * l'ecrit avec HKWorkoutSession et HKLiveWorkoutBuilder, mais l'import Sante l'ignore (la seance arrive deja
 * par la montre, sans identifiant HealthKit). Meme source (YOROI), debut ou fin a 3 minutes pres (la seance
 * est rangee a la minute, sa duree est la duree active sans les pauses). Le plus proche gagne.
 */
export function matchWatchWorkout(
  t: { date?: string; start_time?: string; duration_minutes?: number },
  workouts: NativeWorkoutLike[],
  taken: Set<string>,
): string | null {
  if (!t.date || !t.start_time) return null;
  const start = new Date(`${String(t.date).slice(0, 10)}T${t.start_time}:00`).getTime();
  if (!isFinite(start)) return null;
  const end = start + Math.max(0, Number(t.duration_minutes) || 0) * 60000;
  let best: string | null = null;
  let bestD = Infinity;
  for (const w of workouts) {
    if (!w?.uuid || taken.has(w.uuid) || !/yoroi/i.test(String(w.sourceName ?? ''))) continue;
    const d = Math.min(Math.abs(w.endDate - end), Math.abs(w.startDate - start));
    if (d <= 3 * 60000 && d < bestD) {
      best = w.uuid;
      bestD = d;
    }
  }
  return best;
}
