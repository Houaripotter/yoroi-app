import { useState, useEffect } from 'react';
import { getTrainings } from '@/lib/database';
import { getClubLogoSource } from '@/lib/sports';
import { getGlobalGoalStats } from '@/lib/trainingGoalsService';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export interface YearStats {
  year: number;
  totalDays: number;              // Jours UNIQUES avec training
  totalDaysInYear: number;        // 365 ou 366
  percentage: number;             // Progression %
  weeklyGoal: number;             // Objectif hebdo total de l'utilisateur
  yearlyGoal: number;             // Objectif annuel (weeklyGoal * 52)
  activityBreakdown: Array<{      // Top 5 clubs
    clubName: string;
    clubLogo?: any;                // Source du logo (require ou {uri})
    count: number;
    percentage: number;
  }>;
  bestStreak: number;
  currentStreak: number;
  busiestMonth: {
    month: string;
    monthNumber: number;
    daysActive: number;
  };
  projection: {
    estimatedTotal: number;
    onTrackFor200: boolean;
    note?: string;
  };
}

// ============================================
// HELPERS
// ============================================

/**
 * Calcule le nombre de jours dans une année (gère les années bissextiles)
 */
const getDaysInYear = (year: number): number => {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
};

/**
 * Calcule les streaks (séries de jours consécutifs avec training)
 */
const calculateStreaks = (uniqueDates: Date[]): { current: number; best: number } => {
  if (uniqueDates.length === 0) return { current: 0, best: 0 };

  // Trier par date croissante
  const sorted = [...uniqueDates].sort((a, b) => a.getTime() - b.getTime());

  let currentStreak = 1;
  let bestStreak = 1;
  let tempStreak = 1;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calculer le meilleur streak historique
  for (let i = 1; i < sorted.length; i++) {
    const prevDate = sorted[i - 1];
    const currDate = sorted[i];

    const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      tempStreak = 1;
    }
  }

  // Calculer le streak actuel (du dernier jour jusqu'à aujourd'hui)
  const lastDate = sorted[sorted.length - 1];
  const daysSinceLastTraining = Math.floor((today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLastTraining <= 1) {
    // Le streak est actif (dernier training aujourd'hui ou hier)
    currentStreak = 1;

    // Remonter pour compter les jours consécutifs
    for (let i = sorted.length - 2; i >= 0; i--) {
      const prevDate = sorted[i];
      const currDate = sorted[i + 1];
      const diffDays = Math.floor((currDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 1) {
        currentStreak++;
      } else {
        break;
      }
    }
  } else {
    currentStreak = 0; // Streak rompu
  }

  return { current: currentStreak, best: bestStreak };
};

/**
 * Trouve le mois le plus actif
 */
const findBusiestMonth = (trainings: any[]): { month: string; monthNumber: number; daysActive: number } => {
  const monthCounts: { [key: number]: Set<string> } = {};

  trainings.forEach(training => {
    const date = new Date(training.date);
    const month = date.getMonth(); // 0-11
    const day = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!monthCounts[month]) {
      monthCounts[month] = new Set();
    }
    monthCounts[month].add(day);
  });

  // Trouver le mois avec le plus de jours actifs
  let busiestMonth = 0;
  let maxDays = 0;

  Object.entries(monthCounts).forEach(([month, days]) => {
    if (days.size > maxDays) {
      maxDays = days.size;
      busiestMonth = parseInt(month);
    }
  });

  const monthNames = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];

  return {
    month: monthNames[busiestMonth] || 'Janvier',
    monthNumber: busiestMonth,
    daysActive: maxDays,
  };
};

// ============================================
// HOOK
// ============================================

