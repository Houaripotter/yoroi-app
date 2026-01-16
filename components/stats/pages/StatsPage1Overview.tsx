// ============================================
// STATS PAGE 1 - VUE D'ENSEMBLE
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Activity, Weight, TrendingUp, Heart } from 'lucide-react-native';
import AnimatedCounter from '@/components/AnimatedCounter';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_PADDING = 16;

interface StatsPage1OverviewProps {
  steps?: number;
  calories?: number;
  currentWeight?: number;
  targetWeight?: number;
  sleepHours?: number;
}

export const StatsPage1Overview: React.FC<StatsPage1OverviewProps> = ({
  steps = 0,
  calories = 0,
  currentWeight = 0,
  targetWeight = 0,
  sleepHours = 0,
}) => {
  const { colors, isDark } = useTheme();

  const statsCards = [
    {
      title: 'Activité',
      value: steps,
      unit: 'pas',
      icon: Activity,
      colors: ['#3B82F6', '#2563EB'] as const,
    },
    {
      title: 'Calories',
      value: calories,
      unit: 'kcal',
      icon: Activity,
      colors: ['#F97316', '#EA580C'] as const,
    },
    {
      title: 'Poids',
      value: currentWeight,
      unit: 'kg',
      icon: Weight,
      colors: ['#8B5CF6', '#7C3AED'] as const,
    },
    {
      title: 'Sommeil',
      value: sleepHours,
      unit: 'h',
      icon: Heart,
      colors: ['#EC4899', '#DB2777'] as const,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
        Vue d'ensemble
      </Text>

      <Text style={[styles.subtitle, { color: colors.textMuted }]}>
        Toutes tes statistiques en un coup d'œil
      </Text>

      {/* Grid de cartes */}
      <View style={styles.grid}>
        {statsCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <View
              key={index}
              style={[styles.card, { backgroundColor: colors.backgroundCard }]}
            >
              <LinearGradient
                colors={card.colors}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <Icon size={20} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>

              <AnimatedCounter
                value={card.value}
                style={[styles.cardValue, { color: colors.textPrimary }]}
                duration={800}
              />
              <Text style={[styles.cardUnit, { color: colors.textMuted }]}>
                {card.unit}
              </Text>
              <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
                {card.title}
              </Text>
            </View>
          );
        })}
      </View>

      {/* Section objectifs */}
      <View style={[styles.goalsCard, { backgroundColor: colors.backgroundCard }]}>
        <View style={styles.goalsHeader}>
          <TrendingUp size={24} color={colors.accent} strokeWidth={2} />
          <Text style={[styles.goalsTitle, { color: colors.textPrimary }]}>
            Progression vers tes objectifs
          </Text>
        </View>

        <View style={styles.goalsList}>
          <View style={styles.goalItem}>
            <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
              Poids cible
            </Text>
            <Text style={[styles.goalValue, { color: isDark ? colors.accent : colors.textPrimary }]}>
              {targetWeight ? `${targetWeight} kg` : 'Non défini'}
            </Text>
          </View>

          {currentWeight > 0 && targetWeight > 0 && (
            <View style={styles.goalItem}>
              <Text style={[styles.goalLabel, { color: colors.textSecondary }]}>
                Reste à perdre/gagner
              </Text>
              <Text style={[styles.goalValue, { color: isDark ? colors.accent : colors.textPrimary }]}>
                {Math.abs(currentWeight - targetWeight).toFixed(1)} kg
              </Text>
            </View>
          )}
        </View>
      </View>
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
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  card: {
    width: (SCREEN_WIDTH - CARD_PADDING * 2 - 12) / 2,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  cardUnit: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  goalsCard: {
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  goalsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  goalsTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  goalsList: {
    gap: 16,
  },
  goalItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  goalLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  goalValue: {
    fontSize: 16,
    fontWeight: '800',
  },
});
