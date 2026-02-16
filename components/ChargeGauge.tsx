import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Path, Circle, G, Defs, LinearGradient, Stop, Line } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

interface ChargeGaugeProps {
  totalLoad: number;
  maxLoad?: number; // Défaut 2000
  riskLevel: 'safe' | 'moderate' | 'high' | 'danger';
  size?: number;
}

export const ChargeGauge: React.FC<ChargeGaugeProps> = ({
  totalLoad,
  maxLoad = 2000,
  riskLevel,
  size = 100,
}) => {
  const { colors } = useTheme();
  const needleAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [glowOpacity, setGlowOpacity] = useState(0);

  const progress = Math.min(100, (totalLoad / maxLoad) * 100);
  const isOptimal = riskLevel === 'safe' || riskLevel === 'moderate';
  const isOverload = riskLevel === 'danger' || riskLevel === 'high';

  useEffect(() => {
    // Animation aiguille avec spring
    Animated.spring(needleAnim, {
      toValue: progress / 100,
      tension: 40,
      friction: 8,
      useNativeDriver: false, // REQUIS: utilisé pour calculer rotation aiguille via listener
    }).start();

    // Listener pour mettre à jour le state
    const listener = needleAnim.addListener(({ value }) => {
      setAnimatedProgress(value);
    });

    // Animation brillance si optimal
    if (isOptimal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: false, // REQUIS: utilisé pour interpoler opacity (pourrait être true mais gardé false pour cohérence)
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: false, // REQUIS: utilisé pour interpoler opacity (pourrait être true mais gardé false pour cohérence)
          }),
        ])
      ).start();

      const glowListener = glowAnim.addListener(({ value }) => {
        setGlowOpacity(value * 0.3);
      });

      return () => {
        needleAnim.removeListener(listener);
        glowAnim.removeListener(glowListener);
      };
    }

    return () => {
      needleAnim.removeListener(listener);
    };
  }, [progress, isOptimal, isOverload]);

  const radius = size * 0.4;
  const centerX = size / 2;
  const centerY = size * 0.7;
  const startAngle = Math.PI; // 180° (gauche)
  const endAngle = 0; // 0° (droite)
  const angleRange = Math.PI; // 180°

  const getColor = () => {
    switch (riskLevel) {
      case 'safe': return '#10B981';
      case 'moderate': return '#F59E0B';
      case 'high': return '#F97316';
      case 'danger': return '#EF4444';
      default: return colors.accent;
    }
  };

  const color = getColor();
  const bgColor = `${color}20`;

  // Calculer position aiguille avec progression animée
  const currentAngle = startAngle + (animatedProgress * angleRange);
  const needleX = centerX + radius * Math.cos(currentAngle);
  const needleY = centerY + radius * Math.sin(currentAngle);

  // Créer l'arc de jauge (180°)
  const createArc = (start: number, end: number) => {
    const x1 = centerX + radius * Math.cos(start);
    const y1 = centerY + radius * Math.sin(start);
    const x2 = centerX + radius * Math.cos(end);
    const y2 = centerY + radius * Math.sin(end);
    const largeArc = end - start > Math.PI ? 1 : 0;
    return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z`;
  };

  const gaugeArc = createArc(startAngle, endAngle);
  const progressArc = createArc(startAngle, startAngle + (animatedProgress * angleRange));

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <Defs>
          <LinearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={color} stopOpacity="1" />
          </LinearGradient>
        </Defs>
        
        {/* Arc de fond */}
        <Path
          d={gaugeArc}
          fill={bgColor}
        />
        
        {/* Arc de progression */}
        <Path
          d={progressArc}
          fill="url(#gaugeGradient)"
        />
        
        {/* Aiguille */}
        <G>
          <Line
            x1={centerX}
            y1={centerY}
            x2={needleX}
            y2={needleY}
            stroke={color}
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Circle cx={centerX} cy={centerY} r="4" fill={color} />
        </G>
        
        {/* Effet brillance si optimal */}
        {isOptimal && (
          <Path
            d={progressArc}
            fill="rgba(255,255,255,0.3)"
            opacity={glowOpacity}
          />
        )}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

