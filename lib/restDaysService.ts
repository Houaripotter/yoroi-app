// ============================================
// YOROI - SERVICE JOURS DE REPOS
// ============================================
// Gestion des jours de repos planifiés

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';

const REST_DAYS_KEY = '@yoroi_rest_days';

export interface RestDay {
  date: string; // Format YYYY-MM-DD
  reason?: string;
}

// Récupérer tous les jours de repos
export const getRestDays = async (): Promise<RestDay[]> => {
  try {
    const data = await AsyncStorage.getItem(REST_DAYS_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    logger.error('Erreur lecture jours repos:', error);
    return [];
  }
};

// Vérifier si une date est un jour de repos
export const isRestDay = async (date: string): Promise<boolean> => {
  const restDays = await getRestDays();
  return restDays.some(rd => rd.date === date);
};

// Ajouter un jour de repos
export const addRestDay = async (date: string, reason?: string): Promise<void> => {
  try {
    const restDays = await getRestDays();
    const exists = restDays.find(rd => rd.date === date);

    if (!exists) {
      restDays.push({ date, reason });
      await AsyncStorage.setItem(REST_DAYS_KEY, JSON.stringify(restDays));
    }
  } catch (error) {
    logger.error('Erreur ajout jour repos:', error);
  }
};

// Supprimer un jour de repos
export const removeRestDay = async (date: string): Promise<void> => {
  try {
    const restDays = await getRestDays();
    const filtered = restDays.filter(rd => rd.date !== date);
    await AsyncStorage.setItem(REST_DAYS_KEY, JSON.stringify(filtered));
  } catch (error) {
    logger.error('Erreur suppression jour repos:', error);
  }
};

// Toggle jour de repos
export const toggleRestDay = async (date: string): Promise<boolean> => {
  const isRest = await isRestDay(date);
  if (isRest) {
    await removeRestDay(date);
    return false;
  } else {
    await addRestDay(date);
    return true;
  }
};

// Récupérer les jours de repos pour une semaine (format: lun, mar, mer...)
export const getWeekRestDays = async (): Promise<Set<string>> => {
  try {
    const restDays = await getRestDays();
    const weekDays = new Set<string>();

    // On regarde les jours de la semaine actuelle
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));

    const dayNames = ['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'];

    for (let i = 0; i < 7; i++) {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];

      if (restDays.some(rd => rd.date === dateStr)) {
        weekDays.add(dayNames[i]);
      }
    }

    return weekDays;
  } catch (error) {
    logger.error('Erreur lecture jours repos semaine:', error);
    return new Set();
  }
};

// Récupérer les jours de repos pour un mois
export const getMonthRestDays = async (year: number, month: number): Promise<Set<string>> => {
  try {
    const restDays = await getRestDays();
    const monthStr = `${year}-${String(month + 1).padStart(2, '0')}`;

    return new Set(
      restDays
        .filter(rd => rd.date.startsWith(monthStr))
        .map(rd => rd.date)
    );
  } catch (error) {
    logger.error('Erreur lecture jours repos mois:', error);
    return new Set();
  }
};
