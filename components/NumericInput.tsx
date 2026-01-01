import React, { useState, useEffect, useCallback } from 'react';
import { TextInput, View, Text, StyleSheet, TextInputProps } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
// 🔒 SÉCURITÉ: Validation des inputs
import {
  validateWeight,
  validateHeight,
  validateBodyFat,
  validateMuscleMass,
  validateWater,
  validateBodyMeasurement,
  validateHydrationEntry,
  VALIDATION_LIMITS
} from '@/lib/security/validators';
import logger from '@/lib/security/logger';

// 🔒 SÉCURITÉ: Types de validation disponibles
export type ValidationType =
  | 'weight'
  | 'height'
  | 'bodyFat'
  | 'muscleMass'
  | 'water'
  | 'bodyMeasurement'
  | 'hydration'
  | 'none';

interface NumericInputProps {
  label?: string;
  value: string;
  onValueChange: (value: string) => void;
  unit?: string;
  placeholder?: string;
  maxLength?: number;
  allowDecimal?: boolean;
  maxDecimals?: number;
  style?: any;
  inputStyle?: any;
  color?: string;
  backgroundColor?: string;
  // 🔒 SÉCURITÉ: Type de validation à appliquer
  validationType?: ValidationType;
  fieldName?: string; // Pour les messages d'erreur personnalisés
}

/**
 * Input numérique optimisé pour éviter les crashes lors de la saisie
 * Utilise un état local pour éviter les re-renders pendant la frappe
 * 🔒 SÉCURITÉ: Avec validation optionnelle des valeurs
 */
