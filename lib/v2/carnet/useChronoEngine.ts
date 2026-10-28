/**
 * Moteur de temps des chronos YOROI.
 *
 * Le temps restant est toujours recalcule a partir de l'horodatage de debut de la phase
 * et du temps de pause cumule, jamais en decrementant un compteur a chaque tick.
 * Un seul minuteur, cale sur le prochain changement de seconde : chaque chiffre reste
 * affiche une seconde pile. L'anneau avance en continu sur le fil d'animation, a partir
 * du meme temps. Au retour de l'arriere-plan, l'etat est recalcule (phases enchainees
 * pendant l'absence comprises) sans rejouer les sons rates.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { Easing, cancelAnimation, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

export type ChronoKind = 'prepa' | 'effort' | 'repos';
export type ChronoCue = 'gong' | 'go' | 'beep' | 'bell' | 'none';

export type ChronoPhase = {
  kind: ChronoKind;
  /** duree en secondes */
  duration: number;
  /** "Round 2 sur 5", "Repos", "Préparation", "Série 3" */
  title: string;
  /** forme courte pour "Ensuite : ..." */
  short: string;
  /** precision sous le titre (exercice de la minute...) */
  sub?: string;
  /** le chrono monte (au temps) au lieu de descendre */
  countUp?: boolean;
  /** claquettes de bois a 10 s de la fin (rounds de combat) */
  clap?: boolean;
  /** a la fin, le chrono s'arrete et attend advance() (resultat du round au sparring) */
  hold?: boolean;
  /** son joue a l'entree dans la phase */
  cue?: ChronoCue;
  /** numero du round, de l'intervalle ou de la minute (pastilles) */
  step?: number;
  /** nombre total de rounds, intervalles ou minutes */
  steps?: number;
};

export type ChronoStatus = 'idle' | 'running' | 'paused' | 'holding' | 'finished';

export type ChronoEvent =
  | { type: 'phase'; index: number; phase: ChronoPhase; live: boolean; first: boolean }
  | { type: 'clap'; index: number; phase: ChronoPhase }
  | { type: 'countdown'; index: number; phase: ChronoPhase; n: number }
  | { type: 'warn'; index: number; phase: ChronoPhase }
  | { type: 'hold'; index: number; phase: ChronoPhase; live: boolean }
  | { type: 'finish'; index: number; phase: ChronoPhase; live: boolean };

/** Un evenement rate de plus de 1,5 s (ecran verrouille, app en arriere-plan) n'est pas rejoue */
const LIVE_WINDOW = 1500;

export type ChronoEngine = {
  status: ChronoStatus;
  index: number;
  phase: ChronoPhase | null;
  next: ChronoPhase | null;
  phases: ChronoPhase[];
  /** secondes affichees : restantes (arrondi superieur) ou ecoulees si le chrono monte */
  display: number;
  /** secondes restantes exactes (arrondi superieur), meme pour un chrono qui monte */
  remaining: number;
  /** 0 a 1, part ecoulee de la phase, anime en continu */
  progress: SharedValue<number>;
  start: (phases: ChronoPhase[]) => void;
  pause: () => void;
  resume: () => void;
  /** passe a la phase suivante tout de suite */
  skip: () => void;
  /** apres une phase hold : lance la suivante (ou termine) */
  advance: () => void;
  /** reprend la phase en cours a zero */
  restartPhase: () => void;
  /** termine maintenant (au temps : "J'ai fini") */
  finishNow: () => void;
  /** allonge (secondes positives) ou raccourcit la phase en cours ; sous le temps deja ecoule, elle se termine tout de suite */
  adjust: (deltaSeconds: number) => void;
  stop: () => void;
  /** millisecondes ecoulees dans la phase en cours */
  elapsedMs: () => number;
  /** heure (ms) de fin de la phase en cours si elle tourne, sinon null */
  phaseEndsAt: () => number | null;
  /**
   * 28 octobre 2026 : etat a garder pour reprendre apres une fermeture de l'app (sprints guides,
   * lib/v2/intervalles/brouillon.ts) : phase, debut absolu de la phase (decale des pauses), pause, durees reelles.
   */
  snapshot: () => { status: ChronoStatus; index: number; phaseStartMs: number; pausedAtMs: number | null; durations: number[] };
  /**
   * Reprend une seance gardee : la phase index a commence a phaseStartMs (pauses deja retirees). En pause si
   * pausedAtMs est donne. Les phases finies pendant l'absence s'enchainent sans rejouer les sons.
   */
  restore: (phases: ChronoPhase[], index: number, phaseStartMs: number, pausedAtMs: number | null) => void;
};

