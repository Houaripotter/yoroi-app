/**
 * Ton programme en cours (24 octobre 2026) : lequel, depuis quand, quel jour vient ensuite.
 * Stocke sur le telephone (AsyncStorage), rien ne sort. Un seul programme a la fois.
 * Chaque changement previent les ecrans qui l'affichent (evenement PROGRAMME_CHANGED_EVENT).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { programmeParId } from './catalogue';
import { TOUT_LE_MATERIEL } from './materiel';
import type { Equipement } from './materiel';
import type { JourProgramme, Programme } from './types';
import { joursValides } from './coach';

const CLE = 'yoroi_programme_actif_v1';
export const PROGRAMME_CHANGED_EVENT = 'YOROI_PROGRAMME_CHANGED';

export type JourFait = { date: string; jourId: string; trainingId?: number };

export type ProgrammeActif = {
  id: string;
  /** jour de depart, date locale "2026-10-24" */
  debut: string;
  /** index du prochain jour dans programme.jours */
  prochain: number;
  faits: JourFait[];
  /** semaine legere en cours : dernier jour inclus, date locale */
  legereJusquau?: string;
  /** debuts des semaines legeres deja faites */
  legeres?: string[];
  /** 25 octobre 2026 : tes jours d'entrainement, 0 = lundi (lib/v2/programmes/coach.ts) ; absents, les jours conseilles */
  jours?: number[];
};

function jourLocal(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function prevenir() {
  try {
    DeviceEventEmitter.emit(PROGRAMME_CHANGED_EVENT);
  } catch {
    // rien a faire
  }
}

export async function chargerProgrammeActif(): Promise<ProgrammeActif | null> {
  try {
    const raw = await AsyncStorage.getItem(CLE);
    if (!raw) return null;
    const a = JSON.parse(raw) as ProgrammeActif;
    const p = a && programmeParId(a.id);
    if (!p) return null;
    return { ...a, prochain: Math.min(Math.max(0, a.prochain | 0), p.jours.length - 1), faits: Array.isArray(a.faits) ? a.faits : [] };
  } catch {
    return null;
  }
}

async function ecrire(a: ProgrammeActif | null): Promise<void> {
  try {
    if (a) await AsyncStorage.setItem(CLE, JSON.stringify(a));
    else await AsyncStorage.removeItem(CLE);
  } catch {
    // stockage indisponible : rien n'est perdu cote seances
  }
  prevenir();
}

export async function demarrerProgramme(id: string, jours?: number[]): Promise<ProgrammeActif | null> {
  if (!programmeParId(id)) return null;
  const choisis = joursValides(jours);
  const a: ProgrammeActif = { id, debut: jourLocal(), prochain: 0, faits: [], ...(choisis ? { jours: choisis } : {}) };
  await ecrire(a);
  return a;
}

/** Tes jours d'entrainement changent (0 = lundi) */
export async function enregistrerJours(jours: number[]): Promise<void> {
  const a = await chargerProgrammeActif();
  const choisis = joursValides(jours);
  if (!a || !choisis) return;
  await ecrire({ ...a, jours: choisis });
}

/** Tes jours d'entrainement : ceux que tu as choisis, sinon les jours conseilles du programme */
export function joursDuProgramme(a: ProgrammeActif | null, p: Programme): number[] {
  return joursValides(a?.jours) ?? joursConseilles(p.joursParSemaine);
}

export async function arreterProgramme(): Promise<void> {
  await ecrire(null);
}

/** Choisir toi-meme le prochain jour (tu as saute une seance, tu veux faire les jambes aujourd'hui...) */
export async function choisirProchainJour(index: number): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p) return;
  await ecrire({ ...a, prochain: Math.min(Math.max(0, index), p.jours.length - 1) });
}

/** Une seance du programme est enregistree : le jour suivant devient le prochain */
export async function marquerJourFait(programmeId: string, jourId: string, trainingId?: number, date?: string): Promise<void> {
  const a = await chargerProgrammeActif();
  const p = a && programmeParId(a.id);
  if (!a || !p || a.id !== programmeId) return;
  const idx = p.jours.findIndex((j) => j.id === jourId);
  if (idx < 0) return;
  // la date de la seance (saisie apres coup) compte, pas celle de l'enregistrement
  const jour = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : jourLocal();
  const faits = [...a.faits, { date: jour, jourId, ...(trainingId ? { trainingId } : {}) }].slice(-400);
  await ecrire({ ...a, faits, prochain: (idx + 1) % p.jours.length });
}

/** Semaine du programme (1 la premiere semaine) */
export function semaineDuProgramme(a: ProgrammeActif, aujourdhui = new Date()): number {
  const d = new Date(a.debut + 'T12:00:00');
  const t = new Date(jourLocal(aujourdhui) + 'T12:00:00');
  const jours = Math.max(0, Math.round((t.getTime() - d.getTime()) / 86400000));
  return Math.floor(jours / 7) + 1;
}

