import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useDevMode } from '@/lib/DevModeContext';
import { X, Unlock, Lock } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const DevCodeModal: React.FC = () => {
  const { colors } = useTheme();
  const { showCodeInput, setShowCodeInput, verifyCode } = useDevMode();
  const [code, setCode] = useState('');
  const [error, setError] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async () => {
    if (!verifyCode) return;
    
    const isValid = await verifyCode(code);
    if (isValid) {
      setSuccess(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => {
        setCode('');
        setSuccess(false);
        setShowCodeInput(false);
      }, 1500);
    } else {
      setError(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setTimeout(() => setError(false), 1000);
    }
  };

  const handleClose = () => {
    setCode('');
    setError(false);
    setSuccess(false);
    setShowCodeInput(false);
  };

  return (
    <Modal
      visible={showCodeInput}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.modal, { backgroundColor: colors.backgroundCard }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              🔐 Mode Créateur
            </Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Entrez le code secret pour débloquer toutes les fonctionnalités Pro.
          </Text>

          {/* Input */}
          <View style={[
            styles.inputContainer,
            { 
              borderColor: error ? '#EF4444' : success ? '#10B981' : colors.border,
              backgroundColor: error ? '#EF444410' : success ? '#10B98110' : colors.background
            }
          ]}>
            {success ? (
              <Unlock size={20} color="#10B981" />
            ) : (
              <Lock size={20} color={error ? '#EF4444' : colors.textMuted} />
            )}
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={code}
              onChangeText={setCode}
              placeholder="Code secret..."
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={4}
              secureTextEntry
              autoFocus
            />
          </View>

          {/* Error message */}
          {error && (
            <Text style={styles.errorText}>
              ❌ Code incorrect
            </Text>
          )}

          {/* Success message */}
          {success && (
            <Text style={styles.successText}>
              Mode Créateur activé !
            </Text>
          )}

          {/* Button */}
          <TouchableOpacity
            style={[
              styles.button,
              { backgroundColor: success ? '#10B981' : colors.accent },
              code.length < 4 && styles.buttonDisabled
            ]}
            onPress={handleSubmit}
            disabled={code.length < 4 || success}
          >
            <Text style={styles.buttonText}>
              {success ? 'Débloqué !' : 'Vérifier'}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 20,
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    marginBottom: 12,
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 8,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  successText: {
    color: '#10B981',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: '600',
  },
  button: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});

export default DevCodeModal;
