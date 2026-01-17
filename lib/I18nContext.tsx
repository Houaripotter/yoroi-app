// ============================================
// YOROI - CONTEXTE I18N (OPTIMISÉ)
// ============================================

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import direct des traductions - TOUTES LES 9 LANGUES
import frTranslations from './i18n/fr.json';
import enTranslations from './i18n/en.json';
import esTranslations from './i18n/es.json';
import ptTranslations from './i18n/pt.json';
import deTranslations from './i18n/de.json';
import itTranslations from './i18n/it.json';
import ruTranslations from './i18n/ru.json';
import arTranslations from './i18n/ar.json';
import zhTranslations from './i18n/zh.json';

const LANGUAGE_KEY = '@yoroi_language';

// Traductions disponibles (chargées une seule fois)
const translations: Record<string, any> = {
  fr: frTranslations,
  en: enTranslations,
  es: esTranslations,
  pt: ptTranslations,
  de: deTranslations,
  it: itTranslations,
  ru: ruTranslations,
  ar: arTranslations,
  zh: zhTranslations,
};

// Langues supportées - TOUTES LES 9 LANGUES
export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'pt', name: 'Português', nativeName: 'Português', flag: '🇵🇹' },
  { code: 'de', name: 'Deutsch', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italiano', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ru', name: 'Русский', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'ar', name: 'العربية', nativeName: 'العربية', flag: '🇸🇦' },
  { code: 'zh', name: '中文', nativeName: '中文', flag: '🇨🇳' },
] as const;

// Map des locales pour toLocaleDateString
export const LOCALE_MAP: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  es: 'es-ES',
  pt: 'pt-PT',
  de: 'de-DE',
  it: 'it-IT',
  ru: 'ru-RU',
  ar: 'ar-SA',
  zh: 'zh-CN',
};

// Cache pour les traductions (évite de recalculer)
const translationCache = new Map<string, string>();

// Fonction de traduction optimisée avec cache
const getTranslation = (key: string, lang: string, options?: any): string => {
  // Clé de cache
  const cacheKey = options ? `${lang}:${key}:${JSON.stringify(options)}` : `${lang}:${key}`;

  // Vérifier le cache
  if (!options && translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey)!;
  }

  const langData = translations[lang] || translations.fr;
  const keys = key.split('.');
  let value: any = langData;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback français
      value = translations.fr;
      for (const fk of keys) {
        if (value && typeof value === 'object' && fk in value) {
          value = value[fk];
        } else {
          return key;
        }
      }
      break;
    }
  }

  if (typeof value !== 'string') {
    return key;
  }

  // Interpolation {{variable}}
  if (options) {
    return value.replace(/\{\{(\w+)\}\}/g, (_: string, varName: string) => {
      return options[varName]?.toString() ?? '';
    });
  }

  // Mettre en cache (seulement sans options)
  translationCache.set(cacheKey, value);
  return value;
};

// Vider le cache quand la langue change
const clearCache = () => {
  translationCache.clear();
};

interface I18nContextType {
  language: string;
  locale: string; // Locale pour toLocaleDateString (ex: 'en-US', 'fr-FR')
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
  const [language, setLanguageState] = useState<string>('fr');
  const [isLoading, setIsLoading] = useState(false);
  const languageRef = useRef(language);

  // Mettre à jour la ref quand la langue change
  useEffect(() => {
    languageRef.current = language;
    clearCache(); // Vider le cache quand la langue change
  }, [language]);

  // Charger la langue sauvegardée au démarrage
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
        // Vérifier si la langue sauvegardée est supportée
        const validCodes = SUPPORTED_LANGUAGES.map(l => l.code);
        if (savedLang && validCodes.includes(savedLang as any)) {
          setLanguageState(savedLang);
          languageRef.current = savedLang;
        }
      } catch {
        // Ignorer les erreurs
      }
    };
    loadLanguage();
  }, []);

  // Fonction de traduction stable (utilise ref pour éviter re-création)
  const tRef = useRef((key: string, options?: any): string => {
    return getTranslation(key, languageRef.current, options);
  });

  // Changer la langue
  const setLanguageRef = useRef(async (lang: string) => {
    setIsLoading(true);
    try {
      await AsyncStorage.setItem(LANGUAGE_KEY, lang);
      setLanguageState(lang);
    } catch {
      // Ignorer les erreurs
    } finally {
      setIsLoading(false);
    }
  });

  // Fonction de formatage de date selon la langue
  const formatDateRef = useRef((date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = LOCALE_MAP[languageRef.current] || 'fr-FR';
    return d.toLocaleDateString(locale, options);
  });

  // Value stable - ne change que quand language ou isLoading change
  const value: I18nContextType = useMemo(() => ({
    language,
    locale: LOCALE_MAP[language] || 'fr-FR',
    setLanguage: setLanguageRef.current,
    t: tRef.current,
    formatDate: formatDateRef.current,
    isLoading,
    isRTL: language === 'ar',
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [language, isLoading]);

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
