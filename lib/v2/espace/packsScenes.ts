/**
 * Les scenes des packs « Vie réelle » (16 octobre 2026, agent PACKS) : FICHIER GENERE par scratchpad packs/gen.py.
 * Une scene assortie par pack (caserne, chantier, stade, plage de surf, chateau, arene, station spatiale...), meme style
 * peint que les scenes des packs Classique et Nature (reference jointe dans Gemini), 1200 x 670, aucune ecriture, aucun
 * logo, aucun personnage. Toutes Premium, comme les scenes du pack Nature et ville. Require statiques pour Metro.
 * sombre : bas de l'image sombre (luminance moyenne du bas sous 0,38), ton prenom s'ecrit en blanc.
 */
import type { ImageSourcePropType } from 'react-native';
import { traduire } from '@/lib/i18n/tr';

export const VIE_SCENE_IDS = ['vie_pompier', 'vie_militaire', 'vie_soignant', 'vie_policier', 'vie_cuisinier', 'vie_batiment', 'vie_motard', 'vie_surf', 'vie_skate', 'vie_basket', 'vie_foot', 'vie_rugby', 'vie_velo', 'vie_montagne', 'vie_natation', 'vie_danse', 'vie_escalade', 'vie_tennis', 'vie_halterophilie', 'vie_street', 'vie_chevalier', 'vie_viking', 'vie_gladiateur', 'vie_spartiate', 'vie_astronaute', 'vie_futuriste', 'vie_ninja_moderne', 'vie_sauveteur', 'vie_mecanicien', 'vie_agriculteur', 'vie_pilote', 'vie_ski', 'vie_golf', 'vie_equitation', 'vie_kayak', 'vie_pirate', 'vie_cowboy', 'vie_explorateur'] as const;
export type VieSceneId = (typeof VIE_SCENE_IDS)[number];

export type SceneVie = {
  id: VieSceneId;
  /** id du pack de lib/v2/dojo/packsVie.ts */
  pack: string;
  nom: string;
  description: string;
  /** centre d'interet en fraction de la largeur */
  focus: number;
  sombre: boolean;
  image: ImageSourcePropType;
};

