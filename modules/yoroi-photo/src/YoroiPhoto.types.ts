/**
 * Module photo YOROI (phase native) : ce que le code natif renvoie a JavaScript.
 * Meme forme sur iPhone, iPad, Mac (Apple Vision) et Android (Google ML Kit, modeles dans l'app).
 * Toutes les boites sont en part de la photo redressee, de 0 a 1, origine en haut a gauche.
 */

export type PlateformePhoto = 'ios' | 'ipados' | 'macos' | 'android';

/** Un point de repere du visage (ML Kit seulement : yeux, nez, bouche), en part de la photo */
export type RepereVisage = { x: number; y: number };

export type VisageNatif = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Vision : 0 a 1. ML Kit ne donne pas de score : null */
  confiance: number | null;
  /** ML Kit : oeilGauche, oeilDroit, nez, boucheGauche, boucheDroite, boucheBas */
  reperes?: Record<string, RepereVisage>;
  /** rotation de la tete vers la gauche ou la droite, en degres (0 = de face), si le moteur la donne */
  lacet?: number;
  /** inclinaison de la tete, en degres, si le moteur la donne */
  roulis?: number;
};

export type MasqueNatif = {
  /** PNG en niveaux de gris (255 = personne), dans cacheDirectory/cartes_tmp/masques/. Vide si l'ecriture a echoue */
  uri: string;
  largeur: number;
  hauteur: number;
  /** Vision : nombre de personnes detourees (4 au plus). ML Kit ne compte pas : null */
  personnes: number | null;
  /** le masque lui-meme, 1 octet par pixel, ligne par ligne, en base64 : pour le critere A+ en JavaScript */
  pixels: string;
};

export type ReponseNative = {
  visages: VisageNatif[];
  masque?: MasqueNatif | null;
  /** luminance moyenne du bas de la photo (40 % du bas), de 0 a 1 */
  lumiere: number | null;
  plateforme: PlateformePhoto | null;
  /** 'apple-vision' ou 'google-mlkit', vide sans module */
  moteur: string;
  /** versions figees des requetes ou des modeles */
  versionModele: string;
  /** taille de la copie analysee (1024 px au plus sur le grand cote) */
  largeur: number;
  hauteur: number;
  /** taille de la photo d'origine, une fois redressee */
  largeurPhoto: number;
  hauteurPhoto: number;
  /** faux avant iOS 17 et macOS 14 : visages seuls */
  detourageDisponible: boolean;
  /** ce qui a echoue, sans jamais planter : 'lecture', 'visages: ...', 'detourage: ...' */
  erreurs: string[];
  dureeMs?: number;
};

export type CapacitesPhoto = {
  visages: boolean;
  detourage: boolean;
  plateforme: PlateformePhoto | null;
  moteur: string;
  versionModele: string;
};
