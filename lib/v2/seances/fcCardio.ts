/**
 * FC moyenne pendant le cardio de fin de seance (31 octobre 2026), lue dans Apple Sante (la montre y ecrit ses
 * mesures). Seulement sur iPhone, hors Expo Go, avec l'acces deja donne : sinon null, et le bilan propose le test
 * de la parole a la place (zone2.ts). Rien n'est estime : il faut au moins 3 mesures dans la fenetre du cardio.
 */
import { Platform } from 'react-native';

export const MESURES_MIN = 3;

/** Moyenne de mesures plausibles (40 a 230 bpm), null s'il y en a moins de MESURES_MIN */
export function moyenneFc(mesures: readonly number[]): number | null {
  const ok = mesures.filter((b) => typeof b === 'number' && Number.isFinite(b) && b >= 40 && b <= 230);
  if (ok.length < MESURES_MIN) return null;
  return Math.round(ok.reduce((a, b) => a + b, 0) / ok.length);
}

/* eslint-disable @typescript-eslint/no-require-imports */
export async function fcMoyenneEntre(debutMs: number, finMs: number): Promise<number | null> {
  if (Platform.OS !== 'ios' || !(finMs > debutMs) || finMs - debutMs < 60_000) return null;
  try {
    const w = require('@/lib/healthKit.wrapper') as typeof import('@/lib/healthKit.wrapper');
    if (!w.isHealthKitAvailable || w.isRunningInExpoGo || w.isMockMode) return null;
    const HealthKit = w.default as unknown as { queryQuantitySamples: (id: string, o: unknown) => Promise<{ quantity: number }[] | null> };
    const r = await HealthKit.queryQuantitySamples('HKQuantityTypeIdentifierHeartRate', {
      filter: { date: { startDate: new Date(debutMs), endDate: new Date(finMs) } },
      limit: 0,
      ascending: true,
      unit: 'count/min',
    });
    return moyenneFc((r ?? []).map((s) => Number(s?.quantity)));
  } catch {
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-require-imports */
