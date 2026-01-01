import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { Badge, checkAndUnlockBadges, setFirstUseDate } from './badges';
import { Celebration } from '@/components/Celebration';
import logger from '@/lib/security/logger';

// ============================================
// BADGE CONTEXT - Gestion des badges et celebrations
// ============================================

interface BadgeContextType {
  // Verifier et debloquer les badges
  checkBadges: () => Promise<Badge[]>;
  // Badge actuellement affiche en celebration
  celebratingBadge: Badge | null;
  // Fermer la celebration
  closeCelebration: () => void;
  // File de badges a celebrer
  badgeQueue: Badge[];
}

const BadgeContext = createContext<BadgeContextType>({
  checkBadges: async () => [],
  celebratingBadge: null,
  closeCelebration: () => {},
  badgeQueue: [],
});

export const useBadges = () => useContext(BadgeContext);

interface BadgeProviderProps {
  children: ReactNode;
}

export function BadgeProvider({ children }: BadgeProviderProps) {
  const [celebratingBadge, setCelebratingBadge] = useState<Badge | null>(null);
  const [badgeQueue, setBadgeQueue] = useState<Badge[]>([]);

  // Initialiser la date de premiere utilisation au montage
  React.useEffect(() => {
    setFirstUseDate();
  }, []);

  // Traiter la file de badges
  const processQueue = useCallback((queue: Badge[]) => {
    if (queue.length > 0) {
      setCelebratingBadge(queue[0]);
      setBadgeQueue(queue.slice(1));
    } else {
      setCelebratingBadge(null);
    }
  }, []);

  // Verifier les badges et debloquer ceux eligibles
  const checkBadges = useCallback(async (): Promise<Badge[]> => {
    try {
      const newBadges = await checkAndUnlockBadges();

      if (newBadges.length > 0) {
        logger.info(`${newBadges.length} nouveau(x) badge(s) debloque(s)!`);

        // Ajouter les nouveaux badges a la file
        if (celebratingBadge) {
          // Si une celebration est en cours, ajouter a la file
          setBadgeQueue((prev) => [...prev, ...newBadges]);
        } else {
          // Sinon, commencer a celebrer le premier
          processQueue(newBadges);
        }
      }

      return newBadges;
    } catch (error) {
      logger.error('Erreur verification badges:', error);
      return [];
    }
  }, [celebratingBadge, processQueue]);

  // Fermer la celebration actuelle et passer au suivant
  const closeCelebration = useCallback(() => {
    if (badgeQueue.length > 0) {
      // Passer au badge suivant dans la file
      processQueue(badgeQueue);
    } else {
      setCelebratingBadge(null);
    }
  }, [badgeQueue, processQueue]);

  // Mémoïser la value pour éviter les re-renders en cascade
  const contextValue = useMemo(() => ({
    checkBadges,
    celebratingBadge,
    closeCelebration,
    badgeQueue,
  }), [checkBadges, celebratingBadge, closeCelebration, badgeQueue]);

  return (
    <BadgeContext.Provider value={contextValue}>
      {children}

      {/* Celebration automatique */}
      {celebratingBadge && (
        <Celebration
          visible={!!celebratingBadge}
          type="milestone"
          title="Badge debloque !"
          subtitle={`${celebratingBadge.name}\n${celebratingBadge.description}`}
          xpGained={celebratingBadge.xpReward}
          onClose={closeCelebration}
          autoClose={true}
          autoCloseDelay={5000}
        />
      )}
    </BadgeContext.Provider>
  );
}

export default BadgeContext;
