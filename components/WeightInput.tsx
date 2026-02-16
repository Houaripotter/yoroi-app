// ============================================
// YOROI - WEIGHT INPUT ISOLÉ (Pas de re-render du parent)
// ============================================

import React, { useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Minus, Plus } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
// 🔒 SÉCURITÉ: Validation des poids
import { validateWeight, VALIDATION_LIMITS } from '@/lib/security/validators';
import logger from '@/lib/security/logger';

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
    // 🔒 SÉCURITÉ: État pour l'erreur de validation
    const [error, setError] = useState<string | null>(null);

    const decRef = useRef<TextInput>(null);

    // Exposer les méthodes au parent via ref
    useImperativeHandle(ref, () => ({
      getValue: () => {
        const int = parseInt(intPart);
        const dec = parseInt(decPart) || 0;
        if (isNaN(int)) return null;

        const weight = parseFloat(`${int}.${dec}`);

        // 🔒 SÉCURITÉ: Valider le poids avant de le retourner
        const validation = validateWeight(weight);
        if (!validation.valid) {
          setError(validation.error || 'Poids invalide');
          logger.warn('Invalid weight input', { weight, error: validation.error });
          return null;
        }

        setError(null);
        return validation.sanitized as number;
      },
      setValue: (weight: number) => {
        // 🔒 SÉCURITÉ: Valider avant de setter
        const validation = validateWeight(weight);
        if (!validation.valid) {
          logger.warn('Attempted to set invalid weight', { weight, error: validation.error });
          return;
        }

        const validWeight = validation.sanitized as number;
        setIntPart(Math.floor(validWeight).toString());
        setDecPart(Math.round((validWeight % 1) * 10).toString());
        setError(null);
      },
      clear: () => {
        setIntPart('');
        setDecPart('');
        setError(null);
      },
    }));

    const handleIntChange = (text: string) => {
      // Si l'utilisateur tape une virgule ou un point, aller au champ décimal
      if (text.includes(',') || text.includes('.')) {
        const parts = text.split(/[.,]/);
        const intValue = parts[0].replace(/[^0-9]/g, '');
        if (intValue.length <= 3) {
          setIntPart(intValue);
        }
        // Passer le focus au champ décimal
        decRef.current?.focus();
        // Si des chiffres après la virgule, les pré-remplir
        if (parts[1]) {
          const decValue = parts[1].replace(/[^0-9]/g, '').substring(0, 1);
          if (decValue) setDecPart(decValue);
        }
        return;
      }

      const cleaned = text.replace(/[^0-9]/g, '');
      if (cleaned.length <= 3) {
        setIntPart(cleaned);

        // 🔒 SÉCURITÉ: Validation en temps réel pour feedback immédiat
        if (cleaned.length > 0) {
          const currentDec = parseInt(decPart) || 0;
          const weight = parseFloat(`${cleaned}.${currentDec}`);
          const validation = validateWeight(weight);

          if (!validation.valid) {
            setError(validation.error || 'Poids invalide');
          } else {
            setError(null);
          }
        } else {
          setError(null); // Pas d'erreur si vide
        }
      }
    };

    const handleDecChange = (text: string) => {
      const cleaned = text.replace(/[^0-9]/g, '');
      if (cleaned.length <= 1) {
        setDecPart(cleaned);

        // 🔒 SÉCURITÉ: Validation en temps réel
        if (intPart.length > 0) {
          const currentInt = parseInt(intPart);
          const weight = parseFloat(`${currentInt}.${cleaned || '0'}`);
          const validation = validateWeight(weight);

          if (!validation.valid) {
            setError(validation.error || 'Poids invalide');
          } else {
            setError(null);
          }
        }
      }
    };

    const adjustWeight = (delta: number) => {
      onAdjust?.();
      const currentInt = parseInt(intPart) || 70;
      const currentDec = parseInt(decPart) || 0;
      let total = currentInt + currentDec / 10 + delta;

      // 🔒 SÉCURITÉ: Utiliser les limites de validation
      if (total < VALIDATION_LIMITS.WEIGHT_MIN) total = VALIDATION_LIMITS.WEIGHT_MIN;
      if (total > VALIDATION_LIMITS.WEIGHT_MAX) total = VALIDATION_LIMITS.WEIGHT_MAX;

      setIntPart(Math.floor(total).toString());
      setDecPart(Math.round((total % 1) * 10).toString());

      // Valider après ajustement
      const validation = validateWeight(total);
      setError(validation.valid ? null : validation.error || null);
    };

    return (
      <View style={styles.wrapper}>
        <View style={styles.container}>
          <TouchableOpacity
            style={[styles.adjustBtn, { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            onPress={() => adjustWeight(-0.1)}
          >
            <Minus size={24} color={colors.textMuted} />
          </TouchableOpacity>

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.intInput, { color: error ? '#FF3B30' : colors.textPrimary }]}
              value={intPart}
              onChangeText={handleIntChange}
              placeholder="00"
              placeholderTextColor={colors.border}
              keyboardType="decimal-pad"
              maxLength={5}
              returnKeyType="next"
              onSubmitEditing={() => decRef.current?.focus()}
            />
            <Text style={[styles.dot, { color: error ? '#FF3B30' : colors.accent }]}>.</Text>
            <TextInput
              ref={decRef}
              style={[styles.decInput, { color: error ? '#FF3B30' : colors.accent }]}
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

        {/* 🔒 SÉCURITÉ: Affichage de l'erreur de validation */}
        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <Text style={styles.errorHint}>
              Poids valide : {VALIDATION_LIMITS.WEIGHT_MIN}-{VALIDATION_LIMITS.WEIGHT_MAX} kg
            </Text>
          </View>
        )}
      </View>
    );
  }
);

WeightInput.displayName = 'WeightInput';

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
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
  // 🔒 SÉCURITÉ: Styles pour l'affichage des erreurs
  errorContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 59, 48, 0.3)',
    maxWidth: 320,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  errorHint: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.8,
  },
});

export default WeightInput;
