// ============================================
// YOROI - CLASSEMENT SPARRING
// ============================================
// Classement de tous les partenaires de sparring
// triés par taux de victoire, rounds ou progression
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import {
  ChevronLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  Trophy,
  Award,
  Users,
} from 'lucide-react-native';
import { getTrainingsByPartnerName, Training, CombatRound } from '@/lib/database';
import logger from '@/lib/security/logger';
import { PremiumGate } from '@/components/premium/PremiumGate';
import { SkeletonGrid } from '@/components/stats/SkeletonCard';

// ============================================
// TYPES
// ============================================

interface Partner {
  id: string;
  name: string;
  belt?: string;
  weight?: string;
  sport?: string;
  strengths: string[];
  weaknesses: string[];
  whatWorks: string[];
  notes: any[];
  matchCount: number;
  wins: number;
  losses: number;
  draws: number;
  createdAt: string;
  activeGoal?: { text: string; createdAt: string };
}

type SortMode = 'winrate' | 'rounds' | 'progression';

interface RankedPartner {
  partner: Partner;
  winRate: number;
  totalRounds: number;
  totalSessions: number;
  realWins: number;
  realLosses: number;
  realDraws: number;
  trend: 'up' | 'down' | 'stable';
  progressionScore: number;
}

// ============================================
// CONSTANTES
// ============================================

const STORAGE_KEY = '@yoroi_sparring_partners';

const BELT_COLORS: Record<string, string> = {
  'blanche': '#ffffff',
  'bleue': '#3B82F6',
  'violette': '#8B5CF6',
  'marron': '#92400E',
  'noire': '#111827',
  'grise': '#6B7280',
  'jaune': '#F59E0B',
  'orange': '#F97316',
  'verte': '#22C55E',
  'rouge': '#EF4444',
};

const WIN_COLOR = '#22C55E';
const LOSS_COLOR = '#EF4444';
const DRAW_COLOR = '#F59E0B';
const ACCENT_COLOR = '#EF4444';

const RANK_COLORS: Record<number, { bg: string; text: string; border: string }> = {
  1: { bg: '#FEF3C7', text: '#92400E', border: '#F59E0B' },
  2: { bg: '#F3F4F6', text: '#374151', border: '#9CA3AF' },
  3: { bg: '#FEF2F2', text: '#7C2D12', border: '#F97316' },
};

// ============================================
// HELPERS
// ============================================

const computeWinRateFromRounds = (rounds: CombatRound[]): { wins: number; losses: number; draws: number } => {
  let wins = 0;
  let losses = 0;
  let draws = 0;
  for (const r of rounds) {
    if (r.result === 'win') wins++;
    else if (r.result === 'loss') losses++;
    else if (r.result === 'draw') draws++;
  }
  return { wins, losses, draws };
};

