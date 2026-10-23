/**
 * Scenes en miroir (16 octobre 2026). Houari : sur certaines scenes le seul sol est a gauche, sous ton salut, et ton
 * personnage (a droite) flotte au dessus de l'eau ou des nuages. Pour ces scenes, l'Accueil, l'apercu Ta scene et les
 * vignettes de la galerie montrent l'image retournee (fichier _miroir.webp a cote de l'original, garde tel quel) :
 * le sol passe a droite, sous les pieds du personnage. Le recadrage est retourne lui aussi (decalage miroir), l'ecran
 * montre donc exactement le reflet du cadrage d'origine.
 * Verifie scene par scene (scratchpad miroir, planche.png) : aucun texte, aucune banniere ni symbole asymetrique.
 * Le sol (sol.ts) et le voile du salut (lisibilite.ts) de ces scenes sont mesures sur l'image retournee.
 * Ecartees : Temple (le miroir pose le personnage sur la falaise, l'escalier d'origine est mieux), Bambouseraie (allee
 * au centre, rien ne change), Fete des lanternes, Pavillon d'or, Port d'hiver, Pont des bannieres (eau ou barques des
 * deux cotes), Pavillon de l'armure (le personnage cacherait l'armure).
 * Une video ajoutee plus tard a l'une de ces scenes est retournee a l'affichage (Scene.tsx), comme l'image fixe.
 */
import type { ImageSourcePropType } from 'react-native';
import type { SceneId } from '@/lib/v2/espace';

export const IMAGES_MIROIR: Partial<Record<SceneId, ImageSourcePropType>> = {
  sommet: require('@/assets/avatars/app/monde/scenes/sommet_miroir.webp'),
  lanternes_jardin: require('@/assets/avatars/app/monde/scenes/lanternes_jardin_miroir.webp'),
  lanternes_port: require('@/assets/avatars/app/monde/scenes/lanternes_port_miroir.webp'),
  lanternes_ryokan: require('@/assets/avatars/app/monde/scenes/lanternes_ryokan_miroir.webp'),
  nature_mer_nuit: require('@/assets/avatars/app/nature/scenes/mer_nuit_miroir.webp'),
};

/** Les scenes montrees en miroir */
export const SCENES_EN_MIROIR = Object.keys(IMAGES_MIROIR) as SceneId[];

export function estEnMiroir(scene: SceneId | string): boolean {
  return Object.prototype.hasOwnProperty.call(IMAGES_MIROIR, scene);
}

/** L'image retournee de la scene, ou null si la scene garde son image d'origine */
export function imageMiroir(scene: SceneId | string): ImageSourcePropType | null {
  return estEnMiroir(scene) ? (IMAGES_MIROIR as Record<string, ImageSourcePropType>)[scene] : null;
}

/**
 * Decalage horizontal de l'image dans la scene (points) : le centre d'interet a 42 % de la largeur, puis, pour une
 * scene en miroir, le decalage retourne (imgW - largeur - decalage) pour montrer le reflet exact du cadrage d'origine.
 */
export function decalageScene(o: { imgW: number; largeur: number; focus: number; miroir: boolean }): number {
  const base = Math.max(0, Math.min(o.imgW - o.largeur, o.focus * o.imgW - o.largeur * 0.42));
  return o.miroir ? Math.max(0, o.imgW - o.largeur - base) : base;
}
