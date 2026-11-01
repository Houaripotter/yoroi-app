/**
 * « Je construis le mien » (27 octobre 2026) : ton propre programme, une semaine type. Pour chaque jour, repos ou
 * une séance avec ses exercices, ses séries et ses répétitions. Houari : un vrai outil, pas une maquette.
 *
 * Le modèle, le plus simple qui colle au code existant :
 *  - ProgrammePerso.semaine : 7 cases, du lundi (0) au dimanche (6), null = repos.
 *  - versProgramme le change en Programme du catalogue (types.ts) : une séance par jour d'entraînement, dans l'ordre
 *    de la semaine, ids « perso-…-d0 » (d = jour de la semaine, stable quand tu modifies). joursParSemaine = nombre
 *    de séances : c'est un programme « à la semaine » (planJours.ts, estPlanFixe), son plan est planDuPerso.
 *  - Il devient le programme en cours comme les autres (suivi.ts, demarrerProgramme) : séance du jour du coach et
 *    de l'accueil, rappels, progression, séance en direct ; programmeParId le trouve dans registrePerso.ts.
 *  - Supprimer = archiver : le programme reste stocké (archive = date) pour que tes séances déjà faites gardent
 *    leur nom ; il disparaît seulement de « Mes programmes ». Aucune séance enregistrée n'est touchée.
 * Stocké sur le téléphone (AsyncStorage, une clé à part), rien ne sort. Testé dans __tests__/unit/monProgramme.test.ts.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { dureeEstimee } from './express';
import { EVENEMENT_PROGRAMME, PREFIXE_PERSO, remplirRegistrePerso } from './registrePerso';
import type { ExoProgramme, JourProgramme, Programme } from './types';
import type { SemaineLibre } from './semaineLibre';
import { lireAlternance, planAlternance, unifierAB } from './alternance';
import type { Alternance, SourceJour } from './alternance';
import type { FinSeance } from './finSeance';

export const CLE_PROGRAMMES_PERSO = 'yoroi_programmes_perso_v1';
export const MAX_EXOS_SEANCE = 15;
export const MAX_SERIES_PERSO = 10;
export const MAX_PROGRAMMES_PERSO = 30;

export type SeancePerso = {
  /** ton nom (« Push », « Jambes ») ; absent : déduit des muscles (titreParDefaut) */
  titre?: string;
  exos: ExoProgramme[];
  /**
   * 30 octobre 2026 : l'identité stable de la séance (son id : « perso-…-<sid> », idSeancePerso). Elle suit la séance
   * quand tu la changes de jour : tes séances faites et tes progrès la retrouvent toujours. Les programmes d'avant
   * n'en avaient pas : chaque séance reçoit l'id qu'elle avait alors, celui de son jour (« d3 », « b3 »), rien ne change.
   */
  sid?: string;
  /**
   * 30 octobre 2026 (Ta semaine en briques, briques.ts) : la brique de la séance (« push », « abdos », une brique
   * à toi). Changer une brique recopie ses exercices sur chaque jour qui la porte ; chaque jour garde son sid.
   * Les programmes d'avant n'en avaient pas : chaque jour devient sa propre brique (« j » + son sid).
   */
  brique?: string;
};

export type RappelPerso = { actif: boolean; heure: string };

export type ProgrammePerso = {
  id: string;
  /** ton nom ; vide : « Mon programme, N jours » */
  nom: string;
  /** lundi (0) à dimanche (6), null = repos */
  semaine: (SeancePerso | null)[];
  rappel?: RappelPerso;
  creeLe: string;
  modifieLe: string;
  /** date de suppression : archivé, jamais effacé */
  archive?: string;
  /** 28 octobre 2026 (« Garder comme mon programme ») : ta semaine B, gardée même si A et B n'alternent pas */
  semaineB?: (SeancePerso | null)[];
  /** les semaines A et B alternent, à partir du lundi `depuis` (une semaine A) */
  ab?: boolean;
  depuis?: string;
  /** durée en semaines (8, 12) ; 0 = sans fin */
  duree?: number;
  /** le programme du catalogue d'où il vient */
  origine?: string;
  /** 30 octobre 2026 : tes briques posées sur aucun jour (briques.ts), gardées pour les reposer */
  briques?: SeancePerso[];
  /**
   * 1er novembre 2026 (alternance.ts) : « Tes séances », alterner A et B ('ab') ou toujours la même ('meme').
   * Absent (programmes d'avant) : rien ne change, ta semaine se lit comme avant.
   */
  alternance?: Alternance;
  /** 1er novembre 2026 : les versions B préparées (varianteB.ts), une par brique (sa brique : celle de la séance A) */
  variantesB?: SeancePerso[];
  /**
   * 1er novembre 2026 (Houari : « vérifie que l'app me les demande quand je crée mon programme ») : abdos et cardio en
   * fin de séance, choisis dans « Je construis le mien » (fréquence, type et durée du cardio). Champ facultatif :
   * absent dans les programmes d'avant, rien ne change. Lu strictement par finSeance.ts (lireFinSeance) quand ton
   * programme devient le programme en cours (suivi.ts, suivreProgrammePerso).
   */
  fin?: FinSeance;
};

function jourLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

const borne = (n: unknown, min: number, max: number, defaut: number) => {
  const v = Number(n);
  return Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : defaut;
};

export function semaineVide(): (SeancePerso | null)[] {
  return [null, null, null, null, null, null, null];
}

export function nouvelIdPerso(maintenant = Date.now()): string {
  return `${PREFIXE_PERSO}${maintenant.toString(36)}`;
}

export function nouveauProgrammePerso(maintenant = new Date()): ProgrammePerso {
  const jour = jourLocal(maintenant);
  return { id: nouvelIdPerso(maintenant.getTime()), nom: '', semaine: semaineVide(), creeLe: jour, modifieLe: jour };
}

/* ---------------------------------- les muscles et le nom ---------------------------------- */

const normal = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();

/** Groupe de la bibliothèque (PECTORAUX, ÉPAULES...) vers les muscles de lib/sports.ts (carte des muscles) */
const MUSCLE_DU_GROUPE: Record<string, string> = {
  PECTORAUX: 'pectoraux', POITRINE: 'pectoraux', DOS: 'dos', EPAULES: 'epaules', BICEPS: 'biceps', TRICEPS: 'triceps',
  BRAS: 'biceps', ABDOS: 'abdos', CORE: 'abdos', OBLIQUES: 'abdos', JAMBES: 'jambes', ISCHIOS: 'jambes',
  QUADRICEPS: 'jambes', MOLLETS: 'mollets', FESSIERS: 'fessiers', 'AVANT BRAS': 'avant_bras', 'AVANT-BRAS': 'avant_bras', GRIP: 'avant_bras',
};

export function muscleDuGroupe(groupe: string | undefined): string | null {
  if (!groupe) return null;
  return MUSCLE_DU_GROUPE[normal(groupe)] ?? null;
}

const HAUT = ['pectoraux', 'dos', 'epaules', 'biceps', 'triceps', 'avant_bras'];
const BAS = ['jambes', 'mollets', 'fessiers'];
const NOM_MUSCLE: Record<string, string> = {
  pectoraux: 'Pectoraux', dos: 'Dos', epaules: 'Épaules', biceps: 'Bras', triceps: 'Bras', avant_bras: 'Avant bras',
  abdos: 'Abdos', jambes: 'Jambes', mollets: 'Mollets', fessiers: 'Fessiers',
};

/** Les muscles d'une séance, sans doublon, dans l'ordre des exercices */
export function musclesDeSeance(exos: readonly ExoProgramme[]): string[] {
  const out: string[] = [];
  for (const e of exos) {
    const m = muscleDuGroupe(e.muscle);
    if (m && !out.includes(m)) out.push(m);
  }
  return out;
}

/** « Pectoraux », « Haut du corps », « Bas du corps », « Corps entier » (texte français, traduit à l'affichage) */
export function titreParDefaut(exos: readonly ExoProgramme[]): string {
  const m = musclesDeSeance(exos);
  if (!m.length) return 'Ma séance';
  const noms = Array.from(new Set(m.map((x) => NOM_MUSCLE[x])));
  if (noms.length === 1) return noms[0];
  const haut = m.some((x) => HAUT.includes(x));
  const bas = m.some((x) => BAS.includes(x));
  if (haut && bas) return 'Corps entier';
  if (bas) return 'Bas du corps';
  if (haut) return 'Haut du corps';
  return noms.slice(0, 2).join(', ');
}

export const titreDeSeance = (s: SeancePerso): string => (s.titre && s.titre.trim() ? s.titre.trim() : titreParDefaut(s.exos));

/** Les jours de séance (0 = lundi), dans l'ordre de la semaine */
export function joursDuPerso(pp: Pick<ProgrammePerso, 'semaine'>): number[] {
  return pp.semaine.map((s, d) => (s && s.exos.length ? d : -1)).filter((d) => d >= 0);
}

