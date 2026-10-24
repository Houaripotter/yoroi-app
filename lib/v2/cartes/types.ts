/**
 * Cartes a partager (nuit du 14 octobre 2026) : les types communs.
 * Trois moments : une seance enregistree, une pesee qui montre un progres, le bilan de la semaine.
 * Tout vient des vraies donnees : un champ absent (null ou 0) fait disparaitre son bloc.
 */

export type Moment = 'seance' | 'pesee' | 'semaine' | 'exploit' | 'avant_apres';

/** Famille de sport, pour choisir les chiffres par defaut */
export type Famille = 'muscu' | 'combat' | 'course' | 'collectif' | 'autre';

export type StatKey =
  | 'duree'
  | 'rounds'
  | 'series'
  | 'charge'
  | 'distance'
  | 'allure'
  | 'fc_moy'
  | 'fc_max'
  | 'calories'
  | 'zones'
  | 'poids'
  | 'ecart'
  | 'reste'
  | 'objectif_pct'
  | 'seances'
  | 'temps_total'
  | 'poids_semaine'
  | 'serie_semaines'
  | 'exploit';

export type StatValue = {
  key: StatKey;
  /** petit libelle, en minuscules sauf la premiere lettre */
  label: string;
  value: string;
  unit?: string;
  /** zones cardiaques : secondes passees dans chaque zone (5 zones) */
  zones?: number[];
};

export type RecordCarte = {
  nom: string;
  texte: string;
  /** charge du record et repetitions (17 octobre 2026, modele Record), absentes sur les anciennes donnees */
  poids?: number;
  reps?: number;
  /** ancien record sur cet exercice, s'il est connu */
  avant?: number;
};

export type DonneesSeance = {
  dureeMin: number;
  rounds: number;
  series: number;
  /** kilos soulevés au total */
  tonnage: number;
  distanceKm: number;
  fcMoy: number;
  fcMax: number;
  calories: number;
  /** secondes par zone, 5 valeurs, ou absent */
  zones?: number[] | null;
  records: RecordCarte[];
};

export type RaisonPesee = {
  type: 'objectif' | 'palier' | 'plus_bas' | 'plus_haut' | 'progres';
  /** phrase courte ecrite sur la carte */
  texte: string;
};

export type DonneesPesee = {
  poids: number;
  precedent: number | null;
  depart: number | null;
  objectif: number | null;
  raison?: RaisonPesee | null;
};

export type DonneesSemaine = {
  /** lundi de la semaine, AAAA-MM-JJ */
  debut: string;
  /** lundi a dimanche : vrai si au moins une seance ce jour-la */
  jours: boolean[];
  seances: number;
  minutes: number;
  sports: { nom: string; n: number }[];
  /** derniere pesee de la semaine, et ecart avec la derniere pesee d'avant la semaine */
  poidsFin: number | null;
  poidsEcart: number | null;
  /** objectif de seances choisi, 0 s'il n'est pas choisi */
  objectif: number;
  /** lundi a dimanche (17 octobre 2026, modele Semaine) : les sports faits ce jour-la et le club de la premiere seance avec club */
  parJour?: { sports: string[]; club?: { nom: string; logo?: string | null } | null }[];
};

/** Une photo de corps pour la carte Avant apres (17 octobre 2026) */
export type PhotoCarte = {
  id: string;
  uri: string;
  /** AAAA-MM-JJ de la photo */
  date: string;
  /** pesee la plus proche de la date, a 3 jours pres, sinon null */
  poids: number | null;
};

export type DonneesAvantApres = {
  avant: PhotoCarte;
  apres: PhotoCarte;
  /** jours entre les deux photos */
  jours: number;
};

export type CarteData = {
  moment: Moment;
  /** ex. « Musculation », « Pesée », « Ma semaine » */
  titre: string;
  /** ex. « Mardi 14 octobre » */
  sousTitre: string;
  sport?: string | null;
  famille?: Famille;
  /** club de la seance (17 octobre 2026) : nom et logo (identifiant connu ou uri), absent sans club */
  club?: { nom: string; logo?: string | null } | null;
  seance?: DonneesSeance;
  pesee?: DonneesPesee;
  semaine?: DonneesSemaine;
  /** carte Avant apres : tes deux photos de corps (17 octobre 2026) */
  avantApres?: DonneesAvantApres;
  /** semaines d'affilee avec l'objectif tenu (moteur de l'armure) */
  serieSemaines?: number;
  /** exploit (record, palier, compteur, objectif de l'annee, bilan...) : voir lib/v2/cartes/exploits.ts */
  exploit?: Exploit;
  /** d'ou vient l'exploit, pour le retrouver dans l'atelier : seance (id), pesee (date), mois (AAAA-MM), annee (AAAA) */
  source?: { type: 'seance' | 'pesee' | 'mois' | 'annee' | 'bilan'; ref: string };
  /** cle du moment (une seule proposition automatique par moment) */
  cle: string;
};

