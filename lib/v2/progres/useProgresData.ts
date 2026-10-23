/**
 * Chargement des donnees des ecrans Progres, recharge au retour sur l'ecran
 * et a chaque modification ailleurs dans l'app.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { getPhotosFromStorage } from '@/lib/storage';
import type { Photo } from '@/lib/storage';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { loadComposition } from './composition';
import type { CompoPoint } from './composition';
import { loadMeasures } from './measures';
import type { MeasurePoint } from './measures';
import { dedupeTrainings } from '@/lib/v2/seances/dedupe';

function useReloading<T>(loader: () => Promise<T>, initial: T) {
  const [data, setData] = useState<T>(initial);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);
  const load = useCallback(async () => {
    try {
      const v = await loader();
      if (alive.current) setData(v);
    } catch (err) {
      logger.error('Chargement des donnees de progres impossible', err);
    } finally {
      if (alive.current) setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );
  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);
  return { data, loading, reload: load };
}

export function useTrainingsData() {
  const r = useReloading<Training[]>(async () => dedupeTrainings((await getTrainings()) ?? []), []);
  return { trainings: r.data, loading: r.loading, reload: r.reload };
}

export function useCompositionData() {
  const r = useReloading<CompoPoint[]>(loadComposition, []);
  return { points: r.data, loading: r.loading, reload: r.reload };
}

export function useMeasuresData() {
  const r = useReloading<MeasurePoint[]>(loadMeasures, []);
  return { points: r.data, loading: r.loading, reload: r.reload };
}

export function usePhotosData() {
  const r = useReloading<Photo[]>(async () => (await getPhotosFromStorage()) ?? [], []);
  return { photos: r.data, loading: r.loading, reload: r.reload };
}

/** Photo triees de la plus ancienne a la plus recente */
export function photosByDate(photos: Photo[]): Photo[] {
  return [...photos].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.created_at < b.created_at ? -1 : 1));
}
