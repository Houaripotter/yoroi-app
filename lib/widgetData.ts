// ============================================================
// YOROI — Service de mise à jour des widgets iOS & Android
// ============================================================
// Appelle le module natif pour passer les données clés
// aux widgets d'écran d'accueil.
// ============================================================

import { NativeModules, Platform } from 'react-native';
import { getLatestWeight } from '@/lib/database';
import { calculateStreak } from '@/lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const { WidgetDataModule } = NativeModules;

const isSupported = Platform.OS !== 'web' && !!WidgetDataModule;

export interface WidgetData {
  weight?:           number;
  streak?:           number;
  rank?:             string;
  waterCups?:        number;
  waterGoal?:        number;
  calories?:         number;
  steps?:            number;
  nextSession?:      string;
  nextSessionTime?:  string;
}

/**
 * Met à jour les widgets avec des données fournies manuellement.
 */
export async function updateWidgets(data: WidgetData): Promise<void> {
  if (!isSupported) return;
  try {
    await WidgetDataModule.updateWidgetData(data);
    logger.info('[WidgetData] Widgets mis à jour', data);
  } catch (e) {
    logger.error('[WidgetData] Erreur mise à jour widgets:', e);
  }
}

/**
 * Lit les données clés depuis la base locale et met à jour tous les widgets.
 * Appeler après chaque modification de poids, hydratation, séance, etc.
 */
export async function refreshWidgetsFromDB(): Promise<void> {
  if (!isSupported) return;

  try {
    // Poids
    const latestWeight = await getLatestWeight();
    const weight = latestWeight?.weight ?? 0;

    // Streak
    const streak = await calculateStreak();

    // Rang
    const rankStr = await AsyncStorage.getItem('@yoroi_rank');
    const rank: string = rankStr ?? 'Recrue';

    // Hydratation (stockée en litres, on convertit en verres de 250ml)
    const waterStr = await AsyncStorage.getItem('@yoroi_hydration_today');
    const waterData = waterStr ? JSON.parse(waterStr) : null;
    const waterLiters: number = waterData?.amount ?? 0;
    const waterCups: number = Math.round(waterLiters / 0.25);

    const waterGoalStr = await AsyncStorage.getItem('@yoroi_hydration_goal');
    const waterGoalLiters: number = waterGoalStr ? parseFloat(waterGoalStr) : 2.0;
    const waterGoal: number = Math.round(waterGoalLiters / 0.25);

    await updateWidgets({ weight, streak, rank, waterCups, waterGoal });
  } catch (e) {
    logger.error('[WidgetData] Erreur refreshWidgetsFromDB:', e);
  }
}

/**
 * Met à jour uniquement la donnée Hydratation dans les widgets.
 */
export async function updateWidgetWater(cups: number, goal: number): Promise<void> {
  await updateWidgets({ waterCups: cups, waterGoal: goal });
}

/**
 * Met à jour uniquement le poids dans les widgets.
 */
export async function updateWidgetWeight(weight: number): Promise<void> {
  await updateWidgets({ weight });
}

/**
 * Met à jour le streak et le rang dans les widgets.
 */
export async function updateWidgetStreak(streak: number, rank: string): Promise<void> {
  await updateWidgets({ streak, rank });
}

/**
 * Met à jour les données santé (calories, pas) dans les widgets.
 */
export async function updateWidgetHealth(calories: number, steps: number): Promise<void> {
  await updateWidgets({ calories, steps });
}

export default {
  updateWidgets,
  refreshWidgetsFromDB,
  updateWidgetWater,
  updateWidgetWeight,
  updateWidgetStreak,
  updateWidgetHealth,
};
