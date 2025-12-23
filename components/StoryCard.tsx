import React, { forwardRef, useMemo } from 'react';
import { View, Text, Image, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import { getCurrentRank } from '@/lib/ranks';
import { TrendingDown, Trophy, Flame, Target } from 'lucide-react-native';
import { Icon } from '@/components/Icon';

// ============================================
// STORY CARD - Pour partage Instagram/Snapchat
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const CARD_HEIGHT = CARD_WIDTH * 1.25; // Format story ratio

interface StoryCardProps {
  type: 'progress' | 'transformation' | 'achievement';
  data: {
    currentWeight?: number;
    startWeight?: number;
    goalWeight?: number;
    weightLost?: number;
    streak?: number;
    beforePhoto?: string;
    afterPhoto?: string;
    achievementTitle?: string;
    achievementIcon?: string;
    username?: string;
  };
}

export const StoryCard = forwardRef<View, StoryCardProps>(({ type, data }, ref) => {
  const { colors, gradients } = useTheme();
  const rank = useMemo(() => getCurrentRank(data.streak || 0), [data.streak]);

  const renderProgressCard = () => (
    <LinearGradient
      colors={[colors.background, colors.backgroundLight]}
      style={styles.card}
    >
      {/* Logo Yoroi */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/yoroi-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Titre */}
      <Text style={[styles.title, { color: colors.gold }]}>MA PROGRESSION</Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {data.username ? `@${data.username}` : 'Guerrier Yoroi'}
      </Text>

      {/* Poids perdu */}
      {data.weightLost && data.weightLost > 0 && (
        <View style={styles.mainStatContainer}>
          <View style={[styles.mainStatBg, { backgroundColor: colors.goldMuted }]}>
            <TrendingDown size={32} color={colors.success} />
            <Text style={[styles.mainStatValue, { color: colors.success }]}>
              -{data.weightLost.toFixed(1)} kg
            </Text>
            <Text style={[styles.mainStatLabel, { color: colors.textSecondary }]}>Perdus</Text>
          </View>
        </View>
      )}

      {/* Stats row */}
      <View style={styles.statsRow}>
        {data.startWeight && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{data.startWeight} kg</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Départ</Text>
          </View>
        )}
        {data.currentWeight && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.gold }]}>{data.currentWeight} kg</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Actuel</Text>
          </View>
        )}
        {data.goalWeight && (
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{data.goalWeight} kg</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Objectif</Text>
          </View>
        )}
      </View>

      {/* Streak & Rang */}
      <View style={styles.badgesRow}>
        {data.streak && data.streak > 0 && (
          <View style={[styles.badge, { backgroundColor: colors.goldMuted }]}>
            <Flame size={16} color={colors.gold} />
            <Text style={[styles.badgeText, { color: colors.gold }]}>{data.streak} jours</Text>
          </View>
        )}
        <View style={[styles.badge, { backgroundColor: rank.color + '20' }]}>
          <Icon name={rank.icon as any} size={16} color={rank.color} />
          <Text style={[styles.badgeText, { color: rank.color }]}>{rank.name}</Text>
        </View>
      </View>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: colors.textMuted }]}>Suivez ma transformation sur</Text>
        <Text style={[styles.footerBrand, { color: colors.gold }]}>YOROI</Text>
      </View>
    </LinearGradient>
  );

  const renderTransformationCard = () => (
    <LinearGradient
      colors={[colors.background, colors.backgroundLight]}
      style={styles.card}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Image
          source={require('@/assets/images/yoroi-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Titre */}
      <Text style={[styles.title, { color: colors.gold }]}>MA TRANSFORMATION</Text>

      {/* Photos avant/après */}
      <View style={styles.transformationGrid}>
        {data.beforePhoto && (
          <View style={styles.photoContainer}>
            <Image source={{ uri: data.beforePhoto }} style={styles.transformPhoto} />
            <View style={[styles.photoBadge, { backgroundColor: colors.dangerMuted }]}>
              <Text style={[styles.photoBadgeText, { color: colors.danger }]}>AVANT</Text>
            </View>
          </View>
        )}
        {data.afterPhoto && (
          <View style={styles.photoContainer}>
            <Image source={{ uri: data.afterPhoto }} style={styles.transformPhoto} />
            <View style={[styles.photoBadge, { backgroundColor: colors.successMuted }]}>
              <Text style={[styles.photoBadgeText, { color: colors.success }]}>APRÈS</Text>
            </View>
          </View>
        )}
      </View>

      {/* Résultat */}
      {data.weightLost && data.weightLost > 0 && (
        <View style={[styles.resultBadge, { backgroundColor: colors.successMuted }]}>
          <Trophy size={20} color={colors.success} />
          <Text style={[styles.resultText, { color: colors.success }]}>
            -{data.weightLost.toFixed(1)} kg perdus
          </Text>
        </View>
      )}

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerBrand, { color: colors.gold }]}>YOROI</Text>
      </View>
    </LinearGradient>
  );

  const renderAchievementCard = () => (
    <LinearGradient
      colors={gradients.gold}
      style={styles.card}
    >
      {/* Logo */}
      <View style={styles.logoContainerLight}>
        <Image
          source={require('@/assets/images/yoroi-logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </View>

      {/* Badge Achievement */}
      <View style={styles.achievementContainer}>
        <Text style={styles.achievementIcon}>{data.achievementIcon || '🏆'}</Text>
        <Text style={[styles.achievementTitle, { color: colors.background }]}>
          {data.achievementTitle || 'Nouveau Badge'}
        </Text>
      </View>

      {/* Username */}
      <Text style={[styles.achievementUsername, { color: colors.background }]}>
        {data.username || 'Guerrier Yoroi'}
      </Text>

      {/* Footer */}
      <View style={styles.footer}>
        <Text style={[styles.footerBrandDark, { color: colors.background }]}>YOROI</Text>
      </View>
    </LinearGradient>
  );

  return (
    <View ref={ref} collapsable={false}>
      {type === 'progress' && renderProgressCard()}
      {type === 'transformation' && renderTransformationCard()}
      {type === 'achievement' && renderAchievementCard()}
    </View>
  );
});

StoryCard.displayName = 'StoryCard';

const styles = StyleSheet.create({
  card: {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  logoContainerLight: {
    alignItems: 'center',
    marginBottom: 16,
    opacity: 0.9,
  },
  logo: {
    width: 100,
    height: 36,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 4,
  },
  mainStatContainer: {
    alignItems: 'center',
    marginVertical: 20,
  },
  mainStatBg: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    width: '80%',
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: '800',
    marginTop: 8,
  },
  mainStatLabel: {
    fontSize: 14,
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginVertical: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  badgesRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginVertical: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  footer: {
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
  },
  footerBrand: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
    marginTop: 4,
  },
  footerBrandDark: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 3,
  },
  transformationGrid: {
    flexDirection: 'row',
    gap: 12,
    marginVertical: 20,
    flex: 1,
  },
  photoContainer: {
    flex: 1,
    position: 'relative',
  },
  transformPhoto: {
    width: '100%',
    height: '100%',
    borderRadius: 16,
  },
  photoBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  photoBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  resultBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 16,
    marginBottom: 16,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '700',
  },
  achievementContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  achievementIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  achievementTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  achievementUsername: {
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.8,
    marginBottom: 16,
  },
});

export default StoryCard;
