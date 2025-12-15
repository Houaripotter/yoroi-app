import { NativeModules, Platform } from 'react-native';

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
    console.log('Widget: Not available on this platform');
    return;
  }

  try {
    const delta = previousWeight ? currentWeight - previousWeight : 0;
    const timestamp = (date || new Date()).getTime() / 1000; // Unix timestamp en secondes

    WidgetModule.updateWidgetData(currentWeight, delta, timestamp);
    console.log('Widget: Data updated', { currentWeight, delta, timestamp });
  } catch (error) {
    console.error('Widget: Error updating data', error);
  }
};

// Efface les données du widget
export const clearWidget = async (): Promise<void> => {
  if (!isWidgetAvailable()) {
    return;
  }

  try {
    WidgetModule.clearWidgetData();
    console.log('Widget: Data cleared');
  } catch (error) {
    console.error('Widget: Error clearing data', error);
  }
};

// Force le rechargement du widget
export const reloadWidget = async (): Promise<void> => {
  if (!isWidgetAvailable()) {
    return;
  }

  try {
    WidgetModule.reloadWidget();
    console.log('Widget: Reloaded');
  } catch (error) {
    console.error('Widget: Error reloading', error);
  }
};

export default {
  isWidgetAvailable,
  updateWidget,
  clearWidget,
  reloadWidget,
};
