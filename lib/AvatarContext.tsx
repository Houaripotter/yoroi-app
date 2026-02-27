import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { getAvatarConfig, getAvatarImage, onAvatarChange, type AvatarConfig } from '@/lib/avatarSystem';
import logger from '@/lib/security/logger';

// ===================================================
// YOROI AVATAR CONTEXT - Sync avatar partout
// ===================================================

interface AvatarContextType {
  /** Image resolue (require()) */
  avatarImage: any;
  /** Config brute de l'avatar */
  avatarConfig: AvatarConfig | null;
  /** Chargement en cours */
  isLoading: boolean;
  /** Forcer un refresh */
  refreshAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextType>({
  avatarImage: null,
  avatarConfig: null,
  isLoading: true,
  refreshAvatar: async () => {},
});

export const useAvatar = (): AvatarContextType => {
  const context = useContext(AvatarContext);
  if (!context) {
    logger.error('CRITICAL: useAvatar() called but context is undefined.');
    return {
      avatarImage: null,
      avatarConfig: null,
      isLoading: false,
      refreshAvatar: async () => {},
    };
  }
  return context;
};

interface AvatarProviderProps {
  children: ReactNode;
}

export function AvatarProvider({ children }: AvatarProviderProps) {
  const [avatarConfig, setAvatarConfig] = useState<AvatarConfig | null>(null);
  const [avatarImage, setAvatarImage] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadAvatar = useCallback(async () => {
    try {
      const config = await getAvatarConfig();
      const image = getAvatarImage(
        config.pack,
        config.packType === 'character' ? config.state : undefined,
        config.collectionCharacter,
        config.gender
      );
      setAvatarConfig(config);
      setAvatarImage(image);
    } catch (error) {
      logger.error('[AvatarContext] Erreur chargement avatar:', error);
      setAvatarImage(require('@/assets/avatars/samurai/samurai_neutral.png'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Charger au mount (PAS useFocusEffect)
  useEffect(() => {
    loadAvatar();
  }, [loadAvatar]);

  // Ecouter les changements (quand l'utilisateur change d'avatar)
  useEffect(() => {
    const unsubscribe = onAvatarChange(() => {
      loadAvatar();
    });
    return unsubscribe;
  }, [loadAvatar]);

  const contextValue = useMemo(() => ({
    avatarImage,
    avatarConfig,
    isLoading,
    refreshAvatar: loadAvatar,
  }), [avatarImage, avatarConfig, isLoading, loadAvatar]);

  return (
    <AvatarContext.Provider value={contextValue}>
      {children}
    </AvatarContext.Provider>
  );
}

export default AvatarContext;
