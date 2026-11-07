/**
 * Un petit identifiant de ce telephone, pour le nom des copies dans iCloud (7 novembre 2026).
 * iPhone et iPad sur le meme compte Apple ecrivent dans le meme dossier YOROI : sans ce nom, l'un ecrasait l'autre.
 * Tire une seule fois, range dans le trousseau (expo-secure-store, garde meme si l'app est supprimee puis remise sur
 * le meme iPhone) avec une copie dans AsyncStorage. La cle commence par @yoroi_cloud_sync_ : elle ne part jamais
 * dans une sauvegarde (lib/v2/sauvegarde/fusion.ts), sinon un iPad restaure prendrait le nom de l'iPhone.
 * Rien ne quitte le telephone : seulement le nom du fichier, dans ton propre iCloud.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

export const CLE_APPAREIL = '@yoroi_cloud_sync_appareil';
const CLE_TROUSSEAU = 'yoroi_cloud_sync_appareil';
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

let enMemoire: string | null = null;

/** Un identifiant court (6 signes, sans lettres qui se confondent) */
export function nouvelId(hasard: () => number = Math.random): string {
  let s = '';
  for (let k = 0; k < 6; k++) s += ALPHABET[Math.floor(hasard() * ALPHABET.length) % ALPHABET.length];
  return s;
}

/** Vrai pour un identifiant bien forme (protege le nom du fichier) */
export function idValide(v: unknown): v is string {
  return typeof v === 'string' && /^[a-z0-9]{4,12}$/.test(v);
}

async function trousseau(): Promise<typeof import('expo-secure-store') | null> {
  if (Platform.OS === 'web') return null;
  try {
    return await import('expo-secure-store');
  } catch {
    return null;
  }
}

/** L'identifiant de ce telephone, tire la premiere fois. Jamais d'erreur : au pire « appareil ». */
export async function idAppareil(): Promise<string> {
  if (enMemoire) return enMemoire;
  try {
    const ss = await trousseau();
    let v: string | null = null;
    try {
      v = ss ? await ss.getItemAsync(CLE_TROUSSEAU) : null;
    } catch {
      v = null;
    }
    if (!idValide(v)) v = await AsyncStorage.getItem(CLE_APPAREIL).catch(() => null);
    if (!idValide(v)) v = nouvelId();
    enMemoire = v;
    await AsyncStorage.setItem(CLE_APPAREIL, v).catch(() => undefined);
    if (ss) await ss.setItemAsync(CLE_TROUSSEAU, v).catch(() => undefined);
    return v;
  } catch {
    enMemoire = enMemoire ?? nouvelId();
    return enMemoire;
  }
}

/** Tests seulement */
export function _oublierIdAppareil(): void {
  enMemoire = null;
}
