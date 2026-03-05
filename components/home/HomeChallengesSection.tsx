// ============================================
// YOROI - Section Defis (Home Screen)
// 5 defis par onglet, rotation hebdo/mensuelle
// Couleurs du theme, long press valider/devalider
// Connecte au vrai systeme lib/quests.ts
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Gamepad2,
  Zap,
  Check,
  XCircle,
  ChevronDown,
  ChevronUp,
  Moon,
  BookOpen,
  Footprints,
  Flame,
  Trophy,
  Dumbbell,
  Droplets,
  Scale,
  Crown,
  TrendingDown,
  Target,
  Waves,
  Bed,
  Camera,
  Snowflake,
  Users,
  Coffee,
  Salad,
  type LucideIcon,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle, notificationAsync, NotificationFeedbackType } from 'expo-haptics';
import {
  getDailyQuestsProgress,
  getWeeklyQuestsProgress,
  getMonthlyQuestsProgress,
  checkAndUpdateQuests,
  completeQuest,
  uncompleteQuest,
  getTotalXp,
  Quest,
  QuestProgress,
  QuestId,
} from '@/lib/quests';
import logger from '@/lib/security/logger';

// ============================================
// ICON MAPPING (couleur de l'icone uniquement)
// ============================================

const QUEST_ICON_MAP: Record<string, { Icon: LucideIcon; color: string }> = {
  'daily_open_app': { Icon: Check, color: '#10B981' },
  'daily_sleep': { Icon: Moon, color: '#8B5CF6' },
  'daily_read_article': { Icon: BookOpen, color: '#8B5CF6' },
  'daily_steps': { Icon: Footprints, color: '#10B981' },
  'daily_cardio': { Icon: Flame, color: '#EF4444' },
  'daily_weigh': { Icon: Scale, color: '#EC4899' },
  'daily_breakfast': { Icon: Coffee, color: '#F97316' },
  'daily_stretch': { Icon: Target, color: '#06B6D4' },
  'daily_meditation': { Icon: Moon, color: '#A78BFA' },
  'daily_hydration': { Icon: Droplets, color: '#06B6D4' },
  'daily_protein': { Icon: Flame, color: '#F97316' },
  'daily_photo': { Icon: Camera, color: '#8B5CF6' },
  'daily_no_junk': { Icon: Salad, color: '#10B981' },
  'daily_cold_shower': { Icon: Snowflake, color: '#06B6D4' },
  'daily_training': { Icon: Dumbbell, color: '#F97316' },
  'weekly_visit_dojo': { Icon: Trophy, color: '#F59E0B' },
  'weekly_check_stats': { Icon: Target, color: '#3B82F6' },
  'weekly_rest_day': { Icon: Bed, color: '#8B5CF6' },
  'weekly_share_progress': { Icon: Users, color: '#EC4899' },
  'weekly_try_new': { Icon: Zap, color: '#F59E0B' },
  'weekly_photo': { Icon: Camera, color: '#8B5CF6' },
  'weekly_meal_prep': { Icon: Coffee, color: '#10B981' },
  'weekly_read_articles': { Icon: BookOpen, color: '#8B5CF6' },
  'weekly_5_weighs': { Icon: Scale, color: '#EC4899' },
  'weekly_measurements': { Icon: Target, color: '#3B82F6' },
  'weekly_no_sugar': { Icon: Salad, color: '#10B981' },
  'weekly_hydration_streak': { Icon: Droplets, color: '#06B6D4' },
  'weekly_cardio_3': { Icon: Flame, color: '#EF4444' },
  'weekly_4_trainings': { Icon: Dumbbell, color: '#F97316' },
  'weekly_7_streak': { Icon: Crown, color: '#F59E0B' },
  'monthly_invite_friend': { Icon: Users, color: '#EC4899' },
  'monthly_25_weighs': { Icon: Scale, color: '#EC4899' },
  'monthly_body_scan': { Icon: Target, color: '#3B82F6' },
  'monthly_sleep_quality': { Icon: Moon, color: '#8B5CF6' },
  'monthly_transformation': { Icon: Camera, color: '#8B5CF6' },
  'monthly_20_trainings': { Icon: Dumbbell, color: '#F97316' },
  'monthly_hydration_master': { Icon: Droplets, color: '#06B6D4' },
  'monthly_new_pr': { Icon: Trophy, color: '#F59E0B' },
  'monthly_lose_2kg': { Icon: TrendingDown, color: '#10B981' },
  'monthly_all_daily': { Icon: Crown, color: '#F59E0B' },
  'monthly_consistency': { Icon: Flame, color: '#EF4444' },
  'monthly_perfect_week': { Icon: Crown, color: '#F59E0B' },
  'monthly_30_streak': { Icon: Zap, color: '#FBBF24' },
  'monthly_level_up': { Icon: Trophy, color: '#F59E0B' },
  'monthly_best_version': { Icon: Crown, color: '#F59E0B' },
};

