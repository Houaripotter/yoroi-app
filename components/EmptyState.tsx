// ============================================
// YOROI - COMPOSANT EMPTY STATE
// ============================================
// Illustrations pour pages vides réutilisables

import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

// Utiliser les avatars samurai existants comme illustrations
const ILLUSTRATIONS = {
  noData: require('../assets/images/samurai_man_1.png'),
  noWorkouts: require('../assets/images/samurai_man_2.png'),
  noMeasurements: require('../assets/images/samurai_woman_1.png'),
  noPhotos: require('../assets/images/samurai_woman_2.png'),
  noHistory: require('../assets/images/samurai_man_3.png'),
  noPlan: require('../assets/images/samurai_woman_3.png'),
};

type IllustrationType = keyof typeof ILLUSTRATIONS;

interface EmptyStateProps {
  illustration?: IllustrationType;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  illustration = 'noData',
  title,
  description,
  action,
}) => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Image
        source={ILLUSTRATIONS[illustration]}
        style={styles.illustration}
        resizeMode="contain"
      />

      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>

      <Text style={[styles.description, { color: colors.textMuted }]}>
        {description}
      </Text>

      {action && (
        <View style={styles.actionContainer}>
          {action}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  illustration: {
    width: 150,
    height: 150,
    marginBottom: 24,
    opacity: 0.9,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  description: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionContainer: {
    marginTop: 24,
  },
});

export default EmptyState;
