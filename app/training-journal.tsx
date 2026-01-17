// ============================================
// CARNET D'ENTRAINEMENT - HYBRID DASHBOARD
// Mes Records (Benchmarks) + Mes Techniques (Skills)
// ============================================

import React, { useState, useEffect, useCallback } from 'react';
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
  ChevronLeft,
  Plus,
  X,
  Trash2,
  TrendingUp,
  Target,
  Check,
  Clock,
  Edit3,
  BarChart2,
  BookOpen,
  Dumbbell,
  Award,
  Timer,
  Mountain,
  Flame,
  Shield,
  Move,
  Lock,
  Users,
  Zap,
  Search,
  Calendar,
  ChevronDown,
  FileText,
  Scale,
  Video,
  ExternalLink,
  Swords,
  BarChart3,
  Footprints,
  Share2,
  Gauge,
  Play,
  Camera,
  Image as ImageIcon,
  RotateCcw,
} from 'lucide-react-native';
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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// ICON HELPER - Map iconName to Lucide component
// ============================================

const ICON_MAP: Record<string, React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>> = {
  dumbbell: Dumbbell,
  timer: Timer,
  mountain: Mountain,
  flame: Flame,
  target: Target,
  shield: Shield,
  move: Move,
  lock: Lock,
  users: Users,
  zap: Zap,
  scale: Scale,
  swords: Swords,
  'bar-chart': BarChart3,
  footprints: Footprints,
  'book-open': BookOpen,
};

const renderIcon = (iconName: string, size: number, color: string) => {
  const IconComponent = ICON_MAP[iconName] || Target;
  return <IconComponent size={size} color={color} />;
};

