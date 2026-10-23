/**
 * Illustrations de l'accueil : scenes et personnages (require statiques pour Metro).
 */
import type { ImageSourcePropType } from 'react-native';
import type { SceneId } from '@/lib/v2/espace';
import { guerrierImage, parsePersonnage, personnageImage as dojoPersonnageImage } from '@/lib/v2/dojo/personnages';
import { LANTERNES_FOCUS, LANTERNES_IDS, LANTERNES_IMAGES } from '@/lib/v2/espace/lanternes';
import { SAMOURAI_FOCUS, SAMOURAI_IMAGES, SAMOURAI_SOMBRES } from '@/lib/v2/espace/samourai';
import { CLASSIQUE_SCENE_FOCUS, CLASSIQUE_SCENE_IMAGES, CLASSIQUE_SCENE_SOMBRES } from '@/lib/v2/espace/classique';
import { NATURE_SCENE_FOCUS, NATURE_SCENE_IMAGES, NATURE_SCENE_SOMBRES } from '@/lib/v2/espace/nature';
import { VOYAGE_SCENE_FOCUS, VOYAGE_SCENE_IMAGES, VOYAGE_SCENE_SOMBRES } from '@/lib/v2/espace/voyages';
import { VIE_SCENE_FOCUS, VIE_SCENE_IMAGES, VIE_SCENE_SOMBRES } from '@/lib/v2/espace/packsScenes';

export const SCENES: Record<SceneId, ImageSourcePropType> = {
  dojo: require('@/assets/avatars/app/themes/theme_dojo.webp'),
  nuit: require('@/assets/avatars/app/themes/theme_nuit.webp'),
  sakura: require('@/assets/avatars/app/themes/theme_sakura.webp'),
  matcha: require('@/assets/avatars/app/themes/theme_matcha.webp'),
  chateau: require('@/assets/avatars/app/monde/scenes/chateau.webp'),
  bambous: require('@/assets/avatars/app/monde/scenes/bambous.webp'),
  temple: require('@/assets/avatars/app/monde/scenes/temple.webp'),
  bataille: require('@/assets/avatars/app/monde/scenes/bataille.webp'),
  port: require('@/assets/avatars/app/monde/scenes/port.webp'),
  village: require('@/assets/avatars/app/monde/scenes/village.webp'),
  pagode: require('@/assets/avatars/app/monde/scenes/pagode.webp'),
  pont: require('@/assets/avatars/app/monde/scenes/pont.webp'),
  jardin: require('@/assets/avatars/app/monde/scenes/jardin.webp'),
  forge: require('@/assets/avatars/app/monde/scenes/forge.webp'),
  salle: require('@/assets/avatars/app/monde/scenes/salle.webp'),
  remparts: require('@/assets/avatars/app/monde/scenes/remparts.webp'),
  montagne: require('@/assets/avatars/app/monde/scenes/montagne.webp'),
  plage: require('@/assets/avatars/app/monde/scenes/plage.webp'),
  camp: require('@/assets/avatars/app/monde/scenes/camp.webp'),
  machiya_aube: require('@/assets/avatars/app/monde/scenes/machiya_aube.webp'),
  machiya_couchant: require('@/assets/avatars/app/monde/scenes/machiya_couchant.webp'),
  machiya_nuit: require('@/assets/avatars/app/monde/scenes/machiya_nuit.webp'),
  kyudojo: require('@/assets/avatars/app/monde/scenes/kyudojo.webp'),
  onsen: require('@/assets/avatars/app/monde/scenes/onsen.webp'),
  rizieres: require('@/assets/avatars/app/monde/scenes/rizieres.webp'),
  cascade: require('@/assets/avatars/app/monde/scenes/cascade.webp'),
  festival: require('@/assets/avatars/app/monde/scenes/festival.webp'),
  pavillon: require('@/assets/avatars/app/monde/scenes/pavillon.webp'),
  sommet: require('@/assets/avatars/app/monde/scenes/sommet.webp'),
  // vague 40 : le pack Lanternes de nuit
  ...LANTERNES_IMAGES,
  // vague 44 : le pack Samourai
  ...SAMOURAI_IMAGES,
  ...CLASSIQUE_SCENE_IMAGES,
  ...NATURE_SCENE_IMAGES,
  ...VOYAGE_SCENE_IMAGES,
  ...VIE_SCENE_IMAGES,
};

const DOJO_MATIN: ImageSourcePropType = require('@/assets/avatars/app/themes/theme_dojo_matin.webp');
const DOJO_SOIR: ImageSourcePropType = require('@/assets/avatars/app/themes/theme_dojo_soir.webp');

/** Scene du dojo qui suit l'heure : lumiere du matin, jour, lanternes du soir */
export function sceneForNow(scene: SceneId, date: Date = new Date()): ImageSourcePropType {
  if (scene !== 'dojo') return SCENES[scene] ?? SCENES.dojo;
  const h = date.getHours();
  if (h >= 5 && h < 11) return DOJO_MATIN;
  if (h >= 18 || h < 5) return DOJO_SOIR;
  return SCENES.dojo;
}

