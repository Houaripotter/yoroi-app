import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import {
  Play,
  Pause,
  RotateCcw,
  Square,
  ChevronLeft,
  Swords,
  Dumbbell,
  Zap,
  Timer,
  Plus,
  Minus,
  RefreshCw,
  SkipForward,
  Target,
  Footprints,
  Settings,
  Flag,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { SPACING, RADIUS, FONT } from '@/constants/appTheme';
import { soundManager } from '@/lib/sounds';
import { RepsWeightModal } from '@/components/RepsWeightModal';
import { WorkoutSummaryModal } from '@/components/WorkoutSummaryModal';
import { RPEModal } from '@/components/RPEModal';
import { TimerAlarmOverlay } from '@/components/TimerAlarmOverlay';
import { roninModeService, RONIN_THEME } from '@/lib/roninMode';
import { useI18n } from '@/lib/I18nContext';
import { saveTrainingLoad } from '@/lib/trainingLoadService';
import { useLiveActivity } from '@/lib/hooks/useLiveActivity';
import { timerNotifications } from '@/lib/timerNotifications';
import { flashService } from '@/lib/flashService';
import { backgroundTaskService } from '@/lib/backgroundTaskService';
import logger from '@/lib/security/logger';

// ============================================
// MINUTEUR YOROI COMPLET
// ============================================
// Mode Musculation : repos entre series avec compteur
// Mode Combat : rounds avec repos (JJB, MMA, Boxe, etc.)
// Mode Tabata : HIIT 20/10
// Mode EMOM : Every Minute On the Minute

type TimerMode = 'musculation' | 'combat' | 'tabata' | 'emom' | 'amrap' | 'fortime';
type TimerState = 'idle' | 'running' | 'paused' | 'rest' | 'finished';
type CombatPreset = 'jjb' | 'mma' | 'boxe' | 'muaythai' | 'kickboxing' | 'lutte' | 'grappling' | 'custom';

// Presets repos musculation (secondes)
const MUSCULATION_PRESETS = [
  { label: '30s', seconds: 30, description: 'Endurance' },
  { label: '60s', seconds: 60, description: 'Hypertrophie' },
  { label: '90s', seconds: 90, description: 'Force' },
  { label: '2min', seconds: 120, description: 'Force lourde' },
  { label: '3min', seconds: 180, description: 'Powerlifting' },
];

// Presets combat
const COMBAT_PRESETS: Record<CombatPreset, {
  name: string;
  icon?: React.ComponentType<{ size: number; color: string }>;
  roundTime: number;
  restTime: number;
  rounds: number;
  description: string;
}> = {
  jjb: {
    name: 'JJB',
    roundTime: 5 * 60,
    restTime: 60,
    rounds: 5,
    description: 'Format IBJJF',
  },
  mma: {
    name: 'MMA',
    roundTime: 5 * 60,
    restTime: 60,
    rounds: 3,
    description: 'Format UFC',
  },
  boxe: {
    name: 'Boxe',
    roundTime: 3 * 60,
    restTime: 60,
    rounds: 10,
    description: 'Format Pro',
  },
  muaythai: {
    name: 'Muay Thai',
    icon: Footprints,
    roundTime: 3 * 60,
    restTime: 120,
    rounds: 5,
    description: 'Format Thai',
  },
  kickboxing: {
    name: 'Kickboxing',
    icon: Zap,
    roundTime: 3 * 60,
    restTime: 60,
    rounds: 3,
    description: 'K-1 Style',
  },
  lutte: {
    name: 'Lutte',
    roundTime: 3 * 60,
    restTime: 30,
    rounds: 3,
    description: 'Wrestling',
  },
  grappling: {
    name: 'Grappling',
    icon: Swords,
    roundTime: 6 * 60,
    restTime: 60,
    rounds: 3,
    description: 'No-Gi',
  },
  custom: {
    name: 'Perso',
    icon: Settings,
    roundTime: 3 * 60,
    restTime: 60,
    rounds: 5,
    description: 'Personnalise',
  },
};

// Presets Tabata
const TABATA_PRESETS = [
  { label: '4 min', rounds: 8, work: 20, rest: 10 },
  { label: '8 min', rounds: 16, work: 20, rest: 10 },
  { label: '12 min', rounds: 24, work: 20, rest: 10 },
];

// Presets EMOM
const EMOM_PRESETS = [10, 15, 20, 30]; // minutes

export default function TimerScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { t } = useI18n();

  // Dynamic Island
  const { startActivity, stopActivity, updateActivity, isAvailable: isIslandAvailable } = useLiveActivity();

  // Ronin Mode (mode focus ultra-minimaliste)
  const [isRoninMode, setIsRoninMode] = useState(false);

  // Charger l'état du mode Ronin
  useEffect(() => {
    const loadRoninMode = async () => {
      const isActive = await roninModeService.isActive();
      setIsRoninMode(isActive);
    };
    loadRoninMode();
  }, []);

  // Couleurs conditionnelles selon le mode Ronin
  const timerColors = isRoninMode ? {
    background: RONIN_THEME.background,
    primary: RONIN_THEME.primary,
    text: RONIN_THEME.text,
    accent: RONIN_THEME.accent,
  } : colors;

  // Mode principal
  const [mode, setMode] = useState<TimerMode>('musculation');

  // === MUSCULATION ===
  const [musculationRest, setMusculationRest] = useState(90);
  const [seriesCount, setSeriesCount] = useState(0);
  const [seriesHistory, setSeriesHistory] = useState<{
    seriesNumber: number;
    timestamp: Date;
    restDuration: number;
    reps?: number;
    weight?: number;
  }[]>([]);
  const [showRepsWeightModal, setShowRepsWeightModal] = useState(false);
  const [trackRepsWeight, setTrackRepsWeight] = useState(false); // Toggle pour activer/désactiver

  // === COMBAT ===
  const [combatPreset, setCombatPreset] = useState<CombatPreset>('mma');
  const [roundDuration, setRoundDuration] = useState(COMBAT_PRESETS.mma.roundTime);
  const [restDuration, setRestDuration] = useState(COMBAT_PRESETS.mma.restTime);
  const [totalRounds, setTotalRounds] = useState(COMBAT_PRESETS.mma.rounds);
  const [currentRound, setCurrentRound] = useState(1);
  const [isInRest, setIsInRest] = useState(false);

  // === TABATA ===
  const [tabataRounds, setTabataRounds] = useState(8);
  const [tabataWork, setTabataWork] = useState(20);
  const [tabataRest, setTabataRest] = useState(10);
  const [tabataCurrentRound, setTabataCurrentRound] = useState(1);
  const [tabataIsWork, setTabataIsWork] = useState(true);
  const [tabataSets, setTabataSets] = useState(1); // Nombre de sets
  const [tabataRestBetweenSets, setTabataRestBetweenSets] = useState(60); // Repos entre sets
  const [tabataCurrentSet, setTabataCurrentSet] = useState(1);
  const [tabataIsRestBetweenSets, setTabataIsRestBetweenSets] = useState(false);

  // === EMOM ===
  const [emomDuration, setEmomDuration] = useState(10); // minutes
  const [emomCurrentMinute, setEmomCurrentMinute] = useState(1);
  const [emomExercises, setEmomExercises] = useState<string[]>(['10 Burpees', '15 Air Squats', '20 Sit-ups']);

  // === AMRAP ===
  const [amrapDuration, setAmrapDuration] = useState(12 * 60); // 12 minutes en secondes
  const [amrapRoundsCompleted, setAmrapRoundsCompleted] = useState(0);
  const [amrapExercises, setAmrapExercises] = useState<string[]>(['5 Pull-ups', '10 Push-ups', '15 Air Squats']);

  // === FOR TIME ===
  const [forTimeElapsed, setForTimeElapsed] = useState(0); // Temps écoulé en secondes
  const [forTimeCap, setForTimeCap] = useState(15 * 60); // Time cap 15 min
  const [forTimeExercises, setForTimeExercises] = useState<string[]>(['21-15-9', 'Thrusters', 'Pull-ups']);

  // Timer state
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [showRPEModal, setShowRPEModal] = useState(false);
  const [showAlarmOverlay, setShowAlarmOverlay] = useState(false);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Timer précision · basé sur timestamp réel pour éviter le drift de setInterval
  const endTimestampRef = useRef<number>(0);
  const lastCountdownRef = useRef<number>(-1);
  const phaseEndedRef = useRef<boolean>(false);
  const forTimeStartRef = useRef<number>(0);
  const lastForTimeElapsedRef = useRef<number>(-1);

  // === REFS miroir pour éviter de recréer l'intervalle à chaque transition ===
  // Le useEffect du timer ne dépend que de timerState.
  // Les transitions lisent depuis ces refs au lieu du state capturé par closure.
  const modeRef = useRef(mode);
  const isInRestRef = useRef(isInRest);
  const currentRoundRef = useRef(currentRound);
  const totalRoundsRef = useRef(totalRounds);
  const roundDurationRef = useRef(roundDuration);
  const restDurationRef = useRef(restDuration);
  const tabataIsWorkRef = useRef(tabataIsWork);
  const tabataCurrentRoundRef = useRef(tabataCurrentRound);
  const tabataRoundsRef = useRef(tabataRounds);
  const tabataWorkRef = useRef(tabataWork);
  const tabataRestRef = useRef(tabataRest);
  const tabataIsRestBetweenSetsRef = useRef(tabataIsRestBetweenSets);
  const tabataCurrentSetRef = useRef(tabataCurrentSet);
  const tabataSetsRef = useRef(tabataSets);
  const tabataRestBetweenSetsRef = useRef(tabataRestBetweenSets);
  const emomCurrentMinuteRef = useRef(emomCurrentMinute);
  const emomDurationRef = useRef(emomDuration);
  const forTimeCapRef = useRef(forTimeCap);
  const trackRepsWeightRef = useRef(trackRepsWeight);
  const musculationRestRef = useRef(musculationRest);
  const seriesCountRef = useRef(seriesCount);

  // Synchroniser les refs avec le state à chaque render
  useEffect(() => { modeRef.current = mode; }, [mode]);
  useEffect(() => { isInRestRef.current = isInRest; }, [isInRest]);
  useEffect(() => { currentRoundRef.current = currentRound; }, [currentRound]);
  useEffect(() => { totalRoundsRef.current = totalRounds; }, [totalRounds]);
  useEffect(() => { roundDurationRef.current = roundDuration; }, [roundDuration]);
  useEffect(() => { restDurationRef.current = restDuration; }, [restDuration]);
  useEffect(() => { tabataIsWorkRef.current = tabataIsWork; }, [tabataIsWork]);
  useEffect(() => { tabataCurrentRoundRef.current = tabataCurrentRound; }, [tabataCurrentRound]);
  useEffect(() => { tabataRoundsRef.current = tabataRounds; }, [tabataRounds]);
  useEffect(() => { tabataWorkRef.current = tabataWork; }, [tabataWork]);
  useEffect(() => { tabataRestRef.current = tabataRest; }, [tabataRest]);
  useEffect(() => { tabataIsRestBetweenSetsRef.current = tabataIsRestBetweenSets; }, [tabataIsRestBetweenSets]);
  useEffect(() => { tabataCurrentSetRef.current = tabataCurrentSet; }, [tabataCurrentSet]);
  useEffect(() => { tabataSetsRef.current = tabataSets; }, [tabataSets]);
  useEffect(() => { tabataRestBetweenSetsRef.current = tabataRestBetweenSets; }, [tabataRestBetweenSets]);
  useEffect(() => { emomCurrentMinuteRef.current = emomCurrentMinute; }, [emomCurrentMinute]);
  useEffect(() => { emomDurationRef.current = emomDuration; }, [emomDuration]);
  useEffect(() => { forTimeCapRef.current = forTimeCap; }, [forTimeCap]);
  useEffect(() => { trackRepsWeightRef.current = trackRepsWeight; }, [trackRepsWeight]);
  useEffect(() => { musculationRestRef.current = musculationRest; }, [musculationRest]);
  useEffect(() => { seriesCountRef.current = seriesCount; }, [seriesCount]);

  // Initialiser le SoundManager + pré-demander les permissions notifications
  // pour éviter que la dialog iOS apparaisse en plein milieu d'un timer
  useEffect(() => {
    soundManager.initialize();
    timerNotifications.requestPermissions().catch(() => {});

    return () => {
      soundManager.cleanup();
      deactivateKeepAwake();
    };
  }, []);

  // Desactiver keep-awake quand le timer se termine et afficher alarm overlay
  useEffect(() => {
    if (timerState === 'finished') {
      deactivateKeepAwake();
      // Arrêter la Live Activity
      if (isIslandAvailable) {
        stopActivity().catch(e => logger.error('LiveActivity Stop Error:', e));
      }
      // Afficher l'overlay alarme plein écran
      setShowAlarmOverlay(true);
    }
  }, [timerState, isIslandAvailable]);

  // Handler pour fermer l'alarme et afficher le summary
  const handleDismissAlarm = useCallback(() => {
    setShowAlarmOverlay(false);
    // Afficher le summary après fermeture de l'alarme
    setTimeout(() => {
      setShowSummaryModal(true);
    }, 300);
  }, []);

  // Enregistrer le temps de début du workout
  useEffect(() => {
    if (timerState === 'running' && workoutStartTime === null) {
      setWorkoutStartTime(new Date());
    } else if (timerState === 'idle') {
      setWorkoutStartTime(null);
    }
  }, [timerState]);

  // Haptic feedback
  const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'medium') => {
    if (Platform.OS !== 'web') {
      const style = type === 'light'
        ? ImpactFeedbackStyle.Light
        : type === 'heavy'
        ? ImpactFeedbackStyle.Heavy
        : ImpactFeedbackStyle.Medium;
      impactAsync(style);
    }
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get current total time based on mode
  const getCurrentTotalTime = useCallback(() => {
    switch (mode) {
      case 'musculation':
        return musculationRest;
      case 'combat':
        return isInRest ? restDuration : roundDuration;
      case 'tabata':
        if (tabataIsRestBetweenSets) return tabataRestBetweenSets;
        return tabataIsWork ? tabataWork : tabataRest;
      case 'emom':
        return 60;
      case 'amrap':
        return amrapDuration;
      case 'fortime':
        return forTimeCap;
      default:
        return 60;
    }
  }, [mode, musculationRest, isInRest, restDuration, roundDuration, tabataIsWork, tabataWork, tabataRest, tabataIsRestBetweenSets, tabataRestBetweenSets, amrapDuration, forTimeCap]);

  // Apply combat preset
  const applyCombatPreset = (preset: CombatPreset) => {
    const config = COMBAT_PRESETS[preset];
    setCombatPreset(preset);
    setRoundDuration(config.roundTime);
    setRestDuration(config.restTime);
    setTotalRounds(config.rounds);
    if (timerState === 'idle') {
      setTimeRemaining(config.roundTime);
    }
    triggerHaptic('light');
  };

  // Start timer
  const startTimer = async () => {
    triggerHaptic('medium');

    let initialTime = 0;

    if (timerState === 'idle') {
      switch (mode) {
        case 'musculation':
          initialTime = musculationRest;
          setSeriesCount(prev => prev + 1);
          break;
        case 'combat':
          initialTime = roundDuration;
          setCurrentRound(1);
          setIsInRest(false);
          break;
        case 'tabata':
          initialTime = tabataWork;
          setTabataCurrentRound(1);
          setTabataCurrentSet(1);
          setTabataIsWork(true);
          setTabataIsRestBetweenSets(false);
          break;
        case 'emom':
          initialTime = 60;
          setEmomCurrentMinute(1);
          break;
        case 'amrap':
          initialTime = amrapDuration;
          setAmrapRoundsCompleted(0);
          break;
        case 'fortime':
          initialTime = 0; // FOR TIME compte vers le haut
          setForTimeElapsed(0);
          forTimeStartRef.current = Date.now();
          lastForTimeElapsedRef.current = -1;
          break;
      }
      setTimeRemaining(initialTime);
      if (mode !== 'fortime' && initialTime > 0) {
        endTimestampRef.current = Date.now() + initialTime * 1000;
        lastCountdownRef.current = -1;
        phaseEndedRef.current = false;
      }

      // Jouer le son de debut - gong pour combat, beep pour le reste
      if (mode === 'combat') {
        soundManager.playGong();
      } else {
        soundManager.playBeep();
      }

      // Dynamic Island - Démarrer l'activité
      if (isIslandAvailable) {
        startActivity(mode.toUpperCase()).catch(e => logger.error('LiveActivity Error:', e));
      }

      // PLANIFIER NOTIFICATION QUAND TIMER TERMINE (pour arriere-plan)
      // Utiliser endTimestampRef.current (timestamp absolu) pour une précision exacte
      if (mode !== 'fortime' && initialTime > 0) {
        timerNotifications.scheduleTimerEndNotification(mode, endTimestampRef.current)
          .catch(e => logger.error('Notification error:', e));
      }

      // Demander du temps d'exécution iOS en arrière-plan
      // (garde le JS vivant ~30s après verrouillage → le flash JS peut toujours tirer)
      backgroundTaskService.begin();
    }

    // Garder l'ecran allume pendant le timer (sans bloquer)
    activateKeepAwakeAsync().catch(e => logger.error('KeepAwake error:', e));

    // IMPORTANT: Démarrer le timer IMMÉDIATEMENT
    setTimerState('running');
  };

  // Pause timer
  const pauseTimer = () => {
    triggerHaptic('light');
    deactivateKeepAwake();
    backgroundTaskService.end();
    timerNotifications.cancelNotification().catch(e => logger.error('Cancel notification error:', e));
    setTimerState('paused');
  };

  // Résumé timer
  const resumeTimer = () => {
    triggerHaptic('light');
    activateKeepAwakeAsync().catch(e => logger.error('KeepAwake error:', e));
    backgroundTaskService.begin();
    if (mode === 'fortime') {
      forTimeStartRef.current = Date.now() - timeRemaining * 1000;
      lastForTimeElapsedRef.current = -1;
      phaseEndedRef.current = false;
    } else if (timeRemaining > 0) {
      endTimestampRef.current = Date.now() + timeRemaining * 1000;
      timerNotifications.scheduleTimerEndNotification(mode, endTimestampRef.current)
        .catch(e => logger.error('Notification error:', e));
      lastCountdownRef.current = -1;
      phaseEndedRef.current = false;
    }
    setTimerState('running');
  };

  // Reset timer
  const resetTimer = () => {
    triggerHaptic('medium');
    deactivateKeepAwake();
    backgroundTaskService.end();
    setTimerState('idle');

    timerNotifications.cancelNotification().catch(e => logger.error('Cancel notification error:', e));

    // Arrêter la Live Activity
    if (isIslandAvailable) {
      stopActivity().catch(e => logger.error('LiveActivity Reset Error:', e));
    }

    switch (mode) {
      case 'musculation':
        setTimeRemaining(musculationRest);
        break;
      case 'combat':
        setCurrentRound(1);
        setIsInRest(false);
        setTimeRemaining(roundDuration);
        break;
      case 'tabata':
        setTabataCurrentRound(1);
        setTabataCurrentSet(1);
        setTabataIsWork(true);
        setTabataIsRestBetweenSets(false);
        setTimeRemaining(tabataWork);
        break;
      case 'emom':
        setEmomCurrentMinute(1);
        setTimeRemaining(60);
        break;
      case 'amrap':
        setTimeRemaining(amrapDuration);
        setAmrapRoundsCompleted(0);
        break;
      case 'fortime':
        setTimeRemaining(0);
        setForTimeElapsed(0);
        break;
    }
  };

  // Reset series count (musculation only)
  const resetSeriesCount = () => {
    setSeriesCount(0);
    setSeriesHistory([]);
    triggerHaptic('light');
  };

  // Save reps and weight from modal
  const handleSaveRepsWeight = (reps: number, weight: number) => {
    setSeriesHistory(prev => [...prev, {
      seriesNumber: seriesCount,
      timestamp: new Date(),
      restDuration: musculationRest,
      reps,
      weight,
    }]);
    setShowRepsWeightModal(false);
    triggerHaptic('light');
  };

  // Skip reps/weight tracking
  const handleSkipRepsWeight = () => {
    setSeriesHistory(prev => [...prev, {
      seriesNumber: seriesCount,
      timestamp: new Date(),
      restDuration: musculationRest,
    }]);
    setShowRepsWeightModal(false);
    triggerHaptic('light');
  };

  // Calculate workout stats
  const getWorkoutStats = () => {
    const totalWorkoutTime = workoutStartTime
      ? Math.floor((new Date().getTime() - workoutStartTime.getTime()) / 1000)
      : 0;

    const stats: any = {
      totalTime: totalWorkoutTime,
    };

    switch (mode) {
      case 'musculation':
        stats.series = seriesCount;
        break;
      case 'combat':
        stats.rounds = totalRounds;
        break;
      case 'tabata':
        stats.rounds = tabataRounds;
        stats.sets = tabataSets;
        break;
      case 'emom':
        stats.rounds = emomDuration;
        break;
      case 'amrap':
        stats.amrapRounds = amrapRoundsCompleted;
        break;
      case 'fortime':
        stats.forTimeResult = forTimeElapsed;
        break;
    }

    return stats;
  };

  // Save workout
  const handleSaveWorkout = () => {
    // Fermer le summary et ouvrir le modal RPE
    setShowSummaryModal(false);
    setTimeout(() => {
      setShowRPEModal(true);
    }, 300);
  };

  const getWorkoutDurationMinutes = () => {
    if (!workoutStartTime) return 0;
    const endTime = new Date();
    return Math.round((endTime.getTime() - workoutStartTime.getTime()) / 60000);
  };

  const handleRPESubmit = async (rpe: number, load: number) => {
    try {
      // Sauvegarder la charge d'entraînement
      await saveTrainingLoad({
        date: new Date().toISOString(),
        duration: getWorkoutDurationMinutes(),
        rpe,
        load,
        mode,
      });
    } catch (error) {
      logger.error('Erreur sauvegarde charge:', error);
    }
    setShowRPEModal(false);
    resetTimer();
    triggerHaptic('medium');
  };

  const handleRPESkip = () => {
    setShowRPEModal(false);
    resetTimer();
    triggerHaptic('light');
  };

  // Restart workout
  const handleRestartWorkout = () => {
    setShowSummaryModal(false);
    resetTimer();
    triggerHaptic('medium');
  };

  // Skip to next round/phase
  const skipRound = async () => {
    triggerHaptic('medium');

    switch (mode) {
      case 'combat':
        if (isInRest) {
          // Sauter le repos, commencer le prochain round
          if (currentRound < totalRounds) {
            setCurrentRound(r => r + 1);
            setIsInRest(false);
            endTimestampRef.current = Date.now() + roundDuration * 1000;
            lastCountdownRef.current = -1;
            phaseEndedRef.current = false;
            setTimeRemaining(roundDuration);
            soundManager.playGong();
          } else {
            // C'etait le dernier repos
            phaseEndedRef.current = true;
            setTimerState('finished');
            soundManager.playVictory();
            setTimeRemaining(0);
          }
        } else {
          // Sauter le round actuel, aller au repos
          if (currentRound < totalRounds) {
            setIsInRest(true);
            endTimestampRef.current = Date.now() + restDuration * 1000;
            lastCountdownRef.current = -1;
            phaseEndedRef.current = false;
            setTimeRemaining(restDuration);
            soundManager.playGong();
          } else {
            // C'etait le dernier round
            phaseEndedRef.current = true;
            setTimerState('finished');
            soundManager.playVictory();
            setTimeRemaining(0);
          }
        }
        break;

      case 'tabata':
        if (tabataIsWork) {
          // Sauter le travail, aller au repos
          setTabataIsWork(false);
          endTimestampRef.current = Date.now() + tabataRest * 1000;
          lastCountdownRef.current = -1;
          phaseEndedRef.current = false;
          setTimeRemaining(tabataRest);
        } else {
          // Sauter le repos, aller au prochain round
          if (tabataCurrentRound < tabataRounds) {
            setTabataCurrentRound(r => r + 1);
            setTabataIsWork(true);
            endTimestampRef.current = Date.now() + tabataWork * 1000;
            lastCountdownRef.current = -1;
            phaseEndedRef.current = false;
            setTimeRemaining(tabataWork);
          } else {
            phaseEndedRef.current = true;
            setTimerState('finished');
            soundManager.playVictory();
            setTimeRemaining(0);
          }
        }
        soundManager.playBeep();
        break;

      case 'emom':
        // Sauter a la minute suivante
        if (emomCurrentMinute < emomDuration) {
          setEmomCurrentMinute(m => m + 1);
          endTimestampRef.current = Date.now() + 60 * 1000;
          lastCountdownRef.current = -1;
          phaseEndedRef.current = false;
          setTimeRemaining(60);
          soundManager.playBeep();
        } else {
          phaseEndedRef.current = true;
          setTimerState('finished');
          soundManager.playVictory();
          setTimeRemaining(0);
        }
        break;

      case 'musculation':
        // Pour muscu, skip termine juste le repos
        phaseEndedRef.current = true;
        setTimerState('finished');
        setTimeRemaining(0);
        soundManager.playBeep();
        break;
    }
  };

  // Timer logic · précision basée sur timestamp réel (évite le drift de setInterval)
  // IMPORTANT : ne dépend QUE de timerState pour éviter de recréer l'intervalle
  // à chaque transition de phase (cause du freeze). Toutes les valeurs de transition
  // sont lues depuis les refs miroir.
  useEffect(() => {
    if (timerState === 'running') {
      phaseEndedRef.current = false;
      lastCountdownRef.current = -1;
      lastForTimeElapsedRef.current = -1;

      intervalRef.current = setInterval(() => {

        // FOR TIME : compte vers le HAUT via timestamp réel
        if (modeRef.current === 'fortime') {
          const elapsed = Math.floor((Date.now() - forTimeStartRef.current) / 1000);
          if (elapsed !== lastForTimeElapsedRef.current) {
            lastForTimeElapsedRef.current = elapsed;
            setTimeRemaining(elapsed);
            setForTimeElapsed(elapsed);
            if (elapsed >= forTimeCapRef.current && !phaseEndedRef.current) {
              phaseEndedRef.current = true;
              soundManager.playBeep();
              triggerHaptic('heavy');
              Vibration.vibrate([0, 500, 200, 500]);
              setTimerState('finished');
            }
          }
          return;
        }

        // Tous les autres modes : décompte précis basé sur timestamp réel
        const realRemaining = Math.max(0, Math.ceil((endTimestampRef.current - Date.now()) / 1000));

        // Sons countdown · joués une seule fois par seconde
        if (realRemaining !== lastCountdownRef.current) {
          if (realRemaining === 3 || realRemaining === 2 || realRemaining === 1) {
            lastCountdownRef.current = realRemaining;
            soundManager.playFinalCountdown(realRemaining);
            triggerHaptic('heavy');
            Vibration.vibrate(300);
          } else if (realRemaining <= 10 && realRemaining > 3) {
            lastCountdownRef.current = realRemaining;
            soundManager.playCountdownTick(realRemaining);
            triggerHaptic('light');
          }
        }

        if (realRemaining <= 0) {
          // Garde anti double-déclenchement
          if (phaseEndedRef.current) return;
          phaseEndedRef.current = true;

          // Son de fin + vibrations
          soundManager.playWizz();
          triggerHaptic('heavy');
          Vibration.vibrate([0, 500, 200, 500, 200, 500]);
          flashService.alarm();

          switch (modeRef.current) {
            case 'musculation':
              backgroundTaskService.end();
              setTimerState('finished');
              setTimeRemaining(0);
              if (trackRepsWeightRef.current) {
                setShowRepsWeightModal(true);
              } else {
                setSeriesHistory(prev => [...prev, {
                  seriesNumber: seriesCountRef.current,
                  timestamp: new Date(),
                  restDuration: musculationRestRef.current,
                }]);
              }
              break;

            case 'combat':
              if (isInRestRef.current) {
                if (currentRoundRef.current < totalRoundsRef.current) {
                  setCurrentRound(r => r + 1);
                  setIsInRest(false);
                  backgroundTaskService.begin();
                  endTimestampRef.current = Date.now() + roundDurationRef.current * 1000;
                  timerNotifications.scheduleTimerEndNotification('combat', endTimestampRef.current).catch(() => {});
                  lastCountdownRef.current = -1;
                  phaseEndedRef.current = false;
                  setTimeRemaining(roundDurationRef.current);
                } else {
                  backgroundTaskService.end();
                  setTimerState('finished');
                  setTimeRemaining(0);
                  soundManager.playVictory();
                }
              } else {
                if (currentRoundRef.current < totalRoundsRef.current) {
                  setIsInRest(true);
                  backgroundTaskService.begin();
                  endTimestampRef.current = Date.now() + restDurationRef.current * 1000;
                  timerNotifications.scheduleTimerEndNotification('combat', endTimestampRef.current).catch(() => {});
                  lastCountdownRef.current = -1;
                  phaseEndedRef.current = false;
                  setTimeRemaining(restDurationRef.current);
                } else {
                  backgroundTaskService.end();
                  setTimerState('finished');
                  setTimeRemaining(0);
                  soundManager.playVictory();
                }
              }
              break;

            case 'tabata':
              if (tabataIsRestBetweenSetsRef.current) {
                setTabataCurrentSet(s => s + 1);
                setTabataCurrentRound(1);
                setTabataIsRestBetweenSets(false);
                setTabataIsWork(true);
                backgroundTaskService.begin();
                endTimestampRef.current = Date.now() + tabataWorkRef.current * 1000;
                timerNotifications.scheduleTimerEndNotification('tabata', endTimestampRef.current).catch(() => {});
                lastCountdownRef.current = -1;
                phaseEndedRef.current = false;
                setTimeRemaining(tabataWorkRef.current);
              } else if (tabataIsWorkRef.current) {
                setTabataIsWork(false);
                backgroundTaskService.begin();
                endTimestampRef.current = Date.now() + tabataRestRef.current * 1000;
                timerNotifications.scheduleTimerEndNotification('tabata', endTimestampRef.current).catch(() => {});
                lastCountdownRef.current = -1;
                phaseEndedRef.current = false;
                setTimeRemaining(tabataRestRef.current);
              } else {
                if (tabataCurrentRoundRef.current < tabataRoundsRef.current) {
                  setTabataCurrentRound(r => r + 1);
                  setTabataIsWork(true);
                  backgroundTaskService.begin();
                  endTimestampRef.current = Date.now() + tabataWorkRef.current * 1000;
                  timerNotifications.scheduleTimerEndNotification('tabata', endTimestampRef.current).catch(() => {});
                  lastCountdownRef.current = -1;
                  phaseEndedRef.current = false;
                  setTimeRemaining(tabataWorkRef.current);
                } else if (tabataCurrentSetRef.current < tabataSetsRef.current) {
                  setTabataIsRestBetweenSets(true);
                  backgroundTaskService.begin();
                  endTimestampRef.current = Date.now() + tabataRestBetweenSetsRef.current * 1000;
                  timerNotifications.scheduleTimerEndNotification('tabata', endTimestampRef.current).catch(() => {});
                  lastCountdownRef.current = -1;
                  phaseEndedRef.current = false;
                  setTimeRemaining(tabataRestBetweenSetsRef.current);
                } else {
                  backgroundTaskService.end();
                  setTimerState('finished');
                  setTimeRemaining(0);
                  soundManager.playVictory();
                }
              }
              break;

            case 'emom':
              if (emomCurrentMinuteRef.current < emomDurationRef.current) {
                setEmomCurrentMinute(m => m + 1);
                backgroundTaskService.begin();
                endTimestampRef.current = Date.now() + 60 * 1000;
                timerNotifications.scheduleTimerEndNotification('emom', endTimestampRef.current).catch(() => {});
                lastCountdownRef.current = -1;
                phaseEndedRef.current = false;
                setTimeRemaining(60);
              } else {
                backgroundTaskService.end();
                setTimerState('finished');
                setTimeRemaining(0);
                soundManager.playVictory();
              }
              break;

            case 'amrap':
              backgroundTaskService.end();
              setTimerState('finished');
              setTimeRemaining(0);
              soundManager.playVictory();
              break;

            default:
              backgroundTaskService.end();
              setTimeRemaining(0);
              break;
          }
        } else {
          setTimeRemaining(realRemaining);
        }
      }, 250);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [timerState]); // eslint-disable-line react-hooks/exhaustive-deps
  // ↑ Seul timerState redémarre l'intervalle. Les transitions lisent les refs.

  // Calculate progress
  const totalTime = getCurrentTotalTime();
  const progress = totalTime > 0 ? ((totalTime - timeRemaining) / totalTime) * 100 : 0;

  // Get status color by phase
  // Vert = Travail, Rouge = Repos, Orange = Preparation, Bleu = Termine
  const getStatusColor = () => {
    if (timerState === 'finished') return '#3B82F6'; // BLEU - Termine/Cooldown

    // Phase de repos
    if (mode === 'combat' && isInRest) {
      // Preparation pour le prochain round (derniers 10s du repos)
      if (timeRemaining <= 10) return '#F97316'; // ORANGE - Prepare-toi
      return '#EF4444'; // ROUGE - Repos
    }
    if (mode === 'tabata' && (tabataIsRestBetweenSets || !tabataIsWork)) {
      if (timeRemaining <= 3) return '#F97316'; // ORANGE - Prepare-toi
      return '#EF4444'; // ROUGE - Repos
    }

    // Phase de travail
    if (mode === 'combat' && !isInRest) {
      // Fin du round approche
      if (timeRemaining <= 10) return '#F97316'; // ORANGE - Fin proche
      return '#10B981'; // VERT - Travail
    }
    if (mode === 'tabata' && tabataIsWork) {
      if (timeRemaining <= 5) return '#F97316'; // ORANGE - Fin proche
      return '#10B981'; // VERT - Travail
    }
    if (mode === 'musculation') {
      // Repos muscu - presque fini
      if (timeRemaining <= 10) return '#F97316'; // ORANGE - Prepare-toi
      return '#EF4444'; // ROUGE - Repos
    }
    if (mode === 'emom') {
      if (timeRemaining <= 5) return '#F97316'; // ORANGE - Fin du round
      return '#10B981'; // VERT - Travail
    }

    return colors.accent; // Par defaut
  };

  const statusColor = getStatusColor();

  // Change mode
  const changeMode = (newMode: TimerMode) => {
    if (timerState !== 'idle') return;
    setMode(newMode);

    switch (newMode) {
      case 'musculation':
        setTimeRemaining(musculationRest);
        break;
      case 'combat':
        setTimeRemaining(roundDuration);
        break;
      case 'tabata':
        setTimeRemaining(tabataWork);
        break;
      case 'emom':
        setTimeRemaining(60);
        break;
      case 'amrap':
        setTimeRemaining(amrapDuration);
        setAmrapRoundsCompleted(0);
        break;
      case 'fortime':
        setTimeRemaining(0);
        setForTimeElapsed(0);
        break;
    }

    triggerHaptic('light');
  };

  // Render mode tabs
  const renderModeTabs = () => (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.modeTabsScroll}
      contentContainerStyle={styles.modeTabsContent}
    >
      {[
        { id: 'musculation' as TimerMode, icon: Dumbbell, label: t('timer.modeMuscu') },
        { id: 'combat' as TimerMode, icon: Swords, label: t('timer.modeCombat') },
        { id: 'tabata' as TimerMode, icon: Zap, label: t('timer.modeTabata') },
        { id: 'emom' as TimerMode, icon: RefreshCw, label: t('timer.modeEMOM') },
        { id: 'amrap' as TimerMode, icon: Timer, label: t('timer.modeAMRAP') },
        { id: 'fortime' as TimerMode, icon: Timer, label: t('timer.modeForTime') },
      ].map(({ id, icon: Icon, label }) => (
        <TouchableOpacity
          key={id}
          style={[
            styles.modeTab,
            { backgroundColor: colors.backgroundCard, borderColor: colors.border },
            mode === id && { backgroundColor: colors.accent, borderColor: colors.accent },
          ]}
          onPress={() => changeMode(id)}
          disabled={timerState !== 'idle'}
        >
          <Icon size={22} color={mode === id ? colors.textOnGold : colors.textMuted} />
          <Text style={[
            styles.modeTabLabel,
            { color: colors.textMuted },
            mode === id && { color: colors.textOnGold },
          ]}>
            {label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Render settings based on mode
  const renderSettings = () => {
    if (timerState !== 'idle') return null;

    switch (mode) {
      case 'musculation':
        return (
          <View style={[styles.settingsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>{t('timer.restTime')}</Text>

            {/* Presets */}
            <View style={styles.presetsGrid}>
              {MUSCULATION_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.seconds}
                  style={[
                    styles.presetButton,
                    { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
                    musculationRest === preset.seconds && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => {
                    setMusculationRest(preset.seconds);
                    setTimeRemaining(preset.seconds);
                    triggerHaptic('light');
                  }}
                >
                  <Text style={[
                    styles.presetLabel,
                    { color: colors.textPrimary },
                    musculationRest === preset.seconds && { color: colors.textOnGold },
                  ]}>
                    {preset.label}
                  </Text>
                  <Text style={[
                    styles.presetDesc,
                    { color: colors.textMuted },
                    musculationRest === preset.seconds && { color: colors.textOnGold },
                  ]}>
                    {preset.description}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Custom */}
            <View style={styles.customRow}>
              <Text style={[styles.customLabel, { color: colors.textSecondary }]}>{t('timer.custom')}</Text>
              <View style={styles.customControls}>
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                  onPress={() => {
                    const newVal = Math.max(10, musculationRest - 15);
                    setMusculationRest(newVal);
                    setTimeRemaining(newVal);
                  }}
                >
                  <Minus size={18} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.customValue, { color: colors.textPrimary }]}>
                  {formatTime(musculationRest)}
                </Text>
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                  onPress={() => {
                    const newVal = Math.min(600, musculationRest + 15);
                    setMusculationRest(newVal);
                    setTimeRemaining(newVal);
                  }}
                >
                  <Plus size={18} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );

      case 'combat':
        return (
          <View style={[styles.settingsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            {/* Combat presets */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.combatPresetsScroll}
              contentContainerStyle={styles.combatPresetsContent}
            >
              {(Object.keys(COMBAT_PRESETS) as CombatPreset[]).map((key) => {
                const preset = COMBAT_PRESETS[key];
                const isSelected = combatPreset === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.combatPresetCard,
                      { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
                      isSelected && { backgroundColor: colors.accent, borderColor: colors.accent },
                    ]}
                    onPress={() => applyCombatPreset(key)}
                  >
                    {preset.icon
                      ? React.createElement(preset.icon, { size: 24, color: isSelected ? colors.textOnGold ?? '#fff' : colors.textPrimary })
                      : <View style={{ height: 24, marginBottom: SPACING.xs }} />
                    }
                    <Text style={[
                      styles.combatPresetName,
                      { color: colors.textPrimary },
                      isSelected && { color: colors.textOnGold },
                    ]}>
                      {preset.name}
                    </Text>
                    <Text style={[
                      styles.combatPresetInfo,
                      { color: colors.textMuted },
                      isSelected && { color: colors.textOnGold },
                    ]}>
                      {preset.rounds}x{preset.roundTime / 60}min
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Réglages personnalisables - disponibles pour tous les presets */}
            <View style={styles.customSettings}>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{t('timer.roundDuration')}</Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => {
                      setRoundDuration(d => Math.max(60, d - 30));
                      if (timerState === 'idle') {
                        setTimeRemaining(Math.max(60, roundDuration - 30));
                      }
                    }}
                  >
                    <Minus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{formatTime(roundDuration)}</Text>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => {
                      setRoundDuration(d => Math.min(600, d + 30));
                      if (timerState === 'idle') {
                        setTimeRemaining(Math.min(600, roundDuration + 30));
                      }
                    }}
                  >
                    <Plus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{t('timer.rounds')}</Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setTotalRounds(r => Math.max(1, r - 1))}
                  >
                    <Minus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{totalRounds}</Text>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setTotalRounds(r => Math.min(12, r + 1))}
                  >
                    <Plus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{t('timer.rest')}</Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setRestDuration(d => Math.max(15, d - 15))}
                  >
                    <Minus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{formatTime(restDuration)}</Text>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setRestDuration(d => Math.min(180, d + 15))}
                  >
                    <Plus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        );

      case 'tabata':
        return (
          <View style={[styles.settingsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>{t('timer.modeTabata')}</Text>
            <Text style={[styles.settingsSubtitle, { color: colors.textMuted }]}>
              {t('timer.tabataSubtitle').replace('{{work}}', String(tabataWork)).replace('{{rest}}', String(tabataRest))}
            </Text>

            <View style={styles.tabataPresetsRow}>
              {TABATA_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.label}
                  style={[
                    styles.tabataPreset,
                    { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
                    tabataRounds === preset.rounds && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => {
                    setTabataRounds(preset.rounds);
                    setTabataWork(preset.work);
                    setTabataRest(preset.rest);
                    setTimeRemaining(preset.work);
                    triggerHaptic('light');
                  }}
                >
                  <Text style={[
                    styles.tabataPresetLabel,
                    { color: colors.textPrimary },
                    tabataRounds === preset.rounds && { color: colors.textOnGold },
                  ]}>
                    {preset.label}
                  </Text>
                  <Text style={[
                    styles.tabataPresetRounds,
                    { color: colors.textMuted },
                    tabataRounds === preset.rounds && { color: colors.textOnGold },
                  ]}>
                    {t('timer.tabataRoundsLabel').replace('{{n}}', String(preset.rounds))}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Configuration personnalisée */}
            <View style={[styles.customSettings, { marginTop: SPACING.lg }]}>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{t('timer.work')}</Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setTabataWork(w => Math.max(10, w - 5))}
                  >
                    <Minus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{tabataWork}s</Text>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setTabataWork(w => Math.min(60, w + 5))}
                  >
                    <Plus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{t('timer.restS')}</Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setTabataRest(r => Math.max(5, r - 5))}
                  >
                    <Minus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{tabataRest}s</Text>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setTabataRest(r => Math.min(60, r + 5))}
                  >
                    <Plus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{t('timer.rounds')}</Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setTabataRounds(r => Math.max(1, r - 1))}
                  >
                    <Minus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{tabataRounds}</Text>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setTabataRounds(r => Math.min(30, r + 1))}
                  >
                    <Plus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{t('timer.sets')}</Text>
                <View style={styles.settingControls}>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setTabataSets(s => Math.max(1, s - 1))}
                  >
                    <Minus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                  <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{tabataSets}</Text>
                  <TouchableOpacity
                    style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                    onPress={() => setTabataSets(s => Math.min(5, s + 1))}
                  >
                    <Plus size={16} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>

              {tabataSets > 1 && (
                <View style={styles.settingRow}>
                  <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{t('timer.restBetweenSets')}</Text>
                  <View style={styles.settingControls}>
                    <TouchableOpacity
                      style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                      onPress={() => setTabataRestBetweenSets(r => Math.max(15, r - 15))}
                    >
                      <Minus size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{formatTime(tabataRestBetweenSets)}</Text>
                    <TouchableOpacity
                      style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                      onPress={() => setTabataRestBetweenSets(r => Math.min(180, r + 15))}
                    >
                      <Plus size={16} color={colors.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              <Text style={[styles.totalDuration, { color: colors.textMuted, marginTop: SPACING.md }]}>
                {t('timer.totalDurationLabel').replace('{{time}}', formatTime((tabataWork + tabataRest) * tabataRounds * tabataSets + (tabataSets > 1 ? tabataRestBetweenSets * (tabataSets - 1) : 0)))}
              </Text>
            </View>
          </View>
        );

      case 'emom':
        return (
          <View style={[styles.settingsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>{t('timer.modeEMOM')}</Text>
            <Text style={[styles.settingsSubtitle, { color: colors.textMuted }]}>
              {t('timer.emomSubtitle')}
            </Text>

            <View style={styles.emomPresetsRow}>
              {EMOM_PRESETS.map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.emomPreset,
                    { backgroundColor: colors.backgroundElevated, borderColor: colors.border },
                    emomDuration === minutes && { backgroundColor: colors.accent, borderColor: colors.accent },
                  ]}
                  onPress={() => {
                    setEmomDuration(minutes);
                    triggerHaptic('light');
                  }}
                >
                  <Text style={[
                    styles.emomPresetLabel,
                    { color: colors.textPrimary },
                    emomDuration === minutes && { color: colors.textOnGold },
                  ]}>
                    {minutes} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Liste d'exercices */}
            {emomExercises.length > 0 && (
              <View style={[styles.exercisesListContainer, { marginTop: SPACING.lg }]}>
                <Text style={[styles.exercisesListTitle, { color: colors.textSecondary }]}>
                  {t('timer.exercises')}
                </Text>
                {emomExercises.map((exercise, index) => (
                  <View key={index} style={[styles.exerciseItem, { backgroundColor: colors.backgroundElevated }]}>
                    <Text style={[styles.exerciseText, { color: colors.textPrimary }]}>
                      • {exercise}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'amrap':
        return (
          <View style={[styles.settingsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>{t('timer.modeAMRAP')}</Text>
            <Text style={[styles.settingsSubtitle, { color: colors.textMuted }]}>
              {t('timer.amrapSubtitle')}
            </Text>

            {/* Durée */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{t('timer.duration')}</Text>
              <View style={styles.settingControls}>
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                  onPress={() => setAmrapDuration(d => Math.max(60, d - 60))}
                >
                  <Minus size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{formatTime(amrapDuration)}</Text>
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                  onPress={() => setAmrapDuration(d => Math.min(3600, d + 60))}
                >
                  <Plus size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Circuit d'exercices */}
            {amrapExercises.length > 0 && (
              <View style={[styles.exercisesListContainer, { marginTop: SPACING.lg }]}>
                <Text style={[styles.exercisesListTitle, { color: colors.textSecondary }]}>
                  {t('timer.circuit')}
                </Text>
                {amrapExercises.map((exercise, index) => (
                  <View key={index} style={[styles.exerciseItem, { backgroundColor: colors.backgroundElevated }]}>
                    <Text style={[styles.exerciseText, { color: colors.textPrimary }]}>
                      {index + 1}. {exercise}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'fortime':
        return (
          <View style={[styles.settingsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>{t('timer.fortimeTitle')}</Text>
            <Text style={[styles.settingsSubtitle, { color: colors.textMuted }]}>
              {t('timer.forTimeDesc')}
            </Text>

            {/* Time cap */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>{t('timer.timeCap')}</Text>
              <View style={styles.settingControls}>
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                  onPress={() => setForTimeCap(d => Math.max(60, d - 60))}
                >
                  <Minus size={16} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={[styles.settingValue, { color: colors.textPrimary }]}>{formatTime(forTimeCap)}</Text>
                <TouchableOpacity
                  style={[styles.controlBtn, { backgroundColor: colors.backgroundElevated }]}
                  onPress={() => setForTimeCap(d => Math.min(3600, d + 60))}
                >
                  <Plus size={16} color={colors.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Exercices */}
            {forTimeExercises.length > 0 && (
              <View style={[styles.exercisesListContainer, { marginTop: SPACING.lg }]}>
                <Text style={[styles.exercisesListTitle, { color: colors.textSecondary }]}>
                  {t('timer.fortimeWorkout')}
                </Text>
                {forTimeExercises.map((exercise, index) => (
                  <View key={index} style={[styles.exerciseItem, { backgroundColor: colors.backgroundElevated }]}>
                    <Text style={[styles.exerciseText, { color: colors.textPrimary }]}>
                      {exercise}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        );
    }
  };

  // Get current status text
  const getStatusText = () => {
    if (timerState === 'finished') return t('timer.statusFinished');

    switch (mode) {
      case 'musculation':
        return t('timer.statusRest');
      case 'combat':
        return isInRest ? t('timer.statusRest') : t('timer.statusRound').replace('{{current}}', String(currentRound)).replace('{{total}}', String(totalRounds));
      case 'tabata':
        if (tabataIsRestBetweenSets) {
          return t('timer.statusRestBetweenSets').replace('{{current}}', String(tabataCurrentSet)).replace('{{total}}', String(tabataSets));
        }
        const setInfo = tabataSets > 1 ? ` - SET ${tabataCurrentSet}/${tabataSets}` : '';
        return tabataIsWork
          ? t('timer.statusWork').replace('{{current}}', String(tabataCurrentRound)).replace('{{total}}', String(tabataRounds)) + setInfo
          : t('timer.statusRestTabata').replace('{{current}}', String(tabataCurrentRound)).replace('{{total}}', String(tabataRounds)) + setInfo;
      case 'emom':
        const currentExercise = emomExercises.length > 0 ? emomExercises[(emomCurrentMinute - 1) % emomExercises.length] : '';
        return currentExercise || t('timer.statusMinute').replace('{{current}}', String(emomCurrentMinute)).replace('{{total}}', String(emomDuration));
      case 'amrap':
        return t('timer.statusRounds').replace('{{n}}', String(amrapRoundsCompleted));
      case 'fortime':
        return timerState === 'idle' ? t('timer.statusReady') : t('timer.statusInProgress');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: isRoninMode ? RONIN_THEME.background : colors.background, paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: isRoninMode ? RONIN_THEME.secondary : colors.backgroundCard }]}
        >
          <ChevronLeft size={24} color={isRoninMode ? RONIN_THEME.text : colors.textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: isRoninMode ? RONIN_THEME.text : colors.textPrimary }]}>
          {isRoninMode ? t('timer.roninMode') : t('timer.title')}
        </Text>
        <TouchableOpacity
          onPress={async () => {
            const newState = await roninModeService.toggle();
            setIsRoninMode(newState);
            triggerHaptic('medium');
          }}
          style={[
            styles.roninButton,
            {
              backgroundColor: isRoninMode ? RONIN_THEME.primary : colors.backgroundCard,
            }
          ]}
        >
          {isRoninMode ? (
            <Swords size={20} color="#FFFFFF" />
          ) : (
            <Target size={20} color={colors.textMuted} />
          )}
        </TouchableOpacity>
      </View>

      {/* Mode Tabs - masqué en mode Ronin */}
      {!isRoninMode && renderModeTabs()}

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Timer Display */}
        {/* ── Timer : cercle à gauche, boutons à droite ── */}
        <View style={styles.timerContainer}>

          {/* Cercle compact */}
          <View style={styles.progressRing}>
            <Svg width={220} height={220} style={styles.svgRing}>
              <Circle
                cx={110}
                cy={110}
                r={95}
                stroke={`${statusColor}28`}
                strokeWidth={15}
                fill="transparent"
              />
              <Circle
                cx={110}
                cy={110}
                r={95}
                stroke={statusColor}
                strokeWidth={15}
                fill="transparent"
                strokeDasharray={2 * Math.PI * 95}
                strokeDashoffset={2 * Math.PI * 95 * (1 - progress / 100)}
                strokeLinecap="round"
                transform="rotate(-90 110 110)"
              />
            </Svg>

            <View style={styles.timeDisplay}>
              <Text style={[
                styles.timeText,
                { color: statusColor },
                isRoninMode && {
                  fontSize: RONIN_THEME.timer.fontSize,
                  fontWeight: RONIN_THEME.timer.fontWeight as any,
                  color: RONIN_THEME.timer.color,
                }
              ]}>
                {formatTime(timeRemaining)}
              </Text>

              {mode === 'combat' ? (
                <View style={styles.fractionDisplay}>
                  <Text style={[styles.statusText, { color: statusColor }]}>
                    {isInRest ? t('timer.combatRest') : `R${currentRound}/${totalRounds}`}
                  </Text>
                  <View style={[styles.fractionLine, { backgroundColor: statusColor }]} />
                  <Text style={[styles.fractionBottom, { color: colors.textMuted }]}>
                    {isInRest ? t('timer.combatNextRound').replace('{{n}}', String(currentRound + 1)) : `${t('timer.rest')}: ${formatTime(restDuration)}`}
                  </Text>
                </View>
              ) : (
                <Text style={[
                  styles.statusText,
                  { color: statusColor },
                  isRoninMode && {
                    fontSize: RONIN_THEME.phase.fontSize,
                    fontWeight: RONIN_THEME.phase.fontWeight as any,
                    letterSpacing: RONIN_THEME.phase.letterSpacing,
                    color: RONIN_THEME.phase.color,
                  }
                ]}>
                  {getStatusText()}
                </Text>
              )}

              {timeRemaining <= 10 && timerState === 'running' && (
                <Text style={[styles.warningText, { color: '#EF4444' }]}>{t('timer.goAlert')}</Text>
              )}
            </View>
          </View>

          {/* Boutons à droite du cercle */}
          <View style={styles.timerBtnsCol}>
            {/* Bouton principal : Play / Pause */}
            {timerState === 'idle' && (
              <TouchableOpacity
                style={[styles.timerBtnMain, { backgroundColor: statusColor }]}
                onPress={startTimer}
                activeOpacity={0.78}
              >
                <Play size={32} color="#fff" fill="#fff" />
              </TouchableOpacity>
            )}
            {timerState === 'running' && (
              <TouchableOpacity
                style={[styles.timerBtnMain, { backgroundColor: '#3B82F6' }]}
                onPress={pauseTimer}
                activeOpacity={0.78}
              >
                <Pause size={28} color="#fff" fill="#fff" />
              </TouchableOpacity>
            )}
            {timerState === 'paused' && (
              <TouchableOpacity
                style={[styles.timerBtnMain, { backgroundColor: statusColor }]}
                onPress={resumeTimer}
                activeOpacity={0.78}
              >
                <Play size={32} color="#fff" fill="#fff" />
              </TouchableOpacity>
            )}

            {/* Bouton Stop · secondaire, visible seulement si actif */}
            {timerState !== 'idle' && (
              <TouchableOpacity
                style={styles.timerBtnStop}
                onPress={resetTimer}
                activeOpacity={0.78}
              >
                <Square size={20} color="#fff" fill="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* AMRAP Round Counter */}
        {mode === 'amrap' && timerState === 'running' && (
          <View style={[styles.amrapCounter, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.amrapLabel, { color: colors.textMuted }]}>{t('timer.roundsCompleted')}</Text>
            <Text style={[styles.amrapCount, { color: isDark ? colors.accent : '#000000', fontWeight: '800' }]}>{amrapRoundsCompleted}</Text>
            <TouchableOpacity
              style={[styles.amrapButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                setAmrapRoundsCompleted(r => r + 1);
                soundManager.playBeep();
                triggerHaptic('medium');
              }}
            >
              <Text style={[styles.amrapButtonText, { color: colors.textOnGold }]}>{t('timer.roundCompleted')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* FOR TIME - Finish Button */}
        {mode === 'fortime' && timerState === 'running' && (
          <View style={[styles.forTimeFinish, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.forTimeLabel, { color: colors.textMuted }]}>{t('timer.pressWhenDone')}</Text>
            <TouchableOpacity
              style={[styles.forTimeButton, { backgroundColor: '#10B981' }]}
              onPress={async () => {
                setTimerState('finished');
                soundManager.playVictory();
                triggerHaptic('heavy');
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Flag size={16} color="#FFFFFF" />
                <Text style={styles.forTimeButtonText}>FINISHED !</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Series Counter (Musculation only) */}
        {mode === 'musculation' && (
          <View style={[styles.seriesCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.seriesLabel, { color: colors.textMuted }]}>{t('timer.seriesCompleted')}</Text>
            <Text style={[styles.seriesCount, { color: isDark ? colors.accent : '#000000', fontWeight: '800' }]}>{seriesCount}</Text>

            {seriesHistory.length > 0 && (
              <View style={styles.seriesHistoryContainer}>
                {seriesHistory.slice(-5).reverse().map((serie, index) => (
                  <View key={index} style={[styles.seriesHistoryItem, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.seriesHistoryNumber, { color: colors.textPrimary }]}>
                        {t('timer.serie').replace('{{n}}', String(serie.seriesNumber))}
                      </Text>
                      {(serie.reps || serie.weight) && (
                        <Text style={[styles.seriesHistoryReps, { color: isDark ? colors.accent : '#000000', fontWeight: '600' }]}>
                          {serie.reps} reps × {serie.weight}kg
                        </Text>
                      )}
                    </View>
                    <Text style={[styles.seriesHistoryTime, { color: colors.textMuted }]}>
                      {serie.timestamp.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                    </Text>
                    <Text style={[styles.seriesHistoryRest, { color: colors.textMuted }]}>
                      {t('timer.rest_short').replace('{{time}}', formatTime(serie.restDuration))}
                    </Text>
                  </View>
                ))}
                {seriesHistory.length > 5 && (
                  <Text style={[styles.seriesHistoryMore, { color: colors.textMuted }]}>
                    {t('timer.more').replace('{{n}}', String(seriesHistory.length - 5))}
                  </Text>
                )}
              </View>
            )}

            {/* Toggle tracking reps/weight */}
            <TouchableOpacity
              style={[styles.trackToggle, { backgroundColor: trackRepsWeight ? colors.accent : colors.backgroundElevated }]}
              onPress={() => {
                setTrackRepsWeight(!trackRepsWeight);
                triggerHaptic('light');
              }}
            >
              <Text style={[styles.trackToggleText, { color: trackRepsWeight ? colors.textOnGold : colors.textMuted }]}>
                {trackRepsWeight ? t('timer.trackRepsWeightActive') : t('timer.trackRepsWeight')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetSeriesCount}>
              <Text style={[styles.seriesReset, { color: colors.textMuted }]}>{t('timer.reinitialize')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings - masqué en mode Ronin */}
        {!isRoninMode && renderSettings()}

        {/* Control Buttons */}
        <View style={styles.controlsContainer}>
          {timerState === 'idle' && (
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: colors.accent }]}
              onPress={startTimer}
            >
              <Play size={28} color={colors.textOnGold} fill={colors.textOnGold} />
              <Text style={[styles.mainBtnText, { color: colors.textOnGold }]}>
                {mode === 'musculation' ? t('timer.serieFinished') : t('timer.start')}
              </Text>
            </TouchableOpacity>
          )}

          {timerState === 'running' && (
            <View style={styles.runningControls}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.backgroundCard }]}
                onPress={resetTimer}
              >
                <Square size={24} color="#EF4444" fill="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mainBtn, { backgroundColor: '#F97316' }]}
                onPress={pauseTimer}
              >
                <Pause size={28} color="#FFF" fill="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.backgroundCard }]}
                onPress={skipRound}
              >
                <SkipForward size={24} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}

          {timerState === 'paused' && (
            <View style={styles.runningControls}>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.backgroundCard }]}
                onPress={resetTimer}
              >
                <Square size={24} color="#EF4444" fill="#EF4444" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.mainBtn, { backgroundColor: '#10B981' }]}
                onPress={resumeTimer}
              >
                <Play size={28} color="#FFF" fill="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.secondaryBtn, { backgroundColor: colors.backgroundCard }]}
                onPress={skipRound}
              >
                <SkipForward size={24} color={colors.accent} />
              </TouchableOpacity>
            </View>
          )}

          {timerState === 'finished' && (
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: colors.accent }]}
              onPress={mode === 'musculation' ? startTimer : resetTimer}
            >
              {mode === 'musculation' ? (
                <>
                  <Play size={28} color={colors.textOnGold} fill={colors.textOnGold} />
                  <Text style={[styles.mainBtnText, { color: colors.textOnGold }]}>{t('timer.nextSerie')}</Text>
                </>
              ) : (
                <>
                  <RotateCcw size={24} color={colors.textOnGold} />
                  <Text style={[styles.mainBtnText, { color: colors.textOnGold }]}>{t('timer.restart')}</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Reps/Weight Modal */}
      <RepsWeightModal
        visible={showRepsWeightModal}
        seriesNumber={seriesCount}
        onClose={() => setShowRepsWeightModal(false)}
        onSave={handleSaveRepsWeight}
        onSkip={handleSkipRepsWeight}
      />

      {/* Workout Summary Modal */}
      <WorkoutSummaryModal
        visible={showSummaryModal}
        mode={mode}
        stats={getWorkoutStats()}
        onClose={() => setShowSummaryModal(false)}
        onSave={handleSaveWorkout}
        onRestart={handleRestartWorkout}
      />

      <RPEModal
        visible={showRPEModal}
        durationMinutes={getWorkoutDurationMinutes()}
        onClose={handleRPESkip}
        onSubmit={handleRPESubmit}
      />

      {/* Timer Alarm Overlay - Full Screen Alert */}
      <TimerAlarmOverlay
        visible={showAlarmOverlay}
        onDismiss={handleDismissAlarm}
        message={mode === 'musculation' ? t('timer.restEnded') : t('timer.timerEnded')}
        subMessage={mode === 'musculation' ? t('timer.nextSerieMsg') : t('timer.excellentWork')}
      />
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FONT.size.xl,
    fontWeight: '700',
    letterSpacing: 1,
  },
  roninButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roninButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xxl,
  },

  // Mode Tabs
  modeTabsScroll: {
    maxHeight: 80,
    marginBottom: SPACING.lg,
  },
  modeTabsContent: {
    paddingHorizontal: SPACING.lg,
    gap: SPACING.sm,
  },
  modeTab: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
    minWidth: 80,
  },
  modeTabEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  modeTabLabel: {
    fontSize: FONT.size.xs,
    fontWeight: '600',
  },

  // Timer · layout horizontal : cercle + boutons côte à côte
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    marginTop: SPACING.md,
    gap: 28,
  },
  progressRing: {
    width: 220,
    height: 220,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgRing: {
    position: 'absolute',
  },
  timeDisplay: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    fontSize: 66,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 1,
  },
  // Colonne de boutons à droite du cercle
  timerBtnsCol: {
    alignItems: 'center',
    gap: 14,
  },
  timerBtnMain: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.22,
    shadowRadius: 10,
    elevation: 6,
  },
  timerBtnStop: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.30,
    shadowRadius: 6,
    elevation: 4,
  },
  statusText: {
    fontSize: 24,
    fontWeight: '700',
    marginTop: SPACING.md,
    letterSpacing: 8,
    textTransform: 'uppercase',
  },
  fractionDisplay: {
    alignItems: 'center',
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  fractionLine: {
    width: 120,
    height: 2,
    borderRadius: 1,
  },
  fractionBottom: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  warningText: {
    fontSize: FONT.size.md,
    fontWeight: '700',
    marginTop: SPACING.sm,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // AMRAP Counter
  amrapCounter: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  amrapLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  amrapCount: {
    fontSize: 56,
    fontWeight: '900',
    marginVertical: SPACING.md,
  },
  amrapButton: {
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.full,
  },
  amrapButtonText: {
    fontSize: FONT.size.md,
    fontWeight: '700',
    // color dynamically set inline
  },

  // FOR TIME Finish
  forTimeFinish: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  forTimeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: SPACING.md,
  },
  forTimeButton: {
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.full,
  },
  forTimeButtonText: {
    fontSize: FONT.size.lg,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  // Series Card
  seriesCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    alignItems: 'center',
    marginBottom: SPACING.lg,
    borderWidth: 1,
  },
  seriesLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
  seriesCount: {
    fontSize: 48,
    fontWeight: '900',
    marginVertical: SPACING.sm,
  },
  seriesReset: {
    fontSize: FONT.size.sm,
    fontWeight: '600',
  },
  trackToggle: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: RADIUS.full,
    marginVertical: SPACING.md,
  },
  trackToggleText: {
    fontSize: FONT.size.sm,
    fontWeight: '600',
    textAlign: 'center',
  },
  seriesHistoryContainer: {
    width: '100%',
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  seriesHistoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
  },
  seriesHistoryNumber: {
    fontSize: FONT.size.sm,
    fontWeight: '600',
  },
  seriesHistoryReps: {
    fontSize: FONT.size.xs,
    marginTop: 2,
    fontWeight: '600',
  },
  seriesHistoryTime: {
    fontSize: FONT.size.xs,
    marginRight: SPACING.sm,
  },
  seriesHistoryRest: {
    fontSize: FONT.size.xs,
  },
  seriesHistoryMore: {
    fontSize: FONT.size.xs,
    textAlign: 'center',
    marginTop: SPACING.xs,
    fontStyle: 'italic',
  },

  // Settings Card
  settingsCard: {
    padding: SPACING.lg,
    borderRadius: RADIUS.xl,
    marginBottom: SPACING.xl,
    borderWidth: 1,
  },
  settingsTitle: {
    fontSize: FONT.size.lg,
    fontWeight: '700',
    marginBottom: SPACING.xs,
  },
  settingsSubtitle: {
    fontSize: FONT.size.sm,
    marginBottom: SPACING.md,
  },

  // Musculation Presets
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginBottom: SPACING.lg,
  },
  presetButton: {
    width: '31%',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  presetLabel: {
    fontSize: FONT.size.md,
    fontWeight: '700',
  },
  presetDesc: {
    fontSize: FONT.size.xs,
    marginTop: 2,
  },

  // Custom Row
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  customLabel: {
    fontSize: FONT.size.md,
    fontWeight: '500',
  },
  customControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customValue: {
    fontSize: FONT.size.xl,
    fontWeight: '700',
    minWidth: 70,
    textAlign: 'center',
  },

  // Combat Presets
  combatPresetsScroll: {
    marginBottom: SPACING.lg,
  },
  combatPresetsContent: {
    gap: SPACING.sm,
  },
  combatPresetCard: {
    width: 90,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  combatPresetIcon: {
    fontSize: 24,
    marginBottom: SPACING.xs,
  },
  combatPresetName: {
    fontSize: FONT.size.sm,
    fontWeight: '700',
  },
  combatPresetInfo: {
    fontSize: FONT.size.xs,
    marginTop: 2,
  },

  // Custom Settings
  customSettings: {
    gap: SPACING.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingLabel: {
    fontSize: FONT.size.md,
    fontWeight: '500',
  },
  settingControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
  },
  settingValue: {
    fontSize: FONT.size.lg,
    fontWeight: '700',
    minWidth: 60,
    textAlign: 'center',
  },

  // Tabata Presets
  tabataPresetsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  tabataPreset: {
    flex: 1,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  tabataPresetLabel: {
    fontSize: FONT.size.md,
    fontWeight: '700',
  },
  tabataPresetRounds: {
    fontSize: FONT.size.xs,
    marginTop: 2,
  },

  // EMOM Presets
  emomPresetsRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  emomPreset: {
    flex: 1,
    paddingVertical: SPACING.lg,
    borderRadius: RADIUS.lg,
    alignItems: 'center',
    borderWidth: 1,
  },
  emomPresetLabel: {
    fontSize: FONT.size.md,
    fontWeight: '700',
  },

  // Exercises list
  exercisesListContainer: {
    gap: SPACING.sm,
  },
  exercisesListTitle: {
    fontSize: FONT.size.sm,
    fontWeight: '600',
    marginBottom: SPACING.sm,
  },
  exerciseItem: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: RADIUS.md,
  },
  exerciseText: {
    fontSize: FONT.size.sm,
    fontWeight: '500',
  },

  // Total duration
  totalDuration: {
    fontSize: FONT.size.sm,
    textAlign: 'center',
    fontWeight: '600',
  },

  // Controls
  controlsContainer: {
    alignItems: 'center',
  },
  mainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.lg,
    paddingHorizontal: SPACING.xxl,
    borderRadius: RADIUS.full,
    minWidth: 220,
  },
  mainBtnText: {
    fontSize: FONT.size.lg,
    fontWeight: '700',
  },
  runningControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xl,
  },
  secondaryBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
