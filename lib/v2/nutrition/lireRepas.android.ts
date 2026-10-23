/**
 * « Mangé aujourd'hui » : lecture des repas dans Health Connect (NutritionRecord), avec l'app qui les a écrits
 * (16 octobre 2026). Un repas porte calories, protéines, glucides et lipides : il devient quatre entrées,
 * l'agrégation et les doublons sont dans ./mange.ts. Autorisation déjà demandée (lecture principale).
 * Ne lève jamais d'erreur : null si Health Connect est absent, [] si rien n'est lisible.
 */
import { Platform } from 'react-native';
import { logger } from '@/lib/security/logger';
import type { EntreeRepas, TypeRepas } from './mange';

export const FOURNISSEUR_REPAS = 'Health Connect';

const deYoroi = (origine: string) => /^com\.houari(24)?\.yoroi/i.test(origine) || /yoroi/i.test(origine);

const avecDelai = <T,>(p: Promise<T>, ms: number): Promise<T | null> =>
  Promise.race([p, new Promise<null>((r) => setTimeout(() => r(null), ms))]);

const CHAMPS: [TypeRepas, (r: any) => number][] = [
  ['kcal', (r) => Number(r?.energy?.inKilocalories)],
  ['proteines', (r) => Number(r?.protein?.inGrams)],
  ['glucides', (r) => Number(r?.totalCarbohydrate?.inGrams)],
  ['lipides', (r) => Number(r?.totalFat?.inGrams)],
];

export async function lireRepas(jours = 7): Promise<EntreeRepas[] | null> {
  if (Platform.OS !== 'android') return null;
  let HC: any = null;
  try {
    HC = require('react-native-health-connect');
  } catch {
    return null;
  }
  if (!HC || typeof HC.readRecords !== 'function') return null;
  const from = new Date();
  from.setDate(from.getDate() - (Math.max(1, jours) - 1));
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  const out: EntreeRepas[] = [];
  try {
    let pageToken: string | undefined;
    for (let page = 0; page < 10; page++) {
      const res: any = await avecDelai(
        Promise.resolve(HC.readRecords('Nutrition', { timeRangeFilter: { operator: 'between', startTime: from.toISOString(), endTime: to.toISOString() }, ...(pageToken ? { pageToken } : {}) })),
        15000,
      );
      for (const r of res?.records ?? []) {
        if (!r?.startTime) continue;
        const origine = String(r?.metadata?.dataOrigin?.packageName ?? r?.metadata?.dataOrigin ?? '');
        if (deYoroi(origine)) continue;
        for (const [type, lire] of CHAMPS) {
          const v = lire(r);
          if (!Number.isFinite(v) || v <= 0) continue;
          out.push({ type, valeur: v, debut: String(r.startTime), fin: r?.endTime ? String(r.endTime) : null, source: origine, sourceId: origine || null, id: r?.metadata?.id ? String(r.metadata.id) : null });
        }
      }
      pageToken = res?.pageToken || undefined;
      if (!pageToken) break;
    }
  } catch (e) {
    logger.info('[Mange] lecture Health Connect impossible', e);
    return out.length ? out : [];
  }
  return out;
}