const computeTrend = (trainings: Training[], partnerName: string): { trend: 'up' | 'down' | 'stable'; progressionScore: number } => {
  // Trier par date ASC
  const sorted = [...trainings].sort((a, b) => a.date.localeCompare(b.date));

  const sessionWinRates: number[] = [];
  for (const t of sorted) {
    const rounds = (t.combat_rounds || []).filter(r =>
      r.partner && r.partner.toLowerCase().includes(partnerName.toLowerCase().trim())
    );
    if (rounds.length === 0) continue;
    const { wins, losses, draws } = computeWinRateFromRounds(rounds);
    const total = wins + losses + draws;
    if (total === 0) continue;
    sessionWinRates.push(wins / total);
  }

  if (sessionWinRates.length < 2) {
    return { trend: 'stable', progressionScore: Math.round((sessionWinRates[0] ?? 0) * 100) }; // échelle 0-100
  }

  const recent = sessionWinRates.slice(-3);
  const older = sessionWinRates.slice(-6, -3);

  const avgRecent = recent.reduce((a, b) => a + b, 0) / recent.length;
  const avgOlder = older.length > 0
    ? older.reduce((a, b) => a + b, 0) / older.length
    : sessionWinRates.slice(0, recent.length).reduce((a, b) => a + b, 0) / recent.length;

  const diff = avgRecent - avgOlder;
  const trend: 'up' | 'down' | 'stable' = diff > 0.05 ? 'up' : diff < -0.05 ? 'down' : 'stable';

  // Score de progression : taux moyen récent * 100
  const progressionScore = Math.round(avgRecent * 100);

  return { trend, progressionScore };
};

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function SparringRankingScreen() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [ranked, setRanked] = useState<RankedPartner[]>([]);
  const [sortMode, setSortMode] = useState<SortMode>('winrate');

  // ============================================
  // CHARGEMENT
  // ============================================

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      const partners: Partner[] = raw ? JSON.parse(raw) : [];

      const results: RankedPartner[] = [];

      for (const partner of partners) {
        try {
          const trainings = await getTrainingsByPartnerName(partner.name);

          let totalRounds = 0;
          let realWins = 0;
          let realLosses = 0;
          let realDraws = 0;

          for (const t of trainings) {
            const rounds = (t.combat_rounds || []).filter(r =>
              r.partner && r.partner.toLowerCase().includes(partner.name.toLowerCase().trim())
            );
            totalRounds += rounds.length;
            const { wins, losses, draws } = computeWinRateFromRounds(rounds);
            realWins += wins;
            realLosses += losses;
            realDraws += draws;
          }

          // Fallback sur les stats stockées si pas de rounds en DB
          const effectiveWins = totalRounds > 0 ? realWins : partner.wins;
          const effectiveLosses = totalRounds > 0 ? realLosses : partner.losses;
          const effectiveDraws = totalRounds > 0 ? realDraws : partner.draws;
          const totalResults = effectiveWins + effectiveLosses + effectiveDraws;
          const winRate = totalResults > 0 ? Math.round((effectiveWins / totalResults) * 100) : 0;

          const { trend, progressionScore } = computeTrend(trainings, partner.name);

          results.push({
            partner,
            winRate,
            totalRounds: totalRounds > 0 ? totalRounds : partner.matchCount,
            totalSessions: trainings.length,
            realWins: effectiveWins,
            realLosses: effectiveLosses,
            realDraws: effectiveDraws,
            trend,
            progressionScore,
          });
        } catch (err) {
          logger.warn('SparringRanking: erreur calcul stats pour ' + partner.name, err);
        }
      }

      setRanked(results);
    } catch (err) {
      logger.error('SparringRanking: erreur chargement partenaires', err);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // TRI
  // ============================================

  const sorted = [...ranked].sort((a, b) => {
    if (sortMode === 'winrate') return b.winRate - a.winRate;
    if (sortMode === 'rounds') return b.totalRounds - a.totalRounds;
    if (sortMode === 'progression') return b.progressionScore - a.progressionScore;
    return 0;
  });

  // ============================================
  // NAVIGATION
  // ============================================

  const handleBack = async () => {
    await impactAsync(ImpactFeedbackStyle.Light);
    router.back();
  };

  const handlePartnerPress = async (name: string) => {
    await impactAsync(ImpactFeedbackStyle.Light);
    router.push(`/sparring-partners?partnerName=${encodeURIComponent(name)}`);
  };

  const handleSortChange = async (mode: SortMode) => {
    await impactAsync(ImpactFeedbackStyle.Light);
    setSortMode(mode);
  };

  // ============================================
  // RENDER HELPERS
  // ============================================

  const getBeltColor = (belt?: string): string => {
    if (!belt) return '#6B7280';
    const key = belt.toLowerCase();
    return BELT_COLORS[key] ?? '#6B7280';
  };

  const RankBadge = ({ rank }: { rank: number }) => {
    if (rank <= 3) {
      const style = RANK_COLORS[rank];
      const icons: Record<number, React.ReactNode> = {
        1: <Trophy size={14} color="#92400E" />,
        2: <Award size={14} color="#374151" />,
        3: <Award size={14} color="#7C2D12" />,
      };
      return (
        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: style.bg,
          borderWidth: 2,
          borderColor: style.border,
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          {icons[rank]}
        </View>
      );
    }
    return (
      <View style={{
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textSecondary }}>
          {rank}
        </Text>
      </View>
    );
  };

  const TrendIcon = ({ trend }: { trend: 'up' | 'down' | 'stable' }) => {
    if (trend === 'up') return <TrendingUp size={16} color={WIN_COLOR} />;
    if (trend === 'down') return <TrendingDown size={16} color={LOSS_COLOR} />;
    return <Minus size={16} color={colors.textSecondary} />;
  };

  const SortTab = ({ mode, label }: { mode: SortMode; label: string }) => (
    <TouchableOpacity
      onPress={() => handleSortChange(mode)}
      style={{
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderBottomWidth: 2,
        borderBottomColor: sortMode === mode ? ACCENT_COLOR : 'transparent',
      }}
    >
      <Text style={{
        fontSize: 13,
        fontWeight: sortMode === mode ? '700' : '500',
        color: sortMode === mode ? ACCENT_COLOR : colors.textSecondary,
      }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <PremiumGate featureTitle="Classement sparring">
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Header */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingBottom: 12,
        paddingHorizontal: 16,
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#1F2937' : '#F3F4F6',
        flexDirection: 'row',
        alignItems: 'center',
      }}>
        <TouchableOpacity
          onPress={handleBack}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: 12,
          }}
        >
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text }}>
            Classement Sparring
          </Text>
          {!loading && (
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 1 }}>
              {sorted.length} partenaire{sorted.length !== 1 ? 's' : ''}
            </Text>
          )}
        </View>

        <View style={{
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: isDark ? '#7C1D1D' : '#FEE2E2',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <Trophy size={18} color={ACCENT_COLOR} />
        </View>
      </View>

      {/* Sort Tabs */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: colors.background,
        borderBottomWidth: 1,
        borderBottomColor: isDark ? '#1F2937' : '#F3F4F6',
        paddingHorizontal: 8,
      }}>
        <SortTab mode="winrate" label="Taux victoire" />
        <SortTab mode="rounds" label="Rounds" />
        <SortTab mode="progression" label="Progression" />
      </View>

      {/* Content */}
      {loading ? (
        <View style={{ flex: 1, padding: 16 }}>
          <SkeletonGrid count={5} cardHeight={120} />
        </View>
      ) : sorted.length === 0 ? (
        /* Empty State */
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <View style={{
            width: 72,
            height: 72,
            borderRadius: 36,
            backgroundColor: isDark ? '#1F2937' : '#F3F4F6',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 16,
          }}>
            <Users size={32} color={colors.textSecondary} />
          </View>
          <Text style={{ fontSize: 18, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 8 }}>
            Aucun partenaire
          </Text>
          <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 }}>
            Ajoute des partenaires de sparring pour voir leur classement ici.
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + 32 }}
          showsVerticalScrollIndicator={false}
        >
          {sorted.map((item, index) => {
            const rank = index + 1;
            const beltColor = getBeltColor(item.partner.belt);
            const totalResults = item.realWins + item.realLosses + item.realDraws;

            return (
              <TouchableOpacity
                key={item.partner.id}
                onPress={() => handlePartnerPress(item.partner.name)}
                activeOpacity={0.7}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  backgroundColor: isDark ? '#111827' : '#FFFFFF',
                  borderRadius: 14,
                  marginBottom: 10,
                  padding: 14,
                  borderWidth: rank <= 3 ? 1.5 : 1,
                  borderColor: rank <= 3
                    ? RANK_COLORS[rank].border
                    : (isDark ? '#1F2937' : '#E5E7EB'),
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: rank <= 3 ? 2 : 1 },
                  shadowOpacity: rank <= 3 ? 0.12 : 0.06,
                  shadowRadius: rank <= 3 ? 6 : 3,
                  elevation: rank <= 3 ? 4 : 2,
                }}
              >
                {/* Badge de rang */}
                <RankBadge rank={rank} />

                {/* Barre de ceinture */}
                <View style={{
                  width: 4,
                  height: 44,
                  borderRadius: 2,
                  backgroundColor: beltColor,
                  marginHorizontal: 10,
                  borderWidth: item.partner.belt?.toLowerCase() === 'blanche' ? 1 : 0,
                  borderColor: '#E5E7EB',
                }} />

                {/* Infos principales */}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                    <Text style={{
                      fontSize: 15,
                      fontWeight: '700',
                      color: colors.text,
                      flex: 1,
                    }} numberOfLines={1}>
                      {item.partner.name}
                    </Text>
                    <TrendIcon trend={item.trend} />
                  </View>

                  {/* Record V/L/N */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: WIN_COLOR }}>
                      {item.realWins}V
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>·</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: LOSS_COLOR }}>
                      {item.realLosses}L
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>·</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: DRAW_COLOR }}>
                      {item.realDraws}N
                    </Text>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>
                      · {item.totalRounds} round{item.totalRounds !== 1 ? 's' : ''}
                    </Text>
                  </View>

                  {/* Sport / ceinture */}
                  {(item.partner.sport || item.partner.belt) && (
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                      {[item.partner.sport, item.partner.belt ? `Ceinture ${item.partner.belt}` : undefined]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  )}
                </View>

                {/* Taux de victoire */}
                <View style={{ alignItems: 'center', marginLeft: 10, minWidth: 48 }}>
                  <Text style={{
                    fontSize: 20,
                    fontWeight: '800',
                    color: item.winRate >= 60
                      ? WIN_COLOR
                      : item.winRate >= 40
                        ? DRAW_COLOR
                        : LOSS_COLOR,
                  }}>
                    {item.winRate}%
                  </Text>
                  <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 1 }}>
                    victoires
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}

          {/* Légende */}
          <View style={{
            flexDirection: 'row',
            justifyContent: 'center',
            gap: 16,
            marginTop: 8,
            paddingTop: 8,
            borderTopWidth: 1,
            borderTopColor: isDark ? '#1F2937' : '#F3F4F6',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TrendingUp size={12} color={WIN_COLOR} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>En progression</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Minus size={12} color={colors.textSecondary} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>Stable</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <TrendingDown size={12} color={LOSS_COLOR} />
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>En baisse</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </View>
    </PremiumGate>
  );
}
