// ============================================
// YOROI - HOOK useAvatar
// ============================================
// Hook personnalise pour la gestion des avatars
// Fournit toutes les fonctions et donnees liees aux avatars

import { useState, useEffect, useCallback } from 'react';
import {
  AVATARS,
  PACKS,
  RARITY_COLORS,
  AvatarData,
  AvatarState,
  AvatarRarity,
  UnlockedAvatarData,
  CollectionStats,
  UserStats,
  getUnlockedAvatars,
  getEquippedAvatar,
  equipAvatar,
  isAvatarUnlocked,
  unlockAvatar,
  checkAndUnlockAvatars,
  getCollectionStats,
  getAvatarsByRarity,
  getUserStats,
  getCurrentFitnessScore,
  getAvatarStateFromScore,
  getAvatarImage,
  getAvatarPreviewImage,
  formatConditionText,
  getConditionProgress,
  purchasePack,
  purchaseAvatar,
  getPurchasedPacks,
  getPurchasedAvatars,
} from '@/services/AvatarService';

// ============================================
// TYPES
// ============================================

export interface UseAvatarReturn {
  // Etat actuel
  currentAvatar: AvatarData | null;
  currentAvatarId: string;
  currentState: AvatarState;
  fitnessScore: number;

  // Collections
  unlockedAvatars: UnlockedAvatarData[];
  lockedAvatars: AvatarData[];
  avatarsByRarity: Record<AvatarRarity, Array<AvatarData & { isUnlocked: boolean }>>;

  // Stats
  stats: CollectionStats | null;
  userStats: UserStats | null;
  progress: { unlocked: number; total: number; percentage: number };

  // Actions
  equipAvatar: (avatarId: string) => Promise<boolean>;
  checkUnlocks: () => Promise<string[]>;
  refreshData: () => Promise<void>;
  purchasePack: (packId: string) => Promise<string[]>;
  purchaseAvatar: (avatarId: string) => Promise<boolean>;

  // Helpers
  getImage: (avatarId: string, state?: AvatarState) => any;
  getPreviewImage: (avatarId: string) => any;
  getConditionText: (avatarId: string) => string;
  getProgress: (avatarId: string) => { current: number; target: number; percentage: number };
  getRarityColor: (rarity: AvatarRarity) => { border: string; glow: string; stars: number; icon: string };
  isUnlocked: (avatarId: string) => boolean;

  // Loading
  isLoading: boolean;
}

// ============================================
// HOOK
// ============================================

