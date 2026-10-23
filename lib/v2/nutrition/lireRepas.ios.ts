/**
 * « Mangé aujourd'hui » : lecture des repas dans Apple Santé, entrée par entrée, avec l'app qui les a écrits
 * (16 octobre 2026). Les totaux par jour d'Apple ne disent pas quelle app a écrit, ni si une app a écrit
 * deux fois : on lit donc les échantillons, l'agrégation et les doublons sont dans ./mange.ts.
 * Mêmes types que la lecture principale (lib/v2/sante/typesSante.ts) : aucune nouvelle autorisation.
 * Ne lève jamais d'erreur : null si Santé est absent, [] si rien n'est lisible.
 */
import HealthKit, { isHealthKitAvailable, isRunningInExpoGo } from '@/lib/healthKit.wrapper';
import { logger } from '@/lib/security/logger';
import type { EntreeRepas, TypeRepas } from './mange';

const TYPES: [TypeRepas, string, string][] = [
  ['kcal', 'HKQuantityTypeIdentifierDietaryEnergyConsumed', 'kcal'],
  ['proteines', 'HKQuantityTypeIdentifierDietaryProtein', 'g'],
  ['glucides', 'HKQuantityTypeIdentifierDietaryCarbohydrates', 'g'],
  ['lipides', 'HKQuantityTypeIdentifierDietaryFatTotal', 'g'],
];

const deYoroi = (bundle: string, nom: string) => /^com\.houari(24)?\.yoroi/i.test(bundle) || /yoroi/i.test(nom);

const avecDelai = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

export const FOURNISSEUR_REPAS = 'Apple Santé';

export async function lireRepas(jours = 7): Promise<EntreeRepas[] | null> {
  if (!isHealthKitAvailable || isRunningInExpoGo || typeof (HealthKit as any)?.queryQuantitySamples !== 'function') return null;
  const from = new Date();
  from.setDate(from.getDate() - (Math.max(1, jours) - 1));
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  const out: EntreeRepas[] = [];
  await Promise.all(
    TYPES.map(async ([type, id, unit]) => {
      try {
        const rows: any[] | null = await avecDelai(
          Promise.resolve((HealthKit as any).queryQuantitySamples(id, { filter: { date: { startDate: from, endDate: to } }, limit: 0, ascending: true, unit })),
          15000,
        );
        for (const s of rows ?? []) {
          const v = Number(s?.quantity);
          if (!s?.startDate || !Number.isFinite(v) || v <= 0) continue;
          const bundle = String(s?.sourceRevision?.source?.bundleIdentifier ?? '');
          const nom = String(s?.sourceRevision?.source?.name ?? '');
          if (deYoroi(bundle, nom)) continue;
          out.push({
            type,
            valeur: v,
            debut: new Date(s.startDate).toISOString(),
            fin: s?.endDate ? new Date(s.endDate).toISOString() : null,
            source: nom || bundle,
            sourceId: bundle || nom || null,
            id: s?.uuid ? String(s.uuid) : null,
          });
        }
      } catch (e) {
        logger.info(`[Mange] lecture ${id} impossible`, e);
      }
    }),
  );
  return out;
}
