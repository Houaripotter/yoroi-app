// ============================================
// YOROI - CONTEXTE I18N (FRANÇAIS + ANGLAIS + JAPONAIS)
// Détection automatique de la langue du téléphone au premier lancement
// ============================================

import React, { createContext, useContext, ReactNode, useMemo, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { logger } from './security/logger';
import frTranslations from './i18n/fr.json';
import { traduire, LOCALE } from '@/lib/i18n/tr';
// 23 octobre 2026 : les anciens en.json et ja.json ne sont plus chargés.
// Les textes viennent de fr.json puis passent par traduire(), dans la langue du téléphone.
const FORCED_LANGUAGE = 'fr' as const;

const LANGUAGE_STORAGE_KEY = '@yoroi_language';

// Locale pour toLocaleDateString
export const LOCALE_MAP: Record<string, string> = {
  fr: LOCALE,
  en: 'en-US',
  ja: 'ja-JP',
};

// Langues supportées
export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '' },
] as const;

type LanguageCode = 'fr' | 'en' | 'ja';

const translationsMap: Record<LanguageCode, any> = {
  fr: frTranslations,
  en: frTranslations,
  ja: frTranslations,
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
// Lancement en français seul : la langue du téléphone est ignorée pour l'instant.
const detectDeviceLanguage = (): LanguageCode => FORCED_LANGUAGE;

// Détection d'origine, gardée pour le retour des autres langues.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const detectPhoneLanguage = (): LanguageCode => {
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

  value = traduire(value);

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

        if (saved && saved === FORCED_LANGUAGE) {
          // L'utilisateur a déjà choisi une langue → on la respecte
          setLanguageState(saved as LanguageCode);
        } else {
          // Premier lancement → on détecte la langue du téléphone
          const detected = detectDeviceLanguage();
          setLanguageState(detected);
          // On sauvegarde pour les prochains lancements
          await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, detected);
        }
      } catch (e) {
        logger.warn('I18n: erreur lors du chargement de la langue sauvegardée', e);
        const detected = detectDeviceLanguage();
        setLanguageState(detected);
      } finally {
        setIsLoading(false);
      }
    };
    loadLanguage();
  }, []);

  const setLanguage = useCallback(async (lang: string): Promise<void> => {
    const validLang: LanguageCode = FORCED_LANGUAGE;
    // Mettre à jour l'état immédiatement pour garantir le re-render
    setLanguageState(validLang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, validLang);
    } catch (e) {
      logger.warn('I18n: échec de la sauvegarde de la langue dans AsyncStorage', e);
    }
  }, []);

  const t = useCallback((key: string, options?: any): string => {
    return getTranslation(key, language, options);
  }, [language]);

  const formatDate = useCallback((date: Date | string, options?: Intl.DateTimeFormatOptions): string => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = LOCALE;
    return d.toLocaleDateString(locale, options);
  }, [language]);

  const value: I18nContextType = useMemo(() => ({
    language,
    locale: LOCALE,
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
