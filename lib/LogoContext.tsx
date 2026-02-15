// ============================================
// YOROI - CONTEXTE LOGO (pour rafraîchissement global)
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSelectedLogo, saveSelectedLogo, LogoVariant } from './storage';

interface LogoContextType {
  selectedLogo: LogoVariant;
  setLogo: (logo: LogoVariant) => Promise<void>;
  refreshLogo: () => Promise<void>;
}

const LogoContext = createContext<LogoContextType | undefined>(undefined);

export const LogoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedLogo, setSelectedLogo] = useState<LogoVariant>('default');

  // Charger le logo au démarrage
  useEffect(() => {
    loadLogo();
  }, []);

  const loadLogo = async () => {
    try {
      const logo = await getSelectedLogo();
      setSelectedLogo(logo);
    } catch (error) {
      console.error('[LogoContext] Erreur chargement logo:', error);
    }
  };

  // Définir et sauvegarder un nouveau logo
  const setLogo = useCallback(async (logo: LogoVariant) => {
    try {
      await saveSelectedLogo(logo);
      setSelectedLogo(logo);
    } catch (error) {
      console.error('[LogoContext] Erreur sauvegarde logo:', error);
      throw error;
    }
  }, []);

  // Rafraîchir le logo depuis le storage
  const refreshLogo = useCallback(async () => {
    await loadLogo();
  }, []);

  return (
    <LogoContext.Provider value={{ selectedLogo, setLogo, refreshLogo }}>
      {children}
    </LogoContext.Provider>
  );
};

export const useLogo = (): LogoContextType => {
  const context = useContext(LogoContext);
  if (!context) {
    throw new Error('useLogo must be used within a LogoProvider');
  }
  return context;
};

export default LogoContext;
