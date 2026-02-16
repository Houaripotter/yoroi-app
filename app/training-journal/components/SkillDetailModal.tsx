/**
 * SkillDetailModal Component
 *
 * Modal for viewing and editing a skill/technique with:
 * - Status selector (to_learn, learning, acquired, mastered)
 * - Drill counter (repetitions tracker)
 * - Notes section (add/delete notes)
 * - Video link management (YouTube, Instagram, etc.)
 * - Delete skill action
 *
 * Extracted from training-journal.tsx (193 lines)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { ChevronLeft, X, Trash2, Check, Plus, Video, ExternalLink } from 'lucide-react-native';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import {
  Skill,
  SkillStatus,
  SKILL_STATUS_CONFIG,
  SKILL_CATEGORIES,
  deleteSkillNote,
  getSkills,
} from '@/lib/carnetService';

interface SkillDetailModalProps {
  visible: boolean;
  onClose: () => void;
  skill: Skill | null;
  colors: any;
  locale: string;
  isSubmitting: boolean;

  // Drill counter
  drillIncrement: string;
  setDrillIncrement: (value: string) => void;
  onIncrementDrill: () => void;

  // Notes
  newNoteText: string;
  setNewNoteText: (text: string) => void;
  onAddNote: () => void;

  // Video URL
  editingVideoUrl: string;
  setEditingVideoUrl: (url: string) => void;
  onUpdateVideoUrl: () => void;
  onOpenVideoUrl: (url: string) => void;

  // Actions
  onUpdateStatus: (skillId: string, status: SkillStatus) => void;
  onDelete: (skillId: string) => void;
  onRefreshSkill: (skill: Skill) => void;
}

export default React.memo(function SkillDetailModal({
  visible,
  onClose,
  skill,
  colors,
  locale,
  isSubmitting,
  drillIncrement,
  setDrillIncrement,
  onIncrementDrill,
  newNoteText,
  setNewNoteText,
  onAddNote,
  editingVideoUrl,
  setEditingVideoUrl,
  onUpdateVideoUrl,
  onOpenVideoUrl,
  onUpdateStatus,
  onDelete,
  onRefreshSkill,
}: SkillDetailModalProps) {
  if (!skill) return null;

  const statusConfig = SKILL_STATUS_CONFIG[skill.status];
  const categoryConfig = SKILL_CATEGORIES[skill.category] || {
    label: 'Autre',
    color: '#6B7280',
    iconName: 'circle'
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[styles.detailModalOverlay, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={onClose}
              style={styles.detailHeaderBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.detailTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {skill.name}
            </Text>
            <View style={styles.detailHeaderRight}>
              <TouchableOpacity
                onPress={() => onDelete(skill.id)}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={22} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={styles.detailCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            {/* Status Selector */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>STATUT</Text>
            <View style={styles.statusRow}>
              {(Object.keys(SKILL_STATUS_CONFIG) as SkillStatus[]).map(status => {
                const config = SKILL_STATUS_CONFIG[status];
                const isSelected = skill.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      { backgroundColor: isSelected ? config.color : colors.backgroundCard, borderColor: config.color }
                    ]}
                    onPress={() => onUpdateStatus(skill.id, status)}
                  >
                    {isSelected && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
                    <Text style={[styles.statusOptionText, { color: isSelected ? '#FFFFFF' : config.color }]}>
                      {config.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Drill Counter */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>COMPTEUR DE REPS</Text>
            <View style={[styles.drillCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <View style={styles.drillInfo}>
                <Text style={[styles.drillCount, { color: colors.textPrimary }]}>
                  {skill.drillCount}
                </Text>
                <Text style={[styles.drillLabel, { color: colors.textMuted }]}>répétitions</Text>
              </View>
              <View style={styles.drillActions}>
                <TextInput
                  style={[styles.drillInput, { backgroundColor: colors.background, color: colors.textPrimary, borderColor: colors.border }]}
                  value={drillIncrement}
                  onChangeText={setDrillIncrement}
                  keyboardType="numeric"
                  placeholder="10"
                  placeholderTextColor={colors.textMuted}
                />
                <TouchableOpacity
                  style={[styles.drillAddBtn, { backgroundColor: categoryConfig.color }]}
                  onPress={onIncrementDrill}
                >
                  <Plus size={18} color="#FFFFFF" strokeWidth={3} />
                  <Text style={styles.drillAddText}>Ajouter</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notes */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>NOTES</Text>
            <View style={[styles.noteInputContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <TextInput
                style={[styles.noteInput, { color: colors.textPrimary }]}
                placeholder="Grip pants first, then..."
                placeholderTextColor={colors.textMuted}
                value={newNoteText}
                onChangeText={setNewNoteText}
                multiline
                maxLength={500}
              />
              <TouchableOpacity
                style={[styles.noteAddBtn, { backgroundColor: categoryConfig.color, opacity: (!newNoteText.trim() || isSubmitting) ? 0.6 : 1 }]}
                onPress={onAddNote}
                disabled={!newNoteText.trim() || isSubmitting}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {skill.notes.length > 0 && (
              <View style={styles.notesList}>
                {[...skill.notes].reverse().map(note => (
                  <View
                    key={note.id}
                    style={[styles.noteItem, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  >
                    <Text style={[styles.noteText, { color: colors.textPrimary }]}>{note.text}</Text>
                    <View style={styles.noteFooter}>
                      <Text style={[styles.noteDate, { color: colors.textMuted }]}>
                        {new Date(note.date).toLocaleDateString(locale, { day: 'numeric', month: 'short' })}
                      </Text>
                      <TouchableOpacity
                        onPress={async () => {
                          impactAsync(ImpactFeedbackStyle.Light);
                          await deleteSkillNote(skill.id, note.id);
                          const updated = await getSkills();
                          const refreshed = updated.find(s => s.id === skill.id);
                          if (refreshed) onRefreshSkill(refreshed);
                        }}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Video Link Section */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>LIEN VIDÉO</Text>
            <View style={[styles.videoLinkContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Video size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.videoLinkInput, { color: colors.textPrimary }]}
                placeholder="YouTube, Instagram..."
                placeholderTextColor={colors.textMuted}
                value={editingVideoUrl || skill.videoUrl || ''}
                onChangeText={setEditingVideoUrl}
                autoCapitalize="none"
                keyboardType="url"
                maxLength={500}
              />
              {(editingVideoUrl || skill.videoUrl) && (
                <TouchableOpacity
                  style={[styles.videoSaveBtn, { backgroundColor: categoryConfig.color }]}
                  onPress={onUpdateVideoUrl}
                >
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
              )}
            </View>
            {skill.videoUrl && (
              <TouchableOpacity
                style={[styles.watchVideoBtn, { backgroundColor: categoryConfig.color + '20', borderColor: categoryConfig.color }]}
                onPress={() => onOpenVideoUrl(skill.videoUrl!)}
              >
                <ExternalLink size={16} color={categoryConfig.color} />
                <Text style={[styles.watchVideoText, { color: categoryConfig.color }]}>
                  Voir la vidéo
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  detailModalOverlay: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  detailHeaderBtn: {
    padding: 8,
  },
  detailCloseBtn: {
    padding: 8,
  },
  detailHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
    marginLeft: 8,
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 24,
  },
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 6,
  },
  statusOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  drillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  drillInfo: {
    alignItems: 'center',
  },
  drillCount: {
    fontSize: 32,
    fontWeight: '700',
  },
  drillLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  drillActions: {
    flexDirection: 'row',
    gap: 8,
  },
  drillInput: {
    width: 60,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  drillAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  drillAddText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  noteInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  noteAddBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notesList: {
    marginTop: 12,
    gap: 8,
  },
  noteItem: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteDate: {
    fontSize: 12,
  },
  videoLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  videoLinkInput: {
    flex: 1,
    fontSize: 14,
  },
  videoSaveBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  watchVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    marginTop: 8,
    gap: 8,
  },
  watchVideoText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
