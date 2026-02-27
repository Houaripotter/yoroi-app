import React, { useRef, useEffect } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Path } from 'react-native-svg';

interface WaterWavesSvgProps {
  width: number;
  height?: number;
  animated?: boolean;
}

export const WaterWavesSvg: React.FC<WaterWavesSvgProps> = ({
  width: w,
  height: h = 95,
  animated = true,
}) => {
  const waveAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!animated) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(waveAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(waveAnim, {
          toValue: 0,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [animated]);

  const content = (
    <Svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <Path
        d={`M 0 28 C ${w * 0.1} 12, ${w * 0.25} 8, ${w * 0.42} 24 C ${w * 0.58} 38, ${w * 0.72} 14, ${w * 0.88} 10 C ${w * 0.96} 8, ${w} 15, ${w} 22 L ${w} ${h} L 0 ${h} Z`}
        fill="#C4DEF0"
        opacity={0.45}
      />
      <Path
        d={`M 0 38 C ${w * 0.12} 18, ${w * 0.32} 15, ${w * 0.48} 32 C ${w * 0.62} 46, ${w * 0.78} 20, ${w} 28 L ${w} ${h} L 0 ${h} Z`}
        fill="#A8CEE4"
        opacity={0.55}
      />
      <Path
        d={`M 0 52 C ${w * 0.1} 34, ${w * 0.28} 38, ${w * 0.46} 50 C ${w * 0.6} 62, ${w * 0.76} 34, ${w} 42 L ${w} ${h} L 0 ${h} Z`}
        fill="#7CB8D8"
        opacity={0.6}
      />
      <Path
        d={`M 0 65 C ${w * 0.14} 52, ${w * 0.34} 54, ${w * 0.52} 64 C ${w * 0.68} 76, ${w * 0.84} 52, ${w} 58 L ${w} ${h} L 0 ${h} Z`}
        fill="#5DA8C8"
        opacity={0.7}
      />
    </Svg>
  );

  if (!animated) return content;

  return (
    <Animated.View
      style={{
        transform: [
          {
            translateX: waveAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-6, 6],
            }),
          },
        ],
      }}
    >
      {content}
    </Animated.View>
  );
};

export default WaterWavesSvg;
