// ============================================
// WEAR SYNC SERVICE — Synchronisation Android → Wear OS
// ============================================
// Service JS qui appelle le module natif WearSyncModule
// pour envoyer les données de l'app vers la montre Wear OS.
//
// Utilisation :
//   import WearSyncService from '@/lib/wearSyncService';
//   await WearSyncService.syncProfile({ userName: 'Houari', level: 5 });
// ============================================

import { Platform, NativeModules } from 'react-native';

// ============================================
// MODULE NATIF
// ============================================

const { WearSyncModule } = NativeModules;

const isAvailable = Platform.OS === 'android' && !!WearSyncModule;

// ============================================
// TYPES
// ============================================

export interface WearNode {
  id: string;
  displayName: string;
  isNearby: boolean;
}

// ============================================
// SERVICE
// ============================================

class WearSyncServiceClass {

  /**
   * Vérifie si une montre Wear OS est connectée.
   */
  async isConnected(): Promise<boolean> {
    if (!isAvailable) return false;
    try {
      return await WearSyncModule.isWearConnected();
    } catch {
      return false;
    }
  }

  /**
   * Retourne les noeuds Wear OS connectés.
   */
  async getConnectedNodes(): Promise<WearNode[]> {
    if (!isAvailable) return [];
    try {
      return await WearSyncModule.getConnectedNodes();
    } catch {
      return [];
    }
  }

  /**
   * Envoie un objet de données à la montre Wear OS.
   * Retourne le nombre de noeuds ayant reçu le message.
   */
  async sendToWatch(data: Record<string, string | number | boolean | null>): Promise<number> {
    if (!isAvailable) return 0;
    try {
      return await WearSyncModule.sendToWatch(data);
    } catch {
      return 0;
    }
  }

  // ============================================
  // HELPERS DE HAUT NIVEAU
  // ============================================

  async syncProfile(profile: {
    userName?: string;
    level?: number;
    rank?: string;
    streak?: number;
  }): Promise<boolean> {
    const sent = await this.sendToWatch({
      type: 'profile',
      syncTimestamp: Date.now(),
      ...(profile.userName !== undefined && { userName: profile.userName }),
      ...(profile.level !== undefined && { level: profile.level }),
      ...(profile.rank !== undefined && { rank: profile.rank }),
      ...(profile.streak !== undefined && { streak: profile.streak }),
    });
    return sent > 0;
  }

  async syncWeight(weightKg: number, targetKg?: number): Promise<boolean> {
    const sent = await this.sendToWatch({
      type: 'weight',
      weight: weightKg,
      syncTimestamp: Date.now(),
      ...(targetKg !== undefined && { targetWeight: targetKg }),
    });
    return sent > 0;
  }

  async syncHydration(currentMl: number, goalMl: number): Promise<boolean> {
    const sent = await this.sendToWatch({
      type: 'hydration',
      waterIntake: currentMl,
      waterGoal: goalMl,
      syncTimestamp: Date.now(),
    });
    return sent > 0;
  }

  async syncWorkoutStats(yearlyWorkouts: number, workoutYearGoal: number): Promise<boolean> {
    const sent = await this.sendToWatch({
      type: 'workoutStats',
      yearlyWorkouts,
      workoutYearGoal,
      syncTimestamp: Date.now(),
    });
    return sent > 0;
  }
}

// ============================================
// EXPORT SINGLETON
// ============================================

export const WearSyncService = new WearSyncServiceClass();
export default WearSyncService;
