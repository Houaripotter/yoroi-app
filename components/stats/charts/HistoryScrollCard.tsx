// ============================================
// HISTORY SCROLL CARD - Petites cartes scrollables horizontales
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { LinearGradient } from 'expo-linear-gradient';
import { MetricRange } from '@/lib/healthRanges';

interface HistoryDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface HistoryScrollCardProps {
  data: HistoryDataPoint[];
  unit: string;
  healthRange?: MetricRange;
  color: string;
  getStatus?: (value: number) => { color: string; label: string };
  userGoal?: 'lose' | 'maintain' | 'gain'; // Pour colorer selon objectif poids
  showEvolution?: boolean; // Affiche les badges EN HAUSSE/EN BAISSE/STABLE pour toute métrique
  evolutionGoal?: 'increase' | 'decrease' | 'stable'; // Quel type d'évolution est positif
}

const CARD_WIDTH = 130;
const CARD_HEIGHT = 170;
const CARD_GAP = 12;

export const HistoryScrollCard: React.FC<HistoryScrollCardProps> = ({
  data,
  unit,
  healthRange,
  color,
  getStatus,
  userGoal,
  showEvolution,
  evolutionGoal = 'increase', // Par défaut, une augmentation est positive (ex: muscle)
}) => {
  const { colors, isDark } = useTheme();
  const { locale } = useI18n();

  // Fonction pour déterminer si une couleur est claire (besoin de texte foncé)
  const isLightColor = (hexColor: string): boolean => {
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    // Calcul de luminosité
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.6; // Si lumineux, c'est une couleur claire
  };

  // Obtenir la couleur de texte appropriée pour le contraste
  const getContrastTextColor = (bgColor: string): string => {
    if (isLightColor(bgColor)) {
      return isDark ? '#FFFFFF' : '#1a1a1a'; // Texte foncé sur fond clair en mode clair
    }
    return '#FFFFFF'; // Texte blanc sur fond foncé
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.toLocaleDateString(locale, { month: 'short' });
    return `${day} ${month}`;
  };

  const getBarPosition = (value: number) => {
    if (!healthRange) return 50;
    const range = healthRange.max - healthRange.min;
    return ((value - healthRange.min) / range) * 100;
  };

  // Calculer la couleur ET le label basé sur l'objectif poids
  const getWeightStatus = (currentValue: number, previousValue: number | null): { color: string; label: string } => {
    if (!userGoal || !previousValue) return { color, label: '' };

    const diff = currentValue - previousValue;
    const isGain = diff > 0.1;
    const isLoss = diff < -0.1;

    if (userGoal === 'lose') {
      if (isLoss) return { color: '#00D9BB', label: 'EN BAISSE' }; // Teal = bien (perte)
      if (isGain) return { color: '#FF4757', label: 'EN HAUSSE' }; // Red = mal (prise)
      return { color: '#FFB800', label: 'STABLE' }; // Gold = stable
    } else if (userGoal === 'gain') {
      if (isGain) return { color: '#00D9BB', label: 'EN HAUSSE' }; // Teal = bien (prise)
      if (isLoss) return { color: '#FF4757', label: 'EN BAISSE' }; // Red = mal (perte)
      return { color: '#FFB800', label: 'STABLE' }; // Gold = stable
    } else {
      // maintain
      if (Math.abs(diff) < 0.3) return { color: '#00D9BB', label: 'STABLE' }; // Teal = stable
      if (isGain) return { color: '#FFB800', label: 'EN HAUSSE' };
      return { color: '#FFB800', label: 'EN BAISSE' }; // Gold = variation
    }
  };

  // Garde la fonction pour compatibilité (utilisée pour le calcul de couleur simple)
  const getWeightColor = (currentValue: number, previousValue: number | null) => {
    return getWeightStatus(currentValue, previousValue).color;
  };

  // Calculer le statut d'évolution générique (pour mensurations, etc.)
  const getEvolutionStatus = (currentValue: number, previousValue: number | null): { color: string; label: string } => {
    if (!showEvolution || !previousValue) return { color, label: '' };

    const diff = currentValue - previousValue;
    const threshold = currentValue * 0.01; // 1% de changement minimum
    const isIncrease = diff > threshold;
    const isDecrease = diff < -threshold;

    if (evolutionGoal === 'increase') {
      if (isIncrease) return { color: '#00D9BB', label: 'EN HAUSSE' }; // Teal = bien
      if (isDecrease) return { color: '#FF4757', label: 'EN BAISSE' }; // Red = mal
      return { color: '#FFB800', label: 'STABLE' };
    } else if (evolutionGoal === 'decrease') {
      if (isDecrease) return { color: '#00D9BB', label: 'EN BAISSE' }; // Teal = bien
      if (isIncrease) return { color: '#FF4757', label: 'EN HAUSSE' }; // Red = mal
      return { color: '#FFB800', label: 'STABLE' };
    } else {
      // stable
      if (!isIncrease && !isDecrease) return { color: '#00D9BB', label: 'STABLE' }; // Teal = bien
      if (isIncrease) return { color: '#FFB800', label: 'EN HAUSSE' };
      return { color: '#FFB800', label: 'EN BAISSE' };
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        snapToInterval={CARD_WIDTH + CARD_GAP}
        decelerationRate="fast"
      >
        {data.map((item, index) => {
          const status = getStatus ? getStatus(item.value) : null;
          const previousValue = index > 0 ? data[index - 1].value : null;
          const weightStatus = userGoal ? getWeightStatus(item.value, previousValue) : null;
          const evolutionStatus = showEvolution ? getEvolutionStatus(item.value, previousValue) : null;
          const statusColor = status?.color || weightStatus?.color || evolutionStatus?.color || color;
          const statusLabel = status?.label || weightStatus?.label || evolutionStatus?.label || '';

          return (
            <View
              key={index}
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
                  borderColor: statusColor,
                  borderWidth: 2,
                },
              ]}
            >
              {/* Badge de statut - label complet (healthRange ou objectif poids) */}
              {statusLabel && (
                <View style={[styles.statusBadge, { backgroundColor: statusColor }]}>
                  <Text style={[styles.statusText, { color: getContrastTextColor(statusColor) }]} numberOfLines={1}>
                    {statusLabel.toUpperCase()}
                  </Text>
                </View>
              )}

              {/* Valeur - couleur ajustée pour le contraste */}
              <Text style={[styles.value, { color: isLightColor(statusColor) && !isDark ? '#1a1a1a' : statusColor }]}>
                {item.value.toFixed(1)}
              </Text>
              <Text style={[styles.unit, { color: colors.textMuted }]}>
                {unit}
              </Text>

              {/* Barre de progression mini */}
              {healthRange && (
                <View style={styles.miniBar}>
                  <LinearGradient
                    colors={healthRange.zones.map((z: { color: string }) => z.color) as [string, string, ...string[]]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.miniGradient}
                  />
                  <View
                    style={[
                      styles.miniCursor,
                      {
                        left: `${Math.max(0, Math.min(100, getBarPosition(item.value)))}%`,
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
                </View>
              )}

              {/* Date */}
              <Text style={[styles.date, { color: colors.textMuted }]}>
                {formatDate(item.date)}
              </Text>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 4,
    gap: CARD_GAP,
  },
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    maxWidth: '100%',
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  value: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
    marginTop: 8,
  },
  unit: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: -4,
  },
  miniBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 8,
    position: 'relative',
  },
  miniGradient: {
    flex: 1,
    height: '100%',
  },
  miniCursor: {
    position: 'absolute',
    top: -5,
    width: 14,
    height: 14,
    borderRadius: 7,
    marginLeft: -7,
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
  date: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 4,
  },
});
