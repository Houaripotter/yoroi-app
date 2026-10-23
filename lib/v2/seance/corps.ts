/**
 * Donnees du corps pour les ecrans v2 pesees par source, historique par mesure et tableau :
 * sources, mesures, lignes unifiees, ajout, modification et suppression (logique des anciens ecrans,
 * avec deux corrections : le muscle en kilos est reconverti en pourcentage, et une mesure de composition
 * sans pesee ce jour-la ne cree plus de pesee a 0 kilo).
 */
import { addMeasurementRecord, addWeight, deleteWeight, getAllWeights, getMeasurements, updateMeasurementRecord, updateWeight } from '@/lib/database';
import type { Measurement, Weight } from '@/lib/database';
import { addBodyComposition, deleteBodyComposition, getAllBodyCompositions, updateBodyComposition } from '@/lib/bodyComposition';
import type { BodyComposition } from '@/lib/bodyComposition';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

export const SOURCES: Record<string, { label: string; color: string }> = {
  SourceProxy: { label: 'Apple Santé', color: '#2C4A84' },
  apple_health: { label: 'Apple Santé', color: '#2C4A84' },
  health_connect: { label: 'Health Connect', color: '#2C4A84' },
  tanita: { label: traduire('Tanita'), color: '#3D5D9E' },
  visbody: { label: traduire('Visbody'), color: '#2C4A84' },
  withings: { label: 'Withings', color: '#3D5D9E' },
  garmin: { label: 'Garmin', color: '#3D5D9E' },
  csv: { label: traduire('Import CSV'), color: '#A8832F' },
  body_composition: { label: traduire('Balance'), color: '#A8832F' },
  manual: { label: traduire('À la main'), color: '#4F6B28' },
};

export function sourceOf(s?: string | null): { key: string; label: string; color: string } {
  const key = s || 'manual';
  const cfg = SOURCES[key] ?? { label: key.replace(/_/g, ' '), color: '#4A4E5A' };
  return { key, ...cfg };
}

export type MetricGroup = 'composition' | 'measurements';

export type MetricDef = {
  key: string;
  label: string;
  chip: string;
  unit: string;
  group: MetricGroup;
  digits: number;
  /** champ de la table des pesees */
  weightField?: keyof Weight;
  /** champ de la table de composition */
  bcField?: keyof BodyComposition;
  /** champ de la table des mensurations */
  mField?: keyof Measurement;
};

export const METRICS: MetricDef[] = [
  { key: 'weight', label: 'Poids', chip: 'Poids', unit: 'kg', group: 'composition', digits: 1, weightField: 'weight', bcField: 'weight' },
  { key: 'fat_percent', label: 'Masse grasse', chip: 'Graisse', unit: '%', group: 'composition', digits: 1, weightField: 'fat_percent', bcField: 'bodyFatPercent' },
  { key: 'muscle', label: 'Muscle', chip: 'Muscle', unit: 'kg', group: 'composition', digits: 1, weightField: 'muscle_percent', bcField: 'muscleMass' },
  { key: 'water_percent', label: 'Eau', chip: 'Eau', unit: '%', group: 'composition', digits: 1, weightField: 'water_percent', bcField: 'waterPercent' },
  { key: 'bone_mass', label: traduire('Os'), chip: traduire('Os'), unit: 'kg', group: 'composition', digits: 1, weightField: 'bone_mass', bcField: 'boneMass' },
  { key: 'visceral_fat', label: 'Graisse viscérale', chip: traduire('Viscérale'), unit: 'niveau', group: 'composition', digits: 1, weightField: 'visceral_fat', bcField: 'visceralFat' },
  { key: 'metabolic_age', label: traduire('Âge métabolique'), chip: traduire('Âge du corps'), unit: 'ans', group: 'composition', digits: 0, weightField: 'metabolic_age', bcField: 'metabolicAge' },
  { key: 'bmr', label: traduire('Métabolisme de base'), chip: traduire('Métabolisme'), unit: 'kcal', group: 'composition', digits: 0, weightField: 'bmr', bcField: 'bmr' },
  { key: 'waist', label: 'Tour de taille', chip: 'Taille', unit: 'cm', group: 'measurements', digits: 1, mField: 'waist' },
  { key: 'navel', label: traduire('Tour au nombril'), chip: 'Nombril', unit: 'cm', group: 'measurements', digits: 1, mField: 'navel' },
  { key: 'hips', label: traduire('Tour de hanches'), chip: 'Hanches', unit: 'cm', group: 'measurements', digits: 1, mField: 'hips' },
  { key: 'chest', label: traduire('Tour de poitrine'), chip: 'Poitrine', unit: 'cm', group: 'measurements', digits: 1, mField: 'chest' },
  { key: 'shoulders', label: 'Épaules', chip: 'Épaules', unit: 'cm', group: 'measurements', digits: 1, mField: 'shoulders' },
  { key: 'left_arm', label: traduire('Bras gauche'), chip: traduire('Bras gauche'), unit: 'cm', group: 'measurements', digits: 1, mField: 'left_arm' },
  { key: 'right_arm', label: traduire('Bras droit'), chip: traduire('Bras droit'), unit: 'cm', group: 'measurements', digits: 1, mField: 'right_arm' },
  { key: 'left_thigh', label: traduire('Cuisse gauche'), chip: traduire('Cuisse gauche'), unit: 'cm', group: 'measurements', digits: 1, mField: 'left_thigh' },
  { key: 'right_thigh', label: traduire('Cuisse droite'), chip: traduire('Cuisse droite'), unit: 'cm', group: 'measurements', digits: 1, mField: 'right_thigh' },
  { key: 'left_calf', label: traduire('Mollet gauche'), chip: traduire('Mollet gauche'), unit: 'cm', group: 'measurements', digits: 1, mField: 'left_calf' },
  { key: 'right_calf', label: traduire('Mollet droit'), chip: traduire('Mollet droit'), unit: 'cm', group: 'measurements', digits: 1, mField: 'right_calf' },
  { key: 'neck', label: traduire('Tour de cou'), chip: 'Cou', unit: 'cm', group: 'measurements', digits: 1, mField: 'neck' },
];