export const useYearStats = (year?: number): { stats: YearStats | null; isLoading: boolean; error: string | null } => {
  const [stats, setStats] = useState<YearStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadYearStats();
  }, [year]);

  const loadYearStats = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Année par défaut = année en cours
      const targetYear = year || new Date().getFullYear();

      // Dates de l'année
      const yearStart = new Date(targetYear, 0, 1); // 1er janvier
      yearStart.setHours(0, 0, 0, 0);

      const today = new Date();
      today.setHours(23, 59, 59, 999); // Fin de journée pour inclure toutes les séances d'aujourd'hui

      const yearEnd = new Date(targetYear, 11, 31, 23, 59, 59); // 31 décembre
      const isCurrentYear = targetYear === today.getFullYear();
      const endDate = isCurrentYear ? today : yearEnd;

      // Récupérer TOUS les trainings
      const allTrainings = await getTrainings();

      // Filtrer sur l'année cible
      const yearTrainings = allTrainings.filter(t => {
        const date = new Date(t.date);
        return date >= yearStart && date <= endDate;
      });

      // 1. COMPTER LES JOURS UNIQUES (plusieurs trainings/jour = 1 seul jour)
      const uniqueDatesSet = new Set<string>();
      yearTrainings.forEach(t => {
        const dateStr = t.date.split('T')[0]; // YYYY-MM-DD
        uniqueDatesSet.add(dateStr);
      });

      const totalDays = uniqueDatesSet.size;
      const totalDaysInYear = getDaysInYear(targetYear);
      const percentage = totalDaysInYear > 0 ? (totalDays / totalDaysInYear) * 100 : 0;

      // 2. RÉPARTITION PAR CLUB (Top 5)
      const clubCounts: { [clubName: string]: { count: number; logo?: string } } = {};

      yearTrainings.forEach(t => {
        const clubName = t.club_name || 'Sans club';
        if (!clubCounts[clubName]) {
          clubCounts[clubName] = { count: 0, logo: t.club_logo };
        }
        clubCounts[clubName].count++;
      });

      const activityBreakdown = Object.entries(clubCounts)
        .map(([clubName, data]) => ({
          clubName,
          clubLogo: data.logo ? getClubLogoSource(data.logo) : null,
          count: data.count,
          percentage: totalDays > 0 ? (data.count / yearTrainings.length) * 100 : 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5); // Top 5

      // 3. CALCULER LES STREAKS
      const uniqueDatesArray = Array.from(uniqueDatesSet).map(dateStr => {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d;
      });

      const { current: currentStreak, best: bestStreak } = calculateStreaks(uniqueDatesArray);

      // 4. MOIS LE PLUS ACTIF
      const busiestMonth = yearTrainings.length > 0
        ? findBusiestMonth(yearTrainings)
        : { month: 'Aucun', monthNumber: 0, daysActive: 0 };

      // 5. PROJECTION FIN D'ANNÉE
      const daysSoFar = Math.floor((endDate.getTime() - yearStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      const daysRemaining = totalDaysInYear - daysSoFar;

      let projection = {
        estimatedTotal: totalDays,
        onTrackFor200: false,
        note: undefined as string | undefined,
      };

      if (isCurrentYear && daysSoFar > 0) {
        const avgPerDay = totalDays / daysSoFar;
        const estimatedTotal = Math.round(totalDays + (avgPerDay * daysRemaining));

        projection = {
          estimatedTotal,
          onTrackFor200: estimatedTotal >= 200,
          note: daysSoFar < 30 ? 'Trop tôt pour une projection fiable' : undefined,
        };
      }

      // 6. RÉCUPÉRER L'OBJECTIF HEBDOMADAIRE TOTAL
      let weeklyGoal = 4; // Valeur par défaut
      try {
        const goalStats = await getGlobalGoalStats();
        if (goalStats.totalWeeklyTarget > 0) {
          weeklyGoal = goalStats.totalWeeklyTarget;
        }
      } catch (e) {
        // Si pas d'objectifs définis, utiliser la valeur par défaut
      }
      const yearlyGoal = weeklyGoal * 52;

      // Construire les stats finales
      const yearStats: YearStats = {
        year: targetYear,
        totalDays,
        totalDaysInYear,
        percentage: Math.round(percentage * 10) / 10, // 1 décimale
        weeklyGoal,
        yearlyGoal,
        activityBreakdown,
        bestStreak,
        currentStreak,
        busiestMonth,
        projection,
      };

      setStats(yearStats);
    } catch (err) {
      logger.error('Erreur chargement stats annuelles:', err);
      setError('Impossible de charger les statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, error };
};
