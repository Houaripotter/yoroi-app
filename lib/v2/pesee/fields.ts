/**
 * Les mesures de la pesee, reprises de l'ancienne app (onglet Ajouter et ecran Composition).
 * Toutes sont stockees dans la table weights (lib/database.native.ts) :
 * fat_percent, muscle_percent, water_percent, bone_mass, visceral_fat, metabolic_age, bmr.
 * La masse musculaire se saisit en kilos (comme sur l'app de la balance) et se range en pourcentage du poids.
 */
import { traduire, DECIMAL } from '@/lib/i18n/tr';
export type CompoField = 'fat' | 'muscleKg' | 'water' | 'bone' | 'visceral' | 'bmr' | 'metabolicAge';

export type FieldSpec = {
  key: CompoField;
  label: string;
  unit: string;
  step: number;
  min: number;
  max: number;
  int?: boolean;
  hint?: string;
  /** Apple Sante et Health Connect transmettent cette mesure */
  fromHealth?: boolean;
};

export const COMPO_FIELDS: FieldSpec[] = [
  { key: 'fat', label: 'Masse grasse', unit: '%', step: 0.1, min: 2, max: 70, fromHealth: true },
  { key: 'muscleKg', label: traduire('Masse musculaire'), unit: 'kg', step: 0.1, min: 5, max: 150 },
  { key: 'water', label: 'Eau', unit: '%', step: 0.1, min: 20, max: 80 },
  { key: 'bone', label: 'Masse osseuse', unit: 'kg', step: 0.1, min: 0.5, max: 10 },
  { key: 'visceral', label: 'Graisse viscérale', unit: 'niveau', step: 1, min: 1, max: 59, int: true, hint: traduire('de 1 à 59, sain jusqu’à 12') },
  { key: 'bmr', label: traduire('Métabolisme de base'), unit: 'kcal', step: 10, min: 600, max: 5000, int: true, hint: traduire('calories brûlées au repos') },
  { key: 'metabolicAge', label: traduire('Âge métabolique'), unit: 'ans', step: 1, min: 10, max: 100, int: true },
];

export const FIELD: Record<CompoField, FieldSpec> = Object.fromEntries(COMPO_FIELDS.map((f) => [f.key, f])) as Record<CompoField, FieldSpec>;

export type CompoValues = Partial<Record<CompoField, number>>;

const pos = (v: unknown): number | undefined => {
  const n = Number(v);
  return v != null && Number.isFinite(n) && n > 0 ? n : undefined;
};

/** Lit les colonnes d'une pesee enregistree */
export function valuesOfRow(w: {
  weight?: number;
  fat_percent?: number;
  muscle_percent?: number;
  water_percent?: number;
  bone_mass?: number;
  visceral_fat?: number;
  metabolic_age?: number;
  bmr?: number;
}): CompoValues {
  const weight = pos(w.weight);
  const musclePct = pos(w.muscle_percent);
  return {
    fat: pos(w.fat_percent),
    muscleKg: musclePct && weight ? Math.round(((musclePct * weight) / 100) * 10) / 10 : undefined,
    water: pos(w.water_percent),
    bone: pos(w.bone_mass),
    visceral: pos(w.visceral_fat),
    bmr: pos(w.bmr),
    metabolicAge: pos(w.metabolic_age),
  };
}

/** Texte francais d'une valeur : virgule decimale */
export function fmtValue(v: number, int?: boolean): string {
  if (int) return String(Math.round(v));
  return (Math.round(v * 10) / 10).toFixed(1).replace('.', DECIMAL);
}

export function parseValue(s: string | undefined, f: FieldSpec): number | undefined {
  if (!s) return undefined;
  const n = parseFloat(s.replace(',', '.').replace(/\s/g, ''));
  if (!Number.isFinite(n) || n < f.min || n > f.max) return undefined;
  return f.int ? Math.round(n) : Math.round(n * 10) / 10;
}
