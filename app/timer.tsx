/**
 * Chronos YOROI (refonte v2) : repos de musculation, rounds de combat, Tabata, EMOM, AMRAP et au temps.
 * Reglage clair (une phase par ligne, resume de la seance), puis ecran plein lisible de loin :
 * phase en clair, temps restant en tres gros, phase suivante, une couleur par phase.
 * Moteur de temps a horodatage (lib/v2/carnet/useChronoEngine) : regulier a la seconde pres,
 * juste au retour de l'arriere-plan. Claquettes de bois a 10 s de la fin de chaque round.
 * Parametre facultatif : mode (musculation, combat, tabata, emom, amrap, fortime).
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, DeviceEventEmitter, ScrollView, Vibration, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';
import { Sheet } from '@/components/yoroi/v2/seance/Sheet';
import { P, Press, CIcon, IconBtn, ScreenHead, BigButton, Field } from '@/components/yoroi/v2/carnet/ui';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { ActiveChrono } from '@/components/yoroi/v2/carnet/chrono/ActiveChrono';
import { FinishSheet, SettingRow, ToggleRow } from '@/components/yoroi/v2/carnet/chrono/parts';
import { BigAdjust, ChoiceGrid, ChronoBanner, DOCK_SPACE, HugeButton, Legend, ModeCard, ReprendreCard, SetupBlock, SetupHero, StartDock } from '@/components/yoroi/v2/carnet/chrono/setup';
import {
  AMRAP_PRESETS, COMBAT_PRESETS, COMBAT_PRESET_ORDER, COMBAT_SETTINGS_KEY, EMOM_PRESETS, FORTIME_PRESETS, MODES, MUSCU_PRESETS, PHASE_COLORS, PREPA_SECONDS, TABATA_PRESETS,
  amrapPhases, emomPhases, forTimePhases, loadClapEnabled, musculationPhases, roundPhases, roundsFaits, roundsSummary, saveClapEnabled, sportForMode, tabataPhases,
} from '@/lib/v2/carnet/chrono';
import type { CombatPreset, TimerMode } from '@/lib/v2/carnet/chrono';
import { useChronoEngine, totalSeconds } from '@/lib/v2/carnet/useChronoEngine';
import type { ChronoEvent, ChronoPhase } from '@/lib/v2/carnet/useChronoEngine';
import { clock, humanSeconds } from '@/lib/v2/carnet/format';
import { soundManager } from '@/lib/sounds';
import { roninModeService } from '@/lib/roninMode';
import { calculateSessionLoad, saveTrainingLoad } from '@/lib/trainingLoadService';
import { useActiviteChrono } from '@/lib/v2/widgets/activiteChrono';
import { timerNotifications } from '@/lib/timerNotifications';
import { flashService } from '@/lib/flashService';
import { backgroundTaskService } from '@/lib/backgroundTaskService';
import { keepAwakeOn, keepAwakeOff } from '@/lib/keepAwakeSafe';
import logger from '@/lib/security/logger';
import { useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';

type SeriesItem = { seriesNumber: number; timestamp: Date; restDuration: number; reps?: number; weight?: number };

const START_LABEL: Record<TimerMode, string> = {
  musculation: 'Série finie',
  combat: 'Lancer les rounds',
  tabata: 'Lancer le Tabata',
  emom: 'Lancer le chrono',
  amrap: 'Lancer le chrono',
  fortime: 'Lancer le chrono',
};

const MODE_IDS: TimerMode[] = ['musculation', 'combat', 'tabata', 'emom', 'amrap', 'fortime'];

/** Vague 45 : le dernier chrono lance (mode, resume en clair et reglages), pour « Reprendre » en haut de la liste */
const DERNIER_KEY = 'yoroi_chrono_dernier_v1';
type DernierChrono = { mode: TimerMode; resume: string; r: Record<string, number> };

function haptic(type: 'light' | 'medium' | 'heavy' = 'medium') {
  const style = type === 'light' ? ImpactFeedbackStyle.Light : type === 'heavy' ? ImpactFeedbackStyle.Heavy : ImpactFeedbackStyle.Medium;
  impactAsync(style).catch(() => {});
}

function safe(fn: () => void) {
  try {
    fn();
  } catch {
    // jamais bloquer le chrono pour un son, une vibration ou un flash
  }
}

