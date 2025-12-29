import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Svg, { Circle, Path, G } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';

interface SleepCircleProps {
  duration: number; // minutes
  goal: number; // minutes (défaut 480 = 8h)
  debtHours: number;
  size?: number;
}

export const SleepCircle: React.FC<SleepCircleProps> = ({
  duration,
  goal,
  debtHours,
  size = 80,
}) => {
  const { colors } = useTheme();
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const isCritical = debtHours > 5;

  const radius = size / 2 - 8;
  const centerX = size / 2;
  const centerY = size / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.min(100, (duration / goal) * 100);

  useEffect(() => {
    // Animation de remplissage
    Animated.spring(progressAnim, {
      toValue: progress / 100,
      tension: 50,
      friction: 7,
      useNativeDriver: false,
    }).start();

    // Listener pour mettre à jour le state
    const listener = progressAnim.addListener(({ value }) => {
      setAnimatedProgress(value);
    });

    // Pulsation si critique
    if (isCritical) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    }

    return () => {
      progressAnim.removeListener(listener);
    };
  }, [progress, isCritical]);

  const strokeDashoffset = circumference - (animatedProgress * circumference);

  const color = isCritical ? '#EF4444' : debtHours > 2 ? '#F59E0B' : '#8B5CF6';
  const bgColor = isCritical ? '#EF444420' : debtHours > 2 ? '#F59E0B20' : '#8B5CF620';

  return (
    <Animated.View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          transform: [{ scale: pulseAnim }],
        },
      ]}
    >
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Cercle de fond */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth="6"
        />
        
        {/* Arc de progression animé */}
        <Circle
          cx={centerX}
          cy={centerY}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          transform={`rotate(-90 ${centerX} ${centerY})`}
        />
        
        {/* Point indicateur (calculé dynamiquement) */}
        {animatedProgress > 0 && (() => {
          const indicatorAngle = -Math.PI / 2 + (animatedProgress * 2 * Math.PI);
          const indicatorX = centerX + radius * Math.cos(indicatorAngle);
          const indicatorY = centerY + radius * Math.sin(indicatorAngle);
          return (
            <Circle
              key="indicator"
              cx={indicatorX}
              cy={indicatorY}
              r="4"
              fill={color}
              stroke="#FFFFFF"
              strokeWidth="2"
            />
          );
        })()}
      </Svg>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

