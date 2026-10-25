/**
 * Lecture des vraies données pour le bilan de la semaine ou du mois (./periode.ts). Rien n'est écrit.
 */
import { getTrainings, getWeights } from '@/lib/database';
import type { Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { getEspace, objectifVise } from '@/lib/v2/espace';
import { loadMeasures } from '@/lib/v2/progres/measures';
import type { MeasurePoint } from '@/lib/v2/progres/measures';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';
import { toDailySeries } from '@/lib/v2/weightStats';

export type DonneesPeriode = {
  trainings: Training[];
  pesees: { date: string; value: number }[];
  mesures: MeasurePoint[];
  parSemaine: number;
};

export async function chargerDonneesPeriode(): Promise<DonneesPeriode> {
  const [trainings, pesees, mesures, parSemaine] = await Promise.all([
    getTrainings()
      .then((l) => dedupeTrainings(l ?? []))
      .catch((e) => {
        logger.warn('[bilan période] séances', e);
        return [] as Training[];
      }),
    getWeights()
      .then((w) => toDailySeries(w ?? []).map((d) => ({ date: d.date, value: d.value })))
      .catch((e) => {
        logger.warn('[bilan période] pesées', e);
        return [];
      }),
    loadMeasures().catch(() => [] as MeasurePoint[]),
    getEspace()
      .then(objectifVise)
      .catch(() => 0),
  ]);
  return { trainings, pesees, mesures, parSemaine };
}
