// ============================================
// 📖 YOROI - CARNET D'ENTRAÎNEMENT
// ============================================

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Platform,
  Share,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  Plus,
  ChevronDown,
  ChevronUp,
  Play,
  Check,
  Trash2,
  Star,
  BookOpen,
  Target,
  Trophy,
  Calendar,
  X,
  BarChart3,
  Share2,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  ProgressionItem,
  ProgressionStatus,
  Sport,
  ProgressionItemType,
  createProgressionItem,
  getProgressionItems,
  updateItemStatus,
  deleteProgressionItem,
  createPracticeLog,
  getLastPracticeLog,
  getPracticeLogsByItemId,
  getJournalStats,
  SPORT_LABELS,
  TYPE_LABELS,
  STATUS_LABELS,
} from '@/lib/trainingJournalService';
import { ProgressChart } from '@/components/ProgressChart';
import { ShareableProgressCard } from '@/components/ShareableProgressCard';
import { captureRef } from 'react-native-view-shot';
import logger from '@/lib/security/logger';

export default function TrainingJournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // États
  const [todoItems, setTodoItems] = useState<ProgressionItem[]>([]);
  const [inProgressItems, setInProgressItems] = useState<ProgressionItem[]>([]);
  const [masteredItems, setMasteredItems] = useState<ProgressionItem[]>([]);
  const [stats, setStats] = useState({ todo: 0, in_progress: 0, mastered: 0, mastered_this_week: 0 });

  // Sections ouvertes/fermées
  const [todoOpen, setTodoOpen] = useState(true);
  const [inProgressOpen, setInProgressOpen] = useState(true);
  const [masteredOpen, setMasteredOpen] = useState(false);

  // Graphiques ouverts
  const [expandedCharts, setExpandedCharts] = useState<Set<number>>(new Set());

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProgressionItem | null>(null);
  const [shareItem, setShareItem] = useState<ProgressionItem | null>(null);

  // Ref pour la capture de la carte partageable
  const shareCardRef = useRef<View>(null);

  // Formulaire ajout
  const [newItemType, setNewItemType] = useState<ProgressionItemType>('technique');
  const [newItemSport, setNewItemSport] = useState<Sport>('jjb');
  const [newItemName, setNewItemName] = useState('');
  const [newItemTarget, setNewItemTarget] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemPriority, setNewItemPriority] = useState(3);
  // Champs spécifiques
  const [newItemCurrentWeight, setNewItemCurrentWeight] = useState('');
  const [newItemTargetWeight, setNewItemTargetWeight] = useState('');
  const [newItemDistanceKm, setNewItemDistanceKm] = useState('');
  const [newItemCurrentTime, setNewItemCurrentTime] = useState('');
  const [newItemTargetTime, setNewItemTargetTime] = useState('');

  // Formulaire log
  const [logQuality, setLogQuality] = useState(3);
  const [logNotes, setLogNotes] = useState('');
  const [logSets, setLogSets] = useState('');
  const [logReps, setLogReps] = useState('');
  const [logWeight, setLogWeight] = useState('');
  const [logTime, setLogTime] = useState('');

  // Charger les données
  const loadData = useCallback(() => {
    try {
      setTodoItems(getProgressionItems('todo'));
      setInProgressItems(getProgressionItems('in_progress'));
      setMasteredItems(getProgressionItems('mastered'));
      setStats(getJournalStats());
    } catch (error) {
      logger.error('[TRAINING_JOURNAL] Erreur chargement:', error);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Ajouter un objectif
  const handleAddItem = () => {
    if (!newItemName.trim()) {
      Alert.alert('Erreur', 'Le nom est requis');
      return;
    }

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      createProgressionItem({
        type: newItemType,
        sport: newItemSport,
        name: newItemName,
        status: 'todo',
        target: newItemTarget || undefined,
        priority: newItemPriority,
        notes: newItemNotes || undefined,
        current_weight: newItemCurrentWeight ? parseFloat(newItemCurrentWeight) : undefined,
        target_weight: newItemTargetWeight ? parseFloat(newItemTargetWeight) : undefined,
        distance_km: newItemDistanceKm ? parseFloat(newItemDistanceKm) : undefined,
        current_time: newItemCurrentTime ? parseInt(newItemCurrentTime) : undefined,
        target_time: newItemTargetTime ? parseInt(newItemTargetTime) : undefined,
      });

      // Reset form
      setNewItemName('');
      setNewItemTarget('');
      setNewItemNotes('');
      setNewItemPriority(3);
      setNewItemCurrentWeight('');
      setNewItemTargetWeight('');
      setNewItemDistanceKm('');
      setNewItemCurrentTime('');
      setNewItemTargetTime('');
      setAddModalVisible(false);

      loadData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'ajouter l\'objectif');
    }
  };

  // Logger une pratique
  const handleLogPractice = () => {
    if (!selectedItem) return;

    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      createPracticeLog({
        item_id: selectedItem.id,
        date: new Date().toISOString(),
        quality_rating: logQuality,
        notes: logNotes || undefined,
        sets: logSets ? parseInt(logSets) : undefined,
        reps: logReps ? parseInt(logReps) : undefined,
        weight: logWeight ? parseFloat(logWeight) : undefined,
        time: logTime ? parseInt(logTime) : undefined,
      });

      // Reset form
      setLogQuality(3);
      setLogNotes('');
      setLogSets('');
      setLogReps('');
      setLogWeight('');
      setLogTime('');
      setLogModalVisible(false);
      setSelectedItem(null);

      loadData();
    } catch (error) {
      Alert.alert('Erreur', 'Impossible d\'enregistrer la pratique');
    }
  };

  // Changer le statut
  const handleStatusChange = (item: ProgressionItem, newStatus: ProgressionStatus) => {
    Alert.alert(
      'Changer le statut ?',
      `Passer "${item.name}" en "${STATUS_LABELS[newStatus]}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              updateItemStatus(item.id, newStatus);
              loadData();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de changer le statut');
            }
          },
        },
      ]
    );
  };

  // Supprimer un item
  const handleDeleteItem = (item: ProgressionItem) => {
    Alert.alert(
      'Supprimer ?',
      `Supprimer "${item.name}" définitivement ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              deleteProgressionItem(item.id);
              loadData();
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer');
            }
          },
        },
      ]
    );
  };

  // Ouvrir le logger pour un item
  const handleOpenLogger = (item: ProgressionItem) => {
    setSelectedItem(item);
    setLogModalVisible(true);
  };

  // Toggle graphique
  const toggleChart = (itemId: number) => {
    setExpandedCharts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  // Partager le graphique
  const handleShareProgress = async (item: ProgressionItem) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

      // Afficher la modal avec la carte
      setShareItem(item);
      setShareModalVisible(true);

      // Attendre que la modal soit rendue
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!shareCardRef.current) {
        Alert.alert('Erreur', 'Impossible de générer l\'image');
        setShareModalVisible(false);
        return;
      }

      // Capturer la carte en image
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
      });

      // Fermer la modal
      setShareModalVisible(false);
      setShareItem(null);

      // Partager
      await Share.share({
        url: uri,
        message: `Ma progression : ${item.name} - ${SPORT_LABELS[item.sport]} 💪`,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      logger.error('[SHARE] Erreur:', error);
      setShareModalVisible(false);
      setShareItem(null);
      Alert.alert('Erreur', 'Impossible de partager le graphique');
    }
  };

  // Render un item
  const renderItem = (item: ProgressionItem, showActions: boolean = true) => {
    const lastLog = getLastPracticeLog(item.id);
    const daysSince = lastLog
      ? Math.floor((Date.now() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    // Récupérer tous les logs pour le graphique
    const allLogs = item.status === 'in_progress' ? getPracticeLogsByItemId(item.id) : [];
    const hasData = allLogs.length > 0;
    const isChartExpanded = expandedCharts.has(item.id);

    // Préparer les données pour le graphique
    let chartData: { date: string; value: number }[] = [];
    let chartType: 'weight' | 'time' | 'quality' = 'quality';
    let chartUnit = '';
    let chartTarget: number | undefined;

    if (item.current_weight && item.target_weight) {
      chartType = 'weight';
      chartUnit = 'kg';
      chartTarget = item.target_weight;
      chartData = allLogs
        .filter(log => log.weight)
        .map(log => ({ date: log.date, value: log.weight! }));
    } else if (item.current_time && item.target_time) {
      chartType = 'time';
      chartUnit = 'min';
      chartTarget = item.target_time;
      chartData = allLogs
        .filter(log => log.time)
        .map(log => ({ date: log.date, value: log.time! }));
    } else {
      chartType = 'quality';
      chartUnit = '/5';
      chartData = allLogs
        .filter(log => log.quality_rating)
        .map(log => ({ date: log.date, value: log.quality_rating! }));
    }

    return (
      <View
        key={item.id}
        style={[styles.itemCard, { backgroundColor: colors.backgroundCard }]}
      >
        <View style={styles.itemHeader}>
          <View style={styles.itemTitleRow}>
            <Text style={[styles.itemName, { color: colors.textPrimary }]}>
              {item.name}
            </Text>
            {item.target && (
              <Text style={[styles.itemTarget, { color: colors.textMuted }]}>
                → {item.target}
              </Text>
            )}
          </View>
          <Text style={[styles.itemSport, { color: colors.accent }]}>
            {SPORT_LABELS[item.sport]} • {TYPE_LABELS[item.type]}
          </Text>
        </View>

        {/* Progression Musculation/CrossFit */}
        {(item.current_weight && item.target_weight) && (
          <View style={styles.progressBar}>
            <View style={styles.progressBarHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {item.current_weight}kg / {item.target_weight}kg
              </Text>
              <Text style={[styles.progressPercent, { color: colors.accent }]}>
                {item.progress_percent}%
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: `${colors.accent}20` }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: colors.accent, width: `${Math.min(100, item.progress_percent)}%` }
                ]}
              />
            </View>
          </View>
        )}

        {/* Progression Running/Trail */}
        {(item.current_time && item.target_time) && (
          <View style={styles.progressBar}>
            <View style={styles.progressBarHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {item.current_time}min / {item.target_time}min
              </Text>
              <Text style={[styles.progressPercent, { color: colors.accent }]}>
                {item.progress_percent}%
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: `${colors.accent}20` }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: colors.accent, width: `${Math.min(100, item.progress_percent)}%` }
                ]}
              />
            </View>
          </View>
        )}

        {item.status === 'in_progress' && (
          <>
            <View style={styles.progressInfo}>
              <Text style={[styles.practiceCount, { color: colors.textSecondary }]}>
                Pratiqué {item.practice_count}x
                {daysSince !== null && ` • Il y a ${daysSince}j`}
              </Text>
              {lastLog?.notes && (
                <Text style={[styles.lastNotes, { color: colors.textMuted }]} numberOfLines={1}>
                  "{lastLog.notes}"
                </Text>
              )}
            </View>

            {/* Boutons graphique */}
            {hasData && (
              <View style={styles.chartButtons}>
                <TouchableOpacity
                  style={[styles.chartToggleBtn, { backgroundColor: `${colors.accent}15`, flex: 1 }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    toggleChart(item.id);
                  }}
                  activeOpacity={0.7}
                >
                  <BarChart3 size={14} color={colors.accent} />
                  <Text style={[styles.chartToggleText, { color: colors.accent }]}>
                    {isChartExpanded ? 'Masquer' : 'Voir'} le graphique
                  </Text>
                  {isChartExpanded ? (
                    <ChevronUp size={14} color={colors.accent} />
                  ) : (
                    <ChevronDown size={14} color={colors.accent} />
                  )}
                </TouchableOpacity>

                {isChartExpanded && (
                  <TouchableOpacity
                    style={[styles.shareBtn, { backgroundColor: `${colors.accent}15` }]}
                    onPress={() => handleShareProgress(item)}
                    activeOpacity={0.7}
                  >
                    <Share2 size={16} color={colors.accent} />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Graphique */}
            {isChartExpanded && hasData && (
              <ProgressChart
                data={chartData}
                targetValue={chartTarget}
                unit={chartUnit}
                type={chartType}
              />
            )}
          </>
        )}

        {item.status === 'mastered' && item.mastered_date && (
          <Text style={[styles.masteredDate, { color: colors.success }]}>
            ✓ Maîtrisé le {new Date(item.mastered_date).toLocaleDateString('fr-FR')}
          </Text>
        )}

        {showActions && (
          <View style={styles.itemActions}>
            {item.status === 'todo' && (
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: `${colors.accent}20` }]}
                onPress={() => handleStatusChange(item, 'in_progress')}
              >
                <Play size={16} color={colors.accent} />
                <Text style={[styles.actionBtnText, { color: colors.accent }]}>
                  Commencer
                </Text>
              </TouchableOpacity>
            )}

            {item.status === 'in_progress' && (
              <>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: `${colors.accent}20` }]}
                  onPress={() => handleOpenLogger(item)}
                >
                  <Plus size={16} color={colors.accent} />
                  <Text style={[styles.actionBtnText, { color: colors.accent }]}>
                    Logger
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: `${colors.success}20` }]}
                  onPress={() => handleStatusChange(item, 'mastered')}
                >
                  <Check size={16} color={colors.success} />
                  <Text style={[styles.actionBtnText, { color: colors.success }]}>
                    Maîtrisé
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: `${colors.error}15` }]}
              onPress={() => handleDeleteItem(item)}
            >
              <Trash2 size={16} color={colors.error} />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ChevronLeft size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            📖 Carnet d'Entraînement
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
            {stats.in_progress} en cours • {stats.mastered} maîtrisés
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => setAddModalVisible(true)}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
        >
          <Plus size={24} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {/* À FAIRE */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTodoOpen(!todoOpen);
            }}
          >
            <View style={styles.sectionHeaderLeft}>
              <Target size={20} color={colors.accent} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                À Faire
              </Text>
              <View style={[styles.badge, { backgroundColor: `${colors.accent}20` }]}>
                <Text style={[styles.badgeText, { color: colors.accent }]}>
                  {stats.todo}
                </Text>
              </View>
            </View>
            {todoOpen ? (
              <ChevronUp size={20} color={colors.textMuted} />
            ) : (
              <ChevronDown size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>
          {todoOpen && (
            <View style={styles.sectionContent}>
              {todoItems.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Aucun objectif en attente. Tape sur + pour en ajouter!
                </Text>
              ) : (
                todoItems.map(item => renderItem(item))
              )}
            </View>
          )}
        </View>

        {/* EN COURS */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setInProgressOpen(!inProgressOpen);
            }}
          >
            <View style={styles.sectionHeaderLeft}>
              <BookOpen size={20} color="#F97316" />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                En Cours
              </Text>
              <View style={[styles.badge, { backgroundColor: '#FFF7ED' }]}>
                <Text style={[styles.badgeText, { color: '#F97316' }]}>
                  {stats.in_progress}
                </Text>
              </View>
            </View>
            {inProgressOpen ? (
              <ChevronUp size={20} color={colors.textMuted} />
            ) : (
              <ChevronDown size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>
          {inProgressOpen && (
            <View style={styles.sectionContent}>
              {inProgressItems.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Commence un objectif pour le voir ici!
                </Text>
              ) : (
                inProgressItems.map(item => renderItem(item))
              )}
            </View>
          )}
        </View>

        {/* MAÎTRISÉ */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setMasteredOpen(!masteredOpen);
            }}
          >
            <View style={styles.sectionHeaderLeft}>
              <Trophy size={20} color={colors.success} />
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Maîtrisé
              </Text>
              <View style={[styles.badge, { backgroundColor: `${colors.success}20` }]}>
                <Text style={[styles.badgeText, { color: colors.success }]}>
                  {stats.mastered}
                </Text>
              </View>
            </View>
            {masteredOpen ? (
              <ChevronUp size={20} color={colors.textMuted} />
            ) : (
              <ChevronDown size={20} color={colors.textMuted} />
            )}
          </TouchableOpacity>
          {masteredOpen && (
            <View style={styles.sectionContent}>
              {masteredItems.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Pas encore de victoire. Continue!
                </Text>
              ) : (
                masteredItems.map(item => renderItem(item, false))
              )}
            </View>
          )}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* MODAL AJOUT */}
      <Modal
        visible={addModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Nouvel Objectif
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Type</Text>
              <View style={styles.typeButtons}>
                {(['technique', 'exercise', 'performance'] as ProgressionItemType[]).map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeBtn,
                      { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                      newItemType === type && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent },
                    ]}
                    onPress={() => setNewItemType(type)}
                  >
                    <Text
                      style={[
                        styles.typeBtnText,
                        { color: colors.textSecondary },
                        newItemType === type && { color: colors.accent, fontWeight: '700' },
                      ]}
                    >
                      {TYPE_LABELS[type]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Sport</Text>
              <View style={styles.sportButtons}>
                {(['jjb', 'musculation', 'crossfit', 'running', 'mma', 'boxe'] as Sport[]).map(sport => (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.sportBtn,
                      { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                      newItemSport === sport && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent },
                    ]}
                    onPress={() => setNewItemSport(sport)}
                  >
                    <Text
                      style={[
                        styles.sportBtnText,
                        { color: colors.textSecondary },
                        newItemSport === sport && { color: colors.accent, fontWeight: '600' },
                      ]}
                    >
                      {SPORT_LABELS[sport]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Nom *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Ex: Triangle Choke, Squat, 10km..."
                placeholderTextColor={colors.textMuted}
                value={newItemName}
                onChangeText={setNewItemName}
              />

              {/* Champs Musculation/CrossFit */}
              {(newItemSport === 'musculation' || newItemSport === 'crossfit') && (
                <>
                  <View style={styles.row}>
                    <View style={styles.rowItem}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>Poids actuel (kg)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="80"
                        placeholderTextColor={colors.textMuted}
                        value={newItemCurrentWeight}
                        onChangeText={setNewItemCurrentWeight}
                        keyboardType="decimal-pad"
                      />
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>Objectif (kg)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="100"
                        placeholderTextColor={colors.textMuted}
                        value={newItemTargetWeight}
                        onChangeText={setNewItemTargetWeight}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Champs Running/Trail */}
              {(newItemSport === 'running' || newItemSport === 'trail') && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Distance (km)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="10"
                    placeholderTextColor={colors.textMuted}
                    value={newItemDistanceKm}
                    onChangeText={setNewItemDistanceKm}
                    keyboardType="decimal-pad"
                  />

                  <View style={styles.row}>
                    <View style={styles.rowItem}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>Temps actuel (min)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="52"
                        placeholderTextColor={colors.textMuted}
                        value={newItemCurrentTime}
                        onChangeText={setNewItemCurrentTime}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>Objectif (min)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="50"
                        placeholderTextColor={colors.textMuted}
                        value={newItemTargetTime}
                        onChangeText={setNewItemTargetTime}
                        keyboardType="numeric"
                      />
                    </View>
                  </View>
                </>
              )}

              <Text style={[styles.label, { color: colors.textSecondary }]}>Notes (optionnel)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Notes..."
                placeholderTextColor={colors.textMuted}
                value={newItemNotes}
                onChangeText={setNewItemNotes}
                multiline
                numberOfLines={3}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Priorité: {newItemPriority}/5
              </Text>
              <View style={styles.priorityStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setNewItemPriority(star)}
                  >
                    <Star
                      size={32}
                      color={star <= newItemPriority ? '#F59E0B' : colors.textMuted}
                      fill={star <= newItemPriority ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { backgroundColor: colors.backgroundCard }]}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn, { backgroundColor: colors.accent }]}
                onPress={handleAddItem}
              >
                <Text style={styles.confirmBtnText}>Ajouter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL LOGGER */}
      <Modal
        visible={logModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Logger une Pratique
              </Text>
              <TouchableOpacity onPress={() => setLogModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <View style={styles.selectedItemInfo}>
                <Text style={[styles.selectedItemName, { color: colors.accent }]}>
                  {selectedItem.name}
                </Text>
                <Text style={[styles.selectedItemSport, { color: colors.textMuted }]}>
                  {SPORT_LABELS[selectedItem.sport]}
                </Text>
              </View>
            )}

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>
                Qualité: {logQuality}/5
              </Text>
              <View style={styles.priorityStars}>
                {[1, 2, 3, 4, 5].map(star => (
                  <TouchableOpacity
                    key={star}
                    onPress={() => setLogQuality(star)}
                  >
                    <Star
                      size={36}
                      color={star <= logQuality ? '#F59E0B' : colors.textMuted}
                      fill={star <= logQuality ? '#F59E0B' : 'transparent'}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {selectedItem?.type === 'exercise' && (
                <>
                  <View style={styles.row}>
                    <View style={styles.rowItem}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>Séries</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="3"
                        placeholderTextColor={colors.textMuted}
                        value={logSets}
                        onChangeText={setLogSets}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>Reps</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="12"
                        placeholderTextColor={colors.textMuted}
                        value={logReps}
                        onChangeText={setLogReps}
                        keyboardType="numeric"
                      />
                    </View>
                    <View style={styles.rowItem}>
                      <Text style={[styles.label, { color: colors.textSecondary }]}>Poids (kg)</Text>
                      <TextInput
                        style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="80"
                        placeholderTextColor={colors.textMuted}
                        value={logWeight}
                        onChangeText={setLogWeight}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Champs Running/Trail */}
              {(selectedItem?.sport === 'running' || selectedItem?.sport === 'trail') && (
                <>
                  <Text style={[styles.label, { color: colors.textSecondary }]}>Temps (minutes)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder={selectedItem?.target_time ? `Objectif: ${selectedItem.target_time}min` : "52"}
                    placeholderTextColor={colors.textMuted}
                    value={logTime}
                    onChangeText={setLogTime}
                    keyboardType="numeric"
                  />
                </>
              )}

              <Text style={[styles.label, { color: colors.textSecondary }]}>Notes (optionnel)</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Comment ça s'est passé?"
                placeholderTextColor={colors.textMuted}
                value={logNotes}
                onChangeText={setLogNotes}
                multiline
                numberOfLines={4}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn, { backgroundColor: colors.backgroundCard }]}
                onPress={() => setLogModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.confirmBtn, { backgroundColor: colors.accent }]}
                onPress={handleLogPractice}
              >
                <Text style={styles.confirmBtnText}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL PARTAGE */}
      <Modal
        visible={shareModalVisible}
        animationType="fade"
        transparent={true}
      >
        <View style={styles.shareModalOverlay}>
          {shareItem && (() => {
            const allLogs = getPracticeLogsByItemId(shareItem.id);

            // Préparer les données pour le graphique
            let chartData: { date: string; value: number }[] = [];
            let chartType: 'weight' | 'time' | 'quality' = 'quality';
            let chartUnit = '';
            let chartTarget: number | undefined;

            if (shareItem.current_weight && shareItem.target_weight) {
              chartType = 'weight';
              chartUnit = 'kg';
              chartTarget = shareItem.target_weight;
              chartData = allLogs
                .filter(log => log.weight)
                .map(log => ({ date: log.date, value: log.weight! }));
            } else if (shareItem.current_time && shareItem.target_time) {
              chartType = 'time';
              chartUnit = 'min';
              chartTarget = shareItem.target_time;
              chartData = allLogs
                .filter(log => log.time)
                .map(log => ({ date: log.date, value: log.time! }));
            } else {
              chartType = 'quality';
              chartUnit = '/5';
              chartData = allLogs
                .filter(log => log.quality_rating)
                .map(log => ({ date: log.date, value: log.quality_rating! }));
            }

            const currentValue = chartData.length > 0 ? chartData[chartData.length - 1].value : 0;

            return (
              <ShareableProgressCard
                ref={shareCardRef}
                itemName={shareItem.name}
                sport={SPORT_LABELS[shareItem.sport]}
                chartData={chartData}
                targetValue={chartTarget}
                unit={chartUnit}
                type={chartType}
                practiceCount={shareItem.practice_count}
                currentValue={currentValue}
                progressPercent={shareItem.progress_percent}
              />
            );
          })()}
        </View>
      </Modal>
    </View>
  );
}

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
  backBtn: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sectionContent: {
    gap: 12,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    paddingVertical: 24,
    fontStyle: 'italic',
  },
  itemCard: {
    padding: 14,
    borderRadius: 12,
    gap: 8,
  },
  itemHeader: {
    gap: 4,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
  },
  itemTarget: {
    fontSize: 13,
  },
  itemSport: {
    fontSize: 11,
    fontWeight: '600',
  },
  progressInfo: {
    gap: 4,
  },
  practiceCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  lastNotes: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  masteredDate: {
    fontSize: 12,
    fontWeight: '600',
  },
  itemActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalScroll: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  typeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sportButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  sportBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
  },
  textArea: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  priorityStars: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtn: {},
  confirmBtn: {},
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  selectedItemInfo: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 4,
  },
  selectedItemName: {
    fontSize: 16,
    fontWeight: '700',
  },
  selectedItemSport: {
    fontSize: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  progressBar: {
    gap: 6,
    marginTop: 8,
  },
  progressBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '700',
  },
  progressBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  chartButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  chartToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  chartToggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  shareBtn: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
});
