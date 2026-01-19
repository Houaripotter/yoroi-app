// ============================================
// METRIC RANGE INDICATOR - Indicateur de position avec dégradé
// Affiche où se situe l'utilisateur sur une échelle (vert → orange → rouge)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { LinearGradient } from 'expo-linear-gradient';
import { Info, ExternalLink } from 'lucide-react-native';

export interface MetricRange {
  min: number;
  max: number;
  zones: {
    label: string;
    start: number;
    end: number;
    color: string;
    status: 'optimal' | 'good' | 'moderate' | 'attention' | 'danger';
  }[];
  unit: string;
  source?: string;
  sourceUrl?: string; // URL cliquable vers l'étude/source
  explanation?: string;
}

interface MetricRangeIndicatorProps {
  value: number;
  range: MetricRange;
  onInfoPress?: () => void;
}

export const MetricRangeIndicator: React.FC<MetricRangeIndicatorProps> = ({
  value,
  range,
  onInfoPress,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  // Calculer la position du curseur (0 à 1)
  const normalizedPosition = Math.max(0, Math.min(1, (value - range.min) / (range.max - range.min)));

  // Trouver dans quelle zone se trouve la valeur
  const currentZone = range.zones.find(zone => value >= zone.start && value <= zone.end);
  const statusColor = currentZone?.color || '#94A3B8';

  // Créer le dégradé de couleurs
  const gradientColors = range.zones.length >= 2
    ? (range.zones.map(zone => zone.color) as unknown as readonly [string, string, ...string[]])
    : ['#2BCBBA', '#FC5C65'] as const;
  const gradientLocations = range.zones.length >= 2
    ? (range.zones.map((zone, index) => (zone.start - range.min) / (range.max - range.min)) as unknown as readonly [number, number, ...number[]])
    : [0, 1] as const;

  return (
    <View style={styles.container}>
      {/* Header avec valeur et status */}
      <View style={styles.header}>
        <View style={styles.valueContainer}>
          <Text style={[styles.value, { color: statusColor }]}>
            {value.toFixed(1)} {range.unit}
          </Text>
          {currentZone && (
            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {currentZone.label}
              </Text>
            </View>
          )}
        </View>

        {/* Bouton info */}
        {onInfoPress && (
          <TouchableOpacity
            style={[styles.infoButton, { backgroundColor: colors.accent + '15' }]}
            onPress={onInfoPress}
            activeOpacity={0.7}
          >
            <Info size={16} color={colors.accentText} strokeWidth={2.5} />
          </TouchableOpacity>
        )}
      </View>

      {/* Barre avec dégradé */}
      <View style={styles.barContainer}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          locations={gradientLocations}
          style={styles.gradientBar}
        >
          {/* Curseur de position */}
          <View
            style={[
              styles.cursor,
              {
                left: `${normalizedPosition * 100}%`,
                backgroundColor: statusColor,
                shadowColor: statusColor,
              },
            ]}
          >
            <View style={[styles.cursorInner, { backgroundColor: colors.backgroundCard }]} />
          </View>
        </LinearGradient>
      </View>

      {/* Légende avec zones */}
      <View style={styles.legend}>
        <Text style={[styles.legendValue, { color: colors.textMuted }]}>
          {range.min}
        </Text>
        <View style={styles.legendLabels}>
          {range.zones.map((zone, index) => (
            <Text
              key={index}
              style={[
                styles.legendLabel,
                { color: currentZone?.label === zone.label ? zone.color : colors.textMuted },
                currentZone?.label === zone.label && styles.legendLabelActive,
              ]}
            >
              {t(`healthRanges.zones.${zone.label}`) || zone.label}
            </Text>
          ))}
        </View>
        <Text style={[styles.legendValue, { color: colors.textMuted }]}>
          {range.max}
        </Text>
      </View>

      {/* Source scientifique - cliquable si URL disponible */}
      {range.source && (
        <TouchableOpacity
          style={styles.sourceContainer}
          onPress={() => {
            if (range.sourceUrl) {
              Linking.openURL(range.sourceUrl);
            }
          }}
          disabled={!range.sourceUrl}
          activeOpacity={range.sourceUrl ? 0.7 : 1}
        >
          <Text style={[styles.source, { color: range.sourceUrl ? (isDark ? colors.accent : colors.textPrimary) : colors.textMuted }]}>
            Source: {range.source}
          </Text>
          {range.sourceUrl && (
            <ExternalLink size={12} color={isDark ? colors.accent : colors.textPrimary} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  valueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  value: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  infoButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barContainer: {
    height: 24,
    marginBottom: 12,
    position: 'relative',
  },
  gradientBar: {
    flex: 1,
    borderRadius: 12,
    position: 'relative',
  },
  cursor: {
    position: 'absolute',
    top: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    marginLeft: -16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  cursorInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  legendLabels: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
    gap: 4,
  },
  legendLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  legendLabelActive: {
    fontWeight: '800',
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.03)',
  },
  source: {
    fontSize: 11,
    fontWeight: '600',
  },
});