export default function TimerScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ mode?: string; test?: string }>();
  // Studio (mode createur seulement) : ?test=studio regle 3 rounds de 15 s pour entendre claquettes et cloche,
  // sans toucher aux reglages enregistres de l'utilisateur
  const { isCreator } = useCreatorMode();
  const studioTest = useRef(params.test === 'studio' && isCreator);


  // Mode epure (ancien mode Ronin) : chiffres geants, le reste masque pendant le chrono
  const [focusMode, setFocusMode] = useState(false);
  useEffect(() => {
    roninModeService.isActive().then(setFocusMode).catch(() => {});
  }, []);

  const [mode, setMode] = useState<TimerMode>(MODE_IDS.includes(params.mode as TimerMode) ? (params.mode as TimerMode) : 'musculation');
  // sans mode demande, on montre d'abord la liste des chronos expliques
  const [picked, setPicked] = useState(MODE_IDS.includes(params.mode as TimerMode));
  const [prepa, setPrepa] = useState(PREPA_SECONDS);
  const [clapOn, setClapOn] = useState(true);
  const clapRef = useRef(true);
  clapRef.current = clapOn;
  useEffect(() => {
    loadClapEnabled().then(setClapOn).catch(() => {});
  }, []);

  // Musculation
  const [musculationRest, setMusculationRest] = useState(90);
  const [seriesCount, setSeriesCount] = useState(0);
  const [seriesHistory, setSeriesHistory] = useState<SeriesItem[]>([]);
  const [showRepsWeight, setShowRepsWeight] = useState(false);
  const [trackRepsWeight, setTrackRepsWeight] = useState(false);
  const [lastReps, setLastReps] = useState(10);
  const [lastWeight, setLastWeight] = useState(20);

  // Combat
  const [combatPreset, setCombatPreset] = useState<CombatPreset>('mma');
  const [roundDuration, setRoundDuration] = useState(COMBAT_PRESETS.mma.roundTime);
  const [restDuration, setRestDuration] = useState(COMBAT_PRESETS.mma.restTime);
  const [totalRounds, setTotalRounds] = useState(COMBAT_PRESETS.mma.rounds);

  // Tabata
  const [tabataRounds, setTabataRounds] = useState(8);
  const [tabataWork, setTabataWork] = useState(20);
  const [tabataRest, setTabataRest] = useState(10);
  const [tabataSets, setTabataSets] = useState(1);
  const [tabataRestBetweenSets, setTabataRestBetweenSets] = useState(60);

  // EMOM
  const [emomDuration, setEmomDuration] = useState(10);
  const [emomExercises, setEmomExercises] = useState<string[]>(['10 burpees', '15 squats', '20 abdos']);

  // AMRAP
  const [amrapDuration, setAmrapDuration] = useState(12 * 60);
  const [amrapRoundsCompleted, setAmrapRoundsCompleted] = useState(0);
  const [amrapExercises, setAmrapExercises] = useState<string[]>(['5 tractions', '10 pompes', '15 squats']);

  // Au temps
  const [forTimeElapsed, setForTimeElapsed] = useState(0);
  const [forTimeCap, setForTimeCap] = useState(15 * 60);
  const [forTimeExercises, setForTimeExercises] = useState<string[]>(['21-15-9', 'Thrusters', 'Tractions']);

  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [showFinish, setShowFinish] = useState(false);
  const [rpe, setRpe] = useState<number | null>(null);
  const [editList, setEditList] = useState<'emom' | 'amrap' | 'fortime' | null>(null);
  const [editText, setEditText] = useState('');
  const [dernier, setDernier] = useState<DernierChrono | null>(null);
  useEffect(() => {
    AsyncStorage.getItem(DERNIER_KEY)
      .then((raw) => {
        if (!raw) return;
        const d = JSON.parse(raw) as DernierChrono;
        if (d && MODE_IDS.includes(d.mode) && typeof d.resume === 'string') setDernier(d);
      })
      .catch(() => {});
  }, []);

  // Valeurs lues par les evenements du moteur
  const modeRef = useRef(mode);
  const notifProposee = useRef(false);
  modeRef.current = mode;
  const trackRepsWeightRef = useRef(trackRepsWeight);
  trackRepsWeightRef.current = trackRepsWeight;
  const seriesCountRef = useRef(seriesCount);
  seriesCountRef.current = seriesCount;
  // repos reellement fait (moins ou plus 15 s compris), note dans l'historique des series
  const lastRestRef = useRef(90);
  const finishTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // fin du chrono (hors repos de musculation) : le temps total s'arrete la, meme si le bilan reste ouvert
  const endedAtRef = useRef<number | null>(null);
  // rounds de combat : temps passe dans chaque phase (par index) et dernier « Passer », pour le bilan des rounds faits
  const phaseMsRef = useRef<Map<number, number>>(new Map());
  const skipMsRef = useRef<{ i: number; ms: number } | null>(null);
  const [roundsFaitsN, setRoundsFaitsN] = useState<number | null>(null);
  const victoryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const engineRef = useRef<ReturnType<typeof useChronoEngine> | null>(null);

  // ─── Sons, vibrations et suites de chaque evenement du moteur ─────────────
  const onEvent = useCallback((e: ChronoEvent) => {
    const m = modeRef.current;
    switch (e.type) {
      case 'phase': {
        if (!e.first && e.index > 0) {
          // la phase precedente : entiere si elle a fini seule, sinon le temps note au moment de « Passer »
          const prev = engineRef.current?.phases[e.index - 1];
          const sk = skipMsRef.current;
          if (prev) phaseMsRef.current.set(e.index - 1, sk && sk.i === e.index - 1 ? sk.ms : prev.duration * 1000);
          skipMsRef.current = null;
        }
        if (!e.live) return;
        const cue = e.phase.cue;
        safe(() => {
          if (cue === 'gong') soundManager.playGong();
          else if (cue === 'bell') soundManager.playBell();
          else if (cue === 'go') soundManager.playWizz();
          else if (cue === 'beep') soundManager.playBeep();
        });
        if (e.first) haptic('medium');
        else {
          haptic('heavy');
          safe(() => Vibration.vibrate([0, 400, 150, 400]));
        }
        return;
      }
      case 'clap':
        if (!clapRef.current) return;
        safe(() => soundManager.playClap());
        haptic('light');
        return;
      case 'countdown':
        safe(() => soundManager.playFinalCountdown(e.n));
        haptic('heavy');
        return;
      case 'warn':
        safe(() => soundManager.playCountdownTick(10));
        haptic('light');
        return;
      case 'finish': {
        safe(() => backgroundTaskService.end());
        timerNotifications.cancelNotification().catch(() => {});
        if (m === 'combat' && engineRef.current) {
          phaseMsRef.current.set(e.index, engineRef.current.elapsedMs());
          setRoundsFaitsN(roundsFaits(engineRef.current.phases, phaseMsRef.current));
        }
        if (m === 'fortime') {
          const el = engineRef.current ? Math.floor(engineRef.current.elapsedMs() / 1000) : 0;
          setForTimeElapsed(Math.min(el, e.phase.duration));
        }
        if (e.live) {
          safe(() => {
            if (m === 'musculation') soundManager.playWizz();
            else if (m === 'combat') {
              // cloche de fin du dernier round, la fanfare une fois les trois coups passes
              soundManager.playBell();
              if (victoryTimer.current) clearTimeout(victoryTimer.current);
              victoryTimer.current = setTimeout(() => safe(() => soundManager.playVictory()), 2000);
            } else soundManager.playVictory();
            Vibration.vibrate([0, 500, 200, 500, 200, 500]);
            flashService.alarm();
          });
          haptic('heavy');
        }
        if (m === 'musculation') {
          lastRestRef.current = Math.round(engineRef.current ? engineRef.current.elapsedMs() / 1000 : e.phase.duration);
          if (trackRepsWeightRef.current) setShowRepsWeight(true);
          else setSeriesHistory((prev) => [...prev, { seriesNumber: seriesCountRef.current, timestamp: new Date(), restDuration: lastRestRef.current }]);
        } else {
          endedAtRef.current = Date.now();
          if (finishTimer.current) clearTimeout(finishTimer.current);
          finishTimer.current = setTimeout(() => setShowFinish(true), 900);
        }
        return;
      }
      default:
        return;
    }
  }, []);

  const engine = useChronoEngine(onEvent);
  engineRef.current = engine;
  // « Passer » note d'abord le temps fait dans la phase (bilan des rounds reellement faits)
  const engineAffiche = useMemo(
    () => ({
      ...engine,
      skip: () => {
        skipMsRef.current = { i: engine.index, ms: engine.elapsedMs() };
        engine.skip();
      },
    }),
    [engine],
  );
  // Live Activity (ecran verrouille et Dynamic Island) : round, phase et compte a rebours, seulement si le module natif existe
  useActiviteChrono(engine, MODES.find((x) => x.id === mode)?.label ?? 'Chrono');
  const status = engine.status;
  // Lien de widget recu alors que le chrono est deja ouvert (yoroi://w/timer?mode=combat) : passe au mode demande,
  // seulement si aucun chrono ne tourne ; les reglages des rounds restent les derniers utilises
  useEffect(() => {
    const m = params.mode as TimerMode;
    if (!MODE_IDS.includes(m) || (status !== 'idle' && status !== 'finished')) return;
    setMode(m);
    setPicked(true);
  }, [params.mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reglages des rounds memorises d'une seance a l'autre
  const combatSettingsLoaded = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(COMBAT_SETTINGS_KEY)
      .then((raw) => {
        if (!raw) return;
        try {
          const s = JSON.parse(raw);
          if (s.preset && COMBAT_PRESETS[s.preset as CombatPreset]) setCombatPreset(s.preset);
          if (Number.isFinite(s.roundDuration)) setRoundDuration(s.roundDuration);
          if (Number.isFinite(s.restDuration)) setRestDuration(s.restDuration);
          if (Number.isFinite(s.totalRounds)) setTotalRounds(s.totalRounds);
          if (Number.isFinite(s.prepa)) setPrepa(s.prepa);
        } catch {
          // reglages illisibles : valeurs par defaut
        }
      })
      .catch(() => {})
      .finally(() => {
        combatSettingsLoaded.current = true;
        if (studioTest.current) {
          setRoundDuration(15);
          setRestDuration(10);
          setTotalRounds(3);
          setPrepa(3);
        }
      });
  }, []);
  useEffect(() => {
    if (!combatSettingsLoaded.current || studioTest.current) return;
    AsyncStorage.setItem(COMBAT_SETTINGS_KEY, JSON.stringify({ preset: combatPreset, roundDuration, restDuration, totalRounds, prepa }))
      .then(() => DeviceEventEmitter.emit('YOROI_CHRONOS_CHANGED'))
      .catch(() => {});
  }, [combatPreset, roundDuration, restDuration, totalRounds, prepa]);

  // Sons prepares a l'ouverture, nettoyes en quittant. Aucune demande de notification ici :
  // elle n'arrive qu'au lancement du chrono, quand l'alerte de fin en a besoin.
  useEffect(() => {
    soundManager.initialize();
    return () => {
      soundManager.cleanup();
      keepAwakeOff();
      if (finishTimer.current) clearTimeout(finishTimer.current);
      if (victoryTimer.current) clearTimeout(victoryTimer.current);
      timerNotifications.cancelNotification().catch(() => {});
      safe(() => backgroundTaskService.end());
    };
  }, []);

  // Ecran allume et temps d'arriere-plan tant que le chrono tourne
  useEffect(() => {
    if (status === 'running') {
      // Premier lancement du chrono sur cet ecran : proposition de l'alerte de fin (fenetre maison),
      // seulement si ce n'est ni accorde ni refuse
      if (!notifProposee.current && !studioTest.current) {
        notifProposee.current = true;
        void timerNotifications.proposerAuLancement(modeRef.current);
      }
      keepAwakeOn();
      safe(() => backgroundTaskService.begin());
    } else {
      if (status !== 'paused') keepAwakeOff();
      safe(() => backgroundTaskService.end());
    }
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  // Notification de fin de phase : planifiee seulement quand l'app passe en arriere-plan
  // (au premier plan, les sons de l'app suffisent et rien ne sonne en double)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      const eng = engineRef.current;
      if (s === 'active') {
        timerNotifications.cancelNotification().catch(() => {});
        return;
      }
      const endsAt = eng?.phaseEndsAt();
      if (endsAt && endsAt > Date.now() + 1000) {
        timerNotifications.scheduleTimerEndNotification(modeRef.current, endsAt).catch((err) => logger.warn('Notification chrono :', err));
      }
    });
    return () => sub.remove();
  }, []);

  const applyCombatPreset = (preset: CombatPreset) => {
    const config = COMBAT_PRESETS[preset];
    setCombatPreset(preset);
    setRoundDuration(config.roundTime);
    setRestDuration(config.restTime);
    setTotalRounds(config.rounds);
    haptic('light');
  };

  // Sequence de phases du mode choisi
  const buildPhases = (series = seriesCount): ChronoPhase[] => {
    switch (mode) {
      case 'musculation':
        return musculationPhases(musculationRest, series);
      case 'combat':
        // fin de chaque round : la cloche (ding ding ding) au lieu du gong ; sans repos, elle lance aussi le round suivant
        return roundPhases({ rounds: totalRounds, round: roundDuration, rest: restDuration, prepa, clap: true }).map((p) =>
          p.kind === 'repos' || (p.kind === 'effort' && (p.step ?? 1) > 1 && restDuration <= 0) ? { ...p, cue: 'bell' as const } : p
        );
      case 'tabata':
        return tabataPhases({ rounds: tabataRounds, work: tabataWork, rest: tabataRest, sets: tabataSets, setRest: tabataRestBetweenSets, prepa });
      case 'emom':
        return emomPhases({ minutes: emomDuration, exercises: emomExercises, prepa });
      case 'amrap':
        return amrapPhases({ duration: amrapDuration, prepa });
      default:
        return forTimePhases({ cap: forTimeCap, prepa });
    }
  };
  const preview = useMemo(() => buildPhases(), [mode, musculationRest, seriesCount, totalRounds, roundDuration, restDuration, prepa, tabataRounds, tabataWork, tabataRest, tabataSets, tabataRestBetweenSets, emomDuration, emomExercises, amrapDuration, forTimeCap]); // eslint-disable-line react-hooks/exhaustive-deps

  const startTimer = () => {
    haptic('medium');
    setShowFinish(false);
    let series = seriesCount;
    if (mode === 'musculation') {
      series = seriesCount + 1;
      setSeriesCount(series);
    }
    if (mode === 'amrap') setAmrapRoundsCompleted(0);
    if (mode === 'fortime') setForTimeElapsed(0);
    if (!workoutStartTime || mode !== 'musculation') setWorkoutStartTime(new Date());
    endedAtRef.current = null;
    phaseMsRef.current = new Map();
    skipMsRef.current = null;
    setRoundsFaitsN(null);
    engine.start(buildPhases(series));
    // vague 45 : garde ce chrono pour « Reprendre » (resume en clair et reglages du mode)
    const resume =
      mode === 'musculation' ? `Repos ${humanSeconds(musculationRest)}`
      : mode === 'combat' ? `Rounds ${totalRounds} x ${humanSeconds(roundDuration)}`
      : mode === 'tabata' ? `Tabata ${tabataRounds * tabataSets} x ${tabataWork} s`
      : mode === 'emom' ? `Chaque minute, ${emomDuration} min`
      : mode === 'amrap' ? `Maximum de tours, ${humanSeconds(amrapDuration)}`
      : `Contre la montre, ${humanSeconds(forTimeCap)} au plus`;
    const d: DernierChrono = { mode, resume, r: { musculationRest, totalRounds, roundDuration, restDuration, tabataRounds, tabataWork, tabataRest, tabataSets, emomDuration, amrapDuration, forTimeCap, prepa } };
    setDernier(d);
    AsyncStorage.setItem(DERNIER_KEY, JSON.stringify(d))
      .then(() => DeviceEventEmitter.emit('YOROI_CHRONOS_CHANGED'))
      .catch(() => {});
  };

  const resetTimer = () => {
    haptic('medium');
    if (finishTimer.current) clearTimeout(finishTimer.current);
    engine.stop();
    timerNotifications.cancelNotification().catch(() => {});
    if (mode === 'amrap') setAmrapRoundsCompleted(0);
  };

  const resetSeriesCount = () => {
    setSeriesCount(0);
    setSeriesHistory([]);
    setWorkoutStartTime(null);
    haptic('light');
  };

  const handleSaveRepsWeight = () => {
    setSeriesHistory((prev) => [...prev, { seriesNumber: seriesCount, timestamp: new Date(), restDuration: lastRestRef.current, reps: lastReps, weight: lastWeight }]);
    setShowRepsWeight(false);
    haptic('light');
  };

  const handleSkipRepsWeight = () => {
    setSeriesHistory((prev) => [...prev, { seriesNumber: seriesCount, timestamp: new Date(), restDuration: lastRestRef.current }]);
    setShowRepsWeight(false);
    haptic('light');
  };

  const workoutSeconds = () => (workoutStartTime ? Math.max(0, Math.floor(((endedAtRef.current ?? Date.now()) - workoutStartTime.getTime()) / 1000)) : 0);
  const workoutMinutes = () => Math.max(1, Math.round(workoutSeconds() / 60));

  const finishLines = (): { label: string; value: string }[] => {
    const lines = [{ label: 'Temps total', value: clock(workoutSeconds()) }];
    if (mode === 'musculation') lines.push({ label: 'Séries', value: String(seriesCount) });
    if (mode === 'combat') lines.push({ label: 'Rounds', value: roundsFaitsN !== null && roundsFaitsN < totalRounds ? `${roundsFaitsN} sur ${totalRounds}` : String(totalRounds) });
    if (mode === 'tabata') lines.push({ label: 'Rounds', value: `${tabataRounds}${tabataSets > 1 ? ` x ${tabataSets}` : ''}` });
    if (mode === 'emom') lines.push({ label: 'Minutes', value: String(emomDuration) });
    if (mode === 'amrap') lines.push({ label: 'Tours faits', value: String(amrapRoundsCompleted) });
    if (mode === 'fortime') lines.push({ label: 'Ton temps', value: clock(forTimeElapsed) });
    return lines;
  };

  const sessionNotes = (): string => {
    const m = MODES.find((x) => x.id === mode)?.label ?? 'Chrono';
    if (mode === 'musculation') {
      const detail = seriesHistory.filter((s) => s.reps || s.weight).map((s) => `${s.reps ?? '?'} x ${s.weight ?? '?'} kg`).join(', ');
      return `${m} : ${seriesCount} séries${detail ? ` (${detail})` : ''}`;
    }
    if (mode === 'combat') {
      const faits = roundsFaitsN !== null && roundsFaitsN < totalRounds ? `, ${roundsFaitsN} fait${roundsFaitsN > 1 ? 's' : ''}` : '';
      return `${COMBAT_PRESETS[combatPreset].name} : ${roundsSummary(totalRounds, roundDuration, restDuration)}${faits}`;
    }
    if (mode === 'tabata') return `Tabata : ${tabataRounds} rounds ${tabataWork} s et ${tabataRest} s${tabataSets > 1 ? `, ${tabataSets} sets` : ''}`;
    if (mode === 'emom') return `Chaque minute, ${emomDuration} min : ${emomExercises.join(', ')}`;
    if (mode === 'amrap') return `Maximum de tours en ${humanSeconds(amrapDuration)} : ${amrapRoundsCompleted} tours (${amrapExercises.join(', ')})`;
    return `Contre la montre : ${clock(forTimeElapsed)} (${forTimeExercises.join(', ')})`;
  };

  const saveEffort = async () => {
    if (rpe === null) return;
    const duration = workoutMinutes();
    try {
      await saveTrainingLoad({ date: new Date().toISOString(), duration, rpe, load: calculateSessionLoad(duration, rpe), mode });
    } catch (error) {
      logger.error('Erreur sauvegarde charge:', error);
    }
  };

  const handleSaveSession = async () => {
    const duration = workoutMinutes();
    const notes = sessionNotes();
    const sport = sportForMode(mode, combatPreset);
    await saveEffort();
    setShowFinish(false);
    setRpe(null);
    resetTimer();
    resetSeriesCount();
    haptic('medium');
    router.push({ pathname: '/seance/deja-faite' as any, params: { sport, duration: String(duration), notes } });
  };

  const handleRestart = async () => {
    await saveEffort();
    setShowFinish(false);
    setRpe(null);
    resetTimer();
    if (mode !== 'musculation') resetSeriesCount();
    haptic('medium');
  };

  const changeMode = (m: TimerMode) => {
    // un chrono fini mais pas remis a zero ne bloque plus le changement de mode (« Reprendre » compris)
    if (status !== 'idle' && status !== 'finished') return;
    if (status === 'finished') {
      if (finishTimer.current) clearTimeout(finishTimer.current);
      engine.stop();
      setShowFinish(false);
    }
    setMode(m);
    setPicked(true);
    if (m === 'amrap') setAmrapRoundsCompleted(0);
    if (m === 'fortime') setForTimeElapsed(0);
    haptic('light');
  };

  /** Reprendre le dernier chrono : ses reglages reviennent, l'ecran de reglage s'ouvre (un appui pour lancer) */
  const reprendre = (d: DernierChrono) => {
    const r = d.r ?? {};
    const n = (k: string, set: (v: number) => void) => {
      if (Number.isFinite(r[k])) set(r[k]);
    };
    if (d.mode === 'musculation') n('musculationRest', setMusculationRest);
    if (d.mode === 'combat') {
      n('totalRounds', setTotalRounds);
      n('roundDuration', setRoundDuration);
      n('restDuration', setRestDuration);
    }
    if (d.mode === 'tabata') {
      n('tabataRounds', setTabataRounds);
      n('tabataWork', setTabataWork);
      n('tabataRest', setTabataRest);
      n('tabataSets', setTabataSets);
    }
    if (d.mode === 'emom') n('emomDuration', setEmomDuration);
    if (d.mode === 'amrap') n('amrapDuration', setAmrapDuration);
    if (d.mode === 'fortime') n('forTimeCap', setForTimeCap);
    if (d.mode !== 'musculation') n('prepa', setPrepa);
    changeMode(d.mode);
  };

  const toggleFocus = async () => {
    const next = await roninModeService.toggle();
    setFocusMode(next);
    haptic('medium');
  };

  const toggleClap = (v: boolean) => {
    setClapOn(v);
    saveClapEnabled(v).catch(() => {});
    haptic('light');
    if (v) safe(() => soundManager.playClap());
  };

  const modeMeta = MODES.find((m) => m.id === mode)!;

  // ─── Ecran actif plein ecran ───────────────────────────────────────────

  if (status !== 'idle') {
    const p = engine.phase;
    const finished = status === 'finished';
    const track = (() => {
      if (!p || !(mode === 'combat' || mode === 'tabata' || mode === 'emom')) return null;
      const total = p.steps ?? (engine.phases.find((x) => x.steps)?.steps ?? 0);
      if (finished) return { done: total, total };
      if (!p.step) return { done: 0, total, current: 1 };
      return p.kind === 'effort' ? { done: p.step - 1, total, current: p.step } : { done: p.step, total, current: p.step + 1 };
    })();

    const finishedTitle = mode === 'musculation' ? `Série ${seriesCount + 1}, c’est à toi` : mode === 'fortime' ? `Ton temps : ${clock(forTimeElapsed)}` : 'Bravo, c’est fini';
    const footer = finished ? (
      mode === 'musculation' ? (
        <View style={{ gap: 10 }}>
          <HugeButton title={`Série ${seriesCount + 1} finie`} sub={`Relance ${humanSeconds(musculationRest)} de repos`} icon="check" onPress={startTimer} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}><BigButton label="Réglages" tone="light" onPress={resetTimer} /></View>
            <View style={{ flex: 1 }}><BigButton label="Terminer" tone="ink" onPress={() => setShowFinish(true)} /></View>
          </View>
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <BigButton label="Voir le bilan" icon="check" onPress={() => setShowFinish(true)} />
          <BigButton label="Recommencer" tone="light" icon="refresh" onPress={handleRestart} />
        </View>
      )
    ) : undefined;

    return (
      <>
        <ActiveChrono
          engine={engineAffiche}
          name={mode === 'combat' ? `${modeMeta.short}, ${COMBAT_PRESETS[combatPreset].name}` : modeMeta.label}
          focusMode={focusMode}
          onToggleFocus={toggleFocus}
          onStop={resetTimer}
          confirmStop={mode !== 'musculation'}
          canSkip={mode !== 'amrap' && mode !== 'fortime'}
          skipLabel={mode === 'musculation' ? 'Finir le repos' : 'Passer'}
          titleOverride={finished ? finishedTitle : undefined}
          subOverride={finished ? (mode === 'musculation' ? 'Ton repos est fini' : undefined) : mode === 'musculation' ? 'Pose ton téléphone, ça sonne à la fin' : undefined}
          nextOverride={finished ? null : mode === 'musculation' ? `Série ${seriesCount + 1}` : (mode === 'amrap' || mode === 'fortime') && p?.kind === 'effort' ? null : undefined}
          adjust={mode === 'musculation' ? { onMinus: () => engine.adjust(-15), onPlus: () => engine.adjust(15) } : null}
          track={track}
          footer={footer}
        >
          {mode === 'amrap' && status === 'running' && p?.kind === 'effort' ? (
            <Press onPress={() => { setAmrapRoundsCompleted((r) => r + 1); safe(() => soundManager.playBeep()); }} haptic="medium" accessibilityRole="button" accessibilityLabel="Tour terminé">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 22, height: 60, borderRadius: 30, backgroundColor: P.ink }}>
                <Ink size={26} weight="black" color={P.goldLight}>{String(amrapRoundsCompleted)}</Ink>
                <Ink size={16} weight="extraBold" color={P.white}>Tour terminé</Ink>
              </View>
            </Press>
          ) : null}
          {mode === 'amrap' && finished ? <Ink size={18} weight="black" color={P.ink}>{`${amrapRoundsCompleted} tour${amrapRoundsCompleted > 1 ? 's' : ''} fait${amrapRoundsCompleted > 1 ? 's' : ''}`}</Ink> : null}
          {mode === 'fortime' && status === 'running' && p?.kind === 'effort' ? (
            <Press onPress={() => { engine.finishNow(); haptic('heavy'); }} haptic="medium" accessibilityRole="button" accessibilityLabel="J'ai fini">
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 24, height: 60, borderRadius: 30, backgroundColor: P.moss }}>
                <CIcon name="flag" size={20} color={P.white} />
                <Ink size={16} weight="extraBold" color={P.white}>J'ai fini</Ink>
              </View>
            </Press>
          ) : null}
        </ActiveChrono>

        <RepsWeightSheet visible={showRepsWeight} series={seriesCount} reps={lastReps} weight={lastWeight} onReps={setLastReps} onWeight={setLastWeight} onSave={handleSaveRepsWeight} onSkip={handleSkipRepsWeight} />
        <FinishSheet visible={showFinish} title={mode === 'musculation' ? 'Séance terminée' : 'Chrono terminé'} lines={finishLines()} rpe={rpe} onRpe={setRpe} onSave={handleSaveSession} onRestart={handleRestart} onClose={() => setShowFinish(false)} />
      </>
    );
  }

  // ─── Liste des chronos ─────────────────────────────────────────────────

  const eyeBtn = <IconBtn name="eye" label={focusMode ? 'Quitter le mode épuré' : 'Mode épuré : juste le temps'} onPress={toggleFocus} tone={focusMode ? 'ink' : 'glass'} />;

  if (!picked) {
    return (
      <View style={{ flex: 1, backgroundColor: P.paper }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 32 }} showsVerticalScrollIndicator={false}>
          <ScreenHead title="Chronos" subtitle={focusMode ? 'Mode épuré : pendant le chrono, juste le temps' : 'Choisis comment découper ton temps'} right={eyeBtn} />
          {/* vague 45 (Houari : « c'est beau mais c'est fade ») : bandeau illustre, le dernier chrono a reprendre,
              une couleur et une illustration par chrono, des cartes plus genereuses */}
          <View style={{ paddingHorizontal: 20, gap: 12, marginTop: 16 }}>
            <ChronoBanner />
            {dernier ? <ReprendreCard mode={dernier.mode} resume={dernier.resume} onPress={() => reprendre(dernier)} /> : null}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4, paddingHorizontal: 4, marginTop: 4 }}>
              <Legend color={PHASE_COLORS.effort.main} text="Barre haute : l’effort" />
              <Legend color={PHASE_COLORS.repos.main} text="Barre basse : le repos" />
            </View>
            {MODES.map((m) => (
              <ModeCard key={m.id} vive mode={m.id} title={m.label} tag={m.tag} text={m.sub} onPress={() => changeMode(m.id)} />
            ))}
            <ModeCard mode="sparring" dark title="Sparring, round par round" text="Les rounds de combat, et tu notes chaque round : victoire, défaite ou nul." onPress={() => router.push('/combat-timer' as any)} />
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─── Ecran de reglage du chrono choisi ────────────────────────────────

  const total = totalSeconds(preview);
  const band = preview.filter((x) => x.kind !== 'prepa').map((x) => ({ seconds: x.duration, color: PHASE_COLORS[x.kind === 'repos' ? 'repos' : 'effort'].main }));
  const prepaLegend = prepa > 0 ? [{ color: PHASE_COLORS.prepa.main, text: `${prepa} s pour te préparer au début` }] : [];
  const prepaRow = mode !== 'musculation' ? (
    <SettingRow label="Préparation" hint="avant le départ" dot={PHASE_COLORS.prepa.main} value={prepa === 0 ? 'Aucune' : `${prepa} s`} onMinus={() => setPrepa((v) => Math.max(0, v - 5))} onPlus={() => setPrepa((v) => Math.min(30, v + 5))} />
  ) : null;
  const plural = (n: number, w: string) => `${n} ${w}${n > 1 ? 's' : ''}`;

  return (
    <View style={{ flex: 1, backgroundColor: P.paper }}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + DOCK_SPACE }} showsVerticalScrollIndicator={false}>
        <ScreenHead title={modeMeta.label} subtitle={modeMeta.sub} onBack={() => { setPicked(false); haptic('light'); }} right={eyeBtn} />

        <View style={{ paddingHorizontal: 20, gap: 14, marginTop: 18 }}>
          {mode === 'musculation' ? (
            <>
              <SetupBlock>
                <BigAdjust label="Ton repos" value={humanSeconds(musculationRest)} color={PHASE_COLORS.repos.deep} onMinus={() => setMusculationRest((v) => Math.max(15, v - 15))} onPlus={() => setMusculationRest((v) => Math.min(600, v + 15))} />
                <ChoiceGrid items={MUSCU_PRESETS.map((p) => ({ key: p.seconds, title: p.label, sub: p.sub }))} value={musculationRest} onPick={(s) => { setMusculationRest(s); haptic('light'); }} columns={3} />
              </SetupBlock>
              <SeriesCard count={seriesCount} history={seriesHistory} onReset={resetSeriesCount} />
              <SetupBlock>
                <ToggleRow label="Noter reps et charge" hint="À la fin de chaque repos, tu notes tes répétitions et ta charge en deux touches." value={trackRepsWeight} onChange={(v) => { setTrackRepsWeight(v); haptic('light'); }} />
              </SetupBlock>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start', paddingHorizontal: 6 }}>
                <CIcon name="sound" size={18} color={P.muted} />
                <Ink size={13} weight="medium" color={P.ink2} style={{ flex: 1 }}>Pose ton téléphone : à la fin du repos, ça sonne et ça vibre. Pendant le repos, tu peux ajouter ou enlever 15 s.</Ink>
              </View>
              {seriesCount > 0 ? <BigButton label="Terminer la séance" tone="ink" icon="flag" onPress={() => setShowFinish(true)} /> : null}
            </>
          ) : null}

          {mode === 'combat' ? (
            <>
              <SetupHero label="Durée totale" big={humanSeconds(total)} line={roundsSummary(totalRounds, roundDuration, restDuration)} band={band.length > 1 ? band : undefined} legend={[{ color: PHASE_COLORS.effort.main, text: 'Round' }, ...(restDuration > 0 ? [{ color: PHASE_COLORS.repos.main, text: 'Repos' }] : []), ...prepaLegend]} />
              <SetupBlock title="Ton sport" hint="Un format tout prêt, que tu peux ajuster dessous">
                <ChoiceGrid items={COMBAT_PRESET_ORDER.map((k) => ({ key: k, title: COMBAT_PRESETS[k].name, sub: `${COMBAT_PRESETS[k].rounds} x ${humanSeconds(COMBAT_PRESETS[k].roundTime)}` }))} value={combatPreset} onPick={applyCombatPreset} columns={3} />
              </SetupBlock>
              <SetupBlock title="Tes rounds">
                <View>
                  <SettingRow label="Round" dot={PHASE_COLORS.effort.main} value={humanSeconds(roundDuration)} onMinus={() => setRoundDuration((d) => Math.max(30, d - 30))} onPlus={() => setRoundDuration((d) => Math.min(600, d + 30))} accent={PHASE_COLORS.effort.deep} />
                  <SettingRow label="Repos" dot={PHASE_COLORS.repos.main} value={restDuration === 0 ? 'Aucun' : humanSeconds(restDuration)} onMinus={() => setRestDuration((d) => Math.max(0, d - 15))} onPlus={() => setRestDuration((d) => Math.min(300, d + 15))} accent={PHASE_COLORS.repos.deep} />
                  <SettingRow label="Rounds" hint="en tout" value={String(totalRounds)} onMinus={() => setTotalRounds((r) => Math.max(1, r - 1))} onPlus={() => setTotalRounds((r) => Math.min(20, r + 1))} />
                  {prepaRow}
                </View>
                <View style={{ height: 1, backgroundColor: P.line2 }} />
                <ToggleRow label="Claquettes à 10 s" hint="Clac clac clac à 10 s de la fin de chaque round, comme à l’UFC" value={clapOn} onChange={toggleClap} />
                <Ink size={13} weight="medium" color={P.muted}>Gong au début et à la fin de chaque round. Les 10 dernières secondes passent en rouge. Tes réglages sont gardés.</Ink>
              </SetupBlock>
              <ModeCard mode="sparring" dark title="Sparring, round par round" text="Tu notes chaque round : victoire, défaite ou nul." onPress={() => router.push('/combat-timer' as any)} />
            </>
          ) : null}

          {mode === 'tabata' ? (
            <>
              <SetupHero label="Durée totale" big={humanSeconds(total)} line={`${plural(tabataRounds * tabataSets, 'effort')} de ${tabataWork} s, ${tabataRest} s de repos`} band={band} legend={[{ color: PHASE_COLORS.effort.main, text: 'À fond' }, { color: PHASE_COLORS.repos.main, text: 'Repos' }, ...prepaLegend]} />
              <SetupBlock title="Combien de temps">
                <ChoiceGrid items={TABATA_PRESETS.map((p) => ({ key: p.rounds, title: `${p.rounds} efforts`, sub: humanSeconds(p.rounds * (p.work + p.rest) - p.rest) }))} value={tabataWork === 20 && tabataRest === 10 ? tabataRounds : null} onPick={(r) => { const p = TABATA_PRESETS.find((x) => x.rounds === r)!; setTabataRounds(p.rounds); setTabataWork(p.work); setTabataRest(p.rest); haptic('light'); }} columns={3} />
              </SetupBlock>
              <SetupBlock title="Tes intervalles">
                <View>
                  <SettingRow label="À fond" dot={PHASE_COLORS.effort.main} value={`${tabataWork} s`} onMinus={() => setTabataWork((w) => Math.max(10, w - 5))} onPlus={() => setTabataWork((w) => Math.min(60, w + 5))} accent={PHASE_COLORS.effort.deep} />
                  <SettingRow label="Repos" dot={PHASE_COLORS.repos.main} value={`${tabataRest} s`} onMinus={() => setTabataRest((r) => Math.max(5, r - 5))} onPlus={() => setTabataRest((r) => Math.min(60, r + 5))} accent={PHASE_COLORS.repos.deep} />
                  <SettingRow label="Efforts" hint="en tout" value={String(tabataRounds)} onMinus={() => setTabataRounds((r) => Math.max(1, r - 1))} onPlus={() => setTabataRounds((r) => Math.min(30, r + 1))} />
                  <SettingRow label="Blocs" hint="tout répété" value={String(tabataSets)} onMinus={() => setTabataSets((s) => Math.max(1, s - 1))} onPlus={() => setTabataSets((s) => Math.min(5, s + 1))} />
                  {tabataSets > 1 ? <SettingRow label="Pause" hint="entre deux blocs" dot={PHASE_COLORS.repos.main} value={humanSeconds(tabataRestBetweenSets)} onMinus={() => setTabataRestBetweenSets((r) => Math.max(15, r - 15))} onPlus={() => setTabataRestBetweenSets((r) => Math.min(180, r + 15))} accent={PHASE_COLORS.repos.deep} /> : null}
                  {prepaRow}
                </View>
              </SetupBlock>
            </>
          ) : null}

          {mode === 'emom' ? (
            <>
              <SetupHero label="Durée totale" big={`${emomDuration} min`} line="un exercice au début de chaque minute" band={emomDuration <= 30 ? Array.from({ length: emomDuration }).flatMap(() => [{ seconds: 25, color: PHASE_COLORS.effort.main }, { seconds: 35, color: PHASE_COLORS.repos.main }]) : undefined} legend={[{ color: PHASE_COLORS.effort.main, text: 'Ton exercice' }, { color: PHASE_COLORS.repos.main, text: 'Le reste de la minute' }]} />
              <SetupBlock title="Combien de minutes">
                <ChoiceGrid items={EMOM_PRESETS.map((m) => ({ key: m, title: `${m} min` }))} value={emomDuration} onPick={(m) => { setEmomDuration(m); haptic('light'); }} columns={4} />
                <View>
                  <SettingRow label="Sur mesure" hint="à la minute près" dot={PHASE_COLORS.effort.main} value={`${emomDuration} min`} onMinus={() => setEmomDuration((m) => Math.max(1, m - 1))} onPlus={() => setEmomDuration((m) => Math.min(60, m + 1))} />
                  {prepaRow}
                </View>
              </SetupBlock>
              <ExerciseList title="Exercices, un par minute" hint="Ils tournent dans l’ordre, minute après minute." items={emomExercises} onEdit={() => { setEditText(emomExercises.join('\n')); setEditList('emom'); }} />
            </>
          ) : null}

          {mode === 'amrap' ? (
            <>
              <SetupHero label="Temps donné" big={humanSeconds(amrapDuration)} line="pour faire le plus de tours possible" band={[{ seconds: 1, color: PHASE_COLORS.effort.main }]} legend={[{ color: PHASE_COLORS.effort.main, text: 'Tu enchaînes ton circuit sans t’arrêter' }]} />
              <SetupBlock title="Combien de temps">
                <ChoiceGrid items={AMRAP_PRESETS.map((m) => ({ key: m * 60, title: `${m} min` }))} value={amrapDuration} onPick={(s) => { setAmrapDuration(s); haptic('light'); }} columns={4} />
                <View>
                  <SettingRow label="Sur mesure" hint="à la minute près" dot={PHASE_COLORS.effort.main} value={humanSeconds(amrapDuration)} onMinus={() => setAmrapDuration((d) => Math.max(60, d - 60))} onPlus={() => setAmrapDuration((d) => Math.min(3600, d + 60))} />
                  {prepaRow}
                </View>
                <Ink size={13} weight="medium" color={P.muted}>Pendant le chrono, touche « Tour terminé » à chaque fin de circuit : YOROI compte tes tours.</Ink>
              </SetupBlock>
              <ExerciseList title="Ton circuit" hint="Un tour, c’est tout le circuit une fois." items={amrapExercises} numbered onEdit={() => { setEditText(amrapExercises.join('\n')); setEditList('amrap'); }} />
            </>
          ) : null}

          {mode === 'fortime' ? (
            <>
              <SetupHero label="Temps limite" big={humanSeconds(forTimeCap)} line="au maximum pour finir ton programme" band={[{ seconds: 1, color: PHASE_COLORS.effort.main }]} legend={[{ color: PHASE_COLORS.effort.main, text: 'Le chrono monte, tu t’arrêtes quand tu as fini' }]} />
              <SetupBlock title="Temps limite" hint="Le chrono s’arrête tout seul s’il est atteint">
                <ChoiceGrid items={FORTIME_PRESETS.map((m) => ({ key: m * 60, title: `${m} min` }))} value={forTimeCap} onPick={(s) => { setForTimeCap(s); haptic('light'); }} columns={4} />
                <View>
                  <SettingRow label="Sur mesure" hint="à la minute près" dot={PHASE_COLORS.effort.main} value={humanSeconds(forTimeCap)} onMinus={() => setForTimeCap((d) => Math.max(60, d - 60))} onPlus={() => setForTimeCap((d) => Math.min(3600, d + 60))} />
                  {prepaRow}
                </View>
                <Ink size={13} weight="medium" color={P.muted}>Touche « J’ai fini » dès que tu termines : ton temps est noté.</Ink>
              </SetupBlock>
              <ExerciseList title="Ton programme" items={forTimeExercises} onEdit={() => { setEditText(forTimeExercises.join('\n')); setEditList('fortime'); }} />
            </>
          ) : null}
        </View>
      </ScrollView>

      <StartDock>
        {mode === 'musculation' ? (
          <HugeButton title={seriesCount > 0 ? `Série ${seriesCount + 1} finie` : 'Série finie'} sub={`Lance ${humanSeconds(musculationRest)} de repos`} icon="check" onPress={startTimer} />
        ) : (
          <HugeButton title={START_LABEL[mode]} sub={mode === 'amrap' ? `${humanSeconds(amrapDuration)} pour un maximum de tours` : mode === 'fortime' ? `${humanSeconds(forTimeCap)} au maximum` : `${humanSeconds(total)} en tout`} icon="play" onPress={startTimer} />
        )}
      </StartDock>

      <FinishSheet visible={showFinish} title="Séance terminée" lines={finishLines()} rpe={rpe} onRpe={setRpe} onSave={handleSaveSession} onRestart={handleRestart} onClose={() => setShowFinish(false)} />

      <Sheet visible={editList !== null} onClose={() => setEditList(null)} title="Tes exercices" scroll>
        <Field value={editText} onChangeText={setEditText} multiline placeholder="Un exercice par ligne" accessibilityLabel="Liste des exercices" />
        <BigButton
          label="Valider"
          icon="check"
          onPress={() => {
            const list = editText.split('\n').map((s) => s.trim()).filter(Boolean);
            if (editList === 'emom') setEmomExercises(list);
            if (editList === 'amrap') setAmrapExercises(list);
            if (editList === 'fortime') setForTimeExercises(list);
            setEditList(null);
          }}
        />
      </Sheet>
    </View>
  );
}

