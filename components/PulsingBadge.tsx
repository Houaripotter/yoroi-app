import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ViewStyle, StyleProp, Animated, Easing } from 'react-native';

interface PulsingBadgeProps {
  value?: string | number;
  color?: string;
  size?: number;
  children?: React.ReactNode;
  enabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const PulsingBadge = ({ value, color = '#FF6B6B', size = 24, children, enabled = true, style }: PulsingBadgeProps) => {
  const pulseScale = useRef(new Animated.Value(1)).current;
  const pulseOpacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (!enabled) return;

    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1.2,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0,
            duration: 1500,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(pulseScale, {
            toValue: 1,
            duration: 0,
            useNativeDriver: true,
          }),
          Animated.timing(pulseOpacity, {
            toValue: 0.3,
            duration: 0,
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    pulseAnimation.start();

    return () => {
      pulseAnimation.stop();
    };
  }, [enabled]);

  // Si children est fourni, on utilise un wrapper non circulaire
  if (children) {
    return (
      <View style={[styles.wrapperContainer, style]}>
        {enabled && (
          <Animated.View
            style={[
              styles.pulseWrapper,
              { backgroundColor: color },
              {
                transform: [{ scale: pulseScale }],
                opacity: pulseOpacity,
              },
            ]}
          />
        )}
        {children}
      </View>
    );
  }

  // Sinon, badge circulaire original
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Cercle qui pulse en arrière-plan */}
      <Animated.View
        style={[
          styles.pulse,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
            transform: [{ scale: pulseScale }],
            opacity: pulseOpacity,
          },
        ]}
      />
      {/* Badge principal */}
      <View
        style={[
          styles.badge,
          {
            backgroundColor: color,
            width: size,
            height: size,
            borderRadius: size / 2,
          },
        ]}
      >
        <Text style={[styles.text, { fontSize: size * 0.5 }]}>{value}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pulse: {
    position: 'absolute',
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  wrapperContainer: {
    position: 'relative',
  },
  pulseWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 12,
  },
});

export default PulsingBadge;
