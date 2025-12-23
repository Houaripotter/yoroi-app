// ============================================
// YOROI - AVATAR SERVICE
// ============================================
// Gestion complete des avatars: deblocage, equipement, etats
// 100% Offline - AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getAllMeasurements, getAllWorkouts } from '@/lib/storage';
import { calculateFitnessScore } from '@/lib/fitnessScore';

// ============================================
// TYPES ET CONSTANTES
// ============================================

export type AvatarRarity = 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'SECRET';
export type AvatarState = 'legendary' | 'strong' | 'neutral' | 'tired' | 'down';

export interface AvatarCondition {
  type: 'weighings' | 'streak' | 'workouts' | 'weightLost';
  value: number;
}

export interface AvatarData {
  id: string;
  name: string;
  rarity: AvatarRarity;
  folder: string;
  condition?: AvatarCondition | 'default';
  premium?: number;
  pack?: string;
  hasStates: boolean; // true si l'avatar a des etats (legendary, strong, etc.)
}

export interface PackData {
  id: string;
  name: string;
  price: number;
  avatars: string[];
}

export interface UnlockedAvatarData {
  avatarId: string;
  unlockedAt: string;
}

// Cles de stockage
const STORAGE_KEYS = {
  UNLOCKED_AVATARS: '@yoroi_unlocked_avatars',
  EQUIPPED_AVATAR: '@yoroi_equipped_avatar',
  PURCHASED_PACKS: '@yoroi_purchased_packs',
  PURCHASED_AVATARS: '@yoroi_purchased_avatars',
};

// ============================================
// COULEURS PAR RARETE
// ============================================

export const RARITY_COLORS: Record<AvatarRarity, { border: string; glow: string; stars: number; icon: string }> = {
  COMMON: { border: '#888888', glow: 'rgba(136, 136, 136, 0.3)', stars: 1, icon: '⭐' },
  UNCOMMON: { border: '#4CAF50', glow: 'rgba(76, 175, 80, 0.3)', stars: 2, icon: '⭐⭐' },
  RARE: { border: '#2196F3', glow: 'rgba(33, 150, 243, 0.3)', stars: 3, icon: '⭐⭐⭐' },
  EPIC: { border: '#9C27B0', glow: 'rgba(156, 39, 176, 0.4)', stars: 4, icon: '⭐⭐⭐⭐' },
  LEGENDARY: { border: '#FFD700', glow: 'rgba(255, 215, 0, 0.5)', stars: 5, icon: '⭐⭐⭐⭐⭐' },
  SECRET: { border: '#8B0000', glow: 'rgba(139, 0, 0, 0.5)', stars: 6, icon: '💀' },
};

// ============================================
// DONNEES DES AVATARS
// ============================================

