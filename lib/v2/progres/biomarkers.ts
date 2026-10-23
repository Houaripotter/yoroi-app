/**
 * Biomarqueurs du corps (refonte v2) : chaque mesure de composition d'une pesee,
 * son ecart avec la mesure precedente, et un statut bas, normal ou eleve
 * UNIQUEMENT quand un repere publie et fiable existe :
 * - IMC : classification de l'OMS (memes seuils que BMI_RANGES de lib/healthRanges.ts),
 *   18,5 et 25 kg/m2.
 * - Masse grasse : Gallagher D et al., Am J Clin Nutr 2000;72:694-701 (PMID 10966886),
 *   la source citee par lib/healthRanges.ts, avec son tableau par sexe et par age
 *   (20 a 39, 40 a 59, 60 a 79 ans). Hors de ces ages, ou sans sexe connu : pas de statut.
 * - Graisse viscerale : echelle de 1 a 59 des balances a impedance (Tanita, fabricant
 *   a l'origine de l'indice) : 1 a 12 sain, 13 et plus excessif. Pas de zone basse.
 * - Eau : fourchettes adultes publiees par Tanita pour ses balances a impedance,
 *   femme 45 a 60 %, homme 50 a 65 %. Sans sexe connu : pas de statut.
 * Sans repere fiable (muscle, os, masse maigre, metabolisme, age metabolique),
 * on montre la valeur et l'ecart, jamais un statut.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getProfile, getWeights } from '@/lib/database';
import type { Profile } from '@/lib/database';
import { BMI_RANGES } from '@/lib/healthRanges';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { loadComposition } from './composition';
import type { CompoKey, CompoPoint } from './composition';
import { daysDiff, dayShort, num, thousands } from './format';
import { traduire } from '@/lib/i18n/tr';

export type BioKey = CompoKey | 'bmi' | 'lean';

export type BodyContext = {
  heightCm?: number;
  sex?: 'male' | 'female';
  birthDate?: string;
  age?: number;
};

export type StatusWord = 'Bas' | 'Normal' | 'Élevé';

export type Segment = { status: StatusWord; from: number; to: number };

export type BioRange = {
  /** bornes de la jauge (affichage) */
  min: number;
  max: number;
  segments: Segment[];
  source: string;
};

export type BioRow = {
  key: BioKey;
  label: string;
  /** chiffre affiche, sans l'unite */
  value: string;
  unit: string;
  raw: number;
  /** precision sous le nom (« soit 21,3 kg ») */
  sub?: string;
  /** ecart avec la mesure precedente qui porte cette donnee */
  delta?: string;
  deltaGood?: boolean;
  range?: BioRange;
  status?: StatusWord;
};

export type Trend = {
  title: string;
  text: string;
};

// ---------- profil ----------

export function ageAt(ctx: BodyContext, date: string): number | undefined {
  if (ctx.birthDate) {
    const a = Math.floor(daysDiff(ctx.birthDate.slice(0, 10), date) / 365.25);
    return a > 0 && a < 120 ? a : undefined;
  }
  return ctx.age && ctx.age > 0 ? ctx.age : undefined;
}

export function contextOf(p: Profile | null | undefined): BodyContext {
  if (!p) return {};
  const h = typeof p.height_cm === 'number' && p.height_cm > 80 && p.height_cm < 250 ? p.height_cm : undefined;
  return {
    heightCm: h,
    sex: p.avatar_gender === 'femme' ? 'female' : p.avatar_gender === 'homme' ? 'male' : undefined,
    birthDate: p.birth_date || undefined,
    age: typeof p.age === 'number' ? p.age : undefined,
  };
}

// ---------- reperes ----------

function zoneEdge(label: string, side: 'start' | 'end', fallback: number): number {
  const z = BMI_RANGES.zones.find((x) => x.label === label);
  return z ? z[side] : fallback;
}

/** OMS : maigreur sous 18,5, corpulence normale de 18,5 a 25, surpoids des 25 */
export function bmiRange(): BioRange {
  const low = zoneEdge('normal', 'start', 18.5);
  const high = zoneEdge('overweight', 'start', 25);
  return {
    min: 15,
    max: 35,
    segments: [
      { status: 'Bas', from: 15, to: low },
      { status: 'Normal', from: low, to: high },
      { status: 'Élevé', from: high, to: 35 },
    ],
    source: traduire('Repères de l’Organisation mondiale de la santé'),
  };
}

