/**
 * Les packs « Vie réelle » (16 octobre 2026, agent PACKS) : FICHIER GENERE par scratchpad packs/gen.py, ne pas modifier a la main.
 * Houari : « des packs diversifies, de tout, qui ressemblent a des choses de la vie reelle », aussi pour ceux qui
 * n'aiment pas le style japonais. Chaque pack : un personnage homme et un personnage femme dans une tenue, et une scene
 * assortie quand elle existe. Tout est original : aucun personnage protege, aucune marque, aucun logo, aucun texte.
 * Images : Gemini (Nano Banana, mode Pro), meme style et memes proportions que le Sportif et la Sportive (reference jointe),
 * fond vert detoure, figure de y = 49 a y = 766 dans 600 x 800 (marge sous les pieds 4,3 %, comme le pack Classique).
 * images null : pack prevu, pas encore dessine (montre dans « Collection complete, bientot disponible »).
 * Acces : la regle des personnages et scenes Premium (isPackUnlocked), aucun achat, aucun produit.
 */
import type { ImageSourcePropType } from 'react-native';

export type CategorieVie = 'metiers' | 'sports' | 'epoques';

export const CATEGORIES_VIE: { id: CategorieVie; nom: string }[] = [
  { id: 'metiers', nom: 'Métiers' },
  { id: 'sports', nom: 'Sports et passions' },
  { id: 'epoques', nom: 'Héros d’hier et de demain' },
];

export type PackVie = {
  id: string;
  categorie: CategorieVie;
  /** nom du pack */
  nom: string;
  /** nom du personnage selon le genre */
  noms: { h: string; f: string };
  phrase: string;
  /** fond pastel de la carte */
  fond: string;
  /** scene assortie deja dessinee (id de lib/v2/espace/packsScenes.ts) */
  scene: string | null;
  /** nom de la scene prevue, meme pas encore dessinee */
  scenePrevue: string | null;
  images: { h: ImageSourcePropType; f: ImageSourcePropType } | null;
};