export const METRIC_ALIASES: Record<string, string> = { muscle_percent: 'muscle', fat: 'fat_percent', water: 'water_percent' };

export function metricByKey(k?: string): MetricDef {
  const key = k ? METRIC_ALIASES[k] ?? k : 'weight';
  return METRICS.find((m) => m.key === key) ?? METRICS[0];
}

export type BodyData = { weights: Weight[]; comps: BodyComposition[]; measurements: Measurement[] };

export async function loadBodyData(): Promise<BodyData> {
  const [weights, comps, measurements] = await Promise.all([
    getAllWeights().catch(() => [] as Weight[]),
    getAllBodyCompositions().catch(() => [] as BodyComposition[]),
    getMeasurements().catch(() => [] as Measurement[]),
  ]);
  return { weights: weights ?? [], comps: comps ?? [], measurements: measurements ?? [] };
}

export type Entry = {
  id: string;
  date: string;
  value: number;
  source?: string;
  table: 'weight' | 'bodycomp' | 'measurement';
  tableId: number | string;
  weight?: Weight;
  comp?: BodyComposition;
};

function num(v: unknown): number | null {
  const n = typeof v === 'number' ? v : v === null || v === undefined ? NaN : Number(v);
  return Number.isFinite(n) && n !== 0 ? n : null;
}

/** Valeur d'une mesure sur une pesee (le muscle est stocke en %, affiche en kilos) */
function weightValue(m: MetricDef, w: Weight): number | null {
  if (m.key === 'muscle') {
    const pct = num(w.muscle_percent);
    const kg = num(w.weight);
    return pct && kg ? Math.round((pct / 100) * kg * 10) / 10 : null;
  }
  return m.weightField ? num(w[m.weightField]) : null;
}

export function entriesFor(m: MetricDef, d: BodyData): Entry[] {
  const out: Entry[] = [];
  if (m.group === 'composition') {
    for (const w of d.weights) {
      const v = weightValue(m, w);
      if (v !== null && w.id) out.push({ id: `w_${w.id}`, date: w.date.slice(0, 10), value: v, source: w.source, table: 'weight', tableId: w.id, weight: w });
    }
    const dates = new Set(d.weights.map((w) => w.date.slice(0, 10)));
    for (const c of d.comps) {
      const day = (c.date ?? '').slice(0, 10);
      if (!day || dates.has(day) || !m.bcField) continue;
      const v = num(c[m.bcField]);
      if (v !== null) out.push({ id: `bc_${c.id}`, date: day, value: v, source: c.source, table: 'bodycomp', tableId: c.id, comp: c });
    }
  } else if (m.mField) {
    for (const r of d.measurements) {
      const v = num(r[m.mField]);
      if (v !== null && r.id) out.push({ id: `m_${r.id}`, date: r.date.slice(0, 10), value: v, source: 'manual', table: 'measurement', tableId: r.id });
    }
  }
  return out.sort((a, b) => b.date.localeCompare(a.date));
}

