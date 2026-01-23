import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Platform,
  Image,
  Animated,
  ActivityIndicator,
  Modal,
  Share,
  Switch,
  Keyboard,
  Dimensions,
} from 'react-native';
import ConfettiCannon from 'react-native-confetti-cannon';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Zap,
  Activity,
  Trophy,
  Dumbbell,
  Timer,
  Heart,
  Share2,
  Cloud,
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
} from 'lucide-react-native';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/lib/ThemeContext';
import { useBadges } from '@/lib/BadgeContext';
import { addTraining, getClubs, Club, Exercise, getProfile, getTrainings, getWeights, calculateStreak } from '@/lib/database';
import { SPORTS, MUSCLES, getSportIcon, getSportName, getClubLogoSource } from '@/lib/sports';
import { getCurrentRank } from '@/lib/ranks';
import { getAvatarConfig, getAvatarImage } from '@/lib/avatarSystem';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getUserSettings } from '@/lib/storage';
import * as WebBrowser from 'expo-web-browser';
import { SessionCard } from '@/components/social-cards/SessionCard';
import { RADIUS, SPACING, TYPOGRAPHY } from '@/constants/design';
import { useWindowDimensions, useIsSmallScreen } from '@/hooks/useWindowDimensions';

// Constantes statiques pour les styles (StyleSheet ne peut pas utiliser de hooks)
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IS_SMALL_SCREEN = SCREEN_WIDTH < 375;

// Constants for non-theme values
const FONT_SIZE = TYPOGRAPHY.size;
import { successHaptic, errorHaptic, lightHaptic } from '@/lib/haptics';
import { backupReminderService } from '@/lib/backupReminderService';
import { playWorkoutCompleteSound } from '@/lib/soundManager';
import { incrementReviewTrigger, shouldAskForReview } from '@/lib/reviewService';
import { useReviewModal } from '@/components/ReviewModal';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { ExercisePickerModal } from '@/components/ExercisePickerModal';
import logger from '@/lib/security/logger';
import HealthConnect from '@/lib/healthConnect.ios';
import { SharePromptModal } from '@/components/SharePromptModal';
import * as ImagePicker from 'expo-image-picker';
import { SPORT_OPTIONS, DEFAULT_OPTIONS, SportOption } from '@/constants/sportOptions';

// ============================================
// NOUVEL ENTRAINEMENT - VERSION SIMPLIFIEE
// ============================================

const LAST_SPORT_KEY = 'yoroi_last_sport';
const LAST_DURATION_KEY = 'yoroi_last_duration';

