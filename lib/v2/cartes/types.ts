/**
 * Cartes a partager (nuit du 14 octobre 2026) : les types communs.
 * Trois moments : une seance enregistree, une pesee qui montre un progres, le bilan de la semaine.
 * Tout vient des vraies donnees : un champ absent (null ou 0) fait disparaitre son bloc.
 */
import type { CeintureId } from '@/lib/v2/profil/gammes';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import type { MuscleName } from '@/lib/v2/progres/strength';

/** 31 octobre 2026 (bibliotheque des cartes) : 'mois' et 'annee', ton mois et ton annee d'entrainement */
export type Moment = 'seance' | 'pesee' | 'semaine' | 'exploit' | 'avant_apres' | 'mois' | 'annee';

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
  /** 31 octobre 2026 : denivele positif (course), repetitions totales (muscu), intensite ressentie sur 10 */
  | 'denivele'
  | 'repetitions'
  | 'intensite'
  /** 31 octobre 2026 (bibliotheque) : jours avec au moins une seance, objectif de la periode, sport le plus pratique */
  | 'jours_actifs'
  | 'objectif_periode'
  | 'sport_top'
  /** 31 octobre 2026 (cartes ou l'on voit ta tete) : ta meilleure serie ou ton record (muscu), techniques et soumissions (combat) */
  | 'meilleur'
  | 'techniques'
  | 'soumissions'
  | 'exploit'
  /** 31 octobre 2026 : le cardio de fin de seance, pente moyenne et FC moyenne du cardio seul */
  | 'pente'
  | 'fc_cardio';

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
  /**
   * 31 octobre 2026 (cartes en 6 modeles) : les visuels du sport, lus dans la vraie seance, absents sinon.
   * trace : le parcours GPS, points ramenes entre 0 et 1 (x vers la droite, y vers le bas), ratio = largeur sur hauteur.
   */
  trace?: { points: [number, number][]; ratio: number } | null;
  /** temps de chaque kilometre, en secondes */
  splits?: { km: number; secondes: number }[] | null;
  /** denivele positif, en metres */
  deniveleM?: number;
  /** repetitions totales de la seance */
  repetitions?: number;
  /** meilleure serie de chaque exercice (charge la plus lourde), les plus lourdes d'abord */
  meilleures?: { nom: string; poids: number; reps: number }[] | null;
  /** tonnage de chaque serie de travail, dans l'ordre, pour les barres */
  barres?: number[] | null;
  /** frequence cardiaque au fil de la seance, en battements par minute, au plus 60 valeurs */
  courbeFc?: number[] | null;
  /** themes techniques saisis (sports de combat) */
  techniques?: string[] | null;
  /** intensite ressentie, de 1 a 10 */
  intensite?: number;
  /** 31 octobre 2026 : soumissions placees, lues dans les rounds saisis (absentes ou 0 sinon) */
  soumissions?: number;
  /** 31 octobre 2026 : cardio de fin de seance (exercice cardio de la musculation), pente moyenne et FC moyenne du cardio */
  penteCardio?: number;
  fcCardio?: number;
  /**
   * 2 novembre 2026 (donnees en plus, toutes facultatives, absentes si elles n'existent pas) :
   * vitesse moyenne du tapis du cardio de fin de seance (km/h), telle qu'enregistree
   */
  vitesseCardio?: number;
  /**
   * le cardio etait en zone 2 : seulement avec une FC moyenne mesuree (Sante) et une zone 2 connue
   * (gardee avec le cardio, sinon calculee par lib/v2/seances/zone2.ts). Vrai dedans, faux hors zone, absent sinon.
   */
  enZone2?: boolean;
  /**
   * muscles travailles : zones a allumer et series de travail par groupe (muscles principaux), comptees sur les series
   * validees de la seance (lib/v2/seances/musclesExercices.ts). Absent sans exercice reconnu.
   */
  muscles?: { zones: ZoneId[]; groupes: { nom: MuscleName; series: number }[] } | null;
};

/**
 * 31 octobre 2026 (cartes v2, Affiche de gala) : ta seance precedente du meme sport, lue dans ton historique.
 * Absente s'il n'y en a pas : la carte Gala ne montre alors que la seance du jour.
 */
export type SeancePrecedente = {
  /** AAAA-MM-JJ */
  date: string;
  seance: DonneesSeance;
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
  /** 2 novembre 2026 : kilos souleves de la semaine (charge x repetitions des series de travail), absent a 0 */
  kilos?: number;
};

/**
 * 31 octobre 2026 (bibliotheque des cartes) : ton mois ou ton annee, lus dans tes seances.
 * Rien n'est estime : un total a 0 fait disparaitre son chiffre.
 */
