// ============================================
// YOROI · Achievements Sparring
// Grille de badges débloqués / à débloquer
// ============================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronLeft, Lock, Trophy, Target, Wrench, Brain, Crown } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { getTrainings } from '@/lib/database';
import {
  Achievement,
  computeStats,
  listAchievements,
  CombatStats,
} from '@/lib/combatAchievements';

export default function CombatAchievementsScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState<Array<Achievement & { unlocked: boolean }>>([]);
  const [stats, setStats] = useState<CombatStats | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const trainings = await getTrainings(3650);
      const s = computeStats(trainings);
      setStats(s);
      const list = await listAchievements(s);
      setItems(list);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const unlockedCount = items.filter(i => i.unlocked).length;
  const totalCount = items.length;
  const pct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const byCategory: Record<string, typeof items> = {
    milestone: [],
    technique: [],
    mental: [],
    legendary: [],
  };
  for (const it of items) byCategory[it.category].push(it);

  const CATEGORIES: { id: keyof typeof byCategory; label: string; Icon: React.ComponentType<{ size?: number; color?: string }>; color: string }[] = [
    { id: 'milestone', label: 'Jalons', Icon: Target, color: '#3B82F6' },
    { id: 'technique', label: 'Techniques', Icon: Wrench, color: '#22C55E' },
    { id: 'mental',    label: 'Mental / Analyse', Icon: Brain, color: '#8B5CF6' },
    { id: 'legendary', label: 'Légendaires', Icon: Crown, color: '#EAB308' },
  ];

  const cardBg = colors.backgroundCard ?? (isDark ? '#1a1a1a' : '#fff');
  const border = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)';

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? colors.background : '#F2F2F7' }}>
      {/* Header */}
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={{ fontSize: 17, fontWeight: '900', color: colors.text, letterSpacing: 0.3 }}>Achievements</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(true); }} />}
      >
        {/* Hero progression */}
        <LinearGradient
          colors={['#EAB308', '#F59E0B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ borderRadius: 20, padding: 18, marginBottom: 12, shadowColor: '#EAB308', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.35, shadowRadius: 14, elevation: 8 }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <View style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' }}>
              <Trophy size={24} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 10, fontWeight: '900', color: 'rgba(255,255,255,0.7)', letterSpacing: 1.5 }}>TA COLLECTION</Text>
              <Text style={{ fontSize: 22, fontWeight: '900', color: '#fff' }}>
                {unlockedCount} / {totalCount}
              </Text>
            </View>
            <View style={{ backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: '#fff' }}>{pct}%</Text>
            </View>
          </View>
          <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 3, overflow: 'hidden' }}>
            <View style={{ width: `${pct}%` as any, height: '100%', backgroundColor: '#fff', borderRadius: 3 }} />
          </View>
          {stats && (
            <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.85)', marginTop: 10 }}>
              {stats.totalRounds} rounds · {stats.totalSessions} séances · {stats.uniquePartners} partenaires
            </Text>
          )}
        </LinearGradient>

        {/* Catégories */}
        {CATEGORIES.map(cat => {
          const catItems = byCategory[cat.id];
          if (catItems.length === 0) return null;
          const unlockedInCat = catItems.filter(i => i.unlocked).length;
          return (
            <View key={cat.id} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <cat.Icon size={16} color={cat.color} />
                <Text style={{ fontSize: 13, fontWeight: '900', color: colors.text, letterSpacing: 0.5, flex: 1 }}>
                  {cat.label.toUpperCase()}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: cat.color }}>
                  {unlockedInCat}/{catItems.length}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {catItems.map(a => (
                  <View
                    key={a.id}
                    style={{
                      width: '47.5%' as any,
                      backgroundColor: a.unlocked ? cardBg : (isDark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                      borderRadius: 14,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: a.unlocked ? `${a.color}50` : border,
                      borderLeftWidth: 3,
                      borderLeftColor: a.unlocked ? a.color : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                      opacity: a.unlocked ? 1 : 0.55,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 5 }}>
                      {a.unlocked
                        ? <Text style={{ fontSize: 26 }}>{a.emoji}</Text>
                        : <Lock size={24} color={colors.textMuted ?? '#888'} />}
                      {a.unlocked && (
                        <View style={{ backgroundColor: a.color, borderRadius: 4, paddingHorizontal: 4, paddingVertical: 2 }}>
                          <Text style={{ fontSize: 8, fontWeight: '900', color: '#fff', letterSpacing: 0.3 }}>DÉBLOQUÉ</Text>
                        </View>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '900', color: a.unlocked ? colors.text : colors.textMuted ?? '#888', marginBottom: 3 }} numberOfLines={2}>
                      {a.title}
                    </Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted ?? '#888', lineHeight: 13 }} numberOfLines={3}>
                      {a.description}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
