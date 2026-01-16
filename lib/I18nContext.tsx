// ============================================
// YOROI - CONTEXTE I18N
// ============================================
// Fournit les traductions et le changement de langue à toute l'app

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  changeLanguage as i18nChangeLanguage,
  loadSavedLanguage,
  getCurrentLanguage,
  SUPPORTED_LANGUAGES,
  LanguageCode,
  isRTL
} from './i18n';
import logger from '@/lib/security/logger';

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (key: string, options?: any) => string;
  isLoading: boolean;
  isRTL: boolean;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const { t, i18n } = useTranslation();
  const [language, setLanguageState] = useState<string>(getCurrentLanguage());
  const [isLoading, setIsLoading] = useState(true);

  // Charger la langue au démarrage
  useEffect(() => {
    const initLanguage = async () => {
      try {
        const lang = await loadSavedLanguage();
        setLanguageState(lang);
        if (i18n.language !== lang) {
          await i18n.changeLanguage(lang);
        }
      } catch (error) {
        logger.error('[I18nContext] Erreur initialisation langue:', error);
        setLanguageState('fr');
      } finally {
        setIsLoading(false);
      }
    };

    initLanguage();
  }, [i18n]);

  // Synchroniser avec les changements de langue i18next
  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setLanguageState(lng);
    };

    i18n.on('languageChanged', handleLanguageChanged);
    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, [i18n]);

  // Changer la langue (mémoïsé pour éviter nouvelle fonction à chaque render)
  const handleSetLanguage = useCallback(async (lang: string) => {
    try {
      await i18nChangeLanguage(lang);
      setLanguageState(lang);
    } catch (error) {
      logger.error('[I18nContext] Erreur changement langue:', error);
    }
  }, []);

  // Mémoïser la value pour éviter les re-renders en cascade
  const value: I18nContextType = useMemo(() => ({
    language,
    setLanguage: handleSetLanguage,
    t,
    isLoading,
    isRTL: isRTL(language),
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [language, handleSetLanguage, t, isLoading]);

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
