// ============================================
// METHODS TIMELINE
// Évolution des top 3 méthodes données (soumissions/finitions) au fil des mois.
// Aide à voir sa progression technique sur le long terme.
// ============================================

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Circle, Line as SvgLine } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { format, parseISO, startOfMonth } from 'date-fns';
import { fr } from 'date-fns/locale';
import { TrendingUp } from 'lucide-react-native';

interface TimelinePoint {
  monthKey: string;   // 'YYYY-MM'
  monthLabel: string; // 'JAN', 'FEV', ...
  counts: Record<string, number>;
}

interface MethodsTimelineProps {
  /** Training array avec combat_rounds à parser */
  trainings: Array<{ date: string; combat_rounds?: string | any }>;
  /** Fonction pour extraire methodsGiven (déjà au bon format) */
  getMethodName: (raw: string) => string;
  /** Nombre max de mois à afficher (défaut 6) */
  maxMonths?: number;
}

// Couleurs pour les 3 méthodes
const LINE_COLORS = ['#22C55E', '#3B82F6', '#A855F7'];

const MethodsTimelineInner: React.FC<MethodsTimelineProps> = ({
  trainings,
  getMethodName,
  maxMonths = 6,
}) => {
  const { colors, isDark } = useTheme();

  const { months, topMethods, maxCount } = useMemo(() => {
    // 1. Bucket par mois
    const buckets: Record<string, Record<string, number>> = {};
    for (const tr of trainings) {
      try {
        const rounds = typeof tr.combat_rounds === 'string'
          ? JSON.parse(tr.combat_rounds)
          : (Array.isArray(tr.combat_rounds) ? tr.combat_rounds : []);
        if (!Array.isArray(rounds)) continue;
        const key = format(startOfMonth(parseISO(tr.date)), 'yyyy-MM');
        if (!buckets[key]) buckets[key] = {};
        for (const r of rounds) {
          for (const m of (r.methodsGiven ?? [])) {
            const name = getMethodName(m.trim());
            if (!name) continue;
            buckets[key][name] = (buckets[key][name] ?? 0) + 1;
          }
        }
      } catch { /* ignore */ }
    }

    // 2. Trier par mois
    const sortedKeys = Object.keys(buckets).sort();
    const recentKeys = sortedKeys.slice(-maxMonths);

    // 3. Identifier les top 3 méthodes globales
    const globalCounts: Record<string, number> = {};
    for (const k of recentKeys) {
      for (const [method, c] of Object.entries(buckets[k])) {
        globalCounts[method] = (globalCounts[method] ?? 0) + c;
      }
    }
    const top3 = Object.entries(globalCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name]) => name);

    // 4. Construire les points timeline
    const monthsOut: TimelinePoint[] = recentKeys.map(k => ({
      monthKey: k,
      monthLabel: format(parseISO(`${k}-01`), 'MMM', { locale: fr }).toUpperCase().slice(0, 3),
      counts: buckets[k],
    }));

    let max = 1;
    for (const m of monthsOut) {
      for (const method of top3) {
        const c = m.counts[method] || 0;
        if (c > max) max = c;
      }
    }

    return { months: monthsOut, topMethods: top3, maxCount: max };
  }, [trainings, getMethodName, maxMonths]);

  if (months.length < 2 || topMethods.length === 0) return null;

  const W = 280;
  const H = 160;
  const PAD_L = 20;
  const PAD_R = 16;
  const PAD_T = 16;
  const PAD_B = 28;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const xFor = (i: number) => PAD_L + (i / Math.max(months.length - 1, 1)) * plotW;
  const yFor = (count: number) => PAD_T + plotH - (count / maxCount) * plotH;

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        },
      ]}
    >
      <View style={styles.titleRow}>
        <TrendingUp size={14} color={colors.textPrimary} strokeWidth={2.5} />
        <Text style={[styles.title, { color: colors.textPrimary }]}>
          Évolution de tes top finitions
        </Text>
      </View>

      <View style={{ alignItems: 'center' }}>
        <Svg width={W} height={H}>
          {/* Grille horizontale */}
          {[0.25, 0.5, 0.75].map((ratio, i) => (
            <SvgLine
              key={i}
              x1={PAD_L}
              y1={PAD_T + plotH * ratio}
              x2={W - PAD_R}
              y2={PAD_T + plotH * ratio}
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
              strokeWidth={1}
              strokeDasharray="3,4"
            />
          ))}

          {/* Lignes par méthode */}
          {topMethods.map((method, mi) => {
            const color = LINE_COLORS[mi] || colors.accent;
            const points = months.map((m, i) => ({ x: xFor(i), y: yFor(m.counts[method] || 0) }));
            let path = '';
            points.forEach((p, i) => {
              if (i === 0) path += `M ${p.x} ${p.y}`;
              else {
                const prev = points[i - 1];
                const cx1 = prev.x + (p.x - prev.x) * 0.4;
                const cx2 = p.x - (p.x - prev.x) * 0.4;
                path += ` C ${cx1} ${prev.y}, ${cx2} ${p.y}, ${p.x} ${p.y}`;
              }
            });
            return (
              <React.Fragment key={method}>
                <Path d={path} stroke={color} strokeWidth={2.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
                {points.map((p, i) => (
                  <Circle key={i} cx={p.x} cy={p.y} r={3.5} fill={color} />
                ))}
              </React.Fragment>
            );
          })}

          {/* Labels X (mois) */}
          {months.map((m, i) => (
            <React.Fragment key={i}>
              <SvgLine
                x1={xFor(i)}
                y1={PAD_T + plotH}
                x2={xFor(i)}
                y2={PAD_T + plotH + 3}
                stroke={colors.textMuted}
                strokeWidth={1}
              />
            </React.Fragment>
          ))}
        </Svg>
        {/* Labels mois en texte React (plus lisible que SvgText) */}
        <View style={[styles.xLabels, { width: W }]}>
          {months.map((m, i) => (
            <Text
              key={i}
              style={[
                styles.xLabel,
                { color: colors.textMuted, left: xFor(i) - 15 },
              ]}
            >
              {m.monthLabel}
            </Text>
          ))}
        </View>
      </View>

      {/* Légende */}
      <View style={styles.legend}>
        {topMethods.map((method, i) => (
          <View key={method} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: LINE_COLORS[i] }]} />
            <Text style={[styles.legendText, { color: colors.textSecondary }]} numberOfLines={1}>
              {method}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

export const MethodsTimeline = React.memo(MethodsTimelineInner);

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  xLabels: {
    position: 'relative',
    height: 14,
    marginTop: -12,
  },
  xLabel: {
    position: 'absolute',
    width: 30,
    textAlign: 'center',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    justifyContent: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontSize: 11,
    fontWeight: '700',
    maxWidth: 100,
  },
});
