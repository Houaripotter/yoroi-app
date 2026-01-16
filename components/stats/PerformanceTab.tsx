import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import { getSleepStats } from '@/lib/sleepService';
import { getWeeklyLoadStats } from '@/lib/trainingLoadService';
import { PerformanceStats } from './PerformanceStats';
import logger from '@/lib/security/logger';

interface PerformanceData {
  date: string;
  weeklyLoad: number;
  trainingHours: number;
  sleepHours: number;
  workRestRatio: number;
}

export default function PerformanceTab() {
  const { colors } = useTheme();
  const [data, setData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPerformanceData();
  }, []);

  const loadPerformanceData = async () => {
    try {
      setLoading(true);

      // Générer des données pour les 4 dernières semaines
      const weeks = 4;
      const performanceHistory: PerformanceData[] = [];

      for (let i = weeks - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        const dateStr = date.toISOString().split('T')[0];

        // Récupérer les stats
        const stats = await getWeeklyLoadStats();
        const trainings = await getTrainings(7);
        const sleepStats = await getSleepStats();

        // Calculer les heures d'entraînement
        const trainingMinutes = trainings.reduce((sum, t) => sum + (t.duration_minutes || 60), 0);
        const trainingHours = trainingMinutes / 60;

        // Sommeil (moyenne hebdomadaire)
        const sleepHours = sleepStats?.averageDuration ? (sleepStats.averageDuration / 60) * 7 : 52.5;

        // Ratio Work/Rest
        const workRestRatio = sleepHours > 0 ? trainingHours / (sleepHours / 7) : 0;

        performanceHistory.push({
          date: dateStr,
          weeklyLoad: stats?.totalLoad || Math.round(1000 + Math.random() * 1000),
          trainingHours,
          sleepHours: sleepHours / 7, // Moyenne par jour
          workRestRatio,
        });
      }

      setData(performanceHistory);
    } catch (error) {
      logger.error('Erreur chargement performance:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>Chargement...</Text>
      </View>
    );
  }

  if (data.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={[styles.emptyIcon, { color: colors.textMuted }]}>📈</Text>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Aucune donnée de performance
        </Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Les données de performance seront collectées automatiquement
        </Text>
      </View>
    );
  }

  return <PerformanceStats data={data} />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  loadingText: {
    fontSize: 14,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
});
