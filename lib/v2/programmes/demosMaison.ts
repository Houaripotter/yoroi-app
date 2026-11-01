/**
 * Nos animations maison (1er novembre 2026, Houari : « si je n'ai pas le mode créateur, je veux les animations
 * qu'on avait créées »). Deux dessins Gemini par exercice, départ et arrivée, que l'app enchaîne en fondu en boucle
 * (components/yoroi/v2/seance/ExoDemo.tsx, DemoPaire). Elles nous appartiennent : visibles par tout le monde.
 * Seules les 54 validées par le contrôle qualité du 26 octobre sont revenues (assets/exercices/demos, registre
 * lib/v2/programmes/demosArt.ts) ; les 85 refusées restent dans l'historique git (commit f35c09a1^) jusqu'à être refaites.
 * Ajouter une animation : python3 _propositions/exercices/demo.py coupe <image.png> <identifiant>.
 */
import type { ImageSourcePropType } from 'react-native';
import { DEMOS } from './demosArt';
import { resoudreDemo } from './demos';

const deCle = (cle: string): ImageSourcePropType[] | null => (DEMOS[cle] ? [...DEMOS[cle]] : null);

/** Les deux poses maison de l'exercice (départ, arrivée), ou null. Même recherche que les GIF : prise, même mouvement. */
export function demoMaisonDe(nom: string | null | undefined): ImageSourcePropType[] | null {
  if (!nom) return null;
  return resoudreDemo(nom, deCle);
}

export const NOMBRE_DEMOS_MAISON = Object.keys(DEMOS).length;
