// ============================================
// YOROI - TIMER SALLE MODE (COMBAT SPORTS)
// Gestion des rounds en temps réel à l'entraînement
// ============================================

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Modal,
  Platform,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  impactAsync,
  notificationAsync,
  ImpactFeedbackStyle,
  NotificationFeedbackType,
} from 'expo-haptics';
import {
  Play,
  Pause,
  Square,
  ChevronLeft,
  RotateCcw,
  Plus,
  Minus,
  Check,
  X,
  Swords,
  Timer,
} from 'lucide-react-native';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

type AppPhase = 'setup' | 'active' | 'summary';
type TimerPhase = 'round' | 'rest';
type RoundResult = 'V' | 'D' | 'N' | null;

interface RoundEntry {
  roundNumber: number;
  result: RoundResult;
  notes: string;
}

interface SetupConfig {
  roundDuration: number; // minutes
  restDuration: number;  // minutes
  totalRounds: number;
  partnerName: string;
}

// ============================================
// HELPERS
// ============================================

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

export default function CombatTimerScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  // ---- SETUP STATE ----
  const [config, setConfig] = useState<SetupConfig>({
    roundDuration: 5,
    restDuration: 1,
    totalRounds: 5,
    partnerName: '',
  });

  // ---- APP PHASE ----
  const [appPhase, setAppPhase] = useState<AppPhase>('setup');

  // ---- TIMER STATE ----
  const [timerPhase, setTimerPhase] = useState<TimerPhase>('round');
  const [currentRound, setCurrentRound] = useState(1);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ---- ROUND RESULT SHEET ----
  const [showResultSheet, setShowResultSheet] = useState(false);
  const [pendingResult, setPendingResult] = useState<RoundResult>(null);
  const [pendingNotes, setPendingNotes] = useState('');

  // ---- ROUNDS HISTORY ----
  const [roundsHistory, setRoundsHistory] = useState<RoundEntry[]>([]);

  // ---- ANIMATED PROGRESS ----
  const progressAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Nettoyage interval au démontage
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // ---- PULSE ANIMATION (quand le timer tourne) ----
  useEffect(() => {
    if (isRunning) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.04,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isRunning]);

  // ---- TICK LOGIC ----
  const handleTick = useCallback(() => {
    setSecondsLeft((prev) => {
      if (prev <= 1) {
        // Phase terminée
        return 0;
      }
      return prev - 1;
    });
  }, []);

  // Surveiller secondsLeft pour détecter la fin de phase
  useEffect(() => {
    if (appPhase !== 'active') return;
    if (secondsLeft === 0 && isRunning) {
      handlePhaseEnd();
    }
  }, [secondsLeft, appPhase]);

  // ---- GESTION FIN DE PHASE ----
  const handlePhaseEnd = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);

    notificationAsync(NotificationFeedbackType.Success).catch(() => {});

    if (timerPhase === 'round') {
      // Fin de round → afficher le sheet de résultat
      setPendingResult(null);
      setPendingNotes('');
      setShowResultSheet(true);
    } else {
      // Fin de repos → démarrer le round suivant automatiquement
      startNextRound();
    }
  }, [timerPhase, currentRound, config]);

  // ---- DÉMARRER LE ROUND SUIVANT ----
  const startNextRound = useCallback(() => {
    setTimerPhase('round');
    const newRound = currentRound + 1;
    setCurrentRound(newRound);
    const duration = config.roundDuration * 60;
    setSecondsLeft(duration);
    startInterval();
  }, [currentRound, config]);

  // ---- DÉMARRER L'INTERVAL ----
  const startInterval = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(true);
    intervalRef.current = setInterval(() => {
      handleTick();
    }, 1000);
  }, [handleTick]);

  // ---- DÉMARRER LA SESSION ----
  const handleStart = useCallback(() => {
    logger.info('CombatTimer: session démarrée', {
      rounds: config.totalRounds,
      roundDuration: config.roundDuration,
      restDuration: config.restDuration,
    });
    setRoundsHistory([]);
    setCurrentRound(1);
    setTimerPhase('round');
    const duration = config.roundDuration * 60;
    setSecondsLeft(duration);
    setAppPhase('active');
    impactAsync(ImpactFeedbackStyle.Heavy).catch(() => {});
    // Démarrer le timer après que l'état soit mis à jour
    setTimeout(() => {
      startInterval();
    }, 100);
  }, [config, startInterval]);

  // ---- PLAY / PAUSE ----
  const handlePlayPause = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    if (isRunning) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsRunning(false);
    } else {
      startInterval();
    }
  }, [isRunning, startInterval]);

  // ---- STOP (retour setup) ----
  const handleStop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setIsRunning(false);
    setAppPhase('setup');
    setShowResultSheet(false);
    impactAsync(ImpactFeedbackStyle.Heavy).catch(() => {});
    logger.info('CombatTimer: session arrêtée manuellement');
  }, []);

  // ---- VALIDER RÉSULTAT DU ROUND ----
  const handleConfirmResult = useCallback(() => {
    impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
    const entry: RoundEntry = {
      roundNumber: currentRound,
      result: pendingResult,
      notes: pendingNotes,
    };
    const newHistory = [...roundsHistory, entry];
    setRoundsHistory(newHistory);
    setShowResultSheet(false);

    // Dernier round ?
    if (currentRound >= config.totalRounds) {
      // Fin de session
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsRunning(false);
      setAppPhase('summary');
      logger.info('CombatTimer: session terminée', { rounds: newHistory });
      return;
    }

    // Démarrer le repos
    if (config.restDuration > 0) {
      setTimerPhase('rest');
      const restSeconds = config.restDuration * 60;
      setSecondsLeft(restSeconds);
      startInterval();
    } else {
      // Pas de repos → round suivant direct
      startNextRound();
    }
  }, [currentRound, config, pendingResult, pendingNotes, roundsHistory, startInterval, startNextRound]);

  // ---- PROGRESSION GLOBALE ----
  const totalDuration =
    config.totalRounds * config.roundDuration * 60 +
    (config.totalRounds - 1) * config.restDuration * 60;

  const elapsedRounds = currentRound - 1;
  const elapsedSeconds =
    elapsedRounds * config.roundDuration * 60 +
    elapsedRounds * config.restDuration * 60 +
    (timerPhase === 'round'
      ? config.roundDuration * 60 - secondsLeft
      : config.roundDuration * 60 + (config.restDuration * 60 - secondsLeft));

  const overallProgress = totalDuration > 0 ? Math.min(elapsedSeconds / totalDuration, 1) : 0;

  // ---- COULEURS SELON PHASE ----
  const phaseColor = timerPhase === 'round' ? '#EF4444' : '#3B82F6';
  const phaseBg = timerPhase === 'round'
    ? (isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)')
    : (isDark ? 'rgba(59,130,246,0.12)' : 'rgba(59,130,246,0.08)');

  // ---- SUMMARY STATS ----
  const wins = roundsHistory.filter((r) => r.result === 'V').length;
  const losses = roundsHistory.filter((r) => r.result === 'D').length;
  const draws = roundsHistory.filter((r) => r.result === 'N').length;
  const noResult = roundsHistory.filter((r) => r.result === null).length;

  // ---- SELECTOR HELPERS ----
  const increment = (field: keyof Omit<SetupConfig, 'partnerName'>, max: number) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setConfig((prev) => ({ ...prev, [field]: Math.min(prev[field] + 1, max) }));
  };
  const decrement = (field: keyof Omit<SetupConfig, 'partnerName'>, min: number) => {
    impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
    setConfig((prev) => ({ ...prev, [field]: Math.max(prev[field] - 1, min) }));
  };

  // ============================================
  // RENDU
  // ============================================

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* ---- HEADER COMMUN ---- */}
      <View
        style={{
          paddingTop: insets.top + 8,
          paddingHorizontal: 16,
          paddingBottom: 12,
          flexDirection: 'row',
          alignItems: 'center',
          borderBottomWidth: 1,
          borderBottomColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)',
        }}
      >
        <TouchableOpacity
          onPress={() => {
            if (appPhase === 'active') {
              handleStop();
            } else {
              router.back();
            }
          }}
          style={{
            width: 38,
            height: 38,
            borderRadius: 19,
            backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <ChevronLeft size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={{ color: colors.text, fontSize: 17, fontWeight: '700', letterSpacing: 0.3 }}>
            Timer Salle
          </Text>
        </View>
        <View style={{ width: 38 }} />
      </View>

      {/* ============================================
          PHASE 1 — SETUP
      ============================================ */}
      {appPhase === 'setup' && (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 24,
            paddingBottom: insets.bottom + 40,
          }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Icon + titre */}
          <View style={{ alignItems: 'center', marginBottom: 32 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.1)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Swords size={34} color="#EF4444" />
            </View>
            <Text style={{ color: colors.text, fontSize: 22, fontWeight: '800' }}>
              Nouvelle session
            </Text>
            <Text style={{ color: colors.textSecondary, fontSize: 14, marginTop: 4 }}>
              Configure tes rounds avant de démarrer
            </Text>
          </View>

          {/* Durée du round */}
          <SelectorRow
            label="Durée du round"
            unit="min"
            value={config.roundDuration}
            onIncrement={() => increment('roundDuration', 10)}
            onDecrement={() => decrement('roundDuration', 1)}
            colors={colors}
            isDark={isDark}
            accentColor="#EF4444"
          />

          {/* Durée du repos */}
          <SelectorRow
            label="Repos entre rounds"
            unit="min"
            value={config.restDuration}
            onIncrement={() => increment('restDuration', 5)}
            onDecrement={() => decrement('restDuration', 0)}
            colors={colors}
            isDark={isDark}
            accentColor="#3B82F6"
            extra={config.restDuration === 0 ? 'Pas de repos' : undefined}
          />

          {/* Nombre de rounds */}
          <SelectorRow
            label="Nombre de rounds"
            unit="rounds"
            value={config.totalRounds}
            onIncrement={() => increment('totalRounds', 20)}
            onDecrement={() => decrement('totalRounds', 1)}
            colors={colors}
            isDark={isDark}
            accentColor={colors.primary}
          />

          {/* Nom du partenaire */}
          <View
            style={{
              backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
              borderRadius: 16,
              padding: 16,
              marginBottom: 16,
            }}
          >
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 13,
                fontWeight: '600',
                textTransform: 'uppercase',
                letterSpacing: 0.8,
                marginBottom: 10,
              }}
            >
              Partenaire (optionnel)
            </Text>
            <TextInput
              value={config.partnerName}
              onChangeText={(v) => setConfig((p) => ({ ...p, partnerName: v }))}
              placeholder="Nom du partenaire de sparring"
              placeholderTextColor={colors.textSecondary}
              style={{
                color: colors.text,
                fontSize: 16,
                paddingVertical: 8,
                paddingHorizontal: 12,
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
                borderRadius: 10,
              }}
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
          </View>

          {/* Résumé */}
          <View
            style={{
              backgroundColor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.05)',
              borderRadius: 14,
              padding: 14,
              marginBottom: 28,
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Timer size={18} color="#EF4444" />
            <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
              Durée totale estimée :{' '}
              <Text style={{ color: colors.text, fontWeight: '700' }}>
                {formatTime(
                  config.totalRounds * config.roundDuration * 60 +
                    (config.totalRounds - 1) * config.restDuration * 60
                )}
              </Text>
            </Text>
          </View>

          {/* Bouton Démarrer */}
          <TouchableOpacity
            onPress={handleStart}
            activeOpacity={0.85}
            style={{
              backgroundColor: '#EF4444',
              borderRadius: 18,
              paddingVertical: 18,
              alignItems: 'center',
              shadowColor: '#EF4444',
              shadowOffset: { width: 0, height: 6 },
              shadowOpacity: 0.4,
              shadowRadius: 12,
              elevation: 8,
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', letterSpacing: 0.5 }}>
              Démarrer
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* ============================================
          PHASE 2 — TIMER ACTIF
      ============================================ */}
      {appPhase === 'active' && (
        <View style={{ flex: 1, paddingBottom: insets.bottom + 20 }}>

          {/* Indicateur de round */}
          <View style={{ alignItems: 'center', marginTop: 20, marginBottom: 8 }}>
            <View
              style={{
                backgroundColor: phaseBg,
                paddingHorizontal: 20,
                paddingVertical: 8,
                borderRadius: 100,
              }}
            >
              <Text
                style={{
                  color: phaseColor,
                  fontSize: 13,
                  fontWeight: '800',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                {timerPhase === 'round' ? 'Round' : 'Repos'}
                {timerPhase === 'round' ? ` ${currentRound} / ${config.totalRounds}` : ''}
              </Text>
            </View>
            {config.partnerName ? (
              <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 6 }}>
                vs {config.partnerName}
              </Text>
            ) : null}
          </View>

          {/* Cercle central countdown */}
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
            <Animated.View
              style={{
                transform: [{ scale: pulseAnim }],
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {/* Anneau extérieur */}
              <View
                style={{
                  width: 260,
                  height: 260,
                  borderRadius: 130,
                  borderWidth: 6,
                  borderColor: phaseColor,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: phaseBg,
                  shadowColor: phaseColor,
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.35,
                  shadowRadius: 24,
                  elevation: 10,
                }}
              >
                {/* Temps restant */}
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 64,
                    fontWeight: '800',
                    letterSpacing: -2,
                    fontVariant: ['tabular-nums'],
                  }}
                >
                  {formatTime(secondsLeft)}
                </Text>
                <Text
                  style={{
                    color: phaseColor,
                    fontSize: 14,
                    fontWeight: '700',
                    letterSpacing: 3,
                    textTransform: 'uppercase',
                    marginTop: 4,
                  }}
                >
                  {timerPhase === 'round' ? 'ROUND' : 'REPOS'}
                </Text>

                {/* Petite info round dans le cercle */}
                {timerPhase === 'round' && (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 13,
                      marginTop: 8,
                      fontWeight: '600',
                    }}
                  >
                    {currentRound} / {config.totalRounds}
                  </Text>
                )}
              </View>
            </Animated.View>
          </View>

          {/* Barre de progression globale */}
          <View style={{ paddingHorizontal: 24, marginBottom: 24 }}>
            <View
              style={{
                height: 6,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: 6,
                  width: `${overallProgress * 100}%`,
                  backgroundColor: phaseColor,
                  borderRadius: 3,
                }}
              />
            </View>
            <Text
              style={{
                color: colors.textSecondary,
                fontSize: 12,
                textAlign: 'center',
                marginTop: 6,
              }}
            >
              {Math.round(overallProgress * 100)}% de la session
            </Text>
          </View>

          {/* Contrôles */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 20,
              paddingHorizontal: 24,
            }}
          >
            {/* Stop */}
            <TouchableOpacity
              onPress={handleStop}
              activeOpacity={0.8}
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Square size={22} color={colors.textSecondary} />
            </TouchableOpacity>

            {/* Play / Pause — bouton principal */}
            <TouchableOpacity
              onPress={handlePlayPause}
              activeOpacity={0.85}
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: phaseColor,
                alignItems: 'center',
                justifyContent: 'center',
                shadowColor: phaseColor,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 12,
                elevation: 8,
              }}
            >
              {isRunning ? (
                <Pause size={30} color="#fff" />
              ) : (
                <Play size={30} color="#fff" fill="#fff" />
              )}
            </TouchableOpacity>

            {/* Reset round */}
            <TouchableOpacity
              onPress={() => {
                impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
                if (intervalRef.current) clearInterval(intervalRef.current);
                setIsRunning(false);
                const duration =
                  timerPhase === 'round'
                    ? config.roundDuration * 60
                    : config.restDuration * 60;
                setSecondsLeft(duration);
              }}
              activeOpacity={0.8}
              style={{
                width: 58,
                height: 58,
                borderRadius: 29,
                backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <RotateCcw size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Sheet résultat du round (Modal) */}
          <Modal
            visible={showResultSheet}
            transparent
            animationType="slide"
            onRequestClose={() => {}}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
              style={{ flex: 1, justifyContent: 'flex-end' }}
            >
              <View
                style={{
                  backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  paddingHorizontal: 24,
                  paddingTop: 20,
                  paddingBottom: insets.bottom + 24,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: -4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 16,
                  elevation: 20,
                }}
              >
                {/* Poignée */}
                <View
                  style={{
                    width: 36,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: isDark ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)',
                    alignSelf: 'center',
                    marginBottom: 20,
                  }}
                />

                <Text
                  style={{
                    color: isDark ? '#fff' : '#000',
                    fontSize: 18,
                    fontWeight: '800',
                    textAlign: 'center',
                    marginBottom: 4,
                  }}
                >
                  Round {currentRound} terminé
                </Text>
                <Text
                  style={{
                    color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                    fontSize: 14,
                    textAlign: 'center',
                    marginBottom: 24,
                  }}
                >
                  Quel a été le résultat ?
                </Text>

                {/* V / D / N */}
                <View
                  style={{
                    flexDirection: 'row',
                    gap: 12,
                    marginBottom: 20,
                  }}
                >
                  {(['V', 'D', 'N'] as RoundResult[]).map((r) => {
                    const isSelected = pendingResult === r;
                    const labelMap: Record<NonNullable<RoundResult>, string> = {
                      V: 'Victoire',
                      D: 'Défaite',
                      N: 'Nul',
                    };
                    const colorMap: Record<NonNullable<RoundResult>, string> = {
                      V: '#22C55E',
                      D: '#EF4444',
                      N: '#F59E0B',
                    };
                    const col = colorMap[r!];
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => {
                          impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
                          setPendingResult(isSelected ? null : r);
                        }}
                        activeOpacity={0.8}
                        style={{
                          flex: 1,
                          paddingVertical: 16,
                          borderRadius: 14,
                          alignItems: 'center',
                          backgroundColor: isSelected
                            ? col
                            : isDark
                            ? 'rgba(255,255,255,0.07)'
                            : 'rgba(0,0,0,0.05)',
                          borderWidth: isSelected ? 0 : 1.5,
                          borderColor: isDark
                            ? 'rgba(255,255,255,0.1)'
                            : 'rgba(0,0,0,0.08)',
                        }}
                      >
                        <Text
                          style={{
                            color: isSelected ? '#fff' : col,
                            fontSize: 20,
                            fontWeight: '800',
                          }}
                        >
                          {r}
                        </Text>
                        <Text
                          style={{
                            color: isSelected
                              ? 'rgba(255,255,255,0.85)'
                              : isDark
                              ? 'rgba(255,255,255,0.5)'
                              : 'rgba(0,0,0,0.5)',
                            fontSize: 11,
                            fontWeight: '600',
                            marginTop: 3,
                          }}
                        >
                          {labelMap[r!]}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Notes */}
                <TextInput
                  value={pendingNotes}
                  onChangeText={setPendingNotes}
                  placeholder="Note rapide (optionnel)…"
                  placeholderTextColor={
                    isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.35)'
                  }
                  style={{
                    color: isDark ? '#fff' : '#000',
                    fontSize: 15,
                    paddingVertical: 12,
                    paddingHorizontal: 14,
                    backgroundColor: isDark
                      ? 'rgba(255,255,255,0.07)'
                      : 'rgba(0,0,0,0.05)',
                    borderRadius: 12,
                    marginBottom: 20,
                  }}
                  returnKeyType="done"
                  onSubmitEditing={Keyboard.dismiss}
                />

                {/* Bouton Suivant / Terminer */}
                <TouchableOpacity
                  onPress={handleConfirmResult}
                  activeOpacity={0.85}
                  style={{
                    backgroundColor:
                      currentRound >= config.totalRounds ? '#22C55E' : '#EF4444',
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                    shadowColor:
                      currentRound >= config.totalRounds ? '#22C55E' : '#EF4444',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.4,
                    shadowRadius: 10,
                    elevation: 6,
                  }}
                >
                  <Text
                    style={{
                      color: '#fff',
                      fontSize: 17,
                      fontWeight: '800',
                    }}
                  >
                    {currentRound >= config.totalRounds
                      ? 'Terminer la session'
                      : config.restDuration > 0
                      ? `Repos — ${config.restDuration} min`
                      : 'Round suivant'}
                  </Text>
                </TouchableOpacity>
              </View>
            </KeyboardAvoidingView>
          </Modal>
        </View>
      )}

      {/* ============================================
          PHASE 3 — SUMMARY
      ============================================ */}
      {appPhase === 'summary' && (
        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingTop: 28,
            paddingBottom: insets.bottom + 40,
          }}
          showsVerticalScrollIndicator={false}
        >
          {/* Titre */}
          <View style={{ alignItems: 'center', marginBottom: 28 }}>
            <View
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: 'rgba(34,197,94,0.15)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 14,
              }}
            >
              <Check size={34} color="#22C55E" />
            </View>
            <Text
              style={{
                color: colors.text,
                fontSize: 24,
                fontWeight: '800',
                marginBottom: 4,
              }}
            >
              Session terminée !
            </Text>
            {config.partnerName ? (
              <Text style={{ color: colors.textSecondary, fontSize: 15 }}>
                vs {config.partnerName}
              </Text>
            ) : null}
          </View>

          {/* Stats globales */}
          <View
            style={{
              flexDirection: 'row',
              gap: 12,
              marginBottom: 20,
            }}
          >
            <StatCard label="Rounds" value={roundsHistory.length} color={colors.primary} colors={colors} isDark={isDark} />
            <StatCard label="Victoires" value={wins} color="#22C55E" colors={colors} isDark={isDark} />
            <StatCard label="Défaites" value={losses} color="#EF4444" colors={colors} isDark={isDark} />
            <StatCard label="Nuls" value={draws} color="#F59E0B" colors={colors} isDark={isDark} />
          </View>

          {/* Détail par round */}
          {roundsHistory.length > 0 && (
            <View
              style={{
                backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 24,
              }}
            >
              <Text
                style={{
                  color: colors.textSecondary,
                  fontSize: 12,
                  fontWeight: '700',
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  padding: 14,
                  paddingBottom: 10,
                }}
              >
                Détail des rounds
              </Text>
              {roundsHistory.map((entry, idx) => {
                const resultColorMap: Record<string, string> = {
                  V: '#22C55E',
                  D: '#EF4444',
                  N: '#F59E0B',
                };
                const resultLabelMap: Record<string, string> = {
                  V: 'Victoire',
                  D: 'Défaite',
                  N: 'Nul',
                };
                const col = entry.result ? resultColorMap[entry.result] : colors.textSecondary;
                const label = entry.result ? resultLabelMap[entry.result] : '—';
                return (
                  <View
                    key={idx}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 11,
                      borderTopWidth: idx > 0 ? 1 : 0,
                      borderTopColor: isDark
                        ? 'rgba(255,255,255,0.06)'
                        : 'rgba(0,0,0,0.06)',
                    }}
                  >
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: isDark
                          ? 'rgba(255,255,255,0.08)'
                          : 'rgba(0,0,0,0.06)',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 12,
                      }}
                    >
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 12,
                          fontWeight: '700',
                        }}
                      >
                        {entry.roundNumber}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={{ color: col, fontSize: 14, fontWeight: '700' }}
                      >
                        {label}
                      </Text>
                      {entry.notes ? (
                        <Text
                          style={{
                            color: colors.textSecondary,
                            fontSize: 12,
                            marginTop: 2,
                          }}
                          numberOfLines={1}
                        >
                          {entry.notes}
                        </Text>
                      ) : null}
                    </View>
                    {entry.result && (
                      <Text
                        style={{
                          color: col,
                          fontSize: 18,
                          fontWeight: '800',
                        }}
                      >
                        {entry.result}
                      </Text>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* Bouton Enregistrer */}
          <TouchableOpacity
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Medium).catch(() => {});
              router.push('/add-combat-session');
            }}
            activeOpacity={0.85}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 16,
              paddingVertical: 17,
              alignItems: 'center',
              marginBottom: 14,
              shadowColor: colors.primary,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 10,
              elevation: 6,
            }}
          >
            <Text
              style={{ color: '#fff', fontSize: 17, fontWeight: '800' }}
            >
              Enregistrer la séance
            </Text>
          </TouchableOpacity>

          {/* Bouton Nouvelle session */}
          <TouchableOpacity
            onPress={() => {
              impactAsync(ImpactFeedbackStyle.Light).catch(() => {});
              setRoundsHistory([]);
              setCurrentRound(1);
              setTimerPhase('round');
              setIsRunning(false);
              setAppPhase('setup');
            }}
            activeOpacity={0.8}
            style={{
              backgroundColor: isDark
                ? 'rgba(255,255,255,0.08)'
                : 'rgba(0,0,0,0.06)',
              borderRadius: 16,
              paddingVertical: 17,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: colors.text,
                fontSize: 17,
                fontWeight: '700',
              }}
            >
              Nouvelle session
            </Text>
          </TouchableOpacity>
        </ScrollView>
      )}
    </View>
  );
}

