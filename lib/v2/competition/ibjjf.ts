/**
 * Categories de poids IBJJF (adultes, avec le kimono) : UNE seule liste pour toute l'app,
 * avec les noms officiels portugais. Le profil competiteur et le formulaire de competition
 * lisent cette liste. Les anciens identifiants anglais (rooster, light-feather...) enregistres
 * par l'ancien profil competiteur sont lus et convertis en douceur.
 */

import { traduire, DECIMAL } from '@/lib/i18n/tr';
export type IbjjfGender = 'male' | 'female';

export type IbjjfCategory = {
  id: string;
  name: string;
  /** Poids maximum en kg (999 = sans limite) */
  maxWeight: number;
  /** Seulement pour la derniere categorie sans limite */
  minWeight?: number;
  /** Absoluto : toutes categories confondues, jamais conseillee d'apres le poids */
  open?: boolean;
};

export const IBJJF_ABSOLUTO: IbjjfCategory = { id: 'absoluto', name: 'Absoluto', maxWeight: 999, open: true };

export const IBJJF_MEN: IbjjfCategory[] = [
  { id: 'galo', name: 'Galo', maxWeight: 57.5 },
  { id: 'pluma', name: 'Pluma', maxWeight: 64 },
  { id: 'pena', name: 'Pena', maxWeight: 70 },
  { id: 'leve', name: 'Leve', maxWeight: 76 },
  { id: 'medio', name: traduire('Médio'), maxWeight: 82.3 },
  { id: 'meio_pesado', name: 'Meio-Pesado', maxWeight: 88.3 },
  { id: 'pesado', name: 'Pesado', maxWeight: 94.3 },
  { id: 'super_pesado', name: 'Super-Pesado', maxWeight: 100.5 },
  { id: 'pesadissimo', name: 'Pesadíssimo', maxWeight: 999, minWeight: 100.5 },
  IBJJF_ABSOLUTO,
];

export const IBJJF_WOMEN: IbjjfCategory[] = [
  { id: 'galo', name: 'Galo', maxWeight: 48.5 },
  { id: 'pluma', name: 'Pluma', maxWeight: 53.5 },
  { id: 'pena', name: 'Pena', maxWeight: 58.5 },
  { id: 'leve', name: 'Leve', maxWeight: 64 },
  { id: 'medio', name: traduire('Médio'), maxWeight: 69 },
  { id: 'meio_pesado', name: 'Meio-Pesado', maxWeight: 74 },
  { id: 'pesado', name: 'Pesado', maxWeight: 79.3 },
  { id: 'super_pesado', name: 'Super-Pesado', maxWeight: 999, minWeight: 79.3 },
  IBJJF_ABSOLUTO,
];

/** Accepte 'male' | 'female' comme 'homme' | 'femme' */
export function ibjjfCategories(gender?: string | null): IbjjfCategory[] {
  return gender === 'female' || gender === 'femme' ? IBJJF_WOMEN : IBJJF_MEN;
}

/** Anciens identifiants anglais du profil competiteur, vers les identifiants portugais */
const LEGACY_IDS: Record<string, string> = {
  rooster: 'galo',
  'light-feather': 'pluma',
  light_feather: 'pluma',
  feather: 'pena',
  light: 'leve',
  middle: 'medio',
  'medium-heavy': 'meio_pesado',
  medium_heavy: 'meio_pesado',
  heavy: 'pesado',
  'super-heavy': 'super_pesado',
  super_heavy: 'super_pesado',
  'ultra-heavy': 'pesadissimo',
  ultra_heavy: 'pesadissimo',
  open: 'absoluto',
  'open-class': 'absoluto',
};

/** Anciens noms (anglais, ou portugais sans accent) vers le nom officiel */
const LEGACY_NAMES: Record<string, string> = {
  rooster: 'Galo',
  'light feather': 'Pluma',
  feather: 'Pena',
  light: 'Leve',
  middle: traduire('Médio'),
  medio: traduire('Médio'),
  'medium heavy': 'Meio-Pesado',
  'meio pesado': 'Meio-Pesado',
  heavy: 'Pesado',
  'super heavy': 'Super-Pesado',
  'super pesado': 'Super-Pesado',
  'ultra heavy': 'Pesadíssimo',
  pesadissimo: 'Pesadíssimo',
  'open class': 'Absoluto',
};

/** Identifiant portugais d'une categorie, que la valeur enregistree soit ancienne (anglaise) ou nouvelle */
export function normalizeIbjjfId(id?: string | null): string | null {
  if (!id) return null;
  const key = String(id).trim().toLowerCase();
  if (IBJJF_MEN.some((c) => c.id === key) || IBJJF_WOMEN.some((c) => c.id === key)) return key;
  return LEGACY_IDS[key] ?? null;
}

/** Nom officiel d'une categorie a partir d'un nom enregistre (anglais ou portugais) ; sinon le nom tel quel */
export function normalizeIbjjfName(name?: string | null): string {
  const raw = String(name ?? '').trim();
  if (!raw) return raw;
  const key = raw.toLowerCase().replace(/[-_]+/g, ' ').replace(/\s+/g, ' ');
  const official = [...IBJJF_MEN, ...IBJJF_WOMEN].find((c) => c.name.toLowerCase().replace(/-/g, ' ') === key);
  if (official) return official.name;
  return LEGACY_NAMES[key] ?? raw;
}

/** Categorie qui couvre ce poids (jamais l'Absoluto) */
export function ibjjfAdvised(gender: string | null | undefined, weight: number): IbjjfCategory | undefined {
  if (!(weight > 0)) return undefined;
  // Liste dans l'ordre croissant : la derniere, sans limite, couvre tous les poids au-dessus
  return ibjjfCategories(gender).filter((c) => !c.open).find((c) => c.maxWeight >= 900 || weight <= c.maxWeight);
}

/** Libelle du poids pour une puce : « 57,5 kg », « plus de 100,5 kg », « toutes catégories » */
export function ibjjfWeightLabel(c: IbjjfCategory): string {
  const fr = (n: number) => String(n).replace('.', DECIMAL);
  if (c.open) return traduire('toutes catégories');
  if (c.maxWeight >= 900) return c.minWeight ? traduire("plus de {0} kg", fr(c.minWeight)) : traduire('sans limite');
  return `${fr(c.maxWeight)} kg`;
}
