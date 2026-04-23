// ============================================
// PARTNER INSIGHTS BANNER · affiche les 3 insights dominants
// ============================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertTriangle, Target, Award, Moon, Flame, TrendingUp, type LucideIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/ThemeContext';
import { computeGlobalInsights, type PartnerStats, type GlobalInsight } from '@/lib/partnerInsightsService';

const { width: W } = Dimensions.get('window');
const CARD_W = W - 32;
const PARTNERS_KEY = '@yoroi_sparring_partners';

const ICON_MAP: Record<string, LucideIcon> = {
  worst_matchups: AlertTriangle,
  archetype_weakness: Target,
  belt_stat: Award,
  dormant: Moon,
  rival_of_month: Flame,
  improving: TrendingUp,
};

interface Props {
  combatStats?: Record<string, { wins: number; losses: number; draws: number; total: number; lastDate?: string }>;
}

export const PartnerInsightsBanner: React.FC<Props> = ({ combatStats = {} }) => {
  const { colors, isDark } = useTheme();
  const [insights, setInsights] = useState<GlobalInsight[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(PARTNERS_KEY);
        if (!raw) return;
        const partners: any[] = JSON.parse(raw);
        const stats: PartnerStats[] = partners.map(p => {
          const live = combatStats[p.id];
          const wins = live?.wins ?? p.wins ?? 0;
          const losses = live?.losses ?? p.losses ?? 0;
          const draws = live?.draws ?? p.draws ?? 0;
          const total = live?.total ?? p.matchCount ?? (wins + losses + draws);
          const winrate = (wins + losses) > 0 ? Math.round((wins / (wins + losses)) * 100) : null;
          return {
            id: p.id,
            name: p.name,
            archetype: p.archetype,
            belt: p.belt,
            total,
            wins,
            losses,
            draws,
            winrate,
            lastDate: live?.lastDate,
          };
        });
        setInsights(computeGlobalInsights(stats));
      } catch {
        setInsights([]);
      }
    })();
  }, [combatStats]);

  if (insights.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={CARD_W + 12}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 12, paddingBottom: 4 }}
    >
      {insights.map(insight => {
        const Icon = ICON_MAP[insight.type] || AlertTriangle;
        return (
          <View
            key={insight.id}
            style={[
              styles.card,
              { backgroundColor: colors.card, borderColor: insight.color + '55', width: CARD_W },
            ]}
          >
            <LinearGradient
              colors={[insight.color + '25', 'transparent']}
              style={StyleSheet.absoluteFill}
            />
            <View style={[styles.iconCircle, { backgroundColor: insight.color + '22' }]}>
              <Icon size={18} color={insight.color} strokeWidth={2.3} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.label, { color: insight.color }]}>INSIGHT</Text>
              <Text style={[styles.title, { color: colors.text }]}>{insight.title}</Text>
              <Text style={[styles.text, { color: colors.textSecondary }]} numberOfLines={3}>
                {insight.text}
              </Text>
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    overflow: 'hidden',
  },
  iconCircle: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
  },
  label: {
    fontSize: 10, fontWeight: '900', letterSpacing: 1.5, marginBottom: 2,
  },
  title: { fontSize: 14, fontWeight: '800', marginBottom: 2 },
  text: { fontSize: 12, lineHeight: 16 },
});

export default React.memo(PartnerInsightsBanner);
