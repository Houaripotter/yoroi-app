/**
 * PHOTOS DATEES : la partie telephone (selecteur, copies de cache, document, partage, menage).
 * La logique pure (dates, tri, pesees, consigne) est dans ./photos.ts.
 *
 * Confidentialite : les photos ne quittent le telephone que par le partage choisi par l'utilisateur.
 * YOROI n'en garde aucune : les copies vivent dans le dossier cache de l'app (yoroi-photos/) et sont
 * effacees a la fin. Seules les dates sont gardees un jour (pour completer la reponse de l'IA si le
 * telephone ferme l'app pendant ce temps).
 */
import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';
import { documentName, frenchDateTime, photoFileName, pickPhotoTime, sortPhotos } from './photos';
import type { DatedPhoto, StoredPhotoDates } from './photos';
import { traduire } from '@/lib/i18n/tr';

export const PHOTO_LIMIT = 30;
const DATES_KEY = 'yoroi_balance_photo_dates_v1';
/** cote le plus long des images du document : assez pour lire les chiffres, assez leger pour le partage */
const MAX_SIDE = 2000;

const workDir = () => (FileSystem.cacheDirectory ? `${FileSystem.cacheDirectory}yoroi-photos/` : null);

/** Ouvre la galerie (choix multiple) et lit la date de chaque photo. null si l'utilisateur annule. */
export async function pickDatedPhotos(): Promise<DatedPhoto[] | null> {
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsMultipleSelection: true,
    selectionLimit: PHOTO_LIMIT,
    orderedSelection: true,
    exif: true,
    quality: 1,
  });
  if (res.canceled || !res.assets?.length) return null;
  // la galerie n'est lue que si l'acces est deja donne : YOROI ne le demande pas pour une date
  let library = false;
  if (Platform.OS !== 'web' && res.assets.some((a) => a.assetId)) {
    try {
      library = (await MediaLibrary.getPermissionsAsync()).granted;
    } catch {
      library = false;
    }
  }
  const out: DatedPhoto[] = [];
  for (const a of res.assets.slice(0, PHOTO_LIMIT)) {
    let creationTime: number | undefined;
    let modificationTime: number | undefined;
    if (library && a.assetId) {
      try {
        const info = await MediaLibrary.getAssetInfoAsync(a.assetId);
        creationTime = info.creationTime || undefined;
        modificationTime = info.modificationTime || undefined;
      } catch {
        // pas grave : l'EXIF ou le nom suffisent souvent
      }
    }
    const file = (a as { file?: { lastModified?: number } }).file;
    if (!modificationTime && file?.lastModified) modificationTime = file.lastModified;
    const t = pickPhotoTime({ exif: a.exif, fileName: a.fileName, creationTime, modificationTime });
    out.push({ uri: a.uri, at: t.at, source: t.source, width: a.width, height: a.height, name: a.fileName ?? undefined });
  }
  return sortPhotos(out);
}

/** Les dates seules, gardees un jour */
export async function storeDates(sorted: DatedPhoto[]): Promise<void> {
  try {
    const v: StoredPhotoDates = { savedAt: Date.now(), dates: sorted.map((p) => p.at ?? null) };
    await AsyncStorage.setItem(DATES_KEY, JSON.stringify(v));
  } catch {
    // facultatif
  }
}
export async function loadStoredDatesRaw(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(DATES_KEY);
  } catch {
    return null;
  }
}
export async function clearStoredDates(): Promise<void> {
  try {
    await AsyncStorage.removeItem(DATES_KEY);
  } catch {
    // facultatif
  }
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch] as string);

export type Prepared = { pdf: string; copies: string[] };

/**
 * Prepare l'envoi : une copie JPEG nommee par photo (2026-10-03_08h12_photo-01.jpg) dans le cache de l'app,
 * et un seul document PDF, une photo par page avec son numero et sa date en haut (le partage du systeme
 * n'envoie qu'un fichier a la fois depuis Expo Go).
 */
export async function preparePhotos(sorted: DatedPhoto[], onProgress?: (done: number, total: number) => void): Promise<Prepared> {
  const dir = workDir();
  if (!dir) throw new Error('cache indisponible');
  await FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => {});
  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const copies: string[] = [];
  const pages: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const p = sorted[i];
    const w = p.width ?? 0;
    const h = p.height ?? 0;
    const resize = w && h && Math.max(w, h) > MAX_SIDE ? (w >= h ? { width: MAX_SIDE } : { height: MAX_SIDE }) : undefined;
    const r = await manipulateAsync(p.uri, resize ? [{ resize }] : [], { compress: 0.85, format: SaveFormat.JPEG, base64: true });
    const target = `${dir}${photoFileName(p.at, i + 1, 'jpg')}`;
    try {
      await FileSystem.moveAsync({ from: r.uri, to: target });
      copies.push(target);
    } catch (err) {
      logger.warn('[Photos datees] copie nommee impossible', err);
    }
    const caption = traduire("Photo {0} sur {1}, {2}", i + 1, sorted.length, p.at !== undefined ? `prise le ${frenchDateTime(p.at)}` : 'date de prise inconnue');
    pages.push(`<section><h1>${escapeHtml(caption)}</h1><img src="data:image/jpeg;base64,${r.base64 ?? ''}" /></section>`);
    onProgress?.(i + 1, sorted.length);
  }
  const html = traduire("<!doctype html><html><head><meta charset=\"utf-8\"><style>\n    @page { margin: 24px; }\n    body { margin: 0; font-family: -apple-system, Helvetica, Arial, sans-serif; color: #1D2029; }\n    section { page-break-after: always; break-after: page; text-align: center; }\n    section:last-child { page-break-after: auto; break-after: auto; }\n    h1 { font-size: 18px; margin: 0 0 12px; text-align: left; }\n    img { max-width: 100%; max-height: 700px; object-fit: contain; }\n  </style></head><body>{0}</body></html>", pages.join(''));
  const printed = await Print.printToFileAsync({ html, width: 612, height: 792 });
  const pdf = `${dir}${documentName(sorted)}`;
  try {
    await FileSystem.moveAsync({ from: printed.uri, to: pdf });
  } catch {
    return { pdf: printed.uri, copies: [...copies, printed.uri] };
  }
  return { pdf, copies };
}

/** Ouvre la feuille de partage du systeme avec le document */
export async function shareDocument(pdf: string): Promise<boolean> {
  if (!(await Sharing.isAvailableAsync())) return false;
  await Sharing.shareAsync(pdf, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: traduire('Envoyer à mon IA') });
  return true;
}

/**
 * Le menage : le dossier yoroi-photos/ et les copies faites par le selecteur, seulement dans le cache de l'app
 * (jamais la galerie).
 */
export async function cleanupPhotos(sorted: DatedPhoto[], extra: string[] = []): Promise<void> {
  if (Platform.OS === 'web') return;
  const cache = FileSystem.cacheDirectory;
  if (!cache) return;
  const dir = workDir();
  if (dir) await FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => {});
  for (const u of [...sorted.map((p) => p.uri), ...extra]) {
    if (u && u.startsWith(cache)) await FileSystem.deleteAsync(u, { idempotent: true }).catch(() => {});
  }
}
