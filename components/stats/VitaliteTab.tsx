import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getSleepStats } from '@/lib/sleepService';
import { getHydrationHistory } from '@/lib/storage';
import { calculateReadinessScore } from '@/lib/readinessService';
import { VitaliteStats } from './VitaliteStats';
import logger from '@/lib/security/logger';

interface VitalityData {
  date: string;
  vitalityScore: number;
  sleepHours: number;
  hydrationMl: number;
  sleepDebt: number;
}

export default function VitaliteTab() {
  const { colors } = useTheme();
  const [data, setData] = useState<VitalityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Récupérer les VRAIES données uniquement
      const sleepStats = await getSleepStats();
      const hydrationHistory = await getHydrationHistory(30);
      const readiness = await calculateReadinessScore(7);

      // Ne créer des données que si on a des vraies données
      const vitalityHistory: VitalityData[] = [];

      // Utiliser l'historique réel de sommeil si disponible
      if (sleepStats.weeklyData && sleepStats.weeklyData.length > 0) {
        for (const entry of sleepStats.weeklyData.slice(-30)) {
          const dateStr = entry.date;

          // Chercher l'hydratation pour cette date
          const hydrationEntry = hydrationHistory?.find((h) => h.date === dateStr);

          vitalityHistory.push({
            date: dateStr,
            vitalityScore: readiness.score,
            sleepHours: (entry.duration || 0) / 60, // duration est en minutes
            hydrationMl: hydrationEntry?.totalAmount || 0,
            sleepDebt: sleepStats.sleepDebt || 0,
          });
        }
      }

      setData(vitalityHistory);
    } catch (error) {
      logger.error('Erreur chargement Vitalité:', error);
      setData([]); // Pas de données fictives en cas d'erreur
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
        <Text style={[styles.emptyIcon, { color: colors.textMuted }]}></Text>
        <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
          Aucune donnée de vitalité
        </Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Les données de vitalité seront collectées automatiquement
        </Text>
      </View>
    );
  }

  return <VitaliteStats data={data} />;
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
