// ============================================
// YOROI - MODE CREATEUR (compatibilite)
// ============================================
// L'ancien code a 4 chiffres et son empreinte ont disparu. Le mode createur s'ouvre
// uniquement avec un jeton signe (lib/v2/creator). Ce fichier garde les anciens noms
// (DevModeProvider, useDevMode, isDevMode) pour les ecrans qui les utilisent encore :
// isDevMode vient maintenant du mode createur verifie.

import React, { useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { CreatorModeProvider, useCreatorMode } from '@/lib/v2/creator/CreatorModeContext';

interface DevModeContextType {
  isDevMode: boolean;
  /** garde pour l'ancienne fenetre de code, jamais ouverte */
  tapCount: number;
  showCodeInput: boolean;
  handleSecretTap: () => void;
  setShowCodeInput: (show: boolean) => void;
  /** l'ancien champ recoit maintenant un jeton, verifie comme dans les Reglages */
  verifyCode: (code: string) => Promise<boolean>;
  disableDevMode: () => Promise<void>;
}

export const DevModeProvider = ({ children }: { children: ReactNode }) => <CreatorModeProvider>{children}</CreatorModeProvider>;

const noop = () => undefined;

export const useDevMode = (): DevModeContextType => {
  const { isCreator, unlock, lock } = useCreatorMode();
  const verifyCode = useCallback(async (code: string) => (await unlock(code)).ok, [unlock]);
  return useMemo(
    () => ({
      isDevMode: isCreator,
      tapCount: 0,
      showCodeInput: false,
      handleSecretTap: noop,
      setShowCodeInput: noop,
      verifyCode,
      disableDevMode: lock,
    }),
    [isCreator, verifyCode, lock],
  );
};