// ============================================
// EXPLOITS (cartes 2, 14 octobre 2026)
// ============================================

export type TypeExploit =
  | 'record_charge'
  | 'record_distance'
  | 'record_allure'
  | 'record_rounds'
  | 'techniques'
  | 'compteur'
  | 'palier_total'
  | 'palier_mois'
  | 'semaine_objectif'
  | 'serie_semaines'
  | 'annee_progression'
  | 'annee_palier'
  | 'annee_atteinte'
  | 'cumul_heures'
  | 'cumul_km'
  | 'cumul_tonnage'
  | 'cumul_rounds'
  | 'bilan_mois'
  | 'bilan_annee'
  | 'poids_perdu'
  | 'plus_bas'
  | 'palier_poids'
  | 'objectif_poids'
  /** page de bilan (16 octobre 2026) : ce qui a bouge apres une mesure, le compteur apres une seance */
  | 'bilan_corps'
  | 'bilan_seance';

/** Un grand chiffre : valeur et unite separees (« 100 » « kg », « 4 » « e ») */
export type Grand = { value: string; unit?: string };

export type CoteExploit = { label: string; value: string; unit?: string; /** donne un poids absolu */ poids?: boolean };

export type Exploit = {
  type: TypeExploit;
  /** AAAA-MM-JJ du moment */
  date: string;
  /** petite ligne au-dessus du chiffre : « Nouveau record », « Objectif de la semaine » */
  surtitre: string;
  /** le chiffre heros */
  hero: Grand;
  /** l'accroche courte et fiere sous le chiffre */
  accroche: string;
  /** une ligne de precision (ancien record, rythme) */
  detail?: string;
  /** ancien record, dessine a cote du nouveau */
  avant?: Grand;
  /** progression (objectif de l'annee, de la semaine) ; attendu = repere du rythme a ce jour */
  barre?: { fait: number; total: number; attendu?: number; legende: string };
  /** techniques apprises */
  liste?: string[];
  /** deux ou trois petits chiffres en plus */
  cotes?: CoteExploit[];
  /** rouge : seulement les records */
  record?: boolean;
  /** carte de poids : versions sans poids absolu pour le masquage */
  masque?: {
    ecart?: { hero: Grand; accroche?: string; surtitre?: string } | null;
    pourcentage?: { hero: Grand; accroche?: string; surtitre?: string } | null;
  };
  /** le detail et l'ancien chiffre donnent un poids absolu : caches avec le masquage */
  detailPoids?: boolean;
  /** ordre dans la feuille quand plusieurs moments arrivent ensemble (plus petit = en premier) */
  priorite: number;
};

export type Masque = 'aucun' | 'ecart' | 'pourcentage';

export type ModeleId = 'affiche' | 'bandeau' | 'colonne' | 'ticket' | 'cadre' | 'geant' | 'anneau' | 'minimal' | 'record' | 'semaine';
export type FormatId = 'story' | 'post' | 'carre';
export type FondId =
  | 'scene'
  | 'photo'
  | 'plage'
  | 'ville'
  | 'buildings'
  | 'parc'
  | 'stade'
  | 'salle'
  | 'sable'
  | 'ocean'
  | 'ardoise'
  | 'brume'
  | 'noir'
  | 'uni'
  /** 24 octobre 2026 : une de tes scenes (voir lib/v2/cartes/scenesFond.ts) */
  | `scene:${string}`;

export type OptionsCarte = {
  modele: ModeleId;
  format: FormatId;
  fond: FondId;
  sombre: boolean;
  personnage: boolean;
  masque: Masque;
  /** chiffres choisis, dans l'ordre ; le premier est le chiffre vedette */
  chiffres: StatKey[];
  slogan: number;
  /** « Que mes données » : fond uni, sans personnage, sans decor, juste les chiffres */
  epure?: boolean;
  /**
   * 17 octobre 2026 : interrupteur « Mon personnage sur la carte » ou « Ma photo sur la carte ».
   * Vrai : aucune personne sur la carte (ni personnage, ni ta photo de fond), seulement les elements.
   */
  sansPersonne?: boolean;
  /** carte Avant apres : les deux photos floutees, comme dans ton coffre */
  flou?: boolean;
};
