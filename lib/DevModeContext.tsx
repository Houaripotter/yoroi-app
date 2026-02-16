// ============================================
// 🔓 YOROI - MODE CRÉATEUR / DÉVELOPPEUR
// ============================================
// Débloque TOUTES les fonctionnalités Premium

import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID, digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import logger from '@/lib/security/logger';

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

// Hash SHA-256 du code secret (ne pas stocker le code en clair)
// SECURITE: Changer ce hash si le code est compromis (utiliser un nouveau code + son hash SHA-256)
const DEV_CODE_HASH = 'a29f7cbfdfd1e85b6a9d62adbc8c5cbdfab817a6c2ed7a3671fa22c9e51c7be2';
const STORAGE_KEY = '@yoroi_dev_mode';
const TAP_THRESHOLD = 5; // Nombre de taps pour afficher le champ de code
const TAP_TIMEOUT = 2000; // Reset des taps après 2 secondes

/**
 * Vérifie si le code entré correspond au code secret
 * Compare les hash pour ne jamais exposer le code en clair
 */
async function verifyDevCode(inputCode: string): Promise<boolean> {
  try {
    const inputHash = await digestStringAsync(
      CryptoDigestAlgorithm.SHA256,
      inputCode
    );
    return inputHash === DEV_CODE_HASH;
  } catch (error) {
    logger.error('Error verifying dev code', error);
    return false;
  }
}

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
        logger.info('🔓 Mode Créateur activé');
      }
    } catch (e) {
      logger.info('Error loading dev mode:', e);
    }
  };

  // Gérer les taps secrets (mémoïsé)
  const handleSecretTap = useCallback(() => {
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
  }, [tapCount, tapTimeoutId]);

  // Vérifier le code (mémoïsé) - utilise le hash pour ne pas exposer le code
  const verifyCode = useCallback(async (code: string): Promise<boolean> => {
    const isValid = await verifyDevCode(code);
    if (isValid) {
      setIsDevMode(true);
      setShowCodeInput(false);
      await AsyncStorage.setItem(STORAGE_KEY, 'true');
      logger.info('🎉 Mode Créateur activé avec succès !');
      return true;
    }
    logger.info('❌ Code incorrect');
    return false;
  }, []);

  // Désactiver le mode dev (mémoïsé)
  const disableDevMode = useCallback(async () => {
    setIsDevMode(false);
    await AsyncStorage.removeItem(STORAGE_KEY);
    logger.info('🔒 Mode Créateur désactivé');
  }, []);

  // Mémoïser la value pour éviter les re-renders en cascade
  const contextValue = useMemo(() => ({
    isDevMode,
    isPro: true, // 🎁 TOUT GRATUIT POUR LES TESTS !
    tapCount,
    showCodeInput,
    handleSecretTap,
    setShowCodeInput,
    verifyCode,
    disableDevMode,
  }), [isDevMode, tapCount, showCodeInput, handleSecretTap, verifyCode, disableDevMode]);

  return (
    <DevModeContext.Provider value={contextValue}>
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
