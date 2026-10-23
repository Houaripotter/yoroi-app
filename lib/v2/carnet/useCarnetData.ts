/**
 * Chargement partage des onglets du carnet v2 : seances (getTrainings), records (getBenchmarks),
 * recharges quand les donnees changent ailleurs dans l'app ou quand on tire pour rafraichir.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { getTrainings } from '@/lib/database';
import type { CombatRound, Training } from '@/lib/database';
import { getBenchmarks } from '@/lib/carnetService';
import type { Benchmark } from '@/lib/carnetService';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import logger from '@/lib/security/logger';

export function parseRounds(raw: unknown): CombatRound[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as CombatRound[];
  if (typeof raw === 'string') {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  }
  return [];
}

export function kmOf(t: Training): number {
  const anyT = t as Training & { distance_km?: number };
  return anyT.distance_km ?? t.distance ?? 0;
}

export function useTrainings(filter: (t: Training) => boolean, refreshKey: number, days = 3650) {
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [all, setAll] = useState<Training[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const list = (await getTrainings(days)) ?? [];
      setAll(list);
      setTrainings(list.filter(filter));
    } catch (e) {
      logger.error('[carnet] chargement des séances impossible', e);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  return { trainings, all, loading, reload: load };
}

export function useBenchmarks(refreshKey: number) {
  const [benchmarks, setBenchmarks] = useState<Benchmark[]>([]);
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      setBenchmarks((await getBenchmarks()) ?? []);
    } catch (e) {
      logger.error('[carnet] chargement des records impossible', e);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load, refreshKey]);
  useEffect(() => {
    const a = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    const b = DeviceEventEmitter.addListener('CARNET_UPDATED', load);
    return () => {
      a.remove();
      b.remove();
    };
  }, [load]);
  return { benchmarks, loading };
}
