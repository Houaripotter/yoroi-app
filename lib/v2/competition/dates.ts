/**
 * Dates des competitions et objectifs : lecture en heure locale, ecarts en jours, libelles francais.
 */
import { traduire } from '@/lib/i18n/tr';
const MONTHS = [traduire('janvier'), traduire('février'), traduire('mars'), traduire('avril'), traduire('mai'), traduire('juin'), traduire('juillet'), traduire('août'), traduire('septembre'), traduire('octobre'), traduire('novembre'), traduire('décembre')];
const MONTHS_SHORT = ['janv.', traduire('févr.'), traduire('mars'), 'avr.', traduire('mai'), traduire('juin'), 'juil.', traduire('août'), 'sept.', 'oct.', 'nov.', traduire('déc.')];
const DAYS = [traduire('dimanche'), traduire('lundi'), traduire('mardi'), traduire('mercredi'), traduire('jeudi'), traduire('vendredi'), traduire('samedi')];
const DAYS_SHORT = ['dim.', 'lun.', 'mar.', 'mer.', 'jeu.', 'ven.', 'sam.'];

/** "AAAA-MM-JJ" lu en heure locale (new Date() le lirait en UTC) */
export function parseLocalDate(d: string | undefined | null): Date {
  if (!d) return new Date(NaN);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(d);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(d);
}

export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function startOfToday(): Date {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return t;
}

/** Jours entre aujourd'hui et la date (negatif si passee) */
export function daysUntil(d: string | Date): number {
  const target = typeof d === 'string' ? parseLocalDate(d) : new Date(d);
  target.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - startOfToday().getTime()) / 86400000);
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function longDate(d: Date, withYear = true): string {
  if (isNaN(d.getTime())) return '';
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
}

export function mediumDate(d: Date, withYear = true): string {
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
}

export function shortDate(d: Date): string {
  if (isNaN(d.getTime())) return '';
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

export function dayShort(d: Date): string {
  return DAYS_SHORT[d.getDay()];
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** Titre en majuscules de l'ancien contenu vers une casse de phrase */
export function sentenceCase(s: string): string {
  if (!s) return s;
  if (s !== s.toUpperCase()) return s;
  const low = s.toLowerCase();
  return low.charAt(0).toUpperCase() + low.slice(1);
}

/** "dans 12 jours", "demain", "aujourd'hui", "il y a 3 jours" */
export function relativeDays(n: number): string {
  if (n === 0) return "aujourd'hui";
  if (n === 1) return traduire('demain');
  if (n === -1) return 'hier';
  if (n > 1) return traduire("dans {0} jours", n);
  return traduire("il y a {0} jours", -n);
}

export function plural(n: number, one: string, many?: string): string {
  return `${n} ${Math.abs(n) > 1 ? many ?? `${one}s` : one}`;
}
