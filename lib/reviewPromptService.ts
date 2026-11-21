// ============================================
// DEMANDE D'AVIS NATIVE (service unique)
// ============================================
// Seul service qui déclenche la fenêtre d'avis de l'App Store ou de Google Play
// (expo-store-review). lib/reviewService.ts et lib/ratingService.ts ne déclenchent rien.
//
// Règle (21 novembre 2026, decisionAvis, pure et testée dans __tests__/unit/demandeAvis.test.ts) :
//  - seulement après une séance terminée et enregistrée : appelée depuis l'écran de fin de séance
//    (app/seance/fin.tsx), juste après « Terminer », jamais pendant la séance ni pendant un chrono ;
//    une séance abandonnée n'arrive jamais sur l'écran de fin ;
//  - pas pour une séance très courte (moins de 5 minutes) ;
//  - pas les premiers jours : au moins 3 jours depuis l'installation (lib/v2/installation.ts)
//    et au moins 3 séances enregistrées (compteur yoroi_review_count, une par nouvelle séance,
//    incrémenté par lib/v2/seance/save.ts) ;
//  - au plus une fois tous les 120 jours (Apple limite déjà à 3 par an), et au plus une fois par version ;
//  - jamais si tu as déjà touché « Noter » dans la feuille « Tu aimes YOROI ? » (lib/v2/bilan/avis.ts),
//    ni si tu l'as refusée dans les 120 derniers jours (ou 3 fois) ;
//  - jamais pendant une célébration ou la proposition de notifications :
//    si les deux tombent sur la même séance, les notifications passent d'abord
//    et l'avis attend la séance suivante.
// ============================================

import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';
import { appVersion } from '@/components/yoroi/v2/espace/reglages/version';
import { lireDateInstallation, jourLocal } from '@/lib/v2/installation';
import { CLE_AVIS_MAISON, lireEtatBrut, REFUS_MAX } from '@/lib/v2/bilan/avis';
// Point d'accroche vide, branché sur utils/telemetry.ts au chantier mesure
import { noter } from '@/lib/v2/notifications/mesure';

/** Compteur de séances enregistrées (clé historique, gardée pour ne rien perdre) */
export const CLE_COMPTEUR_SEANCES = 'yoroi_review_count';
/** Version de l'app pour laquelle l'avis a déjà été demandé */
export const CLE_VERSION_DEMANDEE = '@yoroi_avis_version_demandee';
/** Dernière demande (ms) : sert au délai de 120 jours (lue aussi par lib/v2/bilan/avis.ts) */
export const CLE_DERNIERE_DEMANDE = '@yoroi_review_last_prompt';

export const SEANCES_AVANT_AVIS = 3;
export const JOURS_APRES_INSTALLATION = 3;
export const JOURS_ENTRE_DEMANDES = 120;
export const DUREE_MIN_SEANCE_MIN = 5;
const JOUR_MS = 86400000;

export type EntreeDecisionAvis = {
  /** séances enregistrées depuis toujours */
  seances: number;
  /** version de l'app en cours ('' si inconnue) */
  version: string;
  /** version pour laquelle l'avis a déjà été demandé (null si jamais) */
  versionDemandee: string | null;
  /** une célébration ou la proposition de notifications est à l'écran (ou l'a été pour cette séance) */
  autreFenetre: boolean;
  /** StoreReview.isAvailableAsync() et hasAction() */
  disponible: boolean;
  /** jours pleins depuis l'installation (null si la date est inconnue : on ne demande pas) */
  joursDepuisInstallation: number | null;
  /** durée de la séance qui vient d'être enregistrée, en minutes */
  dureeMin: number;
  /** dernière demande native (ms, null si jamais) */
  derniereDemande: number | null;
  /** « Noter » déjà touché dans la feuille YOROI */
  dejaNote: boolean;
  /** dernière ouverture de la feuille YOROI (ms, null si jamais) : noter ou refuser compte comme une demande */
  derniereFeuille: number | null;
  /** nombre de « Plus tard » dans la feuille YOROI */
  refus: number;
  maintenant: number;
};

