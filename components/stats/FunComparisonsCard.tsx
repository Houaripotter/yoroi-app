// ============================================
// FUN COMPARISONS CARD
// Affiche les comparaisons amusantes générées par funComparisons.ts
// dans une jolie card scrollable horizontalement.
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import type { FunComparison } from '@/lib/funComparisons';

interface FunComparisonsCardProps {
  comparisons: FunComparison[];
  /** Titre au-dessus (optionnel) */
  title?: string;
}

const FunComparisonsCardInner: React.FC<FunComparisonsCardProps> = ({
  comparisons,
  title = 'Le saviez-vous ?',
}) => {
  const { colors, isDark, screenText } = useTheme();
  if (!comparisons || comparisons.length === 0) return null;

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: screenText }]}>{title}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
        snapToInterval={280}
        decelerationRate="fast"
      >
        {comparisons.map(c => (
          <View
            key={c.id}
            style={[
              styles.card,
              {
                backgroundColor: '#FFFFFF',
                borderColor: c.color + '55',
              },
            ]}
          >
            <Text style={styles.emoji}>{c.emoji}</Text>
            <Text style={[styles.text, { color: '#0F172A' }]} numberOfLines={3}>
              {c.text}
            </Text>
            {c.hint ? (
              <Text style={[styles.hint, { color: '#64748B' }]} numberOfLines={2}>
                {c.hint}
              </Text>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

export const FunComparisonsCard = React.memo(FunComparisonsCardInner);

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  title: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: -0.2,
    paddingHorizontal: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  card: {
    width: 270,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'space-between',
    minHeight: 130,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  emoji: {
    fontSize: 32,
    marginBottom: 8,
  },
  text: {
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 19,
    letterSpacing: -0.2,
  },
  hint: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 6,
    fontStyle: 'italic',
  },
});
