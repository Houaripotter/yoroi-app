/**
 * Vague 40 : le pack « Lanternes de nuit », douze scenes de nuit de l'epoque d'Edo (Gemini, style de la Ruelle de nuit),
 * plus la Ruelle de nuit elle-meme. Aucune n'a de torii dans le decor. Require statiques pour Metro.
 */
import type { ImageSourcePropType } from 'react-native';

export const LANTERNES_IDS = [
  'lanternes_pluie', 'lanternes_maison_the', 'lanternes_canal', 'lanternes_port', 'lanternes_sanctuaire', 'lanternes_neige',
  'lanternes_marche', 'lanternes_ryokan', 'lanternes_chateau', 'lanternes_jardin', 'lanternes_festival', 'lanternes_samourai',
] as const;
export type LanterneSceneId = (typeof LANTERNES_IDS)[number];

export type SceneLanterne = { id: LanterneSceneId; nom: string; phrase: string; description: string; focus: number; image: ImageSourcePropType };

/** focus : centre d'interet en fraction de la largeur (les maisons a gauche, le personnage a droite) */
export const SCENES_LANTERNES: SceneLanterne[] = [
  { id: 'lanternes_pluie', nom: 'Ruelle sous la pluie', phrase: 'Les pavés mouillés, les lanternes', description: 'La pluie fine sur la ruelle de bois', focus: 0.4, image: require('@/assets/avatars/app/monde/scenes/lanternes_pluie.webp') },
  { id: 'lanternes_maison_the', nom: 'Maison de thé', phrase: 'Le noren bleu, les lanternes rouges', description: 'Le banc rouge devant la maison de thé', focus: 0.42, image: require('@/assets/avatars/app/monde/scenes/lanternes_maison_the.webp') },
  { id: 'lanternes_canal', nom: 'Pont du canal', phrase: 'Les lanternes qui flottent', description: 'Le pont de bois et les lanternes sur l’eau', focus: 0.38, image: require('@/assets/avatars/app/monde/scenes/lanternes_canal.webp') },
  { id: 'lanternes_port', nom: 'Quai du port', phrase: 'Les barques sous la lune', description: 'Les barques amarrées le long du quai', focus: 0.4, image: require('@/assets/avatars/app/monde/scenes/lanternes_port.webp') },
  { id: 'lanternes_sanctuaire', nom: 'Escalier du sanctuaire', phrase: 'Les lanternes de pierre', description: 'Les marches entre les cèdres', focus: 0.4, image: require('@/assets/avatars/app/monde/scenes/lanternes_sanctuaire.webp') },
  { id: 'lanternes_neige', nom: 'Auberge sous la neige', phrase: 'Les fenêtres chaudes dans l’hiver', description: 'L’auberge de montagne sous la neige', focus: 0.46, image: require('@/assets/avatars/app/monde/scenes/lanternes_neige.webp') },
  { id: 'lanternes_marche', nom: 'Marché de nuit', phrase: 'Les étals éclairés', description: 'Les étals de bois sous les lanternes', focus: 0.36, image: require('@/assets/avatars/app/monde/scenes/lanternes_marche.webp') },
  { id: 'lanternes_ryokan', nom: 'Auberge de la rivière', phrase: 'Les balcons sur l’eau', description: 'Le ryokan et ses reflets dans la rivière', focus: 0.4, image: require('@/assets/avatars/app/monde/scenes/lanternes_ryokan.webp') },
  { id: 'lanternes_chateau', nom: 'Rue du château', phrase: 'Les murs blancs sous la lune', description: 'Les demeures de samouraïs devant le château', focus: 0.42, image: require('@/assets/avatars/app/monde/scenes/lanternes_chateau.webp') },
  { id: 'lanternes_jardin', nom: 'Jardin de nuit', phrase: 'L’étang et les lanternes de pierre', description: 'Le pavillon de thé au bord de l’étang', focus: 0.36, image: require('@/assets/avatars/app/monde/scenes/lanternes_jardin.webp') },
  { id: 'lanternes_festival', nom: 'Soir de fête', phrase: 'Les guirlandes de lanternes', description: 'Les lanternes rouges et blanches au-dessus de la rue', focus: 0.4, image: require('@/assets/avatars/app/monde/scenes/lanternes_festival.webp') },
  { id: 'lanternes_samourai', nom: 'Cour du samouraï', phrase: 'Le gravier ratissé, le pin', description: 'La porte ouverte sur la cour de la maison', focus: 0.42, image: require('@/assets/avatars/app/monde/scenes/lanternes_samourai.webp') },
];

/** Les images par id (pour les tables Record<SceneId, ...>) */
export const LANTERNES_IMAGES = Object.fromEntries(SCENES_LANTERNES.map((s) => [s.id, s.image])) as Record<LanterneSceneId, ImageSourcePropType>;
export const LANTERNES_FOCUS = Object.fromEntries(SCENES_LANTERNES.map((s) => [s.id, s.focus])) as Record<LanterneSceneId, number>;
