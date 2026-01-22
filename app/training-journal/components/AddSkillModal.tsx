/**
 * AddSkillModal Component
 *
 * Modal for creating a new skill/technique with:
 * - Skill name input
 * - Discipline/category selector (JJB, Boxing, etc.)
 * - Initial status selector (to_learn, learning, acquired, mastered)
 * - Optional technical notes
 * - Optional video recording/selection
 *
 * Extracted from training-journal.tsx (148 lines)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import { X, Check, Camera, ImageIcon, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import {
  SkillCategory,
  SkillStatus,
  SKILL_CATEGORIES,
  SKILL_STATUS_CONFIG,
} from '@/lib/carnetService';
import { renderIcon } from '../utils/iconMap';

interface AddSkillModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  isSubmitting: boolean;

  // Form state
  newSkillName: string;
  setNewSkillName: (name: string) => void;
  newSkillCategory: SkillCategory;
  setNewSkillCategory: (category: SkillCategory) => void;
  newSkillStatus: SkillStatus;
  setNewSkillStatus: (status: SkillStatus) => void;
  newSkillNotes: string;
  setNewSkillNotes: (notes: string) => void;
  newSkillVideoUri: string | null;
  setNewSkillVideoUri: (uri: string | null) => void;

  // Actions
  onSubmit: () => Promise<void>;
  onRecordVideo: () => void;
  onPickVideo: () => void;
}

export default function AddSkillModal({
  visible,
  onClose,
  colors,
  isSubmitting,
  newSkillName,
  setNewSkillName,
  newSkillCategory,
  setNewSkillCategory,
  newSkillStatus,
  setNewSkillStatus,
  newSkillNotes,
  setNewSkillNotes,
  newSkillVideoUri,
  setNewSkillVideoUri,
  onSubmit,
  onRecordVideo,
  onPickVideo,
}: AddSkillModalProps) {
  return (
    <Modal visible={visible} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <ScrollView style={{ maxHeight: '90%' }} showsVerticalScrollIndicator={false}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nouvelle Technique</Text>
              <TouchableOpacity onPress={() => {
                onClose();
                setNewSkillStatus('to_learn');
                setNewSkillNotes('');
              }}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom de la technique</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Ex: Berimbolo, Leg Lock Defense..."
              placeholderTextColor={colors.textMuted}
              value={newSkillName}
              onChangeText={setNewSkillName}
              maxLength={50}
            />

            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Discipline</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
              {(Object.keys(SKILL_CATEGORIES) as SkillCategory[]).map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryOption,
                    { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                    newSkillCategory === cat && { backgroundColor: SKILL_CATEGORIES[cat].color, borderColor: SKILL_CATEGORIES[cat].color }
                  ]}
                  onPress={() => setNewSkillCategory(cat)}
                >
                  {renderIcon(
                    SKILL_CATEGORIES[cat].iconName,
                    18,
                    newSkillCategory === cat ? '#FFFFFF' : SKILL_CATEGORIES[cat].color
                  )}
                  <Text style={[
                    styles.categoryOptionText,
                    { color: newSkillCategory === cat ? '#FFFFFF' : colors.textPrimary }
                  ]}>
                    {SKILL_CATEGORIES[cat].label}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Status Selector */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Statut initial</Text>
            <View style={styles.statusSelectorRow}>
              {(Object.keys(SKILL_STATUS_CONFIG) as SkillStatus[]).map(status => {
                const config = SKILL_STATUS_CONFIG[status];
                const isSelected = newSkillStatus === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor: isSelected ? config.color : colors.backgroundCard,
                        borderColor: config.color,
                      }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNewSkillStatus(status);
                    }}
                  >
                    {isSelected && <Check size={12} color="#FFFFFF" strokeWidth={3} />}
                    <Text style={[
                      styles.statusPillText,
                      { color: isSelected ? '#FFFFFF' : config.color }
                    ]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Notes Field */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Notes techniques (optionnel)</Text>
            <TextInput
              style={[styles.textAreaInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
              placeholder="Grip pants first, then enter legs..."
              placeholderTextColor={colors.textMuted}
              value={newSkillNotes}
              onChangeText={setNewSkillNotes}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              maxLength={500}
            />

            {/* Video Picker Section */}
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Vidéo de la technique (optionnel)</Text>
            {newSkillVideoUri ? (
              <View style={[styles.videoPreviewContainer, { backgroundColor: colors.backgroundCard, borderColor: '#8B5CF6' }]}>
                <View style={styles.videoPreviewIcon}>
                  <Play size={24} color="#8B5CF6" />
                </View>
                <Text style={[styles.videoPreviewText, { color: colors.textPrimary }]} numberOfLines={1}>
                  Vidéo sélectionnée
                </Text>
                <TouchableOpacity
                  style={styles.videoRemoveBtn}
                  onPress={() => setNewSkillVideoUri(null)}
                >
                  <X size={18} color="#EF4444" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.videoPickerRow}>
                <TouchableOpacity
                  style={[styles.videoPickerBtn, { backgroundColor: '#8B5CF6' }]}
                  onPress={onRecordVideo}
                >
                  <Camera size={20} color="#FFFFFF" />
                  <Text style={styles.videoPickerBtnText}>Filmer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.videoPickerBtn, styles.videoPickerBtnSecondary, { borderColor: '#8B5CF6' }]}
                  onPress={onPickVideo}
                >
                  <ImageIcon size={20} color="#8B5CF6" />
                  <Text style={[styles.videoPickerBtnText, { color: '#8B5CF6' }]}>Galerie</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#8B5CF6', opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={onSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.modalButtonText}>{isSubmitting ? 'Ajout...' : 'Ajouter la Technique'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    borderRadius: 24,
    padding: 24,
    marginVertical: 40,
    alignSelf: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },
  textInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
    gap: 8,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  statusSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  statusPillText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textAreaInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 90,
  },
  videoPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  videoPreviewIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#8B5CF620',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPreviewText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
  },
  videoRemoveBtn: {
    padding: 8,
  },
  videoPickerRow: {
    flexDirection: 'row',
    gap: 12,
  },
  videoPickerBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  videoPickerBtnSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  videoPickerBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  modalButton: {
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 24,
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
