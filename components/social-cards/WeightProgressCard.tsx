import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, Dimensions, ImageBackground } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Defs, LinearGradient as SvgGradient, Stop, Circle, Line, Text as SvgText } from 'react-native-svg';
import { Scale, TrendingDown, TrendingUp, Target, Minus } from 'lucide-react-native';
import { WeightProgressStats } from '@/lib/social-cards/useWeightProgress';
import { SocialCardTopBanner, SocialCardFooter, SocialCardWatermark } from './SocialCardBranding';

// ============================================
// WEIGHT PROGRESS CARD V2 - Progression Poids
// Design épuré avec graphique SVG élégant
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH - 40;
const GRAPH_WIDTH = CARD_WIDTH - 48;
const GRAPH_HEIGHT = 140; // Plus de place pour les dates en bas

export interface WeightProgressCardProps {
  stats: WeightProgressStats;
  format: 'stories' | 'square';
  backgroundImage?: string;
  username?: string;
  period?: '7' | '30' | '90' | 'all'; // Période sélectionnée (visuel seulement)
}

export const WeightProgressCard = React.memo(forwardRef<View, WeightProgressCardProps>(
  ({ stats, format, backgroundImage, period = '30' }, ref) => {
    const isStories = format === 'stories';
    const cardHeight = isStories ? CARD_WIDTH * (16 / 9) : CARD_WIDTH;

    // Couleur selon perte/gain
    const getChangeColor = (change: number) => {
      if (change < 0) return '#10B981'; // Vert = perte
      if (change > 0) return '#EF4444'; // Rouge = gain
      return '#FFFFFF';
    };

    const periodLabels: Record<string, string> = {
      '7': '7 jours',
      '30': '30 jours',
      '90': '90 jours',
      'all': 'Tout',
    };

    // Générer le graphique SVG
    const renderGraph = () => {
      const history = stats.recentHistory || [];
      if (history.length < 2) {
        return (
          <View style={styles.graphPlaceholder}>
            <Text style={styles.graphPlaceholderText}>Pas assez de données</Text>
          </View>
        );
      }

      const weights = history.map(h => h.weight);
      const minWeight = Math.min(...weights) - 0.5;
      const maxWeight = Math.max(...weights) + 0.5;
      const range = maxWeight - minWeight || 1;

      const padding = { top: 20, bottom: 40, left: 35, right: 15 }; // Plus de place en bas pour les dates
      const chartWidth = GRAPH_WIDTH - padding.left - padding.right;
      const chartHeight = GRAPH_HEIGHT - padding.top - padding.bottom;

      // Formater une date en "DD/MM"
      const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        return `${day}/${month}`;
      };

      // Créer les points du graphique avec dates
      const points = history.map((entry, index) => {
        const x = padding.left + (index / (history.length - 1)) * chartWidth;
        const y = padding.top + (1 - (entry.weight - minWeight) / range) * chartHeight;
        return { x, y, weight: entry.weight, date: entry.date };
      });

      // Sélectionner les dates à afficher (première, milieu, dernière)
      const datesToShow = [
        { index: 0, ...points[0] },
        { index: Math.floor(points.length / 2), ...points[Math.floor(points.length / 2)] },
        { index: points.length - 1, ...points[points.length - 1] },
      ];

      // Créer le path de la ligne
      const linePath = points.reduce((path, point, index) => {
        if (index === 0) return `M ${point.x} ${point.y}`;

        // Courbe de Bezier pour lisser
        const prevPoint = points[index - 1];
        const cpX = (prevPoint.x + point.x) / 2;
        return `${path} Q ${cpX} ${prevPoint.y} ${point.x} ${point.y}`;
      }, '');

      // Créer le path pour l'aire remplie
      const areaPath = `${linePath} L ${points[points.length - 1].x} ${GRAPH_HEIGHT - padding.bottom} L ${padding.left} ${GRAPH_HEIGHT - padding.bottom} Z`;

      // Lignes horizontales
      const gridLines = [0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const y = padding.top + ratio * chartHeight;
        const weight = maxWeight - ratio * range;
        return { y, weight };
      });

      return (
        <View style={styles.graphContainer}>
          <Svg width={GRAPH_WIDTH} height={GRAPH_HEIGHT}>
            <Defs>
              <SvgGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0%" stopColor="#D4AF37" stopOpacity="0.4" />
                <Stop offset="100%" stopColor="#D4AF37" stopOpacity="0.05" />
              </SvgGradient>
              <SvgGradient id="lineGradient" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0%" stopColor="#D4AF37" />
                <Stop offset="100%" stopColor="#F4E5B0" />
              </SvgGradient>
            </Defs>

            {/* Lignes de grille */}
            {gridLines.map((line, index) => (
              <React.Fragment key={index}>
                <Line
                  x1={padding.left}
                  y1={line.y}
                  x2={GRAPH_WIDTH - padding.right}
                  y2={line.y}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth={1}
                  strokeDasharray="4,4"
                />
                <SvgText
                  x={padding.left - 5}
                  y={line.y + 4}
                  fill="rgba(255,255,255,0.5)"
                  fontSize={9}
                  fontWeight="600"
                  textAnchor="end"
                >
                  {line.weight.toFixed(1)}
                </SvgText>
              </React.Fragment>
            ))}

            {/* Aire remplie */}
            <Path d={areaPath} fill="url(#areaGradient)" />

            {/* Ligne principale */}
            <Path
              d={linePath}
              fill="none"
              stroke="url(#lineGradient)"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Points */}
            {points.map((point, index) => (
              <Circle
                key={index}
                cx={point.x}
                cy={point.y}
                r={index === points.length - 1 ? 6 : 3}
                fill={index === points.length - 1 ? '#D4AF37' : 'rgba(255,255,255,0.8)'}
                stroke={index === points.length - 1 ? '#FFFFFF' : 'transparent'}
                strokeWidth={2}
              />
            ))}

            {/* Valeur actuelle */}
            <SvgText
              x={points[points.length - 1].x}
              y={points[points.length - 1].y - 12}
              fill="#D4AF37"
              fontSize={11}
              fontWeight="900"
              textAnchor="middle"
            >
              {stats.currentWeight} kg
            </SvgText>

            {/* Dates sur l'axe X */}
            {datesToShow.map((point, idx) => (
              <SvgText
                key={`date-${idx}`}
                x={point.x}
                y={GRAPH_HEIGHT - 8}
                fill="rgba(255,255,255,0.6)"
                fontSize={9}
                fontWeight="600"
                textAnchor={idx === 0 ? 'start' : idx === datesToShow.length - 1 ? 'end' : 'middle'}
              >
                {formatDate(point.date)}
              </SvgText>
            ))}

            {/* Ligne de base X */}
            <Line
              x1={padding.left}
              y1={GRAPH_HEIGHT - padding.bottom}
              x2={GRAPH_WIDTH - padding.right}
              y2={GRAPH_HEIGHT - padding.bottom}
              stroke="rgba(255,255,255,0.2)"
              strokeWidth={1}
            />
          </Svg>

          {/* Label période */}
          <View style={styles.periodBadge}>
            <Text style={styles.periodText}>{periodLabels[period]}</Text>
          </View>
        </View>
      );
    };

    const content = (
      <>
        <LinearGradient
          colors={['rgba(0,0,0,0.85)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.9)']}
          style={styles.overlay}
        >
          {/* TOP BANNER - YOROI */}
          <SocialCardTopBanner variant="dark" />

          {/* TITRE */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <Scale size={20} color="#D4AF37" />
              <Text style={styles.titleText}>PROGRESSION POIDS</Text>
            </View>
          </View>

          {/* HERO: Poids perdu/pris */}
          <View style={styles.counterSection}>
            <View style={styles.counterRow}>
              {stats.totalLost > 0 ? (
                <TrendingDown size={32} color="#10B981" />
              ) : stats.totalLost < 0 ? (
                <TrendingUp size={32} color="#EF4444" />
              ) : (
                <Minus size={32} color="#FFFFFF" />
              )}
              <Text style={[styles.counterNumber, { color: getChangeColor(-stats.totalLost) }]}>
                {stats.totalLost > 0 ? '-' : stats.totalLost < 0 ? '+' : ''}
                {Math.abs(stats.totalLost).toFixed(1)}
              </Text>
              <Text style={styles.counterUnit}>kg</Text>
            </View>
            <Text style={styles.counterLabel}>
              {stats.totalLost > 0 ? 'PERDUS' : stats.totalLost < 0 ? 'PRIS' : 'STABLE'}
            </Text>
            {/* Message de fierté */}
            <View style={styles.proudBadge}>
              <Text style={styles.proudText}>I'M PROUD!!</Text>
            </View>
          </View>

          {/* GRAPHIQUE */}
          {renderGraph()}

          {/* BARRE DE PROGRESSION VERS OBJECTIF */}
          {stats.targetWeight && stats.targetWeight !== stats.currentWeight && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressLabel}>
                  Objectif: {stats.targetWeight} kg
                </Text>
                <Text style={styles.progressPercent}>{Math.round(stats.progressPercent)}%</Text>
              </View>
              <View style={styles.progressBarBg}>
                <LinearGradient
                  colors={['#10B981', '#22C55E', '#4ADE80']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressBarFill, { width: `${Math.min(stats.progressPercent, 100)}%` }]}
                />
              </View>
              <View style={styles.progressLabels}>
                <Text style={styles.progressWeight}>{stats.startWeight} kg</Text>
                <Target size={14} color="#D4AF37" />
                <Text style={[styles.progressWeight, { color: '#D4AF37' }]}>{stats.targetWeight} kg</Text>
              </View>
            </View>
          )}

          {/* STATS SECONDAIRES */}
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.currentWeight}</Text>
              <Text style={styles.statLabel}>ACTUEL</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                {stats.weeklyChange < 0 ? (
                  <TrendingDown size={14} color="#10B981" />
                ) : stats.weeklyChange > 0 ? (
                  <TrendingUp size={14} color="#EF4444" />
                ) : null}
                <Text style={[styles.statValue, { color: getChangeColor(stats.weeklyChange) }]}>
                  {stats.weeklyChange > 0 ? '+' : ''}{stats.weeklyChange.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.statLabel}>7 JOURS</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <View style={styles.statValueRow}>
                {stats.monthlyChange < 0 ? (
                  <TrendingDown size={14} color="#10B981" />
                ) : stats.monthlyChange > 0 ? (
                  <TrendingUp size={14} color="#EF4444" />
                ) : null}
                <Text style={[styles.statValue, { color: getChangeColor(stats.monthlyChange) }]}>
                  {stats.monthlyChange > 0 ? '+' : ''}{stats.monthlyChange.toFixed(1)}
                </Text>
              </View>
              <Text style={styles.statLabel}>30 JOURS</Text>
            </View>
          </View>

          {/* FOOTER - YOROI */}
          <SocialCardFooter variant="dark" />
        </LinearGradient>
      </>
    );

    return (
      <View
        ref={ref}
        style={[styles.container, { width: CARD_WIDTH, height: cardHeight }]}
        collapsable={false}
      >
        {backgroundImage ? (
          <ImageBackground
            source={{ uri: backgroundImage }}
            style={styles.backgroundImage}
            resizeMode="contain"
          >
            {content}
          </ImageBackground>
        ) : (
          <LinearGradient
            colors={['#0a0a0a', '#1a1a2e', '#0f0f1a']}
            style={styles.defaultBackground}
          >
            <SocialCardWatermark show={!backgroundImage} />
            {content}
          </LinearGradient>
        )}
      </View>
    );
  }
));

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  defaultBackground: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
  },

  // Title
  titleSection: {
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#D4AF37',
  },

  // Counter
  counterSection: {
    alignItems: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  counterNumber: {
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: -2,
    textShadowColor: 'rgba(0, 0, 0, 0.9)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
  },
  counterUnit: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  counterLabel: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 2,
    color: '#D4AF37',
    marginTop: -4,
  },
  proudBadge: {
    marginTop: 12,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#D4AF37',
  },
  proudText: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#D4AF37',
  },

  // Graph
  graphContainer: {
    marginHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    position: 'relative',
  },
  graphPlaceholder: {
    height: GRAPH_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
  },
  graphPlaceholderText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.4)',
  },
  periodBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(212, 175, 55, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(212, 175, 55, 0.4)',
  },
  periodText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D4AF37',
  },

  // Progress
  progressSection: {
    paddingHorizontal: 24,
    gap: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },
  progressPercent: {
    fontSize: 12,
    fontWeight: '800',
    color: '#10B981',
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressWeight: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.6)',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.5,
  },
});

export default WeightProgressCard;
