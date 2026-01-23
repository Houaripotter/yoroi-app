import React, { useEffect, useRef, useState, memo, useMemo } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Activity } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

// OPTIMISATION: Créer animated component pour SVG Circle
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

const CIRCLE_SIZE = 100;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2 - 7;
const CIRCLE_CENTER = CIRCLE_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

interface ChargeCardProps {
  totalLoad: number;
  maxLoad?: number;
  riskLevel: 'safe' | 'moderate' | 'high' | 'danger';
  onPress?: () => void;
}

const ChargeCardComponent: React.FC<ChargeCardProps> = ({
  totalLoad,
  maxLoad = 2000,
  riskLevel,
  onPress,
}) => {
  const { colors } = useTheme();
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const circleScaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const progress = Math.min(100, (totalLoad / maxLoad) * 100);

    // Animation d'entrée (fade + scale du cercle)
    Animated.parallel([
      Animated.spring(circleScaleAnim, {
        toValue: 1,
        tension: 40,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();

    // OPTIMISATION: Animation de remplissage sans listener
    // Utiliser interpolate au lieu de setState pour éviter re-renders
    Animated.spring(progressAnim, {
      toValue: progress / 100,
      tension: 30,
      friction: 8,
      useNativeDriver: false, // Requis pour SVG strokeDashoffset
    }).start();

    // Animation de glow (pulsation douce avec easing)
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    glowLoop.start();

    return () => {
      glowLoop.stop();
    };
  }, [totalLoad, maxLoad]);

  // Couleur selon le niveau de risque
  const getColors = () => {
    switch (riskLevel) {
      case 'safe':
        return { start: '#10B981', end: '#34D399' };
      case 'moderate':
        return { start: '#F59E0B', end: '#FBBF24' };
      case 'high':
        return { start: '#F97316', end: '#FB923C' };
      case 'danger':
        return { start: '#EF4444', end: '#F87171' };
      default:
        return { start: colors.accent, end: colors.accent };
    }
  };

  const { start, end } = getColors();

  // OPTIMISATION: Mémoiser les interpolations pour éviter de les recréer à chaque render
  const strokeDashoffset = useMemo(() => progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [CIRCUMFERENCE, 0],
  }), [progressAnim]);

  const glowOpacity = useMemo(() => glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  }), [glowAnim]);

  const glowScale = useMemo(() => glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  }), [glowAnim]);

  const textOpacity = useMemo(() => progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  }), [progressAnim]);

  // Texte selon le niveau de risque
  const getRiskText = () => {
    switch (riskLevel) {
      case 'safe':
        return 'Récupération';
      case 'moderate':
        return 'Équilibré';
      case 'high':
        return 'Intense';
      case 'danger':
        return 'Très intense';
      default:
        return 'Normal';
    }
  };

  const riskText = getRiskText();

  return (
    <View style={[styles.container, { backgroundColor: colors.backgroundCard }]}>
      {/* Header */}
      <View style={styles.header}>
        <Activity size={14} color={start} />
        <Text style={[styles.title, { color: colors.textMuted }]}>CHARGE</Text>
      </View>

      {/* Anneau circulaire avec glow */}
      <Animated.View style={[styles.circleContainer, {
        opacity: fadeInAnim,
        transform: [{ scale: circleScaleAnim }],
      }]}>
        {/* Glow effect (ombre portée) */}
        <Animated.View style={[styles.glow, { backgroundColor: start, opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />

        {/* SVG Circle */}
        <Svg width={CIRCLE_SIZE} height={CIRCLE_SIZE} style={styles.circle}>
          <Defs>
            <LinearGradient id="chargeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <Stop offset="0%" stopColor={start} />
              <Stop offset="100%" stopColor={end} />
            </LinearGradient>
          </Defs>

          {/* Cercle de fond */}
          <Circle
            cx={CIRCLE_CENTER}
            cy={CIRCLE_CENTER}
            r={CIRCLE_RADIUS}
            fill="none"
            stroke={`${start}20`}
            strokeWidth="5"
          />

          {/* Cercle de progression animé - OPTIMISÉ avec AnimatedCircle */}
          <AnimatedCircle
            cx={CIRCLE_CENTER}
            cy={CIRCLE_CENTER}
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="url(#chargeGradient)"
            strokeWidth="5"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${CIRCLE_CENTER} ${CIRCLE_CENTER})`}
          />
        </Svg>

        {/* Texte au centre */}
        <Animated.View style={[styles.centerText, { opacity: textOpacity }]}>
          <Text style={[styles.value, { color: start }]}>
            {Math.round(totalLoad)}
          </Text>
          <Text style={[styles.label, { color: colors.textMuted }]}>
            pts
          </Text>
        </Animated.View>
      </Animated.View>

      {/* Niveau et explication */}
      <View style={styles.infoSection}>
        <Text style={[styles.level, { color: start }]}>
          {riskText}
        </Text>
        <Text style={[styles.explanation, { color: colors.textMuted }]}>
          Charge hebdomadaire
        </Text>
        <Text style={[styles.subExplanation, { color: colors.textMuted }]}>
          Mesure ton intensité d'entraînement
        </Text>
      </View>
    </View>
  );
};

// OPTIMISATION: Mémoriser le composant pour éviter re-renders inutiles
export const ChargeCard = memo(ChargeCardComponent, (prevProps, nextProps) => {
  return prevProps.totalLoad === nextProps.totalLoad &&
         prevProps.maxLoad === nextProps.maxLoad &&
         prevProps.riskLevel === nextProps.riskLevel;
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    height: '100%',
    justifyContent: 'space-between',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  circleContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    position: 'relative',
  },
  glow: {
    position: 'absolute',
    width: CIRCLE_SIZE + 30,
    height: CIRCLE_SIZE + 30,
    borderRadius: (CIRCLE_SIZE + 30) / 2,
    opacity: 0.3,
  },
  circle: {
    position: 'relative',
  },
  centerText: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  value: {
    fontSize: 30,
    fontWeight: '900',
    letterSpacing: -1,
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  infoSection: {
    alignItems: 'center',
    gap: 3,
  },
  level: {
    fontSize: 15,
    fontWeight: '700',
  },
  explanation: {
    fontSize: 10,
    fontWeight: '600',
  },
  subExplanation: {
    fontSize: 8,
    fontWeight: '500',
    marginTop: 1,
  },
});

