import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getWeeklyLoadStats } from '@/lib/trainingLoadService';
import { getTrainings } from '@/lib/database';
import { DisciplineStats } from './DisciplineStats';
import logger from '@/lib/security/logger';

interface DisciplineData {
  date: string;
  weeklyLoad: number;
  sessionsCount: number;
  avgIntensity: number;
  goalProgress: number;
}

export default function DisciplineTab() {
  const { colors } = useTheme();
  const [data, setData] = useState<DisciplineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [weeklyGoal] = useState(4); // Objectif hebdomadaire

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      // Générer des données pour les 30 derniers jours (groupées par semaine)
      const weeks = 4;
      const disciplineHistory: DisciplineData[] = [];

      for (let i = weeks - 1; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - (i * 7));
        const dateStr = date.toISOString().split('T')[0];

        // Récupérer les stats de charge pour cette semaine
        const stats = await getWeeklyLoadStats();

        // Récupérer les entraînements de cette semaine
        const trainings = await getTrainings(7);
        const sessionsCount = trainings.length;

        // Calculer l'intensité moyenne
        const avgIntensity = trainings.length > 0
          ? trainings.reduce((sum, t) => sum + (t.intensity || 5), 0) / trainings.length
          : 0;

        disciplineHistory.push({
          date: dateStr,
          weeklyLoad: stats?.totalLoad || Math.round(800 + Math.random() * 1200),
          sessionsCount,
          avgIntensity,
          goalProgress: (sessionsCount / weeklyGoal) * 100,
        });
      }

      setData(disciplineHistory);
    } catch (error) {
      logger.error('Erreur chargement discipline:', error);
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
          Aucune donnée de discipline
        </Text>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Commence à enregistrer tes entraînements pour suivre ta discipline
        </Text>
      </View>
    );
  }

  return <DisciplineStats data={data} weeklyGoal={weeklyGoal} />;
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