/** Le plan du programme (planJours.ts) : le jour de chaque séance, dans l'ordre des séances */
export const planDuPerso = joursDuPerso;

/** 30 octobre 2026 : tes jours de séance, semaine B comprise quand elle alterne (les rappels, rappelProgramme.ts) */
export function joursDeSeancePerso(pp: Pick<ProgrammePerso, 'semaine' | 'semaineB' | 'ab'>): number[] {
  const b = pp.ab && pp.semaineB ? pp.semaineB.map((s, d) => (s && s.exos.length ? d : -1)).filter((d) => d >= 0) : [];
  return Array.from(new Set([...joursDuPerso(pp), ...b])).sort((x, y) => x - y);
}

export function nombreSeances(pp: Pick<ProgrammePerso, 'semaine'>): number {
  return joursDuPerso(pp).length;
}

/** Le nom affiché : le tien, sinon « Mon programme, N jours » (gabarit et valeur, traduits à l'affichage) */
export function nomDuPerso(pp: Pick<ProgrammePerso, 'nom' | 'semaine'>): { gabarit: string; valeurs: (string | number)[] } {
  const n = pp.nom.trim();
  if (n) return { gabarit: '{0}', valeurs: [n] };
  const k = nombreSeances(pp);
  return k === 1 ? { gabarit: 'Mon programme, 1 jour', valeurs: [] } : { gabarit: 'Mon programme, {0} jours', valeurs: [k] };
}

/** Assez rempli pour être enregistré : au moins une séance avec un exercice */
export function peutEnregistrer(pp: Pick<ProgrammePerso, 'semaine'>): boolean {
  return nombreSeances(pp) > 0;
}

/* ---------------------------------- les exercices ---------------------------------- */

/** Un exercice choisi dans la recherche : 3 séries de 8 à 12, 90 s de repos, son groupe de la bibliothèque */
export function exoDepuisNom(nom: string, muscle?: string): ExoProgramme {
  const lib = EXERCISE_LIBRARY.find((e) => e.name === nom);
  return { nom, muscle: muscle ?? lib?.muscle ?? '', series: 3, repsMin: 8, repsMax: 12, reposSec: 90 };
}

export function avecExo(s: SeancePerso | null, exo: ExoProgramme): SeancePerso {
  const base = s ?? { exos: [] };
  if (base.exos.some((e) => e.nom === exo.nom) || base.exos.length >= MAX_EXOS_SEANCE) return base;
  return { ...base, exos: [...base.exos, exo] };
}

export function sansExo(s: SeancePerso, index: number): SeancePerso {
  return { ...s, exos: s.exos.filter((_, i) => i !== index) };
}

/** Séries et répétitions d'un exercice, bornées (1 à 10 séries, 1 à 100 répétitions, min ≤ max) */
export function reglerExo(s: SeancePerso, index: number, r: { series?: number; repsMin?: number; repsMax?: number }): SeancePerso {
  return {
    ...s,
    exos: s.exos.map((e, i) => {
      if (i !== index) return e;
      const series = r.series === undefined ? e.series : borne(r.series, 1, MAX_SERIES_PERSO, e.series);
      let repsMin = r.repsMin === undefined ? e.repsMin : borne(r.repsMin, 1, 100, e.repsMin);
      let repsMax = r.repsMax === undefined ? e.repsMax : borne(r.repsMax, 1, 100, e.repsMax);
      if (repsMin > repsMax) [repsMin, repsMax] = [repsMax, repsMin];
      return { ...e, series, repsMin, repsMax };
    }),
  };
}

/** Monte (-1) ou descend (+1) un exercice dans la séance */
export function deplacerExo(s: SeancePerso, index: number, sens: -1 | 1): SeancePerso {
  const j = index + sens;
  if (index < 0 || index >= s.exos.length || j < 0 || j >= s.exos.length) return s;
  const exos = [...s.exos];
  [exos[index], exos[j]] = [exos[j], exos[index]];
  return { ...s, exos };
}

/** La semaine avec ce jour changé (null : repos) */
export function avecJour(pp: ProgrammePerso, jour: number, s: SeancePerso | null): ProgrammePerso {
  if (jour < 0 || jour > 6) return pp;
  const semaine = pp.semaine.slice();
  // une séance encore vide reste ouverte pendant que tu la remplis ; elle ne compte qu'avec un exercice
  semaine[jour] = s;
  return { ...pp, semaine };
}

/* ---------------------------------- vers un programme du catalogue ---------------------------------- */

