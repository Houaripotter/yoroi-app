import { useEffect, useRef } from 'react';
import { TextStyle, Animated } from 'react-native';

interface AnimatedNumberProps {
  value: number;
  decimals?: number;
  style?: TextStyle;
  duration?: number;
  delay?: number;
}

export function AnimatedNumber({
  value,
  decimals = 1,
  style,
  duration = 1200,
  delay = 0,
}: AnimatedNumberProps) {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      delay,
      useNativeDriver: true,
    }).start();
  }, [value, duration, delay]);

  return (
    <Animated.Text style={style}>
      {animatedValue.interpolate({
        inputRange: [0, value || 1],
        outputRange: ['0.0', value.toFixed(decimals)],
      })}
    </Animated.Text>
  );
}
