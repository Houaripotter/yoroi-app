/**
 * Vague 44 : le pack « Samouraï », dix scenes du monde des samourais (Gemini, style de la Ruelle de nuit et de la
 * Salle d'honneur) : salle d'armes, dojo de kenjutsu, cour du chateau, tente du general, forge, pavillon de l'armure,
 * porte du chateau, salle de meditation, pont des bannieres, et la salle d'armes de nuit. Katanas, armures, bannieres
 * sans ecriture. Premium comme le pack Lanternes, sauf la Salle d'armes, offerte. Require statiques pour Metro.
 */
import type { ImageSourcePropType } from 'react-native';
import { traduire } from '@/lib/i18n/tr';

export const SAMOURAI_IDS = [
  'samourai_armurerie', 'samourai_kenjutsu', 'samourai_cour', 'samourai_camp_nuit', 'samourai_forge_nuit',
  'samourai_pavillon_aube', 'samourai_porte_nuit', 'samourai_meditation', 'samourai_pont_nuit', 'samourai_armurerie_nuit',
] as const;
export type SamouraiSceneId = (typeof SAMOURAI_IDS)[number];

export type SceneSamourai = {
  id: SamouraiSceneId;
  nom: string;
  phrase: string;
  description: string;
  /** centre d'interet en fraction de la largeur (le decor a gauche, le personnage a droite) */
  focus: number;
  /** bas de la scene sombre : ton prenom s'ecrit en blanc */
  sombre: boolean;
  /** la scene montre un torii (elle ne sert alors pas de fond a la courbe du poids, qui a deja le sien) */
  torii: boolean;
  /** offerte a tous (une seule scene du pack) */
  offerte?: boolean;
  image: ImageSourcePropType;
};

export const SCENES_SAMOURAI: SceneSamourai[] = [
  { id: 'samourai_armurerie', nom: 'Salle d’armes', phrase: traduire('L’armure et les râteliers de sabres'), description: traduire('L’armure sur son support et les katanas alignés'), focus: 0.3, sombre: true, torii: false, offerte: true, image: require('@/assets/avatars/app/monde/scenes/samourai_armurerie.webp') },
  { id: 'samourai_kenjutsu', nom: traduire('Dojo de kenjutsu'), phrase: traduire('Les bokken et les katanas au mur'), description: traduire('Le parquet ciré et le râtelier des sabres de bois'), focus: 0.3, sombre: true, torii: false, image: require('@/assets/avatars/app/monde/scenes/samourai_kenjutsu.webp') },
  { id: 'samourai_cour', nom: traduire('Cour du château'), phrase: traduire('Les bannières devant le donjon'), description: traduire('Le gravier ratissé, le pin et les bannières'), focus: 0.45, sombre: false, torii: false, image: require('@/assets/avatars/app/monde/scenes/samourai_cour.webp') },
  { id: 'samourai_camp_nuit', nom: traduire('Tente du général'), phrase: traduire('L’éventail de commandant, la nuit'), description: traduire('Les armures et les braseros du camp de guerre'), focus: 0.4, sombre: true, torii: false, image: require('@/assets/avatars/app/monde/scenes/samourai_camp_nuit.webp') },
  { id: 'samourai_forge_nuit', nom: traduire('Forge de nuit'), phrase: traduire('Les lames sur la braise'), description: traduire('Le feu de la forge où naissent les katanas'), focus: 0.4, sombre: true, torii: false, image: require('@/assets/avatars/app/monde/scenes/samourai_forge_nuit.webp') },
  { id: 'samourai_pavillon_aube', nom: traduire('Pavillon de l’armure'), phrase: traduire('L’armure exposée à l’aube'), description: traduire('Le pavillon de bois sur l’étang'), focus: 0.4, sombre: true, torii: false, image: require('@/assets/avatars/app/monde/scenes/samourai_pavillon_aube.webp') },
  { id: 'samourai_porte_nuit', nom: traduire('Porte du château'), phrase: traduire('Les lanternes de la garde'), description: traduire('La grande porte de bois sous la lune'), focus: 0.4, sombre: true, torii: false, image: require('@/assets/avatars/app/monde/scenes/samourai_porte_nuit.webp') },
  { id: 'samourai_meditation', nom: traduire('Salle de méditation'), phrase: traduire('Le katana sur son support'), description: traduire('Le tatami, l’encens et le sabre au repos'), focus: 0.4, sombre: true, torii: false, image: require('@/assets/avatars/app/monde/scenes/samourai_meditation.webp') },
  { id: 'samourai_pont_nuit', nom: traduire('Pont des bannières'), phrase: traduire('Les lanternes sur la rivière'), description: traduire('Le pont de bois et ses bannières, le soir'), focus: 0.4, sombre: true, torii: false, image: require('@/assets/avatars/app/monde/scenes/samourai_pont_nuit.webp') },
  { id: 'samourai_armurerie_nuit', nom: traduire('Salle d’armes de nuit'), phrase: traduire('Les sabres à la lueur des lanternes'), description: traduire('L’armure et les katanas sous les lanternes'), focus: 0.3, sombre: true, torii: false, image: require('@/assets/avatars/app/monde/scenes/samourai_armurerie_nuit.webp') },
];

/** Les images par id (pour les tables Record<SceneId, ...>) */
export const SAMOURAI_IMAGES = Object.fromEntries(SCENES_SAMOURAI.map((s) => [s.id, s.image])) as Record<SamouraiSceneId, ImageSourcePropType>;
export const SAMOURAI_FOCUS = Object.fromEntries(SCENES_SAMOURAI.map((s) => [s.id, s.focus])) as Record<SamouraiSceneId, number>;
/** Scenes du pack au bas sombre (texte blanc) */
export const SAMOURAI_SOMBRES: SamouraiSceneId[] = SCENES_SAMOURAI.filter((s) => s.sombre).map((s) => s.id);
/** Scenes du pack qui montrent un torii (aucune aujourd'hui) */
export const SAMOURAI_AVEC_TORII: SamouraiSceneId[] = SCENES_SAMOURAI.filter((s) => s.torii).map((s) => s.id);
