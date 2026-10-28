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

/* ─── 28 octobre 2026 : photos de progrès et listes du coffre (composition, anciennes mensurations) ─── */

export { EVENEMENT_PHOTO_SUPPRIMEE, photosDansLaCorbeille, restaurerPhoto } from '@/lib/v2/photos/corbeillePhotos';
export type { PhotoEnCorbeille } from '@/lib/v2/photos/corbeillePhotos';
export { EVENEMENT_COFFRE_SUPPRIME, coffreDansLaCorbeille, restaurerCoffre } from '@/lib/v2/sauvegarde/corbeilleCoffre';
export type { ElementCoffreEnCorbeille } from '@/lib/v2/sauvegarde/corbeilleCoffre';

export type QuoiSupprime = 'seance' | 'weights' | 'measurements' | 'photo' | 'composition' | 'mesures_coffre';

/** Remet ce qui vient d'être supprimé, quelle que soit sa corbeille */
export async function restaurerSupprime(quoi: QuoiSupprime, trashId: number): Promise<boolean> {
  if (quoi === 'seance') return restaurerSeanceSupprimee(trashId);
  if (quoi === 'photo') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@/lib/v2/photos/corbeillePhotos') as typeof import('@/lib/v2/photos/corbeillePhotos')).restaurerPhoto(trashId);
  }
  if (quoi === 'composition' || quoi === 'mesures_coffre') {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return (require('@/lib/v2/sauvegarde/corbeilleCoffre') as typeof import('@/lib/v2/sauvegarde/corbeilleCoffre')).restaurerCoffre(trashId);
  }
  return restaurerCorpsSupprime(trashId);
}

/** Le texte de la barre « Annuler » selon ce qui vient de partir (components/yoroi/v2/seances/AnnulerSuppression.tsx) */
export function texteSuppression(liste: readonly { quoi: QuoiSupprime }[]): string {
  // anciennes mensurations du coffre : des mensurations ; composition supprimée avec sa pesée ou son jour : comptée avec eux
  const q = new Set<QuoiSupprime>(liste.map((x) => (x.quoi === 'mesures_coffre' ? 'measurements' : x.quoi)));
  if (q.has('composition') && (q.has('weights') || q.has('measurements'))) q.delete('composition');
  if (q.size === 1 && q.has('photo')) return liste.length > 1 ? traduire('Photos supprimées') : traduire('Photo supprimée');
  if (q.size === 1 && q.has('composition')) return traduire('Composition supprimée');
  if (q.size === 1 && q.has('seance')) return traduire('Séance supprimée');
  if (q.size === 1 && q.has('weights')) return traduire('Pesée supprimée');
  if (q.size === 1 && q.has('measurements')) return traduire('Mensurations supprimées');
  if (q.size === 2 && q.has('weights') && q.has('measurements')) return traduire('Pesée et mensurations supprimées');
  return traduire('Supprimé');
}
