// ============================================
// PAGE 4 - STATS (Graphiques & Composition)
// ============================================

import React from 'react';
import { View, Text, StyleSheet, Dimensions, TouchableOpacity, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { WeightLottieCard } from '@/components/cards/WeightLottieCard';
import { AnimatedCompositionCircle } from '@/components/AnimatedCompositionCircle';
import { Activity, Footprints, Flame, TrendingUp, Target } from 'lucide-react-native';
import AnimatedCounter from '@/components/AnimatedCounter';
import { LinearGradient } from 'expo-linear-gradient';

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
      nestedScrollEnabled={true}
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
      <View style={styles.activitySection}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Activité du Jour
        </Text>

        <View style={styles.activityRow}>
          {/* Pas Card */}
          <TouchableOpacity
            style={[styles.activityMiniCard, { backgroundColor: colors.backgroundCard }]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#3B82F6', '#2563EB']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activityIconContainer}
            >
              <Footprints size={22} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>

            <View style={styles.activityDetails}>
              <AnimatedCounter
                value={steps}
                style={[styles.activityValue, { color: colors.textPrimary }]}
                duration={800}
              />
              <Text style={[styles.activityLabel, { color: colors.textMuted }]}>
                PAS
              </Text>

              {/* Progress Bar */}
              <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)' }]}>
                <LinearGradient
                  colors={['#3B82F6', '#2563EB']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[
                    styles.progressFill,
                    { width: `${Math.min((steps / stepsGoal) * 100, 100)}%` }
                  ]}
                />
              </View>

              {/* Goal indicator */}
              {steps >= stepsGoal && (
                <View style={styles.goalBadge}>
                  <Target size={10} color="#10B981" strokeWidth={3} />
                  <Text style={styles.goalText}>Objectif atteint!</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>

          {/* Calories Card */}
          <TouchableOpacity
            style={[styles.activityMiniCard, { backgroundColor: colors.backgroundCard }]}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.activityIconContainer}
            >
              <Flame size={22} color="#FFFFFF" strokeWidth={2.5} />
            </LinearGradient>

            <View style={styles.activityDetails}>
              <AnimatedCounter
                value={calories}
                style={[styles.activityValue, { color: colors.textPrimary }]}
                duration={800}
              />
              <Text style={[styles.activityLabel, { color: colors.textMuted }]}>
                CALORIES
              </Text>
            </View>
          </TouchableOpacity>
        </View>
      </View>

      {/* COMPOSITION CORPORELLE */}
      {hasBodyComp && (
        <View style={styles.compositionSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
            Composition Corporelle
          </Text>
          <View style={[styles.compositionCard, { backgroundColor: colors.backgroundCard }]}>
            <View style={styles.compositionRow}>
              {bodyFat !== undefined && (
                <View style={styles.compositionItem}>
                  <AnimatedCompositionCircle
                    value={bodyFat}
                    max={100}
                    label=""
                    unit="%"
                    color="#EF4444"
                    size={90}
                  />
                  <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>
                    Masse Grasse
                  </Text>
                </View>
              )}
              {muscleMass !== undefined && (
                <View style={styles.compositionItem}>
                  <AnimatedCompositionCircle
                    value={muscleMass}
                    max={100}
                    label=""
                    unit="%"
                    color="#10B981"
                    size={90}
                  />
                  <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>
                    Muscle
                  </Text>
                </View>
              )}
              {waterPercentage !== undefined && (
                <View style={styles.compositionItem}>
                  <AnimatedCompositionCircle
                    value={waterPercentage}
                    max={100}
                    label=""
                    unit="%"
                    color="#3B82F6"
                    size={90}
                  />
                  <Text style={[styles.compositionLabel, { color: colors.textSecondary }]}>
                    Eau
                  </Text>
                </View>
              )}
            </View>
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
    marginBottom: 24,
  },

  // Activity Section
  activitySection: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 16,
  },
  activityRow: {
    flexDirection: 'row',
    gap: 12,
  },
  activityMiniCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  activityDetails: {
    gap: 4,
  },
  activityValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  activityLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    marginTop: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  goalText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#10B981',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Composition Section
  compositionSection: {
    marginTop: 24,
  },
  compositionCard: {
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  compositionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  compositionItem: {
    alignItems: 'center',
    gap: 12,
  },
  compositionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});
