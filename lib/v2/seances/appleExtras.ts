/**
 * Ce que Forme affiche et que Yoroi recalcule, au plus pres d'Apple (14 octobre 2026, agent zones_apple).
 * Fonctions pures, testees dans __tests__/unit/appleExtras.test.ts :
 *  - zones d'Apple lues par le module natif (iOS 27, HKWorkout.zoneGroupsByType) : bornes et temps exacts ;
 *  - meteo comme Forme (degres et humidite tronques) ;
 *  - intermediaires par kilometre depuis les echantillons de distance de la montre (duree, allure, FC, puissance) ;
 *  - frequence cardiaque apres l'exercice (a la fin, apres 1 et 2 minutes) ;
 *  - mesures de course (contact au sol, foulee, oscillation verticale) tronquees comme Forme.
 */
import type { Interval, LowerBounds } from './workoutMath';
import { traduire } from '@/lib/i18n/tr';

const ms = (iso: string | number | Date) => new Date(iso).getTime();

// ---------- Zones d'Apple (iOS 27) ----------

export interface AppleZoneRaw { index: number; min?: number; max?: number; seconds?: number }
export interface AppleZones {
  source: 'system' | 'user' | 'app' | 'autre';
  /** Bornes basses exactes des zones 2 a 5, telles qu'Apple les a utilisees pour cette seance. */
  lowers: LowerBounds;
  /** Temps par zone calcule par Apple, en secondes (5 valeurs). */
  seconds: number[];
}

/**
 * Lit la reponse du module natif (getAppleWorkoutExtrasAsJSON ou getApplePreferredHeartRateZonesAsJSON).
 * Cinq zones attendues, ordonnees ; sinon null (on retombe sur le calcul estime).
 */
export function parseAppleZones(src: { source?: string; zones?: AppleZoneRaw[] } | null | undefined): AppleZones | null {
  const zones = (src?.zones ?? []).slice().sort((a, b) => a.index - b.index);
  if (zones.length !== 5) return null;
  const lows = zones.slice(1).map((z, i) => (typeof z.min === 'number' && isFinite(z.min) ? z.min : zones[i].max));
  if (lows.some((v) => typeof v !== 'number' || !isFinite(v as number) || (v as number) < 40 || (v as number) > 240)) return null;
  for (let i = 1; i < 4; i++) if ((lows[i] as number) <= (lows[i - 1] as number)) return null;
  const seconds = zones.map((z) => (typeof z.seconds === 'number' && isFinite(z.seconds) && z.seconds > 0 ? z.seconds : 0));
  const s = src?.source;
  return {
    source: s === 'system' || s === 'user' || s === 'app' ? s : 'autre',
    lowers: lows as LowerBounds,
    seconds,
  };
}

/** Bornes entieres pour tes reglages, comme Forme les ecrit (120 a 135, 136 a 150...). */
export function roundedLowers(lb: LowerBounds): LowerBounds {
  return lb.map((v) => Math.round(v)) as LowerBounds;
}

/** Libelle d'une zone, sans tiret : « moins de 120 bpm », « 120 a 135 bpm », « 170 bpm et plus ». */
export function zoneRangeLabel(i: number, lb: LowerBounds): string {
  const r = roundedLowers(lb);
  if (i === 0) return traduire("moins de {0} bpm", r[0]);
  if (i === 4) return traduire("{0} bpm et plus", r[3]);
  return traduire("{0} à {1} bpm", r[i - 1], r[i] - 1);
}

