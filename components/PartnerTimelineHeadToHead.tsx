// ============================================
// PARTNER TIMELINE HEAD-TO-HEAD
// ============================================
// Ligne horizontale de tous les rounds, chaque point colore V/D/N
// ============================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';

interface MatchupPoint {
  date: string;
  result: 'V' | 'D' | 'N' | null;
  tapOut?: boolean;
}

interface Props {
  matchups: MatchupPoint[];
  partnerName: string;
}

const RESULT_COLOR = {
  V: '#10B981',
  D: '#EF4444',
  N: '#F59E0B',
};

export const PartnerTimelineHeadToHead: React.FC<Props> = ({ matchups, partnerName }) => {
  const { colors, isDark } = useTheme();

  // Tri du plus ancien au plus recent pour la timeline
  const sorted = [...matchups]
    .filter(m => m.result != null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (sorted.length === 0) return null;

  const wins = sorted.filter(m => m.result === 'V').length;
  const losses = sorted.filter(m => m.result === 'D').length;
  const draws = sorted.filter(m => m.result === 'N').length;

  // Momentum : ratio sur les 5 derniers
  const last5 = sorted.slice(-5);
  const recentWins = last5.filter(m => m.result === 'V').length;
  const momentumColor = recentWins >= 3 ? '#10B981' : recentWins >= 2 ? '#F59E0B' : '#EF4444';
  const momentumLabel =
    recentWins >= 4 ? 'EN FEU' :
    recentWins >= 3 ? 'EN FORME' :
    recentWins >= 2 ? 'EQUILIBRE' :
    recentWins >= 1 ? 'DIFFICILE' : 'EN DIFFICULTE';

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Timeline vs {partnerName}</Text>
        <View style={[styles.momentum, { backgroundColor: momentumColor + '20' }]}>
          <Text style={[styles.momentumText, { color: momentumColor }]}>{momentumLabel}</Text>
        </View>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingVertical: 18 }}
      >
        <View style={styles.timeline}>
          {/* Ligne de base */}
          <View style={[styles.baseline, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]} />
          {sorted.map((m, i) => {
            const c = RESULT_COLOR[m.result as 'V' | 'D' | 'N'];
            const size = m.tapOut ? 16 : 14;
            return (
              <View key={i} style={[styles.dotSlot]}>
                <View
                  style={[
                    styles.dot,
                    {
                      backgroundColor: c,
                      width: size,
                      height: size,
                      borderRadius: size / 2,
                      borderWidth: m.tapOut ? 2 : 0,
                      borderColor: '#1F2937',
                    },
                  ]}
                />
              </View>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <View style={styles.footerItem}>
          <View style={[styles.legendDot, { backgroundColor: RESULT_COLOR.V }]} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{wins} V</Text>
        </View>
        <View style={styles.footerItem}>
          <View style={[styles.legendDot, { backgroundColor: RESULT_COLOR.D }]} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{losses} D</Text>
        </View>
        <View style={styles.footerItem}>
          <View style={[styles.legendDot, { backgroundColor: RESULT_COLOR.N }]} />
          <Text style={[styles.footerText, { color: colors.textMuted }]}>{draws} N</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={[styles.footerText, { color: colors.textMuted, fontStyle: 'italic' }]}>
          Point cercle = tap out subi
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: { fontSize: 13, fontWeight: '800' },
  momentum: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  momentumText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  timeline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    position: 'relative',
    minHeight: 28,
  },
  baseline: {
    position: 'absolute',
    left: 0, right: 0,
    top: '50%',
    height: 2,
    marginTop: -1,
  },
  dotSlot: {
    width: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {},
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  footerItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  footerText: { fontSize: 11, fontWeight: '600' },
});

export default React.memo(PartnerTimelineHeadToHead);
