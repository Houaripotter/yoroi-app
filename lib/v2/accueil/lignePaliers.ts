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
};

/**
 * L'etat de chaque rond. torii : le torii est atteint (les 4 paliers atteints). Sans torii, ton objectif n'est
 * jamais montre comme atteint : si ta part du chemin touche 100 % avant que ta tendance suive, le dernier palier
 * reste le prochain (meme regle que etatsPierres de lib/v2/pesee/cheminPierres.ts).
 */
export function etatsLignePaliers(depart: number, objectif: number, actuel: number, part: number, torii: boolean): LignePaliers {
  const l = paliersDuChemin(depart, objectif, actuel, part);
  if (torii) return { paliers: l.map((p) => ({ kg: p.kg, etat: 'atteint' as const })), atteints: l.length, prochain: null };
  let iProchain = l.findIndex((p) => !p.franchi);
  if (iProchain < 0) iProchain = l.length - 1;
  const paliers = l.map((p, i) => ({ kg: p.kg, etat: (i < iProchain ? 'atteint' : i === iProchain ? 'prochain' : 'a_venir') as EtatPalier }));
  const cible = l[iProchain];
  const prochain = l.prochain
    ? { kg: l.prochain.kg, encore: l.prochain.encore, dernier: l.prochain.dernier }
    : { kg: cible.kg, encore: Math.max(0, Math.round(Math.abs(actuel - cible.kg) * 10) / 10), dernier: true };
  return { paliers, atteints: iProchain, prochain };
}
