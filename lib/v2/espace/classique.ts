/**
 * Vague 45 : le pack « Classique », dix scenes neutres pour ceux qui ne sont pas fans du Japon (Gemini, meme style
 * peint que les scenes du Japon) : salle de sport, parc, ville, bord de mer et piste d'athletisme, de jour et de nuit.
 * 14 octobre 2026 : le Desert de jour (les dunes et l'oasis) rejoint le pack, Premium.
 * Aucune ecriture, aucun logo. La salle de sport et le parc de jour sont offerts, les autres sont Premium.
 * Require statiques pour Metro.
 */
import type { ImageSourcePropType } from 'react-native';
import { traduire } from '@/lib/i18n/tr';

export const CLASSIQUE_SCENE_IDS = [
  'classique_salle_jour', 'classique_parc_jour', 'classique_ville_jour', 'classique_mer_jour', 'classique_piste_jour', 'classique_desert_jour',
  'classique_salle_nuit', 'classique_parc_nuit', 'classique_ville_nuit', 'classique_mer_nuit', 'classique_piste_nuit',
] as const;
export type ClassiqueSceneId = (typeof CLASSIQUE_SCENE_IDS)[number];

export type SceneClassique = {
  id: ClassiqueSceneId;
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

export const SCENES_CLASSIQUE: SceneClassique[] = [
  { id: 'classique_salle_jour', nom: traduire('Salle de sport'), phrase: traduire('Les barres et les haltères au soleil'), description: traduire('La salle lumineuse, les racks et les haltères'), focus: 0.35, sombre: false, offerte: true, image: require('@/assets/avatars/app/classique/scenes/salle_jour.webp') },
  { id: 'classique_parc_jour', nom: 'Parc', phrase: traduire('L’allée sous les arbres'), description: traduire('La pelouse, les arbres et le chemin de footing'), focus: 0.4, sombre: false, offerte: true, image: require('@/assets/avatars/app/classique/scenes/parc_jour.webp') },
  { id: 'classique_ville_jour', nom: 'Ville', phrase: traduire('Les toits et la rue au matin'), description: traduire('La rue calme, les immeubles et le ciel clair'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/classique/scenes/ville_jour.webp') },
  { id: 'classique_mer_jour', nom: traduire('Bord de mer'), phrase: traduire('La promenade face à la mer'), description: traduire('La plage, la promenade et les vagues'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/classique/scenes/mer_jour.webp') },
  { id: 'classique_piste_jour', nom: traduire('Piste d’athlétisme'), phrase: traduire('Les couloirs du stade'), description: traduire('La piste, les couloirs et les gradins'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/classique/scenes/piste_jour.webp') },
  { id: 'classique_desert_jour', nom: traduire('Désert'), phrase: traduire('Les dunes et l’oasis'), description: traduire('Les dunes dorées et l’oasis sous les palmiers'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/classique/scenes/desert_jour.webp') },
  { id: 'classique_salle_nuit', nom: traduire('Salle de sport, le soir'), phrase: traduire('Les néons et la ville derrière la vitre'), description: traduire('La salle éclairée, la nuit tombée dehors'), focus: 0.35, sombre: true, image: require('@/assets/avatars/app/classique/scenes/salle_nuit.webp') },
  { id: 'classique_parc_nuit', nom: traduire('Parc, le soir'), phrase: traduire('Les lampadaires sur l’allée'), description: traduire('L’allée du parc sous les lampadaires'), focus: 0.4, sombre: true, image: require('@/assets/avatars/app/classique/scenes/parc_nuit.webp') },
  { id: 'classique_ville_nuit', nom: traduire('Ville, la nuit'), phrase: traduire('Les fenêtres allumées'), description: traduire('La rue et les immeubles sous les lumières'), focus: 0.4, sombre: true, image: require('@/assets/avatars/app/classique/scenes/ville_nuit.webp') },
  { id: 'classique_mer_nuit', nom: traduire('Bord de mer, la nuit'), phrase: traduire('La lune sur les vagues'), description: traduire('La promenade et la mer sous la lune'), focus: 0.4, sombre: true, image: require('@/assets/avatars/app/classique/scenes/mer_nuit.webp') },
  { id: 'classique_piste_nuit', nom: traduire('Stade, le soir'), phrase: traduire('Les projecteurs sur la piste'), description: traduire('La piste sous les projecteurs du stade'), focus: 0.4, sombre: true, image: require('@/assets/avatars/app/classique/scenes/piste_nuit.webp') },
];

export const CLASSIQUE_SCENE_IMAGES = Object.fromEntries(SCENES_CLASSIQUE.map((s) => [s.id, s.image])) as Record<ClassiqueSceneId, ImageSourcePropType>;
export const CLASSIQUE_SCENE_FOCUS = Object.fromEntries(SCENES_CLASSIQUE.map((s) => [s.id, s.focus])) as Record<ClassiqueSceneId, number>;
export const CLASSIQUE_SCENE_SOMBRES: ClassiqueSceneId[] = SCENES_CLASSIQUE.filter((s) => s.sombre).map((s) => s.id);

/** Vrai si la scene fait partie du pack Classique */
export function estSceneClassique(id: string | null | undefined): boolean {
  return !!id && (CLASSIQUE_SCENE_IDS as readonly string[]).includes(id);
}
