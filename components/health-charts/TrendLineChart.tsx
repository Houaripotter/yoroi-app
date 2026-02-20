import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { SmoothLineChart } from '@/components/charts/SmoothLineChart';
import { SPACING, RADIUS } from '@/constants/design';
import { TrendingUp, TrendingDown, Maximize2 } from 'lucide-react-native';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface TrendLineChartProps {
  title: string;
  data: { date: string; value: number }[];
  color: string;
  unit: string;
  colors: any;
  goal?: number;
  onPress?: () => void;
}

export function TrendLineChart({ title, data, color, unit, colors, goal, onPress }: TrendLineChartProps) {
  if (!data || data.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.glass, borderColor: colors.glassBorder },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucune donnee disponible
          </Text>
        </View>
      </View>
    );
  }

  // Calculer statistiques
  const values = data.map(d => d.value);
  const current = values[values.length - 1];
  const first = values[0];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const change = current - first;
  const changePercent = ((change / first) * 100);

  // Formater les données pour SmoothLineChart avec dates lisibles
  const chartData = data.map(item => {
    const date = new Date(item.date);
    // Afficher jour/mois pour meilleure lisibilite
    const label = data.length <= 7
      ? format(date, 'd MMM', { locale: fr })
      : date.getDate().toString();
    return {
      value: item.value,
      label,
    };
  });

  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[
        styles.container,
        { backgroundColor: colors.glass, borderColor: colors.glassBorder },
      ]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {/* Expand icon */}
      {onPress && (
        <View style={styles.expandIcon}>
          <Maximize2 size={18} color={colors.textMuted} />
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Actuel</Text>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>
              {current.toFixed(1)} {unit}
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Variation</Text>
            <View style={styles.changeRow}>
              {change >= 0 ? (
                <TrendingUp size={14} color={change >= 0 ? colors.success : colors.danger} />
              ) : (
                <TrendingDown size={14} color={change >= 0 ? colors.success : colors.danger} />
              )}
              <Text
                style={[
                  styles.statValue,
                  { color: change >= 0 ? colors.success : colors.danger },
                ]}
              >
                {change >= 0 ? '+' : ''}
                {change.toFixed(1)} {unit}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <SmoothLineChart
            data={chartData}
            width={Math.max(Dimensions.get('window').width - SPACING.lg * 2, data.length * 50)}
            height={data.length <= 7 ? 180 : 160}
            color={color}
            showGradient={true}
            showDots={data.length <= 14}
            curved={true}
            thickness={data.length <= 7 ? 3 : 2}
            goalValue={goal}
          />
        </ScrollView>
      </View>

      {/* Stats Footer */}
      <View style={styles.footer}>
        <View style={styles.footerStat}>
          <Text style={[styles.footerLabel, { color: colors.textMuted }]}>Min</Text>
          <Text style={[styles.footerValue, { color: colors.textSecondary }]}>
            {min.toFixed(1)} {unit}
          </Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={[styles.footerLabel, { color: colors.textMuted }]}>Moy</Text>
          <Text style={[styles.footerValue, { color: colors.textSecondary }]}>
            {avg.toFixed(1)} {unit}
          </Text>
        </View>
        <View style={styles.footerStat}>
          <Text style={[styles.footerLabel, { color: colors.textMuted }]}>Max</Text>
          <Text style={[styles.footerValue, { color: colors.textSecondary }]}>
            {max.toFixed(1)} {unit}
          </Text>
        </View>
      </View>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    marginBottom: SPACING.md,
    position: 'relative',
  },
  expandIcon: {
    position: 'absolute',
    top: SPACING.lg,
    right: SPACING.lg,
    zIndex: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    padding: 6,
  },
  header: {
    marginBottom: SPACING.md,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: SPACING.sm,
  },
  statsRow: {
    flexDirection: 'row',
    gap: SPACING.lg,
  },
  stat: {
    gap: 4,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  chartContainer: {
    marginVertical: SPACING.sm,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  footerStat: {
    alignItems: 'center',
    gap: 4,
  },
  footerLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  footerValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  emptyState: {
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
