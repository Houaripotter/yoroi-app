import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Flame, Footprints } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface EssentielActivityCardProps {
  steps?: number;
  stepsGoal?: number;
  calories?: number;
  caloriesGoal?: number;
}

export const EssentielActivityCard: React.FC<EssentielActivityCardProps> = ({
  steps,
  stepsGoal,
  calories,
  caloriesGoal,
}) => {
  const { colors } = useTheme();
  const stepsPercentage = stepsGoal && steps != null ? Math.min((steps / stepsGoal) * 100, 100) : 0;
  const caloriesPercentage = caloriesGoal && calories != null ? Math.min((calories / caloriesGoal) * 100, 100) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <Flame size={18} color="#F97316" />
        <Text style={styles.title}>ACTIVITÉ DU JOUR</Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        {/* Pas */}
        <View style={styles.statItem}>
          <View style={styles.statIcon}>
            <Footprints size={20} color="#3B82F6" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {steps != null ? steps.toLocaleString() : '--'}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>pas</Text>
          </View>
        </View>

        {/* Séparateur */}
        <View style={[styles.separator, { backgroundColor: colors.border }]} />

        {/* Calories */}
        <View style={styles.statItem}>
          <View style={[styles.statIcon, { backgroundColor: '#FEF3C7' }]}>
            <Flame size={20} color="#F97316" />
          </View>
          <View style={styles.statContent}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{calories != null ? calories : '--'}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>kcal actives</Text>
          </View>
        </View>
      </View>

      {/* Barre de progression globale */}
      <View style={[styles.progressSection, { borderTopColor: colors.border }]}>
        <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
          <View style={[styles.progressFill, { width: `${(stepsPercentage + caloriesPercentage) / 2}%` }]} />
        </View>
        <Text style={[styles.progressText, { color: colors.textMuted }]}>
          {Math.round((stepsPercentage + caloriesPercentage) / 2)}% de l'objectif
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F97316',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#DBEAFE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statContent: {
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  separator: {
    width: 1,
    height: 40,
    marginHorizontal: 16,
  },
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#F97316',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
  },
});
