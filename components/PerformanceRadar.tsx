import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Modal, ScrollView, Animated } from 'react-native';
import Svg, { Polygon, Line, Circle, G } from 'react-native-svg';
import { Info, TrendingUp, TrendingDown, Minus, X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import {
  calculateRadarScores,
  calculateRadarEvolution,
  getRadarInsight,
  RADAR_REFERENCES,
  RadarScores,
  RadarEvolution,
  RadarInsight,
} from '@/lib/radarService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PerformanceRadarProps {
  size?: number;
}

export const PerformanceRadar: React.FC<PerformanceRadarProps> = ({
  size = 170,
}) => {
  const { colors } = useTheme();
  const [scores, setScores] = useState<RadarScores>({ force: 0, cardio: 0, technique: 0, souplesse: 0, mental: 0 });
  const [evolution, setEvolution] = useState<RadarEvolution | null>(null);
  const [insight, setInsight] = useState<RadarInsight | null>(null);
  const [infoModalVisible, setInfoModalVisible] = useState(false);

  // Animations
  const forceAnim = useRef(new Animated.Value(0)).current;
  const cardioAnim = useRef(new Animated.Value(0)).current;
  const techniqueAnim = useRef(new Animated.Value(0)).current;
  const souplesseAnim = useRef(new Animated.Value(0)).current;
  const mentalAnim = useRef(new Animated.Value(0)).current;

  const center = size / 2;
  const radius = (size / 2) - 20;

  // 5 axes
  const axes = [
    { key: 'force', label: 'Force', angle: -90, anim: forceAnim },
    { key: 'cardio', label: 'Cardio', angle: -18, anim: cardioAnim },
    { key: 'souplesse', label: 'Souplesse', angle: 54, anim: souplesseAnim },
    { key: 'mental', label: 'Mental', angle: 126, anim: mentalAnim },
    { key: 'technique', label: 'Technique', angle: 198, anim: techniqueAnim },
  ];

  useEffect(() => {
    loadRadarData();
  }, []);

  const loadRadarData = async () => {
    const radarScores = await calculateRadarScores('week');
    const radarEvolution = await calculateRadarEvolution();
    const radarInsight = getRadarInsight(radarScores);

    setScores(radarScores);
    setEvolution(radarEvolution);
    setInsight(radarInsight);

    // Animer le radar de 0 à la valeur réelle (800ms)
    Animated.parallel([
      Animated.timing(forceAnim, {
        toValue: radarScores.force,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(cardioAnim, {
        toValue: radarScores.cardio,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(techniqueAnim, {
        toValue: radarScores.technique,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(souplesseAnim, {
        toValue: radarScores.souplesse,
        duration: 800,
        useNativeDriver: false,
      }),
      Animated.timing(mentalAnim, {
        toValue: radarScores.mental,
        duration: 800,
        useNativeDriver: false,
      }),
    ]).start();
  };

  // Convertir angle en coordonnées
  const angleToCoord = (angle: number, r: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: center + r * Math.cos(rad),
      y: center + r * Math.sin(rad),
    };
  };

  // Points du polygone de données (version animée)
  const dataPoints = axes.map((axis) => {
    const animatedValue = axis.anim;
    // On utilise __getValue() pour obtenir la valeur courante
    const value = (animatedValue as any).__getValue();
    const r = (value / 100) * radius;
    return angleToCoord(axis.angle, r);
  });

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Grille (3 niveaux)
  const gridLevels = [0.33, 0.66, 1];

  // Score moyen
  const avgScore = Math.round((scores.force + scores.cardio + scores.technique + scores.souplesse + scores.mental) / 5);

  // Tendance évolution moyenne
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
    <>
      <View
        style={[styles.container, { backgroundColor: colors.backgroundCard }]}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={[styles.title, { color: colors.textMuted }]}>RADAR PERFORMANCE</Text>
          </View>
          <View style={styles.headerRight}>
            {/* Bouton Info */}
            <TouchableOpacity
              onPress={() => setInfoModalVisible(true)}
              style={[styles.infoBtn, { backgroundColor: colors.accent + '20' }]}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Info size={12} color={colors.accent} />
            </TouchableOpacity>
          </View>
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
                  opacity={0.3}
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
                  opacity={0.3}
                />
              );
            })}

            {/* Polygone de données avec remplissage semi-transparent */}
            <Polygon
              points={dataPolygon}
              fill={colors.accent}
              fillOpacity={0.25}
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
            const labelDist = radius + 18;
            const coord = angleToCoord(axis.angle, labelDist);
            const value = scores[axis.key as keyof RadarScores] || 0;

            // Ajustement de position selon l'angle pour centrer les labels
            let adjustLeft = -30; // Par défaut (centré)
            let adjustTop = -18;

            // Haut (Force)
            if (axis.angle === -90) {
              adjustLeft = -30;
              adjustTop = -30;
            }
            // Haut droite (Cardio)
            else if (axis.angle === -18) {
              adjustLeft = -5;
              adjustTop = -25;
            }
            // Bas droite (Souplesse)
            else if (axis.angle === 54) {
              adjustLeft = 0;
              adjustTop = -5;
            }
            // Bas gauche (Mental)
            else if (axis.angle === 126) {
              adjustLeft = -60;
              adjustTop = -5;
            }
            // Haut gauche (Technique)
            else if (axis.angle === 198) {
              adjustLeft = -60;
              adjustTop = -25;
            }

            return (
              <View
                key={i}
                style={[
                  styles.label,
                  {
                    left: coord.x + adjustLeft,
                    top: coord.y + adjustTop,
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

        {/* Score moyen avec évolution */}
        <View style={styles.footer}>
          <View style={styles.scoreContainer}>
            <Text style={[styles.avgValue, { color: colors.accent }]}>
              {avgScore}%
            </Text>
            <Text style={[styles.avgLabel, { color: colors.textMuted }]}>Score Global</Text>
          </View>
          {evolution && evolution.average !== 0 && (
            <View style={[styles.evolutionBadge, { backgroundColor: trendColor + '15' }]}>
              <TrendIcon size={10} color={trendColor} />
              <Text style={[styles.evolutionText, { color: trendColor }]}>
                {evolution.average > 0 ? '+' : ''}{evolution.average}% vs sem.
              </Text>
            </View>
          )}
        </View>

        {/* Insight personnalisé */}
        {insight && (
          <View style={[styles.insightCard, { backgroundColor: colors.accent + '10' }]}>
            <Text style={styles.insightIcon}>{insight.icon}</Text>
            <View style={styles.insightContent}>
              <Text style={[styles.insightText, { color: colors.textPrimary }]}>{insight.text}</Text>
              {insight.source && (
                <Text style={[styles.insightSource, { color: colors.textMuted }]}>📚 {insight.source}</Text>
              )}
            </View>
          </View>
        )}
      </View>

      {/* Modal Info - Références scientifiques */}
      <Modal
        visible={infoModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setInfoModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.backgroundCard }]}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {RADAR_REFERENCES.intro.title}
                </Text>
                <TouchableOpacity onPress={() => setInfoModalVisible(false)}>
                  <X size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <Text style={[styles.modalIntro, { color: colors.textSecondary }]}>
                {RADAR_REFERENCES.intro.description}
              </Text>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Force */}
              <View style={styles.refSection}>
                <Text style={[styles.refTitle, { color: colors.textPrimary }]}>
                  {RADAR_REFERENCES.force.title}
                </Text>
                <Text style={[styles.refDesc, { color: colors.textSecondary }]}>
                  {RADAR_REFERENCES.force.description}
                </Text>
                <Text style={[styles.refSource, { color: colors.textMuted }]}>
                  {RADAR_REFERENCES.force.reference}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Cardio */}
              <View style={styles.refSection}>
                <Text style={[styles.refTitle, { color: colors.textPrimary }]}>
                  {RADAR_REFERENCES.cardio.title}
                </Text>
                <Text style={[styles.refDesc, { color: colors.textSecondary }]}>
                  {RADAR_REFERENCES.cardio.description}
                </Text>
                <Text style={[styles.refSource, { color: colors.textMuted }]}>
                  {RADAR_REFERENCES.cardio.reference}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Mental */}
              <View style={styles.refSection}>
                <Text style={[styles.refTitle, { color: colors.textPrimary }]}>
                  {RADAR_REFERENCES.mental.title}
                </Text>
                <Text style={[styles.refDesc, { color: colors.textSecondary }]}>
                  {RADAR_REFERENCES.mental.description}
                </Text>
                <Text style={[styles.refSource, { color: colors.textMuted }]}>
                  {RADAR_REFERENCES.mental.reference}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Technique */}
              <View style={styles.refSection}>
                <Text style={[styles.refTitle, { color: colors.textPrimary }]}>
                  {RADAR_REFERENCES.technique.title}
                </Text>
                <Text style={[styles.refDesc, { color: colors.textSecondary }]}>
                  {RADAR_REFERENCES.technique.description}
                </Text>
                <Text style={[styles.refSource, { color: colors.textMuted }]}>
                  {RADAR_REFERENCES.technique.reference}
                </Text>
              </View>

              <View style={[styles.divider, { backgroundColor: colors.border }]} />

              {/* Souplesse */}
              <View style={styles.refSection}>
                <Text style={[styles.refTitle, { color: colors.textPrimary }]}>
                  {RADAR_REFERENCES.souplesse.title}
                </Text>
                <Text style={[styles.refDesc, { color: colors.textSecondary }]}>
                  {RADAR_REFERENCES.souplesse.description}
                </Text>
                <Text style={[styles.refSource, { color: colors.textMuted }]}>
                  {RADAR_REFERENCES.souplesse.reference}
                </Text>
              </View>

              {/* Bouton J'ai compris */}
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: colors.accent }]}
                onPress={() => setInfoModalVisible(false)}
              >
                <Text style={styles.modalBtnText}>✓ J'ai compris</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
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
    height: 200,
    marginVertical: 8,
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
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  avgLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  avgValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  evolutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  evolutionText: {
    fontSize: 10,
    fontWeight: '700',
  },
  insightCard: {
    flexDirection: 'row',
    padding: 10,
    borderRadius: 10,
    gap: 8,
    alignItems: 'flex-start',
  },
  insightIcon: {
    fontSize: 18,
  },
  insightContent: {
    flex: 1,
    gap: 4,
  },
  insightText: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 16,
  },
  insightSource: {
    fontSize: 9,
    fontStyle: 'italic',
    lineHeight: 13,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 16,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalIntro: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginVertical: 16,
  },
  refSection: {
    gap: 8,
  },
  refTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  refDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  refSource: {
    fontSize: 11,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  modalBtn: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default PerformanceRadar;