/** Gallagher 2000 : bornes de la zone saine (en %) par sexe et par age */
const GALLAGHER: Record<'male' | 'female', { upTo: number; low: number; high: number }[]> = {
  male: [
    { upTo: 39, low: 8, high: 20 },
    { upTo: 59, low: 11, high: 22 },
    { upTo: 79, low: 13, high: 25 },
  ],
  female: [
    { upTo: 39, low: 21, high: 33 },
    { upTo: 59, low: 23, high: 34 },
    { upTo: 79, low: 24, high: 36 },
  ],
};

export function fatRange(ctx: BodyContext, date: string): BioRange | undefined {
  const age = ageAt(ctx, date);
  if (!ctx.sex || !age || age < 20 || age > 79) return undefined;
  const band = GALLAGHER[ctx.sex].find((b) => age <= b.upTo);
  if (!band) return undefined;
  const min = Math.max(2, band.low - 8);
  const max = band.high + 15;
  return {
    min,
    max,
    segments: [
      { status: 'Bas', from: min, to: band.low },
      { status: 'Normal', from: band.low, to: band.high },
      { status: 'Élevé', from: band.high, to: max },
    ],
    source: traduire("Repères Gallagher 2000, {0} de {1} ans", ctx.sex === 'female' ? traduire('femme') : traduire('homme'), band.upTo === 39 ? traduire('20 à 39') : band.upTo === 59 ? traduire('40 à 59') : traduire('60 à 79')),
  };
}

export function visceralRange(): BioRange {
  return {
    min: 1,
    max: 25,
    segments: [
      { status: 'Normal', from: 1, to: 13 },
      { status: 'Élevé', from: 13, to: 25 },
    ],
    source: traduire('Échelle des balances à impédance : sain jusqu’à 12'),
  };
}

/** Tanita : eau totale chez l'adulte en bonne sante, femme 45 a 60 %, homme 50 a 65 % */
export function waterRange(ctx: BodyContext, date: string): BioRange | undefined {
  const age = ageAt(ctx, date);
  if (!ctx.sex || (age !== undefined && age < 18)) return undefined;
  const [low, high] = ctx.sex === 'female' ? [45, 60] : [50, 65];
  return {
    min: low - 10,
    max: high + 8,
    segments: [
      { status: 'Bas', from: low - 10, to: low },
      { status: 'Normal', from: low, to: high },
      { status: 'Élevé', from: high, to: high + 8 },
    ],
    source: ctx.sex === 'female' ? traduire('Repères Tanita, femme adulte') : traduire('Repères Tanita, homme adulte'),
  };
}

export function statusIn(range: BioRange, v: number): StatusWord {
  for (const s of range.segments) if (v < s.to) return s.status;
  return range.segments[range.segments.length - 1].status;
}

/** Position du curseur de 0 a 1 : chaque segment a la meme largeur a l'ecran */
export function gaugePos(range: BioRange, v: number): number {
  const n = range.segments.length;
  const clamped = Math.min(range.max, Math.max(range.min, v));
  for (let i = 0; i < n; i++) {
    const s = range.segments[i];
    if (clamped <= s.to || i === n - 1) {
      const t = s.to > s.from ? (clamped - s.from) / (s.to - s.from) : 0.5;
      return Math.min(1, Math.max(0, (i + Math.min(1, Math.max(0, t))) / n));
    }
  }
  return 1;
}

// ---------- valeurs derivees ----------

export function bmiOf(weight: number | undefined, heightCm: number | undefined): number | undefined {
  if (!weight || !heightCm) return undefined;
  const m = heightCm / 100;
  return Math.round((weight / (m * m)) * 10) / 10;
}

export function fatKgOf(p: CompoPoint): number | undefined {
  return p.fat && p.weight ? Math.round(((p.fat * p.weight) / 100) * 10) / 10 : undefined;
}

export function leanPctOf(p: CompoPoint): number | undefined {
  return p.fat ? Math.round((100 - p.fat) * 10) / 10 : undefined;
}

export function bonePctOf(p: CompoPoint): number | undefined {
  return p.bone && p.weight ? Math.round(((p.bone / p.weight) * 100) * 10) / 10 : undefined;
}

