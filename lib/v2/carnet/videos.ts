/**
 * Videotheque du carnet (vague 16) : tes videos d'exemple (exercice, muscle, technique, sport).
 * Meme cle de stockage que lib/videoLibraryService (yoroi_exercise_videos_v1) : les anciennes videos
 * restent lisibles. On ajoute seulement des champs optionnels (genre, duree).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import { addVideo, deleteVideo, getVideos } from '@/lib/videoLibraryService';
import type { ExerciseVideo } from '@/lib/videoLibraryService';
import logger from '@/lib/security/logger';

const VIDEOS_KEY = 'yoroi_exercise_videos_v1';
export const VIDEOS_CHANGED_EVENT = 'YOROI_VIDEOS_CHANGED';

export type VideoKind = 'muscle' | 'technique' | 'autre';

export type CarnetVideo = ExerciseVideo & {
  /** muscle travaille (exemple d'exercice) ou technique de sport */
  kind?: VideoKind;
  /** duree en secondes, connue a l'import depuis la galerie */
  durationSec?: number;
};

export const MUSCLES_VIDEO: string[] = ['Pectoraux', 'Dos', 'Épaules', 'Biceps', 'Triceps', 'Jambes', 'Fessiers', 'Mollets', 'Abdos / Core', 'Avant-bras'];

/** Genre d'une video, deduit pour les anciennes */
export function kindOf(v: CarnetVideo): VideoKind {
  if (v.kind) return v.kind;
  if (v.muscleGroup || v.benchmarkId) return 'muscle';
  if (v.sport) return 'technique';
  return 'autre';
}

/** Libelle de rangement : muscle, exercice ou sport */
export function placeOf(v: CarnetVideo): string {
  if (v.benchmarkName) return v.benchmarkName;
  if (v.muscleGroup) return v.muscleGroup;
  if (v.sportLabel) return v.sportLabel;
  return 'Sans rangement';
}

export function durationLabel(sec?: number): string | null {
  if (!sec || !isFinite(sec) || sec <= 0) return null;
  const s = Math.round(sec);
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${String(r).padStart(2, '0')}`;
}

export async function listVideos(): Promise<CarnetVideo[]> {
  const all = (await getVideos()) as CarnetVideo[];
  return [...all].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function notify() {
  DeviceEventEmitter.emit(VIDEOS_CHANGED_EVENT);
}

/** Copie la video de la galerie dans YOROI (elle reste lisible meme si tu l'effaces de ta galerie) */
export async function copyToApp(tempUri: string): Promise<string> {
  const dir = `${FileSystem.documentDirectory}carnet_videos/`;
  const info = await FileSystem.getInfoAsync(dir);
  if (!info.exists) await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
  const ext = (tempUri.split('.').pop()?.split('?')[0] || 'mp4').toLowerCase();
  const safeExt = ['mp4', 'mov', 'm4v', '3gp', 'webm'].includes(ext) ? ext : 'mp4';
  const dest = `${dir}video_${Date.now()}.${safeExt}`;
  await FileSystem.copyAsync({ from: tempUri, to: dest });
  return dest;
}

export type NewVideo = {
  title: string;
  uri: string;
  isUrl: boolean;
  kind: VideoKind;
  muscleGroup?: string;
  sport?: string;
  sportLabel?: string;
  sportColor?: string;
  benchmarkId?: string;
  benchmarkName?: string;
  durationSec?: number;
};

export async function saveVideo(v: NewVideo): Promise<CarnetVideo> {
  const { kind, durationSec, ...base } = v;
  const created = await addVideo(base);
  // champs optionnels en plus, sur la meme fiche
  await patchVideo(created.id, durationSec ? { kind, durationSec } : { kind });
  notify();
  return { ...created, kind, durationSec };
}

export async function patchVideo(id: string, patch: Partial<CarnetVideo>): Promise<boolean> {
  try {
    const all = (await getVideos()) as CarnetVideo[];
    const i = all.findIndex((x) => x.id === id);
    if (i < 0) return false;
    // une cle presente avec undefined efface le champ (changement de rangement)
    const next: Record<string, unknown> = { ...all[i] };
    (Object.keys(patch) as (keyof CarnetVideo)[]).forEach((k) => {
      if (k === 'id' || k === 'createdAt') return;
      if (patch[k] === undefined) delete next[k];
      else next[k] = patch[k];
    });
    all[i] = next as unknown as CarnetVideo;
    await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(all));
    notify();
    return true;
  } catch (e) {
    logger.error('[carnet/videos] mise a jour impossible', e);
    return false;
  }
}

export async function removeVideo(v: CarnetVideo): Promise<void> {
  await deleteVideo(v.id);
  if (!v.isUrl && v.uri.startsWith(FileSystem.documentDirectory ?? '__')) {
    FileSystem.deleteAsync(v.uri, { idempotent: true }).catch(() => {});
  }
  notify();
}
