import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Defs, ClipPath, G, Circle, LinearGradient, Stop } from 'react-native-svg';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedWaterBottleProps {
  fillPercentage: number; // 0-100
  width?: number;
  height?: number;
  color?: string;
  showBubbles?: boolean;
}

interface Bubble {
  id: number;
  x: number;
  y: Animated.Value;
  size: number;
  opacity: Animated.Value;
}

const AnimatedWaterBottle = ({
  fillPercentage,
  width = 120,
  height = 200,
  color = '#06B6D4',
  showBubbles = true,
}: AnimatedWaterBottleProps) => {
  const fillAnim = useRef(new Animated.Value(0)).current;
  const wave1Anim = useRef(new Animated.Value(0)).current;
  const wave2Anim = useRef(new Animated.Value(0)).current;
  const [bubbles, setBubbles] = useState<Bubble[]>([]);
  const bubbleIdRef = useRef(0);

  // Animation de remplissage
  useEffect(() => {
    Animated.spring(fillAnim, {
      toValue: fillPercentage,
      damping: 15,
      stiffness: 100,
      useNativeDriver: false,
    }).start();
  }, [fillPercentage]);

  // Animation des vagues continues
  useEffect(() => {
    const wave1 = Animated.loop(
      Animated.timing(wave1Anim, {
        toValue: 1,
        duration: 2500,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );

    const wave2 = Animated.loop(
      Animated.timing(wave2Anim, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: false,
      })
    );

    wave1.start();
    wave2.start();

    return () => {
      wave1.stop();
      wave2.stop();
    };
  }, []);

  // Génération de bulles
  useEffect(() => {
    if (!showBubbles || fillPercentage < 5) return;

    const interval = setInterval(() => {
      const newBubble: Bubble = {
        id: bubbleIdRef.current++,
        x: 20 + Math.random() * (width - 60),
        y: new Animated.Value(height),
        size: 3 + Math.random() * 6,
        opacity: new Animated.Value(0.7),
      };

      setBubbles(prev => [...prev.slice(-8), newBubble]);

      // Animation de montée de la bulle
      const targetY = height * (1 - fillPercentage / 100) + 20;
      Animated.parallel([
        Animated.timing(newBubble.y, {
          toValue: targetY,
          duration: 2000 + Math.random() * 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.sequence([
          Animated.delay(1500),
          Animated.timing(newBubble.opacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: false,
          }),
        ]),
      ]).start(() => {
        setBubbles(prev => prev.filter(b => b.id !== newBubble.id));
      });
    }, 800);

    return () => clearInterval(interval);
  }, [showBubbles, fillPercentage, width, height]);

  // Dimensions de la bouteille
  const neckWidth = width * 0.35;
  const neckHeight = height * 0.12;
  const bodyWidth = width * 0.85;
  const bodyHeight = height * 0.8;
  const cornerRadius = width * 0.12;

  // Centre pour le positionnement
  const centerX = width / 2;
  const neckX = centerX - neckWidth / 2;
  const bodyX = centerX - bodyWidth / 2;
  const bodyY = neckHeight;

  // Path de la forme de la bouteille
  const bottlePath = `
    M ${neckX} ${neckHeight}
    L ${neckX} 5
    Q ${neckX} 0 ${neckX + 5} 0
    L ${neckX + neckWidth - 5} 0
    Q ${neckX + neckWidth} 0 ${neckX + neckWidth} 5
    L ${neckX + neckWidth} ${neckHeight}
    Q ${bodyX + bodyWidth + 5} ${neckHeight} ${bodyX + bodyWidth} ${bodyY + cornerRadius}
    L ${bodyX + bodyWidth} ${bodyY + bodyHeight - cornerRadius}
    Q ${bodyX + bodyWidth} ${bodyY + bodyHeight} ${bodyX + bodyWidth - cornerRadius} ${bodyY + bodyHeight}
    L ${bodyX + cornerRadius} ${bodyY + bodyHeight}
    Q ${bodyX} ${bodyY + bodyHeight} ${bodyX} ${bodyY + bodyHeight - cornerRadius}
    L ${bodyX} ${bodyY + cornerRadius}
    Q ${bodyX - 5} ${neckHeight} ${neckX} ${neckHeight}
    Z
  `;

  // Interpolation pour les vagues
  const wave1X = wave1Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, Math.PI * 2],
  });

  const wave2X = wave2Anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -Math.PI * 2],
  });

  // Hauteur de l'eau
  const waterTop = fillAnim.interpolate({
    inputRange: [0, 100],
    outputRange: [bodyY + bodyHeight, bodyY + 10],
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        <Defs>
          {/* Gradient pour l'eau */}
          <LinearGradient id="waterGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color} stopOpacity="0.9" />
            <Stop offset="1" stopColor={color} stopOpacity="0.6" />
          </LinearGradient>

          {/* Clip path de la bouteille */}
          <ClipPath id="bottleClip">
            <Path d={bottlePath} />
          </ClipPath>
        </Defs>

        {/* Fond de la bouteille (légère teinte) */}
        <Path
          d={bottlePath}
          fill={`${color}10`}
        />

        {/* Eau avec vagues (clippée par la bouteille) */}
        <G clipPath="url(#bottleClip)">
          {/* Eau de base */}
          <AnimatedRect
            fillAnim={fillAnim}
            bodyX={bodyX}
            bodyY={bodyY}
            bodyWidth={bodyWidth}
            bodyHeight={bodyHeight}
            color={color}
          />

          {/* Vagues */}
          <AnimatedWaves
            wave1X={wave1X}
            wave2X={wave2X}
            waterTop={waterTop}
            width={width}
            color={color}
          />

          {/* Bulles */}
          {bubbles.map(bubble => (
            <AnimatedCircle
              key={bubble.id}
              cx={bubble.x}
              cy={bubble.y as any}
              r={bubble.size}
              fill="rgba(255,255,255,0.6)"
              opacity={bubble.opacity as any}
            />
          ))}
        </G>

        {/* Contour de la bouteille */}
        <Path
          d={bottlePath}
          fill="none"
          stroke={color}
          strokeWidth={3}
        />

        {/* Graduations */}
        {[0.25, 0.5, 0.75].map((ratio, i) => {
          const y = bodyY + bodyHeight * (1 - ratio);
          return (
            <G key={i}>
              <Path
                d={`M ${bodyX + bodyWidth - 3} ${y} L ${bodyX + bodyWidth + 5} ${y}`}
                stroke={color}
                strokeWidth={2}
                opacity={0.4}
              />
            </G>
          );
        })}

        {/* Reflet sur le verre */}
        <Path
          d={`M ${bodyX + 8} ${bodyY + 20} L ${bodyX + 8} ${bodyY + bodyHeight - 30}`}
          stroke="rgba(255,255,255,0.3)"
          strokeWidth={4}
          strokeLinecap="round"
        />
      </Svg>
    </View>
  );
};

