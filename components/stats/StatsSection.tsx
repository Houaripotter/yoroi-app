// ============================================
// STATS SECTION - Wrapper pour sections avec titre et espacement
// Gère le spacing uniforme de 24px entre sections
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface StatsSectionProps {
  title?: string;
  description?: string;
  children: React.ReactNode;
  containerStyle?: any;
}

export const StatsSection: React.FC<StatsSectionProps> = ({
  title,
  description,
  children,
  containerStyle,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {/* Titre de section (optionnel) */}
      {title && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>
            {title}
          </Text>
          {description && (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {description}
            </Text>
          )}
        </View>
      )}

      {/* Contenu de la section */}
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    marginBottom: 24, // Spacing entre sections (au lieu de serré)
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  description: {
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  content: {
    gap: 16, // Spacing entre cartes dans la section
  },
});
