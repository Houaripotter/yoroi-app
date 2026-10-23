/**
 * Identifiants Apple Sante ou Health Connect des seances importees effacees parce qu'elles
 * doublonnaient une seance notee dans YOROI. Ils restent connus de l'import : la seance ne revient
 * pas a la synchronisation suivante, meme si la source la propose encore.
 * Aucune dependance vers la base : la base peut lire cette liste sans import circulaire.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const DISMISSED_IMPORTS_KEY = 'yoroi_dedupe_dismissed_ids';

let cache: Set<string> | null = null;

export async function getDismissedImportIds(): Promise<Set<string>> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(DISMISSED_IMPORTS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    cache = new Set(Array.isArray(arr) ? arr.filter((x) => typeof x === 'string' && x) : []);
  } catch {
    cache = new Set();
  }
  return cache;
}

async function persist(set: Set<string>): Promise<void> {
  cache = set;
  await AsyncStorage.setItem(DISMISSED_IMPORTS_KEY, JSON.stringify([...set]));
}

export async function addDismissedImportIds(ids: string[]): Promise<void> {
  const set = new Set(await getDismissedImportIds());
  for (const id of ids) if (id) set.add(id);
  await persist(set);
}

export async function removeDismissedImportIds(ids: string[]): Promise<void> {
  const set = new Set(await getDismissedImportIds());
  for (const id of ids) set.delete(id);
  await persist(set);
}
