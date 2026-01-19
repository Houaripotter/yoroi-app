import React, { useEffect, useState, useRef, memo } from 'react';
import { Text, StyleSheet, TextStyle, StyleProp, Animated, Easing } from 'react-native';

interface AnimatedCounterProps {
  value: number;
  duration?: number;
  suffix?: string;
  style?: StyleProp<TextStyle>;
}

const AnimatedCounter = ({ value, duration = 1000, suffix = '', style }: AnimatedCounterProps) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.5)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const prevValue = useRef(0);

  useEffect(() => {
    // OPTIMISATION: Utiliser Animated.timing au lieu de requestAnimationFrame
    // pour éviter les setState à chaque frame
    animatedValue.setValue(prevValue.current);

    Animated.timing(animatedValue, {
      toValue: value,
      duration,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false, // Nécessaire car on anime une valeur non-transform
    }).start();

    // Listener optimisé: ne met à jour que toutes les ~16ms au lieu de chaque frame
    let lastUpdate = 0;
    const listener = animatedValue.addListener(({ value: animValue }) => {
      const now = Date.now();
      // Throttle: mettre à jour max 1 fois toutes les 16ms (60 FPS)
      if (now - lastUpdate > 16) {
        lastUpdate = now;
        const newValue = value % 1 !== 0
          ? parseFloat(animValue.toFixed(1))
          : Math.floor(animValue);
        setDisplayValue(newValue);
      }
    });

    prevValue.current = value;

    return () => {
      animatedValue.removeListener(listener);
    };
  }, [value, duration, animatedValue]);

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

// OPTIMISATION: Mémoriser le composant pour éviter re-renders si props inchangées
export default memo(AnimatedCounter, (prevProps, nextProps) => {
  return prevProps.value === nextProps.value &&
         prevProps.duration === nextProps.duration &&
         prevProps.suffix === nextProps.suffix;
});