export const AVATARS: Record<string, AvatarData> = {
  // GRATUITS AVEC ETATS
  samurai: {
    id: 'samurai',
    name: 'Samourai',
    rarity: 'COMMON',
    condition: 'default',
    folder: 'samurai',
    hasStates: true,
  },
  ninja: {
    id: 'ninja',
    name: 'Ninja',
    rarity: 'UNCOMMON',
    condition: { type: 'weighings', value: 10 },
    folder: 'ninja',
    hasStates: true,
  },
  ronin: {
    id: 'ronin',
    name: 'Ronin',
    rarity: 'RARE',
    condition: { type: 'streak', value: 30 },
    folder: 'ronin',
    hasStates: true,
  },
  boxer: {
    id: 'boxer',
    name: 'Boxeur',
    rarity: 'UNCOMMON',
    condition: { type: 'streak', value: 7 },
    folder: 'boxer',
    hasStates: true,
  },
  judoka: {
    id: 'judoka',
    name: 'Judoka',
    rarity: 'COMMON',
    condition: { type: 'workouts', value: 1 },
    folder: 'judoka',
    hasStates: true,
  },
  karateka: {
    id: 'karateka',
    name: 'Karateka',
    rarity: 'RARE',
    condition: { type: 'workouts', value: 20 },
    folder: 'karateka',
    hasStates: true,
  },
  wrestler: {
    id: 'wrestler',
    name: 'Lutteur',
    rarity: 'UNCOMMON',
    condition: { type: 'workouts', value: 5 },
    folder: 'wrestler',
    hasStates: true,
  },
  mma: {
    id: 'mma',
    name: 'MMA Fighter',
    rarity: 'RARE',
    condition: { type: 'weightLost', value: 5 },
    folder: 'mma',
    hasStates: true,
  },

  // PREMIUM INDIVIDUELS AVEC ETATS
  shogun: {
    id: 'shogun',
    name: 'Shogun',
    rarity: 'LEGENDARY',
    premium: 2.99,
    folder: 'shogun',
    hasStates: true,
  },
  oni: {
    id: 'oni',
    name: 'Oni Demon',
    rarity: 'EPIC',
    premium: 2.99,
    folder: 'oni',
    hasStates: true,
  },
  emperor: {
    id: 'emperor',
    name: 'Empereur Dore',
    rarity: 'LEGENDARY',
    premium: 4.99,
    folder: 'emperor',
    hasStates: true,
  },
  ghost: {
    id: 'ghost',
    name: 'Samourai Fantome',
    rarity: 'EPIC',
    premium: 2.99,
    folder: 'ghost',
    hasStates: true,
  },
  champion: {
    id: 'champion',
    name: 'Champion Boxeur',
    rarity: 'LEGENDARY',
    premium: 2.99,
    folder: 'champion',
    hasStates: true,
  },

  // PACK COMBAT (pas d'etats, image unique)
  muaythai: {
    id: 'muaythai',
    name: 'Muay Thai',
    rarity: 'RARE',
    pack: 'combat',
    folder: 'pack_combat',
    hasStates: false,
  },
  taekwondo: {
    id: 'taekwondo',
    name: 'Taekwondo',
    rarity: 'RARE',
    pack: 'combat',
    folder: 'pack_combat',
    hasStates: false,
  },
  capoeira: {
    id: 'capoeira',
    name: 'Capoeira',
    rarity: 'RARE',
    pack: 'combat',
    folder: 'pack_combat',
    hasStates: false,
  },
  kravmaga: {
    id: 'kravmaga',
    name: 'Krav Maga',
    rarity: 'RARE',
    pack: 'combat',
    folder: 'pack_combat',
    hasStates: false,
  },
  sumo: {
    id: 'sumo',
    name: 'Sumo',
    rarity: 'RARE',
    pack: 'combat',
    folder: 'pack_combat',
    hasStates: false,
  },

  // PACK FEMMES
  kunoichi: {
    id: 'kunoichi',
    name: 'Kunoichi',
    rarity: 'RARE',
    pack: 'femmes',
    folder: 'pack_femmes',
    hasStates: false,
  },
  valkyrie: {
    id: 'valkyrie',
    name: 'Valkyrie',
    rarity: 'EPIC',
    pack: 'femmes',
    folder: 'pack_femmes',
    hasStates: false,
  },
  amazon: {
    id: 'amazon',
    name: 'Amazone',
    rarity: 'RARE',
    pack: 'femmes',
    folder: 'pack_femmes',
    hasStates: false,
  },
  boxer_woman: {
    id: 'boxer_woman',
    name: 'Boxeuse',
    rarity: 'RARE',
    pack: 'femmes',
    folder: 'pack_femmes',
    hasStates: false,
  },
  mma_woman: {
    id: 'mma_woman',
    name: 'MMA Fighter',
    rarity: 'RARE',
    pack: 'femmes',
    folder: 'pack_femmes',
    hasStates: false,
  },

  // PACK MONSTRES
  oni_blue: {
    id: 'oni_blue',
    name: 'Oni Bleu',
    rarity: 'EPIC',
    pack: 'monstres',
    folder: 'pack_monstres',
    hasStates: false,
  },
  tengu: {
    id: 'tengu',
    name: 'Tengu',
    rarity: 'EPIC',
    pack: 'monstres',
    folder: 'pack_monstres',
    hasStates: false,
  },
  kappa: {
    id: 'kappa',
    name: 'Kappa',
    rarity: 'RARE',
    pack: 'monstres',
    folder: 'pack_monstres',
    hasStates: false,
  },
  dragon: {
    id: 'dragon',
    name: 'Dragon',
    rarity: 'LEGENDARY',
    pack: 'monstres',
    folder: 'pack_monstres',
    hasStates: false,
  },
  yokai: {
    id: 'yokai',
    name: 'Yokai',
    rarity: 'SECRET',
    pack: 'monstres',
    folder: 'pack_monstres',
    hasStates: false,
  },
};

