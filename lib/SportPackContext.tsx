// ============================================
// SPORT PACK CONTEXT
// Gère le pack actif (Combat / Endurance / Force / Nature)
// Persiste le choix de l'utilisateur
// ============================================

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { packForSport, type SportPack } from './sportPacks';

const ACTIVE_PACK_KEY = '@yoroi_active_sport_pack';

interface SportPackContextType {
  activePack: SportPack;
  setActivePack: (pack: SportPack) => Promise<void>;
  /** Pack déduit du sport principal (auto-détecté) */
  autoPack: SportPack;
}

const SportPackContext = createContext<SportPackContextType>({
  activePack: 'combat',
  setActivePack: async () => {},
  autoPack: 'combat',
});

export function SportPackProvider({ children }: { children: ReactNode }) {
  const [activePack, setActivePackState] = useState<SportPack>('combat');
  const [autoPack, setAutoPack] = useState<SportPack>('combat');

  useEffect(() => {
    (async () => {
      try {
        // Détecte le pack à partir du sport principal
        const primarySport = await AsyncStorage.getItem('@yoroi_user_sport');
        const auto = packForSport(primarySport);
        setAutoPack(auto);

        // Active le pack choisi par l'user s'il y a un override, sinon l'auto
        const saved = await AsyncStorage.getItem(ACTIVE_PACK_KEY);
        if (saved && ['combat', 'endurance', 'force', 'musculation', 'nature', 'all'].includes(saved)) {
          setActivePackState(saved as SportPack);
        } else {
          setActivePackState(auto);
        }
      } catch {
        // fallback silencieux
      }
    })();
  }, []);

  const setActivePack = useCallback(async (pack: SportPack) => {
    setActivePackState(pack);
    try {
      await AsyncStorage.setItem(ACTIVE_PACK_KEY, pack);
    } catch { /* ignore */ }
  }, []);

  return (
    <SportPackContext.Provider value={{ activePack, setActivePack, autoPack }}>
      {children}
    </SportPackContext.Provider>
  );
}

export function useSportPack() {
  return useContext(SportPackContext);
}
