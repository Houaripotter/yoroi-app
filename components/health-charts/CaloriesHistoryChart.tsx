import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { SPACING, RADIUS } from '@/constants/design';
import { Maximize2 } from 'lucide-react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CaloriesHistoryChartProps {
  data: {
    date: string;
    active: number;
    basal: number;
    total: number;
  }[];
  colors: any;
  onPress?: () => void;
}

export function CaloriesHistoryChart({ data, colors, onPress }: CaloriesHistoryChartProps) {
  if (!data || data.length === 0) {
    return (
      <View
        style={[
          styles.container,
          { backgroundColor: colors.glass, borderColor: colors.glassBorder },
        ]}
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Historique Calories (7 jours)
        </Text>
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            Aucune donnée de calories
          </Text>
        </View>
      </View>
    );
  }

  // Calculer moyennes
  const avgActive = Math.round(data.reduce((sum, d) => sum + d.active, 0) / data.length);
  const avgTotal = Math.round(data.reduce((sum, d) => sum + d.total, 0) / data.length);

  // Formater les données pour le bar chart (active calories)
  const chartData = data.map((item) => {
    const date = new Date(item.date);
    const day = date.getDate();
    const month = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][date.getMonth()];

    return {
      value: item.active, // Afficher calories actives
      label: data.length <= 7 ? `${day} ${month}` : `${day}`,
      frontColor: colors.danger,
      spacing: 2,
      labelWidth: 50,
      labelTextStyle: { color: colors.textMuted, fontSize: 10 },
    };
  });

  const maxValue = Math.max(...data.map(d => d.active));

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
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Historique Calories ({data.length}j)
        </Text>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moy Active</Text>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>
              {avgActive} kcal
            </Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Moy Total</Text>
            <Text style={[styles.statValue, { color: colors.textSecondary }]}>
              {avgTotal} kcal
            </Text>
          </View>
        </View>
      </View>

      {/* Chart */}
      <View style={styles.chartContainer}>
        <BarChart
          data={chartData}
          barWidth={32}
          spacing={24}
          initialSpacing={16}
          roundedTop
          roundedBottom
          hideRules
          xAxisThickness={1}
          xAxisColor={colors.glassBorder}
          yAxisThickness={0}
          yAxisTextStyle={{ color: colors.textMuted }}
          noOfSections={4}
          maxValue={Math.ceil(maxValue / 500) * 500}
          height={180}
        />
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        <LegendItem label="Active" color="#EF4444" colors={colors} />
        <LegendItem label="Repos (BMR)" color="#A855F7" colors={colors} />
      </View>
    </Wrapper>
  );
}

function LegendItem({ label, color, colors }: { label: string; color: string; colors: any }) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
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
    flexDirection: 'column',
    gap: 2,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  chartContainer: {
    marginVertical: SPACING.sm,
    alignItems: 'center',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.md,
    marginTop: SPACING.md,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.05)',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 12,
    fontWeight: '500',
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
