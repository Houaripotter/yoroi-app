/**
 * Actions envoyees par l'Apple Watch (contrat de synchro v1) : lecture et verification, sans dependance.
 * Teste dans __tests__/unit/montreContexte.test.ts.
 */
export type ActionMontre = {
  v: 1;
  id: string;
  type: 'poids' | 'seance' | 'eau';
  at: string;
  kg?: number;
  sportId?: string;
  dureeS?: number;
  rpe?: number;
  rounds?: number;
  fcMoy?: number;
  fcMax?: number;
  kcal?: number;
  source?: 'chrono' | 'libre' | 'note' | 'widget';
  deltaMl?: number;
  dansSante?: boolean;
};

export const fini = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Lit et verifie une charge « yoroi » de la montre ; null si elle est illisible ou hors contrat */
export function lireAction(charge: unknown): ActionMontre | null {
  let o: any = charge;
  if (typeof charge === 'string') {
    try {
      o = JSON.parse(charge);
    } catch {
      return null;
    }
  }
  if (!o || typeof o !== 'object' || o.v !== 1 || typeof o.id !== 'string' || !o.id) return null;
  if (typeof o.at !== 'string' || isNaN(new Date(o.at).getTime())) return null;
  if (o.type === 'poids') return fini(o.kg) && o.kg > 20 && o.kg < 400 ? (o as ActionMontre) : null;
  if (o.type === 'eau') return fini(o.deltaMl) && Math.abs(o.deltaMl) <= 3000 && o.deltaMl !== 0 ? (o as ActionMontre) : null;
  if (o.type === 'seance') return fini(o.dureeS) && o.dureeS > 0 && o.dureeS < 24 * 3600 ? (o as ActionMontre) : null;
  return null;
}

