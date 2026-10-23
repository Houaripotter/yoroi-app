/**
 * Nouveautes de la version 3.0, Yoroi.
 *
 * Depuis le 13 octobre 2026, les nouveautes sont la visite guidee sur les vrais ecrans
 * (components/yoroi/v2/tour/VisiteGuidee.tsx, montee par TourGate). Ce fichier garde les cles historiques :
 * - WHATS_NEW_KEY : la version dont l'utilisateur a deja vu les nouveautes ;
 * - markWhatsNewSeen : appele par l'onboarding ;
 * - isPresentationSeen / markPresentationSeen : l'ancienne presentation en diapositives.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { isTourSeen, markTourSeen } from '@/components/yoroi/v2/tour/keys';

export const CURRENT_VERSION = '3.0.0';
export const WHATS_NEW_KEY = 'WHATS_NEW_LAST_SEEN_VERSION';

/** Marque les nouveautes de cette version comme vues (presentation faite ou nouvel utilisateur) */
export async function markWhatsNewSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(WHATS_NEW_KEY, CURRENT_VERSION);
  } catch {
    // sans importance
  }
}

/**
 * Vrai si la presentation 3.0 a deja ete vue, sous l'une ou l'autre de ses anciennes formes :
 * la visite guidee (@yoroi_tour_v2_seen) ou la fenetre des nouveautes de la 3.0.0.
 * Stockage illisible : on considere qu'elle est vue, pour ne jamais bloquer l'utilisateur.
 */
export async function isPresentationSeen(): Promise<boolean> {
  try {
    const [tour, lastSeen] = await Promise.all([isTourSeen(), AsyncStorage.getItem(WHATS_NEW_KEY)]);
    return tour || lastSeen === CURRENT_VERSION;
  } catch {
    return true;
  }
}

/** Pose les deux cles : la presentation ne se remontrera plus d'elle-meme */
export async function markPresentationSeen(): Promise<void> {
  await Promise.all([markTourSeen(), markWhatsNewSeen()]);
}
