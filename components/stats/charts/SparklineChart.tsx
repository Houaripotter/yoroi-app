import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from 'react-native-svg';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';

interface SparklineDataPoint {
  value: number;
  date?: string;
}

interface SparklineChartProps {
  data: SparklineDataPoint[];
  width: number;
  height: number;
  color?: string;
  showGradient?: boolean;
  thickness?: number;
  showLastValues?: number;
  valueUnit?: string;
  /** Si true : affiche valeurs au-dessus + dates en-dessous (style Résumé/Dashboard) */
  showLabels?: boolean;
  /** Nombre max de points affichés en mode showLabels (défaut 4) */
  maxLabeledPoints?: number;
}

/**
 * Échantillonne uniformément à `n` points (premier + dernier + équi-répartis).
 */
const sample = <T,>(arr: T[], n: number): T[] => {
  if (arr.length <= n) return arr;
  const out: T[] = [];
  const step = (arr.length - 1) / (n - 1);
  for (let i = 0; i < n; i++) out.push(arr[Math.round(i * step)]);
  return out;
};

const SparklineChartInner: React.FC<SparklineChartProps> = ({
  data,
  width,
  height,
  color = '#6366f1',
  showGradient = false,
  thickness = 2,
  showLastValues,
  showLabels = false,
  maxLabeledPoints = 4,
}) => {
  // En mode labels : on échantillonne pour garder seulement quelques points lisibles
  const sourcePoints = showLastValues ? data.slice(-showLastValues) : data;
  const points = showLabels ? sample(sourcePoints, maxLabeledPoints) : sourcePoints;

  if (points.length < 2) return <View style={{ width, height }} />;

  const values = points.map(p => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // En mode labels, on réserve de l'espace haut (valeur) + bas (date × 2 lignes)
  const padTop = showLabels ? 16 : 2;
  const padBottom = showLabels ? 26 : 2; // 26px pour 2 lignes (jour+mois / année)
  const padX = showLabels ? 14 : 0;
  const plotH = height - padTop - padBottom;
  const plotW = width - padX * 2;

  const coords = points.map((p, i) => ({
    x: padX + (i / (points.length - 1)) * plotW,
    y: padTop + plotH - ((p.value - min) / range) * plotH,
    value: p.value,
    date: p.date,
  }));

  const linePath = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');

  const gradientId = `sparkGrad_${color.replace('#', '')}`;
  const areaPath = showGradient && coords.length > 0
    ? `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${height - padBottom} L ${coords[0].x.toFixed(1)} ${height - padBottom} Z`
    : '';

  const formatVal = (v: number): string => {
    if (Number.isInteger(v)) return String(v);
    return v.toFixed(1);
  };
  const formatDate = (iso?: string): { line1: string; line2: string } => {
    if (!iso) return { line1: '', line2: '' };
    try {
      return {
        line1: format(parseISO(iso), 'd MMM', { locale: fr }).toUpperCase(), // Règle 4 : ligne 1 = jour+mois
        line2: format(parseISO(iso), 'yyyy'),                                  // Règle 4 : ligne 2 = année
      };
    } catch {
      return { line1: '', line2: '' };
    }
  };

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {showGradient && (
          <Defs>
            <LinearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <Stop offset="100%" stopColor={color} stopOpacity={0} />
            </LinearGradient>
          </Defs>
        )}
        {showGradient && areaPath && (
          <Path d={areaPath} fill={`url(#${gradientId})`} />
        )}
        <Path
          d={linePath}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Points + labels en mode showLabels */}
        {showLabels && coords.map((c, i) => (
          <Circle key={`pt-${i}`} cx={c.x} cy={c.y} r={3.5} fill={color} />
        ))}
      </Svg>
      {/* Valeurs au-dessus + dates en-dessous (overlay text pour propre rendu) */}
      {showLabels && coords.map((c, i) => {
        const valStr = formatVal(c.value);
        const dateFmt = formatDate(c.date);
        const isFirst = i === 0;
        const isLast = i === coords.length - 1;
        const align: 'flex-start' | 'flex-end' | 'center' =
          isFirst ? 'flex-start' : isLast ? 'flex-end' : 'center';
        return (
          <View
            key={`lbl-${i}`}
            style={[
              styles.labelStack,
              {
                left: c.x - 30,
                width: 60,
                alignItems: align,
              },
            ]}
            pointerEvents="none"
          >
            <Text style={[styles.valueText, { top: Math.max(c.y - padTop - 4, 0) }]}>
              {valStr}
            </Text>
            {dateFmt.line1 ? (
              <>
                {/* Règle 4 : ligne 1 = jour+mois, ligne 2 = année */}
                <Text style={[styles.dateText, { top: height - padBottom }]} numberOfLines={1}>
                  {dateFmt.line1}
                </Text>
                <Text style={[styles.dateText, { top: height - padBottom + 12, opacity: 0.7 }]} numberOfLines={1}>
                  {dateFmt.line2}
                </Text>
              </>
            ) : null}
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  labelStack: {
    position: 'absolute',
    height: 0,
  },
  valueText: {
    position: 'absolute',
    fontSize: 10,
    fontWeight: '900',
    color: '#1a1a1a',
    paddingHorizontal: 6,
    paddingVertical: 1,
    backgroundColor: 'rgba(255,255,255,0.85)',
    borderRadius: 4,
  },
  dateText: {
    position: 'absolute',
    fontSize: 8,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 0.3,
  },
});

export const SparklineChart = React.memo(SparklineChartInner);
export default SparklineChart;
