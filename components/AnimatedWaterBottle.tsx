import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Easing } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

interface AnimatedWaterBottleProps {
  fillPercentage: number; // 0-100
  width?: number;
  height?: number;
  color?: string;
}

const AnimatedWaterBottle = ({
  fillPercentage,
  width = 60,
  height = 90,
  color = '#06B6D4',
}: AnimatedWaterBottleProps) => {
  const fillHeight = useRef(new Animated.Value(0)).current;
  const waveOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Animation de remplissage
    Animated.timing(fillHeight, {
      toValue: fillPercentage,
      duration: 1000,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: false,
    }).start();
  }, [fillPercentage]);

  useEffect(() => {
    // Animation de vague horizontale
    const waveAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(waveOffset, {
          toValue: 2,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(waveOffset, {
          toValue: -2,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    waveAnimation.start();

    return () => {
      waveAnimation.stop();
    };
  }, []);

  // Dimensions du bidon
  const capHeight = 12;
  const capWidth = width * 0.65;
  const bodyWidth = width * 0.8;
  const bodyHeight = height - capHeight - 3;
  const bodyX = (width - bodyWidth) / 2;
  const capX = (width - capWidth) / 2;
  const bodyTop = capHeight;
  const bodyBottom = height - 3;

  // Calcul de la hauteur de l'eau
  const waterMaxHeight = bodyHeight - 6;
  
  const waterHeight = fillHeight.interpolate({
    inputRange: [0, 100],
    outputRange: [0, waterMaxHeight],
  });

  const waveX = waveOffset.interpolate({
    inputRange: [-2, 2],
    outputRange: [-1, 1],
  });

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
        {/* Bouchon du bidon */}
        <Path
          d={`M ${capX} ${capHeight} 
              Q ${capX} ${capHeight * 0.3} ${capX + capWidth / 2} ${capHeight * 0.2}
              Q ${capX + capWidth} ${capHeight * 0.3} ${capX + capWidth} ${capHeight}`}
          fill={color}
          stroke={color}
          strokeWidth="1.5"
        />
        
        {/* Corps du bidon (contour arrondi) */}
        <Path
          d={`M ${bodyX} ${bodyTop} 
              Q ${bodyX - 1} ${bodyTop + 3} ${bodyX} ${bodyTop + 6}
              L ${bodyX} ${bodyBottom - 4}
              Q ${bodyX} ${bodyBottom} ${bodyX + 4} ${bodyBottom}
              L ${bodyX + bodyWidth - 4} ${bodyBottom}
              Q ${bodyX + bodyWidth} ${bodyBottom} ${bodyX + bodyWidth} ${bodyBottom - 4}
              L ${bodyX + bodyWidth} ${bodyTop + 6}
              Q ${bodyX + bodyWidth + 1} ${bodyTop + 3} ${bodyX + bodyWidth} ${bodyTop}
              Z`}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
        />

        {/* Graduations sur le côté */}
        {[0.25, 0.5, 0.75].map((ratio, i) => {
          const yPos = bodyTop + 3 + (bodyHeight - 6) * (1 - ratio);
          return (
            <Rect
              key={i}
              x={bodyX + bodyWidth - 2}
              y={yPos}
              width="3"
              height="1"
              fill={color}
              opacity={0.4}
            />
          );
        })}
      </Svg>

      {/* Eau animée - Positionnée absolument */}
      <Animated.View
        style={[
          styles.waterContainer,
          {
            left: bodyX + 2,
            width: bodyWidth - 4,
            bottom: bodyBottom - 2,
            height: waterHeight,
          },
        ]}
      >
        <View style={[styles.water, { backgroundColor: color, opacity: 0.7 }]} />
        {/* Vague animée en haut */}
        <Animated.View
          style={[
            styles.wave,
            {
              backgroundColor: color,
              opacity: 0.9,
              transform: [{ translateX: waveX }],
            },
          ]}
        />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  waterContainer: {
    position: 'absolute',
    overflow: 'hidden',
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  water: {
    width: '100%',
    height: '100%',
  },
  wave: {
    position: 'absolute',
    top: -4,
    left: -2,
    right: -2,
    height: 8,
    borderRadius: 50,
  },
});

export default AnimatedWaterBottle;
