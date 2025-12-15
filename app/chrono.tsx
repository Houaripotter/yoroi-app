import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Platform,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { X, Play, Pause, RotateCcw, Plus, Minus, Clock } from 'lucide-react-native';
import { Audio } from 'expo-av';
import { useKeepAwake } from 'expo-keep-awake';
import { ScreenWrapper } from '@/components/ScreenWrapper';
import { Header } from '@/components/ui/Header';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TimerMode = 'sparring' | 'muscu';
type TimerPhase = 'work' | 'rest' | 'idle';

interface TimerState {
  isRunning: boolean;
  phase: TimerPhase;
  timeRemaining: number; // en secondes
  workDuration: number; // en secondes (par défaut 5:00)
  restDuration: number; // en secondes (par défaut 1:00)
  currentRound: number;
}

const DEFAULT_WORK = 5 * 60; // 5 minutes
const DEFAULT_REST = 1 * 60; // 1 minute

export default function ChronoScreen() {
  useKeepAwake(); // Empêche l'écran de s'éteindre
  const router = useRouter();
  const [mode, setMode] = useState<TimerMode>('sparring');
  const [timer, setTimer] = useState<TimerState>({
    isRunning: false,
    phase: 'idle',
    timeRemaining: DEFAULT_WORK,
    workDuration: DEFAULT_WORK,
    restDuration: DEFAULT_REST,
    currentRound: 1,
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const gongSoundRef = useRef<Audio.Sound | null>(null);
  const beepSoundRef = useRef<Audio.Sound | null>(null);

  // Charger les sons au montage
  useEffect(() => {
    loadSounds();
    return () => {
      // Nettoyer les sons et l'intervalle
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      gongSoundRef.current?.unloadAsync();
      beepSoundRef.current?.unloadAsync();
    };
  }, []);

  const loadSounds = async () => {
    try {
      // Charger le gong
      const { sound: gongSound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/gong.mp3')
      );
      gongSoundRef.current = gongSound;

      // Charger le beep
      const { sound: beepSound } = await Audio.Sound.createAsync(
        require('@/assets/sounds/beep.mp3')
      );
      beepSoundRef.current = beepSound;
    } catch (error) {
      console.error('Erreur chargement sons:', error);
    }
  };

  const playGong = async () => {
    try {
      if (gongSoundRef.current) {
        const status = await gongSoundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await gongSoundRef.current.setPositionAsync(0);
          await gongSoundRef.current.playAsync().catch(() => {
            // Ignorer les erreurs de lecture
          });
        }
      }
    } catch (error) {
      console.error('Erreur lecture gong:', error);
    }
  };

  const playBeep = async () => {
    try {
      if (beepSoundRef.current) {
        const status = await beepSoundRef.current.getStatusAsync();
        if (status.isLoaded) {
          await beepSoundRef.current.setPositionAsync(0);
          await beepSoundRef.current.playAsync().catch(() => {
            // Ignorer les erreurs de lecture
          });
        }
      }
    } catch (error) {
      console.error('Erreur lecture beep:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const startTimer = useCallback(() => {
    if (mode === 'sparring') {
      // Mode Sparring : commencer avec WORK
      setTimer((prev) => ({
        ...prev,
        isRunning: true,
        phase: 'work',
        timeRemaining: prev.workDuration,
        currentRound: 1,
      }));
      playGong(); // Gong au début du round
    } else {
      // Mode Muscu : le temps est déjà défini par le bouton
      setTimer((prev) => ({
        ...prev,
        isRunning: true,
        phase: 'rest',
      }));
    }
  }, [mode]);

  const pauseTimer = () => {
    setTimer((prev) => ({ ...prev, isRunning: false }));
  };

  const resetTimer = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimer((prev) => ({
      ...prev,
      isRunning: false,
      phase: 'idle',
      timeRemaining: mode === 'sparring' ? prev.workDuration : 0,
      currentRound: 1,
    }));
  };

  const adjustWorkDuration = (delta: number) => {
    setTimer((prev) => {
      const newDuration = Math.max(30, Math.min(30 * 60, prev.workDuration + delta));
      return {
        ...prev,
        workDuration: newDuration,
        timeRemaining: prev.phase === 'idle' || prev.phase === 'work' ? newDuration : prev.timeRemaining,
      };
    });
  };

  const adjustRestDuration = (delta: number) => {
    setTimer((prev) => {
      const newDuration = Math.max(10, Math.min(10 * 60, prev.restDuration + delta));
      return {
        ...prev,
        restDuration: newDuration,
        timeRemaining: prev.phase === 'rest' ? newDuration : prev.timeRemaining,
      };
    });
  };

  const startQuickTimer = (seconds: number) => {
    setTimer({
      isRunning: true,
      phase: 'rest',
      timeRemaining: seconds,
      workDuration: DEFAULT_WORK,
      restDuration: DEFAULT_REST,
      currentRound: 1,
    });
  };

  // Effet pour gérer le countdown
  useEffect(() => {
    if (timer.isRunning && timer.timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimer((prev) => {
          if (prev.timeRemaining <= 1) {
            // Timer terminé
            if (mode === 'sparring') {
              // Mode Sparring : alterner entre WORK et REST
              if (prev.phase === 'work') {
                playGong(); // Gong à la fin du round (début du repos)
                return {
                  ...prev,
                  phase: 'rest',
                  timeRemaining: prev.restDuration,
                };
              } else {
                // Fin du repos, nouveau round
                playGong(); // Gong au début du nouveau round
                return {
                  ...prev,
                  phase: 'work',
                  timeRemaining: prev.workDuration,
                  currentRound: prev.currentRound + 1,
                };
              }
            } else {
              // Mode Muscu : timer terminé
              playBeep();
              return {
                ...prev,
                isRunning: false,
                phase: 'idle',
                timeRemaining: 0,
              };
            }
          }
          return {
            ...prev,
            timeRemaining: prev.timeRemaining - 1,
          };
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timer.isRunning, timer.timeRemaining, mode]);

  const getBackgroundColor = (): string => {
    if (mode === 'sparring') {
      if (timer.phase === 'work') return '#10B981'; // Vert
      if (timer.phase === 'rest') return '#EF4444'; // Rouge
      return '#1F2937'; // Gris foncé
    }
    // Mode Muscu
    if (timer.isRunning) return '#2563EB'; // Bleu
    return '#1F2937'; // Gris foncé
  };

  const getPhaseText = (): string => {
    if (mode === 'sparring') {
      if (timer.phase === 'work') return 'COMBAT';
      if (timer.phase === 'rest') return 'REPOS';
      return 'PRÊT';
    }
    return timer.isRunning ? 'REPOS' : 'PRÊT';
  };

  const QUICK_TIMES = [
    { label: '30s', seconds: 30 },
    { label: '45s', seconds: 45 },
    { label: '1m', seconds: 60 },
    { label: '1m30', seconds: 90 },
    { label: '2m', seconds: 120 },
    { label: '3m', seconds: 180 },
  ];

  const backgroundColor = getBackgroundColor();

  return (
    <View style={[styles.container, { backgroundColor }]}>
      <Header title="Chrono Tactique" showBack transparent />

      {/* Mode Selector */}
      <View style={styles.modeSelector}>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'sparring' && styles.modeButtonActive]}
          onPress={() => {
            resetTimer();
            setMode('sparring');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeButtonText, mode === 'sparring' && styles.modeButtonTextActive]}>
            🥋 Sparring
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, mode === 'muscu' && styles.modeButtonActive]}
          onPress={() => {
            resetTimer();
            setMode('muscu');
          }}
          activeOpacity={0.7}
        >
          <Text style={[styles.modeButtonText, mode === 'muscu' && styles.modeButtonTextActive]}>
            🏋️ Muscu
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Timer Display */}
      <View style={styles.timerContainer}>
        {mode === 'sparring' && (
          <View style={styles.roundInfo}>
            <Text style={styles.roundText}>Round {timer.currentRound}</Text>
          </View>
        )}
        <Text style={styles.phaseText}>{getPhaseText()}</Text>
        <Text style={styles.timeText}>{formatTime(timer.timeRemaining)}</Text>

        {/* Controls for Sparring Mode */}
        {mode === 'sparring' && !timer.isRunning && (
          <View style={styles.configContainer}>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Work</Text>
              <View style={styles.configControls}>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => adjustWorkDuration(-30)}
                  activeOpacity={0.7}
                >
                  <Minus size={20} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.configValue}>{formatTime(timer.workDuration)}</Text>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => adjustWorkDuration(30)}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.configRow}>
              <Text style={styles.configLabel}>Rest</Text>
              <View style={styles.configControls}>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => adjustRestDuration(-10)}
                  activeOpacity={0.7}
                >
                  <Minus size={20} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={styles.configValue}>{formatTime(timer.restDuration)}</Text>
                <TouchableOpacity
                  style={styles.configButton}
                  onPress={() => adjustRestDuration(10)}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color="#FFFFFF" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Quick Time Buttons for Muscu Mode */}
        {mode === 'muscu' && !timer.isRunning && (
          <View style={styles.quickTimeGrid}>
            {QUICK_TIMES.map((quickTime) => (
              <TouchableOpacity
                key={quickTime.seconds}
                style={styles.quickTimeButton}
                onPress={() => startQuickTimer(quickTime.seconds)}
                activeOpacity={0.7}
              >
                <Clock size={20} color="#FFFFFF" strokeWidth={2.5} />
                <Text style={styles.quickTimeText}>{quickTime.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Control Buttons */}
        <View style={styles.controlButtons}>
          {timer.isRunning ? (
            <TouchableOpacity style={styles.controlButton} onPress={pauseTimer} activeOpacity={0.7}>
              <Pause size={32} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.controlButtonText}>Pause</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.controlButton} onPress={startTimer} activeOpacity={0.7}>
              <Play size={32} color="#FFFFFF" strokeWidth={2.5} />
              <Text style={styles.controlButtonText}>
                {timer.phase === 'idle' ? 'Démarrer' : 'Reprendre'}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.controlButton} onPress={resetTimer} activeOpacity={0.7}>
            <RotateCcw size={32} color="#FFFFFF" strokeWidth={2.5} />
            <Text style={styles.controlButtonText}>Reset</Text>
          </TouchableOpacity>
        </View>
      </View>
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
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  modeSelector: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 4,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeButtonActive: {
    backgroundColor: '#FFFFFF',
  },
  modeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.7)',
  },
  modeButtonTextActive: {
    color: '#1F2937',
  },
  timerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  roundInfo: {
    marginBottom: 20,
  },
  roundText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  phaseText: {
    fontSize: 48,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 20,
    letterSpacing: 4,
  },
  timeText: {
    fontSize: 96,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 40,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    letterSpacing: 4,
  },
  configContainer: {
    width: '100%',
    maxWidth: 300,
    marginBottom: 30,
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  configLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    opacity: 0.9,
  },
  configControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  configButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
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
  quickTimeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
    maxWidth: 300,
    marginBottom: 30,
    justifyContent: 'center',
  },
  quickTimeButton: {
    width: (SCREEN_WIDTH - 80) / 3 - 8,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickTimeText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  controlButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },
  controlButton: {
    flex: 1,
    maxWidth: 150,
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  controlButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
