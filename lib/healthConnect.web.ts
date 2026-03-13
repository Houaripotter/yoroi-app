// ============================================
// YOROI - SERVICE HEALTH CONNECT (Web Stub)
// ============================================
// Version Web non fonctionnelle (Health Connect n'existe pas sur Web)
// ============================================

import logger from '@/lib/security/logger';

export interface HealthData {
  weight?: {
    value: number;
    unit: 'kg' | 'lbs';
    date: string;
  };
  steps?: {
    count: number;
    date: string;
  };
  sleep?: {
    startTime: string;
    endTime: string;
    duration: number;
    quality?: 'poor' | 'fair' | 'good' | 'excellent';
  };
  heartRate?: {
    average: number;
    min: number;
    max: number;
    resting: number;
  };
  calories?: {
    active: number;
    basal: number;
    total: number;
  };
  distance?: {
    value: number;
    unit: 'km' | 'miles';
  };
}

export interface HealthPermissions {
  weight: boolean;
  steps: boolean;
  sleep: boolean;
  heartRate: boolean;
  calories: boolean;
  distance: boolean;
}

export interface SyncStatus {
  lastSync: string | null;
  isConnected: boolean;
  provider: 'apple_health' | 'health_connect' | null;
  permissions: HealthPermissions;
}

class HealthConnectServiceStub {
  async initialize(): Promise<boolean> {
    logger.warn('Health Connect non disponible sur Web');
    return false;
  }

  async isAvailable(): Promise<boolean> {
    return false;
  }

  getProviderName(): string {
    return 'Non disponible';
  }

  async connect(): Promise<boolean> {
    return false;
  }

  async disconnect(): Promise<void> {
    // Stub
  }

  async getLatestWeight(): Promise<HealthData['weight'] | null> {
    return null;
  }

  async getTodaySteps(): Promise<HealthData['steps'] | null> {
    return null;
  }

  async getLastSleep(): Promise<HealthData['sleep'] | null> {
    return null;
  }

  async getAllHealthData(): Promise<HealthData> {
    return {};
  }

  async writeWeight(weight: number, unit: 'kg' | 'lbs' = 'kg'): Promise<boolean> {
    return false;
  }

  async syncAll(): Promise<HealthData | null> {
    return null;
  }

  getSyncStatus(): SyncStatus {
    return {
      lastSync: null,
      isConnected: false,
      provider: null,
      permissions: {
        weight: false,
        steps: false,
        sleep: false,
        heartRate: false,
        calories: false,
        distance: false,
      },
    };
  }

  hasPermission(type: keyof HealthPermissions): boolean {
    return false;
  }

  formatSleepDuration(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h${mins > 0 ? ` ${mins}min` : ''}`;
  }

  getSleepQuality(minutes: number): 'poor' | 'fair' | 'good' | 'excellent' {
    if (minutes < 300) return 'poor';
    if (minutes < 360) return 'fair';
    if (minutes < 480) return 'good';
    return 'excellent';
  }

  async canReadWorkouts(): Promise<{ accessible: boolean; count: number }> {
    return { accessible: false, count: 0 };
  }

  async requestWorkoutPermissions(): Promise<void> {}

  async diagnoseWorkouts(): Promise<any> {
    return { moduleLoaded: false, isConnected: false, healthkit30d: 0, healthkitAll: 0, activityTypes: [], dbCount: 0, dbFromHealthkit: 0, cacheSize: 0, error: 'Non disponible sur web', rawApiTest: -1, rawApiError: null, anchorApiTest: -1, anchorApiError: null, nativeModuleTest: -1, authStatus: null, nativeDiag: null };
  }

  async importFullHistory(): Promise<any> {
    return { weights: 0, sleep: 0, steps: 0, calories: 0, heartRate: 0, distance: 0, workouts: 0, healthkitFound: 0, insertErrors: 0 };
  }

  async getStepsHistory(_days: number = 0): Promise<Array<{ date: string; value: number }>> { return []; }
  async getCaloriesHistory(_days: number = 0): Promise<Array<{ date: string; value: number }>> { return []; }
  async getDistanceHistory(_days: number = 0): Promise<Array<{ date: string; value: number }>> { return []; }
  async getExerciseMinutesHistory(_days: number = 0): Promise<Array<{ date: string; value: number }>> { return []; }
  async getStandHoursHistory(_days: number = 0): Promise<Array<{ date: string; value: number }>> { return []; }
  async getSleepHistory(_days: number = 0): Promise<any[]> { return []; }
}

export const healthConnect = new HealthConnectServiceStub();

export const getProviderIcon = (): string => {
  return '🌐';
};

export const getConnectionInstructions = (): string[] => {
  return [
    "1. Health Connect n'est pas disponible sur Web",
    "2. Utilise l'app mobile iOS ou Android",
  ];
};

export default healthConnect;
