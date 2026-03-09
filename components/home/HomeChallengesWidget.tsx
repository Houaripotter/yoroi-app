// ============================================
// YOROI - WIDGET DÉFIS ACCUEIL
// 3 onglets : Jour / Semaine / Mois
// Compte à rebours + sync lib/quests (même source que le Dojo)
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {
  Zap,
  ChevronRight,
  ChevronUp,
  CheckCircle,
  Clock,
  Dumbbell,
  Droplets,
  Moon,
  Scale,
  Flame,
  Trophy,
  Target,
  Star,
  Footprints,
  Coffee,
  Snowflake,
  Sparkles,
  Camera,
  BookOpen,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import {
  getDailyQuestsProgress,
  getWeeklyQuestsProgress,
  getMonthlyQuestsProgress,
  type Quest,
  type QuestProgress,
} from '@/lib/quests';

// ── Types ────────────────────────────────────────────────────────────────────

type TabId = 'jour' | 'semaine' | 'mois';
type QuestWithProgress = Quest & QuestProgress;

// ── Icônes (même mapping que le Dojo) ────────────────────────────────────────

function getQuestIcon(questId: string) {
  if (questId.includes('hydration')) return Droplets;
  if (questId.includes('sleep'))     return Moon;
  if (questId.includes('training') || questId.includes('workout')) return Dumbbell;
  if (questId.includes('weigh'))     return Scale;
  if (questId.includes('photo') || questId.includes('transformation')) return Camera;
  if (questId.includes('read') || questId.includes('article')) return BookOpen;
  if (questId.includes('steps'))     return Footprints;
  if (questId.includes('cardio') || questId.includes('streak')) return Flame;
  if (questId.includes('breakfast')) return Coffee;
  if (questId.includes('cold') || questId.includes('shower')) return Snowflake;
  if (questId.includes('stretch') || questId.includes('meditation')) return Sparkles;
  if (questId.includes('record') || questId.includes('pr')) return Trophy;
  if (questId.includes('open_app')) return Star;
  return Target;
}

// ── Couleurs (même mapping que le Dojo) ──────────────────────────────────────

function getQuestColor(questId: string): string {
  if (questId.includes('hydration')) return '#06B6D4';
  if (questId.includes('sleep'))     return '#8B5CF6';
  if (questId.includes('training') || questId.includes('workout')) return '#F97316';
  if (questId.includes('weigh'))     return '#3B82F6';
  if (questId.includes('photo'))     return '#E879F9';
  if (questId.includes('read'))      return '#22D3EE';
  if (questId.includes('steps'))     return '#10B981';
  if (questId.includes('cardio') || questId.includes('streak')) return '#EF4444';
  if (questId.includes('breakfast')) return '#FBBF24';
  if (questId.includes('cold') || questId.includes('shower')) return '#0EA5E9';
  if (questId.includes('stretch') || questId.includes('meditation')) return '#A855F7';
  if (questId.includes('record') || questId.includes('pr')) return '#F59E0B';
  return '#6366F1';
}

// ── Compte à rebours ─────────────────────────────────────────────────────────

function getDeadline(tab: TabId): Date {
  const now = new Date();
  if (tab === 'jour') {
    const d = new Date(now);
    d.setHours(24, 0, 0, 0);
    return d;
  }
  if (tab === 'semaine') {
    // Prochain lundi 00h00
    const d = new Date(now);
    const day = d.getDay(); // 0=dim, 1=lun…
    const daysToMonday = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + daysToMonday);
    d.setHours(0, 0, 0, 0);
    return d;
  }
  // 1er du mois prochain 00h00
  return new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const totalSec = Math.floor(ms / 1000);
  const days = Math.floor(totalSec / 86400);
  const h    = Math.floor((totalSec % 86400) / 3600);
  const m    = Math.floor((totalSec % 3600) / 60);
  const s    = totalSec % 60;

  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');

  if (days > 0) {
    return `${days}j ${h.toString().padStart(2, '0')}h ${mm}m`;
  }
  return `${h.toString().padStart(2, '0')}:${mm}:${ss}`;
}

// ── Config onglets ────────────────────────────────────────────────────────────

const TABS: { id: TabId; label: string; color: string }[] = [
  { id: 'jour',    label: 'Jour',    color: '#F97316' },
  { id: 'semaine', label: 'Semaine', color: '#8B5CF6' },
  { id: 'mois',    label: 'Mois',    color: '#3B82F6' },
];

// ── Composant ────────────────────────────────────────────────────────────────

interface HomeChallengesWidgetProps {
  onCollapse?: () => void;
}

