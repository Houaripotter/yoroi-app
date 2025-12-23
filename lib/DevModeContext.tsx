// ============================================
// 🔓 YOROI - MODE CRÉATEUR / DÉVELOPPEUR
// ============================================
// Code secret : 2412
// Débloque TOUTES les fonctionnalités Premium

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// TYPES
// ============================================

interface DevModeContextType {
  isDevMode: boolean;
  isPro: boolean;
  tapCount: number;
  showCodeInput: boolean;
  handleSecretTap: () => void;
  setShowCodeInput: (show: boolean) => void;
  verifyCode: (code: string) => Promise<boolean>;
  disableDevMode: () => Promise<void>;
}

// ============================================
// CONFIGURATION
// ============================================

const DEV_CODE = '2412';
const STORAGE_KEY = '@yoroi_dev_mode';
const TAP_THRESHOLD = 5; // Nombre de taps pour afficher le champ de code
const TAP_TIMEOUT = 2000; // Reset des taps après 2 secondes

// ============================================
// CONTEXT
// ============================================

const DevModeContext = createContext<DevModeContextType | undefined>(undefined);

// ============================================
// PROVIDER
// ============================================

export const DevModeProvider = ({ children }: { children: ReactNode }) => {
  const [isDevMode, setIsDevMode] = useState(false);
  const [tapCount, setTapCount] = useState(0);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [tapTimeoutId, setTapTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Charger l'état au démarrage
  useEffect(() => {
    loadDevMode();
  }, []);

  // Charger le mode dev depuis le storage
  const loadDevMode = async () => {
    try {
      const saved = await AsyncStorage.getItem(STORAGE_KEY);
      if (saved === 'true') {
        setIsDevMode(true);
        console.log('🔓 Mode Créateur activé');
      }
    } catch (e) {
      console.log('Error loading dev mode:', e);
    }
  };

  // Gérer les taps secrets
  const handleSecretTap = () => {
    const newCount = tapCount + 1;
    setTapCount(newCount);

    // Clear le timeout précédent
    if (tapTimeoutId) {
      clearTimeout(tapTimeoutId);
    }

    // Si on atteint le seuil, afficher le champ de code
    if (newCount >= TAP_THRESHOLD) {
      setShowCodeInput(true);
      setTapCount(0);
      return;
    }

    // Reset après le timeout
    const timeoutId = setTimeout(() => {
      setTapCount(0);
    }, TAP_TIMEOUT);

    setTapTimeoutId(timeoutId);
  };

  // Vérifier le code
  const verifyCode = async (code: string): Promise<boolean> => {
    if (code === DEV_CODE) {
      setIsDevMode(true);
      setShowCodeInput(false);
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      console.log('🎉 Mode Créateur activé avec succès !');
      return true;
    }
    console.log('❌ Code incorrect');
    return false;
  };

  // Désactiver le mode dev
  const disableDevMode = async () => {
    setIsDevMode(false);
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('🔒 Mode Créateur désactivé');
  };

  return (
    <DevModeContext.Provider
      value={{
        isDevMode,
        isPro: true, // 🎁 TOUT GRATUIT POUR LES TESTS !
        tapCount,
        showCodeInput,
        handleSecretTap,
        setShowCodeInput,
        verifyCode,
        disableDevMode,
      }}
    >
      {children}
    </DevModeContext.Provider>
  );
};

// ============================================
// HOOK
// ============================================

export const useDevMode = () => {
  const context = useContext(DevModeContext);
  if (context === undefined) {
    throw new Error('useDevMode must be used within a DevModeProvider');
  }
  return context;
};
