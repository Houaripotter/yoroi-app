import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { BarChart3, Scale, Droplets, Moon, ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface EssentielWeekSummaryProps {
  weightChange?: number; // en kg
  hydrationRate?: number; // en %
  avgSleep?: number; // en heures
  onPress?: () => void;
}

export const EssentielWeekSummary: React.FC<EssentielWeekSummaryProps> = ({
  weightChange = 0,
  hydrationRate = 0,
  avgSleep = 0,
  onPress,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      <TouchableOpacity style={styles.content} onPress={onPress}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <BarChart3 size={18} color={colors.textMuted} />
            <Text style={[styles.title, { color: colors.textMuted }]}>RÉSUMÉ SEMAINE</Text>
          </View>
          <ChevronRight size={20} color={colors.border} />
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {/* Poids */}
          <View style={styles.statItem}>
            <Scale size={16} color={colors.textMuted} />
            <Text style={[
              styles.statValue,
              {
                color: weightChange < 0 ? '#10B981' : weightChange > 0 ? '#EF4444' : colors.textMuted
              }
            ]}>
              {weightChange > 0 ? '+' : ''}{weightChange.toFixed(1)} kg
            </Text>
          </View>

          {/* Séparateur */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Hydratation */}
          <View style={styles.statItem}>
            <Droplets size={16} color={colors.textMuted} />
            <Text style={[
              styles.statValue,
              { color: hydrationRate >= 80 ? '#10B981' : '#F59E0B' }
            ]}>
              {hydrationRate}%
            </Text>
          </View>

          {/* Séparateur */}
          <View style={[styles.separator, { backgroundColor: colors.border }]} />

          {/* Sommeil */}
          <View style={styles.statItem}>
            <Moon size={16} color={colors.textMuted} />
            <Text style={[
              styles.statValue,
              { color: avgSleep >= 7 ? '#10B981' : '#F59E0B' }
            ]}>
              {avgSleep}h moy
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  content: {
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  separator: {
    width: 1,
    height: 20,
  },
});
