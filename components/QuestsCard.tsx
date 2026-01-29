import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ScrollView,
  PanResponder,
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
  completeQuest,
  uncompleteQuest,
  Quest,
  QuestProgress,
  QuestId,
} from '@/lib/quests';
import { notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import logger from '@/lib/security/logger';
import {
  Target,
  Flame,
  Trophy,
  Star,
  Zap,
  Droplets,
  Moon,
  Footprints,
  Dumbbell,
  Award,
  Gift,
  Lock,
  CheckCircle2,
  Sparkles,
  ChevronRight,
  Camera,
  BookOpen,
  Snowflake,
  Users,
  Crown,
  Calendar,
  TrendingUp,
  Coffee,
  Salad,
  Sofa,
  Share2
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

type TabType = 'day' | 'week' | 'month';

export const QuestsCard: React.FC<QuestsCardProps> = ({
  onXPGained,
  onRefresh,
}) => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('day');
  const [dailyQuests, setDailyQuests] = useState<QuestsSummary | null>(null);
  const [weeklyQuests, setWeeklyQuests] = useState<QuestsSummary | null>(null);
  const [monthlyQuests, setMonthlyQuests] = useState<QuestsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [totalXP, setTotalXP] = useState(0);
  const questsScrollRef = useRef<ScrollView>(null);
  const [scrollContentHeight, setScrollContentHeight] = useState(1000); // Valeur par défaut pour éviter 0
  const [containerHeight, setContainerHeight] = useState(480);
  const scrollOffset = useRef(new Animated.Value(0)).current;
  const currentScrollValue = useRef(0); // Pour suivre la valeur sans listener asynchrone

  useEffect(() => {
    const id = scrollOffset.addListener(({ value }) => {
      currentScrollValue.current = value;
    });
    return () => scrollOffset.removeListener(id);
  }, []);

  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  // PanResponder pour le scroll custom (Slider vertical)
  const panResponderStart = useRef(0);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        impactAsync(ImpactFeedbackStyle.Light);
        panResponderStart.current = currentScrollValue.current;
      },
      onPanResponderMove: (evt, gestureState) => {
        const trackHeight = 480 - 16; // Hauteur conteneur moins padding
        const thumbHeight = 40;
        const scrollableTrack = trackHeight - thumbHeight;
        
        if (scrollableTrack <= 0) return;

        const maxScroll = Math.max(0, scrollContentHeight - containerHeight);
        if (maxScroll <= 0) return;

        const ratio = maxScroll / scrollableTrack;
        const deltaScroll = gestureState.dy * ratio;
        
        const newScroll = Math.max(0, Math.min(maxScroll, panResponderStart.current + deltaScroll));
        
        questsScrollRef.current?.scrollTo({ y: newScroll, animated: false });
      },
      onPanResponderRelease: () => {
        // Fin du geste
      },
    })
  ).current;

  // Calculer la position du thumb en fonction du scroll réel
  const thumbPosition = scrollOffset.interpolate({
    inputRange: [0, Math.max(1, scrollContentHeight - containerHeight)],
    outputRange: [0, 480 - 16 - 40], // trackHeight - thumbHeight
    extrapolate: 'clamp',
  });

  // ... (animations pulse & glow inchangées)
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

  // ... (loadQuests inchangé)
  const loadQuests = useCallback(async () => {
    try {
      setIsLoading(true);
      await checkAndUpdateQuests();

      const [daily, weekly, monthly] = await Promise.all([
        getDailyQuestsProgress(),
        getWeeklyQuestsProgress(),
        getMonthlyQuestsProgress(),
      ]);

      setDailyQuests(daily);
      setWeeklyQuests(weekly);
      setMonthlyQuests(monthly);

      const currentQuests = activeTab === 'day' ? daily : activeTab === 'week' ? weekly : monthly;
      setTotalXP(currentQuests?.xpEarned || 0);

      if (currentQuests) {
        Animated.timing(progressAnim, {
          toValue: currentQuests.completed / currentQuests.total,
          duration: 800,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }).start();
      }
    } catch (error) {
      logger.error('Erreur chargement défis:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    const currentQuests = activeTab === 'day' ? dailyQuests : activeTab === 'week' ? weeklyQuests : monthlyQuests;
    if (currentQuests) {
      setTotalXP(currentQuests.xpEarned || 0);
      Animated.timing(progressAnim, {
        toValue: currentQuests.completed / currentQuests.total,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: false,
      }).start();
    }
  }, [activeTab, dailyQuests, weeklyQuests, monthlyQuests]);

  useEffect(() => {
    loadQuests();
  }, [loadQuests]);

  // Naviguer vers l'écran approprié pour remplir la défi
  const getQuestRoute = (questId: string): string | null => {
    // Routes pour chaque type de défi (null = défi manuelle à cocher)
    const routes: Record<string, string> = {
      // Daily (15) - Routes triées par XP
      'daily_weigh': '/add-measurement',
      'daily_breakfast': '/quick-nutrition',
      'daily_read_article': '/savoir',
      'daily_sleep': '/sleep-input',
      'daily_hydration': '/hydration',
      'daily_protein': '/quick-nutrition',
      'daily_photo': '/(tabs)/more/photos',
      'daily_steps': '/health-metrics',
      'daily_cardio': '/add-training',
      'daily_training': '/add-training',
      // daily_open_app, daily_stretch, daily_meditation, daily_no_junk, daily_cold_shower = manuelles

      // Weekly (15) - Routes triées par XP
      'weekly_visit_dojo': '/gamification',
      'weekly_check_stats': '/(tabs)/stats',
      'weekly_share_progress': '/share-hub',
      'weekly_photo': '/(tabs)/more/photos',
      'weekly_read_articles': '/savoir',
      'weekly_5_weighs': '/add-measurement',
      'weekly_measurements': '/measurements',
      'weekly_cardio_3': '/add-training',
      'weekly_4_trainings': '/add-training',
      // weekly_rest_day, weekly_try_new, weekly_meal_prep, weekly_no_sugar, weekly_hydration_streak, weekly_7_streak = manuelles

      // Monthly (15) - Routes triées par XP
      'monthly_25_weighs': '/add-measurement',
      'monthly_body_scan': '/body-composition',
      'monthly_transformation': '/(tabs)/more/photos',
      'monthly_20_trainings': '/add-training',
      'monthly_new_pr': '/records',
      'monthly_lose_2kg': '/add-measurement',
      // monthly_invite_friend, monthly_sleep_quality, monthly_hydration_master, monthly_all_daily, monthly_consistency, monthly_perfect_week, monthly_30_streak, monthly_level_up, monthly_best_version = manuelles
    };
    return routes[questId] || null;
  };

  // Gérer le tap sur une défi
  const handleQuestTap = async (quest: QuestWithProgress) => {
    impactAsync(ImpactFeedbackStyle.Medium);

    const route = getQuestRoute(quest.id);

    if (route) {
      // Naviguer vers l'écran pour remplir la défi
      router.push(route as any);
    } else {
      // Quête manuelle - toggle compléter/désélectionner
      try {
        if (quest.completed) {
          const result = await uncompleteQuest(quest.id as QuestId);
          if (result.success) {
            notificationAsync(NotificationFeedbackType.Warning);
            loadQuests();
          }
        } else {
          const result = await completeQuest(quest.id as QuestId);
          if (result.success && result.xpEarned > 0) {
            notificationAsync(NotificationFeedbackType.Success);
            onXPGained?.(result.xpEarned);
            loadQuests();
          }
        }
      } catch (error) {
        logger.error('Erreur toggle defi:', error);
      }
    }
  };

  const getQuestIcon = (questId: string | undefined) => {
    if (!questId) return Star;
    // Photo / Transformation
    if (questId.includes('photo') || questId.includes('transformation')) return Camera;
    // Lecture / Articles
    if (questId.includes('read') || questId.includes('article')) return BookOpen;
    // Hydratation
    if (questId.includes('hydration')) return Droplets;
    // Sommeil
    if (questId.includes('sleep')) return Moon;
    // Pas / Steps
    if (questId.includes('steps')) return Footprints;
    // Training / Workout
    if (questId.includes('training') || questId.includes('workout')) return Dumbbell;
    // Poids / Pesée
    if (questId.includes('weight') || questId.includes('weigh') || questId.includes('lose')) return Target;
    // Cardio
    if (questId.includes('cardio')) return Flame;
    // Protéines
    if (questId.includes('protein')) return Zap;
    // Petit-déjeuner
    if (questId.includes('breakfast')) return Coffee;
    // Douche froide
    if (questId.includes('cold') || questId.includes('shower')) return Snowflake;
    // Stretch / Méditation
    if (questId.includes('stretch') || questId.includes('meditation')) return Sparkles;
    // Repos
    if (questId.includes('rest')) return Sofa;
    // Share / Partage
    if (questId.includes('share')) return Share2;
    // Inviter ami
    if (questId.includes('invite') || questId.includes('friend')) return Users;
    // Record / PR
    if (questId.includes('record') || questId.includes('pr') || questId.includes('new_pr')) return Trophy;
    // Level up / Best version
    if (questId.includes('level') || questId.includes('best')) return Crown;
    // Streak
    if (questId.includes('streak')) return Flame;
    // Consistency / Calendar
    if (questId.includes('consistency') || questId.includes('perfect')) return Calendar;
    // Clean eating / no junk / no sugar
    if (questId.includes('junk') || questId.includes('sugar') || questId.includes('clean')) return Salad;
    // Default
    return Star;
  };

  const getQuestColor = (questId: string | undefined) => {
    if (!questId) return '#FFD700';
    // Photo / Transformation - Rose
    if (questId.includes('photo') || questId.includes('transformation')) return '#E879F9';
    // Lecture / Articles - Cyan
    if (questId.includes('read') || questId.includes('article')) return '#22D3EE';
    // Hydratation - Bleu
    if (questId.includes('hydration')) return '#06B6D4';
    // Sommeil - Violet
    if (questId.includes('sleep')) return '#8B5CF6';
    // Pas - Vert
    if (questId.includes('steps')) return '#10B981';
    // Training - Orange
    if (questId.includes('training') || questId.includes('workout')) return '#F97316';
    // Poids - Rose
    if (questId.includes('weight') || questId.includes('weigh') || questId.includes('lose')) return '#EC4899';
    // Cardio - Rouge
    if (questId.includes('cardio')) return '#EF4444';
    // Protéines - Jaune
    if (questId.includes('protein')) return '#F59E0B';
    // Petit-déjeuner - Jaune doré
    if (questId.includes('breakfast')) return '#FBBF24';
    // Douche froide - Bleu glace
    if (questId.includes('cold') || questId.includes('shower')) return '#0EA5E9';
    // Stretch - Violet clair
    if (questId.includes('stretch')) return '#A855F7';
    // Méditation - Indigo
    if (questId.includes('meditation')) return '#6366F1';
    // Repos - Gris bleuté
    if (questId.includes('rest')) return '#64748B';
    // Share - Vert
    if (questId.includes('share')) return '#22C55E';
    // Inviter ami - Bleu
    if (questId.includes('invite') || questId.includes('friend')) return '#3B82F6';
    // Record - Or
    if (questId.includes('record') || questId.includes('pr') || questId.includes('new_pr')) return '#FFD700';
    // Level up / Best - Or royal
    if (questId.includes('level') || questId.includes('best')) return '#FCD34D';
    // Streak - Orange feu
    if (questId.includes('streak')) return '#F97316';
    // Consistency - Emeraude
    if (questId.includes('consistency') || questId.includes('perfect')) return '#059669';
    // Clean eating - Vert lime
    if (questId.includes('junk') || questId.includes('sugar') || questId.includes('clean')) return '#84CC16';
    return '#FFD700';
  };

  const currentQuests = activeTab === 'day' ? dailyQuests : activeTab === 'week' ? weeklyQuests : monthlyQuests;

  if (isLoading || !currentQuests) {
    return (
      <View style={[styles.container, { backgroundColor: isDark ? '#1A1A2E' : '#FFFFFF' }]}>
        <View style={[styles.loadingBar, { backgroundColor: colors.border }]} />
      </View>
    );
  }

  const completedCount = currentQuests.completed;
  const totalCount = currentQuests.total;
  const progressPercent = (completedCount / totalCount) * 100;

  const tabLabels: Record<TabType, string> = {
    day: 'Jour',
    week: 'Semaine',
    month: 'Mois',
  };

  return (
    <View>
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
          <TouchableOpacity 
            style={styles.headerLeft}
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light);
              router.push('/gamification?tab=defis');
            }}
          >
            <Animated.View style={[styles.iconWrapper, { transform: [{ scale: pulseAnim }] }]}>
              <LinearGradient
                colors={['#FFD700', '#FFA500']}
                style={styles.iconGradient}
              >
                <Target size={22} color="#000000" strokeWidth={2.5} />
              </LinearGradient>
            </Animated.View>
            <View>
              <Text style={[styles.title, { color: colors.textPrimary }]}>
                Défis
              </Text>
              <View style={styles.xpBadge}>
                <Zap size={12} color="#FFD700" fill="#FFD700" />
                <Text style={styles.xpText}>+{totalXP} XP</Text>
              </View>
            </View>
          </TouchableOpacity>

          <View style={styles.counterCircle}>
            <Text style={[styles.counterValue, { color: completedCount === totalCount ? '#10B981' : '#FFD700' }]}>
              {completedCount}
            </Text>
            <Text style={[styles.counterTotal, { color: colors.textMuted }]}>/{totalCount}</Text>
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabsRow}>
          {(['day', 'week', 'month'] as TabType[]).map((tab) => {
            const isActive = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                style={[
                  styles.tab,
                  {
                    backgroundColor: isActive
                      ? '#FFD700'
                      : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                    borderColor: isActive ? '#FFD700' : 'transparent'
                  }
                ]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  setActiveTab(tab);
                }}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.tabText,
                  {
                    color: isActive ? '#000000' : colors.textMuted,
                    fontWeight: isActive ? '800' : '700'
                  }
                ]}>
                  {tabLabels[tab]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Barre de progression */}
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

        {/* Scroll Wrapper avec Slider Latéral à GAUCHE */}
        <View style={styles.scrollWrapper}>
          {/* TRACK DE SCROLL TACTILE À GAUCHE */}
          <View
            style={[styles.sideTrackContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]}
            {...panResponder.panHandlers}
          >
            <Animated.View
              style={[
                styles.sideTrackThumb,
                {
                  backgroundColor: '#FFD700',
                  transform: [{ translateY: thumbPosition }]
                }
              ]}
            />
          </View>

          <ScrollView
            ref={questsScrollRef}
            style={styles.questsScroll}
            contentContainerStyle={styles.questsList}
            nestedScrollEnabled={true}
            showsVerticalScrollIndicator={false}
            scrollEnabled={true}
            bounces={true}
            onContentSizeChange={(w, h) => setScrollContentHeight(h)}
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollOffset } } }],
              { useNativeDriver: false }
            )}
            scrollEventThrottle={16}
          >
          {currentQuests.quests.filter(q => q && q.id).map((quest, index) => {
            const IconComponent = getQuestIcon(quest.id);
            const questColor = getQuestColor(quest.id);
            const questProgress = Math.min(100, (quest.current / quest.target) * 100);

            return (
              <TouchableOpacity
                key={quest.id}
                style={[
                  styles.questItem,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' },
                  quest.completed && { backgroundColor: isDark ? 'rgba(16,185,129,0.15)' : 'rgba(16,185,129,0.1)' }
                ]}
                onPress={() => handleQuestTap(quest)}
                onLongPress={async () => {
                  // Long press = désélectionner
                  if (quest.completed) {
                    impactAsync(ImpactFeedbackStyle.Heavy);
                    const result = await uncompleteQuest(quest.id as QuestId);
                    if (result.success) {
                      notificationAsync(NotificationFeedbackType.Warning);
                      loadQuests();
                    }
                  }
                }}
                delayLongPress={500}
                activeOpacity={0.7}
              >
                <View style={[styles.questIcon, { backgroundColor: `${questColor}20` }]}>
                  {quest.completed ? (
                    <CheckCircle2 size={20} color="#10B981" fill="#10B98130" />
                  ) : (
                    <IconComponent size={20} color={questColor} />
                  )}
                </View>

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

                  <Text
                    style={[
                      styles.questDescription,
                      { color: colors.textMuted }
                    ]}
                    numberOfLines={1}
                  >
                    {quest.description}
                  </Text>

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

                <View style={[styles.xpReward, { backgroundColor: quest.completed ? '#10B98130' : '#FFD700' }]}>
                  <Text style={[styles.xpRewardText, { color: quest.completed ? '#FFFFFF' : '#000000' }]}>
                    {quest.completed ? '✓' : `+${quest.xp}`}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          </ScrollView>
        </View>

        {/* Footer */}
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

          <TouchableOpacity 
            style={styles.seeAllButton}
            onPress={() => router.push('/gamification?tab=defis')}
          >
            <Text style={styles.seeAllText}>Voir tout</Text>
            <ChevronRight size={16} color="#FFD700" />
          </TouchableOpacity>
        </View>

        {completedCount === totalCount && (
          <View style={styles.completedOverlay}>
            <Sparkles size={20} color="#FFD700" />
            <Text style={styles.completedText}>Toutes les défis terminées !</Text>
          </View>
        )}
      </LinearGradient>
    </View>
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
    marginBottom: 12,
  },
  tabsRow: {
    flexDirection: 'row',
    marginBottom: 16,
    gap: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  tabActive: {
    // Style dynamique appliqué inline
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
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
  scrollWrapper: {
    height: 480, // Augmenté pour afficher 7 défis
    flexDirection: 'row',
    marginBottom: 16,
  },
  questsScroll: {
    flex: 1,
    paddingLeft: 8,
  },
  sideTrackContainer: {
    width: 20,
    height: '100%',
    marginRight: 4,
    borderRadius: 10,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingVertical: 4,
  },
  sideTrackThumb: {
    width: 12,
    height: 50,
    borderRadius: 6,
  },
  questsList: {
    gap: 10,
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
  questDescription: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
    opacity: 0.8,
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