export const useAvatar = (): UseAvatarReturn => {
  // State
  const [currentAvatarId, setCurrentAvatarId] = useState<string>('samurai');
  const [currentState, setCurrentState] = useState<AvatarState>('neutral');
  const [fitnessScore, setFitnessScore] = useState<number>(50);
  const [unlockedAvatars, setUnlockedAvatars] = useState<UnlockedAvatarData[]>([]);
  const [avatarsByRarity, setAvatarsByRarity] = useState<Record<AvatarRarity, Array<AvatarData & { isUnlocked: boolean }>>>({
    COMMON: [],
    UNCOMMON: [],
    RARE: [],
    EPIC: [],
    LEGENDARY: [],
    SECRET: [],
  });
  const [stats, setStats] = useState<CollectionStats | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [purchasedPacks, setPurchasedPacks] = useState<string[]>([]);
  const [purchasedAvatarsState, setPurchasedAvatarsState] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // ============================================
  // CHARGEMENT DES DONNEES
  // ============================================

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      // Charger toutes les donnees en parallele
      const [
        equippedId,
        unlocked,
        byRarity,
        collectionStats,
        uStats,
        score,
        pPacks,
        pAvatars,
      ] = await Promise.all([
        getEquippedAvatar(),
        getUnlockedAvatars(),
        getAvatarsByRarity(),
        getCollectionStats(),
        getUserStats(),
        getCurrentFitnessScore(),
        getPurchasedPacks(),
        getPurchasedAvatars(),
      ]);

      setCurrentAvatarId(equippedId);
      setUnlockedAvatars(unlocked);
      setAvatarsByRarity(byRarity);
      setStats(collectionStats);
      setUserStats(uStats);
      setFitnessScore(score);
      setCurrentState(getAvatarStateFromScore(score));
      setPurchasedPacks(pPacks);
      setPurchasedAvatarsState(pAvatars);
    } catch (error) {
      console.error('Erreur chargement donnees avatar:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Chargement initial
  useEffect(() => {
    loadData();
  }, [loadData]);

  // ============================================
  // ACTIONS
  // ============================================

  const handleEquipAvatar = useCallback(async (avatarId: string): Promise<boolean> => {
    const success = await equipAvatar(avatarId);
    if (success) {
      setCurrentAvatarId(avatarId);
    }
    return success;
  }, []);

  const handleCheckUnlocks = useCallback(async (): Promise<string[]> => {
    const newlyUnlocked = await checkAndUnlockAvatars();
    if (newlyUnlocked.length > 0) {
      // Recharger les donnees
      await loadData();
    }
    return newlyUnlocked;
  }, [loadData]);

  const handlePurchasePack = useCallback(async (packId: string): Promise<string[]> => {
    const unlockedAvatars = await purchasePack(packId);
    if (unlockedAvatars.length > 0) {
      await loadData();
    }
    return unlockedAvatars;
  }, [loadData]);

  const handlePurchaseAvatar = useCallback(async (avatarId: string): Promise<boolean> => {
    const success = await purchaseAvatar(avatarId);
    if (success) {
      await loadData();
    }
    return success;
  }, [loadData]);

  // ============================================
  // HELPERS
  // ============================================

  const getImage = useCallback((avatarId: string, state?: AvatarState): any => {
    return getAvatarImage(avatarId, state || currentState);
  }, [currentState]);

  const getPreviewImage = useCallback((avatarId: string): any => {
    return getAvatarPreviewImage(avatarId);
  }, []);

  const getConditionText = useCallback((avatarId: string): string => {
    const avatar = AVATARS[avatarId];
    if (!avatar) return '';

    if (avatar.premium) {
      return `${avatar.premium.toFixed(2)} EUR`;
    }
    if (avatar.pack) {
      const pack = PACKS[avatar.pack];
      return pack ? `Pack ${pack.name}` : 'Pack';
    }

    return formatConditionText(avatar.condition);
  }, []);

  const getProgress = useCallback((avatarId: string): { current: number; target: number; percentage: number } => {
    const avatar = AVATARS[avatarId];
    if (!avatar || !avatar.condition || avatar.condition === 'default') {
      return { current: 1, target: 1, percentage: 100 };
    }
    return getConditionProgress(avatar.condition, userStats || {
      totalWeighings: 0,
      totalWorkouts: 0,
      currentStreak: 0,
      totalWeightLost: 0,
    });
  }, [userStats]);

  const getRarityColor = useCallback((rarity: AvatarRarity) => {
    return RARITY_COLORS[rarity];
  }, []);

  const checkIsUnlocked = useCallback((avatarId: string): boolean => {
    return unlockedAvatars.some(a => a.avatarId === avatarId);
  }, [unlockedAvatars]);

  // ============================================
  // DONNEES DERIVEES
  // ============================================

  const currentAvatar = AVATARS[currentAvatarId] || null;

  const lockedAvatars = Object.values(AVATARS).filter(
    avatar => !unlockedAvatars.some(u => u.avatarId === avatar.id)
  );

  const progress = {
    unlocked: unlockedAvatars.length,
    total: Object.keys(AVATARS).length,
    percentage: stats?.percentage || 0,
  };

  // ============================================
  // RETURN
  // ============================================

  return {
    // Etat actuel
    currentAvatar,
    currentAvatarId,
    currentState,
    fitnessScore,

    // Collections
    unlockedAvatars,
    lockedAvatars,
    avatarsByRarity,

    // Stats
    stats,
    userStats,
    progress,

    // Actions
    equipAvatar: handleEquipAvatar,
    checkUnlocks: handleCheckUnlocks,
    refreshData: loadData,
    purchasePack: handlePurchasePack,
    purchaseAvatar: handlePurchaseAvatar,

    // Helpers
    getImage,
    getPreviewImage,
    getConditionText,
    getProgress,
    getRarityColor,
    isUnlocked: checkIsUnlocked,

    // Loading
    isLoading,
  };
};

export default useAvatar;
