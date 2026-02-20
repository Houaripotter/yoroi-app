import React from 'react';
import { View, Text, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import { Citation } from '@/lib/citations';

// ============================================
// QUOTE CARD - LIQUID GLASS iOS 26
// ============================================
// Citation avec effet verre et decorations dorees

interface QuoteCardProps {
  quote: Citation;
  style?: ViewStyle;
}

export const QuoteCard: React.FC<QuoteCardProps> = ({ quote, style }) => {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.container, style]}>
      {/* Fond blur */}
      {Platform.OS === 'ios' && isDark && (
        <BlurView
          intensity={15}
          style={StyleSheet.absoluteFill}
          tint="dark"
        />
      )}

      {/* Fond transparent */}
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            backgroundColor: isDark
              ? 'rgba(255, 255, 255, 0.02)'
              : 'rgba(255, 255, 255, 0.7)',
          },
        ]}
      />

      {/* Bordure lumineuse en haut */}
      <LinearGradient
        colors={[
          isDark ? 'rgba(212, 175, 55, 0.3)' : 'rgba(212, 175, 55, 0.4)',
          'transparent',
        ]}
        style={styles.topHighlight}
      />

      {/* Contenu */}
      <View style={styles.content}>
        {/* Ligne decorative haut */}
        <View style={styles.decorLine}>
          <View style={[styles.line, { backgroundColor: colors.gold }]} />
          <Text style={[styles.decorSymbol, { color: colors.gold }]}></Text>
          <View style={[styles.line, { backgroundColor: colors.gold }]} />
        </View>

        {/* Citation */}
        <Text style={[styles.quoteText, { color: isDark ? 'rgba(255, 255, 255, 0.85)' : colors.textPrimary }]}>
          "{quote.text}"
        </Text>

        {/* Ligne decorative bas */}
        <View style={styles.decorLine}>
          <View style={[styles.line, { backgroundColor: colors.gold }]} />
          <Text style={[styles.decorSymbol, { color: colors.gold }]}></Text>
          <View style={[styles.line, { backgroundColor: colors.gold }]} />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.15)',
    // Ombre douce
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  content: {
    padding: 20,
    paddingVertical: 24,
    alignItems: 'center',
    gap: 16,
  },
  decorLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '80%',
  },
  line: {
    flex: 1,
    height: 1,
    opacity: 0.4,
  },
  decorSymbol: {
    fontSize: 14,
    opacity: 0.8,
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    lineHeight: 26,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
});

export default QuoteCard;
