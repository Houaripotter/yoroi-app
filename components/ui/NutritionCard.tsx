import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { PASTEL_CARD_RADIUS } from '@/constants/pastelColors';

interface NutritionCardProps {
  label: string;
  emoji: string;
  value: number;
  /** Progress percentage (0-100) */
  progress: number;
  barColor: string;
  barBg: string;
  /** Card background color */
  bgColor?: string;
}

export const NutritionCard: React.FC<NutritionCardProps> = ({
  label,
  emoji,
  value,
  progress,
  barColor,
  barBg,
  bgColor = '#FFFFFF',
}) => {
  const barAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(barAnim, {
      toValue: progress,
      duration: 1000,
      delay: 200,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  return (
    <View style={[styles.card, { backgroundColor: bgColor }]}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={styles.emoji}>{emoji}</Text>
      </View>
      <Text style={styles.value}>{value}%</Text>
      <View style={[styles.barTrack, { backgroundColor: barBg }]}>
        <Animated.View
          style={[
            styles.barFill,
            {
              width: barAnim.interpolate({
                inputRange: [0, 100],
                outputRange: ['0%', '100%'],
              }),
              backgroundColor: barColor,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: PASTEL_CARD_RADIUS - 4,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A2E3B',
  },
  emoji: {
    fontSize: 22,
  },
  value: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1A2E3B',
    letterSpacing: -1,
    marginBottom: 10,
  },
  barTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
  },
});

export default NutritionCard;
