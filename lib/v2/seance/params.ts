/**
 * Parametres de la saisie de seance. Accepte aussi ceux de l'ancienne saisie
 * (add-training, add-combat-session, quick-log, planning) pour que tous les liens de l'app marchent.
 */
import type { CombatRound } from '@/lib/database';
import { mondayOf } from '@/lib/v2/trainingWeek';
import { isoDay } from './format';
import type { SessionDetails } from './model';

export type RawParams = Record<string, string | string[] | undefined>;

export type SeanceParams = {
  sport?: string;
  editId?: number;
  slotId?: number;
  repeatId?: number;
  date?: string;
  time?: string;
  duration?: number;
  clubId?: number;
  rounds?: number;
  intensity?: number;
  sessionType?: string;
  notes?: string;
  label?: string;
  resume?: boolean;
  form?: boolean;
};

function one(v: string | string[] | undefined): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (s === undefined || s === null) return undefined;
  const t = String(s).trim();
  return t && t !== 'undefined' && t !== 'null' ? t : undefined;
}

function int(v: string | string[] | undefined): number | undefined {
  const s = one(v);
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function validDay(s?: string): string | undefined {
  if (!s) return undefined;
  const d = s.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return undefined;
  const t = new Date(d + 'T12:00:00');
  if (isNaN(t.getTime()) || t.getFullYear() < 2000 || t.getFullYear() > 2100) return undefined;
  return d;
}

function validTime(s?: string): string | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d{1,2})[:h](\d{2})/);
  if (!m) return undefined;
  const h = Number(m[1]);
  const mi = Number(m[2]);
  if (h > 23 || mi > 59) return undefined;
  return `${String(h).padStart(2, '0')}:${String(mi).padStart(2, '0')}`;
}

/** Types de seance de la saisie express et de l'ancienne saisie vers les ids de la saisie de combat */
const TYPE_ALIASES: Record<string, string> = { sparring: 'guerre', drilling: 'technique', cours: 'entrainement', open_mat: 'openmat' };

/** Id de la saisie de combat pour un ancien nom de type (sparring, drilling...), sinon le nom tel quel */
export function aliasTypeSeance(t: string): string {
  return TYPE_ALIASES[t] ?? t;
}

/** Lit les parametres, nouveaux et anciens noms confondus */
export function readParams(raw: RawParams): SeanceParams {
  const intensity = int(raw.intensity);
  return {
    sport: one(raw.sport) ?? one(raw.prefillSport),
    editId: int(raw.editId),
    slotId: int(raw.slotId),
    repeatId: int(raw.repeatId),
    date: validDay(one(raw.date)),
    time: validTime(one(raw.time) ?? one(raw.prefillTime)),
    duration: int(raw.duration) ?? int(raw.prefillDuration),
    clubId: int(raw.clubId) ?? int(raw.prefillClubId),
    rounds: int(raw.rounds),
    intensity: intensity && intensity <= 10 ? intensity : undefined,
    sessionType: ((t) => (t ? TYPE_ALIASES[t] ?? t : undefined))(one(raw.type) ?? one(raw.sessionType)),
    notes: one(raw.notes),
    label: one(raw.label),
    resume: one(raw.resume) === '1',
    form: one(raw.form) === '1',
  };
}

/** Parametres a transmettre a un autre ecran de saisie */
export function toQuery(p: SeanceParams): Record<string, string> {
  const q: Record<string, string> = {};
  if (p.sport) q.sport = p.sport;
  if (p.editId) q.editId = String(p.editId);
  if (p.slotId) q.slotId = String(p.slotId);
  if (p.repeatId) q.repeatId = String(p.repeatId);
  if (p.date) q.date = p.date;
  if (p.time) q.time = p.time;
  if (p.duration) q.duration = String(p.duration);
  if (p.clubId) q.clubId = String(p.clubId);
  if (p.rounds) q.rounds = String(p.rounds);
  if (p.intensity) q.intensity = String(p.intensity);
  if (p.sessionType) q.type = p.sessionType;
  if (p.notes) q.notes = p.notes;
  if (p.label) q.label = p.label;
  if (p.form) q.form = '1';
  return q;
}

export function minutesOf(time?: string): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
}

/**
 * Saisie apres coup (sans chrono) : modification, autre jour qu'aujourd'hui,
 * saisie express avec une duree, ou creneau du jour deja termine.
 */
export function wantsForm(p: SeanceParams, now = new Date()): boolean {
  if (p.form || p.editId) return true;
  const today = isoDay(now);
  if (p.date && p.date !== today) return true;
  if (p.duration && !p.slotId) return true;
  if (p.slotId && p.time) {
    const start = minutesOf(p.time);
    const nowMin = now.getHours() * 60 + now.getMinutes();
    if (start !== null && start + (p.duration ?? 60) <= nowMin) return true;
  }
  return false;
}

/**
 * Lundi de la semaine d'un jour, en date locale (cle des creneaux du planning).
 * Le calcul se fait a midi heure locale : jamais de decalage UTC autour de minuit.
 */
export function weekStartOf(day: string): string {
  return mondayOf(day);
}

/** Details de depart : la date et l'heure du parametre, sinon maintenant */
export function initialDetails(p: SeanceParams, fallbackDuration = 60, now = new Date()): SessionDetails {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const duration = p.duration ?? fallbackDuration;
  const fromParam = minutesOf(p.time);
  const start = fromParam ?? Math.max(0, Math.floor((nowMin - duration) / 15) * 15);
  return {
    date: p.date ?? isoDay(now),
    startMin: start,
    duration,
    clubId: p.clubId ?? null,
    clubFixe: p.clubId !== undefined,
    outdoor: false,
    place: '',
    lat: null,
    lon: null,
    technique: null,
  };
}

/** "HH:MM" depuis des minutes */
export function timeOf(min: number): string {
  const m = Math.max(0, Math.min(23 * 60 + 59, Math.round(min)));
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

/**
 * Rounds lus en base : un vrai tableau. L'ancienne saisie de combat les encodait deux fois
 * (une chaine JSON dans la chaine JSON) : on decode tant que c'est une chaine.
 */
export function normalizeRounds(v: unknown): CombatRound[] | undefined {
  let cur: unknown = v;
  for (let i = 0; i < 3 && typeof cur === 'string'; i += 1) {
    try {
      cur = JSON.parse(cur);
    } catch {
      return undefined;
    }
  }
  if (!Array.isArray(cur)) return undefined;
  return cur.filter((r): r is CombatRound => !!r && typeof r === 'object' && typeof (r as CombatRound).number === 'number');
}
