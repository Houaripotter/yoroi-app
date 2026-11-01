/**
 * Muscles travailles, exercice par exercice (31 octobre 2026, Houari sur le detail d'une seance Lower avec des
 * mollets et un crunch : « les abdos ne sont pas allumes, corrige le partout dans l'app »).
 *
 * Une seule regle pour tous les ecrans : detail de seance, carte « Muscles travailles » de la semaine (onglet
 * Seances), Progres Force et le grand widget « Muscles de la semaine ». Jamais le type de seance (« Lower » n'est
 * pas « jambes ») : chaque exercice reellement fait compte avec ses series de travail.
 *  - muscles principaux et secondaires de la base (lib/v2/programmes/musclesExos.ts) : le principal compte ses
 *    series, le secondaire la moitie pour l'intensite, et il est dit « sollicite » s'il n'a pas de series a lui ;
 *  - sinon le groupe de l'exercice : la bibliotheque, tes machines (machinesPerso.ts), le groupe enregistre, puis
 *    l'exercice de la base dont le nom lui ressemble (musclePour, la meme recherche que Changer d'exercice) ;
 *  - sinon les mots du nom (crunch, presse...) ; rien de trouve : l'exercice ne compte pas.
 * Supersets et abdos de fin de seance sont des exercices comme les autres. Le cardio n'a pas de serie de travail
 * (workSetsOf) : il ne compte pas.
 * Code pur, teste dans __tests__/unit/musclesExercices.test.ts.
 */
import type { Training } from '@/lib/database';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { MUSCLES_EXOS } from '@/lib/v2/programmes/musclesExos';
import type { ZoneId } from '@/lib/v2/programmes/zones';
import { MUSCLE_ORDER, muscleOf } from '@/lib/v2/progres/strength';
import type { MuscleName } from '@/lib/v2/progres/strength';
import { plier } from '@/lib/v2/seance/rechercheExo';
import { exercisesOf, workSetsOf } from '@/lib/v2/trainingWeek';
import type { ExerciseLike } from '@/lib/v2/trainingWeek';
import { sansPrise } from '@/lib/v2/seance/prise';
import { cleDoublon, musclePour } from './changerExo';
import { machineDe, machinesEnMemoire } from './machinesPerso';
import type { MachinePerso } from './machinesPerso';
import type { MuscleId } from './muscles';

/** Un muscle precis : son groupe (liste et compteur), sa zone sur la carte rouge, son id des puces « Ajuster » */
export type MusclePrecis = { groupe: MuscleName; zone: ZoneId; id: MuscleId };

const P = (groupe: MuscleName, zone: ZoneId, id: MuscleId): MusclePrecis => ({ groupe, zone, id });
const PEC = P('Pectoraux', 'pectoraux', 'pectoraux');
const EP_AV = P('Épaules', 'epaules', 'deltoide_ant');
const EP_AR = P('Épaules', 'epaules', 'deltoide_post');
const TRAP = P('Dos', 'trapezes', 'trapeze');
const DORS = P('Dos', 'dos', 'dorsaux');
const LOMB = P('Dos', 'dos', 'lombaires');
const BIC = P('Bras', 'bras', 'biceps');
const TRI = P('Bras', 'bras', 'triceps');
const AVB = P('Bras', 'avantbras', 'avant_bras');
const ABDOS = P('Abdos', 'abdos', 'abdominaux');
const OBL = P('Abdos', 'abdos', 'obliques');
const QUAD = P('Jambes', 'quadriceps', 'quadriceps');
const FLECH = P('Jambes', 'quadriceps', 'flechisseurs');
const TIB = P('Jambes', 'mollets', 'tibialis');
const FESS = P('Jambes', 'fessiers', 'fessiers');
const ISCH = P('Jambes', 'ischios', 'ischio_jambiers');
const MOLL = P('Jambes', 'mollets', 'mollets');

