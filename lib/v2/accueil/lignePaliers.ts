/**
 * La ligne de paliers de la carte « Ton poids » de l'accueil (2 novembre 2026, proposition A choisie par Houari,
 * maquette _propositions/carte_poids_accueil_2026-11-02/v2/proposition_A_paliers.png).
 * Un rond par palier : atteint (rond plein avec une coche), prochain (anneau) ou a venir (rond gris vide).
 * Fichier pur. Les kilos et les paliers franchis viennent de paliersDuChemin (lib/v2/pesee/cheminPierres.ts),
 * sans rien recalculer : ce fichier ne fait que nommer l'etat de chaque rond.
 */
import { paliersDuChemin } from '@/lib/v2/pesee/cheminPierres';

export type EtatPalier = 'atteint' | 'prochain' | 'a_venir';

export type LignePaliers = {
  /** les 4 paliers, dans l'ordre du chemin */
  paliers: { kg: number; etat: EtatPalier }[];
  /** le nombre de paliers atteints */
  atteints: number;
  /** le prochain palier, ce qu'il reste jusqu'a lui, et s'il s'agit de ton objectif ; null une fois le torii atteint */
  prochain: { kg: number; encore: number; dernier: boolean } | null;
  /**
   * 3 novembre 2026 (Houari) : la part du trait deja faite entre le palier d'avant (ou ton depart) et le prochain,
   * de 0 a 1, sur ton poids actuel. 87,5 atteint, prochain 85, tu es a 86 : (87,5 - 86) / (87,5 - 85) = 0,6.
   * Meme calcul en perte et en prise. Jamais tout a fait 1 tant que le prochain n'est pas atteint (au plus AVANCE_MAX).
   */
  avance: number;
};

/** Le trait vers un palier pas encore atteint ne se remplit jamais en entier : on voit qu'il reste un bout */
export const AVANCE_MAX = 0.95;

/** La part faite entre a (le palier d'avant) et b (le prochain), pour ton poids actuel, entre 0 et AVANCE_MAX */
export function avanceEntre(a: number, b: number, actuel: number): number {
  const d = b - a;
  if (!Number.isFinite(d) || Math.abs(d) < 1e-9 || !Number.isFinite(actuel)) return 0;
  return Math.max(0, Math.min(AVANCE_MAX, (actuel - a) / d));
}

/**
 * L'etat de chaque rond. torii : le torii est atteint (les 4 paliers atteints). Sans torii, ton objectif n'est
 * jamais montre comme atteint : si ta part du chemin touche 100 % avant que ta tendance suive, le dernier palier
 * reste le prochain (meme regle que etatsPierres de lib/v2/pesee/cheminPierres.ts).
 */
export function etatsLignePaliers(depart: number, objectif: number, actuel: number, part: number, torii: boolean): LignePaliers {
  const l = paliersDuChemin(depart, objectif, actuel, part);
  if (torii) return { paliers: l.map((p) => ({ kg: p.kg, etat: 'atteint' as const })), atteints: l.length, prochain: null, avance: 0 };
  let iProchain = l.findIndex((p) => !p.franchi);
  if (iProchain < 0) iProchain = l.length - 1;
  const paliers = l.map((p, i) => ({ kg: p.kg, etat: (i < iProchain ? 'atteint' : i === iProchain ? 'prochain' : 'a_venir') as EtatPalier }));
  const cible = l[iProchain];
  const prochain = l.prochain
    ? { kg: l.prochain.kg, encore: l.prochain.encore, dernier: l.prochain.dernier }
    : { kg: cible.kg, encore: Math.max(0, Math.round(Math.abs(actuel - cible.kg) * 10) / 10), dernier: true };
  const avant = iProchain > 0 ? l[iProchain - 1].kg : depart;
  return { paliers, atteints: iProchain, prochain, avance: avanceEntre(avant, cible.kg, actuel) };
}