// ============================================
// PACKS PREMIUM
// ============================================

export const PACKS: Record<string, PackData> = {
  combat: {
    id: 'combat',
    name: 'Pack Combat',
    price: 1.99,
    avatars: ['muaythai', 'taekwondo', 'capoeira', 'kravmaga', 'sumo'],
  },
  femmes: {
    id: 'femmes',
    name: 'Pack Femmes Guerrieres',
    price: 1.99,
    avatars: ['kunoichi', 'valkyrie', 'amazon', 'boxer_woman', 'mma_woman'],
  },
  monstres: {
    id: 'monstres',
    name: 'Pack Monstres',
    price: 2.99,
    avatars: ['oni_blue', 'tengu', 'kappa', 'dragon', 'yokai'],
  },
};

// ============================================
// MAPPING DES IMAGES (require statiques)
// ============================================

// Avatars avec etats (tous les dossiers et fichiers en minuscules)
const AVATAR_STATE_IMAGES: Record<string, Record<AvatarState, any>> = {
  samurai: {
    legendary: require('@/assets/avatars/samurai/samurai_legendary.png'),
    strong: require('@/assets/avatars/samurai/samurai_strong.png'),
    neutral: require('@/assets/avatars/samurai/samurai_neutral.png'),
    tired: require('@/assets/avatars/samurai/samurai_tired.png'),
    down: require('@/assets/avatars/samurai/samurai_down.png'),
  },
  ninja: {
    legendary: require('@/assets/avatars/ninja/ninja_legendary.png'),
    strong: require('@/assets/avatars/ninja/ninja_strong.png'),
    neutral: require('@/assets/avatars/ninja/ninja_neutral.png'),
    tired: require('@/assets/avatars/ninja/ninja_tired.png'),
    down: require('@/assets/avatars/ninja/ninja_down.png'),
  },
  ronin: {
    legendary: require('@/assets/avatars/ronin/ronin_legendary.png'),
    strong: require('@/assets/avatars/ronin/ronin_strong.png'),
    neutral: require('@/assets/avatars/ronin/ronin_neutral.png'),
    tired: require('@/assets/avatars/ronin/ronin_tired.png'),
    down: require('@/assets/avatars/ronin/ronin_down.png'),
  },
  boxer: {
    legendary: require('@/assets/avatars/boxer/boxer_legendary.png'),
    strong: require('@/assets/avatars/boxer/boxer_strong.png'),
    neutral: require('@/assets/avatars/boxer/boxer_neutral.png'),
    tired: require('@/assets/avatars/boxer/boxer_tired.png'),
    down: require('@/assets/avatars/boxer/boxer_down.png'),
  },
  judoka: {
    legendary: require('@/assets/avatars/judoka/judoka_legendary.png'),
    strong: require('@/assets/avatars/judoka/judoka_strong.png'),
    neutral: require('@/assets/avatars/judoka/judoka_neutral.png'),
    tired: require('@/assets/avatars/judoka/judoka_tired.png'),
    down: require('@/assets/avatars/judoka/judoka_down.png'),
  },
  karateka: {
    legendary: require('@/assets/avatars/karateka/karateka_legendary.png'),
    strong: require('@/assets/avatars/karateka/karateka_strong.png'),
    neutral: require('@/assets/avatars/karateka/karateka_neutral.png'),
    tired: require('@/assets/avatars/karateka/karateka_tired.png'),
    down: require('@/assets/avatars/karateka/karateka_down.png'),
  },
  wrestler: {
    legendary: require('@/assets/avatars/wrestler/wrestler_legendary.png'),
    strong: require('@/assets/avatars/wrestler/wrestler_strong.png'),
    neutral: require('@/assets/avatars/wrestler/wrestler_neutral.png'),
    tired: require('@/assets/avatars/wrestler/wrestler_tired.png'),
    down: require('@/assets/avatars/wrestler/wrestler_down.png'),
  },
  mma: {
    legendary: require('@/assets/avatars/mma/mma_legendary.png'),
    strong: require('@/assets/avatars/mma/mma_strong.png'),
    neutral: require('@/assets/avatars/mma/mma_neutral.png'),
    tired: require('@/assets/avatars/mma/mma_tired.png'),
    down: require('@/assets/avatars/mma/mma_down.png'),
  },
  shogun: {
    legendary: require('@/assets/avatars/shogun/shogun_legendary.png'),
    strong: require('@/assets/avatars/shogun/shogun_strong.png'),
    neutral: require('@/assets/avatars/shogun/shogun_neutral.png'),
    tired: require('@/assets/avatars/shogun/shogun_tired.png'),
    down: require('@/assets/avatars/shogun/shogun_down.png'),
  },
  oni: {
    legendary: require('@/assets/avatars/oni/oni_legendary.png'),
    strong: require('@/assets/avatars/oni/oni_strong.png'),
    neutral: require('@/assets/avatars/oni/oni_neutral.png'),
    tired: require('@/assets/avatars/oni/oni_tired.png'),
    down: require('@/assets/avatars/oni/oni_down.png'),
  },
  emperor: {
    legendary: require('@/assets/avatars/emperor/emperor_legendary.png'),
    strong: require('@/assets/avatars/emperor/emperor_strong.png'),
    neutral: require('@/assets/avatars/emperor/emperor_neutral.png'),
    tired: require('@/assets/avatars/emperor/emperor_tired.png'),
    down: require('@/assets/avatars/emperor/emperor_down.png'),
  },
  ghost: {
    legendary: require('@/assets/avatars/ghost/ghost_legendary.png'),
    strong: require('@/assets/avatars/ghost/ghost_strong.png'),
    neutral: require('@/assets/avatars/ghost/ghost_neutral.png'),
    tired: require('@/assets/avatars/ghost/ghost_tired.png'),
    down: require('@/assets/avatars/ghost/ghost_down.png'),
  },
  champion: {
    legendary: require('@/assets/avatars/champion/champion_legendary.png'),
    strong: require('@/assets/avatars/champion/champion_strong.png'),
    neutral: require('@/assets/avatars/champion/champion_neutral.png'),
    tired: require('@/assets/avatars/champion/champion_tired.png'),
    down: require('@/assets/avatars/champion/champion_down.png'),
  },
};

