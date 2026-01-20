import { useState, useEffect } from 'react';
import { getTrainings, getWeights, Training } from '@/lib/database';
import logger from '@/lib/security/logger';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================

export interface ClubTrainingCount {
  clubId?: number;
  clubName: string;
  clubLogo?: string;
  clubColor?: string;
  sport: string;
  count: number;
}

export interface MonthStats {
  year: number;
  month: number;                  // 0-11 (Janvier = 0)
  monthName: string;
  activeDays: number;             // Ex: 18
  totalDays: number;              // 28-31 selon mois
  totalTrainings: number;         // Nombre total d'entrainements
  percentage: number;
  calendar: Array<{               // Grille complète du mois
    day: number;                  // 1-31
    isActive: boolean;
    isToday: boolean;
    isWeekend: boolean;
    dayOfWeek: number;            // 0-6 (Dimanche = 0)
  }>;
  // Entrainements par club
  clubTrainings: ClubTrainingCount[];
  evolution: {
    weight?: { start: number; end: number; change: number };
  };
  bestWeek: {
    weekNumber: number;           // 1-5
    daysActive: number;
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Obtient le nombre de jours dans un mois
 */
const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month + 1, 0).getDate();
};

/**
 * Obtient le nom du mois
 */
const getMonthName = (month: number): string => {
  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  return monthNames[month] || 'Janvier';
};

/**
 * Trouve la meilleure semaine du mois
 */
const findBestWeek = (calendar: MonthStats['calendar']): { weekNumber: number; daysActive: number } => {
  // Grouper les jours par semaine (0-6)
  const weeks: { [weekNum: number]: number } = {};

  calendar.forEach(day => {
    const weekNumber = Math.floor((day.day - 1 + new Date(2024, 0, 1 - day.dayOfWeek).getDay()) / 7);
    if (!weeks[weekNumber]) {
      weeks[weekNumber] = 0;
    }
    if (day.isActive) {
      weeks[weekNumber]++;
    }
  });

  // Trouver la semaine avec le max de jours actifs
  let bestWeek = 1;
  let maxDays = 0;

  Object.entries(weeks).forEach(([weekNum, count]) => {
    if (count > maxDays) {
      maxDays = count;
      bestWeek = parseInt(weekNum) + 1; // Semaine 1-indexed
    }
  });

  return {
    weekNumber: bestWeek,
    daysActive: maxDays,
  };
};

// ============================================
// HOOK
// ============================================