const getQuestIcon = (questId: string) => {
  return QUEST_ICON_MAP[questId] || { Icon: Target, color: '#3B82F6' };
};

// ============================================
// TYPES
// ============================================

type TabType = 'JOUR' | 'SEMAINE' | 'MOIS';
type QuestWithProgress = Quest & QuestProgress;

interface Props {
  onXPGained?: (xp: number) => void;
}

// ============================================
// ROTATION : 5 defis parmi N
// ============================================

const getWeekNumber = (): number => {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  return Math.floor((now.getTime() - start.getTime()) / (7 * 24 * 60 * 60 * 1000));
};

const getMonthNumber = (): number => {
  const now = new Date();
  return now.getFullYear() * 12 + now.getMonth();
};

const selectRotating5 = (quests: QuestWithProgress[], seed: number): QuestWithProgress[] => {
  if (quests.length <= 5) return quests;
  const offset = (seed * 5) % quests.length;
  const selected: QuestWithProgress[] = [];
  for (let i = 0; i < 5; i++) {
    selected.push(quests[(offset + i) % quests.length]);
  }
  return selected;
};

// ============================================
// COMPONENT
// ============================================

export default function HomeChallengesSection({ onXPGained }: Props) {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabType>('JOUR');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [totalXP, setTotalXP] = useState(0);
  const [dailyQuests, setDailyQuests] = useState<QuestWithProgress[]>([]);
  const [weeklyQuests, setWeeklyQuests] = useState<QuestWithProgress[]>([]);
  const [monthlyQuests, setMonthlyQuests] = useState<QuestWithProgress[]>([]);

  useEffect(() => {
    loadQuests();
  }, []);

  const loadQuests = async () => {
    try {
      await checkAndUpdateQuests();
      const [daily, weekly, monthly, xp] = await Promise.all([
        getDailyQuestsProgress(),
        getWeeklyQuestsProgress(),
        getMonthlyQuestsProgress(),
        getTotalXp(),
      ]);
      const weekNum = getWeekNumber();
      const monthNum = getMonthNumber();
      setDailyQuests(selectRotating5(daily.quests, weekNum));
      setWeeklyQuests(selectRotating5(weekly.quests, weekNum));
      setMonthlyQuests(selectRotating5(monthly.quests, monthNum));
      setTotalXP(xp);
    } catch (e) {
      logger.error('Erreur chargement quetes:', e);
    }
  };

  const getCurrentQuests = (): QuestWithProgress[] => {
    switch (activeTab) {
      case 'JOUR': return dailyQuests;
      case 'SEMAINE': return weeklyQuests;
      case 'MOIS': return monthlyQuests;
    }
  };

  const currentQuests = getCurrentQuests();
  const completedCount = currentQuests.filter(q => q.completed).length;
  const totalCount = currentQuests.length || 5;
  const xpEarned = currentQuests.filter(q => q.completed).reduce((sum, q) => sum + q.xp, 0);
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  // ============================================
  // ACTIONS
  // ============================================

  const toggleExpand = useCallback((id: string) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // LONG PRESS : valider si pas fait, devalider si deja fait
  const handleLongPress = useCallback(async (quest: QuestWithProgress) => {
    if (quest.completed) {
      // Devalider
      impactAsync(ImpactFeedbackStyle.Medium);
      await uncompleteQuest(quest.questId);
      loadQuests();
    } else {
      // Valider
      impactAsync(ImpactFeedbackStyle.Heavy);
      const result = await completeQuest(quest.questId);
      if (result.success && result.xpEarned > 0) {
        notificationAsync(NotificationFeedbackType.Success);
        onXPGained?.(result.xpEarned);
      }
      loadQuests();
    }
  }, [onXPGained]);

  const handleTabChange = useCallback((tab: TabType) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setActiveTab(tab);
  }, []);

  const handleMonDojo = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium);
    router.push('/gamification?tab=defis' as any);
  }, []);

  // ============================================
  // RENDER QUEST
  // ============================================

  const renderQuest = (quest: QuestWithProgress) => {
    const isCompleted = quest.completed;
    const isExpanded = expandedIds.has(quest.questId);
    const { Icon, color: iconColor } = getQuestIcon(quest.questId);
    const hasProgress = quest.target > 1;
    const percent = quest.target > 0 ? Math.min(100, (quest.current / quest.target) * 100) : 0;

    // === COMPLETED STATE ===
    if (isCompleted) {
      return (
        <TouchableOpacity
          key={quest.questId}
          style={[styles.card, { backgroundColor: colors.backgroundCard }]}
          onLongPress={() => handleLongPress(quest)}
          delayLongPress={400}
          activeOpacity={0.8}
        >
          <View style={styles.cardRow}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.accent}20` }]}>
              <Check size={20} color={colors.accent} strokeWidth={3} />
            </View>
            <View style={styles.cardContent}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>{quest.title}</Text>
              <Text style={[styles.desc, { color: colors.textMuted }]}>{quest.description}</Text>
              <TouchableOpacity
                style={styles.cancelRow}
                onPress={() => handleLongPress(quest)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <XCircle size={14} color={colors.textMuted} />
                <Text style={[styles.cancelText, { color: colors.textMuted }]}>Annuler ce defi</Text>
              </TouchableOpacity>
            </View>
            <View style={[styles.badgeCompleted, { backgroundColor: `${colors.accent}15` }]}>
              <Check size={16} color={colors.accent} strokeWidth={2.5} />
            </View>
          </View>
        </TouchableOpacity>
      );
    }

    // === NOT COMPLETED STATE ===
    return (
      <TouchableOpacity
        key={quest.questId}
        style={[styles.card, { backgroundColor: colors.backgroundCard }]}
        onPress={() => toggleExpand(quest.questId)}
        onLongPress={() => handleLongPress(quest)}
        delayLongPress={400}
        activeOpacity={0.8}
      >
        <View style={styles.cardRow}>
          <View style={[styles.iconCircle, { backgroundColor: iconColor + '20' }]}>
            <Icon size={20} color={iconColor} strokeWidth={2} />
          </View>
          <View style={styles.cardContent}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{quest.title}</Text>
            <Text style={[styles.desc, { color: colors.textMuted }]}>{quest.description}</Text>

            {isExpanded ? (
              <View style={styles.expandedSection}>
                <Text style={[styles.instructions, { color: colors.textMuted }]}>{quest.instructions}</Text>
                <ChevronUp size={14} color={colors.textMuted} style={{ alignSelf: 'center' }} />
              </View>
            ) : (
              <TouchableOpacity
                style={styles.detailsRow}
                onPress={() => toggleExpand(quest.questId)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.detailsText, { color: colors.textMuted }]}>Voir les details</Text>
                <ChevronDown size={14} color={colors.textMuted} />
              </TouchableOpacity>
            )}

            {hasProgress && (
              <View style={styles.progressSection}>
                <View style={[styles.progressBar, { backgroundColor: `${colors.accentDark}15` }]}>
                  <View
                    style={[
                      styles.progressFill,
                      { width: `${percent}%`, backgroundColor: colors.accentDark },
                    ]}
                  />
                </View>
                <Text style={[styles.progressText, { color: colors.textMuted }]}>
                  {quest.current.toLocaleString('fr-FR')}/{quest.target.toLocaleString('fr-FR')}{quest.unit ? ` ${quest.unit}` : ''}
                </Text>
              </View>
            )}
          </View>

          {/* Badge XP */}
          <View style={[styles.xpBadge, { backgroundColor: `${colors.accentDark}12` }]}>
            <Text style={[styles.xpText, { color: colors.accentText }]}>+{quest.xp}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={[styles.container, {
      backgroundColor: colors.backgroundCard,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Gamepad2 size={20} color={colors.textPrimary} strokeWidth={2} />
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Defis</Text>
          <View style={[styles.xpHeaderBadge, { backgroundColor: `${colors.accentDark}25` }]}>
            <Zap size={12} color={colors.accent} fill={colors.accent} />
            <Text style={[styles.xpHeaderText, { color: colors.accent }]}>+{xpEarned} XP</Text>
          </View>
        </View>
        <Text style={[styles.counterText, { color: colors.textPrimary }]}>
          <Text style={styles.counterBold}>{completedCount}</Text>
          <Text style={{ color: colors.textMuted }}> /{totalCount}</Text>
        </Text>
      </View>

      {/* TABS - combo couleurs du theme */}
      <View style={[styles.tabsRow, { backgroundColor: isDark ? (colors.companion + '15') : (colors.companion + '18') }]}>
        {(['JOUR', 'SEMAINE', 'MOIS'] as TabType[]).map(tab => (
          <TouchableOpacity
            key={tab}
            style={[
              styles.tab,
              activeTab === tab && [styles.tabActive, { backgroundColor: colors.backgroundCard }],
            ]}
            onPress={() => handleTabChange(tab)}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.tabText,
              { color: activeTab === tab ? colors.textPrimary : colors.textMuted },
              activeTab === tab && styles.tabTextActive,
            ]}>
              {tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PROGRESS BAR - couleur combo du theme */}
      <View style={[styles.overallProgress, { backgroundColor: `${colors.accentDark}20` }]}>
        <View style={[styles.overallFill, { width: `${progressPercent}%`, backgroundColor: colors.accentDark }]} />
      </View>

      {/* CHALLENGES LIST */}
      <View style={styles.challengesList}>
        {currentQuests.length === 0
          ? <Text style={[styles.emptyText, { color: colors.textMuted }]}>Chargement...</Text>
          : currentQuests.map(renderQuest)
        }
      </View>

      {/* MON DOJO BUTTON */}
      <TouchableOpacity
        style={[styles.dojoButton, { backgroundColor: `${colors.accentDark}12` }]}
        onPress={handleMonDojo}
        activeOpacity={0.7}
      >
        <Trophy size={18} color={colors.textPrimary} strokeWidth={2} />
        <Text style={[styles.dojoText, { color: colors.textPrimary }]}>Mon Dojo</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
  },
  xpHeaderBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 3,
  },
  xpHeaderText: {
    fontSize: 12,
    fontWeight: '800',
  },
  counterText: {
    fontSize: 18,
    fontWeight: '700',
  },
  counterBold: {
    fontSize: 20,
    fontWeight: '800',
  },
  tabsRow: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    marginBottom: 10,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  tabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    fontWeight: '800',
  },
  overallProgress: {
    height: 4,
    borderRadius: 2,
    marginBottom: 12,
    overflow: 'hidden',
  },
  overallFill: {
    height: '100%',
    borderRadius: 2,
  },
  challengesList: {
    gap: 8,
  },
  card: {
    borderRadius: 14,
    padding: 14,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  desc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  cancelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  detailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  detailsText: {
    fontSize: 12,
    fontWeight: '500',
  },
  expandedSection: {
    marginTop: 8,
    gap: 8,
  },
  instructions: {
    fontSize: 12,
    lineHeight: 17,
    fontStyle: 'italic',
  },
  progressSection: {
    marginTop: 6,
    gap: 4,
  },
  progressBar: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
  },
  xpBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  badgeCompleted: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpText: {
    fontSize: 14,
    fontWeight: '800',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 20,
  },
  dojoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    marginTop: 12,
  },
  dojoText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