// Avatars sans etats (packs) - image unique
const AVATAR_SINGLE_IMAGES: Record<string, any> = {
  // Pack Combat
  muaythai: require('@/assets/avatars/pack_combat/muaythai.png'),
  taekwondo: require('@/assets/avatars/pack_combat/taekwondo.png'),
  capoeira: require('@/assets/avatars/pack_combat/capoeira.png'),
  kravmaga: require('@/assets/avatars/pack_combat/kravmaga.png'),
  sumo: require('@/assets/avatars/pack_combat/sumo.png'),
  // Pack Femmes
  kunoichi: require('@/assets/avatars/pack_femmes/kunoichi.png'),
  valkyrie: require('@/assets/avatars/pack_femmes/valkyrie.png'),
  amazon: require('@/assets/avatars/pack_femmes/amazon.png'),
  boxer_woman: require('@/assets/avatars/pack_femmes/boxer_woman.png'),
  mma_woman: require('@/assets/avatars/pack_femmes/mma_woman.png'),
  // Pack Monstres
  oni_blue: require('@/assets/avatars/pack_monstres/oni_blue.png'),
  tengu: require('@/assets/avatars/pack_monstres/tengu.png'),
  kappa: require('@/assets/avatars/pack_monstres/kappa.png'),
  dragon: require('@/assets/avatars/pack_monstres/dragon.png'),
  yokai: require('@/assets/avatars/pack_monstres/yokai.png'),
};