export const idJourPerso = (id: string, jour: number) => `${id}-d${jour}`;

export const idJourPersoB = (id: string, jour: number) => `${id}-b${jour}`;

/** 1er novembre 2026 : l'id de la version B d'une séance (alternance.ts), stable : celui de sa brique */
export const idVariantePerso = (id: string, brique: string) => `${id}-v${brique}`;

/** Le lundi (date locale) de la semaine d'une date « 2026-11-01 » ; undefined si illisible */
function lundiLocal(iso: string): string | undefined {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return undefined;
  return jourLocal(new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7), 12));
}

/** 30 octobre 2026 : l'id d'une séance de ton programme, stable (sid) ; les séances d'avant gardent « d3 », « b3 » */
export const idSeancePerso = (id: string, sid: string) => `${id}-${sid}`;
const SID = /^[a-z0-9]{1,24}$/;
const sidValide = (v: unknown): v is string => typeof v === 'string' && SID.test(v);
const BRIQUE = /^[a-z0-9_]{1,32}$/;
export const briqueValide = (v: unknown): v is string => typeof v === 'string' && BRIQUE.test(v);
export const MAX_BRIQUES_GARDEES = 40;

/** L'id de la séance de ce jour (null : repos), A ou B */
export function idDuJourPerso(pp: Pick<ProgrammePerso, 'id' | 'semaine' | 'semaineB'>, jour: number, b = false): string | null {
  const s = (b ? pp.semaineB : pp.semaine)?.[jour];
  if (!s || !s.exos.length) return null;
  return idSeancePerso(pp.id, sidValide(s.sid) ? s.sid : `${b ? 'b' : 'd'}${jour}`);
}

/**
 * Chaque séance reçoit son sid : le sien (le premier qui le porte, un double en reçoit un autre), sinon celui de
 * son jour (« d3 », « b3 », comme ses ids d'avant), sinon un autre libre. Calcul pur, le même à chaque lecture.
 */
function avecSids(semaine: (SeancePerso | null)[], semaineB: (SeancePerso | null)[] | null): { semaine: (SeancePerso | null)[]; semaineB: (SeancePerso | null)[] | null } {
  const vus = new Set<string>();
  const garder = (l: (SeancePerso | null)[]) => l.map((s) => {
    if (s && sidValide(s.sid) && !vus.has(s.sid)) {
      vus.add(s.sid);
      return s.sid;
    }
    return null;
  });
  const ga = garder(semaine);
  const gb = semaineB ? garder(semaineB) : null;
  const finir = (l: (SeancePerso | null)[], g: (string | null)[], prefixe: string) => l.map((s, d) => {
    if (!s) return null;
    let sid = g[d];
    if (!sid) {
      let c = `${prefixe}${d}`;
      let k = 0;
      while (vus.has(c)) c = `${prefixe}${d}x${++k}`;
      sid = c;
      vus.add(sid);
    }
    return { ...s, sid };
  });
  return { semaine: finir(semaine, ga, 'd'), semaineB: semaineB && gb ? finir(semaineB, gb, 'b') : null };
}

/**
 * Avant d'écrire un programme déjà enregistré : une séance nouvelle (sans sid, ou un double) reçoit un sid neuf,
 * jamais celui d'une séance d'avant (ses séances faites ne lui sont pas attribuées).
 */
export function avecSidsNeufs(pp: ProgrammePerso, maintenant = Date.now()): ProgrammePerso {
  const tous = new Set([...pp.semaine, ...(pp.semaineB ?? [])].map((s) => s?.sid).filter(sidValide));
  const vus = new Set<string>();
  let k = 0;
  const neuf = () => {
    let c: string;
    do c = `n${maintenant.toString(36)}${(k++).toString(36)}`; while (tous.has(c) || vus.has(c));
    return c;
  };
  const l = (x: (SeancePerso | null)[]) => x.map((s) => {
    if (!s) return s;
    const sid = sidValide(s.sid) && !vus.has(s.sid) ? s.sid : neuf();
    vus.add(sid);
    return { ...s, sid };
  });
  return { ...pp, semaine: l(pp.semaine), ...(pp.semaineB ? { semaineB: l(pp.semaineB) } : {}) };
}

