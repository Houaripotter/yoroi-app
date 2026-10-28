/**
 * Vague 40 : le pack « Lanternes de nuit », douze scenes de nuit de l'epoque d'Edo (Gemini, style de la Ruelle de nuit),
 * plus la Ruelle de nuit elle-meme. Aucune n'a de torii dans le decor. Require statiques pour Metro.
 */
import type { ImageSourcePropType } from 'react-native';
import { traduire } from '@/lib/i18n/tr';

export const LANTERNES_IDS = [
  'lanternes_pluie', 'lanternes_maison_the', 'lanternes_canal', 'lanternes_port', 'lanternes_sanctuaire', 'lanternes_neige',
  'lanternes_marche', 'lanternes_ryokan', 'lanternes_chateau', 'lanternes_jardin', 'lanternes_festival', 'lanternes_samourai',
] as const;
export type LanterneSceneId = (typeof LANTERNES_IDS)[number];

export type SceneLanterne = { id: LanterneSceneId; nom: string; phrase: string; description: string; focus: number; image: ImageSourcePropType };

/** focus : centre d'interet en fraction de la largeur (les maisons a gauche, le personnage a droite) */
export const SCENES_LANTERNES: SceneLanterne[] = [
  { id: 'lanternes_pluie', nom: traduire('Ruelle sous la pluie'), phrase: traduire('Les pavés mouillés, les lanternes'), description: traduire('La pluie fine sur la ruelle de bois'), focus: 0.4, image: require('@/assets/avatars/app/monde/scenes/lanternes_pluie.webp') },
  { id: 'lanternes_maison_the', nom: traduire('Maison de thé'), phrase: traduire('Le noren bleu, les lanternes rouges'), description: traduire('Le banc rouge devant la maison de thé'), focus: 0.42, image: require('@/assets/avatars/app/monde/scenes/lanternes_maison_the.webp') },
  { id: 'lanternes_canal', nom: traduire('Pont du canal'), phrase: traduire('Les lanternes qui flottent'), description: traduire('Le pont de bois et les lanternes sur l’eau'), focus: 0.38, image: require('@/assets/avatars/app/monde/scenes/lanternes_canal.webp') },
  { id: 'lanternes_port', nom: traduire('Quai du port'), phrase: traduire('Les barques sous la lune'), description: traduire('Les barques amarrées le long du quai'), focus: 0.4, image: require('@/assets/avatars/app/monde/scenes/lanternes_port.webp') },
  { id: 'lanternes_sanctuaire', nom: traduire('Escalier du sanctuaire'), phrase: traduire('Les lanternes de pierre'), description: traduire('Les marches entre les cèdres'), focus: 0.4, image: require('@/assets/avatars/app/monde/scenes/lanternes_sanctuaire.webp') },
  { id: 'lanternes_neige', nom: traduire('Auberge sous la neige'), phrase: traduire('Les fenêtres chaudes dans l’hiver'), description: traduire('L’auberge de montagne sous la neige'), focus: 0.46, image: require('@/assets/avatars/app/monde/scenes/lanternes_neige.webp') },
  { id: 'lanternes_marche', nom: traduire('Marché de nuit'), phrase: traduire('Les étals éclairés'), description: traduire('Les étals de bois sous les lanternes'), focus: 0.36, image: require('@/assets/avatars/app/monde/scenes/lanternes_marche.webp') },
  { id: 'lanternes_ryokan', nom: traduire('Auberge de la rivière'), phrase: traduire('Les balcons sur l’eau'), description: traduire('Le ryokan et ses reflets dans la rivière'), focus: 0.4, image: require('@/assets/avatars/app/monde/scenes/lanternes_ryokan.webp') },
  { id: 'lanternes_chateau', nom: traduire('Rue du château'), phrase: traduire('Les murs blancs sous la lune'), description: traduire('Les demeures de samouraïs devant le château'), focus: 0.42, image: require('@/assets/avatars/app/monde/scenes/lanternes_chateau.webp') },
  { id: 'lanternes_jardin', nom: traduire('Jardin de nuit'), phrase: traduire('L’étang et les lanternes de pierre'), description: traduire('Le pavillon de thé au bord de l’étang'), focus: 0.36, image: require('@/assets/avatars/app/monde/scenes/lanternes_jardin.webp') },
  { id: 'lanternes_festival', nom: traduire('Soir de fête'), phrase: traduire('Les guirlandes de lanternes'), description: traduire('Les lanternes rouges et blanches sur la rue'), focus: 0.4, image: require('@/assets/avatars/app/monde/scenes/lanternes_festival.webp') },
  { id: 'lanternes_samourai', nom: traduire('Cour du samouraï'), phrase: traduire('Le gravier ratissé, le pin'), description: traduire('La porte ouverte sur la cour de la maison'), focus: 0.42, image: require('@/assets/avatars/app/monde/scenes/lanternes_samourai.webp') },
];

/** Les images par id (pour les tables Record<SceneId, ...>) */
export const LANTERNES_IMAGES = Object.fromEntries(SCENES_LANTERNES.map((s) => [s.id, s.image])) as Record<LanterneSceneId, ImageSourcePropType>;
export const LANTERNES_FOCUS = Object.fromEntries(SCENES_LANTERNES.map((s) => [s.id, s.focus])) as Record<LanterneSceneId, number>;
