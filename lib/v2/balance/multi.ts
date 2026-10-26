/**
 * IMPORT MULTI (13 octobre 2026) : plusieurs pesees d'un coup, une par date, depuis un dossier de photos.
 * Fichier pur (aucun import React Native ni base) : teste par jest (__tests__/unit/balanceImportMulti.test.ts).
 *
 * Regle de fusion avec ce qui est deja note ce jour-la :
 * - une valeur absente est ajoutee ;
 * - une valeur identique n'est pas reecrite (coller deux fois le meme texte ne cree rien) ;
 * - une valeur differente n'ecrase JAMAIS celle deja saisie, sauf si l'utilisateur coche « remplacer ».
 */
import type { Weight } from '@/lib/database';
import { BALANCE_FIELD, BALANCE_FIELDS, normKey, parseScaleJson, PHOTO_SOURCE, UNSIDED_MEASURE } from './format';
import type { MeasureTarget, ScaleAutre } from './format';

/** Une mensuration deja notee (meme forme que MeasurePoint de lib/v2/progres/measures.ts) */
export type MeasureDay = { date: string } & Partial<Record<MeasureTarget, number>>;

/** Champ de l'apercu vers la colonne de la table weights */
const WEIGHT_COLUMN: Record<string, keyof Weight> = {
  poids_kg: 'weight',
  graisse_pct: 'fat_percent',
  eau_pct: 'water_percent',
  os_kg: 'bone_mass',
  graisse_viscerale: 'visceral_fat',
  age_metabolique: 'metabolic_age',
  metabolisme_kcal: 'bmr',
  muscle_kg: 'muscle_kg',
  graisse_kg: 'fat_kg',
  imc: 'bmi_scale',
  physique: 'physique_rating',
  graisse_bras_droit_pct: 'fat_arm_right',
  graisse_bras_gauche_pct: 'fat_arm_left',
  graisse_tronc_pct: 'fat_trunk',
  graisse_jambe_droite_pct: 'fat_leg_right',
  graisse_jambe_gauche_pct: 'fat_leg_left',
  muscle_bras_droit_kg: 'muscle_arm_right',
  muscle_bras_gauche_kg: 'muscle_arm_left',
  muscle_tronc_kg: 'muscle_trunk',
  muscle_jambe_droite_kg: 'muscle_leg_right',
  muscle_jambe_gauche_kg: 'muscle_leg_left',
};

const pos = (v: unknown): number | undefined => {
  const n = typeof v === 'string' ? parseFloat(v) : v;
  return typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : undefined;
};
const dayOf = (s: unknown) => String(s ?? '').slice(0, 10);

/** La pesee du jour que l'import complete (la meme regle que l'enregistrement) */
export function pickSameDayRow(rows: Weight[], date: string, weight?: number): Weight | undefined {
  // NUIT 14 : la plus recente d'abord, comme la courbe (toDailySeries garde la plus recente du jour) :
  // l'import complete la pesee que tu vois, pas une plus ancienne cachee derriere
  const same = rows.filter((w) => dayOf(w.date) === dayOf(date)).sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
  return (
    same.find((w) => w.source === PHOTO_SOURCE) ??
    same.find((w) => (w.source ?? 'manual') === 'manual') ??
    (weight ? same.find((w) => Math.abs(Number(w.weight) - weight) < 0.05) : undefined) ??
    same[0]
  );
}

/** La mensuration du jour, si elle existe */
export function measureOfDay(points: MeasureDay[], date: string): MeasureDay | undefined {
  return points.find((p) => dayOf(p.date) === dayOf(date));
}

/** Ce qui est deja note ce jour-la, par cle de l'apercu (poids, composition, mensurations, mesures en plus) */
export function existingValues(row: Weight | undefined, measure: MeasureDay | undefined): Record<string, number> {
  const out: Record<string, number> = {};
  if (row) {
    for (const [k, col] of Object.entries(WEIGHT_COLUMN)) {
      const v = pos(row[col]);
      if (v !== undefined) out[k] = v;
    }
    const json = parseScaleJson(row.scale_extras);
    for (const [k, v] of Object.entries(json?.mesures ?? {})) if (out[k] === undefined) out[k] = v;
  }
  if (measure) {
    for (const f of BALANCE_FIELDS) {
      if (!f.measure) continue;
      const v = pos(measure[f.measure]);
      // une cle sans cote ne se compare pas : sa cle avec cote (rangee au meme endroit) suffit
      if (v !== undefined && !UNSIDED_MEASURE[f.key]) out[f.key] = v;
    }
  }
  return out;
}

