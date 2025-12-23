// ============================================
// YOROI - SERVICE I18N
// ============================================
// Gestion des traductions FR/EN avec détection automatique

import { I18n } from 'i18n-js';
import { getLocales } from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import fr from '@/i18n/fr.json';
import en from '@/i18n/en.json';

// Clé de stockage pour la langue choisie
const LANGUAGE_KEY = '@yoroi_language';

// Type pour les langues supportées
export type SupportedLanguage = 'fr' | 'en';

// Instance i18n
const i18n = new I18n({ fr, en });

// Configuration
i18n.enableFallback = true;
i18n.defaultLocale = 'fr';

// ============================================
// DÉTECTION AUTOMATIQUE DE LA LANGUE
// ============================================

/**
 * Obtenir la langue du système
 */
export const getSystemLanguage = (): SupportedLanguage => {
  const locales = getLocales();
  const systemLanguage = locales[0]?.languageCode || 'fr';

  // Si la langue du système est supportée, on l'utilise
  if (systemLanguage === 'en') return 'en';

  // Par défaut, français
  return 'fr';
};

/**
 * Charger la langue sauvegardée ou détecter automatiquement
 */
export const loadLanguage = async (): Promise<SupportedLanguage> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_KEY);

    if (savedLanguage === 'fr' || savedLanguage === 'en') {
      i18n.locale = savedLanguage;
      return savedLanguage;
    }

    // Si aucune langue sauvegardée, détecter automatiquement
    const systemLanguage = getSystemLanguage();
    i18n.locale = systemLanguage;
    return systemLanguage;
  } catch (error) {
    console.error('[i18n] Erreur chargement langue:', error);
    i18n.locale = 'fr';
    return 'fr';
  }
};

/**
 * Changer la langue de l'app
 */
export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  try {
    i18n.locale = language;
    await AsyncStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    console.error('[i18n] Erreur sauvegarde langue:', error);
  }
};

/**
 * Obtenir la langue actuelle
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  return (i18n.locale as SupportedLanguage) || 'fr';
};

/**
 * Fonction de traduction (raccourci)
 */
export const t = (key: string, options?: any): string => {
  return i18n.t(key, options);
};

// Export de l'instance pour usage avancé
export { i18n };

export default i18n;
