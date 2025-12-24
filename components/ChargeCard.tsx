import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Activity } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

const CIRCLE_SIZE = 90;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2 - 8;
const CIRCLE_CENTER = CIRCLE_SIZE / 2;
const CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;

interface ChargeCardProps {
  totalLoad: number;
  maxLoad?: number;
  riskLevel: 'safe' | 'moderate' | 'high' | 'danger';
  onPress?: () => void;
}

export const ChargeCard: React.FC<ChargeCardProps> = ({
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
  const [animatedProgress, setAnimatedProgress] = useState(0);

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
    
    // Animation de remplissage avec spring effect
    Animated.spring(progressAnim, {
      toValue: progress / 100,
      tension: 30,
      friction: 8,
      useNativeDriver: false,
    }).start();

    // Listener pour mettre à jour le state
    const listener = progressAnim.addListener(({ value }) => {
      setAnimatedProgress(value);
    });

    // Animation de glow (pulsation douce avec easing)
    Animated.loop(
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
    ).start();

    return () => {
      progressAnim.removeListener(listener);
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

  const strokeDashoffset = CIRCUMFERENCE - (animatedProgress * CIRCUMFERENCE);

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  });
  const glowScale = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.1],
  });
  const textOpacity = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Texte selon le niveau de risque
  const getRiskText = () => {
    switch (riskLevel) {
      case 'safe':
        return 'Léger';
      case 'moderate':
        return 'Modéré';
      case 'high':
        return 'Élevé';
      case 'danger':
        return 'Danger';
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
            strokeWidth="6"
          />

          {/* Cercle de progression animé */}
          <Circle
            cx={CIRCLE_CENTER}
            cy={CIRCLE_CENTER}
            r={CIRCLE_RADIUS}
            fill="none"
            stroke="url(#chargeGradient)"
            strokeWidth="6"
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
          Charge d'entraînement
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
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
    fontSize: 28,
    fontWeight: '900',
  },
  label: {
    fontSize: 9,
    fontWeight: '600',
    marginTop: 2,
  },
  infoSection: {
    alignItems: 'center',
    gap: 2,
  },
  level: {
    fontSize: 14,
    fontWeight: '700',
  },
  explanation: {
    fontSize: 9,
    fontWeight: '600',
  },
});