/** Les mesures en plus deja notees ce jour-la, par nom normalise */
export function existingAutres(row: Weight | undefined): Map<string, ScaleAutre> {
  const m = new Map<string, ScaleAutre>();
  for (const a of parseScaleJson(row?.scale_extras)?.autres ?? []) m.set(normKey(a.nom), a);
  return m;
}

export const sameValue = (key: string, a: number, b: number): boolean => {
  const step = BALANCE_FIELD[key]?.step ?? 0.001;
  return Math.abs(a - b) < Math.max(step / 2, 1e-6);
};

export type ValueStatus = 'new' | 'same' | 'conflict';

export function valueStatus(key: string, next: number, existing: Record<string, number>): ValueStatus {
  const old = existing[key];
  if (old === undefined) return 'new';
  return sameValue(key, old, next) ? 'same' : 'conflict';
}

export type Plan = {
  /** a ecrire : nouvelles valeurs et valeurs remplacees */
  write: Record<string, number>;
  /** identiques a ce qui est deja note : rien a faire */
  same: string[];
  /** differentes mais gardees (remplacer pas coche) */
  kept: string[];
  autres: ScaleAutre[];
  autresSame: number;
  autresKept: number;
};

/** Ce qu'il faut ecrire pour une date, sans rien ecraser sauf ce que l'utilisateur a coche « remplacer » */
export function planBlock(
  values: Record<string, number | undefined>,
  autres: ScaleAutre[],
  existing: Record<string, number>,
  oldAutres: Map<string, ScaleAutre>,
  replace: Set<string>,
): Plan {
  const plan: Plan = { write: {}, same: [], kept: [], autres: [], autresSame: 0, autresKept: 0 };
  for (const [key, v] of Object.entries(values)) {
    if (typeof v !== 'number' || !Number.isFinite(v) || v <= 0) continue;
    // bras sans cote : seulement si le bras gauche n'est pas deja donne dans ce bloc
    const sided = UNSIDED_MEASURE[key];
    if (sided && typeof values[sided] === 'number') continue;
    const target = sided ?? key;
    const st = valueStatus(target, v, existing);
    if (st === 'same') plan.same.push(key);
    else if (st === 'conflict' && !replace.has(key)) plan.kept.push(key);
    else plan.write[key] = v;
  }
  for (const a of autres) {
    const id = normKey(a.nom);
    const old = oldAutres.get(id);
    if (!old) plan.autres.push(a);
    else if (Math.abs(old.valeur - a.valeur) < 1e-6) plan.autresSame++;
    else if (replace.has(autreReplaceId(a.nom))) plan.autres.push(a);
    else plan.autresKept++;
  }
  return plan;
}

export const autreReplaceId = (nom: string) => `autre:${normKey(nom)}`;

/** Les cles d'un plan rangees dans la table measurements (avec leur colonne MeasureKey) */
export function measurePart(write: Record<string, number>): Partial<Record<MeasureTarget, number>> {
  const out: Partial<Record<MeasureTarget, number>> = {};
  for (const [k, v] of Object.entries(write)) {
    const m = BALANCE_FIELD[k]?.measure;
    if (m && out[m] === undefined) out[m] = v;
  }
  return out;
}

/** Les cles d'un plan rangees dans la pesee (table weights) : tout sauf les mensurations a colonne */
export function weightPart(write: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(write)) {
    if (BALANCE_FIELD[k]?.measure) continue;
    // cle sans cote restante : rangee du cote gauche (comme les autres mensurations sans cote)
    out[UNSIDED_MEASURE[k] ?? k] = v;
  }
  return out;
}
