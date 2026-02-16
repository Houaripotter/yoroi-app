import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { CheckCircle2 } from 'lucide-react-native';

interface ChallengeConfettiProps {
  visible: boolean;
  onComplete?: () => void;
}

export const ChallengeConfetti: React.FC<ChallengeConfettiProps> = ({ visible, onComplete }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Animation d'explosion
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1.5,
          tension: 50,
          friction: 5,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.delay(800),
          Animated.timing(opacityAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        if (onComplete) onComplete();
        // Reset
        scaleAnim.setValue(0);
        rotateAnim.setValue(0);
        opacityAnim.setValue(0);
      });
    }
  }, [visible]);

  if (!visible) return null;

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: opacityAnim,
          transform: [
            { scale: scaleAnim },
            { rotate },
          ],
        },
      ]}
    >
      <CheckCircle2 size={60} color="#10B981" fill="#10B981" />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -30,
    marginTop: -30,
    zIndex: 1000,
  },
});

