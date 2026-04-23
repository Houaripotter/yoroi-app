// ============================================
// PARTNER QUICK NOTE BUTTON · Note rapide via dictee iOS
// ============================================
// Ouvre un textarea plein ecran avec clavier + dictee iOS activable
// par l'utilisateur via l'icone micro du clavier.
// ============================================

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, TextInput, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Mic, X, Check } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { lightHaptic, successHaptic } from '@/lib/haptics';

interface Props {
  partnerName: string;
  onSave: (content: string) => Promise<void> | void;
}

export const PartnerQuickNoteButton: React.FC<Props> = ({ partnerName, onSave }) => {
  const { colors, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');

  const openModal = () => {
    lightHaptic().catch(() => {});
    setText('');
    setOpen(true);
  };

  const save = async () => {
    if (!text.trim()) {
      setOpen(false);
      return;
    }
    await onSave(text.trim());
    successHaptic().catch(() => {});
    setOpen(false);
    setText('');
  };

  return (
    <>
      <TouchableOpacity onPress={openModal} style={[styles.fab, { backgroundColor: '#8B5CF6' }]}>
        <Mic size={18} color="#fff" />
      </TouchableOpacity>

      <Modal visible={open} animationType="slide" transparent onRequestClose={() => setOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.overlay}
        >
          <View style={[styles.box, { backgroundColor: colors.card }]}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: colors.text }]}>Note rapide · {partnerName}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <X size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.hint, { color: colors.textMuted }]}>
              Touche l'icone micro du clavier pour dicter ta note.
            </Text>
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              multiline
              placeholder="Ce qui a marche, ce qui t'a surpris, ce a travailler..."
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                {
                  color: colors.text,
                  borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)',
                  backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                },
              ]}
            />
            <TouchableOpacity onPress={save} style={[styles.saveBtn, { backgroundColor: '#8B5CF6' }]}>
              <Check size={18} color="#fff" />
              <Text style={styles.saveText}>Enregistrer la note</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  fab: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: 'center', justifyContent: 'center',
  },
  overlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  box: {
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 40,
    gap: 10,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 16, fontWeight: '800' },
  hint: { fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  saveText: { color: '#fff', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
});

export default PartnerQuickNoteButton;