// ─── Sous-composants ─────────────────────────────────────────────────────

function SeriesCard({ count, history, onReset }: { count: number; history: SeriesItem[]; onReset: () => void }) {
  return (
    <SetupBlock>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 76, height: 76, borderRadius: 22, backgroundColor: count > 0 ? P.ink : (paletteSombre() ? P.line2 : '#F0EEE8'), alignItems: 'center', justifyContent: 'center' }}>
          <Ink size={38} weight="black" tight color={count > 0 ? P.white : P.ink}>{String(count)}</Ink>
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={18} weight="black" tight>{count === 0 ? 'Aucune série faite' : `${count} série${count > 1 ? 's' : ''} faite${count > 1 ? 's' : ''}`}</Ink>
          <Ink size={13} weight="medium" color={P.ink2}>{count === 0 ? 'Chaque appui sur « Série finie » compte une série.' : `Prochaine : la série ${count + 1}`}</Ink>
        </View>
      </View>
      {history.length > 0 ? (
        <View>
          {history.slice(-5).reverse().map((s, i) => (
            <View key={`${s.seriesNumber}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: 1, borderTopColor: P.line2 }}>
              <View style={{ width: 30, height: 30, borderRadius: 10, backgroundColor: (paletteSombre() ? P.line2 : '#F0EEE8'), alignItems: 'center', justifyContent: 'center' }}>
                <Ink size={13} weight="black">{String(s.seriesNumber)}</Ink>
              </View>
              <Ink size={15} weight="bold" style={{ flex: 1 }}>{s.reps || s.weight ? [s.weight ? `${String(s.weight).replace('.', ',')} kg` : '', s.reps ? `${s.reps} répétitions` : ''].filter(Boolean).join(', ') : `Série ${s.seriesNumber}`}</Ink>
              <Ink size={12} weight="bold" color={P.muted}>{`repos ${clock(s.restDuration)}`}</Ink>
            </View>
          ))}
          {history.length > 5 ? <Ink size={12} weight="medium" color={P.muted}>{`et ${history.length - 5} de plus`}</Ink> : null}
        </View>
      ) : null}
      {count > 0 ? (
        <Press onPress={onReset} accessibilityRole="button" accessibilityLabel="Remettre le compteur à zéro">
          <View style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', paddingHorizontal: 4 }}>
            <CIcon name="reset" size={16} color={P.ink2} />
            <Ink size={13} weight="extraBold" color={P.ink2}>Remettre le compteur à zéro</Ink>
          </View>
        </Press>
      ) : null}
    </SetupBlock>
  );
}

function ExerciseList({ title, hint, items, numbered, onEdit }: { title: string; hint?: string; items: string[]; numbered?: boolean; onEdit: () => void }) {
  return (
    <SetupBlock>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={18} weight="black" tight>{title}</Ink>
          {hint ? <Ink size={13} weight="medium" color={P.muted}>{hint}</Ink> : null}
        </View>
        <Press onPress={onEdit} accessibilityRole="button" accessibilityLabel={`Modifier : ${title}`}>
          <View style={{ minHeight: 40, paddingHorizontal: 14, borderRadius: 20, backgroundColor: (paletteSombre() ? P.line2 : '#F0EEE8'), flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <CIcon name="edit" size={15} color={P.ink} />
            <Ink size={13} weight="extraBold">Modifier</Ink>
          </View>
        </Press>
      </View>
      {items.length === 0 ? <Ink size={14} weight="medium" color={P.ink2}>Ajoute tes exercices pour les voir pendant le chrono.</Ink> : null}
      {items.map((it, i) => (
        <View key={`${it}-${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: (paletteSombre() ? P.line2 : '#F0EEE8'), alignItems: 'center', justifyContent: 'center' }}>
            {numbered ? <Ink size={12} weight="black" color={P.ink2}>{String(i + 1)}</Ink> : <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: PHASE_COLORS.effort.main }} />}
          </View>
          <Ink size={15} weight="bold" style={{ flex: 1 }}>{it}</Ink>
        </View>
      ))}
    </SetupBlock>
  );
}