export const NumericInput: React.FC<NumericInputProps> = ({
  label,
  value,
  onValueChange,
  unit,
  placeholder = '0',
  maxLength = 6,
  allowDecimal = true,
  maxDecimals = 1,
  style,
  inputStyle,
  color,
  backgroundColor,
  validationType = 'none',
  fieldName,
}) => {
  const { colors, isDark } = useTheme();

  // État LOCAL pour l'input - évite les re-renders pendant la frappe
  const [localValue, setLocalValue] = useState(value);
  // 🔒 SÉCURITÉ: État pour l'erreur de validation
  const [error, setError] = useState<string | null>(null);

  // Ref pour éviter les loops dans useEffect
  const prevValueRef = React.useRef(value);

  // Synchroniser quand la prop value change de l'extérieur
  useEffect(() => {
    // Seulement si la valeur externe a vraiment changé (pas à cause de notre propre update)
    if (value !== prevValueRef.current && value !== localValue) {
      setLocalValue(value);
      prevValueRef.current = value;
      // Réinitialiser l'erreur quand la valeur change de l'extérieur
      setError(null);
    }
  }, [value, localValue]);

  // 🔒 SÉCURITÉ: Fonction de validation selon le type
  const validateValue = useCallback((numValue: number) => {
    if (validationType === 'none') {
      return { valid: true };
    }

    switch (validationType) {
      case 'weight':
        return validateWeight(numValue);
      case 'height':
        return validateHeight(numValue);
      case 'bodyFat':
        return validateBodyFat(numValue);
      case 'muscleMass':
        return validateMuscleMass(numValue);
      case 'water':
        return validateWater(numValue);
      case 'bodyMeasurement':
        return validateBodyMeasurement(numValue, fieldName || 'Mesure');
      case 'hydration':
        return validateHydrationEntry(numValue);
      default:
        return { valid: true };
    }
  }, [validationType, fieldName]);

  const handleChangeText = useCallback((text: string) => {
    // Filtrer pour n'accepter que les chiffres et le point décimal
    let filtered = text.replace(/[^0-9.]/g, '');

    if (!allowDecimal) {
      // Si pas de décimales autorisées, enlever les points
      filtered = filtered.replace(/\./g, '');
    } else {
      // S'assurer qu'il n'y a qu'un seul point
      const parts = filtered.split('.');
      if (parts.length > 2) {
        filtered = parts[0] + '.' + parts.slice(1).join('');
      }
      // Limiter le nombre de décimales
      if (parts.length === 2 && parts[1].length > maxDecimals) {
        filtered = parts[0] + '.' + parts[1].substring(0, maxDecimals);
      }
    }

    // Mettre à jour l'état LOCAL seulement (pas de callback parent ici)
    setLocalValue(filtered);
  }, [allowDecimal, maxDecimals]);

  const handleEndEditing = useCallback(() => {
    // Appeler le parent SEULEMENT quand l'utilisateur a fini de taper
    if (localValue !== value) {
      // 🔒 SÉCURITÉ: Valider avant d'envoyer au parent
      if (validationType !== 'none' && localValue.trim() !== '') {
        const numValue = parseFloat(localValue);
        if (!isNaN(numValue)) {
          const validation = validateValue(numValue);
          if (!validation.valid) {
            setError(validation.error || 'Valeur invalide');
            logger.warn('Invalid numeric input', {
              type: validationType,
              value: numValue,
              error: validation.error
            });
            return; // Ne pas envoyer au parent si invalide
          } else {
            setError(null);
            // Envoyer la valeur sanitizée si disponible
            const sanitizedValue = validation.sanitized?.toString() || localValue;
            onValueChange(sanitizedValue);
            return;
          }
        }
      }
      setError(null);
      onValueChange(localValue);
    }
  }, [localValue, value, onValueChange, validationType, validateValue]);

  const bgColor = backgroundColor || (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)');
  const textColor = error ? '#FF3B30' : (color || colors.textPrimary);
  const borderColor = error ? 'rgba(255, 59, 48, 0.3)' : 'transparent';

  if (label) {
    return (
      <View style={[styles.container, style]}>
        <Text style={[styles.label, { color: colors.textMuted }]}>
          {label}
        </Text>
        <View style={[
          styles.inputRow,
          { backgroundColor: bgColor, borderColor, borderWidth: error ? 1 : 0 }
        ]}>
          <TextInput
            style={[styles.input, { color: textColor }, inputStyle]}
            value={localValue}
            onChangeText={handleChangeText}
            onEndEditing={handleEndEditing}
            onBlur={handleEndEditing}
            placeholder={placeholder}
            placeholderTextColor={colors.border}
            keyboardType="decimal-pad"
            returnKeyType="done"
            maxLength={maxLength}
            selectTextOnFocus={true}
            autoCorrect={false}
            autoCapitalize="none"
            spellCheck={false}
            blurOnSubmit={false}
            textContentType="none"
            importantForAutofill="no"
            autoComplete="off"
          />
          {unit && (
            <Text style={[styles.unit, { color: error ? '#FF3B30' : colors.textPrimary }]}>
              {unit}
            </Text>
          )}
        </View>
        {/* 🔒 SÉCURITÉ: Affichage de l'erreur */}
        {error && (
          <Text style={styles.errorText}>{error}</Text>
        )}
      </View>
    );
  }

  // Sans label - juste l'input
  return (
    <View style={style}>
      <View style={[
        styles.inputWrapper,
        { backgroundColor: bgColor, borderColor, borderWidth: error ? 1 : 0 }
      ]}>
        <TextInput
          style={[{ color: textColor }, inputStyle]}
          value={localValue}
          onChangeText={handleChangeText}
          onEndEditing={handleEndEditing}
          onBlur={handleEndEditing}
          placeholder={placeholder}
          placeholderTextColor={colors.border}
          keyboardType="decimal-pad"
          returnKeyType="done"
          maxLength={maxLength}
          selectTextOnFocus={true}
          autoCorrect={false}
          autoCapitalize="none"
          spellCheck={false}
          blurOnSubmit={false}
          textContentType="none"
          importantForAutofill="no"
          autoComplete="off"
        />
        {unit && (
          <Text style={[styles.compactUnit, { color: error ? '#FF3B30' : colors.textPrimary }]}>
            {unit}
          </Text>
        )}
      </View>
      {/* 🔒 SÉCURITÉ: Affichage de l'erreur (compact) */}
      {error && (
        <Text style={styles.compactErrorText}>{error}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    fontSize: 24,
    fontWeight: '700',
    paddingVertical: 16,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Styles pour input compact (sans label)
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 2,
    minHeight: 40,
  },
  compactInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    paddingVertical: 8,
    textAlign: 'center',
  },
  compactUnit: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  // 🔒 SÉCURITÉ: Styles pour les erreurs
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 6,
    marginLeft: 2,
  },
  compactErrorText: {
    color: '#FF3B30',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
});
