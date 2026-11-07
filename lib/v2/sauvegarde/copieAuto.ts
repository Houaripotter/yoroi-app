/**
 * La copie automatique hors du telephone (18 octobre 2026).
 * Houari : « j'ai pas de compte en ligne, j'ai peur que les utilisateurs perdent leurs donnees ».
 *
 * Ce qui existait deja : une sauvegarde automatique chaque jour (lib/autoBackupService.ts), poussee dans un
 * dossier cloud relie s'il y en a un (lib/cloudFolderService.ts, module natif iOS et Android), mais ce dossier
 * se reliait seulement au fond des Reglages. La plupart des gens faisaient donc, au mieux, des copies a la main.
 *
 * Ici : un seul geste, « Activer la copie automatique ». On choisit une fois un dossier iCloud Drive ou
 * Google Drive, la premiere copie part tout de suite, puis chaque jour toute seule, sans rien faire.
 * Aucun compte, aucun serveur YOROI : le fichier va dans le cloud de l'utilisateur.
 *
 * etatProtection() est pur (teste dans __tests__/unit/copieAuto.test.ts).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import { logger } from '@/lib/security/logger';

const CLOUD_OK = '@yoroi_last_cloud_sync_success';
const CLOUD_KO = '@yoroi_last_cloud_sync_failure';
const MANUEL = '@yoroi_last_manual_export';
export const PROTECTION_CHANGED_EVENT = 'yoroi:protection_donnees';

const JOUR = 86400000;

/** Le module natif du dossier cloud est-il dans cette version de l'app ? (absent sur le web et dans Expo Go) */
function moduleDispo(): boolean {
  return Platform.OS !== 'web' && !!NativeModules?.YoroiCloudModule;
}

/**
 * - non_dispo : pas de module natif (web, Expo Go) : on propose seulement la copie a la main
 * - a_activer : la copie automatique n'est pas reliee
 * - protege : une VRAIE copie est passee hors du telephone il y a moins de 48 heures (iCloud ou dossier relie)
 * - en_attente : la copie automatique est en place (iCloud, ou dossier tout juste relie) mais aucune copie recente
 *   n'est encore confirmee ; ni « protege », ni alerte : on attend la prochaine copie (moins de 3 jours)
 * - en_panne : en place, mais plus aucune copie reussie depuis 3 jours (dossier supprime, cloud plein, deconnecte)
 */
export type EtatProtection = 'non_dispo' | 'a_activer' | 'protege' | 'en_attente' | 'en_panne';

export type InfosProtection = {
  dispo: boolean;
  connecte: boolean;
  dossier: string | null;
  /** derniere copie reussie dans le dossier relie (ms) */
  succes: number;
  /** dernier echec dans le dossier relie (ms) */
  echec: number;
  /** derniere copie faite a la main (ms) */
  manuel: number;
  /** iPhone : coffre iCloud de l'app disponible (connecte a iCloud, capacite presente) */
  icloud?: boolean;
  /** iPhone : derniere copie reussie dans le coffre iCloud (ms) */
  succesICloud?: number;
  /** iPhone : dernier echec d'une copie iCloud (ms) */
  echecICloud?: number;
  /** iPhone : premier essai de copie iCloud (ms), pour compter les 3 jours quand aucune n'est jamais passee */
  premierEssaiICloud?: number;
};

/** 7 novembre 2026 : « protege » seulement avec une vraie copie de moins de 48 heures */
export const DELAI_PROTEGE_MS = 48 * 3600 * 1000;
/** Une seule alerte, apres 3 jours sans aucune copie reussie */
export const DELAI_ALERTE_MS = 3 * JOUR;

/** Derniere copie automatique reussie hors du telephone (iCloud ou dossier relie), en ms, 0 si jamais */
export function derniereReussite(i: InfosProtection): number {
  return Math.max(i.succesICloud || 0, i.connecte ? i.succes || 0 : 0);
}

export function etatProtection(i: InfosProtection, now = Date.now()): EtatProtection {
  const recent = (t: number | undefined) => !!t && now - t >= -JOUR && now - t < DELAI_PROTEGE_MS;
  // 7 novembre 2026 : plus de « protege » sur la seule presence d'iCloud. Il faut une copie reussie de moins de 48 h.
  if ((i.icloud && recent(i.succesICloud)) || (i.connecte && recent(i.succes))) return 'protege';
  // iPhone connecte a iCloud : la copie part toute seule dans le dossier YOROI d'iCloud Drive, rien a relier
  if (i.icloud) {
    const reference = i.succesICloud || i.premierEssaiICloud || 0;
    // jamais essaye (premier lancement) : la premiere copie est en route
    if (!reference) return 'en_attente';
    return now - reference >= DELAI_ALERTE_MS ? 'en_panne' : 'en_attente';
  }
  if (!i.dispo) return 'non_dispo';
  if (!i.connecte) return 'a_activer';
  // tout juste reliee : la premiere copie est en route
  if (!i.succes && !i.echec) return 'en_attente';
  // une copie est passee il y a 48 heures a 3 jours : pas encore d'alerte
  if (i.succes && now - i.succes < DELAI_ALERTE_MS) return 'en_attente';
  return 'en_panne';
}