export default function AddTrainingScreen() {
  const insets = useSafeAreaInsets();
  const { colors, gradients, isDark } = useTheme();
  const router = useRouter();
  const { checkBadges } = useBadges();
  const { showPopup, PopupComponent } = useCustomPopup();
  const { showReviewModal, ReviewModalComponent } = useReviewModal();
  const params = useLocalSearchParams<{ date?: string }>();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollViewRef = useRef<any>(null);

  // Catégories dépliées (par défaut aucune)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  // Afficher/cacher la section catégories quand sport déjà sélectionné
  const [showAddSportSection, setShowAddSportSection] = useState(false);

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
    pace?: string
  }>>({});
  const [sportEntries, setSportEntries] = useState<Record<string, string[]>>({}); // { jjb: ['Round 1: 5min', 'Guard work'], running: ['5K en 25min'] }
  const [newEntryText, setNewEntryText] = useState<Record<string, string>>({}); // Texte en cours de saisie pour chaque sport
  const [customDescription, setCustomDescription] = useState(''); // Description personnalisée
  const [customSportName, setCustomSportName] = useState(''); // Nom personnalisé pour "Autre" sport
  const [selectedClub, setSelectedClub] = useState<Club | null>(null);
  const [isOutdoor, setIsOutdoor] = useState(false);

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
  const [manualPace, setManualPace] = useState<string>(''); // Allure saisie manuellement
  const [calories, setCalories] = useState<string>(''); // Nouveau: Calories
  const [intensity, setIntensity] = useState<number>(5); // RPE 1-10
  const [pente, setPente] = useState<string>(''); // Pour Tapis (Technogym/Matrix)
  const [resistance, setResistance] = useState<string>(''); // Pour Vélo/Elliptique
  const [watts, setWatts] = useState<string>(''); // Puissance
  const [cadence, setCadence] = useState<string>(''); // RPM
  const [rounds, setRounds] = useState<string>(''); // Nombre de rounds
  const [roundDuration, setRoundDuration] = useState<string>('5'); // Minutes par round
  const [notes, setNotes] = useState('');

  // Calculer l'allure (pace) en direct (uniquement si pas de saisie manuelle)
  const getLivePace = () => {
    if (manualPace) return manualPace;
    const distNum = parseFloat(distance.replace(',', '.'));
    if (!distNum || !duration) return null;
    const totalSeconds = duration * 60;
    const secondsPerKm = totalSeconds / distNum;
    const mins = Math.floor(secondsPerKm / 60);
    const secs = Math.round(secondsPerKm % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [customExerciseName, setCustomExerciseName] = useState('');
  const [techniqueRating, setTechniqueRating] = useState<number | null>(null);
  const [showExerciseModal, setShowExerciseModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationStep, setValidationStep] = useState(2); // Étape de validation: 2 = aperçu initial, 3 = aperçu avec photo, 4 = partage final
  const [showPhotoChoiceModal, setShowPhotoChoiceModal] = useState(false);
  const [cardBackgroundImage, setCardBackgroundImage] = useState<string | null>(null);
  const [showHouariRateModal, setShowHouariRateModal] = useState(false);
  const [lastSavedTrainingId, setLastSavedTrainingId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState(''); // Barre de recherche
  const [lastPerformances, setLastPerformances] = useState<Record<string, any>>({}); // Historique rapide
  const [userName, setUserName] = useState<string>('Champion');
  const [userGender, setUserGender] = useState<'male' | 'female'>('male');
  const [userPhoto, setUserPhoto] = useState<string | null>(null);
  const [yearlyCount, setYearlyCount] = useState<number>(0);
  const [yearlyObjective, setYearlyObjective] = useState<number>(365);
  const [monthlyCount, setMonthlyCount] = useState<number>(0);
  const [weeklyCount, setWeeklyCount] = useState<number>(0);
  const [showYearlyCountOnCard, setShowYearlyCountOnCard] = useState<boolean>(true);
  const [showMonthlyCount, setShowMonthlyCount] = useState<boolean>(true);
  const [showWeeklyCount, setShowWeeklyCount] = useState<boolean>(true);
  const [showExercisesOnCard, setShowExercisesOnCard] = useState<boolean>(true);
  const [heartRate, setHeartRate] = useState<string>('');
  const [userWeight, setUserWeight] = useState<number>(75); // Poids par défaut
  const [userAvatar, setUserAvatar] = useState<any>(null);
  const [userRank, setUserRank] = useState<string>('Ashigaru');
  const [userLevel, setUserLevel] = useState<number>(0);
  const [primarySportForObjective, setPrimarySportForObjective] = useState<string>('');
  const [primarySportError, setPrimarySportError] = useState<boolean>(false);
  const sportSelectorRef = useRef<View>(null);

  // Charger les données utilisateur
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const [profile, allTrainings, weights, avatarConfig, streak] = await Promise.all([
          getProfile(),
          getTrainings(),
          getWeights(),
          getAvatarConfig(),
          calculateStreak(),
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
          setUserWeight(weights[0].weight);
        }

        // Charger l'avatar
        if (avatarConfig) {
          const image = getAvatarImage(
            avatarConfig.pack,
            avatarConfig.state,
            avatarConfig.collectionCharacter,
            avatarConfig.gender
          );
          setUserAvatar(image);
        }

        // Charger le rang et le niveau
        const rank = getCurrentRank(streak);
        setUserRank(rank.name);
        setUserLevel(streak);

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

  // Charger les dernières performances pour chaque exercice
  useEffect(() => {
    const loadLastPerformances = async () => {
      try {
        const trainings = await getTrainings(90); // 3 derniers mois
        const perfMap: Record<string, any> = {};
        
        // Parcourir du plus ancien au plus récent pour que le dernier écrase
        [...trainings].reverse().forEach(t => {
          if (t.notes) {
            // Tenter de retrouver l'exercice dans les notes ou via les options
            // Pour simplifier, on stocke la dernière séance complète par sport si elle a du cardio
            if (t.distance || t.pente || t.speed) {
              const sports = t.sport.split(',');
              sports.forEach(s => {
                perfMap[s.trim()] = {
                  distance: t.distance,
                  pente: t.pente,
                  speed: t.speed,
                  watts: t.watts,
                  resistance: t.resistance,
                  date: t.date
                };
              });
            }
          }
        });
        setLastPerformances(perfMap);
      } catch (error) {
        logger.error('Erreur chargement performances:', error);
      }
    };
    loadLastPerformances();
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
        let objective = 150; 

        if (selectedClub) {
          const clubTrainings = allTrainings.filter((t: any) => {
            const tDate = new Date(t.date);
            return t.club_id === selectedClub.id && tDate.getFullYear() === currentYear;
          });
          const sportUniqueDays = new Set(clubTrainings.map((t: any) => new Date(t.date).toISOString().split('T')[0]));
          sportCount = Math.min(sportUniqueDays.size + 1, daysElapsed);
          objective = selectedClub.sessions_per_week ? selectedClub.sessions_per_week * 52 : 150;
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
        console.error("Erreur calcul compteurs:", error);
      }
    };

    updateContextualData();
  }, [selectedClub, selectedSports, primarySportForObjective]);

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
    const weightNum = 75; // Valeur par défaut
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
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  const renderPerformanceFields = (exerciseId: string, label: string, sportId: string) => {
    const stats = optionStats[exerciseId] || {};

    // Calcul automatique de l'allure (pace) basé sur la vitesse
    const calculatePace = (speedValue: string) => {
      const speedVal = parseFloat(speedValue.replace(',', '.'));
      if (speedVal > 0) {
        const paceDecimal = 60 / speedVal;
        const mins = Math.floor(paceDecimal);
        const secs = Math.round((paceDecimal - mins) * 60);
        return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
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
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
                  maxLength={4}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>MIN</Text>
              </View>
            </View>
          </View>

          {/* Ligne 1: Vitesse & Pente */}
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
                  onChangeText={(v) => updateStat('speed', v)}
                  maxLength={4}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>KM/H</Text>
              </View>
            </View>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>PENTE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <TextInput
                  style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary, minWidth: 40, padding: 0 }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted + '40'}
                  keyboardType="decimal-pad"
                  value={stats.pente}
                  onChangeText={(v) => updateStat('pente', v)}
                  maxLength={3}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>%</Text>
              </View>
            </View>
          </View>

          {/* Ligne 2: Distance & Calories */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>DISTANCE</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <TextInput
                  style={{ fontSize: 18, fontWeight: '900', color: colors.accent, minWidth: 40, padding: 0 }}
                  placeholder="0.0"
                  placeholderTextColor={colors.textMuted + '40'}
                  keyboardType="decimal-pad"
                  value={stats.distance}
                  onChangeText={(v) => updateStat('distance', v)}
                  maxLength={5}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>KM</Text>
              </View>
            </View>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>CALORIES (ESTIMATION)</Text>
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
                  maxLength={5}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>KCAL</Text>
              </View>
            </View>
          </View>

          {/* Ligne 3: Marches & Allure */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>MARCHES / ÉTAGES</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <TextInput
                  style={{ fontSize: 18, fontWeight: '900', color: colors.textPrimary, minWidth: 40, padding: 0 }}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted + '40'}
                  keyboardType="number-pad"
                  value={stats.stairs}
                  onChangeText={(v) => updateStat('stairs', v)}
                  maxLength={4}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>FLOORS</Text>
              </View>
            </View>
            <View style={{ flex: 1, backgroundColor: isDark ? 'rgba(0,0,0,0.2)' : '#FFF', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: colors.border }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={{ fontSize: 9, fontWeight: '700', color: colors.textMuted, marginBottom: 2 }}>ALLURE (ESTIMATION)</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
                <TextInput
                  style={{ fontSize: 18, fontWeight: '900', color: colors.accent, minWidth: 40, padding: 0 }}
                  placeholder="0:00"
                  placeholderTextColor={colors.textMuted + '40'}
                  value={stats.pace}
                  onChangeText={(v) => updateStat('pace', v)}
                  maxLength={6}
                />
                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>MIN/KM</Text>
              </View>
            </View>
          </View>
        </View>
      </View>
    );
  };

  useEffect(() => {
    loadClubs();
  }, []);

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

  const handleFinish = async () => {
    // Vérifier si on doit demander la notation (ou forcer pour cette feature)
    // On affiche le modal Houari
    setShowHouariRateModal(true);
  };

  const handleCloseHouariModal = () => {
    setShowHouariRateModal(false);
    // CRITIQUE : Rediriger l'utilisateur pour ne pas le laisser bloqué sur l'écran d'ajout
    router.replace('/(tabs)');
  };

  const handleShareModalShare = async () => {
    setShowShareModal(false);
    // Marquer qu'on doit demander la review au retour
    try {
      await AsyncStorage.setItem('@yoroi_pending_review', 'true');
    } catch (error) {
      logger.error('Erreur sauvegarde pending review:', error);
    }
    // Navigate to last-session sharing screen avec l'ID précis
    if (lastSavedTrainingId) {
      router.replace(`/social-share/last-session?id=${lastSavedTrainingId}`);
    } else {
      router.replace('/social-share/last-session');
    }
  };

  const handleShareModalSkip = async () => {
    setShowShareModal(false);
    handleFinish();
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
      if (sportSelectorRef.current && scrollViewRef.current) {
        sportSelectorRef.current.measureLayout(
          scrollViewRef.current,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ y: y - 100, animated: true });
          },
          () => {}
        );
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
              if (stats.weight || stats.reps) details.push(`${stats.weight || '0'}kg x ${stats.reps || '0'}`);
              if (stats.distance) details.push(`${stats.distance}km`);
              if (stats.speed) details.push(`${stats.speed}km/h`);
              if (stats.pente) details.push(`${stats.pente}%`);
              if (stats.stairs) details.push(`${stats.stairs} étages`);
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

      const newId = await addTraining({
        club_id: selectedClub?.id,
        sport: sportsString, // Sports combinés
        date: format(date, 'yyyy-MM-dd'),
        duration_minutes: duration || undefined,
        start_time: startTime.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        notes: fullNotes.trim() || undefined,
        muscles: selectedMuscles.length > 0 ? selectedMuscles.join(',') : undefined,
        exercises: exercises.length > 0 ? exercises : undefined,
        technique_rating: techniqueRating,
        is_outdoor: isOutdoor,
        distance: distance ? parseFloat(distance.replace(',', '.')) : undefined,
        calories: calories ? parseInt(calories) : undefined,
        intensity: intensity,
        rounds: rounds ? parseInt(rounds) : undefined,
        round_duration: roundDuration ? parseInt(roundDuration) : undefined,
        pente: pente ? parseFloat(pente.replace(',', '.')) : undefined,
        speed: speed ? parseFloat(speed.replace(',', '.')) : undefined,
        resistance: resistance ? parseInt(resistance) : undefined,
        watts: watts ? parseInt(watts) : undefined,
        cadence: cadence ? parseInt(cadence) : undefined,
      });

      if (newId) {
        setLastSavedTrainingId(Number(newId));
      }

      // Sauvegarder le premier sport et durée pour le Quick Add
      await saveLastSportAndDuration(selectedSports[0], duration);

      successHaptic();
      playWorkoutCompleteSound();

      // 🔄 SYNC VERS APPLE HEALTH
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

      // Trigger review apres une action positive (on incrementera apres le partage)
      await incrementReviewTrigger();

      // Verifier les badges debloques
      await checkBadges();

      // Vérifier si on doit afficher le rappel de sauvegarde
      // DÉSACTIVÉ: L'utilisateur préfère gérer la sauvegarde dans l'étape 4
      // const shouldShowBackupReminder = await backupReminderService.onDataAdded();
      // if (shouldShowBackupReminder) {
      //   await backupReminderService.showReminder(() => {
      //     router.push('/(tabs)/more');
      //   });
      // } 
      
      // AFFICHER LE MODAL DE VALIDATION (Étape 2)
      setCardBackgroundImage(null);
      setShowValidationModal(true);

    } catch (error) {
      logger.error('Erreur sauvegarde:', error);
      errorHaptic();
      showPopup('Erreur', "Impossible d'enregistrer l'entrainement");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return format(date, 'EEEE d MMMM yyyy', { locale: fr });
  };

  // Fonctions pour gérer les photos de fond de carte
  const pickImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission refusée', 'Nous avons besoin de votre permission pour accéder à vos photos');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCardBackgroundImage(result.assets[0].uri);
      lightHaptic();
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      showPopup('Permission refusée', 'Nous avons besoin de votre permission pour accéder à l\'appareil photo');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setCardBackgroundImage(result.assets[0].uri);
      lightHaptic();
    }
  };

  // Clubs filtrés par sport sélectionné
  const filteredClubs = clubs.filter(c => c.sport === selectedSport);

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
          return {
            ...opt,
            sport: sportId, // Ajouter le sport pour différenciation
            sportName: getSportName(sportId), // Nom lisible du sport
            weight: stats?.weight,
            reps: stats?.reps,
            sets: stats?.sets,
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
  const optionDetails = getOptionDetails();

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

  const previewNotes = getPreviewNotes();

  return (
    <ScreenWrapper noPadding noContainer>
      {/* HEADER ÉTAPE 1 - COLLÉ AU TOP */}
      <View style={{ 
        backgroundColor: colors.background, 
        borderBottomWidth: 1, 
        borderBottomColor: colors.border,
        zIndex: 999
      }}>
        <View style={{ paddingBottom: 10, paddingTop: 5, alignItems: 'center' }}>
          <Text style={{ fontSize: 13, fontWeight: '900', color: colors.accent, letterSpacing: 3, marginBottom: 8 }}>ÉTAPE 1 SUR 4</Text>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.accent, shadowColor: colors.accent, shadowOpacity: 0.6, shadowRadius: 8, elevation: 8 }} />
            <View style={{ width: 30, height: 2, backgroundColor: colors.border }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.borderLight }} />
            <View style={{ width: 30, height: 2, backgroundColor: colors.border }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.borderLight }} />
            <View style={{ width: 30, height: 2, backgroundColor: colors.border }} />
            <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.borderLight }} />
          </View>
          <Text style={{ fontSize: 15, fontWeight: '800', color: colors.textPrimary, marginTop: 10, letterSpacing: 0.5 }}>CONFIGURATION DE LA SÉANCE</Text>
        </View>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={[styles.content, { paddingTop: 20, paddingBottom: 150 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >

        {/* 🔍 BARRE DE RECHERCHE - UNIQUEMENT ÉTAPE 1 */}
        {(selectedSports.length === 0 || showAddSportSection) && (
          <View style={{ marginBottom: 20 }}>
            <View style={[styles.customSportInputContainer, { backgroundColor: colors.backgroundElevated, borderColor: colors.border, height: 54, borderRadius: 18 }]}>
              <MaterialCommunityIcons name="magnify" size={24} color={colors.accent} />
              <TextInput
                style={[styles.customSportInput, { color: colors.textPrimary, fontSize: 16 }]}
                placeholder="Rechercher un sport..."
                placeholderTextColor={colors.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
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
        {selectedSports.length === 0 && (
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            1. Choisis ton sport
          </Text>
        )}

        {/* Bouton pour ajouter un autre sport (quand sport déjà sélectionné) */}
        {selectedSports.length > 0 && selectedSports.length < 3 && !showAddSportSection && (
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
        {selectedSports.length > 0 && showAddSportSection && (
          <View style={styles.addSportSectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
              Ajouter un sport
            </Text>
            <TouchableOpacity onPress={() => setShowAddSportSection(false)}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        )}

        {/* Catégories - visibles si: aucun sport OU showAddSportSection */}
        {(selectedSports.length === 0 || showAddSportSection) && (() => {
          const categoryLabels: Record<string, string> = {
            cardio: 'Cardio',
            fitness: 'Musculation & Fitness',
            combat_grappling: 'Combat (Grappling)',
            combat_striking: 'Combat (Pieds-Poings)',
            danse: 'Danse',
            collectif: 'Sports Collectifs',
            raquettes: 'Raquettes',
            glisse: 'Sports de Glisse',
            nature: 'Sports Nature',
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
            autre: '#6B7280',
          };

          // NOUVEL ORDRE : Cardio > Musculation > Combat > Danse > reste
          const categories = ['cardio', 'fitness', 'combat_grappling', 'combat_striking', 'danse', 'collectif', 'raquettes', 'glisse', 'nature', 'autre'];

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

          return filteredCategories.map((category) => {
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
              <View key={category} style={styles.categorySection}>
                {/* Header de catégorie cliquable */}
                <TouchableOpacity
                  style={[
                    styles.categoryHeader,
                    { backgroundColor: colors.card, borderColor: hasSelectedSport ? catColor : colors.border },
                    hasSelectedSport && { backgroundColor: catColor + '15' }
                  ]}
                  onPress={() => toggleCategory(category)}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <View style={[styles.categoryIconBadge, { backgroundColor: catColor + '20' }]}>
                      <MaterialCommunityIcons
                        name={categoryIcons[category] as any}
                        size={20}
                        color={catColor}
                      />
                    </View>
                    <Text style={[
                      styles.categoryLabel,
                      { color: hasSelectedSport ? catColor : colors.textPrimary }
                    ]}>
                      {categoryLabels[category]}
                    </Text>
                  </View>
                  <View style={styles.categoryHeaderRight}>
                    <Text style={[styles.categorySportCount, { color: colors.textMuted }]}>
                      {sportsInCategory.length}
                    </Text>
                    {isExpanded ? (
                      <ChevronDown size={20} color={colors.textMuted} />
                    ) : (
                      <ChevronRight size={20} color={colors.textMuted} />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Sports de la catégorie - GRILLE VERTICALE */}
                {isExpanded && (
                  <View style={styles.sportsGrid}>
                    {sportsInCategory.map((sport) => {
                      const isSelected = selectedSports.includes(sport.id);

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
          });
        })()}

        {/* ═══════════════════════════════════════════ */}
        {/* SPORTS SÉLECTIONNÉS - Badge(s) avec X pour retirer */}
        {/* ═══════════════════════════════════════════ */}
        {selectedSports.length > 0 && (
          <View style={styles.selectedSportsSection}>
            <View style={styles.selectedSportsHeader}>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 0 }]}>
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
              <View style={[styles.customSportInputContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
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

        {/* ═══════════════════════════════════════════ */}
        {/* LIEU D'ENTRAÎNEMENT - Seulement si sport sélectionné */}
        {/* ═══════════════════════════════════════════ */}
                  {selectedSports.length > 0 && (
                    <>
                      <Text style={[styles.sectionTitle, { color: isDark ? colors.accent : colors.textPrimary, marginTop: SPACING.lg, fontWeight: '700' }]}>
                        2. Où t'entraînes-tu ?
                      </Text>
                      
                                    <View style={{ flexDirection: 'row', gap: 12, marginBottom: 20 }}>
                                      {/* Option SALLE */}
                                      <TouchableOpacity 
                                        style={{ 
                                          flex: 1, 
                                          backgroundColor: !isOutdoor ? colors.accent + '20' : colors.card,
                                          borderColor: !isOutdoor ? colors.accent : colors.border,
                                          borderWidth: 1,
                                          padding: 12,
                                          borderRadius: 12,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 6,
                                          height: 80
                                        }}
                                        onPress={() => {
                                          setIsOutdoor(false);
                                          Haptics.selectionAsync();
                                        }}
                                      >
                                        <Building2 size={24} color={!isOutdoor ? colors.accent : colors.textMuted} />
                                        <Text style={{ fontWeight: '700', fontSize: 13, color: !isOutdoor ? colors.accent : colors.textMuted, textAlign: 'center' }}>En Salle</Text>
                                      </TouchableOpacity>
                      
                                      {/* Option PLEIN AIR */}
                                      <TouchableOpacity 
                                        style={{ 
                                          flex: 1, 
                                          backgroundColor: isOutdoor ? colors.accent + '20' : colors.card,
                                          borderColor: isOutdoor ? colors.accent : colors.border,
                                          borderWidth: 1,
                                          padding: 12,
                                          borderRadius: 12,
                                          alignItems: 'center',
                                          justifyContent: 'center',
                                          gap: 6,
                                          height: 80
                                        }}
                                        onPress={() => {
                                          setIsOutdoor(true);
                                          setSelectedClub(null); // Reset club if outdoor
                                          Haptics.selectionAsync();
                                        }}
                                      >
                                        <Sun size={24} color={isOutdoor ? colors.accent : colors.textMuted} />
                                        <Text style={{ fontWeight: '700', fontSize: 13, color: isOutdoor ? colors.accent : colors.textMuted, textAlign: 'center' }}>Plein Air</Text>
                                      </TouchableOpacity>
                                    </View>        
                      {/* LISTE DES CLUBS - UNIQUEMENT SI EN SALLE */}
                      {!isOutdoor && (
                        <>
                          <Text style={[styles.clubSectionTitle, { color: colors.textMuted }]}>Sélectionne ton club</Text>
                          <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            style={styles.clubsScroll}
                            contentContainerStyle={styles.clubsScrollContent}
                          >
                            {/* Option Sans club */}
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
        
                            {/* Clubs enregistrés - triés par pertinence */}
                            {[...clubs]
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
        
                            {/* Bouton Créer un club */}
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
                              <Text style={[styles.clubCardName, { color: colors.accent }]}>
                                Créer
                              </Text>
                            </TouchableOpacity>
                          </ScrollView>
                        </>
                      )}
                    </>
                  )}
        {/* ═══════════════════════════════════════════ */}
        {/* ÉTAPE 3: DÉTAILS DE LA SÉANCE */}
        {/* ═══════════════════════════════════════════ */}
        {selectedSports.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.accent : '#000000', marginTop: SPACING.lg, fontWeight: '700' }]}>
              3. Configure ta seance
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
                <MaterialCommunityIcons name={sport.icon as any} size={24} color={sport.color} />
                <Text style={[styles.sportOptionsTitle, { color: colors.textPrimary }]}>
                  {sport.name} - Qu'as-tu fait ?
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

                  return (
                    <View key={groupName} style={{ marginBottom: 10 }}>
                      <TouchableOpacity 
                        style={{ 
                          flexDirection: 'row', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          paddingVertical: 12,
                          paddingHorizontal: 14,
                          backgroundColor: isGroupValidated ? '#10B98120' : (isExpanded ? sport.color + '15' : colors.backgroundElevated),
                          borderRadius: 12,
                          borderWidth: 1,
                          borderColor: isGroupValidated ? '#10B981' : (isExpanded ? sport.color + '40' : colors.border),
                        }}
                        onPress={() => toggleGroup(groupId)}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: isGroupValidated ? '#10B981' : sport.color }} />
                          <Text style={{ fontSize: 13, fontWeight: '800', color: isGroupValidated ? '#10B981' : colors.textPrimary, textTransform: 'uppercase', letterSpacing: 0.5 }}>{groupName}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text style={{ fontSize: 11, fontWeight: '600', color: isGroupValidated ? '#10B981' : colors.textMuted }}>{groupOpts.length} exos</Text>
                          {isExpanded ? <ChevronDown size={18} color={isGroupValidated ? '#10B981' : colors.textMuted} /> : <ChevronRight size={18} color={isGroupValidated ? '#10B981' : colors.textMuted} />}
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

                              return (
                                <View key={option.id} style={{ marginBottom: 8, width: '100%' }}>
                                  <TouchableOpacity
                                    style={[
                                      styles.sportOptionChip,
                                      { 
                                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', 
                                        borderColor: colors.border, 
                                        width: '100%' 
                                      },
                                      isSelected && { 
                                        backgroundColor: isValid ? '#10B98120' : option.color + '20', 
                                        borderColor: isValid ? '#10B981' : option.color,
                                        borderBottomLeftRadius: 0,
                                        borderBottomRightRadius: 0,
                                        borderBottomWidth: 0,
                                      }
                                    ]}
                                    onPress={() => {
                                      // Si l'exercice est validé, ne pas le désélectionner
                                      if (isValid) return;
                                      toggleOption(sportId, option.id);
                                    }}
                                  >
                                    <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 10 }}>
                                      {option.icon && (
                                        <MaterialCommunityIcons
                                          name={option.icon as any}
                                          size={18}
                                          color={isSelected ? (isValid ? '#10B981' : option.color) : colors.textMuted}
                                        />
                                      )}
                                      <Text style={[
                                        styles.sportOptionLabel,
                                        { color: colors.textSecondary, flex: 1 },
                                        isSelected && { color: colors.textPrimary, fontWeight: '700' }
                                      ]}>
                                        {option.label}
                                      </Text>
                                      {isSelected && !isValid && (
                                        <TouchableOpacity
                                          onPress={(e) => {
                                            e.stopPropagation();
                                            // Validation uniquement - pas de toggle
                                            if (isStrength && (!stats.weight || !stats.reps)) {
                                              // Ne valide pas si les champs requis sont vides
                                              return;
                                            }
                                            setValidatedOptions(prev => ({ ...prev, [option.id]: true }));
                                            Keyboard.dismiss();
                                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                          }}
                                          style={{
                                            backgroundColor: '#EF4444',
                                            paddingHorizontal: 10,
                                            paddingVertical: 6,
                                            borderRadius: 8,
                                            flexDirection: 'row',
                                            alignItems: 'center',
                                            gap: 4
                                          }}
                                          activeOpacity={0.7}
                                        >
                                          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>VALIDER</Text>
                                          <Check size={14} color="#FFF" />
                                        </TouchableOpacity>
                                      )}
                                      {isSelected && isValid && (
                                        <View style={{
                                          backgroundColor: '#10B981',
                                          paddingHorizontal: 10,
                                          paddingVertical: 6,
                                          borderRadius: 8,
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          gap: 4
                                        }}>
                                          <Text style={{ color: '#FFF', fontSize: 10, fontWeight: '900' }}>VALIDÉ</Text>
                                          <Check size={14} color="#FFF" />
                                        </View>
                                      )}
                                    </View>
                                  </TouchableOpacity>
                                  
                                  {/* INPUT AREA (Non-clickable for toggle) */}
                                  {isSelected && (
                                    <View style={{
                                        backgroundColor: isValid ? '#10B98120' : option.color + '20', 
                                        borderColor: isValid ? '#10B981' : option.color,
                                        borderWidth: 1,
                                        borderTopWidth: 0,
                                        borderBottomLeftRadius: 12,
                                        borderBottomRightRadius: 12,
                                        padding: 12,
                                        marginTop: -1
                                    }}>
                                        {isStrength && (
                                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                                              <TextInput
                                                style={{ width: 45, height: 34, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', borderRadius: 8, textAlign: 'center', color: colors.textPrimary, fontWeight: '700', borderWidth: 1, borderColor: isValid ? '#10B981' : colors.border }}
                                                placeholder="kg"
                                                placeholderTextColor={colors.textMuted}
                                                keyboardType="decimal-pad"
                                                value={stats.weight}
                                                onChangeText={(val) => setOptionStats(prev => ({ ...prev, [option.id]: { ...stats, weight: val } }))}
                                              />
                                              <Text style={{ color: colors.textMuted, fontSize: 12 }}>x</Text>
                                              <TextInput
                                                style={{ width: 40, height: 34, backgroundColor: isDark ? 'rgba(0,0,0,0.3)' : '#FFF', borderRadius: 8, textAlign: 'center', color: colors.textPrimary, fontWeight: '700', borderWidth: 1, borderColor: isValid ? '#10B981' : colors.border }}
                                                placeholder="reps"
                                                placeholderTextColor={colors.textMuted}
                                                keyboardType="number-pad"
                                                value={stats.reps}
                                                onChangeText={(val) => setOptionStats(prev => ({ ...prev, [option.id]: { ...stats, reps: val } }))}
                                              />
                                            </View>
                                            <TouchableOpacity
                                              onPress={() => {
                                                // Supprimer complètement l'exercice
                                                setOptionStats(prev => {
                                                  const newStats = { ...prev };
                                                  delete newStats[option.id];
                                                  return newStats;
                                                });
                                                setValidatedOptions(prev => {
                                                  const newValidated = { ...prev };
                                                  delete newValidated[option.id];
                                                  return newValidated;
                                                });
                                                toggleOption(sportId, option.id);
                                              }}
                                              style={{ marginLeft: 8 }}
                                            >
                                              <MaterialCommunityIcons name="trash-can-outline" size={20} color="#EF4444" />
                                            </TouchableOpacity>
                                          </View>
                                        )}
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
                      <View style={styles.sportOptionsHeader}>
                        <Edit3 size={20} color={colors.gold} />
                        <Text style={[styles.sportOptionsTitle, { color: colors.textPrimary }]}>Personnalise ta seance</Text>
                      </View>
                      <Text style={{ color: colors.textMuted, fontSize: 12, marginBottom: 12 }}>Ajoute un exercice ou un detail specifique a la main :</Text>
                      <View style={{ flexDirection: 'row', gap: 10 }}>
                                          <TextInput
                                            style={[styles.notesInput, { flex: 1, minHeight: 50, marginBottom: 0, paddingVertical: 10, color: colors.textPrimary }]}
                                            placeholder="Ex: 50 tractions, Sparring intensif..."                          placeholderTextColor={colors.textMuted}
                          value={customExerciseName}
                          onChangeText={setCustomExerciseName}
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
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                                  Haptics.selectionAsync();
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
                                                                    <Text style={{ fontSize: 10, color: colors.textMuted, marginBottom: 2 }}>SÉRIES</Text>
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
        {selectedSports.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: isDark ? colors.accent : '#000000', marginTop: SPACING.lg, fontWeight: '700' }]}>
              4. Date & Heure
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
                <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 8, fontWeight: '600' }}>Durée de la séance</Text>
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
                      maxLength={2}
                    />
                    <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted }}>MINUTES</Text>
                  </View>
                </View>
              </View>



            </View>
          </>
        )}

        {/* FIN DES STATS PERFORMANCE */}

        {/* CHAMPS COMBAT (Rounds) - Si sport de combat sélectionné */}
        {selectedSports.some(s => ['jjb', 'mma', 'boxe', 'muay_thai', 'lutte', 'karate', 'sambo'].includes(s)) && (
          <View style={{ marginTop: 20 }}>
            <View style={{ flexDirection: 'row', gap: 12 }}>
              <View style={[styles.proStatItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.proStatLabel, { color: colors.textSecondary }]}>Rounds</Text>
                <TextInput
                  style={[styles.proStatInput, { color: colors.textPrimary }]}
                  value={rounds}
                  onChangeText={setRounds}
                  placeholder="0"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
              <View style={[styles.proStatItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.proStatLabel, { color: colors.textSecondary }]}>Durée Round (min)</Text>
                <TextInput
                  style={[styles.proStatInput, { color: colors.textPrimary }]}
                  value={roundDuration}
                  onChangeText={setRoundDuration}
                  placeholder="5"
                  placeholderTextColor={colors.textMuted}
                  keyboardType="number-pad"
                  maxLength={2}
                />
              </View>
            </View>
          </View>
        )}

                                    {/* ═══════════════════════════════════════════ */}
                                    {/* ÉTAPE 5: ANALYSE & RESSENTI */}
                                    {/* ═══════════════════════════════════════════ */}
                                    {selectedSports.length > 0 && (
                                      <>
                                        <Text style={[styles.sectionTitle, { color: isDark ? colors.accent : colors.textPrimary, marginTop: SPACING.lg, fontWeight: '700' }]}>
                                          5. Analyse & Ressenti
                                        </Text>
                  
                                        <View style={{ backgroundColor: colors.card, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' }}>
                                          
                                          {/* INTENSITÉ */}
                                          <View style={{ padding: 16, borderBottomWidth: 1, borderBottomColor: colors.border }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                              <Activity size={18} color={colors.accent} />
                                              <Text style={{ fontSize: 14, fontWeight: '700', color: colors.textPrimary }}>Intensité de la séance</Text>
                                            </View>
                                            
                                            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 16, lineHeight: 18 }}>
                                              L'échelle RPE (Rate of Perceived Exertion) mesure ton effort ressenti. C'est le meilleur indicateur de ta charge interne.
                                            </Text>
                  
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16, justifyContent: 'center' }}>
                                              <TouchableOpacity onPress={() => setIntensity(Math.max(1, intensity - 1))} style={styles.intensityStep}>
                                                <Text style={{ fontSize: 28, color: colors.textMuted, fontWeight: '300' }}>-</Text>
                                              </TouchableOpacity>
                                              
                                              <View style={{ alignItems: 'center', minWidth: 80 }}>
                                                <Text style={[styles.proStatInput, { color: intensity > 7 ? '#EF4444' : colors.accent, marginBottom: -4 }]}>
                                                  {intensity}
                                                </Text>
                                                <Text style={{ fontSize: 10, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase' }}>
                                                  {intensity <= 3 ? 'Facile' : intensity <= 6 ? 'Modéré' : intensity <= 8 ? 'Difficile' : 'Maximal'}
                                                </Text>
                                              </View>
                  
                                              <TouchableOpacity onPress={() => setIntensity(Math.min(10, intensity + 1))} style={styles.intensityStep}>
                                                <Text style={{ fontSize: 28, color: colors.textMuted, fontWeight: '300' }}>+</Text>
                                              </TouchableOpacity>
                                            </View>
                                          </View>
                  
                                          {/* TECHNIQUE */}
                                          <View style={{ padding: 16, backgroundColor: colors.accent + '05' }}>
                                             <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                              <Star size={18} color={colors.accent} />
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
        {selectedSports.length > 1 && (
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
            <Text style={{ fontSize: 14, fontWeight: '800', color: colors.accent, marginBottom: 12, letterSpacing: 0.5 }}>
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
                  ⚠️ Vous avez oublié le champ "Sport principal". Veuillez le remplir pour continuer.
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

        {/* BOUTON SAVE */}
        {selectedSports.length > 0 && (
          <TouchableOpacity
            style={[
              styles.saveButton,
              { backgroundColor: colors.accent, marginTop: 20 },
              isSubmitting && styles.saveButtonDisabled
            ]}
            onPress={handleSave}
            disabled={isSubmitting || selectedSports.length === 0}
          >
            <View style={styles.saveButtonContent}>
              {isSubmitting ? (
                <ActivityIndicator size="small" color={colors.textOnAccent || '#FFFFFF'} />
              ) : (
                <Dumbbell size={22} color={colors.textOnAccent || '#FFFFFF'} />
              )}
              <Text style={[styles.saveButtonText, { color: colors.textOnAccent || '#FFFFFF' }]}>
                {isSubmitting ? 'Enregistrement...' : 'Enregistrer'}
              </Text>
            </View>
          </TouchableOpacity>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

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
                                        <ConfettiCannon count={200} origin={{x: -10, y: 0}} />

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
                                  <Text style={{ fontSize: 13, fontWeight: '900', color: colors.gold, letterSpacing: 2, marginBottom: 8 }}>ÉTAPE 2 SUR 4</Text>
                                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                                    {/* Etape 1 (Passée - Gold) */}
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} />
                                    <View style={{ width: 30, height: 2, backgroundColor: colors.gold }} />

                                    {/* Etape 2 (Actuelle - Big Gold) */}
                                    <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.5, shadowRadius: 5 }} />

                                    {/* Futur (Noir & Blanc Cassé) */}
                                    <View style={{ width: 30, height: 2, backgroundColor: colors.border }} />
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.borderLight }} />
                                    <View style={{ width: 30, height: 2, backgroundColor: colors.border }} />
                                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.borderLight }} />
                                  </View>
                                </View>
                              </View>
                              <Text style={{ fontSize: 20, fontWeight: '900', color: colors.textPrimary, letterSpacing: 1, textAlign: 'center' }}>APERÇU CARTE</Text>
                            </View>


                            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center', paddingBottom: 40, paddingHorizontal: 20 }}>
                              {validationStep === 2 && (
                                <>
                              <View style={{ width: 360, borderRadius: 24, overflow: 'hidden', shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, elevation: 15, marginBottom: 30 }}>
                                <SessionCard
                                  training={{
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
                                  }}
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
                                    router.replace('/social-share/last-session');
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
                                    borderWidth: 1,
                                    borderColor: colors.border
                                  }}
                                  onPress={() => {
                                    setShowValidationModal(false);
                                    setCardBackgroundImage(null);
                                    router.replace('/(tabs)');
                                  }}
                                >
                                  <Text style={{ color: colors.textSecondary, fontWeight: '800', fontSize: 16 }}>PASSER</Text>
                                </TouchableOpacity>
                              </View>
                                </>
                              )}

                              {/* ÉTAPE 3: APERÇU AVEC PHOTO */}
                              {validationStep === 3 && (
                                <>
                              <View style={{ width: 360, borderRadius: 24, overflow: 'hidden', shadowColor: "#000", shadowOpacity: 0.3, shadowRadius: 20, elevation: 15, marginBottom: 30 }}>
                                <SessionCard
                                  training={{
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
                                  }}
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
                                    if (lastSavedTrainingId) {
                                      router.push(`/social-share/last-session?id=${lastSavedTrainingId}`);
                                    } else {
                                      router.push('/social-share/last-session');
                                    }
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
                                  onPress={async () => {
                                    setShowPhotoChoiceModal(false);
                                    await pickImageFromGallery();
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
                                  onPress={async () => {
                                    setShowPhotoChoiceModal(false);
                                    await takePhoto();
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
              Hello {userGender === 'female' ? 'Championne' : 'Champion'} {userName} ! 👋
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
                await WebBrowser.openBrowserAsync(storeUrl);
                setShowHouariRateModal(false);
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Star fill={colors.textOnGold} color={colors.textOnGold} size={20} />
                <Text style={{ color: colors.textOnGold, fontWeight: '800', fontSize: 18 }}>Donner de la force (5★)</Text>
              </View>
            </TouchableOpacity>

            <Text style={{ fontSize: 14, fontStyle: 'italic', color: colors.textMuted, textAlign: 'center' }}>
              Merci de faire partie de la famille Yoroi ❤️
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

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: SPACING.xl,
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
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  sportsContainer: {
    paddingHorizontal: SPACING.xl,
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
