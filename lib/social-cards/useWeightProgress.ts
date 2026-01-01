import { useState, useEffect } from 'react';
import { getWeights, getProfile, Weight, Profile } from '@/lib/database';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export interface WeightProgressStats {
  // Poids actuel et objectif
  currentWeight: number;
  startWeight: number;
  targetWeight: number;

  // Progression
  totalLost: number;        // kg perdus depuis le debut
  remaining: number;        // kg restants pour atteindre l'objectif
  progressPercent: number;  // % de progression vers l'objectif

  // Historique recent (30 derniers jours)
  recentHistory: Array<{
    date: string;
    weight: number;
  }>;

  // Evolution mensuelle
  monthlyChange: number;    // changement ce mois
  weeklyChange: number;     // changement cette semaine

  // Badges / Achievements
  milestones: Array<{
    name: string;
    value: number;
    achieved: boolean;
  }>;

  // Meta
  startDate?: string;
  daysActive: number;
  totalEntries: number;
}

// ============================================
// HOOK
// ============================================

export const useWeightProgress = (): {
  stats: WeightProgressStats | null;
  isLoading: boolean;
  error: string | null;
} => {
  const [stats, setStats] = useState<WeightProgressStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadWeightProgress();
  }, []);

  const loadWeightProgress = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Charger profil et pesees
      const [profile, weights] = await Promise.all([
        getProfile(),
        getWeights(365), // 1 an d'historique
      ]);

      if (!weights || weights.length === 0) {
        setError('Aucune pesee enregistree');
        setIsLoading(false);
        return;
      }

      // Trier par date croissante
      const sortedWeights = [...weights].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const currentWeight = sortedWeights[sortedWeights.length - 1].weight;
      const startWeight = profile?.start_weight || sortedWeights[0].weight;
      const targetWeight = profile?.target_weight || currentWeight;

      // Calculs de progression
      const totalLost = startWeight - currentWeight;
      const remaining = currentWeight - targetWeight;
      const totalToLose = startWeight - targetWeight;
      const progressPercent = totalToLose > 0
        ? Math.min(100, Math.max(0, (totalLost / totalToLose) * 100))
        : 0;

      // Historique recent (30 derniers jours)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentHistory = sortedWeights
        .filter(w => new Date(w.date) >= thirtyDaysAgo)
        .map(w => ({ date: w.date, weight: w.weight }));

      // Evolution mensuelle
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthWeights = sortedWeights.filter(w => new Date(w.date) >= monthStart);
      const monthlyChange = monthWeights.length >= 2
        ? monthWeights[monthWeights.length - 1].weight - monthWeights[0].weight
        : 0;

      // Evolution hebdomadaire
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);

      const weekWeights = sortedWeights.filter(w => new Date(w.date) >= weekAgo);
      const weeklyChange = weekWeights.length >= 2
        ? weekWeights[weekWeights.length - 1].weight - weekWeights[0].weight
        : 0;

      // Milestones
      const milestones = [
        { name: '-1 kg', value: 1, achieved: totalLost >= 1 },
        { name: '-2 kg', value: 2, achieved: totalLost >= 2 },
        { name: '-5 kg', value: 5, achieved: totalLost >= 5 },
        { name: '-10 kg', value: 10, achieved: totalLost >= 10 },
        { name: '-15 kg', value: 15, achieved: totalLost >= 15 },
        { name: '-20 kg', value: 20, achieved: totalLost >= 20 },
      ].filter(m => m.value <= Math.max(totalLost + 5, 10)); // Montrer les prochains

      // Nombre de jours depuis le debut
      const startDate = profile?.start_date || sortedWeights[0].date;
      const daysActive = Math.floor(
        (Date.now() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)
      );

      const weightStats: WeightProgressStats = {
        currentWeight: Math.round(currentWeight * 10) / 10,
        startWeight: Math.round(startWeight * 10) / 10,
        targetWeight: Math.round(targetWeight * 10) / 10,
        totalLost: Math.round(totalLost * 10) / 10,
        remaining: Math.round(remaining * 10) / 10,
        progressPercent: Math.round(progressPercent),
        recentHistory,
        monthlyChange: Math.round(monthlyChange * 10) / 10,
        weeklyChange: Math.round(weeklyChange * 10) / 10,
        milestones,
        startDate,
        daysActive,
        totalEntries: weights.length,
      };

      setStats(weightStats);
    } catch (err) {
      logger.error('Erreur chargement stats poids:', err);
      setError('Impossible de charger les statistiques');
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, error };
};
