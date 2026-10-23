/**
 * Limites de la version gratuite de YOROI : LA source de verite unique.
 * Tout le reste en decoule : PeriodSwitch (courbes), l'ajout d'une competition, les photos de progression,
 * le carnet, et le tableau Gratuit contre Premium du paywall (lib/v2/premium/offer.ts).
 *
 * Regle d'or, jamais negociable : une limite empeche seulement d'AJOUTER plus. Rien n'est cache ni supprime
 * chez quelqu'un qui depasse deja (anciennes donnees, retour a la version gratuite) : il garde tout ce qu'il a.
 * Chaque limite est annoncee a l'endroit concerne, avec un lien doux vers le paywall.
 */

import { traduire } from '@/lib/i18n/tr';
export const FREE_LIMITS = {
  /** periode la plus longue des courbes en version gratuite, en jours (6 mois, 1 an et Tout sont Premium) */
  chartDays: 90,
  /** competitions a venir suivies en meme temps (les passees ne comptent pas) */
  upcomingCompetitions: 3,
  /** photos de progression dans le coffre */
  progressPhotos: 12,
  /** suivis du carnet (records) : sans limite, ils servent le suivi des seances */
  carnetBenchmarks: Number.POSITIVE_INFINITY,
  /** techniques du carnet : sans limite */
  carnetSkills: Number.POSITIVE_INFINITY,
} as const;

export type FreeLimitKey = keyof typeof FREE_LIMITS;

/** Vrai si l'utilisateur peut encore ajouter un element de ce type */
export function canAddMore(isPremium: boolean, key: FreeLimitKey, count: number): boolean {
  if (isPremium) return true;
  return count < FREE_LIMITS[key];
}

/** Texte de la limite, a afficher a l'endroit concerne (null si la limite n'existe pas) */
export function limitNotice(key: FreeLimitKey, count: number): { title: string; text: string } | null {
  const n = FREE_LIMITS[key];
  if (!Number.isFinite(n)) return null;
  switch (key) {
    case 'upcomingCompetitions':
      return {
        title: traduire("{0} compétitions à venir en version gratuite", n),
        text: traduire("Tu en suis déjà {0}, elles restent toutes là. Pour en suivre plus en même temps, passe à Premium, ou attends que l’une d’elles soit passée.", count),
      };
    case 'progressPhotos':
      return {
        title: traduire("{0} photos en version gratuite", n),
        text: traduire("Tes {0} photos restent là et tu peux toujours les comparer. Pour en ajouter d’autres, passe à Premium.", count),
      };
    default:
      return null;
  }
}
