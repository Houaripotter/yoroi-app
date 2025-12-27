import React, { useEffect } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface AnimatedSleepWaveProps {
  color?: string;
  height?: number;
}

const AnimatedSleepWave = ({
  color = 'rgba(167, 139, 250, 0.3)',
  height = 100,
}: AnimatedSleepWaveProps) => {
  const translateX = useSharedValue(0);

  useEffect(() => {
    translateX.value = withRepeat(
      withTiming(-width, {
        duration: 3000,
        easing: Easing.linear,
      }),
      -1, // Infini
      false
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={[styles.container, { height }]}>
      <View
        style={[
          styles.wave,
          { backgroundColor: color, width: width * 2, height: height * 0.6 },
          animatedStyle,
        ]}
      />
      <View
        style={[
          styles.wave,
          styles.wave2,
          { backgroundColor: color, width: width * 2, height: height * 0.6 },
          animatedStyle,
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    overflow: 'hidden',
  },
  wave: {
    position: 'absolute',
    bottom: 0,
    borderRadius: 1000,
  },
  wave2: {
    bottom: -20,
    opacity: 0.5,
  },
});

export default AnimatedSleepWave;