export const useMonthStats = (
  year?: number,
  month?: number
): { stats: MonthStats | null; isLoading: boolean; error: string | null } => {
  const [stats, setStats] = useState<MonthStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadMonthStats();
  }, [year, month]);

  const loadMonthStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const isScreenshotMode = await AsyncStorage.getItem('@yoroi_screenshot_mode') === 'true';

      const today = new Date();
      const targetYear = year !== undefined ? year : today.getFullYear();
      const targetMonth = month !== undefined ? month : today.getMonth(); // 0-11

      const totalDays = getDaysInMonth(targetYear, targetMonth);

      if (isScreenshotMode) {
        // GÉNÉRER DES DONNÉES PARFAITES POUR SCREENSHOTS
        // Ligne qui bouge, pas de trous!
        const calendar: MonthStats['calendar'] = [];
        for (let d = 1; d <= totalDays; d++) {
          const date = new Date(targetYear, targetMonth, d);
          const dayOfWeek = date.getDay();
          // Actif 5 jours sur 7
          const isActive = dayOfWeek !== 0 && dayOfWeek !== 3; 
          calendar.push({
            day: d,
            isActive,
            isToday: d === today.getDate() && date.getMonth() === today.getMonth(),
            isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            dayOfWeek,
          });
        }

        const stats: MonthStats = {
          year: targetYear,
          month: targetMonth,
          monthName: getMonthName(targetMonth),
          activeDays: Math.floor(totalDays * 0.7),
          totalDays,
          totalTrainings: Math.floor(totalDays * 0.8),
          percentage: 72.5,
          calendar,
          clubTrainings: [
            { clubName: 'Basic-Fit', sport: 'musculation', count: 12, clubColor: '#FF6B00' },
            { clubName: 'MMA Factory', sport: 'mma', count: 8, clubColor: '#EF4444' },
            { clubName: 'Yoroi Dojo', sport: 'jjb', count: 6, clubColor: '#3B82F6' },
          ],
          evolution: {
            weight: { start: 82.5, end: 76.8, change: -5.7 }
          },
          bestWeek: { weekNumber: 2, daysActive: 6 }
        };
        setStats(stats);
        setIsLoading(false);
        return;
      }

      // Dates du mois (mode normal)
      const monthStart = new Date(targetYear, targetMonth, 1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(targetYear, targetMonth, totalDays, 23, 59, 59);

      // Récupérer TOUS les trainings
      const allTrainings = await getTrainings();

      // Filtrer sur le mois cible
      const monthTrainings = allTrainings.filter(t => {
        const date = new Date(t.date);
        return date >= monthStart && date <= monthEnd;
      });

      // 1. COMPTER LES JOURS ACTIFS (jours uniques)
      const activeDaysSet = new Set<number>();
      monthTrainings.forEach(t => {
        const date = new Date(t.date);
        const day = date.getDate(); // 1-31
        activeDaysSet.add(day);
      });

      const activeDays = activeDaysSet.size;
      const percentage = totalDays > 0 ? (activeDays / totalDays) * 100 : 0;

      // 2. GÉNÉRER LE CALENDRIER (grille complète du mois)
      const calendar: MonthStats['calendar'] = [];

      for (let day = 1; day <= totalDays; day++) {
        const date = new Date(targetYear, targetMonth, day);
        const dayOfWeek = date.getDay(); // 0-6 (Dimanche = 0)
        const isToday =
          date.getDate() === today.getDate() &&
          date.getMonth() === today.getMonth() &&
          date.getFullYear() === today.getFullYear();

        calendar.push({
          day,
          isActive: activeDaysSet.has(day),
          isToday,
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          dayOfWeek,
        });
      }

      // 3. ÉVOLUTION POIDS (première vs dernière pesée du mois)
      const allWeights = await getWeights(1000);

      const monthWeights = allWeights.filter(w => {
        const date = new Date(w.date);
        return date >= monthStart && date <= monthEnd;
      });

      let evolution: MonthStats['evolution'] = {};

      if (monthWeights.length >= 2) {
        // Trier par date croissante
        const sorted = monthWeights.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const startWeight = sorted[0].weight;
        const endWeight = sorted[sorted.length - 1].weight;
        const change = endWeight - startWeight;

        evolution.weight = {
          start: startWeight,
          end: endWeight,
          change: Math.round(change * 10) / 10, // 1 décimale
        };
      }

      // 4. MEILLEURE SEMAINE
      const bestWeek = findBestWeek(calendar);

      // 5. COMPTAGE DES ENTRAINEMENTS PAR CLUB
      const clubCountsMap = new Map<string, ClubTrainingCount>();

      monthTrainings.forEach((t: Training) => {
        // Utiliser le nom du club comme clé, ou le sport si pas de club
        const key = t.club_name || t.sport;

        const existing = clubCountsMap.get(key);
        if (existing) {
          existing.count++;
        } else {
          clubCountsMap.set(key, {
            clubId: t.club_id,
            clubName: t.club_name || t.sport,
            clubLogo: t.club_logo,
            clubColor: t.club_color,
            sport: t.sport,
            count: 1,
          });
        }
      });

      // Convertir en array et trier par count décroissant
      const clubTrainings = Array.from(clubCountsMap.values())
        .sort((a, b) => b.count - a.count);

      // Construire les stats finales
      const monthStats: MonthStats = {
        year: targetYear,
        month: targetMonth,
        monthName: getMonthName(targetMonth),
        activeDays,
        totalDays,
        totalTrainings: monthTrainings.length,
        percentage: Math.round(percentage * 10) / 10,
        calendar,
        clubTrainings,
        evolution,
        bestWeek,
      };

      setStats(monthStats);
    } catch (err) {
      logger.error('Erreur chargement stats mensuelles:', err);
      setError('Impossible de charger les statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, error };
};
