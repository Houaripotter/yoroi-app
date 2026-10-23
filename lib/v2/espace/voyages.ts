/**
 * Le pack « Voyages » (18 octobre 2026) : douze scenes animees en code (pluie, neige, etoiles, brume, lueurs,
 * train, reflets ; lib/v2/scenes/animations.ts et components/yoroi/v2/scenes/SceneAnimee.tsx).
 * Images : assets/avatars/app/scenes_voyages/ (sc01 a sc12, 1200 x 670), meme style peint que les autres scenes.
 * Identifiant de l'animation : le nom du fichier sans « scXX_ » (yatai_pont...).
 *
 * Prix (gamification, 18 octobre 2026) : le pack est Premium, mais trois scenes se gagnent avec la serie de jours
 * du Dojo (7, 30 et 100 jours d'affilee) et le grand coffre en fait essayer une pendant 24 h aux comptes gratuits
 * (lib/v2/dojo/recompensesScenes.ts).
 *
 * sol : hauteur du sol sous les pieds du personnage (a droite), en fraction de la hauteur de l'image, lue sur la
 * planche (_propositions/scenes_2026-10-18/planche_scenes.jpg). A 1 (hublot, aile d'avion, mer de
 * nuages, cote) : le sol n'est pas a droite, les pieds restent poses au dessus de tes outils avec l'ombre douce.
 */
import type { ImageSourcePropType } from 'react-native';
import { traduire } from '@/lib/i18n/tr';

export const VOYAGE_SCENE_IDS = [
  'voyage_yatai_pont', 'voyage_moto_tour_eiffel', 'voyage_rue_tokyo', 'voyage_passage_niveau_mer',
  'voyage_toit_train', 'voyage_hublot_avion', 'voyage_aile_avion', 'voyage_balancoire_plage',
  'voyage_bivouac_desert', 'voyage_voie_lactee_nuages', 'voyage_lampadaire_hiver', 'voyage_voie_lactee_cote',
] as const;
export type VoyageSceneId = (typeof VOYAGE_SCENE_IDS)[number];

export type SceneVoyage = {
  id: VoyageSceneId;
  /** identifiant de l'animation dans lib/v2/scenes/animations.ts */
  anim: string;
  nom: string;
  phrase: string;
  description: string;
  /** centre d'interet en fraction de la largeur */
  focus: number;
  /** bas de la scene sombre : ton prenom s'ecrit en blanc */
  sombre: boolean;
  sol: number;
  echelle: number;
  image: ImageSourcePropType;
};

