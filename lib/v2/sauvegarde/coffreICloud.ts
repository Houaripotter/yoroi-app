/**
 * Le coffre iCloud de YOROI (18 octobre 2026). iPhone seulement.
 * La copie du jour part toute seule dans le dossier « YOROI » du iCloud Drive de l'utilisateur (conteneur iCloud
 * de l'app, iCloud.com.houari.yoroi), sans rien choisir. Sur un nouvel iPhone connecte au meme compte Apple,
 * « J'ai deja une sauvegarde » la trouve tout de suite.
 * Module natif : ios/Yoroi/YoroiCloudModule.swift (icloudDisponible, copyToICloud, listICloudBackups,
 * prepareICloudBackup). Une version de l'app sans ces fonctions (ancienne version, web, Android) : tout renvoie
 * « indisponible » et le reste de l'app fait comme avant.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';
import { logger } from '@/lib/security/logger';

export const ICLOUD_OK = '@yoroi_last_icloud_success';
/** 7 novembre 2026 : dernier echec d'une copie iCloud, et premier essai (pour l'alerte des 3 jours sans copie) */
export const ICLOUD_KO = '@yoroi_cloud_sync_icloud_echec';
export const ICLOUD_PREMIER_ESSAI = '@yoroi_cloud_sync_icloud_premier_essai';
/**
 * Nombre de copies gardees dans le dossier iCloud (ecrasees a tour de role, une par jour).
 * 7 novembre 2026 : 7 au lieu de 3. Sans les photos, 7 copies pesent quelques Mo au plus.
 */
export const COPIES_ICLOUD = 7;
/** Les noms d'avant le 7 novembre 2026 (3 copies, sans nom d'appareil) : toujours lus pour remettre une sauvegarde */
export const ANCIENS_NOMS_ICLOUD = ['yoroi_backup_auto_1.json', 'yoroi_backup_auto_2.json', 'yoroi_backup_auto_3.json'];

export type SauvegardeICloud = { name: string; size: number; modifiedAt: number; telecharge: boolean };

type ModuleNatif = {
  icloudDisponible?: () => Promise<boolean>;
  copyToICloud?: (path: string) => Promise<boolean>;
  listICloudBackups?: () => Promise<SauvegardeICloud[]>;
  prepareICloudBackup?: (name: string) => Promise<string>;
};

function natif(): ModuleNatif | null {
  if (Platform.OS !== 'ios') return null;
  const m = NativeModules?.YoroiCloudModule as ModuleNatif | undefined;
  return m && typeof m.icloudDisponible === 'function' ? m : null;
}

/**
 * Nom du fichier du jour dans le dossier iCloud : 7 noms, un par jour, a tour de role, avec le petit identifiant
 * de ce telephone (lib/v2/sauvegarde/appareil.ts) pour que l'iPad n'ecrase plus l'iPhone.
 * yoroi_backup_auto_<appareil>_<1 a 7>.json
 */
export function nomCopieICloud(now = Date.now(), appareil = 'appareil'): string {
  return `yoroi_backup_auto_${appareil}_${(Math.floor(now / 86400000) % COPIES_ICLOUD) + 1}.json`;
}

/** La copie la plus recente de ce telephone, reecrite a chaque copie : yoroi_backup_auto_<appareil>_derniere.json */
export function nomDerniereICloud(appareil = 'appareil'): string {
  return `yoroi_backup_auto_${appareil}_derniere.json`;
}

/** Une copie automatique (nouveaux noms ou anciens yoroi_backup_auto_1 a 3) */
export function estCopieAuto(nom: string): boolean {
  return ANCIENS_NOMS_ICLOUD.includes(nom) || /^yoroi_backup_auto_[a-z0-9]{1,12}_([1-9]|derniere)\.json$/.test(nom);
}

/**
 * L'ordre pour remettre une sauvegarde : la plus recente d'abord ; a date egale (meme copie ecrite deux fois),
 * le fichier « derniere » d'abord. Tous les noms comptent, anciens compris.
 */
