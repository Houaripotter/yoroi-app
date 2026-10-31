/**
 * 31 octobre 2026 (Houari ne comprend pas le mot « tonnage ») : le libellé visible devient « Kilos soulevés »
 * partout, avec une petite aide au toucher. Les clés de données (tonnage, tonnageKg) ne changent pas.
 * Le format des chiffres reste celui de lib/v2/trainingWeek.ts (« 12,5 t », « 850 kg ») ; en phrase on écrit
 * « 12,5 t soulevées » ou « 850 kg soulevés » (accordSouleve).
 */
import { traduire } from '@/lib/i18n/tr';

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
