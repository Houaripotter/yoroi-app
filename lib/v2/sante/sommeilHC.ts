/**
 * Enregistrement SleepSession envoye a Health Connect (audit du 18 octobre 2026).
 * Avant, l'ecran Noter ma nuit passait { startDate, endDate } (nom iOS) alors que la version Android lisait
 * { startTime, endTime } : la date etait invalide et l'ecriture echouait toujours, sans rien dire.
 * Les deux noms sont acceptes : l'appel reste identique sur iPhone et Android. Fonction pure, testee dans
 * __tests__/unit/sommeilHC.test.ts.
 */

export type StadeSommeil = 'awake' | 'light' | 'deep' | 'rem';

export type NuitAEcrire = {
  startDate?: Date | string;
  endDate?: Date | string;
  startTime?: Date | string;
  endTime?: Date | string;
  stages?: { stage: StadeSommeil; startTime: Date | string; endTime: Date | string }[];
};

/** Stades de Health Connect : 1 eveille, 2 endormi, 4 leger, 5 profond, 6 paradoxal */
const STADE_HC: Record<StadeSommeil, number> = { awake: 1, light: 4, deep: 5, rem: 6 };

export type EnregistrementSommeilHC = {
  recordType: 'SleepSession';
  startTime: string;
  endTime: string;
  stages?: { startTime: string; endTime: string; stage: number }[];
};

const valide = (v: Date | string | undefined): Date | null => {
  if (v === undefined || v === null) return null;
  const d = new Date(v);
  return Number.isFinite(d.getTime()) ? d : null;
};

/** null si les dates manquent, sont invalides ou si la fin n'est pas apres le debut */
export function enregistrementSommeilHC(n: NuitAEcrire): EnregistrementSommeilHC | null {
  const debut = valide(n.startTime ?? n.startDate);
  const fin = valide(n.endTime ?? n.endDate);
  if (!debut || !fin || fin.getTime() <= debut.getTime()) return null;
  const r: EnregistrementSommeilHC = { recordType: 'SleepSession', startTime: debut.toISOString(), endTime: fin.toISOString() };
  const stades = (n.stages ?? [])
    .map((s) => ({ a: valide(s.startTime), b: valide(s.endTime), stage: STADE_HC[s.stage] || 2 }))
    .filter((s): s is { a: Date; b: Date; stage: number } => !!s.a && !!s.b);
  if (stades.length) r.stages = stades.map((s) => ({ startTime: s.a.toISOString(), endTime: s.b.toISOString(), stage: s.stage }));
  return r;
}
