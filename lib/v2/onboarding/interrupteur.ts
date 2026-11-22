/**
 * L'interrupteur du nouvel onboarding (21 novembre 2026, Houari) : nouvel onboarding et paywall en 3 temps,
 * copies d'INRO (components/yoroi/v2/onboarding-neuf). L'ancien (app/onboarding.tsx, components/yoroi/v2/onboarding,
 * components/yoroi/v2/premium/Paywall.tsx) reste en place, rien n'est supprime.
 *
 * Pour revenir a l'ancien : passer ONBOARDING_NEUF_ACTIF a false. Rien d'autre a changer :
 *  - app/onboarding.tsx montre l'ancien parcours ;
 *  - app/index.tsx remet le mode retour « YOROI fait peau neuve » des utilisateurs existants ;
 *  - la mesure PostHog renumerote les etapes dans l'ordre de l'ancien parcours.
 *
 * Fichier pur (aucune dependance) : lu par la mesure (utils/telemetryPostHog.ts) et par les tests.
 */
export const ONBOARDING_NEUF_ACTIF = true;

/** Les ecrans du nouvel onboarding, dans l'ordre de la mesure : le numero d'etape PostHog suit cet ordre */
export const ORDRE_MESURE_NEUF = [
  'entree', 'prenom', 'toi', 'age', 'source', 'interlude', 'objectif', 'sport', 'poids', 'taille', 'cap', 'rythme',
  'univers', 'rappels', 'rappels_refus', 'sante', 'filtre', 'demo', 'preuve', 'chargement', 'paywall_1', 'paywall_2',
  'paywall_3', 'rattrapage',
] as const;
export type EtapeMesureNeuf = (typeof ORDRE_MESURE_NEUF)[number];

/** Le temps passe sur un ecran, en tranche : jamais la duree exacte */
export const TRANCHES_TEMPS = ['0_3', '3_10', '10_30', '30_plus'] as const;
export type TempsEcran = (typeof TRANCHES_TEMPS)[number];