/**
 * Tous les noms de muscles et de groupes rencontres dans l'app, plies (sans accents ni majuscules) : libelles de
 * musclesExos.ts, groupes de la bibliotheque (MOLLETS, AVANT-BRAS...), ids des puces (lib/v2/seances/muscles.ts)
 * et ids enregistres par la seance en direct (lib/sports.ts MUSCLES : dos, epaules, abdos, jambes...).
 */
const PAR_NOM: Record<string, MusclePrecis> = {
  pectoraux: PEC, 'haut des pectoraux': PEC, pecs: PEC, poitrine: PEC,
  epaules: EP_AV, 'epaules avant': EP_AV, 'epaules cote': EP_AV, deltoides: EP_AV, 'deltoide ant': EP_AV,
  'arriere d epaule': EP_AR, 'arriere d epaules': EP_AR, 'coiffe des rotateurs': EP_AR, 'deltoide post': EP_AR,
  trapezes: TRAP, trapeze: TRAP,
  dos: DORS, dorsaux: DORS, 'milieu du dos': DORS,
  lombaires: LOMB,
  biceps: BIC, bras: BIC, triceps: TRI,
  'avant bras': AVB, grip: AVB,
  abdos: ABDOS, abdominaux: ABDOS, gainage: ABDOS, core: ABDOS, obliques: OBL,
  jambes: QUAD, quadriceps: QUAD, adducteurs: QUAD, 'flechisseurs de hanche': FLECH, flechisseurs: FLECH,
  tibias: TIB, tibialis: TIB,
  fessiers: FESS, 'moyen fessier': FESS,
  ischios: ISCH, 'ischio jambiers': ISCH,
  mollets: MOLL,
  'chaine post': ISCH,
};

/** Le muscle d'un nom de muscle ou de groupe, sinon null (« Cou », « TECHNIQUE », « CARDIO ») */
export function musclePrecis(nom: string | null | undefined): MusclePrecis | null {
  return PAR_NOM[plier(nom ?? '')] ?? null;
}

/** Repli par groupe seul (muscleOf, les mots du nom) : la zone la plus representative du groupe */
const DU_GROUPE: Record<MuscleName, MusclePrecis> = {
  Pectoraux: PEC, Dos: DORS, 'Épaules': EP_AV, Bras: BIC, Jambes: QUAD, Abdos: ABDOS,
};

/** Toutes les zones d'un groupe, pour un sport sans series (combat, course) */
export const ZONES_GROUPE: Record<MuscleName, ZoneId[]> = {
  Pectoraux: ['pectoraux'],
  Dos: ['dos'],
  'Épaules': ['epaules'],
  Bras: ['bras', 'avantbras'],
  Jambes: ['quadriceps', 'ischios', 'fessiers', 'mollets'],
  Abdos: ['abdos'],
};

export type MusclesExercice = { principaux: MusclePrecis[]; secondaires: MusclePrecis[] };

let parCle: Map<string, { principaux: string[]; aussi: string[] }> | null = null;
function fiche(nom: string) {
  if (!parCle) {
    parCle = new Map();
    for (const [n, m] of Object.entries(MUSCLES_EXOS)) {
      const k = cleDoublon(n);
      if (!parCle.has(k)) parCle.set(k, m);
    }
  }
  return MUSCLES_EXOS[nom] ?? parCle.get(cleDoublon(nom));
}

const memo = new Map<string, MusclesExercice | null>();

/** Muscles d'un exercice ; null s'il est inconnu (il ne compte pas) */
export function musclesExercice(e: { name?: string; muscle_group?: string }, perso: readonly MachinePerso[] = machinesEnMemoire()): MusclesExercice | null {
  const nom = String(e.name ?? '').trim();
  const groupe = e.muscle_group ?? '';
  const k = `${nom}|${groupe}|${perso.map((m) => `${m.nom}:${m.muscle}`).join(';')}`;
  if (memo.has(k)) return memo.get(k)!;
  const r = calculer(nom, groupe, perso);
  if (memo.size > 2000) memo.clear();
  memo.set(k, r);
  return r;
}

