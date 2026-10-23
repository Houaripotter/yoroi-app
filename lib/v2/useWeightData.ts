/**
 * Donnees de poids pour les ecrans v2, rechargees a chaque retour sur l'ecran
 * et a chaque modification ailleurs dans l'app.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getProfile, getWeights } from '@/lib/database';
import type { Weight } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { toDailySeries } from './weightStats';
import type { DayWeight } from './weightStats';

export const DATA_CHANGED_EVENT = 'YOROI_DATA_CHANGED';

export function useWeightData() {
  const [raw, setRaw] = useState<Weight[]>([]);
  const [series, setSeries] = useState<DayWeight[]>([]);
  const [goal, setGoal] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [ws, profile] = await Promise.all([getWeights(), getProfile()]);
      const valid = (ws ?? []).filter((w) => w && w.weight > 0);
      setRaw(valid);
      setSeries(toDailySeries(valid));
      setGoal(profile?.target_weight && profile.target_weight > 0 ? profile.target_weight : null);
    } catch (err) {
      logger.error('Chargement des pesees impossible', err);
    } finally {
      setLoading(false);
    }
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

  return { raw, series, goal, loading, reload: load };
}
