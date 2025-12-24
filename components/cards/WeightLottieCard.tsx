import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Scale, TrendingDown, TrendingUp, Minus as TrendingStable, Target } from 'lucide-react-native';
import Svg, { Circle, Path, G, Line, Rect } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');
// paddingHorizontal 8*2 = 16, gap 12 = total 28
const CARD_SIZE = (screenWidth - 28) / 2;

interface WeightLottieCardProps {
  weight?: number;
  target?: number;
  trend?: 'up' | 'down' | 'stable';
  history?: number[];
}

export const WeightLottieCard: React.FC<WeightLottieCardProps> = ({
  weight = 0,
  target,
  trend = 'stable',
  history = []
}) => {
  const { colors, isDark } = useTheme();
  
  // Animations
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const numberAnim = useRef(new Animated.Value(0)).current;
  const ledFlicker = useRef(new Animated.Value(1)).current;
  
  // Animations barres en cascade
  const barAnims = useRef(
    Array(7).fill(0).map(() => new Animated.Value(0))
  ).current;
  
  useEffect(() => {
    // Animation d'entrée
    Animated.spring(scaleAnim, {
      toValue: 1,
      damping: 15,
      useNativeDriver: true,
    }).start();
    
    // Animation pulse subtil du poids
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.02,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    
    // LED flicker effect (écran digital)
    const flicker = Animated.loop(
      Animated.sequence([
        Animated.timing(ledFlicker, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.timing(ledFlicker, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.delay(3000),
      ])
    );
    flicker.start();
    
    // Animation barres en cascade
    if (history.length > 0) {
      history.slice(0, 7).forEach((_, i) => {
        Animated.timing(barAnims[i], {
          toValue: 1,
          duration: 500,
          delay: i * 80,
          easing: Easing.out(Easing.back(1.2)),
          useNativeDriver: true,
        }).start();
      });
    }
    
    return () => {
      pulse.stop();
      flicker.stop();
    };
  }, [weight, history]);

  const diff = target ? weight - target : 0;
  const trendColor = trend === 'down' ? '#10B981' : trend === 'up' ? '#EF4444' : '#6B7280';
  const TrendIcon = trend === 'down' ? TrendingDown : trend === 'up' ? TrendingUp : TrendingStable;

  // Calcul du pourcentage vers l'objectif
  const progressToGoal = target && weight > 0 ? Math.min(Math.abs(1 - (Math.abs(diff) / 10)) * 100, 100) : 0;

  // Couleur principale : Bleu Cyan adaptatif
  const primaryColor = '#06B6D4';
  // Fond écran digital adaptatif au thème
  const screenBg = isDark ? '#0F172A' : '#E0F2FE'; // Noir en sombre, bleu clair en clair

  return (
    <Animated.View style={[
      styles.card, 
      { 
        backgroundColor: colors.backgroundCard,
        transform: [{ scale: scaleAnim }],
      }
    ]}>
      {/* Header - POIDS ACTUEL */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Scale size={12} color={primaryColor} />
          <Text style={[styles.title, { color: primaryColor }]}>POIDS ACTUEL</Text>
        </View>
        <TrendIcon size={14} color={trendColor} />
      </View>

      {/* Zone animation - Balance digitale moderne */}
      <View style={styles.animationContainer}>
        {/* Écran digital LED */}
        <View style={[styles.digitalScreen, { backgroundColor: screenBg }]}>
          {/* Effet de bordure LED */}
          <View style={[styles.ledBorder, { borderColor: primaryColor }]} />

          {/* Grille de fond (effet écran) */}
          <View style={styles.screenGrid}>
            {Array(12).fill(0).map((_, i) => (
              <View key={i} style={[styles.gridLine, { backgroundColor: `${primaryColor}10` }]} />
            ))}
          </View>
          
          {/* Affichage du poids avec animation */}
          <Animated.View style={[
            styles.weightDisplayContainer,
            {
              transform: [{ scale: pulseAnim }],
              opacity: ledFlicker,
            }
          ]}>
            <Text style={[
              styles.weightValueLED,
              {
                color: primaryColor,
                textShadowColor: primaryColor,
              }
            ]}>
              {weight > 0 ? weight.toFixed(1) : '--.-'}
            </Text>
            <Text style={[styles.weightUnitLED, { color: `${primaryColor}80` }]}>kg</Text>
          </Animated.View>

          {/* Indicateur de stabilité */}
          <View style={styles.stabilityIndicator}>
            <View style={[styles.stabilityDot, { backgroundColor: weight > 0 ? primaryColor : '#6B7280' }]} />
            <Text style={[styles.stabilityText, { color: `${primaryColor}60` }]}>
              {weight > 0 ? 'STABLE' : 'ATTENTE'}
            </Text>
          </View>
        </View>
        
        {/* Plateforme de la balance */}
        <Svg width={90} height={16} viewBox="0 0 90 16" style={styles.platform}>
          <Path
            d="M 5 0 L 85 0 L 90 8 L 85 12 L 5 12 L 0 8 Z"
            fill={isDark ? '#1E293B' : '#BAE6FD'}
            stroke={primaryColor}
            strokeWidth="1"
          />
          {/* Lignes de texture */}
          <Line x1="15" y1="4" x2="75" y2="4" stroke={`${primaryColor}30`} strokeWidth="1" />
          <Line x1="10" y1="8" x2="80" y2="8" stroke={`${primaryColor}30`} strokeWidth="1" />
        </Svg>
      </View>

      {/* Mini sparkline - Evolution */}
      {history.length > 0 && (
        <View style={styles.sparklineContainer}>
          {/* Min/Max labels */}
          <View style={styles.sparklineHeader}>
            <Text style={[styles.sparkMinMax, { color: colors.textMuted }]}>
              Min {Math.min(...history.slice(0, 7)).toFixed(1)}
            </Text>
            <Text style={[styles.sparkMinMax, { color: colors.textMuted }]}>
              Max {Math.max(...history.slice(0, 7)).toFixed(1)}
            </Text>
          </View>

          {/* Graphique avec jours */}
          <View style={styles.sparklineChart}>
            {history.slice(0, 7).reverse().map((w, i) => {
              const maxW = Math.max(...history.slice(0, 7));
              const minW = Math.min(...history.slice(0, 7));
              const range = maxW - minW || 1;
              const height = ((w - minW) / range) * 24 + 6;
              const isLast = i === 0; // Premier élément après reverse = dernier jour

              // Jours de la semaine - Lundi = 0, Dimanche = 6
              const days = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
              const today = new Date();
              // getDay() : Dimanche=0, Lundi=1, etc. On convertit pour que Lundi=0
              const todayIndex = (today.getDay() + 6) % 7; // Lundi=0, Mardi=1, ..., Dimanche=6
              const dayIndex = (todayIndex - (6 - i) + 7) % 7;

              return (
                <View key={i} style={styles.barColumn}>
                  {/* Poids au-dessus de CHAQUE barre */}
                  <Text style={[styles.barValue, { color: isLast ? primaryColor : colors.textMuted }]}>
                    {w.toFixed(1)}
                  </Text>

                  {/* Barre */}
                  <Animated.View
                    style={[
                      styles.sparkBar,
                      {
                        height,
                        backgroundColor: isLast ? primaryColor : `${primaryColor}50`,
                        opacity: barAnims[6 - i],
                        transform: [{
                          scaleY: barAnims[6 - i],
                        }],
                      }
                    ]}
                  />

                  {/* Jour de la semaine */}
                  <Text style={[
                    styles.dayLabel,
                    { color: isLast ? primaryColor : colors.textMuted }
                  ]}>
                    {days[dayIndex]}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
      )}

      {/* Footer - Objectif */}
      {target && (
        <View style={styles.footer}>
          <Target size={16} color="#EF4444" strokeWidth={2.5} />
          <Text style={[styles.targetValue, { color: colors.textPrimary }]}>
            Objectif : {target} kg
          </Text>
          {diff !== 0 && (
            <View style={[styles.diffBadge, { backgroundColor: trendColor + '20' }]}>
              <Text style={[styles.diff, { color: trendColor }]}>
                {diff > 0 ? '+' : ''}{diff.toFixed(1)}
              </Text>
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    padding: 10,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 2,
  },
  digitalScreen: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    padding: 5,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  ledBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 8,
    borderWidth: 1,
  },
  screenGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  gridLine: {
    width: 1,
    height: '100%',
  },
  weightDisplayContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  weightValueLED: {
    fontSize: 24,
    fontWeight: '900',
    fontVariant: ['tabular-nums'],
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 8,
    letterSpacing: 1,
  },
  weightUnitLED: {
    fontSize: 11,
    fontWeight: '700',
  },
  stabilityIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  stabilityDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  stabilityText: {
    fontSize: 6,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  platform: {
    marginTop: 4,
  },
  sparklineContainer: {
    marginTop: 8,
    gap: 4,
  },
  sparklineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  sparkMinMax: {
    fontSize: 7,
    fontWeight: '700',
  },
  sparklineChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 2,
    height: 50,
  },
  barColumn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  barValue: {
    fontSize: 7,
    fontWeight: '700',
    marginBottom: 2,
    minHeight: 11,
  },
  sparkBar: {
    width: '100%',
    maxWidth: 12,
    borderRadius: 3,
    minHeight: 6,
  },
  dayLabel: {
    fontSize: 8,
    fontWeight: '600',
    marginTop: 3,
  },
  sparkline: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 20,
  },
  sparkLabel: {
    fontSize: 8,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  targetValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  diffBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
  },
  diff: {
    fontSize: 9,
    fontWeight: '700',
  },
});
