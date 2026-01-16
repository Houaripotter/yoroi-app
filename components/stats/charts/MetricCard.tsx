// ============================================
// METRIC CARD - Card métrique simple sans graphique
// minHeight 200px pour éviter chevauchements
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { MetricRange } from '@/lib/healthRanges';

interface MetricCardProps {
  label: string;
  value: number | string;
  unit: string;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'stable';
  change?: string;
  onPress?: () => void;
  statusColor?: string; // Couleur du statut (vert/orange/rouge)
  statusLabel?: string; // Label du statut (Optimal/Moyen/Attention)
  healthRange?: MetricRange; // Range médical pour afficher la barre
}

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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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

  const Wrapper = onPress ? TouchableOpacity : View;

  // Style avec bordure colorée si statusColor est fourni
  // Intérieur blanc/fond card, seulement la bordure colorée
  const containerStyle = [
    styles.container,
    {
      backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
      borderColor: statusColor || colors.border,
      borderWidth: statusColor ? 3 : 1, // Bordure plus épaisse si statut
    },
  ];

  return (
    <Wrapper
      onPress={onPress ? handlePress : undefined}
      activeOpacity={onPress ? 0.85 : 1}
      style={containerStyle}
    >
      {/* Header avec icône et statut/tendance */}
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
