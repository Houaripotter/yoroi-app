// ============================================
// YOROI - ÉCHELLE EVA
// ============================================
// Échelle Visuelle Analogique pour noter la douleur (0-10)

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Slider from '@react-native-community/slider';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING } from '@/constants/appTheme';

interface EVAScaleProps {
  value: number;
  onChange: (value: number) => void;
  showEmojis?: boolean;
  showLabels?: boolean;
}

// Emojis pour chaque niveau de douleur
const PAIN_EMOJIS = ['😊', '🙂', '😐', '😟', '😣', '😖', '😫', '😭', '😱', '🤯', '💀'];

const PAIN_LABELS = [
  'Aucune',
  'Très légère',
  'Légère',
  'Modérée',
  'Un peu forte',
  'Forte',
  'Très forte',
  'Intense',
  'Très intense',
  'Insupportable',
  'Pire imaginable',
];

export function EVAScale({
  value,
  onChange,
  showEmojis = true,
  showLabels = true,
}: EVAScaleProps) {
  const { colors } = useTheme();

  // Couleur selon l'EVA
  const getColor = (eva: number): string => {
    if (eva === 0) return '#4CAF50'; // Vert
    if (eva <= 2) return '#8BC34A'; // Vert clair
    if (eva <= 4) return '#FF9800'; // Orange
    if (eva <= 6) return '#FF5722'; // Orange foncé
    return '#F44336'; // Rouge
  };

  const color = getColor(value);

  return (
    <View style={styles.container}>
      {/* Titre */}
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        Intensité de la douleur (EVA)
      </Text>

      {/* Emoji et Valeur */}
      {showEmojis && (
        <View style={styles.emojiContainer}>
          <Text style={styles.emoji}>{PAIN_EMOJIS[value]}</Text>
          <View style={[styles.valueBox, { backgroundColor: color }]}>
            <Text style={styles.valueText}>{value}</Text>
          </View>
        </View>
      )}

      {/* Slider */}
      <View style={styles.sliderContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={10}
          step={1}
          value={value}
          onValueChange={onChange}
          minimumTrackTintColor={color}
          maximumTrackTintColor={colors.backgroundElevated}
          thumbTintColor={color}
        />

        {/* Graduations */}
        <View style={styles.graduations}>
          {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
            <TouchableOpacity
              key={num}
              style={styles.graduation}
              onPress={() => onChange(num)}
            >
              <View style={[
                styles.graduationMark,
                num === value && { backgroundColor: color, height: 12 }
              ]} />
              <Text style={[
                styles.graduationText,
                { color: num === value ? color : colors.textMuted },
                num === value && { fontWeight: '700' }
              ]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Label descriptif */}
      {showLabels && (
        <Text style={[styles.label, { color }]}>
          {PAIN_LABELS[value]}
        </Text>
      )}

      {/* Légende */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <Text style={styles.legendEmoji}>😊</Text>
          <Text style={[styles.legendText, { color: colors.textMuted }]}>
            Aucune
          </Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendEmoji}>😐</Text>
          <Text style={[styles.legendText, { color: colors.textMuted }]}>
            Modérée
          </Text>
        </View>
        <View style={styles.legendItem}>
          <Text style={styles.legendEmoji}>😫</Text>
          <Text style={[styles.legendText, { color: colors.textMuted }]}>
            Insupportable
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: SPACING.lg,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: SPACING.md,
    textAlign: 'center',
  },
  emojiContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    gap: 16,
  },
  emoji: {
    fontSize: 64,
  },
  valueBox: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  sliderContainer: {
    paddingHorizontal: SPACING.sm,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  graduations: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  graduation: {
    alignItems: 'center',
    gap: 4,
  },
  graduationMark: {
    width: 2,
    height: 8,
    backgroundColor: '#8E8E93',
  },
  graduationText: {
    fontSize: 11,
    fontWeight: '500',
  },
  label: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: SPACING.md,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: '#E5E5EA',
  },
  legendItem: {
    alignItems: 'center',
    gap: 4,
  },
  legendEmoji: {
    fontSize: 24,
  },
  legendText: {
    fontSize: 11,
  },
});
