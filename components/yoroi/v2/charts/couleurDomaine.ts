/**
 * Couleur du trait d'un graphique de progression (16 octobre 2026), la meme logique que la carte Poids de l'accueil :
 *  - « Dégradé » (par defaut, Reglages, Tes courbes) : la couleur du domaine, celle de sa tuile a l'accueil
 *    (components/yoroi/v2/accueil/domaines.ts) : le Carnet et la force en indigo des seances, le poids en violet ;
 *  - « Indigo » ou « Encre » : le choix de Houari, sur toutes les courbes de progression.
 * Le rouge reste au tampon de record.
 */
import type { Domaine } from '@/components/yoroi/v2/accueil/domaines';
import { teinte } from '@/components/yoroi/v2/accueil/domaines';
import type { CouleurCourbe } from '@/lib/v2/courbes/prefs';
import { couleurCourbeActive } from '@/lib/v2/courbes/prefs';
import { arretsCourbe } from './CourbePoids';
import { paletteSombre } from '@/components/yoroi/livePalette';

export function couleurTraitDomaine(domaine: Domaine, couleur: CouleurCourbe = couleurCourbeActive(), sombre = paletteSombre()): string {
  if (couleur === 'indigo' || couleur === 'encre') return arretsCourbe(couleur, sombre)[0];
  if (domaine === 'poids') return arretsCourbe('degrade', sombre)[1];
  return teinte(domaine).texte;
}
