/**
 * 21 novembre 2026 : les avis vivent maintenant dans lib/v2/premium/preuveSociale.ts (notes et avis au meme endroit,
 * un seul fichier a mettre a jour). Ce fichier les reprend pour les anciens appelants.
 *
 * Avis REELS de YOROI sur l'App Store, la seule liste de l'app (accroche de l'onboarding et paywall).
 * Releves par Houari dans App Store Connect le 11 octobre 2026.
 * Extraits fideles : on peut couper avec « … », jamais changer un mot (fautes comprises),
 * et on coupe avant les emojis. N'en ajoute aucun qui ne soit pas publie sur un store.
 */

import { AVIS_STORES, RELEVE_LE, type AvisStore } from './preuveSociale';

export type Avis = AvisStore;

export const AVIS_VERIFIES_LE = RELEVE_LE;

export const AVIS: Avis[] = AVIS_STORES;
