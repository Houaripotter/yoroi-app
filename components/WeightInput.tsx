// ============================================
// YOROI - WEIGHT INPUT ISOLÉ (Pas de re-render du parent)
// ============================================

import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

export interface WeightInputHandle {
  getValue: () => number | null;
  setValue: (weight: number) => void;
  clear: () => void;
}

interface WeightInputProps {
  initialValue?: number;
  onAdjust?: () => void;
}

export const WeightInput = forwardRef<WeightInputHandle, WeightInputProps>(
  ({ initialValue, onAdjust }, ref) => {
    const { colors, isDark } = useTheme();

    // État LOCAL - Ne remonte JAMAIS au parent pendant la frappe
    const [intPart, setIntPart] = useState(
      initialValue ? Math.floor(initialValue).toString() : ''
    );
    const [decPart, setDecPart] = useState(
      initialValue ? Math.round((initialValue % 1) * 10).toString() : ''
    );

    const decRef = useRef<TextInput>(null);

    // Exposer les méthodes au parent via ref
    useImperativeHandle(ref, () => ({
      getValue: () => {
        const int = parseInt(intPart);
        const dec = parseInt(decPart) || 0;
        if (isNaN(int)) return null;
        return parseFloat(`${int}.${dec}`);
      },
      setValue: (weight: number) => {
        setIntPart(Math.floor(weight).toString());
        setDecPart(Math.round((weight % 1) * 10).toString());
      },
      clear: () => {
        setIntPart('');
        setDecPart('');
      },
    }));

    const handleIntChange = (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '');
      if (cleaned.length <= 3) {
        setIntPart(cleaned);
      }
    };

    const handleDecChange = (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '');
      if (cleaned.length <= 1) {
        setDecPart(cleaned);
      }
    };

    const adjustWeight = (delta: number) => {
      onAdjust?.();
      const currentInt = parseInt(intPart) || 70;
      const currentDec = parseInt(decPart) || 0;
      let total = currentInt + currentDec / 10 + delta;
      if (total < 30) total = 30;
      if (total > 250) total = 250;
      setIntPart(Math.floor(total).toString());
      setDecPart(Math.round((total % 1) * 10).toString());
    };

    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={[styles.adjustBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => adjustWeight(-0.1)}
        >
          <Minus size={24} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.intInput, { color: colors.textPrimary }]}
            value={intPart}
            onChangeText={handleIntChange}
            placeholder="00"
            placeholderTextColor={colors.border}
            keyboardType="number-pad"
            maxLength={3}
            returnKeyType="next"
            onSubmitEditing={() => decRef.current?.focus()}
          />
          <Text style={[styles.dot, { color: colors.accent }]}>.</Text>
          <TextInput
            ref={decRef}
            style={[styles.decInput, { color: colors.accent }]}
            value={decPart}
            onChangeText={handleDecChange}
            placeholder="0"
            placeholderTextColor={colors.border}
            keyboardType="number-pad"
            maxLength={1}
            returnKeyType="done"
          />
          <Text style={[styles.unit, { color: colors.textMuted }]}>kg</Text>
        </View>

        <TouchableOpacity
          style={[styles.adjustBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
          onPress={() => adjustWeight(0.1)}
        >
          <Plus size={24} color={colors.textMuted} />
        </TouchableOpacity>
      </View>
    );
  }
);

WeightInput.displayName = 'WeightInput';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  adjustBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  intInput: {
    fontSize: 72,
    fontWeight: '900',
    minWidth: 100,
    textAlign: 'right',
  },
  dot: {
    fontSize: 56,
    fontWeight: '700',
  },
  decInput: {
    fontSize: 48,
    fontWeight: '700',
    minWidth: 40,
  },
  unit: {
    fontSize: 24,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default WeightInput;