/** Modification d'une valeur existante */
export async function updateEntry(m: MetricDef, e: Entry, value: number, date: string): Promise<void> {
  if (e.table === 'weight') {
    const w = e.weight;
    if (m.key === 'muscle') {
      const kg = num(w?.weight);
      if (!kg) return;
      await updateWeight(e.tableId as number, { muscle_percent: Math.round((value / kg) * 1000) / 10, date });
      return;
    }
    if (m.weightField) await updateWeight(e.tableId as number, { [m.weightField]: value, date } as Partial<Weight>);
  } else if (e.table === 'bodycomp') {
    if (m.bcField) await updateBodyComposition(e.tableId as string, { [m.bcField]: value, date } as Partial<BodyComposition>);
  } else if (m.mField) {
    await updateMeasurementRecord(e.tableId as number, { [m.mField]: value, date } as Partial<Measurement>);
  }
}

/** Suppression : la pesee entiere pour le poids, sinon seulement la valeur de cette mesure */
export async function deleteEntry(m: MetricDef, e: Entry): Promise<void> {
  if (e.table === 'weight') {
    if (m.key === 'weight') await deleteWeight(e.tableId as number);
    else if (m.weightField) await updateWeight(e.tableId as number, { [m.weightField]: null } as unknown as Partial<Weight>);
  } else if (e.table === 'bodycomp') {
    await deleteBodyComposition(e.tableId as string);
  } else if (m.mField) {
    await updateMeasurementRecord(e.tableId as number, { [m.mField]: null } as unknown as Partial<Measurement>);
  }
}

/** Ajout : sur la pesee du jour si elle existe, sinon dans la composition corporelle */
export async function addEntry(m: MetricDef, value: number, date: string, d: BodyData): Promise<void> {
  if (m.group === 'measurements') {
    if (!m.mField) return;
    const same = d.measurements.find((r) => r.date.slice(0, 10) === date && r.id);
    if (same?.id) await updateMeasurementRecord(same.id, { [m.mField]: value } as Partial<Measurement>);
    else await addMeasurementRecord({ date, [m.mField]: value } as Measurement);
    return;
  }
  if (m.key === 'weight') {
    await addWeight({ weight: value, date, source: 'manual' });
    return;
  }
  const w = d.weights.find((x) => x.date.slice(0, 10) === date && x.id && num(x.weight));
  if (w?.id) {
    if (m.key === 'muscle') await updateWeight(w.id, { muscle_percent: Math.round((value / (w.weight || 1)) * 1000) / 10 });
    else if (m.weightField) await updateWeight(w.id, { [m.weightField]: value } as Partial<Weight>);
    return;
  }
  // poids a 0 : cette ligne ne compte jamais comme une pesee
  await addBodyComposition({
    date,
    weight: 0,
    bodyFatPercent: m.key === 'fat_percent' ? value : 0,
    muscleMass: m.key === 'muscle' ? value : 0,
    boneMass: m.key === 'bone_mass' ? value : 0,
    waterPercent: m.key === 'water_percent' ? value : 0,
    visceralFat: m.key === 'visceral_fat' ? value : 0,
    metabolicAge: m.key === 'metabolic_age' ? value : undefined,
    bmr: m.key === 'bmr' ? value : undefined,
    source: 'manual',
  });
}

/** "12/03/2026" ou "2026-03-12" vers "2026-03-12" */
export function parseDay(s: string): string | null {
  const t = s.trim();
  const fr = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  const iso = fr ? `${fr[3]}-${fr[2].padStart(2, '0')}-${fr[1].padStart(2, '0')}` : t;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(iso + 'T12:00:00');
  return isNaN(d.getTime()) ? null : iso;
}

export function frDay(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split('-');
  return `${d}/${m}/${y}`;
}

export function fmtValue(v: number, digits: number): string {
  const r = Math.round(v * 10 ** digits) / 10 ** digits;
  return String(r).replace('.', DECIMAL);
}
