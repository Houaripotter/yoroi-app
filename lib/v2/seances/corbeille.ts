/**
 * Corbeille des séances (28 octobre 2026) : une séance supprimée y reste 30 jours, entière, et se remet d'un
 * toucher (barre « Annuler » juste après la suppression, écran app/corbeille.tsx ensuite).
 * Un seul retour à la fois : deux touchers ne la remettent jamais deux fois.
 */
import { getTrashItems, restoreFromTrash } from '@/lib/database';
import type { TrashItem } from '@/lib/database';
import { traduire } from '@/lib/i18n/tr';

/** Évènement émis par deleteTraining (lib/database.native.ts), { trashId, sport, date } */
export const SEANCE_SUPPRIMEE = 'YOROI_SEANCE_SUPPRIMEE';

const enCours = new Set<number>();

export async function restaurerSeanceSupprimee(trashId: number): Promise<boolean> {
  if (enCours.has(trashId)) return false;
  enCours.add(trashId);
  try {
    // déjà remise (barre « Annuler » puis Corbeille) : rien à faire
    const encore = (await getTrashItems()).some((t) => t.id === trashId);
    if (!encore) return false;
    await restoreFromTrash(trashId);
    return true;
  } finally {
    enCours.delete(trashId);
  }
}

export async function seancesDansLaCorbeille(): Promise<TrashItem[]> {
  return getTrashItems();
}

/* ─── 28 octobre 2026 : pesées et mensurations (lib/corbeilleCorps.ts) ─── */

export { EVENEMENT_CORPS_SUPPRIME } from '@/lib/corbeilleCorps';
export type { ElementCorbeilleCorps } from '@/lib/corbeilleCorps';

const enCoursCorps = new Set<number>();

/** Remet une pesée ou une mensuration ; un seul retour même sur deux touchers */
export async function restaurerCorpsSupprime(trashId: number): Promise<boolean> {
  if (enCoursCorps.has(trashId)) return false;
  enCoursCorps.add(trashId);
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { restoreCorpsFromTrash } = require('@/lib/database') as typeof import('@/lib/database');
    return await restoreCorpsFromTrash(trashId);
  } finally {
    enCoursCorps.delete(trashId);
  }
}

export async function corpsDansLaCorbeille(): Promise<import('@/lib/corbeilleCorps').ElementCorbeilleCorps[]> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getTrashCorps } = require('@/lib/database') as typeof import('@/lib/database');
  return getTrashCorps();
}

export type QuoiSupprime = 'seance' | 'weights' | 'measurements';

/** Le texte de la barre « Annuler » selon ce qui vient de partir (components/yoroi/v2/seances/AnnulerSuppression.tsx) */
export function texteSuppression(liste: readonly { quoi: QuoiSupprime }[]): string {
  const q = new Set(liste.map((x) => x.quoi));
  if (q.size === 1 && q.has('seance')) return traduire('Séance supprimée');
  if (q.size === 1 && q.has('weights')) return traduire('Pesée supprimée');
  if (q.size === 1 && q.has('measurements')) return traduire('Mensurations supprimées');
  if (q.size === 2 && q.has('weights') && q.has('measurements')) return traduire('Pesée et mensurations supprimées');
  return traduire('Supprimé');
}
