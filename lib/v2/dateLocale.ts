/**
 * Jour local AAAA-MM-JJ (30 octobre 2026), sans dependance : pour les anciens services qui prenaient
 * toISOString().slice(0, 10), c'est a dire le jour UTC (la veille entre minuit et 1 h ou 2 h en France,
 * le lendemain le soir en Amerique). Teste dans __tests__/unit/dateLocale.test.ts.
 */
const pad = (n: number) => String(n).padStart(2, '0');

/** Le jour local d'une date (aujourd'hui par defaut) */
export function jourLocalIso(d: Date = new Date()): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Le jour local d'une valeur enregistree : une date seule « AAAA-MM-JJ » reste telle quelle (jamais decalee),
 * un horodatage complet passe en heure locale. Valeur illisible : chaine vide.
 */
export function jourDe(v: string | number | Date | null | undefined): string {
  if (v == null || v === '') return '';
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const t = v instanceof Date ? v : new Date(v);
  return Number.isFinite(t.getTime()) ? jourLocalIso(t) : '';
}

/** Le jour local decale de n jours (n negatif : avant) */
export function jourLocalDecale(n: number, d: Date = new Date()): string {
  return jourLocalIso(new Date(d.getFullYear(), d.getMonth(), d.getDate() + n, 12));
}

/** « AAAA-MM-JJ » vers minuit local de ce jour (new Date('AAAA-MM-JJ') donne minuit UTC, la veille en Amerique) */
export function minuitLocalDe(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? ''));
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(iso);
}