function RepsWeightSheet({ visible, series, reps, weight, onReps, onWeight, onSave, onSkip }: { visible: boolean; series: number; reps: number; weight: number; onReps: (v: number) => void; onWeight: (v: number) => void; onSave: () => void; onSkip: () => void }) {
  return (
    <Sheet visible={visible} onClose={onSkip} title={`Série ${series}`}>
      <Ink size={14} weight="medium" color={P.ink2}>Pré-rempli avec ta dernière série. Ajuste si besoin.</Ink>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1, alignItems: 'center', gap: 6, padding: 12, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
          <Ink size={13} weight="bold" color={P.ink2}>Répétitions</Ink>
          <Stepper value={reps} step={1} min={0} max={200} onChange={onReps} unit="répétitions" layout="stack" size={34} button={48} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', gap: 6, padding: 12, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: P.line2 }}>
          <Ink size={13} weight="bold" color={P.ink2}>Charge</Ink>
          <Stepper value={weight} step={2} fine={0.5} min={0} max={500} decimals onChange={onWeight} unit="kilos" layout="stack" size={34} button={48} hint="kilos" format={(v) => String(v).replace('.', ',')} />
        </View>
      </View>
      <BigButton label="Noter la série" icon="check" onPress={onSave} />
      <BigButton label="Passer" tone="light" onPress={onSkip} />
    </Sheet>
  );
}