export const PACKS_VIE: PackVie[] = [
  { id: 'pompier', categorie: 'metiers', nom: 'Pompiers', noms: { h: 'Pompier', f: 'Pompière' }, phrase: 'La tenue de feu, le casque et les gants', fond: '#F6E3DF', scene: 'vie_pompier', scenePrevue: 'Caserne', images: { h: require('@/assets/avatars/app/packs_vie/pompier_h.webp'), f: require('@/assets/avatars/app/packs_vie/pompier_f.webp') } },
  { id: 'militaire', categorie: 'metiers', nom: 'Militaires', noms: { h: 'Militaire', f: 'Militaire' }, phrase: 'La tenue de terrain, le casque et le gilet', fond: '#E4EADB', scene: 'vie_militaire', scenePrevue: 'Camp d’entraînement', images: { h: require('@/assets/avatars/app/packs_vie/militaire_h.webp'), f: require('@/assets/avatars/app/packs_vie/militaire_f.webp') } },
  { id: 'soignant', categorie: 'metiers', nom: 'Soignants', noms: { h: 'Soignant', f: 'Soignante' }, phrase: 'La tenue bleue et le stéthoscope', fond: '#E3E9F3', scene: 'vie_soignant', scenePrevue: 'Urgences', images: { h: require('@/assets/avatars/app/packs_vie/soignant_h.webp'), f: require('@/assets/avatars/app/packs_vie/soignant_f.webp') } },
  { id: 'policier', categorie: 'metiers', nom: 'Policiers', noms: { h: 'Policier', f: 'Policière' }, phrase: 'La tenue de patrouille bleu nuit', fond: '#E3E9F3', scene: 'vie_policier', scenePrevue: 'Rue du commissariat', images: { h: require('@/assets/avatars/app/packs_vie/policier_h.webp'), f: require('@/assets/avatars/app/packs_vie/policier_f.webp') } },
  { id: 'cuisinier', categorie: 'metiers', nom: 'Cuisine', noms: { h: 'Chef cuisinier', f: 'Cheffe cuisinière' }, phrase: 'La veste blanche, le tablier et la toque', fond: '#F6EDDC', scene: 'vie_cuisinier', scenePrevue: 'Cuisine du restaurant', images: { h: require('@/assets/avatars/app/packs_vie/cuisinier_h.webp'), f: require('@/assets/avatars/app/packs_vie/cuisinier_f.webp') } },
  { id: 'batiment', categorie: 'metiers', nom: 'Bâtiment', noms: { h: 'Ouvrier du bâtiment', f: 'Ouvrière du bâtiment' }, phrase: 'Le gilet orange, le casque et les gants', fond: '#FBEDE3', scene: 'vie_batiment', scenePrevue: 'Chantier', images: { h: require('@/assets/avatars/app/packs_vie/batiment_h.webp'), f: require('@/assets/avatars/app/packs_vie/batiment_f.webp') } },
  { id: 'motard', categorie: 'sports', nom: 'Motards', noms: { h: 'Motard', f: 'Motarde' }, phrase: 'Le blouson de cuir et le casque sous le bras', fond: '#ECEAEE', scene: 'vie_motard', scenePrevue: 'Route de montagne', images: { h: require('@/assets/avatars/app/packs_vie/motard_h.webp'), f: require('@/assets/avatars/app/packs_vie/motard_f.webp') } },
  { id: 'surf', categorie: 'sports', nom: 'Surf', noms: { h: 'Surfeur', f: 'Surfeuse' }, phrase: 'La combinaison et la planche', fond: '#E3EEF3', scene: 'vie_surf', scenePrevue: 'Spot de surf', images: { h: require('@/assets/avatars/app/packs_vie/surf_h.webp'), f: require('@/assets/avatars/app/packs_vie/surf_f.webp') } },
  { id: 'skate', categorie: 'sports', nom: 'Skate', noms: { h: 'Skateur', f: 'Skateuse' }, phrase: 'Le sweat, les baskets et la planche', fond: '#F3EBDA', scene: 'vie_skate', scenePrevue: 'Skatepark', images: { h: require('@/assets/avatars/app/packs_vie/skate_h.webp'), f: require('@/assets/avatars/app/packs_vie/skate_f.webp') } },
  { id: 'basket', categorie: 'sports', nom: 'Basket', noms: { h: 'Basketteur', f: 'Basketteuse' }, phrase: 'Le maillot sans numéro et le ballon', fond: '#E3E9F3', scene: 'vie_basket', scenePrevue: 'Playground', images: { h: require('@/assets/avatars/app/packs_vie/basket_h.webp'), f: require('@/assets/avatars/app/packs_vie/basket_f.webp') } },
  { id: 'foot', categorie: 'sports', nom: 'Football', noms: { h: 'Footballeur', f: 'Footballeuse' }, phrase: 'Le maillot vert et blanc et les crampons', fond: '#E4EADB', scene: 'vie_foot', scenePrevue: 'Stade', images: { h: require('@/assets/avatars/app/packs_vie/foot_h.webp'), f: require('@/assets/avatars/app/packs_vie/foot_f.webp') } },
  { id: 'rugby', categorie: 'sports', nom: 'Rugby', noms: { h: 'Rugbyman', f: 'Joueuse de rugby' }, phrase: 'Le maillot rayé et le ballon ovale', fond: '#F6E3DF', scene: 'vie_rugby', scenePrevue: 'Terrain de rugby', images: { h: require('@/assets/avatars/app/packs_vie/rugby_h.webp'), f: require('@/assets/avatars/app/packs_vie/rugby_f.webp') } },
  { id: 'velo', categorie: 'sports', nom: 'Cyclisme', noms: { h: 'Cycliste', f: 'Cycliste' }, phrase: 'Le maillot, le cuissard et le casque', fond: '#FBE7EA', scene: 'vie_velo', scenePrevue: 'Col de montagne', images: { h: require('@/assets/avatars/app/packs_vie/velo_h.webp'), f: require('@/assets/avatars/app/packs_vie/velo_f.webp') } },
  { id: 'montagne', categorie: 'sports', nom: 'Randonnée et montagne', noms: { h: 'Randonneur', f: 'Randonneuse' }, phrase: 'Le sac, les bâtons et les chaussures de marche', fond: '#E4EADB', scene: 'vie_montagne', scenePrevue: 'Sentier alpin', images: { h: require('@/assets/avatars/app/packs_vie/montagne_h.webp'), f: require('@/assets/avatars/app/packs_vie/montagne_f.webp') } },
  { id: 'natation', categorie: 'sports', nom: 'Natation', noms: { h: 'Nageur', f: 'Nageuse' }, phrase: 'Le bonnet, les lunettes et la serviette', fond: '#E3EEF3', scene: 'vie_natation', scenePrevue: 'Piscine olympique', images: { h: require('@/assets/avatars/app/packs_vie/natation_h.webp'), f: require('@/assets/avatars/app/packs_vie/natation_f.webp') } },
  { id: 'danse', categorie: 'sports', nom: 'Danse', noms: { h: 'Danseur', f: 'Danseuse' }, phrase: 'La tenue ample et les baskets', fond: '#FBE7EA', scene: 'vie_danse', scenePrevue: 'Studio de danse', images: { h: require('@/assets/avatars/app/packs_vie/danse_h.webp'), f: require('@/assets/avatars/app/packs_vie/danse_f.webp') } },
  { id: 'escalade', categorie: 'sports', nom: 'Escalade', noms: { h: 'Grimpeur', f: 'Grimpeuse' }, phrase: 'Le baudrier, la magnésie et la corde', fond: '#F3EBDA', scene: 'vie_escalade', scenePrevue: 'Salle d’escalade', images: { h: require('@/assets/avatars/app/packs_vie/escalade_h.webp'), f: require('@/assets/avatars/app/packs_vie/escalade_f.webp') } },
  { id: 'tennis', categorie: 'sports', nom: 'Tennis', noms: { h: 'Joueur de tennis', f: 'Joueuse de tennis' }, phrase: 'La tenue blanche et la raquette', fond: '#F6EDDC', scene: 'vie_tennis', scenePrevue: 'Court en terre battue', images: { h: require('@/assets/avatars/app/packs_vie/tennis_h.webp'), f: require('@/assets/avatars/app/packs_vie/tennis_f.webp') } },
  { id: 'halterophilie', categorie: 'sports', nom: 'Haltérophilie', noms: { h: 'Haltérophile', f: 'Haltérophile' }, phrase: 'Le justaucorps, la ceinture et les chaussures de levée', fond: '#ECEAEE', scene: 'vie_halterophilie', scenePrevue: 'Salle d’haltérophilie', images: { h: require('@/assets/avatars/app/packs_vie/halterophilie_h.webp'), f: require('@/assets/avatars/app/packs_vie/halterophilie_f.webp') } },
  { id: 'street', categorie: 'sports', nom: 'Street workout', noms: { h: 'Athlète de street workout', f: 'Athlète de street workout' }, phrase: 'Les barres en plein air, tout au poids du corps', fond: '#ECEAEE', scene: 'vie_street', scenePrevue: 'Parc de street workout', images: { h: require('@/assets/avatars/app/packs_vie/street_h.webp'), f: require('@/assets/avatars/app/packs_vie/street_f.webp') } },
  { id: 'chevalier', categorie: 'epoques', nom: 'Chevaliers', noms: { h: 'Chevalier', f: 'Chevalière' }, phrase: 'L’armure d’acier et le tabard bleu', fond: '#E3E9F3', scene: 'vie_chevalier', scenePrevue: 'Cour du château', images: { h: require('@/assets/avatars/app/packs_vie/chevalier_h.webp'), f: require('@/assets/avatars/app/packs_vie/chevalier_f.webp') } },
  { id: 'viking', categorie: 'epoques', nom: 'Vikings', noms: { h: 'Viking', f: 'Viking' }, phrase: 'La cape de fourrure et le bouclier rond', fond: '#E4EADB', scene: 'vie_viking', scenePrevue: 'Fjord', images: { h: require('@/assets/avatars/app/packs_vie/viking_h.webp'), f: require('@/assets/avatars/app/packs_vie/viking_f.webp') } },
  { id: 'gladiateur', categorie: 'epoques', nom: 'Gladiateurs', noms: { h: 'Gladiateur', f: 'Gladiatrice' }, phrase: 'Le bronze, le cuir et le bouclier rouge', fond: '#F6EDDC', scene: 'vie_gladiateur', scenePrevue: 'Arène', images: { h: require('@/assets/avatars/app/packs_vie/gladiateur_h.webp'), f: require('@/assets/avatars/app/packs_vie/gladiateur_f.webp') } },
  { id: 'spartiate', categorie: 'epoques', nom: 'Spartiates', noms: { h: 'Spartiate', f: 'Spartiate' }, phrase: 'Le casque à crête et la cape rouge', fond: '#F6E3DF', scene: 'vie_spartiate', scenePrevue: 'Temple grec', images: { h: require('@/assets/avatars/app/packs_vie/spartiate_h.webp'), f: require('@/assets/avatars/app/packs_vie/spartiate_f.webp') } },
  { id: 'astronaute', categorie: 'epoques', nom: 'Astronautes', noms: { h: 'Astronaute', f: 'Astronaute' }, phrase: 'La combinaison blanche et le casque sous le bras', fond: '#E3EEF3', scene: 'vie_astronaute', scenePrevue: 'Station spatiale', images: { h: require('@/assets/avatars/app/packs_vie/astronaute_h.webp'), f: require('@/assets/avatars/app/packs_vie/astronaute_f.webp') } },
  { id: 'futuriste', categorie: 'epoques', nom: 'Futur', noms: { h: 'Héros du futur', f: 'Héroïne du futur' }, phrase: 'L’armure graphite et ses lignes de lumière', fond: '#ECEAEE', scene: 'vie_futuriste', scenePrevue: 'Ville du futur', images: { h: require('@/assets/avatars/app/packs_vie/futuriste_h.webp'), f: require('@/assets/avatars/app/packs_vie/futuriste_f.webp') } },
  { id: 'ninja_moderne', categorie: 'epoques', nom: 'Ninjas urbains', noms: { h: 'Ninja urbain', f: 'Ninja urbaine' }, phrase: 'La capuche noire et le masque, sans arme', fond: '#ECEAEE', scene: 'vie_ninja_moderne', scenePrevue: 'Toits la nuit', images: { h: require('@/assets/avatars/app/packs_vie/ninja_moderne_h.webp'), f: require('@/assets/avatars/app/packs_vie/ninja_moderne_f.webp') } },
  { id: 'sauveteur', categorie: 'metiers', nom: 'Sauveteurs en mer', noms: { h: 'Sauveteur en mer', f: 'Sauveteuse en mer' }, phrase: 'Le haut rouge, la bouée et le sifflet', fond: '#F6E3DF', scene: 'vie_sauveteur', scenePrevue: 'Poste de secours', images: { h: require('@/assets/avatars/app/packs_vie/sauveteur_h.webp'), f: require('@/assets/avatars/app/packs_vie/sauveteur_f.webp') } },
  { id: 'mecanicien', categorie: 'metiers', nom: 'Garage', noms: { h: 'Mécanicien', f: 'Mécanicienne' }, phrase: 'La combinaison de travail et la clé', fond: '#E3E9F3', scene: 'vie_mecanicien', scenePrevue: 'Atelier mécanique', images: { h: require('@/assets/avatars/app/packs_vie/mecanicien_h.webp'), f: require('@/assets/avatars/app/packs_vie/mecanicien_f.webp') } },
  { id: 'agriculteur', categorie: 'metiers', nom: 'Ferme', noms: { h: 'Agriculteur', f: 'Agricultrice' }, phrase: 'La salopette, les bottes et le chapeau de paille', fond: '#E4EADB', scene: 'vie_agriculteur', scenePrevue: 'Ferme', images: { h: require('@/assets/avatars/app/packs_vie/agriculteur_h.webp'), f: require('@/assets/avatars/app/packs_vie/agriculteur_f.webp') } },
  { id: 'pilote', categorie: 'metiers', nom: 'Aviation', noms: { h: 'Pilote de ligne', f: 'Pilote de ligne' }, phrase: 'La veste à galons et la casquette, sans insigne', fond: '#E3EEF3', scene: 'vie_pilote', scenePrevue: 'Piste d’aéroport', images: { h: require('@/assets/avatars/app/packs_vie/pilote_h.webp'), f: require('@/assets/avatars/app/packs_vie/pilote_f.webp') } },
  { id: 'ski', categorie: 'sports', nom: 'Ski', noms: { h: 'Skieur', f: 'Skieuse' }, phrase: 'La veste de ski, le casque et le masque', fond: '#E3EEF3', scene: 'vie_ski', scenePrevue: 'Piste enneigée', images: { h: require('@/assets/avatars/app/packs_vie/ski_h.webp'), f: require('@/assets/avatars/app/packs_vie/ski_f.webp') } },
  { id: 'golf', categorie: 'sports', nom: 'Golf', noms: { h: 'Golfeur', f: 'Golfeuse' }, phrase: 'Le polo, la casquette et le club', fond: '#E4EADB', scene: 'vie_golf', scenePrevue: 'Parcours de golf', images: { h: require('@/assets/avatars/app/packs_vie/golf_h.webp'), f: require('@/assets/avatars/app/packs_vie/golf_f.webp') } },
  { id: 'equitation', categorie: 'sports', nom: 'Équitation', noms: { h: 'Cavalier', f: 'Cavalière' }, phrase: 'La bombe, la veste et les bottes', fond: '#F3EBDA', scene: 'vie_equitation', scenePrevue: 'Écurie', images: { h: require('@/assets/avatars/app/packs_vie/equitation_h.webp'), f: require('@/assets/avatars/app/packs_vie/equitation_f.webp') } },
  { id: 'kayak', categorie: 'sports', nom: 'Kayak', noms: { h: 'Kayakiste', f: 'Kayakiste' }, phrase: 'Le gilet, le casque et la pagaie', fond: '#E3EEF3', scene: 'vie_kayak', scenePrevue: 'Rivière', images: { h: require('@/assets/avatars/app/packs_vie/kayak_h.webp'), f: require('@/assets/avatars/app/packs_vie/kayak_f.webp') } },
  { id: 'pirate', categorie: 'epoques', nom: 'Pirates', noms: { h: 'Pirate', f: 'Pirate' }, phrase: 'Le tricorne, la chemise et les bottes', fond: '#F6EDDC', scene: 'vie_pirate', scenePrevue: 'Navire pirate', images: { h: require('@/assets/avatars/app/packs_vie/pirate_h.webp'), f: require('@/assets/avatars/app/packs_vie/pirate_f.webp') } },
  { id: 'cowboy', categorie: 'epoques', nom: 'Far West', noms: { h: 'Cowboy', f: 'Cowgirl' }, phrase: 'Le chapeau, le gilet de cuir et les bottes', fond: '#FBEDE3', scene: 'vie_cowboy', scenePrevue: 'Ranch', images: { h: require('@/assets/avatars/app/packs_vie/cowboy_h.webp'), f: require('@/assets/avatars/app/packs_vie/cowboy_f.webp') } },
  { id: 'explorateur', categorie: 'epoques', nom: 'Grand Nord', noms: { h: 'Explorateur polaire', f: 'Exploratrice polaire' }, phrase: 'La parka, les lunettes et les raquettes', fond: '#E3EEF3', scene: 'vie_explorateur', scenePrevue: 'Banquise', images: { h: require('@/assets/avatars/app/packs_vie/explorateur_h.webp'), f: require('@/assets/avatars/app/packs_vie/explorateur_f.webp') } },
];

/** Packs complets (homme et femme dessines) */
export const PACKS_VIE_PRETS: PackVie[] = PACKS_VIE.filter((p) => p.images !== null);

/** Packs prevus, pas encore dessines */
export const PACKS_VIE_A_VENIR: PackVie[] = PACKS_VIE.filter((p) => p.images === null);

/** Texte du compteur de « Collection complete », d'apres le catalogue reel */
export function texteCompteurCollection(total: number = PACKS_VIE.length, prets: number = PACKS_VIE_PRETS.length): string {
  const reste = Math.max(0, total - prets);
  if (prets <= 0) return `${total} packs prévus, homme et femme.`;
  if (reste <= 0) return `${total} packs, homme et femme : tous déjà dans l’onglet Vie réelle.`;
  return `${total} packs prévus, homme et femme : ${prets} déjà dans l’onglet Vie réelle, ${reste} ${reste > 1 ? 'arrivent' : 'arrive'} bientôt.`;
}
