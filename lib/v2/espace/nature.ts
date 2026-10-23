/**
 * Le pack « Nature et ville » (14 octobre 2026) : huit scenes neutres, sans style japonais, pour ceux qui
 * preferent un decor d'aujourd'hui (Gemini, meme style peint que les scenes du pack Classique) : plage de jour
 * et au coucher du soleil, desert sous les etoiles, sous bois lumineux, cascade, mer la nuit, ville et buildings
 * de jour et de nuit. Aucune ecriture, aucun logo, aucun personnage. Toutes Premium, comme les scenes non offertes
 * du pack Classique. Le desert de jour est dans le pack Classique. Require statiques pour Metro.
 */
import type { ImageSourcePropType } from 'react-native';

export const NATURE_SCENE_IDS = [
  'nature_plage_jour', 'nature_plage_couchant', 'nature_foret', 'nature_cascade', 'nature_ville_jour',
  'nature_desert_nuit', 'nature_mer_nuit', 'nature_ville_nuit',
] as const;
export type NatureSceneId = (typeof NATURE_SCENE_IDS)[number];

export type SceneNature = {
  id: NatureSceneId;
  nom: string;
  phrase: string;
  description: string;
  /** centre d'interet en fraction de la largeur */
  focus: number;
  /** bas de la scene sombre : ton prenom s'ecrit en blanc */
  sombre: boolean;
  offerte?: boolean;
  image: ImageSourcePropType;
};

export const SCENES_NATURE: SceneNature[] = [
  { id: 'nature_plage_jour', nom: 'Plage', phrase: 'Le sable et les palmiers', description: 'La plage de sable, la mer turquoise et les palmiers', focus: 0.4, sombre: false, image: require('@/assets/avatars/app/nature/scenes/plage_jour.webp') },
  { id: 'nature_plage_couchant', nom: 'Plage au couchant', phrase: 'Le soleil sur la mer', description: 'La plage au coucher du soleil, le ciel rose et or', focus: 0.4, sombre: false, image: require('@/assets/avatars/app/nature/scenes/plage_couchant.webp') },
  { id: 'nature_foret', nom: 'Forêt', phrase: 'Le sentier sous les arbres', description: 'Le sous bois lumineux et les rayons du soleil', focus: 0.4, sombre: false, image: require('@/assets/avatars/app/nature/scenes/foret.webp') },
  { id: 'nature_cascade', nom: 'Cascade', phrase: 'La chute d’eau dans la forêt', description: 'La cascade, la brume et le bassin turquoise', focus: 0.4, sombre: false, image: require('@/assets/avatars/app/nature/scenes/cascade.webp') },
  { id: 'nature_ville_jour', nom: 'Buildings', phrase: 'Les tours au bord de l’eau', description: 'Les gratte ciel et le fleuve sous le ciel bleu', focus: 0.4, sombre: false, image: require('@/assets/avatars/app/nature/scenes/ville_jour.webp') },
  { id: 'nature_desert_nuit', nom: 'Désert étoilé', phrase: 'Les dunes sous la Voie lactée', description: 'Les dunes et l’oasis sous la lune et les étoiles', focus: 0.4, sombre: true, image: require('@/assets/avatars/app/nature/scenes/desert_nuit.webp') },
  { id: 'nature_mer_nuit', nom: 'Mer la nuit', phrase: 'La lune sur les vagues', description: 'Les rochers et la mer sous la pleine lune', focus: 0.4, sombre: true, image: require('@/assets/avatars/app/nature/scenes/mer_nuit.webp') },
  { id: 'nature_ville_nuit', nom: 'Buildings de nuit', phrase: 'Les fenêtres allumées sur le fleuve', description: 'Les tours éclairées et leurs reflets dans l’eau', focus: 0.4, sombre: true, image: require('@/assets/avatars/app/nature/scenes/ville_nuit.webp') },
];

export const NATURE_SCENE_IMAGES = Object.fromEntries(SCENES_NATURE.map((s) => [s.id, s.image])) as Record<NatureSceneId, ImageSourcePropType>;
export const NATURE_SCENE_FOCUS = Object.fromEntries(SCENES_NATURE.map((s) => [s.id, s.focus])) as Record<NatureSceneId, number>;
export const NATURE_SCENE_SOMBRES: NatureSceneId[] = SCENES_NATURE.filter((s) => s.sombre).map((s) => s.id);

/** Vrai si la scene fait partie du pack Nature et ville */
export function estSceneNature(id: string | null | undefined): boolean {
  return !!id && (NATURE_SCENE_IDS as readonly string[]).includes(id);
}
