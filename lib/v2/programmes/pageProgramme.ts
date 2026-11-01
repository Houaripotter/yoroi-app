/**
 * La page « Ton programme », jour par jour (1er novembre 2026). Houari : « J'aimerais me projeter : je clique sur
 * mardi, je vois tout ce que j'ai à faire mardi ; je clique sur jeudi, pareil. »
 *  - la bande des 7 jours (cette semaine, puis la suivante en A puis B, ou les précédentes) : joursPrevus
 *    (prochainesSeances.ts), avec tes séances réellement faites reliées aux jours du programme (seancesFaites.ts) ;
 *  - le jour ouvert au départ : aujourd'hui ;
 *  - la lettre de la semaine quand toutes ses séances ont la même (« Semaine A ») ;
 *  - tes séances faites cette semaine et depuis le début ;
 *  - la semaine B copie de la A d'un programme du catalogue, à unifier en « Alterner A et B » (alternance.ts).
 * Données pures, testées dans __tests__/unit/programmeJourParJour.test.ts.
 */
import { joursPrevus, lettreSeance } from './prochainesSeances';
import type { JourPrevu } from './prochainesSeances';
import type { SeanceEnregistree } from './seancesFaites';
import { lundiIsoDe } from './seancesFaites';
import { casesDe, memeRef } from './semaineLibre';
import { estProgrammePerso } from './registrePerso';
import type { ProgrammeActif } from './suivi';
import type { Programme } from './types';

/** On peut regarder jusqu'à 3 semaines à venir */
export const SEMAINES_APRES = 3;
/** Et jusqu'à 8 semaines en arrière, jamais avant le début du programme */
export const SEMAINES_AVANT = 8;

const p2 = (n: number) => String(n).padStart(2, '0');
const isoDe = (d: Date): string => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

/** Le jour ouvert au départ dans une semaine : aujourd'hui, sinon sa première séance à venir, sinon sa première séance */
export function jourParDefaut(jours: readonly JourPrevu[], aujourdhui: string): number {
  const k = jours.findIndex((j) => j.date === aujourdhui);
  if (k >= 0) return k;
  const avenir = jours.findIndex((j) => !!j.jour && (j.statut === 'avenir' || j.statut === 'aujourdhui'));
  if (avenir >= 0) return avenir;
  const seance = jours.findIndex((j) => !!j.jour);
  return seance >= 0 ? seance : 0;
}

/** « Semaine A » ou « Semaine B » quand toutes les séances de la semaine ont cette lettre ; sinon null */
export function lettreDeLaSemaine(jours: readonly JourPrevu[]): 'A' | 'B' | null {
  const l = new Set(jours.filter((j) => !!j.jour).map((j) => lettreSeance(j.jour)));
  if (l.size !== 1) return null;
  const x = [...l][0];
  return x ?? null;
}

/** Combien de semaines avant (nombre négatif) et après cette semaine on peut regarder */
export function bornesDecalage(a: Pick<ProgrammeActif, 'debut'>, aujourdhui = new Date()): { min: number; max: number } {
  const debut = /^\d{4}-\d{2}-\d{2}$/.test(a.debut) ? lundiIsoDe(a.debut) : lundiIsoDe(isoDe(aujourdhui));
  const ici = lundiIsoDe(isoDe(aujourdhui));
  const semaines = Math.round((new Date(`${ici}T12:00:00`).getTime() - new Date(`${debut}T12:00:00`).getTime()) / (7 * 86400000));
  return { min: 0 - Math.max(0, Math.min(SEMAINES_AVANT, semaines)) || 0, max: SEMAINES_APRES };
}

/** Les 7 jours d'une semaine du programme (0 : cette semaine), séances faites reliées */
export function semaineVue(a: ProgrammeActif, p: Programme, decalage: number, trainings: readonly SeanceEnregistree[], aujourdhui = new Date()): JourPrevu[] {
  return joursPrevus(a, p, 1, aujourdhui, trainings, decalage);
}

export type BilanSeances = {
  /** séances faites cette semaine */
  faites: number;
  /** séances prévues cette semaine */
  prevues: number;
  /** séances faites depuis le début du programme (depuis le lundi de sa première semaine) */
  depuisDebut: number;
  /** % des séances prévues faites pendant les semaines terminées du programme ; null : aucune semaine terminée */
  regularite: number | null;
};

/** Tes séances faites cette semaine et depuis le début, reliées aux jours du programme */
export function bilanSeances(a: ProgrammeActif, p: Programme, trainings: readonly SeanceEnregistree[], aujourdhui = new Date()): BilanSeances {
  const { min } = bornesDecalage(a, aujourdhui);
  // depuis le début : toutes les semaines du programme (au delà de SEMAINES_AVANT, les faits notés par le programme)
  const ici = joursPrevus(a, p, 1, aujourdhui, trainings, 0);
  const avant = min < 0 ? joursPrevus(a, p, -min, aujourdhui, trainings, min) : [];
  const auj = isoDe(aujourdhui);
  const faite = (j: JourPrevu) => j.statut === 'faite' && j.date <= auj;
  const debutVu = avant[0]?.date ?? ici[0]?.date ?? auj;
  const anciens = new Set(a.faits.filter((f) => f.date < debutVu && f.date >= a.debut).map((f) => f.date)).size;
  // les semaines terminées, à partir de la semaine du début (une semaine commencée en cours compte depuis le début)
  const terminees = avant.filter((j) => j.date >= a.debut && !!j.jour);
  return {
    regularite: terminees.length ? Math.round((terminees.filter(faite).length / terminees.length) * 100) : null,
    faites: ici.filter(faite).length,
    prevues: ici.filter((j) => !!j.jour).length,
    depuisDebut: anciens + avant.filter(faite).length + ici.filter(faite).length,
  };
}

/**
 * 1er novembre 2026 : un programme du catalogue en cours avec « Semaines A et B » d'avant allumé et une semaine B
 * copie de la A. L'unification (alternance.ts, unifierAB) ne passait que sur tes programmes à toi : ce cas restait
 * avec deux semaines identiques, sans lettre et sans version B. Vrai : à unifier en « Alterner A et B ».
 */
export function semaineBCopieCatalogue(a: Pick<ProgrammeActif, 'id' | 'semaine'> | null, p: Pick<Programme, 'id'> | null | undefined): boolean {
  if (!a || !p || a.id !== p.id || estProgrammePerso(p.id)) return false;
  const s = a.semaine;
  if (!s || !s.ab || !s.b) return false;
  const b = casesDe(s, 'b');
  return casesDe(s, 'a').every((x, d) => memeRef(x, b[d] ?? null));
}
