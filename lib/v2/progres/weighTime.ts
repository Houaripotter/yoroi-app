/**
 * Heure d'une pesee, pour distinguer deux pesees du meme jour.
 * Lit l'heure dans la date (AAAA-MM-JJTHH:MM) ou, a defaut, dans created_at (seulement s'il tombe ce jour-la).
 */
import type { Weight } from '@/lib/database';
import { traduire } from '@/lib/i18n/tr';
import { heurePesee } from '@/lib/v2/pesee/poidsDuJour';

/** 28 octobre 2026 : meme lecture de l'heure que le poids du jour (lib/v2/pesee/poidsDuJour.ts) */
export function weighTime(w: Weight): string | null {
  const t = heurePesee(w);
  return t ? `${t.h} h ${String(t.m).padStart(2, '0')}` : null;
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
  if (t) return traduire("à {0}", t);
  const day = w.date.slice(0, 10);
  const same = list.filter((x) => x.date.slice(0, 10) === day).sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
  const i = same.indexOf(w) + 1;
  return i <= 1 ? traduire('1re pesée du jour') : traduire("{0}e pesée du jour", i);
}
