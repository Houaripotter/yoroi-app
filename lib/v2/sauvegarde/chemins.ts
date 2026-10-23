/**
 * Chemins des fichiers de l'utilisateur (photos de progres, photo de profil...) apres une mise a jour.
 *
 * Sur iPhone, le dossier de l'app porte un identifiant qui peut changer quand l'app est mise a jour
 * (.../Data/Application/<identifiant>/Documents/). Les anciennes versions enregistraient le chemin
 * complet : apres la mise a jour, le fichier est toujours la, mais l'ancien chemin ne mene plus a rien.
 * rebaseLocalUri() recolle la fin du chemin (ce qui suit Documents/) sur le dossier actuel.
 * Rien n'est ecrit ni deplace : c'est seulement une lecture corrigee.
 */
import * as FileSystem from 'expo-file-system/legacy';

const IOS_CONTAINER = /^file:\/\/\/.*?\/Data\/Application\/[0-9A-Fa-f-]{8,}\/Documents\//;

/** Remplace l'ancien dossier de l'app par l'actuel. Renvoie l'adresse telle quelle si elle n'est pas concernee. */
export function rebaseLocalUri<T extends string | null | undefined>(uri: T, documentDirectory: string | null | undefined = FileSystem.documentDirectory): T {
  if (!uri || typeof uri !== 'string' || !documentDirectory) return uri;
  if (uri.startsWith(documentDirectory)) return uri;
  const m = uri.match(IOS_CONTAINER);
  if (!m) return uri;
  const docDir = documentDirectory.endsWith('/') ? documentDirectory : `${documentDirectory}/`;
  return `${docDir}${uri.slice(m[0].length)}` as T;
}
