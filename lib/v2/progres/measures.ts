/**
 * Mensurations : reunit la table des mesures et les saisies de l'ancien ecran
 * (stockage chiffre), une ligne par jour. Les nouvelles saisies vont dans la table,
 * lue par les statistiques et l'historique du corps.
 */
import { addMeasurementRecord, deleteMeasurementRecord, getMeasurements, updateMeasurementRecord } from '@/lib/database';
import type { Measurement } from '@/lib/database';
import { deleteMeasurement as deleteLegacyMeasurement, getAllMeasurements as getLegacyMeasurements } from '@/lib/bodyComposition';
import type { BodyMeasurement } from '@/lib/bodyComposition';
import { logger } from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

export type MeasureKey = 'chest' | 'waist' | 'navel' | 'hips' | 'shoulders' | 'neck' | 'armL' | 'armR' | 'thighL' | 'thighR' | 'calfL' | 'calfR' | 'forearmL' | 'forearmR';

/** Mesures affichees : les cotes gauche et droite sont reunies */
export type ViewKey = 'shoulders' | 'chest' | 'arm' | 'forearm' | 'waist' | 'navel' | 'hips' | 'thigh' | 'calf' | 'neck';

export type MeasurePoint = { id?: number; date: string } & Partial<Record<MeasureKey, number>>;

export const MEASURE_FIELDS: { key: MeasureKey; label: string; group: 'haut' | 'tronc' | 'bras' | 'jambes' }[] = [
  { key: 'neck', label: 'Cou', group: 'haut' },
  { key: 'shoulders', label: 'Épaules', group: 'haut' },
  { key: 'chest', label: 'Poitrine', group: 'tronc' },
  { key: 'waist', label: 'Taille', group: 'tronc' },
  { key: 'navel', label: 'Nombril', group: 'tronc' },
  { key: 'hips', label: 'Hanches', group: 'tronc' },
  { key: 'armR', label: traduire('Bras droit'), group: 'bras' },
  { key: 'armL', label: traduire('Bras gauche'), group: 'bras' },
  { key: 'forearmR', label: traduire('Avant bras droit'), group: 'bras' },
  { key: 'forearmL', label: traduire('Avant bras gauche'), group: 'bras' },
  { key: 'thighR', label: traduire('Cuisse droite'), group: 'jambes' },
  { key: 'thighL', label: traduire('Cuisse gauche'), group: 'jambes' },
  { key: 'calfR', label: traduire('Mollet droit'), group: 'jambes' },
  { key: 'calfL', label: traduire('Mollet gauche'), group: 'jambes' },
];

export const VIEW_FIELDS: { key: ViewKey; label: string; long: string; good: 'up' | 'down' | 'none' }[] = [
  { key: 'shoulders', label: 'Épaules', long: traduire('Tour d’épaules'), good: 'up' },
  { key: 'chest', label: 'Poitrine', long: traduire('Tour de poitrine'), good: 'up' },
  { key: 'arm', label: 'Bras', long: traduire('Tour de bras'), good: 'up' },
  { key: 'forearm', label: traduire('Avant bras'), long: traduire('Tour d’avant bras'), good: 'up' },
  { key: 'waist', label: 'Taille', long: 'Tour de taille', good: 'down' },
  { key: 'navel', label: 'Nombril', long: traduire('Tour au nombril'), good: 'down' },
  { key: 'hips', label: 'Hanches', long: traduire('Tour de hanches'), good: 'none' },
  { key: 'thigh', label: 'Cuisse', long: traduire('Tour de cuisse'), good: 'none' },
  { key: 'calf', label: 'Mollet', long: traduire('Tour de mollet'), good: 'none' },
  { key: 'neck', label: 'Cou', long: traduire('Tour de cou'), good: 'none' },
];

const pos = (v: unknown): number | undefined => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? v : undefined);

function fromDb(m: Measurement): MeasurePoint {
  return {
    id: m.id,
    date: m.date.slice(0, 10),
    chest: pos(m.chest),
    waist: pos(m.waist),
    navel: pos(m.navel),
    hips: pos(m.hips),
    shoulders: pos(m.shoulders),
    neck: pos(m.neck),
    armL: pos(m.left_arm) ?? pos(m.arms),
    armR: pos(m.right_arm),
    thighL: pos(m.left_thigh) ?? pos(m.thighs),
    thighR: pos(m.right_thigh),
    calfL: pos(m.left_calf),
    calfR: pos(m.right_calf),
    forearmL: pos(m.left_forearm),
    forearmR: pos(m.right_forearm),
  };
}

function fromLegacy(m: BodyMeasurement): MeasurePoint {
  return {
    date: (m.date || '').slice(0, 10),
    chest: pos(m.chest),
    waist: pos(m.waist),
    navel: pos(m.navel),
    hips: pos(m.hips),
    shoulders: pos(m.shoulders),
    neck: pos(m.neck),
    armL: pos(m.leftArm),
    armR: pos(m.rightArm),
    thighL: pos(m.leftThigh),
    thighR: pos(m.rightThigh),
    calfL: pos(m.leftCalf),
    calfR: pos(m.rightCalf),
    forearmL: pos(m.leftForearm),
    forearmR: pos(m.rightForearm),
  };
}