export const HomeChallengesWidget: React.FC<HomeChallengesWidgetProps> = ({ onCollapse }) => {
  const { colors, isDark } = useTheme();
  const [activeTab, setActiveTab] = useState<TabId>('jour');
  const [quests, setQuests] = useState<QuestWithProgress[]>([]);
  const [countdown, setCountdown] = useState('');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Chargement — même source que le Dojo (lib/quests)
  const loadQuests = useCallback(async (tab: TabId) => {
    try {
      let result: { quests: QuestWithProgress[]; completed: number; total: number };
      if (tab === 'jour')    result = await getDailyQuestsProgress();
      else if (tab === 'semaine') result = await getWeeklyQuestsProgress();
      else                   result = await getMonthlyQuestsProgress();
      setQuests(result.quests);
    } catch {
      setQuests([]);
    }
  }, []);

  useEffect(() => {
    loadQuests(activeTab);
  }, [activeTab]);

  // Compte à rebours — mis à jour chaque seconde
  useEffect(() => {
    const tick = () => {
      const remaining = getDeadline(activeTab).getTime() - Date.now();
      setCountdown(formatCountdown(remaining));
    };
    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTab]);

  const tabCfg = TABS.find(t => t.id === activeTab)!;
  const completed = quests.filter(q => q.completed).length;
  const total = quests.length;
  const pct = total > 0 ? completed / total : 0;
  const topQuest = quests.find(q => !q.completed) ?? null;
  const allDone = total > 0 && completed >= total;

  const handlePress = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    router.push('/gamification?tab=défis' as any);
  };

  const handleTabPress = (id: TabId) => {
    impactAsync(ImpactFeedbackStyle.Light);
    setActiveTab(id);
  };

  return (
    <TouchableOpacity
      activeOpacity={0.92}
      onPress={handlePress}
      style={[styles.card, { backgroundColor: colors.backgroundCard }]}
    >
      {/* ── Ligne du haut : onglets + compte à rebours ── */}
      <View style={styles.topRow}>
        <View style={styles.tabs}>
          {TABS.map(t => {
            const active = t.id === activeTab;
            return (
              <TouchableOpacity
                key={t.id}
                onPress={() => handleTabPress(t.id)}
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

        {/* Compte à rebours */}
        <View style={[styles.countdownBox, { backgroundColor: tabCfg.color + '15' }]}>
          <Clock size={10} color={tabCfg.color} strokeWidth={2.5} />
          <Text style={[styles.countdownText, { color: tabCfg.color }]}>
            {countdown}
          </Text>
        </View>
      </View>

      {/* ── Barre de progression ── */}
      <View style={styles.progressRow}>
        <View style={[styles.progressTrack, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }]}>
          <View style={[styles.progressFill, {
            width: `${pct * 100}%`,
            backgroundColor: tabCfg.color,
          }]} />
        </View>
        <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
          {completed}/{total} défi{total > 1 ? 's' : ''}
        </Text>
      </View>

      {/* ── Défi mis en avant ── */}
      {allDone ? (
        <View style={styles.featuredRow}>
          <View style={[styles.featuredIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <CheckCircle size={15} color="#10B981" />
          </View>
          <Text style={[styles.featuredTitle, { color: '#10B981', fontWeight: '700' }]}>
            Tous les défis {activeTab === 'jour' ? 'du jour' : activeTab === 'semaine' ? 'de la semaine' : 'du mois'} sont validés !
          </Text>
        </View>
      ) : topQuest ? (
        <View style={styles.featuredRow}>
          <View style={[styles.featuredIcon, { backgroundColor: getQuestColor(topQuest.questId) + '18' }]}>
            {React.createElement(getQuestIcon(topQuest.questId), {
              size: 15,
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
            <Zap size={10} color={getQuestColor(topQuest.questId)} fill={getQuestColor(topQuest.questId)} />
            <Text style={[styles.xpText, { color: getQuestColor(topQuest.questId) }]}>
              +{topQuest.xp} XP
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Footer ── */}
      <View style={styles.footer}>
        {/* Bouton réduire (carré accent) — affiché si onCollapse fourni */}
        {onCollapse && (
          <TouchableOpacity
            onPress={onCollapse}
            activeOpacity={0.75}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            style={[styles.collapseSquare, { backgroundColor: colors.accent }]}
          >
            <ChevronUp size={13} color="#fff" strokeWidth={2.5} />
          </TouchableOpacity>
        )}
        <View style={styles.footerRight}>
          <Text style={[styles.footerText, { color: colors.textMuted }]}>
            Voir tous les défis dans le Dojo
          </Text>
          <ChevronRight size={13} color={colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
};

// ── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  },
  tabs: {
    flexDirection: 'row',
    gap: 6,
  },
  tab: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
  },
  countdownBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countdownText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.3,
    fontVariant: ['tabular-nums'],
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    minWidth: 52,
    textAlign: 'right',
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  featuredIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featuredTitle: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  featuredDesc: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  xpText: {
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(128,128,128,0.15)',
    paddingTop: 8,
  },
  footerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  footerText: {
    fontSize: 11,
    fontWeight: '600',
  },
  collapseSquare: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default HomeChallengesWidget;