export function muscleKgOf(p: CompoPoint): number | undefined {
  if (p.muscleKg) return p.muscleKg;
  return p.muscle && p.weight ? Math.round(((p.muscle * p.weight) / 100) * 10) / 10 : undefined;
}

export function musclePctOf(p: CompoPoint): number | undefined {
  if (p.muscle) return p.muscle;
  return p.muscleKg && p.weight ? Math.round((p.muscleKg / p.weight) * 1000) / 10 : undefined;
}

/** Valeur d'un biomarqueur pour une mesure */
export function bioValue(p: CompoPoint, key: BioKey, ctx: BodyContext): number | undefined {
  switch (key) {
    case 'bmi':
      return bmiOf(p.weight, ctx.heightCm);
    case 'lean':
      return leanPctOf(p);
    case 'muscleKg':
      return muscleKgOf(p);
    case 'muscle':
      return musclePctOf(p);
    default: {
      const v = p[key];
      return typeof v === 'number' && v > 0 ? v : undefined;
    }
  }
}

export function bioSeries(points: CompoPoint[], key: BioKey, ctx: BodyContext): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  for (const p of points) {
    const v = bioValue(p, key, ctx);
    if (v !== undefined) out.push({ date: p.date, value: v });
  }
  return out;
}

// ---------- lignes de la liste ----------

type RowSpec = { key: BioKey; label: string; unit: string; digits: number; good: 'up' | 'down' | 'none'; deltaUnit: [string, string] };

export const BIO_ORDER: RowSpec[] = [
  { key: 'bmi', label: traduire('IMC'), unit: '', digits: 1, good: 'none', deltaUnit: [traduire('point'), traduire('points')] },
  { key: 'fat', label: 'Masse grasse', unit: '%', digits: 1, good: 'down', deltaUnit: [traduire('point'), traduire('points')] },
  { key: 'muscleKg', label: traduire('Masse musculaire'), unit: 'kg', digits: 1, good: 'up', deltaUnit: ['kg', 'kg'] },
  { key: 'lean', label: traduire('Masse maigre'), unit: '%', digits: 1, good: 'none', deltaUnit: [traduire('point'), traduire('points')] },
  { key: 'water', label: 'Eau', unit: '%', digits: 1, good: 'none', deltaUnit: [traduire('point'), traduire('points')] },
  { key: 'bone', label: 'Masse osseuse', unit: 'kg', digits: 1, good: 'none', deltaUnit: ['kg', 'kg'] },
  { key: 'visceral', label: 'Graisse viscérale', unit: '', digits: 1, good: 'down', deltaUnit: [traduire('niveau'), traduire('niveaux')] },
  { key: 'bmr', label: traduire('Métabolisme de base'), unit: 'kcal', digits: 0, good: 'none', deltaUnit: ['kcal', 'kcal'] },
  { key: 'metabolicAge', label: traduire('Âge métabolique'), unit: 'ans', digits: 0, good: 'down', deltaUnit: [traduire('an'), traduire('ans')] },
];

export function bioLabel(key: BioKey): string {
  return BIO_ORDER.find((r) => r.key === key)?.label ?? key;
}

function fmt(v: number, digits: number, unit: string): string {
  return unit === 'kcal' ? thousands(v) : num(v, digits);
}

function deltaWords(d: number, spec: RowSpec): string {
  const eps = spec.digits === 0 ? 0.5 : 0.05;
  const abs = Math.abs(d);
  if (abs < eps) return 'stable';
  const u = abs >= 2 ? spec.deltaUnit[1] : spec.deltaUnit[0];
  return d < 0 ? traduire("{0} {1} de moins", spec.unit === 'kcal' ? thousands(abs) : num(abs, spec.digits === 0 ? 0 : 1), u) : traduire("{0} {1} de plus", spec.unit === 'kcal' ? thousands(abs) : num(abs, spec.digits === 0 ? 0 : 1), u);
}

function rangeOf(key: BioKey, ctx: BodyContext, date: string): BioRange | undefined {
  if (key === 'bmi') return bmiRange();
  if (key === 'fat') return fatRange(ctx, date);
  if (key === 'visceral') return visceralRange();
  if (key === 'water') return waterRange(ctx, date);
  return undefined;
}

/** Valeur precedente d'une donnee avant l'indice donne */
function prevValue(points: CompoPoint[], index: number, key: BioKey, ctx: BodyContext): { value: number; date: string } | undefined {
  for (let i = index - 1; i >= 0; i--) {
    const v = bioValue(points[i], key, ctx);
    if (v !== undefined) return { value: v, date: points[i].date };
  }
  return undefined;
}