export function ordreRestauration(l: SauvegardeICloud[]): SauvegardeICloud[] {
  return [...l]
    .filter((x) => x && typeof x.name === 'string' && /^yoroi_backup_.*\.json$/.test(x.name))
    .sort((a, b) => (b.modifiedAt - a.modifiedAt) || (Number(/_derniere\.json$/.test(b.name)) - Number(/_derniere\.json$/.test(a.name))));
}

/** Vrai si l'utilisateur est connecte a iCloud avec iCloud Drive, et que l'app a la capacite iCloud */
export async function icloudDisponible(): Promise<boolean> {
  const m = natif();
  if (!m?.icloudDisponible) return false;
  try {
    return (await m.icloudDisponible()) === true;
  } catch {
    return false;
  }
}

/** Copie un fichier de sauvegarde (chemin local, deja renomme) dans le dossier iCloud de l'app */
export async function copierDansICloud(cheminLocal: string): Promise<boolean> {
  const m = natif();
  if (!m?.copyToICloud) return false;
  try {
    const propre = cheminLocal.startsWith('file://') ? decodeURIComponent(cheminLocal.slice(7)) : cheminLocal;
    if (!(await AsyncStorage.getItem(ICLOUD_PREMIER_ESSAI).catch(() => null))) await AsyncStorage.setItem(ICLOUD_PREMIER_ESSAI, new Date().toISOString()).catch(() => undefined);
    const ok = (await m.copyToICloud(propre)) === true;
    await AsyncStorage.setItem(ok ? ICLOUD_OK : ICLOUD_KO, new Date().toISOString()).catch(() => undefined);
    return ok;
  } catch (e) {
    logger.warn('[CoffreICloud] copie impossible', e);
    await AsyncStorage.setItem(ICLOUD_KO, new Date().toISOString()).catch(() => undefined);
    return false;
  }
}

/** Note un echec de copie iCloud venu d'ailleurs (delai depasse) */
export async function noterEchecICloud(): Promise<void> {
  await AsyncStorage.setItem(ICLOUD_KO, new Date().toISOString()).catch(() => undefined);
}

/** Les sauvegardes du dossier iCloud, la plus recente d'abord */
export async function listerICloud(): Promise<SauvegardeICloud[]> {
  const m = natif();
  if (!m?.listICloudBackups) return [];
  try {
    const l = await m.listICloudBackups();
    return Array.isArray(l) ? [...l].sort((a, b) => b.modifiedAt - a.modifiedAt) : [];
  } catch {
    return [];
  }
}

/** Telecharge si besoin la sauvegarde et renvoie son chemin local (file://), pret pour l'import */
export async function preparerICloud(nom: string): Promise<string | null> {
  const m = natif();
  if (!m?.prepareICloudBackup) return null;
  try {
    const p = await m.prepareICloudBackup(nom);
    return p ? (p.startsWith('file://') ? p : `file://${p}`) : null;
  } catch (e) {
    logger.warn('[CoffreICloud] telechargement impossible', e);
    return null;
  }
}

const lireTemps = async (cle: string): Promise<number> => {
  try {
    const v = await AsyncStorage.getItem(cle);
    const t = v ? new Date(v).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  } catch {
    return 0;
  }
};

/** Date de la derniere copie reussie dans iCloud (ms), 0 si jamais */
export async function derniereCopieICloud(): Promise<number> {
  return lireTemps(ICLOUD_OK);
}

/** Dernier echec et premier essai de copie iCloud (ms), 0 si jamais */
export async function echecsICloud(): Promise<{ echec: number; premierEssai: number }> {
  const [echec, premierEssai] = await Promise.all([lireTemps(ICLOUD_KO), lireTemps(ICLOUD_PREMIER_ESSAI)]);
  return { echec, premierEssai };
}
