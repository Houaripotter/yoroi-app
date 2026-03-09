// ============================================
// YOROI - HOME HERO SECTION
// Regroupe RankCitationCard + GhostLeaderboard + HomeChallengesWidget
// Languette verticale à droite pour réduire / expandre
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { ChevronDown, Flame, Trophy, Zap } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { getCurrentRank } from '@/lib/ranks';
import { RankCitationCard } from '@/components/home/RankCitationCard';
import { GhostLeaderboardCard } from '@/components/home/GhostLeaderboardCard';
import { HomeChallengesWidget } from '@/components/home/HomeChallengesWidget';
import { getDailyQuestsProgress } from '@/lib/quests';

const HERO_COLLAPSED_KEY = '@yoroi_hero_collapsed';
const SCREEN_W = Dimensions.get('window').width;

interface Props {
  streak: number;
  totalPoints: number;
  dailyQuote?: string | null;
  avatarUri?: string | null;
}

export function HomeHeroSection({ streak, totalPoints, dailyQuote, avatarUri }: Props) {
  const { colors, isDark } = useTheme();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [questCompleted, setQuestCompleted] = useState(0);
  const [questTotal, setQuestTotal] = useState(0);

  const rank = getCurrentRank(totalPoints);

  useEffect(() => {
    AsyncStorage.getItem(HERO_COLLAPSED_KEY).then(val => {
      if (val === 'true') setIsCollapsed(true);
    });
    getDailyQuestsProgress()
      .then(progress => {
        const completed = progress.quests.filter((q: any) => q.completed).length;
        setQuestCompleted(completed);
        setQuestTotal(progress.quests.length);
      })
      .catch(() => {});
  }, []);

  const toggle = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Light);
    setIsCollapsed(prev => {
      const next = !prev;
      AsyncStorage.setItem(HERO_COLLAPSED_KEY, next ? 'true' : 'false');
      return next;
    });
  }, []);

  // ── VUE RÉDUITE ──────────────────────────────────────────────────────────────
  if (isCollapsed) {
    return (
      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.85}
        style={[
          styles.compactBar,
          {
            backgroundColor: colors.backgroundCard,
            borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
          },
        ]}
      >
        {/* Barre accent à gauche */}
        <View style={[styles.compactLeftBar, { backgroundColor: colors.accent }]} />

        {/* Rang */}
        <View style={[styles.compactIconBg, { backgroundColor: `${colors.accent}18` }]}>
          <Trophy size={12} color={colors.accent} />
        </View>
        <Text style={[styles.compactRank, { color: colors.textPrimary }]} numberOfLines={1}>
          {rank.name}
        </Text>

        <View style={[styles.compactDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />

        {/* Streak */}
        <Flame size={12} color="#F97316" fill="#F97316" />
        <Text style={styles.compactStreak}>{streak}j</Text>

        {questTotal > 0 && (
          <>
            <View style={[styles.compactDivider, { backgroundColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)' }]} />
            <Zap size={11} color={colors.accent} fill={colors.accent} />
            <Text style={[styles.compactQuests, { color: colors.textMuted }]}>
              {questCompleted}/{questTotal} défis
            </Text>
          </>
        )}

        <View style={{ flex: 1 }} />

        <Text style={[styles.compactXP, { color: colors.textMuted }]}>{totalPoints} XP</Text>
        <ChevronDown size={14} color={colors.textMuted} />
      </TouchableOpacity>
    );
  }

  // ── VUE ÉTENDUE ──────────────────────────────────────────────────────────────
  return (
    <View>
      <RankCitationCard
        streak={streak}
        totalPoints={totalPoints}
        dailyQuote={dailyQuote}
        avatarUri={avatarUri}
      />
      <GhostLeaderboardCard />
      {/* Le carré "réduire" est dans le footer du widget, à gauche du lien Dojo */}
      <HomeChallengesWidget onCollapse={toggle} />
    </View>
  );
}

export default HomeHeroSection;

const styles = StyleSheet.create({
  // ── Barre compacte ──
  compactBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 11,
    paddingRight: 14,
    marginTop: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  compactLeftBar: {
    width: 4,
    alignSelf: 'stretch',
    borderRadius: 2,
    marginRight: 2,
  },
  compactIconBg: {
    width: 24,
    height: 24,
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  compactRank: {
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  compactDivider: {
    width: 1,
    height: 13,
    borderRadius: 1,
  },
  compactStreak: {
    fontSize: 13,
    fontWeight: '800',
    color: '#F97316',
  },
  compactQuests: {
    fontSize: 12,
    fontWeight: '600',
  },
  compactXP: {
    fontSize: 11,
    fontWeight: '600',
  },
});
