/**
 * Données du tableau de bord Santé : source, séries des 30 derniers jours,
 * anneaux du jour, semaine d'anneaux, score de préparation, appareils détectés,
 * conseils et séances de la montre.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { getProfile } from '@/lib/database';
import { HealthInsightsGenerator } from '@/lib/healthInsights';
import type { Insight } from '@/components/health-charts/InsightCard';
import { logger } from '@/lib/security/logger';
import type { MetricKey } from './metrics';
import type { DayPoint } from './stats';
import { getRingGoals, getSanteSource, loadAllSeries, loadDetected, loadRings, loadWeekRings, loadWorkouts, needsExtendedAccess, syncNow } from './data';
import type { Detected, HealthWorkout, RingGoals, Rings, SanteSource, WeekRing } from './data';
import { readinessFromForme } from './score';
import { safeComputeForme } from '@/lib/v2/accueil/forme';
import { todayIso } from '@/lib/v2/progres/format';
import type { Readiness } from './score';
import { demoActive } from '@/lib/v2/demo/garde';

export type SanteState = {
  loading: boolean;
  refreshing: boolean;
  source: SanteSource | null;
  series: Record<MetricKey, DayPoint[]> | null;
  rings: Rings | null;
  goals: RingGoals | null;
  week: WeekRing[];
  insights: Insight[];
  workouts: HealthWorkout[];
  readiness: Readiness | null;
  detected: Detected[];
  needsExtended: boolean;
};

const EMPTY: SanteState = { loading: true, refreshing: false, source: null, series: null, rings: null, goals: null, week: [], insights: [], workouts: [], readiness: null, detected: [], needsExtended: false };

export function useSante() {
  const [state, setState] = useState<SanteState>(EMPTY);
  const alive = useRef(true);

  const load = useCallback(async (opts?: { sync?: boolean }) => {
    try {
      let source = await getSanteSource();
      // 17 octobre : en mode demo, seulement les donnees de Heny (Sante n'est ni lue ni synchronisee)
      const demo = await demoActive();
      if (opts?.sync && source.mode === 'live' && !demo) {
        await syncNow();
        source = await getSanteSource();
      }
      const isLive = source.mode === 'live' && !demo;
      const series = await loadAllSeries(30, isLive);
      const [rings, week, goals, workouts, profile, detected, needsExtended] = await Promise.all([
        loadRings(isLive, series),
        loadWeekRings(isLive, series),
        getRingGoals(),
        loadWorkouts(isLive),
        getProfile().catch(() => null),
        loadDetected(),
        needsExtendedAccess(isLive).catch(() => false),
      ]);
      // SOURCE UNIQUE du jour (vague 32) : anneaux, cartes Calories actives, Minutes d'exercice, Heures debout,
      // semaine d'anneaux et accueil montrent la meme valeur, celle des anneaux (le resume d'activite de la montre).
      const today = todayIso();
      const align = (k: MetricKey, v: number | null | undefined) => {
        if (v === null || v === undefined || !(v >= 0)) return;
        const arr = series[k];
        if (!arr) return;
        const i = arr.findIndex((p) => p.date === today);
        if (i >= 0) arr[i] = { ...arr[i], value: v };
        else if (v > 0) arr.push({ date: today, value: v });
      };
      align('energie-active', rings?.move);
      align('exercice', rings?.exercise);
      if (rings?.hasStand) align('debout', rings?.stand);
      week.forEach((w, i) => {
        if (w.date !== today || !rings) return;
        week[i] = { ...w, move: rings.move ?? w.move, exercise: rings.exercise ?? w.exercise, stand: rings.stand ?? w.stand };
      });
      let insights: Insight[] = [];
      try {
        const sleep = series.sommeil.map((p) => ({ date: p.date, total: p.value, deep: p.phases?.deep ?? 0, rem: p.phases?.rem ?? 0, core: p.phases?.core ?? 0, awake: p.phases?.awake ?? 0 }));
        const active = new Map(series['energie-active'].map((p) => [p.date, p.value]));
        const basal = new Map(series['energie-repos'].map((p) => [p.date, p.value]));
        const dates = Array.from(new Set([...active.keys(), ...basal.keys()])).sort();
        const calories = dates.map((d) => ({ date: d, active: active.get(d) ?? 0, basal: basal.get(d) ?? 0, total: (active.get(d) ?? 0) + (basal.get(d) ?? 0) }));
        insights = HealthInsightsGenerator.generateCombinedInsights({
          hrvHistory: series.vfc,
          restingHRHistory: series['fc-repos'],
          sleepHistory: sleep,
          caloriesHistory: calories,
          weightHistory: series.poids,
          goal: (profile as any)?.target_weight ?? undefined,
        });
      } catch (e) {
        logger.warn('[Sante v2] conseils indisponibles', e);
      }
      let readiness: Readiness | null = null;
      try {
        // score unique de recuperation, le meme que sur l'accueil (lib/v2/accueil/forme.ts)
        readiness = readinessFromForme(await safeComputeForme({ series }), series);
      } catch (e) {
        logger.warn('[Sante v2] score indisponible', e);
      }
      if (!alive.current) return;
      setState({ loading: false, refreshing: false, source, series, rings, goals, week, insights, workouts, readiness, detected, needsExtended });
    } catch (e) {
      logger.error('[Sante v2] chargement', e);
      if (alive.current) setState((s) => ({ ...s, loading: false, refreshing: false }));
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    load();
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, () => load());
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [load]);

  const refresh = useCallback(() => {
    setState((s) => ({ ...s, refreshing: true }));
    return load({ sync: true });
  }, [load]);

  return { ...state, reload: load, refresh, setGoals: (goals: RingGoals) => setState((s) => ({ ...s, goals })), hideExtended: () => setState((s) => ({ ...s, needsExtended: false })) };
}
