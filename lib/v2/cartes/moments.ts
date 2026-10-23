/**
 * Cartes a partager : quand proposer une carte, une seule fois par moment.
 * - Seance : apres chaque nouvelle seance enregistree (pas une modification), s'il y a au moins un chiffre.
 * - Pesee : quand elle montre un progres vers l'objectif (objectif atteint, palier passe, nouveau plus bas
 *   ou plus haut selon le sens, ou un pas vers l'objectif). Le simple pas vers l'objectif est propose
 *   au plus une fois tous les 7 jours, pour ne jamais devenir lourd.
 * - Semaine : le dimanche a partir de 17 h, ou le lundi matin jusqu'a midi pour la semaine finie,
 *   s'il y a eu au moins une seance.
 * Logique pure, testee dans __tests__/unit/cartesPartage.test.ts.
 */
import { nombre } from './chiffres';
import type { Moment, RaisonPesee } from './types';

export type JournalCartes = {
  /** propositions automatiques coupees dans les reglages */
  auto: boolean;
  /** cles des moments deja proposes */
  vus: string[];
  /** date (AAAA-MM-JJ) de la derniere proposition d'une pesee « simple pas vers l'objectif » */
  dernierPasPesee?: string | null;
};

export const JOURNAL_VIDE: JournalCartes = { auto: true, vus: [] };
export const DELAI_PAS_PESEE_JOURS = 7;
const MAX_VUS = 300;

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function isoJour(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Lundi (AAAA-MM-JJ, heure locale) de la semaine de la date */
export function lundiDe(d: Date): string {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  const dow = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - dow);
  return isoJour(x);
}

export function cleMoment(moment: Moment, id: string | number): string {
  return `${moment}:${id}`;
}

/**
 * La semaine a proposer maintenant, ou null : dimanche des 17 h (la semaine en cours),
 * lundi avant midi (la semaine qui vient de finir).
 */
export function semaineAProposer(now: Date): string | null {
  const dow = now.getDay();
  if (dow === 0 && now.getHours() >= 17) return lundiDe(now);
  if (dow === 1 && now.getHours() < 12) {
    const hier = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 12);
    return lundiDe(hier);
  }
  return null;
}

function joursEntre(a: string, b: string): number {
  const [y1, m1, d1] = a.split('-').map(Number);
  const [y2, m2, d2] = b.split('-').map(Number);
  return Math.round((Date.UTC(y2, m2 - 1, d2) - Date.UTC(y1, m1 - 1, d1)) / 86400000);
}

export type EntreePesee = {
  poids: number;
  /** pesees d'AVANT celle-ci (n'importe quel ordre), poids > 0 */
  historique: number[];
  depart: number | null;
  objectif: number | null;
  /** sens voulu sans objectif chiffre (objectifs de l'onboarding), sinon deduit de l'objectif */
  sens?: 'perte' | 'prise' | null;
};

/** Sens du chemin : celui de l'objectif chiffre s'il existe, sinon celui choisi a l'onboarding */
export function sensDuChemin(e: Pick<EntreePesee, 'depart' | 'objectif' | 'sens'>): 'perte' | 'prise' | null {
  if (e.objectif && e.objectif > 0 && e.depart && e.depart > 0 && Math.abs(e.depart - e.objectif) >= 0.1) {
    return e.objectif < e.depart ? 'perte' : 'prise';
  }
  return e.sens ?? null;
}

/**
 * Ce que la pesee montre de neuf, ou null si elle ne montre pas de progres.
 * Ordre : objectif atteint, palier de 5 kilos passe, nouveau plus bas (ou plus haut), simple pas vers l'objectif.
 */
export function raisonPesee(e: EntreePesee): RaisonPesee | null {
  const sens = sensDuChemin(e);
  const h = e.historique.filter((x) => x > 0);
  if (!sens || !(e.poids > 0) || h.length === 0) return null;
  const prec = h[h.length - 1];
  const bon = (d: number) => (sens === 'perte' ? d <= -0.1 : d >= 0.1);
  const d = e.poids - prec;

  // objectif atteint, et pas deja atteint a la pesee d'avant
  if (e.objectif && e.objectif > 0) {
    const atteint = (w: number) => (sens === 'perte' ? w <= e.objectif! + 0.05 : w >= e.objectif! - 0.05);
    if (atteint(e.poids) && !atteint(prec)) return { type: 'objectif', texte: 'Objectif atteint' };
  }
  if (!bon(d)) return null;

  // palier : une dizaine ou une demi-dizaine de kilos franchie dans le bon sens (90, 85, 80...)
  const pal = sens === 'perte' ? Math.floor(prec / 5) * 5 : Math.ceil(prec / 5) * 5;
  const franchi = sens === 'perte' ? prec >= pal + 0.05 && e.poids < pal : prec <= pal - 0.05 && e.poids >= pal;
  if (franchi && pal > 0) {
    return { type: 'palier', texte: sens === 'perte' ? `Sous les ${pal} kg` : `${pal} kg passés` };
  }
  // palier de chemin : 5, 10, 15 kilos depuis le depart
  if (e.depart && e.depart > 0) {
    const avant = Math.abs(prec - e.depart);
    const apres = Math.abs(e.poids - e.depart);
    const etape = Math.floor(apres / 5) * 5;
    const dansLeBonSens = sens === 'perte' ? e.poids < e.depart : e.poids > e.depart;
    if (dansLeBonSens && etape >= 5 && avant < etape) {
      return { type: 'palier', texte: `${etape} kg ${sens === 'perte' ? 'perdus' : 'pris'}` };
    }
  }
  // nouveau plus bas (ou plus haut) sur au moins 3 pesees d'avant
  if (h.length >= 3) {
    const ext = sens === 'perte' ? Math.min(...h) : Math.max(...h);
    if (sens === 'perte' ? e.poids <= ext - 0.1 : e.poids >= ext + 0.1) {
      return sens === 'perte' ? { type: 'plus_bas', texte: 'Ton plus bas' } : { type: 'plus_haut', texte: 'Ton plus haut' };
    }
  }
  return { type: 'progres', texte: `${nombre(Math.abs(d), 1)} kg ${sens === 'perte' ? 'de moins' : 'de plus'}` };
}

/**
 * Vrai si la proposition automatique peut s'afficher pour ce moment :
 * reglage actif, moment jamais propose, et pour un simple pas de pesee, pas plus d'une fois en 7 jours.
 */
export function peutProposer(j: JournalCartes, cle: string, opts?: { raison?: RaisonPesee | null; aujourdhui?: string }): boolean {
  if (!j.auto) return false;
  if (j.vus.includes(cle)) return false;
  if (cle.startsWith('pesee:')) {
    if (!opts?.raison) return false;
    if (opts.raison.type === 'progres' && j.dernierPasPesee && opts.aujourdhui) {
      if (joursEntre(j.dernierPasPesee, opts.aujourdhui) < DELAI_PAS_PESEE_JOURS) return false;
    }
  }
  return true;
}

/** Journal apres une proposition montree (une seule fois par moment) */
export function noterProposition(j: JournalCartes, cle: string, opts?: { raison?: RaisonPesee | null; aujourdhui?: string }): JournalCartes {
  const vus = j.vus.includes(cle) ? j.vus : [...j.vus, cle].slice(-MAX_VUS);
  const dernierPasPesee = cle.startsWith('pesee:') && opts?.raison?.type === 'progres' && opts.aujourdhui ? opts.aujourdhui : j.dernierPasPesee ?? null;
  return { ...j, vus, dernierPasPesee };
}
