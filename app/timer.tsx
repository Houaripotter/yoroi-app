import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Platform,
  ScrollView,
  Dimensions,
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
  Settings,
  SkipForward,
  Target,
} from 'lucide-react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/lib/ThemeContext';
import { COLORS, SPACING, RADIUS, FONT, SHADOWS } from '@/constants/appTheme';
import { soundManager } from '@/lib/sounds';
import { RepsWeightModal } from '@/components/RepsWeightModal';
import { WorkoutSummaryModal } from '@/components/WorkoutSummaryModal';
import { RPEModal } from '@/components/RPEModal';
import { roninModeService, RONIN_THEME } from '@/lib/roninMode';
import { saveTrainingLoad } from '@/lib/trainingLoadService';
import { useLiveActivity } from '@/lib/hooks/useLiveActivity';
import logger from '@/lib/security/logger';

// ============================================
// MINUTEUR YOROI COMPLET
// ============================================
// Mode Musculation : repos entre series avec compteur
// Mode Combat : rounds avec repos (JJB, MMA, Boxe, etc.)
// Mode Tabata : HIIT 20/10
// Mode EMOM : Every Minute On the Minute

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  icon: string;
  roundTime: number;
  restTime: number;
  rounds: number;
  description: string;
}> = {
  jjb: {
    name: 'JJB',
    icon: '',
    roundTime: 5 * 60,
    restTime: 60,
    rounds: 5,
    description: 'Format IBJJF',
  },
  mma: {
    name: 'MMA',
    icon: '',
    roundTime: 5 * 60,
    restTime: 60,
    rounds: 3,
    description: 'Format UFC',
  },
  boxe: {
    name: 'Boxe',
    icon: '',
    roundTime: 3 * 60,
    restTime: 60,
    rounds: 10,
    description: 'Format Pro',
  },
  muaythai: {
    name: 'Muay Thai',
    icon: '🦵',
    roundTime: 3 * 60,
    restTime: 120,
    rounds: 5,
    description: 'Format Thai',
  },
  kickboxing: {
    name: 'Kickboxing',
    icon: '🦶',
    roundTime: 3 * 60,
    restTime: 60,
    rounds: 3,
    description: 'K-1 Style',
  },
  lutte: {
    name: 'Lutte',
    icon: '',
    roundTime: 3 * 60,
    restTime: 30,
    rounds: 3,
    description: 'Wrestling',
  },
  grappling: {
    name: 'Grappling',
    icon: '🤺',
    roundTime: 6 * 60,
    restTime: 60,
    rounds: 3,
    description: 'No-Gi',
  },
  custom: {
    name: 'Perso',
    icon: '⚙️',
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
  const [seriesHistory, setSeriesHistory] = useState<Array<{
    seriesNumber: number;
    timestamp: Date;
    restDuration: number;
    reps?: number;
    weight?: number;
  }>>([]);
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
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);

  // Refs
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialiser le SoundManager
  useEffect(() => {
    soundManager.initialize();

    return () => {
      soundManager.cleanup();
      deactivateKeepAwake();
    };
  }, []);

  // Desactiver keep-awake quand le timer se termine et afficher summary
  useEffect(() => {
    if (timerState === 'finished') {
      deactivateKeepAwake();
      // Arrêter la Live Activity
      if (isIslandAvailable) {
        stopActivity().catch(e => logger.error('LiveActivity Stop Error:', e));
      }
      // Afficher le summary après 1.5s (laisser le son victory jouer)
      setTimeout(() => {
        setShowSummaryModal(true);
      }, 1500);
    }
  }, [timerState, isIslandAvailable]);

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
        ? Haptics.ImpactFeedbackStyle.Light
        : type === 'heavy'
        ? Haptics.ImpactFeedbackStyle.Heavy
        : Haptics.ImpactFeedbackStyle.Medium;
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
          break;
      }
      setTimeRemaining(initialTime);

      // Jouer le son de debut - gong pour combat, beep pour le reste
      if (mode === 'combat') {
        await soundManager.playGong();
      } else {
        await soundManager.playBeep();
      }

      // Dynamic Island - Démarrer l'activité
      if (isIslandAvailable) {
        startActivity(mode.toUpperCase()).catch(e => logger.error('LiveActivity Error:', e));
      }
    }

    // Garder l'ecran allume pendant le timer
    await activateKeepAwakeAsync();

    setTimerState('running');
  };

  // Pause timer
  const pauseTimer = () => {
    triggerHaptic('light');
    deactivateKeepAwake();
    setTimerState('paused');
  };

  // Resume timer
  const resumeTimer = async () => {
    triggerHaptic('light');
    await activateKeepAwakeAsync();
    setTimerState('running');
  };

  // Reset timer
  const resetTimer = () => {
    triggerHaptic('medium');
    deactivateKeepAwake();
    setTimerState('idle');

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
            setTimeRemaining(roundDuration);
            await soundManager.playGong();
          } else {
            // C'etait le dernier repos
            setTimerState('finished');
            await soundManager.playVictory();
            setTimeRemaining(0);
          }
        } else {
          // Sauter le round actuel, aller au repos
          if (currentRound < totalRounds) {
            setIsInRest(true);
            setTimeRemaining(restDuration);
            await soundManager.playGong();
          } else {
            // C'etait le dernier round
            setTimerState('finished');
            await soundManager.playVictory();
            setTimeRemaining(0);
          }
        }
        break;

      case 'tabata':
        if (tabataIsWork) {
          // Sauter le travail, aller au repos
          setTabataIsWork(false);
          setTimeRemaining(tabataRest);
        } else {
          // Sauter le repos, aller au prochain round
          if (tabataCurrentRound < tabataRounds) {
            setTabataCurrentRound(r => r + 1);
            setTabataIsWork(true);
            setTimeRemaining(tabataWork);
          } else {
            setTimerState('finished');
            await soundManager.playVictory();
            setTimeRemaining(0);
          }
        }
        await soundManager.playBeep();
        break;

      case 'emom':
        // Sauter a la minute suivante
        if (emomCurrentMinute < emomDuration) {
          setEmomCurrentMinute(m => m + 1);
          setTimeRemaining(60);
          await soundManager.playBeep(); // Beep pour EMOM
        } else {
          setTimerState('finished');
          await soundManager.playVictory();
          setTimeRemaining(0);
        }
        break;

      case 'musculation':
        // Pour muscu, skip termine juste le repos
        setTimerState('finished');
        setTimeRemaining(0);
        await soundManager.playBeep(); // Beep pour muscu
        break;
    }
  };

  // Timer logic
  useEffect(() => {
    if (timerState === 'running') {
      intervalRef.current = setInterval(async () => {
        // FOR TIME compte vers le HAUT
        if (mode === 'fortime') {
          setTimeRemaining((prev) => {
            const newTime = prev + 1;
            setForTimeElapsed(newTime);

            // Vérifier le time cap
            if (newTime >= forTimeCap) {
              soundManager.playBeep(); // Beep pour FOR TIME
              triggerHaptic('heavy');
              Vibration.vibrate([0, 500, 200, 500]);
              setTimerState('finished');
              return newTime;
            }

            return newTime;
          });
          return;
        }

        // Tous les autres modes comptent vers le BAS
        setTimeRemaining((prev) => {
          // Countdown 3-2-1 vocal/sonore pour les 3 dernieres secondes
          if (prev === 4 || prev === 3 || prev === 2) {
            soundManager.playFinalCountdown(prev - 1);
            // Vibration forte pour 3-2-1
            triggerHaptic('heavy');
            Vibration.vibrate(300);
          }
          // Countdown sonore pour les 10 dernieres secondes (mais pas 3-2-1)
          else if (prev <= 11 && prev > 4) {
            soundManager.playCountdownTick(prev - 1);
            triggerHaptic('light');
          }

          if (prev <= 1) {
            // Temps ecoule - gong UNIQUEMENT pour combat, beep pour tout le reste
            if (mode === 'combat') {
              soundManager.playGong();
            } else {
              soundManager.playBeep();
            }
            triggerHaptic('heavy');
            Vibration.vibrate([0, 500, 200, 500]);

            // Logique selon le mode
            switch (mode) {
              case 'musculation':
                // Fin du repos - pret pour la prochaine serie
                setTimerState('finished');
                // Afficher modal si tracking activé
                if (trackRepsWeight) {
                  setShowRepsWeightModal(true);
                } else {
                  // Enregistrer la série dans l'historique sans reps/poids
                  setSeriesHistory(prev => [...prev, {
                    seriesNumber: seriesCount,
                    timestamp: new Date(),
                    restDuration: musculationRest,
                  }]);
                }
                return 0;

              case 'combat':
                if (isInRest) {
                  // Fin du repos, debut du prochain round
                  if (currentRound < totalRounds) {
                    setCurrentRound(r => r + 1);
                    setIsInRest(false);
                    return roundDuration;
                  } else {
                    setTimerState('finished');
                    soundManager.playVictory();
                    return 0;
                  }
                } else {
                  // Fin du round
                  if (currentRound < totalRounds) {
                    setIsInRest(true);
                    return restDuration;
                  } else {
                    setTimerState('finished');
                    soundManager.playVictory();
                    return 0;
                  }
                }

              case 'tabata':
                if (tabataIsRestBetweenSets) {
                  // Fin du repos entre sets, commencer le prochain set
                  setTabataCurrentSet(s => s + 1);
                  setTabataCurrentRound(1);
                  setTabataIsRestBetweenSets(false);
                  setTabataIsWork(true);
                  return tabataWork;
                } else if (tabataIsWork) {
                  // Fin du travail, debut du repos
                  setTabataIsWork(false);
                  return tabataRest;
                } else {
                  // Fin du repos
                  if (tabataCurrentRound < tabataRounds) {
                    // Prochain round dans ce set
                    setTabataCurrentRound(r => r + 1);
                    setTabataIsWork(true);
                    return tabataWork;
                  } else if (tabataCurrentSet < tabataSets) {
                    // Fin du set, debut du repos entre sets
                    setTabataIsRestBetweenSets(true);
                    return tabataRestBetweenSets;
                  } else {
                    // Tous les sets termines
                    setTimerState('finished');
                    soundManager.playVictory();
                    return 0;
                  }
                }

              case 'emom':
                if (emomCurrentMinute < emomDuration) {
                  setEmomCurrentMinute(m => m + 1);
                  return 60;
                } else {
                  setTimerState('finished');
                  soundManager.playVictory();
                  return 0;
                }

              case 'amrap':
                // AMRAP: compte à rebours jusqu'au time cap
                setTimerState('finished');
                soundManager.playVictory();
                return 0;

              // Note: 'fortime' est géré séparément plus haut (ligne 576)
              // car il compte vers le HAUT, pas vers le BAS
            }

            return 0;
          }

          return prev - 1;
        });
      }, 1000);
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
  }, [timerState, mode, isInRest, currentRound, totalRounds, roundDuration, restDuration,
      tabataIsWork, tabataCurrentRound, tabataRounds, tabataWork, tabataRest,
      emomCurrentMinute, emomDuration]);

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
        { id: 'musculation' as TimerMode, icon: Dumbbell, label: 'Muscu' },
        { id: 'combat' as TimerMode, icon: Swords, label: 'Combat' },
        { id: 'tabata' as TimerMode, icon: Zap, label: 'Tabata' },
        { id: 'emom' as TimerMode, icon: RefreshCw, label: 'EMOM' },
        { id: 'amrap' as TimerMode, icon: Timer, label: 'AMRAP' },
        { id: 'fortime' as TimerMode, icon: Timer, label: 'For Time' },
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
            <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>Temps de repos</Text>

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
              <Text style={[styles.customLabel, { color: colors.textSecondary }]}>Personnalise</Text>
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
                    <Text style={styles.combatPresetIcon}>{preset.icon}</Text>
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
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Durée round</Text>
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
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Rounds</Text>
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
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Repos</Text>
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
            <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>Tabata</Text>
            <Text style={[styles.settingsSubtitle, { color: colors.textMuted }]}>
              {tabataWork}s travail / {tabataRest}s repos
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
                    {preset.rounds} rounds
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Configuration personnalisée */}
            <View style={[styles.customSettings, { marginTop: SPACING.lg }]}>
              <View style={styles.settingRow}>
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Travail (s)</Text>
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
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Repos (s)</Text>
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
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Rounds</Text>
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
                <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Sets</Text>
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
                  <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Repos sets</Text>
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
                Durée totale: {formatTime((tabataWork + tabataRest) * tabataRounds * tabataSets + (tabataSets > 1 ? tabataRestBetweenSets * (tabataSets - 1) : 0))}
              </Text>
            </View>
          </View>
        );

      case 'emom':
        return (
          <View style={[styles.settingsCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>EMOM</Text>
            <Text style={[styles.settingsSubtitle, { color: colors.textMuted }]}>
              Every Minute On the Minute
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
                  Exercices (affichés chaque minute)
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
            <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>AMRAP</Text>
            <Text style={[styles.settingsSubtitle, { color: colors.textMuted }]}>
              As Many Rounds As Possible
            </Text>

            {/* Durée */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Durée</Text>
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
                  Circuit (répéter autant que possible)
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
            <Text style={[styles.settingsTitle, { color: colors.textPrimary }]}>FOR TIME</Text>
            <Text style={[styles.settingsSubtitle, { color: colors.textMuted }]}>
              Chronomètre qui monte - appuie sur Stop quand tu as fini
            </Text>

            {/* Time cap */}
            <View style={styles.settingRow}>
              <Text style={[styles.settingLabel, { color: colors.textSecondary }]}>Time Cap</Text>
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
                  Workout
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
    if (timerState === 'finished') return 'TERMINE !';

    switch (mode) {
      case 'musculation':
        return 'REPOS';
      case 'combat':
        return isInRest ? 'REPOS' : `ROUND ${currentRound}/${totalRounds}`;
      case 'tabata':
        if (tabataIsRestBetweenSets) {
          return `REPOS SET ${tabataCurrentSet}/${tabataSets}`;
        }
        const setInfo = tabataSets > 1 ? ` - SET ${tabataCurrentSet}/${tabataSets}` : '';
        return tabataIsWork
          ? `TRAVAIL ${tabataCurrentRound}/${tabataRounds}${setInfo}`
          : `REPOS ${tabataCurrentRound}/${tabataRounds}${setInfo}`;
      case 'emom':
        const currentExercise = emomExercises.length > 0 ? emomExercises[(emomCurrentMinute - 1) % emomExercises.length] : '';
        return currentExercise || `MINUTE ${emomCurrentMinute}/${emomDuration}`;
      case 'amrap':
        return `ROUNDS: ${amrapRoundsCompleted}`;
      case 'fortime':
        return timerState === 'idle' ? 'PRET' : 'EN COURS';
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
          {isRoninMode ? 'MODE RONIN' : 'Minuteur'}
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
        <View style={[
          styles.timerContainer,
          timerState !== 'idle' && {
            backgroundColor: `${statusColor}08`,
            borderRadius: RADIUS.xxl,
            padding: SPACING.xl,
          }
        ]}>
          <View style={styles.progressRing}>
            <Svg width={340} height={340} style={styles.svgRing}>
              <Circle
                cx={170}
                cy={170}
                r={155}
                stroke={`${statusColor}15`}
                strokeWidth={8}
                fill="transparent"
              />
              <Circle
                cx={170}
                cy={170}
                r={155}
                stroke={statusColor}
                strokeWidth={8}
                fill="transparent"
                strokeDasharray={2 * Math.PI * 155}
                strokeDashoffset={2 * Math.PI * 155 * (1 - progress / 100)}
                strokeLinecap="round"
                transform="rotate(-90 170 170)"
              />
            </Svg>

            <View style={styles.timeDisplay}>
              {/* Boutons play/stop inline avec le temps */}
              <View style={styles.inlineControls}>
                {/* Bouton Stop/Reset à gauche */}
                {timerState !== 'idle' && (
                  <TouchableOpacity
                    style={[styles.inlineControlBtn, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}
                    onPress={resetTimer}
                  >
                    <Square size={22} color="#EF4444" fill="#EF4444" />
                  </TouchableOpacity>
                )}
                {timerState === 'idle' && <View style={styles.inlineControlPlaceholder} />}

                {/* Temps au centre */}
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

                {/* Bouton Play/Pause à droite */}
                {timerState === 'idle' && (
                  <TouchableOpacity
                    style={[styles.inlineControlBtn, { backgroundColor: `${colors.accent}25` }]}
                    onPress={startTimer}
                  >
                    <Play size={22} color={colors.accent} fill={colors.accent} />
                  </TouchableOpacity>
                )}
                {timerState === 'running' && (
                  <TouchableOpacity
                    style={[styles.inlineControlBtn, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}
                    onPress={pauseTimer}
                  >
                    <Pause size={22} color="#FBBF24" fill="#FBBF24" />
                  </TouchableOpacity>
                )}
                {timerState === 'paused' && (
                  <TouchableOpacity
                    style={[styles.inlineControlBtn, { backgroundColor: `${colors.accent}25` }]}
                    onPress={resumeTimer}
                  >
                    <Play size={22} color={colors.accent} fill={colors.accent} />
                  </TouchableOpacity>
                )}
                {timerState === 'finished' && <View style={styles.inlineControlPlaceholder} />}
              </View>
              {/* Format fraction pour le mode combat */}
              {mode === 'combat' ? (
                <View style={styles.fractionDisplay}>
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
                    {isInRest ? 'REPOS' : `ROUND ${currentRound}/${totalRounds}`}
                  </Text>
                  <View style={[styles.fractionLine, { backgroundColor: statusColor }]} />
                  <Text style={[
                    styles.fractionBottom,
                    { color: colors.textMuted },
                    isRoninMode && { color: RONIN_THEME.text }
                  ]}>
                    {isInRest ? `Prochain round : ${currentRound + 1}/${totalRounds}` : `Temps de repos : ${formatTime(restDuration)}`}
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
                <Text style={[styles.warningText, { color: '#EF4444' }]}>
                  PREPARE-TOI !
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* AMRAP Round Counter */}
        {mode === 'amrap' && timerState === 'running' && (
          <View style={[styles.amrapCounter, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.amrapLabel, { color: colors.textMuted }]}>ROUNDS COMPLETES</Text>
            <Text style={[styles.amrapCount, { color: isDark ? colors.accent : '#000000', fontWeight: '800' }]}>{amrapRoundsCompleted}</Text>
            <TouchableOpacity
              style={[styles.amrapButton, { backgroundColor: colors.accent }]}
              onPress={() => {
                setAmrapRoundsCompleted(r => r + 1);
                soundManager.playBeep();
                triggerHaptic('medium');
              }}
            >
              <Text style={[styles.amrapButtonText, { color: colors.textOnGold }]}>✓ Round Completé</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* FOR TIME - Finish Button */}
        {mode === 'fortime' && timerState === 'running' && (
          <View style={[styles.forTimeFinish, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.forTimeLabel, { color: colors.textMuted }]}>APPUIE QUAND TU AS FINI</Text>
            <TouchableOpacity
              style={[styles.forTimeButton, { backgroundColor: '#10B981' }]}
              onPress={async () => {
                setTimerState('finished');
                await soundManager.playVictory();
                triggerHaptic('heavy');
              }}
            >
              <Text style={styles.forTimeButtonText}>🏁 FINISHED !</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Series Counter (Musculation only) */}
        {mode === 'musculation' && (
          <View style={[styles.seriesCard, { backgroundColor: colors.backgroundCard, borderColor: colors.border }]}>
            <Text style={[styles.seriesLabel, { color: colors.textMuted }]}>SERIES COMPLETEES</Text>
            <Text style={[styles.seriesCount, { color: isDark ? colors.accent : '#000000', fontWeight: '800' }]}>{seriesCount}</Text>

            {seriesHistory.length > 0 && (
              <View style={styles.seriesHistoryContainer}>
                {seriesHistory.slice(-5).reverse().map((serie, index) => (
                  <View key={index} style={[styles.seriesHistoryItem, { borderBottomColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.seriesHistoryNumber, { color: colors.textPrimary }]}>
                        Série {serie.seriesNumber}
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
                      {formatTime(serie.restDuration)} repos
                    </Text>
                  </View>
                ))}
                {seriesHistory.length > 5 && (
                  <Text style={[styles.seriesHistoryMore, { color: colors.textMuted }]}>
                    +{seriesHistory.length - 5} autres
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
                {trackRepsWeight ? '✓ Tracker reps/poids' : 'Tracker reps/poids'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={resetSeriesCount}>
              <Text style={[styles.seriesReset, { color: colors.textMuted }]}>Reinitialiser</Text>
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
                {mode === 'musculation' ? 'SERIE TERMINEE' : 'DEMARRER'}
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
                  <Text style={[styles.mainBtnText, { color: colors.textOnGold }]}>PROCHAINE SERIE</Text>
                </>
              ) : (
                <>
                  <RotateCcw size={24} color={colors.textOnGold} />
                  <Text style={[styles.mainBtnText, { color: colors.textOnGold }]}>RECOMMENCER</Text>
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

  // Timer
  timerContainer: {
    alignItems: 'center',
    marginBottom: SPACING.xl,
    marginTop: SPACING.lg,
  },
  progressRing: {
    width: 340,
    height: 340,
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgRing: {
    position: 'absolute',
  },
  timeDisplay: {
    alignItems: 'center',
  },
  inlineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  inlineControlBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inlineControlPlaceholder: {
    width: 48,
    height: 48,
  },
  timeText: {
    fontSize: 96,
    fontWeight: '200',
    fontVariant: ['tabular-nums'],
    letterSpacing: 4,
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
