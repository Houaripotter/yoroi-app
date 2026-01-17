import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Path, Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';

interface DayActivity {
  day: string;
  shortDay: string;
  percentage: number;  // 0-100
}

interface WeeklyActivityChartProps {
  data?: DayActivity[];
  onPress?: () => void;
}

export const WeeklyActivityChart: React.FC<WeeklyActivityChartProps> = ({
  data,
  onPress,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  // Données par défaut avec traductions
  const defaultData: DayActivity[] = useMemo(() => [
    { day: t('dates.monday'), shortDay: t('dates.mondayShort').charAt(0), percentage: 80 },
    { day: t('dates.tuesday'), shortDay: t('dates.tuesdayShort').charAt(0), percentage: 60 },
    { day: t('dates.wednesday'), shortDay: t('dates.wednesdayShort').charAt(0), percentage: 100 },
    { day: t('dates.thursday'), shortDay: t('dates.thursdayShort').charAt(0), percentage: 40 },
    { day: t('dates.friday'), shortDay: t('dates.fridayShort').charAt(0), percentage: 90 },
    { day: t('dates.saturday'), shortDay: t('dates.saturdayShort').charAt(0), percentage: 20 },
    { day: t('dates.sunday'), shortDay: t('dates.sundayShort').charAt(0), percentage: 0 },
  ], [t]);

  const activeData = data || defaultData;

  const chartWidth = 300;
  const chartHeight = 120;
  const padding = 20;

  // Calculer les positions
  const chartData = useMemo(() => {
    if (activeData.length === 0) return [];

    const maxValue = 100;
    const xStep = (chartWidth - padding * 2) / (activeData.length - 1);

    return activeData.map((item, index) => ({
      x: padding + index * xStep,
      y: chartHeight - padding - (item.percentage / maxValue) * (chartHeight - padding * 2),
      value: item.percentage,
      label: item.shortDay,
    }));
  }, [activeData]);

  // Créer le path avec courbes de Bézier
  const createPath = () => {
    if (chartData.length === 0) return '';

    let path = `M ${chartData[0].x} ${chartData[0].y}`;

    for (let i = 1; i < chartData.length; i++) {
      const prev = chartData[i - 1];
      const curr = chartData[i];
      const cp1x = prev.x + (curr.x - prev.x) / 3;
      const cp1y = prev.y;
      const cp2x = prev.x + 2 * (curr.x - prev.x) / 3;
      const cp2y = curr.y;
      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  // Path pour le gradient
  const createAreaPath = () => {
    if (chartData.length === 0) return '';

    const linePath = createPath();
    const lastPoint = chartData[chartData.length - 1];
    const firstPoint = chartData[0];

    return `${linePath} L ${lastPoint.x} ${chartHeight - padding} L ${firstPoint.x} ${chartHeight - padding} Z`;
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.backgroundElevated }]}
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Activité semaine
        </Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          Cette semaine
        </Text>
      </View>

      <View style={styles.chartContainer}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.accent} stopOpacity="0.3" />
              <Stop offset="1" stopColor={colors.accent} stopOpacity="0.05" />
            </LinearGradient>
          </Defs>

          {/* Gradient area */}
          <Path d={createAreaPath()} fill="url(#areaGradient)" />

          {/* Line */}
          <Path
            d={createPath()}
            stroke={colors.accent}
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />

          {/* Points */}
          {chartData.map((point, index) => (
            <Circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="5"
              fill="#FFFFFF"
              stroke={colors.accent}
              strokeWidth="3"
            />
          ))}
        </Svg>

        {/* Labels des jours */}
        <View style={styles.labelsContainer}>
          {chartData.map((point, index) => (
            <Text
              key={index}
              style={[styles.dayLabel, { color: isDark ? '#FFFFFF' : colors.textMuted, left: point.x - 10 }]}
            >
              {point.label}
            </Text>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
  },
  chartContainer: {
    alignItems: 'center',
  },
  labelsContainer: {
    width: 300,
    height: 20,
    position: 'relative',
    marginTop: 8,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    position: 'absolute',
    width: 20,
    textAlign: 'center',
  },
});
