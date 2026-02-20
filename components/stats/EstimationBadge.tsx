/**
 * EstimationBadge.tsx
 * Badge "Estimation Apple" avec icône info cliquable
 * Affiche un badge discret qui ouvre la modal d'explication quand on clique
 */

import React from 'react';
import { Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Info } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

interface EstimationBadgeProps {
  onPress: () => void;
  variant?: 'default' | 'small';
}

export const EstimationBadge: React.FC<EstimationBadgeProps> = ({
  onPress,
  variant = 'default',
}) => {
  const { colors, isDark } = useTheme();

  const handlePress = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    onPress();
  };

  const isSmall = variant === 'small';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: isDark ? '#6366F1' + '20' : '#EEF2FF',
          borderColor: isDark ? '#6366F1' + '40' : '#C7D2FE',
        },
        isSmall && styles.containerSmall,
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Info
        size={isSmall ? 12 : 14}
        color={isDark ? '#A5B4FC' : '#6366F1'}
        strokeWidth={2.5}
      />
      <Text
        style={[
          styles.text,
          {
            color: isDark ? '#A5B4FC' : '#6366F1',
          },
          isSmall && styles.textSmall,
        ]}
      >
        Estimation Apple
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  containerSmall: {
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    gap: 4,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  textSmall: {
    fontSize: 10,
  },
});
