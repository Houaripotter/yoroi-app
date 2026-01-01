// ============================================
// 🔒 HOOK ANTI-SPAM - YOROI
// ============================================
// Empêche les double-clics et les appels multiples accidentels

import { useState, useCallback, useRef } from 'react';
import { logger } from '@/lib/logger';

interface UsePreventDoubleClickOptions {
  delay?: number; // Délai en ms entre deux clics (défaut: 500ms)
  logSpam?: boolean; // Logger les tentatives de spam (défaut: true en DEV)
}

/**
 * Hook personnalisé pour empêcher les double-clics
 *
 * @param delay - Délai minimum entre deux clics (défaut: 500ms)
 * @param logSpam - Si true, logger les tentatives de spam
 *
 * @returns {isProcessing, executeOnce}
 *
 * @example
 * const { isProcessing, executeOnce } = usePreventDoubleClick();
 *
 * <TouchableOpacity
 *   onPress={() => executeOnce(handleSave)}
 *   disabled={isProcessing}
 * >
 *   {isProcessing ? <ActivityIndicator /> : <Text>Sauvegarder</Text>}
 * </TouchableOpacity>
 */
export const usePreventDoubleClick = (options: UsePreventDoubleClickOptions = {}) => {
  const { delay = 500, logSpam = __DEV__ } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const lastClickTime = useRef(0);
  const spamAttempts = useRef(0);

  const executeOnce = useCallback(
    async <T,>(action: () => Promise<T> | T): Promise<T | undefined> => {
      const now = Date.now();
      const timeSinceLastClick = now - lastClickTime.current;

      // 🔒 PROTECTION 1: État de traitement
      if (isProcessing) {
        spamAttempts.current++;
        if (logSpam) {
          logger.warn('Spam click prevented (processing)', {
            attempts: spamAttempts.current,
            timeSinceLastClick
          });
        }
        return undefined;
      }

      // 🔒 PROTECTION 2: Délai minimum
      if (timeSinceLastClick < delay) {
        spamAttempts.current++;
        if (logSpam) {
          logger.warn('Spam click prevented (too fast)', {
            attempts: spamAttempts.current,
            timeSinceLastClick,
            requiredDelay: delay
          });
        }
        return undefined;
      }

      // Reset compteur de spam si l'action est valide
      if (spamAttempts.current > 0 && logSpam) {
        logger.info('Spam attempts cleared', { totalAttempts: spamAttempts.current });
        spamAttempts.current = 0;
      }

      lastClickTime.current = now;
      setIsProcessing(true);

      try {
        const result = await action();
        return result;
      } catch (error) {
        logger.error('Action failed in executeOnce', error);
        throw error;
      } finally {
        // Garder le state "processing" pendant au moins le délai spécifié
        setTimeout(() => setIsProcessing(false), delay);
      }
    },
    [isProcessing, delay, logSpam]
  );

  return {
    isProcessing,
    executeOnce,
    spamAttempts: spamAttempts.current
  };
};

// ============================================
// COMPOSANT BOUTON SÉCURISÉ
// ============================================

import React from 'react';
import {
  TouchableOpacity,
  ActivityIndicator,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';

interface SafeButtonProps {
  onPress: () => Promise<void> | void;
  title: string;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
  loading?: boolean;
  variant?: 'primary' | 'secondary' | 'danger';
  delay?: number;
}

export const SafeButton: React.FC<SafeButtonProps> = ({
  onPress,
  title,
  style,
  textStyle,
  disabled = false,
  loading = false,
  variant = 'primary',
  delay = 500,
}) => {
  const { isProcessing, executeOnce } = usePreventDoubleClick({ delay });

  const handlePress = () => {
    executeOnce(onPress);
  };

  const isDisabled = disabled || isProcessing || loading;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.button,
        styles[variant],
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.8}
    >
      {(isProcessing || loading) ? (
        <ActivityIndicator
          color={variant === 'primary' ? '#000' : '#fff'}
          size="small"
        />
      ) : (
        <Text
          style={[
            styles.text,
            styles[`${variant}Text`],
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 50,
  },
  primary: {
    backgroundColor: '#D4AF37',
  },
  secondary: {
    backgroundColor: '#2C2C2E',
  },
  danger: {
    backgroundColor: '#FF453A',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 16,
    fontWeight: '600',
  },
  primaryText: {
    color: '#000000',
  },
  secondaryText: {
    color: '#FFFFFF',
  },
  dangerText: {
    color: '#FFFFFF',
  },
});

export default usePreventDoubleClick;
