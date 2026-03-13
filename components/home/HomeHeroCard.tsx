// ============================================================
// YOROI — HOME HERO CARD
// Une seule carte unifiée : Rang + Ghost + Défis
// ============================================================

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Flame, Trophy, Zap, ChevronRight, Target,
  Clock, CheckCircle, Dumbbell, Droplets,
  Moon, Scale, Camera, Footprints, Star,
  TrendingUp, TrendingDown,
} from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { getCurrentRank, getNextRank, getRankProgress, getDaysToNextRank } from '@/lib/ranks';
import { getGhostData, updateCurrentWeek, GhostData } from '@/lib/ghostLeaderboardService';
import { getTrainings, getWeights } from '@/lib/database';
import {
  getDailyQuestsProgress,
  getWeeklyQuestsProgress,
  getMonthlyQuestsProgress,
  type Quest,
  type QuestProgress,
} from '@/lib/quests';

const SCREEN_W = Dimensions.get('window').width;

// ── Types ──────────────────────────────────────────────────────────────────────

type TabId = 'jour' | 'semaine' | 'mois';
type QuestWithProgress = Quest & QuestProgress;

interface Props {
  streak: number;
  totalPoints: number;
  avatarUri?: string | null;
  onCollapse?: () => void;
}

// ── Helpers quêtes ─────────────────────────────────────────────────────────────

function getQuestIcon(id: string) {
  if (id.includes('hydration')) return Droplets;
  if (id.includes('sleep'))     return Moon;
  if (id.includes('training') || id.includes('workout')) return Dumbbell;
  if (id.includes('weigh'))     return Scale;
  if (id.includes('photo'))     return Camera;
  if (id.includes('steps'))     return Footprints;
  if (id.includes('cardio') || id.includes('streak')) return Flame;
  if (id.includes('record') || id.includes('pr')) return Trophy;
  if (id.includes('open_app'))  return Star;
  return Target;
}

function getQuestColor(id: string): string {
  if (id.includes('hydration')) return '#06B6D4';
  if (id.includes('sleep'))     return '#8B5CF6';
  if (id.includes('training') || id.includes('workout')) return '#F97316';
  if (id.includes('weigh'))     return '#3B82F6';
  if (id.includes('photo'))     return '#E879F9';
  if (id.includes('steps'))     return '#10B981';
  if (id.includes('cardio') || id.includes('streak')) return '#EF4444';
  if (id.includes('record') || id.includes('pr')) return '#F59E0B';
  return '#6366F1';
}

