import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText, G } from 'react-native-svg';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface RadarData {
  force: number;      // 0-100
  cardio: number;     // 0-100
  technique: number;  // 0-100
  souplesse: number;  // 0-100
  mental: number;     // 0-100
}

interface PerformanceRadarProps {
  data: RadarData;
  size?: number;
}

export const PerformanceRadar: React.FC<PerformanceRadarProps> = ({
  data,
  size = 160,
}) => {
  const { colors } = useTheme();
  
  const center = size / 2;
  const radius = (size / 2) - 20;
  
  // 5 axes
  const axes = [
    { key: 'force', label: 'Force', angle: -90 },
    { key: 'cardio', label: 'Cardio', angle: -18 },
    { key: 'souplesse', label: 'Souplesse', angle: 54 },
    { key: 'mental', label: 'Mental', angle: 126 },
    { key: 'technique', label: 'Technique', angle: 198 },
  ];

  // Convertir angle en coordonnées
  const angleToCoord = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  // Points du polygone de données
  const dataPoints = axes.map((axis) => {
    const value = data[axis.key as keyof RadarData] || 0;
    const r = (value / 100) * radius;
    return angleToCoord(axis.angle, r);
  });

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Grille (3 niveaux)
  const gridLevels = [0.33, 0.66, 1];

  return (
    <TouchableOpacity 
      style={[styles.container, { backgroundColor: colors.backgroundCard }]}
      onPress={() => router.push('/stats')}
      activeOpacity={0.8}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textMuted }]}>RADAR PERFORMANCE</Text>
        <ChevronRight size={14} color={colors.textMuted} />
      </View>

      <View style={styles.radarContainer}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          {/* Grilles concentriques */}
          {gridLevels.map((level, i) => {
            const points = axes.map((axis) => {
              const coord = angleToCoord(axis.angle, radius * level);
              return `${coord.x},${coord.y}`;
            }).join(' ');
            return (
              <Polygon
                key={i}
                points={points}
                fill="none"
                stroke={colors.border}
                strokeWidth={1}
                opacity={0.5}
              />
            );
          })}

          {/* Lignes des axes */}
          {axes.map((axis, i) => {
            const end = angleToCoord(axis.angle, radius);
            return (
              <Line
                key={i}
                x1={center}
                y1={center}
                x2={end.x}
                y2={end.y}
                stroke={colors.border}
                strokeWidth={1}
                opacity={0.5}
              />
            );
          })}

          {/* Polygone de données */}
          <Polygon
            points={dataPolygon}
            fill={colors.accent}
            fillOpacity={0.3}
            stroke={colors.accent}
            strokeWidth={2}
          />

          {/* Points sur les axes */}
          {dataPoints.map((point, i) => (
            <Circle
              key={i}
              cx={point.x}
              cy={point.y}
              r={4}
              fill={colors.accent}
            />
          ))}
        </Svg>

        {/* Labels */}
        {axes.map((axis, i) => {
          const labelDist = radius + 16;
          const coord = angleToCoord(axis.angle, labelDist);
          const value = data[axis.key as keyof RadarData] || 0;
          
          return (
            <View
              key={i}
              style={[
                styles.label,
                {
                  left: coord.x - 30,
                  top: coord.y - 10,
                },
              ]}
            >
              <Text style={[styles.labelText, { color: colors.textMuted }]}>{axis.label}</Text>
              <Text style={[styles.labelValue, { color: value >= 50 ? colors.accent : colors.textMuted }]}>
                {Math.round(value)}%
              </Text>
            </View>
          );
        })}
      </View>

      {/* Score moyen */}
      <View style={styles.footer}>
        <Text style={[styles.avgLabel, { color: colors.textMuted }]}>Score moyen</Text>
        <Text style={[styles.avgValue, { color: colors.accent }]}>
          {Math.round((data.force + data.cardio + data.technique + data.souplesse + data.mental) / 5)}%
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    height: 180,
  },
  label: {
    position: 'absolute',
    width: 60,
    alignItems: 'center',
  },
  labelText: {
    fontSize: 9,
    fontWeight: '600',
  },
  labelValue: {
    fontSize: 10,
    fontWeight: '800',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  avgLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  avgValue: {
    fontSize: 16,
    fontWeight: '900',
  },
});

export default PerformanceRadar;