// ============================================
// SOUS-COMPOSANTS
// ============================================

interface SelectorRowProps {
  label: string;
  unit: string;
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  colors: any;
  isDark: boolean;
  accentColor: string;
  extra?: string;
}

function SelectorRow({
  label,
  unit,
  value,
  onIncrement,
  onDecrement,
  colors,
  isDark,
  accentColor,
  extra,
}: SelectorRowProps) {
  return (
    <View
      style={{
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
      }}
    >
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 13,
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 14,
        }}
      >
        {label}
      </Text>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Bouton − */}
        <TouchableOpacity
          onPress={onDecrement}
          activeOpacity={0.7}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Minus size={20} color={colors.text} />
        </TouchableOpacity>

        {/* Valeur */}
        <View style={{ alignItems: 'center' }}>
          <Text
            style={{
              color: accentColor,
              fontSize: 42,
              fontWeight: '800',
              lineHeight: 48,
            }}
          >
            {value}
          </Text>
          <Text
            style={{
              color: colors.textSecondary,
              fontSize: 13,
              fontWeight: '600',
            }}
          >
            {extra ?? unit}
          </Text>
        </View>

        {/* Bouton + */}
        <TouchableOpacity
          onPress={onIncrement}
          activeOpacity={0.7}
          style={{
            width: 48,
            height: 48,
            borderRadius: 24,
            backgroundColor: isDark
              ? 'rgba(255,255,255,0.1)'
              : 'rgba(0,0,0,0.08)',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={20} color={colors.text} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  color: string;
  colors: any;
  isDark: boolean;
}

function StatCard({ label, value, color, colors, isDark }: StatCardProps) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
        borderRadius: 14,
        paddingVertical: 16,
        alignItems: 'center',
      }}
    >
      <Text
        style={{
          color: color,
          fontSize: 28,
          fontWeight: '800',
          lineHeight: 32,
        }}
      >
        {value}
      </Text>
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: 11,
          fontWeight: '600',
          marginTop: 3,
        }}
      >
        {label}
      </Text>
    </View>
  );
}
