// ============================================
// YOROI - CONTEXTE I18N (FRANÇAIS + ANGLAIS + JAPONAIS)
// Détection automatique de la langue du téléphone au premier lancement
// ============================================

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import frTranslations from './i18n/fr.json';
import enTranslations from './i18n/en.json';
import jaTranslations from './i18n/ja.json';

const LANGUAGE_STORAGE_KEY = '@yoroi_language';

// Locale pour toLocaleDateString
export const LOCALE_MAP: Record<string, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ja: 'ja-JP',
};

// Langues supportées
export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語', flag: '🇯🇵' },
] as const;

type LanguageCode = 'fr' | 'en' | 'ja';

const translationsMap: Record<LanguageCode, any> = {
  fr: frTranslations,
  en: enTranslations,
  ja: jaTranslations,
};

// Cache par langue
const translationCaches: Record<LanguageCode, Map<string, string>> = {
  fr: new Map(),
  en: new Map(),
  ja: new Map(),
};

// ============================================
// Détecte la langue du téléphone et la mappe
// sur une des 3 langues supportées
// ============================================
const detectDeviceLanguage = (): LanguageCode => {
  try {
    const locales = getLocales();
    if (!locales || locales.length === 0) return 'fr';

    // Prend la langue principale du téléphone (ex: "fr-FR", "en-US", "ja-JP")
    const primaryLocale = locales[0].languageTag?.toLowerCase() ?? '';
    const langCode = locales[0].languageCode?.toLowerCase() ?? '';

    // Japonais
    if (langCode === 'ja' || primaryLocale.startsWith('ja')) return 'ja';

    // Français (France, Belgique, Suisse, Canada, Maroc, Sénégal, etc.)
    if (langCode === 'fr' || primaryLocale.startsWith('fr')) return 'fr';

    // Anglais (US, UK, AU, CA, etc.)
    if (langCode === 'en' || primaryLocale.startsWith('en')) return 'en';

    // Toute autre langue → anglais par défaut (langue internationale)
    return 'en';
  } catch {
    return 'fr';
  }
};

const getTranslation = (key: string, lang: LanguageCode, options?: any): string => {
  const cache = translationCaches[lang];
  const cacheKey = options ? `${key}:${JSON.stringify(options)}` : key;

  if (!options && cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  const translations = translationsMap[lang] ?? frTranslations;
  const keys = key.split('.');
  let value: any = translations;

  for (const k of keys) {
    if (value && typeof value === 'object' && k in value) {
      value = value[k];
    } else {
      // Fallback : ja → en → fr
      if (lang === 'ja') return getTranslation(key, 'en', options);
      if (lang !== 'fr') return getTranslation(key, 'fr', options);
      return key;
    }
  }

  if (typeof value !== 'string') {
    if (lang === 'ja') return getTranslation(key, 'en', options);
    if (lang !== 'fr') return getTranslation(key, 'fr', options);
    return key;
  }

  if (options) {
    return value.replace(/\{\{(\w+)\}\}/g, (_: string, varName: string) => {
      return options[varName]?.toString() ?? '';
    });
  }

  cache.set(cacheKey, value);
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
  const [language, setLanguageState] = useState<LanguageCode>('fr');
  const [isLoading, setIsLoading] = useState(true);

  // Au démarrage : charge la langue sauvegardée ou détecte celle du téléphone
  useEffect(() => {
    const loadLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);

        if (saved && (saved === 'fr' || saved === 'en' || saved === 'ja')) {
          // L'utilisateur a déjà choisi une langue → on la respecte
          setLanguageState(saved as LanguageCode);
        } else {
          // Premier lancement → on détecte la langue du téléphone
          const detected = detectDeviceLanguage();
          setLanguageState(detected);
          // On sauvegarde pour les prochains lancements
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, detected);
        }
      } catch {
        // En cas d'erreur → détection quand même
        const detected = detectDeviceLanguage();
        setLanguageState(detected);
      } finally {
        setIsLoading(false);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = useCallback(async (lang: string): Promise<void> => {
    const validLang = (lang === 'fr' || lang === 'en' || lang === 'ja') ? lang as LanguageCode : 'fr';
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
    } catch {
      // Ignorer l'erreur AsyncStorage
    }
    setLanguageState(validLang);
  }, []);

  const t = useCallback((key: string, options?: any): string => {
    return getTranslation(key, language, options);
  }, [language]);

  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = LOCALE_MAP[language] ?? 'fr-FR';
    return d.toLocaleDateString(locale, options);
  }, [language]);

  const value: I18nContextType = useMemo(() => ({
    language,
    locale: LOCALE_MAP[language] ?? 'fr-FR',
    setLanguage,
    t,
    formatDate,
    isLoading,
    isRTL: false,
    supportedLanguages: SUPPORTED_LANGUAGES,
  }), [language, setLanguage, t, formatDate, isLoading]);

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