/** L'entree de la bibliotheque (constants/exerciseLibrary.ts) au meme nom, accents, prises et « machine » ignores */
let parNomBiblio: Map<string, { category: string; muscle?: string }> | null = null;
function entreeBiblio(nom: string) {
  if (!parNomBiblio) {
    parNomBiblio = new Map();
    for (const e of EXERCISE_LIBRARY) {
      const k = cleDoublon(e.name);
      if (!parNomBiblio.has(k)) parNomBiblio.set(k, e);
    }
  }
  return nom ? parNomBiblio.get(cleDoublon(nom)) : undefined;
}

function calculer(nom: string, groupe: string, perso: readonly MachinePerso[]): MusclesExercice | null {
  if (!nom && !groupe) return null;
  // le cardio (tapis, velo, rameur...) ne compte jamais en series de muscles
  if (plier(groupe) === 'cardio') return null;
  const biblio = entreeBiblio(nom);
  if (biblio?.category === 'cardio') return null;
  // 1. la base des muscles par exercice : principaux et secondaires
  const f = nom ? fiche(nom) : undefined;
  if (f) {
    const principaux = uniques(f.principaux.map(musclePrecis));
    const secondaires = uniques(f.aussi.map(musclePrecis)).filter((s) => !principaux.some((p) => p.id === s.id));
    if (principaux.length) return { principaux, secondaires };
    if (secondaires.length) return { principaux: secondaires, secondaires: [] };
  }
  const seul = (m: MusclePrecis | null): MusclesExercice | null => (m ? { principaux: [m], secondaires: [] } : null);
  // 2. l'exercice est dans la bibliotheque : son groupe ; une technique de combat, une sortie velo... ne compte pas
  if (biblio) return seul(musclePrecis(biblio.muscle)) ?? (biblio.category === 'musculation' ? seul(musclePrecis(groupe)) : null);
  // 3. tes machines, puis le groupe enregistre avec l'exercice
  const machine = machineDe(perso, sansPrise(nom).base);
  const parGroupe = seul(musclePrecis(machine?.muscle)) ?? seul(musclePrecis(groupe));
  if (parGroupe) return parGroupe;
  // 4. les mots du nom (crunch, presse, curl...), puis l'exercice de la base au nom le plus proche (Changer d'exercice)
  const parMots = nom ? muscleOf({ name: nom }) : null;
  if (parMots) return seul(DU_GROUPE[parMots]);
  return nom ? seul(musclePrecis(musclePour(nom, { muscle: groupe || null, perso }))) : null;
}

function uniques(l: (MusclePrecis | null)[]): MusclePrecis[] {
  const out: MusclePrecis[] = [];
  for (const m of l) if (m && !out.some((x) => x.id === m.id)) out.push(m);
  return out;
}

export type MuscleLoad = {
  name: MuscleName;
  /** series de travail ou le groupe est un muscle principal */
  sets: number;
  /** sollicite sans series a lui : muscle secondaire, autre sport (combat, cardio) ou choisi avec « Ajuster » */
  engaged: boolean;
  /** 0 a 3, la couleur de la liste : principal plein, secondaire a moitie (10 series et plus : 3) */
  level: 0 | 1 | 2 | 3;
};

export type BilanMuscles = {
  /** les 6 groupes, dans l'ordre de l'app */
  loads: MuscleLoad[];
  /** zones allumees en rouge sur la carte : celles des muscles principaux (ou choisis) */
  zones: ZoneId[];
  /** ids des puces « Ajuster » venus des exercices */
  ids: MuscleId[];
  /** nombre de groupes sollicites (le compteur « N muscles sollicites ») */
  nombre: number;
  /** au moins un exercice compte */
  avecExercices: boolean;
};

export const niveauDe = (score: number, engage: boolean): 0 | 1 | 2 | 3 => (score >= 10 ? 3 : score >= 4 ? 2 : score > 0 || engage ? 1 : 0);

