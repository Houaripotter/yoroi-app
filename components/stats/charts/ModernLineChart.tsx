// ============================================
// MODERN LINE CHART - Wrapper pour ScrollableLineChart
// Affiche le graphique scrollable + stats MIN/MOY/MAX
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { ScrollableLineChart } from './ScrollableLineChart';

interface ModernLineChartProps {
  data: { date?: string; value: number }[];
  color: string;
  height?: number;
  showGrid?: boolean;
  showGradient?: boolean;
  label?: string;
  compact?: boolean;
  maxDataPoints?: number;
}

export const ModernLineChart: React.FC<ModernLineChartProps> = ({
  data,
  color,
  height = 320,
  showGrid = true,
  showGradient = true,
  label,
  compact = false,
  maxDataPoints,
}) => {
  const { colors, isDark } = useTheme();

  // Si pas de données
  if (!data || data.length === 0) {
    return (
      <View style={styles.container}>
        {label && !compact && (
          <Text style={[styles.label, { color: colors.textPrimary }]}>
            {label}
          </Text>
        )}
        <View style={[styles.emptyContainer, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucune donnée
          </Text>
          {!compact && (
            <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
              Ajoute des données pour voir ton graphique
            </Text>
          )}
        </View>
      </View>
    );
  }

  // Calculer min, max, moyenne
  const values = data.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((sum, v) => sum + v, 0) / values.length;

  return (
    <View style={styles.container}>
      {/* Label */}
      {label && !compact && (
        <Text style={[styles.label, { color: colors.textPrimary }]}>
          {label}
        </Text>
      )}

      {/* Graphique scrollable */}
      <ScrollableLineChart
        data={data}
        color={color}
        height={compact ? 100 : height}
        compact={compact}
      />

      {/* Stats MIN/MOY/MAX - Seulement en mode complet */}
      {!compact && (
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>MIN</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{min.toFixed(1)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>MOY</Text>
            <Text style={[styles.statValue, { color: color, fontWeight: '800' }]}>{avg.toFixed(1)}</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>MAX</Text>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{max.toFixed(1)}</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 0,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    borderRadius: 16,
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 280,
    marginHorizontal: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  emptySubtext: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
});