/** Décision pure : faut-il demander un avis maintenant ? */
export function decisionAvis(e: EntreeDecisionAvis): boolean {
  if (!e.disponible) return false;
  if (e.autreFenetre) return false;
  if (!e.version) return false;
  if (e.versionDemandee === e.version) return false;
  if (e.seances < SEANCES_AVANT_AVIS) return false;
  if (e.joursDepuisInstallation === null || e.joursDepuisInstallation < JOURS_APRES_INSTALLATION) return false;
  if (!Number.isFinite(e.dureeMin) || e.dureeMin < DUREE_MIN_SEANCE_MIN) return false;
  if (e.dejaNote || e.refus >= REFUS_MAX) return false;
  const delai = JOURS_ENTRE_DEMANDES * JOUR_MS;
  if (e.derniereDemande !== null && e.maintenant - e.derniereDemande < delai) return false;
  if (e.derniereFeuille !== null && e.maintenant - e.derniereFeuille < delai) return false;
  return true;
}

/** Jours pleins entre le jour d'installation (AAAA-MM-JJ) et aujourd'hui, en jours du calendrier local */
export function joursDepuis(jourInstallation: string | null | undefined, maintenant: number): number | null {
  if (!jourInstallation || !/^\d{4}-\d{2}-\d{2}$/.test(jourInstallation)) return null;
  const debut = Date.parse(`${jourInstallation}T12:00:00`);
  const auj = Date.parse(`${jourLocal(new Date(maintenant))}T12:00:00`);
  if (!Number.isFinite(debut) || !Number.isFinite(auj)) return null;
  return Math.round((auj - debut) / JOUR_MS);
}

const nombreOuNull = (brut: string | null): number | null => {
  const n = Number(brut);
  return brut && Number.isFinite(n) && n > 0 ? n : null;
};

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

export type DemandeApresSeance = {
  /** une célébration ou la proposition de notifications est (ou a été) à l'écran pour cette séance */
  autreFenetre: boolean;
  /** durée de la séance enregistrée, en minutes */
  dureeMin: number;
  maintenant?: number;
};

/**
 * Appelée depuis l'écran de fin de séance, juste après « Terminer », une fois la proposition de notifications passée.
 * Résout avec vrai si la fenêtre d'avis a été demandée au système.
 */
export async function demanderAvisApresSeance(d: DemandeApresSeance): Promise<boolean> {
  try {
    if (d.autreFenetre) return false;
    const maintenant = d.maintenant ?? Date.now();
    const [brut, versionDemandee, derniere, maison, installation] = await Promise.all([
      AsyncStorage.getItem(CLE_COMPTEUR_SEANCES),
      AsyncStorage.getItem(CLE_VERSION_DEMANDEE),
      AsyncStorage.getItem(CLE_DERNIERE_DEMANDE),
      AsyncStorage.getItem(CLE_AVIS_MAISON),
      lireDateInstallation(),
    ]);
    const feuille = lireEtatBrut(maison);
    const entree: EntreeDecisionAvis = {
      seances: parseInt(brut || '0', 10) || 0,
      version: appVersion(),
      versionDemandee,
      autreFenetre: d.autreFenetre,
      disponible: true,
      joursDepuisInstallation: joursDepuis(installation?.date, maintenant),
      dureeMin: d.dureeMin,
      derniereDemande: nombreOuNull(derniere),
      dejaNote: feuille.note,
      derniereFeuille: feuille.derniere,
      refus: feuille.refus,
      maintenant,
    };
    // Les conditions locales d'abord, le module natif ensuite
    if (!decisionAvis(entree)) return false;
    if (!(await disponible())) return false;

    await AsyncStorage.setItem(CLE_VERSION_DEMANDEE, entree.version);
    await AsyncStorage.setItem(CLE_DERNIERE_DEMANDE, String(maintenant));
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