export type BioList = {
  rows: BioRow[];
  /** donnees jamais notees dans aucune mesure */
  missing: string[];
  /** IMC impossible faute de taille */
  needHeight: boolean;
};

export function buildBiomarkers(points: CompoPoint[], index: number, ctx: BodyContext): BioList {
  const p = points[index];
  const rows: BioRow[] = [];
  const missing: string[] = [];
  let needHeight = false;
  if (!p) return { rows, missing, needHeight };
  for (const spec of BIO_ORDER) {
    const v = bioValue(p, spec.key, ctx);
    if (v === undefined) {
      if (spec.key === 'bmi') {
        if (!ctx.heightCm && p.weight) needHeight = true;
        continue;
      }
      const ever = points.some((q) => bioValue(q, spec.key, ctx) !== undefined);
      if (!ever) missing.push(spec.label.charAt(0).toLowerCase() + spec.label.slice(1));
      continue;
    }
    const prev = prevValue(points, index, spec.key, ctx);
    const d = prev ? v - prev.value : null;
    const words = d === null ? undefined : deltaWords(d, spec);
    const range = rangeOf(spec.key, ctx, p.date);
    let sub: string | undefined;
    if (spec.key === 'fat') {
      const kg = fatKgOf(p);
      if (kg) sub = traduire("soit {0} kg", num(kg, 1));
    } else if (spec.key === 'muscleKg') {
      const pct = musclePctOf(p);
      if (pct) sub = traduire("soit {0} % du poids", num(pct, 1));
    } else if (spec.key === 'lean') {
      const fk = fatKgOf(p);
      if (fk && p.weight) sub = traduire("soit {0} kg sans la graisse", num(p.weight - fk, 1));
    } else if (spec.key === 'bone') {
      const pct = bonePctOf(p);
      if (pct) sub = traduire("soit {0} % du poids", num(pct, 1));
    } else if (spec.key === 'bmi') {
      sub = traduire("pour {0} m", num((ctx.heightCm ?? 0) / 100, 2));
    } else if (spec.key === 'visceral') {
      sub = traduire('niveau sur une échelle de 1 à 59');
    } else if (spec.key === 'metabolicAge') {
      const a = ageAt(ctx, p.date);
      if (a) sub = traduire("ton âge réel : {0} ans", a);
    } else if (spec.key === 'bmr') {
      sub = traduire('dépense au repos sur 24 h');
    }
    rows.push({
      key: spec.key,
      label: spec.label,
      value: fmt(v, spec.digits, spec.unit),
      unit: spec.unit,
      raw: v,
      sub,
      delta: words,
      deltaGood: d !== null && words !== 'stable' && ((spec.good === 'down' && d < 0) || (spec.good === 'up' && d > 0)),
      range,
      status: range ? statusIn(range, v) : undefined,
    });
  }
  return { rows, missing, needHeight };
}

// ---------- deux masses cles (muscle et graisse en kg) ----------

export type KeyMass = {
  key: 'muscleKg' | 'fatKg';
  label: string;
  /** kg de la mesure */
  kg: number;
  /** part du poids en % */
  pct?: number;
  /** ecart en kg avec la mesure precedente qui porte cette donnee */
  diff?: number;
  /** bon sens de l'ecart */
  good: 'up' | 'down';
  /** les dernieres valeurs jusqu'a cette mesure, pour une petite courbe */
  spark: number[];
  status?: StatusWord;
};

export function keyMasses(points: CompoPoint[], index: number, ctx: BodyContext): KeyMass[] {
  const p = points[index];
  if (!p) return [];
  const out: KeyMass[] = [];
  const build = (key: KeyMass['key'], label: string, get: (q: CompoPoint) => number | undefined, pct: number | undefined, good: 'up' | 'down', status?: StatusWord) => {
    const kg = get(p);
    if (kg === undefined) return;
    let prev: number | undefined;
    for (let i = index - 1; i >= 0; i--) {
      const v = get(points[i]);
      if (v !== undefined) {
        prev = v;
        break;
      }
    }
    const spark: number[] = [];
    for (let i = 0; i <= index; i++) {
      const v = get(points[i]);
      if (v !== undefined) spark.push(v);
    }
    out.push({ key, label, kg, pct, diff: prev === undefined ? undefined : Math.round((kg - prev) * 10) / 10, good, spark: spark.slice(-10), status });
  };
  build('muscleKg', traduire('Masse musculaire'), muscleKgOf, musclePctOf(p), 'up');
  const fr = p.fat ? fatRange(ctx, p.date) : undefined;
  build('fatKg', 'Masse grasse', fatKgOf, p.fat, 'down', fr && p.fat ? statusIn(fr, p.fat) : undefined);
  return out;
}

