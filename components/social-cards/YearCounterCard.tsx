import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Flame, Calendar, Target, Dumbbell } from 'lucide-react-native';
import { YearStats } from '@/lib/social-cards/useYearStats';
import { ThemeColors } from '@/lib/ThemeContext';

// ============================================
// YEAR COUNTER CARD - Le fameux X/365
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;

export interface YearCounterCardProps {
  stats: YearStats;
  format: 'stories' | 'square';
  colors: ThemeColors;
  username?: string;
}

export const YearCounterCard = forwardRef<View, YearCounterCardProps>(
  ({ stats, format, colors, username }, ref) => {
    const isStories = format === 'stories';

    // Dimensions adaptées au format
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;
    const heroFontSize = isStories ? 72 : 56;
    const gap = isStories ? 16 : 12;

    // Top 3 sports (ou top 5 si format stories)
    const topActivities = stats.activityBreakdown.slice(0, isStories ? 5 : 3);

    return (
      <View
        ref={ref}
        style={[styles.container, { width: CARD_WIDTH, height: cardHeight }]}
        collapsable={false}
      >
        <LinearGradient
          colors={[colors.background, colors.backgroundCard, colors.background]}
          style={styles.gradient}
        >
          {/* HEADER */}
          <View style={styles.header}>
            <Text style={[styles.logo, { color: colors.gold || colors.accent }]}>YOROI</Text>
            <Text style={[styles.year, { color: colors.textSecondary }]}>{stats.year}</Text>
            {username && (
              <Text style={[styles.username, { color: colors.accent }]}>@{username}</Text>
            )}
          </View>

          {/* SEPARATOR */}
          <View style={[styles.separator, { backgroundColor: colors.gold || colors.accent }]} />

          {/* HERO COUNTER */}
          <View style={[styles.heroSection, { gap }]}>
            <Text style={[styles.heroNumber, { fontSize: heroFontSize, color: colors.accent }]}>
              {stats.totalDays}/{stats.totalDaysInYear}
            </Text>
            <Text style={[styles.heroLabel, { color: colors.textSecondary }]}>
              jours d'entraînement
            </Text>
          </View>

          {/* BARRE DE PROGRESSION */}
          <View style={[styles.progressContainer, { gap: gap / 2 }]}>
            <View style={[styles.progressBarBg, { backgroundColor: colors.border }]}>
              <View
                style={[
                  styles.progressBarFill,
                  {
                    backgroundColor: colors.accent,
                    width: `${Math.min(stats.percentage, 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {stats.percentage}%
            </Text>
          </View>

          {/* RÉPARTITION PAR SPORT */}
          {topActivities.length > 0 && (
            <View style={[styles.activitiesContainer, { gap: gap / 2 }]}>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                ACTIVITÉS
              </Text>
              <View style={styles.activitiesGrid}>
                {topActivities.map((activity, index) => (
                  <View key={index} style={[styles.activityItem, { backgroundColor: colors.backgroundElevated || colors.card }]}>
                    <Dumbbell size={24} color={colors.accent} />
                    <Text style={[styles.activitySport, { color: colors.textPrimary }]} numberOfLines={1}>
                      {activity.clubName}
                    </Text>
                    <Text style={[styles.activityCount, { color: colors.accent }]}>
                      {activity.count}×
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* STATS GRID */}
          <View style={[styles.statsGrid, { gap: gap / 2 }]}>
            {/* Streak */}
            <View style={[styles.statCard, { backgroundColor: colors.backgroundElevated || colors.card }]}>
              <Flame size={20} color="#F59E0B" />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats.currentStreak > 0 ? stats.currentStreak : stats.bestStreak}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                {stats.currentStreak > 0 ? 'Streak actuel' : 'Meilleur streak'}
              </Text>
            </View>

            {/* Mois le plus actif */}
            <View style={[styles.statCard, { backgroundColor: colors.backgroundElevated || colors.card }]}>
              <Calendar size={20} color={colors.accent} />
              <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                {stats.busiestMonth.month.substring(0, 3)}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Mois le plus actif
              </Text>
            </View>

            {/* Projection */}
            {stats.projection.estimatedTotal > stats.totalDays && (
              <View style={[styles.statCard, { backgroundColor: colors.backgroundElevated || colors.card }]}>
                <Target size={20} color={colors.accent} />
                <Text style={[styles.statValue, { color: colors.textPrimary }]}>
                  {stats.projection.estimatedTotal}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  Projection 2025
                </Text>
              </View>
            )}
          </View>

          {/* FOOTER */}
          <View style={styles.footer}>
            <View style={[styles.separator, { backgroundColor: colors.gold || colors.accent, opacity: 0.3 }]} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              #YoroiWarrior #365Challenge
            </Text>
            <Text style={[styles.footerBrand, { color: colors.gold || colors.accent }]}>
              YOROI
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }
);

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  gradient: {
    flex: 1,
    padding: 24,
    justifyContent: 'space-between',
  },

  // Header
  header: {
    alignItems: 'center',
    gap: 4,
  },
  logo: {
    fontSize: 36,
    fontWeight: '900',
    letterSpacing: 8,
  },
  year: {
    fontSize: 14,
    fontWeight: '600',
  },
  username: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },

  separator: {
    height: 2,
    marginVertical: 12,
    opacity: 0.5,
  },

  // Hero
  heroSection: {
    alignItems: 'center',
  },
  heroNumber: {
    fontWeight: '900',
    letterSpacing: -2,
  },
  heroLabel: {
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // Progress
  progressContainer: {
    alignItems: 'center',
  },
  progressBarBg: {
    width: '100%',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 6,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Activities
  activitiesContainer: {
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  activitiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  activityItem: {
    minWidth: 80,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    alignItems: 'center',
    gap: 4,
  },
    activitySport: {
    fontSize: 11,
    fontWeight: '600',
  },
  activityCount: {
    fontSize: 14,
    fontWeight: '800',
  },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  statCard: {
    minWidth: 100,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },

  // Footer
  footer: {
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  footerBrand: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 4,
  },
});

export default YearCounterCard;