export const SCENES_VOYAGES: SceneVoyage[] = [
  { id: 'voyage_yatai_pont', anim: 'yatai_pont', nom: traduire('Yatai sous la pluie'), phrase: traduire('Les lanternes sous le pont du train'), description: traduire('Le petit stand de nouilles, la pluie et le train qui passe'), focus: 0.4, sombre: true, sol: 0.9, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc01_yatai_pont.webp') },
  { id: 'voyage_moto_tour_eiffel', anim: 'moto_tour_eiffel', nom: traduire('Paris à moto'), phrase: traduire('La tour Eiffel au bord de la Seine'), description: traduire('La moto arrêtée sur les quais, la tour Eiffel au loin'), focus: 0.45, sombre: false, sol: 0.92, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc02_moto_tour_eiffel.webp') },
  { id: 'voyage_rue_tokyo', anim: 'rue_tokyo', nom: traduire('Rue de Tokyo'), phrase: traduire('Le crépuscule et la supérette allumée'), description: traduire('La rue de quartier au crépuscule, les fils et la boutique éclairée'), focus: 0.55, sombre: false, sol: 0.88, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc03_rue_tokyo.webp') },
  { id: 'voyage_passage_niveau_mer', anim: 'passage_niveau_mer', nom: traduire('Tramway au bord de la mer'), phrase: traduire('Le tramway au bord de la mer'), description: traduire('Le tramway vert longe la mer au coucher du soleil'), focus: 0.5, sombre: false, sol: 0.9, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc04_passage_niveau_mer.webp') },
  { id: 'voyage_toit_train', anim: 'toit_train', nom: traduire('Sur le toit du train'), phrase: traduire('Les rails vers la ville de nuit'), description: traduire('Le toit du train qui file vers les tours éclairées'), focus: 0.5, sombre: true, sol: 0.88, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc05_toit_train.webp') },
  { id: 'voyage_hublot_avion', anim: 'hublot_avion', nom: 'Hublot', phrase: traduire('Le soleil au dessus des nuages'), description: traduire('Le hublot de l’avion, la mer de nuages au coucher du soleil'), focus: 0.45, sombre: false, sol: 1.0, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc06_hublot_avion.webp') },
  { id: 'voyage_aile_avion', anim: 'aile_avion', nom: 'Aile d’avion', phrase: traduire('Le réacteur et le soleil couchant'), description: traduire('L’aile de l’avion au dessus d’un océan de nuages dorés'), focus: 0.45, sombre: false, sol: 1.0, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc07_aile_avion.webp') },
  { id: 'voyage_balancoire_plage', anim: 'balancoire_plage', nom: traduire('Balançoire'), phrase: traduire('Le palmier penché sur l’eau turquoise'), description: traduire('La balançoire sous le palmier, la plage et l’eau claire'), focus: 0.5, sombre: false, sol: 0.92, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc08_balancoire_plage.webp') },
  { id: 'voyage_bivouac_desert', anim: 'bivouac_desert', nom: 'Bivouac', phrase: traduire('Le feu de camp dans les dunes'), description: traduire('La tente, le feu de camp et le 4x4 au coucher du soleil'), focus: 0.45, sombre: true, sol: 0.9, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc09_bivouac_desert.webp') },
  { id: 'voyage_voie_lactee_nuages', anim: 'voie_lactee_nuages', nom: traduire('Voie lactée'), phrase: traduire('Les étoiles sur la mer de nuages'), description: traduire('La Voie lactée au dessus d’une mer de nuages éclairée'), focus: 0.4, sombre: true, sol: 1.0, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc10_voie_lactee_nuages.webp') },
  { id: 'voyage_lampadaire_hiver', anim: 'lampadaire_hiver', nom: 'Lampadaire en hiver', phrase: traduire('La neige sous la lumière'), description: traduire('Le lampadaire dans le parc enneigé, la neige qui tombe'), focus: 0.45, sombre: true, sol: 0.9, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc11_lampadaire_hiver.webp') },
  { id: 'voyage_voie_lactee_cote', anim: 'voie_lactee_cote', nom: traduire('Côte étoilée'), phrase: traduire('La Voie lactée sur la mer'), description: traduire('La falaise, la lanterne et la Voie lactée au dessus de la mer'), focus: 0.45, sombre: true, sol: 1.0, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc12_voie_lactee_cote.webp') },
];

export const VOYAGE_SCENE_IMAGES = Object.fromEntries(SCENES_VOYAGES.map((s) => [s.id, s.image])) as Record<VoyageSceneId, ImageSourcePropType>;
export const VOYAGE_SCENE_FOCUS = Object.fromEntries(SCENES_VOYAGES.map((s) => [s.id, s.focus])) as Record<VoyageSceneId, number>;
export const VOYAGE_SCENE_SOMBRES: VoyageSceneId[] = SCENES_VOYAGES.filter((s) => s.sombre).map((s) => s.id);
export const SOL_VOYAGES: Record<string, { sol: number; echelle: number }> = Object.fromEntries(SCENES_VOYAGES.map((s) => [s.id, { sol: s.sol, echelle: s.echelle }]));

/** Vrai si la scene fait partie du pack Voyages */
export function estSceneVoyage(id: string | null | undefined): boolean {
  return !!id && (VOYAGE_SCENE_IDS as readonly string[]).includes(id);
}

/** Identifiant de l'animation en code d'une scene (lib/v2/scenes/animations.ts), ou null */
export function animationDeScene(id: string | null | undefined): string | null {
  return SCENES_VOYAGES.find((s) => s.id === id)?.anim ?? null;
}
