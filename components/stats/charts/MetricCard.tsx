// ============================================
// METRIC CARD - Card metrique avec sparkline SVG
// minHeight 200px pour eviter chevauchements
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { MetricRange } from '@/lib/healthRanges';
import Svg, { Path, Defs, LinearGradient as SvgLinearGradient, Stop } from 'react-native-svg';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  change?: string;
  onPress?: () => void;
  statusColor?: string;
  statusLabel?: string;
  healthRange?: MetricRange;
  sparklineData?: { value: number; date?: string }[];
}

const SPARKLINE_W = 120;
const SPARKLINE_H = 40;

export const MetricCard: React.FC<MetricCardProps> = ({
  label,
  value,
  unit,
  icon,
  color,
  trend,
  change,
  onPress,
  statusColor,
  statusLabel,
  healthRange,
  sparklineData,
}) => {
  const { colors, isDark } = useTheme();

  // Calculer la position du curseur sur la barre
  const numericValue = typeof value === 'number' ? value : parseFloat(value as string);
  const getBarPosition = () => {
    if (!healthRange || isNaN(numericValue)) return 50;
    const range = healthRange.max - healthRange.min;
    return ((numericValue - healthRange.min) / range) * 100;
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      impactAsync(ImpactFeedbackStyle.Light);
    }
    onPress?.();
  };

  const getTrendIcon = () => {
    if (!trend) return null;

    const iconSize = 16;
    const iconColor = trend === 'up' ? '#10B981' : trend === 'down' ? '#EF4444' : colors.textMuted;

    switch (trend) {
      case 'up':
        return <TrendingUp size={iconSize} color={iconColor} strokeWidth={2.5} />;
      case 'down':
        return <TrendingDown size={iconSize} color={iconColor} strokeWidth={2.5} />;
      case 'stable':
        return <Minus size={iconSize} color={iconColor} strokeWidth={2.5} />;
    }
  };

  // Build sparkline SVG path
  const buildSparkline = () => {
    if (!sparklineData || sparklineData.length < 2) return null;
    const values = sparklineData.map(d => d.value).filter(v => v != null && !isNaN(v));
    if (values.length < 2) return null;

    const minV = Math.min(...values);
    const maxV = Math.max(...values);
    const range = maxV - minV || 1;
    const padY = 4;
    const plotH = SPARKLINE_H - padY * 2;

    const points = values.map((v, i) => ({
      x: (i / (values.length - 1)) * SPARKLINE_W,
      y: padY + plotH - ((v - minV) / range) * plotH,
    }));

    // Build smooth bezier path
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 1; i < points.length; i++) {
      const p = points[i - 1];
      const c = points[i];
      const cx1 = p.x + (c.x - p.x) * 0.4;
      const cx2 = c.x - (c.x - p.x) * 0.4;
      d += ` C ${cx1.toFixed(1)} ${p.y.toFixed(1)}, ${cx2.toFixed(1)} ${c.y.toFixed(1)}, ${c.x.toFixed(1)} ${c.y.toFixed(1)}`;
    }

    // Area path
    const lastPt = points[points.length - 1];
    const areaD = d + ` L ${lastPt.x.toFixed(1)} ${SPARKLINE_H} L ${points[0].x.toFixed(1)} ${SPARKLINE_H} Z`;

    return { linePath: d, areaPath: areaD };
  };

  const sparkline = buildSparkline();

  const Wrapper = onPress ? TouchableOpacity : View;

  const containerStyle = [
    styles.container,
    {
      backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
      borderColor: statusColor || colors.border,
      borderWidth: statusColor ? 3 : 1,
    },
  ];

  return (
    <Wrapper
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.85 : 1}
      style={containerStyle}
    >
      {/* Header avec icone et statut/tendance */}
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}15` }]}>
          {icon}
        </View>

        {statusLabel && (
          <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
            <Text style={[styles.statusText, { color: statusColor }]}>
              {statusLabel}
            </Text>
          </View>
        )}

        {!statusLabel && trend && (
          <View style={styles.trendBadge}>
            {getTrendIcon()}
            {change && (
              <Text style={[styles.changeText, { color: colors.textSecondary }]}>
                {change}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* Label */}
      <Text style={[styles.label, { color: colors.textSecondary }]} numberOfLines={1}>
        {label}
      </Text>

      {/* Valeur */}
      <View style={styles.valueRow}>
        <Text style={[styles.value, { color: statusColor || colors.textPrimary }]}>
          {typeof value === 'number' ? value.toFixed(1) : value}
        </Text>
        <Text style={[styles.unit, { color: colors.textSecondary }]}>
          {unit}
        </Text>
      </View>

      {/* Sparkline SVG */}
      {sparkline && (
        <View style={styles.sparklineContainer}>
          <Svg width={SPARKLINE_W} height={SPARKLINE_H}>
            <Defs>
              <SvgLinearGradient id={`spark-${label}`} x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={color} stopOpacity={isDark ? '0.35' : '0.25'} />
                <Stop offset="1" stopColor={color} stopOpacity="0.02" />
              </SvgLinearGradient>
            </Defs>
            <Path d={sparkline.areaPath} fill={`url(#spark-${label})`} />
            <Path d={sparkline.linePath} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      )}

      {/* Barre de progression avec zones si healthRange fourni */}
      {healthRange && (
        <View style={styles.rangeSection}>
          {/* Barre gradient */}
          <View style={styles.barContainer}>
            <LinearGradient
              colors={healthRange.zones.map((z: { color: string }) => z.color) as [string, string, ...string[]]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradientBar}
            />
            {/* Curseur */}
            <View
              style={[
                styles.cursor,
                {
                  left: `${Math.max(0, Math.min(100, getBarPosition()))}%`,
                  backgroundColor: statusColor || colors.textPrimary,
                  borderColor: colors.backgroundCard,
                },
              ]}
            />
          </View>

          {/* Labels des zones */}
          <View style={styles.labelsRow}>
            <Text style={[styles.zoneLabel, { color: colors.textMuted }]}>
              {healthRange.min}
            </Text>
            {healthRange.zones.map((zone: { label: string; color: string }, idx: number) => (
              <Text
                key={idx}
                style={[
                  styles.zoneLabel,
                  { color: colors.textMuted },
                ]}
                numberOfLines={1}
              >
                {zone.label.toUpperCase()}
              </Text>
            ))}
            <Text style={[styles.zoneLabel, { color: colors.textMuted }]}>
              {healthRange.max}
            </Text>
          </View>

          {/* Source */}
          {healthRange.source && (
            <Text style={[styles.source, { color: colors.textMuted }]}>
              Source: {healthRange.source}
            </Text>
          )}
        </View>
      )}
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 200,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  changeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 16,
    fontWeight: '700',
  },
  sparklineContainer: {
    marginTop: 12,
    alignItems: 'flex-start',
  },
  rangeSection: {
    marginTop: 16,
    gap: 8,
  },
  barContainer: {
    height: 8,
    position: 'relative',
    borderRadius: 4,
    overflow: 'hidden',
  },
  gradientBar: {
    flex: 1,
    height: '100%',
  },
  cursor: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 3,
    marginLeft: -8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  labelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  zoneLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  source: {
    fontSize: 9,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 4,
  },
});
