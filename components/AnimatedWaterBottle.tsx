import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, ClipPath, LinearGradient, Stop, Circle, Rect } from 'react-native-svg';

interface AnimatedWaterBottleProps {
  fillPercentage: number; // 0-1 (0 = vide, 1 = plein)
  width?: number;
  height?: number;
  color?: string;
  showBubbles?: boolean;
}

const AnimatedWaterBottle = ({
  fillPercentage,
  width = 120,
  height = 180,
  color = '#06B6D4',
  showBubbles = false,
}: AnimatedWaterBottleProps) => {
  const waveAnim = useRef(new Animated.Value(0)).current;
  const [waveOffset, setWaveOffset] = useState(0);
  const [bubbles, setBubbles] = useState<Array<{id: number, x: number, y: number, size: number}>>([]);

  // Animation de vague continue
  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(waveAnim, {
        toValue: 1,
        duration: 2000,
        easing: Easing.linear,
        useNativeDriver: false, // REQUIS: anime des paths SVG dynamiques (non supportés par native driver)
      })
    );
    animation.start();

    const listener = waveAnim.addListener(({ value }) => {
      setWaveOffset(value * Math.PI * 2);
    });

    return () => {
      animation.stop();
      waveAnim.removeListener(listener);
    };
  }, []);

  // Générer des bulles quand showBubbles change à true
  useEffect(() => {
    if (showBubbles && fillPercentage > 0.05) {
      const newBubbles = Array.from({ length: 6 }, (_, i) => ({
        id: Date.now() + i,
        x: width * 0.25 + Math.random() * width * 0.5,
        y: height * (1 - fillPercentage * 0.8) + Math.random() * height * 0.3,
        size: 3 + Math.random() * 5,
      }));
      setBubbles(newBubbles);

      const timer = setTimeout(() => setBubbles([]), 600);
      return () => clearTimeout(timer);
    }
  }, [showBubbles]);

  // Dimensions de la bouteille
  const neckWidth = width * 0.35;
  const neckHeight = height * 0.12;
  const neckX = (width - neckWidth) / 2;
  const bodyTop = neckHeight;
  const bodyHeight = height - neckHeight;
  const cornerRadius = width * 0.12;

  // Path de la forme de la bouteille (comme sur Apple Watch)
  const bottlePath = `
    M ${neckX} ${neckHeight}
    L ${neckX} 2
    Q ${neckX} 0 ${neckX + 4} 0
    L ${neckX + neckWidth - 4} 0
    Q ${neckX + neckWidth} 0 ${neckX + neckWidth} 2
    L ${neckX + neckWidth} ${neckHeight}
    Q ${width} ${neckHeight} ${width - cornerRadius} ${neckHeight + cornerRadius}
    L ${width - cornerRadius} ${height - cornerRadius}
    Q ${width - cornerRadius} ${height} ${width - cornerRadius * 2} ${height}
    L ${cornerRadius * 2} ${height}
    Q ${cornerRadius} ${height} ${cornerRadius} ${height - cornerRadius}
    L ${cornerRadius} ${neckHeight + cornerRadius}
    Q 0 ${neckHeight} ${neckX} ${neckHeight}
    Z
  `;

  // Calculer la hauteur de l'eau
  const clampedFill = Math.min(Math.max(fillPercentage, 0), 1);
  const waterFillHeight = bodyHeight * clampedFill;
  const waterTopY = height - waterFillHeight;

  // Générer le path de l'eau avec vagues
  const generateWaterPath = () => {
    if (clampedFill <= 0) return '';

    const waveAmplitude = 4;
    const startY = waterTopY;

    let path = `M 0 ${height}`;
    path += ` L 0 ${startY}`;

    // Créer la vague
    for (let x = 0; x <= width; x += 2) {
      const y = startY + Math.sin((x / width) * Math.PI * 2 + waveOffset) * waveAmplitude;
      path += ` L ${x} ${y}`;
    }

    path += ` L ${width} ${height}`;
    path += ' Z';

    return path;
  };

  const waterPath = generateWaterPath();

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Gradient pour l'eau */}
          <LinearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.5" />
          </LinearGradient>

          {/* Clip de la bouteille */}
          <ClipPath id="bottleClip">
            <Path d={bottlePath} />
          </ClipPath>
        </Defs>

        {/* Fond transparent de la bouteille */}
        <Path
          d={bottlePath}
          fill={`${color}10`}
        />

        {/* Eau avec vagues (clippée par la bouteille) */}
        {clampedFill > 0 && (
          <Path
            d={waterPath}
            fill="url(#waterGradient)"
            clipPath="url(#bottleClip)"
          />
        )}

        {/* Bulles */}
        {bubbles.map(bubble => (
          <Circle
            key={bubble.id}
            cx={bubble.x}
            cy={bubble.y}
            r={bubble.size}
            fill="white"
            opacity={0.6}
          />
        ))}

        {/* Contour de la bouteille */}
        <Path
          d={bottlePath}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          opacity={0.5}
        />
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

// OPTIMISATION #58: Mémoiser le composant pour éviter re-renders inutiles
export default React.memo(AnimatedWaterBottle, (prevProps, nextProps) => {
  return prevProps.fillPercentage === nextProps.fillPercentage &&
         prevProps.width === nextProps.width &&
         prevProps.height === nextProps.height &&
         prevProps.color === nextProps.color &&
         prevProps.showBubbles === nextProps.showBubbles;
});
