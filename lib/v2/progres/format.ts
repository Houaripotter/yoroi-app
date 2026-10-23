/**
 * Petits formats partages par les ecrans Progres (refonte v2).
 */

const MONTHS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const MONTHS_SHORT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function isoOf(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function dateOf(iso: string): Date {
  return new Date(iso.slice(0, 10) + 'T12:00:00');
}

export function shiftDays(iso: string, days: number): string {
  const d = dateOf(iso);
  d.setDate(d.getDate() + days);
  return isoOf(d);
}

export function daysDiff(a: string, b: string): number {
  return Math.round((dateOf(b).getTime() - dateOf(a).getTime()) / 86400000);
}

/** 1 décimale, virgule française, sans ,0 inutile si round */
export function num(v: number, digits = 1, trimZero = true): string {
  const s = v.toFixed(digits).replace('.', ',');
  if (trimZero && digits > 0 && /,0+$/.test(s)) return s.replace(/,0+$/, '');
  return s;
}

export function thousands(v: number): string {
  return Math.round(v)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

export function monthLong(iso: string): string {
  return MONTHS[dateOf(iso).getMonth()];
}

export function monthShort(iso: string): string {
  return MONTHS_SHORT[dateOf(iso).getMonth()];
}

export function monthShortIdx(i: number): string {
  return MONTHS_SHORT[i];
}

/** « mardi 7 octobre » */
export function dayLong(iso: string): string {
  const d = dateOf(iso);
  return `${DAYS[d.getDay()]} ${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** « 7 oct. 2026 » */
export function dayShort(iso: string, withYear = false): string {
  const d = dateOf(iso);
  return `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}${withYear ? ` ${d.getFullYear()}` : ''}`;
}

/** « depuis le 1er juillet » */
export function sinceText(iso: string): string {
  const d = dateOf(iso);
  const thisYear = new Date().getFullYear();
  return `depuis le ${d.getDate() === 1 ? '1er' : d.getDate()} ${MONTHS[d.getMonth()]}${d.getFullYear() !== thisYear ? ` ${d.getFullYear()}` : ''}`;
}

export function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

export function todayIso(): string {
  return isoOf(new Date());
}

/** Lecture d'un nombre saisi au clavier (virgule ou point) */
export function parseInput(s: string, min = 0, max = 1000): number | undefined {
  const n = parseFloat((s || '').replace(',', '.'));
  return Number.isFinite(n) && n > min && n < max ? n : undefined;
}

export function plural(n: number, one: string, many: string): string {
  return Math.abs(n) >= 2 ? many : one;
}
