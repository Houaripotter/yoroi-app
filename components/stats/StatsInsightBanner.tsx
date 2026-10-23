// ============================================
// STATS INSIGHT BANNER (refonte v2)
// Affiche 1 ou 2 constats en tete d'un onglet de statistiques.
// Les phrases viennent de generateInsights(). API inchangee.
// ============================================

import React from 'react';
import { View, StyleSheet, Pressable, Platform } from 'react-native';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import type { Insight } from '@/lib/statsInsights';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { Ink } from '@/components/yoroi/v2/Ink';

const ICON_PATHS: Record<string, string> = {
  'trending-up': 'M4 16l5-5 4 4 7-7M15 8h5v5',
  'trending-down': 'M4 8l5 5 4-4 7 7M15 16h5v-5',
  'alert-circle': 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 8v5M12 16.5v.01',
  moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
  fire: 'M12 3c1 3.5 5 5.5 5 10a5 5 0 0 1-10 0c0-2.2 1-3.6 2.2-4.8.3 1.6 1 2.6 2 3 0-3 .3-5.6.8-8.2z',
  sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z',
};

const InsightCard: React.FC<{ insight: Insight }> = React.memo(({ insight }) => {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const tone =
    insight.tone === 'celebration'
      ? { color: c.successText, tint: c.successTint }
      : insight.tone === 'positive'
        ? { color: c.indigo, tint: c.indigoTint }
        : insight.tone === 'warning'
          ? { color: c.goldDeep, tint: c.goldTint }
          : { color: c.ink, tint: c.fillSoft };
  const d = (insight.icon && ICON_PATHS[insight.icon]) || ICON_PATHS.sparkle;

  const handlePress = () => {
    if (!insight.href) return;
    if (Platform.OS !== 'web') impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    router.push(insight.href as any);
  };

  const body = (
    <>
      <View style={[styles.lace, { backgroundColor: tone.color }]} />
      <View style={[styles.iconTile, { backgroundColor: tone.tint }]}>
        <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
          <Path d={d} stroke={tone.color} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </View>
      <Ink size={14} weight="bold" style={styles.text} numberOfLines={2}>
        {insight.text}
      </Ink>
      {insight.href ? (
        <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
          <Path d="M9 5l7 7-7 7" stroke={c.textMuted} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </>
  );

  const cardStyle = [styles.card, { backgroundColor: c.surface, borderColor: c.divider }];

  if (insight.href) {
    return (
      <Pressable
        onPress={handlePress}
        accessibilityRole="button"
        accessibilityLabel={insight.text}
        style={({ pressed }) => [...cardStyle, { transform: [{ scale: pressed ? 0.98 : 1 }] }]}
      >
        {body}
      </Pressable>
    );
  }
  return (
    <View style={cardStyle} accessible accessibilityLabel={insight.text}>
      {body}
    </View>
  );
});

interface StatsInsightBannerProps {
  insights: Insight[];
}

const StatsInsightBannerInner: React.FC<StatsInsightBannerProps> = ({ insights }) => {
  if (!insights || insights.length === 0) return null;
  return (
    <View style={styles.container}>
      {insights.map((i) => (
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
    minHeight: 60,
    paddingVertical: 12,
    paddingLeft: 16,
    paddingRight: 14,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  lace: {
    position: 'absolute',
    left: 0,
    top: 14,
    bottom: 14,
    width: 4,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  iconTile: {
    width: 38,
    height: 38,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    flex: 1,
    lineHeight: 19,
  },
});
