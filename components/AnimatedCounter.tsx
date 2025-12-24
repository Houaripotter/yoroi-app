import React, { useEffect, useState, useRef } from 'react';
import { Text, StyleSheet, TextStyle, StyleProp, Animated, Easing } from 'react-native';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  style?: StyleProp<TextStyle>;
}

const AnimatedCounter = ({ value, duration = 1000, suffix = '', style }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let startTime: number;
    let animationFrame: number;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3);

      // Handle decimal values
      if (value % 1 !== 0) {
        setDisplayValue(parseFloat((easeOut * value).toFixed(1)));
      } else {
        setDisplayValue(Math.floor(easeOut * value));
      }

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);

    return () => {
      if (animationFrame) {
        cancelAnimationFrame(animationFrame);
      }
    };
  }, [value, duration]);

  useEffect(() => {
    // Animation d'apparition avec spring effect
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        tension: 50,
        friction: 7,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 300,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [value]);

  return (
    <Animated.View
      style={{
        transform: [{ scale }],
        opacity,
      }}
    >
      <Text style={[styles.counter, style]}>
        {displayValue}{suffix}
      </Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  counter: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});

export default AnimatedCounter;
