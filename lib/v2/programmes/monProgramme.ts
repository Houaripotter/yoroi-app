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
import type { ExoProgramme, Programme } from './types';

export const CLE_PROGRAMMES_PERSO = 'yoroi_programmes_perso_v1';
export const MAX_EXOS_SEANCE = 15;
export const MAX_SERIES_PERSO = 10;
export const MAX_PROGRAMMES_PERSO = 30;

export type SeancePerso = {
  /** ton nom (« Push », « Jambes ») ; absent : déduit des muscles (titreParDefaut) */
  titre?: string;
  exos: ExoProgramme[];
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

export function versProgramme(pp: ProgrammePerso): Programme {
  const jours = joursDuPerso(pp).map((d) => {
    const s = pp.semaine[d]!;
    return { id: idJourPerso(pp.id, d), titre: titreDeSeance(s), muscles: musclesDeSeance(s.exos), exos: s.exos.map((e) => ({ ...e })) };
  });
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
    semaines: 8,
    jours,
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
  };
}

export function nettoyerPerso(x: unknown): ProgrammePerso | null {
  if (!x || typeof x !== 'object') return null;
  const p = x as Partial<ProgrammePerso>;
  if (typeof p.id !== 'string' || !p.id.startsWith(PREFIXE_PERSO)) return null;
  const brut = Array.isArray(p.semaine) ? p.semaine : [];
  const semaine = semaineVide().map((_, d) => {
    const s = brut[d] as SeancePerso | null | undefined;
    if (!s || typeof s !== 'object' || !Array.isArray(s.exos)) return null;
    const exos = s.exos.map(nettoyerExo).filter((e): e is ExoProgramme => !!e).slice(0, MAX_EXOS_SEANCE);
    if (!exos.length) return null;
    return { ...(typeof s.titre === 'string' && s.titre.trim() ? { titre: s.titre.trim().slice(0, 40) } : {}), exos };
  });
  const rappel = p.rappel && typeof p.rappel === 'object' && typeof p.rappel.heure === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(p.rappel.heure) ? { actif: !!p.rappel.actif, heure: p.rappel.heure } : undefined;
  return {
    id: p.id,
    nom: typeof p.nom === 'string' ? p.nom.trim().slice(0, 40) : '',
    semaine,
    ...(rappel ? { rappel } : {}),
    creeLe: typeof p.creeLe === 'string' ? p.creeLe : jourLocal(),
    modifieLe: typeof p.modifieLe === 'string' ? p.modifieLe : jourLocal(),
    ...(typeof p.archive === 'string' ? { archive: p.archive } : {}),
  };
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
  const propre = nettoyerPerso({ ...pp, modifieLe: jourLocal(maintenant) });
  if (!propre || !peutEnregistrer(propre)) throw new Error('programme vide');
  const liste = await chargerProgrammesPerso();
  const i = liste.findIndex((p) => p.id === propre.id);
  const suite = i >= 0 ? liste.map((p, k) => (k === i ? { ...propre, creeLe: p.creeLe } : p)) : [...liste, propre];
  await ecrireListe(suite);
  return i >= 0 ? { ...propre, creeLe: liste[i].creeLe } : propre;
}

/** Supprimer = archiver (date du jour) : il quitte « Mes programmes », tes séances faites ne bougent pas */
export async function archiverProgrammePerso(id: string, maintenant = new Date()): Promise<void> {
  const liste = await chargerProgrammesPerso();
  if (!liste.some((p) => p.id === id)) return;
  await ecrireListe(liste.map((p) => (p.id === id ? { ...p, archive: jourLocal(maintenant) } : p)));
}
