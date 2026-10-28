/**
 * Fiches partenaires de sparring (photo, nom) stockees sous '@yoroi_sparring_partners',
 * partagees avec l'ecran /sparring-partners. Renommer un partenaire met aussi a jour ses rounds.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { lireListePourEcriture } from '@/lib/v2/sauvegarde/lectureSure';
import { DeviceEventEmitter } from 'react-native';
import { openDatabase } from '@/lib/database';
import type { CombatRound } from '@/lib/database';

export const SPARRING_PARTNERS_KEY = '@yoroi_sparring_partners';
export const PARTNERS_CHANGED_EVENT = 'YOROI_PARTNERS_CHANGED';
export const WEEKLY_GOAL_KEY = '@sparring_weekly_goal';

export interface SparringPartnerData {
  id: string;
  name: string;
  photoUri?: string;
  belt?: string;
  [k: string]: unknown;
}

const keyOf = (n: string) => n.trim().toLowerCase();

async function readAll(): Promise<SparringPartnerData[]> {
  try {
    const raw = await AsyncStorage.getItem(SPARRING_PARTNERS_KEY);
    const v = raw ? JSON.parse(raw) : [];
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

/** 28 octobre 2026 : lecture STRICTE avant une ecriture (une liste illisible n'est jamais remplacee) */
const readAllForWrite = (): Promise<SparringPartnerData[]> => lireListePourEcriture<SparringPartnerData>(SPARRING_PARTNERS_KEY);

async function writeAll(list: SparringPartnerData[]) {
  await AsyncStorage.setItem(SPARRING_PARTNERS_KEY, JSON.stringify(list));
  DeviceEventEmitter.emit(PARTNERS_CHANGED_EVENT);
}

/** Copie la photo choisie dans un dossier permanent */
export async function savePhotoPermanently(tempUri: string): Promise<string> {
  try {
    const ext = tempUri.split('.').pop()?.split('?')[0] ?? 'jpg';
    const dest = `${FileSystem.documentDirectory}sparring_photo_${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: tempUri, to: dest });
    return dest;
  } catch {
    return tempUri;
  }
}

/** Photos et fiches existantes, avec dedoublonnage silencieux par nom */
export async function loadPartnerPhotos(): Promise<{ photos: Record<string, string>; fiches: Set<string> }> {
  const partners = await readAll();
  const seen = new Map<string, SparringPartnerData>();
  for (const p of partners) {
    if (!p?.name) continue;
    const k = keyOf(p.name);
    const ex = seen.get(k);
    if (!ex || (!ex.photoUri && p.photoUri)) seen.set(k, p);
  }
  // 28 octobre 2026 : le dedoublonnage par nom sert a l'affichage seulement. Avant, il etait REECRIT :
  // deux partenaires du meme prenom, et la fiche du second (notes, bilans, missions) etait effacee.
  const deduped = Array.from(seen.values());
  const photos: Record<string, string> = {};
  const fiches = new Set<string>();
  for (const p of deduped) {
    const k = keyOf(p.name);
    fiches.add(k);
    if (p.photoUri) photos[k] = p.photoUri;
  }
  return { photos, fiches };
}

export async function savePartnerPhoto(name: string, photoUri: string) {
  const list = await readAllForWrite();
  const k = keyOf(name);
  const ex = list.find((p) => keyOf(p.name) === k);
  if (ex) ex.photoUri = photoUri || undefined;
  else if (photoUri) list.push({ id: Date.now().toString(), name: name.trim(), photoUri });
  await writeAll(list);
}

export async function deletePartnerFiche(name: string) {
  const list = (await readAllForWrite()).filter((p) => keyOf(p.name) !== keyOf(name));
  await writeAll(list);
}

/** Renomme (et change la photo) d'un partenaire, y compris dans l'historique des rounds */
export async function renamePartner(oldName: string, newName: string, photo: string | null) {
  const oldKey = keyOf(oldName);
  const newKey = keyOf(newName);
  const list = await readAllForWrite();
  const oldIdx = list.findIndex((p) => keyOf(p.name) === oldKey);
  const newIdx = list.findIndex((p) => keyOf(p.name) === newKey);
  if (oldIdx >= 0) {
    // 28 octobre 2026 : deux fiches reunies sous le meme nom, les champs de l'autre sont gardes (avant : effacee)
    const autre = newIdx >= 0 && newIdx !== oldIdx ? list[newIdx] : undefined;
    list[oldIdx] = { ...(autre ?? {}), ...list[oldIdx], name: newName.trim(), photoUri: photo || undefined };
    if (autre) list.splice(newIdx, 1);
  } else if (newIdx >= 0) {
    list[newIdx] = { ...list[newIdx], name: newName.trim(), photoUri: photo || undefined };
  } else {
    list.push({ id: Date.now().toString(), name: newName.trim(), photoUri: photo || undefined });
  }
  await writeAll(list);

  if (oldKey !== newKey) {
    try {
      const db = await openDatabase();
      const rows = await db.getAllAsync<{ id: number; combat_rounds: string }>(`SELECT id, combat_rounds FROM trainings WHERE combat_rounds IS NOT NULL AND combat_rounds != '[]'`);
      for (const row of rows) {
        try {
          const rounds: CombatRound[] = JSON.parse(row.combat_rounds);
          if (!Array.isArray(rounds)) continue;
          let changed = false;
          for (const r of rounds) {
            if (r.partner && keyOf(r.partner) === oldKey) {
              r.partner = newName.trim();
              changed = true;
            }
          }
          if (changed) await db.runAsync(`UPDATE trainings SET combat_rounds = ? WHERE id = ?`, [JSON.stringify(rounds), row.id]);
        } catch {
          // round illisible : on passe
        }
      }
    } catch {
      // base indisponible : la fiche est tout de meme renommee
    }
  }
}
