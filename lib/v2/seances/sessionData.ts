/**
 * Outils partages de l'espace Seances v2 : lecture des seances, libelles, couleurs et illustrations.
 */
import type { CombatRound, Exercise, ExerciseSet, Training } from '@/lib/database';
import { getSportCategory, getSportName, getSessionTypeLabel } from '@/lib/sports';
import { accordSouleve, durationOf, formatDuration, formatTonnage, setsCount, tonnage, workSetsOf } from '@/lib/v2/trainingWeek';
import type { UnitePoids } from '@/lib/v2/unitePoids';
import { formatKg } from '@/lib/v2/weightStats';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export const DOW_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];
export const DOW_LONG = [traduire('dimanche'), traduire('lundi'), traduire('mardi'), traduire('mercredi'), traduire('jeudi'), traduire('vendredi'), traduire('samedi')];
/** Jours du planning : 0 = lundi */
export const PLAN_DAYS = [traduire('lundi'), traduire('mardi'), traduire('mercredi'), traduire('jeudi'), traduire('vendredi'), traduire('samedi'), traduire('dimanche')];
export const PLAN_DAYS_SHORT = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
export const MONTHS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];
export const MONTHS_SHORT = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];

const p2 = (n: number) => String(n).padStart(2, '0');

/** Date locale au format AAAA-MM-JJ (sans decalage de fuseau) */
export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
}

export function dateOf(iso: string): Date {
  return new Date(iso.slice(0, 10) + 'T12:00:00');
}

export function addDaysISO(iso: string, n: number): string {
  const d = dateOf(iso);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

export function daysFrom(a: string, b: string): number {
  return Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86400000);
}

