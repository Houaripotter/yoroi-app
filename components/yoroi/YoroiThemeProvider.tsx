import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';
import { YOROI_THEME_NAMES, yoroiThemes } from './tokens';
import type { YoroiMode, YoroiTheme, YoroiThemeName } from './tokens';
import { appliquerPalette } from './livePalette';
import { traduire } from '@/lib/i18n/tr';

export const YOROI_THEME_STORAGE_KEY = 'yoroi_design_theme_v1';
/** Vague 35 : clair, sombre ou auto (suit l'iPhone) */
export const YOROI_MODE_STORAGE_KEY = 'yoroi_apparence_mode_v1';
const DEFAULT_THEME: YoroiThemeName = 'dojo';
const DEFAULT_MODE: YoroiMode = 'clair';
const MODES: YoroiMode[] = ['clair', 'sombre', 'auto'];

type YoroiThemeContextValue = {
  theme: YoroiTheme;
  themeName: YoroiThemeName;
  setThemeName: (name: YoroiThemeName) => void;
  /** mode choisi par toi : clair, sombre ou auto */
  mode: YoroiMode;
  setMode: (mode: YoroiMode) => void;
  /** passe au mode suivant (clair, sombre, auto) et le renvoie */
  cycleMode: () => YoroiMode;
  /** true si l'app s'affiche en sombre en ce moment (auto compris) */
  isDark: boolean;
  isReady: boolean;
};

const YoroiThemeContext = createContext<YoroiThemeContextValue | null>(null);

function isThemeName(value: string | null): value is YoroiThemeName {
  return value !== null && (YOROI_THEME_NAMES as string[]).includes(value);
}

function isMode(value: string | null): value is YoroiMode {
  return value !== null && (MODES as string[]).includes(value);
}

/** Libelle court du mode, pour le toast et les reglages */
export function libelleMode(mode: YoroiMode): string {
  return mode === 'sombre' ? 'Mode sombre' : mode === 'auto' ? traduire('Mode auto, comme ton téléphone') : 'Mode clair';
}

type ProviderProps = {
  children: React.ReactNode;
  /** Theme initial avant lecture du stockage */
  initialTheme?: YoroiThemeName;
  /** true : ignore la couleur enregistree et garde initialTheme (le mode clair, sombre ou auto s'applique quand meme) */
  locked?: boolean;
};

export function YoroiThemeProvider({ children, initialTheme = DEFAULT_THEME, locked = false }: ProviderProps) {
  const [themeName, setThemeNameState] = useState<YoroiThemeName>(initialTheme);
  const [mode, setModeState] = useState<YoroiMode>(DEFAULT_MODE);
  const [isReady, setIsReady] = useState(false);
  const systeme = useColorScheme();

  useEffect(() => {
    let cancelled = false;
    // filet : si le stockage tarde, l'app s'affiche quand meme en clair
    const filet = setTimeout(() => {
      if (!cancelled) setIsReady(true);
    }, 700);
    Promise.all([locked ? Promise.resolve(null) : AsyncStorage.getItem(YOROI_THEME_STORAGE_KEY), AsyncStorage.getItem(YOROI_MODE_STORAGE_KEY)])
      .then(([stored, storedMode]) => {
        if (cancelled) return;
        if (isThemeName(stored)) setThemeNameState(stored);
        if (isMode(storedMode)) setModeState(storedMode);
      })
      .catch((err) => logger.error('Lecture du theme YOROI impossible', err))
      .finally(() => {
        clearTimeout(filet);
        if (!cancelled) setIsReady(true);
      });
    return () => {
      cancelled = true;
      clearTimeout(filet);
    };
  }, [locked]);

  const setThemeName = useCallback((name: YoroiThemeName) => {
    setThemeNameState(name);
    AsyncStorage.setItem(YOROI_THEME_STORAGE_KEY, name).catch((err) => logger.error('Sauvegarde du theme YOROI impossible', err));
  }, []);

  const setMode = useCallback((next: YoroiMode) => {
    setModeState(next);
    AsyncStorage.setItem(YOROI_MODE_STORAGE_KEY, next).catch((err) => logger.error('Sauvegarde du mode YOROI impossible', err));
  }, []);

  const cycleMode = useCallback((): YoroiMode => {
    const next = MODES[(MODES.indexOf(mode) + 1) % MODES.length];
    setMode(next);
    return next;
  }, [mode, setMode]);

  const isDark = mode === 'sombre' || (mode === 'auto' && systeme === 'dark');
  const effectiveName: YoroiThemeName = isDark ? 'nuit' : themeName === 'nuit' ? DEFAULT_THEME : themeName;
  // la palette P des ecrans v2 est recopiee avant que les enfants se redessinent
  appliquerPalette(isDark);

  const value = useMemo<YoroiThemeContextValue>(
    () => ({ theme: yoroiThemes[effectiveName], themeName, setThemeName, mode, setMode, cycleMode, isDark, isReady }),
    [effectiveName, themeName, setThemeName, mode, setMode, cycleMode, isDark, isReady],
  );

  return <YoroiThemeContext.Provider value={value}>{isReady ? children : null}</YoroiThemeContext.Provider>;
}

const FALLBACK: YoroiThemeContextValue = {
  theme: yoroiThemes[DEFAULT_THEME],
  themeName: DEFAULT_THEME,
  setThemeName: () => {},
  mode: DEFAULT_MODE,
  setMode: () => {},
  cycleMode: () => DEFAULT_MODE,
  isDark: false,
  isReady: true,
};

/** Hors provider, renvoie le theme dojo (lecture seule) */
export function useYoroiTheme(): YoroiThemeContextValue {
  return useContext(YoroiThemeContext) ?? FALLBACK;
}