/** Le compteur commun : principal = ses series, secondaire = la moitie (pour l'intensite seulement) */
export class CompteurMuscles {
  private sets: Record<string, number> = {};
  private score: Record<string, number> = {};
  private engages = new Set<MuscleName>();
  private zonesOn = new Set<ZoneId>();
  private idsOn = new Set<MuscleId>();
  avecExercices = false;

  constructor(private perso: readonly MachinePerso[] = machinesEnMemoire()) {}

  /** Ajoute les exercices d'une seance ; renvoie vrai si au moins un a compte */
  exercices(exs: readonly ExerciseLike[]): boolean {
    let compte = false;
    for (const e of exs) {
      const n = workSetsOf(e).length;
      if (n === 0) continue;
      const m = musclesExercice(e, this.perso);
      if (!m) continue;
      compte = true;
      const groupesP = new Set(m.principaux.map((x) => x.groupe));
      for (const g of groupesP) {
        this.sets[g] = (this.sets[g] ?? 0) + n;
        this.score[g] = (this.score[g] ?? 0) + n;
      }
      for (const g of new Set(m.secondaires.map((x) => x.groupe))) {
        if (groupesP.has(g)) continue;
        this.score[g] = (this.score[g] ?? 0) + n / 2;
      }
      m.principaux.forEach((x) => { this.zonesOn.add(x.zone); this.idsOn.add(x.id); });
      m.secondaires.forEach((x) => this.idsOn.add(x.id));
    }
    if (compte) this.avecExercices = true;
    return compte;
  }

  /** Groupes sollicites sans series (autre sport) : sans series, leurs zones allumees comme avant */
  engager(groupes: readonly MuscleName[]) {
    groupes.forEach((g) => {
      this.engages.add(g);
      ZONES_GROUPE[g].forEach((z) => this.zonesOn.add(z));
    });
  }

  /** Muscles choisis a la main (puces « Ajuster ») : leur zone s'allume, sollicites sans series */
  choisir(muscles: readonly MusclePrecis[]) {
    for (const m of muscles) {
      this.engages.add(m.groupe);
      this.zonesOn.add(m.zone);
      this.idsOn.add(m.id);
    }
  }

  bilan(): BilanMuscles {
    const loads = MUSCLE_ORDER.map((name): MuscleLoad => {
      const s = this.sets[name] ?? 0;
      const sc = this.score[name] ?? 0;
      const e = this.engages.has(name) || (sc > 0 && s === 0);
      return { name, sets: s, engaged: e && s === 0, level: niveauDe(sc, e) };
    });
    return {
      loads,
      zones: Array.from(this.zonesOn),
      ids: Array.from(this.idsOn),
      nombre: loads.filter((l) => l.level > 0).length,
      avecExercices: this.avecExercices,
    };
  }
}

/** Muscles d'une liste d'exercices (une seance) */
export function musclesDesExercices(exs: readonly ExerciseLike[], perso?: readonly MachinePerso[]): BilanMuscles {
  const c = new CompteurMuscles(perso);
  c.exercices(exs);
  return c.bilan();
}

/** Muscles d'une seance enregistree */
export function musclesSeance(t: Training | null | undefined, perso?: readonly MachinePerso[]): BilanMuscles {
  return musclesDesExercices(exercisesOf(t), perso);
}

/** Series par groupe (principal seulement) sur une periode, dates comprises */
export function seriesParMuscle(trainings: readonly Training[], du: string, au: string, perso?: readonly MachinePerso[]): Record<MuscleName, number> {
  const c = new CompteurMuscles(perso);
  for (const t of trainings) {
    const d = (t.date || '').slice(0, 10);
    if (d < du || d > au) continue;
    c.exercices(exercisesOf(t));
  }
  return Object.fromEntries(c.bilan().loads.map((l) => [l.name, l.sets])) as Record<MuscleName, number>;
}

