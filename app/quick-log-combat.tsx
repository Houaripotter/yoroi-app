// ============================================
// SAISIE RAPIDE SPORTS DE COMBAT
// Techniques + Todo List
// ============================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  Check,
  Target,
  Trophy,
  Zap,
  X,
  ChevronDown,
  ChevronRight,
  Star,
  Play,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  ProgressionItem,
  ProgressionStatus,
  Sport,
  getProgressionItems,
  createProgressionItem,
  updateItemStatus,
  deleteProgressionItem,
  createPracticeLog,
  STATUS_LABELS,
} from '@/lib/trainingJournalService';

type FilterType = 'all' | 'todo' | 'in_progress' | 'mastered';

export default function QuickLogCombatScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  // États
  const [techniques, setTechniques] = useState<ProgressionItem[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTechniqueName, setNewTechniqueName] = useState('');
  const [selectedSport, setSelectedSport] = useState<Sport>('jjb');

  useEffect(() => {
    loadTechniques();
  }, []);

  const loadTechniques = () => {
    const items = getProgressionItems();
    const combatItems = items.filter(
      (item) =>
        item.sport === 'jjb' ||
        item.sport === 'mma' ||
        item.sport === 'boxe' ||
        item.sport === 'muay_thai' ||
        item.sport === 'judo' ||
        item.sport === 'karate'
    );
    setTechniques(combatItems);
  };

  const filteredTechniques = () => {
    if (filter === 'all') return techniques;
    return techniques.filter((t) => t.status === filter);
  };

  const handleAddTechnique = () => {
    if (!newTechniqueName.trim()) {
      showPopup('Erreur', 'Entre le nom de la technique', [{ text: 'OK', style: 'primary' }]);
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    createProgressionItem({
      type: 'technique',
      sport: selectedSport,
      name: newTechniqueName.trim(),
      status: 'todo',
      priority: 3,
    });

    setNewTechniqueName('');
    setAddModalVisible(false);
    loadTechniques();
  };

  const handleStatusChange = (technique: ProgressionItem) => {
    const statusOrder: ProgressionStatus[] = ['todo', 'in_progress', 'mastered'];
    const currentIndex = statusOrder.indexOf(technique.status);
    const nextStatus = statusOrder[(currentIndex + 1) % statusOrder.length];

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    updateItemStatus(technique.id, nextStatus);

    // Logger la pratique si passage en in_progress ou mastered
    if (nextStatus === 'in_progress' || nextStatus === 'mastered') {
      createPracticeLog({
        item_id: technique.id,
        date: new Date().toISOString(),
        quality_rating: nextStatus === 'mastered' ? 5 : 3,
      });
    }

    loadTechniques();
  };

  const handleDelete = (technique: ProgressionItem) => {
    showPopup(
      'Supprimer',
      `Supprimer "${technique.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            deleteProgressionItem(technique.id);
            loadTechniques();
          },
        },
      ]
    );
  };

  const getStatusIcon = (status: ProgressionStatus) => {
    switch (status) {
      case 'todo':
        return <Target size={20} color="#6B7280" />;
      case 'in_progress':
        return <Play size={20} color="#F59E0B" />;
      case 'mastered':
        return <Trophy size={20} color="#10B981" />;
    }
  };

  const getStatusColor = (status: ProgressionStatus) => {
    switch (status) {
      case 'todo':
        return '#6B7280';
      case 'in_progress':
        return '#F59E0B';
      case 'mastered':
        return '#10B981';
    }
  };

  const getStats = () => {
    return {
      total: techniques.length,
      todo: techniques.filter((t) => t.status === 'todo').length,
      in_progress: techniques.filter((t) => t.status === 'in_progress').length,
      mastered: techniques.filter((t) => t.status === 'mastered').length,
    };
  };

  const stats = getStats();

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.back();
          }}
          style={styles.backButton}
        >
          <ChevronLeft size={24} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
          Sports de Combat
        </Text>
        <TouchableOpacity
          onPress={() => setAddModalVisible(true)}
          style={[styles.addButton, { backgroundColor: colors.accent }]}
        >
          <Plus size={20} color={colors.textOnGold} strokeWidth={3} />
        </TouchableOpacity>
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.statValue, { color: '#6B7280' }]}>
              {stats.todo}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              À faire
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>
              {stats.in_progress}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              En cours
            </Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {stats.mastered}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              Maîtrisés
            </Text>
          </View>
        </View>
      </View>

      {/* Filtres */}
      <View style={styles.filtersContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersScroll}
        >
          {(['all', 'todo', 'in_progress', 'mastered'] as FilterType[]).map((f) => (
            <TouchableOpacity
              key={f}
              style={[
                styles.filterChip,
                {
                  backgroundColor: filter === f ? colors.accent : colors.backgroundCard,
                  borderColor: filter === f ? colors.accent : colors.border,
                },
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setFilter(f);
              }}
            >
              <Text
                style={[
                  styles.filterChipText,
                  {
                    color: filter === f ? '#FFFFFF' : colors.textPrimary,
                  },
                ]}
              >
                {f === 'all' ? 'Tout' : STATUS_LABELS[f as ProgressionStatus]}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Liste des techniques */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredTechniques().length === 0 ? (
          <View style={styles.emptyState}>
            <Target size={48} color={colors.textMuted} strokeWidth={1.5} />
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>
              Aucune technique pour ce filtre
            </Text>
            <TouchableOpacity
              style={[styles.emptyButton, { backgroundColor: colors.accent }]}
              onPress={() => setAddModalVisible(true)}
            >
              <Plus size={16} color={colors.textOnAccent} strokeWidth={3} />
              <Text style={[styles.emptyButtonText, { color: colors.textOnAccent }]}>Ajouter une technique</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTechniques().map((technique) => (
            <TouchableOpacity
              key={technique.id}
              style={[
                styles.techniqueCard,
                {
                  backgroundColor: colors.backgroundCard,
                  borderLeftColor: getStatusColor(technique.status),
                },
              ]}
              onPress={() => handleStatusChange(technique)}
              onLongPress={() => handleDelete(technique)}
              activeOpacity={0.7}
            >
              {/* Icône + Nom */}
              <View style={styles.techniqueLeft}>
                <View
                  style={[
                    styles.techniqueIcon,
                    { backgroundColor: `${getStatusColor(technique.status)}15` },
                  ]}
                >
                  {getStatusIcon(technique.status)}
                </View>
                <View style={styles.techniqueInfo}>
                  <Text style={[styles.techniqueName, { color: colors.textPrimary }]}>
                    {technique.name}
                  </Text>
                  {technique.practice_count > 0 && (
                    <Text style={[styles.techniqueCount, { color: colors.textMuted }]}>
                      Pratiqué {technique.practice_count} fois
                    </Text>
                  )}
                </View>
              </View>

              {/* Badge statut */}
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(technique.status)}20` },
                ]}
              >
                <Text
                  style={[
                    styles.statusBadgeText,
                    { color: getStatusColor(technique.status) },
                  ]}
                >
                  {STATUS_LABELS[technique.status]}
                </Text>
              </View>

              {/* Indicateur visuel de mastery */}
              {technique.status === 'mastered' && (
                <Star
                  size={20}
                  color="#10B981"
                  fill="#10B981"
                  style={{ marginLeft: 8 }}
                />
              )}
            </TouchableOpacity>
          ))
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modal Ajouter Technique */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.backgroundCard },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Nouvelle Technique
              </Text>
              <TouchableOpacity
                onPress={() => setAddModalVisible(false)}
                style={styles.modalCloseButton}
              >
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {/* Choix du sport */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                SPORT
              </Text>
              <View style={styles.sportButtons}>
                {[
                  { id: 'jjb' as Sport, label: 'JJB' },
                  { id: 'mma' as Sport, label: 'MMA' },
                  { id: 'boxe' as Sport, label: 'Boxe' },
                  { id: 'muay_thai' as Sport, label: 'Muay Thaï' },
                  { id: 'judo' as Sport, label: 'Judo' },
                  { id: 'karate' as Sport, label: 'Karaté' },
                ].map((sport) => (
                  <TouchableOpacity
                    key={sport.id}
                    style={[
                      styles.sportButton,
                      {
                        backgroundColor:
                          selectedSport === sport.id ? colors.accent : colors.background,
                        borderColor:
                          selectedSport === sport.id ? colors.accent : colors.border,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedSport(sport.id);
                    }}
                  >
                    <Text
                      style={[
                        styles.sportButtonText,
                        {
                          color:
                            selectedSport === sport.id
                              ? '#FFFFFF'
                              : colors.textPrimary,
                        },
                      ]}
                    >
                      {sport.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Nom de la technique */}
            <View style={styles.modalSection}>
              <Text style={[styles.modalLabel, { color: colors.textMuted }]}>
                NOM DE LA TECHNIQUE
              </Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.background,
                    color: colors.textPrimary,
                    borderColor: colors.border,
                  },
                ]}
                value={newTechniqueName}
                onChangeText={setNewTechniqueName}
                placeholder="Triangle depuis la garde, Armbar..."
                placeholderTextColor={colors.textMuted}
                autoFocus
              />
            </View>

            {/* Boutons */}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  setAddModalVisible(false);
                  setNewTechniqueName('');
                }}
              >
                <Text style={[styles.modalButtonText, { color: colors.textPrimary }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.modalButton,
                  { backgroundColor: colors.accent },
                ]}
                onPress={handleAddTechnique}
              >
                <Text style={[styles.modalButtonText, { color: '#FFFFFF' }]}>
                  Ajouter
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <PopupComponent />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statCard: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '900',
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  filtersContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  filtersScroll: {
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 16,
  },
  techniqueCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  techniqueLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  techniqueIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  techniqueInfo: {
    flex: 1,
  },
  techniqueName: {
    fontSize: 15,
    fontWeight: '600',
  },
  techniqueCount: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: 16,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  modalCloseButton: {
    padding: 4,
  },
  modalSection: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  sportButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  sportButtonText: {
    fontSize: 13,
    fontWeight: '600',
  },
  modalInput: {
    fontSize: 16,
    fontWeight: '600',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});