export function versProgramme(pp: ProgrammePerso): Programme {
  // 30 octobre 2026 : chaque séance a son id stable (sid), son jour est dit à part (jourPerso)
  const jours: JourProgramme[] = joursDuPerso(pp).map((d) => {
    const s = pp.semaine[d]!;
    return { id: idDuJourPerso(pp, d)!, titre: titreDeSeance(s), muscles: musclesDeSeance(s.exos), exos: s.exos.map((e) => ({ ...e })), jourPerso: { d } };
  });
  // 28 octobre 2026 : ta semaine B, après tes séances de la semaine A ; ta semaine dit quel jour fait quoi
  const joursB = (pp.semaineB ?? []).map((s, d) => (s && s.exos.length ? { id: idDuJourPerso(pp, d, true)!, titre: titreDeSeance(s), muscles: musclesDeSeance(s.exos), exos: s.exos.map((e) => ({ ...e })), jourPerso: { d, b: true } } : null)).filter((j): j is NonNullable<typeof j> => !!j);
  const semaineLibre: SemaineLibre | undefined = joursB.length
    ? {
        a: pp.semaine.map((_, d) => { const id = idDuJourPerso(pp, d); return id ? { p: pp.id, s: id } : null; }),
        b: (pp.semaineB ?? semaineVide()).map((_, d) => { const id = idDuJourPerso(pp, d, true); return id ? { p: pp.id, s: id } : null; }),
        ...(pp.ab && pp.depuis ? { ab: true } : {}),
        ...(pp.depuis ? { depuis: pp.depuis } : {}),
      }
    : undefined;
  // 1er novembre 2026 : A et B au choix (alternance.ts) : la version B de tes séances, et deux semaines qui alternent
  const alt = planAlternance(pp);
  let joursV: JourProgramme[] = [];
  let semaineAlt: SemaineLibre | undefined;
  if (alt) {
    const variantes = new Map((pp.variantesB ?? []).map((v) => [v.brique, v]));
    joursV = alt.variantes.map((k) => {
      const v = variantes.get(k)!;
      const d = pp.semaine.findIndex((s) => !!s && s.brique === k);
      const a = pp.semaine[d]!;
      return { id: idVariantePerso(pp.id, k), titre: titreDeSeance({ ...v, titre: a.titre }), muscles: musclesDeSeance(v.exos), exos: v.exos.map((e) => ({ ...e })), jourPerso: { d, b: true }, variante: 'B' as const };
    });
    const avecB = new Set(alt.variantes);
    for (const j of jours) {
      const s = j.jourPerso ? pp.semaine[j.jourPerso.d] : null;
      if (s && s.brique && avecB.has(s.brique)) Object.assign(j, { variante: 'A' as const });
    }
    const ref = (x: SourceJour | null) => {
      if (!x) return null;
      const id = 'jour' in x ? idDuJourPerso(pp, x.jour) : idVariantePerso(pp.id, x.variante);
      return id ? { p: pp.id, s: id } : null;
    };
    const a = alt.a.map(ref);
    const b = alt.b.map(ref);
    const differe = a.some((x, d) => x?.s !== b[d]?.s);
    const depuis = pp.depuis ?? lundiLocal(pp.creeLe);
    semaineAlt = differe && depuis ? { a, b, ab: true, depuis } : { a };
  }
  const duree = jours.length ? Math.max(...jours.map((j) => dureeEstimee(j.exos))) : 0;
  return {
    id: pp.id,
    // ton nom, sinon « Mon programme » (traduit à l'affichage, comme les titres du catalogue)
    titre: pp.nom.trim() || 'Mon programme',
    accroche: 'Ton programme, construit par toi.',
    niveau: 'intermediaire',
    objectif: 'muscle',
    materiel: 'salle',
    // l'ordre de tes exercices est le tien : on ne le réordonne pas
    ordreFixe: true,
    sport: 'musculation',
    joursParSemaine: jours.length,
    dureeMin: Math.max(15, Math.round(duree / 5) * 5),
    semaines: pp.duree && pp.duree > 0 ? pp.duree : 8,
    ...(pp.duree === 0 ? { sansFin: true } : {}),
    jours: [...jours, ...joursB, ...joursV],
    ...(semaineAlt ? { semaineLibre: semaineAlt } : semaineLibre ? { semaineLibre } : {}),
    principes: [],
    sources: [],
  };
}

/* ---------------------------------- lecture tolérante ---------------------------------- */