/** Temps par zone comme Forme : minutes et secondes, secondes tronquees (00:48 donne 0:48). */
export function zoneClock(sec: number): string {
  const s = Math.max(0, Math.floor(sec + 1e-6));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}` : `${m}:${String(r).padStart(2, '0')}`;
}

// ---------- Meteo ----------

/**
 * Temperature comme Forme : degres Celsius tronques. HKMetadataKeyWeatherTemperature est stocke par la
 * montre en degres Fahrenheit ; la bibliotheque le convertit en Celsius. 83,5 °F font 28,6 °C :
 * l'ancien arrondi affichait 29, Forme affiche 28.
 */
export function appleTemperature(celsius: number): number {
  return Math.floor(celsius + 1e-6);
}

/** Humidite en pourcentage entier tronque. Accepte 0,71 (fraction) ou 71 (pourcentage). */
export function appleHumidity(v: number): number {
  const pct = v > 0 && v <= 1 ? v * 100 : v;
  return Math.floor(pct + 1e-6);
}

// ---------- Mesures de course ----------

/** Tronque a une decimale (0,97 m donne 0,9 m ; 9,86 cm donne 9,8 cm), comme les valeurs de Forme. */
export function trunc1(v: number): number {
  return Math.floor(v * 10 + 1e-6) / 10;
}

// ---------- Intermediaires par kilometre ----------

export interface QSample { start: string; end: string; value: number }
export interface KmSplit {
  index: number;
  /** Distance du troncon en km (1 sauf le dernier). */
  distanceKm: number;
  durationSeconds: number;
  /** Allure du troncon en secondes par km, tronquee. */
  paceSecondsPerKm: number;
  avgHeartRate?: number;
  avgPowerWatts?: number;
  elevationGain: number;
}

function activeMs(a: number, b: number, pauses: { s: number; e: number }[]): number {
  if (b <= a) return 0;
  let d = b - a;
  for (const p of pauses) {
    const o = Math.min(b, p.e) - Math.max(a, p.s);
    if (o > 0) d -= o;
  }
  return Math.max(0, d);
}

/** Moyenne ponderee par le temps des echantillons qui recouvrent [a, b] (un echantillon ponctuel compte 1 s). */
function weightedAvg(samples: { t0: number; t1: number; v: number }[], a: number, b: number): number | undefined {
  let w = 0;
  let sum = 0;
  for (const s of samples) {
    if (s.t1 < a || s.t0 > b) continue;
    const d = s.t1 > s.t0 ? Math.max(0, Math.min(b, s.t1) - Math.max(a, s.t0)) : 1000;
    if (d <= 0) continue;
    w += d;
    sum += s.v * d;
  }
  return w > 0 ? sum / w : undefined;
}

/**
 * Intermediaires depuis les echantillons de distance de la montre (comme Forme) : chaque echantillon est
 * reparti lineairement sur sa duree, on cherche l'instant ou le cumul passe chaque kilometre. Le premier
 * troncon part du debut de la seance, le dernier s'arrete au dernier echantillon de distance. Pauses retirees.
 * FC et puissance : moyennes ponderees par le temps sur chaque troncon.
 */
export function splitsFromDistance(
  distance: QSample[],
  opt: { start: string; pauses?: Interval[]; hr?: { timestamp: string; bpm: number }[]; power?: QSample[]; minLastMeters?: number },
): KmSplit[] {
  const ds = distance
    .map((d) => ({ t0: ms(d.start), t1: ms(d.end), v: d.value }))
    .filter((d) => isFinite(d.t0) && isFinite(d.t1) && d.v > 0)
    .sort((a, b) => a.t0 - b.t0);
  if (!ds.length) return [];
  const pauses = (opt.pauses ?? []).map((p) => ({ s: ms(p.start), e: ms(p.end) })).filter((p) => p.e > p.s);
  const hr = (opt.hr ?? []).map((h) => ({ t0: ms(h.timestamp), t1: ms(h.timestamp), v: h.bpm })).filter((h) => isFinite(h.t0) && h.v > 0);
  const pw = (opt.power ?? []).map((p) => ({ t0: ms(p.start), t1: ms(p.end), v: p.value })).filter((p) => isFinite(p.t0) && p.v > 0);
  const cuts: { t: number; m: number }[] = [{ t: Math.min(ms(opt.start), ds[0].t0), m: 0 }];
  let cum = 0;
  let nextKm = 1000;
  for (const d of ds) {
    while (cum + d.v >= nextKm) {
      const f = (nextKm - cum) / d.v;
      cuts.push({ t: d.t0 + f * (d.t1 - d.t0), m: nextKm });
      nextKm += 1000;
    }
    cum += d.v;
  }
  const lastT = ds[ds.length - 1].t1;
  if (cum - (nextKm - 1000) >= (opt.minLastMeters ?? 50)) cuts.push({ t: lastT, m: cum });
  const out: KmSplit[] = [];
  for (let i = 1; i < cuts.length; i++) {
    const a = cuts[i - 1];
    const b = cuts[i];
    const dur = activeMs(a.t, b.t, pauses) / 1000;
    const km = (b.m - a.m) / 1000;
    if (!(dur > 0) || !(km > 0)) continue;
    const avgHr = weightedAvg(hr, a.t, b.t);
    const avgPw = weightedAvg(pw, a.t, b.t);
    out.push({
      index: i,
      distanceKm: Math.round(km * 1000) / 1000,
      durationSeconds: dur,
      paceSecondsPerKm: Math.floor(dur / km),
      avgHeartRate: avgHr != null ? Math.round(avgHr) : undefined,
      avgPowerWatts: avgPw != null ? Math.round(avgPw) : undefined,
      elevationGain: 0,
    });
  }
  return out;
}

// ---------- Frequence cardiaque apres l'exercice ----------

/**
 * Valeurs sous le graphique « Frequence cardiaque apres exercice » de Forme : a la fin, apres 1 min, apres 2 min.
 * A la fin : premiere mesure a partir de la fin (15 s au plus), sinon la derniere mesure de la seance.
 * Apres 1 et 2 min : la mesure la plus proche de fin + 60 s et fin + 120 s (20 s d'ecart au plus).
 * L'ancien calcul prenait la premiere mesure entre 50 et 90 s, souvent le pic juste apres l'arret.
 */
export function recoveryFromSamples(
  during: { timestamp: string; bpm: number }[],
  after: { timestamp: string; bpm: number }[],
  endIso: string,
): { atEnd: number; after1Min?: number; after2Min?: number } | null {
  const end = ms(endIso);
  const post = after.map((s) => ({ t: ms(s.timestamp), v: s.bpm })).filter((s) => isFinite(s.t) && s.v > 0 && s.t >= end).sort((a, b) => a.t - b.t);
  const pre = during.map((s) => ({ t: ms(s.timestamp), v: s.bpm })).filter((s) => isFinite(s.t) && s.v > 0 && s.t <= end).sort((a, b) => a.t - b.t);
  if (!post.length) return null;
  const first = post[0].t - end <= 15000 ? post[0] : pre[pre.length - 1] ?? post[0];
  const near = (target: number) => {
    let best: { t: number; v: number } | null = null;
    for (const s of post) if (!best || Math.abs(s.t - target) < Math.abs(best.t - target)) best = s;
    return best && Math.abs(best.t - target) <= 20000 ? Math.round(best.v) : undefined;
  };
  return { atEnd: Math.round(first.v), after1Min: near(end + 60000), after2Min: near(end + 120000) };
}

// ---------- Heure de fin ----------

/** Heure locale « 18:22 » d'un instant, minutes tronquees comme Forme. */
export function clockOf(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
