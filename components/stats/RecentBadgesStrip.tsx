// ============================================
// RECENT BADGES STRIP
// Affiche les derniers badges débloqués par l'utilisateur en bandeau scrollable.
// Réutilise le système de badges existant dans lib/badges.ts.
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { ALL_BADGES, type Badge } from '@/lib/badges';
import { Award, ChevronRight } from 'lucide-react-native';

const STORAGE_KEY = '@yoroi_unlocked_badges';

interface UnlockedBadgeRecord { badgeId: string; unlockedAt: string }

const RecentBadgesStripInner: React.FC = () => {
  const { colors, isDark, screenText } = useTheme();
  const [recentBadges, setRecentBadges] = useState<Array<{ badge: Badge; unlockedAt: string }>>([]);

  useEffect(() => {
    let mounted = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!mounted || !raw) return;
      try {
        const parsed = JSON.parse(raw);
        // Format peut être string[] ou UnlockedBadgeRecord[]
        let unlocked: UnlockedBadgeRecord[] = [];
        if (Array.isArray(parsed) && parsed.length > 0) {
          if (typeof parsed[0] === 'string') {
            // Format ancien : juste les IDs → on n'a pas de date
            unlocked = parsed.map((id: string) => ({ badgeId: id, unlockedAt: '' }));
          } else {
            unlocked = parsed;
          }
        }
        // Tri par date desc, top 5
        const sorted = unlocked
          .sort((a, b) => (b.unlockedAt || '').localeCompare(a.unlockedAt || ''))
          .slice(0, 5);
        const enriched = sorted.map(u => {
          const badge = ALL_BADGES.find(b => b.id === u.badgeId);
          return badge ? { badge, unlockedAt: u.unlockedAt } : null;
        }).filter((x): x is { badge: Badge; unlockedAt: string } => x !== null);
        setRecentBadges(enriched);
      } catch { /* ignore */ }
    }).catch(() => {});
    return () => { mounted = false; };
  }, []);

  if (recentBadges.length === 0) return null;

  const handleSeeAll = () => {
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    router.push('/badges' as any);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.header}
        activeOpacity={0.7}
        onPress={handleSeeAll}
        accessibilityRole="button"
        accessibilityLabel="Voir tous les badges"
      >
        <Award size={16} color={screenText} strokeWidth={2.5} />
        <Text style={[styles.title, { color: screenText }]}>Derniers badges débloqués</Text>
        <View style={{ flex: 1 }} />
        <Text style={[styles.seeAll, { color: colors.accent }]}>Voir tout</Text>
        <ChevronRight size={14} color={colors.accent} />
      </TouchableOpacity>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {recentBadges.map(({ badge }) => {
          const Icon = badge.iconComponent;
          return (
            <TouchableOpacity
              key={badge.id}
              style={[
                styles.badgeCard,
                {
                  backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
                  borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
                },
              ]}
              activeOpacity={0.85}
              onPress={handleSeeAll}
            >
              <View style={[styles.iconBox, { backgroundColor: colors.accent + '20' }]}>
                <Icon size={22} color={colors.accent} strokeWidth={2.2} />
              </View>
              <Text style={[styles.badgeName, { color: colors.textPrimary }]} numberOfLines={2}>
                {badge.name}
              </Text>
              <Text style={[styles.badgeXp, { color: colors.textMuted }]}>+{badge.xpReward} XP</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

export const RecentBadgesStrip = React.memo(RecentBadgesStripInner);

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  seeAll: {
    fontSize: 12,
    fontWeight: '700',
  },
  scroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  badgeCard: {
    width: 110,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    alignItems: 'center',
    minHeight: 110,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  badgeName: {
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.1,
    minHeight: 28,
  },
  badgeXp: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
});
