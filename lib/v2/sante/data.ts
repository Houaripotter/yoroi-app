/**
 * Lecture des données de santé pour l'espace Santé (refonte v2).
 * Appelle uniquement les fonctions existantes : lib/healthConnect (Apple Santé sur iPhone,
 * Health Connect sur Android), lib/healthKit.wrapper et la table health_data déjà stockée.
 * Dans Expo Go les modules natifs sont absents : on lit alors ce qui est déjà enregistré.
 */
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { healthConnect } from '@/lib/healthConnect';
import HealthKit, { isRunningInExpoGo } from '@/lib/healthKit.wrapper';
import { getDetectedSources, getDetectedWeightSources, getHealthData, getWeights } from '@/lib/database';
import type { HealthDataRecord } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { todayIso } from '@/lib/v2/progres/format';
import { METRIC, METRICS } from './metrics';
import type { MetricKey } from './metrics';
import type { DayPoint, Phases } from './stats';
import { formatValue } from './stats';

export type SanteMode = 'web' | 'expoGo' | 'off' | 'live';

export type SanteSource = {
  mode: SanteMode;
  /** « Apple Santé » ou « Health Connect » */
  provider: string;
  platform: 'ios' | 'android' | 'web';
  lastSync: string | null;
  failure?: string;
};

// Les fonctions de lecture diffèrent un peu entre iPhone et Android : on vérifie avant d'appeler
const svc = healthConnect as unknown as Record<string, any>;

export function providerName(): string {
  return Platform.OS === 'android' ? 'Health Connect' : 'Apple Santé';
}

export const isAndroid = Platform.OS === 'android';

export async function getSanteSource(): Promise<SanteSource> {
  const platform = Platform.OS === 'ios' ? 'ios' : Platform.OS === 'android' ? 'android' : 'web';
  const provider = providerName();
  if (platform === 'web') return { mode: 'web', provider, platform, lastSync: null };
  if (isRunningInExpoGo) return { mode: 'expoGo', provider, platform, lastSync: null };
  try {
    await healthConnect.initialize();
    const st = healthConnect.getSyncStatus();
    return { mode: st.isConnected ? 'live' : 'off', provider, platform, lastSync: st.lastSync, failure: st.failureReason };
  } catch (e) {
    logger.warn('[Sante v2] statut indisponible', e);
    return { mode: 'off', provider, platform, lastSync: null };
  }
}

/** Appel prudent : la fonction peut manquer sur une plateforme, échouer ou traîner */
async function call<T>(name: string, ...args: unknown[]): Promise<T | null> {
  const fn = svc[name];
  if (typeof fn !== 'function') return null;
  try {
    const res = await Promise.race([
      Promise.resolve(fn.apply(healthConnect, args) as Promise<T>),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 20000)),
    ]);
    return (res ?? null) as T | null;
  } catch (e) {
    logger.warn(`[Sante v2] ${name} a échoué`, e);
    return null;
  }
}

/** Date locale AAAA-MM-JJ */
function localKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

const dayOf = (d: unknown): string => {
  if (!d) return '';
  if (typeof d === 'string') {
    // une date seule reste telle quelle ; un horodatage complet passe en heure locale
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) return d;
    const t = new Date(d);
    return Number.isFinite(t.getTime()) ? localKey(t) : d.slice(0, 10);
  }
  try {
    const t = new Date(d as any);
    return Number.isFinite(t.getTime()) ? localKey(t) : '';
  } catch {
    return '';
  }
};

type Simple = { date: string; value: number; v2?: number };

function fromSimple(rows: Simple[] | null | undefined): DayPoint[] {
  if (!rows || !Array.isArray(rows)) return [];
  return rows
    .map((r) => {
      const p: DayPoint = { date: dayOf(r.date), value: Number(r.value) || 0 };
      if (r.v2 && Number(r.v2) > 0) p.v2 = Number(r.v2);
      return p;
    })
    .filter((p) => p.date && p.value > 0);
}