export const SCENES_VIE: SceneVie[] = [
  { id: 'vie_pompier', pack: 'pompier', nom: 'Caserne', description: traduire('Le camion rouge et la grande porte ouverte'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/pompier.webp') },
  { id: 'vie_militaire', pack: 'militaire', nom: traduire('Camp d’entraînement'), description: traduire('Le parcours d’obstacles sous les pins'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/militaire.webp') },
  { id: 'vie_soignant', pack: 'soignant', nom: 'Urgences', description: traduire('Le couloir lumineux et le brancard'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/soignant.webp') },
  { id: 'vie_policier', pack: 'policier', nom: traduire('Rue du commissariat'), description: traduire('La voiture de patrouille devant le poste'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/policier.webp') },
  { id: 'vie_cuisinier', pack: 'cuisinier', nom: traduire('Cuisine du restaurant'), description: traduire('Les fourneaux, le cuivre et l’inox'), focus: 0.4, sombre: true, image: require('@/assets/avatars/app/packs_vie/scenes/cuisinier.webp') },
  { id: 'vie_batiment', pack: 'batiment', nom: 'Chantier', description: traduire('La grue et l’immeuble au lever du jour'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/batiment.webp') },
  { id: 'vie_motard', pack: 'motard', nom: traduire('Route de montagne'), description: traduire('Les virages et la moto au couchant'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/motard.webp') },
  { id: 'vie_surf', pack: 'surf', nom: traduire('Spot de surf'), description: traduire('Les grosses vagues et le sable mouillé'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/surf.webp') },
  { id: 'vie_skate', pack: 'skate', nom: 'Skatepark', description: traduire('Le bowl en béton et les rampes'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/skate.webp') },
  { id: 'vie_basket', pack: 'basket', nom: 'Playground', description: traduire('Le panier, le grillage et les briques'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/basket.webp') },
  { id: 'vie_foot', pack: 'foot', nom: 'Stade', description: traduire('La pelouse rayée et les tribunes vides'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/foot.webp') },
  { id: 'vie_rugby', pack: 'rugby', nom: traduire('Terrain de rugby'), description: traduire('Les poteaux en H et la pelouse rayée'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/rugby.webp') },
  { id: 'vie_velo', pack: 'velo', nom: traduire('Col de montagne'), description: traduire('Les lacets de la route sous les sommets'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/velo.webp') },
  { id: 'vie_montagne', pack: 'montagne', nom: 'Sentier alpin', description: traduire('Le lac turquoise et les sommets enneigés'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/montagne.webp') },
  { id: 'vie_natation', pack: 'natation', nom: 'Piscine olympique', description: traduire('Les lignes d’eau et la grande verrière'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/natation.webp') },
  { id: 'vie_danse', pack: 'danse', nom: traduire('Studio de danse'), description: traduire('Les miroirs, la barre et le parquet'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/danse.webp') },
  { id: 'vie_escalade', pack: 'escalade', nom: 'Salle d’escalade', description: traduire('Les murs couverts de prises'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/escalade.webp') },
  { id: 'vie_tennis', pack: 'tennis', nom: 'Court en terre battue', description: traduire('La terre orange, le filet et les arbres'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/tennis.webp') },
  { id: 'vie_halterophilie', pack: 'halterophilie', nom: traduire('Salle d’haltérophilie'), description: traduire('Le plateau de bois et les barres chargées'), focus: 0.4, sombre: true, image: require('@/assets/avatars/app/packs_vie/scenes/halterophilie.webp') },
  { id: 'vie_street', pack: 'street', nom: traduire('Parc de street workout'), description: traduire('Les barres face à la mer au couchant'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/street.webp') },
  { id: 'vie_chevalier', pack: 'chevalier', nom: traduire('Cour du château'), description: traduire('Les tours de pierre et les pavés'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/chevalier.webp') },
  { id: 'vie_viking', pack: 'viking', nom: 'Fjord', description: traduire('Le drakkar au ponton dans la brume'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/viking.webp') },
  { id: 'vie_gladiateur', pack: 'gladiateur', nom: traduire('Arène'), description: traduire('Les gradins de pierre et le sable doré'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/gladiateur.webp') },
  { id: 'vie_spartiate', pack: 'spartiate', nom: 'Temple grec', description: traduire('Les colonnes blanches au-dessus de la mer'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/spartiate.webp') },
  { id: 'vie_astronaute', pack: 'astronaute', nom: 'Station spatiale', description: traduire('La Terre par le hublot'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/astronaute.webp') },
  { id: 'vie_futuriste', pack: 'futuriste', nom: traduire('Ville du futur'), description: traduire('Les tours de lumière à la tombée du jour'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/futuriste.webp') },
  { id: 'vie_ninja_moderne', pack: 'ninja_moderne', nom: traduire('Toits la nuit'), description: traduire('La pleine lune au-dessus des immeubles'), focus: 0.4, sombre: true, image: require('@/assets/avatars/app/packs_vie/scenes/ninja_moderne.webp') },
  { id: 'vie_sauveteur', pack: 'sauveteur', nom: traduire('Poste de secours'), description: traduire('La tour de surveillance au bord de l’eau'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/sauveteur.webp') },
  { id: 'vie_mecanicien', pack: 'mecanicien', nom: traduire('Atelier mécanique'), description: traduire('Le pont élévateur et les outils au mur'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/mecanicien.webp') },
  { id: 'vie_agriculteur', pack: 'agriculteur', nom: 'Ferme', description: traduire('La grange rouge et les champs dorés'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/agriculteur.webp') },
  { id: 'vie_pilote', pack: 'pilote', nom: traduire('Piste d’aéroport'), description: traduire('L’avion blanc au lever du soleil'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/pilote.webp') },
  { id: 'vie_ski', pack: 'ski', nom: traduire('Piste enneigée'), description: traduire('Les sapins blancs et le télésiège'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/ski.webp') },
  { id: 'vie_golf', pack: 'golf', nom: traduire('Parcours de golf'), description: traduire('Le green, le drapeau et le lac'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/golf.webp') },
  { id: 'vie_equitation', pack: 'equitation', nom: traduire('Écurie'), description: traduire('Les boxes en bois et la carrière'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/equitation.webp') },
  { id: 'vie_kayak', pack: 'kayak', nom: traduire('Rivière'), description: traduire('Les rapides entre les rochers'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/kayak.webp') },
  { id: 'vie_pirate', pack: 'pirate', nom: 'Navire pirate', description: traduire('Le pont du trois-mâts au couchant'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/pirate.webp') },
  { id: 'vie_cowboy', pack: 'cowboy', nom: 'Ranch', description: traduire('La barrière de bois et le désert rouge'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/cowboy.webp') },
  { id: 'vie_explorateur', pack: 'explorateur', nom: 'Banquise', description: traduire('Les icebergs sous l’aurore'), focus: 0.4, sombre: false, image: require('@/assets/avatars/app/packs_vie/scenes/explorateur.webp') },
];

export const VIE_SCENE_IMAGES = Object.fromEntries(SCENES_VIE.map((s) => [s.id, s.image])) as Record<VieSceneId, ImageSourcePropType>;
export const VIE_SCENE_FOCUS = Object.fromEntries(SCENES_VIE.map((s) => [s.id, s.focus])) as Record<VieSceneId, number>;
export const VIE_SCENE_SOMBRES: VieSceneId[] = SCENES_VIE.filter((s) => s.sombre).map((s) => s.id);

/**
 * Sol de chaque scene (meme sens que lib/v2/espace/sol.ts) : hauteur des pieds a droite, en fraction de la hauteur de l'image,
 * lue sur chaque image recadree comme a l'accueil (scratchpad packs/mesure.py et planche sol.jpg). echelle : taille du personnage.
 */
export const SOL_VIE: Record<string, { sol: number; echelle: number }> = {
  vie_pompier: { sol: 0.8, echelle: 0.95 },
  vie_militaire: { sol: 0.82, echelle: 0.95 },
  vie_soignant: { sol: 0.8, echelle: 0.95 },
  vie_policier: { sol: 0.8, echelle: 0.95 },
  vie_cuisinier: { sol: 0.8, echelle: 0.95 },
  vie_batiment: { sol: 0.8, echelle: 0.95 },
  vie_motard: { sol: 0.8, echelle: 0.95 },
  vie_surf: { sol: 0.8, echelle: 0.95 },
  vie_skate: { sol: 0.8, echelle: 0.95 },
  vie_basket: { sol: 0.8, echelle: 0.95 },
  vie_foot: { sol: 0.8, echelle: 0.95 },
  vie_rugby: { sol: 0.8, echelle: 0.95 },
  vie_velo: { sol: 0.82, echelle: 0.95 },
  vie_montagne: { sol: 0.82, echelle: 0.95 },
  vie_natation: { sol: 0.82, echelle: 0.95 },
  vie_danse: { sol: 0.8, echelle: 0.95 },
  vie_escalade: { sol: 0.8, echelle: 0.95 },
  vie_tennis: { sol: 0.82, echelle: 0.95 },
  vie_halterophilie: { sol: 0.8, echelle: 0.95 },
  vie_street: { sol: 0.8, echelle: 0.95 },
  vie_chevalier: { sol: 0.82, echelle: 0.95 },
  vie_viking: { sol: 0.9, echelle: 0.95 },
  vie_gladiateur: { sol: 0.82, echelle: 0.95 },
  vie_spartiate: { sol: 0.82, echelle: 0.95 },
  vie_astronaute: { sol: 0.8, echelle: 0.95 },
  vie_futuriste: { sol: 0.8, echelle: 0.95 },
  vie_ninja_moderne: { sol: 0.8, echelle: 0.95 },
  vie_sauveteur: { sol: 0.8, echelle: 0.95 },
  vie_mecanicien: { sol: 0.8, echelle: 0.95 },
  vie_agriculteur: { sol: 0.8, echelle: 0.95 },
  vie_pilote: { sol: 0.8, echelle: 0.95 },
  vie_ski: { sol: 0.8, echelle: 0.95 },
  vie_golf: { sol: 0.8, echelle: 0.95 },
  vie_equitation: { sol: 0.8, echelle: 0.95 },
  vie_kayak: { sol: 0.8, echelle: 0.95 },
  vie_pirate: { sol: 0.8, echelle: 0.95 },
  vie_cowboy: { sol: 0.8, echelle: 0.95 },
  vie_explorateur: { sol: 0.8, echelle: 0.95 },
};

/** Marge transparente sous les pieds des personnages Vie reelle (fraction de la hauteur, mesure PIL, seuil alpha 40) */
export const MARGE_PIEDS_VIE: Record<string, number> = {
  pompier: 0.043,
  militaire: 0.043,
  soignant: 0.043,
  policier: 0.043,
  cuisinier: 0.043,
  batiment: 0.043,
  motard: 0.043,
  surf: 0.043,
  skate: 0.043,
  basket: 0.043,
  foot: 0.043,
  rugby: 0.043,
  velo: 0.043,
  montagne: 0.043,
  natation: 0.043,
  danse: 0.043,
  escalade: 0.043,
  tennis: 0.044,
  halterophilie: 0.043,
  street: 0.043,
  chevalier: 0.043,
  viking: 0.043,
  gladiateur: 0.043,
  spartiate: 0.043,
  astronaute: 0.043,
  futuriste: 0.043,
  ninja_moderne: 0.043,
  sauveteur: 0.043,
  mecanicien: 0.044,
  agriculteur: 0.043,
  pilote: 0.043,
  ski: 0.043,
  golf: 0.043,
  equitation: 0.043,
  kayak: 0.043,
  pirate: 0.043,
  cowboy: 0.043,
  explorateur: 0.043,
};

/**
 * Voile de lisibilite du salut (meme methode que lib/v2/espace/lisibilite.ts : geometrie de l'accueil a 390, 375 et 430 points
 * et de l'apercu Ta scene, 92e centile, cible 4,7 pour 1). Script : scratchpad packs/lis.py. Contraste le plus faible : 4,95 pour 1.
 */
export const LISIBILITE_VIE: Record<string, { lum: number; voile: number }> = {
  vie_pompier: { lum: 0.172, voile: 0.4 },
  vie_militaire: { lum: 0.209, voile: 0.37 },
  vie_soignant: { lum: 0.57, voile: 0.64 },
  vie_policier: { lum: 0.279, voile: 0.45 },
  vie_cuisinier: { lum: 0.215, voile: 0.38 },
  vie_batiment: { lum: 0.185, voile: 0.42 },
  vie_motard: { lum: 0.198, voile: 0.4 },
  vie_surf: { lum: 0.617, voile: 0.56 },
  vie_skate: { lum: 0.388, voile: 0.6 },
  vie_basket: { lum: 0.219, voile: 0.38 },
  vie_foot: { lum: 0.31, voile: 0.41 },
  vie_rugby: { lum: 0.6, voile: 0.66 },
  vie_velo: { lum: 0.335, voile: 0.44 },
  vie_montagne: { lum: 0.4, voile: 0.47 },
  vie_natation: { lum: 0.488, voile: 0.55 },
  vie_danse: { lum: 0.345, voile: 0.53 },
  vie_escalade: { lum: 0.355, voile: 0.52 },
  vie_tennis: { lum: 0.392, voile: 0.43 },
  vie_halterophilie: { lum: 0.27, voile: 0.49 },
  vie_street: { lum: 0.443, voile: 0.49 },
  vie_chevalier: { lum: 0.267, voile: 0.48 },
  vie_viking: { lum: 0.381, voile: 0.47 },
  vie_gladiateur: { lum: 0.379, voile: 0.51 },
  vie_spartiate: { lum: 0.346, voile: 0.49 },
  vie_astronaute: { lum: 0.525, voile: 0.53 },
  vie_futuriste: { lum: 0.262, voile: 0.39 },
  vie_ninja_moderne: { lum: 0.117, voile: 0.25 },
  vie_sauveteur: { lum: 0.439, voile: 0.53 },
  vie_mecanicien: { lum: 0.276, voile: 0.51 },
  vie_agriculteur: { lum: 0.333, voile: 0.56 },
  vie_pilote: { lum: 0.592, voile: 0.65 },
  vie_ski: { lum: 0.589, voile: 0.68 },
  vie_golf: { lum: 0.529, voile: 0.57 },
  vie_equitation: { lum: 0.345, voile: 0.54 },
  vie_kayak: { lum: 0.532, voile: 0.54 },
  vie_pirate: { lum: 0.21, voile: 0.44 },
  vie_cowboy: { lum: 0.397, voile: 0.64 },
  vie_explorateur: { lum: 0.262, voile: 0.43 },
};

/** Vrai si la scene est celle d'un pack Vie reelle */
export function estSceneVie(id: string | null | undefined): boolean {
  return !!id && (VIE_SCENE_IDS as readonly string[]).includes(id);
}
