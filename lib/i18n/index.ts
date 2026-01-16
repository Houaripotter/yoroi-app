// ============================================
// YOROI - I18N (LEGACY - NOT USED)
// ============================================
// Ce fichier existe pour la compatibilité mais n'est plus utilisé
// Toutes les traductions passent par I18nContext.tsx

export const SUPPORTED_LANGUAGES = [
  { code: 'fr', name: 'Français', nativeName: 'Français', flag: '🇫🇷' },
  { code: 'en', name: 'English', nativeName: 'English', flag: '🇬🇧' },
] as const;

export type LanguageCode = 'fr' | 'en';

export const getCurrentLanguage = (): string => 'fr';
export const changeLanguage = async (lang: string): Promise<void> => {};
export const isRTL = (lang?: string): boolean => false;

export default {};
