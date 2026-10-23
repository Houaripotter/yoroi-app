/**
 * Identite du guerrier pour "Ton espace" : profil, rang de l'armure (lecture seule) et espace.
 * Se recharge a chaque retour sur l'ecran et quand les donnees changent.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getProfile } from '@/lib/database';
import type { Profile } from '@/lib/database';
import { ARMURE_CHANGED_EVENT, getArmureState } from '@/lib/v2/armure';
import type { ArmureState } from '@/lib/v2/armure';
import { logger } from '@/lib/security/logger';

export function useIdentite(): { profile: Profile | null; armure: ArmureState | null; reload: () => void } {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [armure, setArmure] = useState<ArmureState | null>(null);

  const reload = useCallback(() => {
    (async () => {
      try {
        const [p, a] = await Promise.all([getProfile(), getArmureState().catch(() => null)]);
        setProfile(p);
        setArmure(a);
      } catch (err) {
        logger.error('Chargement de l’identité impossible', err);
      }
    })();
  }, []);

  useFocusEffect(reload);

  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', reload),
      DeviceEventEmitter.addListener('YOROI_PROFILE_CHANGED', reload),
      DeviceEventEmitter.addListener(ARMURE_CHANGED_EVENT, reload),
    ];
    return () => subs.forEach((s) => s.remove());
  }, [reload]);

  return { profile, armure, reload };
}
