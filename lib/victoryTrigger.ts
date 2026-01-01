// ============================================
// VICTORY TRIGGER SERVICE
// Allows triggering the Victory Share Modal from anywhere (Calendar, etc.)
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { VictorySessionData } from '@/components/VictoryShareModal';

const PENDING_VICTORY_KEY = 'yoroi_pending_victory';

// Store victory data to be shown when training journal opens
export const triggerVictoryModal = async (sessionData: VictorySessionData): Promise<void> => {
  try {
    await AsyncStorage.setItem(PENDING_VICTORY_KEY, JSON.stringify(sessionData));
  } catch (error) {
    console.error('[VICTORY_TRIGGER] Error storing victory data:', error);
  }
};

// Check if there's a pending victory to show
export const getPendingVictory = async (): Promise<VictorySessionData | null> => {
  try {
    const data = await AsyncStorage.getItem(PENDING_VICTORY_KEY);
    if (data) {
      await AsyncStorage.removeItem(PENDING_VICTORY_KEY); // Clear after reading
      return JSON.parse(data);
    }
    return null;
  } catch (error) {
    console.error('[VICTORY_TRIGGER] Error reading victory data:', error);
    return null;
  }
};

// Clear any pending victory
export const clearPendingVictory = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(PENDING_VICTORY_KEY);
  } catch (error) {
    console.error('[VICTORY_TRIGGER] Error clearing victory data:', error);
  }
};

// Helper to create victory data for calendar sessions
export const createCalendarVictoryData = (
  sessionName: string,
  sessionType: 'combat' | 'force' | 'running' | 'trail' | 'hyrox' | 'other',
  options: {
    duration?: number; // minutes
    calories?: number;
    distanceKm?: number;
    performance?: string;
  } = {}
): VictorySessionData => {
  // Calculate calories if duration provided
  let calories = options.calories;
  if (!calories && options.duration) {
    const metsMap: Record<string, number> = {
      combat: 10,
      force: 5,
      running: 9.8,
      trail: 8,
      hyrox: 8,
      other: 5,
    };
    const met = metsMap[sessionType] || 5;
    const userWeight = 75; // Default weight, could be loaded from AsyncStorage
    calories = Math.round((options.duration / 60) * userWeight * met);
  }

  // Create performance string
  let performance = options.performance || '';
  if (!performance) {
    if (options.distanceKm) {
      performance = `${options.distanceKm.toFixed(1)} km`;
    } else if (options.duration) {
      performance = `${options.duration} min`;
    }
  }

  return {
    exerciseName: sessionName,
    category: sessionType,
    performance,
    duration: options.duration,
    calories,
    date: new Date().toISOString(),
    isPR: false,
    distanceKm: options.distanceKm,
    timeSeconds: options.duration ? options.duration * 60 : undefined,
  };
};
