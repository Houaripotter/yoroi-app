import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';

const VIDEOS_KEY = 'yoroi_exercise_videos_v1';

export interface ExerciseVideo {
  id: string;
  title: string;
  uri: string;           // URI fichier local OU lien URL (YouTube, etc.)
  isUrl: boolean;        // true = lien web, false = fichier local
  muscleGroup?: string;  // ex: 'Pectoraux', 'Dos' — vidéos du groupe musculaire
  sport?: string;        // ex: 'boxe', 'jjb' — vidéos par sport
  sportLabel?: string;   // ex: 'Boxe Anglaise'
  sportColor?: string;   // couleur du sport
  benchmarkId?: string;  // vidéos liées à un exercice précis
  benchmarkName?: string;
  createdAt: string;
}

export async function getVideos(): Promise<ExerciseVideo[]> {
  try {
    const raw = await AsyncStorage.getItem(VIDEOS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    logger.error('[videoLibraryService] getVideos error', e);
    return [];
  }
}

export async function getVideosByMuscleGroup(muscleGroup: string): Promise<ExerciseVideo[]> {
  const all = await getVideos();
  // Vidéos du groupe musculaire = celles qui ont le muscleGroup ET pas de benchmarkId
  return all.filter(v => v.muscleGroup === muscleGroup && !v.benchmarkId);
}

export async function getVideosByBenchmark(benchmarkId: string): Promise<ExerciseVideo[]> {
  const all = await getVideos();
  return all.filter(v => v.benchmarkId === benchmarkId);
}

export async function getVideosBySport(sport: string): Promise<ExerciseVideo[]> {
  const all = await getVideos();
  return all.filter(v => v.sport === sport && !v.benchmarkId);
}

export async function addVideo(
  video: Omit<ExerciseVideo, 'id' | 'createdAt'>
): Promise<ExerciseVideo> {
  const all = await getVideos();
  const newVideo: ExerciseVideo = {
    ...video,
    id: `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  };
  all.push(newVideo);
  await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(all));
  return newVideo;
}

export async function deleteVideo(id: string): Promise<boolean> {
  try {
    const all = await getVideos();
    const filtered = all.filter(v => v.id !== id);
    await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(filtered));
    return true;
  } catch (e) {
    logger.error('[videoLibraryService] deleteVideo error', e);
    return false;
  }
}

export async function updateVideoTitle(id: string, title: string): Promise<boolean> {
  try {
    const all = await getVideos();
    const idx = all.findIndex(v => v.id === id);
    if (idx === -1) return false;
    all[idx] = { ...all[idx], title };
    await AsyncStorage.setItem(VIDEOS_KEY, JSON.stringify(all));
    return true;
  } catch (e) {
    logger.error('[videoLibraryService] updateVideoTitle error', e);
    return false;
  }
}
