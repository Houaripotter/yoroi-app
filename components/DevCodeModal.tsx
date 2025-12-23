// ============================================
// 🔐 MODAL DE SAISIE DU CODE CRÉATEUR
// ============================================

import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { useDevMode } from '@/lib/DevModeContext';
import { SPACING, RADIUS } from '@/constants/appTheme';

export const DevCodeModal = () => {
  const { colors } = useTheme();
  const { showCodeInput, setShowCodeInput, verifyCode } = useDevMode();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (code.length !== 4) {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setError(false), 2000);
      return;
    }

    setLoading(true);
    const success = await verifyCode(code);
    setLoading(false);

    if (success) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        '🎉 Mode Créateur activé !',
        'Toutes les fonctionnalités Premium sont débloquées.\n\n• Tous les avatars\n• Tous les thèmes\n• Toutes les icônes d\'app\n• Fonctionnalités Pro',
        [{ text: 'Super !', style: 'default' }]
      );
      setCode('');
    } else {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setError(false), 2000);
    }
  };

  const handleClose = () => {
    setShowCodeInput(false);
    setCode('');
    setError(false);
  };

  return (
    <Modal
      visible={showCodeInput}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={handleClose}
        />

        <View style={[styles.modal, { backgroundColor: colors.backgroundElevated }]}>
          <Text style={[styles.title, { color: colors.accent }]}>🔐 Code Créateur</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Entrez le code secret pour débloquer toutes les fonctionnalités
          </Text>

          <TextInput
            style={[
              styles.input,
              {
                backgroundColor: colors.backgroundCard,
                color: colors.textPrimary,
                borderColor: error ? '#F44336' : colors.accent,
              },
            ]}
            value={code}
            onChangeText={(text) => {
              setCode(text);
              if (error) setError(false);
            }}
            keyboardType="number-pad"
            maxLength={4}
            placeholder="••••"
            placeholderTextColor={colors.textSecondary}
            secureTextEntry
            autoFocus
          />

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>❌ Code incorrect</Text>
            </View>
          )}

          <View style={styles.buttons}>
            <TouchableOpacity
              style={[styles.cancelButton, { backgroundColor: colors.backgroundCard }]}
              onPress={handleClose}
              disabled={loading}
            >
              <Text style={[styles.cancelText, { color: colors.textPrimary }]}>
                Annuler
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                { backgroundColor: colors.accent },
                loading && { opacity: 0.5 },
              ]}
              onPress={handleSubmit}
              disabled={loading}
            >
              <Text style={styles.submitText}>
                {loading ? 'Vérification...' : 'Valider'}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            💡 Astuce : Le code a 4 chiffres
          </Text>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modal: {
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    width: '85%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: SPACING.lg,
    lineHeight: 20,
  },
  input: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    width: '100%',
    letterSpacing: 16,
    borderWidth: 3,
    marginBottom: SPACING.md,
  },
  errorContainer: {
    marginBottom: SPACING.md,
  },
  errorText: {
    color: '#F44336',
    fontSize: 14,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    width: '100%',
    gap: SPACING.md,
    marginTop: SPACING.md,
  },
  cancelButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  cancelText: {
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    padding: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
  },
  submitText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  hint: {
    fontSize: 12,
    marginTop: SPACING.md,
    textAlign: 'center',
  },
});

export default DevCodeModal;
