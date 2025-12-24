import React, { ReactNode, useEffect, useRef } from 'react';
import { StyleSheet, ViewStyle, Animated, Easing } from 'react-native';

interface AnimatedCardProps {
  children: ReactNode;
  index?: number;
  delay?: number; // Keep for backward compatibility
  style?: ViewStyle;
}

export function AnimatedCard({ children, index = 0, delay, style }: AnimatedCardProps) {
  // Use explicit delay if provided, otherwise calculate from index
  const animationDelay = delay !== undefined ? delay : index * 100;
  
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(50)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    // Animation d'entrée avec délai
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: true,
        }),
      ]).start();
    }, animationDelay);

    return () => {
      clearTimeout(timer);
    };
  }, [animationDelay]);

  return (
    <Animated.View
      style={[
        styles.card,
        style,
        {
          opacity,
          transform: [
            { translateY },
            { scale },
          ],
        },
      ]}
    >
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    // No default card styling - let parent control it
  },
});

export default AnimatedCard;
