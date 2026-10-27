/**
 * Le pack « Voyages » (18 octobre 2026) : douze scenes animees en code (pluie, neige, etoiles, brume, lueurs,
 * train, reflets ; lib/v2/scenes/animations.ts et components/yoroi/v2/scenes/SceneAnimee.tsx).
 * Images : assets/avatars/app/scenes_voyages/ (sc01 a sc12, puis sc13 a sc19 le 27 octobre, 1200 x 670), meme style peint que les autres scenes.
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
  // 27 octobre 2026 : les scenes de Marseille (et les aurores), tirees des photos et de la video de Houari.
  // En tete : NEW_SCENES (personnages.ts) commence par elles, le badge Nouveau passe sur l'onglet Marseille
  'marseille_calanque', 'marseille_paddle', 'marseille_monument', 'marseille_moto', 'marseille_guidon', 'marseille_heure_bleue',
  'voyage_aurores_boreales',
  'voyage_yatai_pont', 'voyage_moto_tour_eiffel', 'voyage_rue_tokyo', 'voyage_passage_niveau_mer',
  'voyage_toit_train', 'voyage_hublot_avion', 'voyage_aile_avion', 'voyage_balancoire_plage',
  'voyage_bivouac_desert', 'voyage_voie_lactee_nuages', 'voyage_lampadaire_hiver', 'voyage_voie_lactee_cote',
] as const;
export type VoyageSceneId = (typeof VOYAGE_SCENE_IDS)[number];

/**
 * 27 octobre 2026 : les scenes de Marseille (la corniche, les calanques), dans le pack Voyages (meme prix : Premium,
 * essai 24 h du grand coffre possible), rangees dans leur propre onglet « Marseille » de la galerie (groupes.ts).
 * Images sc13 a sc19 (1200 x 670), dessinees avec Gemini d'apres les photos et la video IMG_5115 de Houari, dans le
 * style des scenes Voyages. Sources brutes, planche et mesures : _propositions/scenes_marseille_2026-10-27/.
 * Les aurores boreales (sc17) restent dans l'onglet Voyages.
 */
