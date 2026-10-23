/**
 * Note de seance (1 a 5), ressenti et note technique, saisis sur l'ecran de fin.
 * updateTraining reecrit toute la ligne : on relit donc la seance et on fusionne
 * pour ne rien effacer. Valeurs du ressenti identiques a l'ancienne app.
 */
import { DeviceEventEmitter } from 'react-native';
import { getTrainingById, updateTraining } from '@/lib/database';
import type { Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';

export type SessionMood = 'fire' | 'solid' | 'ok' | 'hard' | 'crushed';

export const MOODS: { value: SessionMood; label: string; kanji: string }[] = [
  { value: 'fire', label: 'En feu', kanji: '炎' },
  { value: 'solid', label: 'Solide', kanji: '剛' },
  { value: 'ok', label: 'Correct', kanji: '平' },
  { value: 'hard', label: 'Difficile', kanji: '苦' },
  { value: 'crushed', label: 'Écrasé', kanji: '倒' },
];

export type Ressenti = { rating: number | null; mood: string | null; technique: number | null };

export async function loadRessenti(id: number): Promise<Ressenti | null> {
  try {
    const t = await getTrainingById(id);
    if (!t) return null;
    const r = Number(t.session_rating);
    return {
      // ancienne echelle sur 10 ramenee sur 5 pour l'affichage
      rating: Number.isFinite(r) && r > 0 ? (r > 5 ? Math.round(r / 2) : r) : null,
      mood: t.session_mood || null,
      technique: t.technique_rating && t.technique_rating > 0 ? t.technique_rating : null,
    };
  } catch (err) {
    logger.warn('Lecture du ressenti impossible', err);
    return null;
  }
}

let queue: Promise<void> = Promise.resolve();

/** Enregistre la note, le ressenti et la note technique, une ecriture apres l'autre */
export function saveRessenti(id: number, r: Ressenti): Promise<void> {
  queue = queue
    .then(async () => {
      const t = await getTrainingById(id);
      if (!t) return;
      const merged: Partial<Training> = {
        ...t,
        session_rating: r.rating ?? null,
        session_mood: r.mood ?? undefined,
        technique_rating: r.technique ?? null,
      };
      await updateTraining(id, merged);
      DeviceEventEmitter.emit(DATA_CHANGED_EVENT);
    })
    .catch((err) => logger.warn('Ressenti non enregistre', err));
  return queue;
}
