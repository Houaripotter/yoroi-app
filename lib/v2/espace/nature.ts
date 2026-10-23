/**
 * Le pack « Nature et ville » (14 octobre 2026) : huit scenes neutres, sans style japonais, pour ceux qui
 * preferent un decor d'aujourd'hui (Gemini, meme style peint que les scenes du pack Classique) : plage de jour
 * et au coucher du soleil, desert sous les etoiles, sous bois lumineux, cascade, mer la nuit, ville et buildings
 * de jour et de nuit. Aucune ecriture, aucun logo, aucun personnage. Toutes Premium, comme les scenes non offertes
 * du pack Classique. Le desert de jour est dans le pack Classique. Require statiques pour Metro.
 */
import type { ImageSourcePropType } from 'react-native';
import { traduire } from '@/lib/i18n/tr';

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
  { id: 'nature_plage_jour', nom: 'Plage', phrase: traduire('Le sable et les palmiers'), description: traduire('La plage de sable, la mer turquoise et les palmiers'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/nature/scenes/plage_jour.webp') },
  { id: 'nature_plage_couchant', nom: traduire('Plage au couchant'), phrase: traduire('Le soleil sur la mer'), description: traduire('La plage au coucher du soleil, le ciel rose et or'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/nature/scenes/plage_couchant.webp') },
  { id: 'nature_foret', nom: traduire('Forêt'), phrase: traduire('Le sentier sous les arbres'), description: traduire('Le sous bois lumineux et les rayons du soleil'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/nature/scenes/foret.webp') },
  { id: 'nature_cascade', nom: 'Cascade', phrase: traduire('La chute d’eau dans la forêt'), description: traduire('La cascade, la brume et le bassin turquoise'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/nature/scenes/cascade.webp') },
  { id: 'nature_ville_jour', nom: 'Buildings', phrase: traduire('Les tours au bord de l’eau'), description: traduire('Les gratte ciel et le fleuve sous le ciel bleu'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/nature/scenes/ville_jour.webp') },
  { id: 'nature_desert_nuit', nom: traduire('Désert étoilé'), phrase: traduire('Les dunes sous la Voie lactée'), description: traduire('Les dunes et l’oasis sous la lune et les étoiles'), focus: 0.4, sombre: true, image: require('@/assets/avatars/app/nature/scenes/desert_nuit.webp') },
  { id: 'nature_mer_nuit', nom: traduire('Mer la nuit'), phrase: traduire('La lune sur les vagues'), description: traduire('Les rochers et la mer sous la pleine lune'), focus: 0.4, sombre: true, image: require('@/assets/avatars/app/nature/scenes/mer_nuit.webp') },
  { id: 'nature_ville_nuit', nom: traduire('Buildings de nuit'), phrase: traduire('Les fenêtres allumées sur le fleuve'), description: traduire('Les tours éclairées et leurs reflets dans l’eau'), focus: 0.4, sombre: true, image: require('@/assets/avatars/app/nature/scenes/ville_nuit.webp') },
];

export const NATURE_SCENE_IMAGES = Object.fromEntries(SCENES_NATURE.map((s) => [s.id, s.image])) as Record<NatureSceneId, ImageSourcePropType>;
export const NATURE_SCENE_FOCUS = Object.fromEntries(SCENES_NATURE.map((s) => [s.id, s.focus])) as Record<NatureSceneId, number>;
export const NATURE_SCENE_SOMBRES: NatureSceneId[] = SCENES_NATURE.filter((s) => s.sombre).map((s) => s.id);

/** Vrai si la scene fait partie du pack Nature et ville */
export function estSceneNature(id: string | null | undefined): boolean {
  return !!id && (NATURE_SCENE_IDS as readonly string[]).includes(id);
}
