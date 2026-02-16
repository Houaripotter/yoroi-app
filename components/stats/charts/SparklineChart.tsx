// ============================================
// SPARKLINE CHART - Mini graphique avec valeurs
// Utilisé dans les petites cartes métriques
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Svg, Path, Circle, Line as SvgLine } from 'react-native-svg';

interface SparklineChartProps {
  data: { value: number }[];
  width: number;
  height: number;
  color: string;
  showGradient?: boolean;
  thickness?: number;
  showLastValues?: number; // Nombre de dernières valeurs à afficher
  valueUnit?: string;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  width,
  height,
  color,
  showGradient = false,
  thickness = 2,
  showLastValues = 0,
  valueUnit = '',
}) => {
  const { colors, isDark } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          Pas de données
        </Text>
      </View>
    );
  }

  // Calculer les valeurs min/max pour normaliser
  const values = data.map(d => d.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;

  // Padding pour que les points ne touchent pas les bords
  const paddingTop = 20;
  const paddingBottom = 5;
  const paddingHorizontal = 5;
  const chartHeight = height - paddingTop - paddingBottom;
  const chartWidth = width - paddingHorizontal * 2;

  // Calculer les points
  const points = data.map((d, i) => {
    const x = paddingHorizontal + (i / Math.max(data.length - 1, 1)) * chartWidth;
    const normalizedValue = (d.value - minValue) / range;
    const y = paddingTop + chartHeight - normalizedValue * chartHeight;
    return { x, y, value: d.value };
  });

  // Créer le path pour la courbe
  const createPath = () => {
    if (points.length === 0) return '';

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];

      // Courbe de Bézier pour un effet smooth
      const cpx1 = prev.x + (curr.x - prev.x) / 3;
      const cpx2 = prev.x + 2 * (curr.x - prev.x) / 3;
      path += ` C ${cpx1} ${prev.y}, ${cpx2} ${curr.y}, ${curr.x} ${curr.y}`;
    }

    return path;
  };

  // Déterminer quelles valeurs afficher - TOUJOURS afficher les 3 dernières
  const valuesToShow = points.slice(-Math.min(3, points.length));

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        {/* Grille subtile */}
        {!showGradient && (
          <>
            <SvgLine
              x1={paddingHorizontal}
              y1={paddingTop + chartHeight / 2}
              x2={width - paddingHorizontal}
              y2={paddingTop + chartHeight / 2}
              stroke={isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}
              strokeWidth="1"
            />
          </>
        )}

        {/* Ligne du graphique */}
        <Path
          d={createPath()}
          stroke={color}
          strokeWidth={thickness}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points */}
        {points.map((point, index) => (
          <Circle
            key={index}
            cx={point.x}
            cy={point.y}
            r={thickness + 1.5}
            fill={colors.backgroundCard}
            stroke={color}
            strokeWidth={thickness}
          />
        ))}
      </Svg>

      {/* Valeurs au-dessus des derniers points - TOUJOURS afficher */}
      {valuesToShow.map((point, index) => (
        <View
          key={`value-${index}`}
          style={{
            position: 'absolute',
            top: Math.max(point.y - 16, 2),
            left: Math.max(Math.min(point.x - 15, width - 32), 2),
            width: 30,
            alignItems: 'center',
            backgroundColor: colors.backgroundCard,
            borderRadius: 6,
            paddingHorizontal: 4,
            paddingVertical: 2,
          }}
        >
          <Text
            style={[
              styles.valueText,
              {
                color: color,
                fontSize: 9,
                fontWeight: '900',
              },
            ]}
          >
            {point.value.toFixed(1)}
          </Text>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  emptyContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 10,
    fontWeight: '600',
  },
  valueText: {
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});
