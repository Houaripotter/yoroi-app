import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  ActivityIndicator,
  Modal,
  Keyboard,
  KeyboardAvoidingView,
  useWindowDimensions,
  Dimensions,
  DeviceEventEmitter,
  InteractionManager,
  UIManager,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import { impactAsync, notificationAsync, selectionAsync, ImpactFeedbackStyle, NotificationFeedbackType } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Activity,
  Dumbbell,
  Share2,
  Star,
  Plus,
  Lightbulb,
  X,
  Edit3,
  Building2,
  Sun,
  Home,
  Calendar,
  Clock,
  Camera,
  FileUp,
  Trophy,
  UserPlus,
  Minus,
  Swords,
  MapPin,
  Navigation,
  Search,
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { useTheme } from '@/lib/ThemeContext';
import { useKeyboardHeight } from '@/lib/useKeyboardHeight';
import { useBadges } from '@/lib/BadgeContext';
import { addTraining, updateTraining, getTrainingById, getClubs, Club, Exercise, CombatRound, getProfile, getTrainings, getWeights, getWeeklyPlanById, validateSlot, addWeeklyPlanItem } from '@/lib/database';
import { detectSlotPatterns } from '@/lib/slotSuggestionService';
import { checkOvertrainingAlert } from '@/lib/trainingLoadService';
import { SPORTS, getSportIcon, getSportName, getClubLogoSource } from '@/lib/sports';
import { getCurrentRank } from '@/lib/ranks';
import { getUnifiedPoints } from '@/lib/gamification';
import { useAvatar } from '@/lib/AvatarContext';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserSettings } from '@/lib/storage';
import { openBrowserAsync } from 'expo-web-browser';
import { SessionCard } from '@/components/social-cards/SessionCard';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { successHaptic, errorHaptic, lightHaptic } from '@/lib/haptics';
import { playWorkoutCompleteSound } from '@/lib/soundManager';
import { incrementReviewTrigger } from '@/lib/reviewService';
import { useReviewModal } from '@/components/ReviewModal';
import { useWatch } from '@/lib/WatchConnectivityProvider';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import logger from '@/lib/security/logger';
import { safeOpenURL } from '@/lib/security/validators';
import HealthConnect from '@/lib/healthConnect';
import * as Location from 'expo-location';
import { searchPlacesNative } from '@/lib/yoroiPlaces';
import { launchImageLibraryAsync, launchCameraAsync, requestMediaLibraryPermissionsAsync, requestCameraPermissionsAsync, MediaTypeOptions } from 'expo-image-picker';
import { SPORT_OPTIONS, DEFAULT_OPTIONS, SportOption } from '@/constants/sportOptions';
import { useI18n } from '@/lib/I18nContext';
import { backupReminderService } from '@/lib/backupReminderService';
import { exportDataToJSON } from '@/lib/exportService';

// Constants for non-theme values
const FONT_SIZE = TYPOGRAPHY.size;

// ============================================
// NOUVEL ENTRAÎNEMENT - VERSION SIMPLIFIEE
// ============================================

const LAST_SPORT_KEY = 'yoroi_last_sport';
const LAST_DURATION_KEY = 'yoroi_last_duration';
const FAVORITES_KEY = 'yoroi_favorite_sports';

