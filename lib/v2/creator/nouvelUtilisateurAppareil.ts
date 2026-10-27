/**
 * « Nouvel utilisateur » du Studio, branché sur le téléphone : la base yoroi.db de l'app, le fichier de copie
 * yoroi_nouvel_utilisateur.db (dossier SQLite, gardé par tous les effacements), AsyncStorage et le trousseau.
 * La logique et sa sécurité sont dans nouvelUtilisateur.ts (testée).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import * as SQLite from 'expo-sqlite';
import { openDatabase } from '@/lib/database';
import { demoActive } from '@/lib/v2/demo/garde';
import { CLES_SECURE_CONNUES, CLES_SECURE_GARDEES } from '@/lib/effacementPlan';
import { SECURE_DATA_KEYS } from '@/lib/v2/sauvegarde/fusion';
import { CREATOR_SECURE_KEYS } from './creatorStore';
import { logger } from '@/lib/security/logger';
import { NOM_BASE_SAUVEGARDE, creerServiceNouvelUtilisateur, nomsCoffreAMettreDeCote, type BaseSql, type ServiceNouvelUtilisateur } from './nouvelUtilisateur';

/** Gardées telles quelles : jeton et essais du Studio, cache de l'abonnement, mot de passe des sauvegardes chiffrées */
export const COFFRE_GARDE: readonly string[] = [...CREATOR_SECURE_KEYS, ...CLES_SECURE_GARDEES, '@yoroi_backup_encryption_password'];

const avecFichier = (d: string) => (d.startsWith('file://') ? d : `file://${d}`);
const sansSlash = (d: string) => d.replace(/\/+$/, '');

function cheminsPossibles(): string[] {
  const out: string[] = [];
  const dir = (SQLite as unknown as { defaultDatabaseDirectory?: string }).defaultDatabaseDirectory;
  if (typeof dir === 'string' && dir) out.push(`${sansSlash(avecFichier(dir))}/${NOM_BASE_SAUVEGARDE}`);
  if (FileSystem.documentDirectory) out.push(`${sansSlash(FileSystem.documentDirectory)}/SQLite/${NOM_BASE_SAUVEGARDE}`);
  return [...new Set(out)];
}

let connexion: SQLite.SQLiteDatabase | null = null;

const sauvegarde = {
  async existe(): Promise<boolean> {
    const chemins = cheminsPossibles();
    let lu = false;
    for (const c of chemins) {
      try {
        const info = await FileSystem.getInfoAsync(c);
        lu = true;
        if (info.exists) return true;
      } catch {
        // chemin illisible : on essaie le suivant
      }
    }
    // au moindre doute on regarde dans le fichier (une copie absente donne une base vide, jetée aussitôt)
    return !lu;
  },
  async ouvrir(): Promise<BaseSql> {
    if (!connexion) connexion = await SQLite.openDatabaseAsync(NOM_BASE_SAUVEGARDE);
    return connexion as unknown as BaseSql;
  },
  async fermer(): Promise<void> {
    const c = connexion;
    connexion = null;
    await c?.closeAsync().catch(() => undefined);
  },
  async supprimer(): Promise<void> {
    await sauvegarde.fermer();
    try {
      await SQLite.deleteDatabaseAsync(NOM_BASE_SAUVEGARDE);
    } catch {
      for (const c of cheminsPossibles()) {
        for (const s of ['', '-wal', '-shm', '-journal']) await FileSystem.deleteAsync(`${c}${s}`, { idempotent: true }).catch(() => undefined);
      }
    }
  },
};

let service: ServiceNouvelUtilisateur | null = null;

export function serviceNouvelUtilisateur(): ServiceNouvelUtilisateur {
  if (service) return service;
  service = creerServiceNouvelUtilisateur({
    live: async () => (await openDatabase()) as unknown as BaseSql,
    sauvegarde,
    stockage: {
      getAllKeys: () => AsyncStorage.getAllKeys(),
      multiGet: (k) => AsyncStorage.multiGet(k as string[]),
      getItem: (k) => AsyncStorage.getItem(k),
      setItem: (k, v) => AsyncStorage.setItem(k, v),
      multiSet: (pairs) => AsyncStorage.multiSet(pairs),
      multiRemove: (k) => AsyncStorage.multiRemove(k as string[]),
    },
    coffre: {
      lire: (nom) => SecureStore.getItemAsync(nom),
      ecrire: (nom, v) => SecureStore.setItemAsync(nom, v, { keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK }),
      effacer: (nom) => SecureStore.deleteItemAsync(nom),
    },
    demoActive: () => demoActive(),
    nomsCoffre: (cles) => nomsCoffreAMettreDeCote([...CLES_SECURE_CONNUES, ...SECURE_DATA_KEYS], cles, COFFRE_GARDE),
    log: { info: (m) => logger.info(m), warn: (m, e) => logger.warn(m, e) },
  });
  return service;
}
