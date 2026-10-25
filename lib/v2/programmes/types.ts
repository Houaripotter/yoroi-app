/**
 * Programmes d'entrainement (24 octobre 2026) : types communs.
 * Un programme est une suite de jours (Jour 1, Jour 2...) qui tourne en boucle.
 * Chaque jour liste des exercices de la bibliotheque YOROI (constants/exerciseLibrary.ts, nom exact)
 * avec un nombre de series, une fourchette de repetitions et un temps de repos.
 * Tout est local : rien ne sort du telephone.
 */

export type Niveau = 'debutant' | 'intermediaire' | 'confirme';
export type Objectif = 'muscle' | 'force' | 'forme' | 'combat' | 'course';
export type Materiel = 'salle' | 'maison' | 'halteres';

export type ExoProgramme = {
  /** nom exact dans constants/exerciseLibrary.ts */
  nom: string;
  /** groupe de la bibliotheque (PECTORAUX, DOS...) */
  muscle: string;
  series: number;
  repsMin: number;
  repsMax: number;
  /** repos entre deux series, en secondes */
  reposSec: number;
  /** consigne courte affichee pendant la seance */
  conseil?: string;
  /** l'exercice se fait au poids du corps : la progression passe par les repetitions */
  poidsDuCorps?: boolean;
  /** exercice tenu (suspension, marche du fermier) : repsMin et repsMax sont des secondes */
  secondes?: boolean;
};

/** Seance en rounds (sac de frappe, shadow) : elle s'ouvre dans le chrono de rounds */
export type RoundsProgramme = {
  /** sport de lib/sports.ts (boxe, mma, muay_thai...) */
  sport: string;
  nombre: number;
  dureeSec: number;
  reposSec: number;
  /** une consigne par round, affichee pendant le round */
  consignes: string[];
};

/** Seance de cardio (course, velo, rameur...) : elle s'ouvre dans la saisie cardio */
export type CardioProgramme = {
  sport: string;
  minutes: number;
  /** deroulé de la seance, recopie dans les notes */
  consigne: string;
  /**
   * Plan qui avance de semaine en semaine (course a pied) : la semaine N du programme prend l'entree N,
   * la derniere sert ensuite. Sans ce tableau, minutes et consigne valent pour toutes les semaines.
   */
  semaines?: { minutes: number; consigne: string }[];
};

export type JourProgramme = {
  id: string;
  /** « Pectoraux », « Haut du corps A »... */
  titre: string;
  /** ids de lib/sports.ts MUSCLES (pectoraux, dos, epaules...) pour la carte des muscles */
  muscles: string[];
  /** exercices de musculation (vide pour une seance en rounds ou de cardio) */
  exos: ExoProgramme[];
  rounds?: RoundsProgramme;
  cardio?: CardioProgramme;
};

export type Programme = {
  id: string;
  titre: string;
  /** une phrase : pour qui, pourquoi */
  accroche: string;
  niveau: Niveau;
  objectif: Objectif;
  materiel: Materiel;
  /** sport de lib/sports.ts pour l'image et la seance (football, padel...), sinon deduit de l'objectif */
  /** ordre des exercices voulu (circuit, superset, pre fatigue) : ne pas regrouper par poste */
  ordreFixe?: boolean;
  sport?: string;
  joursParSemaine: number;
  /** duree indicative d'une seance, en minutes */
  dureeMin: number;
  /** duree conseillee du cycle avant de faire le point, en semaines */
  semaines: number;
  jours: JourProgramme[];
  /** comment le suivre, en phrases courtes */
  principes: string[];
  /** ids de lib/v2/programmes/sources.ts */
  sources: string[];
};

export type Source = {
  id: string;
  auteurs: string;
  annee: number;
  titre: string;
  revue: string;
  /** DOI ou page officielle */
  lien: string;
  /** ce que l'etude apporte au programme, en une phrase */
  apport: string;
};