/** « mardi 7 octobre » */
export function longDate(iso: string, withYear = false): string {
  const d = dateOf(iso);
  const base = `${DOW_LONG[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return withYear || d.getFullYear() !== new Date().getFullYear() ? `${base} ${d.getFullYear()}` : base;
}

/** « aujourd'hui », « hier », « il y a 12 jours »... */
export function relativeDay(iso: string, today: string): string {
  const n = daysFrom(iso.slice(0, 10), today);
  if (n <= 0) return n === 0 ? traduire('aujourd’hui') : longDate(iso);
  if (n === 1) return 'hier';
  if (n < 14) return traduire("il y a {0} jours", n);
  if (n < 60) return traduire("il y a {0} semaines", Math.round(n / 7));
  if (n < 365) return traduire("il y a {0} mois", Math.round(n / 30));
  const y = Math.round(n / 365);
  return traduirePluriel(y, y > 1, "il y a {0} an", "il y a {0} ans", y);
}

export function firstSport(sport: string | undefined): string {
  return (sport ?? '').split(',')[0].trim();
}

export function sportLabel(sport: string | undefined): string {
  const ids = (sport ?? '').split(',').map((s) => s.trim()).filter(Boolean);
  if (ids.length === 0) return traduire('Séance');
  return ids.map((s) => getSportName(s)).join(' et ');
}

export type SportFamily = 'muscu' | 'combat_sol' | 'combat_pied' | 'cardio' | 'autre';

export function familyOf(sport: string | undefined): SportFamily {
  const id = firstSport(sport);
  const cat = getSportCategory(id);
  if (cat === 'combat_grappling') return 'combat_sol';
  if (cat === 'combat_striking') return 'combat_pied';
  if (cat === 'cardio' || cat === 'aquatique' || cat === 'nature') return 'cardio';
  if (cat === 'fitness') return 'muscu';
  return 'autre';
}

export function isCombat(sport: string | undefined): boolean {
  const f = familyOf(sport);
  return f === 'combat_sol' || f === 'combat_pied';
}

/** Couleur de la tuile de date dans l'historique (maquette S4) */
export function tileColor(sport: string | undefined): string {
  const f = familyOf(sport);
  if (f === 'combat_sol') return '#E9E4D8';
  if (f === 'combat_pied') return '#EEE1DF';
  if (f === 'cardio') return '#E4EADB';
  if (f === 'muscu') return '#E3E6EE';
  return '#E6E4DD';
}

/** Couleur d'accent d'un sport, prise dans la palette validee */
export function familyInk(sport: string | undefined): string {
  const f = familyOf(sport);
  if (f === 'combat_sol') return '#A8832F';
  if (f === 'combat_pied') return '#454A58';
  if (f === 'cardio') return '#6E8C3A';
  if (f === 'muscu') return '#3D5D9E';
  return '#4A4E5A';
}

export function parseExercises(t: Training | null | undefined): Exercise[] {
  const raw = t?.exercises as unknown;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as Exercise[];
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseRounds(t: Training | null | undefined): CombatRound[] {
  const raw = t?.combat_rounds as unknown;
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as CombatRound[];
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function parseStringList(raw: string | undefined | null): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return raw.split(',').map((s) => s.trim()).filter(Boolean);
  }
}

/** Series reelles d'un exercice (les echauffements sont ignores) */
export function workSets(ex: Exercise): ExerciseSet[] {
  // regle unique de lib/v2/trainingWeek (vague 32)
  return workSetsOf(ex);
}

/** Maximum estime sur une repetition (formule d'Epley) */
export function estimatedMax(weight: number, reps: number): number {
  if (!(weight > 0) || !(reps > 0)) return 0;
  if (reps === 1) return weight;
  if (reps > 15) return 0;
  return weight * (1 + reps / 30);
}

/** Titre lisible d'une seance */
export function sessionTitle(t: Training): string {
  // 17 octobre 2026 : sport « Autre », le nom que tu as ecrit (escalade, padel...) sert de titre
  if (t.sport === 'autre' && t.session_type?.trim() && t.session_type.trim().toLowerCase() !== 'autre') return t.session_type.trim();
  const type = t.session_type ? getSessionTypeLabel(t.session_type) : '';
  const name = sportLabel(t.sport);
  // vague 31 : pas de « Course à pied, course » quand le type redit le sport
  const tl = type.toLowerCase();
  const nl = name.toLowerCase();
  if (type && tl !== nl && !nl.includes(tl) && !tl.includes(nl)) return `${name}, ${tl}`;
  return name;
}

/** Resume court sous le titre d'une seance (maquette S4) */
export function sessionMeta(t: Training, unite: UnitePoids = 'kg'): string {
  const parts: string[] = [];
  const d = durationOf(t);
  if (d) parts.push(formatDuration(d));
  const sets = setsCount(t);
  if (sets) parts.push(traduirePluriel(sets, sets > 1, "{0} série", "{0} séries", sets));
  const tons = tonnage(t);
  if (tons >= 100) parts.push(`${formatTonnage(tons, unite)} ${accordSouleve(tons, unite)}`);
  const rounds = parseRounds(t).length || t.rounds || 0;
  if (rounds) parts.push(`${rounds} round${rounds > 1 ? 's' : ''}`);
  if (t.distance) parts.push(`${formatKg(t.distance)} km`);
  if (t.club_name) parts.push(t.club_name);
  if (parts.length === 0 && t.intensity) parts.push(traduire("effort {0} sur 10", t.intensity));
  return parts.join(', ');
}

export function formatPace(secPerKm: number): string {
  if (!secPerKm || secPerKm <= 0 || !isFinite(secPerKm)) return '';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return s === 60 ? `${m + 1}:00` : `${m}:${p2(s)}`;
}

export function formatClock(totalSec: number): string {
  const s = Math.max(0, Math.round(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  return h > 0 ? `${h}:${p2(m)}:${p2(r)}` : `${m}:${p2(r)}`;
}

export function endTime(start?: string, minutes?: number): string {
  if (!start || !minutes) return '';
  const [h, m] = start.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return '';
  const tot = h * 60 + m + minutes;
  return `${p2(Math.floor(tot / 60) % 24)}:${p2(tot % 60)}`;
}

/** Lundi de la semaine en cours, calcule comme useWeeklySlots (meme cle en base) */
export function slotWeekStart(offsetWeeks = 0): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const pad = (n: number) => String(n).padStart(2, '0');
  const base = `${monday.getFullYear()}-${pad(monday.getMonth() + 1)}-${pad(monday.getDate())}`;
  return offsetWeeks === 0 ? base : addDaysISO(base, offsetWeeks * 7);
}

export function plural(n: number, word: string, pluralWord?: string): string {
  return `${n} ${n > 1 ? pluralWord ?? `${word}s` : word}`;
}
