// ============================================
// YOROI - CONTEXTE I18N (FRANÇAIS UNIQUEMENT)
// ============================================

import React, { createContext, useContext, ReactNode, useMemo } from 'react';
import frTranslations from './i18n/fr.json';

// Locale pour toLocaleDateString
export const LOCALE_MAP: Record<string, string> = {
  fr: 'fr-FR',
};

// Langues supportées (FR only)
export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
] as const;

// Cache pour les traductions
const translationCache = new Map<string, string>();

const getTranslation = (key: string, options?: any): string => {
  const cacheKey = options ? `${key}:${JSON.stringify(options)}` : key;

  if (!options && translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  const keys = key.split('.');
  let value: any = frTranslations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      return key;
    }
  }

  if (typeof value !== 'string') return key;

  if (options) {
    return value.replace(/\{\{(\w+)\}\}/g, (_: string, varName: string) => {
      return options[varName]?.toString() ?? '';
    });
  }

  translationCache.set(cacheKey, value);
  return value;
};

interface I18nContextType {
  language: string;
  locale: string;
  setLanguage: (lang: string) => Promise<void>;
  t: (key: string, options?: any) => string;
  formatDate: (date: Date | string, options?: Intl.DateTimeFormatOptions) => string;
  isLoading: boolean;
  isRTL: boolean;
  supportedLanguages: typeof SUPPORTED_LANGUAGES;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

export const I18nProvider: React.FC<I18nProviderProps> = ({ children }) => {
  const t = useMemo(() => {
    return (key: string, options?: any): string => getTranslation(key, options);
  }, []);

  const formatDate = (date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('fr-FR', options);
  };

  const setLanguage = async (_lang: string): Promise<void> => {};

  const value: I18nContextType = useMemo(() => ({
    language: 'fr',
    locale: 'fr-FR',
    setLanguage,
    t,
    formatDate,
    isLoading: false,
    isRTL: false,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = (): I18nContextType => {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
};

export default I18nContext;
