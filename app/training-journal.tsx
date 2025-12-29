// ============================================
// 📖 YOROI - CARNET D'ENTRAÎNEMENT V2
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
  Animated,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronLeft,
  ChevronRight,
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
  Search,
  TrendingUp,
  Zap,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import * as Haptics from 'expo-haptics';
import {
  ProgressionItem,
  ProgressionStatus,
  Sport,
  ProgressionItemType,
  PracticeLog,
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
import {
  getGlobalStats,
  getStreakInfo,
  getStatsBySport,
  getPracticesLastDays,
  getPracticeLogsForMonth,
  PracticeLogWithItem,
} from '@/lib/trainingStatsService';
import {
  createProgram,
  getAllPrograms,
  deleteProgram,
  addItemToProgram,
  removeItemFromProgram,
  getProgramItems,
  getProgramsWithProgress,
  getProgramProgress,
  TrainingProgram,
  ProgramWithProgress,
} from '@/lib/trainingProgramsService';
import { ProgressChart } from '@/components/ProgressChart';
import { ShareableProgressCard } from '@/components/ShareableProgressCard';
import { captureRef } from 'react-native-view-shot';

// Types pour les onglets
type TabType = 'objectives' | 'stats' | 'calendar';

// Types pour la vue Objectifs
type ObjectivesViewType = 'items' | 'programs';

export default function TrainingJournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();

  // État de l'onglet actif
  const [activeTab, setActiveTab] = useState<TabType>('objectives');
  const [isLoading, setIsLoading] = useState(true);

  // Animations
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const tabTransitionAnim = useRef(new Animated.Value(1)).current;

  // États pour l'onglet Objectifs
  const [objectivesView, setObjectivesView] = useState<ObjectivesViewType>('items');
  const [allItems, setAllItems] = useState<ProgressionItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProgressionStatus | 'all'>('all');
  const [expandedSports, setExpandedSports] = useState<Set<Sport>>(new Set());
  const [expandedCharts, setExpandedCharts] = useState<Set<number>>(new Set());

  // États pour les Programmes
  const [allPrograms, setAllPrograms] = useState<ProgramWithProgress[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<ProgramWithProgress | null>(null);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<number>>(new Set());

  // États pour l'onglet Calendrier
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Modals
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [logModalVisible, setLogModalVisible] = useState(false);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ProgressionItem | null>(null);
  const [shareItem, setShareItem] = useState<ProgressionItem | null>(null);

  // Modals Programmes
  const [programModalVisible, setProgramModalVisible] = useState(false);
  const [addItemsToProgramModalVisible, setAddItemsToProgramModalVisible] = useState(false);
  const [editingProgram, setEditingProgram] = useState<ProgramWithProgress | null>(null);

  // Ref pour la capture de la carte partageable
  const shareCardRef = useRef<View>(null);

  // Formulaire ajout
  const [newItemType, setNewItemType] = useState<ProgressionItemType>('technique');
  const [newItemSport, setNewItemSport] = useState<Sport>('jjb');
  const [newItemName, setNewItemName] = useState('');
  const [newItemTarget, setNewItemTarget] = useState('');
  const [newItemNotes, setNewItemNotes] = useState('');
  const [newItemPriority, setNewItemPriority] = useState(3);
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

  // Formulaire programme
  const [programName, setProgramName] = useState('');
  const [programDescription, setProgramDescription] = useState('');
  const [programSport, setProgramSport] = useState<Sport | ''>('');
  const [programDuration, setProgramDuration] = useState('');

  // Charger les données
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      // Petit délai pour permettre l'animation de s'afficher
      await new Promise(resolve => setTimeout(resolve, 300));
      setAllItems(getProgressionItems());
      setAllPrograms(getProgramsWithProgress());
    } catch (error) {
      console.error('[TRAINING_JOURNAL] Erreur chargement:', error);
    } finally {
      setIsLoading(false);
      // Animation de fade in
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [fadeAnim]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Animation de transition entre tabs
  const handleTabChange = (tab: TabType) => {
    if (tab === activeTab) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Fade out
    Animated.timing(tabTransitionAnim, {
      toValue: 0,
      duration: 150,
      useNativeDriver: true,
    }).start(() => {
      setActiveTab(tab);
      // Fade in
      Animated.timing(tabTransitionAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    });
  };

  // Grouper les items par sport
  const itemsBySport = useCallback(() => {
    let filtered = allItems;

    // Filtre par recherche
    if (searchQuery.trim()) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtre par statut
    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    // Grouper par sport
    const grouped: Record<Sport, ProgressionItem[]> = {} as any;
    filtered.forEach(item => {
      if (!grouped[item.sport]) {
        grouped[item.sport] = [];
      }
      grouped[item.sport].push(item);
    });

    return grouped;
  }, [allItems, searchQuery, statusFilter]);

  // Toggle section sport
  const toggleSportSection = (sport: Sport) => {
    setExpandedSports(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sport)) {
        newSet.delete(sport);
      } else {
        newSet.add(sport);
      }
      return newSet;
    });
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
      setShareItem(item);
      setShareModalVisible(true);
      await new Promise(resolve => setTimeout(resolve, 500));

      if (!shareCardRef.current) {
        Alert.alert('Erreur', 'Impossible de générer l\'image');
        setShareModalVisible(false);
        return;
      }

      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1,
      });

      setShareModalVisible(false);
      setShareItem(null);

      await Share.share({
        url: uri,
        message: `Ma progression : ${item.name} - ${SPORT_LABELS[item.sport]} 💪`,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('[SHARE] Erreur:', error);
      setShareModalVisible(false);
      setShareItem(null);
      Alert.alert('Erreur', 'Impossible de partager le graphique');
    }
  };

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

  // Render Tab Bar
  const renderTabBar = () => {
    const tabs: { id: TabType; label: string; Icon: any }[] = [
      { id: 'objectives', label: 'Objectifs', Icon: Target },
      { id: 'stats', label: 'Stats', Icon: BarChart3 },
      { id: 'calendar', label: 'Calendrier', Icon: Calendar },
    ];

    return (
      <View style={[styles.tabBar, { backgroundColor: colors.background }]}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          return (
            <TouchableOpacity
              key={tab.id}
              style={styles.tab}
              onPress={() => handleTabChange(tab.id)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.tabIconContainer,
                  {
                    backgroundColor: isActive ? colors.accent : colors.backgroundCard,
                    borderColor: isActive ? colors.accent : colors.border,
                  },
                ]}
              >
                <tab.Icon size={22} color={isActive ? '#FFF' : colors.textMuted} />
              </View>
              <Text
                style={[
                  styles.tabLabel,
                  { color: isActive ? colors.textPrimary : colors.textMuted },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // Icônes par sport
  const SPORT_ICONS: Record<Sport, any> = {
    jjb: '🥋',
    mma: '🥊',
    boxe: '🥊',
    muay_thai: '🥊',
    judo: '🥋',
    karate: '🥋',
    musculation: '💪',
    crossfit: '🔥',
    running: '🏃',
    trail: '⛰️',
    autre: '🎯',
  };

  // Couleurs par sport
  const SPORT_COLORS: Record<Sport, string> = {
    jjb: '#8B5CF6',
    mma: '#6366F1',
    boxe: '#F59E0B',
    muay_thai: '#F97316',
    judo: '#8B5CF6',
    karate: '#A855F7',
    musculation: '#EF4444',
    crossfit: '#DC2626',
    running: '#3B82F6',
    trail: '#10B981',
    autre: '#6B7280',
  };

  // Render une carte d'objectif
  const renderObjectiveCard = (item: ProgressionItem) => {
    const lastLog = getLastPracticeLog(item.id);
    const daysSince = lastLog
      ? Math.floor((Date.now() - new Date(lastLog.date).getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const allLogs = getPracticeLogsByItemId(item.id);
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

    // Couleur de la bordure selon le statut
    const borderColor = item.status === 'todo' ? colors.accent :
      item.status === 'in_progress' ? '#F97316' : '#10B981';

    return (
      <View
        key={item.id}
        style={[
          styles.objectiveCard,
          { backgroundColor: colors.backgroundCard, borderLeftColor: borderColor }
        ]}
      >
        {/* Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              {item.name}
            </Text>
            {item.status === 'mastered' && (
              <View style={[styles.masterBadge, { backgroundColor: '#10B98120' }]}>
                <Check size={12} color="#10B981" />
              </View>
            )}
          </View>
        </View>

        {/* Type et Priorité */}
        <View style={styles.cardMeta}>
          <Text style={[styles.cardMetaText, { color: colors.textMuted }]}>
            {TYPE_LABELS[item.type]}
          </Text>
          <Text style={[styles.cardMetaDot, { color: colors.textMuted }]}>•</Text>
          <View style={styles.priority}>
            {[1, 2, 3, 4, 5].map(star => (
              <Star
                key={star}
                size={12}
                color={star <= item.priority ? '#F59E0B' : colors.textMuted}
                fill={star <= item.priority ? '#F59E0B' : 'transparent'}
              />
            ))}
          </View>
        </View>

        {/* Progress bar (si applicable) */}
        {(item.current_weight && item.target_weight) && (
          <View style={styles.progressBar}>
            <View style={styles.progressBarHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {item.current_weight}kg → {item.target_weight}kg
              </Text>
              <Text style={[styles.progressPercent, { color: borderColor }]}>
                {item.progress_percent}%
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: `${borderColor}20` }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: borderColor, width: `${Math.min(100, item.progress_percent)}%` }
                ]}
              />
            </View>
          </View>
        )}

        {(item.current_time && item.target_time) && (
          <View style={styles.progressBar}>
            <View style={styles.progressBarHeader}>
              <Text style={[styles.progressLabel, { color: colors.textSecondary }]}>
                {item.current_time}min → {item.target_time}min
              </Text>
              <Text style={[styles.progressPercent, { color: borderColor }]}>
                {item.progress_percent}%
              </Text>
            </View>
            <View style={[styles.progressBarTrack, { backgroundColor: `${borderColor}20` }]}>
              <View
                style={[
                  styles.progressBarFill,
                  { backgroundColor: borderColor, width: `${Math.min(100, item.progress_percent)}%` }
                ]}
              />
            </View>
          </View>
        )}

        {/* Infos pratique */}
        {item.status === 'in_progress' && (
          <View style={styles.practiceInfo}>
            <Text style={[styles.practiceText, { color: colors.textSecondary }]}>
              Pratiqué {item.practice_count}x
              {daysSince !== null && ` • Il y a ${daysSince}j`}
            </Text>
            {lastLog?.notes && (
              <Text style={[styles.lastNotes, { color: colors.textMuted }]} numberOfLines={1}>
                "{lastLog.notes}"
              </Text>
            )}
          </View>
        )}

        {item.status === 'mastered' && item.mastered_date && (
          <Text style={[styles.masteredDate, { color: '#10B981' }]}>
            ✓ Maîtrisé le {new Date(item.mastered_date).toLocaleDateString('fr-FR')}
          </Text>
        )}

        {/* Boutons graphique */}
        {item.status === 'in_progress' && hasData && (
          <View style={styles.chartButtons}>
            <TouchableOpacity
              style={[styles.chartToggleBtn, { backgroundColor: `${borderColor}15`, flex: 1 }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                toggleChart(item.id);
              }}
              activeOpacity={0.7}
            >
              <BarChart3 size={14} color={borderColor} />
              <Text style={[styles.chartToggleText, { color: borderColor }]}>
                {isChartExpanded ? 'Masquer' : 'Voir'} le graphique
              </Text>
              {isChartExpanded ? (
                <ChevronUp size={14} color={borderColor} />
              ) : (
                <ChevronDown size={14} color={borderColor} />
              )}
            </TouchableOpacity>

            {isChartExpanded && (
              <TouchableOpacity
                style={[styles.shareBtn, { backgroundColor: `${borderColor}15` }]}
                onPress={() => handleShareProgress(item)}
                activeOpacity={0.7}
              >
                <Share2 size={16} color={borderColor} />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Graphique */}
        {item.status === 'in_progress' && isChartExpanded && hasData && (
          <ProgressChart
            data={chartData}
            targetValue={chartTarget}
            unit={chartUnit}
            type={chartType}
          />
        )}

        {/* Actions */}
        <View style={styles.cardActions}>
          {item.status === 'todo' && (
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: `${colors.accent}20`, flex: 1 }]}
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
                style={[styles.actionBtn, { backgroundColor: `${borderColor}20`, flex: 1 }]}
                onPress={() => handleOpenLogger(item)}
              >
                <Plus size={16} color={borderColor} />
                <Text style={[styles.actionBtnText, { color: borderColor }]}>
                  Logger
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionBtn, { backgroundColor: '#10B98120', flex: 1 }]}
                onPress={() => handleStatusChange(item, 'mastered')}
              >
                <Check size={16} color="#10B981" />
                <Text style={[styles.actionBtnText, { color: '#10B981' }]}>
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
      </View>
    );
  };

  // Render Onglet Objectifs
  const renderObjectivesTab = () => {
    return (
      <View style={{ flex: 1 }}>
        {/* Switch View (Objectifs / Programmes) */}
        <View style={[styles.viewSwitch, { backgroundColor: colors.backgroundCard }]}>
          <TouchableOpacity
            style={[
              styles.viewSwitchBtn,
              objectivesView === 'items' && {
                backgroundColor: colors.accent,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setObjectivesView('items');
            }}
          >
            <Target size={18} color={objectivesView === 'items' ? '#FFF' : colors.textMuted} />
            <Text
              style={[
                styles.viewSwitchText,
                { color: objectivesView === 'items' ? '#FFF' : colors.textSecondary },
              ]}
            >
              Objectifs
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.viewSwitchBtn,
              objectivesView === 'programs' && {
                backgroundColor: colors.accent,
              },
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setObjectivesView('programs');
            }}
          >
            <BookOpen size={18} color={objectivesView === 'programs' ? '#FFF' : colors.textMuted} />
            <Text
              style={[
                styles.viewSwitchText,
                { color: objectivesView === 'programs' ? '#FFF' : colors.textSecondary },
              ]}
            >
              Programmes
            </Text>
          </TouchableOpacity>
        </View>

        {/* Contenu selon la vue */}
        {objectivesView === 'items' ? renderItemsView() : renderProgramsView()}
      </View>
    );
  };

  const renderItemsView = () => {
    const grouped = itemsBySport();
    const sports = Object.keys(grouped) as Sport[];

    return (
      <View style={{ flex: 1 }}>
        {/* Barre de recherche */}
        <View style={[styles.searchBar, { backgroundColor: colors.backgroundCard }]}>
          <Search size={18} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Rechercher un objectif..."
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={18} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtres par statut */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filtersContainer}
          contentContainerStyle={styles.filtersContent}
        >
          {(['all', 'todo', 'in_progress', 'mastered'] as const).map(status => {
            const isActive = statusFilter === status;
            const label = status === 'all' ? 'Tous' : STATUS_LABELS[status as ProgressionStatus];
            return (
              <TouchableOpacity
                key={status}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? colors.accent : colors.backgroundCard,
                    borderColor: isActive ? colors.accent : colors.border,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setStatusFilter(status);
                }}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isActive ? '#FFF' : colors.textSecondary },
                  ]}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Liste par sport */}
        <ScrollView style={styles.sportsContainer} contentContainerStyle={styles.sportsContent}>
          {sports.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 8 }}>🎯</Text>
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                Aucun objectif trouvé
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Commence ton parcours en créant ton premier objectif !
              </Text>
            </View>
          ) : (
            sports.map(sport => {
              const items = grouped[sport];
              const isExpanded = expandedSports.has(sport);
              const sportColor = SPORT_COLORS[sport];

              return (
                <View key={sport} style={styles.sportSection}>
                  {/* Header */}
                  <TouchableOpacity
                    style={[
                      styles.sportHeader,
                      {
                        backgroundColor: `${sportColor}15`,
                        borderColor: sportColor,
                      },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      toggleSportSection(sport);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.sportHeaderLeft}>
                      <Text style={styles.sportIcon}>{SPORT_ICONS[sport]}</Text>
                      <View style={styles.sportHeaderInfo}>
                        <Text style={[styles.sportName, { color: sportColor }]}>
                          {SPORT_LABELS[sport].toUpperCase()}
                        </Text>
                        <Text style={[styles.sportCount, { color: colors.textMuted }]}>
                          {items.length} objectif{items.length > 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={20} color={colors.textMuted} />
                    ) : (
                      <ChevronDown size={20} color={colors.textMuted} />
                    )}
                  </TouchableOpacity>

                  {/* Items */}
                  {isExpanded && (
                    <View style={styles.sportItems}>
                      {items.map(item => renderObjectiveCard(item))}
                    </View>
                  )}
                </View>
              );
            })
          )}

          <View style={{ height: 60 }} />
        </ScrollView>
      </View>
    );
  };

  const renderProgramsView = () => {
    return (
      <View style={{ flex: 1 }}>
        {/* Liste des programmes */}
        <ScrollView style={styles.programsContainer} contentContainerStyle={styles.programsContent}>
          {allPrograms.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ fontSize: 48, marginBottom: 8 }}>📚</Text>
              <Text style={[styles.emptyText, { color: colors.textPrimary }]}>
                Aucun programme créé
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
                Crée un programme pour structurer ton entraînement et atteindre tes objectifs plus facilement
              </Text>
              <TouchableOpacity
                style={[styles.createProgramBtn, { backgroundColor: colors.accent }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setEditingProgram(null);
                  setProgramName('');
                  setProgramDescription('');
                  setProgramSport('');
                  setProgramDuration('');
                  setProgramModalVisible(true);
                }}
              >
                <Plus size={20} color="#FFF" strokeWidth={2.5} />
                <Text style={styles.createProgramBtnText}>Créer un programme</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {allPrograms.map(program => {
                const isExpanded = expandedPrograms.has(program.id);
                const programItems = isExpanded ? getProgramItems(program.id) : [];

                return (
                  <View key={program.id} style={[styles.programCard, { backgroundColor: colors.backgroundCard }]}>
                    {/* Header du programme */}
                    <TouchableOpacity
                      style={styles.programHeader}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        const newExpanded = new Set(expandedPrograms);
                        if (isExpanded) {
                          newExpanded.delete(program.id);
                        } else {
                          newExpanded.add(program.id);
                        }
                        setExpandedPrograms(newExpanded);
                      }}
                      activeOpacity={0.7}
                    >
                      <View style={styles.programHeaderLeft}>
                        <Text style={[styles.programName, { color: colors.textPrimary }]}>
                          🔥 {program.name}
                        </Text>
                        <Text style={[styles.programStats, { color: colors.textMuted }]}>
                          {program.total_items} objectif{program.total_items > 1 ? 's' : ''} • {program.mastered_items} maîtrisé{program.mastered_items > 1 ? 's' : ''}
                        </Text>
                      </View>
                      <View style={styles.programHeaderRight}>
                        <View style={[styles.programBadge, { backgroundColor: `${colors.accent}20` }]}>
                          <Text style={[styles.programBadgeText, { color: colors.accent }]}>
                            {program.completion_rate}%
                          </Text>
                        </View>
                        {isExpanded ? (
                          <ChevronUp size={20} color={colors.textMuted} />
                        ) : (
                          <ChevronDown size={20} color={colors.textMuted} />
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Barre de progression */}
                    <View style={[styles.programProgressBar, { backgroundColor: `${colors.accent}20` }]}>
                      <View
                        style={[
                          styles.programProgressFill,
                          { backgroundColor: colors.accent, width: `${program.completion_rate}%` },
                        ]}
                      />
                    </View>

                    {/* Description */}
                    {program.description && (
                      <Text style={[styles.programDescription, { color: colors.textSecondary }]}>
                        {program.description}
                      </Text>
                    )}

                    {/* Liste des objectifs (si expanded) */}
                    {isExpanded && (
                      <View style={styles.programItemsList}>
                        {programItems.length === 0 ? (
                          <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                            <Text style={{ fontSize: 32, marginBottom: 4 }}>📋</Text>
                            <Text style={[styles.emptyText, { color: colors.textMuted, fontSize: 14 }]}>
                              Aucun objectif dans ce programme
                            </Text>
                          </View>
                        ) : (
                          programItems.map((item: any, index: number) => {
                            const statusIcon = item.status === 'mastered' ? '✓' : item.status === 'in_progress' ? '⚡' : '○';
                            const statusColor = item.status === 'mastered' ? '#10B981' : item.status === 'in_progress' ? '#F97316' : colors.textMuted;

                            return (
                              <View key={item.id} style={styles.programItem}>
                                <Text style={[styles.programItemIcon, { color: statusColor }]}>
                                  {statusIcon}
                                </Text>
                                <Text style={[styles.programItemName, { color: colors.textPrimary }]}>
                                  {item.name}
                                </Text>
                                <TouchableOpacity
                                  onPress={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    Alert.alert(
                                      'Retirer du programme',
                                      `Retirer "${item.name}" de ce programme ?`,
                                      [
                                        { text: 'Annuler', style: 'cancel' },
                                        {
                                          text: 'Retirer',
                                          style: 'destructive',
                                          onPress: () => {
                                            removeItemFromProgram(program.id, item.item_id);
                                            loadData();
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                          },
                                        },
                                      ]
                                    );
                                  }}
                                  style={styles.programItemRemoveBtn}
                                >
                                  <X size={16} color={colors.textMuted} />
                                </TouchableOpacity>
                              </View>
                            );
                          })
                        )}

                        {/* Bouton ajouter des objectifs */}
                        <TouchableOpacity
                          style={[styles.addItemsToProgramBtn, { borderColor: colors.accent }]}
                          onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            setSelectedProgram(program);
                            setAddItemsToProgramModalVisible(true);
                          }}
                        >
                          <Plus size={16} color={colors.accent} />
                          <Text style={[styles.addItemsToProgramBtnText, { color: colors.accent }]}>
                            Ajouter des objectifs
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {/* Actions */}
                    <View style={styles.programActions}>
                      <TouchableOpacity
                        style={[styles.programActionBtn, { borderColor: colors.border }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setEditingProgram(program);
                          setProgramName(program.name);
                          setProgramDescription(program.description || '');
                          setProgramSport(program.sport || '');
                          setProgramDuration(program.target_duration_weeks?.toString() || '');
                          setProgramModalVisible(true);
                        }}
                      >
                        <Text style={[styles.programActionBtnText, { color: colors.textSecondary }]}>
                          Éditer
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.programActionBtn, { borderColor: colors.border }]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          Alert.alert(
                            'Supprimer le programme',
                            `Supprimer "${program.name}" ?\nLes objectifs ne seront pas supprimés.`,
                            [
                              { text: 'Annuler', style: 'cancel' },
                              {
                                text: 'Supprimer',
                                style: 'destructive',
                                onPress: () => {
                                  deleteProgram(program.id);
                                  loadData();
                                  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                },
                              },
                            ]
                          );
                        }}
                      >
                        <Text style={[styles.programActionBtnText, { color: '#EF4444' }]}>
                          Supprimer
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* Bouton créer un nouveau programme */}
              <TouchableOpacity
                style={[styles.createProgramBtnBottom, { backgroundColor: colors.accent }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setEditingProgram(null);
                  setProgramName('');
                  setProgramDescription('');
                  setProgramSport('');
                  setProgramDuration('');
                  setProgramModalVisible(true);
                }}
              >
                <Plus size={20} color="#FFF" strokeWidth={2.5} />
                <Text style={styles.createProgramBtnText}>Créer un programme</Text>
              </TouchableOpacity>
            </>
          )}
        </ScrollView>
      </View>
    );
  };

  // Render Onglet Stats
  const renderStatsTab = () => {
    const globalStats = getGlobalStats();
    const streakInfo = getStreakInfo();
    const sportStats = getStatsBySport();
    const dailyPractices = getPracticesLastDays(7);

    return (
      <ScrollView style={styles.statsContainer} contentContainerStyle={styles.statsContent}>
        {/* Vue d'ensemble */}
        <View style={[styles.statsSection, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.statsSectionTitle, { color: colors.textPrimary }]}>
            📈 Vue d'Ensemble
          </Text>
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: `${colors.accent}10` }]}>
              <Text style={[styles.statNumber, { color: colors.accent }]}>
                {globalStats.total}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Total
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#F9731610' }]}>
              <Text style={[styles.statNumber, { color: '#F97316' }]}>
                {globalStats.in_progress}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                En Cours
              </Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: '#10B98110' }]}>
              <Text style={[styles.statNumber, { color: '#10B981' }]}>
                {globalStats.mastered}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                Maîtrisés
              </Text>
            </View>
          </View>
        </View>

        {/* Streak */}
        <View style={[styles.statsSection, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.statsSectionTitle, { color: colors.textPrimary }]}>
            🔥 Série & Régularité
          </Text>
          <View style={styles.streakInfo}>
            <View style={styles.streakRow}>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                • Série actuelle:
              </Text>
              <Text style={[styles.streakValue, { color: colors.accent }]}>
                {streakInfo.currentStreak} jours
              </Text>
            </View>
            <View style={styles.streakRow}>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                • Record:
              </Text>
              <Text style={[styles.streakValue, { color: colors.accent }]}>
                {streakInfo.longestStreak} jours
              </Text>
            </View>
            <View style={styles.streakRow}>
              <Text style={[styles.streakLabel, { color: colors.textSecondary }]}>
                • Pratiques cette semaine:
              </Text>
              <Text style={[styles.streakValue, { color: colors.accent }]}>
                {globalStats.practices_this_week}
              </Text>
            </View>
          </View>

          {/* Mini calendrier 7 jours */}
          <View style={styles.miniCalendar}>
            {streakInfo.practicesLast7Days.map((day, index) => {
              const date = new Date(day.date);
              const dayLetter = ['D', 'L', 'M', 'M', 'J', 'V', 'S'][date.getDay()];
              const hasPractice = day.count > 0;

              return (
                <View key={day.date} style={styles.miniCalendarDay}>
                  <Text style={[styles.miniCalendarDayLabel, { color: colors.textMuted }]}>
                    {dayLetter}
                  </Text>
                  <View
                    style={[
                      styles.miniCalendarDot,
                      {
                        backgroundColor: hasPractice ? colors.accent : colors.border,
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
        </View>

        {/* Par Sport */}
        <View style={[styles.statsSection, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.statsSectionTitle, { color: colors.textPrimary }]}>
            🏆 Par Sport
          </Text>
          <View style={styles.sportStatsList}>
            {sportStats.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                Pas encore d'objectifs
              </Text>
            ) : (
              sportStats.map(sport => {
                const sportColor = SPORT_COLORS[sport.sport];
                return (
                  <View key={sport.sport} style={styles.sportStatItem}>
                    <View style={styles.sportStatHeader}>
                      <Text style={styles.sportStatIcon}>{SPORT_ICONS[sport.sport]}</Text>
                      <View style={styles.sportStatInfo}>
                        <Text style={[styles.sportStatName, { color: colors.textPrimary }]}>
                          {SPORT_LABELS[sport.sport]}
                        </Text>
                        <Text style={[styles.sportStatMeta, { color: colors.textMuted }]}>
                          {sport.total} objectifs • {sport.totalPractices} pratiques
                        </Text>
                      </View>
                      <Text style={[styles.sportStatPercent, { color: sportColor }]}>
                        {sport.completionRate}%
                      </Text>
                    </View>
                    <View style={[styles.sportStatBar, { backgroundColor: `${sportColor}20` }]}>
                      <View
                        style={[
                          styles.sportStatBarFill,
                          {
                            backgroundColor: sportColor,
                            width: `${sport.completionRate}%`,
                          },
                        ]}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>

        {/* Progression récente */}
        <View style={[styles.statsSection, { backgroundColor: colors.backgroundCard }]}>
          <Text style={[styles.statsSectionTitle, { color: colors.textPrimary }]}>
            📊 Progression Récente (7j)
          </Text>
          <View style={styles.dailyChart}>
            {dailyPractices.map((day, index) => {
              const maxCount = Math.max(...dailyPractices.map(d => d.count), 1);
              const heightPercent = (day.count / maxCount) * 100;
              const date = new Date(day.date);
              const dayLabel = date.getDate().toString();

              return (
                <View key={day.date} style={styles.dailyChartBar}>
                  <View style={styles.dailyChartBarContainer}>
                    <View
                      style={[
                        styles.dailyChartBarFill,
                        {
                          height: `${heightPercent}%`,
                          backgroundColor: day.count > 0 ? colors.accent : colors.border,
                        },
                      ]}
                    />
                  </View>
                  <Text style={[styles.dailyChartLabel, { color: colors.textMuted }]}>
                    {dayLabel}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
    );
  };

  // Render Onglet Calendrier
  const renderCalendarTab = () => {
    // Obtenir toutes les pratiques du mois sélectionné
    const monthLogs = getPracticeLogsForMonth(selectedMonth.getFullYear(), selectedMonth.getMonth());

    // Grouper par jour
    const logsByDay: Record<string, PracticeLogWithItem[]> = {};
    monthLogs.forEach(log => {
      const dayKey = log.date.split('T')[0];
      if (!logsByDay[dayKey]) logsByDay[dayKey] = [];
      logsByDay[dayKey].push(log);
    });

    // Helpers pour le calendrier
    const getDaysInMonth = (date: Date) => {
      const year = date.getFullYear();
      const month = date.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const daysInMonth = lastDay.getDate();
      const startDayOfWeek = firstDay.getDay(); // 0 = dimanche

      return { daysInMonth, startDayOfWeek };
    };

    const { daysInMonth, startDayOfWeek } = getDaysInMonth(selectedMonth);
    const monthName = selectedMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

    // Naviguer entre les mois
    const previousMonth = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1, 1));
      setSelectedDay(null);
    };

    const nextMonth = () => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 1));
      setSelectedDay(null);
    };

    // Créer les lignes du calendrier
    const calendarRows: (number | null)[][] = [];
    let currentRow: (number | null)[] = [];

    // Ajouter les jours vides au début
    for (let i = 0; i < startDayOfWeek; i++) {
      currentRow.push(null);
    }

    // Ajouter les jours du mois
    for (let day = 1; day <= daysInMonth; day++) {
      currentRow.push(day);
      if (currentRow.length === 7) {
        calendarRows.push(currentRow);
        currentRow = [];
      }
    }

    // Compléter la dernière ligne
    if (currentRow.length > 0) {
      while (currentRow.length < 7) {
        currentRow.push(null);
      }
      calendarRows.push(currentRow);
    }

    // Obtenir les logs du jour sélectionné
    const selectedDayLogs = selectedDay ? (logsByDay[selectedDay] || []) : [];

    return (
      <ScrollView style={styles.tabContent} showsVerticalScrollIndicator={false}>
        {/* Header Calendrier */}
        <View style={[styles.calendarHeader, { backgroundColor: colors.backgroundCard }]}>
          <TouchableOpacity onPress={previousMonth} style={styles.monthNavBtn}>
            <ChevronLeft size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.monthTitle, { color: colors.textPrimary }]}>
            {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
          </Text>
          <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn}>
            <ChevronRight size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Jours de la semaine */}
        <View style={[styles.weekDaysRow, { backgroundColor: colors.backgroundCard }]}>
          {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, index) => (
            <Text key={index} style={[styles.weekDayLabel, { color: colors.textMuted }]}>
              {day}
            </Text>
          ))}
        </View>

        {/* Grille Calendrier */}
        <View style={[styles.calendarGrid, { backgroundColor: colors.backgroundCard }]}>
          {calendarRows.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.calendarRow}>
              {row.map((day, dayIndex) => {
                if (day === null) {
                  return <View key={dayIndex} style={styles.calendarDayCell} />;
                }

                const dayKey = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                const dayLogs = logsByDay[dayKey] || [];
                const isSelected = selectedDay === dayKey;
                const isToday = dayKey === new Date().toISOString().split('T')[0];

                return (
                  <TouchableOpacity
                    key={dayIndex}
                    style={[
                      styles.calendarDayCell,
                      isSelected && { backgroundColor: `${colors.accent}20` },
                      isToday && { borderWidth: 1, borderColor: colors.accent },
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setSelectedDay(isSelected ? null : dayKey);
                    }}
                  >
                    <Text
                      style={[
                        styles.calendarDayNumber,
                        { color: isSelected ? colors.accent : colors.textPrimary },
                        isToday && { fontWeight: '800' },
                      ]}
                    >
                      {day}
                    </Text>
                    {dayLogs.length > 0 && (
                      <View style={styles.calendarDayDotsContainer}>
                        {dayLogs.slice(0, 3).map((_, dotIndex) => (
                          <View
                            key={dotIndex}
                            style={[styles.calendarDayDot, { backgroundColor: colors.accent }]}
                          />
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>

        {/* Détails du jour sélectionné */}
        {selectedDay && (
          <View style={[styles.selectedDayDetails, { backgroundColor: colors.backgroundCard }]}>
            <Text style={[styles.selectedDayTitle, { color: colors.textPrimary }]}>
              📅 {new Date(selectedDay).toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </Text>
            {selectedDayLogs.length === 0 ? (
              <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>🗓️</Text>
                <Text style={[styles.emptyText, { color: colors.textPrimary, fontSize: 15 }]}>
                  Aucune pratique ce jour-là
                </Text>
                <Text style={[styles.emptySubtext, { color: colors.textMuted, fontSize: 13, marginTop: 4 }]}>
                  Sélectionne un autre jour pour voir ton historique
                </Text>
              </View>
            ) : (
              <>
                <Text style={[styles.selectedDayCount, { color: colors.textSecondary }]}>
                  {selectedDayLogs.length} pratique{selectedDayLogs.length > 1 ? 's' : ''} ce jour-là
                </Text>
                {selectedDayLogs.map(log => {
                  const sportColor = SPORT_COLORS[log.sport];
                  const sportLabel = SPORT_LABELS[log.sport];
                  const logTime = new Date(log.date).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  return (
                    <View
                      key={log.id}
                      style={[
                        styles.dayLogCard,
                        { backgroundColor: colors.background, borderLeftColor: sportColor },
                      ]}
                    >
                      <View style={styles.dayLogHeader}>
                        <View style={styles.dayLogHeaderLeft}>
                          <Text style={[styles.dayLogIcon, { color: sportColor }]}>
                            {SPORT_ICONS[log.sport]}
                          </Text>
                          <View>
                            <Text style={[styles.dayLogName, { color: colors.textPrimary }]}>
                              {log.item_name}
                            </Text>
                            <Text style={[styles.dayLogSport, { color: colors.textMuted }]}>
                              {sportLabel}
                            </Text>
                          </View>
                        </View>
                        <Text style={[styles.dayLogTime, { color: colors.textMuted }]}>
                          {logTime}
                        </Text>
                      </View>

                      {/* Qualité */}
                      {log.quality_rating && (
                        <View style={styles.dayLogQuality}>
                          <Text style={[styles.dayLogQualityLabel, { color: colors.textMuted }]}>
                            Qualité:
                          </Text>
                          <View style={styles.dayLogStars}>
                            {[1, 2, 3, 4, 5].map(star => (
                              <Star
                                key={star}
                                size={14}
                                color="#FBBF24"
                                fill={star <= (log.quality_rating || 0) ? '#FBBF24' : 'transparent'}
                              />
                            ))}
                          </View>
                        </View>
                      )}

                      {/* Détails spécifiques */}
                      {(log.sets || log.reps || log.weight || log.time || log.distance) && (
                        <View style={styles.dayLogDetails}>
                          {log.sets && log.reps && (
                            <Text style={[styles.dayLogDetailText, { color: colors.textSecondary }]}>
                              {log.sets} séries × {log.reps} reps
                            </Text>
                          )}
                          {log.weight && (
                            <Text style={[styles.dayLogDetailText, { color: colors.textSecondary }]}>
                              @ {log.weight}kg
                            </Text>
                          )}
                          {log.time && (
                            <Text style={[styles.dayLogDetailText, { color: colors.textSecondary }]}>
                              {log.time} min
                            </Text>
                          )}
                          {log.distance && (
                            <Text style={[styles.dayLogDetailText, { color: colors.textSecondary }]}>
                              {log.distance} km
                            </Text>
                          )}
                        </View>
                      )}

                      {/* Notes */}
                      {log.notes && (
                        <Text style={[styles.dayLogNotes, { color: colors.textSecondary }]}>
                          "{log.notes}"
                        </Text>
                      )}
                    </View>
                  );
                })}
              </>
            )}
          </View>
        )}
      </ScrollView>
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
        </View>
        <TouchableOpacity
          onPress={() => setAddModalVisible(true)}
          style={[styles.addBtn, { backgroundColor: colors.accent }]}
        >
          <Plus size={24} color="#FFF" strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Tab Bar */}
      {renderTabBar()}

      {/* Tab Content */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={[styles.loadingText, { color: colors.textMuted }]}>
            Chargement...
          </Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: tabTransitionAnim }}>
          {activeTab === 'objectives' && renderObjectivesTab()}
          {activeTab === 'stats' && renderStatsTab()}
          {activeTab === 'calendar' && renderCalendarTab()}
        </Animated.View>
      )}

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

      {/* MODAL PROGRAMME */}
      <Modal
        visible={programModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setProgramModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                {editingProgram ? 'Éditer Programme' : 'Nouveau Programme'}
              </Text>
              <TouchableOpacity onPress={() => setProgramModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Nom du programme *</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Ex: Débutant JJB, Programme Force 12 semaines..."
                placeholderTextColor={colors.textMuted}
                value={programName}
                onChangeText={setProgramName}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <TextInput
                style={[styles.textArea, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Décris ton programme..."
                placeholderTextColor={colors.textMuted}
                value={programDescription}
                onChangeText={setProgramDescription}
                multiline
                numberOfLines={4}
              />

              <Text style={[styles.label, { color: colors.textSecondary }]}>Sport (optionnel)</Text>
              <View style={styles.sportButtons}>
                <TouchableOpacity
                  style={[
                    styles.sportBtn,
                    { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                    programSport === '' && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent },
                  ]}
                  onPress={() => setProgramSport('')}
                >
                  <Text
                    style={[
                      styles.sportBtnText,
                      { color: colors.textSecondary },
                      programSport === '' && { color: colors.accent, fontWeight: '600' },
                    ]}
                  >
                    Tous
                  </Text>
                </TouchableOpacity>
                {(['jjb', 'musculation', 'crossfit', 'running', 'mma', 'boxe'] as Sport[]).map(sport => (
                  <TouchableOpacity
                    key={sport}
                    style={[
                      styles.sportBtn,
                      { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                      programSport === sport && { backgroundColor: `${colors.accent}20`, borderColor: colors.accent },
                    ]}
                    onPress={() => setProgramSport(sport)}
                  >
                    <Text
                      style={[
                        styles.sportBtnText,
                        { color: colors.textSecondary },
                        programSport === sport && { color: colors.accent, fontWeight: '600' },
                      ]}
                    >
                      {SPORT_LABELS[sport]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={[styles.label, { color: colors.textSecondary }]}>Durée cible (semaines)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                placeholder="Ex: 12"
                placeholderTextColor={colors.textMuted}
                value={programDuration}
                onChangeText={setProgramDuration}
                keyboardType="number-pad"
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalBtnSecondary, { borderColor: colors.border }]}
                onPress={() => setProgramModalVisible(false)}
              >
                <Text style={[styles.modalBtnSecondaryText, { color: colors.textSecondary }]}>
                  Annuler
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: colors.accent }]}
                onPress={() => {
                  if (!programName.trim()) {
                    Alert.alert('Erreur', 'Le nom du programme est requis.');
                    return;
                  }

                  try {
                    const durationWeeks = programDuration ? parseInt(programDuration) : undefined;
                    const sportValue = programSport === '' ? undefined : programSport;

                    if (editingProgram) {
                      // Mise à jour
                      const { updateProgram } = require('@/lib/trainingProgramsService');
                      updateProgram(editingProgram.id, programName, programDescription, sportValue, durationWeeks);
                    } else {
                      // Création
                      createProgram(programName, programDescription, sportValue, durationWeeks);
                    }

                    loadData();
                    setProgramModalVisible(false);
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                  } catch (error) {
                    console.error('Erreur programme:', error);
                    Alert.alert('Erreur', 'Impossible de sauvegarder le programme.');
                  }
                }}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  {editingProgram ? 'Mettre à jour' : 'Créer'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL AJOUT OBJECTIFS AU PROGRAMME */}
      <Modal
        visible={addItemsToProgramModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAddItemsToProgramModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                Ajouter des objectifs
              </Text>
              <TouchableOpacity onPress={() => setAddItemsToProgramModalVisible(false)}>
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScroll}>
              {selectedProgram && (
                <>
                  <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                    Programme: {selectedProgram.name}
                  </Text>

                  {allItems.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                      Aucun objectif disponible
                    </Text>
                  ) : (
                    <>
                      {allItems.map(item => {
                        const programItems = getProgramItems(selectedProgram.id);
                        const isInProgram = programItems.some((pi: any) => pi.item_id === item.id);

                        if (isInProgram) return null;

                        return (
                          <TouchableOpacity
                            key={item.id}
                            style={[styles.selectableItem, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                            onPress={() => {
                              try {
                                addItemToProgram(selectedProgram.id, item.id);
                                loadData();
                                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                              } catch (error) {
                                console.error('Erreur ajout:', error);
                                Alert.alert('Erreur', 'Impossible d\'ajouter cet objectif.');
                              }
                            }}
                          >
                            <View style={styles.selectableItemLeft}>
                              <Text style={[styles.selectableItemIcon, { color: SPORT_COLORS[item.sport] }]}>
                                {SPORT_ICONS[item.sport]}
                              </Text>
                              <View>
                                <Text style={[styles.selectableItemName, { color: colors.textPrimary }]}>
                                  {item.name}
                                </Text>
                                <Text style={[styles.selectableItemSport, { color: colors.textMuted }]}>
                                  {SPORT_LABELS[item.sport]} • {STATUS_LABELS[item.status]}
                                </Text>
                              </View>
                            </View>
                            <Plus size={20} color={colors.accent} />
                          </TouchableOpacity>
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.modalBtnPrimary, { backgroundColor: colors.accent }]}
                onPress={() => setAddItemsToProgramModalVisible(false)}
              >
                <Text style={styles.modalBtnPrimaryText}>
                  Terminé
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 15,
    fontWeight: '600',
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
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
    justifyContent: 'space-around',
  },
  tab: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  tabIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
  },
  tabPlaceholder: {
    fontSize: 16,
    fontStyle: 'italic',
  },

  // Recherche
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },

  // Filtres
  filtersContainer: {
    marginTop: 12,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 2,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Sports
  sportsContainer: {
    flex: 1,
    marginTop: 16,
  },
  sportsContent: {
    padding: 16,
    gap: 16,
  },
  sportSection: {
    marginBottom: 16,
  },
  sportHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    marginBottom: 12,
  },
  sportHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sportIcon: {
    fontSize: 28,
  },
  sportHeaderInfo: {
    gap: 2,
  },
  sportName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  sportCount: {
    fontSize: 12,
    fontWeight: '600',
  },
  sportBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  sportBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFF',
  },
  sportItems: {
    gap: 12,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Carte objectif
  objectiveCard: {
    padding: 14,
    borderRadius: 12,
    gap: 10,
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  masterBadge: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardMetaText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cardMetaDot: {
    fontSize: 12,
  },
  priority: {
    flexDirection: 'row',
    gap: 2,
  },

  // Progress
  progressBar: {
    gap: 6,
    marginTop: 4,
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

  // Practice info
  practiceInfo: {
    gap: 4,
  },
  practiceText: {
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

  // Chart
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

  // Actions
  cardActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Modals
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
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  rowItem: {
    flex: 1,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnPrimary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalBtnSecondary: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalBtnPrimaryText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  modalBtnSecondaryText: {
    fontSize: 15,
    fontWeight: '600',
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
  shareModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },

  // Stats Tab
  statsContainer: {
    flex: 1,
  },
  statsContent: {
    padding: 16,
    gap: 16,
  },
  statsSection: {
    padding: 16,
    borderRadius: 16,
    gap: 16,
  },
  statsSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 6,
  },
  statNumber: {
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  streakInfo: {
    gap: 10,
  },
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  streakLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  streakValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  miniCalendar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 12,
    paddingVertical: 12,
    gap: 4,
  },
  miniCalendarDay: {
    alignItems: 'center',
    gap: 8,
  },
  miniCalendarDayLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  miniCalendarDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  sportStatsList: {
    gap: 14,
  },
  sportStatItem: {
    gap: 8,
  },
  sportStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sportStatIcon: {
    fontSize: 24,
  },
  sportStatInfo: {
    flex: 1,
    gap: 2,
  },
  sportStatName: {
    fontSize: 14,
    fontWeight: '700',
  },
  sportStatMeta: {
    fontSize: 11,
    fontWeight: '500',
  },
  sportStatPercent: {
    fontSize: 16,
    fontWeight: '800',
  },
  sportStatBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  sportStatBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  dailyChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    height: 120,
    gap: 4,
  },
  dailyChartBar: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  dailyChartBarContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-end',
  },
  dailyChartBarFill: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },
  dailyChartLabel: {
    fontSize: 11,
    fontWeight: '600',
  },

  // ============================================
  // CALENDRIER
  // ============================================
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    marginTop: 8,
    borderRadius: 16,
    marginHorizontal: 16,
  },
  monthNavBtn: {
    padding: 8,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  weekDaysRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 12,
  },
  weekDayLabel: {
    flex: 1,
    textAlign: 'center',
    fontSize: 12,
    fontWeight: '600',
  },
  calendarGrid: {
    padding: 16,
    marginTop: 8,
    marginHorizontal: 16,
    borderRadius: 16,
  },
  calendarRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  calendarDayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    marginHorizontal: 2,
  },
  calendarDayNumber: {
    fontSize: 16,
    fontWeight: '600',
  },
  calendarDayDotsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  calendarDayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  selectedDayDetails: {
    padding: 16,
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 16,
    gap: 12,
  },
  selectedDayTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  selectedDayCount: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  dayLogCard: {
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 8,
  },
  dayLogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  dayLogHeaderLeft: {
    flexDirection: 'row',
    gap: 10,
    flex: 1,
  },
  dayLogIcon: {
    fontSize: 24,
  },
  dayLogName: {
    fontSize: 15,
    fontWeight: '700',
  },
  dayLogSport: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  dayLogTime: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayLogQuality: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dayLogQualityLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  dayLogStars: {
    flexDirection: 'row',
    gap: 2,
  },
  dayLogDetails: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
  },
  dayLogDetailText: {
    fontSize: 13,
    fontWeight: '600',
  },
  dayLogNotes: {
    fontSize: 13,
    fontStyle: 'italic',
  },

  // ============================================
  // VIEW SWITCH
  // ============================================
  viewSwitch: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    padding: 4,
    borderRadius: 12,
    gap: 8,
  },
  viewSwitchBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
  },
  viewSwitchText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // ============================================
  // PROGRAMMES
  // ============================================
  programsContainer: {
    flex: 1,
  },
  programsContent: {
    padding: 16,
    gap: 12,
  },
  programCard: {
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  programHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  programHeaderLeft: {
    flex: 1,
    gap: 6,
  },
  programHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  programName: {
    fontSize: 17,
    fontWeight: '700',
  },
  programStats: {
    fontSize: 13,
    fontWeight: '600',
  },
  programBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  programBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  programProgressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  programProgressFill: {
    height: '100%',
    borderRadius: 4,
  },
  programDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  programItemsList: {
    gap: 8,
    paddingTop: 8,
  },
  programItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
  },
  programItemIcon: {
    fontSize: 16,
  },
  programItemName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  programItemRemoveBtn: {
    padding: 4,
  },
  addItemsToProgramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginTop: 4,
  },
  addItemsToProgramBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  programActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  programActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  programActionBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
  createProgramBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 16,
  },
  createProgramBtnBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 8,
  },
  createProgramBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  modalSubtitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  selectableItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  selectableItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  selectableItemIcon: {
    fontSize: 24,
  },
  selectableItemName: {
    fontSize: 15,
    fontWeight: '700',
  },
  selectableItemSport: {
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
});
