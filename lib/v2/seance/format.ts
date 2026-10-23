/**
 * Mise en forme des chiffres et des dates pour la saisie de seance.
 */

/** 75 -> "75", 72.5 -> "72,5" */
export function fmtNum(n: number, digits = 2): string {
  if (!Number.isFinite(n)) return '0';
  const r = Math.round(n * 10 ** digits) / 10 ** digits;
  return String(r).replace('.', ',');
}

/** secondes -> "1:24" ou "1:02:03" */
export function fmtClock(totalSec: number): string {
  const s = Math.max(0, Math.floor(totalSec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
  return `${m}:${String(sec).padStart(2, '0')}`;
}

/** minutes -> "45 min", "1 h 12" */
export function fmtMinutes(min: number): string {
  const m = Math.max(0, Math.round(min));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${String(r).padStart(2, '0')}`;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** date locale -> "2026-10-09" */
export function isoDay(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** date locale -> "18:30" */
export function hhmm(d: Date): string {
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

const DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

/** "2026-10-07" -> "mardi", "hier", "aujourd'hui", "le 3 sept." */
export function relativeDay(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "aujourd'hui";
  if (diff === 1) return 'hier';
  if (diff > 1 && diff < 7) return DAYS[d.getDay()];
  return `le ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function longDay(iso: string): string {
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  return `${DAYS[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

/** "PECTORAUX" -> "Pectoraux" */
export function niceGroup(g?: string): string {
  if (!g) return '';
  const low = g.toLocaleLowerCase('fr-FR');
  return low.charAt(0).toLocaleUpperCase('fr-FR') + low.slice(1);
}

/** Lecture tolerante d'un nombre saisi ("72,5") */
export function parseNum(s: string): number | null {
  const n = parseFloat(String(s).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
}