export const MARSEILLE_SCENE_IDS = ['marseille_calanque', 'marseille_paddle', 'marseille_monument', 'marseille_moto', 'marseille_guidon', 'marseille_heure_bleue'] as const;

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
  // 27 octobre 2026 : Marseille et les aurores. sol, focus, echelle lus sur la planche (_propositions/scenes_marseille_2026-10-27/planche_grille.jpg)
  // dans le cadrage de l'accueil (390 x 250 points : ton personnage est vers 80 a 88 % de la largeur de l'image).
  { id: 'marseille_calanque', anim: 'calanque_couchant', nom: traduire('Calanque au couchant'), phrase: traduire('Le soleil se couche sur la calanque'), description: traduire('Les rochers de la calanque et la mer dorée au coucher du soleil'), focus: 0.5, sombre: false, sol: 0.86, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc13_calanque_couchant.webp') },
  { id: 'marseille_paddle', anim: 'paddle_couchant', nom: traduire('Paddle au couchant'), phrase: traduire('Cap sur le soleil couchant'), description: traduire('L’avant de la planche sur la mer calme, le ciel en feu'), focus: 0.55, sombre: false, sol: 0.96, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc14_paddle_couchant.webp') },
  { id: 'marseille_monument', anim: 'corniche_monument', nom: traduire('Corniche, le monument'), phrase: traduire('Le monument face aux îles'), description: traduire('La Corniche, le monument noir et les bancs en mosaïque au coucher du soleil'), focus: 0.4, sombre: false, sol: 0.9, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc15_corniche_monument.webp') },
  { id: 'marseille_moto', anim: 'corniche_moto', nom: traduire('Corniche à moto'), phrase: traduire('La moto garée face à la mer'), description: traduire('La moto et son casque sur la Corniche, les îles et le soleil couchant'), focus: 0.42, sombre: false, sol: 0.9, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc16_corniche_moto.webp') },
  { id: 'marseille_guidon', anim: 'corniche_guidon', nom: traduire('Corniche, vue du guidon'), phrase: traduire('La pause moto au coucher du soleil'), description: traduire('Le guidon de la moto, la Corniche et la mer dorée'), focus: 0.45, sombre: false, sol: 0.9, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc18_corniche_guidon.webp') },
  { id: 'marseille_heure_bleue', anim: 'corniche_heure_bleue', nom: traduire('Corniche à l’heure bleue'), phrase: traduire('Les lampadaires s’allument'), description: traduire('La Corniche à la nuit tombée, les lumières sur la colline'), focus: 0.5, sombre: true, sol: 0.9, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc19_corniche_heure_bleue.webp') },
  { id: 'voyage_aurores_boreales', anim: 'aurores_boreales', nom: traduire('Aurores boréales'), phrase: traduire('Le ciel vert au dessus des nuages'), description: traduire('Les aurores boréales dansent au dessus d’une mer de nuages'), focus: 0.5, sombre: true, sol: 0.88, echelle: 0.95, image: require('@/assets/avatars/app/scenes_voyages/sc17_aurores_boreales.webp') },
];

export const VOYAGE_SCENE_IMAGES = Object.fromEntries(SCENES_VOYAGES.map((s) => [s.id, s.image])) as Record<VoyageSceneId, ImageSourcePropType>;
export const VOYAGE_SCENE_FOCUS = Object.fromEntries(SCENES_VOYAGES.map((s) => [s.id, s.focus])) as Record<VoyageSceneId, number>;
export const VOYAGE_SCENE_SOMBRES: VoyageSceneId[] = SCENES_VOYAGES.filter((s) => s.sombre).map((s) => s.id);
export const SOL_VOYAGES: Record<string, { sol: number; echelle: number }> = Object.fromEntries(SCENES_VOYAGES.map((s) => [s.id, { sol: s.sol, echelle: s.echelle }]));

/**
 * Lisibilite du bandeau du salut (lib/v2/espace/lisibilite.ts) des scenes du 27 octobre 2026 : 92e centile de la
 * luminance de la zone du bandeau (bas gauche, cadrage de l'accueil 390 x 250 points), converti en voile par la droite
 * ajustee sur les scenes Nature et ville deja mesurees (ecart maxi 0,06). Les douze premieres scenes Voyages n'ont
 * pas de mesure (voile par defaut, VOILE_DEFAUT).
 */
export const LISIBILITE_VOYAGES: Record<string, { lum: number; voile: number }> = {
  marseille_calanque: { lum: 0.441, voile: 0.55 },
  marseille_paddle: { lum: 0.44, voile: 0.59 },
  marseille_monument: { lum: 0.352, voile: 0.49 },
  marseille_moto: { lum: 0.272, voile: 0.41 },
  marseille_guidon: { lum: 0.306, voile: 0.41 },
  marseille_heure_bleue: { lum: 0.22, voile: 0.33 },
  voyage_aurores_boreales: { lum: 0.305, voile: 0.46 },
};

/** Vrai si la scene est une scene de Marseille (onglet Marseille de la galerie) */
export function estSceneMarseille(id: string | null | undefined): boolean {
  return !!id && (MARSEILLE_SCENE_IDS as readonly string[]).includes(id);
}

/** Vrai si la scene fait partie du pack Voyages */
export function estSceneVoyage(id: string | null | undefined): boolean {
  return !!id && (VOYAGE_SCENE_IDS as readonly string[]).includes(id);
}

/** Identifiant de l'animation en code d'une scene (lib/v2/scenes/animations.ts), ou null */
export function animationDeScene(id: string | null | undefined): string | null {
  return SCENES_VOYAGES.find((s) => s.id === id)?.anim ?? null;
}
