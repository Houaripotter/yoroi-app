import { NativeModules, Platform } from 'react-native';
import logger from '@/lib/security/logger';

// ============================================
// WIDGET SERVICE - iOS Widget Integration
// ============================================
// Met à jour le widget iOS avec les dernières données de poids

const { WidgetModule } = NativeModules;

interface WidgetData {
  weight: number;
  delta: number;
  timestamp: number;
}

// Vérifie si le module widget est disponible (iOS uniquement)
export const isWidgetAvailable = (): boolean => {
  return Platform.OS === 'ios' && WidgetModule !== null && WidgetModule !== undefined;
};

// Met à jour les données du widget
export const updateWidget = async (
  currentWeight: number,
  previousWeight?: number,
  date?: Date
): Promise<void> => {
  if (!isWidgetAvailable()) {
    logger.info('Widget: Not available on this platform');
    return;
  }

  try {
    const delta = previousWeight ? currentWeight - previousWeight : 0;
    const timestamp = (date || new Date()).getTime() / 1000; // Unix timestamp en secondes

    WidgetModule.updateWidgetData(currentWeight, delta, timestamp);
    logger.info('Widget: Data updated', { currentWeight, delta, timestamp });
  } catch (error) {
    logger.error('Widget: Error updating data', error);
  }
};

// Efface les données du widget
export const clearWidget = async (): Promise<void> => {
  if (!isWidgetAvailable()) {
    return;
  }

  try {
    WidgetModule.clearWidgetData();
    logger.info('Widget: Data cleared');
  } catch (error) {
    logger.error('Widget: Error clearing data', error);
  }
};

// Force le rechargement du widget
export const reloadWidget = async (): Promise<void> => {
  if (!isWidgetAvailable()) {
    return;
  }

  try {
    WidgetModule.reloadWidget();
    logger.info('Widget: Reloaded');
  } catch (error) {
    logger.error('Widget: Error reloading', error);
  }
};

export default {
  isWidgetAvailable,
  updateWidget,
  clearWidget,
  reloadWidget,
};
