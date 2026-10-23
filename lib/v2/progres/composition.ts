/**
 * Composition du corps : reunit les pesees qui portent une composition
 * (masse grasse, muscle, eau) et les saisies de l'ancien ecran composition.
 * Une valeur par jour, la pesee du jour l'emporte si les deux existent.
 */
import { getWeights, upsertWeight } from '@/lib/database';
import type { Weight } from '@/lib/database';
import { addBodyComposition, getAllBodyCompositions } from '@/lib/bodyComposition';
import type { BodyComposition } from '@/lib/bodyComposition';
import { logger } from '@/lib/security/logger';
import { parseScaleJson } from '@/lib/v2/balance/format';
import type { ScaleJson } from '@/lib/v2/balance/format';

export type CompoPoint = {
  date: string;
  weight?: number;
  fat?: number; // %
  muscle?: number; // %
  muscleKg?: number;
  water?: number; // %
  bone?: number; // kg
  visceral?: number;
  metabolicAge?: number;
  bmr?: number;
  source?: string;
  // BALANCE_PHOTO : ce que donne une balance segmentaire (Tanita BC-545N), seulement si mesure
  /** graisse en % et muscle en kg par segment */
  seg?: CompoSegments;
  /** morphologie de 1 a 9 (physique rating Tanita) */
  physique?: number;
  /** BALANCE 2 : les autres mesures de la balance (masse maigre, proteines, lignes autre...), seulement si mesure */
  extra?: ScaleJson;
};

export type SegmentId = 'arm_right' | 'arm_left' | 'trunk' | 'leg_right' | 'leg_left';
export type CompoSegments = { fat: Partial<Record<SegmentId, number>>; muscle: Partial<Record<SegmentId, number>> };

const SEG_IDS: SegmentId[] = ['arm_right', 'arm_left', 'trunk', 'leg_right', 'leg_left'];

function segmentsOf(w: Weight): CompoSegments | undefined {
  const fat: Partial<Record<SegmentId, number>> = {};
  const muscle: Partial<Record<SegmentId, number>> = {};
  let any = false;
  for (const id of SEG_IDS) {
    const f = Number((w as unknown as Record<string, unknown>)[`fat_${id}`]);
    const m = Number((w as unknown as Record<string, unknown>)[`muscle_${id}`]);
    if (Number.isFinite(f) && f > 0) { fat[id] = f; any = true; }
    if (Number.isFinite(m) && m > 0) { muscle[id] = m; any = true; }
  }
  return any ? { fat, muscle } : undefined;
}

export type CompoKey = 'weight' | 'fat' | 'muscle' | 'muscleKg' | 'water' | 'bone' | 'visceral' | 'metabolicAge' | 'bmr';

export type CompoMetric = {
  key: CompoKey;
  label: string;
  short: string;
  unit: string;
  digits: number;
  good: 'up' | 'down' | 'none';
  hint?: string;
};

export const COMPO_METRICS: CompoMetric[] = [
  { key: 'fat', label: 'Masse grasse', short: 'Graisse', unit: '%', digits: 1, good: 'down' },
  { key: 'muscle', label: 'Muscle', short: 'Muscle', unit: '%', digits: 1, good: 'up' },
  { key: 'water', label: 'Eau', short: 'Eau', unit: '%', digits: 1, good: 'none' },
  { key: 'weight', label: 'Poids', short: 'Poids', unit: 'kg', digits: 1, good: 'none' },
  { key: 'muscleKg', label: 'Masse musculaire', short: 'Muscle en kg', unit: 'kg', digits: 1, good: 'up' },
  { key: 'bone', label: 'Masse osseuse', short: 'Os', unit: 'kg', digits: 1, good: 'none' },
  { key: 'visceral', label: 'Graisse viscérale', short: 'Viscérale', unit: '', digits: 1, good: 'down', hint: 'niveau de 1 à 59, sain jusqu’à 12' },
  { key: 'metabolicAge', label: 'Âge métabolique', short: 'Âge méta.', unit: 'ans', digits: 0, good: 'down' },
  { key: 'bmr', label: 'Métabolisme de base', short: 'Métabolisme', unit: 'kcal', digits: 0, good: 'none' },
];

/** Anciens identifiants de l'ecran composition (parametre metric) */
export const LEGACY_METRIC_IDS: Record<string, CompoKey> = {
  weight: 'weight',
  fatPercentage: 'fat',
  muscleMass: 'muscleKg',
  waterPercentage: 'water',
  bmr: 'bmr',
  metabolicAge: 'metabolicAge',
  boneMass: 'bone',
  visceralFat: 'visceral',
};