// Image fallback
const FALLBACK_IMAGE = require('@/assets/avatars/samurai/samurai_neutral.png');

// ============================================
// FONCTIONS UTILITAIRES
// ============================================

/**
 * Obtient l'etat de l'avatar selon le Score Forme
 */
export const getAvatarStateFromScore = (score: number): AvatarState => {
  if (score >= 90) return 'legendary';
  if (score >= 70) return 'strong';
  if (score >= 50) return 'neutral';
  if (score >= 30) return 'tired';
  return 'down';
};

/**
 * Obtient l'image d'un avatar selon son ID et son etat
 */
export const getAvatarImage = (avatarId: string, state?: AvatarState): any => {
  const avatar = AVATARS[avatarId];
  if (!avatar) return FALLBACK_IMAGE;

  // Avatar avec etats
  if (avatar.hasStates && AVATAR_STATE_IMAGES[avatarId]) {
    const stateToUse = state || 'neutral';
    return AVATAR_STATE_IMAGES[avatarId][stateToUse] || FALLBACK_IMAGE;
  }

  // Avatar sans etats
  if (AVATAR_SINGLE_IMAGES[avatarId]) {
    return AVATAR_SINGLE_IMAGES[avatarId];
  }

  return FALLBACK_IMAGE;
};

/**
 * Obtient l'image de previsualisation d'un avatar (etat strong pour les avatars avec etats)
 */
export const getAvatarPreviewImage = (avatarId: string): any => {
  const avatar = AVATARS[avatarId];
  if (!avatar) return FALLBACK_IMAGE;

  if (avatar.hasStates && AVATAR_STATE_IMAGES[avatarId]) {
    return AVATAR_STATE_IMAGES[avatarId].strong || AVATAR_STATE_IMAGES[avatarId].neutral || FALLBACK_IMAGE;
  }

  return AVATAR_SINGLE_IMAGES[avatarId] || FALLBACK_IMAGE;
};

/**
 * Formate le texte de condition de deblocage
 */
export const formatConditionText = (condition: AvatarCondition | 'default' | undefined): string => {
  if (!condition || condition === 'default') {
    return 'Disponible par defaut';
  }

  switch (condition.type) {
    case 'weighings':
      return `${condition.value} pesees enregistrees`;
    case 'streak':
      return `${condition.value} jours de streak`;
    case 'workouts':
      return condition.value === 1
        ? 'Premier entrainement'
        : `${condition.value} entrainements`;
    case 'weightLost':
      return `-${condition.value} kg perdus`;
    default:
      return 'Condition inconnue';
  }
};

// ============================================
// GESTION DU STOCKAGE
// ============================================

/**
 * Recupere les avatars debloques
 */
export const getUnlockedAvatars = async (): Promise<UnlockedAvatarData[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.UNLOCKED_AVATARS);
    if (data) {
      return JSON.parse(data);
    }
    // Par defaut, le samurai est debloque
    const defaultUnlocked: UnlockedAvatarData[] = [
      { avatarId: 'samurai', unlockedAt: new Date().toISOString() },
    ];
    await saveUnlockedAvatars(defaultUnlocked);
    return defaultUnlocked;
  } catch (error) {
    console.error('Erreur lecture avatars debloques:', error);
    return [{ avatarId: 'samurai', unlockedAt: new Date().toISOString() }];
  }
};

/**
 * Sauvegarde les avatars debloques
 */
const saveUnlockedAvatars = async (avatars: UnlockedAvatarData[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.UNLOCKED_AVATARS, JSON.stringify(avatars));
  } catch (error) {
    console.error('Erreur sauvegarde avatars debloques:', error);
  }
};

