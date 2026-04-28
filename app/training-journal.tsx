// ============================================
// CARNET D'ENTRAÎNEMENT - HYBRID DASHBOARD
// Mes Records (Benchmarks) + Mes Techniques (Skills)
// ============================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  PanResponder,
  DeviceEventEmitter,
  RefreshControl,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { safeOpenURL } from '@/lib/security/validators';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Trash2, Search, Plus, Target, ChevronRight, Share2, Dumbbell, BookOpen, Award, FileText, Play, X, Check, ChevronLeft, TrendingUp, Flame, Timer, Swords
} from 'lucide-react-native';
import { useWatch } from '@/lib/WatchConnectivityProvider';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { impactAsync, notificationAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import { launchImageLibraryAsync, launchCameraAsync, requestMediaLibraryPermissionsAsync, requestCameraPermissionsAsync, MediaTypeOptions } from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Benchmark,
  Skill,
  BenchmarkCategory,
  BenchmarkUnit,
  SkillCategory,
  SkillStatus,
  WeightUnit,
  getBenchmarks,
  createBenchmark,
  addBenchmarkEntry,
  deleteBenchmark,
  getBenchmarkPR,
  getBenchmarkLast,
  formatValue,
  formatForceEntry,
  parseTimeToSeconds,
  calculateCalories,
  calculatePace,
  getSkills,
  createSkill,
  updateSkillStatus,
  addSkillNote,
  incrementDrillCount,
  deleteSkill,
  updateSkillVideoUrl,
  BENCHMARK_CATEGORIES,
  SKILL_CATEGORIES,
  SKILL_STATUS_CONFIG,
  cleanDemoData,
  getTrashBenchmarks,
  getTrashSkills,
  restoreBenchmark,
  restoreSkill,
  emptyTrash,
  getTrashCount,
  TrashItem,
  WATCH_EXERCISE_TEMPLATES,
} from '@/lib/carnetService';
import VictoryShareModal, { VictorySessionData, createVictoryFromEntry } from '@/components/VictoryShareModal';
import Celebration from '@/components/Celebration';
import { AnimatedCounter } from '@/components/stats/AnimatedCounter';
import { StatsEmptyState } from '@/components/stats/StatsEmptyState';
import { StatsInsightBanner } from '@/components/stats/StatsInsightBanner';
import { StatsErrorBoundary } from '@/components/stats/StatsErrorBoundary';
import { ShareStatsButton } from '@/components/stats/ShareStatsButton';
import { Trophy as TrophyIcon, Brain, Lightbulb, Map as MapIcon, Shield as ShieldIcon, Activity as ActivityIcon, Zap as ZapIcon, Dumbbell as DumbbellIcon, Target as TargetIcon } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPendingVictory } from '@/lib/victoryTrigger';

const JOURNAL_CACHE_KEY = '@yoroi_journal_data_cache_v1';
const JOURNAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
import { renderIcon } from '@/lib/training-journal/utils/iconMap';
import { getRelativeDate } from '@/lib/training-journal/utils/dateHelpers';
import AddEntryModal from './training-journal/components/AddEntryModal';
import BenchmarkDetailModal from './training-journal/components/BenchmarkDetailModal';
import SparringTab from './training-journal/components/SparringTab';
import CompetitionsTab from './training-journal/components/CompetitionsTab';
import PositionsTab from './training-journal/components/PositionsTab';
import SoumissionsTab from './training-journal/components/SoumissionsTab';
import SortiesTab from './training-journal/components/SortiesTab';
import AlluresTab from './training-journal/components/AlluresTab';
import WODsTab from './training-journal/components/WODsTab';
import StationsTab from './training-journal/components/StationsTab';
import VoiesTab from './training-journal/components/VoiesTab';
import SeancesMuscuTab from './training-journal/components/SeancesMuscuTab';
import MusclesTab from './training-journal/components/MusclesTab';
import ProgressionTab from './training-journal/components/ProgressionTab';
import SportPackSwitcher from './training-journal/components/SportPackSwitcher';
import { useSportPack } from '@/lib/SportPackContext';
import SkillDetailModal from './training-journal/components/SkillDetailModal';
import TrashModal from './training-journal/components/TrashModal';
import AddBenchmarkModal from './training-journal/components/AddBenchmarkModal';
import AddSkillModal from './training-journal/components/AddSkillModal';
import { usePreventDoubleClick } from '@/hooks/usePreventDoubleClick';
import { logger } from '@/lib/security/logger';

// ============================================
// SWIPEABLE ROW · swipe gauche pour révéler Supprimer
// ============================================
const SwipeableCard = React.memo(function SwipeableCard({
  onDelete,
  children,
}: {
  onDelete: () => void;
  children: React.ReactNode;
}) {
  const { colors: swipeColors } = useTheme();
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > Math.abs(gs.dy) * 1.5 && Math.abs(gs.dx) > 8,
      onPanResponderMove: (_, gs) => {
        if (gs.dx < 0) {
          translateX.setValue(Math.max(-88, gs.dx));
        } else if (isOpen.current) {
          translateX.setValue(Math.min(0, -88 + gs.dx));
        }
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -40 || (isOpen.current && gs.dx < 15)) {
          Animated.spring(translateX, { toValue: -88, useNativeDriver: true, overshootClamping: true }).start();
          isOpen.current = true;
        } else {
          Animated.spring(translateX, { toValue: 0, useNativeDriver: true, overshootClamping: true }).start();
          isOpen.current = false;
        }
      },
    })
  ).current;

  const close = useCallback(() => {
    Animated.spring(translateX, { toValue: 0, useNativeDriver: true, overshootClamping: true }).start();
    isOpen.current = false;
  }, [translateX]);

  return (
    <View style={{ overflow: 'hidden' }}>
      {/* Bouton rouge derrière */}
      <View style={swipeStyles.deleteBg}>
        <TouchableOpacity
          style={swipeStyles.deleteBtn}
          onPress={() => { close(); onDelete(); }}
          activeOpacity={0.8}
        >
          <Trash2 size={20} color={swipeColors.textOnAccent} />
          <Text style={[swipeStyles.deleteText, { color: swipeColors.textOnAccent }]}>Supprimer</Text>
        </TouchableOpacity>
      </View>
      {/* Carte qui glisse */}
      <Animated.View style={{ transform: [{ translateX }] }} {...panResponder.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
});

const swipeStyles = StyleSheet.create({
  deleteBg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 88,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteBtn: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  deleteText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
});

// ============================================
// MAIN COMPONENT
// ============================================

