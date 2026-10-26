/**
 * Composition saisie a la main : les mesures en plus d'une balance connectee
 * (masse maigre, muscle squelettique, proteines, graisse sous-cutanee, IMC, morphologie).
 * Rangees exactement comme l'import photo de la balance (toColumns de lib/v2/balance/format) :
 * IMC et morphologie dans leurs colonnes, le reste dans la colonne JSON scale_extras.
 * Fichier pur, teste par jest.
 */
import { toColumns } from '@/lib/v2/balance/format';
import type { ScaleExtras, ScaleJson } from '@/lib/v2/balance/format';
import type { Weight } from '@/lib/database';
import type { CompoPoint } from './composition';

export type ExtraKey = 'leanKg' | 'skeletalKg' | 'proteinPct' | 'subcutPct' | 'bmi' | 'physique';

/** Cle de l'ecran vers la cle de la balance (BALANCE_FIELDS) */
export const EXTRA_BALANCE_KEY: Record<ExtraKey, string> = {
  leanKg: 'masse_maigre_kg',
  skeletalKg: 'muscle_squelettique_kg',
  proteinPct: 'proteines_pct',
  subcutPct: 'graisse_sous_cutanee_pct',
  bmi: 'imc',
  physique: 'physique',
};

export const EXTRA_KEYS = Object.keys(EXTRA_BALANCE_KEY) as ExtraKey[];

const pos = (v: unknown): number | undefined => {
  const n = Number(v);
  return v != null && Number.isFinite(n) && n > 0 ? n : undefined;
};

/** IMC calcule avec le poids et la taille du profil, une decimale ; undefined s'il manque l'un des deux */
export function computeBmi(weightKg?: number | null, heightCm?: number | null): number | undefined {
  const w = pos(weightKg);
  const h = pos(heightCm);
  if (!w || !h || h < 100 || h > 250) return undefined;
  const m = h / 100;
  return Math.round((w / (m * m)) * 10) / 10;
}

/** Derniere valeur connue de chaque mesure en plus, a la date choisie ou avant (pour le pre-remplissage) */
export function lastExtras(points: CompoPoint[], rows: Weight[], date: string): Partial<Record<ExtraKey, number>> {
  const out: Partial<Record<ExtraKey, number>> = {};
  const upTo = points.filter((p) => p.date <= date);
  for (let i = upTo.length - 1; i >= 0; i--) {
    const p = upTo[i];
    for (const k of EXTRA_KEYS) {
      if (out[k] !== undefined || k === 'bmi') continue;
      const v = k === 'physique' ? pos(p.physique) : pos(p.extra?.mesures?.[EXTRA_BALANCE_KEY[k]]);
      if (v !== undefined) out[k] = v;
    }
  }
  // IMC affiche par la balance : colonne bmi_scale de la pesee la plus recente qui le porte
  const bmiRow = rows
    .filter((r) => String(r.date ?? '').slice(0, 10) <= date && pos(r.bmi_scale) !== undefined)
    .sort((a, b) => (String(a.date) < String(b.date) ? 1 : -1))[0];
  if (bmiRow) out.bmi = pos(bmiRow.bmi_scale);
  return out;
}

/**
 * Ce que l'ecran enregistre en plus : les memes colonnes et le meme JSON que l'import photo.
 * bmiAuto : l'IMC est calcule avec la taille du profil, il n'est donc pas range comme mesure de la balance.
 */
export function manualScale(
  values: Partial<Record<ExtraKey, number>>,
  weight: number,
  muscleKg?: number,
  bmiAuto = false,
): { extras: ScaleExtras; json?: ScaleJson } {
  const v: Record<string, number | undefined> = { poids_kg: weight, muscle_kg: muscleKg };
  for (const k of EXTRA_KEYS) {
    if (k === 'bmi' && bmiAuto) continue;
    v[EXTRA_BALANCE_KEY[k]] = values[k];
  }
  const { extras, json } = toColumns(v, weight);
  return { extras, json };
}
