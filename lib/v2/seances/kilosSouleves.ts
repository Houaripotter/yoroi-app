/**
 * 31 octobre 2026 (Houari ne comprend pas le mot « tonnage ») : le libellé visible devient « Kilos soulevés »
 * partout, avec une petite aide au toucher. Les clés de données (tonnage, tonnageKg) ne changent pas.
 * Le format des chiffres reste celui de lib/v2/trainingWeek.ts (« 12,5 t », « 850 kg ») ; en phrase on écrit
 * « 12,5 t soulevées » ou « 850 kg soulevés » (accordSouleve).
 */
import { traduire } from '@/lib/i18n/tr';
import type { UnitePoids } from '@/lib/v2/unitePoids';

/** Le libellé d'une tuile ou d'un chiffre : « Kilos soulevés » */
export function libelleKilos(): string {
  return traduire('Kilos soulevés');
}

/** L'aide au toucher, pour une séance ou pour une semaine */
export function aideKilos(periode: 'seance' | 'semaine' = 'seance'): string {
  return periode === 'semaine'
    ? traduire('Le total de tous tes poids × répétitions de la semaine')
    : traduire('Le total de tous tes poids × répétitions de la séance');
}

/**
 * 3 novembre 2026 (Houari) : à côté des tonnes, le même total en kilos (« 12,4 t · 12 400 kg »). Seulement quand le
 * total s'affiche en tonnes (1 000 kg et plus, réglage kg) ; en livres ou sous la tonne, rien : le chiffre est déjà
 * en entier. Les milliers séparés par une espace insécable, comme les autres chiffres de l'app.
 */
export function kilosEnEntier(kg: number, unite: UnitePoids = 'kg'): string | null {
  const v = Math.round(Math.max(0, kg || 0));
  if (unite !== 'kg' || v < 1000) return null;
  return `${String(v).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0')}\u00A0kg`;
}
