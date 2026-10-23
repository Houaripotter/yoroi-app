/**
 * Apercu Sante du jour pour la carte de Progres : anneaux et pas d'aujourd'hui.
 * Lecture legere (quatre mesures sur un jour), au lieu du tableau de bord complet.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { getLatestHealthData } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { getRingGoals, getSanteSource, loadRings, loadSeries } from '@/lib/v2/sante/data';
import type { RingGoals, Rings, SanteMode } from '@/lib/v2/sante/data';
import type { MetricKey } from '@/lib/v2/sante/metrics';
import type { DayPoint } from '@/lib/v2/sante/stats';
import { todayIso } from './format';

export type SanteToday = {
  loading: boolean;
  mode: SanteMode | null;
  provider: string;
  rings: Rings | null;
  goals: RingGoals | null;
  steps: number | null;
  /** Vrai des qu'une donnee du jour existe (anneaux ou pas) */
  hasData: boolean;
};

const EMPTY: SanteToday = { loading: true, mode: null, provider: '', rings: null, goals: null, steps: null, hasData: false };

export function useSanteToday(): SanteToday {
  const [state, setState] = useState<SanteToday>(EMPTY);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const source = await getSanteSource();
      const isLive = source.mode === 'live';
      const keys: MetricKey[] = ['pas', 'energie-active', 'exercice', 'debout'];
      const series: Partial<Record<MetricKey, DayPoint[]>> = {};
      await Promise.all(
        keys.map(async (k) => {
          try {
            series[k] = await loadSeries(k, 1, isLive);
          } catch {
            series[k] = [];
          }
        }),
      );
      const [rings, goals] = await Promise.all([loadRings(isLive, series).catch(() => null), getRingGoals()]);
      const today = todayIso();
      let steps = series.pas?.find((p) => p.date === today)?.value ?? null;
      if (!steps) {
        const latest = await getLatestHealthData('steps').catch(() => null);
        if (latest && latest.value > 0 && latest.date?.slice(0, 10) === today) steps = latest.value;
      }
      const ringData = !!rings && [rings.move, rings.exercise].some((v) => v !== null && v > 0);
      if (!alive.current) return;
      setState({ loading: false, mode: source.mode, provider: source.provider, rings, goals, steps: steps && steps > 0 ? steps : null, hasData: ringData || (!!steps && steps > 0) });
    } catch (err) {
      logger.warn('Apercu sante indisponible', err);
      if (alive.current) setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => {
      alive.current = false;
      sub.remove();
    };
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return state;
}
