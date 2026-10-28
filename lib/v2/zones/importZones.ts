/**
 * Import de tes zones cardiaques depuis Apple Sante ou Health Connect (28 octobre 2026), cote effets.
 * La decision est pure : lib/v2/zones/zonesApple.ts (deciderImport), testee.
 *
 *  1. iOS 27 : zones exactes de Sante (HKHealthStore.preferredWorkoutZoneConfiguration), enregistrees telles quelles.
 *  2. Sinon : FC de repos (derniere mesure) et FC max (record sur 180 jours) lues dans Sante, ou dans
 *     Health Connect sur Android, puis calcul d'Apple (reserve cardiaque, 60, 70, 80, 90 %).
 * Aucun nouveau type Sante : frequence cardiaque et FC de repos sont deja demandees par l'app.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserSettings, saveUserSettings } from '@/lib/storage';
import { getLatestHealthData, getProfile, getTrainings } from '@/lib/database';
import { getApplePreferredHeartRateZonesNative, getHeartZonesDataNative } from '@/lib/yoroiHealthKit';
import { parseAppleZones } from '@/lib/v2/seances/appleExtras';
import { zonesFromLowers } from '@/lib/v2/seances/workoutMath';
import type { LowerBounds } from '@/lib/v2/seances/workoutMath';
import type { ZonesMeta } from '@/lib/v2/seances/appleZonesSync';
import { choisirFcMax, deciderImport, fcReposPlausible } from './zonesApple';
import type { ResultatImport, SourceFcMax } from './zonesApple';
import { logger } from '@/lib/security/logger';

/** 28 octobre 2026 : les zones lues n'ont pas pu etre enregistrees dans tes reglages (rien n'est montre comme reussi) */
export class ZonesNonEnregistrees extends Error {
  constructor() {
    super('Zones cardiaques non enregistrees');
    this.name = 'ZonesNonEnregistrees';
  }
}

const CLE = '@yoroi_zones_import';

/** Ce qu'on garde du dernier import : date, FC de repos et FC max utilisees */
export interface MemoireImport {
  at: string;
  type: 'exactes' | 'calculees';
  repos?: number;
  max?: number;
  sourceMax?: SourceFcMax;
}

export async function lireMemoireImport(): Promise<MemoireImport | null> {
  try {
    const t = await AsyncStorage.getItem(CLE);
    if (!t) return null;
    const m = JSON.parse(t) as MemoireImport;
    return m && typeof m.at === 'string' ? m : null;
  } catch {
    return null;
  }
}

async function ecrireMemoireImport(m: MemoireImport): Promise<void> {
  try {
    await AsyncStorage.setItem(CLE, JSON.stringify(m));
  } catch {
    // stockage indisponible : l'import reste enregistre dans tes reglages
  }
}

function ageDuProfil(p: { birth_date?: string | null; age?: number | null } | null): number | null {
  if (p?.birth_date) {
    const n = new Date(p.birth_date.slice(0, 10));
    if (isFinite(n.getTime())) {
      const now = new Date();
      let a = now.getFullYear() - n.getFullYear();
      if (now.getMonth() < n.getMonth() || (now.getMonth() === n.getMonth() && now.getDate() < n.getDate())) a -= 1;
      return a;
    }
  }
  return typeof p?.age === 'number' && p.age > 0 ? p.age : null;
}

export interface ValeursCoeur {
  repos: number | null;
  fcMax: { valeur: number; source: SourceFcMax } | null;
}

/** FC de repos et FC max, depuis Sante (iOS) ou Health Connect (Android), sinon tes donnees deja importees */
export async function lireValeursCoeur(): Promise<ValeursCoeur> {
  let repos: number | null = null;
  let maxSante: number | null = null;
  if (Platform.OS === 'ios') {
    const d = await getHeartZonesDataNative().catch(() => null);
    if (d) {
      if (fcReposPlausible(d.restingHR)) repos = d.restingHR;
      if (d.maxHR > 0) maxSante = d.maxHR;
    }
  } else if (Platform.OS === 'android') {
    try {
      const hc = (await import('@/lib/healthConnect')).default as unknown as { getTodayHeartRate?: () => Promise<{ resting?: number } | null> };
      const hr = await hc.getTodayHeartRate?.();
      if (hr && fcReposPlausible(hr.resting)) repos = hr.resting as number;
    } catch {
      // Health Connect indisponible : on garde tes donnees deja importees
    }
  }
  if (repos == null) {
    const r = await getLatestHealthData('heart_rate_resting').catch(() => null);
    if (r && fcReposPlausible(r.value)) repos = Math.round(r.value);
  }
  let maxSeances: number | null = null;
  try {
    const t = await getTrainings(180);
    for (const s of t) {
      const v = (s as { max_heart_rate?: number | null }).max_heart_rate;
      if (typeof v === 'number' && v > 0 && v <= 220 && (maxSeances == null || v > maxSeances)) maxSeances = v;
    }
  } catch {
    // pas de seances
  }
  const age = ageDuProfil(await getProfile().catch(() => null));
  return { repos, fcMax: choisirFcMax({ sante: maxSante, seances: maxSeances, age }) };
}

/** Lit Sante, decide (zones exactes ou calcul d'Apple), puis enregistre tout de suite dans tes reglages */
export async function importerZones(): Promise<ResultatImport> {
  const plateforme = Platform.OS === 'android' ? 'android' : 'ios';
  let apple: { ios27: boolean; missing?: boolean; lowers?: LowerBounds | null; source?: 'system' | 'user' | 'app' | 'autre' } | null = null;
  if (plateforme === 'ios') {
    const pref = await getApplePreferredHeartRateZonesNative().catch(() => ({ ios27: false, missing: true }));
    const az = pref.ios27 ? parseAppleZones(pref as { source?: string; zones?: { index: number; min?: number; max?: number }[] }) : null;
    apple = { ios27: pref.ios27, missing: (pref as { missing?: boolean }).missing, lowers: az?.lowers ?? null, source: az?.source };
  }
  const valeurs = await lireValeursCoeur();
  const versionIos = Platform.OS === 'ios' ? parseInt(String(Platform.Version), 10) || 0 : 0;
  const res = deciderImport({ plateforme, versionIos, apple, repos: valeurs.repos, fcMax: valeurs.fcMax });
  if (res.type === 'echec') return res;
  const at = new Date().toISOString();
  const settings = await getUserSettings().catch(() => null);
  const meta: ZonesMeta = res.type === 'exactes'
    ? { origin: 'apple', updatedAt: at, appleSource: res.appleSource, appleCheckedAt: at, noticeShown: true }
    : { origin: 'estimee', updatedAt: at, noticeShown: settings?.heartRateZonesMeta?.noticeShown };
  if (!(await saveUserSettings({ heartRateZones: zonesFromLowers(res.lb, 0), heartRateZonesMeta: meta }))) throw new ZonesNonEnregistrees();
  await ecrireMemoireImport(res.type === 'exactes'
    ? { at, type: 'exactes', repos: valeurs.repos ?? undefined, max: valeurs.fcMax?.valeur }
    : { at, type: 'calculees', repos: res.repos, max: res.max, sourceMax: res.sourceMax });
  logger.info('[Zones] Import', res);
  return res;
}