// ---------- barre de composition ----------

export type BarPart = { key: 'muscle' | 'fat' | 'bone' | 'lean' | 'other'; label: string; pct: number };

/** Muscle, graisse, os en part du poids ; un reste « autre » si la somme n'atteint pas 100 */
export function compositionBar(p: CompoPoint): BarPart[] {
  const fat = p.fat;
  const muscle = musclePctOf(p);
  const bone = bonePctOf(p);
  const parts: BarPart[] = [];
  const sum = (fat ?? 0) + (muscle ?? 0) + (bone ?? 0);
  if (muscle && sum <= 101) {
    parts.push({ key: 'muscle', label: 'Muscle', pct: muscle });
    if (fat) parts.push({ key: 'fat', label: 'Graisse', pct: fat });
    if (bone) parts.push({ key: 'bone', label: traduire('Os'), pct: bone });
    const rest = 100 - sum;
    if (rest >= 1) parts.push({ key: 'other', label: 'Autre', pct: rest });
    return parts;
  }
  if (fat) {
    parts.push({ key: 'lean', label: traduire('Masse maigre'), pct: 100 - fat });
    parts.push({ key: 'fat', label: 'Graisse', pct: fat });
  }
  return parts;
}

// ---------- tendance ----------

/** Ecart minimal, choix de YOROI : en dessous, une balance a impedance ne permet pas de conclure */
const TREND_KG = 0.5;
const TREND_PT = 0.5;

function refIndex(points: CompoPoint[], index: number, ok: (p: CompoPoint) => boolean): number | null {
  const cur = points[index];
  let oldestRecent: number | null = null;
  for (let i = index - 1; i >= 0; i--) {
    if (!ok(points[i])) continue;
    if (daysDiff(points[i].date, cur.date) >= 21) return i;
    oldestRecent = i;
  }
  return oldestRecent;
}

function kgWords(abs: number): string {
  return `${num(abs, 1)} kg`;
}

export function trendOf(points: CompoPoint[], index: number): Trend | null {
  const cur = points[index];
  if (!cur) return null;
  const curFat = fatKgOf(cur);
  const curMus = muscleKgOf(cur);
  if (curFat !== undefined || curMus !== undefined) {
    const ri = refIndex(points, index, (q) => (curFat === undefined || fatKgOf(q) !== undefined) && (curMus === undefined || muscleKgOf(q) !== undefined));
    if (ri === null) return { title: traduire('Première mesure'), text: traduire('La tendance apparaîtra dès ta prochaine pesée avec composition.') };
    const ref = points[ri];
    const df = curFat !== undefined ? curFat - (fatKgOf(ref) as number) : 0;
    const dm = curMus !== undefined ? curMus - (muscleKgOf(ref) as number) : 0;
    const f = Math.abs(df) >= TREND_KG ? (df < 0 ? -1 : 1) : 0;
    const m = Math.abs(dm) >= TREND_KG ? (dm < 0 ? -1 : 1) : 0;
    let title = 'Stable';
    if (f < 0 && m > 0) title = traduire('Perte de graisse, prise de muscle');
    else if (f < 0 && m < 0) title = traduire('Perte de graisse et de muscle');
    else if (f < 0) title = traduire('Perte de graisse');
    else if (f > 0 && m > 0) title = traduire('Prise de muscle et de graisse');
    else if (m > 0) title = traduire('Prise de muscle');
    else if (f > 0) title = traduire('Prise de graisse');
    else if (m < 0) title = traduire('Perte de muscle');
    const bits: string[] = [];
    if (curFat !== undefined) bits.push(Math.abs(df) < 0.05 ? traduire('graisse stable') : df < 0 ? traduire("{0} de graisse en moins", kgWords(Math.abs(df))) : traduire("{0} de graisse en plus", kgWords(Math.abs(df))));
    if (curMus !== undefined) bits.push(Math.abs(dm) < 0.05 ? traduire('muscle stable') : dm < 0 ? traduire("{0} de muscle en moins", kgWords(Math.abs(dm))) : traduire("{0} de muscle en plus", kgWords(Math.abs(dm))));
    const since = traduire("depuis le {0}", dayShort(ref.date, ref.date.slice(0, 4) !== cur.date.slice(0, 4)));
    const text = title === 'Stable' ? traduire("Moins de {0} kg d’écart {1} : {2}.", num(TREND_KG, 1), since, bits.join(', ')).replace(/\.\.$/, '.') : `${bits.join(', ')} ${since}`.replace(/\.*$/, '') + '.';
    return { title, text: text.charAt(0).toUpperCase() + text.slice(1) };
  }
  if (cur.fat !== undefined) {
    const ri = refIndex(points, index, (q) => q.fat !== undefined);
    if (ri === null) return { title: traduire('Première mesure'), text: traduire('La tendance apparaîtra dès ta prochaine pesée avec composition.') };
    const ref = points[ri];
    const d = cur.fat - (ref.fat as number);
    const since = traduire("depuis le {0}", dayShort(ref.date));
    if (Math.abs(d) < TREND_PT) return { title: 'Stable', text: traduire("Masse grasse stable {0}", since).replace(/\.*$/, '') + '.' };
    return { title: d < 0 ? traduire('Perte de graisse') : traduire('Prise de graisse'), text: (d < 0 ? traduire("{0} point de masse grasse en moins {1}", num(Math.abs(d), 1), since) : traduire("{0} point de masse grasse en plus {1}", num(Math.abs(d), 1), since)).replace(/\.*$/, '') + '.' };
  }
  return null;
}