function nettoyerExo(x: unknown): ExoProgramme | null {
  if (!x || typeof x !== 'object') return null;
  const e = x as Partial<ExoProgramme>;
  if (typeof e.nom !== 'string' || !e.nom.trim()) return null;
  const repsMin = borne(e.repsMin, 1, 100, 8);
  const repsMax = Math.max(repsMin, borne(e.repsMax, 1, 100, 12));
  return {
    nom: e.nom,
    muscle: typeof e.muscle === 'string' ? e.muscle : '',
    series: borne(e.series, 1, MAX_SERIES_PERSO, 3),
    repsMin,
    repsMax,
    reposSec: borne(e.reposSec, 15, 600, 90),
    ...(typeof e.conseil === 'string' ? { conseil: e.conseil } : {}),
    ...(e.poidsDuCorps ? { poidsDuCorps: true } : {}),
    ...(e.secondes ? { secondes: true } : {}),
    // 30 octobre 2026 : la durée de la brique Cardio (briques.ts), en minutes
    ...(typeof e.minutes === 'number' && Number.isFinite(e.minutes) && e.minutes > 0 ? { minutes: borne(e.minutes, 5, 120, 30) } : {}),
    // 31 octobre 2026 : lié au suivant (superset, lib/v2/seances/superset.ts) ; absent dans les programmes d'avant
    ...(e.enchaine === true ? { enchaine: true } : {}),
  };
}

/**
 * Migration du 31 octobre 2026 (champ `enchaine`, facultatif) : les programmes d'avant n'en ont pas et se lisent
 * tels quels. Un lien sur le dernier exercice d'une séance ne mène à rien : il tombe. Rien d'autre ne change.
 */
export function exosLiesPropres(exos: ExoProgramme[]): ExoProgramme[] {
  const der = exos.length - 1;
  if (der < 0 || !exos[der].enchaine) return exos;
  const { enchaine: _e, ...reste } = exos[der];
  return [...exos.slice(0, der), reste];
}

export function nettoyerPerso(x: unknown): ProgrammePerso | null {
  if (!x || typeof x !== 'object') return null;
  const p = x as Partial<ProgrammePerso>;
  if (typeof p.id !== 'string' || !p.id.startsWith(PREFIXE_PERSO)) return null;
  const lireSemainePerso = (v: unknown): (SeancePerso | null)[] => {
    const brut = Array.isArray(v) ? v : [];
    return semaineVide().map((_, d) => {
      const s = brut[d] as SeancePerso | null | undefined;
      if (!s || typeof s !== 'object' || !Array.isArray(s.exos)) return null;
      const exos = exosLiesPropres(s.exos.map(nettoyerExo).filter((e): e is ExoProgramme => !!e).slice(0, MAX_EXOS_SEANCE));
      if (!exos.length) return null;
      return { ...(typeof s.titre === 'string' && s.titre.trim() ? { titre: s.titre.trim().slice(0, 40) } : {}), exos, ...(sidValide(s.sid) ? { sid: s.sid } : {}), ...(briqueValide(s.brique) ? { brique: s.brique } : {}) };
    });
  };
  // 30 octobre 2026 : chaque séance a son sid (les programmes d'avant : celui de son jour, leurs ids ne changent pas)
  const sids = avecSids(lireSemainePerso(p.semaine), Array.isArray(p.semaineB) ? lireSemainePerso(p.semaineB) : null);
  // 30 octobre 2026 : une séance sans brique (programmes d'avant) devient sa propre brique, tirée de son sid
  const avecBrique = (l: (SeancePerso | null)[]) => l.map((s) => (s && !s.brique ? { ...s, brique: `j${s.sid}` } : s));
  const semaine = avecBrique(sids.semaine);
  const semaineB = sids.semaineB ? avecBrique(sids.semaineB) : null;
  const posees = new Set([...semaine, ...(semaineB ?? [])].map((s) => s?.brique).filter((x): x is string => !!x));
  const briques = (Array.isArray(p.briques) ? p.briques : [])
    .map((s) => {
      if (!s || typeof s !== 'object' || !Array.isArray(s.exos) || !briqueValide(s.brique) || posees.has(s.brique)) return null;
      posees.add(s.brique);
      const exos = exosLiesPropres(s.exos.map(nettoyerExo).filter((e): e is ExoProgramme => !!e).slice(0, MAX_EXOS_SEANCE));
      if (!exos.length) return null;
      return { ...(typeof s.titre === 'string' && s.titre.trim() ? { titre: s.titre.trim().slice(0, 40) } : {}), exos, brique: s.brique } as SeancePerso;
    })
    .filter((s): s is SeancePerso => !!s)
    .slice(0, MAX_BRIQUES_GARDEES);
  // 1er novembre 2026 (alternance.ts) : tes versions B, une par brique, lues comme tes briques
  const vuesB = new Set<string>();
  const variantesB = (Array.isArray(p.variantesB) ? p.variantesB : [])
    .map((s) => {
      if (!s || typeof s !== 'object' || !Array.isArray(s.exos) || !briqueValide(s.brique) || vuesB.has(s.brique)) return null;
      vuesB.add(s.brique);
      const exos = exosLiesPropres(s.exos.map(nettoyerExo).filter((e): e is ExoProgramme => !!e).slice(0, MAX_EXOS_SEANCE));
      if (!exos.length) return null;
      return { ...(typeof s.titre === 'string' && s.titre.trim() ? { titre: s.titre.trim().slice(0, 40) } : {}), exos, brique: s.brique } as SeancePerso;
    })
    .filter((s): s is SeancePerso => !!s)
    .slice(0, MAX_BRIQUES_GARDEES);
  const alternance = lireAlternance(p.alternance);
  const depuis = typeof p.depuis === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.depuis) ? p.depuis : undefined;
  const rappel = p.rappel && typeof p.rappel === 'object' && typeof p.rappel.heure === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.rappel.heure) ? { actif: !!p.rappel.actif, heure: p.rappel.heure } : undefined;
  // 1er novembre 2026, soir : un seul réglage A et B (alternance.ts, unifierAB) : ta semaine B copie de ta semaine A
  // devient « Alterner A et B » ; ta semaine B est gardée, rien n'est effacé
  return unifierAB<ProgrammePerso>({
    id: p.id,
    nom: typeof p.nom === 'string' ? p.nom.trim().slice(0, 40) : '',
    semaine,
    ...(rappel ? { rappel } : {}),
    creeLe: typeof p.creeLe === 'string' ? p.creeLe : jourLocal(),
    modifieLe: typeof p.modifieLe === 'string' ? p.modifieLe : jourLocal(),
    ...(typeof p.archive === 'string' ? { archive: p.archive } : {}),
    ...(semaineB && semaineB.some((x) => !!x) ? { semaineB } : {}),
    ...(semaineB && p.ab === true && depuis ? { ab: true } : {}),
    ...(depuis ? { depuis } : {}),
    ...(p.duree === 0 || p.duree === 8 || p.duree === 12 ? { duree: p.duree } : {}),
    ...(typeof p.origine === 'string' && p.origine.length <= 120 ? { origine: p.origine } : {}),
    ...(briques.length ? { briques } : {}),
    ...(alternance ? { alternance } : {}),
    ...(variantesB.length ? { variantesB } : {}),
    ...(p.fin && typeof p.fin === 'object' && !Array.isArray(p.fin) && typeof (p.fin as { choix?: unknown }).choix === 'string' ? { fin: p.fin } : {}),
  });
}

