// ============================================
// YOROI - QUETE DU JOUR EN VEDETTE
// Affiche la quete prioritaire du jour avec XP
// Composant autonome - charge ses propres données
// ============================================

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Zap,
  ChevronRight,
  CheckCircle,
  Flame,
  Droplets,
  Moon,
  Dumbbell,
  Scale,
  Camera,
  BookOpen,
  Footprints,
  Coffee,
  Snowflake,
  Sparkles,
  Heart,
  Trophy,
  Target,
  Star,
} from 'lucide-react-native';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { getDailyQuestsProgress, Quest, QuestProgress } from '@/lib/quests';

// Map quest ID → icone lucide (sans emojis)
function getQuestIcon(questId: string) {
  if (questId.includes('hydration')) return Droplets;
  if (questId.includes('sleep')) return Moon;
  if (questId.includes('training') || questId.includes('workout')) return Dumbbell;
  if (questId.includes('weigh')) return Scale;
  if (questId.includes('photo') || questId.includes('transformation')) return Camera;
  if (questId.includes('read') || questId.includes('article')) return BookOpen;
  if (questId.includes('steps')) return Footprints;
  if (questId.includes('cardio') || questId.includes('streak')) return Flame;
  if (questId.includes('breakfast')) return Coffee;
  if (questId.includes('cold') || questId.includes('shower')) return Snowflake;
  if (questId.includes('stretch') || questId.includes('meditation')) return Sparkles;
  if (questId.includes('record') || questId.includes('pr')) return Trophy;
  if (questId.includes('open_app')) return Star;
  return Target;
}

function getQuestColor(questId: string): string {
  if (questId.includes('hydration')) return '#06B6D4';
  if (questId.includes('sleep')) return '#8B5CF6';
  if (questId.includes('training') || questId.includes('workout')) return '#F97316';
  if (questId.includes('weigh')) return '#3B82F6';
  if (questId.includes('photo')) return '#E879F9';
  if (questId.includes('read')) return '#22D3EE';
  if (questId.includes('steps')) return '#10B981';
  if (questId.includes('cardio') || questId.includes('streak')) return '#EF4444';
  if (questId.includes('breakfast')) return '#FBBF24';
  if (questId.includes('cold') || questId.includes('shower')) return '#0EA5E9';
  if (questId.includes('stretch') || questId.includes('meditation')) return '#A855F7';
  if (questId.includes('record') || questId.includes('pr')) return '#F59E0B';
  return '#6366F1';
}

type QuestWithProgress = Quest & QuestProgress;

export const DailyQuestSpotlight: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [spotlight, setSpotlight] = useState<QuestWithProgress | null>(null);
  const [allDone, setAllDone] = useState(false);
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const barAnim = useRef(new Animated.Value(0)).current;
  const hasAnimated = useRef(false);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await getDailyQuestsProgress();
        setCompleted(result.completed);
        setTotal(result.total);

        if (result.completed >= result.total && result.total > 0) {
          setAllDone(true);
          return;
        }

        // Prendre la quete non completee avec le plus de XP
        const pending = result.quests
          .filter(q => !q.completed)
          .sort((a, b) => b.xp - a.xp);

        setSpotlight(pending[0] ?? null);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    if (hasAnimated.current || total === 0) return;
    hasAnimated.current = true;
    const pct = total > 0 ? completed / total : 0;
    Animated.timing(barAnim, {
      toValue: pct,
      duration: 800,
      delay: 300,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [completed, total]);

  const barWidth = barAnim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] });

  const handlePress = () => {
    impactAsync(ImpactFeedbackStyle.Light);
    router.push('/gamification?tab=défis' as any);
  };

  // Ne pas afficher si pas de quetes chargees
  if (!allDone && !spotlight) return null;

  // Toutes les quetes sont completees
  if (allDone) {
    return (
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={handlePress}
        style={[styles.card, { backgroundColor: colors.backgroundCard }]}
      >
        <LinearGradient
          colors={['rgba(16,185,129,0.1)', 'transparent']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.allDoneRow}>
          <View style={[styles.allDoneIcon, { backgroundColor: 'rgba(16,185,129,0.15)' }]}>
            <CheckCircle size={22} color="#10B981" />
          </View>
          <View style={styles.allDoneText}>
            <Text style={[styles.allDoneTitle, { color: colors.textPrimary }]}>
              Toutes les quetes du jour sont completees !
            </Text>
            <Text style={[styles.allDoneSub, { color: colors.textMuted }]}>
              {total} quetes · Reviens demain pour de nouvelles
            </Text>
          </View>
          <ChevronRight size={16} color={colors.textMuted} />
        </View>
      </TouchableOpacity>
    );
  }

  const Icon = getQuestIcon(spotlight!.questId);
  const questColor = getQuestColor(spotlight!.questId);
  const progressPercent = spotlight!.target > 0
    ? Math.min(100, Math.round((spotlight!.current / spotlight!.target) * 100))
    : 0;

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={handlePress}
      style={[styles.card, { backgroundColor: colors.backgroundCard }]}
    >
      <LinearGradient
        colors={[`${questColor}08`, 'transparent']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconBg, { backgroundColor: `${questColor}18` }]}>
            <Icon size={16} color={questColor} />
          </View>
          <View>
            <Text style={[styles.label, { color: colors.textMuted }]}>
              Quete du jour · {completed}/{total} completees
            </Text>
            <Text style={[styles.questTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {spotlight!.title}
            </Text>
          </View>
        </View>

        {/* Badge XP */}
        <View style={[styles.xpBadge, { backgroundColor: `${questColor}18` }]}>
          <Zap size={11} color={questColor} fill={questColor} />
          <Text style={[styles.xpText, { color: questColor }]}>+{spotlight!.xp} XP</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={[styles.description, { color: colors.textMuted }]} numberOfLines={1}>
        {spotlight!.description}
      </Text>

      {/* Barre de progression globale du jour */}
      <View style={styles.progressSection}>
        <View style={[styles.progressTrack, {
          backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        }]}>
          <Animated.View style={[styles.progressFill, {
            width: barWidth,
            backgroundColor: questColor,
          }]} />
        </View>
        <View style={styles.progressFooter}>
          <Text style={[styles.progressLabel, { color: colors.textMuted }]}>
            {completed > 0
              ? `${completed} quete${completed > 1 ? 's' : ''} validee${completed > 1 ? 's' : ''} aujourd'hui`
              : 'Commence par cette quete'
            }
          </Text>
          <Text style={[styles.seeAll, { color: questColor }]}>
            Voir tout
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 14,
    marginTop: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  questTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  xpBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 10,
    marginLeft: 8,
  },
  xpText: { fontSize: 12, fontWeight: '800' },
  description: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 10,
    lineHeight: 17,
  },
  progressSection: { gap: 6 },
  progressTrack: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: { fontSize: 10, fontWeight: '500' },
  seeAll: { fontSize: 11, fontWeight: '700' },

  // All done
  allDoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  allDoneIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  allDoneText: { flex: 1 },
  allDoneTitle: { fontSize: 13, fontWeight: '700' },
  allDoneSub: { fontSize: 11, fontWeight: '500', marginTop: 2 },
});

export default DailyQuestSpotlight;