/**
 * Verifie si un avatar est debloque
 */
export const isAvatarUnlocked = async (avatarId: string): Promise<boolean> => {
  // Tous les avatars sont maintenant débloqués (gratuits)
  return true;
};

/**
 * Debloque un avatar
 */
export const unlockAvatar = async (avatarId: string): Promise<boolean> => {
  try {
    const unlocked = await getUnlockedAvatars();
    if (unlocked.some(a => a.avatarId === avatarId)) {
      return false; // Deja debloque
    }
    unlocked.push({ avatarId, unlockedAt: new Date().toISOString() });
    await saveUnlockedAvatars(unlocked);
    console.log('Avatar debloque:', avatarId);
    return true;
  } catch (error) {
    console.error('Erreur deblocage avatar:', error);
    return false;
  }
};

/**
 * Debloque plusieurs avatars (pour les packs)
 */
export const unlockMultipleAvatars = async (avatarIds: string[]): Promise<string[]> => {
  try {
    const unlocked = await getUnlockedAvatars();
    const newlyUnlocked: string[] = [];

    for (const avatarId of avatarIds) {
      if (!unlocked.some(a => a.avatarId === avatarId)) {
        unlocked.push({ avatarId, unlockedAt: new Date().toISOString() });
        newlyUnlocked.push(avatarId);
      }
    }

    if (newlyUnlocked.length > 0) {
      await saveUnlockedAvatars(unlocked);
      console.log('Avatars debloques:', newlyUnlocked);
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Erreur deblocage multiple avatars:', error);
    return [];
  }
};

/**
 * Recupere l'avatar equipe
 */
export const getEquippedAvatar = async (): Promise<string> => {
  try {
    const avatarId = await AsyncStorage.getItem(STORAGE_KEYS.EQUIPPED_AVATAR);
    return avatarId || 'samurai';
  } catch (error) {
    console.error('Erreur lecture avatar equipe:', error);
    return 'samurai';
  }
};

/**
 * Equipe un avatar
 */
export const equipAvatar = async (avatarId: string): Promise<boolean> => {
  try {
    // Tous les avatars sont maintenant équipables (gratuits)
    await AsyncStorage.setItem(STORAGE_KEYS.EQUIPPED_AVATAR, avatarId);
    console.log('Avatar equipe:', avatarId);
    return true;
  } catch (error) {
    console.error('Erreur equipement avatar:', error);
    return false;
  }
};

/**
 * Recupere les packs achetes
 */
export const getPurchasedPacks = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASED_PACKS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erreur lecture packs achetes:', error);
    return [];
  }
};

/**
 * Marque un pack comme achete et debloque ses avatars
 */
export const purchasePack = async (packId: string): Promise<string[]> => {
  try {
    const pack = PACKS[packId];
    if (!pack) {
      console.error('Pack non trouve:', packId);
      return [];
    }

    // Marquer le pack comme achete
    const purchasedPacks = await getPurchasedPacks();
    if (!purchasedPacks.includes(packId)) {
      purchasedPacks.push(packId);
      await AsyncStorage.setItem(STORAGE_KEYS.PURCHASED_PACKS, JSON.stringify(purchasedPacks));
    }

    // Debloquer les avatars du pack
    const unlockedAvatars = await unlockMultipleAvatars(pack.avatars);
    console.log('Pack achete:', packId, 'Avatars debloques:', unlockedAvatars);
    return unlockedAvatars;
  } catch (error) {
    console.error('Erreur achat pack:', error);
    return [];
  }
};

/**
 * Recupere les avatars premium achetes individuellement
 */
export const getPurchasedAvatars = async (): Promise<string[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PURCHASED_AVATARS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Erreur lecture avatars achetes:', error);
    return [];
  }
};

/**
 * Achete un avatar premium individuel
 */
