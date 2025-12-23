// ============================================
// YOROI - COMPTEUR ANNUEL D'ENTRAÎNEMENTS
// ============================================

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Flame, Target, TrendingUp } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

export const YearlyCounter: React.FC = () => {
  const { colors } = useTheme();
  const [yearCount, setYearCount] = useState(0);
  const [monthCount, setMonthCount] = useState(0);

  useEffect(() => {
    loadCounts();
  }, []);

  const loadCounts = async () => {
    try {
      const data = await AsyncStorage.getItem('yoroi_trainings');
      if (!data) return;

      const trainings = JSON.parse(data);
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();

      let yearTotal = 0;
      let monthTotal = 0;

      Object.entries(trainings).forEach(([date, sessions]) => {
        const d = new Date(date);
        const count = (sessions as any[]).length;

        if (d.getFullYear() === currentYear) {
          yearTotal += count;

          if (d.getMonth() === currentMonth) {
            monthTotal += count;
          }
        }
      });

      setYearCount(yearTotal);
      setMonthCount(monthTotal);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  // Calculer le nombre de jours dans l'année
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.ceil((now.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));

  // Objectif annuel (ex: 200 entraînements)
  const yearlyGoal = 200;
  const progressPercent = Math.min(100, (yearCount / yearlyGoal) * 100);

  // Moyenne par semaine
  const weeksElapsed = Math.max(1, Math.floor(dayOfYear / 7));
  const avgPerWeek = (yearCount / weeksElapsed).toFixed(1);

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundElevated }]}>
      <View style={styles.header}>
        <Flame size={24} color={colors.accent} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Compteur {now.getFullYear()}
        </Text>
      </View>

      {/* Compteur principal */}
      <View style={styles.mainCounter}>
        <Text style={[styles.bigNumber, { color: colors.textPrimary }]}>
          {yearCount}
        </Text>
        <Text style={[styles.separator, { color: colors.textMuted }]}>/</Text>
        <Text style={[styles.total, { color: colors.textMuted }]}>
          {yearlyGoal}
        </Text>
      </View>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        entraînements cette année
      </Text>

      {/* Barre de progression */}
      <View style={[styles.progressBar, { backgroundColor: colors.backgroundLight }]}>
        <View
          style={[
            styles.progressFill,
            {
              width: `${progressPercent}%`,
              backgroundColor: colors.accent,
            }
          ]}
        />
      </View>

      {/* Stats détaillées */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Target size={16} color={colors.textMuted} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {monthCount}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            ce mois
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <TrendingUp size={16} color={colors.textMuted} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {avgPerWeek}
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            /semaine
          </Text>
        </View>

        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />

        <View style={styles.statItem}>
          <Flame size={16} color={colors.textMuted} />
          <Text style={[styles.statValue, { color: colors.textPrimary }]}>
            {Math.round(progressPercent)}%
          </Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>
            objectif
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 16,
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  mainCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'center',
  },
  bigNumber: {
    fontSize: 64,
    fontWeight: '900',
  },
  separator: {
    fontSize: 40,
    marginHorizontal: 8,
  },
  total: {
    fontSize: 32,
    fontWeight: '600',
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 4,
    marginBottom: 16,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 20,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginVertical: 8,
  },
});

export default YearlyCounter;
