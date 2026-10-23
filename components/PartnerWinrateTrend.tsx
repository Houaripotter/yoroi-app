// ============================================
// PARTNER WINRATE TREND : courbe sur 12 mois
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Line, Circle as SvgCircle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

interface MatchupPoint {
  date: string;
  result: 'V' | 'D' | 'N' | null;
}

interface Props {
  matchups: MatchupPoint[];
}

const CHART_W = Dimensions.get('window').width - 56;
const CHART_H = 140;
const PADDING_LEFT = 30;
const PADDING_RIGHT = 10;
const PADDING_TOP = 12;
const PADDING_BOTTOM = 28;

export const PartnerWinrateTrend: React.FC<Props> = ({ matchups }) => {
  const { colors, isDark } = useTheme();

  const monthData = useMemo(() => {
    // 12 derniers mois
    const now = new Date();
    const months: { key: string; label: string; wins: number; losses: number; winrate: number | null }[] = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('fr-FR', { month: 'short' });
      months.push({ key, label, wins: 0, losses: 0, winrate: null });
    }
    matchups.forEach(m => {
      if (!m.result || m.result === 'N') return;
      const d = new Date(m.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const slot = months.find(mo => mo.key === key);
      if (slot) {
        if (m.result === 'V') slot.wins += 1;
        else if (m.result === 'D') slot.losses += 1;
      }
    });
    months.forEach(m => {
      const t = m.wins + m.losses;
      m.winrate = t > 0 ? Math.round((m.wins / t) * 100) : null;
    });
    return months;
  }, [matchups]);

  const hasData = monthData.some(m => m.winrate != null);
  if (!hasData) return null;

  // Construction du path
  const innerW = CHART_W - PADDING_LEFT - PADDING_RIGHT;
  const innerH = CHART_H - PADDING_TOP - PADDING_BOTTOM;
  const stepX = innerW / (monthData.length - 1);

  const xFor = (i: number) => PADDING_LEFT + i * stepX;
  const yFor = (wr: number) => PADDING_TOP + innerH - (wr / 100) * innerH;

  // Path qui saute les mois sans data
  const points = monthData
    .map((m, i) => (m.winrate != null ? { x: xFor(i), y: yFor(m.winrate), wr: m.winrate } : null))
    .filter(Boolean) as { x: number; y: number; wr: number }[];

  const d = points.length > 0
    ? points
        .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
        .join(' ')
    : '';

  const gridLines = [0, 25, 50, 75, 100];

  return (
    <View style={[styles.wrap, { backgroundColor: colors.card, borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)' }]}>
      <Text style={[styles.title, { color: colors.text }]}>Evolution sur 12 mois</Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>Winrate mensuel contre lui</Text>

      <Svg width={CHART_W} height={CHART_H}>
        {/* Grille horizontale */}
        {gridLines.map(l => {
          const y = yFor(l);
          return (
            <React.Fragment key={l}>
              <Line
                x1={PADDING_LEFT}
                x2={CHART_W - PADDING_RIGHT}
                y1={y}
                y2={y}
                stroke={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'}
                strokeWidth={1}
                strokeDasharray={l === 50 ? undefined : '3,3'}
              />
              <SvgText
                x={PADDING_LEFT - 6}
                y={y + 3}
                fontSize="9"
                fill={colors.textMuted}
                textAnchor="end"
              >
                {l}%
              </SvgText>
            </React.Fragment>
          );
        })}
        {/* Ligne 50% mise en evidence */}
        {/* Path winrate */}
        {d ? <Path d={d} fill="none" stroke="#D4AF37" strokeWidth={2.5} /> : null}
        {/* Points */}
        {points.map((p, i) => (
          <SvgCircle
            key={i}
            cx={p.x}
            cy={p.y}
            r={4}
            fill={p.wr >= 50 ? '#10B981' : '#EF4444'}
            stroke="#fff"
            strokeWidth={1.5}
          />
        ))}
        {/* Labels X (mois) */}
        {monthData.map((m, i) => (
          <SvgText
            key={i}
            x={xFor(i)}
            y={CHART_H - 8}
            fontSize="8.5"
            fill={colors.textMuted}
            textAnchor="middle"
            fontWeight="600"
          >
            {m.label.slice(0, 3)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  title: { fontSize: 13, fontWeight: '800' },
  sub: { fontSize: 11, marginBottom: 6 },
});

export default React.memo(PartnerWinrateTrend);
