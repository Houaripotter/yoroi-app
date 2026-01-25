// ============================================
// SIMPLE METRIC CARD - Carte de métrique épurée
// Design minimaliste avec indicateur de zone
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { TrendingUp, TrendingDown, Minus, ExternalLink, ChevronRight } from 'lucide-react-native';

export interface MetricZone {
  label: string;
  start: number;
  end: number;
  color: string;
  status: 'optimal' | 'good' | 'moderate' | 'attention' | 'danger';
}

interface SimpleMetricCardProps {
  value: number;
  unit: string;
  title: string;
  zones: MetricZone[];
  min: number;
  max: number;
  source?: string;
  sourceUrl?: string;
  onPress?: () => void;
  formattedValue?: string; // Valeur formatée personnalisée (ex: "7h 30min")
}

export const SimpleMetricCard: React.FC<SimpleMetricCardProps> = ({
  value,
  unit,
  title,
  zones,
  min,
  max,
  source,
  sourceUrl,
  onPress,
  formattedValue,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  // Trouver la zone actuelle
  const currentZone = zones.find(zone => value >= zone.start && value <= zone.end);
  const statusColor = currentZone?.color || '#94A3B8';

  // Position sur la barre (0-100%)
  const position = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));

  // Icône de tendance
  const getTrendIcon = () => {
    if (!currentZone) return <Minus size={18} color={statusColor} strokeWidth={2.5} />;
    const status = currentZone.status;
    if (status === 'optimal' || status === 'good') {
      return <TrendingUp size={18} color={statusColor} strokeWidth={2.5} />;
    } else if (status === 'danger' || status === 'attention') {
      return <TrendingDown size={18} color={statusColor} strokeWidth={2.5} />;
    }
    return <Minus size={18} color={statusColor} strokeWidth={2.5} />;
  };

  const CardWrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress ? { onPress, activeOpacity: 0.9 } : {};

  return (
    <CardWrapper style={[styles.card, { backgroundColor: colors.backgroundCard }]} {...wrapperProps}>
      {/* Header : Titre + Statut */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textSecondary }]}>{title}</Text>
        {currentZone && (
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '15' }]}>
            {getTrendIcon()}
            <Text style={[styles.statusText, { color: statusColor }]}>
              {t(`healthRanges.zones.${currentZone.label}`) || currentZone.label}
            </Text>
          </View>
        )}
      </View>

      {/* Valeur principale */}
      <View style={styles.valueSection}>
        <Text style={[styles.value, { color: statusColor }]}>
          {formattedValue || value.toFixed(1)}
        </Text>
        {!formattedValue && <Text style={[styles.unit, { color: colors.textMuted }]}>{unit}</Text>}
      </View>

      {/* Barre simple avec indicateur */}
      <View style={styles.barSection}>
        <View style={[styles.barTrack, { backgroundColor: isDark ? '#252525' : '#EBEBEB' }]}>
          {/* Zones colorées */}
          {zones.map((zone, index) => {
            const zoneStart = ((zone.start - min) / (max - min)) * 100;
            const zoneWidth = ((zone.end - zone.start) / (max - min)) * 100;
            const isActive = currentZone?.label === zone.label;

            return (
              <View
                key={index}
                style={[
                  styles.zoneSegment,
                  {
                    left: `${zoneStart}%`,
                    width: `${zoneWidth}%`,
                    backgroundColor: zone.color,
                    opacity: isActive ? 1 : 0.3,
                  },
                ]}
              />
            );
          })}

          {/* Indicateur de position */}
          <View style={[styles.indicator, { left: `${position}%` }]}>
            <View style={[styles.indicatorDot, {
              backgroundColor: statusColor,
              borderColor: isDark ? '#1A1A1A' : '#FFFFFF',
            }]} />
          </View>
        </View>

        {/* Labels min/max */}
        <View style={styles.rangeLabels}>
          <Text style={[styles.rangeLabel, { color: colors.textMuted }]}>{min}</Text>
          <Text style={[styles.rangeLabel, { color: colors.textMuted }]}>{max}</Text>
        </View>
      </View>

      {/* Légende des zones */}
      <View style={styles.legend}>
        {zones.map((zone, index) => {
          const isActive = currentZone?.label === zone.label;
          return (
            <View key={index} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: zone.color, opacity: isActive ? 1 : 0.5 }]} />
              <Text style={[
                styles.legendText,
                {
                  color: isActive ? zone.color : colors.textMuted,
                  fontWeight: isActive ? '700' : '500',
                }
              ]}>
                {t(`healthRanges.zones.${zone.label}`) || zone.label}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Source */}
      {source && (
        <TouchableOpacity
          style={styles.sourceRow}
          onPress={() => sourceUrl && Linking.openURL(sourceUrl)}
          disabled={!sourceUrl}
          activeOpacity={0.7}
        >
          <Text style={[styles.sourceText, { color: colors.textMuted }]} numberOfLines={1}>
            Source: {source}
          </Text>
          {sourceUrl && <ExternalLink size={12} color={colors.textMuted} strokeWidth={2} />}
        </TouchableOpacity>
      )}
    </CardWrapper>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '700',
  },
  valueSection: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginBottom: 20,
  },
  value: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -2,
  },
  unit: {
    fontSize: 20,
    fontWeight: '600',
  },
  barSection: {
    marginBottom: 16,
  },
  barTrack: {
    height: 12,
    borderRadius: 6,
    position: 'relative',
    overflow: 'hidden',
  },
  zoneSegment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
  indicator: {
    position: 'absolute',
    top: -4,
    marginLeft: -10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  indicatorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  rangeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  rangeLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.1)',
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '500',
    flex: 1,
  },
});

export default SimpleMetricCard;
