import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Activity, Zap } from 'lucide-react-native';
import { scale, getGridColumns } from '@/constants/responsive';

const { width: screenWidth } = Dimensions.get('window');
// paddingHorizontal 16*2 = 32, gaps entre cartes = 8 * (colonnes - 1)
const columns = getGridColumns(); // 2 sur iPhone, 3 sur iPad
const CARD_SIZE = (screenWidth - 32 - 8 * (columns - 1)) / columns;

type RiskLevel = 'safe' | 'moderate' | 'high' | 'danger' | 'leger' | 'modere' | 'optimal' | 'eleve';

interface ChargeLottieCardProps {
  level?: RiskLevel;
  totalLoad?: number;
  maxLoad?: number;
  sessions?: number;
}

// Composant éclair animé - VERSION COMPATIBLE EXPO GO
const AnimatedZap: React.FC<{ color: string; speed: number; size: number }> = ({ color, speed, size }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const scaleAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: speed / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: speed / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    const opacityAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.6,
          duration: speed / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: speed / 2,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );

    scaleAnimation.start();
    opacityAnimation.start();

    return () => {
      scaleAnimation.stop();
      opacityAnimation.stop();
    };
  }, [speed]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity: opacityAnim }}>
      <Zap size={size} color={color} fill={color} />
    </Animated.View>
  );
};

export const ChargeLottieCard = React.memo<ChargeLottieCardProps>(({
  level = 'optimal',
  totalLoad = 0,
  maxLoad = 2000,
  sessions = 0
}) => {
  const { colors } = useTheme();
  
  // Animations
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const waveAnim = useRef(new Animated.Value(0)).current;

  // Mapper les valeurs
  const normalizeLevel = (lvl: RiskLevel): string => {
    const mapping: Record<string, string> = {
      'safe': 'leger',
      'moderate': 'modere',
      'high': 'eleve',
      'danger': 'danger',
      'leger': 'leger',
      'modere': 'modere',
      'optimal': 'optimal',
      'eleve': 'eleve'
    };
    return mapping[lvl] || 'optimal';
  };

  const normalizedLevel = normalizeLevel(level);

  // Configuration par niveau - Éclair animé pour tous
  const configs: Record<string, {
    label: string;
    color: string;
    description: string;
    pulseSpeed: number;
  }> = {
    leger: {
      label: 'Léger',
      color: '#0EA5E9',
      description: 'Repos actif',
      pulseSpeed: 1000,
    },
    modere: {
      label: 'Modéré',
      color: '#10B981',
      description: 'Bonne récup',
      pulseSpeed: 700,
    },
    optimal: {
      label: 'Optimal',
      color: '#10B981',
      description: 'Zone idéale',
      pulseSpeed: 700,
    },
    eleve: {
      label: 'Élevé',
      color: '#F59E0B',
      description: 'Attention fatigue',
      pulseSpeed: 500,
    },
    danger: {
      label: 'Danger',
      color: '#EF4444',
      description: 'Risque blessure',
      pulseSpeed: 300,
    },
  };

  const config = configs[normalizedLevel] || configs.optimal;
  const percentage = maxLoad > 0 ? Math.min((totalLoad / maxLoad) * 100, 100) : 0;

  useEffect(() => {
    // Pulse animation (comme un cœur)
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: config.pulseSpeed / 2,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: config.pulseSpeed / 2,
          easing: Easing.in(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();
    
    // Wave animation
    const wave = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    wave.start();
    
    return () => {
      pulse.stop();
      wave.stop();
    };
  }, [config.pulseSpeed]);

  // OPTIMISATION: Mémoiser l'interpolation
  const waveOpacity = useMemo(() => waveAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.6],
  }), [waveAnim]);

  return (
    <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
      {/* Header - SANS emoji coeur */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Activity size={12} color={config.color} />
          <Text style={[styles.title, { color: config.color }]}>CHARGE</Text>
        </View>
        <Zap size={14} color={config.color} />
      </View>

      {/* Zone animation - Cercle pulsant */}
      <View style={styles.animationContainer}>
        {/* Onde pulsante */}
        <Animated.View style={[
          styles.wave,
          { borderColor: config.color, opacity: waveOpacity }
        ]} />
        
        {/* Cercle central pulsant */}
        <Animated.View style={[
          styles.centerCircle,
          {
            backgroundColor: config.color,
            transform: [{ scale: pulseAnim }],
          }
        ]}>
          <AnimatedZap color="#FFFFFF" speed={config.pulseSpeed} size={28} />
        </Animated.View>
        
        {/* Barre de progression circulaire simplifiée */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressBg, { borderColor: config.color + '20' }]} />
          <View style={[
            styles.progressFill,
            {
              borderColor: config.color,
              borderTopColor: 'transparent',
              borderRightColor: 'transparent',
              transform: [{ rotate: `${(percentage / 100) * 180}deg` }],
            }
          ]} />
        </View>
      </View>

      {/* Niveau et description */}
      <View style={styles.valueContainer}>
        <Text style={[styles.level, { color: config.color }]}>
          {config.label}
        </Text>
        <Text style={[styles.description, { color: colors.textMuted }]}>
          {config.description}
        </Text>
      </View>

      {/* Footer - Sessions */}
      <View style={[styles.footer, { backgroundColor: config.color + '15' }]}>
        <Zap size={10} color={config.color} />
        <Text style={[styles.sessions, { color: config.color }]}>
          {sessions} séances/sem
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: CARD_SIZE,
    height: CARD_SIZE,
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 10,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  title: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1,
  },
  animationContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  wave: {
    position: 'absolute',
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
  },
  centerCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  progressContainer: {
    position: 'absolute',
    width: 65,
    height: 65,
  },
  progressBg: {
    position: 'absolute',
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 3,
  },
  progressFill: {
    position: 'absolute',
    width: 65,
    height: 65,
    borderRadius: 32.5,
    borderWidth: 3,
  },
  valueContainer: {
    alignItems: 'center',
    gap: 2,
    zIndex: 10,
  },
  level: {
    fontSize: 24,
    fontWeight: '900',
  },
  description: {
    fontSize: 11,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    zIndex: 10,
  },
  sessions: {
    fontSize: 10,
    fontWeight: '600',
  },
});
