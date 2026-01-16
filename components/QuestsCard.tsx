import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import {
  getDailyQuestsProgress,
  getWeeklyQuestsProgress,
  getMonthlyQuestsProgress,
  checkAndUpdateQuests,
  addHydration,
  getDailyHydration,
  Quest,
  QuestProgress,
} from '@/lib/quests';
import * as Haptics from 'expo-haptics';
import logger from '@/lib/security/logger';
import {
  Target,
  Flame,
  Trophy,
  Star,
  Zap,
  ChevronRight,
  Droplets,
  Moon,
  Footprints,
  Dumbbell,
  Award,
  Gift,
  Lock,
  CheckCircle2,
  Sparkles
} from 'lucide-react-native';
import { router } from 'expo-router';

// ============================================
// QUESTS CARD - VERSION GAMING PREMIUM
// ============================================

interface QuestsCardProps {
  onXPGained?: (xp: number) => void;
  onRefresh?: () => void;
}

type QuestWithProgress = Quest & QuestProgress;

interface QuestsSummary {
  quests: QuestWithProgress[];
  completed: number;
  total: number;
  xpEarned: number;
}

export const QuestsCard: React.FC<QuestsCardProps> = ({
  onXPGained,
  onRefresh,
}) => {
  const { colors, isDark } = useTheme();
  const [dailyQuests, setDailyQuests] = useState<QuestsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // Animation pulse pour l'icône
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  // Animation glow
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const loadQuests = useCallback(async () => {
    try {
      setIsLoading(true);
      await checkAndUpdateQuests();
      const daily = await getDailyQuestsProgress();
      setDailyQuests(daily);
      setTotalXP(daily?.xpEarned || 0);

      // Animer la barre de progression
      if (daily) {
        Animated.timing(progressAnim, {
          toValue: daily.completed / daily.total,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();
      }
    } catch (error) {
      logger.error('Erreur chargement quêtes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  const getQuestIcon = (questId: string) => {
    if (questId.includes('hydration')) return Droplets;
    if (questId.includes('sleep')) return Moon;
    if (questId.includes('steps')) return Footprints;
    if (questId.includes('training') || questId.includes('workout')) return Dumbbell;
    if (questId.includes('weight')) return Target;
    return Star;
  };

  const getQuestColor = (questId: string) => {
    if (questId.includes('hydration')) return '#06B6D4';
    if (questId.includes('sleep')) return '#8B5CF6';
    if (questId.includes('steps')) return '#10B981';
    if (questId.includes('training') || questId.includes('workout')) return '#F97316';
    if (questId.includes('weight')) return '#EC4899';
    return '#FFD700';
  };

  if (isLoading || !dailyQuests) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
        <View style={[styles.loadingBar, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  const completedCount = dailyQuests.completed;
  const totalCount = dailyQuests.total;
  const progressPercent = (completedCount / totalCount) * 100;

  return (
    <TouchableOpacity
      activeOpacity={0.95}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push('/gamification');
      }}
    >
      <LinearGradient
        colors={isDark
          ? ['#1A1A2E', '#16213E', '#0F3460']
          : ['#FFFFFF', '#F8FAFC', '#EFF6FF']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.container}
      >
        {/* Header Gaming */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.iconGradient}
              >
                <Target size={22} color="#FFFFFF" strokeWidth={2.5} />
              </LinearGradient>
            </Animated.View>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Quêtes du jour
              </Text>
              <View style={styles.xpBadge}>
                <Zap size={12} color="#FFD700" fill="#FFD700" />
                <Text style={styles.xpText}>+{totalXP} XP disponibles</Text>
              </View>
            </View>
          </View>

          {/* Compteur circulaire */}
          <View style={styles.counterCircle}>
            <Text style={[styles.counterValue, { color: completedCount === totalCount ? '#10B981' : '#FFD700' }]}>
              {completedCount}
            </Text>
            <Text style={[styles.counterTotal, { color: colors.textMuted }]}>/{totalCount}</Text>
          </View>
        </View>

        {/* Barre de progression animée */}
        <View style={styles.progressSection}>
          <View style={[styles.progressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  })
                }
              ]}
            >
              <LinearGradient
                colors={['#FFD700', '#FFA500', '#FF8C00']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.progressGradient}
              />
            </Animated.View>

            {/* Étoiles sur la barre */}
            {[0.25, 0.5, 0.75, 1].map((pos, i) => (
              <View key={i} style={[styles.progressStar, { left: `${pos * 100 - 3}%` }]}>
                <Star
                  size={14}
                  color={progressPercent >= pos * 100 ? '#FFD700' : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)')}
                  fill={progressPercent >= pos * 100 ? '#FFD700' : 'transparent'}
                />
              </View>
            ))}
          </View>
        </View>

        {/* Liste des quêtes (3 max affichées) */}
        <View style={styles.questsList}>
          {dailyQuests.quests.slice(0, 3).map((quest, index) => {
            const IconComponent = getQuestIcon(quest.id);
            const questColor = getQuestColor(quest.id);
            const questProgress = Math.min(100, (quest.current / quest.target) * 100);

            return (
              <View
                key={quest.id}
                style={[
                  styles.questItem,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }
                ]}
              >
                {/* Icône avec état */}
                <View style={[styles.questIcon, { backgroundColor: `${questColor}20` }]}>
                  {quest.completed ? (
                    <CheckCircle2 size={20} color="#10B981" fill="#10B98130" />
                  ) : (
                    <IconComponent size={20} color={questColor} />
                  )}
                </View>

                {/* Contenu */}
                <View style={styles.questContent}>
                  <View style={styles.questTitleRow}>
                    <Text
                      style={[
                        styles.questTitle,
                        { color: quest.completed ? colors.textMuted : colors.textPrimary },
                        quest.completed && styles.questTitleCompleted
                      ]}
                      numberOfLines={1}
                    >
                      {quest.title}
                    </Text>
                  </View>

                  {/* Mini barre de progression */}
                  {!quest.completed && quest.target > 1 && (
                    <View style={styles.questProgressContainer}>
                      <View style={[styles.questProgressBar, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                        <View
                          style={[
                            styles.questProgressFill,
                            { width: `${questProgress}%`, backgroundColor: questColor }
                          ]}
                        />
                      </View>
                      <Text style={[styles.questProgressText, { color: colors.textMuted }]}>
                        {quest.current}/{quest.target}
                      </Text>
                    </View>
                  )}
                </View>

                {/* XP Reward */}
                <View style={[styles.xpReward, { backgroundColor: quest.completed ? '#10B98120' : '#FFD70020' }]}>
                  <Text style={[styles.xpRewardText, { color: quest.completed ? '#10B981' : '#FFD700' }]}>
                    {quest.completed ? '✓' : `+${quest.xp}`}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* Footer avec badges à débloquer */}
        <View style={styles.footer}>
          <View style={styles.badgesPreview}>
            <View style={styles.badgesList}>
              {[1, 2, 3].map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.miniBadge,
                    {
                      backgroundColor: i < completedCount
                        ? (i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32')
                        : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)')
                    }
                  ]}
                >
                  {i < completedCount ? (
                    <Trophy size={12} color="#FFFFFF" />
                  ) : (
                    <Lock size={10} color={isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)'} />
                  )}
                </View>
              ))}
            </View>
            <Text style={[styles.badgesText, { color: colors.textMuted }]}>
              {completedCount} badge{completedCount > 1 ? 's' : ''} débloqué{completedCount > 1 ? 's' : ''}
            </Text>
          </View>

          <View style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>Voir tout</Text>
            <ChevronRight size={16} color="#FFD700" />
          </View>
        </View>

        {/* Effet brillance */}
        {completedCount === totalCount && (
          <View style={styles.completedOverlay}>
            <Sparkles size={20} color="#FFD700" />
            <Text style={styles.completedText}>Toutes les quêtes terminées !</Text>
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  loadingBar: {
    height: 180,
    borderRadius: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrapper: {
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  iconGradient: {
    width: 44,
    height: 44,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  xpText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFD700',
  },
  counterCircle: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  counterValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  counterTotal: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressSection: {
    marginBottom: 16,
  },
  progressBar: {
    height: 12,
    borderRadius: 6,
    overflow: 'visible',
    position: 'relative',
  },
  progressFill: {
    height: '100%',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressGradient: {
    flex: 1,
  },
  progressStar: {
    position: 'absolute',
    top: -4,
  },
  questsList: {
    gap: 10,
    marginBottom: 16,
  },
  questItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    gap: 12,
  },
  questIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  questContent: {
    flex: 1,
  },
  questTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  questTitleCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.7,
  },
  questProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  questProgressBar: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  questProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  questProgressText: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 35,
  },
  xpReward: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  xpRewardText: {
    fontSize: 13,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.15)',
  },
  badgesPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  badgesList: {
    flexDirection: 'row',
    gap: 4,
  },
  miniBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgesText: {
    fontSize: 12,
    fontWeight: '600',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFD700',
  },
  completedOverlay: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  completedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

export default QuestsCard;
