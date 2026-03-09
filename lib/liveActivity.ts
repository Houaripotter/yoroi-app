import { NativeModules, Platform } from 'react-native';

const { YoroiLiveActivityManager } = NativeModules;

export interface LiveActivityTimerData {
  activityName?: string;
  endTime?: number;        // Unix timestamp (secondes) — fin de la phase en cours
  timeRemaining: number;   // Secondes restantes (pour affichage en pause)
  isRunning: boolean;
  mode: string;            // combat | tabata | emom | amrap | repos | custom
  phase: string;           // work | rest | idle
  currentRound: number;
  totalRounds: number;
  timerName: string;       // Nom affiché (ex: "JJB", "TABATA")
}

const isAvailable = (): boolean =>
  Platform.OS === 'ios' && !!YoroiLiveActivityManager;

const liveActivity = {
  isAvailable,

  areActivitiesEnabled: async (): Promise<boolean> => {
    if (!isAvailable()) return false;
    try {
      const result = await YoroiLiveActivityManager.areActivitiesEnabled();
      return result?.enabled ?? false;
    } catch {
      return false;
    }
  },

  start: async (data: LiveActivityTimerData): Promise<void> => {
    if (!isAvailable()) return;
    try {
      await YoroiLiveActivityManager.startActivity({
        activityName: data.activityName ?? 'Yoroi Timer',
        ...data,
      });
    } catch {
      // Live Activities non disponibles (iOS < 16.2, désactivées dans les réglages)
    }
  },

  update: async (data: Partial<LiveActivityTimerData>): Promise<void> => {
    if (!isAvailable()) return;
    try {
      await YoroiLiveActivityManager.updateActivity(data);
    } catch {
      // ignore
    }
  },

  stop: async (): Promise<void> => {
    if (!isAvailable()) return;
    try {
      await YoroiLiveActivityManager.stopActivity();
    } catch {
      // ignore
    }
  },
};

export default liveActivity;
