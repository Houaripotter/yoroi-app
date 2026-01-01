// ============================================
// YOROI - WIDGET SERVICE
// ============================================
// Service pour mettre a jour les donnees du widget iOS
// Utilise react-native-shared-group-preferences
// ============================================

import { Platform } from 'react-native';
import { getAllMeasurements, getUserSettings, getAllWorkouts } from '@/lib/storage';
import logger from '@/lib/security/logger';

// Note: Pour que le widget fonctionne, il faut:
// 1. Configurer l'App Group dans Xcode (group.com.yoroi.app)
// 2. Installer: npm install react-native-shared-group-preferences
// 3. Configurer le widget dans Xcode

// Interface pour les donnees du widget
export interface WidgetData {
  currentWeight: number;
  goalWeight: number;
  startWeight: number;
  streak: number;
  lastUpdate: string;
  username: string;
}

// Calculer le streak actuel
const calculateStreak = (measurements: Array<{ date: string; weight: number }>): number => {
  if (measurements.length === 0) return 0;

  const sorted = [...measurements].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const uniqueDates = [...new Set(sorted.map(m => m.date.split('T')[0]))];

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const firstDate = new Date(uniqueDates[0]);
  firstDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays <= 1) {
    streak = 1;
    for (let i = 1; i < uniqueDates.length; i++) {
      const prevDate = new Date(uniqueDates[i - 1]);
      const currDate = new Date(uniqueDates[i]);
      const diff = Math.floor((prevDate.getTime() - currDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diff === 1) {
        streak++;
      } else {
        break;
      }
    }
  }

  return streak;
};

/**
 * Met a jour les donnees du widget iOS
 * Doit etre appele apres chaque nouvelle mesure
 */
export const updateWidget = async (): Promise<void> => {
  if (Platform.OS !== 'ios') return;

  try {
    // Recuperer les donnees
    const measurements = await getAllMeasurements();
    const settings = await getUserSettings();

    if (measurements.length === 0) return;

    // Trier par date
    const sorted = [...measurements].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const currentWeight = sorted[0].weight;
    const startWeight = sorted[sorted.length - 1].weight;
    const goalWeight = settings.weight_goal || currentWeight - 5;
    const streak = calculateStreak(sorted);
    const username = settings.username || 'Guerrier';

    const widgetData: WidgetData = {
      currentWeight,
      goalWeight,
      startWeight,
      streak,
      lastUpdate: new Date().toISOString(),
      username,
    };

    // Essayer d'utiliser le module natif si disponible
    try {
      const SharedGroupPreferences = require('react-native-shared-group-preferences').default;
      await SharedGroupPreferences.setItem(
        'widgetData',
        JSON.stringify(widgetData),
        'group.com.yoroi.app'
      );
      logger.info('Widget data updated successfully');
    } catch (moduleError) {
      // Module non installe ou erreur
      logger.info('SharedGroupPreferences not available, widget update skipped');
    }

  } catch (error) {
    logger.error('Error updating widget:', error);
  }
};

/**
 * Force le rafraichissement du widget
 * A appeler apres updateWidget() si necessaire
 */
export const reloadWidget = async (): Promise<void> => {
  if (Platform.OS !== 'ios') return;

  try {
    const { NativeModules } = require('react-native');
    if (NativeModules.WidgetModule && NativeModules.WidgetModule.reloadAllTimelines) {
      NativeModules.WidgetModule.reloadAllTimelines();
      logger.info('Widget timelines reloaded');
    }
  } catch (error) {
    logger.info('Widget reload not available');
  }
};

/**
 * Met a jour et rafraichit le widget
 */
export const refreshWidget = async (): Promise<void> => {
  await updateWidget();
  await reloadWidget();
};

export default {
  updateWidget,
  reloadWidget,
  refreshWidget,
};