// Composant pour le rectangle d'eau animé
const AnimatedRect = ({
  fillAnim,
  bodyX,
  bodyY,
  bodyWidth,
  bodyHeight,
  color
}: {
  fillAnim: Animated.Value;
  bodyX: number;
  bodyY: number;
  bodyWidth: number;
  bodyHeight: number;
  color: string;
}) => {
  const [rectHeight, setRectHeight] = useState(0);
  const [rectY, setRectY] = useState(bodyY + bodyHeight);

  useEffect(() => {
    const listenerId = fillAnim.addListener(({ value }) => {
      const h = (value / 100) * bodyHeight;
      setRectHeight(h);
      setRectY(bodyY + bodyHeight - h);
    });
    return () => fillAnim.removeListener(listenerId);
  }, [fillAnim, bodyY, bodyHeight]);

  return (
    <Path
      d={`M ${bodyX - 10} ${rectY} L ${bodyX + bodyWidth + 10} ${rectY} L ${bodyX + bodyWidth + 10} ${bodyY + bodyHeight + 10} L ${bodyX - 10} ${bodyY + bodyHeight + 10} Z`}
      fill={`${color}90`}
    />
  );
};

// Composant pour les vagues animées
const AnimatedWaves = ({
  wave1X,
  wave2X,
  waterTop,
  width,
  color
}: {
  wave1X: Animated.AnimatedInterpolation<number>;
  wave2X: Animated.AnimatedInterpolation<number>;
  waterTop: Animated.AnimatedInterpolation<number>;
  width: number;
  color: string;
}) => {
  const [wave1Path, setWave1Path] = useState('');
  const [wave2Path, setWave2Path] = useState('');
  const [top, setTop] = useState(200);

  useEffect(() => {
    const listener1 = wave1X.addListener(({ value }) => {
      let path = `M 0 ${top + 5}`;
      for (let x = 0; x <= width; x += 5) {
        const y = top + Math.sin((x / width) * Math.PI * 2 + value) * 4;
        path += ` L ${x} ${y}`;
      }
      path += ` L ${width} 300 L 0 300 Z`;
      setWave1Path(path);
    });

    const listener2 = wave2X.addListener(({ value }) => {
      let path = `M 0 ${top + 3}`;
      for (let x = 0; x <= width; x += 5) {
        const y = top + Math.sin((x / width) * Math.PI * 3 + value) * 3;
        path += ` L ${x} ${y}`;
      }
      path += ` L ${width} 300 L 0 300 Z`;
      setWave2Path(path);
    });

    return () => {
      wave1X.removeListener(listener1);
      wave2X.removeListener(listener2);
    };
  }, [wave1X, wave2X, width, top]);

  useEffect(() => {
    const topListener = waterTop.addListener(({ value }) => {
      setTop(value);
    });
    return () => waterTop.removeListener(topListener);
  }, [waterTop]);

  return (
    <>
      <Path d={wave1Path} fill={`${color}70`} />
      <Path d={wave2Path} fill={`${color}50`} />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default AnimatedWaterBottle;
