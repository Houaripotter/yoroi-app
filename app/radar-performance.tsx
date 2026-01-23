// ============================================
// YOROI - RADAR DE PERFORMANCE (Analyse Athlète)
// ============================================
// Design moderne avec labels bien positionnés

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Animated,
  Linking,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Polygon, Line, Circle, Text as SvgText, Defs, RadialGradient, Stop } from 'react-native-svg';
import { ArrowLeft, TrendingUp, TrendingDown, Minus, Moon, Droplet, Flame, BarChart3, Target, Lightbulb, BookOpen, Dumbbell, Heart, Brain, Trophy, GraduationCap, ChevronRight } from 'lucide-react-native';
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

export default function RadarPerformanceScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const [scores, setScores] = useState<RadarScores>({ force: 0, cardio: 0, technique: 0, souplesse: 0, mental: 0 });
  const [evolution, setEvolution] = useState<RadarEvolution | null>(null);
  const [insight, setInsight] = useState<RadarInsight | null>(null);

  // Animations pour chaque axe
  const anims = {
    force: useRef(new Animated.Value(0)).current,
    cardio: useRef(new Animated.Value(0)).current,
    technique: useRef(new Animated.Value(0)).current,
    souplesse: useRef(new Animated.Value(0)).current,
    mental: useRef(new Animated.Value(0)).current,
  };

  // Configuration du radar
  const RADAR_SIZE = 400;
  const CENTER = RADAR_SIZE / 2;
  const RADIUS = 70;

  // 5 axes équidistants (72° entre chaque)
  const axes = [
    { key: 'force', label: 'Force', angle: -90, color: '#EF4444', Icon: Flame },
    { key: 'cardio', label: 'Cardio', angle: -18, color: '#3B82F6', Icon: Heart },
    { key: 'souplesse', label: 'Souplesse', angle: 54, color: '#8B5CF6', Icon: Target },
    { key: 'mental', label: 'Mental', angle: 126, color: '#10B981', Icon: Brain },
    { key: 'technique', label: 'Technique', angle: 198, color: '#F59E0B', Icon: Trophy },
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const radarScores = await calculateRadarScores('week');
    const radarEvolution = await calculateRadarEvolution();
    const radarInsight = getRadarInsight(radarScores);

    setScores(radarScores);
    setEvolution(radarEvolution);
    setInsight(radarInsight);

    // Animer chaque axe avec spring effect
    axes.forEach((axis) => {
      const animValue = anims[axis.key as keyof typeof anims];
      const scoreValue = radarScores[axis.key as keyof RadarScores] || 0;

      if (animValue) {
        Animated.spring(animValue, {
          toValue: scoreValue,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }).start();
      }
    });
  };

  const angleToCoord = (angle: number, distance: number) => {
    const rad = (angle * Math.PI) / 180;
    return {
      x: CENTER + distance * Math.cos(rad),
      y: CENTER + distance * Math.sin(rad),
    };
  };

  // Points de données animés
  const dataPoints = axes.map((axis) => {
    const value = (anims[axis.key as keyof typeof anims] as any).__getValue();
    const r = (value / 100) * RADIUS;
    return angleToCoord(axis.angle, r);
  });

  const dataPolygon = dataPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // Positions des labels DANS le SVG
  const getLabelTextPosition = (index: number) => {
    const labelDist = RADIUS + 80;
    const axis = axes[index];
    const coord = angleToCoord(axis.angle, labelDist);

    // Anchor text basé sur la position
    let textAnchor: 'start' | 'middle' | 'end' = 'middle';
    let dy = 0;

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
      textAnchor = 'end';
      dy = 10;
    } else if (index === 4) { // Technique (top-left)
      textAnchor = 'end';
      dy = -5;
    }

    return { x: coord.x, y: coord.y, textAnchor, dy };
  };
  const avgScore = Math.round((
    (scores.force || 0) +
    (scores.cardio || 0) +
    (scores.technique || 0) +
    (scores.souplesse || 0) +
    (scores.mental || 0)
  ) / 5) || 0;

  const TrendIcon = evolution && evolution.average > 5 ? TrendingUp : evolution && evolution.average < -5 ? TrendingDown : Minus;
  const trendColor = evolution && evolution.average > 5 ? '#10B981' : evolution && evolution.average < -5 ? '#EF4444' : colors.textMuted;

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Performance</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* Score global */}
        <View style={[styles.scoreCard, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.scoreLabel, { color: colors.textMuted }]}>Score Global</Text>
          <Text style={[styles.scoreValue, { color: colors.accent }]}>{avgScore}%</Text>
          {evolution && evolution.average !== 0 && (
            <View style={[styles.evolutionBadge, { backgroundColor: trendColor + '15' }]}>
              <TrendIcon size={14} color={trendColor} />
              <Text style={[styles.evolutionText, { color: trendColor }]}>
                {evolution.average > 0 ? '+' : ''}{evolution.average}% vs sem.
              </Text>
            </View>
          )}
        </View>

        {/* Comment ça marche - Explications */}
        <View style={[styles.howItWorksCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.howItWorksHeader}>
            <Lightbulb size={20} color={colors.accent} />
            <Text style={[styles.howItWorksTitle, { color: colors.textPrimary }]}>
              Comment c'est calculé ?
            </Text>
          </View>

          <Text style={[styles.howItWorksIntro, { color: colors.textSecondary }]}>
            Ton radar est calculé automatiquement à partir de tes données dans l'app :
          </Text>

          <View style={styles.howItWorksList}>
            <View style={styles.howItWorksItem}>
              <View style={[styles.howItWorksBullet, { backgroundColor: '#EF4444' + '20' }]}>
                <Flame size={14} color="#EF4444" />
              </View>
              <Text style={[styles.howItWorksText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Force</Text> : % de tes séances qui sont des entraînements de force (musculation, crossfit, etc.)
              </Text>
            </View>

            <View style={styles.howItWorksItem}>
              <View style={[styles.howItWorksBullet, { backgroundColor: '#3B82F6' + '20' }]}>
                <Heart size={14} color="#3B82F6" />
              </View>
              <Text style={[styles.howItWorksText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Cardio</Text> : % de tes séances qui sont des entraînements cardio (running, boxe, etc.)
              </Text>
            </View>

            <View style={styles.howItWorksItem}>
              <View style={[styles.howItWorksBullet, { backgroundColor: '#8B5CF6' + '20' }]}>
                <Target size={14} color="#8B5CF6" />
              </View>
              <Text style={[styles.howItWorksText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Souplesse</Text> : % de tes séances qui sont du yoga, stretching ou mobilité
              </Text>
            </View>

            <View style={styles.howItWorksItem}>
              <View style={[styles.howItWorksBullet, { backgroundColor: '#10B981' + '20' }]}>
                <Brain size={14} color="#10B981" />
              </View>
              <Text style={[styles.howItWorksText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Mental</Text> : Ta régularité et constance d'entraînement (streak sur 21 jours)
              </Text>
            </View>

            <View style={styles.howItWorksItem}>
              <View style={[styles.howItWorksBullet, { backgroundColor: '#F59E0B' + '20' }]}>
                <Trophy size={14} color="#F59E0B" />
              </View>
              <Text style={[styles.howItWorksText, { color: colors.textSecondary }]}>
                <Text style={{ fontWeight: '700', color: colors.textPrimary }}>Technique</Text> : Moyenne de tes auto-évaluations techniques après chaque séance
              </Text>
            </View>
          </View>

          <View style={[styles.howItWorksFooter, { backgroundColor: colors.backgroundElevated }]}>
            <Text style={[styles.howItWorksFooterText, { color: colors.textMuted }]}>
              Pas besoin d'Apple Watch ! Toutes ces données peuvent être enregistrées manuellement dans l'app.
            </Text>
          </View>
        </View>

        {/* Radar Chart */}
        <View style={[styles.radarCard, { backgroundColor: colors.backgroundCard }]}>
          <View style={styles.radarContainer}>
            <Svg width={RADAR_SIZE} height={RADAR_SIZE} viewBox={`0 0 ${RADAR_SIZE} ${RADAR_SIZE}`}>
              <Defs>
                <RadialGradient id="bgGradient" cx="50%" cy="50%" r="50%">
                  <Stop offset="0%" stopColor={colors.accent} stopOpacity="0.08" />
                  <Stop offset="70%" stopColor={colors.accent} stopOpacity="0.03" />
                  <Stop offset="100%" stopColor={colors.accent} stopOpacity="0" />
                </RadialGradient>
              </Defs>

              {/* Fond avec dégradé radial */}
              <Circle
                cx={CENTER}
                cy={CENTER}
                r={RADIUS + 85}
                fill="url(#bgGradient)"
              />

              {/* Grilles de fond */}
              {[0.2, 0.4, 0.6, 0.8, 1].map((level, i) => {
                const points = axes.map((axis) => {
                  const coord = angleToCoord(axis.angle, RADIUS * level);
                  return `${coord.x},${coord.y}`;
                }).join(' ');
                return (
                  <Polygon
                    key={i}
                    points={points}
                    fill="none"
                    stroke={colors.border}
                    strokeWidth={i === 4 ? 2 : 1}
                    opacity={i === 4 ? 0.4 : 0.15}
                  />
                );
              })}

              {/* Axes */}
              {axes.map((axis, i) => {
                const end = angleToCoord(axis.angle, RADIUS);
                return (
                  <Line
                    key={i}
                    x1={CENTER}
                    y1={CENTER}
                    x2={end.x}
                    y2={end.y}
                    stroke={colors.border}
                    strokeWidth={1}
                    opacity={0.2}
                  />
                );
              })}

              {/* Polygon de données */}
              <Polygon
                points={dataPolygon}
                fill={colors.accent}
                fillOpacity={0.15}
                stroke={colors.accent}
                strokeWidth={2}
              />

              {/* Points de données */}
              {dataPoints.map((point, i) => (
                <Circle key={i} cx={point.x} cy={point.y} r={4} fill={colors.accent} />
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
                      fill={value >= 60 ? axis.color : colors.textMuted}
                      fontSize="13"
                      fontWeight="900"
                      textAnchor={pos.textAnchor}
                    >
                      {Math.round(value)}%
                    </SvgText>
                  </React.Fragment>
                );
              })}
            </Svg>
          </View>
        </View>

        {/* Insight */}
        {insight && (
          <View style={[styles.insightCard, { backgroundColor: colors.accent + '10' }]}>
            <View style={[styles.insightIcon, { backgroundColor: colors.accent + '20' }]}>
              {insight.icon === 'moon' ? <Moon size={20} color={colors.accent} /> :
               insight.icon === 'droplet' ? <Droplet size={20} color={colors.accent} /> :
               insight.icon === 'flame' ? <Flame size={20} color={colors.accent} /> :
               insight.icon === 'dumbbell' ? <Dumbbell size={20} color={colors.accent} /> :
               insight.icon === 'heart' ? <Heart size={20} color={colors.accent} /> :
               insight.icon === 'brain' ? <Brain size={20} color={colors.accent} /> :
               insight.icon === 'target' ? <Target size={20} color={colors.accent} /> :
               insight.icon === 'trophy' ? <Trophy size={20} color={colors.accent} /> :
               <Lightbulb size={20} color={colors.accent} />}
            </View>
            <View style={styles.insightContent}>
              <Text style={[styles.insightText, { color: colors.textPrimary }]}>{insight.text}</Text>
              {insight.source && (
                <Text style={[styles.insightSource, { color: colors.textMuted }]}>{insight.source}</Text>
              )}
            </View>
          </View>
        )}

        {/* Détails par axe */}
        <View style={styles.detailsSection}>
          <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Détails</Text>

          {axes.map((axis, i) => {
            const value = scores[axis.key as keyof RadarScores] || 0;
            const ref = RADAR_REFERENCES[axis.key as keyof typeof RADAR_REFERENCES];
            const IconComponent = axis.Icon;

            return (
              <View key={i} style={[styles.detailCard, { backgroundColor: colors.backgroundCard }]}>
                <View style={styles.detailHeader}>
                  <View style={styles.detailLeft}>
                    <View style={[styles.detailIcon, { backgroundColor: axis.color + '20' }]}>
                      <IconComponent size={18} color={axis.color} />
                    </View>
                    <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>{axis.label}</Text>
                  </View>
                  <Text style={[styles.detailValue, { color: value >= 60 ? axis.color : colors.textMuted }]}>
                    {Math.round(value)}%
                  </Text>
                </View>

                {/* Barre de progression */}
                <View style={[styles.progressBar, { backgroundColor: colors.border + '30' }]}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${value}%`,
                        backgroundColor: value >= 70 ? '#10B981' : value >= 40 ? '#F59E0B' : '#EF4444',
                      },
                    ]}
                  />
                </View>

                <Text style={[styles.detailDesc, { color: colors.textSecondary }]}>{ref.description}</Text>
              </View>
            );
          })}
        </View>

        {/* Bouton Revues Scientifiques */}
        <TouchableOpacity
          style={[styles.scientificButton, { backgroundColor: colors.backgroundCard }]}
          onPress={() => router.push('/scientific-sources')}
          activeOpacity={0.7}
        >
          <View style={styles.scientificLeft}>
            <View style={[styles.scientificIcon, { backgroundColor: colors.accent + '20' }]}>
              <GraduationCap size={22} color={colors.accent} />
            </View>
            <View style={styles.scientificContent}>
              <Text style={[styles.scientificTitle, { color: colors.textPrimary }]}>
                Revues Scientifiques
              </Text>
              <Text style={[styles.scientificDesc, { color: colors.textMuted }]}>
                Voir toutes les sources et références
              </Text>
            </View>
          </View>
          <ChevronRight size={20} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  scoreCard: {
    padding: 28,
    borderRadius: 20,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  scoreLabel: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scoreValue: {
    fontSize: 56,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: -2,
  },
  evolutionBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  evolutionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  howItWorksCard: {
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  howItWorksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  howItWorksTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  howItWorksIntro: {
    fontSize: 13,
    lineHeight: 19,
  },
  howItWorksList: {
    gap: 12,
  },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  howItWorksBullet: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  howItWorksText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
  },
  howItWorksFooter: {
    padding: 12,
    borderRadius: 10,
    marginTop: 4,
  },
  howItWorksFooterText: {
    fontSize: 12,
    lineHeight: 17,
    textAlign: 'center',
  },
  radarCard: {
    padding: 24,
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  radarContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  insightCard: {
    flexDirection: 'row',
    padding: 20,
    borderRadius: 18,
    gap: 14,
    alignItems: 'flex-start',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  insightIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightEmoji: {
    fontSize: 24,
  },
  insightContent: {
    flex: 1,
    gap: 8,
  },
  insightText: {
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  insightSource: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 17,
  },
  detailsSection: {
    gap: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '900',
    marginBottom: 12,
    letterSpacing: -0.5,
  },
  detailCard: {
    padding: 18,
    borderRadius: 16,
    gap: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailTitle: {
    fontSize: 15,
    fontWeight: '800',
    flex: 1,
  },
  detailValue: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  progressBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 5,
  },
  detailDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  scientificButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  scientificLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  scientificIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scientificContent: {
    flex: 1,
    gap: 4,
  },
  scientificTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  scientificDesc: {
    fontSize: 12,
  },
});
