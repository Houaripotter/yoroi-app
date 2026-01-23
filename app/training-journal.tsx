// ============================================
// CARNET D'ENTRAINEMENT - HYBRID DASHBOARD
// Mes Records (Benchmarks) + Mes Techniques (Skills)
// ============================================

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  Animated,
  Alert,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { safeOpenURL } from '@/lib/security/validators';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Trash2, Archive, CheckCircle, RotateCcw, Search, Filter, Plus, Target, ChevronRight, Share2, Info, Dumbbell, Activity, Timer,
  Mountain, Flame, Shield, Move, Lock, Users, Zap, Scale, Swords, BarChart3, Footprints, BookOpen, Award, FileText, Play, X, Clock, Check, ImageIcon, Calendar, Edit3, Gauge, ChevronLeft, Video, ExternalLink, TrendingUp, Camera
} from 'lucide-react-native';
import { useWatch } from '@/lib/WatchConnectivityProvider';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import {
  Benchmark,
  Skill,
  BenchmarkCategory,
  BenchmarkUnit,
  BenchmarkEntry,
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
  METS_VALUES,
  COMBAT_METS,
  getSkills,
  createSkill,
  updateSkillStatus,
  addSkillNote,
  incrementDrillCount,
  deleteSkill,
  deleteSkillNote,
  updateSkillVideoUrl,
  BENCHMARK_CATEGORIES,
  SKILL_CATEGORIES,
  SKILL_STATUS_CONFIG,
  getCarnetStats,
  getRPELabel,
  getRPEColor,
  cleanDemoData,
  getTrashBenchmarks,
  getTrashSkills,
  restoreBenchmark,
  restoreSkill,
  emptyTrash,
  getTrashCount,
  TrashItem,
} from '@/lib/carnetService';
import VictoryShareModal, { VictorySessionData, createVictoryData, createVictoryFromEntry } from '@/components/VictoryShareModal';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPendingVictory } from '@/lib/victoryTrigger';
import TrainingJournalOnboarding from '@/components/TrainingJournalOnboarding';
import { EXERCISE_LIBRARY } from '@/constants/exerciseLibrary';
// import { useTrainingJournal } from './training-journal/hooks/useTrainingJournal';
import { renderIcon } from './training-journal/utils/iconMap';
import { getRelativeDate } from './training-journal/utils/dateHelpers';
import AddEntryModal from './training-journal/components/AddEntryModal';
import BenchmarkDetailModal from './training-journal/components/BenchmarkDetailModal';
import SkillDetailModal from './training-journal/components/SkillDetailModal';
import TrashModal from './training-journal/components/TrashModal';
import AddBenchmarkModal from './training-journal/components/AddBenchmarkModal';
import AddSkillModal from './training-journal/components/AddSkillModal';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// MAIN COMPONENT
// ============================================