export const purchaseAvatar = async (avatarId: string): Promise<boolean> => {
  try {
    const avatar = AVATARS[avatarId];
    if (!avatar || !avatar.premium) {
      console.error('Avatar non premium ou non trouve:', avatarId);
      return false;
    }

    // Marquer comme achete
    const purchasedAvatars = await getPurchasedAvatars();
    if (!purchasedAvatars.includes(avatarId)) {
      purchasedAvatars.push(avatarId);
      await AsyncStorage.setItem(STORAGE_KEYS.PURCHASED_AVATARS, JSON.stringify(purchasedAvatars));
    }

    // Debloquer l'avatar
    await unlockAvatar(avatarId);
    console.log('Avatar premium achete:', avatarId);
    return true;
  } catch (error) {
    console.error('Erreur achat avatar:', error);
    return false;
  }
};

// ============================================
// VERIFICATION DES CONDITIONS DE DEBLOCAGE
// ============================================

export interface UserStats {
  totalWeighings: number;
  totalWorkouts: number;
  currentStreak: number;
  totalWeightLost: number;
}

/**
 * Recupere les statistiques utilisateur pour verifier les conditions
 */
export const getUserStats = async (): Promise<UserStats> => {
  try {
    const measurements = await getAllMeasurements();
    const workouts = await getAllWorkouts();

    // Calcul du streak
    let streak = 0;
    if (measurements.length > 0) {
      const sorted = [...measurements].sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < sorted.length; i++) {
        const measureDate = new Date(sorted[i].date);
        measureDate.setHours(0, 0, 0, 0);
        const expectedDate = new Date(today);
        expectedDate.setDate(today.getDate() - i);

        if (measureDate.getTime() === expectedDate.getTime()) {
          streak++;
        } else {
          break;
        }
      }
    }

    // Calcul de la perte de poids
    let weightLost = 0;
    if (measurements.length >= 2) {
      const sorted = [...measurements].sort((a, b) =>
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const firstWeight = sorted[0].weight;
      const lastWeight = sorted[sorted.length - 1].weight;
      weightLost = Math.max(0, firstWeight - lastWeight);
    }

    return {
      totalWeighings: measurements.length,
      totalWorkouts: workouts.length,
      currentStreak: streak,
      totalWeightLost: weightLost,
    };
  } catch (error) {
    console.error('Erreur calcul stats utilisateur:', error);
    return {
      totalWeighings: 0,
      totalWorkouts: 0,
      currentStreak: 0,
      totalWeightLost: 0,
    };
  }
};

/**
 * Verifie si une condition est remplie
 */
export const checkCondition = (condition: AvatarCondition | 'default' | undefined, stats: UserStats): boolean => {
  if (!condition || condition === 'default') {
    return true;
  }

  switch (condition.type) {
    case 'weighings':
      return stats.totalWeighings >= condition.value;
    case 'streak':
      return stats.currentStreak >= condition.value;
    case 'workouts':
      return stats.totalWorkouts >= condition.value;
    case 'weightLost':
      return stats.totalWeightLost >= condition.value;
    default:
      return false;
  }
};

/**
 * Obtient la progression vers une condition
 */
export const getConditionProgress = (condition: AvatarCondition | 'default' | undefined, stats: UserStats): { current: number; target: number; percentage: number } => {
  if (!condition || condition === 'default') {
    return { current: 1, target: 1, percentage: 100 };
  }

  let current = 0;
  const target = condition.value;

  switch (condition.type) {
    case 'weighings':
      current = stats.totalWeighings;
      break;
    case 'streak':
      current = stats.currentStreak;
      break;
    case 'workouts':
      current = stats.totalWorkouts;
      break;
    case 'weightLost':
      current = stats.totalWeightLost;
      break;
  }

  const percentage = Math.min(100, (current / target) * 100);
  return { current, target, percentage };
};

/**
 * Verifie et debloque les avatars selon les conditions
 * Retourne la liste des avatars nouvellement debloques
 */
