/**
 * Corbeille des photos de progres (28 octobre 2026, audit « ne jamais perdre de donnees »).
 *
 * Une photo supprimee n'est plus effacee : son fichier part dans Documents/photos_corbeille/ et sa fiche
 * dans la liste @yoroi_photos_corbeille, gardees 30 jours. La barre « Photo supprimée, Annuler »
 * (components/yoroi/v2/seances/AnnulerSuppression.tsx) et la Corbeille (app/corbeille.tsx, partie Photos)
 * la remettent telle quelle. Les chemins sont ranges RELATIFS a Documents : ils restent bons apres une mise
 * a jour sur iPhone (le dossier de l'app change de nom).
 * Effacement definitif : « Supprimer mes donnees » (tout Documents et tout AsyncStorage partent), ou
 * viderCorbeillePhotos() pour la categorie Photos de l'ecran Confidentialite.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { DeviceEventEmitter } from 'react-native';
import { logger } from '@/lib/security/logger';
import type { Photo } from '@/lib/storage';
import { avecVerrou, lireListePourEcriture } from '@/lib/v2/sauvegarde/lectureSure';

export const CLE_CORBEILLE_PHOTOS = '@yoroi_photos_corbeille';
export const DOSSIER_CORBEILLE_PHOTOS = 'photos_corbeille/';
/** Meme cle que lib/storage.ts (PHOTOS_ASYNC_KEY) : meme verrou, les ecritures passent une par une */
const CLE_PHOTOS = '@yoroi_photos_v2';
export const EVENEMENT_PHOTO_SUPPRIMEE = 'YOROI_PHOTO_SUPPRIMEE';
export const JOURS_CORBEILLE = 30;

export type PhotoEnCorbeille = {
  trashId: number;
  /** la fiche de la photo, file_uri d'origine compris */
  photo: Photo;
  /** chemin du fichier dans la corbeille, relatif a Documents (null : photo sans fichier local) */
  fichier: string | null;
  /** chemin d'origine relatif a Documents (null : hors de Documents) */
  origine: string | null;
  deleted_at: string;
};

const docs = () => FileSystem.documentDirectory ?? '';
/** Chemin relatif a Documents, ou null si le fichier est ailleurs */
export const relatif = (uri: string | null | undefined, base = docs()): string | null =>
  uri && base && uri.startsWith(base) ? uri.slice(base.length) : null;

let compteur = 0;
const nouvelId = () => Date.now() * 100 + (compteur++ % 100);

async function lire(): Promise<PhotoEnCorbeille[]> {
  return lireListePourEcriture<PhotoEnCorbeille>(CLE_CORBEILLE_PHOTOS);
}

/** Photos dans la corbeille, les plus recentes d'abord (lecture simple : une liste illisible donne []) */
export async function photosDansLaCorbeille(): Promise<PhotoEnCorbeille[]> {
  try {
    const l = await lire();
    return [...l].sort((a, b) => (a.deleted_at < b.deleted_at ? 1 : -1));
  } catch {
    return [];
  }
}

/**
 * Met la photo a la corbeille : fichier deplace, fiche rangee. A appeler AVANT de retirer la photo de la liste.
 * Erreur : rien n'a change (le fichier est remis s'il avait deja bouge).
 */
export async function mettrePhotoALaCorbeille(photo: Photo): Promise<PhotoEnCorbeille> {
  return avecVerrou(CLE_CORBEILLE_PHOTOS, async () => {
    const liste = await lire();
    const entree: PhotoEnCorbeille = { trashId: nouvelId(), photo, fichier: null, origine: relatif(photo.file_uri), deleted_at: new Date().toISOString() };
    const src = photo.file_uri;
    let deplace = false;
    if (src && !src.startsWith('data:') && !src.startsWith('http') && docs()) {
      const info = await FileSystem.getInfoAsync(src).catch(() => ({ exists: false }));
      if (info.exists) {
        await FileSystem.makeDirectoryAsync(`${docs()}${DOSSIER_CORBEILLE_PHOTOS}`, { intermediates: true }).catch(() => undefined);
        const nom = `${entree.trashId}_${src.split('/').pop() || 'photo.jpg'}`;
        await FileSystem.moveAsync({ from: src, to: `${docs()}${DOSSIER_CORBEILLE_PHOTOS}${nom}` });
        entree.fichier = `${DOSSIER_CORBEILLE_PHOTOS}${nom}`;
        deplace = true;
      }
    }
    try {
      await AsyncStorage.setItem(CLE_CORBEILLE_PHOTOS, JSON.stringify([...liste, entree]));
    } catch (e) {
      if (deplace && entree.fichier) await FileSystem.moveAsync({ from: `${docs()}${entree.fichier}`, to: src }).catch(() => undefined);
      throw e;
    }
    return entree;
  });
}

