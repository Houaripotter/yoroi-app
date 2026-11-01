/**
 * Visuels de transition Everkinetic (1er novembre 2026, Houari : utiliser Everkinetic, gratuit sous licence
 * CC BY-SA 4.0, pendant un mois, en attendant d'acheter la licence Gym visual au Black Friday).
 * Deux poses (départ, arrivée) enchaînées en fondu par le même moteur que nos animations maison (DemoPaire).
 * Ordre hors mode créateur (lib/v2/programmes/visuelExo.ts) : animation maison, puis Everkinetic, puis machine,
 * puis sticker. Les crédits s'affichent dans la fiche exercice et dans Réglages, Conditions et confidentialité.
 * Correspondances et cas écartés : _propositions/everkinetic_2026-11-01/CORRESPONDANCE.md.
 *
 * POUR RETIRER EVERKINETIC : passer EVERKINETIC_ACTIF à false. Plus aucune image ni crédit ne s'affiche ; ensuite
 * supprimer assets/exos/everkinetic/, everkineticArt.ts et ce fichier si on veut alléger l'app.
 */
import type { ImageSourcePropType } from 'react-native';
import { resoudreDemo } from './demos';
import { CORRESPONDANCE_EVERKINETIC, IMAGES_EVERKINETIC } from './everkineticArt';

/** L'interrupteur unique : false le jour où Gym visual est acheté */
export const EVERKINETIC_ACTIF = true;

/** Ce que demande la licence : nom, lien, licence, adaptation signalée */
export const CREDIT_EVERKINETIC = {
  nom: 'Everkinetic',
  site: 'https://everkinetic.com',
  depot: 'https://github.com/everkinetic/data',
  licence: 'CC BY-SA 4.0',
  lienLicence: 'https://creativecommons.org/licenses/by-sa/4.0/',
} as const;

const deCle = (cle: string): ImageSourcePropType[] | null => {
  const id = CORRESPONDANCE_EVERKINETIC[cle];
  return id && IMAGES_EVERKINETIC[id] ? [...IMAGES_EVERKINETIC[id]] : null;
};

/** Les deux poses Everkinetic de l'exercice (départ, arrivée), ou null. Même recherche que les animations maison. */
export function demoEverkineticDe(nom: string | null | undefined): ImageSourcePropType[] | null {
  if (!EVERKINETIC_ACTIF || !nom) return null;
  return resoudreDemo(nom, deCle);
}
