/**
 * TrashModal Component
 *
 * Modal for managing deleted items (trash/recycle bin) with:
 * - List of deleted benchmarks and skills
 * - Restore individual items
 * - Empty entire trash
 * - Empty state display
 * - Relative deletion dates
 *
 * Extracted from training-journal.tsx (171 lines)
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  SafeAreaView,
} from 'react-native';
import { X, Trash2, RotateCcw, Dumbbell, BookOpen } from 'lucide-react-native';
import { useI18n } from '@/lib/I18nContext';
import { Benchmark, Skill, TrashItem } from '@/lib/carnetService';

interface TrashModalProps {
  visible: boolean;
  onClose: () => void;
  colors: any;
  insets: { bottom: number };

  // Trash data
  trashBenchmarks: TrashItem<Benchmark>[];
  trashSkills: TrashItem<Skill>[];
  trashCount: number;

  // Actions
  onRestoreBenchmark: (id: string) => void;
  onRestoreSkill: (id: string) => void;
  onEmptyTrash: () => void;
}

export default React.memo(function TrashModal({
  visible,
  onClose,
  colors,
  insets,
  trashBenchmarks,
  trashSkills,
  trashCount,
  onRestoreBenchmark,
  onRestoreSkill,
  onEmptyTrash,
}: TrashModalProps) {
  const { t } = useI18n();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <X size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>{t('trashModal.title')}</Text>
          <View style={{ width: 36 }} />
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Empty State */}
          {trashCount === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <View style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: colors.backgroundCard,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
              }}>
                <Trash2 size={36} color={colors.textMuted} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: colors.textPrimary, marginBottom: 8 }}>
                {t('trashModal.emptyTitle')}
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>
                {t('trashModal.emptyMsg')}
              </Text>
            </View>
          )}

          {/* Trashed Benchmarks */}
          {trashBenchmarks.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.sectionHeader}>
                <Dumbbell size={18} color="#EF4444" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('trashModal.deletedBenchmarks').replace('{{count}}', String(trashBenchmarks.length))}
                </Text>
              </View>

              {trashBenchmarks.map((trashItem, index) => {
                const benchmark = trashItem.item;
                const deletedDate = new Date(trashItem.deletedAt);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
                const deletedText = diffDays === 0 ? t('trashModal.deletedToday') : diffDays === 1 ? t('trashModal.deletedYesterday') : t('trashModal.deletedDaysAgo').replace('{{n}}', String(diffDays));

                return (
                  <View
                    key={benchmark.id}
                    style={[
                      styles.trashItem,
                      {
                        backgroundColor: colors.backgroundCard,
                        borderColor: colors.border,
                        marginTop: index === 0 ? 12 : 8,
                      }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                        {benchmark.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        {t('trashModal.deleted')} {deletedText}
                      </Text>
                      {benchmark.entries.length > 0 && (
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          {benchmark.entries.length} {t('trashModal.entries')}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => onRestoreBenchmark(benchmark.id)}
                      style={[styles.restoreButton, { backgroundColor: colors.success + '15', borderColor: colors.success }]}
                    >
                      <RotateCcw size={18} color={colors.success} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Trashed Skills */}
          {trashSkills.length > 0 && (
            <View style={{ marginTop: 24, marginBottom: 100 }}>
              <View style={styles.sectionHeader}>
                <BookOpen size={18} color="#8B5CF6" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  {t('trashModal.deletedSkills').replace('{{count}}', String(trashSkills.length))}
                </Text>
              </View>

              {trashSkills.map((trashItem, index) => {
                const skill = trashItem.item;
                const deletedDate = new Date(trashItem.deletedAt);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
                const deletedText = diffDays === 0 ? t('trashModal.deletedToday') : diffDays === 1 ? t('trashModal.deletedYesterday') : t('trashModal.deletedDaysAgo').replace('{{n}}', String(diffDays));

                return (
                  <View
                    key={skill.id}
                    style={[
                      styles.trashItem,
                      {
                        backgroundColor: colors.backgroundCard,
                        borderColor: colors.border,
                        marginTop: index === 0 ? 12 : 8,
                      }
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 16, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>
                        {skill.name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        {t('trashModal.deleted')} {deletedText}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {skill.drillCount} {t('trashModal.reps')}
                        </Text>
                        {skill.notes.length > 0 && (
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>
                            • {skill.notes.length} {t('trashModal.notes')}
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => onRestoreSkill(skill.id)}
                      style={[styles.restoreButton, { backgroundColor: colors.success + '15', borderColor: colors.success }]}
                    >
                      <RotateCcw size={18} color={colors.success} />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>

        {/* Empty Trash Button - Fixed at bottom */}
        {trashCount > 0 && (
          <View style={[styles.trashFooter, {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: insets.bottom || 20,
          }]}>
            <TouchableOpacity
              onPress={onEmptyTrash}
              style={[styles.emptyTrashButton, { backgroundColor: colors.error }]}
            >
              <Trash2 size={20} color="#FFFFFF" />
              <Text style={styles.emptyTrashText}>
                {t('trashModal.emptyTrash').replace('{{count}}', String(trashCount))}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
    width: 44,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  trashItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  restoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  trashFooter: {
    paddingHorizontal: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  emptyTrashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
  },
  emptyTrashText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
