// ============================================
// RADAR CHART - Spider chart pour vue globale des performances
// Affiche plusieurs dimensions (Discipline, Performance, Vitalité, etc.)
// ============================================

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import Svg, { Polygon, Circle, Line, Text as SvgText } from 'react-native-svg';

interface RadarDataPoint {
  label: string;
  value: number; // 0-100
  maxValue?: number;
}

interface RadarChartProps {
  data: RadarDataPoint[];
  size?: number;
  color?: string;
}

export const RadarChart: React.FC<RadarChartProps> = ({
  data,
  size = 280,
  color = '#8B5CF6',
}) => {
  const { colors } = useTheme();

  if (!data || data.length === 0) {
    return null;
  }

  const center = size / 2;
  const radius = size / 2 - 60; // Marge pour les labels
  const numberOfPoints = data.length;

  // Calculer les coordonnées des points du radar
  const getPointCoordinates = (index: number, value: number, maxRadius: number) => {
    const angle = (Math.PI * 2 * index) / numberOfPoints - Math.PI / 2;
    const distance = (value / 100) * maxRadius;
    return {
      x: center + Math.cos(angle) * distance,
      y: center + Math.sin(angle) * distance,
    };
  };

  // Créer les points du polygone pour les données
  const dataPoints = data.map((point, index) =>
    getPointCoordinates(index, point.value, radius)
  );
  const dataPolygonPoints = dataPoints.map(p => `${p.x},${p.y}`).join(' ');

  // Créer les niveaux de grille (20%, 40%, 60%, 80%, 100%)
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Grille de fond */}
        {gridLevels.map((level, levelIndex) => {
          const levelPoints = data.map((_, index) =>
            getPointCoordinates(index, level * 100, radius)
          );
          const polygonPoints = levelPoints.map(p => `${p.x},${p.y}`).join(' ');

          return (
            <Polygon
              key={levelIndex}
              points={polygonPoints}
              fill="none"
              stroke={colors.border}
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}

        {/* Axes radiaux */}
        {data.map((point, index) => {
          const endPoint = getPointCoordinates(index, 100, radius);
          return (
            <Line
              key={`axis-${index}`}
              x1={center}
              y1={center}
              x2={endPoint.x}
              y2={endPoint.y}
              stroke={colors.border}
              strokeWidth={1}
              opacity={0.3}
            />
          );
        })}

        {/* Polygone des données */}
        <Polygon
          points={dataPolygonPoints}
          fill={`${color}30`}
          stroke={color}
          strokeWidth={2.5}
        />

        {/* Points aux sommets */}
        {dataPoints.map((point, index) => (
          <Circle
            key={`point-${index}`}
            cx={point.x}
            cy={point.y}
            r={5}
            fill={color}
          />
        ))}

        {/* Labels */}
        {data.map((point, index) => {
          const labelPoint = getPointCoordinates(index, 120, radius);
          return (
            <SvgText
              key={`label-${index}`}
              x={labelPoint.x}
              y={labelPoint.y}
              fontSize={12}
              fontWeight="600"
              fill={colors.textPrimary}
              textAnchor="middle"
              alignmentBaseline="middle"
            >
              {point.label}
            </SvgText>
          );
        })}
      </Svg>

      {/* Légende avec valeurs */}
      <View style={styles.legend}>
        {data.map((point, index) => (
          <View key={index} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: color }]} />
            <Text style={[styles.legendLabel, { color: colors.textSecondary }]}>
              {point.label}
            </Text>
            <Text style={[styles.legendValue, { color: colors.textPrimary }]}>
              {point.value}/100
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  legend: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  legendValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
