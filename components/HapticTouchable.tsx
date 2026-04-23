// ============================================
// HAPTIC TOUCHABLE · Drop-in TouchableOpacity + haptic auto
// ============================================
// Usage :
//   <HapticTouchable onPress={...}>...</HapticTouchable>
//
// Props identiques a TouchableOpacity + hapticStyle ('light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error').
// Defaut = 'light'.
// ============================================

import React from 'react';
import { TouchableOpacity, TouchableOpacityProps, GestureResponderEvent } from 'react-native';
import { lightHaptic, mediumHaptic, heavyHaptic, selectionHaptic, successHaptic, errorHaptic } from '@/lib/haptics';

export type HapticStyle = 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'error' | 'none';

interface HapticTouchableProps extends TouchableOpacityProps {
  hapticStyle?: HapticStyle;
}

const hapticFnByStyle: Record<HapticStyle, () => Promise<void>> = {
  light: lightHaptic,
  medium: mediumHaptic,
  heavy: heavyHaptic,
  selection: selectionHaptic,
  success: successHaptic,
  error: errorHaptic,
  none: async () => {},
};

export const HapticTouchable: React.FC<HapticTouchableProps> = ({
  onPress,
  hapticStyle = 'light',
  disabled,
  ...rest
}) => {
  const handlePress = (e: GestureResponderEvent) => {
    if (disabled) return;
    // Fire-and-forget : l'haptic ne doit pas bloquer le onPress
    hapticFnByStyle[hapticStyle]().catch(() => {});
    onPress?.(e);
  };

  return (
    <TouchableOpacity
      accessibilityRole={rest.accessibilityRole ?? 'button'}
      {...rest}
      disabled={disabled}
      onPress={handlePress}
    />
  );
};

export default HapticTouchable;
