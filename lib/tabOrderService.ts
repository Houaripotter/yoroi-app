// ============================================
// YOROI - SERVICE PERSONNALISATION TABBAR
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import logger from '@/lib/security/logger';

const TAB_ORDER_KEY = '@yoroi_tab_order';
export const TAB_ORDER_CHANGED_EVENT = 'YOROI_TAB_ORDER_CHANGED';

export interface TabItem {
  id: string;
  label: string;
  icon: string;
  order: number;
  side: 'left' | 'right';
}

export const DEFAULT_TAB_ORDER: TabItem[] = [
  { id: 'index', label: 'Accueil', icon: 'Home', order: 0, side: 'left' },
  { id: 'stats', label: 'Stats', icon: 'BarChart2', order: 1, side: 'left' },
  { id: 'carnet', label: 'Carnet', icon: 'BookOpen', order: 2, side: 'left' },
  { id: 'planning', label: 'Planning', icon: 'Calendar', order: 0, side: 'right' },
  { id: 'more', label: 'Outils', icon: 'Wrench', order: 1, side: 'right' },
  { id: 'profile', label: 'Profil', icon: 'User', order: 2, side: 'right' },
  { id: 'settings', label: 'Reglages', icon: 'Settings', order: 3, side: 'right' },
];

export const getTabOrder = async (): Promise<TabItem[]> => {
  try {
    const stored = await AsyncStorage.getItem(TAB_ORDER_KEY);
    if (stored) {
      const saved = JSON.parse(stored) as TabItem[];
      return mergeWithDefaults(saved);
    }
    return DEFAULT_TAB_ORDER;
  } catch (error) {
    logger.error('[TAB_ORDER] Erreur chargement:', error);
    return DEFAULT_TAB_ORDER;
  }
};

const mergeWithDefaults = (saved: TabItem[]): TabItem[] => {
  const merged: TabItem[] = [];

  // Keep saved items that still exist in defaults
  for (const def of DEFAULT_TAB_ORDER) {
    const savedItem = saved.find(s => s.id === def.id);
    if (savedItem) {
      merged.push({ ...def, order: savedItem.order, side: savedItem.side });
    } else {
      merged.push(def);
    }
  }

  return merged;
};

export const saveTabOrder = async (tabs: TabItem[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(TAB_ORDER_KEY, JSON.stringify(tabs));
    DeviceEventEmitter.emit(TAB_ORDER_CHANGED_EVENT);
  } catch (error) {
    logger.error('[TAB_ORDER] Erreur sauvegarde:', error);
    throw error;
  }
};

export const resetTabOrder = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TAB_ORDER_KEY);
    DeviceEventEmitter.emit(TAB_ORDER_CHANGED_EVENT);
  } catch (error) {
    logger.error('[TAB_ORDER] Erreur reset:', error);
    throw error;
  }
};

export const getLeftTabs = (tabs: TabItem[]): TabItem[] =>
  tabs.filter(t => t.side === 'left').sort((a, b) => a.order - b.order);

export const getRightTabs = (tabs: TabItem[]): TabItem[] =>
  tabs.filter(t => t.side === 'right').sort((a, b) => a.order - b.order);

export default {
  getTabOrder,
  saveTabOrder,
  resetTabOrder,
  getLeftTabs,
  getRightTabs,
  DEFAULT_TAB_ORDER,
  TAB_ORDER_CHANGED_EVENT,
};
