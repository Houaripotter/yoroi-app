import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { X, Plus, Minus, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';

interface RepsWeightModalProps {
  visible: boolean;
  seriesNumber: number;
  onClose: () => void;
  onSave: (reps: number, weight: number) => void;
  onSkip: () => void;
}

export function RepsWeightModal({
  visible,
  seriesNumber,
  onClose,
  onSave,
  onSkip,
}: RepsWeightModalProps) {
  const { colors } = useTheme();
  // Brouillons texte : permet décimales et champ vide, parsé à l'enregistrement
  const [repsText, setRepsText] = useState('10');
  const [weightText, setWeightText] = useState('0');
  const parseReps = (t: string) => Math.max(0, parseInt(t, 10) || 0);
  const parseWeight = (t: string) => Math.max(0, parseFloat(t.replace(',', '.')) || 0);

  const handleSave = () => {
    onSave(parseReps(repsText), parseWeight(weightText));
    // Reset pour la prochaine fois
    setRepsText('10');
    setWeightText('0');
  };

  const handleSkip = () => {
    onSkip();
    setRepsText('10');
    setWeightText('0');
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}
      >
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={[styles.modal, { backgroundColor: colors.backgroundCard }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Série {seriesNumber} terminée !
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Reps */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Combien de reps ?
            </Text>
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                onPress={() => setRepsText(t => String(Math.max(1, parseReps(t) - 1)))}
              >
                <Minus size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                value={repsText}
                onChangeText={(text) => setRepsText(text.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                selectTextOnFocus
                maxLength={4}
              />
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                onPress={() => setRepsText(t => String(parseReps(t) + 1))}
              >
                <Plus size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Weight */}
          <View style={styles.section}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>
              Poids (kg) ?
            </Text>
            <View style={styles.controls}>
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                onPress={() => setWeightText(t => String(Math.max(0, parseWeight(t) - 2.5)))}
              >
                <Minus size={20} color={colors.textPrimary} />
              </TouchableOpacity>
              <TextInput
                style={[styles.input, { color: colors.textPrimary, borderColor: colors.border }]}
                value={weightText}
                onChangeText={(text) => setWeightText(text.replace(/[^0-9.,]/g, ''))}
                keyboardType="decimal-pad"
                selectTextOnFocus
                maxLength={6}
              />
              <TouchableOpacity
                style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                onPress={() => setWeightText(t => String(parseWeight(t) + 2.5))}
              >
                <Plus size={20} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Actions */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.skipButton, { borderColor: colors.border }]}
              onPress={handleSkip}
            >
              <Text style={[styles.skipText, { color: colors.textMuted }]}>
                Passer
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.accent }]}
              onPress={handleSave}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Check size={14} color={colors.textOnAccent} strokeWidth={3} />
                <Text style={[styles.saveText, { color: colors.textOnAccent }]}>Enregistrer</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modal: {
    width: '85%',
    maxWidth: 400,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.xl,
  },
  title: {
    fontSize: FONT.size.xl,
    fontWeight: '700',
    flex: 1,
  },
  closeButton: {
    padding: SPACING.xs,
  },
  section: {
    marginBottom: SPACING.xl,
  },
  label: {
    fontSize: FONT.size.md,
    fontWeight: '600',
    marginBottom: SPACING.md,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.md,
  },
  controlBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    maxWidth: 120,
    height: 56,
    borderWidth: 2,
    borderRadius: RADIUS.lg,
    fontSize: FONT.size.xxl,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },
  actions: {
    flexDirection: 'row',
    gap: SPACING.md,
  },
  skipButton: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    alignItems: 'center',
  },
  skipText: {
    fontSize: FONT.size.md,
    fontWeight: '600',
  },
  saveButton: {
    flex: 2,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.full,
    alignItems: 'center',
  },
  saveText: {
    fontSize: FONT.size.md,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
