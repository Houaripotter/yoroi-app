import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface HorizontalBarProps {
  label: string;
  value: number;
  displayValue: string;
  useAccent?: boolean;
}

export const HorizontalBar: React.FC<HorizontalBarProps> = ({
  label,
  value,
  displayValue,
  useAccent = false,
}) => {
  const { colors, isDark } = useTheme();

  // Utiliser les couleurs du thème pour les barres
  const barColor = useAccent ? colors.barAccent : colors.barPrimary;

  const trackColor = isDark
    ? 'rgba(255,255,255,0.15)'
    : 'rgba(0,0,0,0.1)';

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {label}
        </Text>
        <Text style={[styles.value, { color: colors.textPrimary }]}>
          {displayValue}
        </Text>
      </View>
      <View style={[styles.track, { backgroundColor: trackColor }]}>
        <View
          style={[
            styles.fill,
            {
              width: `${Math.min(value, 100)}%`,
              backgroundColor: barColor,
            }
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  track: {
    height: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 10,
  },
});

export default HorizontalBar;
