import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import {
  themes,
  themeColors,
  getTheme,
  ThemeColor,
  ThemeMode,
  Theme,
  ThemeColors,
  defaultThemeColor,
  defaultThemeMode,
  GRADIENTS,
} from '@/constants/themes';

// ===================================================
// YOROI THEME CONTEXT - 18 THÈMES PREMIUM
// 9 couleurs × 2 modes (Dark/Light) + Auto
// ===================================================

const STORAGE_KEY_COLOR = 'yoroi_theme_color_v5';
const STORAGE_KEY_MODE = 'yoroi_theme_mode_v5';

interface ThemeContextType {
  // Thème actuel complet
  theme: Theme;
  // Couleurs du thème pour accès direct
  colors: ThemeColors;
  // Couleur sélectionnée (volt, tiffany, etc.)
  themeColor: ThemeColor;
  // Mode sélectionné (dark, light, auto)
  themeMode: ThemeMode;
  // Mode réel appliqué (dark ou light, après résolution de auto)
  actualMode: 'dark' | 'light';
  // Alias pour actualMode (compatibilité)
  mode: 'dark' | 'light';
  // Si le mode sombre est actif
  isDark: boolean;
  // Changer la couleur du thème
  setThemeColor: (color: ThemeColor) => Promise<void>;
  // Changer le mode (dark/light/auto)
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  // Liste des couleurs disponibles pour le sélecteur
  themeColors: typeof themeColors;
  // Couleurs de fond raccourcies
  screenBackground: string;
  containerBackground: string;
  // Glow shadow style
  glowShadow: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
  // Gradients (compatibilité)
  gradients: typeof GRADIENTS;
  // Nom du thème (compatibilité avec ancien code)
  themeName: string;
  // Chargement terminé
  isLoaded: boolean;
}

// Valeurs par défaut
const defaultTheme = getTheme(defaultThemeColor, 'dark') || themes.volt_dark;

const ThemeContext = createContext<ThemeContextType>({
  theme: defaultTheme,
  colors: defaultTheme.colors,
  themeColor: defaultThemeColor,
  themeMode: defaultThemeMode,
  actualMode: 'dark',
  mode: 'dark',
  isDark: true,
  setThemeColor: async () => {},
  setThemeMode: async () => {},
  themeColors,
  screenBackground: defaultTheme.colors.background,
  containerBackground: defaultTheme.colors.backgroundCard,
  glowShadow: {
    shadowColor: defaultTheme.colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  gradients: GRADIENTS,
  themeName: `${defaultThemeColor}_dark`,
  isLoaded: false,
});

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    // Fallback de sécurité si le contexte est undefined (ne devrait pas arriver)
    logger.error('CRITICAL: useTheme() called but context is undefined. Using default fallback.');
    return {
      theme: defaultTheme,
      colors: defaultTheme.colors,
      themeColor: defaultThemeColor,
      themeMode: defaultThemeMode,
      actualMode: 'dark' as const,
      mode: 'dark' as const,
      isDark: true,
      setThemeColor: async () => {},
      setThemeMode: async () => {},
      themeColors,
      screenBackground: defaultTheme.colors.background,
      containerBackground: defaultTheme.colors.backgroundCard,
      glowShadow: {
        shadowColor: defaultTheme.colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
      },
      gradients: GRADIENTS,
      themeName: `${defaultThemeColor}_dark`,
      isLoaded: true,
    };
  }
  return context;
};

// Re-export types for convenience
export type { ThemeColors, Theme, ThemeColor, ThemeMode } from '@/constants/themes';

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  const [isLoaded, setIsLoaded] = useState(false);
  const [themeColor, setThemeColorState] = useState<ThemeColor>(defaultThemeColor);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(defaultThemeMode);

  // Déterminer le mode réel (résolution de auto)
  const actualMode: 'dark' | 'light' = themeMode === 'auto'
    ? (systemColorScheme === 'light' ? 'light' : 'dark')
    : themeMode;

  // Obtenir le thème actuel (MÉMOÏSÉ pour éviter re-calcul)
  const theme = useMemo(() => getTheme(themeColor, actualMode), [themeColor, actualMode]);
  const colors = useMemo(() => theme.colors, [theme]);

  // Charger les préférences au démarrage
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const [savedColor, savedMode] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_COLOR),
          AsyncStorage.getItem(STORAGE_KEY_MODE),
        ]);

        if (savedColor && Object.keys(themes).some(k => k.startsWith(savedColor))) {
          setThemeColorState(savedColor as ThemeColor);
        }

        if (savedMode && ['dark', 'light', 'auto'].includes(savedMode)) {
          setThemeModeState(savedMode as ThemeMode);
        }
      } catch (error) {
        logger.error('Erreur chargement thème:', error);
      }
      setIsLoaded(true);
    };

    loadTheme();
  }, []);

  // Changer la couleur du thème
  const setThemeColor = useCallback(async (color: ThemeColor) => {
    try {
      setThemeColorState(color);
      await AsyncStorage.setItem(STORAGE_KEY_COLOR, color);
    } catch (error) {
      logger.error('Erreur sauvegarde couleur:', error);
    }
  }, []);

  // Changer le mode du thème
  const setThemeMode = useCallback(async (mode: ThemeMode) => {
    try {
      setThemeModeState(mode);
      await AsyncStorage.setItem(STORAGE_KEY_MODE, mode);
    } catch (error) {
      logger.error('Erreur sauvegarde mode:', error);
    }
  }, []);

  // Générer le style de glow basé sur l'accent (mémoïsé pour éviter re-renders)
  const glowShadow = useMemo(() => ({
    shadowColor: colors.accent,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  }), [colors.accent]);

  // Mémoïser la value du Provider pour éviter les re-renders en cascade
  // IMPORTANT: Doit être AVANT le return conditionnel (Rules of Hooks)
  const contextValue = useMemo(() => ({
    theme,
    colors,
    themeColor,
    themeMode,
    actualMode,
    mode: actualMode,
    isDark: actualMode === 'dark',
    setThemeColor,
    setThemeMode,
    themeColors,
    screenBackground: colors.background,
    containerBackground: colors.backgroundCard,
    glowShadow,
    gradients: GRADIENTS,
    themeName: `${themeColor}_${actualMode}`,
    isLoaded,
  }), [theme, colors, themeColor, themeMode, actualMode, setThemeColor, setThemeMode, glowShadow, isLoaded]);

  // Attendre le chargement avant de rendre
  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
