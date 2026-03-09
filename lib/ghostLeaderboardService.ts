// ============================================
// YOROI - GHOST LEADERBOARD SERVICE
// Te fait concourir contre ta meilleure version
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const KEY_WEEK_HISTORY = '@yoroi_ghost_week_history';
const MAX_WEEKS_STORED = 12;

export interface WeekRecord {
  weekId: string;   // ex: '2025-W10'
  trainings: number;
  weights: number;
  xpGained: number;
}

// ============================================
// HELPERS
// ============================================

export function getCurrentWeekId(): string {
  const d = new Date();
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

async function getHistory(): Promise<WeekRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY_WEEK_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw) as WeekRecord[];
  } catch {
    return [];
  }
}

async function saveHistory(history: WeekRecord[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY_WEEK_HISTORY, JSON.stringify(history));
  } catch (e) {
    logger.error('[GhostLeaderboard] Erreur sauvegarde:', e);
  }
}

// ============================================
// MISE A JOUR DES STATS DE LA SEMAINE COURANTE
// Appeler depuis loadData() de l'accueil
// ============================================

export async function updateCurrentWeek(
  trainingsThisWeek: number,
  weightsThisWeek: number,
  currentXp: number,
): Promise<void> {
  try {
    const weekId = getCurrentWeekId();
    const history = await getHistory();
    const existingIdx = history.findIndex(w => w.weekId === weekId);

    const record: WeekRecord = {
      weekId,
      trainings: trainingsThisWeek,
      weights: weightsThisWeek,
      xpGained: currentXp,
    };

    if (existingIdx >= 0) {
      history[existingIdx] = record;
    } else {
      history.unshift(record);
      if (history.length > MAX_WEEKS_STORED) {
        history.length = MAX_WEEKS_STORED;
      }
    }

    await saveHistory(history);
  } catch (e) {
    logger.error('[GhostLeaderboard] Erreur update:', e);
  }
}

// ============================================
// OBTENIR LE MEILLEUR RECORD (hors semaine actuelle)
// ============================================

export async function getBestWeekRecord(): Promise<WeekRecord | null> {
  try {
    const currentWeekId = getCurrentWeekId();
    const history = await getHistory();
    const pastWeeks = history.filter(w => w.weekId !== currentWeekId);
    if (pastWeeks.length === 0) return null;
    return pastWeeks.reduce((best, week) =>
      week.trainings > best.trainings ? week : best
    , pastWeeks[0]);
  } catch {
    return null;
  }
}

// ============================================
// DONNÉES GHOST POUR L'AFFICHAGE
// ============================================

export interface GhostData {
  currentTrainings: number;
  bestTrainings: number;
  progressPercent: number;
  isBeatingRecord: boolean;
  hasHistory: boolean;
}

export async function getGhostData(trainingsThisWeek: number): Promise<GhostData> {
  const best = await getBestWeekRecord();

  if (!best || best.trainings === 0) {
    return {
      currentTrainings: trainingsThisWeek,
      bestTrainings: 0,
      progressPercent: 0,
      isBeatingRecord: false,
      hasHistory: false,
    };
  }

  const progressPercent = best.trainings > 0
    ? Math.min(100, Math.round((trainingsThisWeek / best.trainings) * 100))
    : 0;

  return {
    currentTrainings: trainingsThisWeek,
    bestTrainings: best.trainings,
    progressPercent,
    isBeatingRecord: trainingsThisWeek > best.trainings,
    hasHistory: true,
  };
}