/** Annonce la suppression a la barre « Annuler » (apres le retrait de la liste des photos) */
export function annoncerPhotoSupprimee(trashId: number): void {
  try {
    DeviceEventEmitter.emit(EVENEMENT_PHOTO_SUPPRIMEE, { trashId });
  } catch {
    // la photo reste 30 jours dans la corbeille
  }
}

/** Remet une photo (fichier et fiche). false : deja remise. Un seul retour, meme sur deux touchers. */
export async function restaurerPhoto(trashId: number): Promise<boolean> {
  return avecVerrou(CLE_CORBEILLE_PHOTOS, async () => {
    const liste = await lire();
    const e = liste.find((x) => x.trashId === trashId);
    if (!e) return false;
    let uri = e.photo.file_uri;
    if (e.fichier) {
      const dest = e.origine ? `${docs()}${e.origine}` : `${docs()}photos/${e.fichier.split('/').pop()}`;
      await FileSystem.makeDirectoryAsync(dest.slice(0, dest.lastIndexOf('/') + 1), { intermediates: true }).catch(() => undefined);
      await FileSystem.moveAsync({ from: `${docs()}${e.fichier}`, to: dest });
      uri = dest;
    }
    await avecVerrou(CLE_PHOTOS, async () => {
      const photos = await lireListePourEcriture<Photo>(CLE_PHOTOS);
      if (!photos.some((p) => p.id === e.photo.id)) photos.push({ ...e.photo, file_uri: uri });
      await AsyncStorage.setItem(CLE_PHOTOS, JSON.stringify(photos));
    });
    await AsyncStorage.setItem(CLE_CORBEILLE_PHOTOS, JSON.stringify(liste.filter((x) => x.trashId !== trashId)));
    return true;
  });
}

async function effacerFichier(rel: string | null): Promise<void> {
  if (!rel || !docs()) return;
  await FileSystem.deleteAsync(`${docs()}${rel}`, { idempotent: true }).catch(() => undefined);
}

/** Efface pour de bon ce qui a plus de 30 jours. A appeler au lancement. Renvoie le nombre de photos parties. */
export async function purgerCorbeillePhotos(now = Date.now()): Promise<number> {
  try {
    return await avecVerrou(CLE_CORBEILLE_PHOTOS, async () => {
      const liste = await lire();
      const limite = now - JOURS_CORBEILLE * 86400000;
      const vieilles = liste.filter((x) => new Date(x.deleted_at).getTime() < limite);
      if (!vieilles.length) return 0;
      for (const v of vieilles) await effacerFichier(v.fichier);
      await AsyncStorage.setItem(CLE_CORBEILLE_PHOTOS, JSON.stringify(liste.filter((x) => !vieilles.includes(x))));
      return vieilles.length;
    });
  } catch (e) {
    logger.warn('[Corbeille photos] nettoyage remis a plus tard', e);
    return 0;
  }
}

/** Efface toute la corbeille des photos, fichiers compris (suppression definitive demandee par l'utilisateur) */
export async function viderCorbeillePhotos(): Promise<void> {
  await avecVerrou(CLE_CORBEILLE_PHOTOS, async () => {
    let liste: PhotoEnCorbeille[] = [];
    try { liste = await lire(); } catch { liste = []; }
    for (const v of liste) await effacerFichier(v.fichier);
    if (docs()) await FileSystem.deleteAsync(`${docs()}${DOSSIER_CORBEILLE_PHOTOS}`, { idempotent: true }).catch(() => undefined);
    await AsyncStorage.removeItem(CLE_CORBEILLE_PHOTOS);
  });
}
