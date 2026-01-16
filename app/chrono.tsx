import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Dimensions,
  ScrollView,
  Vibration,
  TextInput,
} from 'react-native';
import { useCustomPopup } from '@/components/CustomPopup';
import { useRouter } from 'expo-router';
import { Play, Pause, RotateCcw, Plus, Minus, Clock, ChevronDown, ChevronUp, Save, Check, Shirt, Moon, Footprints, Award, Activity, LucideIcon } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Header } from '@/components/ui/Header';
import { useTheme } from '@/lib/ThemeContext';
import { successHaptic } from '@/lib/haptics';
import logger from '@/lib/security/logger';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// CHRONO FITNESS - MODES SPECIAUX
// ============================================

type TimerMode = 'combat' | 'tabata' | 'emom' | 'amrap' | 'repos' | 'custom';
type TimerPhase = 'work' | 'rest' | 'idle' | 'countdown';

interface SportPreset {
  id: string;
  name: string;
  iconComponent: LucideIcon;
  rounds: number;
  workDuration: number;
  restDuration: number;
  color: string;
}

interface CustomPreset {
  id: string;
  name: string;
  workDuration: number;
  restDuration: number;
  rounds: number;
}

const SPORT_PRESETS: SportPreset[] = [
  // JJB
  { id: 'jjb_white', name: 'JJB Blanc', iconComponent: Shirt, rounds: 1, workDuration: 5 * 60, restDuration: 0, color: '#10B981' },
  { id: 'jjb_blue', name: 'JJB Bleu+', iconComponent: Shirt, rounds: 1, workDuration: 6 * 60, restDuration: 0, color: '#3B82F6' },
  { id: 'jjb_black', name: 'JJB Noir', iconComponent: Shirt, rounds: 1, workDuration: 10 * 60, restDuration: 0, color: '#1F2937' },
  // MMA
  { id: 'mma', name: 'MMA', iconComponent: Activity, rounds: 3, workDuration: 5 * 60, restDuration: 60, color: '#EF4444' },
  { id: 'mma_title', name: 'MMA Titre', iconComponent: Award, rounds: 5, workDuration: 5 * 60, restDuration: 60, color: '#F59E0B' },
  // Boxe
  { id: 'boxe', name: 'Boxe Anglaise', iconComponent: Activity, rounds: 12, workDuration: 3 * 60, restDuration: 60, color: '#DC2626' },
  { id: 'boxe_amateur', name: 'Boxe Amateur', iconComponent: Activity, rounds: 3, workDuration: 3 * 60, restDuration: 60, color: '#DC2626' },
  // Kickboxing / K-1
  { id: 'kickboxing', name: 'Kickboxing', iconComponent: Activity, rounds: 3, workDuration: 3 * 60, restDuration: 60, color: '#DD6B20' },
  { id: 'k1', name: 'K-1', iconComponent: Activity, rounds: 3, workDuration: 3 * 60, restDuration: 60, color: '#DD6B20' },
  // Muay Thai
  { id: 'muay_thai', name: 'Muay Thai', iconComponent: Activity, rounds: 5, workDuration: 3 * 60, restDuration: 120, color: '#9B2C2C' },
  // Lutte
  { id: 'lutte', name: 'Lutte', iconComponent: Activity, rounds: 2, workDuration: 3 * 60, restDuration: 30, color: '#E53E3E' },
  // Judo
  { id: 'judo', name: 'Judo', iconComponent: Shirt, rounds: 1, workDuration: 4 * 60, restDuration: 0, color: '#F7FAFC' },
  // Karate
  { id: 'karate', name: 'Karate', iconComponent: Shirt, rounds: 3, workDuration: 2 * 60, restDuration: 60, color: '#F7FAFC' },
  // Taekwondo
  { id: 'taekwondo', name: 'Taekwondo', iconComponent: Footprints, rounds: 3, workDuration: 2 * 60, restDuration: 60, color: '#3182CE' },
  // Sambo
  { id: 'sambo', name: 'Sambo', iconComponent: Activity, rounds: 2, workDuration: 5 * 60, restDuration: 60, color: '#C53030' },
  // Grappling
  { id: 'grappling', name: 'Grappling', iconComponent: Activity, rounds: 1, workDuration: 6 * 60, restDuration: 0, color: '#805AD5' },
  { id: 'grappling_adcc', name: 'ADCC', iconComponent: Activity, rounds: 1, workDuration: 10 * 60, restDuration: 0, color: '#805AD5' },
  // Catch
  { id: 'catch', name: 'Catch', iconComponent: Activity, rounds: 2, workDuration: 5 * 60, restDuration: 60, color: '#D69E2E' },
];

// Durées EMOM
const EMOM_DURATIONS = [10, 12, 15, 20, 25, 30];

// Durées AMRAP
const AMRAP_DURATIONS = [5, 8, 10, 12, 15, 20];

