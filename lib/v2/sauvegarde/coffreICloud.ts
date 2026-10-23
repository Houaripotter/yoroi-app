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
/** nombre de copies gardees dans le dossier iCloud (ecrasees a tour de role) */
export const COPIES_ICLOUD = 3;

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

/** Nom du fichier du jour dans le dossier iCloud (3 noms, un par jour, a tour de role) */
export function nomCopieICloud(now = Date.now()): string {
  return `yoroi_backup_auto_${(Math.floor(now / 86400000) % COPIES_ICLOUD) + 1}.json`;
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
    const ok = (await m.copyToICloud(propre)) === true;
    if (ok) await AsyncStorage.setItem(ICLOUD_OK, new Date().toISOString()).catch(() => undefined);
    return ok;
  } catch (e) {
    logger.warn('[CoffreICloud] copie impossible', e);
    return false;
  }
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

/** Date de la derniere copie reussie dans iCloud (ms), 0 si jamais */
export async function derniereCopieICloud(): Promise<number> {
  try {
    const v = await AsyncStorage.getItem(ICLOUD_OK);
    const t = v ? new Date(v).getTime() : 0;
    return Number.isFinite(t) ? t : 0;
  } catch {
    return 0;
  }
}
