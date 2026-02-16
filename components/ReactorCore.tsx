import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Line, G, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

const AnimatedView = Animated.View;

interface ReactorCoreProps {
  totalLoad: number;
  maxLoad?: number;
  riskLevel: 'safe' | 'moderate' | 'high' | 'danger';
  size?: number;
  label?: string;
}

export const ReactorCore: React.FC<ReactorCoreProps> = ({
  totalLoad,
  maxLoad = 2000,
  riskLevel,
  size = 100,
  label = 'POINTS',
}) => {
  const { colors } = useTheme();

  const isOverload = riskLevel === 'danger' || riskLevel === 'high';
  const progress = Math.min(100, (totalLoad / maxLoad) * 100);

  const totalSegments = 40;
  const activeSegments = Math.ceil((progress / 100) * totalSegments);

  // Animated values
  const pulseScale = useRef(new Animated.Value(1)).current;
  const glowOpacity = useRef(new Animated.Value(0.2)).current;

  // Couleurs
  const getColor = () => {
    switch (riskLevel) {
      case 'safe':
        return '#10B981';
      case 'moderate':
        return '#F59E0B';
      case 'high':
        return '#F97316';
      case 'danger':
        return '#EF4444';
      default:
        return colors.accent;
    }
  };

  const coreColor = getColor();

  useEffect(() => {
    let pulseAnimation: Animated.CompositeAnimation | null = null;
    let glowAnimation: Animated.CompositeAnimation | null = null;

    if (isOverload) {
      // Pulsation
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, {
            toValue: 1.15,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      // Glow
      glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowOpacity, {
            toValue: 0.8,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      glowAnimation.start();
    } else {
      Animated.timing(pulseScale, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();

      Animated.timing(glowOpacity, {
        toValue: 0.2,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }

    return () => {
      if (pulseAnimation) {
        pulseAnimation.stop();
      }
      if (glowAnimation) {
        glowAnimation.stop();
      }
    };
  }, [isOverload]);

  // Générer les segments
  const radius = size * 0.4;
  const centerX = size / 2;
  const centerY = size / 2;

  const renderSegments = () => {
    return Array.from({ length: totalSegments }).map((_, index) => {
      const angle = (index / totalSegments) * Math.PI * 2 - Math.PI / 2;
      const innerRadius = radius - 10;
      const outerRadius = radius + 3;

      const x1 = centerX + Math.cos(angle) * innerRadius;
      const y1 = centerY + Math.sin(angle) * innerRadius;
      const x2 = centerX + Math.cos(angle) * outerRadius;
      const y2 = centerY + Math.sin(angle) * outerRadius;

      const isActive = index < activeSegments;

      return (
        <Line
          key={index}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={coreColor}
          strokeWidth="4" // SEGMENTS PLUS ÉPAIS
          strokeLinecap="round"
          opacity={isActive ? 1 : 0.15}
        />
      );
    });
  };

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Glow background */}
      <AnimatedView
        style={[
          styles.glowContainer,
          {
            width: size,
            height: size,
            backgroundColor: coreColor,
            borderRadius: size / 2,
            opacity: glowOpacity,
          },
        ]}
      />

      {/* Anneau segmenté */}
      <AnimatedView style={{ transform: [{ scale: pulseScale }] }}>
        <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <Defs>
            <RadialGradient id="coreGradient" cx="50%" cy="50%">
              <Stop offset="0%" stopColor={coreColor} stopOpacity="0.3" />
              <Stop offset="100%" stopColor={coreColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Cercle de fond */}
          <Circle cx={centerX} cy={centerY} r={radius - 5} fill="url(#coreGradient)" />

          {/* Segments */}
          <G>{renderSegments()}</G>

          {/* Cercle central */}
          <Circle
            cx={centerX}
            cy={centerY}
            r={radius * 0.5}
            fill="rgba(0,0,0,0.4)"
            stroke={coreColor}
            strokeWidth="2"
            opacity={0.8}
          />
        </Svg>

        {/* Valeur centrale BLANCHE pour contraste */}
        <View style={styles.centerValue}>
          <Text style={[styles.loadValue, { color: '#FFFFFF' }]}>{Math.round(totalLoad)}</Text>
          <Text style={[styles.loadLabel, { color: '#E5E7EB' }]}>{label}</Text>
        </View>
      </AnimatedView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  glowContainer: {
    position: 'absolute',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 5,
  },
  centerValue: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -18 }],
  },
  loadValue: {
    fontSize: 24,
    fontWeight: '900',
    fontFamily: 'monospace',
    letterSpacing: -1,
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  loadLabel: {
    fontSize: 9,
    fontWeight: '700',
    fontFamily: 'monospace',
    letterSpacing: 1,
    marginTop: -2,
  },
});
