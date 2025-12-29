import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Text as SvgText, G } from 'react-native-svg';

const AnimatedG = Animated.createAnimatedComponent(G);

interface SleepWaveProps {
  duration: number;
  goal: number;
  debtHours: number;
  width?: number;
  height?: number;
}

export const SleepWave: React.FC<SleepWaveProps> = ({
  duration,
  goal,
  debtHours,
  width = Dimensions.get('window').width / 2 - 20,
  height = 120,
}) => {
  const isCritical = debtHours > 5;
  const isModerate = debtHours > 2;

  // Animated values pour les ZzZ
  const zzz1Opacity = useRef(new Animated.Value(0)).current;
  const zzz2Opacity = useRef(new Animated.Value(0)).current;
  const zzz3Opacity = useRef(new Animated.Value(0)).current;
  const zzz4Opacity = useRef(new Animated.Value(0)).current;

  const zzz1Y = useRef(new Animated.Value(0)).current;
  const zzz2Y = useRef(new Animated.Value(0)).current;
  const zzz3Y = useRef(new Animated.Value(0)).current;
  const zzz4Y = useRef(new Animated.Value(0)).current;

  // Paramètres
  const waveAmplitude = isCritical ? 10 : isModerate ? 7 : 5;
  const waveFrequency = isCritical ? 0.03 : isModerate ? 0.025 : 0.02;

  // Couleurs
  const gradientStart = isCritical ? '#7C3AED' : '#8B5CF6';
  const gradientMid = isCritical ? '#6D28D9' : '#7C3AED';
  const gradientEnd = isCritical ? '#4C1D95' : '#5B21B6';

  useEffect(() => {
    // Animations des ZzZ
    const createZzzAnimation = (opacityAnim: Animated.Value, yAnim: Animated.Value, delay: number) => {
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: 0.9,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(yAnim, {
              toValue: -50,
              duration: 3000,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(opacityAnim, {
              toValue: 0,
              duration: 400,
              useNativeDriver: true,
            }),
          ]),
          Animated.timing(yAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      ).start();
    };

    createZzzAnimation(zzz1Opacity, zzz1Y, 0);
    createZzzAnimation(zzz2Opacity, zzz2Y, 700);
    createZzzAnimation(zzz3Opacity, zzz3Y, 1400);
    createZzzAnimation(zzz4Opacity, zzz4Y, 2100);
  }, [debtHours]);

  // Générer l'onde (33% de hauteur, en bas)
  const generateWavePath = () => {
    const path = [];
    const points = 50;
    const waveHeight = height * 0.33; // Seulement 33% de la carte
    const baseY = height - waveHeight; // Commence au tiers inférieur

    for (let i = 0; i <= points; i++) {
      const x = (i / points) * width;
      const y = baseY + Math.sin(x * waveFrequency) * waveAmplitude + waveHeight / 2;

      if (i === 0) {
        path.push(`M ${x} ${y}`);
      } else {
        path.push(`L ${x} ${y}`);
      }
    }

    // Fermer le path en bas
    path.push(`L ${width} ${height}`);
    path.push(`L 0 ${height}`);
    path.push('Z');

    return path.join(' ');
  };

  const wavePath = generateWavePath();

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Gradient VERTICAL : opaque en bas, transparent en haut */}
          <LinearGradient id="sleepGradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor={gradientStart} stopOpacity="0" />
            <Stop offset="50%" stopColor={gradientMid} stopOpacity="0.3" />
            <Stop offset="100%" stopColor={gradientEnd} stopOpacity="0.7" />
          </LinearGradient>
        </Defs>

        {/* Onde avec gradient transparent */}
        <Path d={wavePath} fill="url(#sleepGradient)" />

        {/* Particules ZzZ BLANCHES */}
        <AnimatedG style={{ opacity: zzz1Opacity, transform: [{ translateY: zzz1Y }] }}>
          <SvgText x="25" y={height - 15} fontSize="16" fontWeight="900" fill="#FFFFFF" opacity="0.8">
            Z
          </SvgText>
        </AnimatedG>
        <AnimatedG style={{ opacity: zzz2Opacity, transform: [{ translateY: zzz2Y }] }}>
          <SvgText x="55" y={height - 20} fontSize="12" fontWeight="900" fill="#FFFFFF" opacity="0.7">
            Z
          </SvgText>
        </AnimatedG>
        <AnimatedG style={{ opacity: zzz3Opacity, transform: [{ translateY: zzz3Y }] }}>
          <SvgText x="80" y={height - 10} fontSize="18" fontWeight="900" fill="#FFFFFF" opacity="0.9">
            Z
          </SvgText>
        </AnimatedG>
        <AnimatedG style={{ opacity: zzz4Opacity, transform: [{ translateY: zzz4Y }] }}>
          <SvgText x="110" y={height - 18} fontSize="14" fontWeight="900" fill="#FFFFFF" opacity="0.6">
            Z
          </SvgText>
        </AnimatedG>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
  },
});
