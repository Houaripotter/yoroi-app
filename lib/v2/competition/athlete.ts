/**
 * Petites donnees de l'athlete utiles aux ecrans de competition : genre du personnage, derniere pesee.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { getProfile, getWeights } from '@/lib/database';
import type { Weight } from '@/lib/database';
import { getEspace } from '@/lib/v2/espace';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';

export type Gender = 'homme' | 'femme';

export function useAthlete() {
  const [gender, setGender] = useState<Gender>('homme');
  const [lastWeight, setLastWeight] = useState<Weight | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const [p, esp, w] = await Promise.all([getProfile().catch(() => null), getEspace().catch(() => null), getWeights(3650).catch(() => [] as Weight[])]);
      setGender(esp?.personnage?.startsWith('guerrier_f') ? 'femme' : (p as any)?.avatar_gender === 'femme' ? 'femme' : 'homme');
      setLastWeight(w && w.length ? w[0] : null);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    load();
    const sub = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    return () => sub.remove();
  }, [load]);

  return { gender, lastWeight, loaded, reload: load };
}
