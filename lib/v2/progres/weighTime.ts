/**
 * Heure d'une pesee, pour distinguer deux pesees du meme jour.
 * Lit l'heure dans la date (AAAA-MM-JJTHH:MM) ou, a defaut, dans created_at.
 */
import type { Weight } from '@/lib/database';

function hhmm(raw: string | undefined, utc: boolean): string | null {
  if (!raw) return null;
  const m = raw.match(/[T ](\d{2}):(\d{2})/);
  if (!m) return null;
  let h = Number(m[1]);
  let min = Number(m[2]);
  if (utc && !/[+-]\d{2}:?\d{2}$/.test(raw)) {
    // created_at de SQLite est en temps universel
    const d = new Date(Date.UTC(2000, 0, 1, h, min));
    h = d.getHours();
    min = d.getMinutes();
  }
  if (h === 0 && min === 0) return null;
  return `${h} h ${String(min).padStart(2, '0')}`;
}

export function weighTime(w: Weight): string | null {
  return hhmm(w.date, false) ?? hhmm(w.created_at, true);
}

/** Jours qui comptent plus d'une pesee (cle AAAA-MM-JJ) */
export function daysWithSeveral(list: Weight[]): Set<string> {
  const n = new Map<string, number>();
  list.forEach((w) => {
    const d = w.date.slice(0, 10);
    n.set(d, (n.get(d) ?? 0) + 1);
  });
  return new Set(Array.from(n.entries()).filter(([, k]) => k > 1).map(([d]) => d));
}

/** « à 7 h 40 », ou « 1re pesée » et « 2e pesée » quand l'heure manque */
export function sameDayTag(w: Weight, list: Weight[]): string {
  const t = weighTime(w);
  if (t) return `à ${t}`;
  const day = w.date.slice(0, 10);
  const same = list.filter((x) => x.date.slice(0, 10) === day).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const i = same.indexOf(w) + 1;
  return i <= 1 ? '1re pesée du jour' : `${i}e pesée du jour`;
}
