import React, { useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { ViewMode } from '@/hooks/useViewMode';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface ViewModeSwitchProps {
  mode: ViewMode;
  onToggle: () => void;
}

export const ViewModeSwitch: React.FC<ViewModeSwitchProps> = ({ mode, onToggle }) => {
  const { colors } = useTheme();
  const rotationAnim = useRef(new Animated.Value(mode === 'complet' ? 0 : 1)).current;

  useEffect(() => {
    Animated.timing(rotationAnim, {
      toValue: mode === 'complet' ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [mode]);

  const handlePress = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    onToggle();
  };

  const rotation = rotationAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <AnimatedTouchable
      style={[
        styles.container,
        { backgroundColor: colors.backgroundCard },
        { transform: [{ rotate: rotation }] }
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <Ionicons
        name="swap-horizontal"
        size={22}
        color={colors.accentText}
      />
    </AnimatedTouchable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
