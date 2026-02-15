import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/lib/ThemeContext';
import {
  getOrCreateWeeklyChallenge,
  claimChallengeReward,
  WeeklyChallenge as WeeklyChallengeType,
  Challenge,
} from '@/lib/challenges';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { Check } from 'lucide-react-native';
import logger from '@/lib/security/logger';

// ============================================
// WEEKLY CHALLENGE - COMPOSANT DEFI HEBDOMADAIRE
// ============================================

interface WeeklyChallengeProps {
  onXPGained?: (xp: number, total: number) => void;
  onRefresh?: () => void;
}

export const WeeklyChallenge: React.FC<WeeklyChallengeProps> = ({
  onXPGained,
  onRefresh,
}) => {
  const { colors } = useTheme();
  const [challenge, setChallenge] = useState<WeeklyChallengeType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  // Animations
  const progressAnim = useState(new Animated.Value(0))[0];
  const pulseAnim = useState(new Animated.Value(1))[0];
  const celebrationAnim = useState(new Animated.Value(0))[0];

  // Charger le défi
  const loadChallenge = useCallback(async () => {
    try {
      setIsLoading(true);
      const weeklyChallenge = await getOrCreateWeeklyChallenge();
      setChallenge(weeklyChallenge);

      // Animer la barre de progression
      const percentage = Math.min(
        100,
        (weeklyChallenge.progress / weeklyChallenge.challenge.target) * 100
      );

      Animated.timing(progressAnim, {
        toValue: percentage,
        duration: 800,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false, // REQUIS: utilisé pour interpoler width de barre (layout property)
      }).start();
    } catch (error) {
      logger.error('Erreur chargement défi:', error);
    } finally {
      setIsLoading(false);
    }
  }, [progressAnim]);

  useEffect(() => {
    loadChallenge();
  }, [loadChallenge]);

  // Animation de pulsation pour le bouton de réclamation
  useEffect(() => {
    if (challenge?.completed && !challenge?.xpClaimed) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [challenge?.completed, challenge?.xpClaimed, pulseAnim]);

  // Réclamer la récompense
  const handleClaimReward = async () => {
    if (isClaiming || !challenge?.completed || challenge?.xpClaimed) return;

    setIsClaiming(true);
    notificationAsync(NotificationFeedbackType.Success);

    try {
      const result = await claimChallengeReward();

      if (result.success) {
        // Animation de célébration
        setShowCelebration(true);
        Animated.sequence([
          Animated.timing(celebrationAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(1500),
          Animated.timing(celebrationAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start(() => {
          setShowCelebration(false);
        });

        // Callback
        if (onXPGained) {
          onXPGained(result.xpGained, result.totalXP);
        }

        // Recharger le défi
        await loadChallenge();
        if (onRefresh) {
          onRefresh();
        }
      }
    } catch (error) {
      logger.error('Erreur réclamation XP:', error);
    } finally {
      setIsClaiming(false);
    }
  };

  // Calculer les jours restants
  const getDaysRemaining = (): number => {
    if (!challenge) return 0;
    const now = new Date();
    const end = new Date(challenge.weekEnd);
    const diff = end.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.card }]}>
        <View style={[styles.loadingBar, { backgroundColor: colors.cardHover }]} />
      </View>
    );
  }

  if (!challenge) return null;

  const { challenge: challengeData, progress, completed, xpClaimed } = challenge;
  const percentage = Math.min(100, (progress / challengeData.target) * 100);
  const daysRemaining = getDaysRemaining();

  // Largeur animée de la barre
  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.card }]}>
      {/* Célébration overlay */}
      {showCelebration && (
        <Animated.View
          style={[
            styles.celebrationOverlay,
            {
              opacity: celebrationAnim,
              transform: [{ scale: celebrationAnim }],
            },
          ]}
        >
          <Text style={styles.celebrationText}>+{challengeData.xpReward} XP</Text>
        </Animated.View>
      )}

      {/* En-tête */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.headerIcon}></Text>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Défi de la semaine
          </Text>
        </View>
        <View style={[styles.daysTag, { backgroundColor: colors.cardHover }]}>
          <Text style={[styles.daysText, { color: colors.textSecondary }]}>
            {daysRemaining}j restant{daysRemaining > 1 ? 's' : ''}
          </Text>
        </View>
      </View>

      {/* Nom du défi */}
      <View style={styles.challengeInfo}>
        <Text style={styles.challengeIcon}>{challengeData.icon}</Text>
        <View style={styles.challengeDetails}>
          <Text style={[styles.challengeName, { color: colors.textPrimary }]}>
            {challengeData.name}
            <Text style={[styles.challengeNameJp, { color: colors.textSecondary }]}>
              {' '}{challengeData.nameJp}
            </Text>
          </Text>
          <Text style={[styles.challengeDesc, { color: colors.textSecondary }]}>
            {challengeData.description}
          </Text>
        </View>
      </View>

      {/* Barre de progression */}
      <View style={styles.progressSection}>
        <View style={[styles.progressBar, { backgroundColor: colors.cardHover }]}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressWidth,
                backgroundColor: completed ? colors.gold : challengeData.color,
              },
            ]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text style={[styles.progressText, { color: colors.textPrimary }]}>
            {progress}/{challengeData.target}
          </Text>
          <Text style={[styles.progressPercent, { color: colors.textSecondary }]}>
            {Math.round(percentage)}%
          </Text>
        </View>
      </View>

      {/* Récompense et bouton */}
      <View style={styles.rewardSection}>
        {completed && !xpClaimed ? (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <TouchableOpacity
              style={[styles.claimButton, { backgroundColor: colors.gold }]}
              onPress={handleClaimReward}
              disabled={isClaiming}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(255,255,255,0.2)', 'transparent']}
                style={styles.buttonGradient}
              />
              <Text style={styles.claimButtonText}>
                {isClaiming ? 'Récupération...' : `Récupérer +${challengeData.xpReward} XP`}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        ) : xpClaimed ? (
          <View style={[styles.claimedBadge, { backgroundColor: colors.cardHover }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Check size={14} color={colors.success} strokeWidth={3} />
              <Text style={[styles.claimedText, { color: colors.success }]}>
                XP récupérés
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.xpPreview}>
            <Text style={[styles.xpLabel, { color: colors.textSecondary }]}>
              Récompense
            </Text>
            <Text style={[styles.xpValue, { color: colors.gold }]}>
              +{challengeData.xpReward} XP
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
  },
  loadingBar: {
    height: 120,
    borderRadius: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIcon: {
    fontSize: 18,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  daysTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  daysText: {
    fontSize: 12,
    fontWeight: '600',
  },
  challengeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  challengeIcon: {
    fontSize: 32,
  },
  challengeDetails: {
    flex: 1,
  },
  challengeName: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 2,
  },
  challengeNameJp: {
    fontSize: 14,
    fontWeight: '400',
  },
  challengeDesc: {
    fontSize: 13,
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 12,
  },
  rewardSection: {
    alignItems: 'center',
  },
  claimButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
    overflow: 'hidden',
    minWidth: 200,
    alignItems: 'center',
  },
  buttonGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  claimButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
  },
  claimedBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  claimedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  xpPreview: {
    alignItems: 'center',
  },
  xpLabel: {
    fontSize: 12,
    marginBottom: 2,
  },
  xpValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  celebrationOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(212, 175, 55, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
    zIndex: 10,
  },
  celebrationText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#000000',
  },
});

export default WeeklyChallenge;