interface TimerState {
  isRunning: boolean;
  phase: TimerPhase;
  timeRemaining: number;
  workDuration: number;
  restDuration: number;
  currentRound: number;
  totalRounds: number;
  totalTime: number;
  amrapRounds: number;
  currentMinute: number;
}

const CUSTOM_PRESETS_KEY = '@yoroi_custom_presets';

// Durées Repos (musculation)
const REPOS_DURATIONS = [30, 45, 60, 90, 120, 180];

// Couleurs par mode
const MODE_COLORS: Record<TimerMode, { work: string; rest: string; idle: string }> = {
  combat: { work: '#10B981', rest: '#EF4444', idle: '#1F2937' },
  tabata: { work: '#EF4444', rest: '#10B981', idle: '#1E3A8A' },
  emom: { work: '#8B5CF6', rest: '#8B5CF6', idle: '#4C1D95' },
  amrap: { work: '#EC4899', rest: '#EC4899', idle: '#831843' },
  repos: { work: '#6366F1', rest: '#6366F1', idle: '#312E81' },
  custom: { work: '#14B8A6', rest: '#F97316', idle: '#134E4A' },
};

export default function ChronoScreen() {
  useKeepAwake();
  const router = useRouter();
  const { colors } = useTheme();
  const { showPopup, PopupComponent } = useCustomPopup();

  const [mode, setMode] = useState<TimerMode>('combat');
  const [selectedPreset, setSelectedPreset] = useState<SportPreset>(SPORT_PRESETS[0]);
  const [showPresets, setShowPresets] = useState(false);
  const [customPresets, setCustomPresets] = useState<CustomPreset[]>([]);
  const [showCustomPresets, setShowCustomPresets] = useState(false);
  const [customPresetName, setCustomPresetName] = useState('');

  // EMOM / AMRAP / REPOS config
  const [emomDuration, setEmomDuration] = useState(10);
  const [amrapDuration, setAmrapDuration] = useState(10);
  const [reposDuration, setReposDuration] = useState(60);
  const [reposCount, setReposCount] = useState(0);

  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    phase: 'idle',
    timeRemaining: SPORT_PRESETS[0].workDuration,
    workDuration: SPORT_PRESETS[0].workDuration,
    restDuration: SPORT_PRESETS[0].restDuration,
    currentRound: 1,
    totalRounds: SPORT_PRESETS[0].rounds,
    totalTime: 0,
    amrapRounds: 0,
    currentMinute: 1,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gongSoundRef = useRef<Audio.Sound | null>(null);
  const beepSoundRef = useRef<Audio.Sound | null>(null);
  const whistleSoundRef = useRef<Audio.Sound | null>(null);
  const warned10secRef = useRef<boolean>(false);
  const lastMinuteRef = useRef<number>(0);

  // Charger les sons et presets
  useEffect(() => {
    loadSounds();
    loadCustomPresets();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      gongSoundRef.current?.unloadAsync();
      beepSoundRef.current?.unloadAsync();
      whistleSoundRef.current?.unloadAsync();
    };
  }, []);

  const loadSounds = async () => {
    try {
      const { sound: gongSound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/gong.mp3')
      );
      gongSoundRef.current = gongSound;

      const { sound: beepSound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/beep.mp3')
      );
      beepSoundRef.current = beepSound;

      // Utiliser gong comme whistle si pas disponible
      const { sound: whistleSound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/gong.mp3')
      );
      whistleSoundRef.current = whistleSound;
    } catch (error) {
      logger.info('Sons non disponibles:', error);
    }
  };

  const loadCustomPresets = async () => {
    try {
      const data = await AsyncStorage.getItem(CUSTOM_PRESETS_KEY);
      if (data) {
        setCustomPresets(JSON.parse(data));
      }
    } catch (error) {
      logger.info('Erreur chargement presets:', error);
    }
  };

  const saveCustomPreset = async () => {
    if (!customPresetName.trim()) {
      showPopup('Erreur', 'Donne un nom à ton preset');
      return;
    }

    const newPreset: CustomPreset = {
      id: Date.now().toString(),
      name: customPresetName.trim(),
      workDuration: timer.workDuration,
      restDuration: timer.restDuration,
      rounds: timer.totalRounds,
    };

    const updated = [...customPresets, newPreset];
    setCustomPresets(updated);
    try {
      await AsyncStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updated));
    } catch (error) {
      logger.error('Erreur sauvegarde preset:', error);
    }
    setCustomPresetName('');
    successHaptic();
    showPopup('Sauvegardé !', `Preset "${newPreset.name}" créé`);
  };

  const deleteCustomPreset = async (id: string) => {
    const updated = customPresets.filter(p => p.id !== id);
    setCustomPresets(updated);
    try {
      await AsyncStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(updated));
    } catch (error) {
      logger.error('Erreur suppression preset:', error);
    }
  };

  const playGong = async () => {
    try {
      if (gongSoundRef.current) {
        await gongSoundRef.current.setPositionAsync(0);
        await gongSoundRef.current.playAsync();
      }
      Vibration.vibrate([0, 500, 100, 500]);
    } catch (error) {
      logger.info('Erreur gong:', error);
    }
  };

  const playBeep = async () => {
    try {
      if (beepSoundRef.current) {
        await beepSoundRef.current.setPositionAsync(0);
        await beepSoundRef.current.playAsync();
      }
      Vibration.vibrate(200);
    } catch (error) {
      logger.info('Erreur beep:', error);
    }
  };

  const playWhistle = async () => {
    try {
      if (whistleSoundRef.current) {
        await whistleSoundRef.current.setPositionAsync(0);
        await whistleSoundRef.current.playAsync();
      }
      Vibration.vibrate([0, 300, 100, 300, 100, 300]);
    } catch (error) {
      logger.info('Erreur whistle:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const selectPreset = (preset: SportPreset) => {
    setSelectedPreset(preset);
    setTimer({
      ...timer,
      isRunning: false,
      phase: 'idle',
      timeRemaining: preset.workDuration,
      workDuration: preset.workDuration,
      restDuration: preset.restDuration,
      currentRound: 1,
      totalRounds: preset.rounds,
      amrapRounds: 0,
    });
    setShowPresets(false);
    warned10secRef.current = false;
  };

  const selectCustomPreset = (preset: CustomPreset) => {
    setTimer({
      ...timer,
      isRunning: false,
      phase: 'idle',
      timeRemaining: preset.workDuration,
      workDuration: preset.workDuration,
      restDuration: preset.restDuration,
      currentRound: 1,
      totalRounds: preset.rounds,
      amrapRounds: 0,
    });
    setShowCustomPresets(false);
    warned10secRef.current = false;
  };

  const initializeTimer = useCallback((timerMode: TimerMode) => {
    warned10secRef.current = false;
    lastMinuteRef.current = 0;

    switch (timerMode) {
      case 'combat':
        setTimer({
          isRunning: false,
          phase: 'idle',
          timeRemaining: selectedPreset.workDuration,
          workDuration: selectedPreset.workDuration,
          restDuration: selectedPreset.restDuration,
          currentRound: 1,
          totalRounds: selectedPreset.rounds,
          totalTime: 0,
          amrapRounds: 0,
          currentMinute: 1,
        });
        break;
      case 'tabata':
        // Tabata: 20s effort, 10s repos, 8 rounds
        setTimer({
          isRunning: false,
          phase: 'idle',
          timeRemaining: 20,
          workDuration: 20,
          restDuration: 10,
          currentRound: 1,
          totalRounds: 8,
          totalTime: 4 * 60, // 4 minutes total
          amrapRounds: 0,
          currentMinute: 1,
        });
        break;
      case 'emom':
        setTimer({
          isRunning: false,
          phase: 'idle',
          timeRemaining: 60,
          workDuration: 60,
          restDuration: 0,
          currentRound: 1,
          totalRounds: emomDuration,
          totalTime: emomDuration * 60,
          amrapRounds: 0,
          currentMinute: 1,
        });
        break;
      case 'amrap':
        setTimer({
          isRunning: false,
          phase: 'idle',
          timeRemaining: amrapDuration * 60,
          workDuration: amrapDuration * 60,
          restDuration: 0,
          currentRound: 1,
          totalRounds: 1,
          totalTime: amrapDuration * 60,
          amrapRounds: 0,
          currentMinute: 1,
        });
        break;
      case 'repos':
        setReposCount(0);
        setTimer({
          isRunning: false,
          phase: 'idle',
          timeRemaining: reposDuration,
          workDuration: reposDuration,
          restDuration: 0,
          currentRound: 1,
          totalRounds: 1,
          totalTime: reposDuration,
          amrapRounds: 0,
          currentMinute: 1,
        });
        break;
      case 'custom':
        setTimer({
          isRunning: false,
          phase: 'idle',
          timeRemaining: 60,
          workDuration: 60,
          restDuration: 30,
          currentRound: 1,
          totalRounds: 5,
          totalTime: 0,
          amrapRounds: 0,
          currentMinute: 1,
        });
        break;
    }
  }, [selectedPreset, emomDuration, amrapDuration, reposDuration]);

  const changeMode = (newMode: TimerMode) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setMode(newMode);
    initializeTimer(newMode);
  };

  const startTimer = useCallback(() => {
    if (mode === 'repos') {
      playBeep();
    } else {
      playWhistle();
    }
    warned10secRef.current = false;
    lastMinuteRef.current = 0;

    if (mode === 'repos') {
      setTimer((prev) => ({
        ...prev,
        isRunning: true,
        phase: 'work',
        timeRemaining: reposDuration,
      }));
    } else {
      setTimer((prev) => ({
        ...prev,
        isRunning: true,
        phase: 'work',
        timeRemaining: mode === 'amrap' ? amrapDuration * 60 : prev.workDuration,
        currentRound: 1,
        amrapRounds: 0,
        currentMinute: 1,
      }));
    }
  }, [mode, amrapDuration, reposDuration]);

  const pauseTimer = () => {
    setTimer((prev) => ({ ...prev, isRunning: false }));
  };

  const resetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    initializeTimer(mode);
  };

  const adjustValue = (field: 'workDuration' | 'restDuration' | 'totalRounds', delta: number) => {
    setTimer((prev) => {
      if (field === 'totalRounds') {
        const newRounds = Math.max(1, Math.min(50, prev.totalRounds + delta));
        return { ...prev, totalRounds: newRounds };
      }
      const min = field === 'restDuration' ? 0 : 5;
      const max = 30 * 60;
      const step = 5;
      const newValue = Math.max(min, Math.min(max, prev[field] + delta * step));
      return {
        ...prev,
        [field]: newValue,
        timeRemaining: prev.phase === 'idle' ? newValue : prev.timeRemaining,
      };
    });
  };

  // Ajouter un round AMRAP
  const addAmrapRound = () => {
    if (mode === 'amrap' && timer.isRunning) {
      playBeep();
      successHaptic();
      setTimer(prev => ({ ...prev, amrapRounds: prev.amrapRounds + 1 }));
    }
  };

  // Countdown effect
  useEffect(() => {
    if (timer.isRunning && timer.timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          // Bip 10 secondes avant la fin (sauf EMOM qui bip chaque minute)
          if (prev.timeRemaining === 11 && !warned10secRef.current && mode !== 'emom') {
            playBeep();
            warned10secRef.current = true;
          }

          // EMOM: Alert à chaque minute
          if (mode === 'emom') {
            const currentMinute = Math.ceil(prev.timeRemaining / 60);
            if (currentMinute !== lastMinuteRef.current && prev.timeRemaining % 60 === 0 && prev.timeRemaining > 0) {
              playGong();
              lastMinuteRef.current = currentMinute;
            }
            // 3 secondes avant la nouvelle minute
            if (prev.timeRemaining % 60 === 3 && prev.timeRemaining > 3) {
              playBeep();
            }
          }

          if (prev.timeRemaining <= 1) {
            warned10secRef.current = false;

            // TABATA logic
            if (mode === 'tabata') {
              if (prev.phase === 'work') {
                // Fin effort, passer au repos
                if (prev.currentRound >= prev.totalRounds) {
                  // Tabata terminé !
                  playWhistle();
                  successHaptic();
                  return { ...prev, isRunning: false, phase: 'idle', timeRemaining: 0 };
                }
                playBeep();
                return { ...prev, phase: 'rest', timeRemaining: prev.restDuration };
              } else {
                // Fin repos, nouveau round
                playBeep();
                return {
                  ...prev,
                  phase: 'work',
                  timeRemaining: prev.workDuration,
                  currentRound: prev.currentRound + 1,
                };
              }
            }

            // EMOM logic
            if (mode === 'emom') {
              if (prev.currentMinute >= prev.totalRounds) {
                playWhistle();
                successHaptic();
                return { ...prev, isRunning: false, phase: 'idle', timeRemaining: 0 };
              }
              playGong();
              return {
                ...prev,
                timeRemaining: 60,
                currentMinute: prev.currentMinute + 1,
              };
            }

            // AMRAP logic
            if (mode === 'amrap') {
              playWhistle();
              successHaptic();
              return { ...prev, isRunning: false, phase: 'idle', timeRemaining: 0 };
            }

            // REPOS logic
            if (mode === 'repos') {
              playGong();
              successHaptic();
              setReposCount(c => c + 1);
              return { ...prev, isRunning: false, phase: 'idle', timeRemaining: 0 };
            }

            // CUSTOM logic
            if (mode === 'custom') {
              if (prev.phase === 'work') {
                if (prev.currentRound >= prev.totalRounds) {
                  playWhistle();
                  successHaptic();
                  return { ...prev, isRunning: false, phase: 'idle', timeRemaining: 0 };
                }
                if (prev.restDuration > 0) {
                  playBeep();
                  return { ...prev, phase: 'rest', timeRemaining: prev.restDuration };
                } else {
                  playGong();
                  return {
                    ...prev,
                    phase: 'work',
                    timeRemaining: prev.workDuration,
                    currentRound: prev.currentRound + 1,
                  };
                }
              } else {
                playGong();
                return {
                  ...prev,
                  phase: 'work',
                  timeRemaining: prev.workDuration,
                  currentRound: prev.currentRound + 1,
                };
              }
            }

            // COMBAT logic (existant)
            if (mode === 'combat') {
              if (prev.phase === 'work') {
                if (prev.currentRound >= prev.totalRounds) {
                  playGong();
                  successHaptic();
                  return { ...prev, isRunning: false, phase: 'idle', timeRemaining: 0 };
                }
                if (prev.restDuration > 0) {
                  playGong();
                  return { ...prev, phase: 'rest', timeRemaining: prev.restDuration };
                } else {
                  playGong();
                  return {
                    ...prev,
                    phase: 'work',
                    timeRemaining: prev.workDuration,
                    currentRound: prev.currentRound + 1,
                  };
                }
              } else {
                playGong();
                return {
                  ...prev,
                  phase: 'work',
                  timeRemaining: prev.workDuration,
                  currentRound: prev.currentRound + 1,
                };
              }
            }

            return prev;
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer.isRunning, mode]);

  const getBackgroundColor = (): string => {
    const modeColors = MODE_COLORS[mode];
    if (timer.phase === 'work') return modeColors.work;
    if (timer.phase === 'rest') return modeColors.rest;
    return modeColors.idle;
  };

  const getPhaseText = (): string => {
    if (timer.timeRemaining === 0) return 'TERMINÉ !';
    if (timer.phase === 'idle') return 'PRÊT ?';

    switch (mode) {
      case 'combat':
        return timer.phase === 'work' ? 'COMBAT !' : 'REPOS';
      case 'tabata':
        return timer.phase === 'work' ? 'EFFORT !' : 'REPOS';
      case 'emom':
        return `MINUTE ${timer.currentMinute}`;
      case 'amrap':
        return 'GO !';
      case 'repos':
        return 'RÉCUPÈRE...';
      case 'custom':
        return timer.phase === 'work' ? 'EFFORT !' : 'REPOS';
      default:
        return timer.isRunning ? 'EN COURS' : 'PRÊT';
    }
  };

  const backgroundColor = getBackgroundColor();

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Header title="Chrono Fitness" showBack transparent />

      {/* Mode Selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.modeSelectorScroll}
        contentContainerStyle={styles.modeSelectorContent}
      >
        {[
          { id: 'combat', label: 'Combat', icon: Shirt },
          { id: 'tabata', label: 'Tabata', icon: Activity },
          { id: 'emom', label: 'EMOM', icon: Clock },
          { id: 'amrap', label: 'AMRAP', icon: RotateCcw },
          { id: 'repos', label: 'Repos', icon: Moon },
          { id: 'custom', label: 'Custom', icon: Plus },
        ].map((item) => {
          const IconComponent = item.icon;
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.modeButton,
                mode === item.id && styles.modeButtonActive,
              ]}
              onPress={() => changeMode(item.id as TimerMode)}
              activeOpacity={0.7}
            >
              <View style={styles.modeButtonContent}>
                <IconComponent
                  size={18}
                  color={mode === item.id ? '#1F2937' : 'rgba(255, 255, 255, 0.8)'}
                />
                <Text style={[
                  styles.modeButtonText,
                  mode === item.id && styles.modeButtonTextActive,
                ]}>
                  {item.label}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* MODE COMBAT - Presets */}
        {mode === 'combat' && !timer.isRunning && timer.phase === 'idle' && (
          <View style={styles.presetSection}>
            <TouchableOpacity
              style={[styles.presetSelector, { backgroundColor: 'rgba(255,255,255,0.15)' }]}
              onPress={() => setShowPresets(!showPresets)}
              activeOpacity={0.7}
            >
              <View style={styles.presetIconContainer}>
                {React.createElement(selectedPreset.iconComponent, {
                  size: 24,
                  color: '#FFFFFF',
                })}
              </View>
              <Text style={styles.presetName}>{selectedPreset.name}</Text>
              {showPresets ? <ChevronUp size={20} color="#FFFFFF" /> : <ChevronDown size={20} color="#FFFFFF" />}
            </TouchableOpacity>

            {showPresets && (
              <View style={styles.presetList}>
                {SPORT_PRESETS.map((preset) => (
                  <TouchableOpacity
                    key={preset.id}
                    style={[styles.presetItem, selectedPreset.id === preset.id && styles.presetItemActive]}
                    onPress={() => selectPreset(preset)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.presetItemIconContainer}>
                      {React.createElement(preset.iconComponent, {
                        size: 20,
                        color: '#FFFFFF',
                      })}
                    </View>
                    <View style={styles.presetItemInfo}>
                      <Text style={styles.presetItemName}>{preset.name}</Text>
                      <Text style={styles.presetItemDetails}>
                        {preset.rounds}R × {formatTime(preset.workDuration)}
                        {preset.restDuration > 0 && ` / ${formatTime(preset.restDuration)} repos`}
                      </Text>
                    </View>
                    <View style={[styles.presetColorDot, { backgroundColor: preset.color }]} />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* MODE TABATA - Info */}
        {mode === 'tabata' && !timer.isRunning && timer.phase === 'idle' && (
          <View style={styles.modeInfoCard}>
            <View style={styles.modeInfoTitleContainer}>
              <Activity size={24} color="#FFFFFF" />
              <Text style={styles.modeInfoTitle}>TABATA</Text>
            </View>
            <Text style={styles.modeInfoText}>20 sec EFFORT + 10 sec REPOS</Text>
            <Text style={styles.modeInfoText}>8 rounds = 4 minutes</Text>
            <View style={styles.modeInfoBadge}>
              <Text style={styles.modeInfoBadgeText}>High Intensity</Text>
            </View>
          </View>
        )}

        {/* MODE EMOM - Config */}
        {mode === 'emom' && !timer.isRunning && timer.phase === 'idle' && (
          <View style={styles.modeConfigCard}>
            <View style={styles.modeConfigTitleContainer}>
              <Clock size={24} color="#FFFFFF" />
              <Text style={styles.modeConfigTitle}>EMOM</Text>
            </View>
            <Text style={styles.modeConfigSubtitle}>Every Minute On the Minute</Text>
            <Text style={styles.modeConfigLabel}>Durée totale</Text>
            <View style={styles.durationSelector}>
              {EMOM_DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationButton,
                    emomDuration === d && styles.durationButtonActive,
                  ]}
                  onPress={() => {
                    setEmomDuration(d);
                    setTimer(prev => ({
                      ...prev,
                      totalRounds: d,
                      totalTime: d * 60,
                    }));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.durationButtonText,
                    emomDuration === d && styles.durationButtonTextActive,
                  ]}>
                    {d} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* MODE AMRAP - Config */}
        {mode === 'amrap' && !timer.isRunning && timer.phase === 'idle' && (
          <View style={styles.modeConfigCard}>
            <View style={styles.modeConfigTitleContainer}>
              <RotateCcw size={24} color="#FFFFFF" />
              <Text style={styles.modeConfigTitle}>AMRAP</Text>
            </View>
            <Text style={styles.modeConfigSubtitle}>As Many Rounds As Possible</Text>
            <Text style={styles.modeConfigLabel}>Durée totale</Text>
            <View style={styles.durationSelector}>
              {AMRAP_DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationButton,
                    amrapDuration === d && styles.durationButtonActive,
                  ]}
                  onPress={() => {
                    setAmrapDuration(d);
                    setTimer(prev => ({
                      ...prev,
                      totalTime: d * 60,
                      timeRemaining: d * 60,
                    }));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.durationButtonText,
                    amrapDuration === d && styles.durationButtonTextActive,
                  ]}>
                    {d} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* MODE REPOS - Config */}
        {mode === 'repos' && !timer.isRunning && timer.phase === 'idle' && (
          <View style={styles.modeConfigCard}>
            <View style={styles.modeConfigTitleContainer}>
              <Moon size={24} color="#FFFFFF" />
              <Text style={styles.modeConfigTitle}>REPOS</Text>
            </View>
            <Text style={styles.modeConfigSubtitle}>Timer de récupération musculation</Text>

            {reposCount > 0 && (
              <View style={styles.reposCountBadge}>
                <Text style={styles.reposCountText}>{reposCount} repos effectués</Text>
              </View>
            )}

            <Text style={styles.modeConfigLabel}>Durée du repos</Text>
            <View style={styles.durationSelector}>
              {REPOS_DURATIONS.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[
                    styles.durationButton,
                    reposDuration === d && styles.durationButtonActive,
                  ]}
                  onPress={() => {
                    setReposDuration(d);
                    setTimer(prev => ({
                      ...prev,
                      timeRemaining: d,
                      workDuration: d,
                      totalTime: d,
                    }));
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.durationButtonText,
                    reposDuration === d && styles.durationButtonTextActive,
                  ]}>
                    {d >= 60 ? `${Math.floor(d / 60)}:${(d % 60).toString().padStart(2, '0')}` : `${d}s`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.reposQuickActions}>
              <TouchableOpacity
                style={styles.reposQuickButton}
                onPress={() => setReposCount(0)}
                activeOpacity={0.7}
              >
                <RotateCcw size={16} color="rgba(255,255,255,0.8)" />
                <Text style={styles.reposQuickButtonText}>Reset compteur</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* MODE CUSTOM - Config */}
        {mode === 'custom' && !timer.isRunning && timer.phase === 'idle' && (
          <View style={styles.configContainer}>
            <View style={styles.configTitleContainer}>
              <Plus size={24} color="#FFFFFF" />
              <Text style={styles.configTitle}>Configuration Custom</Text>
            </View>

            {/* Rounds */}
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Rounds</Text>
              <View style={styles.configControls}>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => adjustValue('totalRounds', -1)}
                  activeOpacity={0.7}
                >
                  <Minus size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.configValue}>{timer.totalRounds}</Text>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => adjustValue('totalRounds', 1)}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Work */}
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Effort</Text>
              <View style={styles.configControls}>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => adjustValue('workDuration', -1)}
                  activeOpacity={0.7}
                >
                  <Minus size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.configValue}>{formatTime(timer.workDuration)}</Text>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => adjustValue('workDuration', 1)}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Rest */}
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Repos</Text>
              <View style={styles.configControls}>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => adjustValue('restDuration', -1)}
                  activeOpacity={0.7}
                >
                  <Minus size={18} color="#FFFFFF" />
                </TouchableOpacity>
                <Text style={styles.configValue}>{formatTime(timer.restDuration)}</Text>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => adjustValue('restDuration', 1)}
                  activeOpacity={0.7}
                >
                  <Plus size={18} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Save Preset */}
            <View style={styles.savePresetSection}>
              <TextInput
                style={styles.presetNameInput}
                placeholder="Nom du preset..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={customPresetName}
                onChangeText={setCustomPresetName}
              />
              <TouchableOpacity
                style={styles.savePresetButton}
                onPress={saveCustomPreset}
                activeOpacity={0.7}
              >
                <Save size={18} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Saved Presets */}
            {customPresets.length > 0 && (
              <View style={styles.savedPresetsSection}>
                <TouchableOpacity
                  style={styles.savedPresetsHeader}
                  onPress={() => setShowCustomPresets(!showCustomPresets)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.savedPresetsTitle}>Mes presets ({customPresets.length})</Text>
                  {showCustomPresets ? <ChevronUp size={18} color="#FFFFFF" /> : <ChevronDown size={18} color="#FFFFFF" />}
                </TouchableOpacity>

                {showCustomPresets && (
                  <View style={styles.savedPresetsList}>
                    {customPresets.map((preset) => (
                      <TouchableOpacity
                        key={preset.id}
                        style={styles.savedPresetItem}
                        onPress={() => selectCustomPreset(preset)}
                        onLongPress={() => {
                          showPopup(
                            'Supprimer',
                            `Supprimer "${preset.name}" ?`,
                            [
                              { text: 'Annuler', style: 'cancel' },
                              { text: 'Supprimer', style: 'destructive', onPress: () => deleteCustomPreset(preset.id) },
                            ]
                          );
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={styles.savedPresetInfo}>
                          <Text style={styles.savedPresetName}>{preset.name}</Text>
                          <Text style={styles.savedPresetDetails}>
                            {preset.rounds}R × {formatTime(preset.workDuration)} / {formatTime(preset.restDuration)}
                          </Text>
                        </View>
                        <Check size={18} color="rgba(255,255,255,0.5)" />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* Main Timer Display */}
        <View style={styles.timerContainer}>
          {/* Round Info */}
          {(mode === 'combat' || mode === 'tabata' || mode === 'custom') && (
            <View style={styles.roundInfo}>
              <Text style={styles.roundText}>
                Round {timer.currentRound} / {timer.totalRounds}
              </Text>
            </View>
          )}

          {/* EMOM Minute Info */}
          {mode === 'emom' && timer.isRunning && (
            <View style={styles.roundInfo}>
              <Text style={styles.roundText}>
                Minute {timer.currentMinute} / {timer.totalRounds}
              </Text>
            </View>
          )}

          {/* AMRAP Rounds Counter */}
          {mode === 'amrap' && timer.isRunning && (
            <View style={styles.amrapCounter}>
              <Text style={styles.amrapCounterLabel}>ROUNDS COMPLÉTÉS</Text>
              <Text style={styles.amrapCounterValue}>{timer.amrapRounds}</Text>
            </View>
          )}

          {/* REPOS Counter */}
          {mode === 'repos' && (
            <View style={styles.reposInfoDisplay}>
              <Text style={styles.reposInfoLabel}>SÉRIES RÉCUPÉRÉES</Text>
              <Text style={styles.reposInfoValue}>{reposCount}</Text>
            </View>
          )}

          <Text style={styles.phaseText}>{getPhaseText()}</Text>
          <Text style={[
            styles.timeText,
            timer.timeRemaining <= 10 && timer.isRunning && styles.timeTextWarning,
          ]}>
            {formatTime(timer.timeRemaining)}
          </Text>

          {/* AMRAP +1 Button */}
          {mode === 'amrap' && timer.isRunning && (
            <TouchableOpacity
              style={styles.amrapAddButton}
              onPress={addAmrapRound}
              activeOpacity={0.7}
            >
              <Plus size={32} color="#FFFFFF" />
              <Text style={styles.amrapAddButtonText}>+1 Round</Text>
            </TouchableOpacity>
          )}

          {/* Control Buttons */}
          <View style={styles.controlButtons}>
            {timer.isRunning ? (
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={pauseTimer}
                activeOpacity={0.7}
              >
                <Pause size={28} color="#FFFFFF" />
                <Text style={styles.controlButtonText}>Pause</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
                onPress={startTimer}
                activeOpacity={0.7}
              >
                <Play size={28} color="#FFFFFF" />
                <Text style={styles.controlButtonText}>
                  {timer.phase === 'idle' ? 'GO !' : 'Reprendre'}
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.controlButton, { backgroundColor: 'rgba(255,255,255,0.2)' }]}
              onPress={resetTimer}
              activeOpacity={0.7}
            >
              <RotateCcw size={28} color="#FFFFFF" />
              <Text style={styles.controlButtonText}>Reset</Text>
            </TouchableOpacity>
          </View>

          {/* Timer Summary */}
          {timer.timeRemaining === 0 && mode === 'amrap' && (
            <View style={styles.resultSummary}>
              <Text style={styles.resultSummaryTitle}>Résultat</Text>
              <Text style={styles.resultSummaryValue}>{timer.amrapRounds} rounds</Text>
            </View>
          )}

          {/* Repos Quick Restart */}
          {mode === 'repos' && timer.timeRemaining === 0 && (
            <TouchableOpacity
              style={styles.reposRestartButton}
              onPress={startTimer}
              activeOpacity={0.7}
            >
              <Play size={24} color="#FFFFFF" />
              <Text style={styles.reposRestartText}>Nouveau repos</Text>
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  modeSelectorScroll: {
    maxHeight: 60,
    marginBottom: 10,
  },
  modeSelectorContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  modeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginRight: 8,
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  modeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  modeButtonTextActive: {
    color: '#1F2937',
  },
  // Mode Info Card
  modeInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  modeInfoTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  modeInfoTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modeInfoText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 4,
  },
  modeInfoBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 16,
  },
  modeInfoBadgeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Mode Config Card
  modeConfigCard: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    padding: 24,
    marginBottom: 20,
    alignItems: 'center',
  },
  modeConfigTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modeConfigTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  modeConfigSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 20,
  },
  modeConfigLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  durationSelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
  },
  durationButton: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    minWidth: 70,
    alignItems: 'center',
  },
  durationButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  durationButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.8)',
  },
  durationButtonTextActive: {
    color: '#1F2937',
  },
  // Presets
  presetSection: {
    marginBottom: 20,
  },
  presetSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  presetIconContainer: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetName: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  presetList: {
    marginTop: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  presetItemActive: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  presetItemIconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetItemInfo: {
    flex: 1,
  },
  presetItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  presetItemDetails: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  presetColorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  // Config
  configContainer: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  configTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  configTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  configLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  configControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  configButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  configValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    minWidth: 70,
    textAlign: 'center',
  },
  // Save Preset
  savePresetSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 10,
  },
  presetNameInput: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: '#FFFFFF',
  },
  savePresetButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Saved Presets
  savedPresetsSection: {
    marginTop: 20,
  },
  savedPresetsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  savedPresetsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
  },
  savedPresetsList: {
    marginTop: 8,
  },
  savedPresetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  savedPresetInfo: {
    flex: 1,
  },
  savedPresetName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  savedPresetDetails: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.6)',
    marginTop: 2,
  },
  // Timer
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  roundInfo: {
    marginBottom: 10,
  },
  roundText: {
    fontSize: 18,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  phaseText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 10,
    letterSpacing: 2,
  },
  timeText: {
    fontSize: 72,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 20,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 2,
  },
  timeTextWarning: {
    color: '#FEF08A',
  },
  // AMRAP
  amrapCounter: {
    alignItems: 'center',
    marginBottom: 20,
  },
  amrapCounterLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 4,
  },
  amrapCounterValue: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  amrapAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 10,
    marginBottom: 30,
  },
  amrapAddButtonText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  // Controls
  controlButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 10,
  },
  controlButton: {
    flex: 1,
    maxWidth: 140,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 6,
  },
  controlButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Result Summary
  resultSummary: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginTop: 20,
  },
  resultSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
    marginBottom: 8,
  },
  resultSummaryValue: {
    fontSize: 36,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  // Repos Mode
  reposCountBadge: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20,
  },
  reposCountText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  reposQuickActions: {
    flexDirection: 'row',
    marginTop: 20,
    gap: 10,
  },
  reposQuickButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  reposQuickButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  reposInfoDisplay: {
    alignItems: 'center',
    marginBottom: 10,
  },
  reposInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    letterSpacing: 1,
  },
  reposInfoValue: {
    fontSize: 32,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  reposRestartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 30,
    gap: 12,
    marginTop: 20,
  },
  reposRestartText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
