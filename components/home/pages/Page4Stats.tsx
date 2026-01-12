// ============================================
// PAGE 4 - STATS (Graphiques & Composition)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { WeightLottieCard } from '@/components/cards/WeightLottieCard';
import { AnimatedCompositionCircle } from '@/components/AnimatedCompositionCircle';
import { Activity } from 'lucide-react-native';
import AnimatedCounter from '@/components/AnimatedCounter';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;

interface Page4StatsProps {
  currentWeight?: number;
  targetWeight?: number;
  startWeight?: number;
  weightHistory?: number[];

  // Activity
  steps?: number;
  stepsGoal?: number;
  calories?: number;

  // Body Composition
  bodyFat?: number;
  muscleMass?: number;
  waterPercentage?: number;
}

export const Page4Stats: React.FC<Page4StatsProps> = ({
  currentWeight = 0,
  targetWeight = 0,
  startWeight = 0,
  weightHistory = [],
  steps = 0,
  stepsGoal = 10000,
  calories = 0,
  bodyFat,
  muscleMass,
  waterPercentage,
}) => {
  const { colors, isDark } = useTheme();

  const hasBodyComp = bodyFat || muscleMass || waterPercentage;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
        Statistiques
      </Text>

      {/* GRAND GRAPHIQUE POIDS */}
      <WeightLottieCard
        weight={currentWeight}
        target={targetWeight}
        history={weightHistory}
        fatPercent={bodyFat}
        musclePercent={muscleMass}
        waterPercent={waterPercentage}
        onPress={() => {}}
      />

      {/* ACTIVITÉ JOURNALIÈRE */}
      <View style={[styles.activityCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.activityHeader}>
          <Activity size={24} color="#3B82F6" strokeWidth={2} />
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Activité du Jour
          </Text>
        </View>

        <View style={styles.activityRow}>
          <View style={styles.activityItem}>
            <AnimatedCounter
              value={steps}
              style={[styles.activityValue, { color: '#3B82F6' }]}
              duration={800}
            />
            <Text style={[styles.activityLabel, { color: colors.textMuted }]}>
              Pas
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min((steps / stepsGoal) * 100, 100)}%`,
                    backgroundColor: '#3B82F6',
                  }
                ]}
              />
            </View>
          </View>

          <View style={styles.activityItem}>
            <AnimatedCounter
              value={calories}
              style={[styles.activityValue, { color: '#F97316' }]}
              duration={800}
            />
            <Text style={[styles.activityLabel, { color: colors.textMuted }]}>
              Calories
            </Text>
          </View>
        </View>
      </View>

      {/* COMPOSITION CORPORELLE */}
      {hasBodyComp && (
        <View style={[styles.compositionCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
            Composition Corporelle
          </Text>
          <View style={styles.compositionRow}>
            {bodyFat !== undefined && (
              <AnimatedCompositionCircle
                value={bodyFat}
                max={100}
                label="Masse Grasse"
                unit="%"
                color="#EF4444"
                size={100}
              />
            )}
            {muscleMass !== undefined && (
              <AnimatedCompositionCircle
                value={muscleMass}
                max={100}
                label="Muscle"
                unit="%"
                color="#10B981"
                size={100}
              />
            )}
            {waterPercentage !== undefined && (
              <AnimatedCompositionCircle
                value={waterPercentage}
                max={100}
                label="Eau"
                unit="%"
                color="#3B82F6"
                size={100}
              />
            )}
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: CARD_PADDING,
    paddingBottom: 120,
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
    marginBottom: 20,
  },

  // Activity Card
  activityCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  activityHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  activityRow: {
    flexDirection: 'row',
    gap: 20,
  },
  activityItem: {
    flex: 1,
    gap: 8,
  },
  activityValue: {
    fontSize: 32,
    fontWeight: '900',
    letterSpacing: -1,
  },
  activityLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderRadius: 3,
    marginTop: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },

  // Composition Card
  compositionCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  compositionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
  },
});