const pos = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

function fromWeight(w: Weight): CompoPoint {
  const weight = pos(w.weight);
  const muscle = pos(w.muscle_percent);
  const muscleKgExact = pos(Number(w.muscle_kg));
  return {
    date: w.date.slice(0, 10),
    weight,
    fat: pos(w.fat_percent),
    muscle,
    muscleKg: muscleKgExact ?? (muscle && weight ? Math.round(((muscle * weight) / 100) * 10) / 10 : undefined),
    water: pos(w.water_percent),
    bone: pos(w.bone_mass),
    visceral: pos(w.visceral_fat),
    metabolicAge: pos(w.metabolic_age),
    bmr: pos(w.bmr),
    source: w.source,
    seg: segmentsOf(w),
    physique: pos(Number(w.physique_rating)),
    extra: parseScaleJson(w.scale_extras),
  };
}

function fromLegacy(b: BodyComposition): CompoPoint {
  const weight = pos(b.weight);
  const muscleKg = pos(b.muscleMass);
  return {
    date: (b.date || '').slice(0, 10),
    weight,
    fat: pos(b.bodyFatPercent),
    muscleKg,
    muscle: muscleKg && weight ? Math.round((muscleKg / weight) * 1000) / 10 : undefined,
    water: pos(b.waterPercent),
    bone: pos(b.boneMass),
    visceral: pos(b.visceralFat),
    metabolicAge: pos(b.metabolicAge),
    bmr: pos(b.bmr),
    source: b.source,
  };
}

function hasCompo(p: CompoPoint): boolean {
  return !!(p.fat || p.muscle || p.water || p.muscleKg || p.bone || p.visceral || p.metabolicAge || p.bmr || p.seg || p.physique || p.extra);
}

/** Toutes les mesures de composition, de la plus ancienne a la plus recente */
export async function loadComposition(): Promise<CompoPoint[]> {
  const byDate = new Map<string, CompoPoint>();
  try {
    const legacy = await getAllBodyCompositions();
    for (const b of legacy ?? []) {
      if (!b?.date) continue;
      const p = fromLegacy(b);
      if (hasCompo(p)) byDate.set(p.date, p);
    }
  } catch (err) {
    logger.error('Lecture composition (ancien format) impossible', err);
  }
  try {
    const ws = await getWeights();
    for (const w of ws ?? []) {
      if (!w?.date) continue;
      const p = fromWeight(w);
      if (!hasCompo(p)) continue;
      const prev = byDate.get(p.date);
      // On complete : la pesee l'emporte, l'ancienne saisie comble les trous
      byDate.set(p.date, prev ? { ...prev, ...Object.fromEntries(Object.entries(p).filter(([, v]) => v !== undefined)) } : p);
    }
  } catch (err) {
    logger.error('Lecture des pesees impossible', err);
  }
  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function seriesOf(points: CompoPoint[], key: CompoKey): { date: string; value: number }[] {
  return points.filter((p) => typeof p[key] === 'number' && (p[key] as number) > 0).map((p) => ({ date: p.date, value: p[key] as number }));
}

export type CompoInput = {
  date: string;
  weight: number;
  fat?: number;
  muscleKg?: number;
  water?: number;
  bone?: number;
  visceral?: number;
  metabolicAge?: number;
  bmr?: number;
};

/** Enregistre dans la pesee du jour (visible partout) et dans l'ancien format (ecrans pas encore refaits) */
export async function saveComposition(input: CompoInput): Promise<void> {
  const musclePercent = input.muscleKg && input.weight ? Math.round((input.muscleKg / input.weight) * 1000) / 10 : undefined;
  await upsertWeight({
    weight: input.weight,
    date: input.date,
    source: 'manual',
    fat_percent: input.fat,
    muscle_percent: musclePercent,
    water_percent: input.water,
    bone_mass: input.bone,
    visceral_fat: input.visceral,
    metabolic_age: input.metabolicAge,
    bmr: input.bmr,
  });
  try {
    await addBodyComposition({
      date: input.date,
      weight: input.weight,
      bodyFatPercent: input.fat ?? 0,
      muscleMass: input.muscleKg ?? 0,
      boneMass: input.bone ?? 0,
      waterPercent: input.water ?? 0,
      visceralFat: input.visceral ?? 0,
      metabolicAge: input.metabolicAge,
      bmr: input.bmr,
      source: 'manual',
    });
  } catch (err) {
    logger.error('Copie de la composition (ancien format) impossible', err);
  }
}
