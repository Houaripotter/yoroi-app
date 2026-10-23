// ============================================
// DEMANDE D'AVIS NATIVE (service unique)
// ============================================
// Seul service qui déclenche la fenêtre d'avis de l'App Store ou de Google Play
// (expo-store-review). lib/reviewService.ts et lib/ratingService.ts ne déclenchent rien.
//
// Règle :
//  - après la TROISIÈME séance enregistrée (compteur yoroi_review_count, une par
//    nouvelle séance, incrémenté par lib/v2/seance/save.ts) ;
//  - jamais au démarrage : appelée seulement depuis l'écran de fin de séance ;
//  - au plus une fois par version de l'app (Constants.expoConfig.version) ;
//  - jamais pendant une célébration ou la proposition de notifications :
//    si les deux tombent sur la même séance, les notifications passent d'abord
//    et l'avis attend la séance suivante.
// ============================================

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';
import { appVersion } from '@/components/yoroi/v2/espace/reglages/version';
// Point d'accroche vide, branché sur utils/telemetry.ts au chantier mesure
import { noter } from '@/lib/v2/notifications/mesure';

/** Compteur de séances enregistrées (clé historique, gardée pour ne rien perdre) */
export const CLE_COMPTEUR_SEANCES = 'yoroi_review_count';
/** Version de l'app pour laquelle l'avis a déjà été demandé */
export const CLE_VERSION_DEMANDEE = '@yoroi_avis_version_demandee';
/** Dernière demande (ms), pour le diagnostic */
export const CLE_DERNIERE_DEMANDE = '@yoroi_review_last_prompt';

export const SEANCES_AVANT_AVIS = 3;

export type EntreeDecisionAvis = {
  /** séances enregistrées depuis toujours */
  seances: number;
  /** version de l'app en cours ('' si inconnue) */
  version: string;
  /** version pour laquelle l'avis a déjà été demandé (null si jamais) */
  versionDemandee: string | null;
  /** une célébration ou la proposition de notifications est à l'écran */
  autreFenetre: boolean;
  /** StoreReview.isAvailableAsync() et hasAction() */
  disponible: boolean;
};

/** Décision pure : faut-il demander un avis maintenant ? */
export function decisionAvis(e: EntreeDecisionAvis): boolean {
  if (!e.disponible) return false;
  if (e.autreFenetre) return false;
  if (!e.version) return false;
  if (e.versionDemandee === e.version) return false;
  return e.seances >= SEANCES_AVANT_AVIS;
}

/** Une séance de plus (nouvelle séance seulement, jamais une modification) */
export async function compterSeanceAvis(): Promise<void> {
  try {
    const brut = await AsyncStorage.getItem(CLE_COMPTEUR_SEANCES);
    const n = parseInt(brut || '0', 10);
    await AsyncStorage.setItem(CLE_COMPTEUR_SEANCES, String((Number.isFinite(n) ? n : 0) + 1));
  } catch (e) {
    logger.info('[Avis] compteur non mis à jour', e);
  }
}

async function disponible(): Promise<boolean> {
  try {
    if (!(await StoreReview.isAvailableAsync())) return false;
    return await StoreReview.hasAction();
  } catch {
    return false;
  }
}

/**
 * Appelée depuis l'écran de fin de séance, après la proposition de notifications.
 * Résout avec vrai si la fenêtre d'avis a été demandée au système.
 */
export async function demanderAvisApresSeance(autreFenetre: boolean): Promise<boolean> {
  try {
    if (autreFenetre) return false;
    const [brut, versionDemandee] = await Promise.all([
      AsyncStorage.getItem(CLE_COMPTEUR_SEANCES),
      AsyncStorage.getItem(CLE_VERSION_DEMANDEE),
    ]);
    const seances = parseInt(brut || '0', 10) || 0;
    const version = appVersion();
    // Les conditions locales d'abord, le module natif ensuite
    if (!decisionAvis({ seances, version, versionDemandee, autreFenetre, disponible: true })) return false;
    if (!(await disponible())) return false;

    await AsyncStorage.setItem(CLE_VERSION_DEMANDEE, version);
    await AsyncStorage.setItem(CLE_DERNIERE_DEMANDE, String(Date.now()));
    noter('avis_demande', { moment: 'troisieme_seance' });
    await StoreReview.requestReview();
    logger.info('[Avis] demande d’avis affichée');
    return true;
  } catch (e) {
    logger.warn('[Avis] demande impossible', e);
    return false;
  }
}

/** Remise à zéro (outils créateur) */
export const resetReviewPrompts = async (): Promise<void> => {
  await AsyncStorage.multiRemove([CLE_VERSION_DEMANDEE, CLE_DERNIERE_DEMANDE, '@yoroi_review_prompts_count', '@yoroi_review_prompts_period_start']);
};