export function useChronoEngine(onEvent: (e: ChronoEvent) => void): ChronoEngine {
  const [status, setStatus] = useState<ChronoStatus>('idle');
  const [index, setIndex] = useState(0);
  const [phases, setPhases] = useState<ChronoPhase[]>([]);
  const [display, setDisplay] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const progress = useSharedValue(0);

  const phasesRef = useRef<ChronoPhase[]>([]);
  const indexRef = useRef(0);
  const statusRef = useRef<ChronoStatus>('idle');
  const startAtRef = useRef(0); // debut de la phase (ms), decale de la duree des pauses
  const pausedAtRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firedRef = useRef<Set<string>>(new Set());
  const runRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const emit = (e: ChronoEvent) => {
    try {
      onEventRef.current(e);
    } catch {
      // un son ou une vibration ne doit jamais casser le chrono
    }
  };
  const once = (key: string): boolean => {
    const k = `${runRef.current}:${key}`;
    if (firedRef.current.has(k)) return false;
    firedRef.current.add(k);
    return true;
  };

  const clearTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
  };

  const setStat = (s: ChronoStatus) => {
    statusRef.current = s;
    setStatus(s);
  };

  const elapsedAt = (now: number) => (pausedAtRef.current ?? now) - startAtRef.current;

  /** Anneau : position exacte maintenant, puis glisse lineairement jusqu'a la fin */
  const syncRing = useCallback(() => {
    const p = phasesRef.current[indexRef.current];
    if (!p) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }
    const dur = p.duration * 1000;
    const el = Math.max(0, Math.min(dur, elapsedAt(Date.now())));
    const frac = dur > 0 ? el / dur : 1;
    cancelAnimation(progress);
    if (statusRef.current === 'running' && dur - el > 0) {
      progress.value = withSequence(withTiming(frac, { duration: 0 }), withTiming(1, { duration: dur - el, easing: Easing.linear }));
    } else {
      progress.value = statusRef.current === 'holding' || statusRef.current === 'finished' ? 1 : frac;
    }
  }, [progress]); // eslint-disable-line react-hooks/exhaustive-deps

  const publish = (now: number) => {
    const p = phasesRef.current[indexRef.current];
    if (!p) return;
    const dur = p.duration * 1000;
    const el = Math.max(0, elapsedAt(now));
    const rem = Math.max(0, Math.ceil((dur - el) / 1000 - 1e-6));
    setRemaining(rem);
    setDisplay(p.countUp ? Math.min(p.duration, Math.floor(el / 1000 + 1e-6)) : rem);
  };

  // Une passe : enchaine les phases terminees, declenche les reperes sonores, planifie la suivante
  const step = useCallback(() => {
    clearTimer();
    if (statusRef.current !== 'running') return;
    const now = Date.now();
    let changed = false;
    // Phases terminees (une seule en temps normal, plusieurs au retour de l'arriere-plan)
    for (let guard = 0; guard < 500; guard++) {
      const list = phasesRef.current;
      const i = indexRef.current;
      const p = list[i];
      if (!p) break;
      const endAt = startAtRef.current + p.duration * 1000;
      if (now < endAt) break;
      const live = now - endAt < LIVE_WINDOW;
      if (p.hold) {
        pausedAtRef.current = endAt;
        setStat('holding');
        if (once(`hold:${i}`)) emit({ type: 'hold', index: i, phase: p, live });
        changed = true;
        break;
      }
      if (i >= list.length - 1) {
        pausedAtRef.current = endAt;
        setStat('finished');
        if (once(`finish:${i}`)) emit({ type: 'finish', index: i, phase: p, live });
        changed = true;
        break;
      }
      // la suivante commence pile a la fin de celle-ci : aucune derive d'une phase a l'autre
      indexRef.current = i + 1;
      startAtRef.current = endAt;
      changed = true;
      const np = list[i + 1];
      const nextLive = now - endAt < LIVE_WINDOW;
      if (once(`phase:${i + 1}`)) emit({ type: 'phase', index: i + 1, phase: np, live: nextLive, first: false });
    }
    if (changed) {
      setIndex(indexRef.current);
      syncRing();
    }
    publish(now);
    if (statusRef.current !== 'running') return;

    // Reperes de fin de phase, joues seulement s'ils tombent maintenant
    const i = indexRef.current;
    const p = phasesRef.current[i];
    if (!p) return;
    const remMs = startAtRef.current + p.duration * 1000 - now;
    if (!p.countUp) {
      if (p.clap && p.duration > 12) {
        if (remMs <= 10000 && remMs > 10000 - LIVE_WINDOW && once(`clap:${i}`)) emit({ type: 'clap', index: i, phase: p });
      } else {
        for (const n of [3, 2, 1]) {
          if (p.duration > n && remMs <= n * 1000 && remMs > n * 1000 - 600 && once(`cd:${i}:${n}`)) emit({ type: 'countdown', index: i, phase: p, n });
        }
        if (p.duration > 30 && remMs <= 10000 && remMs > 10000 - 600 && once(`warn:${i}`)) emit({ type: 'warn', index: i, phase: p });
      }
    }

    // Prochain passage : juste apres le prochain changement de seconde affichee
    const el = now - startAtRef.current;
    let wait = p.countUp ? 1000 - (el % 1000) : remMs % 1000;
    if (wait <= 0) wait = 1000;
    timerRef.current = setTimeout(step, Math.min(1000, wait + 6));
  }, [syncRing]); // eslint-disable-line react-hooks/exhaustive-deps

  // Retour au premier plan : recalcul immediat, l'anneau se recale
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && statusRef.current === 'running') {
        step();
        syncRing();
      }
    });
    return () => {
      sub.remove();
      clearTimer();
    };
  }, [step, syncRing]);

  const start = useCallback((list: ChronoPhase[]) => {
    clearTimer();
    if (list.length === 0) return;
    runRef.current += 1;
    firedRef.current = new Set();
    phasesRef.current = list;
    setPhases(list);
    indexRef.current = 0;
    setIndex(0);
    startAtRef.current = Date.now();
    pausedAtRef.current = null;
    setStat('running');
    once('phase:0');
    emit({ type: 'phase', index: 0, phase: list[0], live: true, first: true });
    syncRing();
    step();
  }, [step, syncRing]); // eslint-disable-line react-hooks/exhaustive-deps

  const pause = useCallback(() => {
    if (statusRef.current !== 'running') return;
    clearTimer();
    pausedAtRef.current = Date.now();
    setStat('paused');
    syncRing();
    publish(Date.now());
  }, [syncRing]); // eslint-disable-line react-hooks/exhaustive-deps

  const resume = useCallback(() => {
    if (statusRef.current !== 'paused') return;
    const now = Date.now();
    if (pausedAtRef.current != null) startAtRef.current += now - pausedAtRef.current;
    pausedAtRef.current = null;
    setStat('running');
    syncRing();
    step();
  }, [step, syncRing]);

  const goTo = (i: number, live = true) => {
    const list = phasesRef.current;
    indexRef.current = i;
    setIndex(i);
    startAtRef.current = Date.now();
    pausedAtRef.current = null;
    setStat('running');
    if (once(`phase:${i}`)) emit({ type: 'phase', index: i, phase: list[i], live, first: false });
    syncRing();
    step();
  };

  const finishNow = useCallback(() => {
    const st = statusRef.current;
    if (st === 'idle' || st === 'finished') return;
    clearTimer();
    const i = indexRef.current;
    const p = phasesRef.current[i];
    pausedAtRef.current = pausedAtRef.current ?? Date.now();
    publish(Date.now());
    setStat('finished');
    syncRing();
    if (p && once(`finish:${i}`)) emit({ type: 'finish', index: i, phase: p, live: true });
  }, [syncRing]); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = useCallback(() => {
    const st = statusRef.current;
    if (st !== 'running' && st !== 'paused') return;
    clearTimer();
    const list = phasesRef.current;
    const i = indexRef.current;
    const p = list[i];
    if (!p) return;
    if (p.hold) {
      pausedAtRef.current = Date.now();
      startAtRef.current = pausedAtRef.current - p.duration * 1000;
      setStat('holding');
      publish(Date.now());
      syncRing();
      if (once(`hold:${i}`)) emit({ type: 'hold', index: i, phase: p, live: true });
      return;
    }
    if (i >= list.length - 1) {
      finishNow();
      return;
    }
    goTo(i + 1);
  }, [finishNow, syncRing]); // eslint-disable-line react-hooks/exhaustive-deps

  const advance = useCallback(() => {
    if (statusRef.current !== 'holding') return;
    const list = phasesRef.current;
    const i = indexRef.current;
    if (i >= list.length - 1) {
      setStat('finished');
      syncRing();
      if (once(`finish:${i}`)) emit({ type: 'finish', index: i, phase: list[i], live: true });
      return;
    }
    goTo(i + 1);
  }, [syncRing]); // eslint-disable-line react-hooks/exhaustive-deps

  const restartPhase = useCallback(() => {
    const st = statusRef.current;
    if (st !== 'running' && st !== 'paused') return;
    clearTimer();
    const i = indexRef.current;
    // les reperes de la phase peuvent sonner a nouveau
    const run = `${runRef.current}:`;
    firedRef.current.forEach((k) => {
      if (k.startsWith(run) && (k.endsWith(`:${i}`) || k.includes(`cd:${i}:`))) firedRef.current.delete(k);
    });
    firedRef.current.add(`${run}phase:${i}`);
    const now = Date.now();
    startAtRef.current = now;
    pausedAtRef.current = st === 'paused' ? now : null;
    publish(now);
    syncRing();
    if (st === 'running') step();
  }, [step, syncRing]); // eslint-disable-line react-hooks/exhaustive-deps

  const adjust = useCallback((delta: number) => {
    const st = statusRef.current;
    if ((st !== 'running' && st !== 'paused') || !delta) return;
    const i = indexRef.current;
    const p = phasesRef.current[i];
    if (!p || p.countUp) return;
    const el = Math.max(0, elapsedAt(Date.now())) / 1000;
    // jamais sous le temps deja ecoule : la phase se termine alors au prochain passage
    const nd = Math.max(el, p.duration + delta);
    if (nd === p.duration) return;
    clearTimer();
    const list = phasesRef.current.slice();
    list[i] = { ...p, duration: nd };
    phasesRef.current = list;
    setPhases(list);
    if (delta > 0) {
      // les reperes de fin (claquettes, 3 2 1, 10 s) peuvent sonner a nouveau
      const run = `${runRef.current}:`;
      firedRef.current.forEach((k) => {
        if (k === `${run}clap:${i}` || k === `${run}warn:${i}` || k.startsWith(`${run}cd:${i}:`)) firedRef.current.delete(k);
      });
    }
    publish(Date.now());
    syncRing();
    if (st === 'running') step();
  }, [step, syncRing]); // eslint-disable-line react-hooks/exhaustive-deps

  const stop = useCallback(() => {
    clearTimer();
    runRef.current += 1;
    pausedAtRef.current = null;
    setStat('idle');
    indexRef.current = 0;
    setIndex(0);
    cancelAnimation(progress);
    progress.value = 0;
  }, [progress]);

  const elapsedMs = useCallback(() => Math.max(0, elapsedAt(Date.now())), []); // eslint-disable-line react-hooks/exhaustive-deps
  const phaseEndsAt = useCallback(() => {
    if (statusRef.current !== 'running') return null;
    const p = phasesRef.current[indexRef.current];
    if (!p) return null;
    return startAtRef.current + p.duration * 1000;
  }, []);

  const snapshot = useCallback(() => ({
    status: statusRef.current,
    index: indexRef.current,
    phaseStartMs: startAtRef.current,
    pausedAtMs: pausedAtRef.current,
    durations: phasesRef.current.map((p) => p.duration),
  }), []);

  const restore = useCallback((list: ChronoPhase[], i: number, phaseStartMs: number, pausedAtMs: number | null) => {
    clearTimer();
    if (list.length === 0) return;
    const idx = Math.min(list.length - 1, Math.max(0, Math.floor(i)));
    runRef.current += 1;
    firedRef.current = new Set();
    phasesRef.current = list;
    setPhases(list);
    indexRef.current = idx;
    setIndex(idx);
    startAtRef.current = phaseStartMs;
    pausedAtRef.current = pausedAtMs;
    // la phase en cours a deja ete annoncee avant la fermeture
    once(`phase:${idx}`);
    if (pausedAtMs !== null) {
      setStat('paused');
      publish(Date.now());
      syncRing();
      return;
    }
    setStat('running');
    syncRing();
    step();
  }, [step, syncRing]); // eslint-disable-line react-hooks/exhaustive-deps

  const phase = phases[index] ?? null;
  const next = phases[index + 1] ?? null;
  return { status, index, phase, next, phases, display, remaining, progress, start, pause, resume, skip, advance, restartPhase, finishNow, adjust, stop, elapsedMs, phaseEndsAt, snapshot, restore };
}

/** Duree totale d'une liste de phases, en secondes */
export function totalSeconds(list: ChronoPhase[], withPrepa = false): number {
  return list.reduce((s, p) => (p.kind === 'prepa' && !withPrepa ? s : s + p.duration), 0);
}