// ---------- chargement ----------

export type BiomarkersData = {
  points: CompoPoint[];
  ctx: BodyContext;
  /** toutes les pesees (une par jour), pour la courbe de l'IMC */
  weights: { date: string; weight: number }[];
  loading: boolean;
};

async function loadAll(): Promise<Omit<BiomarkersData, 'loading'>> {
  const [points, profile, ws] = await Promise.all([
    loadComposition().catch((err) => {
      logger.error('Lecture composition impossible', err);
      return [] as CompoPoint[];
    }),
    getProfile().catch(() => null),
    getWeights().catch(() => []),
  ]);
  const byDate = new Map<string, number>();
  for (const w of ws ?? []) {
    if (!w?.date || !(w.weight > 0)) continue;
    byDate.set(w.date.slice(0, 10), w.weight);
  }
  const weights = Array.from(byDate.entries())
    .map(([date, weight]) => ({ date, weight }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
  return { points, ctx: contextOf(profile as Profile | null), weights };
}

export function useBiomarkers(): BiomarkersData {
  const [data, setData] = useState<Omit<BiomarkersData, 'loading'>>({ points: [], ctx: {}, weights: [] });
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const load = useCallback(async () => {
    try {
      const v = await loadAll();
      if (alive.current) setData(v);
    } catch (err) {
      logger.error('Chargement des biomarqueurs impossible', err);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);
  return { ...data, loading };
}

/** Courbe de l'IMC : toutes les pesees, avec la taille du profil */
export function bmiSeries(weights: { date: string; weight: number }[], ctx: BodyContext): { date: string; value: number }[] {
  if (!ctx.heightCm) return [];
  return weights.map((w) => ({ date: w.date, value: bmiOf(w.weight, ctx.heightCm) as number }));
}

/** Explications des deux mesures calculees par YOROI */
export const BIO_EXPLAIN: Record<'bmi' | 'lean', { text: string; tip?: string }> = {
  bmi: {
    text: traduire('Ton poids divisé par ta taille au carré. L’OMS parle de corpulence normale entre 18,5 et 25, de surpoids à partir de 25 et d’obésité à partir de 30.'),
    tip: traduire('L’IMC ne distingue pas le muscle de la graisse : chez un sportif musclé, il peut être élevé sans excès de graisse. Regarde-le avec ta masse grasse.'),
  },
  lean: {
    text: traduire('Tout ce qui n’est pas de la graisse : muscles, os, organes, eau. YOROI la calcule à partir de ta masse grasse.'),
    tip: traduire('Si elle monte pendant que ton poids reste stable, tu remplaces de la graisse par du muscle.'),
  },
};