/** Une entrée abîmée est écartée, jamais toute la liste */
export function lireProgrammesPerso(raw: string | null): ProgrammePerso[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(nettoyerPerso).filter((p): p is ProgrammePerso => !!p) : [];
  } catch {
    return [];
  }
}

/* ---------------------------------- stockage ---------------------------------- */

function prevenir() {
  try {
    DeviceEventEmitter.emit(EVENEMENT_PROGRAMME);
  } catch {
    // rien a faire
  }
}

/** Tous tes programmes, archivés compris ; remplit le registre de programmeParId */
export async function chargerProgrammesPerso(): Promise<ProgrammePerso[]> {
  let liste: ProgrammePerso[] = [];
  try {
    liste = lireProgrammesPerso(await AsyncStorage.getItem(CLE_PROGRAMMES_PERSO));
  } catch {
    liste = [];
  }
  remplirRegistrePerso(liste.filter((p) => nombreSeances(p) > 0).map(versProgramme));
  return liste;
}

/** « Mes programmes » : ceux qui ne sont pas archivés, le dernier modifié en premier */
export function programmesVisibles(liste: readonly ProgrammePerso[]): ProgrammePerso[] {
  return liste.filter((p) => !p.archive).sort((a, b) => (a.modifieLe < b.modifieLe ? 1 : a.modifieLe > b.modifieLe ? -1 : 0));
}

export async function programmePersoParId(id: string | null | undefined): Promise<ProgrammePerso | null> {
  if (!id) return null;
  return (await chargerProgrammesPerso()).find((p) => p.id === id) ?? null;
}

/**
 * 28 octobre 2026 (audit « ne jamais perdre de données ») : avant d'écrire, la liste est relue strictement.
 * Stockage indisponible : l'erreur remonte, rien n'est écrit (avant : liste vide, puis ton nouveau programme
 * écrit seul, tous les autres effacés). Liste illisible : recopiée à part avant d'écrire une liste neuve.
 */
