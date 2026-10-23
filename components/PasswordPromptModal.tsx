// ============================================
// PASSWORD PROMPT MODAL
// Ancienne fenetre de mot de passe ; usePasswordPrompt passe desormais par appPassword.
// Utilisé pour demander un mot de passe en saisie sécurisée.
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  Modal, View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard,
} from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { Lock, X } from 'lucide-react-native';
import { appPassword } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';

interface Props {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  onSubmit: (password: string) => void;
  onCancel: () => void;
  minLength?: number;
}

export const PasswordPromptModal: React.FC<Props> = ({
  visible, title, message, confirmLabel = traduire('Valider'), onSubmit, onCancel, minLength = 0,
}) => {
  const { colors, isDark } = useTheme();
  const [value, setValue] = useState('');
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      setValue('');
      // Focus auto après ouverture
      setTimeout(() => inputRef.current?.focus(), 200);
    }
  }, [visible]);

  const canSubmit = value.length >= minLength;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(value);
    setValue('');
  };

  const handleCancel = () => {
    setValue('');
    onCancel();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleCancel}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <TouchableWithoutFeedback onPress={handleCancel}>
          <View style={styles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={[styles.card, { backgroundColor: isDark ? '#1E1E22' : '#fff' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={[styles.iconWrap, { backgroundColor: '#0EA5E920' }]}>
              <Lock size={18} color="#0EA5E9" />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
            <TouchableOpacity onPress={handleCancel} hitSlop={8}>
              <X size={18} color={colors.textMuted ?? '#888'} />
            </TouchableOpacity>
          </View>

          {message && (
            <Text style={[styles.message, { color: colors.textMuted ?? '#666' }]}>
              {message}
            </Text>
          )}

          {/* Input sécurisé */}
          <TextInput
            ref={inputRef}
            style={[styles.input, {
              backgroundColor: isDark ? '#2A2A2E' : '#F3F4F6',
              color: colors.text,
              borderColor: colors.border ?? '#E5E7EB',
            }]}
            value={value}
            onChangeText={setValue}
            placeholder={traduire("Mot de passe")}
            placeholderTextColor={colors.textMuted ?? '#888'}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            onSubmitEditing={handleSubmit}
          />

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              onPress={handleCancel}
              style={[styles.btn, styles.btnSecondary, { borderColor: colors.border ?? '#E5E7EB' }]}
              activeOpacity={0.7}
            >
              <Text style={[styles.btnSecondaryText, { color: colors.text }]}>{traduire("Annuler")}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={!canSubmit}
              style={[styles.btn, styles.btnPrimary, { opacity: canSubmit ? 1 : 0.5 }]}
              activeOpacity={0.8}
            >
              <Text style={styles.btnPrimaryText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

/**
 * Hook utilitaire pour utiliser le modal en mode "async prompt".
 * Usage :
 *   const prompt = usePasswordPrompt();
 *   const pwd = await prompt({ title: '...', message: '...', minLength: 8 });
 *   if (pwd === null) return; // annulé
 */
export function usePasswordPrompt() {
  // Delegue a la fenetre maison YOROI (saisie masquee) montee dans app/_layout.tsx
  const prompt = (opts: { title: string; message?: string; confirmLabel?: string; minLength?: number }): Promise<string | null> => appPassword(opts);
  return { prompt, PromptElement: null as React.ReactNode };
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  card: {
    width: '85%', maxWidth: 420,
    borderRadius: 16, padding: 18, gap: 12,
    shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 16, shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  iconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  title: { flex: 1, fontSize: 15, fontWeight: '800' },
  message: { fontSize: 13, lineHeight: 18 },
  input: {
    borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15,
  },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  btnPrimary: { backgroundColor: '#0EA5E9' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  btnSecondary: { borderWidth: 1 },
  btnSecondaryText: { fontSize: 14, fontWeight: '700' },
});