/**
 * Centre d'interet de chaque scene, en fraction de la largeur de l'image (1200 x 670) :
 * le chateau, le torii, le temple... L'accueil recadre la scene pour le garder bien visible.
 */
export const SCENE_FOCUS: Record<SceneId, number> = {
  dojo: 0.45,
  nuit: 0.75,
  sakura: 0.72,
  matcha: 0.66,
  chateau: 0.46,
  bambous: 0.55,
  temple: 0.26,
  bataille: 0.5,
  port: 0.6,
  // vague 16 : verifie en simulation 390 x 383, le motif reste a gauche du personnage
  village: 0.62,
  pagode: 0.8,
  pont: 0.68,
  jardin: 0.72,
  forge: 0.62,
  salle: 0.45,
  remparts: 0.78,
  montagne: 0.72,
  plage: 0.75,
  camp: 0.72,
  // vague 25 : verifie en simulation 390 x 383
  machiya_aube: 0.58,
  machiya_couchant: 0.58,
  machiya_nuit: 0.58,
  kyudojo: 0.6,
  onsen: 0.62,
  rizieres: 0.72,
  cascade: 0.5,
  festival: 0.68,
  pavillon: 0.74,
  // vague 27 : le torii et le sanctuaire a gauche
  sommet: 0.3,
  // vague 40 : les maisons a gauche, le personnage sur la partie degagee a droite
  ...LANTERNES_FOCUS,
  ...SAMOURAI_FOCUS,
  ...CLASSIQUE_SCENE_FOCUS,
  ...NATURE_SCENE_FOCUS,
  ...VOYAGE_SCENE_FOCUS,
  ...VIE_SCENE_FOCUS,
};

/** Rapport largeur sur hauteur des images de scene */
export const SCENE_RATIO = 1200 / 670;

/** Scenes dont le bas, sous ton prenom, est sombre (texte blanc) */
const DARK_SCENES: SceneId[] = ['nuit', 'bataille', 'port', 'village', 'pont', 'forge', 'salle', 'remparts', 'plage', 'camp', 'machiya_couchant', 'machiya_nuit', 'kyudojo', 'cascade', 'festival', 'pavillon', ...LANTERNES_IDS, ...SAMOURAI_SOMBRES, ...CLASSIQUE_SCENE_SOMBRES, ...NATURE_SCENE_SOMBRES, ...VIE_SCENE_SOMBRES, ...VOYAGE_SCENE_SOMBRES];

/** Scenes au ciel ou au sol sombre (texte blanc), y compris le dojo du soir */
export function sceneIsDark(scene: SceneId, date: Date = new Date()): boolean {
  if (DARK_SCENES.includes(scene)) return true;
  if (scene === 'dojo') {
    const h = date.getHours();
    return h >= 18 || h < 5;
  }
  return false;
}

const PACKS: Record<string, ImageSourcePropType[]> = {
  dragon: [require('@/assets/avatars/app/packs/dragon/dragon_1.webp'), require('@/assets/avatars/app/packs/dragon/dragon_2.webp'), require('@/assets/avatars/app/packs/dragon/dragon_3.webp')],
  kitsune: [require('@/assets/avatars/app/packs/kitsune/kitsune_1.webp'), require('@/assets/avatars/app/packs/kitsune/kitsune_2.webp'), require('@/assets/avatars/app/packs/kitsune/kitsune_3.webp')],
  kunoichi: [require('@/assets/avatars/app/packs/kunoichi/kunoichi_1.webp'), require('@/assets/avatars/app/packs/kunoichi/kunoichi_2.webp'), require('@/assets/avatars/app/packs/kunoichi/kunoichi_3.webp')],
  moine: [require('@/assets/avatars/app/packs/moine/moine_1.webp'), require('@/assets/avatars/app/packs/moine/moine_2.webp'), require('@/assets/avatars/app/packs/moine/moine_3.webp')],
  oni: [require('@/assets/avatars/app/packs/oni/oni_1.webp'), require('@/assets/avatars/app/packs/oni/oni_2.webp'), require('@/assets/avatars/app/packs/oni/oni_3.webp')],
};

/** Image du personnage choisi au rang actuel (index 0 a 4) */
export function personnageImage(personnage: string, rankIndex: number): ImageSourcePropType {
  const i = Math.max(0, Math.min(4, rankIndex));
  if (personnage === 'guerrier_f') return guerrierImage('f', i);
  // vague 45 : personnage Classique et « Sans personnage »
  const k = parsePersonnage(personnage).kind;
  if (k === 'classique' || k === 'aucun') return dojoPersonnageImage(personnage, i);
  const pack = PACKS[personnage];
  if (pack) return pack[i <= 1 ? 0 : i <= 3 ? 1 : 2];
  // packs sport et personnages du monde samourai (ex. 'boxe_f', 'ninja_h')
  if (personnage !== 'guerrier_h' && parsePersonnage(personnage).kind === 'pack') return dojoPersonnageImage(personnage, i);
  return guerrierImage('h', i);
}

/** Couleur du cercle de chaque rang : cuir, indigo, laque, mousse, or */
export const RANK_COLORS = ['#8C6A3F', '#2C4A84', '#454A58', '#4F6B28', '#C59D45'];
