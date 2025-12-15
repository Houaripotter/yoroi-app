import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import { getUserSettings, saveUserSettings } from './storage';
import { theme as baseTheme, darkTheme, lightTheme, ThemeType, ColorThemeKey, COLOR_THEMES, applyColorTheme } from './theme';

// ============================================
// YOROI THEME CONTEXT
// Mode Clair / Sombre / Automatique
// + Palettes de couleurs (Or / Bleu / Sakura)
// ============================================

export type ThemeMode = 'light' | 'dark' | 'system';

interface ThemeContextType {
  isDark: boolean;
  themeMode: ThemeMode;
  colorTheme: ColorThemeKey;
  colors: ThemeType['colors'];
  gradients: ThemeType['gradients'];
  setThemeMode: (mode: ThemeMode) => void;
  setColorTheme: (colorTheme: ColorThemeKey) => void;
  toggleTheme: () => void;
  colorPalettes: typeof COLOR_THEMES;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  themeMode: 'dark',
  colorTheme: 'gold',
  colors: darkTheme.colors,
  gradients: darkTheme.gradients,
  setThemeMode: () => {},
  setColorTheme: () => {},
  toggleTheme: () => {},
  colorPalettes: COLOR_THEMES,
});

export const useTheme = () => useContext(ThemeContext);

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const systemColorScheme = useColorScheme();
  // Mode sombre par defaut pour le theme Guerrier
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [colorTheme, setColorThemeState] = useState<ColorThemeKey>('gold');
  const [isLoaded, setIsLoaded] = useState(false);

  // Charger le theme sauvegarde
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const settings = await getUserSettings();
        if (settings.theme) {
          setThemeModeState(settings.theme as ThemeMode);
        }
        if (settings.colorTheme) {
          setColorThemeState(settings.colorTheme as ColorThemeKey);
        }
      } catch (error) {
        console.error('Erreur chargement theme:', error);
      }
      setIsLoaded(true);
    };
    loadTheme();
  }, []);

  // Ecouter les changements du systeme
  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      if (themeMode === 'system') {
        // Force re-render
        setThemeModeState('system');
      }
    });
    return () => subscription.remove();
  }, [themeMode]);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await saveUserSettings({ theme: mode });
  };

  const setColorTheme = async (newColorTheme: ColorThemeKey) => {
    setColorThemeState(newColorTheme);
    await saveUserSettings({ colorTheme: newColorTheme });
  };

  const toggleTheme = async () => {
    const newMode = themeMode === 'dark' ? 'light' : 'dark';
    await setThemeMode(newMode);
  };

  // Determiner si on est en mode sombre
  const isDark = themeMode === 'dark' || (themeMode === 'system' && systemColorScheme === 'dark');

  // Selectionner les couleurs et gradients selon le mode + palette de couleur
  const baseThemeSelected = isDark ? darkTheme : lightTheme;
  const currentTheme = applyColorTheme(baseThemeSelected, colorTheme);
  const colors = currentTheme.colors;
  const gradients = currentTheme.gradients;

  if (!isLoaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{
      isDark,
      themeMode,
      colorTheme,
      colors,
      gradients,
      setThemeMode,
      setColorTheme,
      toggleTheme,
      colorPalettes: COLOR_THEMES,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeContext;
