// ============================================
// YOROI - INTERNATIONALISATION (i18n)
// Support multilingue avec i18next
// Langues: FR, EN, ES, RU, PT, DE, IT, AR, ZH
// ============================================

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import des fichiers de traduction
import fr from './fr.json';
import en from './en.json';
import es from './es.json';
import ru from './ru.json';
import pt from './pt.json';
import de from './de.json';
import it from './it.json';
import ar from './ar.json';
import zh from './zh.json';

const LANGUAGE_KEY = '@yoroi_language';

// Liste des langues supportées
export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Spanish', nativeName: 'Español', flag: '🇪🇸' },
  { code: 'ru', name: 'Russian', nativeName: 'Русский', flag: '🇷🇺' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', flag: '🇧🇷' },
  { code: 'de', name: 'German', nativeName: 'Deutsch', flag: '🇩🇪' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano', flag: '🇮🇹' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', flag: '🇸🇦', rtl: true },
  { code: 'zh', name: 'Chinese', nativeName: '中文', flag: '🇨🇳' },
] as const;

export type LanguageCode = typeof SUPPORTED_LANGUAGES[number]['code'];

const LANGUAGE_CODES = SUPPORTED_LANGUAGES.map(l => l.code);

// Ressources de traduction
const resources = {
  fr: { translation: fr },
  en: { translation: en },
  es: { translation: es },
  ru: { translation: ru },
  pt: { translation: pt },
  de: { translation: de },
  it: { translation: it },
  ar: { translation: ar },
  zh: { translation: zh },
};

// Détecter la langue du device
const getDeviceLanguage = (): string => {
  const deviceLocale = Localization.getLocales()[0]?.languageCode || 'fr';
  // Si la langue du device est supportée, l'utiliser, sinon français par défaut
  return LANGUAGE_CODES.includes(deviceLocale as LanguageCode) ? deviceLocale : 'fr';
};

// Charger la langue sauvegardée
export const loadSavedLanguage = async (): Promise<string> => {
  try {
    const savedLang = await AsyncStorage.getItem(LANGUAGE_KEY);
    if (savedLang && LANGUAGE_CODES.includes(savedLang as LanguageCode)) {
      return savedLang;
    }
    return getDeviceLanguage();
  } catch {
    return getDeviceLanguage();
  }
};

// Sauvegarder la langue choisie
export const saveLanguage = async (lang: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_KEY, lang);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Changer la langue
export const changeLanguage = async (lang: string): Promise<void> => {
  await i18n.changeLanguage(lang);
  await saveLanguage(lang);
};

// Obtenir la langue actuelle
export const getCurrentLanguage = (): string => {
  return i18n.language || 'fr';
};

// Vérifier si la langue est RTL (Right-to-Left)
export const isRTL = (langCode?: string): boolean => {
  const code = langCode || getCurrentLanguage();
  const lang = SUPPORTED_LANGUAGES.find(l => l.code === code);
  return lang?.rtl === true;
};

// Obtenir les infos de la langue actuelle
export const getCurrentLanguageInfo = () => {
  const code = getCurrentLanguage();
  return SUPPORTED_LANGUAGES.find(l => l.code === code) || SUPPORTED_LANGUAGES[0];
};

// Initialiser i18next
const initI18n = async () => {
  const savedLanguage = await loadSavedLanguage();

  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'fr',
      compatibilityJSON: 'v3',
      interpolation: {
        escapeValue: false, // React gère déjà l'échappement
      },
      react: {
        useSuspense: false,
      },
    });

  return i18n;
};

// Initialiser au chargement du module
initI18n();

export default i18n;