export const CLE_PROGRAMMES_PERSO_ILLISIBLE = 'yoroi_programmes_perso_illisible_v1';
async function chargerPourEcrire(): Promise<ProgrammePerso[]> {
  const raw = await AsyncStorage.getItem(CLE_PROGRAMMES_PERSO);
  if (raw) {
    let lisible = false;
    try {
      lisible = Array.isArray(JSON.parse(raw));
    } catch {
      lisible = false;
    }
    if (!lisible) await AsyncStorage.setItem(CLE_PROGRAMMES_PERSO_ILLISIBLE, raw);
  }
  return lireProgrammesPerso(raw);
}

async function ecrireListe(liste: ProgrammePerso[]): Promise<void> {
  // les archivés restent ; au delà du plafond, les plus vieux archivés partent d'abord
  let garde = liste;
  if (garde.length > MAX_PROGRAMMES_PERSO * 2) {
    const archives = garde.filter((p) => p.archive).sort((a, b) => (a.archive! < b.archive! ? -1 : 1));
    const trop = garde.length - MAX_PROGRAMMES_PERSO * 2;
    const partent = new Set(archives.slice(0, trop).map((p) => p.id));
    garde = garde.filter((p) => !partent.has(p.id));
  }
  await AsyncStorage.setItem(CLE_PROGRAMMES_PERSO, JSON.stringify(garde));
  remplirRegistrePerso(garde.filter((p) => nombreSeances(p) > 0).map(versProgramme));
  prevenir();
}

/** Crée ou met à jour (même id) ; renvoie le programme tel qu'enregistré */
export async function enregistrerProgrammePerso(pp: ProgrammePerso, maintenant = new Date()): Promise<ProgrammePerso> {
  if (!nettoyerPerso(pp) || !peutEnregistrer(pp)) throw new Error('programme vide');
  const liste = await chargerPourEcrire();
  // 30 octobre 2026 : déjà enregistré, une séance nouvelle reçoit un sid neuf (jamais celui d'une séance d'avant)
  const existe = liste.some((p) => p.id === pp.id);
  const propre = nettoyerPerso({ ...(existe ? avecSidsNeufs(pp, maintenant.getTime()) : pp), modifieLe: jourLocal(maintenant) });
  if (!propre || !peutEnregistrer(propre)) throw new Error('programme vide');
  const i = liste.findIndex((p) => p.id === propre.id);
  const suite = i >= 0 ? liste.map((p, k) => (k === i ? { ...propre, creeLe: p.creeLe } : p)) : [...liste, propre];
  await ecrireListe(suite);
  return i >= 0 ? { ...propre, creeLe: liste[i].creeLe } : propre;
}

/** Supprimer = archiver (date du jour) : il quitte « Mes programmes », tes séances faites ne bougent pas */
export async function archiverProgrammePerso(id: string, maintenant = new Date()): Promise<void> {
  const liste = await chargerPourEcrire();
  if (!liste.some((p) => p.id === id)) return;
  await ecrireListe(liste.map((p) => (p.id === id ? { ...p, archive: jourLocal(maintenant) } : p)));
}

/**
 * 30 octobre 2026 : change un de tes programmes sans rien perdre d'autre (ta semaine depuis Tes jours, « Garder
 * comme mon programme » d'une semaine mixte). La liste est relue strictement juste avant d'écrire ; `changer` reçoit
 * le programme tel qu'il est stocké et rend la suite (null : rien n'est écrit). Introuvable, vide ou illisible :
 * null, rien n'est écrit. À appeler dans la file de CLE_PROGRAMMES_PERSO (suivi.ts, enFileProgramme).
 */
export async function modifierProgrammePerso(id: string, changer: (pp: ProgrammePerso) => ProgrammePerso | null, maintenant = new Date()): Promise<ProgrammePerso | null> {
  const liste = await chargerPourEcrire();
  const i = liste.findIndex((p) => p.id === id);
  if (i < 0) return null;
  const suite = changer(liste[i]);
  if (!suite) return null;
  const propre = nettoyerPerso({ ...avecSidsNeufs(suite, maintenant.getTime()), id, creeLe: liste[i].creeLe, modifieLe: jourLocal(maintenant) });
  if (!propre || !peutEnregistrer(propre)) return null;
  await ecrireListe(liste.map((p, k) => (k === i ? propre : p)));
  return propre;
}
