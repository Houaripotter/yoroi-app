import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { BarChart, BarData } from './BarChart';
import { CircularProgress } from './CircularProgress';

interface HydrationCardProps {
  currentLiters: number;
  targetLiters: number;
  weekData: BarData[];
}

export const HydrationCard: React.FC<HydrationCardProps> = ({
  currentLiters,
  targetLiters,
  weekData,
}) => {
  const { colors } = useTheme();

  const percentage = Math.min(Math.round((currentLiters / targetLiters) * 100), 100);

  return (
    <View style={[
      styles.card,
      { backgroundColor: colors.backgroundElevated }
    ]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          💧 Hydratation
        </Text>
        <Text style={[styles.value, { color: colors.accent }]}>
          {currentLiters}L
        </Text>
      </View>

      <View style={styles.content}>
        {/* Cercle de progression */}
        <CircularProgress percentage={percentage} size={85} strokeWidth={9} />

        {/* Barres de la semaine */}
        <View style={styles.barsContainer}>
          <BarChart data={weekData} height={65} gap={5} barRadius={4} />
        </View>
      </View>

      {/* Objectif */}
      <Text style={[styles.target, { color: colors.textMuted }]}>
        Objectif : {targetLiters}L par jour
      </Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  value: {
    fontSize: 26,
    fontWeight: '800',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 24,
  },
  barsContainer: {
    flex: 1,
  },
  target: {
    fontSize: 12,
    marginTop: 16,
    textAlign: 'center',
  },
});

export default HydrationCard;