export type DonneesPeriode = {
  type: 'mois' | 'annee';
  /** AAAA-MM pour un mois, AAAA pour une annee */
  ref: string;
  /** premier et dernier jour comptes (AAAA-MM-JJ) ; le dernier est aujourd'hui si la periode est en cours */
  debut: string;
  fin: string;
  enCours: boolean;
  seances: number;
  minutes: number;
  joursActifs: number;
  /** seances par sport, les plus pratiques d'abord */
  sports: { nom: string; n: number }[];
  /** kilometres parcourus (hors sports de combat), kilos souleves, rounds */
  distanceKm: number;
  tonnage: number;
  rounds: number;
  /** seances par semaine visees, 0 sans objectif */
  parSemaine: number;
  /** mois : semaines (lundi dans le mois, finies ou deja tenues) a l'objectif, sur les semaines comptees */
  semainesTenues: number;
  semainesComptees: number;
  /** annee : seances faites sur les seances visees (rythme x semaines), null sans objectif */
  objectifAnnee?: { fait: number; total: number; attendu?: number } | null;
  /** seances de la periode d'avant (mois d'avant, annee d'avant) */
  precedent: number;
  /**
   * 2 novembre 2026 : annee seulement, records battus dans l'annee (charge, distance, allure, rounds), comptes
   * seance par seance avec la meme regle que les cartes de record (exploits.ts, recordsDe). Absent a 0.
   */
  records?: number;
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
  /** 31 octobre 2026 (bibliotheque) : ton mois ou ton annee */
  periode?: DonneesPeriode;
  /** semaines d'affilee avec l'objectif tenu (moteur de l'armure) */
  serieSemaines?: number;
  /** 31 octobre 2026 (cartes v2) : ta seance precedente du meme sport (Affiche de gala) */
  precedente?: SeancePrecedente | null;
  /**
   * 31 octobre 2026 (cartes v2, Serie en feu) : les 12 dernieres semaines, de la plus ancienne a celle de la carte,
   * lundi a dimanche, vrai si au moins une seance ce jour-la. Absent si l'historique n'a pas ete lu.
   */
  grille?: boolean[][] | null;
  /** 31 octobre 2026 (cartes v2, Carte holographique) : rang de cette seance dans l'annee (la 47e de 2026), 0 si inconnu */
  rangAnnee?: number;
  /** AAAA-MM-JJ de la seance, quand il est connu (date orange du Flash) */
  dateIso?: string;
  /** heure de la seance, « 18:40 », quand elle est connue (Diffusion TV) */
  heure?: string | null;
  /** exploit (record, palier, compteur, objectif de l'annee, bilan...) : voir lib/v2/cartes/exploits.ts */
  exploit?: Exploit;
  /** d'ou vient l'exploit, pour le retrouver dans l'atelier : seance (id), pesee (date), mois (AAAA-MM), annee (AAAA) */
  source?: { type: 'seance' | 'pesee' | 'mois' | 'annee' | 'bilan' | 'objectif' | 'compteur'; ref: string };
  /** 2 novembre 2026 : ta ceinture de JJB et ses degres, lus dans tes pratiques (lib/v2/profil/pratiques.ts), absents sans ceinture */
  ceintureJjb?: { ceinture: CeintureId; degres: number } | null;
  /**
   * 2 novembre 2026 : ta serie, lue dans l'armure (lib/v2/armure.ts) : jours d'affilee en cours, plus longue serie
   * de jours et plus longue serie de semaines a l'objectif. Chaque chiffre est absent s'il n'est pas connu.
   */
  serie?: { jours?: number; recordJours?: number; recordSemaines?: number } | null;
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
  | 'bilan_seance'
  /** bibliotheque (31 octobre 2026) : le chemin vers ton objectif de poids, et tes seances depuis le debut */
  | 'chemin_poids'
  | 'cumul_seances';

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

/**
 * 31 octobre 2026 : six modeles proposes, Affiche, Bandeau, Neon nuit, Ticket, Medaille, Tableau de score.
 * Les anciens ids restent dans le type pour les reglages deja memorises : ils retombent sur l'Affiche.
 */
/**
 * 31 octobre 2026 (cartes v2) : les 10 directions remplacent les 6 modeles. 01 net, 02 chrome, 03 stickers,
 * 04 holo, 05 retro, 06 flash, 07 maillot, 08 gala, 09 serie, 10 tv. Les anciens ids retombent sur une direction.
 */
export type DirectionId = 'net' | 'chrome' | 'stickers' | 'holo' | 'retro' | 'flash' | 'maillot' | 'gala' | 'serie' | 'tv';
export type ModeleId = DirectionId | 'affiche' | 'bandeau' | 'neon' | 'ticket' | 'medaille' | 'score' | 'colonne' | 'cadre' | 'geant' | 'anneau' | 'minimal' | 'record' | 'semaine';
/** 31 octobre 2026 : la palette des fonds unis, huit couleurs franches */
export type CouleurId = 'rouge' | 'bleu' | 'jaune' | 'vert' | 'orange' | 'violet' | 'rose' | 'noir';
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
  /** 31 octobre 2026 : fond de couleur unie, la couleur est dans OptionsCarte.couleur */
  | 'couleur'
  /** 24 octobre 2026 : une de tes scenes (voir lib/v2/cartes/scenesFond.ts) */
  | `scene:${string}`;

export type OptionsCarte = {
  modele: ModeleId;
  format: FormatId;
  fond: FondId;
  /** 31 octobre 2026 : la couleur du fond uni (et du bandeau, du neon) ; absente, le rouge */
  couleur?: CouleurId;
  /** 31 octobre 2026 : le papier du Ticket de caisse, Clair (blanc) ou Sombre (noir) ; absent, Clair */
  papier?: 'clair' | 'sombre';
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
  /**
   * 31 octobre 2026 (cartes v2) : sortie des autocollants (net, chrome, stickers). 'story' : pose sur ta photo
   * ou ta couleur ; 'autocollant' : PNG a fond transparent, a coller toi-meme sur ta story.
   */
  sortie?: 'story' | 'autocollant';
};