export const checkAndUnlockAvatars = async (): Promise<string[]> => {
  try {
    const stats = await getUserStats();
    const unlocked = await getUnlockedAvatars();
    const unlockedIds = unlocked.map(a => a.avatarId);
    const newlyUnlocked: string[] = [];

    // Parcourir tous les avatars gratuits (avec condition)
    for (const [avatarId, avatar] of Object.entries(AVATARS)) {
      // Ignorer les avatars deja debloques
      if (unlockedIds.includes(avatarId)) continue;

      // Ignorer les avatars premium ou de pack
      if (avatar.premium || avatar.pack) continue;

      // Verifier la condition
      if (checkCondition(avatar.condition, stats)) {
        await unlockAvatar(avatarId);
        newlyUnlocked.push(avatarId);
      }
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Erreur verification deblocages:', error);
    return [];
  }
};

// ============================================
// STATISTIQUES DE COLLECTION
// ============================================

export interface CollectionStats {
  total: number;
  unlocked: number;
  percentage: number;
  byRarity: Record<AvatarRarity, { total: number; unlocked: number }>;
}

/**
 * Calcule les statistiques de la collection
 */
export const getCollectionStats = async (): Promise<CollectionStats> => {
  const unlocked = await getUnlockedAvatars();
  const unlockedIds = unlocked.map(a => a.avatarId);
  const totalAvatars = Object.keys(AVATARS).length;

  const byRarity: Record<AvatarRarity, { total: number; unlocked: number }> = {
    COMMON: { total: 0, unlocked: 0 },
    UNCOMMON: { total: 0, unlocked: 0 },
    RARE: { total: 0, unlocked: 0 },
    EPIC: { total: 0, unlocked: 0 },
    LEGENDARY: { total: 0, unlocked: 0 },
    SECRET: { total: 0, unlocked: 0 },
  };

  for (const [avatarId, avatar] of Object.entries(AVATARS)) {
    byRarity[avatar.rarity].total++;
    if (unlockedIds.includes(avatarId)) {
      byRarity[avatar.rarity].unlocked++;
    }
  }

  return {
    total: totalAvatars,
    unlocked: unlockedIds.length,
    percentage: Math.round((unlockedIds.length / totalAvatars) * 100),
    byRarity,
  };
};

/**
 * Recupere tous les avatars groupes par rarete
 */
export const getAvatarsByRarity = async (): Promise<Record<AvatarRarity, Array<AvatarData & { isUnlocked: boolean }>>> => {
  const unlocked = await getUnlockedAvatars();
  const unlockedIds = unlocked.map(a => a.avatarId);

  const result: Record<AvatarRarity, Array<AvatarData & { isUnlocked: boolean }>> = {
    COMMON: [],
    UNCOMMON: [],
    RARE: [],
    EPIC: [],
    LEGENDARY: [],
    SECRET: [],
  };

  for (const [avatarId, avatar] of Object.entries(AVATARS)) {
    result[avatar.rarity].push({
      ...avatar,
      isUnlocked: unlockedIds.includes(avatarId),
    });
  }

  return result;
};

/**
 * Recupere le Score Forme actuel
 */
export const getCurrentFitnessScore = async (): Promise<number> => {
  try {
    const scoreData = await calculateFitnessScore();
    return scoreData.score;
  } catch (error) {
    console.error('Erreur calcul score forme:', error);
    return 50; // Score par defaut
  }
};

// Export par defaut
export default {
  AVATARS,
  PACKS,
  RARITY_COLORS,
  getAvatarImage,
  getAvatarPreviewImage,
  getAvatarStateFromScore,
  formatConditionText,
  getUnlockedAvatars,
  isAvatarUnlocked,
  unlockAvatar,
  unlockMultipleAvatars,
  getEquippedAvatar,
  equipAvatar,
  getPurchasedPacks,
  purchasePack,
  getPurchasedAvatars,
  purchaseAvatar,
  getUserStats,
  checkCondition,
  getConditionProgress,
  checkAndUnlockAvatars,
  getCollectionStats,
  getAvatarsByRarity,
  getCurrentFitnessScore,
};
