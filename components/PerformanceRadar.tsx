import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import Svg, { Polygon, Line, Circle, Defs, RadialGradient, Stop, Text as SvgText } from 'react-native-svg';
import { Info, TrendingUp, TrendingDown, Minus } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { router } from 'expo-router';
import {
  calculateRadarScores,
  calculateRadarEvolution,
  RadarScores,
  RadarEvolution,
} from '@/lib/radarService';

interface PerformanceRadarProps {
  size?: number;
}

export const PerformanceRadar: React.FC<PerformanceRadarProps> = ({
  size = 300,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const [scores, setScores] = useState<RadarScores>({ force: 0, cardio: 0, technique: 0, souplesse: 0, mental: 0 });
  const [evolution, setEvolution] = useState<RadarEvolution | null>(null);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const CENTER = size / 2;
  const RADIUS = 70;

  // Couleurs par axe
  const axisColors = {
    force: '#EF4444',      // Rouge
    cardio: '#3B82F6',     // Bleu
    technique: '#F59E0B',  // Orange
    souplesse: '#8B5CF6',  // Violet
    mental: '#10B981',     // Vert
  };

  // 5 axes équidistants (72° entre chaque, commençant en haut à -90°)
  const axes = [
    { key: 'force', label: t('radar.strength'), angle: -90, color: axisColors.force },
    { key: 'cardio', label: t('radar.cardio'), angle: -18, color: axisColors.cardio },
    { key: 'souplesse', label: t('radar.flexibility'), angle: 54, color: axisColors.souplesse },
    { key: 'mental', label: t('radar.mental'), angle: 126, color: axisColors.mental },
    { key: 'technique', label: t('radar.technique'), angle: 198, color: axisColors.technique },
  ];

  useEffect(() => {
    loadRadarData();
  }, []);

  const loadRadarData = async () => {
    const radarScores = await calculateRadarScores('week');
    const radarEvolution = await calculateRadarEvolution();

    setScores(radarScores);
    setEvolution(radarEvolution);

    // Animation fade in
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  };

  // Convertir angle en coordonnées
  const angleToCoord = (angle: number, distance: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: CENTER + distance * Math.cos(rad),
      y: CENTER + distance * Math.sin(rad),
    };
  };

  // Points du polygone de données
  const dataPoints = axes.map((axis) => {
    const value = scores[axis.key as keyof RadarScores] || 0;
    const r = (value / 100) * RADIUS;
    return { ...angleToCoord(axis.angle, r), value, color: axis.color };
  });

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Positions des labels DANS le SVG
  const getLabelTextPosition = (index: number) => {
    const labelDist = RADIUS + 40;
    const axis = axes[index];
    const coord = angleToCoord(axis.angle, labelDist);

    // Anchor text basé sur la position
    let textAnchor: 'start' | 'middle' | 'end' = 'middle';
    let dy = 0;
    let offsetX = 0;

    if (index === 0) { // Force (top)
      textAnchor = 'middle';
      dy = -22;
    } else if (index === 1) { // Cardio (top-right)
      textAnchor = 'start';
      dy = -5;
    } else if (index === 2) { // Souplesse (bottom-right)
      textAnchor = 'start';
      dy = 10;
    } else if (index === 3) { // Mental (bottom-left)
      textAnchor = 'start';
      dy = 10;
      offsetX = -50;
    } else if (index === 4) { // Technique (top-left)
      textAnchor = 'start';
      dy = -5;
      offsetX = -55;
    }

    return { x: coord.x + offsetX, y: coord.y, textAnchor, dy };
  };

  // Score moyen
  const avgScore = Math.round((
    (scores.force || 0) +
    (scores.cardio || 0) +
    (scores.technique || 0) +
    (scores.souplesse || 0) +
    (scores.mental || 0)
  ) / 5) || 0;

  // Tendance
  const TrendIcon = evolution && evolution.average > 5
    ? TrendingUp
    : evolution && evolution.average < -5
    ? TrendingDown
    : Minus;
  const trendColor = evolution && evolution.average > 5
    ? '#10B981'
    : evolution && evolution.average < -5
    ? '#EF4444'
    : colors.textMuted;

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.backgroundCard }]}
      onPress={() => router.push('/radar-performance')}
      activeOpacity={0.8}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textMuted }]}>{t('radar.title')}</Text>
        <View style={[styles.infoBtn, { backgroundColor: colors.accent + '20' }]}>
          <Info size={12} color={colors.accentText} />
        </View>
      </View>

      {/* Radar SVG */}
      <Animated.View style={[styles.radarContainer, { opacity: fadeAnim }]}>
        <Svg width={size + 60} height={size + 30} viewBox={`-40 -30 ${size + 80} ${size + 30}`}>
          <Defs>
            <RadialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.08" />
              <Stop offset="70%" stopColor={colors.accent} stopOpacity="0.03" />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="radarGradient" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={colors.accent} stopOpacity="0.05" />
            </RadialGradient>
          </Defs>

          {/* Fond avec dégradé radial */}
          <Circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS + 85}
            fill="url(#bgGradient)"
          />

          {/* Grilles concentriques (25%, 50%, 75%, 100%) */}
          {[0.25, 0.5, 0.75, 1].map((level, i) => {
            const points = axes.map((axis) => {
              const coord = angleToCoord(axis.angle, RADIUS * level);
              return `${coord.x},${coord.y}`;
            }).join(' ');
            return (
              <React.Fragment key={i}>
                <Polygon
                  points={points}
                  fill="none"
                  stroke={colors.border}
                  strokeWidth={i === 3 ? 2 : 1}
                  opacity={i === 3 ? 0.4 : 0.2}
                />
                {/* Labels de pourcentage sur les cercles */}
                {i > 0 && (
                  <SvgText
                    x={CENTER}
                    y={CENTER - RADIUS * level + 3}
                    fill={colors.textMuted}
                    fontSize="8"
                    fontWeight="600"
                    textAnchor="middle"
                    opacity={0.5}
                  >
                    {level * 100} %
                  </SvgText>
                )}
              </React.Fragment>
            );
          })}

          {/* Lignes des axes avec couleurs */}
          {axes.map((axis, i) => {
            const end = angleToCoord(axis.angle, RADIUS);
            return (
              <Line
                key={i}
                x1={CENTER}
                y1={CENTER}
                x2={end.x}
                y2={end.y}
                stroke={axis.color}
                strokeWidth={1}
                opacity={0.3}
              />
            );
          })}

          {/* Polygone de données avec gradient */}
          <Polygon
            points={dataPolygon}
            fill="url(#radarGradient)"
            stroke={colors.accent}
            strokeWidth={2}
            strokeLinejoin="round"
          />

          {/* Points colorés par axe */}
          {dataPoints.map((point, i) => (
            <React.Fragment key={i}>
              {/* Cercle extérieur blanc */}
              <Circle
                cx={point.x}
                cy={point.y}
                r={4}
                fill="#FFFFFF"
                opacity={0.95}
              />
              {/* Cercle intérieur avec couleur de l'axe */}
              <Circle
                cx={point.x}
                cy={point.y}
                r={3}
                fill={point.color}
              />
            </React.Fragment>
          ))}
          {/* Labels DANS le SVG */}
          {axes.map((axis, i) => {
            const value = scores[axis.key as keyof RadarScores] || 0;
            const pos = getLabelTextPosition(i);

            return (
              <React.Fragment key={`label-${i}`}>
                {/* Nom de l'axe */}
                <SvgText
                  x={pos.x}
                  y={pos.y + pos.dy}
                  fill={axis.color}
                  fontSize="10"
                  fontWeight="700"
                  textAnchor={pos.textAnchor}
                >
                  {axis.label}
                </SvgText>
                {/* Valeur */}
                <SvgText
                  x={pos.x}
                  y={pos.y + pos.dy + 14}
                  fill={axis.color}
                  fontSize="13"
                  fontWeight="900"
                  textAnchor={pos.textAnchor}
                >
                  {`${Math.round(value)}  %`}
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </Animated.View>

      {/* Score global */}
      <View style={styles.footer}>
        <View style={styles.scoreContainer}>
          <Text style={[styles.avgValue, { color: isDark ? colors.accent : '#000000', fontWeight: '800' }]}>
            {avgScore}  %
          </Text>
          <Text style={[styles.avgLabel, { color: colors.textMuted }]}>{t('radar.globalScore')}</Text>
        </View>
        {evolution && evolution.average !== 0 && (
          <View style={[styles.evolutionBadge, { backgroundColor: trendColor + '15' }]}>
            <TrendIcon size={12} color={trendColor} />
            <Text style={[styles.evolutionText, { color: trendColor }]}>
              {evolution.average > 0 ? '+' : ''}{evolution.average} %
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  infoBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginTop: 12,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  avgLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  avgValue: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -1,
  },
  evolutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  evolutionText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export default PerformanceRadar;