export default function TrainingJournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const { isWatchAvailable, syncRecords } = useWatch();
  const { showPopup, PopupComponent } = useCustomPopup();

  // TODO: Migrate to useTrainingJournal hook (WIP)
  // For now, keep local state management

  // Data state
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [selectedBenchmarkCategory, setSelectedBenchmarkCategory] = useState<BenchmarkCategory | 'all'>('all');
  const [selectedSkillFilter, setSelectedSkillFilter] = useState<SkillStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Tab state for Records/Techniques
  const [activeTab, setActiveTab] = useState<'records' | 'techniques'>('records');

  // New selection states for records (Mirroring Watch app)
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

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Computed stats from local data
  const stats = {
    totalBenchmarks: benchmarks.length,
    totalPRs: benchmarks.reduce((count, b) => count + (b.entries?.length || 0), 0),
    skillsMastered: skills.filter(s => s.status === 'mastered').length,
    totalDrills: skills.reduce((count, s) => count + (s.drillCount || 0), 0),
  };

  // Load user preferences
  useEffect(() => {
    const loadUserPrefs = async () => {
      try {
        const savedWeight = await AsyncStorage.getItem('yoroi_user_weight');
        const savedClub = await AsyncStorage.getItem('yoroi_club_name');
        if (savedWeight) setUserWeight(parseFloat(savedWeight));
        if (savedClub) setClubName(savedClub);
      } catch (e) {
        console.error('Error loading user prefs:', e);
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

  // Check if first time visiting training journal
  useEffect(() => {
    const checkFirstVisit = async () => {
      try {
        const hasSeenOnboarding = await AsyncStorage.getItem('yoroi_training_journal_onboarding_seen');
        if (!hasSeenOnboarding) {
          setShowOnboarding(true);
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error);
      }
    };
    checkFirstVisit();
  }, []);

  const handleCloseOnboarding = async () => {
    try {
      await AsyncStorage.setItem('yoroi_training_journal_onboarding_seen', 'true');
      setShowOnboarding(false);
    } catch (error) {
      console.error('Error saving onboarding status:', error);
      setShowOnboarding(false);
    }
  };

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
        title: result.removed > 0 ? 'Nettoyage réussi' : 'Déjà propre',
        message: result.message,
        type: result.removed > 0 ? 'success' : 'info',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    } catch (error) {
      console.error('Erreur nettoyage:', error);
    }
  };

  const handleInstallLibrary = async () => {
    try {
      setIsSubmitting(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Installer la bibliothèque massive
      for (const ex of EXERCISE_LIBRARY) {
        // Éviter les doublons
        const existing = benchmarks.find(b => b.name.toLowerCase() === ex.name.toLowerCase());
        if (!existing) {
          await createBenchmark(ex.name, ex.category as any, ex.unit as any, undefined, undefined, ex.muscle);
        }
      }

      await loadData();
      
      // 🔄 SYNC VERS LA MONTRE
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

      showToast('Bibliothèque complète installée !');
    } catch (error) {
      console.error('Error installing library:', error);
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
      console.error('Error loading trash:', error);
    }
  }, []);

  // Load data
  const loadData = useCallback(async () => {
    try {
      const [fetchedBenchmarks, fetchedSkills] = await Promise.all([
        getBenchmarks(),
        getSkills(),
      ]);
      
      // If no benchmarks, offer to initialize common ones
      if (fetchedBenchmarks.length === 0) {
        // We could call a helper here to create the 'Big 3' + Poids de Corps
      }

      setBenchmarks(fetchedBenchmarks);
      setSkills(fetchedSkills);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, []);


  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

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

  // Filter benchmarks (by global filter AND search query)
  const filteredBenchmarks = benchmarks.filter(b => {
    const matchesGlobal = matchesGlobalFilter(b.category, null);
    const matchesSearch = searchQuery.trim() === '' ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGlobal && matchesSearch;
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
      console.error('Error in quick add:', error);
    } finally {
      setIsQuickAdding(false);
    }
  };

  const handleAddBenchmark = async () => {
    // Protection anti-spam dès le début
    if (isSubmitting) return;

    if (!newBenchmarkName.trim()) {
      showPopup({
        title: 'Erreur',
        message: 'Entre un nom pour le suivi',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    setIsSubmitting(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const result = await createBenchmark(newBenchmarkName, newBenchmarkCategory, newBenchmarkUnit);
      if (result) {
        setShowAddBenchmarkModal(false);
        setNewBenchmarkName('');
        showToast('Enregistrement sauvegardé');
        loadData();
      }
    } catch (error) {
      console.error('Error adding benchmark:', error);
      showPopup({ title: 'Erreur', message: 'Impossible de créer le suivi', buttons: [{ text: 'OK', style: 'default' }] });
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
      console.error('Error saving video to permanent storage:', error);
      return null;
    }
  };

  const pickSkillVideo = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPopup({
        title: 'Permission refusee',
        message: 'Autorise l\'acces a la galerie pour ajouter une video.',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Copy to permanent storage
      const permanentUri = await saveVideoToPermanentStorage(result.assets[0].uri);
      if (permanentUri) {
        setNewSkillVideoUri(permanentUri);
      } else {
        showPopup({
          title: 'Erreur',
          message: 'Impossible de sauvegarder la video',
          buttons: [{ text: 'OK', style: 'default' }],
        });
      }
    }
  };

  const recordSkillVideo = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission refusee', 'Autorise l\'acces a la camera pour filmer.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsEditing: true,
      quality: 0.8,
      videoMaxDuration: 60, // Max 60 seconds
    });

    if (!result.canceled && result.assets[0]) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Copy to permanent storage
      const permanentUri = await saveVideoToPermanentStorage(result.assets[0].uri);
      if (permanentUri) {
        setNewSkillVideoUri(permanentUri);
      } else {
        showPopup('Erreur', 'Impossible de sauvegarder la video');
      }
    }
  };

  const handleAddSkill = async () => {
    if (isSubmitting) return; // Anti-spam protection
    if (!newSkillName.trim()) {
      showPopup('Erreur', 'Entre un nom pour la technique');
      return;
    }

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        showToast('Technique sauvegardée');
        loadData();
      }
    } catch (error) {
      console.error('Error adding skill:', error);
      showPopup({ title: 'Erreur', message: 'Impossible de créer la technique', buttons: [{ text: 'OK', style: 'default' }] });
    } finally {
      setIsSubmitting(false);
    }
  };

  // TASK 2: Handle video URL update
  const handleUpdateVideoUrl = async () => {
    if (!selectedSkill) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await updateSkillVideoUrl(selectedSkill.id, editingVideoUrl);
    showToast('Lien vidéo sauvegardé');
    // Refresh
    const updated = await getSkills();
    const refreshed = updated.find(s => s.id === selectedSkill.id);
    if (refreshed) setSelectedSkill(refreshed);
    loadData();
  };

  const openVideoUrl = (url: string) => {
    if (!url) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    safeOpenURL(url);
  };

  const handleAddEntry = async () => {
    if (isSubmitting) return; // Anti-spam protection
    if (!selectedBenchmark || !newEntryValue.trim()) return;

    // For Force exercises (kg/lbs), reps is mandatory
    const isForceExercise = selectedBenchmark.category === 'force' &&
      (selectedBenchmark.unit === 'kg' || selectedBenchmark.unit === 'lbs');

    if (isForceExercise && !newEntryReps.trim()) {
      showPopup('Erreur', 'Le nombre de repetitions est obligatoire');
      return;
    }

    try {
      setIsSubmitting(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    let value: number;

    if (selectedBenchmark.unit === 'time') {
      value = parseTimeToSeconds(newEntryValue);
    } else {
      value = parseFloat(newEntryValue);
    }

    if (isNaN(value)) {
      showPopup('Erreur', 'Valeur invalide');
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
      const performanceStr = isForceExercise
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
        timeSeconds: (isRunning || selectedBenchmark.category === 'cardio') && duration ? duration * 60 : undefined,
        // Advanced metrics for social card
        ...advancedMetrics,
      });

      // Show victory modal (Style Yoroi)
      setShowVictoryModal(true);

      showToast(isPR ? 'Nouveau Record !' : 'Enregistrement sauvegardé');
      loadData();

      // Refresh selected benchmark
      const updated = await getBenchmarks();
      const refreshed = updated.find(b => b.id === selectedBenchmark.id);
      if (refreshed) setSelectedBenchmark(refreshed);
    }
    } catch (error) {
      console.error('Error adding entry:', error);
      showPopup({ title: 'Erreur', message: 'Impossible d\'enregistrer', buttons: [{ text: 'OK', style: 'default' }] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBenchmark = async (id: string) => {
    showPopup(
      'Supprimer',
      'Supprimer ce suivi et tout son historique ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await addSkillNote(selectedSkill.id, newNoteText);
      setNewNoteText('');
      // Refresh
      const updated = await getSkills();
      const refreshed = updated.find(s => s.id === selectedSkill.id);
      if (refreshed) setSelectedSkill(refreshed);
      loadData();
    } catch (error) {
      console.error('Error adding note:', error);
      showPopup({ title: 'Erreur', message: 'Impossible d\'ajouter la note', buttons: [{ text: 'OK', style: 'default' }] });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleIncrementDrill = async () => {
    if (!selectedSkill) return;

    const amount = parseInt(drillIncrement) || 10;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await incrementDrillCount(selectedSkill.id, amount);
    // Refresh
    const updated = await getSkills();
    const refreshed = updated.find(s => s.id === selectedSkill.id);
    if (refreshed) setSelectedSkill(refreshed);
    loadData();
  };

  const handleDeleteSkill = async (id: string) => {
    showPopup(
      'Supprimer',
      'Supprimer cette technique et toutes ses notes ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const success = await restoreBenchmark(benchmarkId);
      if (success) {
        await loadData();
        showPopup({
          title: 'Restauré',
          message: 'Record restauré avec succès',
          type: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      }
    } catch (error) {
      console.error('Error restoring benchmark:', error);
      showPopup({
        title: 'Erreur',
        message: 'Impossible de restaurer',
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const handleRestoreSkill = async (skillId: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const success = await restoreSkill(skillId);
      if (success) {
        await loadData();
        showPopup({
          title: 'Restauré',
          message: 'Technique restaurée avec succès',
          type: 'success',
          buttons: [{ text: 'OK', style: 'default' }]
        });
      }
    } catch (error) {
      console.error('Error restoring skill:', error);
      showPopup({
        title: 'Erreur',
        message: 'Impossible de restaurer',
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
    }
  };

  const handleEmptyTrash = () => {
    if (trashCount === 0) {
      showPopup({
        title: 'Corbeille vide',
        message: 'Rien à supprimer',
        type: 'info',
        buttons: [{ text: 'OK', style: 'default' }]
      });
      return;
    }

    // Confirmation avant suppression définitive
    showPopup({
      title: 'Vider la corbeille ?',
      message: `${trashCount} élément(s) seront définitivement supprimés. Cette action est irréversible.`,
      buttons: [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Vider',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              await emptyTrash();
              await loadData();
              setShowTrashModal(false);
              showPopup({
                title: 'Corbeille vidée',
                message: 'Suppression définitive réussie',
                type: 'success',
                buttons: [{ text: 'OK', style: 'default' }]
              });
            } catch (error) {
              console.error('Error emptying trash:', error);
              showPopup({
                title: 'Erreur',
                message: 'Impossible de vider la corbeille',
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
      label: 'Autre',
      color: '#6B7280',
      iconName: 'circle'
    };
    const isPR = pr && last && last.value === pr.value;

    // Format performance string: "100 kg × 5" for Force, "10km • 5:30 /km" for Running, etc.
    const getPerformanceString = () => {
      if (!last) return '--';
      // Force: show weight × reps
      if (benchmark.category === 'force' && (benchmark.unit === 'kg' || benchmark.unit === 'lbs')) {
        return formatForceEntry(last.value, benchmark.unit, last.reps);
      }
      // Running/Trail/Hyrox: show distance + pace if duration available
      if (['running', 'trail', 'hyrox'].includes(benchmark.category) && benchmark.unit === 'km' && last.duration) {
        const timeSeconds = last.duration * 60; // duration is in minutes
        const pace = calculatePace(timeSeconds, last.value);
        return `${last.value}km • ${pace} /km`;
      }
      return formatValue(last.value, benchmark.unit);
    };

    return (
      <TouchableOpacity
        key={benchmark.id}
        style={[styles.compactCard, { backgroundColor: colors.backgroundCard, borderLeftColor: benchmark.color }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                <Text style={styles.compactPRText}>PR</Text>
              </View>
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
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      label: 'Autre',
      color: '#6B7280',
      iconName: 'circle'
    };

    const getPerformanceString = () => {
      if (!last) return '--';
      // Force: show weight × reps
      if (benchmark.category === 'force' && (benchmark.unit === 'kg' || benchmark.unit === 'lbs')) {
        return formatForceEntry(last.value, benchmark.unit, last.reps);
      }
      // Running/Trail/Hyrox: show distance + pace if duration available
      if (['running', 'trail', 'hyrox'].includes(benchmark.category) && benchmark.unit === 'km' && last.duration) {
        const timeSeconds = last.duration * 60;
        const pace = calculatePace(timeSeconds, last.value);
        return `${last.value}km • ${pace} /km`;
      }
      return formatValue(last.value, benchmark.unit);
    };

    return (
      <TouchableOpacity
        key={benchmark.id}
        style={[styles.benchmarkCard, { backgroundColor: colors.backgroundCard, borderColor: benchmark.color + '40' }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
            <Text style={[styles.benchmarkDate, { color: colors.textMuted }]}>Aucune donnée</Text>
          </View>
        )}

        {/* Quick Add Button */}
        <TouchableOpacity
          style={[styles.quickAddBtn, { backgroundColor: benchmark.color }]}
          onPress={(e) => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
      label: 'Autre',
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
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                {skill.drillCount} répétitions
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
              setIsMusclePickerVisible(true);
            }}
          >
            <Dumbbell size={22} color="#FFFFFF" />
            <Text style={styles.fabMenuText}>Performance (Chiffre)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.fabMenuItem, { backgroundColor: '#8B5CF6' }]}
            onPress={() => {
              setShowFabMenu(false);
              setShowAddSkillModal(true);
            }}
          >
            <BookOpen size={22} color="#FFFFFF" />
            <Text style={styles.fabMenuText}>Technique (Savoir)</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );

  // ============================================
  // MAIN RENDER
  // ============================================

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={28} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Carnet d'Entrainement</Text>
        <TouchableOpacity
          onPress={() => setShowTrashModal(true)}
          style={styles.trashButton}
        >
          <Trash2 size={22} color={colors.textPrimary} />
          {trashCount > 0 && (
            <View style={{
              position: 'absolute',
              top: -4,
              right: -4,
              backgroundColor: colors.error,
              borderRadius: 10,
              width: 20,
              height: 20,
              justifyContent: 'center',
              alignItems: 'center',
            }}>
              <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '700' }}>
                {trashCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Tab Selector - Records / Techniques */}
      <View style={[styles.tabContainer, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'records' && { borderBottomColor: '#EF4444', borderBottomWidth: 3 }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('records');
          }}
          activeOpacity={0.7}
        >
          <Dumbbell size={18} color={activeTab === 'records' ? '#EF4444' : colors.textMuted} strokeWidth={2.5} />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'records' ? '#EF4444' : colors.textMuted }
          ]}>
            Records
          </Text>
          <View style={[styles.tabBadge, { backgroundColor: activeTab === 'records' ? '#EF4444' : colors.textMuted + '30' }]}>
            <Text style={[styles.tabBadgeText, { color: activeTab === 'records' ? '#FFFFFF' : colors.textMuted }]}>
              {benchmarks.length}
            </Text>
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === 'techniques' && { borderBottomColor: '#8B5CF6', borderBottomWidth: 3 }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab('techniques');
          }}
          activeOpacity={0.7}
        >
          <BookOpen size={18} color={activeTab === 'techniques' ? '#8B5CF6' : colors.textMuted} strokeWidth={2.5} />
          <Text style={[
            styles.tabText,
            { color: activeTab === 'techniques' ? '#8B5CF6' : colors.textMuted }
          ]}>
            Techniques
          </Text>
          <View style={[styles.tabBadge, { backgroundColor: activeTab === 'techniques' ? '#8B5CF6' : colors.textMuted + '30' }]}>
            <Text style={[styles.tabBadgeText, { color: activeTab === 'techniques' ? '#FFFFFF' : colors.textMuted }]}>
              {skills.length}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Info Banner - Stockage local + Nettoyage démo */}
      {stats.totalBenchmarks > 0 && (
        <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
          <View style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: colors.backgroundCard,
            borderRadius: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>
                Stockage local • Aucun serveur
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleCleanDemoData}
              style={{
                backgroundColor: colors.accent + '15',
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 8,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Trash2 size={14} color={colors.accent} />
              <Text style={{ fontSize: 11, color: colors.accent, fontWeight: '700' }}>
                Nettoyer démo
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchBar, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <Search size={20} color={colors.textMuted} />
          <TextInput
            style={[styles.searchInput, { color: colors.textPrimary }]}
            placeholder="Rechercher un exercice..."
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
        style={styles.globalFilterScroll}
        contentContainerStyle={styles.globalFilterContent}
      >
        {[
          { key: 'all' as GlobalFilter, label: 'Tout', iconName: 'bar-chart', color: colors.accent },
          { key: 'musculation' as GlobalFilter, label: 'Musculation', iconName: 'dumbbell', color: '#EF4444' },
          { key: 'running' as GlobalFilter, label: 'Running', iconName: 'footprints', color: '#3B82F6' },
          { key: 'jjb' as GlobalFilter, label: 'JJB', iconName: 'swords', color: '#06B6D4' },
          { key: 'boxe' as GlobalFilter, label: 'Boxe', iconName: 'zap', color: '#F59E0B' },
          { key: 'lutte' as GlobalFilter, label: 'Lutte', iconName: 'users', color: '#8B5CF6' },
          { key: 'grappling' as GlobalFilter, label: 'Grappling', iconName: 'shield', color: '#10B981' },
          { key: 'autre' as GlobalFilter, label: 'Autre', iconName: 'target', color: '#6B7280' },
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
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setGlobalFilter(filter.key);
              }}
            >
              {renderIcon(filter.iconName, 16, isSelected ? '#FFFFFF' : filter.color)}
              <Text style={[
                styles.globalFilterText,
                { color: isSelected ? '#FFFFFF' : colors.textPrimary }
              ]}>
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Stats Summary */}
        <View style={[styles.statsRow, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>{stats.totalPRs}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Records</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#10B981' }]}>{stats.skillsMastered}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Maîtrisées</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#F59E0B' }]}>{stats.totalDrills}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>Reps</Text>
          </View>
        </View>

        {/* SECTION: MES RECORDS */}
        {activeTab === 'records' && (
          <View>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Dumbbell size={20} color="#EF4444" />
                <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>Mes Records</Text>
              </View>
              <TouchableOpacity
                style={[styles.addSectionBtn, { backgroundColor: '#EF444420' }]}
                onPress={() => setIsMusclePickerVisible(true)}
              >
                <Plus size={16} color="#EF4444" strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {filteredBenchmarks.length === 0 ? (
              <TouchableOpacity
                style={[styles.emptyCompactCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setIsMusclePickerVisible(true);
                }}
              >
                <TrendingUp size={32} color={colors.textMuted} />
                <Text style={[styles.emptyCompactText, { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 8 }]}>
                  Aucun record pour l'instant
                </Text>
                <Text style={[styles.emptyCompactText, { color: colors.textMuted, fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }]}>
                  Enregistre tes records personnels pour suivre ta progression
                </Text>
                <View style={[styles.emptyActionButton, { backgroundColor: colors.accent, marginTop: 12 }]}>
                  <Plus size={18} color={colors.textOnAccent || '#FFFFFF'} strokeWidth={2.5} />
                  <Text style={{ color: colors.textOnAccent || '#FFFFFF', fontWeight: '600', marginLeft: 6 }}>
                    Ajouter mon premier record
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              Object.keys(groupedBenchmarks).map((categoryName) => (
                <View key={categoryName} style={{ marginBottom: 24 }}>
                  {/* CATEGORY HEADER (e.g. MUSCULATION, RUNNING) */}
                  <View style={[styles.mainCategoryHeader, { backgroundColor: colors.backgroundCard }]}>
                    <Text style={[styles.mainCategoryText, { color: colors.accent }]}>{categoryName}</Text>
                  </View>
                  
                  {Object.keys(groupedBenchmarks[categoryName]).map((muscleGroup) => (
                    <View key={muscleGroup} style={{ marginTop: 12 }}>
                      {/* SUB HEADER (e.g. PECTORAUX, DOS) - only if it's Musculation or has a muscle group */}
                      {muscleGroup !== 'GÉNÉRAL' && (
                        <Text style={[styles.categoryHeader, { color: colors.textMuted, marginLeft: 4 }]}>{muscleGroup}</Text>
                      )}
                      
                      <View style={styles.compactCardsList}>
                        {groupedBenchmarks[categoryName][muscleGroup].map(renderCompactBenchmarkCard)}
                      </View>
                    </View>
                  ))}
                </View>
              ))
            )}
          </View>
        )}

        {/* SECTION: MES TECHNIQUES */}
        {activeTab === 'techniques' && (
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <BookOpen size={20} color="#8B5CF6" />
                <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>Mes Techniques</Text>
              </View>
              <TouchableOpacity
                style={[styles.addSectionBtn, { backgroundColor: '#8B5CF620' }]}
                onPress={() => setShowAddSkillModal(true)}
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
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setShowAddSkillModal(true);
                  }}
                >
                  <Target size={48} color={colors.textMuted} />
                  <Text style={[styles.emptySkillsTitle, { color: colors.textPrimary, fontSize: 16, fontWeight: '600', marginTop: 8 }]}>
                    Aucune technique pour l'instant
                  </Text>
                  <Text style={[styles.emptySkillsText, { color: colors.textMuted, fontSize: 14, marginTop: 4, textAlign: 'center', paddingHorizontal: 20 }]}>
                    Ajoute les techniques que tu veux maîtriser et suivre
                  </Text>
                  <View style={[styles.emptyActionButton, { backgroundColor: '#8B5CF6', marginTop: 12 }]}>
                    <Plus size={18} color="#FFFFFF" strokeWidth={2.5} />
                    <Text style={{ color: '#FFFFFF', fontWeight: '600', marginLeft: 6 }}>
                      Ajouter ma première technique
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
              {/* TASK 2: Create custom skill when search has no results */}
              {filteredSkills.length === 0 && searchQuery.trim() !== '' && (
                <TouchableOpacity
                  style={[styles.createCustomSkillCard, { backgroundColor: colors.backgroundCard, borderColor: '#8B5CF6' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setNewSkillName(searchQuery.trim());
                    setSearchQuery('');
                    setShowAddSkillModal(true);
                  }}
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

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setShowFabMenu(true);
        }}
        activeOpacity={0.8}
      >
        <Plus size={28} color={colors.textOnGold} strokeWidth={2.5} />
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

      {/* Onboarding Modal */}
      <TrainingJournalOnboarding
        visible={showOnboarding}
        onClose={handleCloseOnboarding}
      />

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
          <Check size={18} color="#FFFFFF" strokeWidth={3} />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </Animated.View>
      )}

      {/* MUSCLE PICKER MODAL */}
      <Modal
        visible={isMusclePickerVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, height: '70%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>GROUPE MUSCULAIRE</Text>
              <TouchableOpacity onPress={() => setIsMusclePickerVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {
                [
                  { name: 'PECTORAUX', icon: 'dumbbell', color: '#EF4444' },
                  { name: 'DOS', icon: 'anchor', color: '#3B82F6' },
                  { name: 'JAMBES', icon: 'footprints', color: '#10B981' },
                  { name: 'ÉPAULES', icon: 'target', color: '#F59E0B' },
                  { name: 'BRAS', icon: 'zap', color: '#EC4899' },
                  { name: 'ABDOS', icon: 'shield', color: '#8B5CF6' },
                  { name: 'CARDIO', icon: 'timer', color: '#06B6D4' },
                ].map((muscle) => (
                  <TouchableOpacity
                    key={muscle.name}
                    style={[styles.muscleItem, { backgroundColor: colors.backgroundCard }]}
                    onPress={() => {
                      setSelectedMuscleGroup(muscle.name);
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
                ))
              }
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* EXERCISE PICKER MODAL */}
      <Modal
        visible={isExercisePickerVisible}
        animationType="slide"
        transparent={true}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.background, height: '80%' }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>{selectedMuscleGroup}</Text>
              <TouchableOpacity onPress={() => setIsExercisePickerVisible(false)}>
                <X size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            
            <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
              {(() => {
                const exercises: Record<string, string[]> = {
                  'PECTORAUX': ['Développé couché', 'Haltères incliné', 'Écartés', 'Dips (Pecs)', 'Pompes'],
                  'DOS': ['Tractions', 'Rowing barre', 'Tirage poitrine', 'Deadlift', 'Rowing haltère'],
                  'JAMBES': ['Squat', 'Presse à cuisses', 'Fentes', 'Leg Extension', 'Leg Curl'],
                  'ÉPAULES': ['Développé militaire', 'Élévations latérales', 'Oiseau', 'Arnold Press'],
                  'BRAS': ['Curl barre', 'Curl haltères', 'Extensions poulie', 'Barre au front'],
                  'ABDOS': ['Crunch', 'Gainage', 'Relevé de jambes', 'Roulette'],
                  'CARDIO': ['5km Running', '10km Running', 'Fractionné', 'Vélo', 'Rameur'],
                };
                
                const list = selectedMuscleGroup ? (exercises[selectedMuscleGroup] || []) : [];
                const category = selectedMuscleGroup === 'CARDIO' ? 'running' : 'force';
                const unit = selectedMuscleGroup === 'CARDIO' ? 'time' : 'kg';
                
                return list.map((ex) => (
                  <TouchableOpacity
                    key={ex}
                    style={[styles.exerciseItem, { backgroundColor: colors.backgroundCard }]}
                    onPress={() => handleQuickAddRecord(ex, category, unit)}
                  >
                    <Text style={[styles.exerciseText, { color: colors.textPrimary }]}>{ex}</Text>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  // Tab styles
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
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

  // Trash Button (Header)
  trashButton: {
    padding: 4,
    position: 'relative',
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
