import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { HorizontalBar } from './HorizontalBar';

interface CompositionData {
  label: string;
  value: number;
  displayValue: string;
  useAccent: boolean;
}

interface CompositionCardProps {
  title: string;
  data: CompositionData[];
}

export const CompositionCard: React.FC<CompositionCardProps> = ({
  title,
  data,
}) => {
  const { colors } = useTheme();

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.backgroundElevated }
    ]}>
      <Text style={[styles.title, { color: colors.textPrimary }]}>
        {title}
      </Text>

      <View style={styles.barsContainer}>
        {data.map((item, index) => (
          <HorizontalBar
            key={index}
            label={item.label}
            value={item.value}
            displayValue={item.displayValue}
            useAccent={item.useAccent}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 28,
    padding: 24,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 24,
  },
  barsContainer: {
    gap: 4,
  },
});

export default CompositionCard;
