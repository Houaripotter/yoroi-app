/**
 * Cles de la visite guidee.
 * - TOUR_V2_KEY : l'ancienne presentation « YOROI 3.0 » (diapositives), gardee pour savoir qui l'a deja vue.
 * - VISITE_DONE_KEY : la nouvelle visite guidee sur les vrais ecrans (13 octobre 2026), vue une fois
 *   apres l'onboarding ou apres la mise a jour, puis seulement depuis Reglages, Aide.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const TOUR_V2_KEY = '@yoroi_tour_v2_seen';
export const VISITE_DONE_KEY = '@yoroi_visite_guidee_v3_done';
export const VISITE_VOIX_KEY = '@yoroi_visite_guidee_voix';

export async function isTourSeen(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(TOUR_V2_KEY)) === 'true';
  } catch {
    return true;
  }
}

export async function markTourSeen(): Promise<void> {
  try {
    await AsyncStorage.setItem(TOUR_V2_KEY, 'true');
  } catch {
    // sans importance
  }
}

/** Vrai si la visite guidee a deja ete faite (ou passee). Stockage illisible : on ne la force pas. */
export async function isVisiteDone(): Promise<boolean> {
  try {
    return (await AsyncStorage.getItem(VISITE_DONE_KEY)) === 'true';
  } catch {
    return true;
  }
}

export async function markVisiteDone(): Promise<void> {
  try {
    await AsyncStorage.setItem(VISITE_DONE_KEY, 'true');
  } catch {
    // au pire elle se remontre une fois
  }
}
