/**
 * Carte Avant apres (17 octobre 2026) : lecture de tes photos de corps (coffre local) et de tes pesees.
 * Rien ne quitte le telephone : la carte est dessinee ici et n'est envoyee que si tu la partages.
 */
import { getPhotosFromStorage } from '@/lib/storage';
import { getWeights } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { photosCarte } from './avantApres';
import type { PhotoCarte } from './types';

export async function chargerPhotosCarte(): Promise<PhotoCarte[]> {
  try {
    const [photos, pesees] = await Promise.all([getPhotosFromStorage().catch(() => []), getWeights().catch(() => [])]);
    return photosCarte(photos ?? [], (pesees ?? []).map((w) => ({ date: w.date, weight: w.weight })));
  } catch (e) {
    logger.warn('[cartes] avant apres', e);
    return [];
  }
}
