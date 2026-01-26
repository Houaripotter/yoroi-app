import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BarChart } from './BarChart';

interface WeightData {
  day: string;
  value: number;
  accent: boolean;
}

interface WeightEvolutionCardProps {
  title: string;
  period: string;
  data: WeightData[];
}

export const WeightEvolutionCard: React.FC<WeightEvolutionCardProps> = ({
  title,
  period,
  data,
}) => {
  const { colors, isDark } = useTheme();

  const chartData = data.map(d => ({
    value: d.value,
    label: d.day,
    accent: d.accent,
  }));

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.backgroundElevated }
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          {title}
        </Text>
        <Text style={[styles.period, { color: isDark ? colors.accent : colors.textPrimary }]}>
          {period}
        </Text>
      </View>

      <BarChart
        data={chartData}
        height={140}
        showLabels={true}
        barRadius={8}
        gap={8}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  period: {
    fontSize: 14,
    fontWeight: '700',
  },
});

export default WeightEvolutionCard;
