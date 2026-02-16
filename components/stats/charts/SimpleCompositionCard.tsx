// ============================================
// SIMPLE COMPOSITION CARD - Affichage épuré de la composition
// Design minimaliste et élégant
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Activity, Droplets, Dumbbell } from 'lucide-react-native';

interface CompositionData {
  label: string;
  value: number;
  color: string;
  icon: 'fat' | 'muscle' | 'water';
}

interface SimpleCompositionCardProps {
  fatPercent: number;
  musclePercent: number;
  waterPercent: number;
  fatLabel?: string;
  muscleLabel?: string;
  waterLabel?: string;
}

export const SimpleCompositionCard: React.FC<SimpleCompositionCardProps> = ({
  fatPercent,
  musclePercent,
  waterPercent,
  fatLabel = 'Masse grasse',
  muscleLabel = 'Muscle',
  waterLabel = 'Eau',
}) => {
  const { colors, isDark } = useTheme();

  const data: CompositionData[] = [
    { label: fatLabel, value: fatPercent, color: '#F59E0B', icon: 'fat' as const },
    { label: muscleLabel, value: musclePercent, color: '#10B981', icon: 'muscle' as const },
    { label: waterLabel, value: waterPercent, color: '#06B6D4', icon: 'water' as const },
  ].filter(d => d.value > 0);

  const getIcon = (type: string, color: string) => {
    switch (type) {
      case 'fat':
        return <Activity size={20} color={color} strokeWidth={2.5} />;
      case 'muscle':
        return <Dumbbell size={20} color={color} strokeWidth={2.5} />;
      case 'water':
        return <Droplets size={20} color={color} strokeWidth={2.5} />;
      default:
        return null;
    }
  };

  if (data.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {data.map((item, index) => (
        <View key={index} style={styles.row}>
          {/* Icône et label */}
          <View style={styles.labelSection}>
            <View style={[styles.iconContainer, { backgroundColor: item.color + '15' }]}>
              {getIcon(item.icon, item.color)}
            </View>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              {item.label}
            </Text>
          </View>

          {/* Barre de progression + valeur */}
          <View style={styles.progressSection}>
            <View style={[styles.progressBar, { backgroundColor: isDark ? '#2A2A2A' : '#E5E5E5' }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(item.value, 100)}%`,
                    backgroundColor: item.color,
                  },
                ]}
              />
            </View>
            <Text style={[styles.value, { color: item.color }]}>
              {item.value.toFixed(1)}%
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  labelSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  progressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1.2,
  },
  progressBar: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  value: {
    fontSize: 16,
    fontWeight: '800',
    width: 60,
    textAlign: 'right',
  },
});

export default SimpleCompositionCard;