function clean<T extends object>(o: T): Partial<T> {
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** Toutes les mensurations, de la plus ancienne a la plus recente */
export async function loadMeasures(): Promise<MeasurePoint[]> {
  const byDate = new Map<string, MeasurePoint>();
  try {
    const legacy = await getLegacyMeasurements();
    for (const m of legacy ?? []) {
      if (!m?.date) continue;
      const p = fromLegacy(m);
      byDate.set(p.date, { ...(byDate.get(p.date) ?? { date: p.date }), ...clean(p) });
    }
  } catch (err) {
    logger.error('Lecture des mensurations (ancien format) impossible', err);
  }
  try {
    const rows = await getMeasurements();
    // getMeasurements trie du plus recent au plus ancien : on applique les plus anciennes d'abord
    for (const m of [...(rows ?? [])].reverse()) {
      if (!m?.date) continue;
      const p = fromDb(m);
      byDate.set(p.date, { ...(byDate.get(p.date) ?? { date: p.date }), ...clean(p) });
    }
  } catch (err) {
    logger.error('Lecture des mensurations impossible', err);
  }
  return Array.from(byDate.values()).sort((a, b) => (a.date < b.date ? -1 : 1));
}

export function viewValue(p: MeasurePoint, key: ViewKey): number | undefined {
  const avg = (a?: number, b?: number) => (a && b ? (a + b) / 2 : a ?? b);
  switch (key) {
    case 'arm':
      return avg(p.armL, p.armR);
    case 'thigh':
      return avg(p.thighL, p.thighR);
    case 'calf':
      return avg(p.calfL, p.calfR);
    case 'forearm':
      return avg(p.forearmL, p.forearmR);
    default:
      return p[key];
  }
}

export function viewSeries(points: MeasurePoint[], key: ViewKey): { date: string; value: number }[] {
  const out: { date: string; value: number }[] = [];
  for (const p of points) {
    const v = viewValue(p, key);
    if (v) out.push({ date: p.date, value: Math.round(v * 10) / 10 });
  }
  return out;
}

/** Derniere valeur connue de chaque champ, meme si elle vient d'une saisie plus ancienne */
export function lastKnown(points: MeasurePoint[]): Partial<Record<MeasureKey, number>> {
  const out: Partial<Record<MeasureKey, number>> = {};
  for (const p of points) {
    for (const f of MEASURE_FIELDS) {
      const v = p[f.key];
      if (v) out[f.key] = v;
    }
  }
  return out;
}

/** Jour local AAAA-MM-JJ d'une date stockee : une date seule est gardee telle quelle, un horodatage complet est ramene au fuseau du telephone */
function localDayOf(s: string): string {
  const v = String(s || '');
  if (v.length <= 10 || !v.includes('T')) return v.slice(0, 10);
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export async function saveMeasures(date: string, values: Partial<Record<MeasureKey, number>>): Promise<void> {
  const data: Measurement = {
    date,
    chest: values.chest,
    waist: values.waist,
    navel: values.navel,
    hips: values.hips,
    shoulders: values.shoulders,
    neck: values.neck,
    left_arm: values.armL,
    right_arm: values.armR,
    left_thigh: values.thighL,
    right_thigh: values.thighR,
    left_calf: values.calfL,
    right_calf: values.calfR,
    left_forearm: values.forearmL,
    right_forearm: values.forearmR,
  };
  // Une ligne par jour : on complete celle du meme jour local si elle existe (quelle que soit sa date)
  try {
    const day = localDayOf(date);
    const rows = await getMeasurements();
    const same = (rows ?? []).find((r) => !!r.id && !!r.date && localDayOf(r.date) === day);
    if (same?.id) {
      await updateMeasurementRecord(same.id, clean(data));
      return;
    }
  } catch (err) {
    logger.error('Recherche de la mesure du jour impossible', err);
  }
  await addMeasurementRecord(data);
}

/**
 * 18 octobre 2026 : efface la prise d'un jour, toutes zones comprises (une ligne par jour, comme saveMeasures).
 * Les lignes de la table et celles de l'ancien format du meme jour partent, sinon le jour reviendrait
 * dans les courbes. Renvoie le nombre de lignes retirees.
 */
export async function deleteMeasuresOfDay(date: string): Promise<number> {
  const day = String(date || '').slice(0, 10);
  if (!day) return 0;
  const memeJour = (d?: string | null) => !!d && (localDayOf(d) === day || d.slice(0, 10) === day);
  let n = 0;
  const rows = await getMeasurements();
  for (const r of rows ?? []) {
    if (r?.id && memeJour(r.date)) {
      await deleteMeasurementRecord(r.id);
      n += 1;
    }
  }
  try {
    const legacy = await getLegacyMeasurements();
    for (const m of legacy ?? []) {
      if (m?.id && memeJour(m.date)) {
        await deleteLegacyMeasurement(m.id);
        n += 1;
      }
    }
  } catch (err) {
    logger.error('Suppression des mensurations (ancien format) impossible', err);
  }
  return n;
}
