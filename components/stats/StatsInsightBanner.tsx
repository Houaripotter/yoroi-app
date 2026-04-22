// ============================================
// STATS INSIGHT BANNER
// Affiche 1-2 insights contextuels en tête d'un onglet Stats.
// Les phrases sont générées par generateInsights() depuis les data.
// ============================================

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { TrendingUp, TrendingDown, AlertCircle, Moon, Flame, Sparkles } from 'lucide-react-native';
import type { Insight } from '@/lib/statsInsights';

const ICON_MAP: Record<string, React.ComponentType<any>> = {
  'trending-up': TrendingUp,
  'trending-down': TrendingDown,
  'alert-circle': AlertCircle,
  'moon': Moon,
  'fire': Flame,
};

interface ToneStyle {
  bg: string;
  border: string;
  iconBg: string;
  iconColor: string;
  textColor: string;
}

const buildToneStyle = (tone: Insight['tone'], _isDark: boolean): ToneStyle => {
  const palette = {
    celebration: { color: '#10B981', label: 'green' },
    positive:    { color: '#3B82F6', label: 'blue' },
    warning:     { color: '#F59E0B', label: 'amber' },
    neutral:     { color: '#8B5CF6', label: 'purple' },
  };
  const c = palette[tone].color;
  // Fond blanc forcé : sur le thème sombre, les fonds translucides deviennent illisibles.
  return {
    bg:        '#FFFFFF',
    border:    c + '55',
    iconBg:    c + '1F',
    iconColor: c,
    textColor: '#0F172A',
  };
};

interface InsightCardProps {
  insight: Insight;
}

const InsightCard: React.FC<InsightCardProps> = React.memo(({ insight }) => {
  const { isDark } = useTheme();
  const tone = buildToneStyle(insight.tone, isDark);
  const Icon = (insight.icon && ICON_MAP[insight.icon]) || Sparkles;

  const handlePress = () => {
    if (!insight.href) return;
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    router.push(insight.href as any);
  };

  const Wrapper: any = insight.href ? TouchableOpacity : View;

  return (
    <Wrapper
      style={[styles.card, { backgroundColor: tone.bg, borderColor: tone.border }]}
      activeOpacity={insight.href ? 0.8 : 1}
      onPress={insight.href ? handlePress : undefined}
      accessibilityRole={insight.href ? 'button' : undefined}
      accessibilityLabel={insight.text}
    >
      <View style={[styles.iconCircle, { backgroundColor: tone.iconBg }]}>
        <Icon size={18} color={tone.iconColor} strokeWidth={2.5} />
      </View>
      <Text style={[styles.text, { color: tone.textColor }]} numberOfLines={2}>
        {insight.text}
      </Text>
    </Wrapper>
  );
});

interface StatsInsightBannerProps {
  insights: Insight[];
}

const StatsInsightBannerInner: React.FC<StatsInsightBannerProps> = ({ insights }) => {
  if (!insights || insights.length === 0) return null;
  return (
    <View style={styles.container}>
      {insights.map(i => (
        <InsightCard key={i.id} insight={i} />
      ))}
    </View>
  );
};

export const StatsInsightBanner = React.memo(StatsInsightBannerInner);

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 4,
    gap: 8,
    marginBottom: 4,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    letterSpacing: -0.1,
    lineHeight: 18,
  },
});
