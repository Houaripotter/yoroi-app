// ============================================
// YOROI - CONTEXTE I18N
// ============================================
// Fournit les traductions et le changement de langue à toute l'app

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { loadLanguage, changeLanguage, getCurrentLanguage, t, SupportedLanguage } from './i18n';

interface I18nContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => Promise<void>;
  t: (key: string, options?: any) => string;
  isLoading: boolean;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>('fr');
  const [isLoading, setIsLoading] = useState(true);

  // Charger la langue au démarrage
  useEffect(() => {
    const initLanguage = async () => {
      try {
        const lang = await loadLanguage();
        setLanguageState(lang);
      } catch (error) {
        console.error('[I18nContext] Erreur initialisation langue:', error);
        setLanguageState('fr');
      } finally {
        setIsLoading(false);
      }
    };

    initLanguage();
  }, []);

  // Changer la langue (mémoïsé pour éviter nouvelle fonction à chaque render)
  const handleSetLanguage = useCallback(async (lang: SupportedLanguage) => {
    try {
      await changeLanguage(lang);
      setLanguageState(lang);
    } catch (error) {
      console.error('[I18nContext] Erreur changement langue:', error);
    }
  }, []);

  // Mémoïser la value pour éviter les re-renders en cascade
  const value: I18nContextType = useMemo(() => ({
    language,
    setLanguage: handleSetLanguage,
    t,
    isLoading,
  }), [language, handleSetLanguage, isLoading]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

// Hook personnalisé pour utiliser le contexte
export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n doit être utilisé dans un I18nProvider');
  }
  return context;
};

export default I18nContext;