/** Un point par jour : maximum pour un cumul (évite le double comptage téléphone et montre), moyenne sinon */
function byDay(points: DayPoint[], key: MetricKey): DayPoint[] {
  const m = METRIC[key];
  const groups = new Map<string, DayPoint[]>();
  points.forEach((p) => {
    if (!p.date || !(p.value > 0)) return;
    const g = groups.get(p.date) ?? [];
    g.push(p);
    groups.set(p.date, g);
  });
  const out: DayPoint[] = [];
  groups.forEach((g, date) => {
    if (g.length === 1) {
      out.push(g[0]);
      return;
    }
    if (m.kind === 'sum') {
      out.push(g.reduce((a, b) => (b.value > a.value ? b : a)));
    } else {
      const v = g.reduce((s, p) => s + p.value, 0) / g.length;
      const v2s = g.map((p) => p.v2).filter((x): x is number => typeof x === 'number' && x > 0);
      out.push({ date, value: v, v2: v2s.length ? v2s.reduce((s, x) => s + x, 0) / v2s.length : undefined, source: g[0].source, phases: g.find((p) => p.phases)?.phases });
    }
  });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Fusion : les données lues en direct priment, les données stockées comblent les trous */
function merge(primary: DayPoint[], secondary: DayPoint[]): DayPoint[] {
  const map = new Map<string, DayPoint>();
  secondary.forEach((p) => map.set(p.date, p));
  primary.forEach((p) => map.set(p.date, { ...p, source: p.source ?? map.get(p.date)?.source }));
  return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
}

function normSpo2(v: number): number {
  if (v > 0 && v <= 1) return v * 100;
  if (v > 100 && v <= 10000) return v / 100;
  return v;
}

function rowsToPoints(rows: HealthDataRecord[], key: MetricKey): DayPoint[] {
  return rows.map((r) => {
    const p: DayPoint = { date: dayOf(r.date), value: Number(r.value) || 0, source: r.source };
    if (key === 'tension' && r.value2) p.v2 = Number(r.value2);
    if (key === 'oxygene') p.value = normSpo2(p.value);
    if (key === 'glycemie' && r.unit === 'mg/dL') p.value = p.value / 18;
    if (key === 'sommeil') {
      let core = 0;
      try {
        const meta = r.metadata ? JSON.parse(r.metadata) : null;
        core = Number(meta?.phases?.core ?? 0) || 0;
      } catch {
        core = 0;
      }
      const deep = Number(r.value2 ?? 0) || 0;
      const rem = Number(r.value3 ?? 0) || 0;
      const awake = Number(r.value4 ?? 0) || 0;
      if (deep + rem + core > 0) p.phases = { deep, rem, core, awake };
    }
    return p;
  });
}

async function stored(key: MetricKey, days: number): Promise<DayPoint[]> {
  const m = METRIC[key];
  const n = Math.min(days, 365);
  try {
    if (key === 'poids') {
      const ws = await getWeights(days);
      return ws.map((w) => ({ date: dayOf(w.date), value: Number(w.weight), source: w.source })).filter((p) => p.date && p.value > 0);
    }
    const out: DayPoint[] = [];
    if (key === 'masse-grasse') {
      const ws = await getWeights(days);
      ws.forEach((w) => {
        const v = Number(w.fat_percent ?? 0);
        if (v > 0) out.push({ date: dayOf(w.date), value: v, source: w.source });
      });
    }
    if (m.store) out.push(...rowsToPoints(await getHealthData(m.store, n), key));
    if (m.ext) out.push(...rowsToPoints(await getHealthData(`x_${key}`, n), key));
    return out.filter((p) => p.date && p.value > 0);
  } catch (e) {
    logger.warn(`[Sante v2] lecture stockée ${key}`, e);
    return [];
  }
}

let extKeysCache: Set<string> | null = null;
function extKeys(): Set<string> {
  if (extKeysCache) return extKeysCache;
  try {
    const fn = svc.getExtendedKeys;
    extKeysCache = new Set(typeof fn === 'function' ? (fn.call(healthConnect) as string[]) : []);
  } catch {
    extKeysCache = new Set();
  }
  return extKeysCache;
}

async function live(key: MetricKey, days: number): Promise<DayPoint[]> {
  const m = METRIC[key];
  if ((isAndroid && m.iosOnly) || (!isAndroid && m.androidOnly)) return [];
  // Lecture étendue jour par jour (ajout du 9 octobre 2026)
  if (extKeys().has(key) && key !== 'respiration' && key !== 'glycemie') {
    const rows = fromSimple(await call<Simple[]>('getExtendedHistory', key, days));
    if (rows.length > 0 || !['tension', 'masse-grasse', 'masse-maigre', 'etages', 'pleine-conscience'].includes(key)) return rows;
  }
  switch (key) {
    case 'pas':
      return fromSimple(await call<Simple[]>('getStepsHistory', days));
    case 'distance':
      return fromSimple(await call<Simple[]>('getDistanceHistory', days));
    case 'exercice':
      return fromSimple(await call<Simple[]>('getExerciseMinutesHistory', days));
    case 'debout':
      return fromSimple(await call<Simple[]>('getStandHoursHistory', days));
    case 'energie-active':
    case 'energie-repos': {
      const rows = await call<{ date: string; active: number; basal: number }[]>('getCaloriesHistory', days);
      return (rows ?? []).map((r) => ({ date: dayOf(r.date), value: Number(key === 'energie-active' ? r.active : r.basal) || 0 })).filter((p) => p.value > 0);
    }
    case 'frequence-cardiaque':
      return fromSimple(await call<Simple[]>('getHeartRateHistory', days));
    case 'fc-repos':
      return fromSimple(await call<Simple[]>('getRestingHRHistory', days));
    case 'vfc':
      return fromSimple(await call<Simple[]>('getHRVHistory', days));
    case 'oxygene':
      return fromSimple(await call<Simple[]>('getOxygenSaturationHistory', days)).map((p) => ({ ...p, value: normSpo2(p.value) }));
    case 'respiration':
      return fromSimple(await call<Simple[]>('getRespiratoryRateHistory', days));
    case 'temperature':
      return fromSimple(await call<Simple[]>('getBodyTemperatureHistory', days));
    case 'vo2max':
      return fromSimple(await call<Simple[]>('getVO2MaxHistory', days));
    case 'poids':
      return fromSimple(await call<Simple[]>('getWeightHistory', days));
    case 'glycemie': {
      const rows = await call<{ date: string; value: number; unit?: string }[]>('getBloodGlucoseHistory', days);
      return (rows ?? []).map((r) => ({ date: dayOf(r.date), value: r.unit === 'mg/dL' ? Number(r.value) / 18 : Number(r.value) })).filter((p) => p.value > 0);
    }
    case 'sommeil': {
      const rows = await call<{ date: string; deep: number; rem: number; core: number; awake: number; total: number; duration?: number; source?: string }[]>('getSleepHistory', days);
      return (rows ?? [])
        .map((r) => {
          const total = Number(r.total || r.duration || 0);
          const phases: Phases | undefined = r.deep + r.rem + r.core > 0 ? { deep: r.deep || 0, rem: r.rem || 0, core: r.core || 0, awake: r.awake || 0 } : undefined;
          // la nuit est déjà datée du matin du réveil
          return { date: typeof r.date === 'string' ? r.date.slice(0, 10) : dayOf(r.date), value: total, phases, source: r.source };
        })
        .filter((p) => p.value > 0);
    }
    case 'etages': {
      const f = await call<{ count: number; date: string; source?: string }>('getFloorsClimbed');
      return f && f.count > 0 ? [{ date: dayOf(f.date) || todayIso(), value: f.count, source: f.source }] : [];
    }
    case 'pleine-conscience': {
      const f = await call<{ minutes: number; date: string; source?: string }>('getMindfulMinutes');
      return f && f.minutes > 0 ? [{ date: dayOf(f.date) || todayIso(), value: f.minutes, source: f.source }] : [];
    }
    case 'masse-grasse':
    case 'masse-maigre': {
      const b = await call<{ bodyFatPercentage?: number; leanBodyMass?: number; date: string; source?: string }>('getBodyComposition');
      const v = key === 'masse-grasse' ? b?.bodyFatPercentage : b?.leanBodyMass;
      return b && v && v > 0 ? [{ date: dayOf(b.date) || todayIso(), value: v, source: b.source }] : [];
    }
    case 'tension': {
      const b = await call<{ systolic: number; diastolic: number; date: string; source?: string }>('getBloodPressure');
      return b && b.systolic > 0 ? [{ date: dayOf(b.date) || todayIso(), value: b.systolic, v2: b.diastolic, source: b.source }] : [];
    }
    default:
      return [];
  }
}

/** Série d'une mesure sur les n derniers jours, un point par jour */
export async function loadSeries(key: MetricKey, days: number, isLive: boolean): Promise<DayPoint[]> {
  const safeDays = Math.max(1, Math.min(days, 365));
  const [l, s] = await Promise.all([isLive ? live(key, safeDays) : Promise.resolve([] as DayPoint[]), stored(key, safeDays)]);
  return merge(byDay(l, key), byDay(s, key));
}

/** Toutes les mesures, six lectures à la fois pour ménager Santé et Health Connect */
export async function loadAllSeries(days: number, isLive: boolean): Promise<Record<MetricKey, DayPoint[]>> {
  const out = {} as Record<MetricKey, DayPoint[]>;
  const queue = METRICS.map((m) => m.key);
  const worker = async () => {
    while (queue.length) {
      const k = queue.shift()!;
      try {
        out[k] = await loadSeries(k, days, isLive);
      } catch {
        out[k] = [];
      }
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  METRICS.forEach((m) => {
    if (!out[m.key]) out[m.key] = [];
  });
  return out;
}

// ============================================
// ÉVÉNEMENTS DATÉS (chutes, alertes du cœur, ECG, humeur), ajout du 10 octobre 2026
// ============================================

export type HealthEvent = { date: string; end?: string; title: string; detail?: string; value?: number };

/**
 * Liste des événements d'une mesure, du plus récent au plus ancien.
 * En direct sur iPhone ; sinon, les comptes par jour déjà gardés sur le téléphone.
 */
export async function loadEvents(key: MetricKey, days: number, isLive: boolean): Promise<HealthEvent[]> {
  const m = METRIC[key];
  if (isLive) {
    const rows = await call<HealthEvent[]>('getEventSamples', key, days);
    if (rows && rows.length > 0) return rows.slice().sort((a, b) => String(b.date).localeCompare(String(a.date)));
  }
  const pts = await stored(key, days);
  return byDay(pts, key)
    .filter((p) => p.value > 0)
    .reverse()
    .map((p) => ({
      date: p.date,
      title: m.event ? `${Math.round(p.value)} ${p.value >= 2 ? m.unit : m.unit.replace(/s$/, '')}` : `${formatValue(m, p.value)}${m.unit ? ` ${m.unit}` : ''}`,
      value: p.value,
    }));
}

/** Sources distinctes déjà enregistrées pour une mesure */
export async function loadSources(key: MetricKey): Promise<string[]> {
  const pts = await stored(key, 90);
  const set = new Set<string>();
  pts.forEach((p) => {
    if (p.source) set.add(p.source);
  });
  return Array.from(set);
}

/** Sources (marques) vues ces 30 derniers jours, avec le nombre de mesures */
export type Detected = { source: string; count: number; last: string };
export async function loadDetected(): Promise<Detected[]> {
  try {
    const [h, w] = await Promise.all([getDetectedSources(30).catch(() => []), getDetectedWeightSources(30).catch(() => [])]);
    const map = new Map<string, Detected>();
    [...(h as any[]), ...(w as any[])].forEach((s) => {
      const key = String(s.source ?? '').toLowerCase();
      if (!key || key === 'manual' || key === 'unknown') return;
      const prev = map.get(key);
      const count = Number(s.record_count ?? s.count ?? 0) || 0;
      const last = String(s.last_date ?? s.last ?? '');
      map.set(key, { source: key, count: (prev?.count ?? 0) + count, last: prev && prev.last > last ? prev.last : last });
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  } catch (e) {
    logger.warn('[Sante v2] appareils détectés indisponibles', e);
    return [];
  }
}

// ============================================
// AUTORISATIONS COMPLÉMENTAIRES (nouvelles mesures)
// ============================================

export async function needsExtendedAccess(isLive: boolean): Promise<boolean> {
  if (!isLive || typeof svc.requestExtendedPermissions !== 'function') return false;
  const asked = await call<boolean>('hasAskedExtendedPermissions');
  return asked === false;
}

export async function askExtendedAccess(): Promise<boolean> {
  const ok = await call<boolean>('requestExtendedPermissions');
  return !!ok;
}

// ============================================
// ANNEAUX D'ACTIVITÉ
// ============================================

export type Rings = {
  move: number | null;
  exercise: number | null;
  stand: number | null;
  hasExercise: boolean;
  hasStand: boolean;
};

export type RingGoals = { move: number; exercise: number; stand: number };
export const DEFAULT_GOALS: RingGoals = { move: 500, exercise: 30, stand: 12 };
const GOALS_KEY = '@yoroi_v2_sante_ring_goals';

export async function getRingGoals(): Promise<RingGoals> {
  try {
    const raw = await AsyncStorage.getItem(GOALS_KEY);
    if (raw) return { ...DEFAULT_GOALS, ...JSON.parse(raw) };
  } catch {
    // réglage absent : valeurs par défaut
  }
  return DEFAULT_GOALS;
}

export async function saveRingGoals(g: RingGoals): Promise<void> {
  try {
    await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(g));
  } catch (e) {
    logger.warn('[Sante v2] objectifs non enregistrés', e);
  }
}

export async function loadRings(isLive: boolean, series: Partial<Record<MetricKey, DayPoint[]>>): Promise<Rings> {
  const today = todayIso();
  const fromSeries = (k: MetricKey) => series[k]?.find((p) => p.date === today)?.value ?? null;
  const isIos = Platform.OS === 'ios';
  let move = fromSeries('energie-active');
  let exercise = fromSeries('exercice');
  let stand = fromSeries('debout');
  if (isLive) {
    const sum = await call<{ activeCalories: number | null; exerciseMinutes: number | null; standHours: number | null }>('getTodayActivitySummary');
    if (sum) {
      move = sum.activeCalories ?? move;
      exercise = sum.exerciseMinutes ?? exercise;
      stand = sum.standHours ?? stand;
    }
    if (move === null) {
      const cal = await call<{ active: number }>('getTodayCalories');
      if (cal && cal.active > 0) move = cal.active;
    }
  }
  return {
    move,
    exercise,
    stand,
    hasExercise: isIos || exercise !== null,
    hasStand: isIos,
  };
}

export type WeekRing = { date: string; move: number; exercise: number; stand: number };

export async function loadWeekRings(isLive: boolean, series: Partial<Record<MetricKey, DayPoint[]>>): Promise<WeekRing[]> {
  if (isLive) {
    const w = await call<{ date: string; calories: number; exerciseMin: number; standH: number }[]>('getWeeklyActivityData');
    if (w && w.length && w.some((d) => d.calories > 0 || d.exerciseMin > 0)) {
      return w.map((d) => ({ date: d.date, move: d.calories, exercise: d.exerciseMin, stand: d.standH }));
    }
  }
  const pick = (k: MetricKey, date: string) => series[k]?.find((p) => p.date === date)?.value ?? 0;
  const out: WeekRing[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = localKey(d);
    out.push({ date: iso, move: pick('energie-active', iso), exercise: pick('exercice', iso), stand: pick('debout', iso) });
  }
  return out;
}

// ============================================
// FRÉQUENCE CARDIAQUE DU JOUR (iPhone)
// ============================================

export type HrSample = { timestamp: string; bpm: number };

/** Les battements du jour, échantillon par échantillon, depuis Apple Santé */
export async function loadTodayHeartRate(isLive: boolean): Promise<HrSample[]> {
  if (!isLive || Platform.OS !== 'ios' || isRunningInExpoGo) return [];
  try {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const samples: any[] = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
      filter: { date: { startDate: from, endDate: new Date() } },
      limit: 0,
      ascending: true,
    });
    const all: HrSample[] = (samples ?? [])
      .map((s: any) => ({ timestamp: new Date(s.startDate).toISOString(), bpm: Math.round(Number(s.quantity) || 0) }))
      .filter((s: HrSample) => s.bpm > 25 && s.bpm < 240);
    if (all.length <= 320) return all;
    const step = Math.ceil(all.length / 320);
    return all.filter((_, i) => i % step === 0);
  } catch (e) {
    logger.warn('[Sante v2] FC du jour indisponible', e);
    return [];
  }
}

// ============================================
// SÉANCES ENREGISTRÉES PAR LA MONTRE
// ============================================

export type HealthWorkout = {
  id: string;
  activityType: string;
  startDate: string;
  duration: number;
  distance?: number;
  calories?: number;
  averageHeartRate?: number;
  source?: string;
};

export async function loadWorkouts(isLive: boolean): Promise<HealthWorkout[]> {
  if (!isLive) return [];
  const w = await call<HealthWorkout[]>('getWorkouts');
  return (w ?? []).slice().sort((a, b) => String(b.startDate).localeCompare(String(a.startDate)));
}

/** Synchronisation complète puis rechargement */
export async function syncNow(): Promise<boolean> {
  if (isRunningInExpoGo || Platform.OS === 'web') return false;
  try {
    await healthConnect.syncAll();
    return true;
  } catch (e) {
    logger.warn('[Sante v2] synchro échouée', e);
    return false;
  }
}

export { isRunningInExpoGo };
