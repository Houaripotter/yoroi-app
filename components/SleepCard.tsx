import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { Moon } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

interface SleepCardProps {
  duration: number; // minutes
  goal: number; // minutes (défaut 480 = 8h)
  debtHours: number;
  onPress?: () => void;
}

export const SleepCard: React.FC<SleepCardProps> = ({
  duration,
  goal,
  debtHours,
  onPress,
}) => {
  const { colors } = useTheme();

  // Animation de respiration (courbe qui monte et descend)
  const breathAnim = useRef(new Animated.Value(0)).current;
  const fadeInAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const scoreBarAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation d'entrée (fade + scale)
    Animated.parallel([
      Animated.timing(fadeInAnim, {
        toValue: 1,
        duration: 600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
    ]).start();

    // Courbe de respiration (infinie, lente avec easing naturel)
    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathAnim, {
          toValue: 1,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(breathAnim, {
          toValue: 0,
          duration: 3500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    breathAnimation.start();

    // Animation de la barre de score
    const sleepScore = Math.min(Math.round((duration / goal) * 100), 100);
    Animated.timing(scoreBarAnim, {
      toValue: sleepScore / 100,
      duration: 800,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();

    return () => {
      breathAnimation.stop();
    };
  }, [duration, goal]);

  // Style animé pour la courbe
  const breathTranslateY = breathAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-5, 5],
  });

  // Style d'entrée
  const containerStyle = {
    opacity: fadeInAnim,
    transform: [{ scale: scaleAnim }],
  };

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  // Format: "8h30" ou "8h" si pas de minutes
  const formatDuration = () => {
    if (hours === 0 && minutes === 0) return '0h';
    if (minutes === 0) return `${hours}h`;
    return `${hours}h${minutes.toString().padStart(2, '0')}`;
  };

  // Calcul du score et de la qualité
  const sleepScore = Math.min(Math.round((duration / goal) * 100), 100);

  // Calculer la qualité de sommeil (simple basé sur la durée)
  const quality = duration >= goal ? 100 : sleepScore;

  // Couleur selon le score
  const getColor = () => {
    if (sleepScore >= 80) return '#4CAF50'; // Vert
    if (sleepScore >= 50) return '#F59E0B'; // Orange
    return '#EF4444'; // Rouge
  };

  // Message selon le score
  const getMessage = () => {
    if (hours === 0) return 'Pas de données';
    if (sleepScore >= 80) return 'Excellent !';
    if (sleepScore >= 60) return 'Correct';
    if (sleepScore >= 40) return 'Insuffisant';
    return 'Critique';
  };

  const scoreColor = getColor();
  const message = getMessage();

  const scoreBarWidth = scoreBarAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <Animated.View style={[styles.container, { backgroundColor: colors.backgroundCard }, containerStyle]}>
      {/* Fond animé avec respiration */}
      <Animated.View style={[styles.background, {
        backgroundColor: `${scoreColor}15`,
        transform: [{ scale: breathAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.05],
        }) }],
      }]} />

      {/* Contenu */}
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <Moon size={14} color="#8B5CF6" />
          <Text style={[styles.title, { color: colors.textMuted }]}>SOMMEIL</Text>
        </View>

        {/* Heures dormies */}
        <View style={styles.mainInfo}>
          <Text style={[styles.hours, { color: colors.textPrimary }]}>
            {formatDuration()}
          </Text>
          <Text style={[styles.message, { color: scoreColor }]}>{message}</Text>
        </View>

        {/* Barre de score */}
        <View style={styles.scoreBarContainer}>
          <View style={[styles.scoreBar, { backgroundColor: colors.border }]}>
            <Animated.View
              style={[
                styles.scoreFill,
                { width: scoreBarWidth, backgroundColor: scoreColor }
              ]}
            />
          </View>
        </View>

        {/* Dette de sommeil */}
        {debtHours > 0 && (
          <Text style={[styles.debt, { color: debtHours > 5 ? '#EF4444' : '#F59E0B' }]}>
            Dette: {debtHours}h
          </Text>
        )}

        {/* Mini stats */}
        <View style={styles.stats}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{quality}%</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Qualité</Text>
          </View>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.textPrimary }]}>{sleepScore}%</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Score</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    height: '100%',
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  content: {
    flex: 1,
    padding: 16,
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
  mainInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 4,
  },
  hours: {
    fontSize: 36,
    fontWeight: '900',
  },
  message: {
    fontSize: 12,
    fontWeight: '600',
  },
  scoreBarContainer: {
    marginVertical: 8,
  },
  scoreBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 2,
  },
  debt: {
    fontSize: 10,
    fontWeight: '600',
    marginBottom: 4,
  },
  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 12,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '600',
  },
});

