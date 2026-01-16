// ============================================
// ANIMATED METRIC BAR - Barre de métrique avec zones de couleurs franches
// Zones distinctes avec curseur pulsant animé
// ============================================

import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing, TouchableOpacity, Linking } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Info, ExternalLink } from 'lucide-react-native';

export interface MetricZone {
  label: string;
  start: number;
  end: number;
  color: string;
  status: 'optimal' | 'good' | 'moderate' | 'attention' | 'danger';
}

export interface AnimatedMetricBarProps {
  value: number;
  min: number;
  max: number;
  zones: MetricZone[];
  unit: string;
  title?: string;
  source?: string;
  sourceUrl?: string;
  onInfoPress?: () => void;
  animated?: boolean;
}

export const AnimatedMetricBar: React.FC<AnimatedMetricBarProps> = ({
  value,
  min,
  max,
  zones,
  unit,
  title,
  source,
  sourceUrl,
  onInfoPress,
  animated = true,
}) => {
  const { colors, isDark } = useTheme();

  // Animations
  const cursorAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  // Calculer la position normalisée (0 à 1)
  const normalizedPosition = Math.max(0, Math.min(1, (value - min) / (max - min)));

  // Trouver la zone actuelle
  const currentZone = zones.find(zone => value >= zone.start && value <= zone.end);
  const statusColor = currentZone?.color || '#94A3B8';

  // Animation du curseur vers sa position
  useEffect(() => {
    if (animated) {
      Animated.spring(cursorAnim, {
        toValue: normalizedPosition,
        tension: 50,
        friction: 8,
        useNativeDriver: false,
      }).start();
    } else {
      cursorAnim.setValue(normalizedPosition);
    }
  }, [normalizedPosition, animated]);

  // Animation de pulsation continue du curseur
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

  // Animation du glow
  useEffect(() => {
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 0.8,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.4,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowAnimation.start();
    return () => glowAnimation.stop();
  }, []);

  // Interpolation pour la position du curseur
  const cursorPosition = cursorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  // Calculer la largeur de chaque zone en pourcentage
  const getZoneWidth = (zone: MetricZone) => {
    return ((zone.end - zone.start) / (max - min)) * 100;
  };

  return (
    <View style={styles.container}>
      {/* Header avec titre et valeur */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          {title && (
            <Text style={[styles.title, { color: colors.textMuted }]}>
              {title}
            </Text>
          )}
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: statusColor }]}>
              {value.toFixed(1)}
            </Text>
            <Text style={[styles.unit, { color: colors.textMuted }]}>
              {unit}
            </Text>
          </View>
        </View>

        <View style={styles.rightSection}>
          {/* Badge de statut animé */}
          {currentZone && (
            <Animated.View
              style={[
                styles.statusBadge,
                {
                  backgroundColor: statusColor,
                  transform: [{ scale: pulseAnim }],
                }
              ]}
            >
              <Text style={[styles.statusText, { color: '#FFFFFF' }]}>
                {currentZone.label.toUpperCase()}
              </Text>
            </Animated.View>
          )}

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
      </View>

      {/* Barre avec zones de couleurs franches */}
      <View style={styles.barWrapper}>
        {/* Zones de couleurs distinctes - VIVES */}
        <View style={[styles.zonesContainer, {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 4,
          elevation: 4,
        }]}>
          {zones.map((zone, index) => {
            const width = getZoneWidth(zone);
            const isFirst = index === 0;
            const isLast = index === zones.length - 1;
            const isCurrentZone = currentZone?.label === zone.label;

            return (
              <View
                key={index}
                style={[
                  styles.zoneBlock,
                  {
                    width: `${width}%`,
                    backgroundColor: zone.color,
                    borderTopLeftRadius: isFirst ? 16 : 0,
                    borderBottomLeftRadius: isFirst ? 16 : 0,
                    borderTopRightRadius: isLast ? 16 : 0,
                    borderBottomRightRadius: isLast ? 16 : 0,
                    opacity: isCurrentZone ? 1 : 0.85,
                  },
                ]}
              >
                {/* Effet de brillance sur la zone */}
                <View style={[
                  styles.zoneShine,
                  {
                    borderTopLeftRadius: isFirst ? 16 : 0,
                    borderTopRightRadius: isLast ? 16 : 0,
                  }
                ]} />
              </View>
            );
          })}
        </View>

        {/* Curseur animé */}
        <Animated.View
          style={[
            styles.cursorContainer,
            {
              left: cursorPosition,
            },
          ]}
        >
          {/* Glow effect */}
          <Animated.View
            style={[
              styles.cursorGlow,
              {
                backgroundColor: statusColor,
                opacity: glowAnim,
              },
            ]}
          />

          {/* Ligne verticale */}
          <View style={[styles.cursorLine, { backgroundColor: isDark ? '#FFFFFF' : '#000000' }]} />

          {/* Curseur principal */}
          <Animated.View
            style={[
              styles.cursor,
              {
                backgroundColor: statusColor,
                borderColor: isDark ? '#1a1a1a' : '#FFFFFF',
                shadowColor: statusColor,
                transform: [{ scale: pulseAnim }],
              },
            ]}
          >
            <View style={[styles.cursorInner, { backgroundColor: isDark ? '#1a1a1a' : '#FFFFFF' }]} />
          </Animated.View>
        </Animated.View>
      </View>

      {/* Légende des zones - Affichage en ligne avec couleurs */}
      <View style={styles.legend}>
        <Text style={[styles.legendValue, { color: colors.textMuted }]}>
          {min}
        </Text>
        <View style={styles.legendZones}>
          {zones.map((zone, index) => {
            const isCurrentZone = currentZone?.label === zone.label;
            return (
              <View key={index} style={styles.legendZone}>
                <View
                  style={[
                    styles.legendColorBlock,
                    {
                      backgroundColor: zone.color,
                      transform: [{ scale: isCurrentZone ? 1.1 : 1 }],
                    }
                  ]}
                />
                <Text
                  style={[
                    styles.legendLabel,
                    {
                      color: isCurrentZone ? zone.color : colors.textMuted,
                      fontWeight: isCurrentZone ? '800' : '500',
                    },
                  ]}
                >
                  {zone.label}
                </Text>
              </View>
            );
          })}
        </View>
        <Text style={[styles.legendValue, { color: colors.textMuted }]}>
          {max}
        </Text>
      </View>

      {/* Source scientifique */}
      {source && (
        <TouchableOpacity
          style={[styles.sourceContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}
          onPress={() => sourceUrl && Linking.openURL(sourceUrl)}
          disabled={!sourceUrl}
          activeOpacity={sourceUrl ? 0.7 : 1}
        >
          <Text style={[styles.source, { color: sourceUrl ? colors.accent : colors.textMuted }]}>
            Source: {source}
          </Text>
          {sourceUrl && (
            <ExternalLink size={12} color={colors.accent} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
  },
  value: {
    fontSize: 42,
    fontWeight: '900',
    letterSpacing: -2,
  },
  unit: {
    fontSize: 18,
    fontWeight: '700',
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusBadge: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
  },
  infoButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  barWrapper: {
    height: 40,
    marginBottom: 16,
    position: 'relative',
    borderRadius: 20,
    overflow: 'visible',
  },
  zonesContainer: {
    flexDirection: 'row',
    height: '100%',
    borderRadius: 20,
    overflow: 'hidden',
  },
  zoneBlock: {
    height: '100%',
    overflow: 'hidden',
  },
  zoneShine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  cursorContainer: {
    position: 'absolute',
    top: -8,
    marginLeft: -24,
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cursorGlow: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  cursorLine: {
    position: 'absolute',
    width: 3,
    height: 48,
    borderRadius: 1.5,
    opacity: 0.3,
  },
  cursor: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 10,
  },
  cursorInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
  },
  legendValue: {
    fontSize: 11,
    fontWeight: '700',
  },
  legendZones: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  legendZone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendColorBlock: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  legendLabel: {
    fontSize: 10,
    letterSpacing: 0.2,
  },
  sourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  source: {
    fontSize: 11,
    fontWeight: '600',
  },
});

export default AnimatedMetricBar;
