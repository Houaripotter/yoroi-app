// ============================================
// SCREENSHOT MODE CONTEXT
// Masque les éléments debug/créateur pour prendre des captures marketing propres
// ============================================

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SCREENSHOT_MODE_KEY = '@yoroi_screenshot_mode';
const FAKE_STATUS_BAR_KEY = '@yoroi_screenshot_fake_statusbar';

interface ScreenshotModeContextType {
  /** Mode screenshot actif, masque DevMode badges, toasts, debug elements */
  isScreenshotMode: boolean;
  /** Status bar faux : 09:41, batterie 100%, signal plein (look App Store) */
  useFakeStatusBar: boolean;
  toggleScreenshotMode: () => Promise<void>;
  toggleFakeStatusBar: () => Promise<void>;
  setScreenshotMode: (active: boolean) => Promise<void>;
}

const ScreenshotModeContext = createContext<ScreenshotModeContextType>({
  isScreenshotMode: false,
  useFakeStatusBar: false,
  toggleScreenshotMode: async () => {},
  toggleFakeStatusBar: async () => {},
  setScreenshotMode: async () => {},
});

export function ScreenshotModeProvider({ children }: { children: ReactNode }) {
  const [isScreenshotMode, setIsScreenshotMode] = useState(false);
  const [useFakeStatusBar, setUseFakeStatusBar] = useState(false);

  useEffect(() => {
    (async () => {
      const [screenshot, fakeBar] = await Promise.all([
        AsyncStorage.getItem(SCREENSHOT_MODE_KEY),
        AsyncStorage.getItem(FAKE_STATUS_BAR_KEY),
      ]);
      setIsScreenshotMode(screenshot === 'true');
      setUseFakeStatusBar(fakeBar === 'true');
    })();
  }, []);

  const setScreenshotMode = useCallback(async (active: boolean) => {
    setIsScreenshotMode(active);
    await AsyncStorage.setItem(SCREENSHOT_MODE_KEY, String(active));
  }, []);

  const toggleScreenshotMode = useCallback(async () => {
    const next = !isScreenshotMode;
    await setScreenshotMode(next);
  }, [isScreenshotMode, setScreenshotMode]);

  const toggleFakeStatusBar = useCallback(async () => {
    const next = !useFakeStatusBar;
    setUseFakeStatusBar(next);
    await AsyncStorage.setItem(FAKE_STATUS_BAR_KEY, String(next));
  }, [useFakeStatusBar]);

  return (
    <ScreenshotModeContext.Provider
      value={{
        isScreenshotMode,
        useFakeStatusBar,
        toggleScreenshotMode,
        toggleFakeStatusBar,
        setScreenshotMode,
      }}
    >
      {children}
    </ScreenshotModeContext.Provider>
  );
}

export function useScreenshotMode() {
  return useContext(ScreenshotModeContext);
}

/** Wrapper conditionnel : masque ses enfants quand le mode screenshot est actif */
export function HideInScreenshot({ children }: { children: ReactNode }) {
  const { isScreenshotMode } = useScreenshotMode();
  if (isScreenshotMode) return null;
  return <>{children}</>;
}
