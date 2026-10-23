/**
 * Instantane de la Voie de l'Armure pour les ecrans du Dojo : recharge au retour sur
 * l'ecran, apres chaque enregistrement et quand l'espace (personnage, scene) change.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ARMURE_CHANGED_EVENT, syncArmure } from '@/lib/v2/armure';
import type { ArmureSnapshot } from '@/lib/v2/armure';
import { DEFAULT_ESPACE, ESPACE_CHANGED_EVENT, getEspace } from '@/lib/v2/espace';
import type { Espace } from '@/lib/v2/espace';

export function useArmure() {
  const [snap, setSnap] = useState<ArmureSnapshot | null>(null);
  const [espace, setEspace] = useState<Espace>(DEFAULT_ESPACE);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async (force = false) => {
    try {
      const [s, e] = await Promise.all([syncArmure(force), getEspace()]);
      setSnap(s);
      setEspace(e);
    } catch {
      // l'ecran garde le dernier etat connu
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload]),
  );

  useEffect(() => {
    const a = DeviceEventEmitter.addListener(ARMURE_CHANGED_EVENT, () => void reload());
    const b = DeviceEventEmitter.addListener(ESPACE_CHANGED_EVENT, (e: Espace) => setEspace(e));
    return () => {
      a.remove();
      b.remove();
    };
  }, [reload]);

  return { snap, espace, loading, reload };
}
