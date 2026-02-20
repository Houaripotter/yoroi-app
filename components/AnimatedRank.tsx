import React, { useEffect, useRef } from 'react';
import { Text, StyleSheet, TextStyle, ViewStyle, StyleProp, Animated } from 'react-native';

interface AnimatedRankProps {
  rank: string;
  delay?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
  containerStyle?: StyleProp<ViewStyle>;
}

const AnimatedRank = ({ rank, delay = 0, color = '#FFD700', style, containerStyle }: AnimatedRankProps) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const rotate = useRef(new Animated.Value(-180)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.spring(opacity, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
        Animated.spring(rotate, {
          toValue: 0,
          tension: 100,
          friction: 10,
          useNativeDriver: true,
        }),
      ]).start();
    }, delay);

    return () => clearTimeout(timer);
  }, [delay]);

  const rotateInterpolate = rotate.interpolate({
    inputRange: [-180, 0],
    outputRange: ['-180deg', '0deg'],
  });

  return (
    <Animated.View
      style={[
        containerStyle,
        {
          opacity,
          transform: [
            { scale },
            { rotate: rotateInterpolate },
          ],
        },
      ]}
    >
      <Text style={[styles.rank, { color }, style]}>{rank}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#2D2D2D',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  rank: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AnimatedRank;