function getDeadline(tab: TabId): Date {
  const now = new Date();
  if (tab === 'jour') {
    const d = new Date(now);
    d.setHours(24, 0, 0, 0);
    return d;
  }
  if (tab === 'semaine') {
    const d = new Date(now);
    const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  if (days > 0) return `${days}j ${h.toString().padStart(2, '0')}h ${mm}m`;
  return `${h.toString().padStart(2, '0')}:${mm}:${ss}`;
}

const TABS: { id: TabId; label: string; color: string }[] = [
  { id: 'jour',    label: 'Jour',    color: '#F97316' },
  { id: 'semaine', label: 'Semaine', color: '#8B5CF6' },
  { id: 'mois',    label: 'Mois',    color: '#3B82F6' },
];

// ── Composant principal ────────────────────────────────────────────────────────

export const HomeHeroCard: React.FC<Props> = ({ streak, totalPoints, avatarUri, onCollapse }) => {
  const { colors, isDark } = useTheme();

  // Rang
  const rank     = useMemo(() => getCurrentRank(totalPoints), [totalPoints]);
  const nextRank = useMemo(() => getNextRank(totalPoints), [totalPoints]);
  const progress = useMemo(() => getRankProgress(totalPoints), [totalPoints]);
  const xpToNext = useMemo(() => getDaysToNextRank(totalPoints), [totalPoints]);
  const accentRank = colors.accent;

  // Barre progression rang
  const barAnim = useRef(new Animated.Value(0)).current;
  const hasBarAnimated = useRef(false);
  useEffect(() => {
    if (hasBarAnimated.current) return;
    hasBarAnimated.current = true;
    Animated.timing(barAnim, {
      toValue: progress,
      duration: 900,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [progress]);
  const barWidth = barAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] });

  // Ghost
  const [ghostData, setGhostData] = useState<GhostData | null>(null);
  const ghostBarAnim = useRef(new Animated.Value(0)).current;
  const hasGhostAnimated = useRef(false);

  useEffect(() => {
    (async () => {
      try {
        const [allTrainings, allWeights] = await Promise.all([
          getTrainings(365),
          getWeights(365),
        ]);
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);
        weekStart.setHours(0, 0, 0, 0);
        const weekStartStr = weekStart.toISOString().split('T')[0];
        const trainingsThisWeek = allTrainings.filter((t: any) => t.date >= weekStartStr).length;
        const weightsThisWeek   = allWeights.filter((w: any) => w.date >= weekStartStr).length;
        await updateCurrentWeek(trainingsThisWeek, weightsThisWeek, 0);
        const data = await getGhostData(trainingsThisWeek);
        setGhostData(data);
      } catch { /* silencieux */ }
    })();
  }, []);

  useEffect(() => {
    if (!ghostData || hasGhostAnimated.current || !ghostData.hasHistory) return;
    hasGhostAnimated.current = true;
    Animated.timing(ghostBarAnim, {
      toValue: ghostData.progressPercent / 100,
      duration: 700,
      delay: 400,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [ghostData]);

  const ghostBarWidth = ghostBarAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  // Défis
  const [activeTab, setActiveTab]   = useState<TabId>('jour');
  const [quests, setQuests]         = useState<QuestWithProgress[]>([]);
  const [countdown, setCountdown]   = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadQuests = useCallback(async (tab: TabId) => {
    try {
      const result = tab === 'jour'
        ? await getDailyQuestsProgress()
        : tab === 'semaine'
          ? await getWeeklyQuestsProgress()
          : await getMonthlyQuestsProgress();
      setQuests(result.quests);
    } catch {
      setQuests([]);
    }
  }, []);

  useEffect(() => { loadQuests(activeTab); }, [activeTab]);

  useEffect(() => {
    const tick = () => setCountdown(formatCountdown(getDeadline(activeTab).getTime() - Date.now()));
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [activeTab]);

  const tabCfg      = TABS.find(t => t.id === activeTab)!;
  const completed   = quests.filter(q => q.completed).length;
  const total       = quests.length;
  const pct         = total > 0 ? completed / total : 0;
  const topQuest    = quests.find(q => !q.completed) ?? null;
  const allDone     = total > 0 && completed >= total;

  const isBeating    = ghostData?.isBeatingRecord ?? false;
  const ghostColor   = isBeating ? '#10B981' : accentRank;
  const showGhost    = ghostData && (ghostData.hasHistory || ghostData.currentTrainings > 0);

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>

      {/* ═══ SECTION 1 — RANG ═══════════════════════════════════════════════ */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/gamification'); }}
      >
        <View style={styles.rankRow}>
          {/* Avatar */}
          <TouchableOpacity
            onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/avatar-selection' as any); }}
            activeOpacity={0.8}
          >
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={34} color="#CCC" />
              </View>
            )}
          </TouchableOpacity>

          {/* Infos rang */}
          <View style={styles.rankInfo}>
            <View style={styles.rankNameRow}>
              <Text style={[styles.rankName, { color: colors.textPrimary }]}>{rank.name}</Text>
              <View style={styles.streakChip}>
                <Flame size={10} color="#F97316" fill="#F97316" />
                <Text style={styles.streakChipText}>{streak}j</Text>
              </View>
            </View>
            <Text style={[styles.rankJp, { color: colors.textMuted }]}>{rank.nameJp}</Text>

            {/* Barre XP */}
            <View style={[styles.progressTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)' }]}>
              <Animated.View style={[styles.progressFill, { width: barWidth, overflow: 'hidden' }]}>
                <LinearGradient
                  colors={[accentRank, `${accentRank}AA`]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
              </Animated.View>
            </View>

            {nextRank ? (
              <Text style={[styles.xpNext, { color: colors.textMuted }]}>
                <Text style={{ fontWeight: '800', color: accentRank }}>{nextRank.name}</Text>
                {'  '}{xpToNext} XP restants
              </Text>
            ) : (
              <Text style={[styles.xpNext, { color: accentRank, fontWeight: '800' }]}>Rang maximum</Text>
            )}
          </View>

          <ChevronRight size={15} color={colors.textMuted} style={{ marginLeft: 2 }} />
        </View>
      </TouchableOpacity>

      {/* ═══ SÉPARATEUR ════════════════════════════════════════════════════ */}
      {showGhost && (
        <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />
      )}

      {/* ═══ SECTION 2 — GHOST ══════════════════════════════════════════════ */}
      {showGhost && (
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/gamification'); }}
        >
          <View style={styles.ghostSection}>
            {/* Header ghost */}
            <View style={styles.ghostHeader}>
              <View style={[styles.ghostIconBg, { backgroundColor: `${ghostColor}18` }]}>
                <Trophy size={12} color={ghostColor} />
              </View>
              <Text style={[styles.ghostTitle, { color: colors.textPrimary }]}>
                {isBeating ? 'Nouveau record en vue !' : 'Ghost de la semaine'}
              </Text>
              {isBeating
                ? <TrendingUp size={14} color="#10B981" style={{ marginLeft: 'auto' }} />
                : <TrendingDown size={14} color={colors.textMuted} style={{ marginLeft: 'auto' }} />
              }
            </View>

            {/* Comparaison + barre compacte */}
            <View style={styles.ghostCompare}>
              <View style={styles.ghostStat}>
                <Text style={[styles.ghostStatVal, { color: ghostColor }]}>
                  {ghostData!.currentTrainings}
                </Text>
                <Text style={[styles.ghostStatLabel, { color: colors.textMuted }]}>Cette semaine</Text>
              </View>
              <View style={[styles.vsBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }]}>
                <Zap size={9} color={ghostColor} />
                <Text style={[styles.vsText, { color: colors.textMuted }]}>VS</Text>
              </View>
              <View style={styles.ghostStat}>
                <Text style={[styles.ghostStatVal, { color: colors.textMuted }]}>
                  {ghostData!.hasHistory ? ghostData!.bestTrainings : '-'}
                </Text>
                <Text style={[styles.ghostStatLabel, { color: colors.textMuted }]}>
                  {ghostData!.hasHistory ? 'Record' : 'Pas de record'}
                </Text>
              </View>
            </View>

            {ghostData!.hasHistory && (
              <View style={[styles.ghostBarTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                <Animated.View style={[styles.ghostBarFill, { width: ghostBarWidth, backgroundColor: ghostColor }]} />
              </View>
            )}

            {!ghostData!.hasHistory && ghostData!.currentTrainings > 0 && (
              <Text style={[styles.ghostHint, { color: colors.textMuted }]}>
                Continue, tu batis ton premier record !
              </Text>
            )}
          </View>
        </TouchableOpacity>
      )}

      {/* ═══ SÉPARATEUR ════════════════════════════════════════════════════ */}
      <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }]} />

      {/* ═══ SECTION 3 — DÉFIS ══════════════════════════════════════════════ */}
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => { impactAsync(ImpactFeedbackStyle.Light); router.push('/gamification?tab=défis' as any); }}
      >
        {/* Onglets + compte à rebours */}
        <View style={styles.defiTopRow}>
          <View style={styles.tabsRow}>
            {TABS.map(t => {
              const active = t.id === activeTab;
              return (
                <TouchableOpacity
                  key={t.id}
                  onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setActiveTab(t.id); }}
                  activeOpacity={0.7}
                  style={[
                    styles.tab,
                    active
                      ? { backgroundColor: t.color + '22', borderColor: t.color + '80' }
                      : { borderColor: 'transparent' },
                  ]}
                >
                  <Text style={[styles.tabText, { color: active ? t.color : colors.textMuted }]}>
                    {t.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <View style={[styles.countdownBox, { backgroundColor: tabCfg.color + '15' }]}>
            <Clock size={9} color={tabCfg.color} strokeWidth={2.5} />
            <Text style={[styles.countdownText, { color: tabCfg.color }]}>{countdown}</Text>
          </View>
        </View>

        {/* Barre progression défis */}
        <View style={styles.defiProgressRow}>
          <View style={[styles.defiTrack, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
            <View style={[styles.defiFill, { width: `${pct * 100}%`, backgroundColor: tabCfg.color }]} />
          </View>
          <Text style={[styles.defiCount, { color: colors.textMuted }]}>
            {completed}/{total} défi{total > 1 ? 's' : ''}
          </Text>
        </View>

        {/* Défi mis en avant */}
        {allDone ? (
          <View style={styles.featuredRow}>
            <View style={[styles.featuredIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
              <CheckCircle size={14} color="#10B981" />
            </View>
            <Text style={[styles.featuredTitle, { color: '#10B981' }]}>
              Tous les défis {activeTab === 'jour' ? 'du jour' : activeTab === 'semaine' ? 'de la semaine' : 'du mois'} validés !
            </Text>
          </View>
        ) : topQuest ? (
          <View style={styles.featuredRow}>
            <View style={[styles.featuredIcon, { backgroundColor: getQuestColor(topQuest.questId) + '18' }]}>
              {React.createElement(getQuestIcon(topQuest.questId), {
                size: 14,
                color: getQuestColor(topQuest.questId),
              })}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.featuredTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {topQuest.title}
              </Text>
              <Text style={[styles.featuredDesc, { color: colors.textMuted }]} numberOfLines={1}>
                {topQuest.description}
              </Text>
            </View>
            <View style={[styles.xpBadge, { backgroundColor: getQuestColor(topQuest.questId) + '18' }]}>
              <Zap size={9} color={getQuestColor(topQuest.questId)} fill={getQuestColor(topQuest.questId)} />
              <Text style={[styles.xpText, { color: getQuestColor(topQuest.questId) }]}>
                +{topQuest.xp} XP
              </Text>
            </View>
          </View>
        ) : null}

        {/* Footer */}
        <View style={styles.footer}>
          {onCollapse && (
            <TouchableOpacity
              onPress={onCollapse}
              activeOpacity={0.75}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              style={[styles.collapseBtn, { backgroundColor: colors.accent }]}
            >
              <Text style={styles.collapseBtnText}>▲</Text>
            </TouchableOpacity>
          )}
          <View style={styles.footerRight}>
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Voir tous les défis dans le Dojo
            </Text>
            <ChevronRight size={12} color={colors.textMuted} />
          </View>
        </View>
      </TouchableOpacity>

    </View>
  );
};

export default HomeHeroCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 6,
    overflow: 'hidden',
  },

  // ── Section Rang ──────────────────────────────────────────────────────────
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingBottom: 14,
  },
  avatar: {
    width: 72,
    height: 72,
    resizeMode: 'contain',
  } as any,
  avatarPlaceholder: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rankInfo: {
    flex: 1,
    gap: 3,
  },
  rankNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rankName: {
    fontSize: 16,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(249,115,22,0.12)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  streakChipText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#F97316',
  },
  rankJp: {
    fontSize: 11,
    fontWeight: '500',
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  xpNext: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },

  // ── Séparateur ────────────────────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: -14,
    marginBottom: 0,
  },

  // ── Section Ghost ─────────────────────────────────────────────────────────
  ghostSection: {
    paddingVertical: 12,
    gap: 8,
  },
  ghostHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  ghostIconBg: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ghostTitle: {
    fontSize: 12,
    fontWeight: '700',
  },
  ghostCompare: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ghostStat: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  ghostStatVal: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  ghostStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vsBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  vsText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1,
  },
  ghostBarTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  ghostBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  ghostHint: {
    fontSize: 10,
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ── Section Défis ─────────────────────────────────────────────────────────
  defiTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingTop: 12,
    gap: 8,
  },
  tabsRow: {
    flexDirection: 'row',
    gap: 5,
  },
  tab: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  tabText: {
    fontSize: 11,
    fontWeight: '700',
  },
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 7,
  },
  countdownText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  defiProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 9,
  },
  defiTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  defiFill: {
    height: '100%',
    borderRadius: 2,
  },
  defiCount: {
    fontSize: 10,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 9,
  },
  featuredIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  featuredDesc: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 1,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 7,
  },
  xpText: {
    fontSize: 10,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    paddingVertical: 10,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginLeft: 'auto',
  },
  footerText: {
    fontSize: 10,
    fontWeight: '600',
  },
  collapseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  collapseBtnText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '800',
  },
});