/** Les rappels et propositions de copie se taisent : copie recente confirmee, ou copie en place sans alerte */
export function rappelsMasques(e: EtatProtection): boolean {
  return e === 'protege' || e === 'en_attente';
}

/** Jours depuis la derniere copie hors du telephone (automatique ou a la main), ou null */
export function joursDepuisCopie(i: InfosProtection, now = Date.now()): number | null {
  const t = Math.max(i.succes || 0, i.manuel || 0, i.succesICloud || 0);
  return t ? Math.floor((now - t) / JOUR) : null;
}

const temps = (iso: string | null) => {
  const t = iso ? new Date(iso).getTime() : 0;
  return Number.isFinite(t) ? t : 0;
};

/** Lit l'etat reel (module natif, dossier relie, dates des dernieres copies) */
export async function lireProtection(): Promise<InfosProtection> {
  const vide: InfosProtection = { dispo: false, connecte: false, dossier: null, succes: 0, echec: 0, manuel: 0 };
  try {
    const { getSavedCloudFolder } = await import('@/lib/cloudFolderService');
    const dispo = moduleDispo();
    const dossier = dispo ? await getSavedCloudFolder() : null;
    const [ok, ko, m] = await Promise.all([AsyncStorage.getItem(CLOUD_OK), AsyncStorage.getItem(CLOUD_KO), AsyncStorage.getItem(MANUEL)]);
    const ic = await import('./coffreICloud');
    const [icloud, succesICloud, ko2] = await Promise.all([ic.icloudDisponible(), ic.derniereCopieICloud(), ic.echecsICloud()]);
    return { dispo, connecte: !!dossier, dossier: dossier?.displayName ?? null, succes: temps(ok), echec: temps(ko), manuel: temps(m), icloud, succesICloud, echecICloud: ko2.echec, premierEssaiICloud: ko2.premierEssai };
  } catch (e) {
    logger.warn('[CopieAuto] lecture impossible', e);
    return vide;
  }
}

export type ResultatActivation = 'ok' | 'annule' | 'echec' | 'non_dispo';

/**
 * Le geste unique : choisir le dossier (iCloud Drive ou Google Drive), puis la premiere copie tout de suite.
 * Les suivantes partent chaque jour avec la sauvegarde automatique (exportDataToJSON, mode silencieux).
 */
export async function activerCopieAuto(): Promise<ResultatActivation> {
  try {
    const { pickCloudFolder } = await import('@/lib/cloudFolderService');
    if (!moduleDispo()) return 'non_dispo';
    const dossier = await pickCloudFolder();
    if (!dossier) return 'annule';
    // la sauvegarde automatique doit rester active (c'est elle qui pousse la copie chaque jour)
    const auto = await import('@/lib/autoBackupService');
    await auto.setAutoBackupEnabled(true).catch(() => undefined);
    const { exportDataToJSON } = await import('@/lib/exportService');
    await exportDataToJSON({ silent: true });
    const infos = await lireProtection();
    DeviceEventEmitter.emit(PROTECTION_CHANGED_EVENT, infos);
    DeviceEventEmitter.emit('YOROI_AUTO_BACKUP_DONE');
    return infos.succes && Date.now() - infos.succes < 5 * 60 * 1000 ? 'ok' : 'echec';
  } catch (e) {
    logger.warn('[CopieAuto] activation impossible', e);
    return 'echec';
  }
}

/**
 * Refaire une copie hors du telephone (fin de seance, bouton Reessayer, « Sauvegarder maintenant »).
 * 7 novembre 2026 : passe par les declencheurs (lib/v2/sauvegarde/declencheurs.ts), au plus une ecriture toutes les
 * 2 minutes ; « immediat » (geste de l'utilisateur) part tout de suite. Sans les photos. Vrai si une copie iCloud ou
 * dans le dossier relie vient de passer.
 */
export async function copierMaintenant(o: { immediat?: boolean } = {}): Promise<boolean> {
  try {
    const debut = Date.now();
    const d = await import('./declencheurs');
    if (o.immediat) await d.copierToutDeSuite('bouton');
    else await d.demanderCopie('seance', { attendre: true });
    const infos = await lireProtection();
    DeviceEventEmitter.emit(PROTECTION_CHANGED_EVENT, infos);
    const fraiche = (t: number | undefined) => !!t && t >= debut - 2 * 60 * 1000;
    return fraiche(infos.succes) || fraiche(infos.succesICloud);
  } catch {
    return false;
  }
}

/** Nom du cloud du telephone, pour les textes */
export function nomDuCloud(os: string = Platform.OS): string {
  return os === 'android' ? 'Google Drive' : 'iCloud Drive';
}
