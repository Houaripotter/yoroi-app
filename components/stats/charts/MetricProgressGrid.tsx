// ============================================
// METRIC PROGRESS GRID - Grille 2 colonnes de MetricProgressCard
// Remplace HistoryScrollCard avec un layout vertical en grille
// ============================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useI18n } from '@/lib/I18nContext';
import { MetricProgressCard } from './MetricProgressCard';
import { MetricRange } from '@/lib/healthRanges';

interface HistoryDataPoint {
  date: string;
  value: number;
}

interface MetricProgressGridProps {
  data: HistoryDataPoint[];
  unit: string;
  color: string;
  healthRange?: MetricRange;
  getStatus?: (value: number) => { color: string; label: string };
  formatValue?: (value: number) => string;
  onPress?: () => void;
  // Weight goal
  userGoal?: 'lose' | 'maintain' | 'gain';
  // Evolution (measurements)
  showEvolution?: boolean;
  evolutionGoal?: 'increase' | 'decrease' | 'stable';
  // Max items to display (default 6)
  maxItems?: number;
}

export const MetricProgressGrid: React.FC<MetricProgressGridProps> = ({
  data,
  unit,
  color,
  healthRange,
  getStatus,
  formatValue,
  onPress,
  userGoal,
  showEvolution,
  evolutionGoal,
  maxItems = 6,
}) => {
  const { locale } = useI18n();

  // Take the last N items (most recent)
  const items = data.slice(-maxItems);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString(locale, { month: 'short' });
    return `${day} ${month}`;
  };

  // Build pairs for 2-column layout
  const rows: HistoryDataPoint[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    rows.push(items.slice(i, i + 2));
  }

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((item, colIndex) => {
            const globalIndex = rowIndex * 2 + colIndex;
            const previousItem = globalIndex > 0 ? items[globalIndex - 1] : null;

            return (
              <View key={colIndex} style={styles.cell}>
                <MetricProgressCard
                  label={formatDate(item.date)}
                  value={item.value}
                  unit={unit}
                  color={color}
                  healthRange={healthRange}
                  getStatus={getStatus}
                  formatValue={formatValue}
                  onPress={onPress}
                  userGoal={userGoal}
                  previousValue={previousItem?.value ?? null}
                  showEvolution={showEvolution}
                  evolutionGoal={evolutionGoal}
                />
              </View>
            );
          })}
          {/* Spacer if odd number of items in last row */}
          {row.length === 1 && <View style={styles.cell} />}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 10,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
  },
  cell: {
    flex: 1,
  },
});