/** Seances du programme faites cette semaine (du lundi au dimanche) */
export function faitsCetteSemaine(a: ProgrammeActif, aujourdhui = new Date()): number {
  const t = new Date(jourLocal(aujourdhui) + 'T12:00:00');
  const lundi = new Date(t.getTime() - ((t.getDay() + 6) % 7) * 86400000);
  const debut = jourLocal(lundi);
  return a.faits.filter((f) => f.date >= debut).length;
}

export function prochainJour(a: ProgrammeActif): { programme: Programme; jour: JourProgramme; index: number } | null {
  const p = programmeParId(a.id);
  if (!p) return null;
  const index = Math.min(a.prochain, p.jours.length - 1);
  return { programme: p, jour: p.jours[index], index };
}

export function plusJours(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00');
  return jourLocal(new Date(d.getTime() + n * 86400000));
}

/** Semaine legere en cours aujourd'hui */
export function estSemaineLegere(a: ProgrammeActif, aujourdhui = new Date()): boolean {
  return !!a.legereJusquau && jourLocal(aujourdhui) <= a.legereJusquau;
}

/**
 * Proposer une semaine legere : toutes les 4 a 8 semaines (Bell 2025). YOROI la propose a partir de la
 * 5e semaine du programme, puis 4 semaines apres la derniere semaine legere.
 */
export function proposerSemaineLegere(a: ProgrammeActif, aujourdhui = new Date()): boolean {
  if (estSemaineLegere(a, aujourdhui)) return false;
  const derniere = (a.legeres ?? []).slice(-1)[0] ?? a.debut;
  const jours = Math.round((new Date(jourLocal(aujourdhui) + 'T12:00:00').getTime() - new Date(derniere + 'T12:00:00').getTime()) / 86400000);
  return jours >= 28;
}

/** Sept jours plus legers a partir d'aujourd'hui */
export async function activerSemaineLegere(): Promise<void> {
  const a = await chargerProgrammeActif();
  if (!a) return;
  const auj = jourLocal();
  await ecrire({ ...a, legereJusquau: plusJours(auj, 6), legeres: [...(a.legeres ?? []), auj].slice(-50) });
}

export async function arreterSemaineLegere(): Promise<void> {
  const a = await chargerProgrammeActif();
  if (!a) return;
  const { legereJusquau: _fin, ...reste } = a;
  await ecrire(reste);
}

/* ------------------------------------------------------------------------------------------------
 * Mon materiel (24 octobre 2026) : ce que tu as, pour remplacer les exercices impossibles (./materiel.ts).
 * null : jamais renseigne, les programmes restent tels quels.
 * ---------------------------------------------------------------------------------------------- */
const CLE_MATERIEL = 'yoroi_materiel_v1';

export async function chargerMateriel(): Promise<Equipement[] | null> {
  try {
    const raw = await AsyncStorage.getItem(CLE_MATERIEL);
    if (!raw) return null;
    const liste = JSON.parse(raw);
    if (!Array.isArray(liste)) return null;
    return liste.filter((e): e is Equipement => TOUT_LE_MATERIEL.includes(e));
  } catch {
    return null;
  }
}

export async function enregistrerMateriel(liste: Equipement[] | null): Promise<void> {
  try {
    if (liste) await AsyncStorage.setItem(CLE_MATERIEL, JSON.stringify(Array.from(new Set(liste))));
    else await AsyncStorage.removeItem(CLE_MATERIEL);
  } catch {
    // stockage indisponible : les programmes restent tels quels
  }
  prevenir();
}

/** Le materiel par defaut selon le lieu du questionnaire */
export function materielDuLieu(lieu: 'salle' | 'maison' | 'halteres'): Equipement[] {
  if (lieu === 'maison') return [];
  if (lieu === 'halteres') return ['halteres', 'banc'];
  return [...TOUT_LE_MATERIEL];
}

/* ------------------------------------------------------------------------------------------------
 * Le message du jour (24 octobre 2026) : « Aujourd'hui : Pectoraux... » a l'heure des rappels de seance.
 * Le texte vient du programme (lancer.ts, messageDuJour) ; la programmation reste celle des rappels de
 * seance (lib/notificationService.ts), sans doublon.
 * ---------------------------------------------------------------------------------------------- */

/** Pour les rappels : la seance prevue pour chacune des prochaines dates (le programme tourne dans l'ordre) */
export function seancesAVenir(a: ProgrammeActif, n: number): { programme: Programme; jour: JourProgramme; semaine: number }[] {
  const p = programmeParId(a.id);
  if (!p) return [];
  const out: { programme: Programme; jour: JourProgramme; semaine: number }[] = [];
  for (let k = 0; k < n; k++) out.push({ programme: p, jour: p.jours[(a.prochain + k) % p.jours.length], semaine: semaineDuProgramme(a) });
  return out;
}

/** Jours conseilles (0 = lundi) pour recevoir le message, selon les jours par semaine du programme */
export function joursConseilles(joursParSemaine: number): number[] {
  if (joursParSemaine <= 2) return [1, 3];
  if (joursParSemaine === 3) return [0, 2, 4];
  if (joursParSemaine === 4) return [0, 1, 3, 4];
  return [0, 1, 2, 3, 4, 5].slice(0, Math.min(6, joursParSemaine));
}