export default function AddTrainingScreen() {
  const { width: SCREEN_WIDTH } = useWindowDimensions();
  const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;
  const styles = useMemo(() => createStyles(IS_SMALL_SCREEN), [IS_SMALL_SCREEN]);
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { colors, isDark, screenText } = useTheme();
  const { t } = useI18n();
  const { avatarImage: contextAvatar } = useAvatar();
  const router = useRouter();
  const { checkBadges } = useBadges();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { showReviewModal, ReviewModalComponent } = useReviewModal();
  const { syncWorkout, isWatchAvailable } = useWatch();
  const params = useLocalSearchParams<{ date?: string; editId?: string; slotId?: string; prefillSport?: string; prefillClubId?: string; prefillTime?: string; prefillDuration?: string }>();
  const isEditMode = !!params?.editId;
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<any>(null);

  // Catégories dépliées (par défaut aucune)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  // Afficher/cacher la section catégories quand sport déjà sélectionné
  const [showAddSportSection, setShowAddSportSection] = useState(false);
  // Sports favoris (persistés)
  const [favoriteSports, setFavoriteSports] = useState<string[]>([]);

  // Dernier sport utilisé (pour Quick Add)
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]); // Groupes d'exercices dépliés (fermés par défaut)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string[]>>({}); // { jjb: ['drill', 'sparring'], running: ['5k'] }
  const [validatedOptions, setValidatedOptions] = useState<Record<string, boolean>>({}); // { m_c_be: true }
  const [optionStats, setOptionStats] = useState<Record<string, {
    weight?: string,
    reps?: string,
    sets?: string,
    speed?: string,
    distance?: string,
    pente?: string,
    calories?: string,
    watts?: string,
    resistance?: string,
    duration?: string,
    notes?: string,
    stairs?: string,
    pace?: string,
    cadence?: string,
    sets_data?: { weight: string; reps: string }[], // Multi-séries musculation
  }>>({});
  const [sportEntries, setSportEntries] = useState<Record<string, string[]>>({}); // { jjb: ['Round 1: 5min', 'Guard work'], running: ['5K en 25min'] }
  const [newEntryText, setNewEntryText] = useState<Record<string, string>>({}); // Texte en cours de saisie pour chaque sport
  const [customDescription, setCustomDescription] = useState(''); // Description personnalisée
  const [customSportName, setCustomSportName] = useState(''); // Nom personnalisé pour "Autre" sport
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isOutdoor, setIsOutdoor] = useState(false);
  const [locationLat, setLocationLat] = useState<number | null>(null);
  const [locationLon, setLocationLon] = useState<number | null>(null);
  const [locationName, setLocationName] = useState<string>('');
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationNoResults, setLocationNoResults] = useState(false);
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{ name: string; address: string; lat: number; lon: number }>>([]);

  // Compatibilité avec l'ancien code
  const selectedSport = selectedSports[0] || 'jjb';
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startTime, setStartTime] = useState(() => {
    const now = new Date();
    now.setMinutes(0, 0, 0);
    return now;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [duration, setDuration] = useState(60);
  const [distance, setDistance] = useState<string>(''); // Nouveau: Distance en km
  const [speed, setSpeed] = useState<string>(''); // Nouveau: Vitesse (km/h)
  const [calories, setCalories] = useState<string>(''); // Nouveau: Calories
  const [intensity, setIntensity] = useState<number>(5); // RPE 1-10
  const [pente, setPente] = useState<string>(''); // Pour Tapis (Technogym/Matrix)
  const [resistance, setResistance] = useState<string>(''); // Pour Vélo/Elliptique
  const [watts, setWatts] = useState<string>(''); // Puissance
  const [cadence, setCadence] = useState<string>(''); // RPM
  const [rounds, setRounds] = useState<string>(''); // Nombre de rounds
  const [roundDuration, setRoundDuration] = useState<string>('5'); // Minutes par round
  const [combatRounds, setCombatRounds] = useState<CombatRound[]>([]); // Detailed round tracking
  const [showCombatRounds, setShowCombatRounds] = useState(false); // Toggle detailed view
  const [technicalTheme, setTechnicalTheme] = useState(''); // Thème technique travaillé (ex: "Triangle", "Passage de garde")
  const [notes, setNotes] = useState('');
  // Game Plan & Bilan (combat sports - step 4)
  const [gamePlan, setGamePlan] = useState('');
  const [whatWorked, setWhatWorked] = useState('');
  const [whatDidntWork, setWhatDidntWork] = useState('');
  const [sessionRating, setSessionRating] = useState<number | null>(null);
  const [sessionMood, setSessionMood] = useState<string>('');
  // Multi-select tags pour chaque champ
  const [gamePlanTags, setGamePlanTags] = useState<string[]>([]);
  const [whatWorkedTags, setWhatWorkedTags] = useState<string[]>([]);
  const [whatDidntWorkTags, setWhatDidntWorkTags] = useState<string[]>([]);

  const GAME_PLAN_TEMPLATES = [
    'Jeu de garde', 'Imposer le rythme', 'Rester en mouvement', 'Chercher les finitions',
    'Défense en priorité', 'Jeu au sol', 'Clinch', 'Contrôle de distance',
    'Contre-attaque', 'Jeu de jambes', 'Passer la garde', 'Travailler le dos',
    'Takedowns', 'Jeu debout', 'Travail de position',
  ];
  const WHAT_WORKED_TEMPLATES = [
    'Jeu de garde', 'Mes takedowns', 'Mes finitions', 'Ma défense',
    'Mon timing', 'Mon cardio', 'Mes sweeps', 'Garde passée',
    'Entrées de jambe', 'Dos pris', 'Clinch', 'Jeu debout',
    'Contrôle de position', 'Soumissions', 'Points marqués',
  ];
  const WHAT_DIDNT_WORK_TEMPLATES = [
    'Ma garde', 'Mes takedowns', 'Mes finitions', 'Mon cardio',
    'Mon timing', 'Gestion des distances', 'Défense soumissions',
    'Jeu debout', 'Dos exposé', 'Garde percée', 'Manque d\'explosivité',
    'Manque de précision', 'Gestion du stress', 'Positionnement',
  ];

  // Combat submission options
  const COMBAT_METHODS = [
    // Étranglements arrière
    'RNC', 'Bow & Arrow', 'Loop Choke', 'Ezekiel',
    // Étranglements avant
    'Guillotine', 'Arm-In Guillotine', 'High Elbow Guillotine', 'Darce', 'Anaconda',
    'Cross Choke', 'Baseball Choke', 'Papercutter', 'Clock Choke', 'North-South Choke',
    // Triangles
    'Triangle', 'Triangle Inversé', 'Triangle Bras',
    // Clés de bras
    'Armbar', 'Kimura', 'Omoplata', 'Americana', 'Wristlock',
    // Clés de jambes
    'Heel Hook', 'Inside Heel Hook', 'Outside Heel Hook', 'Ankle Lock', 'Kneebar', 'Toe Hold',
    // Résultats de combat
    'Points', 'Avantage', 'KO/TKO', 'Décision', 'Disqualification',
    // Autre (personnalisé)
    'Autre',
  ];

  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [techniqueRating, setTechniqueRating] = useState<number | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationStep, setValidationStep] = useState(2); // Étape de validation: 2 = aperçu initial, 3 = aperçu avec photo, 4 = partage final
  const [showPhotoChoiceModal, setShowPhotoChoiceModal] = useState(false);
  const [cardBackgroundImage, setCardBackgroundImage] = useState<string | null>(null);
  const [showHouariRateModal, setShowHouariRateModal] = useState(false);
  const [lastSavedTrainingId, setLastSavedTrainingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // Barre de recherche (sport/exercice)
  const [clubSearchQuery, setClubSearchQuery] = useState(''); // Recherche dans la liste des clubs
  const [userName, setUserName] = useState<string>('Champion');
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [yearlyCount, setYearlyCount] = useState<number>(0);
  const [yearlyObjective, setYearlyObjective] = useState<number>(365);
  const [monthlyCount, setMonthlyCount] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);
  const [heartRate, setHeartRate] = useState<string>('');
  const [scoreHome, setScoreHome] = useState<string>('');
  const [scoreAway, setScoreAway] = useState<string>('');
  const [userWeight, setUserWeight] = useState<number>(75); // Poids par défaut
  // Musculation — perf précédente par exercice (label → data) pour affichage "Dernière fois"
  const [lastExercisePerf, setLastExercisePerf] = useState<Record<string, {
    date: string;
    sets: { weight: number; reps: number }[];
    best1RM: number;
  }>>({});
  // Musculation — meilleur 1RM all-time par exercice (pour détection PR)
  const [allTimeBest1RM, setAllTimeBest1RM] = useState<Record<string, number>>({});
  const [userAvatar, setUserAvatar] = useState<any>(null);
  const [userRank, setUserRank] = useState<string>('Ashigaru');
  const [userLevel, setUserLevel] = useState<number>(0);
  const [primarySportForObjective, setPrimarySportForObjective] = useState<string>('');
  const [primarySportError, setPrimarySportError] = useState<boolean>(false);
  const sportSelectorRef = useRef<View>(null);
  const [currentStep, setCurrentStep] = useState(1);
  // Chronomètre repos musculation : { exId_setIdx → secondes restantes }
  const [restTimers, setRestTimers] = useState<Record<string, number>>({});
  const restIntervalRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const isCombatSport = selectedSports.some(s => ['jjb', 'mma', 'boxe', 'muay_thai', 'lutte', 'karate', 'sambo', 'judo', 'grappling', 'kickboxing', 'krav_maga', 'catch', 'boxe_francaise', 'taekwondo'].includes(s));
  const totalSteps = isCombatSport ? 6 : 4;
  const isMountedRef = useRef(true);
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      // Nettoyer tous les timers repos
      Object.values(restIntervalRef.current).forEach(clearInterval);
    };
  }, []);

  // Toggle un tag dans une liste et synchronise le champ texte libre
  const toggleTag = (
    tag: string,
    tags: string[],
    setTags: (t: string[]) => void,
    setText: (s: string) => void,
  ) => {
    const next = tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag];
    setTags(next);
    setText(next.join(', '));
    impactAsync(ImpactFeedbackStyle.Light);
  };

  const goToStep = (n: number) => {
    setCurrentStep(n);
    setTimeout(() => scrollViewRef.current?.scrollTo({ y: 0, animated: false }), 50);
  };

  // Charger les favoris
  useEffect(() => {
    AsyncStorage.getItem(FAVORITES_KEY).then(saved => {
      if (saved) setFavoriteSports(JSON.parse(saved));
    }).catch(() => {});
  }, []);

  // Charger les données utilisateur
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [profile, allTrainings, weights] = await Promise.all([
          getProfile(),
          getTrainings(),
          getWeights(),
        ]);

        if (profile) {
          setUserName(profile.name);
          setUserGender(profile.avatar_gender === 'femme' ? 'female' : 'male');
          if (profile.profile_photo) setUserPhoto(profile.profile_photo);
        } else {
          const settings = await getUserSettings();
          if (settings.username) setUserName(settings.username);
          if (settings.gender) setUserGender(settings.gender);
        }

        // Charger le dernier poids
        if (weights && weights.length > 0) {
          setUserWeight(weights?.[0]?.weight || 75);
        }

        // Calculer les perfs précédentes de musculation (pour affichage "Dernière fois" + 1RM)
        // allTrainings est trié DESC par date — la première occurrence d'un exo = la plus récente
        const lastPerf: Record<string, { date: string; sets: { weight: number; reps: number }[]; best1RM: number }> = {};
        const allBest: Record<string, number> = {};
        const calc1RM = (w: number, r: number) => r > 1 && r <= 15 ? Math.round(w * (1 + r / 30) * 2) / 2 : 0;
        for (const t of allTrainings) {
          if (!t.exercises || !Array.isArray(t.exercises)) continue;
          for (const ex of t.exercises as any[]) {
            const label: string = ex.name;
            if (!label) continue;
            const rawSets: { weight: number; reps: number }[] =
              ex.setsData && ex.setsData.length > 0
                ? ex.setsData
                : ex.weight && ex.reps ? [{ weight: ex.weight, reps: ex.reps }] : [];
            if (rawSets.length === 0) continue;
            // All-time best 1RM
            for (const s of rawSets) {
              const orm = calc1RM(s.weight, s.reps);
              if (orm > 0 && (allBest[label] === undefined || orm > allBest[label])) {
                allBest[label] = orm;
              }
            }
            // Last perf (première occurrence = plus récente, trainings triés DESC)
            if (!lastPerf[label]) {
              const best1RM = rawSets.reduce((m, s) => Math.max(m, calc1RM(s.weight, s.reps)), 0);
              lastPerf[label] = { date: t.date, sets: rawSets.map(s => ({ weight: s.weight, reps: s.reps })), best1RM };
            }
          }
        }
        setLastExercisePerf(lastPerf);
        setAllTimeBest1RM(allBest);

        // Avatar charge via useAvatar() context
        if (contextAvatar) {
          setUserAvatar(contextAvatar);
        }

        // Charger le rang et le niveau (base sur les XP totaux)
        const totalPoints = await getUnifiedPoints();
        const rank = getCurrentRank(totalPoints);
        setUserRank(rank.name);
        setUserLevel(totalPoints);

        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();
        
        // Calculer début de semaine (Lundi)
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay();
        const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
        startOfWeek.setDate(diff);
        startOfWeek.setHours(0, 0, 0, 0);

        const trainingsList = allTrainings || [];

        // 1. Compteur annuel
        const thisYearTrainings = trainingsList.filter((t: any) => 
          new Date(t.date).getFullYear() === currentYear
        );
        setYearlyCount(thisYearTrainings.length + 1);

        // 2. Compteur mensuel
        const thisMonthTrainings = trainingsList.filter((t: any) => {
          const d = new Date(t.date);
          return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });
        setMonthlyCount(thisMonthTrainings.length + 1);

        // 3. Compteur hebdomadaire
        const thisWeekTrainings = trainingsList.filter((t: any) => 
          new Date(t.date) >= startOfWeek
        );
        setWeeklyCount(thisWeekTrainings.length + 1);

      } catch (e) {
        const settings = await getUserSettings();
        if (settings.username) setUserName(settings.username);
      }
    };
    loadUserData();
  }, []);

  // Recalculer l'objectif quand le club change
      useEffect(() => {
        const updateContextualData = async () => {
          try {
            const allTrainings = await getTrainings() || [];
            const currentYear = new Date().getFullYear();
            const today = new Date();        const startOfYear = new Date(currentYear, 0, 1);
        const daysElapsed = Math.floor((today.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        // 1. Compter les jours uniques au TOTAL (tous sports)
        const totalUniqueDays = new Set(allTrainings
          .filter((t: any) => new Date(t.date).getFullYear() === currentYear)
          .map((t: any) => new Date(t.date).toISOString().split('T')[0])
        );
        const totalCount = Math.min(totalUniqueDays.size + 1, daysElapsed);

        let sportCount = 0;
        let objective = 3 * 52; // défaut 3x/semaine

        if (selectedClub) {
          const clubTrainings = allTrainings.filter((t: any) => {
            const tDate = new Date(t.date);
            return t.club_id === selectedClub.id && tDate.getFullYear() === currentYear;
          });
          const sportUniqueDays = new Set(clubTrainings.map((t: any) => new Date(t.date).toISOString().split('T')[0]));
          sportCount = Math.min(sportUniqueDays.size + 1, daysElapsed);
          objective = (selectedClub.sessions_per_week || 3) * 52;
        } else if (selectedSports.length > 0) {
          // Si un sport principal est défini (multi-sports), filtrer uniquement sur celui-ci
          const targetSports = primarySportForObjective ? [primarySportForObjective] : selectedSports;
          const sportTrainings = allTrainings.filter((t: any) => {
            const tDate = new Date(t.date);
            if (tDate.getFullYear() !== currentYear) return false;
            const tSports = t.sport ? t.sport.split(',').map((s: string) => s.trim()) : [];
            return tSports.some((s: string) => targetSports.includes(s));
          });
          const sportUniqueDays = new Set(sportTrainings.map((t: any) => new Date(t.date).toISOString().split('T')[0]));
          sportCount = Math.min(sportUniqueDays.size + 1, daysElapsed);
          objective = 365;
        }

        setYearlyCount(sportCount); // On garde sportCount comme valeur principale
        setYearlyObjective(objective);
        // On peut stocker le totalCount dans un état si on veut l'afficher spécifiquement
        // Pour l'instant on va utiliser yearlyCount pour le sport et safeObjective pour le but perso

      } catch (error) {
        logger.error("Erreur calcul compteurs:", error);
      }
    };

    updateContextualData();
  // JSON.stringify stabilise le tableau — évite les re-triggers quand la référence change sans que les valeurs changent
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedClub?.id, JSON.stringify(selectedSports), primarySportForObjective]);

  // Calculer heure de fin
  const calculateEndTime = (): string => {
    const end = new Date(startTime.getTime() + duration * 60 * 1000);
    return end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  // Parse date from params if provided
  useEffect(() => {
    if (params?.date) {
      try {
        const parsedDate = new Date(params.date + 'T12:00:00');
        // Validation robuste: vérifier que c'est une vraie date et dans une plage raisonnable
        if (!isNaN(parsedDate.getTime()) && parsedDate.getFullYear() > 2000 && parsedDate.getFullYear() < 2100) {
          setDate(parsedDate);
        } else {
          logger.warn('Date invalide reçue dans params:', params.date);
        }
      } catch (error) {
        logger.error('Erreur parsing date:', error);
      }
    }
  }, [params?.date]);

  // Charger la séance existante en mode edition
  useEffect(() => {
    if (!params?.editId) return;
    const loadEditData = async () => {
      try {
        const id = parseInt(params.editId!, 10);
        if (isNaN(id)) return;
        const training = await getTrainingById(id);
        if (!training) return;
        if (training.sport) {
          const sports = training.sport.split(',');
          setSelectedSports(sports);
        }
        if (training.date) {
          const parsed = new Date(training.date + 'T12:00:00');
          if (!isNaN(parsed.getTime())) setDate(parsed);
        }
        if (training.duration_minutes) setDuration(training.duration_minutes);
        if (training.start_time) {
          const [h, m] = training.start_time.split(':').map(Number);
          const t = new Date();
          t.setHours(h, m, 0, 0);
          setStartTime(t);
        }
        if (training.notes) setNotes(training.notes);
        if (training.distance) setDistance(String(training.distance));
        if (training.speed) setSpeed(String(training.speed));
        if (training.calories) setCalories(String(training.calories));
        if (training.intensity) setIntensity(training.intensity);
        if (training.pente) setPente(String(training.pente));
        if (training.resistance) setResistance(String(training.resistance));
        if (training.watts) setWatts(String(training.watts));
        if (training.cadence) setCadence(String(training.cadence));
        if (training.rounds) setRounds(String(training.rounds));
        if (training.round_duration) setRoundDuration(String(training.round_duration));
        if (training.heart_rate) setHeartRate(String(training.heart_rate));
        if (training.technique_rating) setTechniqueRating(training.technique_rating);
        if (training.technical_theme) setTechnicalTheme(training.technical_theme);
        if (training.is_outdoor) setIsOutdoor(true);
        if (training.location_lat != null) setLocationLat(training.location_lat);
        if (training.location_lon != null) setLocationLon(training.location_lon);
        if (training.location_name) setLocationName(training.location_name);
        if (training.muscles) setSelectedMuscles(training.muscles.split(','));
        if (training.exercises) setExercises(training.exercises);
        if (training.club_id) {
          const allClubs = await getClubs();
          const club = allClubs.find(c => c.id === training.club_id);
          if (club) setSelectedClub(club);
        }
        // En mode édition, aller directement à l'étape 2
        setCurrentStep(2);
      } catch (error) {
        logger.error('Erreur chargement séance edit:', error);
      }
    };
    loadEditData();
  }, [params?.editId]);

  // Pre-remplissage depuis un creneau regulier
  useEffect(() => {
    if (!params?.slotId && !params?.prefillSport) return;
    const prefillFromSlot = async () => {
      try {
        if (params.slotId) {
          const slotIdNum = parseInt(params.slotId, 10);
          if (!isNaN(slotIdNum)) {
            const slot = await getWeeklyPlanById(slotIdNum);
            if (slot) {
              setSelectedSports([slot.sport]);
              if (slot.duration_minutes) setDuration(slot.duration_minutes);
              if (slot.time) {
                const [h, m] = slot.time.split(':').map(Number);
                const t = new Date();
                t.setHours(h, m, 0, 0);
                setStartTime(t);
              }
              if (slot.club_id) {
                const allClubs = await getClubs();
                const club = allClubs.find(c => c.id === slot.club_id);
                if (club) setSelectedClub(club);
              }
            }
          }
        } else {
          // Prefill from individual params
          if (params.prefillSport) setSelectedSports([params.prefillSport]);
          if (params.prefillDuration) setDuration(parseInt(params.prefillDuration, 10) || 60);
          if (params.prefillTime) {
            const [h, m] = params.prefillTime.split(':').map(Number);
            const t = new Date();
            t.setHours(h, m, 0, 0);
            setStartTime(t);
          }
          if (params.prefillClubId) {
            const allClubs = await getClubs();
            const club = allClubs.find(c => c.id === parseInt(params.prefillClubId!, 10));
            if (club) setSelectedClub(club);
          }
        }
        // Sport pré-rempli → aller à l'étape 2 directement
        setCurrentStep(2);
      } catch (error) {
        logger.error('Erreur prefill slot:', error);
      }
    };
    prefillFromSlot();
  }, [params?.slotId, params?.prefillSport]);

  // Charger le dernier sport utilisé (pour Quick Add seulement, PAS de pré-sélection)
  useEffect(() => {
    const loadLastSport = async () => {
      try {
        const saved = await AsyncStorage.getItem(LAST_SPORT_KEY);
        const savedDuration = await AsyncStorage.getItem(LAST_DURATION_KEY);
        if (saved) {
          // Dernier sport chargé
        }
        if (savedDuration) {
          setDuration(parseInt(savedDuration));
        }
      } catch (e) {
        // ignore
      }
    };
    loadLastSport();
  }, []);

  // CALCUL AUTOMATIQUE DES CALORIES (ESTIMATION)
  useEffect(() => {
    if (!userWeight || duration <= 0) return;

    let met = 0;
    const hours = duration / 60;

    // 1. Logique Tapis de Course (Running / Marche)
    if (selectedSports.includes('running') || selectedSports.includes('marche')) {
      const speedVal = parseFloat(speed.replace(',', '.'));
      const penteVal = parseFloat(pente.replace(',', '.'));
      
      if (speedVal) {
        // Formule de Léger: MET = 1.6 + (0.32 * speed_kmh) + (0.012 * speed_kmh * incline_percent)
        // Simplifiée :
        if (speedVal < 5) met = 3.5; // Marche lente
        else if (speedVal < 8) met = 5.0; // Marche rapide / Jogging très lent
        else if (speedVal < 10) met = 9.0; // Jogging
        else if (speedVal < 12) met = 10.5; // Course
        else met = 12.0; // Course rapide

        // Bonus pente : +0.5 MET par 2% environ
        if (penteVal) {
          met += (penteVal * 0.3);
        }
      } else {
        // Pas de vitesse, estimation basique
        met = selectedSports.includes('running') ? 8.0 : 3.5;
      }
    } 
    // 2. Logique Vélo
    else if (selectedSports.includes('velo')) {
      const wattsVal = parseInt(watts);
      if (wattsVal) {
        // Formule approximative : Kcal/h ≈ Watts * 3.6
        // MET = Kcal/h / weight
        const kcalPerHour = wattsVal * 3.6;
        met = kcalPerHour / userWeight;
      } else {
        met = 7.0; // Vélo modéré par défaut
      }
    }
    // 3. Logique Autres Machines Cardio
    else if (selectedSports.includes('cardio')) {
      // Rameur, Elliptique, Stairmaster...
      met = 8.0; 
    }
    // 4. Logique Musculation / Fitness
    else if (selectedSports.includes('musculation') || selectedSports.includes('fitness')) {
      // Poids et intensité
      met = 4.5; // Musculation standard
      if (intensity >= 8) met = 6.0; // Haute intensité
    }
    // 5. Sports de Combat
    else if (selectedSports.some(s => ['jjb', 'judo', 'lutte', 'mma', 'boxe', 'muay_thai'].includes(s))) {
      met = 10.0; // Combat général
      if (intensity < 5) met = 7.0; // Technique
      if (rounds && parseInt(rounds) > 0) met = 12.0; // Sparring
    }
    // 6. Défaut
    else {
      met = 5.0;
    }

    // Formule : KCAL = MET * Poids (kg) * Durée (h)
    const estimatedCalories = Math.round(met * userWeight * hours);
    setCalories(estimatedCalories.toString());

  }, [duration, speed, pente, watts, userWeight, selectedSports, intensity, rounds]);

  // Sauvegarder le sport et durée quand on enregistre
  const saveLastSportAndDuration = async (sport: string, dur: number) => {
    try {
      await AsyncStorage.setItem(LAST_SPORT_KEY, sport);
      await AsyncStorage.setItem(LAST_DURATION_KEY, dur.toString());
    } catch (error) {
      logger.error('Erreur sauvegarde dernier sport:', error);
    }
  };

  // Timer debounce pour la recherche auto
  const locationDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchLocationRef = useRef<((query: string) => Promise<void>) | undefined>(undefined);

  // Recherche de lieu — TOUS les moteurs en PARALLÈLE (plus de fallbacks séquentiels)
  // 1. Photon (komoot) — OSM full-text, biais France
  // 2. Overpass API — clubs/salles sport OSM
  // 3. MKLocalSearch natif iOS (Apple Maps) — excellent pour les salles françaises
  // 4. Nominatim — OSM texte avec restriction France
  const searchLocation = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setLocationSuggestions([]);
      setLocationNoResults(false);
      return;
    }
    setLocationNoResults(false);
    setLocationLoading(true);
    try {
      type Suggestion = { name: string; address: string; lat: number; lon: number };
      const encoded = encodeURIComponent(query.trim());

      // Centre géographique de la France — biais Photon pour éviter les résultats hors-France
      const FRANCE_LAT = 46.2276;
      const FRANCE_LON = 2.2137;

      const photonController = new AbortController();
      const photonTimeout = setTimeout(() => photonController.abort(), 8000);
      const overpassController = new AbortController();
      const overpassTimeout = setTimeout(() => overpassController.abort(), 20000);
      const nominatimController = new AbortController();
      const nominatimTimeout = setTimeout(() => nominatimController.abort(), 8000);

      // Photon avec biais France (lat/lon + location_bias_scale)
      const photonUrl = `https://photon.komoot.io/api/?q=${encoded}&limit=20&lang=fr&lat=${FRANCE_LAT}&lon=${FRANCE_LON}&location_bias_scale=0.5`;

      // Overpass — salles de sport par nom
      const safeQuery = query.trim().replace(/["\\\[\](){}^$.*+?|]/g, '\\$&');
      const overpassQuery = `[out:json][timeout:20];(node["name"~"${safeQuery}","i"]["leisure"~"sports_centre|fitness_centre"];node["name"~"${safeQuery}","i"]["amenity"~"gym|dojo|sports_hall"];node["name"~"${safeQuery}","i"]["sport"];way["name"~"${safeQuery}","i"]["leisure"~"sports_centre|fitness_centre"];way["name"~"${safeQuery}","i"]["amenity"~"gym|dojo|sports_hall"];);out center 30;`;
      const overpassUrl = `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(overpassQuery)}`;

      // Nominatim avec restriction France
      const nominatimUrl = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=15&addressdetails=1&countrycodes=fr`;

      // TOUS en parallèle — on n'attend pas qu'un moteur échoue avant d'essayer le suivant
      const [photonRes, overpassRes, nominatimRes, nativeResults] = await Promise.allSettled([
        fetch(photonUrl, { signal: photonController.signal }),
        fetch(overpassUrl, { signal: overpassController.signal }),
        fetch(nominatimUrl, { headers: { 'User-Agent': 'YoroiApp/1.0' }, signal: nominatimController.signal }),
        searchPlacesNative(query.trim(), FRANCE_LAT, FRANCE_LON), // Apple Maps avec biais France
      ]);
      clearTimeout(photonTimeout);
      clearTimeout(overpassTimeout);
      clearTimeout(nominatimTimeout);

      const allSuggestions: Suggestion[] = [];

      // Photon
      if (photonRes.status === 'fulfilled' && photonRes.value.ok) {
        try {
          const data = await photonRes.value.json();
          (data?.features ?? [])
            .filter((f: any) => f.geometry?.coordinates && f.properties?.name)
            .forEach((f: any) => {
              const p = f.properties ?? {};
              const addrParts = [
                p.housenumber ? `${p.housenumber} ${p.street || ''}`.trim() : p.street,
                p.city || p.town || p.village,
                p.postcode,
                p.country,
              ].filter(Boolean);
              allSuggestions.push({
                name: p.name,
                address: addrParts.join(', '),
                lat: f.geometry.coordinates[1],
                lon: f.geometry.coordinates[0],
              });
            });
        } catch { /* silence */ }
      }

      // Overpass
      if (overpassRes.status === 'fulfilled' && overpassRes.value.ok) {
        try {
          const data = await overpassRes.value.json();
          (data?.elements ?? []).forEach((el: any) => {
            if (!el.tags?.name) return;
            const lat = el.lat ?? el.center?.lat;
            const lon = el.lon ?? el.center?.lon;
            if (!lat || !lon) return;
            const addrParts = [
              el.tags?.['addr:housenumber'] && el.tags?.['addr:street']
                ? `${el.tags['addr:housenumber']} ${el.tags['addr:street']}`
                : el.tags?.['addr:street'],
              el.tags?.['addr:city'],
              el.tags?.['addr:postcode'],
              el.tags?.['addr:country'],
            ].filter(Boolean);
            allSuggestions.push({ name: el.tags.name, address: addrParts.join(', '), lat, lon });
          });
        } catch { /* silence */ }
      }

      // Nominatim
      if (nominatimRes.status === 'fulfilled' && nominatimRes.value.ok) {
        try {
          const data2 = await nominatimRes.value.json();
          if (Array.isArray(data2)) {
            data2.forEach((item: any) => {
              const addr = item.address || {};
              const name = item.name || addr.amenity || addr.leisure || item.display_name?.split(',')[0] || query.trim();
              const addrParts = [addr.road, addr.city || addr.town || addr.village, addr.postcode].filter(Boolean);
              allSuggestions.push({ name, address: addrParts.join(', '), lat: parseFloat(item.lat), lon: parseFloat(item.lon) });
            });
          }
        } catch { /* silence */ }
      }

      // Apple Maps natif (MKLocalSearch)
      if (nativeResults.status === 'fulfilled' && nativeResults.value.length > 0) {
        nativeResults.value.forEach((r) => allSuggestions.push(r));
      }

      // Déduplication par position géographique (rayon ~100m)
      const seen = new Set<string>();
      const suggestions: Suggestion[] = [];
      allSuggestions.forEach((s) => {
        const key = `${s.name.toLowerCase().slice(0, 20)}|${s.lat.toFixed(2)}|${s.lon.toFixed(2)}`;
        if (!seen.has(key)) {
          seen.add(key);
          suggestions.push(s);
        }
      });
      const finalSuggestions = suggestions.slice(0, 25);

      if (finalSuggestions.length > 0) {
        setLocationSuggestions(finalSuggestions);
        setLocationNoResults(false);
      } else {
        // Dernier recours — geocodeur Apple natif
        try {
          const geoResults = await Location.geocodeAsync(query.trim());
          if (geoResults.length > 0) {
            setLocationSuggestions(geoResults.map(r => ({
              name: query.trim(),
              address: '',
              lat: r.latitude,
              lon: r.longitude,
            })));
            setLocationNoResults(false);
          } else {
            setLocationSuggestions([]);
            setLocationNoResults(true);
          }
        } catch {
          setLocationSuggestions([]);
          setLocationNoResults(true);
        }
      }
    } catch {
      setLocationSuggestions([]);
      setLocationNoResults(true);
    } finally {
      setLocationLoading(false);
    }
  };

  // Toujours pointer vers la dernière version de searchLocation
  searchLocationRef.current = searchLocation;

  // Recherche automatique avec debounce 300ms pendant la frappe
  const onLocationTextChange = (text: string) => {
    setLocationName(text);
    setLocationNoResults(false);
    if (locationDebounceRef.current) clearTimeout(locationDebounceRef.current);
    if (!text || text.trim().length < 2) {
      setLocationLat(null);
      setLocationLon(null);
      setLocationSuggestions([]);
      return;
    }
    locationDebounceRef.current = setTimeout(() => {
      searchLocationRef.current?.(text);
    }, 400);
  };

  // Ouvrir l'adresse dans Apple Maps ou Google Maps
  const openInMaps = async (provider: 'apple' | 'google') => {
    const query = locationName.trim();
    if (!query) return;
    let url: string;
    if (provider === 'apple') {
      if (locationLat && locationLon) {
        url = `maps://maps.apple.com/?ll=${locationLat},${locationLon}&q=${encodeURIComponent(query)}`;
      } else {
        url = `maps://maps.apple.com/?q=${encodeURIComponent(query)}`;
      }
    } else {
      if (locationLat && locationLon) {
        url = `https://www.google.com/maps/search/?api=1&query=${locationLat},${locationLon}`;
      } else {
        url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
      }
    }
    await safeOpenURL(url);
  };

  // Capturer GPS actuel
  const captureGPS = async () => {
    try {
      setLocationLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        showPopup('GPS', 'Permission refusée. Active la localisation dans les réglages.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setLocationLat(loc.coords.latitude);
      setLocationLon(loc.coords.longitude);
      setLocationSuggestions([]);
      try {
        const [place] = await Location.reverseGeocodeAsync({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
        if (place) {
          const parts = [place.name, place.street, place.city].filter(Boolean);
          setLocationName(parts.slice(0, 2).join(', ') || '');
        }
      } catch { /* géocodage inverse optionnel */ }
      selectionAsync();
    } catch {
      showPopup('GPS', 'Impossible de récupérer ta position GPS.');
    } finally {
      setLocationLoading(false);
    }
  };

  // Toggle une catégorie
  const toggleCategory = (category: string) => {
    setExpandedCategories(prev =>
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    );
  };

  // Toggle un sport (sélection multiple)
  const toggleSport = (sportId: string) => {
    setSelectedSports(prev => {
      if (prev.includes(sportId)) {
        // Retirer le sport (peut retirer tous les sports)
        const newSports = prev.filter(s => s !== sportId);
        // Mettre à jour le sport principal si nécessaire
        if (primarySportForObjective === sportId && newSports.length > 0) {
          setPrimarySportForObjective(newSports[0]);
        } else if (newSports.length === 0) {
          setPrimarySportForObjective('');
        }
        // Nettoyer les options et entrées de ce sport
        setSelectedOptions(opts => {
          const newOpts = { ...opts };
          delete newOpts[sportId];
          return newOpts;
        });
        setSportEntries(entries => {
          const newEntries = { ...entries };
          delete newEntries[sportId];
          return newEntries;
        });
        // Reset custom sport name si on retire "autre"
        if (sportId === 'autre') {
          setCustomSportName('');
        }
        return newSports;
      } else {
        // Ajouter le sport (max 3)
        if (prev.length >= 3) return prev;

        // Rediriger vers l'écran dédié pour les sports de combat
        const sportObj = SPORTS.find(s => s.id === sportId);
        if (sportObj && (sportObj.category === 'combat_striking' || sportObj.category === 'combat_grappling')) {
          const matchingClub = clubs.find(club => {
            if (!club.sport) return false;
            return club.sport.split(',').map((s: string) => s.trim().toLowerCase()).includes(sportId.toLowerCase());
          });
          router.push({
            pathname: '/add-combat-session',
            params: {
              sport: sportId,
              ...(params?.date ? { date: params.date } : {}),
              ...(matchingClub ? { clubId: String(matchingClub.id) } : {}),
            },
          } as any);
          return prev; // ne pas modifier la sélection, on quitte l'écran
        }

        // FERMER TOUTES LES CATÉGORIES et cacher la section quand on sélectionne un sport
        setExpandedCategories([]);
        setShowAddSportSection(false);

        // Sélection automatique du club correspondant au sport
        const matchingClub = clubs.find(club => {
          if (!club.sport) return false;
          const clubSports = club.sport.split(',').map((s: string) => s.trim().toLowerCase());
          return clubSports.includes(sportId.toLowerCase());
        });

        if (matchingClub) {
          setSelectedClub(matchingClub);
        }

        // Scroller vers le haut pour voir le sport sélectionné
        setTimeout(() => {
          scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }, 100);

        return [...prev, sportId];
      }
    });
  };

  // Toggle favori (long press sur un sport)
  const toggleFavorite = async (sportId: string) => {
    const newFavs = favoriteSports.includes(sportId)
      ? favoriteSports.filter(s => s !== sportId)
      : [...favoriteSports, sportId];
    setFavoriteSports(newFavs);
    await AsyncStorage.setItem(FAVORITES_KEY, JSON.stringify(newFavs)).catch(() => {});
    lightHaptic();
  };

  // Toggle une option pour un sport
  const toggleOption = (sportId: string, optionId: string) => {
    setSelectedOptions(prev => {
      const currentOptions = prev[sportId] || [];
      if (currentOptions.includes(optionId)) {
        return {
          ...prev,
          [sportId]: currentOptions.filter(o => o !== optionId),
        };
      } else {
        return {
          ...prev,
          [sportId]: [...currentOptions, optionId],
        };
      }
    });
  };

  // Toggle l'affichage d'un groupe d'options (ex: PECTORAUX)
  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev =>
      prev.includes(groupId)
        ? prev.filter(g => g !== groupId)
        : [...prev, groupId]
    );
  };

  // Tracker la position de scroll courante pour le calcul de défilement clavier
  const currentScrollY = useRef(0);

  // Helper: Scroller vers l'input focalisé quand le clavier apparaît
  // event.target = native view tag (number) → utiliser UIManager.measureInWindow
  const scrollToFocusedInput = useCallback((event: any) => {
    if (!scrollViewRef.current) return;
    const nodeTag = event.target;
    if (nodeTag == null) return;
    setTimeout(() => {
      try {
        UIManager.measureInWindow(nodeTag, (x: number, y: number, w: number, h: number) => {
          if (h <= 0) return;
          // Hauteur clavier réelle approximée selon OS/device
          const kbHeight = Platform.OS === 'ios' ? 346 : 290;
          const windowH = Dimensions.get('window').height;
          const visibleBottom = windowH - kbHeight - 16;
          const inputBottom = y + h;
          if (inputBottom > visibleBottom) {
            const scrollAmount = inputBottom - visibleBottom + 80; // 80px de marge confortable
            scrollViewRef.current?.scrollTo({
              y: Math.max(0, currentScrollY.current + scrollAmount),
              animated: true,
            });
          }
        });
      } catch {
        // Silencieux si UIManager échoue (simulateur, etc.)
      }
    }, 350);
  }, []);

  // Obtenir les options pour un sport
  const getOptionsForSport = (sportId: string): SportOption[] => {
    return SPORT_OPTIONS[sportId] || DEFAULT_OPTIONS;
  };

  // Détecter si un élément cardio est sélectionné (pour afficher les stats machine)
  const hasCardioSelected = () => {
    const cardioSports = ['running', 'velo', 'natation', 'marche', 'trail', 'treadmill', 'elliptical', 'walking_pad', 'spinning', 'aquabike'];
    if (selectedSports.some(s => cardioSports.includes(s))) return true;
    
    // Vérifier les options spécifiques (ex: Cardio dans Musculation)
    for (const sportId of selectedSports) {
      const opts = selectedOptions[sportId] || [];
      if (opts.some(o => o.includes('car_') || o.includes('run_') || o.includes('swim_') || o.includes('bike_'))) return true;
    }
    return false;
  };

  // Calcul automatique des calories (simplifié)
  const calculateCalories = () => {
    const distNum = parseFloat(distance.replace(',', '.'));
    const speedNum = parseFloat(speed.replace(',', '.')) || 5;
    const weightNum = userWeight || 75;
    if (!distNum && !duration) return;

    let calculated = 0;
    // Formule simplifiée MET
    if (selectedSports.includes('running') || selectedSports.includes('trail')) {
      calculated = distNum * weightNum; 
    } else if (selectedSports.includes('marche')) {
      calculated = distNum * weightNum * 0.5;
    } else {
      // Base temps si pas de distance
      calculated = (duration || 30) * 7; 
    }

    if (calculated > 0) {
      setCalories(Math.round(calculated).toString());
      impactAsync(ImpactFeedbackStyle.Light);
    }
  };

  const renderPerformanceFields = (exerciseId: string, label: string, sportId: string) => {
    const stats = optionStats[exerciseId] || {};

    // Detect exercise type for sport-specific metrics
    const isRower = exerciseId.includes('row') || exerciseId.includes('rameur') || label.toLowerCase().includes('rameur');
    const isSwimming = sportId === 'natation' || exerciseId.includes('swim') || exerciseId.includes('sw_');
    const isBikeExercise = exerciseId.includes('bik') || exerciseId.includes('ve_') || exerciseId.includes('spinning') || exerciseId.includes('zwift') || label.toLowerCase().includes('velo');
    const isSkiErg = exerciseId.includes('ski') || label.toLowerCase().includes('skierg');
    const isStairmaster = exerciseId.includes('stai') || label.toLowerCase().includes('stairmaster');

    // Pace unit depends on exercise type
    const paceUnit = isRower || isSkiErg ? '/500M' : isSwimming ? '/100M' : 'MIN/KM';
    const speedUnit = isSwimming ? 'M/MIN' : 'KM/H';

    // Calcul automatique de l'allure (pace) base sur la vitesse
    const calculatePace = (speedValue: string) => {
      const speedVal = parseFloat(speedValue.replace(',', '.'));
      if (speedVal > 0) {
        if (isRower || isSkiErg) {
          // Rower: pace per 500m. Speed in km/h -> time for 500m
          const timeFor500m = (0.5 / speedVal) * 3600; // seconds for 500m
          const mins = Math.floor(timeFor500m / 60);
          const secs = Math.round(timeFor500m % 60);
          return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        } else if (isSwimming) {
          // Swimming: pace per 100m. Speed in km/h -> time for 100m
          const timeFor100m = (0.1 / speedVal) * 3600; // seconds for 100m
          const mins = Math.floor(timeFor100m / 60);
          const secs = Math.round(timeFor100m % 60);
          return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        } else {
          const paceDecimal = 60 / speedVal;
          const mins = Math.floor(paceDecimal);
          const secs = Math.round((paceDecimal - mins) * 60);
          return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        }
      }
      return '';
    };

    // Calcul automatique des calories
    const calculateCaloriesAuto = (currentStats: any) => {
      if (!userWeight) return '';
      const speedVal = parseFloat((currentStats.speed || '0').replace(',', '.'));
      let durationVal = parseFloat((currentStats.duration || '0').replace(',', '.'));
      const distanceVal = parseFloat((currentStats.distance || '0').replace(',', '.'));

      // Inférer la durée si manquante
      if (!durationVal && distanceVal > 0 && speedVal > 0) {
        durationVal = (distanceVal / speedVal) * 60;
      }

      if (durationVal > 0) {
        let met = 5.0; // Modéré par défaut
        if (speedVal > 0) {
          if (speedVal < 5) met = 3.5;
          else if (speedVal < 8) met = 7;
          else if (speedVal < 11) met = 10;
          else met = 12;
        }

        const penteVal = parseFloat((currentStats.pente || '0').replace(',', '.'));
        if (penteVal > 0) met += (penteVal * 0.3);

        const kcal = Math.round(met * userWeight * (durationVal / 60));
        return kcal.toString();
      }
      return '';
    };

    const updateStat = (key: string, val: string) => {
      setOptionStats(prev => {
        const currentStats = { ...prev[exerciseId], [key]: val };

        // Si on modifie la vitesse, recalculer l'allure automatiquement
        if (key === 'speed' && val) {
          const newPace = calculatePace(val);
          currentStats.pace = newPace;
        }

        // Calculer automatiquement les calories si on a les infos nécessaires
        if (['duration', 'speed', 'pente', 'distance'].includes(key)) {
          const newCalories = calculateCaloriesAuto(currentStats);
          if (newCalories) {
            currentStats.calories = newCalories;
          }
        }

        return {
          ...prev,
          [exerciseId]: currentStats
        };
      });
    };

    // Fonction manuelle de calcul (pour le bouton éclair)
    const calculateLocalCalories = () => {
      if (!userWeight) return;
      const speedVal = parseFloat((stats.speed || '0').replace(',', '.'));
      let durationVal = parseFloat((stats.duration || '0').replace(',', '.')); // Duration in minutes
      const distanceVal = parseFloat((stats.distance || '0').replace(',', '.'));

      // Infer duration from Distance / Speed if missing
      if (!durationVal && distanceVal > 0 && speedVal > 0) {
         durationVal = (distanceVal / speedVal) * 60; // hours -> minutes
         updateStat('duration', Math.round(durationVal).toString());
      }

      if (durationVal > 0) {
        // METs approximation
        let met = 5.0; // Default moderate
        if (speedVal > 0) {
             if (speedVal < 5) met = 3.5;
             else if (speedVal < 8) met = 7;
             else if (speedVal < 11) met = 10;
             else met = 12;
        }

        // Bonus for incline (pente)
        const penteVal = parseFloat((stats.pente || '0').replace(',', '.'));
        if (penteVal > 0) met += (penteVal * 0.3);

        const kcal = Math.round(met * userWeight * (durationVal / 60));
        updateStat('calories', kcal.toString());
        notificationAsync(NotificationFeedbackType.Success);
      }
    };

    return (
      <View style={{ marginTop: 8, marginBottom: 16, padding: 12, backgroundColor: colors.backgroundElevated, borderRadius: 12, borderWidth: 1, borderColor: colors.gold + '30' }}>
        
        {/* HEADER */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '900', color: colors.gold, letterSpacing: 0.5, textTransform: 'uppercase' }}>
            {label} - DÉTAILS
          </Text>
          <TouchableOpacity
            onPress={() => {
              // Supprimer complètement l'exercice
              setOptionStats(prev => {
                const newStats = { ...prev };
                delete newStats[exerciseId];
                return newStats;
              });
              setValidatedOptions(prev => {
                const newValidated = { ...prev };
                delete newValidated[exerciseId];
                return newValidated;
              });
              toggleOption(sportId, exerciseId);
              lightHaptic();
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>

        {/* DASHBOARD GRID */}
        <View style={{ gap: 8 }}>
          {/* Ligne 0: Durée */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
             <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>DURÉE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <TextInput
                  style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary, minWidth: 40, padding: 0 }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted + '40'}
                  keyboardType="number-pad"
                  value={stats.duration}
                  onChangeText={(v) => updateStat('duration', v)}
                  onFocus={scrollToFocusedInput}
                  maxLength={4}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>MIN</Text>
              </View>
            </View>
          </View>

          {/* Ligne 1: Vitesse & Pente/Resistance */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>VITESSE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <TextInput
                  style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary, minWidth: 40, padding: 0 }}
                  placeholder="0.0"
                  placeholderTextColor={colors.textMuted + '40'}
                  keyboardType="decimal-pad"
                  value={stats.speed}
                  onChangeText={(v) => updateStat('speed', v.replace(',', '.'))}
                  onFocus={scrollToFocusedInput}
                  maxLength={4}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>{speedUnit}</Text>
              </View>
            </View>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>{isStairmaster ? 'NIVEAU' : isBikeExercise ? 'RESISTANCE' : 'PENTE'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <TextInput
                  style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary, minWidth: 40, padding: 0 }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted + '40'}
                  keyboardType="decimal-pad"
                  value={isBikeExercise ? stats.resistance : stats.pente}
                  onChangeText={(v) => updateStat(isBikeExercise ? 'resistance' : 'pente', v.replace(',', '.'))}
                  onFocus={scrollToFocusedInput}
                  maxLength={3}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>{isStairmaster ? 'LVL' : isBikeExercise ? 'LVL' : '%'}</Text>
              </View>
            </View>
          </View>

          {/* Ligne 1b: Watts & Cadence (velo, rameur, skierg) */}
          {(isBikeExercise || isRower || isSkiErg) && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>PUISSANCE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <TextInput
                    style={{ fontSize: 18, fontWeight: '900', color: '#F59E0B', minWidth: 40, padding: 0 }}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted + '40'}
                    keyboardType="number-pad"
                    value={stats.watts}
                    onChangeText={(v) => updateStat('watts', v)}
                    onFocus={scrollToFocusedInput}
                    maxLength={4}
                  />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>WATTS</Text>
                </View>
              </View>
              <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>{isRower ? 'COUPS/MIN' : 'CADENCE'}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <TextInput
                    style={{ fontSize: 18, fontWeight: '900', color: '#3B82F6', minWidth: 40, padding: 0 }}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted + '40'}
                    keyboardType="number-pad"
                    value={stats.cadence}
                    onChangeText={(v) => updateStat('cadence', v)}
                    onFocus={scrollToFocusedInput}
                    maxLength={3}
                  />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>{isRower ? 'SPM' : 'RPM'}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Ligne 2: Distance & Calories */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>{isSwimming ? 'DISTANCE' : isStairmaster ? 'ETAGES' : 'DISTANCE'}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <TextInput
                  style={{ fontSize: 18, fontWeight: '900', color: isDark ? colors.accent : colors.textPrimary, minWidth: 40, padding: 0 }}
                  placeholder={isStairmaster ? '0' : '0.0'}
                  placeholderTextColor={colors.textMuted + '40'}
                  keyboardType={isStairmaster ? 'number-pad' : 'decimal-pad'}
                  value={isStairmaster ? stats.stairs : stats.distance}
                  onChangeText={(v) => updateStat(isStairmaster ? 'stairs' : 'distance', v.replace(',', '.'))}
                  onFocus={scrollToFocusedInput}
                  maxLength={5}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>{isSwimming ? 'M' : isStairmaster ? 'FLOORS' : 'KM'}</Text>
              </View>
            </View>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>CALORIES</Text>
                <TouchableOpacity onPress={calculateLocalCalories} hitSlop={10}>
                  <MaterialCommunityIcons name="lightning-bolt" size={12} color={colors.gold} />
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <TextInput
                  style={{ fontSize: 18, fontWeight: '900', color: colors.gold, minWidth: 40, padding: 0 }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted + '40'}
                  keyboardType="number-pad"
                  value={stats.calories}
                  onChangeText={(v) => updateStat('calories', v)}
                  onFocus={scrollToFocusedInput}
                  maxLength={5}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>KCAL</Text>
              </View>
            </View>
          </View>

          {/* Ligne 3: Allure */}
          {!isStairmaster && (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>ALLURE</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                  <TextInput
                    style={{ fontSize: 18, fontWeight: '900', color: isDark ? colors.accent : colors.textPrimary, minWidth: 40, padding: 0 }}
                    placeholder="0:00"
                    placeholderTextColor={colors.textMuted + '40'}
                    value={stats.pace}
                    onChangeText={(v) => updateStat('pace', v)}
                    onFocus={scrollToFocusedInput}
                    maxLength={6}
                  />
                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>{paceUnit}</Text>
                </View>
              </View>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Charger une seule fois au montage (pas à chaque focus)
  useEffect(() => { loadClubs(); }, []);

  const loadClubs = async () => {
    try {
      const data = await getClubs();
      setClubs(data);
    } catch (error) {
      logger.error('Erreur chargement clubs:', error);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setDate(selectedDate);
    }
  };

  const toggleMuscle = (muscleId: string) => {
    setSelectedMuscles(prev =>
      prev.includes(muscleId)
        ? prev.filter(m => m !== muscleId)
        : [...prev, muscleId]
    );
  };

  // Ajouter une entrée pour un sport
  const addSportEntry = (sportId: string) => {
    const text = newEntryText[sportId]?.trim();
    if (!text) return;

    setSportEntries(prev => {
      const currentEntries = prev[sportId] || [];
      if (currentEntries.length >= 10) return prev; // Max 10 entrées
      return {
        ...prev,
        [sportId]: [...currentEntries, text],
      };
    });

    // Effacer le champ de saisie
    setNewEntryText(prev => ({
      ...prev,
      [sportId]: '',
    }));
  };

  // Supprimer une entrée pour un sport
  const removeSportEntry = (sportId: string, index: number) => {
    setSportEntries(prev => {
      const currentEntries = prev[sportId] || [];
      return {
        ...prev,
        [sportId]: currentEntries.filter((_, i) => i !== index),
      };
    });
  };

  const handleCloseHouariModal = () => {
    setShowHouariRateModal(false);
    setTimeout(() => router.back(), 350);
    // Moment positif : l'user vient de noter sa séance → demander review si OK
    import('@/lib/reviewPromptService')
      .then(({ promptReviewAfterPositiveAction }) => promptReviewAfterPositiveAction(1500))
      .catch(() => {});
  };

  // Quick Fill pour pré-remplir le formulaire avec la dernière séance
  const handleQuickFill = (quickSport: string, quickDuration: number) => {
    // Pré-sélectionner le sport
    setSelectedSports([quickSport]);
    // Pré-remplir la durée
    setDuration(quickDuration);
    // Petit feedback haptic
    lightHaptic();
  };

  const handleSave = async () => {
    // Protection anti-spam dès le début
    if (isSubmitting) return;
    setIsSubmitting(true);

    // Validation : Sport principal obligatoire si plusieurs sports sélectionnés
    if (selectedSports.length > 1 && !primarySportForObjective) {
      setPrimarySportError(true);
      errorHaptic();
      setIsSubmitting(false); // Libérer le verrou avant le return

      // Scroller vers le sélecteur de sport principal
      if (sportSelectorRef.current) {
        try {
          (sportSelectorRef.current as any).measure?.((x: number, y: number, w: number, h: number, px: number, py: number) => {
            if (py !== undefined) {
              scrollViewRef.current?.scrollTo({ y: Math.max(0, py - 150), animated: true });
            }
          });
        } catch { /* silencieux */ }
      }

      return;
    }

    setPrimarySportError(false);

    try {
      // Construire les notes avec les options sélectionnées et description custom
      let fullNotes = '';

      // Ajouter les options sélectionnées et entrées pour chaque sport
      selectedSports.forEach(sportId => {
        const sportName = getSportName(sportId);
        const sportOptions = selectedOptions[sportId] || [];
        const entries = sportEntries[sportId] || [];

        // Options sélectionnées avec Stats détaillées (kg/reps/km/etc)
        if (sportOptions.length > 0) {
          const optionLabels = sportOptions.map(optId => {
            const opt = getOptionsForSport(sportId).find(o => o.id === optId);
            const stats = optionStats[optId];
            let label = `• ${opt?.label || optId}`;
            
            if (stats) {
              const details = [];
              if (stats.sets_data && stats.sets_data.length > 0 && stats.sets_data.some(s => s.weight || s.reps)) {
                const setsStr = stats.sets_data.map((s, i) => `S${i+1}: ${s.weight||'?'}kg×${s.reps||'?'}`).join(', ');
                details.push(setsStr);
              } else if (stats.weight || stats.reps) {
                details.push(`${stats.weight || '0'}kg × ${stats.reps || '0'}`);
                if (stats.sets) details.push(`${stats.sets} séries`);
              }
              if (stats.duration) details.push(`${stats.duration}min`);
              if (stats.distance) details.push(`${stats.distance}km`);
              if (stats.speed) details.push(`${stats.speed}km/h`);
              if (stats.pace) details.push(`${stats.pace}`);
              if (stats.pente) details.push(`${stats.pente}%`);
              if (stats.watts) details.push(`${stats.watts}W`);
              if (stats.cadence) details.push(`${stats.cadence}rpm`);
              if (stats.resistance) details.push(`R${stats.resistance}`);
              if (stats.stairs) details.push(`${stats.stairs} etages`);
              if (stats.calories) details.push(`${stats.calories}kcal`);

              if (details.length > 0) label += ` (${details.join(', ')})`;
            }
            return label;
          });
          fullNotes += `${sportName}:\n${optionLabels.join('\n')}\n`;
        }

        // Entrées personnalisées
        if (entries.length > 0) {
          if (sportOptions.length === 0) {
            fullNotes += `${sportName}:\n`;
          }
          entries.forEach(entry => {
            fullNotes += `  • ${entry}\n`;
          });
        }
      });

      // Score du match (sports collectifs/raquettes)
      if (scoreHome || scoreAway) {
        fullNotes += `\nScore: ${scoreHome || '0'}-${scoreAway || '0'}`;
      }

      // Ajouter la description personnalisée
      if (customDescription.trim()) {
        fullNotes += `\n${customDescription.trim()}`;
      }

      // Ajouter les notes existantes
      if (notes.trim()) {
        fullNotes += `\n${notes.trim()}`;
      }

      // Pour chaque sport sélectionné, créer une entrée (ou une seule avec sports combinés)
      // Remplacer 'autre' par le nom personnalisé si défini
      const finalSports = selectedSports.map(sportId => {
        if (sportId === 'autre' && customSportName.trim()) {
          return customSportName.trim();
        }
        return sportId;
      });
      const sportsString = finalSports.join(',');

      // Ajouter les details des rounds de combat aux notes
      if (combatRounds.length > 0 && combatRounds.some(r => r.partner || r.result || r.notes)) {
        fullNotes += '\nRounds:\n';
        combatRounds.forEach((r) => {
          let roundLine = `  R${r.number}`;
          if (r.partner) roundLine += ` vs ${r.partner}`;
          if (r.result) roundLine += ` - ${r.result === 'win' ? 'V' : r.result === 'loss' ? 'D' : 'Nul'}`;
          if (r.method) roundLine += ` (${r.method})`;
          if (r.submissionsGiven) roundLine += ` | ${r.submissionsGiven} sub. donnée${r.submissionsGiven > 1 ? 's' : ''}`;
          if (r.submissionsTaken) roundLine += ` | ${r.submissionsTaken} sub. subie${r.submissionsTaken > 1 ? 's' : ''}`;
          if ((r.pointsFor ?? 0) > 0 || (r.pointsAgainst ?? 0) > 0) roundLine += ` | Score ${r.pointsFor ?? 0}-${r.pointsAgainst ?? 0}`;
          if (r.methodsGiven?.length) roundLine += ` | Finitions: ${r.methodsGiven.join(', ')}`;
          if (r.methodsTaken?.length) roundLine += ` | Subies: ${r.methodsTaken.join(', ')}`;
          fullNotes += roundLine + '\n';
          if (r.notes) fullNotes += `    ${r.notes}\n`;
        });
      }

      // Collecter les exercices de force depuis l'accordéon (options validées)
      const exercisesFromAccordion = selectedSports.flatMap(sId => {
        const opts = getOptionsForSport(sId);
        return (selectedOptions[sId] || [])
          .filter(id => validatedOptions[id] === true)
          .map(id => {
            const opt = opts.find(o => o.id === id);
            if (!opt) return null;
            const st = optionStats[id] || {};
            const isRun2 = id.startsWith('r_') || id.includes('run_');
            const isSwim2 = id.startsWith('sw_') || id.includes('swim_');
            const isWalk2 = id.startsWith('ma_');
            const isBike2 = id.startsWith('ve_') || id.includes('velo') || id.includes('spinning');
            const isCard2 = id.includes('car_') || opt.group === 'CARDIO';
            const isCombat2 = ['bo_', 'mt_', 'kb_', 'mma_', 'jjb_', 'j_', 'lu_', 'g_', 'p_', 's_', 't_'].some(p => id.startsWith(p));
            const isStrength2 = !(isRun2 || isSwim2 || isWalk2 || isBike2 || isCard2 || opt.group === 'DISTANCES' || isCombat2);
            if (!isStrength2) return null;
            const rawSets = st.sets_data?.filter(s => s.weight || s.reps) || [];
            const setsData = rawSets.map(s => ({
              weight: parseFloat(s.weight || '0') || 0,
              reps: parseInt(s.reps || '0') || 0,
            }));
            const bestWeight = setsData.length ? Math.max(...setsData.map(s => s.weight)) : (parseFloat(st.weight || '0') || 0);
            const bestReps = setsData.length ? (setsData.find(s => s.weight === bestWeight)?.reps || parseInt(st.reps || '0') || 0) : (parseInt(st.reps || '0') || 0);
            return {
              name: opt.label,
              muscle_group: opt.group,
              weight: bestWeight,
              reps: bestReps,
              sets: setsData.length || 0,
              setsData: setsData.length > 0 ? setsData : undefined,
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null);
      });
      const allExercises = [...exercisesFromAccordion, ...exercises];

      const trainingData = {
        club_id: selectedClub?.id,
        sport: sportsString,
        date: format(date, 'yyyy-MM-dd'),
        duration_minutes: duration || undefined,
        start_time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        notes: fullNotes.trim() || undefined,
        muscles: selectedMuscles.length > 0 ? selectedMuscles.join(',') : undefined,
        exercises: allExercises.length > 0 ? allExercises : undefined,
        technique_rating: techniqueRating,
        technical_theme: technicalTheme.trim() || undefined,
        is_outdoor: isOutdoor,
        location_lat: locationLat ?? undefined,
        location_lon: locationLon ?? undefined,
        location_name: locationName || undefined,
        distance: distance ? (isNaN(parseFloat(distance.replace(',', '.'))) ? undefined : parseFloat(distance.replace(',', '.'))) : undefined,
        calories: calories ? (isNaN(parseInt(calories)) ? undefined : parseInt(calories)) : undefined,
        intensity: intensity,
        rounds: rounds ? (isNaN(parseInt(rounds)) ? undefined : parseInt(rounds)) : undefined,
        round_duration: roundDuration ? (isNaN(parseInt(roundDuration)) ? undefined : parseInt(roundDuration)) : undefined,
        pente: pente ? (isNaN(parseFloat(pente.replace(',', '.'))) ? undefined : parseFloat(pente.replace(',', '.'))) : undefined,
        speed: speed ? (isNaN(parseFloat(speed.replace(',', '.'))) ? undefined : parseFloat(speed.replace(',', '.'))) : undefined,
        resistance: resistance ? (isNaN(parseInt(resistance)) ? undefined : parseInt(resistance)) : undefined,
        watts: watts ? (isNaN(parseInt(watts)) ? undefined : parseInt(watts)) : undefined,
        cadence: cadence ? (isNaN(parseInt(cadence)) ? undefined : parseInt(cadence)) : undefined,
        heart_rate: heartRate ? (isNaN(parseInt(heartRate)) ? undefined : parseInt(heartRate)) : undefined,
        combat_rounds: combatRounds.length > 0 ? combatRounds : undefined,
        weekly_plan_id: params?.slotId ? parseInt(params.slotId, 10) : undefined,
        game_plan: gamePlan.trim() || undefined,
        what_worked: whatWorked.trim() || undefined,
        what_didnt_work: whatDidntWork.trim() || undefined,
        session_rating: sessionRating ?? undefined,
        session_mood: sessionMood || undefined,
      };

      let newId: number | null = null;
      if (isEditMode && params.editId) {
        const editIdNum = parseInt(params.editId, 10);
        await updateTraining(editIdNum, trainingData);
        newId = editIdNum;
      } else {
        newId = await addTraining(trainingData);
      }

      // Valider le creneau regulier si on vient d'un slot
      if (params?.slotId && newId) {
        try {
          const slotIdNum = parseInt(params.slotId, 10);
          const now = new Date();
          const day = now.getDay();
          const diff = day === 0 ? -6 : 1 - day;
          const monday = new Date(now);
          monday.setDate(now.getDate() + diff);
          const weekStart = monday.toISOString().split('T')[0];
          await validateSlot(slotIdNum, weekStart, Number(newId));
        } catch (e) {
          logger.error('Erreur validation slot:', e);
        }
      }

      if (newId) {
        setLastSavedTrainingId(Number(newId));
      }

      // Vérifier surmenage après chaque séance sauvegardée
      checkOvertrainingAlert().catch(() => {});

      // Vérifier si on doit proposer une sauvegarde (tous les 5 enregistrements)
      backupReminderService.onDataAdded().then(shouldBackup => {
        if (shouldBackup) {
          backupReminderService.markReminderShown().catch(() => {});
          // Délai pour laisser le modal de validation et le son se terminer
          setTimeout(() => {
            if (!isMountedRef.current) return;
            showPopup(
              '💾 Sauvegarder tes données ?',
              'Tu as ajouté plusieurs séances. Yoroi ne sauvegarde que sur ton téléphone — pense à faire un backup pour ne rien perdre !',
              [
                { text: 'Plus tard', style: 'cancel' },
                {
                  text: 'Sauvegarder',
                  style: 'primary',
                  onPress: () => { exportDataToJSON().catch(() => {}); },
                },
              ]
            );
          }, 8000); // après le son Pokémon + modal de validation
        }
      }).catch(() => {});

      // Sauvegarder le premier sport et durée pour le Quick Add
      await saveLastSportAndDuration(selectedSports[0], duration);

      successHaptic();

      if (isEditMode) {
        router.back();
        setIsSubmitting(false);
        return;
      }

      playWorkoutCompleteSound();

      // SYNC VERS APPLE HEALTH
      try {
        const startDateTime = new Date(date);
        const [hours, minutes] = startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }).split(':');
        startDateTime.setHours(parseInt(hours), parseInt(minutes), 0);

        const endDateTime = new Date(startDateTime.getTime() + (duration || 60) * 60 * 1000);

        const exported = await HealthConnect.writeWorkout({
          activityType: getSportName(selectedSport),
          startDate: startDateTime,
          endDate: endDateTime,
        });

        if (exported) {
          logger.info('Entraînement synchronisé vers Apple Health:', selectedSport);
        }
      } catch (healthError) {
        // Ne pas bloquer la sauvegarde si l'export échoue
        logger.warn('Export Apple Health échoué (non bloquant):', healthError);
      }

      // SYNC VERS APPLE WATCH
      if (isWatchAvailable) {
        syncWorkout({
          type: getSportName(selectedSport),
          duration: duration || 0,
          calories: calories ? (parseInt(calories) || 0) : 0,
          date: new Date(format(date, 'yyyy-MM-dd') + 'T' + startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) + ':00'),
        }).catch(() => {}); // Non bloquant
      }

      // Notifier la home pour refresh instantane des points/quetes
      DeviceEventEmitter.emit('YOROI_DATA_CHANGED');

      // Mettre à jour le widget streak (en arrière-plan)
      import('@/lib/widgetData').then(async ({ updateWidgetStreak }) => {
        try {
          const { calculateStreak } = await import('@/lib/database');
          const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
          const streak = await calculateStreak();
          const rankStr = await AsyncStorage.getItem('@yoroi_rank');
          await updateWidgetStreak(streak, rankStr ?? 'Recrue');
        } catch { /* non bloquant */ }
      }).catch(() => {});

      // Verifier si des défis sont nouvellement completes (en arriere-plan)
      import('@/lib/challengesService').then(async ({ syncAndGetNewlyCompleted }) => {
        try {
          const newChallenges = await syncAndGetNewlyCompleted();
          if (newChallenges.length > 0) {
            const names = newChallenges.map(c => `"${c.title}" (+${c.xp} XP)`).join('\n');
            setTimeout(() => {
              if (!isMountedRef.current) return;
              showPopup(
                'Bravo, défi valide !',
                `Ta séance a valide :\n${names}\n\nVa dans "Défis" pour reclamer tes XP !`,
                [{ text: 'Super !', style: 'primary' }]
              );
            }, 3000); // Apres le son + modal de validation
          }
        } catch { /* non bloquant */ }
      }).catch(() => {});

      // AFFICHER LE MODAL DE VALIDATION (Étape 2) - avant les checks non-critiques
      // Reset l'étape à 2 (aperçu initial) à chaque nouvelle sauvegarde
      setValidationStep(2);
      setCardBackgroundImage(null);
      setShowValidationModal(true);

      // Trigger review en arrière-plan (non bloquant)
      incrementReviewTrigger().catch(() => {});
      // Badges : délai de 5s pour laisser le son Pokémon se terminer
      // et éviter que la célébration badge apparaisse pendant la navigation
      setTimeout(() => { if (isMountedRef.current) checkBadges().catch(() => {}); }, 5000);

      // Detection de pattern : suggerer un creneau regulier si pattern detecte
      if (!isEditMode && !params?.slotId) {
        detectSlotPatterns().then(suggestions => {
          if (suggestions.length > 0) {
            const s = suggestions[0];
            const dayNames = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
            const sportName = s.sport.charAt(0).toUpperCase() + s.sport.slice(1);
            // Attendre un peu que le modal de validation se ferme
            setTimeout(() => {
              if (!isMountedRef.current) return;
              showPopup(
                'Creneau regulier detecte',
                `Vous vous entrainez en ${sportName} tous les ${dayNames[s.dayOfWeek]} (${s.count} fois ce mois). Creer un creneau regulier ?`,
                [
                  { text: 'Plus tard', style: 'cancel' },
                  {
                    text: 'Creer',
                    style: 'primary',
                    onPress: async () => {
                      await addWeeklyPlanItem({
                        day_of_week: s.dayOfWeek,
                        sport: s.sport,
                        time: s.avgTime,
                        duration_minutes: s.avgDuration,
                        club_id: s.clubId,
                      });
                      setTimeout(() => router.push('/(tabs)/planning' as any), 300);
                    },
                  },
                ]
              );
            }, 3000);
          }
        }).catch(() => {});
      }

    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      errorHaptic();
      showPopup('Erreur', "Impossible d'enregistrer l'entraînement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  // Fonctions pour gérer les photos de fond de carte
  const pickImageFromGallery = async () => {
    const { status } = await requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission refusée', 'Nous avons besoin de votre permission pour accéder à vos photos');
      return;
    }

    const result = await launchImageLibraryAsync({
      mediaTypes: MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
      selectionLimit: 1,
    });

    if (!result.canceled && result.assets?.[0]) {
      setCardBackgroundImage(result.assets?.[0]?.uri || null);
      lightHaptic();
    }
  };

  const takePhoto = async () => {
    const { status } = await requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission refusée', 'Nous avons besoin de votre permission pour accéder à l\'appareil photo');
      return;
    }

    const result = await launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]) {
      setCardBackgroundImage(result.assets?.[0]?.uri || null);
      lightHaptic();
    }
  };

  // Afficher les muscles et exercices si musculation ou street workout est sélectionné
  const showMuscles = selectedSports.includes('musculation') || selectedSports.includes('street_workout');

  // Construire la liste riche des options sélectionnées
  const getOptionDetails = () => {
    return selectedSports.flatMap(sportId => {
      const opts = getOptionsForSport(sportId);
      const selectedIds = selectedOptions[sportId] || [];
      return selectedIds
        .filter(id => validatedOptions[id] === true) // Ne garder que les exercices validés
        .map(id => {
          const opt = opts.find(o => o.id === id);
          if (!opt) return null;
          const stats = optionStats[id];
          // Dériver le meilleur poids/reps depuis sets_data (multi-séries musculation)
          const setsArr = stats?.sets_data?.filter((s: { weight: string; reps: string }) => s.weight || s.reps) || [];
          const bestSet = setsArr.length > 0
            ? setsArr.reduce((best: { weight: string; reps: string }, s: { weight: string; reps: string }) =>
                (parseFloat(s.weight || '0') || 0) >= (parseFloat(best.weight || '0') || 0) ? s : best
              , setsArr[0])
            : null;
          const effectiveWeight = bestSet?.weight || stats?.weight || undefined;
          const effectiveReps = bestSet?.reps || stats?.reps || undefined;
          const effectiveSets = setsArr.length > 1 ? setsArr.length.toString() : (stats?.sets || undefined);
          return {
            ...opt,
            sport: sportId,
            sportName: getSportName(sportId),
            weight: effectiveWeight,
            reps: effectiveReps,
            sets: effectiveSets,
            distance: stats?.distance,
            duration: stats?.duration,
            speed: stats?.speed,
            pente: stats?.pente,
            calories: stats?.calories,
            watts: stats?.watts,
            resistance: stats?.resistance,
            notes: stats?.notes,
            stairs: stats?.stairs,
            pace: stats?.pace
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null);
    });
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const optionDetails = useMemo(() => getOptionDetails(), [selectedSports, selectedOptions, validatedOptions]);

  // Construire les notes pour la prévisualisation
  const getPreviewNotes = () => {
    let fullNotes = '';
    selectedSports.forEach(sportId => {
      const sportName = getSportName(sportId);
      const entries = sportEntries[sportId] || [];

      // Entries
      if (entries.length > 0) {
        if (selectedOptions[sportId]?.length === 0) fullNotes += `${sportName}:\n`;
        entries.forEach(entry => fullNotes += `• ${entry}\n`);
      }
    });

    if (customDescription.trim()) fullNotes += `\n${customDescription.trim()}`;
    if (notes.trim()) fullNotes += `\n${notes.trim()}`;
    return fullNotes.trim();
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const previewNotes = useMemo(() => getPreviewNotes(), [selectedSports, sportEntries, selectedOptions, customDescription, notes]);

  // Objet training mémoïsé pour SessionCard — évite les re-renders à chaque keystroke
  const sessionCardTraining = useMemo(() => ({
    sport: selectedSports.join(','),
    duration_minutes: duration,
    distance: distance ? parseFloat(distance.replace(',', '.')) : undefined,
    calories: calories ? parseInt(calories) : undefined,
    intensity: intensity,
    heart_rate: heartRate ? parseInt(heartRate) : undefined,
    date: date.toISOString(),
    start_time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    rounds: rounds ? parseInt(rounds) : undefined,
    round_duration: roundDuration ? parseInt(roundDuration) : undefined,
    club_logo: selectedClub?.logo_uri,
    club_name: selectedClub?.name,
    muscles: selectedMuscles.join(','),
    exercises: exercises,
    notes: previewNotes,
    technique_rating: techniqueRating || undefined,
    is_outdoor: isOutdoor,
    pente: pente ? parseFloat(pente.replace(',', '.')) : undefined,
    speed: speed ? parseFloat(speed.replace(',', '.')) : undefined,
    resistance: resistance ? parseInt(resistance) : undefined,
    watts: watts ? parseInt(watts) : undefined,
    cadence: cadence ? parseInt(cadence) : undefined,
  }), [selectedSports, duration, distance, calories, intensity, heartRate, date, startTime, rounds, roundDuration, selectedClub, selectedMuscles, exercises, previewNotes, techniqueRating, isOutdoor, pente, speed, resistance, watts, cadence]);

  return (
    <ScreenWrapper noPadding noContainer>
      {/* Bloquer le swipe-to-dismiss — seulement la croix ferme l'écran */}
      <Stack.Screen options={{ gestureEnabled: false }} />

      {/* HEADER ÉTAPE - COLLÉ AU TOP */}
      <View style={{
        backgroundColor: isDark ? colors.backgroundCard : '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: isDark ? colors.border : 'rgba(0,0,0,0.07)',
        zIndex: 999,
        paddingTop: insets.top,
        shadowColor: '#000',
        shadowOpacity: isDark ? 0 : 0.04,
        shadowOffset: { width: 0, height: 1 },
        shadowRadius: 4,
      }}>
        {/* Bouton fermer — toujours visible */}
        <TouchableOpacity
          style={{
            position: 'absolute', top: insets.top + 6, right: 12, zIndex: 10,
            width: 34, height: 34, borderRadius: 17,
            backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.07)',
            alignItems: 'center', justifyContent: 'center',
          }}
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={18} color={colors.textPrimary} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={{ paddingBottom: 10, paddingTop: 5, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: isDark ? colors.accent : colors.textPrimary, letterSpacing: 3, marginBottom: 8 }}>
            {isEditMode ? 'MODIFICATION' : `ÉTAPE ${currentStep} SUR ${totalSteps}`}
          </Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s, i) => (
              <React.Fragment key={s}>
                {i > 0 && <View style={{ width: 30, height: 2, backgroundColor: s <= currentStep ? colors.accent : colors.border }} />}
                <View style={{
                  width: s === currentStep ? 14 : 10,
                  height: s === currentStep ? 14 : 10,
                  borderRadius: 7,
                  backgroundColor: s <= currentStep ? colors.accent : colors.borderLight,
                  shadowColor: colors.accent,
                  shadowOpacity: s === currentStep ? 0.6 : 0,
                  shadowRadius: 8,
                  elevation: s === currentStep ? 8 : 0,
                }} />
              </React.Fragment>
            ))}
          </View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 10, letterSpacing: 0.5 }}>
            {isEditMode ? 'MODIFICATION' : (isCombatSport ? ['CHOIX DU SPORT', 'LIEU & CONTENU', 'ROUNDS DE COMBAT', 'GAME PLAN & BILAN', 'DATE & DURÉE', 'RESSENTI'] : ['CHOIX DU SPORT', 'LIEU & CONTENU', 'DATE & DURÉE', 'RESSENTI'])[currentStep - 1]}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1, backgroundColor: isDark ? colors.backgroundCard : '#F2F3F7' }}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 48 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={[styles.scrollView, { backgroundColor: isDark ? colors.backgroundCard : '#F2F3F7' }]}
          contentContainerStyle={[styles.content, { paddingTop: 20, paddingBottom: Math.max(320, keyboardHeight + 120) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // iOS 14+ : scroll auto quand le clavier apparaît (champ toujours visible)
          automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
          contentInsetAdjustmentBehavior="automatic"
          bounces={false}
          overScrollMode="never"
          scrollEventThrottle={16}
          onScroll={(e) => { currentScrollY.current = e.nativeEvent.contentOffset.y; }}
        >

        {/* Résumé sport — visible sur les étapes 2-4 */}
        {currentStep > 1 && selectedSports.length > 0 && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 18, alignItems: 'center', paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)' }}>
            {selectedSports.map(sportId => {
              const sport = SPORTS.find(s => s.id === sportId);
              if (!sport) return null;
              return (
                <View key={sportId} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.2, shadowRadius: 6, elevation: 3 }}>
                  <MaterialCommunityIcons name={sport.icon as any} size={14} color={colors.textOnGold} />
                  <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textOnGold }}>{sport.name}</Text>
                </View>
              );
            })}
            <TouchableOpacity
              onPress={() => goToStep(1)}
              style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', borderWidth: 1, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }}
            >
              <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '600' }}>Modifier</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* IMPORT GPX/TCX */}
        {currentStep === 1 && selectedSports.length === 0 && (
          <TouchableOpacity
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              paddingVertical: 12,
              paddingHorizontal: 16,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: colors.border,
              borderStyle: 'dashed',
              backgroundColor: colors.backgroundElevated,
              marginBottom: 16,
            }}
            onPress={() => router.push('/import-workouts')}
          >
            <FileUp size={18} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 14, fontWeight: '600' }}>
              Importer depuis un fichier (GPX/TCX)
            </Text>
          </TouchableOpacity>
        )}

        {/* BARRE DE RECHERCHE - UNIQUEMENT ÉTAPE 1 */}
        {currentStep === 1 && (selectedSports.length === 0 || showAddSportSection) && (
          <View style={{ marginBottom: 20 }}>
            <View style={[styles.customSportInputContainer, { backgroundColor: isDark ? colors.backgroundElevated : '#FFFFFF', borderColor: isDark ? colors.border : 'rgba(0,0,0,0.09)', minHeight: 54, paddingVertical: 10, paddingHorizontal: 14, borderRadius: 18, shadowColor: '#000', shadowOpacity: isDark ? 0 : 0.05, shadowOffset: { width: 0, height: 1 }, shadowRadius: 4, elevation: 2 }]}>
              <MaterialCommunityIcons name="magnify" size={24} color={colors.accent} />
              <TextInput
                style={[styles.customSportInput, { color: colors.text, fontSize: 16 }]}
                placeholder="Rechercher un sport..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                onFocus={() => {
                  setTimeout(() => {
                    scrollViewRef.current?.scrollTo({ y: 0, animated: true });
                  }, 300);
                }}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <X size={20} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ÉTAPE 1: CHOISIS TON SPORT */}
        {/* ═══════════════════════════════════════════ */}

        {/* Titre quand aucun sport sélectionné */}
        {currentStep === 1 && selectedSports.length === 0 && (
          <Text style={[styles.sectionTitle, { color: isDark ? colors.textSecondary : '#555F6E', fontSize: 11, fontWeight: '800', letterSpacing: 2 }]}>
            1. CHOISIS TON SPORT
          </Text>
        )}

        {/* Bouton pour ajouter un autre sport (quand sport déjà sélectionné) */}
        {currentStep === 1 && selectedSports.length > 0 && selectedSports.length < 3 && !showAddSportSection && (
          <TouchableOpacity
            style={[styles.addAnotherSportButton, { borderColor: colors.border, backgroundColor: colors.card }]}
            onPress={() => setShowAddSportSection(true)}
          >
            <Plus size={18} color={colors.textMuted} />
            <Text style={[styles.addAnotherSportText, { color: colors.textMuted }]}>
              Ajouter un autre sport
            </Text>
          </TouchableOpacity>
        )}

        {/* Titre section ajouter sport */}
        {currentStep === 1 && selectedSports.length > 0 && showAddSportSection && (
          <View style={styles.addSportSectionHeader}>
            <Text style={[styles.sectionTitle, { color: screenText, marginBottom: 0 }]}>
              Ajouter un sport
            </Text>
            <TouchableOpacity onPress={() => setShowAddSportSection(false)}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Catégories - visibles si: aucun sport OU showAddSportSection */}
        {currentStep === 1 && (selectedSports.length === 0 || showAddSportSection) && (() => {
          const categoryLabels: Record<string, string> = {
            cardio: 'Cardio',
            fitness: 'Musculation & Fitness',
            combat_grappling: 'Combat (Gi / No Gi)',
            combat_striking: 'Combat (Pieds-Poings)',
            danse: 'Danse',
            collectif: 'Sports Collectifs',
            raquettes: 'Raquettes',
            glisse: 'Sports de Glisse',
            nature: 'Sports Nature',
            aquatique: 'Sports Aquatiques',
            precision: 'Precision & Adresse',
            autre: 'Autres',
          };

          const categoryIcons: Record<string, string> = {
            cardio: 'run-fast',
            fitness: 'dumbbell',
            combat_grappling: 'kabaddi',
            combat_striking: 'boxing-glove',
            danse: 'dance-ballroom',
            collectif: 'soccer',
            raquettes: 'tennis',
            glisse: 'snowboard',
            nature: 'hiking',
            aquatique: 'swim',
            precision: 'bow-arrow',
            autre: 'dots-horizontal',
          };

          const categoryColors: Record<string, string> = {
            cardio: '#10B981',
            fitness: '#8B5CF6',
            combat_grappling: '#3B82F6',
            combat_striking: '#EF4444',
            danse: '#EC4899',
            collectif: '#F59E0B',
            raquettes: '#06B6D4',
            glisse: '#0EA5E9',
            nature: '#22C55E',
            aquatique: '#0284C7',
            precision: '#B45309',
            autre: '#6B7280',
          };

          // NOUVEL ORDRE : Cardio > Musculation > Combat > Danse > reste
          const categories = ['cardio', 'fitness', 'combat_grappling', 'combat_striking', 'danse', 'collectif', 'raquettes', 'aquatique', 'glisse', 'nature', 'precision', 'autre'];

          // Filtrer les catégories vides après recherche
          const filteredCategories = categories.filter(category => {
            let sports = SPORTS.filter(s => s.category === category);
            if (searchQuery.length > 0) {
              sports = sports.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
            }
            return sports.length > 0;
          });

          if (filteredCategories.length === 0 && searchQuery.length > 0) {
            return (
              <View style={{ padding: 40, alignItems: 'center' }}>
                <Text style={{ color: colors.textMuted, textAlign: 'center' }}>Aucun sport trouvé pour "{searchQuery}"</Text>
              </View>
            );
          }

          // Section FAVORIS (avant les catégories, seulement si pas de recherche)
          const favoriteSportObjects = SPORTS.filter(s => favoriteSports.includes(s.id));
          const showFavorites = favoriteSportObjects.length > 0 && searchQuery.length === 0;

          return (
            <>
              {showFavorites && (
                <View style={[styles.categorySection, { marginBottom: 10 }]}>
                  <View style={[styles.categoryHeader, {
                    backgroundColor: isDark ? colors.card : '#FFFFFF',
                    borderColor: 'transparent',
                    borderRadius: 14, paddingLeft: 0, overflow: 'hidden',
                    shadowColor: '#000', shadowOpacity: isDark ? 0 : 0.06, shadowOffset: { width: 0, height: 2 }, shadowRadius: 6, elevation: 3,
                  }]}>
                    <View style={{ width: 5, alignSelf: 'stretch', backgroundColor: colors.gold }} />
                    <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 14 }}>
                      <View style={styles.categoryHeaderLeft}>
                        <View style={[styles.categoryIconBadge, { backgroundColor: colors.gold + '20', width: 42, height: 42, borderRadius: 12 }]}>
                          <MaterialCommunityIcons name="star" size={22} color={colors.gold} />
                        </View>
                        <Text style={[styles.categoryLabel, { color: colors.gold, fontSize: 13 }]}>Favoris</Text>
                      </View>
                      <View style={{ backgroundColor: `${colors.gold}20`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: colors.gold }}>{favoriteSportObjects.length}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.sportsGrid}>
                    {favoriteSportObjects.map((sport) => {
                      const isSelected = selectedSports.includes(sport.id);
                      return (
                        <TouchableOpacity
                          key={`fav-${sport.id}`}
                          style={[
                            styles.sportGridItem,
                            { backgroundColor: colors.card, borderColor: colors.gold + '40' },
                            isSelected && { borderColor: colors.gold, backgroundColor: colors.goldMuted },
                          ]}
                          onPress={() => toggleSport(sport.id)}
                          onLongPress={() => toggleFavorite(sport.id)}
                          delayLongPress={400}
                        >
                          <View style={[styles.sportGridIcon, { backgroundColor: sport.color + '20' }]}>
                            <MaterialCommunityIcons name={sport.icon as any} size={28} color={isSelected ? colors.gold : sport.color} />
                          </View>
                          <Text style={[styles.sportGridName, { color: colors.textPrimary }, isSelected && { color: colors.gold, fontWeight: '700' }]} numberOfLines={1}>
                            {sport.name}
                          </Text>
                          <View style={{ position: 'absolute', top: 4, right: 4 }}>
                            <MaterialCommunityIcons name="star" size={12} color={colors.gold} />
                          </View>
                          {isSelected && (
                            <View style={[styles.sportGridCheck, { backgroundColor: colors.gold }]}>
                              <Check size={12} color={colors.textOnGold} strokeWidth={3} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              )}

              {filteredCategories.map((category) => {
            let sportsInCategory = SPORTS.filter(s => s.category === category);
            if (searchQuery.length > 0) {
              sportsInCategory = sportsInCategory.filter(s => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
            }
            
            if (sportsInCategory.length === 0) return null;

            const isExpanded = expandedCategories.includes(category) || searchQuery.length > 0;
            // Vérifier si un sport sélectionné est dans cette catégorie
            const hasSelectedSport = sportsInCategory.some(s => selectedSports.includes(s.id));
            const catColor = categoryColors[category] || '#6B7280';

            return (
              <View key={category} style={[styles.categorySection, { marginBottom: 6 }]}>
                {/* Header de catégorie cliquable */}
                <TouchableOpacity
                  style={[
                    styles.categoryHeader,
                    {
                      backgroundColor: isDark ? `${catColor}22` : `${catColor}18`,
                      borderColor: hasSelectedSport ? catColor : `${catColor}40`,
                      borderWidth: hasSelectedSport ? 2 : 1,
                      borderRadius: 14,
                      paddingLeft: 0,
                      overflow: 'hidden',
                      shadowColor: catColor,
                      shadowOpacity: isDark ? 0 : 0.12,
                      shadowOffset: { width: 0, height: 2 },
                      shadowRadius: 6,
                      elevation: 3,
                    },
                    hasSelectedSport && { backgroundColor: isDark ? `${catColor}35` : `${catColor}28` }
                  ]}
                  onPress={() => toggleCategory(category)}
                  activeOpacity={0.75}
                >
                  {/* Barre colorée gauche */}
                  <View style={{ width: 5, alignSelf: 'stretch', backgroundColor: catColor, borderTopLeftRadius: 14, borderBottomLeftRadius: isExpanded ? 0 : 14 }} />

                  <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10 }}>
                    <View style={styles.categoryHeaderLeft}>
                      <View style={[styles.categoryIconBadge, {
                        backgroundColor: catColor + '20',
                        width: 34, height: 34, borderRadius: 10,
                      }]}>
                        <MaterialCommunityIcons
                          name={categoryIcons[category] as any}
                          size={18}
                          color={catColor}
                        />
                      </View>
                      <View>
                        <Text style={[
                          styles.categoryLabel,
                          { color: hasSelectedSport ? catColor : colors.textPrimary }
                        ]}>
                          {categoryLabels[category]}
                        </Text>
                        {hasSelectedSport && (
                          <Text style={{ fontSize: 10, color: catColor, fontWeight: '600', marginTop: 1 }}>
                            Sélectionné
                          </Text>
                        )}
                      </View>
                    </View>
                    <View style={styles.categoryHeaderRight}>
                      <View style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : `${catColor}15`, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: catColor }}>
                          {sportsInCategory.length}
                        </Text>
                      </View>
                      {isExpanded ? (
                        <ChevronDown size={18} color={catColor} />
                      ) : (
                        <ChevronRight size={18} color={colors.textMuted} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Sports de la catégorie - GRILLE VERTICALE */}
                {isExpanded && (
                  <View style={styles.sportsGrid}>
                    {sportsInCategory.map((sport) => {
                      const isSelected = selectedSports.includes(sport.id);

                      const isFavorite = favoriteSports.includes(sport.id);
                      return (
                        <TouchableOpacity
                          key={sport.id}
                          style={[
                            styles.sportGridItem,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            isSelected && {
                              borderColor: colors.gold,
                              backgroundColor: colors.goldMuted,
                            },
                          ]}
                          onPress={() => toggleSport(sport.id)}
                          onLongPress={() => toggleFavorite(sport.id)}
                          delayLongPress={400}
                        >
                          <View style={[styles.sportGridIcon, { backgroundColor: sport.color + '20' }]}>
                            <MaterialCommunityIcons
                              name={sport.icon as any}
                              size={28}
                              color={isSelected ? colors.gold : sport.color}
                            />
                          </View>
                          <Text
                            style={[
                              styles.sportGridName,
                              { color: colors.textPrimary },
                              isSelected && { color: colors.gold, fontWeight: '700' },
                            ]}
                            numberOfLines={1}
                          >
                            {sport.name}
                          </Text>
                          {isFavorite && (
                            <View style={{ position: 'absolute', top: 4, right: 4 }}>
                              <MaterialCommunityIcons name="star" size={12} color={colors.gold} />
                            </View>
                          )}
                          {isSelected && (
                            <View style={[styles.sportGridCheck, { backgroundColor: colors.gold }]}>
                              <Check size={12} color={colors.textOnGold} strokeWidth={3} />
                            </View>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
            </>
          );
        })()}

        {/* ═══════════════════════════════════════════ */}
        {/* SPORTS SÉLECTIONNÉS - Badge(s) avec X pour retirer */}
        {/* ═══════════════════════════════════════════ */}
        {currentStep === 1 && selectedSports.length > 0 && (
          <View style={[styles.selectedSportsSection, { backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }]}>
            <View style={styles.selectedSportsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary, marginBottom: 0 }]}>
                {selectedSports.length === 1 ? '1. Sport sélectionné' : `1. ${selectedSports.length} Sports sélectionnés`}
              </Text>
              <Text style={[styles.selectedSportsHint, { color: colors.textMuted }]}>
                (max 3)
              </Text>
            </View>
            <View style={styles.selectedSportsList}>
              {selectedSports.map((sportId) => {
                const sport = SPORTS.find(s => s.id === sportId);
                if (!sport) return null;
                return (
                  <TouchableOpacity
                    key={sportId}
                    style={[styles.selectedSportChip, { backgroundColor: colors.gold, borderColor: colors.gold }]}
                    onPress={() => toggleSport(sportId)}
                  >
                    <MaterialCommunityIcons name={sport.icon as any} size={20} color={colors.textOnGold} />
                    <Text style={[styles.selectedSportChipText, { color: colors.textOnGold }]}>
                      {sportId === 'autre' && customSportName ? customSportName : sport.name}
                    </Text>
                    <X size={16} color={colors.textOnGold} />
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Champ de saisie pour nom personnalisé quand "Autre" est sélectionné */}
            {selectedSports.includes('autre') && (
              <View style={[styles.customSportInputContainer, { backgroundColor: colors.backgroundElevated, borderColor: colors.border }]}>
                <MaterialCommunityIcons name="pencil" size={20} color={colors.accent} />
                <TextInput
                  style={[styles.customSportInput, { color: colors.textPrimary }]}
                  placeholder="Nom du sport..."
                  placeholderTextColor={colors.textMuted}
                  value={customSportName}
                  onChangeText={setCustomSportName}
                  autoCapitalize="words"
                  maxLength={50}
                />
              </View>
            )}
          </View>
        )}

        {/* Bouton Suivant — Étape 1 */}
        {currentStep === 1 && selectedSports.length > 0 && (
          <TouchableOpacity
            style={{
              marginTop: 20, paddingVertical: 18, borderRadius: 16,
              backgroundColor: colors.textPrimary,
              alignItems: 'center',
              shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8,
            }}
            onPress={() => goToStep(2)}
          >
            <Text style={{ fontWeight: '900', fontSize: 16, color: colors.background, letterSpacing: 1 }}>Suivant</Text>
          </TouchableOpacity>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* LIEU D'ENTRAÎNEMENT - Seulement si sport sélectionné */}
        {/* ═══════════════════════════════════════════ */}
                  {currentStep === 2 && selectedSports.length > 0 && (
                    <>
                      <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: SPACING.lg, marginBottom: 10 }}>
                        {t('addTraining.trainingPlace')}
                      </Text>

                      <View style={{ backgroundColor: colors.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border }}>
                                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                                      {/* Option SALLE */}
                                      <TouchableOpacity
                                        style={{
                                          flex: 1,
                                          backgroundColor: !isOutdoor ? colors.accent + '18' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                                          borderColor: !isOutdoor ? colors.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                          borderWidth: !isOutdoor ? 2 : 1,
                                          paddingVertical: 14,
                                          paddingHorizontal: 8,
                                          borderRadius: 14,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 8,
                                          height: 88,
                                        }}
                                        onPress={() => { setIsOutdoor(false); selectionAsync(); }}
                                        activeOpacity={0.75}
                                      >
                                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: !isOutdoor ? colors.accent + '25' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'), alignItems: 'center', justifyContent: 'center' }}>
                                          <Building2 size={18} color={!isOutdoor ? colors.accent : colors.textMuted} />
                                        </View>
                                        <Text style={{ fontWeight: '700', fontSize: 13, color: !isOutdoor ? colors.accent : colors.textMuted, textAlign: 'center' }}>En Salle</Text>
                                      </TouchableOpacity>

                                      {/* Option PLEIN AIR */}
                                      <TouchableOpacity
                                        style={{
                                          flex: 1,
                                          backgroundColor: isOutdoor ? colors.accent + '18' : (isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)'),
                                          borderColor: isOutdoor ? colors.accent : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'),
                                          borderWidth: isOutdoor ? 2 : 1,
                                          paddingVertical: 14,
                                          paddingHorizontal: 8,
                                          borderRadius: 14,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 8,
                                          height: 88,
                                        }}
                                        onPress={() => { setIsOutdoor(true); selectionAsync(); }}
                                        activeOpacity={0.75}
                                      >
                                        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: isOutdoor ? colors.accent + '25' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'), alignItems: 'center', justifyContent: 'center' }}>
                                          <Sun size={18} color={isOutdoor ? colors.accent : colors.textMuted} />
                                        </View>
                                        <Text style={{ fontWeight: '700', fontSize: 13, color: isOutdoor ? colors.accent : colors.textMuted, textAlign: 'center' }}>{t('addTraining.outdoor')}</Text>
                                      </TouchableOpacity>
                                    </View>

                                    {/* RECHERCHE DE LIEU */}
                                    <View style={{ marginBottom: 16 }}>
                                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary, marginBottom: 10 }}>{t('addTraining.trainingPlace')}</Text>

                                      {/* Champ de recherche textuelle */}
                                      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                        <TextInput
                                          style={{
                                            flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF',
                                            padding: 12, borderRadius: 12, color: colors.textPrimary,
                                            fontSize: 14, fontWeight: '500',
                                            borderWidth: 1.5, borderColor: locationLat ? colors.accent : colors.border,
                                          }}
                                          placeholder="Ex: Gracie Barra, Fitness Park..."
                                          placeholderTextColor={colors.textMuted}
                                          value={locationName}
                                          onChangeText={onLocationTextChange}
                                          returnKeyType="search"
                                          onSubmitEditing={() => searchLocation(locationName)}
                                          onFocus={scrollToFocusedInput}
                                          autoCorrect={false}
                                          autoCapitalize="words"
                                        />
                                        <TouchableOpacity
                                          style={{
                                            width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                                            backgroundColor: locationLoading ? colors.border : colors.accent,
                                          }}
                                          disabled={locationLoading || !locationName.trim()}
                                          onPress={() => searchLocation(locationName)}
                                        >
                                          {locationLoading
                                            ? <ActivityIndicator size="small" color="#FFF" />
                                            : <MaterialCommunityIcons name="magnify" size={22} color="#FFF" />
                                          }
                                        </TouchableOpacity>
                                      </View>

                                      {/* Boutons Apple Maps / Google Maps */}
                                      {locationName.trim().length > 1 && (
                                        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }}>
                                          <TouchableOpacity
                                            style={{
                                              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                              gap: 6, paddingVertical: 10, borderRadius: 10,
                                              backgroundColor: isDark ? 'rgba(0,122,255,0.15)' : 'rgba(0,122,255,0.08)',
                                              borderWidth: 1, borderColor: 'rgba(0,122,255,0.3)',
                                            }}
                                            onPress={() => openInMaps('apple')}
                                          >
                                            <MapPin size={13} color="#007AFF" strokeWidth={2.5} />
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#007AFF' }}>Apple Maps</Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            style={{
                                              flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                                              gap: 6, paddingVertical: 10, borderRadius: 10,
                                              backgroundColor: isDark ? 'rgba(66,133,244,0.15)' : 'rgba(66,133,244,0.08)',
                                              borderWidth: 1, borderColor: 'rgba(66,133,244,0.3)',
                                            }}
                                            onPress={() => openInMaps('google')}
                                          >
                                            <MapPin size={13} color="#4285F4" strokeWidth={2.5} />
                                            <Text style={{ fontSize: 12, fontWeight: '700', color: '#4285F4' }}>Google Maps</Text>
                                          </TouchableOpacity>
                                        </View>
                                      )}

                                      {/* Aucun résultat → proposer d'utiliser le nom tel quel */}
                                      {locationNoResults && !locationLoading && locationName.trim().length > 0 && (
                                        <TouchableOpacity
                                          style={{
                                            flexDirection: 'row', alignItems: 'center', gap: 10,
                                            padding: 12, borderRadius: 12, marginBottom: 8,
                                            backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                                            borderWidth: 1, borderColor: colors.border,
                                          }}
                                          onPress={() => {
                                            setLocationNoResults(false);
                                            setLocationSuggestions([]);
                                            selectionAsync();
                                          }}
                                        >
                                          <View style={{
                                            width: 32, height: 32, borderRadius: 8,
                                            backgroundColor: isDark ? 'rgba(255,149,0,0.15)' : 'rgba(255,149,0,0.1)',
                                            alignItems: 'center', justifyContent: 'center',
                                          }}>
                                            <MapPin size={16} color="#FF9500" strokeWidth={2} />
                                          </View>
                                          <View style={{ flex: 1 }}>
                                            <Text style={{ fontSize: 13, fontWeight: '700', color: colors.textPrimary }} numberOfLines={1}>
                                              Utiliser « {locationName.trim()} »
                                            </Text>
                                            <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 1 }}>
                                              Lieu introuvable sur la carte — sauvegarder tel quel
                                            </Text>
                                          </View>
                                        </TouchableOpacity>
                                      )}

                                      {/* Suggestions de résultats — style Google/Apple Maps */}
                                      {locationSuggestions.length > 0 && (
                                        <View style={{
                                          borderRadius: 14,
                                          borderWidth: 1,
                                          borderColor: colors.border,
                                          overflow: 'hidden',
                                          marginBottom: 8,
                                          backgroundColor: colors.backgroundCard,
                                          shadowColor: '#000',
                                          shadowOffset: { width: 0, height: 2 },
                                          shadowOpacity: isDark ? 0.3 : 0.08,
                                          shadowRadius: 6,
                                          elevation: 3,
                                        }}>
                                          {locationSuggestions.map((s, idx) => (
                                            <TouchableOpacity
                                              key={idx}
                                              style={{
                                                flexDirection: 'row',
                                                alignItems: 'center',
                                                paddingHorizontal: 14,
                                                paddingVertical: 12,
                                                backgroundColor: colors.backgroundCard,
                                                borderBottomWidth: idx < locationSuggestions.length - 1 ? 1 : 0,
                                                borderBottomColor: colors.border,
                                                gap: 12,
                                              }}
                                              onPress={() => {
                                                setLocationName(s.name);
                                                setLocationLat(s.lat);
                                                setLocationLon(s.lon);
                                                setLocationSuggestions([]);
                                                setLocationNoResults(false);
                                                selectionAsync();
                                              }}
                                            >
                                              <View style={{
                                                width: 32, height: 32, borderRadius: 8,
                                                backgroundColor: isDark ? 'rgba(255,59,48,0.15)' : 'rgba(255,59,48,0.1)',
                                                alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                              }}>
                                                <MapPin size={16} color="#FF3B30" strokeWidth={2} />
                                              </View>
                                              <View style={{ flex: 1 }}>
                                                <Text style={{ fontSize: 14, fontWeight: '600', color: colors.textPrimary }} numberOfLines={1}>{s.name}</Text>
                                                {s.address ? <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }} numberOfLines={1}>{s.address}</Text> : null}
                                              </View>
                                            </TouchableOpacity>
                                          ))}
                                        </View>
                                      )}

                                      {/* Lieu validé avec coordonnées */}
                                      {locationLat && locationLon && locationSuggestions.length === 0 && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 10, backgroundColor: colors.accent + '15', borderWidth: 1, borderColor: colors.accent + '40' }}>
                                          <MaterialCommunityIcons name="map-marker-check" size={16} color={colors.accent} />
                                          <Text style={{ flex: 1, fontSize: 12, color: colors.accent, fontWeight: '600' }}>
                                            {locationName || `${locationLat.toFixed(4)}, ${locationLon.toFixed(4)}`}
                                          </Text>
                                          <TouchableOpacity onPress={() => { setLocationLat(null); setLocationLon(null); setLocationName(''); }} style={{ padding: 4 }}>
                                            <X size={14} color={colors.textMuted} />
                                          </TouchableOpacity>
                                        </View>
                                      )}

                                      {/* Position GPS comme option secondaire */}
                                      {!locationLat && (
                                        <TouchableOpacity
                                          style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 6 }}
                                          onPress={captureGPS}
                                          disabled={locationLoading}
                                        >
                                          <MaterialCommunityIcons name="crosshairs-gps" size={14} color={colors.textMuted} />
                                          <Text style={{ fontSize: 12, color: colors.textMuted, fontWeight: '500' }}>
                                            Ou utiliser ma position GPS actuelle
                                          </Text>
                                        </TouchableOpacity>
                                      )}
                                    </View>

                      {/* LISTE DES CLUBS */}
                          <Text style={[styles.clubSectionTitle, { color: colors.textMuted }]}>Sélectionne ton club</Text>

                          {/* Barre de recherche clubs */}
                          {clubs.length > 2 && (
                            <View style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              backgroundColor: colors.backgroundElevated,
                              borderRadius: 12,
                              paddingHorizontal: 12,
                              paddingVertical: 8,
                              marginBottom: 10,
                              borderWidth: 1,
                              borderColor: colors.border,
                              gap: 8,
                            }}>
                              <Search size={15} color={colors.textMuted} strokeWidth={2} />
                              <TextInput
                                style={{ flex: 1, fontSize: 14, color: colors.textPrimary, padding: 0 }}
                                placeholder="Rechercher un club..."
                                placeholderTextColor={colors.textMuted}
                                value={clubSearchQuery}
                                onChangeText={setClubSearchQuery}
                                returnKeyType="search"
                                clearButtonMode="while-editing"
                                onFocus={scrollToFocusedInput}
                              />
                            </View>
                          )}

                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.clubsScroll}
                            contentContainerStyle={styles.clubsScrollContent}
                          >
                            {/* Option Sans club - cachée si recherche active */}
                            {!clubSearchQuery && (
                            <TouchableOpacity
                              style={[
                                styles.clubCard,
                                { backgroundColor: colors.card, borderColor: colors.border },
                                !selectedClub && { borderColor: colors.accent, borderStyle: 'solid', borderWidth: 2 },
                              ]}
                              onPress={() => setSelectedClub(null)}
                            >
                              <View style={[styles.clubCardIcon, { backgroundColor: colors.backgroundElevated }]}>
                                <Home size={24} color={!selectedClub ? colors.textPrimary : colors.textSecondary} strokeWidth={2} />
                              </View>
                              <Text style={[styles.clubCardName, { color: !selectedClub ? colors.textPrimary : colors.textSecondary, fontWeight: !selectedClub ? '700' : '500' }]}>
                                Sans club
                              </Text>
                            </TouchableOpacity>
                            )}

                            {/* Clubs enregistrés - filtrés par recherche + triés par pertinence */}
                            {[...clubs]
                              .filter(club => {
                                if (!clubSearchQuery.trim()) return true;
                                const q = clubSearchQuery.trim().toLowerCase();
                                return (club.name || '').toLowerCase().includes(q);
                              })
                              .sort((a, b) => {
                                const aMatches = selectedSports.includes(a.sport || '');
                                const bMatches = selectedSports.includes(b.sport || '');
                                if (aMatches && !bMatches) return -1;
                                if (!aMatches && bMatches) return 1;
                                return 0;
                              })
                              .map((club) => {
                              const isMatchingSport = selectedSports.includes(club.sport || '');
                              return (
                              <TouchableOpacity
                                key={club.id}
                                style={[
                                  styles.clubCard,
                                  {
                                    backgroundColor: selectedClub?.id === club.id ? colors.goldMuted : isMatchingSport ? colors.accent + '10' : colors.card,
                                    borderColor: selectedClub?.id === club.id ? colors.gold : isMatchingSport ? colors.accent + '40' : colors.border,
                                    borderWidth: selectedClub?.id === club.id ? 2 : 1,
                                    opacity: isMatchingSport ? 1 : 0.6,
                                  },
                                ]}
                                onPress={() => setSelectedClub(club)}
                              >
                                {(() => {
                                  const logoSource = club.logo_uri ? getClubLogoSource(club.logo_uri) : null;
                                  if (logoSource) {
                                    return (
                                      <Image
                                        source={logoSource}
                                        style={styles.clubCardLogo}
                                        resizeMode="cover"
                                      />
                                    );
                                  }
                                  return (
                                    <View style={[styles.clubCardIcon, { backgroundColor: club.color || colors.backgroundElevated }]}>
                                      <MaterialCommunityIcons
                                        name={getSportIcon(club.sport || 'autre') as any}
                                        size={24}
                                        color="#FFFFFF"
                                      />
                                    </View>
                                  );
                                })()}
                                <Text
                                  style={[
                                    styles.clubCardName,
                                    { color: selectedClub?.id === club.id ? colors.gold : colors.textPrimary },
                                  ]}
                                  numberOfLines={1}
                                >
                                  {club.name}
                                </Text>
                                {isMatchingSport && (
                                  <View style={[styles.matchingBadge, { backgroundColor: colors.accent }]}>
                                    <Check size={10} color={colors.textOnAccent} strokeWidth={3} />
                                  </View>
                                )}
                              </TouchableOpacity>
                            );
                            })}
        
                            {/* Message aucun résultat */}
                            {clubSearchQuery.trim().length > 0 &&
                              clubs.filter(c => (c.name || '').toLowerCase().includes(clubSearchQuery.trim().toLowerCase())).length === 0 && (
                              <View style={{ alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 8 }}>
                                <Text style={{ color: colors.textMuted, fontSize: 13, textAlign: 'center' }}>
                                  Aucun club "{clubSearchQuery}" enregistré.
                                </Text>
                                <TouchableOpacity
                                  style={{ marginTop: 6 }}
                                  onPress={() => { router.push('/add-club' as any); }}
                                >
                                  <Text style={{ color: colors.accent, fontSize: 13, fontWeight: '700' }}>+ Ajouter ce club</Text>
                                </TouchableOpacity>
                              </View>
                            )}

                            {/* Bouton Créer un club - caché si recherche active */}
                            {!clubSearchQuery && (
                            <TouchableOpacity
                              style={[
                                styles.clubCard,
                                { backgroundColor: colors.card, borderColor: colors.border, borderStyle: 'dashed' },
                              ]}
                              onPress={() => router.push('/add-club' as any)}
                            >
                              <View style={[styles.clubCardIcon, { backgroundColor: colors.backgroundElevated }]}>
                                <Plus size={24} color={colors.accent} strokeWidth={2} />
                              </View>
                              <Text style={[styles.clubCardName, { color: isDark ? colors.accent : colors.textPrimary }]}>
                                Créer
                              </Text>
                            </TouchableOpacity>
                            )}
                          </ScrollView>
                      </View>
                    </>
                  )}
        {/* ═══════════════════════════════════════════ */}
        {/* ÉTAPE 3: DÉTAILS DE LA SÉANCE */}
        {/* ═══════════════════════════════════════════ */}
        {currentStep === 2 && selectedSports.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: SPACING.lg, marginBottom: 10 }}>
              Configure ta séance
            </Text>
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>

        {/* Options pour chaque sport sélectionné */}
        {selectedSports.map((sportId) => {
          const sport = SPORTS.find(s => s.id === sportId);
          const options = getOptionsForSport(sportId);
          const sportSelectedOptions = selectedOptions[sportId] || [];

          if (!sport || options.length === 0) return null;

          return (
            <View key={`options-${sportId}`} style={[styles.sportOptionsSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={styles.sportOptionsHeader}>
                <Text style={[styles.sportOptionsTitle, { color: colors.textPrimary }]}>
                  {sport.name}
                </Text>
              </View>
              
              {/* Groupement des options en accordéons */}
              {(() => {
                // Filtrer les options par recherche
                const filteredOptions = options.filter(opt => 
                  opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  (opt.group && opt.group.toLowerCase().includes(searchQuery.toLowerCase()))
                );

                if (filteredOptions.length === 0 && searchQuery.length > 0) {
                  return (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <Text style={{ color: colors.textMuted, fontStyle: 'italic' }}>Aucun exercice trouvé pour "{searchQuery}"</Text>
                    </View>
                  );
                }

                const grouped: Record<string, SportOption[]> = {};
                filteredOptions.forEach(opt => {
                  const gName = opt.group || 'GÉNÉRAL';
                  if (!grouped[gName]) grouped[gName] = [];
                  grouped[gName].push(opt);
                });

                return Object.entries(grouped).map(([groupName, groupOpts]) => {
                  const groupId = `${sportId}-${groupName}`;
                  // Si recherche active, on force l'ouverture
                  const isExpanded = searchQuery.length > 0 || expandedGroups.includes(groupId);
                  
                  // Check if group is validated (at least one valid exercise)
                  const isGroupValidated = groupOpts.some(option => {
                     if (!sportSelectedOptions.includes(option.id)) return false;
                     const stats = optionStats[option.id];
                     
                     // Classification Logic (Consistent)
                     const isRun = option.id.startsWith('r_') || option.id.includes('run_');
                     const isSwim = option.id.startsWith('sw_') || option.id.includes('swim_');
                     const isWalk = option.id.startsWith('ma_');
                     const isBike = option.id.startsWith('ve_') || option.id.includes('velo') || option.id.includes('spinning');
                     const isCardioMachine = option.id.includes('car_') || option.group === 'CARDIO';
                     const isCombat = ['bo_', 'mt_', 'kb_', 'mma_', 'jjb_', 'j_', 'lu_', 'g_', 'p_', 's_', 't_', 'training', 'technique', 'sparring', 'competition'].some(prefix => option.id.startsWith(prefix));

                     const isCardio = isRun || isSwim || isWalk || isBike || isCardioMachine || option.group === 'DISTANCES';
                     const isStrength = !isCardio && !isCombat;
                     
                     if (!isStrength) return true;
                     return stats && (stats.weight || stats.reps);
                  });

                  const selectedInGroup = groupOpts.filter(o => sportSelectedOptions.includes(o.id)).length;
                  return (
                    <View key={groupName} style={{ marginBottom: 8 }}>
                      <TouchableOpacity
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          paddingVertical: 13,
                          paddingHorizontal: 14,
                          backgroundColor: isGroupValidated
                            ? (isDark ? 'rgba(16,185,129,0.14)' : 'rgba(16,185,129,0.1)')
                            : selectedInGroup > 0
                              ? (isDark ? `${sport.color}22` : `${sport.color}18`)
                              : (isDark ? 'rgba(255,255,255,0.06)' : `${sport.color}0E`),
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isGroupValidated
                            ? 'rgba(16,185,129,0.45)'
                            : selectedInGroup > 0
                              ? `${sport.color}60`
                              : (isDark ? 'rgba(255,255,255,0.1)' : `${sport.color}30`),
                        }}
                        onPress={() => toggleGroup(groupId)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 28, height: 28, borderRadius: 8, backgroundColor: isGroupValidated ? 'rgba(16,185,129,0.25)' : `${sport.color}25`, alignItems: 'center', justifyContent: 'center' }}>
                            <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: isGroupValidated ? '#10B981' : sport.color }} />
                          </View>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: isGroupValidated ? '#10B981' : selectedInGroup > 0 ? sport.color : colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{groupName}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          {selectedInGroup > 0 && (
                            <View style={{ backgroundColor: isGroupValidated ? '#10B981' : sport.color, borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 }}>
                              <Text style={{ fontSize: 10, fontWeight: '800', color: '#fff' }}>{selectedInGroup}</Text>
                            </View>
                          )}
                          <Text style={{ fontSize: 11, color: isGroupValidated ? '#10B981' : colors.textMuted, fontWeight: '500' }}>{groupOpts.length} exos</Text>
                          {isExpanded ? <ChevronDown size={16} color={colors.textMuted} /> : <ChevronRight size={16} color={colors.textMuted} />}
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={{ marginTop: 12, paddingHorizontal: 4 }}>
                          <View style={styles.sportOptionsGrid}>
                            {groupOpts.map((option) => {
                              const isSelected = sportSelectedOptions.includes(option.id);
                              const stats = optionStats[option.id] || { weight: '', reps: '' };
                              
                              // Classification Logic
                              const isRun = option.id.startsWith('r_') || option.id.includes('run_');
                              const isSwim = option.id.startsWith('sw_') || option.id.includes('swim_');
                              const isWalk = option.id.startsWith('ma_');
                              const isBike = option.id.startsWith('ve_') || option.id.includes('velo') || option.id.includes('spinning');
                              const isCardioMachine = option.id.includes('car_') || option.group === 'CARDIO';
                              const isCombat = ['bo_', 'mt_', 'kb_', 'mma_', 'jjb_', 'j_', 'lu_', 'g_', 'p_', 's_', 't_', 'training', 'technique', 'sparring', 'competition'].some(prefix => option.id.startsWith(prefix));

                              const isCardio = isRun || isSwim || isWalk || isBike || isCardioMachine || option.group === 'DISTANCES';
                              const isStrength = !isCardio && !isCombat;

                              // Validation Logic - Ne valide QUE si explicitement validé via le bouton
                              const isValid = validatedOptions[option.id] === true;

                              // Couleur accent de l'exercice (depuis option.color ou groupe)
                              const exColor = option.color || colors.accent;
                              // Résumé pour l'état validé
                              const validSummary = (() => {
                                if (!isValid || !isStrength) return null;
                                const allS = (stats.sets_data || []).filter((s: any) => s.weight || s.reps);
                                const nS = allS.length;
                                const maxW = allS.reduce((m: number, s: any) => Math.max(m, parseFloat(s.weight || '0')), 0);
                                const calcO = (w: number, r: number) => w > 0 && r > 1 && r <= 15 ? Math.round(w * (1 + r / 30) * 2) / 2 : 0;
                                const bestO = allS.reduce((m: number, s: any) => Math.max(m, calcO(parseFloat(s.weight || '0'), parseInt(s.reps || '0'))), 0);
                                if (nS === 0) return null;
                                return `${nS} série${nS > 1 ? 's' : ''}${maxW > 0 ? ` · ${maxW} kg` : ''}${bestO > 0 ? ` · 1RM ${bestO} kg` : ''}`;
                              })();
                              const hasData = stats.sets_data?.some((s: any) => s.weight && s.reps) || (stats.weight && stats.reps);

                              return (
                                <View key={option.id} style={{ marginBottom: 8, width: '100%' }}>
                                  {/* Ligne exercice */}
                                  <TouchableOpacity
                                    style={{
                                      flexDirection: 'row',
                                      alignItems: 'center',
                                      paddingVertical: 12,
                                      paddingHorizontal: 12,
                                      backgroundColor: isSelected
                                        ? (isValid
                                          ? (isDark ? 'rgba(16,185,129,0.1)' : 'rgba(16,185,129,0.08)')
                                          : (isDark ? `${exColor}16` : `${exColor}12`))
                                        : (isDark ? 'rgba(255,255,255,0.04)' : `${exColor}08`),
                                      borderRadius: 10,
                                      borderWidth: 1,
                                      borderColor: isValid
                                        ? 'rgba(16,185,129,0.4)'
                                        : isSelected
                                          ? `${exColor}50`
                                          : (isDark ? 'rgba(255,255,255,0.08)' : `${exColor}25`),
                                      borderBottomLeftRadius: isSelected && !isValid ? 0 : 10,
                                      borderBottomRightRadius: isSelected && !isValid ? 0 : 10,
                                      borderBottomWidth: isSelected && !isValid ? 0 : 1,
                                      gap: 10,
                                    }}
                                    onPress={() => {
                                      if (isValid) return;
                                      toggleOption(sportId, option.id);
                                    }}
                                  >
                                    {/* Barre de couleur gauche */}
                                    <View style={{ width: 4, height: 34, borderRadius: 2, backgroundColor: isSelected ? (isValid ? '#10B981' : exColor) : `${exColor}50` }} />

                                    {/* Texte + groupe + résumé */}
                                    <View style={{ flex: 1 }}>
                                      <Text style={{
                                        fontSize: 14,
                                        color: isValid ? '#10B981' : (isSelected ? colors.textPrimary : colors.textSecondary),
                                        fontWeight: isSelected ? '700' : '400',
                                      }}>
                                        {option.label}
                                      </Text>
                                      {isSelected && !isValid && option.group && (
                                        <Text style={{ fontSize: 10, color: exColor, fontWeight: '700', marginTop: 1, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                                          {option.group}
                                        </Text>
                                      )}
                                      {validSummary && (
                                        <Text style={{ fontSize: 11, color: '#10B981', fontWeight: '600', marginTop: 2 }}>{validSummary}</Text>
                                      )}
                                    </View>

                                    {/* Bouton valider / badge validé */}
                                    {isSelected && !isValid && (
                                      <TouchableOpacity
                                        onPress={(e) => {
                                          e.stopPropagation();
                                          if (isStrength && !hasData) return;
                                          setValidatedOptions(prev => ({ ...prev, [option.id]: true }));
                                          Keyboard.dismiss();
                                          notificationAsync(NotificationFeedbackType.Success);
                                        }}
                                        style={{
                                          backgroundColor: (isStrength && !hasData)
                                            ? (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.07)')
                                            : exColor,
                                          width: 32,
                                          height: 32,
                                          borderRadius: 16,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                        }}
                                        activeOpacity={0.7}
                                      >
                                        <Check size={16} color={(isStrength && !hasData) ? colors.textMuted : '#FFF'} />
                                      </TouchableOpacity>
                                    )}
                                    {isSelected && isValid && (
                                      <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: '#10B981', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={16} color="#FFF" />
                                      </View>
                                    )}
                                  </TouchableOpacity>

                                  {/* Zone de saisie */}
                                  {isSelected && !isValid && (
                                    <View style={{
                                      backgroundColor: isDark ? `${exColor}07` : `${exColor}05`,
                                      borderColor: `${exColor}30`,
                                      borderWidth: 1,
                                      borderTopWidth: 0,
                                      borderBottomLeftRadius: 10,
                                      borderBottomRightRadius: 10,
                                      paddingHorizontal: 12,
                                      paddingTop: 0,
                                      paddingBottom: 12,
                                      overflow: 'hidden',
                                    }}>
                                      {/* En-têtes colonnes (uniquement musculation) */}
                                      {isStrength && (
                                        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 6, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)' }}>
                                          <Text style={{ width: 36, fontSize: 9, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>SÉR.</Text>
                                          <Text style={{ flex: 1, fontSize: 9, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>POIDS (kg)</Text>
                                          <Text style={{ width: 70, fontSize: 9, fontWeight: '700', color: colors.textMuted, textAlign: 'center' }}>REPS</Text>
                                          <View style={{ width: 52 }} />
                                        </View>
                                      )}
                                        {isStrength && (() => {
                                          const setsArr = stats.sets_data && stats.sets_data.length > 0
                                            ? stats.sets_data
                                            : [{ weight: stats.weight ?? '', reps: stats.reps ?? '' }];
                                          const updateSet = (si: number, key: 'weight' | 'reps', val: string) => {
                                            const arr = [...setsArr];
                                            arr[si] = { ...arr[si], [key]: val };
                                            setOptionStats(prev => ({ ...prev, [option.id]: { ...stats, sets_data: arr } }));
                                          };
                                          const addSet = () => {
                                            const last = setsArr[setsArr.length - 1];
                                            setOptionStats(prev => ({ ...prev, [option.id]: { ...stats, sets_data: [...setsArr, { weight: last.weight, reps: last.reps }] } }));
                                          };
                                          const removeSet = (si: number) => {
                                            const arr = setsArr.filter((_, i) => i !== si);
                                            setOptionStats(prev => ({ ...prev, [option.id]: { ...stats, sets_data: arr.length > 0 ? arr : [{ weight: '', reps: '' }] } }));
                                          };
                                          const removeExercise = () => {
                                            setOptionStats(prev => { const n = { ...prev }; delete n[option.id]; return n; });
                                            setValidatedOptions(prev => { const n = { ...prev }; delete n[option.id]; return n; });
                                            toggleOption(sportId, option.id);
                                          };
                                          // Helpers musculation
                                          const calc1RM = (w: number, r: number) =>
                                            w > 0 && r > 1 && r <= 15 ? Math.round(w * (1 + r / 30) * 2) / 2 : 0;
                                          const prevPerf = lastExercisePerf[option.label];
                                          // Volume total (séries avec données)
                                          const totalVolume = setsArr.reduce((sum, s) => {
                                            const w = parseFloat(s.weight || '0');
                                            const r = parseInt(s.reps || '0');
                                            return sum + (w > 0 && r > 0 ? w * r : 0);
                                          }, 0);
                                          // Meilleur 1RM de la séance actuelle
                                          const currentBest1RM = setsArr.reduce((max, s) => {
                                            const orm = calc1RM(parseFloat(s.weight || '0'), parseInt(s.reps || '0'));
                                            return Math.max(max, orm);
                                          }, 0);
                                          // PR = meilleur 1RM de cette séance > record all-time (hors séance en cours)
                                          const isPR = currentBest1RM > 0 && (
                                            !allTimeBest1RM[option.label] || currentBest1RM > allTimeBest1RM[option.label]
                                          );
                                          // Nb de jours depuis la dernière fois
                                          const daysAgo = prevPerf
                                            ? Math.round((Date.now() - new Date(prevPerf.date).getTime()) / 86400000)
                                            : null;
                                          // Chrono repos : démarrer 90s pour un exo, identifié par exId_si
                                          const startRest = (si: number, seconds = 90) => {
                                            const key = `${option.id}_${si}`;
                                            if (restIntervalRef.current[key]) clearInterval(restIntervalRef.current[key]);
                                            setRestTimers(prev => ({ ...prev, [key]: seconds }));
                                            restIntervalRef.current[key] = setInterval(() => {
                                              setRestTimers(prev => {
                                                const next = (prev[key] ?? 1) - 1;
                                                if (next <= 0) {
                                                  clearInterval(restIntervalRef.current[key]);
                                                  delete restIntervalRef.current[key];
                                                  const { [key]: _, ...rest } = prev;
                                                  return rest;
                                                }
                                                return { ...prev, [key]: next };
                                              });
                                            }, 1000);
                                          };
                                          const stopRest = (si: number) => {
                                            const key = `${option.id}_${si}`;
                                            clearInterval(restIntervalRef.current[key]);
                                            delete restIntervalRef.current[key];
                                            setRestTimers(prev => { const { [key]: _, ...rest } = prev; return rest; });
                                          };

                                          return (
                                            <View style={{ gap: 5 }}>
                                              {/* ── Bannière dernière perf ── */}
                                              {prevPerf && (
                                                <View style={{
                                                  flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                                                  backgroundColor: isDark ? 'rgba(99,102,241,0.1)' : 'rgba(99,102,241,0.07)',
                                                  borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6, marginBottom: 6,
                                                  borderWidth: 1, borderColor: isDark ? 'rgba(99,102,241,0.25)' : 'rgba(99,102,241,0.2)',
                                                }}>
                                                  <View style={{ flex: 1 }}>
                                                    <Text style={{ fontSize: 9, fontWeight: '700', color: '#6366F1', marginBottom: 1 }}>
                                                      DERNIÈRE FOIS {daysAgo === 0 ? "AUJOURD'HUI" : daysAgo === 1 ? 'HIER' : `IL Y A ${daysAgo}J`}
                                                    </Text>
                                                    <Text style={{ fontSize: 11, color: colors.textSecondary, fontWeight: '600' }} numberOfLines={1}>
                                                      {prevPerf.sets.slice(0, 4).map((s, i) => `S${i+1} ${s.weight}kg×${s.reps}`).join('  ')}
                                                    </Text>
                                                  </View>
                                                  <TouchableOpacity
                                                    onPress={() => {
                                                      const newData = prevPerf.sets.map(s => ({ weight: s.weight.toString(), reps: s.reps.toString() }));
                                                      setOptionStats(prev => ({ ...prev, [option.id]: { ...stats, sets_data: newData } }));
                                                      impactAsync(ImpactFeedbackStyle.Medium);
                                                    }}
                                                    style={{ backgroundColor: '#6366F1', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4, marginLeft: 8 }}
                                                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
                                                  >
                                                    <Text style={{ fontSize: 10, fontWeight: '800', color: '#FFF' }}>↩ Reprendre</Text>
                                                  </TouchableOpacity>
                                                </View>
                                              )}

                                              {/* ── Lignes de séries ── */}
                                              {setsArr.map((set, si) => {
                                                const w = parseFloat(set.weight || '0');
                                                const r = parseInt(set.reps || '0');
                                                const setORM = calc1RM(w, r);
                                                const setIsPR = setORM > 0 && (!allTimeBest1RM[option.label] || setORM > allTimeBest1RM[option.label]);
                                                const setDone = w > 0 && r > 0;
                                                return (
                                                  <View key={si} style={{
                                                    borderRadius: 8,
                                                    backgroundColor: setDone
                                                      ? (isDark ? `${exColor}15` : `${exColor}0C`)
                                                      : 'transparent',
                                                    paddingHorizontal: 0,
                                                    paddingVertical: setDone ? 4 : 2,
                                                    marginBottom: 2,
                                                  }}>
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                                      {/* Badge numéro de série */}
                                                      <View style={{
                                                        width: 26, height: 26, borderRadius: 13,
                                                        backgroundColor: setDone ? exColor : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'),
                                                        alignItems: 'center', justifyContent: 'center',
                                                      }}>
                                                        <Text style={{ fontSize: 11, fontWeight: '800', color: setDone ? '#FFF' : colors.textMuted }}>{si + 1}</Text>
                                                      </View>

                                                      {/* Poids avec boutons ± 2.5 */}
                                                      <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                        <TouchableOpacity
                                                          onPress={() => {
                                                            const v = Math.max(0, parseFloat(set.weight || '0') - 2.5);
                                                            updateSet(si, 'weight', v % 1 === 0 ? v.toString() : v.toFixed(1));
                                                            impactAsync(ImpactFeedbackStyle.Light);
                                                          }}
                                                          style={{ width: 26, height: 40, borderRadius: 7, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}
                                                          hitSlop={{ top: 4, bottom: 4 }}
                                                        >
                                                          <Text style={{ color: colors.textSecondary, fontSize: 17, fontWeight: '300', lineHeight: 20 }}>−</Text>
                                                        </TouchableOpacity>
                                                        <TextInput
                                                          style={{ flex: 1, height: 40, backgroundColor: colors.backgroundCard, borderRadius: 8, textAlign: 'center', color: colors.textPrimary, fontWeight: '800', fontSize: 15, borderWidth: 1, borderColor: setDone ? `${exColor}50` : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') }}
                                                          placeholder="kg"
                                                          placeholderTextColor={colors.textMuted}
                                                          keyboardType="decimal-pad"
                                                          value={set.weight}
                                                          onChangeText={(val) => updateSet(si, 'weight', val.replace(',', '.'))}
                                                          onFocus={scrollToFocusedInput}
                                                        />
                                                        <TouchableOpacity
                                                          onPress={() => {
                                                            const v = parseFloat(set.weight || '0') + 2.5;
                                                            updateSet(si, 'weight', v % 1 === 0 ? v.toString() : v.toFixed(1));
                                                            impactAsync(ImpactFeedbackStyle.Light);
                                                          }}
                                                          style={{ width: 26, height: 40, borderRadius: 7, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}
                                                          hitSlop={{ top: 4, bottom: 4 }}
                                                        >
                                                          <Text style={{ color: colors.textSecondary, fontSize: 17, fontWeight: '300', lineHeight: 20 }}>+</Text>
                                                        </TouchableOpacity>
                                                      </View>

                                                      {/* Séparateur × */}
                                                      <Text style={{ color: colors.textMuted, fontSize: 14, fontWeight: '300', width: 10, textAlign: 'center' }}>×</Text>

                                                      {/* Reps avec boutons ± 1 */}
                                                      <View style={{ width: 94, flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                                        <TouchableOpacity
                                                          onPress={() => {
                                                            const v = Math.max(1, parseInt(set.reps || '0') - 1);
                                                            updateSet(si, 'reps', v.toString());
                                                            impactAsync(ImpactFeedbackStyle.Light);
                                                          }}
                                                          style={{ width: 24, height: 40, borderRadius: 7, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}
                                                          hitSlop={{ top: 4, bottom: 4 }}
                                                        >
                                                          <Text style={{ color: colors.textSecondary, fontSize: 17, fontWeight: '300', lineHeight: 20 }}>−</Text>
                                                        </TouchableOpacity>
                                                        <TextInput
                                                          style={{ flex: 1, height: 40, backgroundColor: colors.backgroundCard, borderRadius: 8, textAlign: 'center', color: colors.textPrimary, fontWeight: '800', fontSize: 15, borderWidth: 1, borderColor: setDone ? `${exColor}50` : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') }}
                                                          placeholder="reps"
                                                          placeholderTextColor={colors.textMuted}
                                                          keyboardType="number-pad"
                                                          value={set.reps}
                                                          onChangeText={(val) => updateSet(si, 'reps', val)}
                                                          onFocus={scrollToFocusedInput}
                                                        />
                                                        <TouchableOpacity
                                                          onPress={() => {
                                                            const v = parseInt(set.reps || '0') + 1;
                                                            updateSet(si, 'reps', v.toString());
                                                            impactAsync(ImpactFeedbackStyle.Light);
                                                          }}
                                                          style={{ width: 24, height: 40, borderRadius: 7, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.06)', alignItems: 'center', justifyContent: 'center' }}
                                                          hitSlop={{ top: 4, bottom: 4 }}
                                                        >
                                                          <Text style={{ color: colors.textSecondary, fontSize: 17, fontWeight: '300', lineHeight: 20 }}>+</Text>
                                                        </TouchableOpacity>
                                                      </View>

                                                      {/* Bouton + série ou espace */}
                                                      {si === setsArr.length - 1 ? (
                                                        <TouchableOpacity
                                                          onPress={addSet}
                                                          style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: isDark ? `${exColor}25` : `${exColor}18`, alignItems: 'center', justifyContent: 'center' }}
                                                        >
                                                          <Plus size={13} color={exColor} />
                                                        </TouchableOpacity>
                                                      ) : (
                                                        <View style={{ width: 28 }} />
                                                      )}

                                                      {/* Supprimer */}
                                                      {si > 0 ? (
                                                        <TouchableOpacity onPress={() => removeSet(si)} hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}>
                                                          <X size={13} color={colors.textMuted} />
                                                        </TouchableOpacity>
                                                      ) : (
                                                        <TouchableOpacity onPress={removeExercise} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                                          <X size={15} color={colors.textMuted} />
                                                        </TouchableOpacity>
                                                      )}
                                                    </View>

                                                    {/* Ligne infos : 1RM + progression + timer repos */}
                                                    {setDone && (
                                                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 31, marginTop: 3, gap: 6 }}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 }}>
                                                          {setORM > 0 && (
                                                            <Text style={{ fontSize: 10, fontWeight: '600', color: setIsPR ? '#F59E0B' : colors.textMuted }}>
                                                              {setIsPR ? '🏆 PR · ' : ''}1RM ~{setORM} kg{setIsPR ? ' 🔥' : ''}
                                                            </Text>
                                                          )}
                                                          {(() => {
                                                            const prevSet = prevPerf?.sets[si];
                                                            if (!prevSet || prevSet.weight <= 0) return null;
                                                            const diff = w - prevSet.weight;
                                                            if (diff === 0) return (
                                                              <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted }}>= même poids</Text>
                                                            );
                                                            return (
                                                              <Text style={{ fontSize: 10, fontWeight: '700', color: diff > 0 ? '#10B981' : '#F97316' }}>
                                                                {diff > 0 ? '▲' : '▼'} {Math.abs(diff) % 1 === 0 ? Math.abs(diff) : Math.abs(diff).toFixed(1)} kg
                                                              </Text>
                                                            );
                                                          })()}
                                                        </View>
                                                        {/* Chronomètre repos */}
                                                        {(() => {
                                                          const timerKey = `${option.id}_${si}`;
                                                          const remaining = restTimers[timerKey];
                                                          if (remaining !== undefined) {
                                                            const mins = Math.floor(remaining / 60);
                                                            const secs = remaining % 60;
                                                            return (
                                                              <TouchableOpacity
                                                                onPress={() => stopRest(si)}
                                                                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: remaining <= 10 ? '#EF444420' : `${exColor}20`, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 }}
                                                              >
                                                                <Text style={{ fontSize: 11, fontWeight: '800', color: remaining <= 10 ? '#EF4444' : exColor }}>
                                                                  {mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`}
                                                                </Text>
                                                                <X size={10} color={remaining <= 10 ? '#EF4444' : exColor} />
                                                              </TouchableOpacity>
                                                            );
                                                          }
                                                          return (
                                                            <TouchableOpacity
                                                              onPress={() => { startRest(si); impactAsync(ImpactFeedbackStyle.Light); }}
                                                              style={{ flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.05)', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 3 }}
                                                            >
                                                              <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>⏱ Repos 90s</Text>
                                                            </TouchableOpacity>
                                                          );
                                                        })()}
                                                      </View>
                                                    )}
                                                  </View>
                                                );
                                              })}

                                              {/* ── Barre de stats volume + 1RM ── */}
                                              {totalVolume > 0 && (
                                                <View style={{
                                                  flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                                                  marginTop: 8, paddingTop: 8, paddingHorizontal: 4,
                                                  borderTopWidth: 1, borderTopColor: `${exColor}20`,
                                                }}>
                                                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                    <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: exColor }} />
                                                    <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                                      Volume <Text style={{ fontWeight: '800', color: colors.textPrimary }}>{totalVolume.toLocaleString('fr-FR')} kg</Text>
                                                    </Text>
                                                  </View>
                                                  {currentBest1RM > 0 && (
                                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                                      <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isPR ? '#F59E0B' : colors.textMuted }} />
                                                      <Text style={{ fontSize: 11, color: colors.textMuted }}>
                                                        {isPR ? '🏆 PR ' : '1RM '}<Text style={{ fontWeight: '800', color: isPR ? '#F59E0B' : colors.textPrimary }}>{currentBest1RM} kg</Text>
                                                      </Text>
                                                    </View>
                                                  )}
                                                </View>
                                              )}
                                            </View>
                                          );
                                        })()}
                                        {isCardio && renderPerformanceFields(option.id, option.label, sportId)}

                                        {/* NOTES POUR COMBAT / TECHNIQUE */}
                                        {isCombat && (
                                          <View style={{ marginTop: 10 }}>
                                            <TextInput
                                              style={{
                                                backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF',
                                                padding: 10,
                                                borderRadius: 8,
                                                color: colors.textPrimary,
                                                fontSize: 12,
                                                borderWidth: 1,
                                                borderColor: colors.border,
                                                minHeight: 40,
                                                textAlignVertical: 'top'
                                              }}
                                              placeholder="Détails (ex: Partenaire, technique apprise...)"
                                              placeholderTextColor={colors.textMuted}
                                              multiline
                                              value={optionStats[option.id]?.notes || ''}
                                              onChangeText={(val) => setOptionStats(prev => ({ ...prev, [option.id]: { ...prev[option.id], notes: val } }))}
                                              onFocus={scrollToFocusedInput}
                                            />
                                          </View>
                                        )}
                                    </View>
                                  )}
                                </View>
                              );
                            })}
                          </View>
                        </View>
                      )}
                    </View>
                  );
                });
              })()}

              {/* ═══ FIN OPTIONS ═══ */}
            </View>
          );
        })}

              {/* PERSONNALISATION MANUELLE */}
              <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                      <Text style={[styles.sportOptionsTitle, { color: colors.textPrimary, marginBottom: 4 }]}>Ajouter manuellement</Text>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>Exercice ou détail spécifique :</Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                                          <TextInput
                                            style={[styles.notesInput, { flex: 1, minHeight: 50, marginBottom: 0, paddingVertical: 10, color: colors.textPrimary }]}
                                            placeholder="Ex: 50 tractions, Sparring intensif..."
                                            placeholderTextColor={colors.textMuted}
                          value={customExerciseName}
                          onChangeText={setCustomExerciseName}
                          onFocus={scrollToFocusedInput}
                        />
                        <TouchableOpacity 
                          style={{ 
                            backgroundColor: colors.gold, 
                            paddingHorizontal: 15, 
                            borderRadius: 12, 
                            justifyContent: 'center', 
                            alignItems: 'center' 
                          }}
                          onPress={() => {
                            if (customExerciseName.trim()) {
                              setExercises(prev => [...prev, { name: customExerciseName.trim(), sets: 0, reps: 0, weight: 0 }]);
                              setCustomExerciseName('');
                              impactAsync(ImpactFeedbackStyle.Light);
                            }
                          }}
                        >
                          <Plus size={24} color={colors.textOnAccent} />
                        </TouchableOpacity>
                      </View>
        
                      {/* LISTE DES EXERCICES PERSONNALISÉS AJOUTÉS */}
                      {exercises.length > 0 && (
                        <View style={{ marginTop: 16, gap: 10 }}>
                          {exercises.map((ex, idx) => (
                            <View key={idx} style={{ backgroundColor: colors.backgroundElevated, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border }}>
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={{ fontWeight: '700', color: colors.textPrimary, fontSize: 14 }}>{ex.name}</Text>
                                <TouchableOpacity onPress={() => {
                                  setExercises(prev => prev.filter((_, i) => i !== idx));
                                  selectionAsync();
                                }}>
                                  <X size={18} color={colors.textMuted} />
                                </TouchableOpacity>
                              </View>
                              
                                                              <View style={{ flexDirection: 'column', gap: 12 }}>
                                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                                  <View style={{ flex: 1 }}>
                                                                    <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>POIDS (KG)</Text>
                                                                    <TextInput
                                                                      style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 8, borderRadius: 8, color: colors.textPrimary, fontWeight: '700', borderWidth: 1, borderColor: colors.border }}
                                                                      placeholder="0"
                                                                      placeholderTextColor={colors.textMuted}
                                                                      keyboardType="decimal-pad"
                                                                      value={ex.weight?.toString() || ''}
                                                                      onChangeText={(val) => {
                                                                        const w = parseFloat(val.replace(',', '.')) || 0;
                                                                        setExercises(prev => prev.map((e, i) => i === idx ? { ...e, weight: w } : e));
                                                                      }}
                                                                    />
                                                                  </View>
                                                                  <View style={{ flex: 1 }}>
                                                                    <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>REPS</Text>
                                                                    <TextInput
                                                                      style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 8, borderRadius: 8, color: colors.textPrimary, fontWeight: '700', borderWidth: 1, borderColor: colors.border }}
                                                                      placeholder="0"
                                                                      placeholderTextColor={colors.textMuted}
                                                                      keyboardType="number-pad"
                                                                      value={ex.reps?.toString() || ''}
                                                                      onChangeText={(val) => {
                                                                        const r = parseInt(val) || 0;
                                                                        setExercises(prev => prev.map((e, i) => i === idx ? { ...e, reps: r } : e));
                                                                      }}
                                                                    />
                                                                  </View>
                                                                  <View style={{ flex: 1 }}>
                                                                    <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>{t('addTraining.series')}</Text>
                                                                    <TextInput
                                                                      style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 8, borderRadius: 8, color: colors.textPrimary, fontWeight: '700', borderWidth: 1, borderColor: colors.border }}
                                                                      placeholder="0"
                                                                      placeholderTextColor={colors.textMuted}
                                                                      keyboardType="number-pad"
                                                                      value={ex.sets?.toString() || ''}
                                                                      onChangeText={(val) => {
                                                                        const s = parseInt(val) || 0;
                                                                        setExercises(prev => prev.map((e, i) => i === idx ? { ...e, sets: s } : e));
                                                                      }}
                                                                    />
                                                                  </View>
                                                                </View>
                                                                
                                                                {/* Row 2: Distance & Durée (Optionnel) */}
                                                                <View style={{ flexDirection: 'row', gap: 8 }}>
                                                                  <View style={{ flex: 1 }}>
                                                                    <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>DISTANCE (KM)</Text>
                                                                    <TextInput
                                                                      style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 8, borderRadius: 8, color: colors.textPrimary, fontWeight: '700', borderWidth: 1, borderColor: colors.border }}
                                                                      placeholder="0"
                                                                      placeholderTextColor={colors.textMuted}
                                                                      keyboardType="decimal-pad"
                                                                      value={ex.distance?.toString() || ''}
                                                                      onChangeText={(val) => {
                                                                        const d = parseFloat(val.replace(',', '.')) || 0;
                                                                        setExercises(prev => prev.map((e, i) => i === idx ? { ...e, distance: d } : e));
                                                                      }}
                                                                    />
                                                                  </View>
                                                                                                      <View style={{ flex: 1 }}>
                                                                                                        <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>DURÉE (MIN)</Text>
                                                                                                        <TextInput
                                                                                                          style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 8, borderRadius: 8, color: colors.textPrimary, fontWeight: '700', borderWidth: 1, borderColor: colors.border }}
                                                                                                          placeholder="0"
                                                                                                          placeholderTextColor={colors.textMuted}
                                                                                                          keyboardType="decimal-pad"
                                                                                                          value={ex.duration?.toString() || ''}
                                                                                                          onChangeText={(val) => {
                                                                                                            const d = parseFloat(val.replace(',', '.')) || 0;
                                                                                                            setExercises(prev => prev.map((e, i) => i === idx ? { ...e, duration: d } : e));
                                                                                                          }}
                                                                                                        />
                                                                                                      </View>
                                                                                                      <View style={{ flex: 1 }}>
                                                                                                        <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>KCAL</Text>
                                                                                                        <TextInput
                                                                                                          style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 8, borderRadius: 8, color: colors.textPrimary, fontWeight: '700', borderWidth: 1, borderColor: colors.border }}
                                                                                                          placeholder="0"
                                                                                                          placeholderTextColor={colors.textMuted}
                                                                                                          keyboardType="number-pad"
                                                                                                          value={ex.calories?.toString() || ''}
                                                                                                          onChangeText={(val) => {
                                                                                                            const c = parseInt(val) || 0;
                                                                                                            setExercises(prev => prev.map((e, i) => i === idx ? { ...e, calories: c } : e));
                                                                                                          }}
                                                                                                        />
                                                                                                      </View>
                                                                                                    </View>                                                              </View>                            </View>
                          ))}
                        </View>
                      )}
                                  </View>
                    
                              {/* DESCRIPTION PERSONNALISÉE */}        
                                <View style={{ padding: 16 }}>
        
                                    <View style={styles.customDescriptionHeader}>
        
                                      <Plus size={20} color={colors.gold} />
        
                                      <Text style={[styles.customDescriptionTitle, { color: colors.textPrimary }]}>
        
                                        Bilan global de la séance
        
                                      </Text>
        
                                    </View>
        
                                    <TextInput
        
                                      style={[styles.customDescriptionInput, { color: colors.textPrimary, backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', marginBottom: 0 }]}
        
                                      value={customDescription}
        
                                      onChangeText={setCustomDescription}
        
                                      placeholder="Ex: Bonne séance, focus sur la technique..."
        
                                      placeholderTextColor={colors.textMuted}
        
                                      multiline
        
                                      numberOfLines={2}
        
                                      maxLength={500}
        
                                    />
        
                                </View>
        
                              </View>
        
                            </>
        
                          )}

        {/* DATE - Seulement si sport sélectionné */}
        {/* ═══════════════════════════════════════════ */}
        {/* ÉTAPE 4: DATE & HEURE */}
        {/* ═══════════════════════════════════════════ */}
        {currentStep === (isCombatSport ? 5 : 3) && selectedSports.length > 0 && (
          <>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: SPACING.lg, marginBottom: 10 }}>
              Date & Heure
            </Text>

            <View style={{ backgroundColor: colors.card, padding: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', gap: 12, marginBottom: 16 }}>
                {/* DATE */}
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.backgroundElevated, padding: 12, borderRadius: 12, alignItems: 'center', gap: 6 }}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Calendar size={20} color={colors.textSecondary} />
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>{format(date, 'd MMM yyyy', { locale: fr })}</Text>
                </TouchableOpacity>

                {/* HEURE */}
                <TouchableOpacity
                  style={{ flex: 1, backgroundColor: colors.backgroundElevated, padding: 12, borderRadius: 12, alignItems: 'center', gap: 6 }}
                  onPress={() => setShowTimePicker(true)}
                >
                  <Clock size={20} color={colors.textSecondary} />
                  <Text style={{ color: colors.textPrimary, fontWeight: '700' }}>
                    {startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <View style={{ marginBottom: 16 }}>
                  <DateTimePicker
                    value={date}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant={isDark ? 'dark' : 'light'}
                    textColor={colors.textPrimary}
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    locale="fr"
                  />
                </View>
              )}

              {showTimePicker && (
                <View style={{ marginBottom: 16 }}>
                  <DateTimePicker
                    value={startTime}
                    mode="time"
                    is24Hour={true}
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    themeVariant={isDark ? 'dark' : 'light'}
                    textColor={colors.textPrimary}
                    onChange={(event, selectedTime) => {
                      setShowTimePicker(Platform.OS === 'ios');
                      if (selectedTime) setStartTime(selectedTime);
                    }}
                  />
                </View>
              )}

              {/* DURÉE */}
              <View>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>{t('addTraining.sessionDuration')}</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: colors.backgroundElevated, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TextInput
                      style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'center' }}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      value={Math.floor(duration / 60).toString()}
                      onChangeText={(h) => {
                        const hours = parseInt(h) || 0;
                        const minutes = duration % 60;
                        setDuration(hours * 60 + minutes);
                      }}
                      onFocus={scrollToFocusedInput}
                      maxLength={2}
                    />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>HEURES</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.backgroundElevated, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TextInput
                      style={{ fontSize: 20, fontWeight: '700', color: colors.textPrimary, flex: 1, textAlign: 'center' }}
                      placeholder="0"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      value={(duration % 60).toString()}
                      onChangeText={(m) => {
                        const minutes = parseInt(m) || 0;
                        const hours = Math.floor(duration / 60);
                        setDuration(hours * 60 + minutes);
                      }}
                      onFocus={scrollToFocusedInput}
                      maxLength={2}
                    />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>MINUTES</Text>
                  </View>
                </View>
              </View>

              {/* CALORIES & FC */}
              <View style={{ marginTop: 16 }}>
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>Calories & Fréquence cardiaque</Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <View style={{ flex: 1, backgroundColor: colors.backgroundElevated, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TextInput
                      style={{ fontSize: 20, fontWeight: '700', color: '#F59E0B', flex: 1, textAlign: 'center' }}
                      placeholder="—"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      value={calories}
                      onChangeText={setCalories}
                      onFocus={scrollToFocusedInput}
                      maxLength={5}
                    />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>KCAL</Text>
                  </View>
                  <View style={{ flex: 1, backgroundColor: colors.backgroundElevated, padding: 12, borderRadius: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <TextInput
                      style={{ fontSize: 20, fontWeight: '700', color: '#EF4444', flex: 1, textAlign: 'center' }}
                      placeholder="—"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="number-pad"
                      value={heartRate}
                      onChangeText={setHeartRate}
                      onFocus={scrollToFocusedInput}
                      maxLength={3}
                    />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>BPM</Text>
                  </View>
                </View>
              </View>

            </View>
          </>
        )}

        {/* FIN DES STATS PERFORMANCE */}

        {/* CHAMPS COMBAT (Rounds detailles) - Si sport de combat selectionne */}
        {currentStep === (isCombatSport ? 3 : 2) && isCombatSport && (
          <View style={{ marginTop: 20, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            {/* Header Rounds */}
            <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Swords size={20} color="#EF4444" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>Rounds / Combat</Text>
              </View>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, fontWeight: '700' }}>NB ROUNDS</Text>
                  <TextInput
                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 10, borderRadius: 10, color: colors.textPrimary, fontWeight: '800', fontSize: 18, textAlign: 'center', borderWidth: 1, borderColor: colors.border }}
                    value={rounds}
                    onChangeText={(val) => {
                      setRounds(val);
                      const num = parseInt(val) || 0;
                      if (num > 0 && num <= 20) {
                        setCombatRounds(prev => {
                          const newRounds: CombatRound[] = [];
                          for (let i = 0; i < num; i++) {
                            newRounds.push(prev[i] || { number: i + 1 });
                          }
                          return newRounds;
                        });
                        setShowCombatRounds(true);
                      } else {
                        setCombatRounds([]);
                        setShowCombatRounds(false);
                      }
                    }}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    onFocus={scrollToFocusedInput}
                    maxLength={2}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, fontWeight: '700' }}>DURÉE/ROUND (MIN)</Text>
                  <TextInput
                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 10, borderRadius: 10, color: colors.textPrimary, fontWeight: '800', fontSize: 18, textAlign: 'center', borderWidth: 1, borderColor: colors.border }}
                    value={roundDuration}
                    onChangeText={setRoundDuration}
                    placeholder="5"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    onFocus={scrollToFocusedInput}
                    maxLength={2}
                  />
                </View>
              </View>
              {/* Thème technique */}
              <View style={{ marginTop: 12 }}>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, fontWeight: '700' }}>THÈME TECHNIQUE DU JOUR</Text>
                <TextInput
                  style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 10, borderRadius: 10, color: colors.textPrimary, fontWeight: '600', borderWidth: 1, borderColor: colors.border, fontSize: 14 }}
                  placeholder="ex: Triangle, Passage de garde, Armbar..."
                  placeholderTextColor={colors.textMuted}
                  value={technicalTheme}
                  onChangeText={setTechnicalTheme}
                  onFocus={scrollToFocusedInput}
                  maxLength={80}
                  returnKeyType="done"
                />
              </View>

              {/* Toggle detail rounds */}
              {combatRounds.length > 0 && !showCombatRounds && (
                <TouchableOpacity
                  onPress={() => { setShowCombatRounds(true); impactAsync(ImpactFeedbackStyle.Medium); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                    marginTop: 14, paddingVertical: 14, paddingHorizontal: 16,
                    backgroundColor: '#EF4444', borderRadius: 12,
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
                      <UserPlus size={16} color="#FFF" />
                    </View>
                    <View>
                      <Text style={{ fontSize: 14, fontWeight: '800', color: '#FFF' }}>
                        Détailler {combatRounds.length} round{combatRounds.length > 1 ? 's' : ''}
                      </Text>
                      <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.8)', marginTop: 1 }}>
                        Partenaire · Résultat · Soumissions
                      </Text>
                    </View>
                  </View>
                  <ChevronDown size={20} color="#FFF" />
                </TouchableOpacity>
              )}
              {combatRounds.length > 0 && showCombatRounds && (
                <TouchableOpacity
                  onPress={() => { setShowCombatRounds(false); impactAsync(ImpactFeedbackStyle.Light); }}
                  style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 12, paddingVertical: 7, backgroundColor: isDark ? 'rgba(239,68,68,0.1)' : 'rgba(239,68,68,0.06)', borderRadius: 10 }}
                >
                  <ChevronUp size={14} color="#EF4444" />
                  <Text style={{ fontSize: 12, fontWeight: '700', color: '#EF4444' }}>Masquer les détails</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Detail par round */}
            {showCombatRounds && combatRounds.length > 0 && (
              <View style={{ padding: 16, gap: 12 }}>
                {combatRounds.map((round, idx) => (
                  <View key={idx} style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)', borderRadius: 14, overflow: 'hidden', borderWidth: 1.5, borderColor: round.result === 'win' ? '#10B981' : round.result === 'loss' ? '#EF4444' : round.result === 'draw' ? '#F59E0B' : colors.border }}>
                    {/* Round header coloré */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 10, backgroundColor: round.result === 'win' ? 'rgba(16,185,129,0.12)' : round.result === 'loss' ? 'rgba(239,68,68,0.12)' : round.result === 'draw' ? 'rgba(245,158,11,0.12)' : (isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)') }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: '#EF4444', alignItems: 'center', justifyContent: 'center' }}>
                          <Text style={{ fontSize: 12, fontWeight: '900', color: '#FFF' }}>{idx + 1}</Text>
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '800', color: colors.textPrimary }}>Round {idx + 1}</Text>
                        {roundDuration ? <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600' }}>· {roundDuration} min</Text> : null}
                      </View>
                      {/* Result pills */}
                      <View style={{ flexDirection: 'row', gap: 5 }}>
                        {([
                          { key: 'win', label: 'Victoire', color: '#10B981' },
                          { key: 'loss', label: 'Défaite', color: '#EF4444' },
                          { key: 'draw', label: '= Nul', color: '#F59E0B' },
                        ] as const).map(({ key: result, label, color }) => (
                          <TouchableOpacity
                            key={result}
                            onPress={() => {
                              setCombatRounds(prev => prev.map((r, i) => i === idx ? { ...r, result: r.result === result ? undefined : result } : r));
                              impactAsync(ImpactFeedbackStyle.Light);
                            }}
                            style={{
                              paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8,
                              backgroundColor: round.result === result ? color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                              borderWidth: 1,
                              borderColor: round.result === result ? color : 'transparent',
                            }}
                          >
                            <Text style={{ fontSize: 10, fontWeight: '800', color: round.result === result ? '#FFF' : colors.textMuted }}>
                              {label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                    <View style={{ padding: 12 }}>

                    {/* Partner name */}
                    <View style={{ marginBottom: 8 }}>
                      <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3, fontWeight: '600' }}>{t('addTraining.partner')}</Text>
                      <TextInput
                        style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 8, borderRadius: 8, color: colors.textPrimary, fontWeight: '600', borderWidth: 1, borderColor: colors.border, fontSize: 13 }}
                        placeholder="Nom du partenaire..."
                        placeholderTextColor={colors.textMuted}
                        value={round.partner || ''}
                        onChangeText={(val) => setCombatRounds(prev => prev.map((r, i) => i === idx ? { ...r, partner: val } : r))}
                        onFocus={scrollToFocusedInput}
                      />
                    </View>

                    {/* Method (submission/how it ended) */}
                    {round.result && round.result !== 'draw' && (
                      <View style={{ marginBottom: 8 }}>
                        <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 3, fontWeight: '600' }}>
                          {round.result === 'win' ? 'PAR QUOI ?' : 'COMMENT ?'}
                        </Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
                          <View style={{ flexDirection: 'row', gap: 6 }}>
                            {COMBAT_METHODS.map(method => {
                              const isCustomValue = round.method && !COMBAT_METHODS.includes(round.method);
                              const isSelected = method === 'Autre'
                                ? (round.method === 'Autre' || isCustomValue)
                                : round.method === method;
                              return (
                                <TouchableOpacity
                                  key={method}
                                  onPress={() => {
                                    setCombatRounds(prev => prev.map((r, i) => i === idx ? { ...r, method: isSelected ? undefined : method } : r));
                                    impactAsync(ImpactFeedbackStyle.Light);
                                  }}
                                  style={{
                                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8,
                                    backgroundColor: isSelected ? '#EF4444' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                                    borderWidth: 1,
                                    borderColor: isSelected ? '#EF4444' : 'transparent',
                                  }}
                                >
                                  <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? '#FFF' : colors.textMuted }}>{method}</Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        </ScrollView>
                        {/* Champ texte libre si "Autre" est sélectionné ou méthode personnalisée */}
                        {(round.method === 'Autre' || (round.method && !COMBAT_METHODS.slice(0, -1).includes(round.method))) && (
                          <TextInput
                            style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 8, borderRadius: 8, color: colors.textPrimary, fontWeight: '600', borderWidth: 1, borderColor: '#EF4444', fontSize: 13, marginTop: 6 }}
                            placeholder="Précise la technique..."
                            placeholderTextColor={colors.textMuted}
                            value={round.method === 'Autre' ? '' : (round.method || '')}
                            onChangeText={(val) => setCombatRounds(prev => prev.map((r, i) => i === idx ? { ...r, method: val || 'Autre' } : r))}
                            autoFocus={round.method === 'Autre'}
                          />
                        )}
                      </View>
                    )}

                    {/* Submissions given/taken counters */}
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: '#10B981', marginBottom: 3, fontWeight: '600' }}>SOUMISSIONS DONNÉES</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                          <TouchableOpacity onPress={() => setCombatRounds(prev => prev.map((r, i) => i === idx ? { ...r, submissionsGiven: Math.max(0, (r.submissionsGiven || 0) - 1) } : r))} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center' }}>
                            <Minus size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: '#10B981', minWidth: 24, textAlign: 'center' }}>{round.submissionsGiven || 0}</Text>
                          <TouchableOpacity onPress={() => { setCombatRounds(prev => prev.map((r, i) => i === idx ? { ...r, submissionsGiven: (r.submissionsGiven || 0) + 1 } : r)); impactAsync(ImpactFeedbackStyle.Light); }} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#10B981', justifyContent: 'center', alignItems: 'center' }}>
                            <Plus size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontSize: 10, color: '#EF4444', marginBottom: 3, fontWeight: '600' }}>SOUMISSIONS SUBIES</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                          <TouchableOpacity onPress={() => setCombatRounds(prev => prev.map((r, i) => i === idx ? { ...r, submissionsTaken: Math.max(0, (r.submissionsTaken || 0) - 1) } : r))} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)', justifyContent: 'center', alignItems: 'center' }}>
                            <Minus size={14} color={colors.textMuted} />
                          </TouchableOpacity>
                          <Text style={{ fontSize: 18, fontWeight: '900', color: '#EF4444', minWidth: 24, textAlign: 'center' }}>{round.submissionsTaken || 0}</Text>
                          <TouchableOpacity onPress={() => { setCombatRounds(prev => prev.map((r, i) => i === idx ? { ...r, submissionsTaken: (r.submissionsTaken || 0) + 1 } : r)); impactAsync(ImpactFeedbackStyle.Light); }} style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: '#EF4444', justifyContent: 'center', alignItems: 'center' }}>
                            <Plus size={14} color="#FFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>

                    {/* Round notes */}
                    <TextInput
                      style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', padding: 8, borderRadius: 8, color: colors.textPrimary, fontSize: 12, marginTop: 8, borderWidth: 1, borderColor: colors.border }}
                      placeholder="Notes du round..."
                      placeholderTextColor={colors.textMuted}
                      value={round.notes || ''}
                      onChangeText={(val) => setCombatRounds(prev => prev.map((r, i) => i === idx ? { ...r, notes: val } : r))}
                      onFocus={scrollToFocusedInput}
                    />
                    </View>{/* fin padding: 12 */}
                  </View>
                ))}

                {/* Résumé combat */}
                {combatRounds.some(r => r.result) && (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 16, paddingTop: 8, paddingBottom: 4 }}>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#10B981' }}>{combatRounds.filter(r => r.result === 'win').length}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#10B981' }}>Victoires</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#EF4444' }}>{combatRounds.filter(r => r.result === 'loss').length}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#EF4444' }}>Defaites</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: '#F59E0B' }}>{combatRounds.filter(r => r.result === 'draw').length}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: '#F59E0B' }}>Nuls</Text>
                    </View>
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary }}>{combatRounds.reduce((acc, r) => acc + (r.submissionsGiven || 0), 0)}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: colors.textMuted }}>Sub. données</Text>
                    </View>
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ═══════════════════════════════════════════ */}
        {/* ÉTAPE 4: GAME PLAN & BILAN (combat sports only) */}
        {/* ═══════════════════════════════════════════ */}
        {currentStep === 4 && isCombatSport && (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 16 }}>
              GAME PLAN & BILAN
            </Text>

            {/* HUMEUR DE SÉANCE */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 12 }}>Comment tu t'es senti ?</Text>
              <View style={{ flexDirection: 'row', gap: 10, justifyContent: 'space-around' }}>
                {[
                  { emoji: '🔥', label: 'En feu', value: 'fire' },
                  { emoji: '💪', label: 'Solide', value: 'solid' },
                  { emoji: '😐', label: 'Correct', value: 'ok' },
                  { emoji: '😓', label: 'Difficile', value: 'hard' },
                  { emoji: '💀', label: 'Ecrasé', value: 'crushed' },
                ].map(({ emoji, label, value }) => {
                  const isSelected = sessionMood === value;
                  return (
                    <TouchableOpacity
                      key={value}
                      onPress={() => { setSessionMood(isSelected ? '' : value); impactAsync(ImpactFeedbackStyle.Light); }}
                      style={{
                        alignItems: 'center', padding: 10, borderRadius: 12,
                        backgroundColor: isSelected ? colors.accent + '25' : 'transparent',
                        borderWidth: 1.5,
                        borderColor: isSelected ? colors.accent : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>{emoji}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '700', color: isSelected ? colors.accent : colors.textMuted, marginTop: 4 }}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* NOTE DE SÉANCE 1-10 */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary, marginBottom: 4 }}>Note de la séance</Text>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 12 }}>Qualité globale du training</Text>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {[1,2,3,4,5,6,7,8,9,10].map(n => {
                  const isSelected = sessionRating === n;
                  const ratingColor = n <= 3 ? '#EF4444' : n <= 6 ? '#F59E0B' : n <= 8 ? '#84CC16' : '#22C55E';
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => { setSessionRating(isSelected ? null : n); impactAsync(ImpactFeedbackStyle.Light); }}
                      style={{
                        flex: 1, height: 44, borderRadius: 8,
                        backgroundColor: isSelected ? ratingColor : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                        borderWidth: 1.5,
                        borderColor: isSelected ? ratingColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'),
                        alignItems: 'center', justifyContent: 'center',
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '800', color: isSelected ? '#fff' : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)') }}>{n}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {sessionRating !== null && (
                <Text style={{ textAlign: 'center', fontSize: 13, fontWeight: '700', color: sessionRating <= 3 ? '#EF4444' : sessionRating <= 6 ? '#F59E0B' : sessionRating <= 8 ? '#84CC16' : '#22C55E', marginTop: 10 }}>
                  {sessionRating <= 3 ? 'Mauvaise séance' : sessionRating <= 6 ? 'Séance correcte' : sessionRating <= 8 ? 'Bonne séance' : 'Excellente séance !'}
                </Text>
              )}
            </View>

            {/* GAME PLAN */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Lightbulb size={18} color="#F59E0B" />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>Game Plan</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>Appuie sur plusieurs objectifs à la fois</Text>
              {/* Chips multi-select */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {GAME_PLAN_TEMPLATES.map(tag => {
                  const isSelected = gamePlanTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag, gamePlanTags, setGamePlanTags, setGamePlan)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                        backgroundColor: isSelected ? '#F59E0B' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                        borderWidth: 1.5, borderColor: isSelected ? '#F59E0B' : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#FFF' : colors.textSecondary }}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              {/* Texte libre en complément */}
              <TextInput
                style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 12, borderRadius: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border, minHeight: 60, textAlignVertical: 'top' }}
                placeholder="Ou écris ton game plan librement..."
                placeholderTextColor={colors.textMuted}
                value={gamePlan}
                onChangeText={(txt) => {
                  setGamePlan(txt);
                  // Désynchronise les chips si l'utilisateur édite manuellement
                  setGamePlanTags([]);
                }}
                multiline
                numberOfLines={3}
                onFocus={scrollToFocusedInput}
              />
            </View>

            {/* CE QUI A MARCHÉ */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: '#22C55E40', padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <Check size={18} color="#22C55E" strokeWidth={3} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>Ce qui a marché ✅</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>Sélectionne plusieurs éléments</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {WHAT_WORKED_TEMPLATES.map(tag => {
                  const isSelected = whatWorkedTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag, whatWorkedTags, setWhatWorkedTags, setWhatWorked)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                        backgroundColor: isSelected ? '#22C55E' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                        borderWidth: 1.5, borderColor: isSelected ? '#22C55E' : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#FFF' : colors.textSecondary }}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 12, borderRadius: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border, minHeight: 60, textAlignVertical: 'top' }}
                placeholder="Ou ajoute des détails..."
                placeholderTextColor={colors.textMuted}
                value={whatWorked}
                onChangeText={(txt) => { setWhatWorked(txt); setWhatWorkedTags([]); }}
                multiline
                numberOfLines={3}
                onFocus={scrollToFocusedInput}
              />
            </View>

            {/* CE QUI N'A PAS MARCHÉ */}
            <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: '#EF444440', padding: 16, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                <X size={18} color="#EF4444" strokeWidth={3} />
                <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>À améliorer ❌</Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textMuted, marginBottom: 10 }}>Sélectionne plusieurs éléments</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
                {WHAT_DIDNT_WORK_TEMPLATES.map(tag => {
                  const isSelected = whatDidntWorkTags.includes(tag);
                  return (
                    <TouchableOpacity
                      key={tag}
                      onPress={() => toggleTag(tag, whatDidntWorkTags, setWhatDidntWorkTags, setWhatDidntWork)}
                      style={{
                        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
                        backgroundColor: isSelected ? '#EF4444' : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)'),
                        borderWidth: 1.5, borderColor: isSelected ? '#EF4444' : colors.border,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: '700', color: isSelected ? '#FFF' : colors.textSecondary }}>{tag}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 12, borderRadius: 12, color: colors.textPrimary, fontSize: 14, borderWidth: 1, borderColor: colors.border, minHeight: 60, textAlignVertical: 'top' }}
                placeholder="Ou ajoute des détails..."
                placeholderTextColor={colors.textMuted}
                value={whatDidntWork}
                onChangeText={(txt) => { setWhatDidntWork(txt); setWhatDidntWorkTags([]); }}
                multiline
                numberOfLines={3}
                onFocus={scrollToFocusedInput}
              />
            </View>
          </View>
        )}

        {/* SCORE / MATCH - Sports raquettes & collectifs */}
        {currentStep === 2 && selectedSports.some(s => ['tennis', 'padel', 'badminton', 'football', 'futsal', 'basketball', 'rugby', 'handball', 'volleyball'].includes(s)) && (
          <View style={{ marginTop: 20, backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
            <View style={{ padding: 16 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <Trophy size={20} color="#F59E0B" />
                <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textPrimary }}>Score du match</Text>
              </View>

              {/* Adversaire */}
              <View style={{ marginBottom: 12 }}>
                <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, fontWeight: '700' }}>ADVERSAIRE / EQUIPE ADVERSE</Text>
                <TextInput
                  style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 10, borderRadius: 10, color: colors.textPrimary, fontWeight: '600', fontSize: 14, borderWidth: 1, borderColor: colors.border }}
                  placeholder="Nom de l'adversaire..."
                  placeholderTextColor={colors.textMuted}
                  value={customDescription.startsWith('vs ') ? customDescription.slice(3) : ''}
                  onChangeText={(val) => setCustomDescription(val ? `vs ${val}` : '')}
                  onFocus={scrollToFocusedInput}
                />
              </View>

              {/* Score */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 12 }}>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, fontWeight: '700' }}>MOI/NOUS</Text>
                  <TextInput
                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', width: 60, padding: 10, borderRadius: 10, color: '#10B981', fontWeight: '900', fontSize: 24, textAlign: 'center', borderWidth: 1, borderColor: colors.border }}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={3}
                    value={scoreHome}
                    onChangeText={setScoreHome}
                    onFocus={scrollToFocusedInput}
                  />
                </View>
                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.textMuted, marginTop: 16 }}>-</Text>
                <View style={{ alignItems: 'center' }}>
                  <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 4, fontWeight: '700' }}>ADVERSAIRE</Text>
                  <TextInput
                    style={{ backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', width: 60, padding: 10, borderRadius: 10, color: '#EF4444', fontWeight: '900', fontSize: 24, textAlign: 'center', borderWidth: 1, borderColor: colors.border }}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="number-pad"
                    maxLength={3}
                    value={scoreAway}
                    onChangeText={setScoreAway}
                    onFocus={scrollToFocusedInput}
                  />
                </View>
              </View>

              {/* Result pills */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
                {[{ key: 'V', label: 'Victoire', color: '#10B981' }, { key: 'D', label: 'Defaite', color: '#EF4444' }, { key: 'N', label: 'Nul', color: '#F59E0B' }].map(r => (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => {
                      const tag = `[${r.key}]`;
                      if (notes.includes(tag)) {
                        setNotes(notes.replace(tag, '').trim());
                      } else {
                        setNotes(prev => `${tag} ${prev.replace(/\[(V|D|N)\]\s?/, '').trim()}`.trim());
                      }
                      impactAsync(ImpactFeedbackStyle.Light);
                    }}
                    style={{
                      paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
                      backgroundColor: notes.includes(`[${r.key}]`) ? r.color : (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)'),
                    }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: '700', color: notes.includes(`[${r.key}]`) ? '#FFF' : colors.textMuted }}>{r.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        )}

                                    {/* ═══════════════════════════════════════════ */}
                                    {/* ÉTAPE 6: ANALYSE & RESSENTI */}
                                    {/* ═══════════════════════════════════════════ */}
                                    {currentStep === (isCombatSport ? 6 : 4) && selectedSports.length > 0 && (
                                      <>
                                        <Text style={{ fontSize: 13, fontWeight: '800', color: colors.textMuted, letterSpacing: 1.5, textTransform: 'uppercase', marginTop: SPACING.lg, marginBottom: 10 }}>
                                          {t('addTraining.sessionFeeling')}
                                        </Text>
                  
                                        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                                          
                                          {/* INTENSITÉ */}
                                          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                                            <View style={{ marginBottom: 8 }}>
                                              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{t('addTraining.sessionIntensity')}</Text>
                                            </View>
                                            
                                            {/* ÉCHELLE RPE VISUELLE 1-10 */}
                                            <View style={{ gap: 10 }}>
                                              <View style={{ flexDirection: 'row', gap: 5 }}>
                                                {[1,2,3,4,5,6,7,8,9,10].map(n => {
                                                  const isSelected = intensity === n;
                                                  const rpeColor = n <= 3 ? '#22C55E' : n <= 5 ? '#84CC16' : n <= 7 ? '#F59E0B' : n <= 8 ? '#F97316' : '#EF4444';
                                                  return (
                                                    <TouchableOpacity
                                                      key={n}
                                                      onPress={() => { setIntensity(n); impactAsync(ImpactFeedbackStyle.Light); }}
                                                      style={{
                                                        flex: 1, height: 42, borderRadius: 8,
                                                        backgroundColor: isSelected ? rpeColor : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)'),
                                                        borderWidth: 1.5,
                                                        borderColor: isSelected ? rpeColor : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)'),
                                                        alignItems: 'center', justifyContent: 'center',
                                                      }}
                                                    >
                                                      <Text style={{ fontSize: 13, fontWeight: '800', color: isSelected ? '#fff' : (isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)') }}>{n}</Text>
                                                    </TouchableOpacity>
                                                  );
                                                })}
                                              </View>
                                              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Text style={{ fontSize: 10, color: '#22C55E', fontWeight: '700' }}>FACILE</Text>
                                                <View style={{ alignItems: 'center' }}>
                                                  <Text style={{ fontSize: 22, fontWeight: '900', color: intensity <= 3 ? '#22C55E' : intensity <= 5 ? '#84CC16' : intensity <= 7 ? '#F59E0B' : intensity <= 8 ? '#F97316' : '#EF4444' }}>{intensity}</Text>
                                                  <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', marginTop: -2 }}>
                                                    {intensity <= 3 ? 'Facile' : intensity <= 5 ? 'Modéré' : intensity <= 7 ? 'Difficile' : intensity <= 8 ? 'Très difficile' : 'Maximal'}
                                                  </Text>
                                                </View>
                                                <Text style={{ fontSize: 10, color: '#EF4444', fontWeight: '700' }}>MAXIMAL</Text>
                                              </View>
                                            </View>
                                          </View>
                  
                                          {/* FRÉQUENCE CARDIAQUE */}
                                          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                                            <View style={{ marginBottom: 8 }}>
                                              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>{t('addTraining.heartRate')}</Text>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                              <TextInput
                                                style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', padding: 12, borderRadius: 12, color: '#EF4444', fontWeight: '800', fontSize: 20, textAlign: 'center', borderWidth: 1, borderColor: colors.border }}
                                                placeholder="---"
                                                placeholderTextColor={colors.textMuted}
                                                keyboardType="number-pad"
                                                maxLength={3}
                                                value={heartRate}
                                                onChangeText={setHeartRate}
                                                onFocus={scrollToFocusedInput}
                                              />
                                              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textMuted }}>BPM</Text>
                                            </View>
                                          </View>

                                          {/* TECHNIQUE */}
                                          <View style={{ padding: 16, backgroundColor: colors.accent + '05' }}>
                                            <View style={{ marginBottom: 8 }}>
                                              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>Qualité technique</Text>
                                            </View>
                  
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16, lineHeight: 18 }}>
                                              Auto-évaluer ta technique t'oblige à y réfléchir, ce qui accélère ton apprentissage moteur et réduit le risque de blessure.
                                            </Text>
                  
                                            {/* Étoiles */}
                                            <View style={styles.starsContainer}>
                                              {[1, 2, 3, 4, 5].map((rating) => (
                                                <TouchableOpacity
                                                  key={rating}
                                                  onPress={() => setTechniqueRating(rating)}
                                                  style={styles.starButton}
                                                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                                >
                                                  <Star
                                                    size={32}
                                                    color={techniqueRating && rating <= techniqueRating ? colors.accent : colors.textMuted}
                                                    fill={techniqueRating && rating <= techniqueRating ? colors.accent : 'transparent'}
                                                    strokeWidth={2}
                                                  />
                                                </TouchableOpacity>
                                              ))}
                                            </View>
                                            
                                            <View style={styles.starsLabels}>
                                               <Text style={{ fontSize: 10, color: colors.textMuted }}>À revoir</Text>
                                               <Text style={{ fontSize: 10, color: colors.textMuted }}>Parfaite</Text>
                                            </View>
                                          </View>
                                        </View>
                                      </>
                                    )}
        {/* SÉLECTEUR SPORT PRINCIPAL POUR OBJECTIF ANNUEL */}
        {currentStep === (isCombatSport ? 6 : 4) && selectedSports.length > 1 && (
          <View
            ref={sportSelectorRef}
            style={{
              padding: 16,
              backgroundColor: colors.backgroundCard,
              borderRadius: 16,
              marginTop: 20,
              borderWidth: 2,
              borderColor: primarySportError ? colors.error : colors.border
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '800', color: isDark ? colors.accent : colors.textPrimary, marginBottom: 12, letterSpacing: 0.5 }}>
              SPORT PRINCIPAL POUR OBJECTIF ANNUEL
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginBottom: 16 }}>
              Choisis quel sport afficher dans l'objectif annuel de ta carte de partage
            </Text>

            {primarySportError && (
              <View style={{
                backgroundColor: colors.error + '20',
                padding: 12,
                borderRadius: 12,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: colors.error
              }}>
                <Text style={{ fontSize: 13, fontWeight: '700', color: colors.error, textAlign: 'center' }}>
                  Vous avez oublie le champ "Sport principal". Veuillez le remplir pour continuer.
                </Text>
              </View>
            )}

            <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
              {selectedSports.map(sportId => {
                const sportName = getSportName(sportId);
                const isSelected = primarySportForObjective === sportId;
                return (
                  <TouchableOpacity
                    key={sportId}
                    onPress={() => {
                      setPrimarySportForObjective(sportId);
                      setPrimarySportError(false);
                      lightHaptic();
                    }}
                    style={{
                      paddingHorizontal: 16,
                      paddingVertical: 10,
                      borderRadius: 12,
                      backgroundColor: isSelected ? colors.accent : colors.background,
                      borderWidth: 1,
                      borderColor: isSelected ? colors.accent : colors.border,
                    }}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '700',
                      color: isSelected ? colors.textOnAccent : colors.textPrimary
                    }}>
                      {sportName.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Navigation Étapes 2-4 */}
        {currentStep > 1 && selectedSports.length > 0 && (
          <View style={{ flexDirection: 'row', gap: 10, marginTop: 28 }}>
            {/* Retour — toujours lisible : bordure + texte primaire */}
            <TouchableOpacity
              style={{
                flex: 1, paddingVertical: 16, borderRadius: 16,
                backgroundColor: colors.backgroundCard,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1.5, borderColor: colors.border,
              }}
              onPress={() => goToStep(currentStep - 1)}
            >
              <Text style={{ fontWeight: '700', fontSize: 15, color: colors.textPrimary }}>{t('addTraining.back')}</Text>
            </TouchableOpacity>

            {/* Suivant / Enregistrer — inversé : toujours contrasté dans tous les thèmes */}
            {currentStep < totalSteps ? (
              <TouchableOpacity
                style={{
                  flex: 2, paddingVertical: 16, borderRadius: 16,
                  backgroundColor: colors.textPrimary,
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8,
                }}
                onPress={() => goToStep(currentStep + 1)}
              >
                <Text style={{ fontWeight: '900', fontSize: 15, color: colors.background, letterSpacing: 1 }}>Suivant</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[
                  styles.saveButton,
                  { flex: 2, marginTop: 0, backgroundColor: colors.textPrimary, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
                  isSubmitting && styles.saveButtonDisabled,
                ]}
                onPress={handleSave}
                disabled={isSubmitting}
              >
                <View style={styles.saveButtonContent}>
                  {isSubmitting && <ActivityIndicator size="small" color={colors.background} />}
                  <Text style={[styles.saveButtonText, { color: colors.background }]}>
                    {isSubmitting ? 'Enregistrement...' : isEditMode ? 'Modifier' : 'Enregistrer'}
                  </Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        )}

        <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Exercise Picker Modal */}
      <ExercisePickerModal
        visible={showExerciseModal}
        onClose={() => setShowExerciseModal(false)}
        onAddExercise={(exercise) => setExercises(prev => [...prev, exercise])}
      />

                        {/* MODAL 1: VALIDATION & APERÇU ÉTAPES 2-3 */}
                                    <Modal
                                      visible={showValidationModal}
                                      transparent
                                      animationType="fade"
                                    >
                                      <View style={{ flex: 1, backgroundColor: '#F2F2F7', paddingTop: insets.top }}>
                                        {/* key=lastSavedTrainingId force le remontage à chaque nouvelle séance → relance les confettis */}
                                        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="none">
                                          <ConfettiCannon key={lastSavedTrainingId ?? 0} count={80} origin={{x: -10, y: 0}} fadeOut={true} />
                                        </View>

                                        {/* Header Étape 2 - MODE CLAIR */}
                                        <View style={{ marginBottom: 10 }}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 }}>
                                {/* BOUTON RETOUR */}
                                <TouchableOpacity
                                  style={{ position: 'absolute', left: 16, padding: 8 }}
                                  onPress={() => setShowValidationModal(false)}
                                >
                                  <MaterialCommunityIcons name="arrow-left" size={28} color="#000000" />
                                </TouchableOpacity>

                                <View style={{ alignItems: 'center' }}>
                                  <Text style={{ fontSize: 13, fontWeight: '900', color: colors.gold, letterSpacing: 2, marginBottom: 8 }}>
                                    {`ÉTAPE ${validationStep} SUR 4`}
                                  </Text>
                                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                                    {/* Etape 1 (Passée - Gold) */}
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} />
                                    <View style={{ width: 30, height: 2, backgroundColor: colors.gold }} />

                                    {/* Etape 2 */}
                                    <View style={{ width: validationStep === 2 ? 14 : 10, height: validationStep === 2 ? 14 : 10, borderRadius: 7, backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: validationStep === 2 ? 0.5 : 0, shadowRadius: 5 }} />

                                    {/* Etape 3 */}
                                    <View style={{ width: 30, height: 2, backgroundColor: validationStep >= 3 ? colors.gold : colors.border }} />
                                    <View style={{ width: validationStep === 3 ? 14 : 10, height: validationStep === 3 ? 14 : 10, borderRadius: 7, backgroundColor: validationStep >= 3 ? colors.gold : colors.borderLight, shadowColor: colors.gold, shadowOpacity: validationStep === 3 ? 0.5 : 0, shadowRadius: 5 }} />

                                    {/* Etape 4 (Futur) */}
                                    <View style={{ width: 30, height: 2, backgroundColor: colors.border }} />
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.borderLight }} />
                                  </View>
                                </View>
                              </View>
                              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1, textAlign: 'center' }}>APERÇU CARTE</Text>
                            </View>


                            <ScrollView showsVerticalScrollIndicator={false} nestedScrollEnabled={true} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40, paddingHorizontal: 20 }}>
                              {validationStep === 2 && (
                                <>
                              <View style={{ width: 360, borderRadius: 24, overflow: 'hidden', shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, elevation: 15, marginBottom: 30 }}>
                                <SessionCard
                                  training={sessionCardTraining}
                                  options={optionDetails}
                                  backgroundImage={cardBackgroundImage || userPhoto}
                                  backgroundType={cardBackgroundImage || userPhoto ? 'photo' : 'black'}
                                  keepPhotoClear={!!cardBackgroundImage}
                                  userAvatar={userAvatar}
                                  profilePhoto={userPhoto}
                                  userName={userName}
                                  rank={userRank}
                                  userLevel={userLevel}
                                  isLandscape={false}
                                  width={360}
                                  yearlyCount={yearlyCount}
                                  monthlyCount={monthlyCount}
                                  weeklyCount={weeklyCount}
                                  yearlyObjective={yearlyObjective}
                                  showYearlyCount={true}
                                  showMonthlyCount={true}
                                  showWeeklyCount={true}
                                  showExercises={true}
                                  disableInternalScroll
                                />
                              </View>

                              {/* ACTIONS - ÉTAPE 2 */}
                              <View style={{ width: '100%', maxWidth: 360, gap: 12 }}>
                                <TouchableOpacity
                                  style={{
                                    backgroundColor: colors.accent,
                                    paddingVertical: 20,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 12,
                                    shadowColor: colors.accent,
                                    shadowOpacity: 0.4,
                                    shadowRadius: 15,
                                    elevation: 10
                                  }}
                                  onPress={() => {
                                    lightHaptic();
                                    setShowValidationModal(false);
                                    const sessionPath = lastSavedTrainingId
                                      ? `/social-share/last-session?id=${lastSavedTrainingId}`
                                      : '/social-share/last-session';
                                    InteractionManager.runAfterInteractions(() => {
                                      router.replace(sessionPath as any);
                                    });
                                  }}
                                >
                                  <Share2 size={24} color={colors.textOnAccent} strokeWidth={2.5} />
                                  <Text style={{ color: colors.textOnAccent, fontWeight: '900', fontSize: 18, letterSpacing: 1 }}>CONTINUER</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{
                                    backgroundColor: colors.backgroundCard,
                                    paddingVertical: 18,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 10,
                                    borderWidth: 1,
                                    borderColor: colors.border
                                  }}
                                  onPress={() => {
                                    lightHaptic();
                                    setValidationStep(3);
                                  }}
                                >
                                  <Camera size={20} color={colors.textSecondary} />
                                  <Text style={{ color: colors.textSecondary, fontWeight: '800', fontSize: 16 }}>
                                    {cardBackgroundImage ? 'CHANGER LA PHOTO' : 'AJOUTER UNE PHOTO'}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{
                                    paddingVertical: 14,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                  }}
                                  onPress={() => {
                                    setShowValidationModal(false);
                                    setCardBackgroundImage(null);
                                    setTimeout(() => router.back(), 350);
                                  }}
                                >
                                  <Text style={{ color: colors.textMuted, fontWeight: '700', fontSize: 14 }}>PASSER</Text>
                                </TouchableOpacity>
                              </View>
                                </>
                              )}

                              {/* ÉTAPE 3: APERÇU AVEC PHOTO */}
                              {validationStep === 3 && (
                                <>
                              <View style={{ width: 360, borderRadius: 24, overflow: 'hidden', shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, elevation: 15, marginBottom: 30 }}>
                                <SessionCard
                                  training={sessionCardTraining}
                                  options={optionDetails}
                                  backgroundImage={cardBackgroundImage || userPhoto}
                                  backgroundType={cardBackgroundImage || userPhoto ? 'photo' : 'black'}
                                  keepPhotoClear={!!cardBackgroundImage}
                                  userAvatar={userAvatar}
                                  profilePhoto={userPhoto}
                                  userName={userName}
                                  rank={userRank}
                                  userLevel={userLevel}
                                  isLandscape={false}
                                  width={360}
                                  yearlyCount={yearlyCount}
                                  monthlyCount={monthlyCount}
                                  weeklyCount={weeklyCount}
                                  yearlyObjective={yearlyObjective}
                                  showYearlyCount={true}
                                  showMonthlyCount={true}
                                  showWeeklyCount={true}
                                  showExercises={true}
                                  disableInternalScroll
                                />
                              </View>

                              {/* ACTIONS - ÉTAPE 3 */}
                              <View style={{ width: '100%', maxWidth: 360, gap: 12 }}>
                                <TouchableOpacity
                                  style={{
                                    backgroundColor: colors.accent,
                                    paddingVertical: 20,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 12,
                                    shadowColor: colors.accent,
                                    shadowOpacity: 0.4,
                                    shadowRadius: 15,
                                    elevation: 10
                                  }}
                                  onPress={() => {
                                    lightHaptic();
                                    setShowPhotoChoiceModal(true);
                                  }}
                                >
                                  <Camera size={24} color={colors.textOnAccent} strokeWidth={2.5} />
                                  <Text style={{ color: colors.textOnAccent, fontWeight: '900', fontSize: 18, letterSpacing: 1 }}>
                                    {cardBackgroundImage ? 'CHANGER LA PHOTO' : 'AJOUTER UNE PHOTO'}
                                  </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{
                                    backgroundColor: colors.gold,
                                    paddingVertical: 20,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    flexDirection: 'row',
                                    justifyContent: 'center',
                                    gap: 12,
                                    shadowColor: colors.gold,
                                    shadowOpacity: 0.4,
                                    shadowRadius: 15,
                                    elevation: 10
                                  }}
                                  onPress={() => {
                                    setShowValidationModal(false);
                                    InteractionManager.runAfterInteractions(() => {
                                      if (lastSavedTrainingId) {
                                        router.push(`/social-share/last-session?id=${lastSavedTrainingId}`);
                                      } else {
                                        router.push('/social-share/last-session');
                                      }
                                    });
                                  }}
                                >
                                  <Share2 size={24} color="#000" strokeWidth={2.5} />
                                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 18, letterSpacing: 1 }}>CONTINUER</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{
                                    backgroundColor: colors.card,
                                    paddingVertical: 18,
                                    borderRadius: 24,
                                    alignItems: 'center',
                                    borderWidth: 1,
                                    borderColor: colors.border
                                  }}
                                  onPress={() => {
                                    setValidationStep(2);
                                  }}
                                >
                                  <Text style={{ color: colors.textSecondary, fontWeight: '800', fontSize: 16 }}>RETOUR</Text>
                                </TouchableOpacity>
                              </View>
                                </>
                              )}
                            </ScrollView>
                          </View>
                        </Modal>

                        {/* MODAL POPUP: CHOIX PHOTO (ÉTAPE 3) */}
                        <Modal
                          visible={showPhotoChoiceModal}
                          transparent
                          animationType="fade"
                          statusBarTranslucent
                        >
                          <TouchableOpacity
                            style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', alignItems: 'center', padding: 20 }}
                            activeOpacity={1}
                            onPress={() => setShowPhotoChoiceModal(false)}
                          >
                            <TouchableOpacity
                              activeOpacity={1}
                              style={{ width: '100%', maxWidth: 400, backgroundColor: colors.card, borderRadius: 32, padding: 24, shadowColor: "#000", shadowOpacity: 0.5, shadowRadius: 30, elevation: 30 }}
                            >
                              {/* En-tête */}
                              <View style={{ alignItems: 'center', marginBottom: 24 }}>
                                <Text style={{ fontSize: 24, fontWeight: '900', color: colors.textPrimary, marginBottom: 8 }}>CHOISIS TA PHOTO</Text>
                                <Text style={{ fontSize: 14, color: colors.textSecondary, textAlign: 'center' }}>Personnalise l'arrière-plan de ta carte</Text>
                              </View>

                              {/* Boutons */}
                              <View style={{ gap: 12 }}>
                                <TouchableOpacity
                                  style={{
                                    backgroundColor: colors.accent,
                                    paddingVertical: 20,
                                    borderRadius: 20,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                    shadowColor: colors.accent,
                                    shadowOpacity: 0.4,
                                    shadowRadius: 15,
                                    elevation: 8
                                  }}
                                  onPress={() => {
                                    setShowPhotoChoiceModal(false);
                                    setShowValidationModal(false);
                                    setTimeout(async () => {
                                      await pickImageFromGallery();
                                      if (!isMountedRef.current) return;
                                      setValidationStep(3);
                                      setShowValidationModal(true);
                                    }, 500);
                                  }}
                                >
                                  <MaterialCommunityIcons name="image-multiple" size={28} color={colors.textOnAccent} />
                                  <Text style={{ color: colors.textOnAccent, fontWeight: '900', fontSize: 18, letterSpacing: 0.5 }}>GALERIE PHOTOS</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{
                                    backgroundColor: colors.gold,
                                    paddingVertical: 20,
                                    borderRadius: 20,
                                    flexDirection: 'row',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 12,
                                    shadowColor: colors.gold,
                                    shadowOpacity: 0.4,
                                    shadowRadius: 15,
                                    elevation: 8
                                  }}
                                  onPress={() => {
                                    setShowPhotoChoiceModal(false);
                                    setShowValidationModal(false);
                                    setTimeout(async () => {
                                      await takePhoto();
                                      if (!isMountedRef.current) return;
                                      setValidationStep(3);
                                      setShowValidationModal(true);
                                    }, 500);
                                  }}
                                >
                                  <Camera size={28} color="#000" strokeWidth={2.5} />
                                  <Text style={{ color: '#000', fontWeight: '900', fontSize: 18, letterSpacing: 0.5 }}>PRENDRE UNE PHOTO</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{
                                    backgroundColor: 'transparent',
                                    paddingVertical: 16,
                                    borderRadius: 20,
                                    borderWidth: 2,
                                    borderColor: colors.border,
                                  }}
                                  onPress={() => {
                                    setShowPhotoChoiceModal(false);
                                  }}
                                >
                                  <Text style={{ color: colors.textSecondary, fontWeight: '800', fontSize: 16, textAlign: 'center' }}>CONTINUER SANS PHOTO</Text>
                                </TouchableOpacity>
                              </View>

                              {/* Bouton fermer */}
                              <TouchableOpacity
                                style={{ position: 'absolute', top: 16, right: 16, padding: 8 }}
                                onPress={() => setShowPhotoChoiceModal(false)}
                              >
                                <X size={24} color={colors.textMuted} />
                              </TouchableOpacity>
                            </TouchableOpacity>
                          </TouchableOpacity>
                        </Modal>

      {/* MODAL 3: NOTATION HOUARI */}
      <Modal
        visible={showHouariRateModal}
        transparent
        animationType="slide"
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: colors.card, borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: colors.border }}>
            
            {/* Logo Yoroi */}
            <View style={{ marginBottom: 20, shadowColor: colors.accent, shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 10 } }}>
              <Image 
                source={require('@/assets/images/icon.png')} 
                style={{ width: 80, height: 80, borderRadius: 20 }}
                resizeMode="cover"
              />
            </View>

            <Text style={{ fontSize: 22, fontWeight: '900', color: colors.textPrimary, marginBottom: 12, textAlign: 'center' }}>
              Hello {userGender === 'female' ? 'Championne' : 'Champion'} {userName} !
            </Text>

            <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              J'espère que tu apprécies l'app !{'\n'}
              S'il y a quoi que ce soit, n'hésite pas à me dire tes bugs et tes idées.
            </Text>

            {/* Bouton Boîte à Idées */}
            <TouchableOpacity 
              style={{ backgroundColor: colors.backgroundElevated, width: '100%', paddingVertical: 14, borderRadius: 16, alignItems: 'center', marginBottom: 24, flexDirection: 'row', justifyContent: 'center', gap: 10, borderWidth: 1, borderColor: colors.border }}
              onPress={() => {
                setShowHouariRateModal(false);
                router.push('/ideas');
              }}
            >
              <Lightbulb size={20} color={colors.accent} />
              <Text style={{ color: colors.textPrimary, fontWeight: '700', fontSize: 15 }}>Boîte à idées / Support</Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 15, color: colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 24 }}>
              Si tu aimes, ça m'aiderait énormément d'être en haut dans la barre de recherche si tu me mets un 5 étoiles (si tu penses que je le mérite).
            </Text>

            {/* Bouton Note */}
            <TouchableOpacity 
              style={{ backgroundColor: colors.gold, width: '100%', paddingVertical: 18, borderRadius: 20, alignItems: 'center', marginBottom: 20, shadowColor: colors.gold, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } }}
              onPress={async () => {
                const storeUrl = Platform.OS === 'ios' 
                  ? 'https://apps.apple.com/app/id6757306612?action=write-review' 
                  : 'market://details?id=com.houari.yoroi';
                await openBrowserAsync(storeUrl);
                setShowHouariRateModal(false);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Star fill={colors.textOnGold} color={colors.textOnGold} size={20} />
                <Text style={{ color: colors.textOnGold, fontWeight: '800', fontSize: 18 }}>Donner de la force</Text>
              </View>
            </TouchableOpacity>

            <Text style={{ fontSize: 14, fontStyle: 'italic', color: colors.textMuted, textAlign: 'center' }}>
              {t('addTraining.thankYou')}
            </Text>

            {/* Bouton Fermer */}
            <TouchableOpacity 
              style={{ padding: 16, marginTop: 10 }}
              onPress={handleCloseHouariModal}
            >
              <Text style={{ color: colors.textMuted, fontWeight: '600' }}>Plus tard</Text>
            </TouchableOpacity>

          </View>
        </View>
      </Modal>

      <PopupComponent />
      <ReviewModalComponent />
    </ScreenWrapper>
  );
}

const createStyles = (IS_SMALL_SCREEN: boolean) => StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.sm,
    paddingTop: SPACING.lg,
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: FONT_SIZE.xxl,
    fontWeight: '700',
  },

  // SECTION
  sectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  // QUICK ADD
  quickAddButton: {
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    marginBottom: SPACING.xl,
    gap: SPACING.md,
  },
  quickAddIcon: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickAddContent: {
    flex: 1,
  },
  quickAddTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
  },
  // ADD ANOTHER SPORT BUTTON
  addAnotherSportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: SPACING.lg,
  },
  addAnotherSportText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  addSportSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },

  quickAddSubtitle: {
    fontSize: FONT_SIZE.sm,
    marginTop: 2,
  },

  // SELECTED SPORTS SECTION
  selectedSportsSection: {
    marginBottom: SPACING.lg,
  },
  selectedSportsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  selectedSportsHint: {
    fontSize: FONT_SIZE.xs,
  },
  selectedSportsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  selectedSportChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 20,
    borderWidth: 2,
  },
  selectedSportChipText: {
    color: '#FFFFFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: '700',
  },
  customSportInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginTop: SPACING.sm,
  },
  customSportInput: {
    flex: 1,
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    paddingVertical: SPACING.sm,
  },

  // SPORT OPTIONS SECTION (Qu'as-tu fait?)
  sportOptionsSection: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  sportOptionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  sportOptionsTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  sportOptionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  sportOptionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: RADIUS.sm,
    borderWidth: 1.5,
  },
  sportOptionLabel: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },

  // CUSTOM DESCRIPTION
  customDescriptionSection: {
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.md,
  },
  customDescriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  customDescriptionTitle: {
    fontSize: FONT_SIZE.md,
    fontWeight: '700',
  },
  customDescriptionInput: {
    borderRadius: RADIUS.sm,
    padding: SPACING.md,
    fontSize: FONT_SIZE.md,
    minHeight: 60,
    textAlignVertical: 'top',
  },

  // CATEGORY HEADER - Nouveau design avec icône
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categoryIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SPORTS GRID (Vertical)
  sportsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 4,
  },
  sportGridItem: {
    width: '23.5%', // 4 colonnes
    aspectRatio: 0.85,
    borderRadius: 14,
    borderWidth: 1,
    padding: 6,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  sportGridIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  sportGridName: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  sportGridCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // SELECTED SPORT BANNER
  selectedSportBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 2,
    marginBottom: SPACING.md,
    gap: SPACING.md,
  },
  selectedSportIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedSportInfo: {
    flex: 1,
  },
  selectedSportName: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '800',
  },
  selectedSportCategory: {
    fontSize: FONT_SIZE.xs,
    marginTop: 2,
  },

  // SPORTS
  sportsScroll: {
    marginTop: SPACING.sm,
  },
  categorySection: {
    marginBottom: SPACING.md,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
  },
  categoryHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  categorySportCount: {
    fontSize: FONT_SIZE.xs,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sportsContainer: {
    paddingHorizontal: SPACING.sm,
    gap: 10,
  },
  sportItem: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    paddingVertical: SPACING.md,
    paddingHorizontal: IS_SMALL_SCREEN ? SPACING.md : SPACING.lg, // Moins de padding sur petits écrans
    borderWidth: 1,
    minWidth: 80,
  },
  sportItemActive: {
    // Colors applied inline
  },
  sportIconContainer: {
    position: 'relative',
    marginBottom: 4,
  },
  checkmarkBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sportIcon: {
    fontSize: 28,
    marginBottom: 4,
  },
  sportName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
  },
  sportNameActive: {
    // Colors applied inline
  },

  // LIEU - Type de lieu (En salle / Plein air)
  locationTypeRow: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginBottom: SPACING.lg,
  },
  locationTypeCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 2,
  },
  locationTypeIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  locationTypeLabel: {
    fontSize: FONT_SIZE.md,
    textAlign: 'center',
  },
  clubSectionTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },

  // CLUBS - Nouveau design horizontal
  clubsScroll: {
    marginHorizontal: -20,
    marginBottom: SPACING.lg,
  },
  clubsScrollContent: {
    paddingHorizontal: SPACING.xl,
    gap: 12,
  },
  clubCard: {
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: IS_SMALL_SCREEN ? SPACING.sm : SPACING.md, // Padding adaptatif
    borderWidth: 2,
    minWidth: IS_SMALL_SCREEN ? 80 : 90, // Plus compact sur petits écrans
    maxWidth: 100,
  },
  clubCardIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  clubCardEmoji: {
    fontSize: 24,
  },
  clubCardLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  clubCardName: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textAlign: 'center',
  },
  matchingBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Legacy clubs (pour compatibilité)
  clubsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  clubItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  clubDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  clubLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  clubItemText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },

  // DATE
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: SPACING.lg,
    gap: SPACING.md,
    borderWidth: 1,
  },
  dateText: {
    flex: 1,
    fontSize: FONT_SIZE.lg,
    fontWeight: '600',
    textTransform: 'capitalize',
  },

  // TIME
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    marginBottom: SPACING.lg,
  },
  timeText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '600',
  },
  endTimeText: {
    fontSize: FONT_SIZE.sm,
    textAlign: 'left',
    marginTop: SPACING.md,
    marginBottom: SPACING.lg,
    marginLeft: 4,
  },

  // DURATION
  durationContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: SPACING.md,
  },
  durationItem: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
  },
  durationItemActive: {
    // Colors applied inline
  },
  durationText: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
  },
  durationTextActive: {
    // Colors applied inline
  },
  durationChip: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.sm,
    alignItems: 'center',
    borderWidth: 1,
  },
  customDurationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
    flexWrap: 'nowrap',
  },
  customDurationLabel: {
    fontSize: FONT_SIZE.sm,
    flexShrink: 0,
  },
  customDurationInput: {
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    width: 70,
    textAlign: 'center',
    borderWidth: 1,
    flexShrink: 0,
  },
  customDurationUnit: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
    flexShrink: 0,
  },

  // SPORT ENTRIES (notes personnalisées par sport)
  sportEntriesSection: {
    marginTop: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(128,128,128,0.2)',
  },
  sportEntriesTitle: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: SPACING.sm,
  },
  sportEntryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.sm,
    marginBottom: SPACING.sm,
  },
  sportEntryText: {
    flex: 1,
    fontSize: FONT_SIZE.sm,
    marginRight: SPACING.sm,
  },
  sportEntryInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sportEntryInput: {
    flex: 1,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    fontSize: FONT_SIZE.sm,
    borderWidth: 1,
  },
  sportEntryAddButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // MUSCLES
  musclesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: SPACING.lg,
  },
  muscleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: RADIUS.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  muscleItemActive: {
    // Colors applied inline
  },
  muscleName: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  muscleNameActive: {
    // Colors applied inline
  },

  // EXERCISES
  exercisesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
    marginTop: SPACING.sm,
  },
  addExerciseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: RADIUS.sm,
  },
  addExerciseText: {
    color: '#FFF',
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },
  exercisesList: {
    gap: 10,
    marginBottom: SPACING.lg,
  },
  exerciseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    borderWidth: 1,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    fontSize: FONT_SIZE.md,
    fontWeight: '600',
    marginBottom: 4,
  },
  exerciseDetails: {
    fontSize: FONT_SIZE.xs,
  },
  removeExerciseButton: {
    padding: 4,
  },

  // NOTES
  notesInput: {
    borderRadius: RADIUS.md,
    padding: IS_SMALL_SCREEN ? SPACING.md : SPACING.lg, // Padding adaptatif
    fontSize: IS_SMALL_SCREEN ? 14 : 15, // Plus petit sur petits écrans
    borderWidth: 1,
    marginBottom: 24,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // TECHNIQUE RATING
  techniqueSection: {
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    marginBottom: 24,
    borderWidth: 1,
  },
  techniqueSectionHeader: {
    marginBottom: SPACING.md,
    alignItems: 'center',
  },
  techniqueSectionTitle: {
    fontSize: FONT_SIZE.lg,
    fontWeight: '700',
    marginBottom: 4,
  },
  techniqueSectionSubtitle: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '500',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: IS_SMALL_SCREEN ? 6 : 8, // Moins d'espace entre étoiles sur petits écrans
    marginBottom: 4,
  },
  starButton: {
    padding: 4,
  },
  starsLabels: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
    marginBottom: SPACING.md,
  },
  starLabel: {
    fontSize: FONT_SIZE.xs,
    fontWeight: '700',
  },
  techniqueInfo: {
    marginTop: SPACING.sm,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  techniqueInfoText: {
    fontSize: FONT_SIZE.xs,
    fontStyle: 'italic',
    lineHeight: 16,
    textAlign: 'center',
  },
  skipButton: {
    marginTop: SPACING.sm,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: FONT_SIZE.sm,
    fontWeight: '600',
  },

  // SAVE
  saveButton: {
    borderRadius: RADIUS.md,
    overflow: 'hidden',
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    gap: 10,
  },
  saveButtonText: {
    fontSize: FONT_SIZE.xl,
    fontWeight: '700',
  },
  proStatsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  proStatItem: {
    flex: 1,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  proStatLabel: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  proStatInput: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    width: '100%',
  },
  intensityStep: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(128,128,128,0.1)',
  },
  scienceNote: {
    fontSize: 9,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.6,
    paddingHorizontal: 10,
    lineHeight: 12,
  },
});