export default function TrainingJournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark, screenBackground, screenText } = useTheme();
  const { t, locale } = useI18n();
  const { isWatchAvailable, syncRecords } = useWatch();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { isProcessing: isModalProcessing, executeOnce: executeModalOnce } = usePreventDoubleClick({ delay: 500 });

  // TODO: Migrate to useTrainingJournal hook (WIP)
  // For now, keep local state management

  // Data state
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickAdding, setIsQuickAdding] = useState(false);

  // Modal visibility
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [showAddBenchmarkModal, setShowAddBenchmarkModal] = useState(false);
  const [showAddSkillModal, setShowAddSkillModal] = useState(false);
  const [showBenchmarkDetail, setShowBenchmarkDetail] = useState(false);
  const [showSkillDetail, setShowSkillDetail] = useState(false);
  const [showAddEntryModal, setShowAddEntryModal] = useState(false);
  const [showTrashModal, setShowTrashModal] = useState(false);

  // Selected items
  const [selectedBenchmark, setSelectedBenchmark] = useState<Benchmark | null>(null);
  const [selectedSkill, setSelectedSkill] = useState<Skill | null>(null);

  // Trash
  const [trashBenchmarks, setTrashBenchmarks] = useState<TrashItem<Benchmark>[]>([]);
  const [trashSkills, setTrashSkills] = useState<TrashItem<Skill>[]>([]);
  const [trashCount, setTrashCount] = useState(0);

  // Form state - Benchmark
  const [newBenchmarkName, setNewBenchmarkName] = useState('');
  const [newBenchmarkCategory, setNewBenchmarkCategory] = useState<BenchmarkCategory>('force');
  const [newBenchmarkUnit, setNewBenchmarkUnit] = useState<BenchmarkUnit>('kg');

  // Form state - Skill
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('jjb_garde');
  const [newSkillStatus, setNewSkillStatus] = useState<SkillStatus>('to_learn');
  const [newSkillNotes, setNewSkillNotes] = useState('');
  const [newSkillVideoUri, setNewSkillVideoUri] = useState<string | null>(null);

  // Form state - Entry
  const [newEntryValue, setNewEntryValue] = useState('');
  const [newEntryReps, setNewEntryReps] = useState('');
  const [newEntryUnit, setNewEntryUnit] = useState<WeightUnit>('kg');
  const [newEntryRPE, setNewEntryRPE] = useState<number>(5);
  const [newNoteText, setNewNoteText] = useState('');
  const [drillIncrement, setDrillIncrement] = useState('10');

  // Filter state
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<SkillStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab state for Records/Techniques
  const [activeTab, setActiveTab] = useState<'records' | 'techniques' | 'combat' | 'competitions' | 'positions' | 'submissions' | 'sorties' | 'allures' | 'wods' | 'stations' | 'voies' | 'seances_muscu' | 'muscles' | 'progression'>('records');
  // Pack actif (Combat/Endurance/Force/Nature)
  const { activePack } = useSportPack();

  // Reset activeTab si l'onglet courant n'est pas dans le pack actif
  useEffect(() => {
    const universalTabs = ['records', 'techniques'];
    const combatTabs = [...universalTabs, 'combat', 'competitions', 'positions', 'submissions'];
    const enduranceTabs = [...universalTabs, 'sorties', 'allures', 'competitions'];
    const forceTabs = [...universalTabs, 'wods', 'stations', 'competitions'];
    const musculationTabs = [...universalTabs, 'seances_muscu', 'muscles', 'progression'];
    const natureTabs = [...universalTabs, 'voies', 'competitions'];
    const allowed =
      activePack === 'combat' ? combatTabs
      : activePack === 'endurance' ? enduranceTabs
      : activePack === 'force' ? forceTabs
      : activePack === 'musculation' ? musculationTabs
      : activePack === 'nature' ? natureTabs
      : universalTabs;
    if (!allowed.includes(activeTab)) {
      setActiveTab('records');
    }
  }, [activePack]);

  // New selection states for records (Mirroring Watch app)
  const [isSportPickerVisible, setIsSportPickerVisible] = useState(false);
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [isMusclePickerVisible, setIsMusclePickerVisible] = useState(false);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [isExercisePickerVisible, setIsExercisePickerVisible] = useState(false);

  // Date picker state for new entry
  const [entryDate, setEntryDate] = useState<'today' | 'yesterday' | 'custom'>('today');
  const [customDate, setCustomDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // TASK 2: Global "One Touch" Filter - Renamed Force -> Musculation
  type GlobalFilter = 'all' | 'musculation' | 'running' | 'jjb' | 'boxe' | 'lutte' | 'grappling' | 'autre';
  const [globalFilter, setGlobalFilter] = useState<GlobalFilter>('all');

  // TASK 2: Video URL for skills
  const [editingVideoUrl, setEditingVideoUrl] = useState('');

  // PILLAR 1: Enhanced data entry
  const [newEntryDuration, setNewEntryDuration] = useState('');
  const [newEntryCalories, setNewEntryCalories] = useState('');
  const [userWeight, setUserWeight] = useState(75); // Default user weight in kg
  const [clubName, setClubName] = useState('');

  // RUNNING Pro Entry: Distance + Time + Auto Pace
  const [newEntryDistance, setNewEntryDistance] = useState('');
  const [runningTimeHours, setRunningTimeHours] = useState('');
  const [runningTimeMinutes, setRunningTimeMinutes] = useState('');
  const [runningTimeSeconds, setRunningTimeSeconds] = useState('');

  // HYROX Intelligence: Effort Type
  type HyroxEffortType = 'course' | 'station_force' | 'repetitions';
  const [hyroxEffortType, setHyroxEffortType] = useState<HyroxEffortType>('course');
  const [hyroxDistanceMeters, setHyroxDistanceMeters] = useState('');

  // Advanced Cardio Metrics
  const [newEntryIncline, setNewEntryIncline] = useState('');
  const [newEntrySpeed, setNewEntrySpeed] = useState('');
  const [newEntryPace, setNewEntryPace] = useState('');
  const [newEntryWatts, setNewEntryWatts] = useState('');
  const [newEntryResistance, setNewEntryResistance] = useState('');
  const [newEntryLevel, setNewEntryLevel] = useState('');

  // PILLAR 3: Victory Share Modal
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [victorySessionData, setVictorySessionData] = useState<VictorySessionData | null>(null);
  // Célébration PR (confetti + haptic heavy)
  const [showPRCelebration, setShowPRCelebration] = useState(false);
  const [prCelebrationData, setPRCelebrationData] = useState<{ title: string; subtitle?: string } | null>(null);

  // Computed stats from local data
  const benchmarksWithEntries = useMemo(
    () => benchmarks.filter(b => b.entries && b.entries.length > 0),
    [benchmarks]
  );
  const stats = useMemo(() => ({
    totalBenchmarks: benchmarksWithEntries.length,
    totalPRs: benchmarksWithEntries.reduce((count, b) => count + (b.entries?.length || 0), 0),
    skillsMastered: skills.filter(s => s.status === 'mastered').length,
    totalDrills: skills.reduce((count, s) => count + (s.drillCount || 0), 0),
  }), [benchmarksWithEntries, skills]);

  // Stats avancées Records (pour le bloc analytics tab Records)
  const recordsStats = useMemo(() => {
    if (benchmarksWithEntries.length === 0) {
      return { categories: 0, lastPR: null, mostActive: null, recentMonth: 0 };
    }
    const cats = new Set<string>();
    let lastPR: { name: string; date: string; value: string; unit: string; color: string } | null = null;
    let mostActive: { name: string; entries: number; color: string } | null = null;
    let recentMonth = 0;
    const monthAgo = Date.now() - 30 * 86400000;

    for (const b of benchmarksWithEntries) {
      if (b.category) cats.add(b.category);
      const entries = b.entries || [];
      // Compteur PR du mois
      for (const e of entries) {
        try {
          if (new Date(e.date).getTime() >= monthAgo) recentMonth++;
        } catch {}
      }
      // Plus actif
      if (!mostActive || entries.length > mostActive.entries) {
        mostActive = { name: b.name, entries: entries.length, color: b.color || '#EF4444' };
      }
      // Dernier PR (entrée la plus récente)
      const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      const recent = sorted[0];
      if (recent && (!lastPR || new Date(recent.date).getTime() > new Date(lastPR.date).getTime())) {
        lastPR = {
          name: b.name,
          date: recent.date,
          value: String(recent.value),
          unit: b.unit || '',
          color: b.color || '#EF4444',
        };
      }
    }
    return { categories: cats.size, lastPR, mostActive, recentMonth };
  }, [benchmarksWithEntries]);

  // Stats avancées Techniques (pour le bloc analytics tab Techniques)
  const skillsStats = useMemo(() => {
    const inProgress = skills.filter(s => s.status === 'in_progress').length;
    const toLearn = skills.filter(s => s.status === 'to_learn').length;
    const mastered = skills.filter(s => s.status === 'mastered').length;
    const total = skills.length;
    const masteryPct = total > 0 ? Math.round((mastered / total) * 100) : 0;
    // Suggestion : in_progress avec le plus FAIBLE drillCount (pour booster)
    const suggestion = skills
      .filter(s => s.status === 'in_progress')
      .sort((a, b) => (a.drillCount || 0) - (b.drillCount || 0))[0] || null;
    // Top drillé (mastered ou in_progress)
    const topDrilled = [...skills].sort((a, b) => (b.drillCount || 0) - (a.drillCount || 0))[0] || null;
    // Recent mastered
    const recentMastered = [...skills.filter(s => s.status === 'mastered')]
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())[0] || null;
    return { inProgress, toLearn, mastered, total, masteryPct, suggestion, topDrilled, recentMastered };
  }, [skills]);

  // Load user preferences
  useEffect(() => {
    const loadUserPrefs = async () => {
      try {
        const savedWeight = await AsyncStorage.getItem('yoroi_user_weight');
        const savedClub = await AsyncStorage.getItem('yoroi_club_name');
        if (savedWeight) setUserWeight(parseFloat(savedWeight));
        if (savedClub) setClubName(savedClub);
      } catch (e) {
        logger.error('Error loading user prefs:', e);
      }
    };
    loadUserPrefs();
  }, []);

  // TASK 4: Check for pending victory from calendar
  useEffect(() => {
    const checkPendingVictory = async () => {
      const pendingVictory = await getPendingVictory();
      if (pendingVictory) {
        setVictorySessionData(pendingVictory);
        setShowVictoryModal(true);
      }
    };
    checkPendingVictory();
  }, []);

  // Reset modal state
  const resetModalState = useCallback(() => {
    setShowAddEntryModal(false);
    setNewEntryValue('');
    setNewEntryReps('');
    setNewEntryDuration('');
    setNewEntryCalories('');
    setNewEntryRPE(5);
    setEntryDate('today');
    setNewEntryDistance('');
    setRunningTimeHours('');
    setRunningTimeMinutes('');
    setRunningTimeSeconds('');
    setHyroxEffortType('course');
    setHyroxDistanceMeters('');
    setNewEntryIncline('');
    setNewEntrySpeed('');
    setNewEntryPace('');
    setNewEntryWatts('');
    setNewEntryResistance('');
    setNewEntryLevel('');
  }, []);

  // TASK 3: Toast notification
  const [toastVisible, setToastVisible] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const toastOpacity = useState(new Animated.Value(0))[0];

  const showToast = (message: string) => {
    setToastMessage(message);
    setToastVisible(true);
    Animated.sequence([
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => setToastVisible(false));
  };

  // Nettoyer les données de démo (11 records vides)
  const handleCleanDemoData = async () => {
    try {
      const result = await cleanDemoData();
      await loadData(); // Reload
      showPopup({
        title: result.removed > 0 ? t('journal.cleanupSuccess') : t('journal.alreadyClean'),
        message: result.message,
        type: result.removed > 0 ? 'success' : 'info',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } catch (error) {
      logger.error('Erreur nettoyage:', error);
    }
  };

  const handleInstallLibrary = async () => {
    try {
      setIsSubmitting(true);
      notificationAsync(NotificationFeedbackType.Success);
      
      // Installer la bibliothèque massive
      for (const ex of EXERCISE_LIBRARY) {
        // Éviter les doublons
        const existing = benchmarks.find(b => b.name.toLowerCase() === ex.name.toLowerCase());
        if (!existing) {
          await createBenchmark(ex.name, ex.category as any, ex.unit as any, undefined, undefined, ex.muscle);
        }
      }

      await loadData();
      
      // SYNC VERS LA MONTRE
      const currentBenchmarks = await getBenchmarks();
      const recordsToSync = currentBenchmarks.map(b => ({
        exercise: b.name,
        weight: getBenchmarkPR(b)?.value || 0,
        reps: getBenchmarkPR(b)?.reps || 0,
        date: getBenchmarkPR(b)?.date || new Date().toISOString()
      }));
      
      if (isWatchAvailable) {
        await syncRecords(recordsToSync);
      }

      showToast(t('journal.libraryInstalled'));
    } catch (error) {
      logger.error('Error installing library:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Load trash data
  const loadTrashData = useCallback(async () => {
    try {
      const [trashB, trashS, count] = await Promise.all([
        getTrashBenchmarks(),
        getTrashSkills(),
        getTrashCount(),
      ]);
      setTrashBenchmarks(trashB);
      setTrashSkills(trashS);
      setTrashCount(count);
    } catch (error) {
      logger.error('Error loading trash:', error);
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      // Check for screenshot mode
      const isScreenshotMode = await AsyncStorage.getItem('@yoroi_journal_screenshot_mode') === 'true';

      if (isScreenshotMode) {
        // MOCK DATA FOR SCREENSHOTS
        const mockBenchmarks: Benchmark[] = [
          {
            id: 'bench_1', name: 'Développé Couché', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444', createdAt: new Date().toISOString(), muscleGroup: 'PECTORAUX',
            entries: [
              { id: 'e1', value: 100, reps: 5, date: new Date().toISOString(), rpe: 9, notes: 'Record personnel !' },
              { id: 'e2', value: 95, reps: 5, date: new Date(Date.now() - 86400000 * 7).toISOString(), rpe: 8 }
            ]
          },
          {
            id: 'bench_2', name: 'Squat', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444', createdAt: new Date().toISOString(), muscleGroup: 'JAMBES',
            entries: [
              { id: 'e3', value: 140, reps: 3, date: new Date().toISOString(), rpe: 9, notes: 'Technique solide' }
            ]
          },
          {
            id: 'bench_3', name: '10km', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6', createdAt: new Date().toISOString(), muscleGroup: 'CARDIO',
            entries: [
              { id: 'e4', value: 2400, date: new Date().toISOString(), duration: 40, distance: 10, notes: 'Allure 4:00/km' }
            ]
          }
        ];

        const mockSkills: Skill[] = [
          {
            id: 'skill_1', name: 'Triangle', category: 'jjb_soumission', status: 'mastered', drillCount: 150, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            notes: [{ id: 'n1', text: 'Bien couper l\'angle', date: new Date().toISOString() }]
          },
          {
            id: 'skill_2', name: 'Passage Toreando', category: 'jjb_passage', status: 'in_progress', drillCount: 45, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            notes: []
          },
          {
            id: 'skill_3', name: 'Berimbolo', category: 'jjb_garde', status: 'to_learn', drillCount: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
            notes: []
          }
        ];

        setBenchmarks(mockBenchmarks);
        setSkills(mockSkills);
        return;
      }

      // Cache instantané · afficher les données précédentes pendant le rechargement
      try {
        const cached = await AsyncStorage.getItem(JOURNAL_CACHE_KEY);
        if (cached) {
          const { ts, data } = JSON.parse(cached);
          if (Date.now() - ts < JOURNAL_CACHE_TTL) {
            if (data.benchmarks?.length) setBenchmarks(data.benchmarks);
            if (data.skills?.length) setSkills(data.skills);
          }
        }
      } catch { /* cache corrompu */ }

      const [fetchedBenchmarks, fetchedSkills, count] = await Promise.all([
        getBenchmarks(),
        getSkills(),
        getTrashCount(),
      ]);

      setBenchmarks(fetchedBenchmarks);
      setSkills(fetchedSkills);
      setTrashCount(count);

      // Sauvegarder en cache
      try {
        await AsyncStorage.setItem(JOURNAL_CACHE_KEY, JSON.stringify({
          ts: Date.now(),
          data: { benchmarks: fetchedBenchmarks, skills: fetchedSkills },
        }));
      } catch { /* non-bloquant */ }
    } catch (error) {
      logger.error('Error loading data:', error);
    }
  }, []);


  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await AsyncStorage.removeItem(JOURNAL_CACHE_KEY).catch(() => {});
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadData(); }, []);

  // Rafraichir quand un exercice est synchronise depuis la montre (bypass cache)
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('CARNET_UPDATED', () => {
      AsyncStorage.removeItem(JOURNAL_CACHE_KEY).catch(() => {});
      loadData();
    });
    return () => sub.remove();
  }, [loadData]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', loadData);
    return () => sub.remove();
  }, [loadData]);

  // TASK 2: Apply global filter to benchmarks and skills (Force -> Musculation)
  const matchesGlobalFilter = (benchmarkCategory: BenchmarkCategory | null, skillCategory: SkillCategory | null): boolean => {
    if (globalFilter === 'all') return true;
    if (globalFilter === 'musculation') return benchmarkCategory === 'force' || benchmarkCategory === 'bodyweight';
    if (globalFilter === 'running') return benchmarkCategory === 'running' || benchmarkCategory === 'trail' || benchmarkCategory === 'hyrox';
    if (globalFilter === 'jjb') return skillCategory?.startsWith('jjb_') ?? false;
    if (globalFilter === 'boxe') return skillCategory === 'striking';
    if (globalFilter === 'lutte') return skillCategory === 'lutte';
    if (globalFilter === 'grappling') return skillCategory === 'lutte' || (skillCategory?.startsWith('jjb_') ?? false);
    if (globalFilter === 'autre') return benchmarkCategory === 'custom' || skillCategory === 'other';
    return true;
  };

  // Filter benchmarks (by global filter AND search query) - only show benchmarks WITH entries
  // Poids de Corps (bodyweight) exclu · c'est le poids de l'utilisateur, pas pertinent ici
  // Sorted by most recent entry first
  const filteredBenchmarks = benchmarks.filter(b => {
    const hasEntries = b.entries && b.entries.length > 0;
    const isBodyweight = b.category === 'bodyweight';
    const matchesGlobal = matchesGlobalFilter(b.category, null);
    const matchesSearch = searchQuery.trim() === '' ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase());
    return hasEntries && !isBodyweight && matchesGlobal && matchesSearch;
  }).sort((a, b) => {
    const lastA = getBenchmarkLast(a);
    const lastB = getBenchmarkLast(b);
    if (!lastA) return 1;
    if (!lastB) return -1;
    return new Date(lastB.date).getTime() - new Date(lastA.date).getTime();
  });

  // Group benchmarks by category and sub-group muscu by muscle
  const groupedBenchmarks = useMemo(() => {
    const groups: Record<string, Record<string, Benchmark[]>> = {};
    
    filteredBenchmarks.forEach(b => {
      const catLabel = BENCHMARK_CATEGORIES[b.category]?.label || 'AUTRE';
      const muscle = b.muscleGroup || 'GÉNÉRAL';
      
      if (!groups[catLabel]) groups[catLabel] = {};
      if (!groups[catLabel][muscle]) groups[catLabel][muscle] = [];
      
      groups[catLabel][muscle].push(b);
    });
    
    return groups;
  }, [filteredBenchmarks]);

  // Filter skills (by global filter, status AND search query)
  const filteredSkills = skills.filter(s => {
    const matchesGlobal = matchesGlobalFilter(null, s.category);
    const matchesStatus = selectedSkillFilter === 'all' || s.status === selectedSkillFilter;
    const matchesSearch = searchQuery.trim() === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGlobal && matchesStatus && matchesSearch;
  });

  // Get the actual date for entry
  const getEntryDate = (): Date => {
    if (entryDate === 'today') return new Date();
    if (entryDate === 'yesterday') {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d;
    }
    return customDate;
  };

  // ============================================
  // HANDLERS
  // ============================================

  const handleQuickAddRecord = async (exerciseName: string, category: BenchmarkCategory, unit: BenchmarkUnit) => {
    // Protection anti-spam
    if (isQuickAdding) return;
    setIsQuickAdding(true);

    try {
      // 1. Find if benchmark exists or create it
      let targetBenchmark: Benchmark | undefined | null = benchmarks.find(b => b.name === exerciseName);
      if (!targetBenchmark) {
        targetBenchmark = await createBenchmark(exerciseName, category, unit, undefined, undefined, selectedMuscleGroup || undefined);
      }

      if (targetBenchmark) {
        setSelectedBenchmark(targetBenchmark);
        setIsExercisePickerVisible(false);
        setShowAddEntryModal(true);
      }
    } catch (error) {
      logger.error('Error in quick add:', error);
    } finally {
      setIsQuickAdding(false);
    }
  };

  const handleAddBenchmark = async () => {
    // Protection anti-spam dès le début
    if (isSubmitting) return;

    if (!newBenchmarkName.trim()) {
      showPopup({
        title: t('common.error'),
        message: t('journal.enterNameForTracking'),
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    setIsSubmitting(true);
    try {
      impactAsync(ImpactFeedbackStyle.Medium);
      const result = await createBenchmark(newBenchmarkName, newBenchmarkCategory, newBenchmarkUnit);
      if (result) {
        setShowAddBenchmarkModal(false);
        setNewBenchmarkName('');
        showToast(t('journal.savedSuccessfully'));
        loadData();
      }
    } catch (error) {
      logger.error('Error adding benchmark:', error);
      showPopup({ title: t('common.error'), message: t('journal.cannotCreateTracking'), buttons: [{ text: 'OK', style: 'default' }] });
    } finally {
      setIsSubmitting(false);
    }
  };

  // TASK 3: Video picker for techniques
  // Helper: Copy video from temp cache to permanent storage
  const saveVideoToPermanentStorage = async (tempUri: string): Promise<string | null> => {
    try {
      const videoDir = `${FileSystem.documentDirectory}skill_videos/`;
      const dirInfo = await FileSystem.getInfoAsync(videoDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(videoDir, { intermediates: true });
      }

      const fileName = `skill_${Date.now()}.mp4`;
      const permanentUri = `${videoDir}${fileName}`;

      await FileSystem.copyAsync({
        from: tempUri,
        to: permanentUri,
      });

      return permanentUri;
    } catch (error) {
      logger.error('Error saving video to permanent storage:', error);
      return null;
    }
  };

  const pickSkillVideo = async () => {
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPopup({
        title: 'Permission refusee',
        message: 'Autorise l\'acces a la galerie pour ajouter une video.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Videos,
      allowsEditing: false,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      impactAsync(ImpactFeedbackStyle.Light);
      // Copy to permanent storage
      const permanentUri = await saveVideoToPermanentStorage(result.assets[0].uri);
      if (permanentUri) {
        setNewSkillVideoUri(permanentUri);
      } else {
        showPopup({
          title: t('common.error'),
          message: t('journal.cannotSaveVideo'),
          buttons: [{ text: 'OK', style: 'default' }],
        });
      }
    }
  };

  const recordSkillVideo = async () => {
    const { status } = await requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission refusee', 'Autorise l\'acces a la camera pour filmer.');
      return;
    }

    const result = await launchCameraAsync({
      mediaTypes: MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60, // Max 60 seconds
    });

    if (!result.canceled && result.assets[0]) {
      impactAsync(ImpactFeedbackStyle.Light);
      // Copy to permanent storage
      const permanentUri = await saveVideoToPermanentStorage(result.assets[0].uri);
      if (permanentUri) {
        setNewSkillVideoUri(permanentUri);
      } else {
        showPopup({title: t('common.error'), message: t('journal.cannotSaveVideo'), buttons: [{ text: 'OK', style: 'default' }]});
      }
    }
  };

  const handleAddSkill = async () => {
    if (isSubmitting) return; // Anti-spam protection
    if (!newSkillName.trim()) {
      showPopup({title: t('common.error'), message: t('journal.enterSkillName'), buttons: [{ text: 'OK', style: 'default' }]});
      return;
    }

    try {
      setIsSubmitting(true);
      impactAsync(ImpactFeedbackStyle.Medium);
      // Create skill with video URI if available
      const result = await createSkill(newSkillName, newSkillCategory, newSkillStatus, newSkillNotes);
      if (result && newSkillVideoUri) {
        // Save video URI to skill (using videoUrl field for local URI)
        await updateSkillVideoUrl(result.id, newSkillVideoUri);
      }
      if (result) {
        setShowAddSkillModal(false);
        setNewSkillName('');
        setNewSkillStatus('to_learn');
        setNewSkillNotes('');
        setNewSkillVideoUri(null);
        showToast(t('journal.skillSaved'));
        loadData();
      }
    } catch (error) {
      logger.error('Error adding skill:', error);
      showPopup({ title: t('common.error'), message: t('journal.cannotCreateSkill'), buttons: [{ text: 'OK', style: 'default' }] });
    } finally {
      setIsSubmitting(false);
    }
  };

  // TASK 2: Handle video URL update
  const handleUpdateVideoUrl = async () => {
    if (!selectedSkill) return;
    impactAsync(ImpactFeedbackStyle.Light);
    await updateSkillVideoUrl(selectedSkill.id, editingVideoUrl);
    showToast(t('journal.videoLinkSaved'));
    // Refresh
    const updated = await getSkills();
    const refreshed = updated.find(s => s.id === selectedSkill.id);
    if (refreshed) setSelectedSkill(refreshed);
    loadData();
  };

  const openVideoUrl = (url: string) => {
    if (!url) return;
    impactAsync(ImpactFeedbackStyle.Light);
    safeOpenURL(url);
  };

  const handleAddEntry = async () => {
    if (isSubmitting) return; // Anti-spam protection
    if (!selectedBenchmark) return;

    // Detect exercise types
    // Force + Musculation = toujours poids+reps (peu importe l'unité stockée)
    const isWeightExercise =
      selectedBenchmark.category === 'force' || selectedBenchmark.category === 'musculation';
    const isRunningOrCardio = ['running', 'trail', 'hyrox', 'cardio'].includes(selectedBenchmark.category);

    // For running/cardio, the value comes from time fields (not newEntryValue)
    if (!isRunningOrCardio && !newEntryValue.trim()) return;

    if (isWeightExercise && !newEntryReps.trim()) {
      showPopup(t('common.error'), t('journal.repsRequired'));
      return;
    }

    try {
      setIsSubmitting(true);
      impactAsync(ImpactFeedbackStyle.Medium);
    let value: number;

    if (isRunningOrCardio && selectedBenchmark.unit === 'time') {
      // Compute total time in seconds from H:M:S fields
      const h = parseInt(runningTimeHours) || 0;
      const m = parseInt(runningTimeMinutes) || 0;
      const s = parseInt(runningTimeSeconds) || 0;
      value = h * 3600 + m * 60 + s;
      if (value === 0) {
        showPopup(t('common.error'), t('journal.indicateDuration'));
        setIsSubmitting(false);
        return;
      }
    } else if (isWeightExercise) {
      // Pour musculation/force, la valeur est toujours un poids en kg/lbs
      value = parseFloat(newEntryValue);
    } else if (selectedBenchmark.unit === 'time') {
      value = parseTimeToSeconds(newEntryValue);
    } else {
      value = parseFloat(newEntryValue);
    }

    if (isNaN(value)) {
      showPopup(t('common.error'), t('journal.invalidValue'));
      return;
    }

    const reps = newEntryReps.trim() ? parseInt(newEntryReps) : undefined;
    const duration = newEntryDuration.trim() ? parseInt(newEntryDuration) : undefined;

    // Auto-calculate calories if duration is provided
    let calories = newEntryCalories.trim() ? parseInt(newEntryCalories) : undefined;
    if (!calories && duration && duration > 0) {
      calories = calculateCalories(duration, userWeight, selectedBenchmark.category);
    }

    const selectedDate = getEntryDate();

    // Get current PR before adding new entry
    const currentPR = getBenchmarkPR(selectedBenchmark);

    const advancedMetrics = {
      distance: newEntryDistance.trim() ? parseFloat(newEntryDistance) : undefined,
      incline: newEntryIncline.trim() ? parseFloat(newEntryIncline) : undefined,
      speed: newEntrySpeed.trim() ? parseFloat(newEntrySpeed) : undefined,
      pace: newEntryPace.trim() ? newEntryPace : undefined,
      watts: newEntryWatts.trim() ? parseInt(newEntryWatts) : undefined,
      level: newEntryLevel.trim() ? parseInt(newEntryLevel) : undefined,
    };

    const newEntry = await addBenchmarkEntry(
      selectedBenchmark.id,
      value,
      newEntryRPE,
      undefined,
      selectedDate,
      reps,
      duration,
      calories,
      advancedMetrics
    );

    if (newEntry) {
      // Check if this is a new PR
      let isPR = false;
      if (currentPR) {
        if (selectedBenchmark.unit === 'time') {
          isPR = value < currentPR.value;
        } else {
          isPR = value > currentPR.value;
        }
      } else {
        isPR = true; // First entry is always a PR
      }

      // Format performance string
      const performanceStr = isWeightExercise
        ? formatForceEntry(value, selectedBenchmark.unit, reps)
        : formatValue(value, selectedBenchmark.unit);

      setShowAddEntryModal(false);
      resetModalState();

      // Prepare victory data
      const isRunning = ['running', 'trail', 'hyrox'].includes(selectedBenchmark.category);
      setVictorySessionData({
        exerciseName: selectedBenchmark.name,
        category: selectedBenchmark.category,
        performance: performanceStr,
        duration,
        calories,
        rpe: newEntryRPE,
        date: selectedDate.toISOString(),
        isPR,
        // Running-specific: for pace calculation
        distanceKm: (isRunning || selectedBenchmark.category === 'cardio') && advancedMetrics.distance ? advancedMetrics.distance : (isRunning && selectedBenchmark.unit === 'km' ? value : undefined),
        // For time-unit benchmarks, value IS the time in seconds. Otherwise use session duration.
        timeSeconds: (isRunning || selectedBenchmark.category === 'cardio')
          ? (selectedBenchmark.unit === 'time' ? value : (duration ? duration * 60 : undefined))
          : undefined,
        // Advanced metrics for social card
        ...advancedMetrics,
      });

      // Célébration RP : confetti + heavy haptic + animation AVANT le modal de partage
      if (isPR) {
        impactAsync(ImpactFeedbackStyle.Heavy).catch(() => {});
        setPRCelebrationData({
          title: 'NOUVEAU RECORD',
          subtitle: `${selectedBenchmark.name} · ${performanceStr}`,
        });
        setShowPRCelebration(true);
        // Laisser la célébration jouer 2.2s puis ouvrir le VictoryShareModal
        setTimeout(() => {
          setShowVictoryModal(true);
        }, 2200);
      } else {
        // Show victory modal (Style Yoroi)
        setShowVictoryModal(true);
      }

      showToast(isPR ? t('journal.newRecord') : t('journal.savedSuccessfully'));
      loadData();

      // SYNC VERS LA MONTRE si nouveau record
      if (isPR && isWatchAvailable) {
        const updatedBenchmarks = await getBenchmarks();
        const recordsToSync = updatedBenchmarks.map(b => ({
          exercise: b.name,
          weight: getBenchmarkPR(b)?.value || 0,
          reps: getBenchmarkPR(b)?.reps || 0,
          date: getBenchmarkPR(b)?.date || new Date().toISOString()
        }));
        syncRecords(recordsToSync).catch(() => {}); // Non bloquant
      }

      // Refresh selected benchmark
      const updated = await getBenchmarks();
      const refreshed = updated.find(b => b.id === selectedBenchmark.id);
      if (refreshed) setSelectedBenchmark(refreshed);
    }
    } catch (error) {
      logger.error('Error adding entry:', error);
      showPopup({ title: t('common.error'), message: 'Impossible d\'enregistrer', buttons: [{ text: 'OK', style: 'default' }] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBenchmark = async (id: string) => {
    showPopup(
      t('journal.delete'),
      t('journal.deleteBenchmarkConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('journal.delete'),
          style: 'destructive',
          onPress: async () => {
            impactAsync(ImpactFeedbackStyle.Heavy);
            await deleteBenchmark(id);
            setShowBenchmarkDetail(false);
            setSelectedBenchmark(null);
            loadData();
          },
        },
      ]
    );
  };

  const handleUpdateSkillStatus = async (skillId: string, status: SkillStatus) => {
    impactAsync(ImpactFeedbackStyle.Light);
    await updateSkillStatus(skillId, status);
    loadData();
    // Refresh selected skill
    const updated = await getSkills();
    const refreshed = updated.find(s => s.id === skillId);
    if (refreshed) setSelectedSkill(refreshed);
  };

  const handleAddNote = async () => {
    if (isSubmitting) return; // Anti-spam protection
    if (!selectedSkill || !newNoteText.trim()) return;

    try {
      setIsSubmitting(true);
      impactAsync(ImpactFeedbackStyle.Light);
      await addSkillNote(selectedSkill.id, newNoteText);
      setNewNoteText('');
      // Refresh
      const updated = await getSkills();
      const refreshed = updated.find(s => s.id === selectedSkill.id);
      if (refreshed) setSelectedSkill(refreshed);
      loadData();
    } catch (error) {
      logger.error('Error adding note:', error);
      showPopup({ title: t('common.error'), message: 'Impossible d\'ajouter la note', buttons: [{ text: 'OK', style: 'default' }] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncrementDrill = async () => {
    if (!selectedSkill) return;

    const amount = parseInt(drillIncrement) || 10;
    impactAsync(ImpactFeedbackStyle.Medium);
    await incrementDrillCount(selectedSkill.id, amount);
    // Refresh
    const updated = await getSkills();
    const refreshed = updated.find(s => s.id === selectedSkill.id);
    if (refreshed) setSelectedSkill(refreshed);
    loadData();
  };

  const handleDeleteSkill = async (id: string) => {
    showPopup(
      t('journal.delete'),
      t('journal.deleteSkillConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('journal.delete'),
          style: 'destructive',
          onPress: async () => {
            impactAsync(ImpactFeedbackStyle.Heavy);
            await deleteSkill(id);
            setShowSkillDetail(false);
            setSelectedSkill(null);
            loadData();
          },
        },
      ]
    );
  };

  // ============================================
  // TRASH FUNCTIONS
  // ============================================

  const handleRestoreBenchmark = async (benchmarkId: string) => {
    try {
      impactAsync(ImpactFeedbackStyle.Light);
      const success = await restoreBenchmark(benchmarkId);
      if (success) {
        await Promise.all([loadData(), loadTrashData()]);
        showPopup({
          title: t('journal.restored'),
          message: t('journal.benchmarkRestored'),
          type: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      }
    } catch (error) {
      logger.error('Error restoring benchmark:', error);
      showPopup({
        title: t('common.error'),
        message: t('journal.cannotRestore'),
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const handleRestoreSkill = async (skillId: string) => {
    try {
      impactAsync(ImpactFeedbackStyle.Light);
      const success = await restoreSkill(skillId);
      if (success) {
        await Promise.all([loadData(), loadTrashData()]);
        showPopup({
          title: t('journal.restored'),
          message: t('journal.skillRestored'),
          type: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      }
    } catch (error) {
      logger.error('Error restoring skill:', error);
      showPopup({
        title: t('common.error'),
        message: t('journal.cannotRestore'),
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const handleEmptyTrash = () => {
    if (trashCount === 0) {
      showPopup({
        title: t('journal.trashEmpty'),
        message: t('journal.nothingToDelete'),
        type: 'info',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    // Confirmation avant suppression définitive
    showPopup({
      title: t('journal.emptyTrash'),
      message: `${trashCount} ${t('journal.itemsWillBeDeleted')}`,
      buttons: [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('journal.empty'),
          style: 'destructive',
          onPress: async () => {
            try {
              impactAsync(ImpactFeedbackStyle.Heavy);
              await emptyTrash();
              await loadData();
              setShowTrashModal(false);
              showPopup({
                title: t('journal.trashEmptied'),
                message: t('journal.permanentDeletion'),
                type: 'success',
                buttons: [{ text: 'OK', style: 'default' }]
              });
            } catch (error) {
              logger.error('Error emptying trash:', error);
              showPopup({
                title: t('common.error'),
                message: t('journal.cannotEmptyTrash'),
                type: 'error',
                buttons: [{ text: 'OK', style: 'default' }]
              });
            }
          },
        },
      ]
    });
  };

  // ============================================
  // RENDER COMPONENTS
  // ============================================


  // ============================================
  // COMPACT LOG CARD - High density design
  // ============================================
  const renderCompactBenchmarkCard = (benchmark: Benchmark) => {
    const pr = getBenchmarkPR(benchmark);
    const last = getBenchmarkLast(benchmark);
    const categoryConfig = BENCHMARK_CATEGORIES[benchmark.category] || {
      label: t('journal.other'),
      color: '#6B7280',
      iconName: 'circle'
    };
    const isPR = pr && last && last.value === pr.value;

    // Trend: compare last 2 entries (sorted by date desc)
    const sortedEntries = [...benchmark.entries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    const trendUp = sortedEntries.length >= 2 && sortedEntries[0].value > sortedEntries[1].value;
    const trendDown = sortedEntries.length >= 2 && sortedEntries[0].value < sortedEntries[1].value;

    // Format performance string
    const getPerformanceString = () => {
      if (!last) return '--';
      // Force / musculation / street_workout / bodyweight → poids × reps REPS
      if (['force', 'musculation', 'street_workout'].includes(benchmark.category) ||
          (benchmark.unit === 'kg' || benchmark.unit === 'lbs')) {
        return formatForceEntry(last.value, benchmark.unit, last.reps);
      }
      // Reps unitaires (tractions, dips sans poids…)
      if (benchmark.unit === 'reps') {
        return formatForceEntry(last.value, 'reps', last.reps);
      }
      // Running/Trail/Hyrox: show distance + pace
      if (['running', 'trail', 'hyrox'].includes(benchmark.category)) {
        const distKm = last.distance ?? (benchmark.unit === 'km' ? last.value : null);
        const timeS = benchmark.unit === 'time' ? last.value : (last.duration ? last.duration * 60 : null);
        if (distKm && timeS) {
          const pace = calculatePace(timeS, distKm);
          return `${distKm} km • ${pace} /km`;
        }
        if (distKm) return `${distKm} km`;
      }
      return formatValue(last.value, benchmark.unit);
    };

    return (
      <TouchableOpacity
        key={benchmark.id}
        style={[styles.compactCard, { backgroundColor: colors.backgroundCard, borderLeftColor: benchmark.color }]}
        onPress={() => {
          impactAsync(ImpactFeedbackStyle.Light);
          setSelectedBenchmark(benchmark);
          setShowBenchmarkDetail(true);
        }}
        activeOpacity={0.7}
      >
        {/* Left: Icon */}
        <View style={[styles.compactCardIcon, { backgroundColor: benchmark.color + '15' }]}>
          {renderIcon(benchmark.iconName || categoryConfig.iconName, 18, benchmark.color)}
        </View>

        {/* Center: Name + Performance */}
        <View style={styles.compactCardContent}>
          <Text style={[styles.compactCardName, { color: colors.textPrimary }]} numberOfLines={1}>
            {benchmark.name}
          </Text>
          <View style={styles.compactCardRow}>
            <Text style={[styles.compactCardValue, { color: benchmark.color }]}>
              {getPerformanceString()}
            </Text>
            {isPR && (
              <View style={[styles.compactPRBadge, { backgroundColor: benchmark.color }]}>
                <Text style={[styles.compactPRText, { color: colors.textOnAccent }]}>PR</Text>
              </View>
            )}
            {!isPR && trendUp && (
              <TrendingUp size={13} color="#10B981" strokeWidth={2.5} />
            )}
            {!isPR && trendDown && (
              <TrendingUp size={13} color="#EF4444" strokeWidth={2.5} style={{ transform: [{ scaleY: -1 }] }} />
            )}
          </View>
        </View>

        {/* Right: Date + Actions (Share + Add) */}
        <View style={styles.compactCardRight}>
          <Text style={[styles.compactCardDate, { color: colors.textMuted }]}>
            {last ? getRelativeDate(last.date, t) : ''}
          </Text>
          <View style={styles.compactCardActions}>
            {/* TASK 2: Share button for re-sharing past sessions */}
            {last && (
              <TouchableOpacity
                style={[styles.compactShareBtn, { backgroundColor: colors.backgroundCard, borderColor: benchmark.color }]}
                onPress={(e) => {
                  impactAsync(ImpactFeedbackStyle.Light);
                  // Create victory data from the last entry
                  const victoryData = createVictoryFromEntry(
                    benchmark.name,
                    benchmark.category,
                    last,
                    benchmark.unit,
                    isPR ?? false
                  );
                  setVictorySessionData(victoryData);
                  setShowVictoryModal(true);
                }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Share2 size={12} color={benchmark.color} strokeWidth={2.5} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.compactAddBtn, { backgroundColor: benchmark.color }]}
              onPress={(e) => {
                impactAsync(ImpactFeedbackStyle.Medium);
                setSelectedBenchmark(benchmark);
                setNewEntryUnit(benchmark.unit === 'lbs' ? 'lbs' : 'kg');
                setShowAddEntryModal(true);
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Plus size={14} color="#FFFFFF" strokeWidth={3} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Keep old card for horizontal scroll (less used now)
  const renderBenchmarkCard = (benchmark: Benchmark) => {
    const pr = getBenchmarkPR(benchmark);
    const last = getBenchmarkLast(benchmark);
    const categoryConfig = BENCHMARK_CATEGORIES[benchmark.category] || {
      label: t('journal.other'),
      color: '#6B7280',
      iconName: 'circle'
    };

    const getPerformanceString = () => {
      if (!last) return '--';
      if (['force', 'musculation', 'street_workout'].includes(benchmark.category) ||
          benchmark.unit === 'kg' || benchmark.unit === 'lbs') {
        return formatForceEntry(last.value, benchmark.unit, last.reps);
      }
      if (benchmark.unit === 'reps') {
        return formatForceEntry(last.value, 'reps', last.reps);
      }
      if (['running', 'trail', 'hyrox'].includes(benchmark.category)) {
        const distKm = last.distance ?? (benchmark.unit === 'km' ? last.value : null);
        const timeS = benchmark.unit === 'time' ? last.value : (last.duration ? last.duration * 60 : null);
        if (distKm && timeS) return `${distKm} km • ${calculatePace(timeS, distKm)} /km`;
        if (distKm) return `${distKm} km`;
      }
      return formatValue(last.value, benchmark.unit);
    };

    return (
      <TouchableOpacity
        key={benchmark.id}
        style={[styles.benchmarkCard, { backgroundColor: colors.backgroundCard, borderColor: benchmark.color + '40' }]}
        onPress={() => {
          impactAsync(ImpactFeedbackStyle.Light);
          setSelectedBenchmark(benchmark);
          setShowBenchmarkDetail(true);
        }}
        activeOpacity={0.8}
      >
        {/* Icon */}
        <View style={[styles.benchmarkIconBg, { backgroundColor: benchmark.color + '20' }]}>
          {renderIcon(benchmark.iconName || categoryConfig.iconName, 24, benchmark.color)}
        </View>

        {/* Title - Allow 2 lines */}
        <Text style={[styles.benchmarkName, { color: colors.textPrimary }]} numberOfLines={2}>
          {benchmark.name}
        </Text>

        {/* DATA RICH: Last Entry Value + Relative Date */}
        {last ? (
          <View style={styles.benchmarkDataRich}>
            <Text style={[styles.benchmarkValue, { color: benchmark.color }]}>
              {getPerformanceString()}
            </Text>
            <View style={styles.benchmarkDateRow}>
              <Text style={[styles.benchmarkDate, { color: colors.textMuted }]}>
                {getRelativeDate(last.date, t)}
              </Text>
              {pr && last.value === pr.value && (
                <View style={[styles.prBadge, { backgroundColor: benchmark.color + '20' }]}>
                  <Award size={10} color={benchmark.color} />
                  <Text style={[styles.prBadgeText, { color: benchmark.color }]}>PR</Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.benchmarkDataRich}>
            <Text style={[styles.benchmarkValue, { color: colors.textMuted }]}>--</Text>
            <Text style={[styles.benchmarkValue, { color: colors.textMuted }]}>{t('journal.noData')}</Text>
          </View>
        )}

        {/* Quick Add Button */}
        <TouchableOpacity
          style={[styles.quickAddBtn, { backgroundColor: benchmark.color }]}
          onPress={(e) => {
            impactAsync(ImpactFeedbackStyle.Medium);
            setSelectedBenchmark(benchmark);
            setNewEntryUnit(benchmark.unit === 'lbs' ? 'lbs' : 'kg');
            setShowAddEntryModal(true);
          }}
        >
          <Plus size={16} color="#FFFFFF" strokeWidth={3} />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderSkillCard = (skill: Skill) => {
    const statusConfig = SKILL_STATUS_CONFIG[skill.status];
    const categoryConfig = SKILL_CATEGORIES[skill.category] || {
      label: t('journal.other'),
      color: '#6B7280',
      iconName: 'circle'
    };
    const hasNotes = skill.notes && skill.notes.length > 0;
    const hasVideo = !!skill.videoUrl;

    return (
      <TouchableOpacity
        key={skill.id}
        style={[styles.skillCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
        onPress={() => {
          impactAsync(ImpactFeedbackStyle.Light);
          setSelectedSkill(skill);
          setEditingVideoUrl(skill.videoUrl || ''); // Pre-fill video URL
          setShowSkillDetail(true);
        }}
        activeOpacity={0.8}
      >
        {/* Left: Icon */}
        <View style={styles.skillLeft}>
          <View style={[styles.skillIconBg, { backgroundColor: categoryConfig.color + '20' }]}>
            {renderIcon(categoryConfig.iconName, 22, categoryConfig.color)}
          </View>
        </View>

        {/* Center: Name + Meta */}
        <View style={styles.skillCenter}>
          <Text style={[styles.skillName, { color: colors.textPrimary }]} numberOfLines={2}>
            {skill.name}
          </Text>
          <View style={styles.skillMeta}>
            <Text style={[styles.skillCategorySmall, { color: categoryConfig.color }]}>
              {categoryConfig.label}
            </Text>
            {skill.drillCount > 0 && (
              <Text style={[styles.skillDrillCount, { color: colors.textMuted }]}>
                {skill.drillCount} {t('journal.reps')}
              </Text>
            )}
            {hasNotes && (
              <View style={styles.skillNotesIndicator}>
                <FileText size={12} color={colors.textMuted} />
              </View>
            )}
            {hasVideo && (
              <View style={[styles.skillVideoIndicator, { backgroundColor: categoryConfig.color + '20' }]}>
                <Play size={12} color={categoryConfig.color} />
              </View>
            )}
          </View>
        </View>

        {/* Right: Status Pill (PROMINENT) */}
        <View style={[styles.skillStatusPill, { backgroundColor: statusConfig.bgColor, borderColor: statusConfig.color + '40' }]}>
          <View style={[styles.skillStatusDot, { backgroundColor: statusConfig.color }]} />
          <Text style={[styles.skillStatusPillText, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // ============================================
  // MODALS
  // ============================================

  const renderFabMenu = () => (
    <Modal visible={showFabMenu} animationType="fade" transparent>
      <TouchableOpacity
        style={styles.fabMenuOverlay}
        activeOpacity={1}
        onPress={() => setShowFabMenu(false)}
      >
        <View style={styles.fabMenuContainer}>
          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: '#EF4444' }]}
            onPress={() => {
              setShowFabMenu(false);
              setIsSportPickerVisible(true);
            }}
          >
            <Dumbbell size={22} color={colors.textOnAccent} />
            <Text style={[styles.fabMenuText, { color: colors.textOnAccent }]}>{t('journal.myRecord')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: '#8B5CF6' }]}
            onPress={() => {
              if (isModalProcessing) return;
              executeModalOnce(async () => {
                setShowFabMenu(false);
                setShowAddSkillModal(true);
              });
            }}
            disabled={isModalProcessing}
          >
            <BookOpen size={22} color={colors.textOnAccent} />
            <Text style={[styles.fabMenuText, { color: colors.textOnAccent }]}>{t('journal.skillKnowledge')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: screenBackground, paddingTop: insets.top }]}>
      {/* Barre du haut : corbeille (gauche) + Sport Pack Switcher (scroll horizontal) */}
      <View style={{ backgroundColor: screenBackground, flexDirection: 'row', alignItems: 'center', paddingTop: 4, paddingBottom: 4 }}>
        {/* Corbeille à GAUCHE (hors zone de chips) */}
        <TouchableOpacity
          onPress={() => {
            if (isModalProcessing) return;
            executeModalOnce(async () => {
              await loadTrashData();
              setShowTrashModal(true);
            });
          }}
          style={{
            marginLeft: 12,
            marginRight: 4,
            width: 30, height: 30, borderRadius: 15,
            borderWidth: 1,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.2)',
            borderColor: isDark ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.35)',
            justifyContent: 'center', alignItems: 'center',
          }}
          disabled={isModalProcessing}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Trash2 size={15} color={screenText} strokeWidth={2.5} />
          {trashCount > 0 && (
            <View style={styles.trashBadge}>
              <Text style={styles.trashBadgeText}>{trashCount > 9 ? '9+' : trashCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        {/* Switcher prend le reste · ScrollView horizontale scrolle si nécessaire */}
        <View style={{ flex: 1 }}>
          <SportPackSwitcher />
        </View>
      </View>

      {/* Tab Selector · identique à Planning/Stats */}
      <View style={[styles.tabContainer, { backgroundColor: screenBackground }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsRow}
        >
          {((): Array<{ id: string; label: string; Icon: any; count: number | null }> => {
            const base = [
              { id: 'records',    label: t('journal.records'),  Icon: Dumbbell, count: benchmarksWithEntries.length },
              { id: 'techniques', label: t('journal.skills'),   Icon: BookOpen, count: skills.length },
            ];
            if (activePack === 'combat') {
              return [...base,
                { id: 'combat',       label: t('journal.sparring'),  Icon: Swords,     count: null },
                { id: 'competitions', label: 'Compétitions',         Icon: TrophyIcon, count: null },
                { id: 'positions',    label: 'Positions',            Icon: MapIcon,    count: null },
                { id: 'submissions',  label: 'Soumissions',          Icon: ShieldIcon, count: null },
              ];
            }
            if (activePack === 'endurance') {
              return [...base,
                { id: 'sorties',      label: 'Sorties',      Icon: ActivityIcon, count: null },
                { id: 'allures',      label: 'Allures',      Icon: ZapIcon,      count: null },
                { id: 'competitions', label: 'Courses',      Icon: TrophyIcon,   count: null },
              ];
            }
            if (activePack === 'force') {
              return [...base,
                { id: 'wods',         label: 'WODs',         Icon: DumbbellIcon, count: null },
                { id: 'stations',     label: 'Stations',     Icon: TargetIcon,   count: null },
                { id: 'competitions', label: 'Compétitions', Icon: TrophyIcon,   count: null },
              ];
            }
            if (activePack === 'musculation') {
              return [...base,
                { id: 'seances_muscu', label: 'Séances',      Icon: DumbbellIcon, count: null },
                { id: 'muscles',       label: 'Muscles',      Icon: ZapIcon,      count: null },
                { id: 'progression',   label: 'Progression',  Icon: TargetIcon,   count: null },
              ];
            }
            if (activePack === 'nature') {
              return [...base,
                { id: 'voies',        label: 'Voies',        Icon: MapIcon,      count: null },
                { id: 'competitions', label: 'Compétitions', Icon: TrophyIcon,   count: null },
              ];
            }
            return base;
          })().map(({ id, label, Icon, count }) => {
            const isActive = activeTab === id;
            return (
              <TouchableOpacity
                key={id}
                style={styles.circleTabWrapper}
                onPress={() => { impactAsync(ImpactFeedbackStyle.Light); setActiveTab(id as any); }}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.circleTab,
                  {
                    backgroundColor: isActive
                      ? (isDark ? colors.accent : '#FFFFFF')
                      : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.18)'),
                    borderWidth: isActive ? 0 : 1,
                    borderColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.3)',
                  },
                ]}>
                  <Icon
                    size={18}
                    color={isActive
                      ? (isDark ? '#FFFFFF' : colors.accent)
                      : screenText}
                    strokeWidth={2.5}
                    style={{ opacity: isActive ? 1 : 0.7 }}
                  />
                  {count !== null && count > 0 && (
                    <View style={styles.circleBadge}>
                      <Text style={styles.circleBadgeText}>{count > 99 ? '99+' : count}</Text>
                    </View>
                  )}
                </View>
                <Text style={[
                  styles.circleTabLabel,
                  {
                    color: isActive ? (isDark ? colors.accent : '#FFFFFF') : screenText,
                    opacity: isActive ? 1 : 0.7,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Info Banner supprimé - nettoyage disponible dans Menu */}

      {/* Onglet Sparring · contenu inline, pas de recherche ni filtres */}
      {activeTab === 'combat' && <StatsErrorBoundary tabName="Sparring"><SparringTab /></StatsErrorBoundary>}
      {activeTab === 'competitions' && <StatsErrorBoundary tabName="Compétitions"><CompetitionsTab /></StatsErrorBoundary>}
      {activeTab === 'positions' && <StatsErrorBoundary tabName="Positions"><PositionsTab /></StatsErrorBoundary>}
      {activeTab === 'submissions' && <StatsErrorBoundary tabName="Soumissions"><SoumissionsTab /></StatsErrorBoundary>}
      {activeTab === 'sorties' && <StatsErrorBoundary tabName="Sorties"><SortiesTab /></StatsErrorBoundary>}
      {activeTab === 'allures' && <StatsErrorBoundary tabName="Allures"><AlluresTab /></StatsErrorBoundary>}
      {activeTab === 'wods' && <StatsErrorBoundary tabName="WODs"><WODsTab /></StatsErrorBoundary>}
      {activeTab === 'stations' && <StatsErrorBoundary tabName="Stations"><StationsTab /></StatsErrorBoundary>}
      {activeTab === 'voies' && <StatsErrorBoundary tabName="Voies"><VoiesTab /></StatsErrorBoundary>}
      {activeTab === 'seances_muscu' && <StatsErrorBoundary tabName="Séances"><SeancesMuscuTab /></StatsErrorBoundary>}
      {activeTab === 'muscles' && <StatsErrorBoundary tabName="Muscles"><MusclesTab /></StatsErrorBoundary>}
      {activeTab === 'progression' && <StatsErrorBoundary tabName="Progression"><ProgressionTab /></StatsErrorBoundary>}

      {/* Search Bar + Filtres · masqués en mode Sparring */}
      {(activeTab === 'records' || activeTab === 'techniques') && (
        <>
          <View style={[styles.searchContainer, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}>
            <View style={[styles.searchBar, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Search size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.textPrimary }]}
                placeholder={t('journal.searchExercise')}
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                maxLength={100}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* TASK 2: Global Filters - Force renamed to Musculation */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={[styles.globalFilterScroll, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}
            contentContainerStyle={styles.globalFilterContent}
          >
            {[
              { key: 'all' as GlobalFilter, label: t('journal.all'), iconName: 'bar-chart', color: colors.accent, textOnColor: '#FFFFFF' },
              { key: 'musculation' as GlobalFilter, label: t('journal.weightTraining'), iconName: 'dumbbell', color: '#EF4444', textOnColor: '#FFFFFF' },
              { key: 'running' as GlobalFilter, label: t('journal.running'), iconName: 'footprints', color: '#3B82F6', textOnColor: '#FFFFFF' },
              { key: 'jjb' as GlobalFilter, label: t('journal.jjb'), iconName: 'swords', color: '#06B6D4', textOnColor: '#FFFFFF' },
              { key: 'boxe' as GlobalFilter, label: t('journal.boxing'), iconName: 'zap', color: '#F59E0B', textOnColor: '#FFFFFF' },
              { key: 'lutte' as GlobalFilter, label: t('journal.wrestling'), iconName: 'users', color: '#8B5CF6', textOnColor: '#FFFFFF' },
              { key: 'grappling' as GlobalFilter, label: t('journal.grappling'), iconName: 'shield', color: '#10B981', textOnColor: '#FFFFFF' },
              { key: 'autre' as GlobalFilter, label: t('journal.other'), iconName: 'target', color: '#6B7280', textOnColor: '#FFFFFF' },
            ].map(filter => {
              const isSelected = globalFilter === filter.key;
              return (
                <TouchableOpacity
                  key={filter.key}
                  style={[
                    styles.globalFilterChip,
                    {
                      backgroundColor: isSelected ? filter.color : colors.backgroundCard,
                      borderColor: isSelected ? filter.color : colors.border,
                    }
                  ]}
                  onPress={() => {
                    impactAsync(ImpactFeedbackStyle.Light);
                    setGlobalFilter(filter.key);
                  }}
                >
                  {renderIcon(filter.iconName, 16, isSelected ? filter.textOnColor : filter.color)}
                  <Text style={[
                    styles.globalFilterText,
                    { color: isSelected ? filter.textOnColor : filter.color }
                  ]}>
                    {filter.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </>
      )}

      {/* Légende des icônes · visible uniquement sur l'onglet Records */}
      {activeTab === 'records' && (
        <View style={[styles.legendRow, { backgroundColor: isDark ? colors.background : '#FFFFFF', borderBottomColor: colors.border }]}>
          <View style={styles.legendItem}>
            <TrendingUp size={12} color="#10B981" strokeWidth={2.5} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('journal.progression')}</Text>
          </View>
          <View style={styles.legendItem}>
            <TrendingUp size={12} color="#EF4444" strokeWidth={2.5} style={{ transform: [{ scaleY: -1 }] }} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('journal.regression')}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendPRBadge, { backgroundColor: '#EF4444' }]}>
              <Text style={[styles.legendPRText, { color: colors.textOnAccent }]}>PR</Text>
            </View>
            <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('journal.personalRecord')}</Text>
          </View>
          <View style={styles.legendItem}>
            <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('journal.swipe')}</Text>
            <Trash2 size={11} color={colors.textMuted} />
            <Text style={[styles.legendText, { color: colors.textMuted }]}>{t('journal.delete_short')}</Text>
          </View>
        </View>
      )}

      {(activeTab === 'records' || activeTab === 'techniques') && <ScrollView
        style={[styles.content, { backgroundColor: isDark ? colors.background : '#FFFFFF' }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} colors={[colors.accent]} />
        }
      >
        {/* Stats Summary · chiffres animés count-up pour effet premium */}
        <View style={[styles.statsRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <AnimatedCounter
              value={stats.totalPRs}
              style={[styles.statValue, { color: '#EF4444' }]}
            />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('journal.records')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <AnimatedCounter
              value={stats.skillsMastered}
              style={[styles.statValue, { color: '#10B981' }]}
            />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('journal.mastered')}</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <AnimatedCounter
              value={stats.totalDrills}
              style={[styles.statValue, { color: '#F59E0B' }]}
            />
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>{t('journal.repsCount')}</Text>
          </View>
        </View>

        {/* SECTION: MES RECORDS */}
        {activeTab === 'records' && (
          <View>
            {/* ── DASHBOARD STATS RECORDS ── */}
            {benchmarksWithEntries.length > 0 && (
              <View style={{
                backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
                borderRadius: 16, padding: 14, marginHorizontal: 12, marginBottom: 10,
                borderWidth: 1, borderColor: colors.border,
              }}>
                {/* 4 mini-stats en grille 2×2 */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#EF444415', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#EF4444' }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#EF4444', letterSpacing: 0.4, marginBottom: 2 }}>RECORDS</Text>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#EF4444', letterSpacing: -0.5 }}>{stats.totalPRs}</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>
                      sur {stats.totalBenchmarks} exercices
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#3B82F615', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#3B82F6' }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#3B82F6', letterSpacing: 0.4, marginBottom: 2 }}>CATÉGORIES</Text>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#3B82F6', letterSpacing: -0.5 }}>{recordsStats.categories}</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>
                      types de records
                    </Text>
                  </View>
                  <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#22C55E15', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#22C55E' }}>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#22C55E', letterSpacing: 0.4, marginBottom: 2 }}>CE MOIS</Text>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: '#22C55E', letterSpacing: -0.5 }}>{recordsStats.recentMonth}</Text>
                    <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>
                      PR battus
                    </Text>
                  </View>
                  {recordsStats.mostActive && (
                    <View style={{ flex: 1, minWidth: '45%', backgroundColor: '#A855F715', borderRadius: 10, padding: 10, borderLeftWidth: 3, borderLeftColor: '#A855F7' }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#A855F7', letterSpacing: 0.4, marginBottom: 2 }}>+ ACTIF</Text>
                      <Text style={{ fontSize: 13, fontWeight: '900', color: '#A855F7', letterSpacing: -0.3 }} numberOfLines={1}>
                        {recordsStats.mostActive.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 2, fontWeight: '600' }}>
                        {recordsStats.mostActive.entries} entrées
                      </Text>
                    </View>
                  )}
                </View>
                {/* Dernier PR mis en avant */}
                {recordsStats.lastPR && (
                  <View style={{
                    marginTop: 10,
                    backgroundColor: recordsStats.lastPR.color + '12',
                    borderRadius: 10, padding: 10,
                    flexDirection: 'row', alignItems: 'center', gap: 10,
                  }}>
                    <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: recordsStats.lastPR.color + '25', alignItems: 'center', justifyContent: 'center' }}>
                      <TrophyIcon size={18} color={recordsStats.lastPR.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: recordsStats.lastPR.color, letterSpacing: 0.4 }}>DERNIER PR</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 1 }} numberOfLines={1}>
                        {recordsStats.lastPR.name} · {recordsStats.lastPR.value} {recordsStats.lastPR.unit}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                      {(() => {
                        try {
                          const days = Math.floor((Date.now() - new Date(recordsStats.lastPR.date).getTime()) / 86400000);
                          if (days === 0) return "aujourd'hui";
                          if (days === 1) return 'hier';
                          if (days < 7) return `il y a ${days}j`;
                          if (days < 30) return `il y a ${Math.floor(days / 7)}sem`;
                          return `il y a ${Math.floor(days / 30)} mois`;
                        } catch { return ''; }
                      })()}
                    </Text>
                  </View>
                )}
              </View>
            )}

            <View style={[styles.sectionHeader, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
              <View style={styles.sectionTitleRow}>
                <Dumbbell size={20} color="#EF4444" />
                <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>{t('journal.myRecords')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.addSectionBtn, { backgroundColor: '#EF444420' }]}
                onPress={() => setIsSportPickerVisible(true)}
              >
                <Plus size={16} color="#EF4444" strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {filteredBenchmarks.length === 0 ? (
              searchQuery.trim() !== '' ? (
                <View style={[styles.emptyCompactCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <Search size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyCompactText, { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 8 }]}>
                    {t('journal.noResults')}
                  </Text>
                  <Text style={[styles.emptyCompactText, { color: colors.textMuted, fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }]}>
                    {t('journal.noRecordFound')} "{searchQuery}"
                  </Text>
                </View>
              ) : (
              <TouchableOpacity
                style={[styles.emptyCompactCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={() => {
                  impactAsync(ImpactFeedbackStyle.Medium);
                  setIsSportPickerVisible(true);
                }}
              >
                <TrendingUp size={32} color={colors.textMuted} />
                <Text style={[styles.emptyCompactText, { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 8 }]}>
                  {t('journal.noRecordYet')}
                </Text>
                <Text style={[styles.emptyCompactText, { color: colors.textMuted, fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }]}>
                  {t('journal.recordYourPersonalRecords')}
                </Text>
                <View style={[styles.emptyActionButton, { backgroundColor: colors.accent, marginTop: 12 }]}>
                  <Plus size={18} color={colors.textOnAccent || '#FFFFFF'} strokeWidth={2.5} />
                  <Text style={{ color: colors.textOnAccent || '#FFFFFF', fontWeight: '600', marginLeft: 6 }}>
                    Ajouter mon premier record
                  </Text>
                </View>
              </TouchableOpacity>
              )
            ) : (
              (['Force', 'Musculation', 'Street Workout', 'Cardio Appareils', 'Running', 'Trail', 'Hyrox', 'Autre']
                .filter(cat => groupedBenchmarks[cat])
                .concat(Object.keys(groupedBenchmarks).filter(cat => !['Force', 'Musculation', 'Street Workout', 'Cardio Appareils', 'Running', 'Trail', 'Hyrox', 'Autre'].includes(cat)))
              ).map((categoryName) => {
                // Get the color from the first benchmark in this category
                const firstBenchmark = Object.values(groupedBenchmarks[categoryName])[0]?.[0];
                const categoryColor = firstBenchmark?.color || BENCHMARK_CATEGORIES[firstBenchmark?.category]?.color || '#EF4444';

                return (
                <View key={categoryName} style={{ marginBottom: 24 }}>
                  {/* CATEGORY HEADER (e.g. MUSCULATION, RUNNING) */}
                  <View style={[styles.mainCategoryHeader, { backgroundColor: colors.backgroundCard }]}>
                    <Text style={[styles.mainCategoryText, { color: categoryColor }]}>{categoryName}</Text>
                  </View>

                  {Object.keys(groupedBenchmarks[categoryName]).map((muscleGroup) => (
                    <View key={muscleGroup} style={{ marginTop: 12 }}>
                      {/* SUB HEADER (e.g. PECTORAUX, DOS) - only if it's Musculation or has a muscle group */}
                      {muscleGroup !== 'GÉNÉRAL' && (
                        <View style={{ backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF', borderRadius: 8, paddingVertical: 6, paddingHorizontal: 10, alignSelf: 'flex-start', marginBottom: 8 }}>
                          <Text style={[styles.categoryHeader, { color: colors.textMuted, marginLeft: 0, marginBottom: 0 }]}>{muscleGroup}</Text>
                        </View>
                      )}
                      
                      <View style={styles.compactCardsList}>
                        {groupedBenchmarks[categoryName][muscleGroup].map(b => (
                          <SwipeableCard key={b.id} onDelete={() => handleDeleteBenchmark(b.id)}>
                            {renderCompactBenchmarkCard(b)}
                          </SwipeableCard>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              );
              })
            )}
          </View>
        )}

        {/* SECTION: MES TECHNIQUES */}
        {activeTab === 'techniques' && (
          <>
            {/* ── DASHBOARD STATS TECHNIQUES ── */}
            {skillsStats.total > 0 && (
              <View style={{
                backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
                borderRadius: 16, padding: 14, marginHorizontal: 12, marginBottom: 10,
                borderWidth: 1, borderColor: colors.border,
              }}>
                {/* Header avec progress bar de mastery */}
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12, gap: 10 }}>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 11, fontWeight: '800', color: colors.textMuted, letterSpacing: 0.4 }}>PROGRESSION DE MAÎTRISE</Text>
                    <Text style={{ fontSize: 22, fontWeight: '900', color: colors.textPrimary, marginTop: 2, letterSpacing: -0.5 }}>
                      {skillsStats.masteryPct}%
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                      {skillsStats.mastered}/{skillsStats.total} techniques
                    </Text>
                    <Text style={{ fontSize: 9, color: colors.textMuted, marginTop: 2 }}>
                      {stats.totalDrills} drills cumulés
                    </Text>
                  </View>
                </View>
                {/* Barre stacked mastered/in_progress/to_learn */}
                <View style={{ flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden', backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)', marginBottom: 12 }}>
                  <View style={{ width: `${(skillsStats.mastered / skillsStats.total) * 100}%`, backgroundColor: '#22C55E' }} />
                  <View style={{ width: `${(skillsStats.inProgress / skillsStats.total) * 100}%`, backgroundColor: '#F59E0B' }} />
                  <View style={{ width: `${(skillsStats.toLearn / skillsStats.total) * 100}%`, backgroundColor: '#94A3B8' }} />
                </View>

                {/* 3 chiffres clés */}
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                  <View style={{ flex: 1, backgroundColor: '#22C55E15', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#22C55E', letterSpacing: -0.3 }}>{skillsStats.mastered}</Text>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#22C55E', letterSpacing: 0.4, marginTop: 2 }}>MAÎTRISÉES</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#F59E0B15', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#F59E0B', letterSpacing: -0.3 }}>{skillsStats.inProgress}</Text>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#F59E0B', letterSpacing: 0.4, marginTop: 2 }}>EN COURS</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: '#94A3B815', borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '900', color: '#64748B', letterSpacing: -0.3 }}>{skillsStats.toLearn}</Text>
                    <Text style={{ fontSize: 9, fontWeight: '800', color: '#64748B', letterSpacing: 0.4, marginTop: 2 }}>À APPRENDRE</Text>
                  </View>
                </View>

                {/* Suggestion : technique à drill */}
                {skillsStats.suggestion && (
                  <View style={{ backgroundColor: '#A855F715', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: skillsStats.recentMastered ? 8 : 0 }}>
                    <Lightbulb size={20} color="#A855F7" fill="#A855F722" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#A855F7', letterSpacing: 0.4 }}>SUGGESTION DU JOUR</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 1 }} numberOfLines={1}>
                        Drill {skillsStats.suggestion.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>
                        Seulement {skillsStats.suggestion.drillCount || 0} reps · pousse-la vers Mastered
                      </Text>
                    </View>
                  </View>
                )}

                {/* Recent mastered */}
                {skillsStats.recentMastered && (
                  <View style={{ backgroundColor: '#22C55E15', borderRadius: 10, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <TrophyIcon size={20} color="#22C55E" fill="#22C55E22" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 9, fontWeight: '800', color: '#22C55E', letterSpacing: 0.4 }}>DERNIÈRE MAÎTRISÉE</Text>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginTop: 1 }} numberOfLines={1}>
                        {skillsStats.recentMastered.name}
                      </Text>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>
                        {skillsStats.recentMastered.drillCount || 0} drills pour la valider
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            <View style={[styles.sectionHeader, { backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF' }]}>
              <View style={styles.sectionTitleRow}>
                <BookOpen size={20} color="#8B5CF6" />
                <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>{t('journal.mySkills')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.addSectionBtn, { backgroundColor: '#8B5CF620' }]}
                onPress={() => {
                  if (isModalProcessing) return;
                  executeModalOnce(async () => setShowAddSkillModal(true));
                }}
                disabled={isModalProcessing}
              >
                <Plus size={16} color="#8B5CF6" strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {/* Skills Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  { backgroundColor: selectedSkillFilter === 'all' ? '#8B5CF6' : colors.backgroundCard, borderColor: colors.border }
                ]}
                onPress={() => setSelectedSkillFilter('all')}
              >
                <Text style={[styles.filterChipText, { color: selectedSkillFilter === 'all' ? '#FFFFFF' : colors.textPrimary }]}>
                  Toutes ({skills.length})
                </Text>
              </TouchableOpacity>
              {(Object.keys(SKILL_STATUS_CONFIG) as SkillStatus[]).map(status => {
                const config = SKILL_STATUS_CONFIG[status];
                const count = skills.filter(s => s.status === status).length;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.filterChip,
                      { backgroundColor: selectedSkillFilter === status ? config.color : colors.backgroundCard, borderColor: colors.border }
                    ]}
                    onPress={() => setSelectedSkillFilter(status)}
                  >
                    <Text style={[styles.filterChipText, { color: selectedSkillFilter === status ? '#FFFFFF' : colors.textPrimary }]}>
                      {config.label} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Skills List */}
            <View style={styles.skillsList}>
              {filteredSkills.map(renderSkillCard)}
              {filteredSkills.length === 0 && searchQuery.trim() === '' && (
                <TouchableOpacity
                  style={[styles.emptySkills, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                  onPress={() => {
                    if (isModalProcessing) return;
                    executeModalOnce(async () => {
                      impactAsync(ImpactFeedbackStyle.Medium);
                      setShowAddSkillModal(true);
                    });
                  }}
                  disabled={isModalProcessing}
                >
                  <Target size={48} color={colors.textMuted} />
                  <Text style={[styles.emptySkillsTitle, { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 8 }]}>
                    {t('journal.noSkillYet')}
                  </Text>
                  <Text style={[styles.emptySkillsText, { color: colors.textMuted, fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }]}>
                    {t('journal.addSkillsToTrack')}
                  </Text>
                  <View style={[styles.emptyActionButton, { backgroundColor: '#8B5CF6', marginTop: 12 }]}>
                    <Plus size={18} color={colors.textOnAccent} strokeWidth={2.5} />
                    <Text style={{ color: colors.textOnAccent, fontWeight: '600', marginLeft: 6 }}>
                      {t('journal.addMyFirstSkill')}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              {/* TASK 2: Create custom skill when search has no results */}
              {filteredSkills.length === 0 && searchQuery.trim() !== '' && (
                <TouchableOpacity
                  style={[styles.createCustomSkillCard, { backgroundColor: colors.backgroundCard, borderColor: '#8B5CF6' }]}
                  onPress={() => {
                    if (isModalProcessing) return;
                    executeModalOnce(async () => {
                      impactAsync(ImpactFeedbackStyle.Medium);
                      setNewSkillName(searchQuery.trim());
                      setSearchQuery('');
                      setShowAddSkillModal(true);
                    });
                  }}
                  disabled={isModalProcessing}
                >
                  <View style={[styles.createCustomIcon, { backgroundColor: '#8B5CF620' }]}>
                    <Plus size={28} color="#8B5CF6" strokeWidth={2} />
                  </View>
                  <View style={styles.createCustomSkillInfo}>
                    <Text style={[styles.createCustomText, { color: colors.textPrimary }]}>
                      Créer "{searchQuery.trim()}"
                    </Text>
                    <Text style={[styles.createCustomSubtext, { color: colors.textMuted }]}>
                      Nouvelle technique
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        {/* Bouton "Partager mes stats carnet" · carte Instagram-ready */}
        {(stats.totalPRs > 0 || stats.skillsMastered > 0) && (
          <ShareStatsButton
            title="Mon carnet Yoroi"
            stats={[
              { label: 'Records', value: String(stats.totalPRs), color: '#EF4444' },
              { label: 'Maîtrisées', value: String(stats.skillsMastered), color: '#10B981' },
              { label: 'Reps', value: String(stats.totalDrills), color: '#F59E0B' },
              { label: 'Total skills', value: String(skills.length), color: '#8B5CF6' },
            ]}
            tagline="Progression continue"
            accentColor="#EF4444"
          />
        )}

        <View style={{ height: 120 }} />
      </ScrollView>}

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: isDark ? colors.accent : colors.backgroundCard }]}
        onPress={() => {
          if (isModalProcessing) return;
          executeModalOnce(async () => {
            impactAsync(ImpactFeedbackStyle.Medium);
            setShowFabMenu(true);
          });
        }}
        activeOpacity={0.8}
        disabled={isModalProcessing}
      >
        <Plus size={28} color={isDark ? colors.textOnGold : colors.accent} strokeWidth={2.5} />
      </TouchableOpacity>

      {/* Modals */}
      {renderFabMenu()}

      <AddBenchmarkModal
        visible={showAddBenchmarkModal}
        onClose={() => setShowAddBenchmarkModal(false)}
        colors={colors}
        isSubmitting={isSubmitting}
        newBenchmarkName={newBenchmarkName}
        setNewBenchmarkName={setNewBenchmarkName}
        newBenchmarkCategory={newBenchmarkCategory}
        setNewBenchmarkCategory={setNewBenchmarkCategory}
        newBenchmarkUnit={newBenchmarkUnit}
        setNewBenchmarkUnit={setNewBenchmarkUnit}
        onSubmit={handleAddBenchmark}
      />

      <AddSkillModal
        visible={showAddSkillModal}
        onClose={() => setShowAddSkillModal(false)}
        colors={colors}
        isSubmitting={isSubmitting}
        newSkillName={newSkillName}
        setNewSkillName={setNewSkillName}
        newSkillCategory={newSkillCategory}
        setNewSkillCategory={setNewSkillCategory}
        newSkillStatus={newSkillStatus}
        setNewSkillStatus={setNewSkillStatus}
        newSkillNotes={newSkillNotes}
        setNewSkillNotes={setNewSkillNotes}
        newSkillVideoUri={newSkillVideoUri}
        setNewSkillVideoUri={setNewSkillVideoUri}
        onSubmit={handleAddSkill}
        onRecordVideo={recordSkillVideo}
        onPickVideo={pickSkillVideo}
      />

      <AddEntryModal
        visible={showAddEntryModal}
        onClose={resetModalState}
        onSubmit={handleAddEntry}
        isSubmitting={isSubmitting}
        selectedBenchmark={selectedBenchmark}
        colors={colors}
        locale={locale}
        userWeight={userWeight}
        entryDate={entryDate}
        setEntryDate={setEntryDate}
        customDate={customDate}
        setCustomDate={setCustomDate}
        showDatePicker={showDatePicker}
        setShowDatePicker={setShowDatePicker}
        newEntryValue={newEntryValue}
        setNewEntryValue={setNewEntryValue}
        newEntryReps={newEntryReps}
        setNewEntryReps={setNewEntryReps}
        newEntryUnit={newEntryUnit}
        setNewEntryUnit={setNewEntryUnit}
        newEntryRPE={newEntryRPE}
        setNewEntryRPE={setNewEntryRPE}
        newEntryDuration={newEntryDuration}
        setNewEntryDuration={setNewEntryDuration}
        newEntryCalories={newEntryCalories}
        setNewEntryCalories={setNewEntryCalories}
        newEntryDistance={newEntryDistance}
        setNewEntryDistance={setNewEntryDistance}
        runningTimeHours={runningTimeHours}
        setRunningTimeHours={setRunningTimeHours}
        runningTimeMinutes={runningTimeMinutes}
        setRunningTimeMinutes={setRunningTimeMinutes}
        runningTimeSeconds={runningTimeSeconds}
        setRunningTimeSeconds={setRunningTimeSeconds}
        hyroxEffortType={hyroxEffortType}
        setHyroxEffortType={setHyroxEffortType}
        hyroxDistanceMeters={hyroxDistanceMeters}
        setHyroxDistanceMeters={setHyroxDistanceMeters}
        newEntryIncline={newEntryIncline}
        setNewEntryIncline={setNewEntryIncline}
        newEntrySpeed={newEntrySpeed}
        setNewEntrySpeed={setNewEntrySpeed}
        newEntryPace={newEntryPace}
        setNewEntryPace={setNewEntryPace}
        newEntryWatts={newEntryWatts}
        setNewEntryWatts={setNewEntryWatts}
        newEntryResistance={newEntryResistance}
        setNewEntryResistance={setNewEntryResistance}
        newEntryLevel={newEntryLevel}
        setNewEntryLevel={setNewEntryLevel}
      />

      <BenchmarkDetailModal
        visible={showBenchmarkDetail}
        onClose={() => setShowBenchmarkDetail(false)}
        benchmark={selectedBenchmark}
        colors={colors}
        locale={locale}
        onAddEntry={() => setShowAddEntryModal(true)}
        onDelete={handleDeleteBenchmark}
      />

      <SkillDetailModal
        visible={showSkillDetail}
        onClose={() => setShowSkillDetail(false)}
        skill={selectedSkill}
        colors={colors}
        locale={locale}
        isSubmitting={isSubmitting}
        drillIncrement={drillIncrement}
        setDrillIncrement={setDrillIncrement}
        onIncrementDrill={handleIncrementDrill}
        newNoteText={newNoteText}
        setNewNoteText={setNewNoteText}
        onAddNote={handleAddNote}
        editingVideoUrl={editingVideoUrl}
        setEditingVideoUrl={setEditingVideoUrl}
        onUpdateVideoUrl={handleUpdateVideoUrl}
        onOpenVideoUrl={openVideoUrl}
        onUpdateStatus={handleUpdateSkillStatus}
        onDelete={handleDeleteSkill}
        onRefreshSkill={setSelectedSkill}
      />

      <TrashModal
        visible={showTrashModal}
        onClose={() => setShowTrashModal(false)}
        colors={colors}
        insets={insets}
        trashBenchmarks={trashBenchmarks}
        trashSkills={trashSkills}
        trashCount={trashCount}
        onRestoreBenchmark={handleRestoreBenchmark}
        onRestoreSkill={handleRestoreSkill}
        onEmptyTrash={handleEmptyTrash}
      />

      {/* Célébration RP : confetti + animations juste après un nouveau record */}
      {prCelebrationData && (
        <Celebration
          visible={showPRCelebration}
          type="new_pr"
          title={prCelebrationData.title}
          subtitle={prCelebrationData.subtitle}
          autoClose
          autoCloseDelay={2000}
          onClose={() => {
            setShowPRCelebration(false);
            setPRCelebrationData(null);
          }}
        />
      )}

      {/* PILLAR 3: Victory Share Modal (Strava-Style) */}
      {victorySessionData && (
        <VictoryShareModal
          visible={showVictoryModal}
          onClose={() => {
            setShowVictoryModal(false);
            setVictorySessionData(null);
          }}
          sessionData={victorySessionData}
          clubName={clubName}
        />
      )}

      {/* Toast Notification - NO EMOJI, use Lucide Check icon */}
      {toastVisible && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: '#10B981',
              opacity: toastOpacity,
              bottom: insets.bottom + 100,
            }
          ]}
        >
          <Check size={18} color={colors.textOnAccent} strokeWidth={3} />
          <Text style={[styles.toastText, { color: colors.textOnAccent }]}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* SPORT PICKER MODAL - Etape 1 */}
      <Modal visible={isSportPickerVisible} animationType="slide" transparent={true}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, height: '75%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('journal.chooseSport')}</Text>
              <TouchableOpacity onPress={() => setIsSportPickerVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {([
                { name: 'Musculation',    label: t('journal.musculation'),     icon: 'dumbbell', color: '#EF4444', hasMuscleGroups: true,  groups: ['Pectoraux','Dos','Epaules','Bras','Jambes','Abdos','Machines'] },
                { name: 'Hyrox',          label: t('journal.hyrox'),           icon: 'flame',    color: '#D97706', hasMuscleGroups: false, groups: ['Hyrox'] },
                { name: 'CrossFit',       label: t('journal.crossfit'),        icon: 'flame',    color: '#F59E0B', hasMuscleGroups: false, groups: ['CrossFit'] },
                { name: 'Running',        label: t('journal.running'),         icon: 'timer',    color: '#3B82F6', hasMuscleGroups: false, groups: ['Running'] },
                { name: 'Cardio',         label: t('journal.cardioMachines'),icon: 'timer',    color: '#06B6D4', hasMuscleGroups: false, groups: ['Cardio'] },
                { name: 'Combat',         label: t('journal.combat_mma'),    icon: 'swords',   color: '#8B5CF6', hasMuscleGroups: false, groups: ['Combat'] },
                { name: 'Strongman',      label: t('journal.strongman'),       icon: 'dumbbell', color: '#B91C1C', hasMuscleGroups: false, groups: ['Strongman'] },
                { name: 'Olympique',      label: t('journal.weightlifting'),   icon: 'dumbbell', color: '#DC2626', hasMuscleGroups: false, groups: ['Olympique'] },
                { name: 'Street Workout', label: t('journal.streetWorkout'),  icon: 'dumbbell', color: '#F59E0B', hasMuscleGroups: false, groups: ['Street Workout'] },
              ] as const).map((sport) => {
                const IconComponent = sport.icon === 'flame' ? Flame : sport.icon === 'timer' ? Timer : sport.icon === 'swords' ? Swords : Dumbbell;
                const exCount = WATCH_EXERCISE_TEMPLATES.filter(t =>
                  (sport.groups as readonly string[]).some(g => t.muscleGroup?.toLowerCase() === g.toLowerCase())
                ).length;
                return (
                  <TouchableOpacity
                    key={sport.name}
                    style={[styles.muscleItem, { backgroundColor: colors.backgroundCard }]}
                    onPress={() => {
                      setSelectedSport(sport.name);
                      setIsSportPickerVisible(false);
                      if (sport.hasMuscleGroups) {
                        setIsMusclePickerVisible(true);
                      } else {
                        setSelectedMuscleGroup(sport.name);
                        setIsExercisePickerVisible(true);
                      }
                    }}
                  >
                    <View style={[styles.muscleIcon, { backgroundColor: sport.color + '20' }]}>
                      <IconComponent size={20} color={sport.color} />
                    </View>
                    <Text style={[styles.muscleText, { color: colors.textPrimary, flex: 1 }]}>{sport.label}</Text>
                    {exCount > 0 && (
                      <View style={[styles.exCountBadge, { backgroundColor: sport.color + '18' }]}>
                        <Text style={[styles.exCountText, { color: sport.color }]}>{exCount}</Text>
                      </View>
                    )}
                    <ChevronRight size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* MUSCLE PICKER MODAL - Etape 2 (Musculation uniquement) */}
      <Modal
        visible={isMusclePickerVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, height: '70%' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => { setIsMusclePickerVisible(false); setIsSportPickerVisible(true); }} style={{ padding: 4 }}>
                <ChevronLeft size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{t('journal.muscleGroup')}</Text>
              <TouchableOpacity onPress={() => setIsMusclePickerVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {([
                { name: t('journal.chest'), icon: 'dumbbell', color: '#EF4444', group: 'Pectoraux' },
                { name: t('journal.back'), icon: 'dumbbell', color: '#3B82F6', group: 'Dos' },
                { name: t('journal.shoulders'), icon: 'dumbbell', color: '#F59E0B', group: 'Epaules' },
                { name: t('journal.arms'), icon: 'dumbbell', color: '#EC4899', group: 'Bras' },
                { name: t('journal.legs'), icon: 'dumbbell', color: '#10B981', group: 'Jambes' },
                { name: t('journal.abs'), icon: 'dumbbell', color: '#8B5CF6', group: 'Abdos' },
                { name: t('journal.machines'), icon: 'dumbbell', color: '#6B7280', group: 'Machines' },
                { name: 'HALTÉROPHILIE', icon: 'dumbbell', color: '#DC2626', group: 'Olympique' },
              ] as const).map((muscle) => {
                return (
                  <TouchableOpacity
                    key={muscle.name}
                    style={[styles.muscleItem, { backgroundColor: colors.backgroundCard }]}
                    onPress={() => {
                      setSelectedMuscleGroup(muscle.group);
                      setIsMusclePickerVisible(false);
                      setIsExercisePickerVisible(true);
                    }}
                  >
                    <View style={[styles.muscleIcon, { backgroundColor: muscle.color + '20' }]}>
                      <Dumbbell size={20} color={muscle.color} />
                    </View>
                    <Text style={[styles.muscleText, { color: colors.textPrimary }]}>{muscle.name}</Text>
                    <ChevronRight size={20} color={colors.textMuted} />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EXERCISE PICKER MODAL - Etape 3 */}
      <Modal
        visible={isExercisePickerVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => {
                  setIsExercisePickerVisible(false);
                  if (selectedSport === 'Musculation') {
                    setIsMusclePickerVisible(true);
                  } else {
                    setIsSportPickerVisible(true);
                  }
                }}
                style={{ padding: 4 }}
              >
                <ChevronLeft size={24} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedMuscleGroup?.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setIsExercisePickerVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {(() => {
                const list = selectedMuscleGroup
                  ? WATCH_EXERCISE_TEMPLATES.filter(t =>
                      t.muscleGroup?.toLowerCase() === selectedMuscleGroup.toLowerCase()
                    )
                  : [];

                return list.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={[styles.exerciseItem, { backgroundColor: colors.backgroundCard }]}
                    onPress={() => handleQuickAddRecord(t.name, t.category, t.unit)}
                  >
                    <Text style={[styles.exerciseText, { color: colors.textPrimary }]}>{t.name}</Text>
                    <Plus size={20} color={colors.accent} />
                  </TouchableOpacity>
                ));
              })()}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <PopupComponent />
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  // Tab styles · identique Planning/Stats
  tabContainer: {
    paddingTop: 10,
    paddingBottom: 10,
    position: 'relative',
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 24,
    paddingLeft: 20,
    paddingRight: 20, // corbeille déplacée dans le SportPackSwitcher row
  },
  trashIconBtn: {
    position: 'absolute',
    top: 14,
    right: 12,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trashBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#EF4444',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  trashBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#FFF',
  },
  circleTabWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  circleTab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  circleBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  circleBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#111827',
  },
  circleTabLabel: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  // Anciens styles conservés pour compatibilité
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '700',
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    padding: 0,
  },

  // TASK 1: Global Filter Styles
  globalFilterScroll: {
    maxHeight: 50,
    marginBottom: 4,
  },
  globalFilterContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  globalFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  globalFilterText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Toast Styles (NO EMOJI - uses Lucide Check icon)
  toast: {
    position: 'absolute',
    left: 20,
    right: 20,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 40,
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  addSectionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filters
  filterScroll: {
    marginBottom: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1,
    gap: 4,
  },
  filterChipIcon: {
    fontSize: 14,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Benchmarks
  benchmarksScroll: {
    marginBottom: 8,
  },
  benchmarkCard: {
    width: 140,
    padding: 14,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  benchmarkIconBg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  benchmarkIcon: {
    fontSize: 24,
  },
  benchmarkName: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  benchmarkPR: {
    fontSize: 20,
    fontWeight: '800',
  },
  benchmarkLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  // DATA RICH styles
  benchmarkDataRich: {
    alignItems: 'center',
    marginTop: 4,
  },
  benchmarkValue: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  benchmarkDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  benchmarkDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  prBadgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  quickAddBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyBenchmark: {
    width: 200,
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyBenchmarkText: {
    fontSize: 13,
    textAlign: 'center',
  },
  // TASK 2: Create custom item cards
  createCustomCard: {
    width: 160,
    padding: 16,
    borderRadius: 16,
    marginRight: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  createCustomSkillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderStyle: 'dashed',
    gap: 12,
  },
  createCustomIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  createCustomSkillInfo: {
    flex: 1,
  },
  createCustomText: {
    fontSize: 15,
    fontWeight: '700',
  },
  createCustomSubtext: {
    fontSize: 12,
    marginTop: 2,
  },

  // Skills
  skillsList: {
    gap: 10,
  },
  skillCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  skillLeft: {
    marginRight: 12,
  },
  skillIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skillIcon: {
    fontSize: 22,
  },
  skillCenter: {
    flex: 1,
  },
  skillName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 6,
  },
  skillMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  skillStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  skillStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  skillDrillCount: {
    fontSize: 12,
  },
  skillCategoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  skillCategoryText: {
    fontSize: 11,
    fontWeight: '700',
  },
  // NEW: Status Pill styles
  skillCategorySmall: {
    fontSize: 11,
    fontWeight: '600',
  },
  skillNotesIndicator: {
    marginLeft: 4,
  },
  skillVideoIndicator: {
    marginLeft: 4,
    padding: 4,
    borderRadius: 6,
  },

  // TASK 3: Video Picker Styles
  videoPickerRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
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
    borderWidth: 2,
  },
  videoPickerBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  videoPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
    marginBottom: 8,
  },
  videoPreviewIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
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

  skillStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    gap: 5,
  },
  skillStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  skillStatusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  emptySkills: {
    padding: 32,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  emptySkillsTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptySkillsText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: 100,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingBottom: 180,
  },
  fabMenuContainer: {
    gap: 12,
  },
  fabMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    gap: 10,
  },
  fabMenuText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Trash Modal
  trashItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  restoreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  trashFooter: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  emptyTrashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  emptyTrashText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 16,
  },
  textInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    borderWidth: 1,
  },
  valueInput: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  categoryScroll: {
    marginBottom: 8,
  },
  categoryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginRight: 10,
    borderWidth: 1,
    gap: 6,
  },
  categoryOptionIcon: {
    fontSize: 18,
  },
  categoryOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  unitRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  unitOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // TASK 2: Preset Chips for Running/Force
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 8,
  },
  presetChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
  },
  presetChipText: {
    fontSize: 14,
    fontWeight: '700',
  },

  // TASK 2: Unit Info Banner
  unitInfoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
    gap: 8,
  },
  unitInfoText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // TASK 3: Chrono Input for Running
  chronoInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 2,
    gap: 12,
  },
  chronoInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    paddingVertical: 12,
  },

  // TASK 1: Running Time Input Styles (H:M:S)
  timeInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginBottom: 12,
  },
  timeInputGroup: {
    alignItems: 'center',
  },
  timeInput: {
    width: 56,
    height: 56,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    borderRadius: 12,
    borderWidth: 1,
  },
  timeLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  timeSeparator: {
    fontSize: 24,
    fontWeight: '700',
    marginHorizontal: 2,
    marginBottom: 20,
  },
  paceDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    marginBottom: 16,
  },
  paceDisplayLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  paceDisplayValue: {
    fontSize: 18,
    fontWeight: '800',
  },

  // TASK 2: Hyrox Effort Type Styles
  hyroxTypeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  hyroxTypeBtn: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  hyroxTypeText: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },

  modalButton: {
    marginTop: 24,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },

  // Detail Modal
  detailModalOverlay: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    minHeight: 56,
  },
  detailHeaderBtn: {
    padding: 4,
    minWidth: 36,
    alignItems: 'center',
  },
  detailHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailCloseBtn: {
    padding: 4,
    marginLeft: 4,
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  detailContent: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 12,
    marginTop: 8,
  },

  // PR Card
  prCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    marginBottom: 16,
  },
  prCardIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  prCardInfo: {
    flex: 1,
  },
  prCardLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  prCardValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  prCardDate: {
    fontSize: 12,
    marginTop: 4,
  },
  prAddBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Chart
  chartCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  chartPlaceholder: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 80,
    gap: 8,
  },
  chartBarContainer: {
    flex: 1,
    height: '100%',
    justifyContent: 'flex-end',
  },
  chartBar: {
    width: '100%',
    borderRadius: 4,
    minHeight: 4,
  },

  // History
  historyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  historyLeft: {
    flex: 1,
  },
  historyValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  historyDate: {
    fontSize: 12,
    marginTop: 2,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },

  // Status Row
  statusRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statusOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 6,
  },
  statusOptionText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Drill Card
  drillCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  drillInfo: {
    alignItems: 'center',
    marginBottom: 16,
  },
  drillCount: {
    fontSize: 48,
    fontWeight: '800',
  },
  drillLabel: {
    fontSize: 14,
  },
  drillActions: {
    flexDirection: 'row',
    gap: 12,
  },
  drillInput: {
    width: 80,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  drillAddBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  drillAddText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },

  // Notes
  noteInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  noteInput: {
    flex: 1,
    fontSize: 15,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  noteAddBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  notesList: {
    gap: 10,
  },
  noteItem: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noteFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  noteDate: {
    fontSize: 11,
  },

  // TASK 2: Video Link Styles
  videoLinkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    gap: 10,
    marginBottom: 8,
  },
  videoLinkInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  videoSaveBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    gap: 8,
    marginBottom: 16,
  },
  watchVideoText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Modal Close Button
  modalCloseBtn: {
    padding: 4,
  },

  // RPE Slider
  rpeContainer: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  rpeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 16,
  },
  rpeValue: {
    fontSize: 32,
    fontWeight: '800',
  },
  rpeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  rpeSlider: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  rpeButton: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 32,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rpeButtonText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Date Picker
  datePickerRow: {
    flexDirection: 'row',
    gap: 10,
  },
  dateOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  dateOptionText: {
    fontSize: 13,
    fontWeight: '600',
  },
  datePickerContainer: {
    marginTop: 12,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    alignItems: 'center',
  },
  datePickerDoneBtn: {
    marginTop: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  datePickerDoneText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },

  // ============================================
  // COMPACT CARD STYLES - High density design
  // ============================================
  compactCardsList: {
    gap: 8,
    marginBottom: 8,
  },
  compactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    gap: 10,
  },
  compactCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactCardContent: {
    flex: 1,
    gap: 2,
  },
  compactCardName: {
    fontSize: 14,
    fontWeight: '600',
  },
  compactCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactCardValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  compactCardRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  compactCardDate: {
    fontSize: 11,
    fontWeight: '500',
  },
  compactCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  compactShareBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactAddBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactPRBadge: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  compactPRText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  // Légende icônes
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderBottomWidth: 1,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendText: {
    fontSize: 10,
    fontWeight: '500',
  },
  legendPRBadge: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 3,
  },
  legendPRText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  emptyCompactCard: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 4,
  },
  emptyCompactText: {
    fontSize: 13,
  },
  emptyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  createCompactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderStyle: 'dashed',
    gap: 10,
  },

  // ============================================
  // STATUS SELECTOR STYLES (Add Skill Modal)
  // ============================================
  statusSelectorRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
  },
  statusPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    gap: 4,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '600',
  },

  // ============================================
  // TEXT AREA INPUT (Notes field)
  // ============================================
  textAreaInput: {
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    borderWidth: 1,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // ============================================
  // UNIT TOGGLE STYLES (KG/LBS)
  // ============================================
  unitToggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  unitToggleBtn: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitToggleText: {
    fontSize: 16,
    fontWeight: '700',
  },

  // ============================================
  // REPS INPUT
  // ============================================
  repsInput: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    marginTop: 4,
    marginBottom: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // ============================================
  // PILLAR 1: CALORIES & METs STYLES
  // ============================================
  caloriesRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 12,
  },
  metsInfo: {
    paddingBottom: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  metsLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryHeader: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 8,
    marginTop: 5,
    textTransform: 'uppercase',
  },
  mainCategoryHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  mainCategoryText: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  // New Picker Styles
  muscleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  muscleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  muscleText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  exCountBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 6,
  },
  exCountText: {
    fontSize: 12,
    fontWeight: '700',
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 12,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  exerciseText: {
    fontSize: 15,
    fontWeight: '600',
  },
  installLibBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    marginTop: 12,
    borderStyle: 'dashed',
  },
  installLibText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
