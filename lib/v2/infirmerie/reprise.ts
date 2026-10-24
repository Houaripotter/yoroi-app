/**
 * Plan de retour progressif vivant (24 octobre 2026) : l'etape du plan de 5 semaines (lib/v2/nutrition/formulas.ts
 * RETURN_PLANS) n'avance plus seulement avec le calendrier, elle suit aussi ta douleur notee.
 * Choix de YOROI, sans diagnostic, alignes sur les statuts de l'infirmerie (lib/infirmaryService.ts : douleur de
 * 0, guerie ; 1 a 3, en guerison ; plus de 3, active) : on ne passe pas a l'etape suivante tant que la douleur reste
 * forte. Le plan reste un repere : l'avis de ton medecin ou de ton kine passe avant.
 */

/** L'etape que permet ta douleur (0 a 10) : 7 et plus, etape 1 ; 5 a 6, etape 2 ; 4, etape 3 ; 1 a 3, etape 4 ; 0, etape 5 */
export function etapeDouleur(eva: number): number {
  // douleur inconnue (pas encore notee, valeur illisible) : l'etape la plus prudente
  if (typeof eva !== 'number' || !Number.isFinite(eva)) return 1;
  if (eva >= 7) return 1;
  if (eva >= 5) return 2;
  if (eva >= 4) return 3;
  if (eva >= 1) return 4;
  return 5;
}

/** L'etape du calendrier : semaine 1 les 7 premiers jours, puis une par semaine, 5 au plus */
export function etapeCalendrier(jours: number): number {
  return Math.min(5, Math.max(1, Math.floor(Math.max(0, jours) / 7) + 1));
}

export type EtapeReprise = { etape: number; calendrier: number; douleur: number; freineeParDouleur: boolean };

/** L'etape ou tu en es : la plus prudente des deux */
export function etapeReprise(jours: number, eva: number, nbEtapes = 5): EtapeReprise {
  const calendrier = Math.min(nbEtapes, etapeCalendrier(jours));
  const douleur = Math.min(nbEtapes, etapeDouleur(eva));
  return { etape: Math.min(calendrier, douleur), calendrier, douleur, freineeParDouleur: douleur < calendrier };
}

/** Cle de stockage des consignes cochees d'une blessure */
export const cleCoches = (injuryId: number): string => `yoroi_reprise_coches_v1_${injuryId}`;