// Helper: Format relative date (Hier, Il y a 2j, 12 janv., etc.)
const getRelativeDate = (dateString: string, t: (key: string, params?: any) => string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return t('common.today');
  if (diffDays === 1) return t('common.yesterday');
  if (diffDays < 7) return t('trainingJournal.daysAgo', { days: diffDays });
  if (diffDays < 30) return t('trainingJournal.weeksAgo', { weeks: Math.floor(diffDays / 7) });

  // Format: "12 janv."
  const monthKey = `dates.${['januaryShort', 'februaryShort', 'marchShort', 'aprilShort', 'mayShort', 'juneShort', 'julyShort', 'augustShort', 'septemberShort', 'octoberShort', 'novemberShort', 'decemberShort'][date.getMonth()]}`;
  return `${date.getDate()} ${t(monthKey)}`;
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function TrainingJournalScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const { t, locale } = useI18n();
  const { showPopup, PopupComponent } = useCustomPopup();

  // Data state
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [stats, setStats] = useState({
    totalBenchmarks: 0,
    totalPRs: 0,
    totalSkills: 0,
    skillsMastered: 0,
    skillsInProgress: 0,
    totalDrills: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // Anti-spam protection

  // Modal state
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

  // Trash state
  const [trashBenchmarks, setTrashBenchmarks] = useState<TrashItem<Benchmark>[]>([]);
  const [trashSkills, setTrashSkills] = useState<TrashItem<Skill>[]>([]);
  const [trashCount, setTrashCount] = useState(0);

  // Form state
  const [newBenchmarkName, setNewBenchmarkName] = useState('');
  const [newBenchmarkCategory, setNewBenchmarkCategory] = useState<BenchmarkCategory>('force');
  const [newBenchmarkUnit, setNewBenchmarkUnit] = useState<BenchmarkUnit>('kg');
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('jjb_garde');
  const [newSkillStatus, setNewSkillStatus] = useState<SkillStatus>('to_learn');
  const [newSkillNotes, setNewSkillNotes] = useState('');
  // TASK 3: Local video URI for techniques
  const [newSkillVideoUri, setNewSkillVideoUri] = useState<string | null>(null);
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

  // PILLAR 3: Victory Share Modal
  const [showVictoryModal, setShowVictoryModal] = useState(false);
  const [victorySessionData, setVictorySessionData] = useState<VictorySessionData | null>(null);

  // Onboarding
  const [showOnboarding, setShowOnboarding] = useState(false);

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
      showPopup({
        title: 'Erreur',
        message: 'Impossible de nettoyer',
        type: 'error',
        buttons: [{ text: 'OK', style: 'default' }]
      });
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
    setIsLoading(true);
    try {
      const [benchmarksData, skillsData, statsData] = await Promise.all([
        getBenchmarks(),
        getSkills(),
        getCarnetStats(),
      ]);
      setBenchmarks(benchmarksData);
      setSkills(skillsData);
      setStats(statsData);
      await loadTrashData(); // Charger aussi la corbeille
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadTrashData]);

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

  // Filter benchmarks: ONLY show ones WITH entries (filtered by global filter)
  const filteredBenchmarks = benchmarks.filter(b => {
    // MUST have at least one entry to be displayed
    const hasEntries = b.entries && b.entries.length > 0;
    if (!hasEntries) return false;

    const matchesGlobal = matchesGlobalFilter(b.category, null);
    const matchesSearch = searchQuery.trim() === '' ||
      b.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesGlobal && matchesSearch;
  });

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

  const handleAddBenchmark = async () => {
    if (isSubmitting) return; // Anti-spam protection
    if (!newBenchmarkName.trim()) {
      showPopup({
        title: 'Erreur',
        message: 'Entre un nom pour le suivi',
        buttons: [{ text: 'OK', style: 'default' }],
      });
      return;
    }

    try {
      setIsSubmitting(true);
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

    const newEntry = await addBenchmarkEntry(
      selectedBenchmark.id,
      value,
      newEntryRPE,
      undefined,
      selectedDate,
      reps,
      duration,
      calories
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
      setNewEntryValue('');
      setNewEntryReps('');
      setNewEntryDuration('');
      setNewEntryCalories('');
      setNewEntryRPE(5);
      setEntryDate('today');

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
        distanceKm: isRunning && selectedBenchmark.unit === 'km' ? value : undefined,
        timeSeconds: isRunning && duration ? duration * 60 : undefined,
      });

      // Show victory modal (Strava-style)
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
            {last ? getRelativeDate(last.date) : ''}
          </Text>
          <View style={styles.compactCardActions}>
            {/* TASK 2: Share button for re-sharing past sessions */}
            {last && (
              <TouchableOpacity
                style={[styles.compactShareBtn, { backgroundColor: colors.backgroundCard, borderColor: benchmark.color }]}
                onPress={(e) => {
                  e.stopPropagation();
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
                e.stopPropagation();
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
                {getRelativeDate(last.date)}
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
            e.stopPropagation();
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

  const renderAddBenchmarkModal = () => (
    <Modal visible={showAddBenchmarkModal} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nouveau Suivi</Text>
            <TouchableOpacity onPress={() => setShowAddBenchmarkModal(false)}>
              <X size={24} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
            {(Object.keys(BENCHMARK_CATEGORIES) as BenchmarkCategory[]).map(cat => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryOption,
                  { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                  newBenchmarkCategory === cat && { backgroundColor: BENCHMARK_CATEGORIES[cat].color, borderColor: BENCHMARK_CATEGORIES[cat].color }
                ]}
                onPress={() => {
                  setNewBenchmarkCategory(cat);
                  // Auto-set unit based on category
                  if (cat === 'running' || cat === 'trail') {
                    setNewBenchmarkUnit('time');
                  } else if (cat === 'force') {
                    setNewBenchmarkUnit('kg');
                  }
                }}
              >
                {renderIcon(
                  BENCHMARK_CATEGORIES[cat].iconName,
                  18,
                  newBenchmarkCategory === cat ? '#FFFFFF' : BENCHMARK_CATEGORIES[cat].color
                )}
                <Text style={[
                  styles.categoryOptionText,
                  { color: newBenchmarkCategory === cat ? '#FFFFFF' : colors.textPrimary }
                ]}>
                  {BENCHMARK_CATEGORIES[cat].label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* TASK 2: Quick Presets for Running */}
          {(newBenchmarkCategory === 'running' || newBenchmarkCategory === 'trail') && (
            <>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Distances populaires</Text>
              <View style={styles.presetChipsRow}>
                {[
                  { label: '5km', name: '5km' },
                  { label: '10km', name: '10km' },
                  { label: 'Semi-Marathon', name: 'Semi-Marathon' },
                  { label: 'Marathon', name: 'Marathon' },
                ].map(preset => (
                  <TouchableOpacity
                    key={preset.name}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: newBenchmarkName === preset.name ? '#3B82F6' : colors.backgroundCard,
                        borderColor: '#3B82F6',
                      }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNewBenchmarkName(preset.name);
                      setNewBenchmarkUnit('time');
                    }}
                  >
                    <Text style={[
                      styles.presetChipText,
                      { color: newBenchmarkName === preset.name ? '#FFFFFF' : '#3B82F6' }
                    ]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* TASK 2: Quick Presets for Force */}
          {newBenchmarkCategory === 'force' && (
            <>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Exercices populaires</Text>
              <View style={styles.presetChipsRow}>
                {[
                  { label: 'Squat', name: 'Squat' },
                  { label: 'Développé Couché', name: 'Développé Couché' },
                  { label: 'Soulevé de Terre', name: 'Soulevé de Terre' },
                ].map(preset => (
                  <TouchableOpacity
                    key={preset.name}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: newBenchmarkName === preset.name ? '#EF4444' : colors.backgroundCard,
                        borderColor: '#EF4444',
                      }
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setNewBenchmarkName(preset.name);
                      setNewBenchmarkUnit('kg');
                    }}
                  >
                    <Text style={[
                      styles.presetChipText,
                      { color: newBenchmarkName === preset.name ? '#FFFFFF' : '#EF4444' }
                    ]}>
                      {preset.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Nom du suivi</Text>
          <TextInput
            style={[styles.textInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
            placeholder="Ex: Squat, 10km..."
            placeholderTextColor={colors.textMuted}
            value={newBenchmarkName}
            onChangeText={setNewBenchmarkName}
            maxLength={50}
          />

          {/* Only show Unit selector if NOT using a preset (Running/Force) */}
          {newBenchmarkCategory !== 'running' && newBenchmarkCategory !== 'trail' && newBenchmarkCategory !== 'force' && (
            <>
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Unité</Text>
              <View style={styles.unitRow}>
                {(['kg', 'lbs', 'time', 'reps', 'km'] as BenchmarkUnit[]).map(unit => (
                  <TouchableOpacity
                    key={unit}
                    style={[
                      styles.unitOption,
                      { backgroundColor: colors.backgroundCard, borderColor: colors.border },
                      newBenchmarkUnit === unit && { backgroundColor: colors.accent, borderColor: colors.accent }
                    ]}
                    onPress={() => setNewBenchmarkUnit(unit)}
                  >
                    <Text style={[
                      styles.unitOptionText,
                      { color: newBenchmarkUnit === unit ? colors.textOnGold : colors.textPrimary }
                    ]}>
                      {unit === 'time' ? 'Temps' : unit.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Show selected unit info for Running/Force */}
          {(newBenchmarkCategory === 'running' || newBenchmarkCategory === 'trail') && (
            <View style={[styles.unitInfoBanner, { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }]}>
              <Clock size={16} color="#3B82F6" />
              <Text style={[styles.unitInfoText, { color: '#3B82F6' }]}>
                Unité: Temps (mm:ss ou hh:mm:ss)
              </Text>
            </View>
          )}
          {newBenchmarkCategory === 'force' && (
            <View style={[styles.unitInfoBanner, { backgroundColor: '#EF444420', borderColor: '#EF4444' }]}>
              <Scale size={16} color="#EF4444" />
              <Text style={[styles.unitInfoText, { color: '#EF4444' }]}>
                Unité: Poids (kg) × Répétitions
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: colors.accent, opacity: isSubmitting ? 0.6 : 1 }]}
            onPress={handleAddBenchmark}
            disabled={isSubmitting}
          >
            <Text style={[styles.modalButtonText, { color: colors.textOnGold }]}>{isSubmitting ? 'Création...' : 'Créer le Suivi'}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderAddSkillModal = () => (
    <Modal visible={showAddSkillModal} animationType="slide" transparent>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
        <ScrollView style={{ maxHeight: '90%' }} showsVerticalScrollIndicator={false}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Nouvelle Technique</Text>
              <TouchableOpacity onPress={() => {
                setShowAddSkillModal(false);
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

            {/* Status Selector - NEW */}
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

            {/* TASK 3: Video Picker Section */}
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
                  onPress={recordSkillVideo}
                >
                  <Camera size={20} color="#FFFFFF" />
                  <Text style={styles.videoPickerBtnText}>Filmer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.videoPickerBtn, styles.videoPickerBtnSecondary, { borderColor: '#8B5CF6' }]}
                  onPress={pickSkillVideo}
                >
                  <ImageIcon size={20} color="#8B5CF6" />
                  <Text style={[styles.videoPickerBtnText, { color: '#8B5CF6' }]}>Galerie</Text>
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[styles.modalButton, { backgroundColor: '#8B5CF6', opacity: isSubmitting ? 0.6 : 1 }]}
              onPress={handleAddSkill}
              disabled={isSubmitting}
            >
              <Text style={styles.modalButtonText}>{isSubmitting ? 'Ajout...' : 'Ajouter la Technique'}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );

  const renderAddEntryModal = () => {
    // Detect exercise type
    const isForceExercise = selectedBenchmark?.category === 'force' &&
      (selectedBenchmark?.unit === 'kg' || selectedBenchmark?.unit === 'lbs');
    const isRunningExercise = ['running', 'trail'].includes(selectedBenchmark?.category || '');
    const isHyroxExercise = selectedBenchmark?.category === 'hyrox';

    // Calculate total time in seconds from H/M/S fields
    const getTotalTimeSeconds = () => {
      const h = parseInt(runningTimeHours) || 0;
      const m = parseInt(runningTimeMinutes) || 0;
      const s = parseInt(runningTimeSeconds) || 0;
      return h * 3600 + m * 60 + s;
    };

    // Auto-calculate pace for Running
    const getEstimatedPace = () => {
      const distanceKm = parseFloat(newEntryDistance);
      const totalSeconds = getTotalTimeSeconds();
      if (distanceKm > 0 && totalSeconds > 0) {
        const paceSecondsPerKm = totalSeconds / distanceKm;
        const paceMin = Math.floor(paceSecondsPerKm / 60);
        const paceSec = Math.floor(paceSecondsPerKm % 60);
        return `${paceMin}:${paceSec.toString().padStart(2, '0')} /km`;
      }
      return null;
    };

    // Auto-calculate calories when time changes
    const updateCaloriesFromTime = () => {
      const totalSeconds = getTotalTimeSeconds();
      if (totalSeconds > 0 && selectedBenchmark) {
        const durationMin = Math.round(totalSeconds / 60);
        setNewEntryDuration(durationMin.toString());
        const estimatedCal = calculateCalories(durationMin, userWeight, selectedBenchmark.category);
        setNewEntryCalories(estimatedCal.toString());
      }
    };

    // Reset modal state
    const resetModalState = () => {
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
    };

    return (
      <Modal visible={showAddEntryModal} animationType="slide" transparent>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
          <ScrollView style={{ maxHeight: '90%' }} showsVerticalScrollIndicator={false}>
            <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  {selectedBenchmark?.name}
                </Text>
                <TouchableOpacity onPress={resetModalState} style={styles.modalCloseBtn}>
                  <X size={24} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              {/* Date Picker */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Date de la séance</Text>
              <View style={styles.datePickerRow}>
                <TouchableOpacity
                  style={[
                    styles.dateOption,
                    { backgroundColor: entryDate === 'today' ? colors.accent : colors.backgroundCard, borderColor: colors.border }
                  ]}
                  onPress={() => setEntryDate('today')}
                >
                  <Calendar size={16} color={entryDate === 'today' ? '#FFFFFF' : colors.textMuted} />
                  <Text style={[styles.dateOptionText, { color: entryDate === 'today' ? '#FFFFFF' : colors.textPrimary }]}>
                    Aujourd'hui
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dateOption,
                    { backgroundColor: entryDate === 'yesterday' ? colors.accent : colors.backgroundCard, borderColor: colors.border }
                  ]}
                  onPress={() => setEntryDate('yesterday')}
                >
                  <Clock size={16} color={entryDate === 'yesterday' ? '#FFFFFF' : colors.textMuted} />
                  <Text style={[styles.dateOptionText, { color: entryDate === 'yesterday' ? '#FFFFFF' : colors.textPrimary }]}>
                    Hier
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.dateOption,
                    { backgroundColor: entryDate === 'custom' ? colors.accent : colors.backgroundCard, borderColor: colors.border }
                  ]}
                  onPress={() => {
                    setEntryDate('custom');
                    setShowDatePicker(true);
                  }}
                >
                  <Edit3 size={16} color={entryDate === 'custom' ? '#FFFFFF' : colors.textMuted} />
                  <Text style={[styles.dateOptionText, { color: entryDate === 'custom' ? '#FFFFFF' : colors.textPrimary }]}>
                    {entryDate === 'custom'
                      ? customDate.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
                      : 'Autre'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Native Date Picker (iOS inline) */}
              {showDatePicker && (
                <View style={[styles.datePickerContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <DateTimePicker
                    value={customDate}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    maximumDate={new Date()}
                    locale="fr-FR"
                    onChange={(event, selectedDate) => {
                      if (Platform.OS === 'android') {
                        setShowDatePicker(false);
                      }
                      if (selectedDate) {
                        setCustomDate(selectedDate);
                        setEntryDate('custom');
                      }
                    }}
                    style={{ height: 150 }}
                  />
                  {Platform.OS === 'ios' && (
                    <TouchableOpacity
                      style={[styles.datePickerDoneBtn, { backgroundColor: colors.accent }]}
                      onPress={() => setShowDatePicker(false)}
                    >
                      <Text style={styles.datePickerDoneText}>Valider</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {/* ============================================ */}
              {/* TASK 2: HYROX Effort Type Toggle */}
              {/* ============================================ */}
              {isHyroxExercise && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Type d'effort</Text>
                  <View style={styles.hyroxTypeRow}>
                    {([
                      { key: 'course' as const, label: 'Course/Total', icon: Footprints },
                      { key: 'station_force' as const, label: 'Station Force', icon: Dumbbell },
                      { key: 'repetitions' as const, label: 'Répétitions', icon: Target },
                    ]).map(({ key, label, icon: Icon }) => (
                      <TouchableOpacity
                        key={key}
                        style={[
                          styles.hyroxTypeBtn,
                          {
                            backgroundColor: hyroxEffortType === key ? '#F59E0B' : colors.backgroundCard,
                            borderColor: hyroxEffortType === key ? '#F59E0B' : colors.border,
                          }
                        ]}
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          setHyroxEffortType(key);
                        }}
                      >
                        <Icon size={16} color={hyroxEffortType === key ? '#FFFFFF' : colors.textMuted} />
                        <Text style={[
                          styles.hyroxTypeText,
                          { color: hyroxEffortType === key ? '#FFFFFF' : colors.textPrimary }
                        ]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {/* ============================================ */}
              {/* TASK 1: RUNNING PRO ENTRY */}
              {/* Distance + Time (H:M:S) + Auto Pace */}
              {/* ============================================ */}
              {(isRunningExercise || (isHyroxExercise && hyroxEffortType === 'course')) && (
                <>
                  {/* Distance Input */}
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Distance (km) <Text style={{ color: '#3B82F6' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.valueInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: '#3B82F6' }]}
                    placeholder="10.5"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryDistance}
                    onChangeText={(text) => {
                      setNewEntryDistance(text);
                      // Store distance as the main value for running
                      setNewEntryValue(text);
                    }}
                    keyboardType="decimal-pad"
                    autoFocus
                  />

                  {/* Time Input - Clean H:M:S */}
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Temps <Text style={{ color: '#3B82F6' }}>*</Text>
                  </Text>
                  <View style={styles.timeInputRow}>
                    <View style={styles.timeInputGroup}>
                      <TextInput
                        style={[styles.timeInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="0"
                        placeholderTextColor={colors.textMuted}
                        value={runningTimeHours}
                        onChangeText={(text) => {
                          setRunningTimeHours(text.replace(/[^0-9]/g, ''));
                          setTimeout(updateCaloriesFromTime, 100);
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={[styles.timeLabel, { color: colors.textMuted }]}>h</Text>
                    </View>
                    <Text style={[styles.timeSeparator, { color: colors.textMuted }]}>:</Text>
                    <View style={styles.timeInputGroup}>
                      <TextInput
                        style={[styles.timeInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="00"
                        placeholderTextColor={colors.textMuted}
                        value={runningTimeMinutes}
                        onChangeText={(text) => {
                          const val = text.replace(/[^0-9]/g, '');
                          if (parseInt(val) <= 59 || val === '') {
                            setRunningTimeMinutes(val);
                            setTimeout(updateCaloriesFromTime, 100);
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={[styles.timeLabel, { color: colors.textMuted }]}>min</Text>
                    </View>
                    <Text style={[styles.timeSeparator, { color: colors.textMuted }]}>:</Text>
                    <View style={styles.timeInputGroup}>
                      <TextInput
                        style={[styles.timeInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                        placeholder="00"
                        placeholderTextColor={colors.textMuted}
                        value={runningTimeSeconds}
                        onChangeText={(text) => {
                          const val = text.replace(/[^0-9]/g, '');
                          if (parseInt(val) <= 59 || val === '') {
                            setRunningTimeSeconds(val);
                            setTimeout(updateCaloriesFromTime, 100);
                          }
                        }}
                        keyboardType="number-pad"
                        maxLength={2}
                      />
                      <Text style={[styles.timeLabel, { color: colors.textMuted }]}>sec</Text>
                    </View>
                  </View>

                  {/* Auto-Calculated Pace Display */}
                  {getEstimatedPace() && (
                    <View style={[styles.paceDisplay, { backgroundColor: '#3B82F620', borderColor: '#3B82F6' }]}>
                      <Gauge size={18} color="#3B82F6" />
                      <Text style={[styles.paceDisplayLabel, { color: colors.textSecondary }]}>
                        Allure estimée:
                      </Text>
                      <Text style={[styles.paceDisplayValue, { color: '#3B82F6' }]}>
                        {getEstimatedPace()}
                      </Text>
                    </View>
                  )}
                </>
              )}

              {/* ============================================ */}
              {/* HYROX: Station Force (Sleds, Lunges) */}
              {/* ============================================ */}
              {isHyroxExercise && hyroxEffortType === 'station_force' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Poids (kg) <Text style={{ color: '#F59E0B' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.valueInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: '#F59E0B' }]}
                    placeholder="50"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryValue}
                    onChangeText={setNewEntryValue}
                    keyboardType="numeric"
                    autoFocus
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Distance (m) <Text style={{ color: '#F59E0B' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="25"
                    placeholderTextColor={colors.textMuted}
                    value={hyroxDistanceMeters}
                    onChangeText={setHyroxDistanceMeters}
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* ============================================ */}
              {/* HYROX: Répétitions (Wall Balls, Burpees) */}
              {/* ============================================ */}
              {isHyroxExercise && hyroxEffortType === 'repetitions' && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Poids (kg)
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.valueInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="9"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryValue}
                    onChangeText={setNewEntryValue}
                    keyboardType="numeric"
                    autoFocus
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Répétitions <Text style={{ color: '#F59E0B' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: '#F59E0B' }]}
                    placeholder="100"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryReps}
                    onChangeText={setNewEntryReps}
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* ============================================ */}
              {/* FORCE: Weight + Reps (existing) */}
              {/* ============================================ */}
              {isForceExercise && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>Unité</Text>
                  <View style={styles.unitToggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.unitToggleBtn,
                        {
                          backgroundColor: newEntryUnit === 'kg' ? selectedBenchmark?.color : colors.backgroundCard,
                          borderColor: selectedBenchmark?.color,
                        }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNewEntryUnit('kg');
                      }}
                    >
                      <Text style={[styles.unitToggleText, { color: newEntryUnit === 'kg' ? '#FFFFFF' : colors.textPrimary }]}>
                        KG
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.unitToggleBtn,
                        {
                          backgroundColor: newEntryUnit === 'lbs' ? selectedBenchmark?.color : colors.backgroundCard,
                          borderColor: selectedBenchmark?.color,
                        }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNewEntryUnit('lbs');
                      }}
                    >
                      <Text style={[styles.unitToggleText, { color: newEntryUnit === 'lbs' ? '#FFFFFF' : colors.textPrimary }]}>
                        LBS
                      </Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Poids ({newEntryUnit}) <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.valueInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: '#EF4444' }]}
                    placeholder="100"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryValue}
                    onChangeText={setNewEntryValue}
                    keyboardType="numeric"
                    autoFocus
                  />

                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Répétitions <Text style={{ color: '#EF4444' }}>*</Text>
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.repsInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="5"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryReps}
                    onChangeText={setNewEntryReps}
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* ============================================ */}
              {/* OTHER Categories - Generic Input */}
              {/* ============================================ */}
              {!isRunningExercise && !isForceExercise && !isHyroxExercise && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    {selectedBenchmark?.unit === 'time' ? 'Temps' : `Valeur (${selectedBenchmark?.unit})`}
                  </Text>
                  <TextInput
                    style={[styles.textInput, styles.valueInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder={selectedBenchmark?.unit === 'time' ? '25:30' : '100'}
                    placeholderTextColor={colors.textMuted}
                    value={newEntryValue}
                    onChangeText={setNewEntryValue}
                    keyboardType={selectedBenchmark?.unit === 'time' ? 'default' : 'numeric'}
                    autoFocus
                  />
                </>
              )}

              {/* Duration Input - Show for non-Running exercises */}
              {!isRunningExercise && !(isHyroxExercise && hyroxEffortType === 'course') && (
                <>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Durée (minutes)
                  </Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="45"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryDuration}
                    onChangeText={(text) => {
                      setNewEntryDuration(text);
                      if (text.trim() && selectedBenchmark) {
                        const duration = parseInt(text);
                        if (!isNaN(duration) && duration > 0) {
                          const estimatedCal = calculateCalories(duration, userWeight, selectedBenchmark.category);
                          setNewEntryCalories(estimatedCal.toString());
                        }
                      }
                    }}
                    keyboardType="numeric"
                  />
                </>
              )}

              {/* Calories Display */}
              <View style={styles.caloriesRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Calories estimées
                  </Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.backgroundCard, color: colors.textPrimary, borderColor: colors.border }]}
                    placeholder="350"
                    placeholderTextColor={colors.textMuted}
                    value={newEntryCalories}
                    onChangeText={setNewEntryCalories}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.metsInfo}>
                  <Text style={[styles.metsLabel, { color: colors.textMuted }]}>
                    MET: {selectedBenchmark ? METS_VALUES[selectedBenchmark.category] || 5 : 5}
                  </Text>
                </View>
              </View>

              {/* RPE Slider */}
              <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                Difficulté (RPE)
              </Text>
              <View style={[styles.rpeContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <View style={styles.rpeHeader}>
                  <Text style={[styles.rpeValue, { color: getRPEColor(newEntryRPE) }]}>{newEntryRPE}</Text>
                  <Text style={[styles.rpeLabel, { color: getRPEColor(newEntryRPE) }]}>{getRPELabel(newEntryRPE)}</Text>
                </View>
                <View style={styles.rpeSlider}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(val => (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.rpeButton,
                        {
                          backgroundColor: val <= newEntryRPE ? getRPEColor(val) : colors.background,
                          borderColor: getRPEColor(val),
                        }
                      ]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setNewEntryRPE(val);
                      }}
                    >
                      <Text style={[
                        styles.rpeButtonText,
                        { color: val <= newEntryRPE ? '#FFFFFF' : colors.textMuted }
                      ]}>
                        {val}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: selectedBenchmark?.color || colors.accent, opacity: isSubmitting ? 0.6 : 1 }]}
                onPress={handleAddEntry}
                disabled={isSubmitting}
              >
                <Text style={styles.modalButtonText}>{isSubmitting ? 'Enregistrement...' : 'Enregistrer'}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    );
  };

  const renderBenchmarkDetailModal = () => {
    if (!selectedBenchmark) return null;

    const pr = getBenchmarkPR(selectedBenchmark);
    const entries = [...selectedBenchmark.entries].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    return (
      <Modal visible={showBenchmarkDetail} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={[styles.detailModalOverlay, { backgroundColor: colors.background }]}>
          <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setShowBenchmarkDetail(false)}
              style={styles.detailHeaderBtn}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <ChevronLeft size={28} color={colors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.detailTitle, { color: colors.textPrimary }]} numberOfLines={1}>
              {selectedBenchmark.name}
            </Text>
            <View style={styles.detailHeaderRight}>
              <TouchableOpacity
                onPress={() => handleDeleteBenchmark(selectedBenchmark.id)}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={22} color="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowBenchmarkDetail(false)}
                style={styles.detailCloseBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <X size={24} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={styles.detailContent} showsVerticalScrollIndicator={false}>
            {/* PR Card */}
            <View style={[styles.prCard, { backgroundColor: selectedBenchmark.color + '20', borderColor: selectedBenchmark.color }]}>
              <View style={styles.prCardIconContainer}>
                {renderIcon(selectedBenchmark.iconName || BENCHMARK_CATEGORIES[selectedBenchmark.category].iconName, 40, selectedBenchmark.color)}
              </View>
              <View style={styles.prCardInfo}>
                <Text style={[styles.prCardLabel, { color: colors.textMuted }]}>Record Personnel</Text>
                <Text style={[styles.prCardValue, { color: selectedBenchmark.color }]}>
                  {pr ? formatValue(pr.value, selectedBenchmark.unit) : '--'}
                </Text>
                {pr && (
                  <Text style={[styles.prCardDate, { color: colors.textMuted }]}>
                    {new Date(pr.date).toLocaleDateString(locale)}
                  </Text>
                )}
              </View>
              <TouchableOpacity
                style={[styles.prAddBtn, { backgroundColor: selectedBenchmark.color }]}
                onPress={() => setShowAddEntryModal(true)}
              >
                <Plus size={20} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {/* Mini Chart Placeholder */}
            {entries.length > 1 && (
              <View style={[styles.chartCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>Progression</Text>
                <View style={styles.chartPlaceholder}>
                  {entries.slice(0, 10).reverse().map((entry, index) => {
                    const maxVal = Math.max(...entries.map(e => e.value));
                    const minVal = Math.min(...entries.map(e => e.value));
                    const range = maxVal - minVal || 1;
                    const heightPercent = ((entry.value - minVal) / range) * 100;

                    return (
                      <View key={entry.id} style={styles.chartBarContainer}>
                        <View
                          style={[
                            styles.chartBar,
                            {
                              backgroundColor: selectedBenchmark.color,
                              height: `${Math.max(20, heightPercent)}%`
                            }
                          ]}
                        />
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* History */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>HISTORIQUE</Text>
            {entries.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.backgroundCard }]}>
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  Aucune donnée. Ajoute ta première performance !
                </Text>
              </View>
            ) : (
              entries.map((entry, index) => {
                const isPR = pr && entry.id === pr.id;
                const isForce = selectedBenchmark.category === 'force' &&
                  (selectedBenchmark.unit === 'kg' || selectedBenchmark.unit === 'lbs');

                return (
                  <View
                    key={entry.id}
                    style={[
                      styles.historyItem,
                      { backgroundColor: colors.backgroundCard, borderColor: isPR ? selectedBenchmark.color : colors.border }
                    ]}
                  >
                    <View style={styles.historyLeft}>
                      <Text style={[styles.historyValue, { color: colors.textPrimary }]}>
                        {isForce
                          ? formatForceEntry(entry.value, selectedBenchmark.unit, entry.reps)
                          : formatValue(entry.value, selectedBenchmark.unit)}
                      </Text>
                      <Text style={[styles.historyDate, { color: colors.textMuted }]}>
                        {new Date(entry.date).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </Text>
                    </View>
                    {isPR && (
                      <View style={[styles.prBadge, { backgroundColor: selectedBenchmark.color }]}>
                        <Award size={12} color="#FFFFFF" />
                        <Text style={styles.prBadgeText}>PR</Text>
                      </View>
                    )}
                  </View>
                );
              })
            )}

            <View style={{ height: 100 }} />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    );
  };

  const renderSkillDetailModal = () => {
    if (!selectedSkill) return null;

    const statusConfig = SKILL_STATUS_CONFIG[selectedSkill.status];
    const categoryConfig = SKILL_CATEGORIES[selectedSkill.category] || {
      label: 'Autre',
      color: '#6B7280',
      iconName: 'circle'
    };

    return (
      <Modal visible={showSkillDetail} animationType="slide" presentationStyle="fullScreen">
        <SafeAreaView style={[styles.detailModalOverlay, { backgroundColor: colors.background }]}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ flex: 1 }}
          >
            <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
              <TouchableOpacity
                onPress={() => setShowSkillDetail(false)}
                style={styles.detailHeaderBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <ChevronLeft size={28} color={colors.textPrimary} />
              </TouchableOpacity>
              <Text style={[styles.detailTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                {selectedSkill.name}
              </Text>
              <View style={styles.detailHeaderRight}>
                <TouchableOpacity
                  onPress={() => handleDeleteSkill(selectedSkill.id)}
                  style={styles.detailHeaderBtn}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Trash2 size={22} color="#EF4444" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowSkillDetail(false)}
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
                const isSelected = selectedSkill.status === status;
                return (
                  <TouchableOpacity
                    key={status}
                    style={[
                      styles.statusOption,
                      { backgroundColor: isSelected ? config.color : colors.backgroundCard, borderColor: config.color }
                    ]}
                    onPress={() => handleUpdateSkillStatus(selectedSkill.id, status)}
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
                  {selectedSkill.drillCount}
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
                  onPress={handleIncrementDrill}
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
                onPress={handleAddNote}
                disabled={!newNoteText.trim() || isSubmitting}
              >
                <Plus size={18} color="#FFFFFF" strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {selectedSkill.notes.length > 0 && (
              <View style={styles.notesList}>
                {[...selectedSkill.notes].reverse().map(note => (
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
                        onPress={() => {
                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          deleteSkillNote(selectedSkill.id, note.id).then(() => {
                            getSkills().then(updated => {
                              const refreshed = updated.find(s => s.id === selectedSkill.id);
                              if (refreshed) setSelectedSkill(refreshed);
                            });
                          });
                        }}
                      >
                        <Trash2 size={14} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* TASK 2: Video Link Section */}
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>LIEN VIDÉO</Text>
            <View style={[styles.videoLinkContainer, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
              <Video size={20} color={colors.textMuted} />
              <TextInput
                style={[styles.videoLinkInput, { color: colors.textPrimary }]}
                placeholder="YouTube, Instagram..."
                placeholderTextColor={colors.textMuted}
                value={editingVideoUrl || selectedSkill.videoUrl || ''}
                onChangeText={setEditingVideoUrl}
                autoCapitalize="none"
                keyboardType="url"
                maxLength={500}
              />
              {(editingVideoUrl || selectedSkill.videoUrl) && (
                <TouchableOpacity
                  style={[styles.videoSaveBtn, { backgroundColor: categoryConfig.color }]}
                  onPress={handleUpdateVideoUrl}
                >
                  <Check size={16} color="#FFFFFF" strokeWidth={3} />
                </TouchableOpacity>
              )}
            </View>
            {selectedSkill.videoUrl && (
              <TouchableOpacity
                style={[styles.watchVideoBtn, { backgroundColor: categoryConfig.color + '20', borderColor: categoryConfig.color }]}
                onPress={() => openVideoUrl(selectedSkill.videoUrl!)}
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
  };

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
              setShowAddBenchmarkModal(true);
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
  // TRASH MODAL
  // ============================================

  const renderTrashModal = () => (
    <Modal visible={showTrashModal} animationType="slide" presentationStyle="fullScreen">
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setShowTrashModal(false)} style={styles.backButton}>
            <X size={28} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Corbeille</Text>
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
                Corbeille vide
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 40 }}>
                Les éléments supprimés apparaîtront ici
              </Text>
            </View>
          )}

          {/* Trashed Benchmarks */}
          {trashBenchmarks.length > 0 && (
            <View style={{ marginTop: 16 }}>
              <View style={styles.sectionHeader}>
                <Dumbbell size={18} color="#EF4444" />
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Records supprimés ({trashBenchmarks.length})
                </Text>
              </View>

              {trashBenchmarks.map((trashItem, index) => {
                const benchmark = trashItem.item;
                const deletedDate = new Date(trashItem.deletedAt);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
                const deletedText = diffDays === 0 ? "Aujourd'hui" : diffDays === 1 ? "Hier" : `Il y a ${diffDays}j`;

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
                        Supprimé {deletedText}
                      </Text>
                      {benchmark.entries.length > 0 && (
                        <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                          {benchmark.entries.length} entrée(s)
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRestoreBenchmark(benchmark.id)}
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
                  Techniques supprimées ({trashSkills.length})
                </Text>
              </View>

              {trashSkills.map((trashItem, index) => {
                const skill = trashItem.item;
                const deletedDate = new Date(trashItem.deletedAt);
                const now = new Date();
                const diffDays = Math.floor((now.getTime() - deletedDate.getTime()) / (1000 * 60 * 60 * 24));
                const deletedText = diffDays === 0 ? "Aujourd'hui" : diffDays === 1 ? "Hier" : `Il y a ${diffDays}j`;

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
                        Supprimé {deletedText}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Text style={{ fontSize: 11, color: colors.textMuted }}>
                          {skill.drillCount} reps
                        </Text>
                        {skill.notes.length > 0 && (
                          <Text style={{ fontSize: 11, color: colors.textMuted }}>
                            • {skill.notes.length} note(s)
                          </Text>
                        )}
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => handleRestoreSkill(skill.id)}
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
              onPress={handleEmptyTrash}
              style={[styles.emptyTrashButton, { backgroundColor: colors.error }]}
            >
              <Trash2 size={20} color="#FFFFFF" />
              <Text style={styles.emptyTrashText}>
                Vider la corbeille ({trashCount})
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </SafeAreaView>
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
          <>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <Dumbbell size={20} color="#EF4444" />
                <Text style={[styles.sectionHeaderTitle, { color: colors.textPrimary }]}>Mes Records</Text>
              </View>
              <TouchableOpacity
                style={[styles.addSectionBtn, { backgroundColor: '#EF444420' }]}
                onPress={() => setShowAddBenchmarkModal(true)}
              >
                <Plus size={16} color="#EF4444" strokeWidth={3} />
              </TouchableOpacity>
            </View>

            {/* Benchmarks - COMPACT VERTICAL LIST (filtered by global filter) */}
            <View style={styles.compactCardsList}>
              {filteredBenchmarks.map(renderCompactBenchmarkCard)}
              {filteredBenchmarks.length === 0 && searchQuery.trim() === '' && (
                <View style={[styles.emptyCompactCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <TrendingUp size={24} color={colors.textMuted} />
                  <Text style={[styles.emptyCompactText, { color: colors.textMuted }]}>
                    Ajoute ton premier suivi
                  </Text>
                </View>
              )}
              {/* Create custom item when search has no results */}
              {filteredBenchmarks.length === 0 && searchQuery.trim() !== '' && (
                <TouchableOpacity
                  style={[styles.createCompactCard, { backgroundColor: colors.backgroundCard, borderLeftColor: '#EF4444' }]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    setNewBenchmarkName(searchQuery.trim());
                    setSearchQuery('');
                    setShowAddBenchmarkModal(true);
                  }}
                >
                  <View style={[styles.compactCardIcon, { backgroundColor: '#EF444415' }]}>
                    <Plus size={18} color="#EF4444" strokeWidth={2.5} />
                  </View>
                  <View style={styles.compactCardContent}>
                    <Text style={[styles.compactCardName, { color: colors.textPrimary }]}>
                      Créer "{searchQuery.trim()}"
                    </Text>
                    <Text style={[styles.compactCardValue, { color: colors.textMuted }]}>
                      Nouveau suivi
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            </View>
          </>
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
                <View style={[styles.emptySkills, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
                  <Target size={40} color={colors.textMuted} />
                  <Text style={[styles.emptySkillsTitle, { color: colors.textPrimary }]}>Aucune technique</Text>
                  <Text style={[styles.emptySkillsText, { color: colors.textMuted }]}>
                    Ajoute les techniques que tu veux maîtriser
                  </Text>
                </View>
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
      {renderAddBenchmarkModal()}
      {renderAddSkillModal()}
      {renderAddEntryModal()}
      {renderBenchmarkDetailModal()}
      {renderSkillDetailModal()}
      {renderTrashModal()}

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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 10,
  },
  emptyCompactText: {
    fontSize: 13,
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
});
