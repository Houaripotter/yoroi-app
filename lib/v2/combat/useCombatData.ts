/**
 * Donnees de l'espace Combat : seances (avec rounds) et partenaires,
 * rechargees au retour sur l'ecran et a chaque modification ailleurs.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getTrainings } from '@/lib/database';
import type { Training } from '@/lib/database';
import { logger } from '@/lib/security/logger';
import { DATA_CHANGED_EVENT } from '@/lib/v2/useWeightData';
import { loadPartners, PARTNERS_CHANGED_EVENT } from './partners';
import type { Partner } from './partners';

export function useCombatData(opts: { partners?: boolean } = {}) {
  const withPartners = opts.partners !== false;
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loaded, setLoaded] = useState(false);
  const alive = useRef(true);

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([getTrainings(3650), withPartners ? loadPartners() : Promise.resolve([] as Partner[])]);
      if (!alive.current) return;
      setTrainings(Array.isArray(t) ? t : []);
      setPartners(p);
    } catch (e) {
      logger.error('Chargement des donnees de combat impossible', e);
    } finally {
      if (alive.current) setLoaded(true);
    }
  }, [withPartners]);

  useEffect(() => {
    alive.current = true;
    const a = DeviceEventEmitter.addListener(DATA_CHANGED_EVENT, load);
    const b = DeviceEventEmitter.addListener(PARTNERS_CHANGED_EVENT, () => {
      if (!withPartners) return;
      loadPartners()
        .then((p) => {
          if (alive.current) setPartners(p);
        })
        .catch(() => {});
    });
    return () => {
      alive.current = false;
      a.remove();
      b.remove();
    };
  }, [load, withPartners]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return { trainings, partners, setPartners, loaded, reload: load };
}
