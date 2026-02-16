import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Trophy, Star, Flame, TrendingUp, ChevronRight, Zap, Target } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getCurrentRank, getNextRank, getRankProgress, getDaysToNextRank, RANKS } from '@/lib/ranks';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Icon } from '@/components/Icon';

// ============================================
// PROGRESSION CARD - Gamification visible
// ============================================

interface ProgressionCardProps {
  streak: number;
  totalWorkouts?: number;
  totalMeasurements?: number;
  badgesUnlocked?: number;
  totalBadges?: number;
  weightLost?: number;
  onPress?: () => void;
}

export function ProgressionCard({
  streak,
  totalWorkouts = 0,
  totalMeasurements = 0,
  badgesUnlocked = 0,
  totalBadges = 12,
  weightLost = 0,
  onPress,
}: ProgressionCardProps) {
  const { colors, gradients } = useTheme();

  const rank = useMemo(() => getCurrentRank(streak), [streak]);
  const nextRank = useMemo(() => getNextRank(streak), [streak]);
  const rankProgress = useMemo(() => getRankProgress(streak), [streak]);
  const daysToNext = useMemo(() => getDaysToNextRank(streak), [streak]);

  // Calculate XP equivalent
  const xpCurrent = useMemo(() => {
    return streak * 100 + totalWorkouts * 50 + totalMeasurements * 30;
  }, [streak, totalWorkouts, totalMeasurements]);

  const xpToNextLevel = 1000; // Base XP for next level
  const xpProgress = (xpCurrent % xpToNextLevel) / xpToNextLevel * 100;
  const level = Math.floor(xpCurrent / xpToNextLevel) + 1;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push('/profile');
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.8} onPress={handlePress}>
      <LinearGradient
        colors={[colors.card, colors.backgroundLight]}
        style={[styles.container, { borderColor: colors.border }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.rankContainer}>
            <Icon name={rank.icon as any} size={32} color={rank.color} />
            <View>
              <Text style={[styles.rankName, { color: rank.color }]}>{rank.name}</Text>
              <Text style={[styles.rankNameJp, { color: colors.textSecondary }]}>{rank.nameJp}</Text>
            </View>
          </View>
          <View style={[styles.levelBadge, { backgroundColor: colors.goldMuted }]}>
            <Star size={14} color={colors.gold} fill={colors.gold} />
            <Text style={[styles.levelText, { color: colors.gold }]}>Niv. {level}</Text>
          </View>
        </View>

        {/* Progress to next rank */}
        {nextRank && (
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                Progression vers {nextRank.icon} {nextRank.name}
              </Text>
              <Text style={[styles.progressPercent, { color: colors.gold }]}>
                {Math.round(rankProgress)}%
              </Text>
            </View>
            <ProgressBar progress={rankProgress} height={8} color="gold" />
            <Text style={[styles.progressHint, { color: colors.textMuted }]}>
              Encore {daysToNext} jours de streak
            </Text>
          </View>
        )}

        {/* XP Bar */}
        <View style={styles.xpSection}>
          <View style={styles.xpHeader}>
            <Zap size={16} color={colors.info} />
            <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
              {xpCurrent.toLocaleString()} XP
            </Text>
            <Text style={[styles.xpToNext, { color: colors.textMuted }]}>
              / {(Math.ceil(xpCurrent / xpToNextLevel) * xpToNextLevel).toLocaleString()}
            </Text>
          </View>
          <View style={[styles.xpBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.xpFill,
                { width: `${xpProgress}%`, backgroundColor: colors.info },
              ]}
            />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.goldMuted }]}>
              <Flame size={18} color={colors.gold} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{streak}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.successMuted }]}>
              <TrendingUp size={18} color={colors.success} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{totalWorkouts}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Entraînements</Text>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.statIconContainer, { backgroundColor: colors.purpleMuted }]}>
              <Trophy size={18} color={colors.purple} />
            </View>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>
              {badgesUnlocked}/{totalBadges}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Badges</Text>
          </View>

          {weightLost > 0 && (
            <View style={styles.statItem}>
              <View style={[styles.statIconContainer, { backgroundColor: colors.successMuted }]}>
                <Target size={18} color={colors.success} />
              </View>
              <Text style={[styles.statValue, { color: colors.success }]}>-{weightLost.toFixed(1)}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>kg perdus</Text>
            </View>
          )}
        </View>

        {/* Call to action */}
        <View style={[styles.cta, { borderTopColor: colors.border }]}>
          <Text style={[styles.ctaText, { color: colors.textSecondary }]}>Voir mon profil complet</Text>
          <ChevronRight size={18} color={colors.textMuted} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  rankContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rankName: {
    fontSize: 18,
    fontWeight: '700',
  },
  rankNameJp: {
    fontSize: 12,
    marginTop: 2,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  levelText: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 13,
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressHint: {
    fontSize: 11,
    marginTop: 6,
  },
  xpSection: {
    marginBottom: 20,
    paddingBottom: 16,
  },
  xpHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  xpLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  xpToNext: {
    fontSize: 13,
  },
  xpBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: {
    height: '100%',
    borderRadius: 3,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  cta: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    gap: 4,
  },
  ctaText: {
    fontSize: 13,
    fontWeight: '500',
  },
});

export default ProgressionCard;
