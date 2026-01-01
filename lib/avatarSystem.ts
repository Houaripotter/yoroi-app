/**
 * avatarSystem.ts
 * Système d'avatars YOROI V2
 *
 * Gère les 2 packs (Samurai, Ninja) avec progression basée sur les rangs du Dojo
 * - 2 packs × 2 genres × 9 niveaux = 36 avatars
 * - Déblocage progressif lié aux rangs (Recrue → Daimyō)
 * - 1 seule image par niveau (pas d'états dynamiques)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateStreak } from './database';
import { getCurrentRank, getNextRank, getDaysToNextRank, getRankProgress, RANKS, type Rank } from './ranks';
import logger from '@/lib/security/logger';

// ============================================================================
// TYPES
// ============================================================================

export type AvatarPack = 'samurai' | 'ninja';
export type AvatarGender = 'male' | 'female';
export type AvatarLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;

/**
 * Configuration complète de l'avatar (incluant le niveau calculé)
 */
export interface AvatarConfig {
  pack: AvatarPack;
  gender: AvatarGender;
  level: AvatarLevel; // Calculé automatiquement depuis getCurrentRank()
}

/**
 * Sélection stockée dans AsyncStorage (sans level)
 */
export interface AvatarSelection {
  pack: AvatarPack;
  gender: AvatarGender;
}

/**
 * Info de déblocage pour un avatar spécifique
 */
export interface AvatarUnlockInfo {
  pack: AvatarPack;
  gender: AvatarGender;
  level: AvatarLevel;
  isUnlocked: boolean;
  requiredRank: Rank;
  requiredDays: number;
}

/**
 * Métadonnées complètes d'un avatar
 */
export interface AvatarMeta {
  pack: AvatarPack;
  gender: AvatarGender;
  level: AvatarLevel;
  rankName: string;
  rankNameJp: string;
  rankNameFeminine: string;
  imagePath: any;
  rank: Rank;
}

/**
 * Progression vers le prochain niveau
 */
export interface LevelProgress {
  currentLevel: AvatarLevel;
  nextLevel: AvatarLevel | null;
  currentDays: number;
  requiredDays: number;
  percentage: number;
  currentRank: Rank;
  nextRank: Rank | null;
  daysToNext: number;
}

// ============================================================================
// CONSTANTES
// ============================================================================

const STORAGE_KEY = '@yoroi_avatar_config';

const DEFAULT_AVATAR: AvatarSelection = {
  pack: 'samurai',
  gender: 'male',
};

/**
 * Mapping Rang ID → Niveau Avatar
 */
const RANK_LEVEL_MAP: Record<string, AvatarLevel> = {
  'recrue': 1,
  'ashigaru': 2,
  'bushi': 3,
  'knight': 4,
  'samurai': 5,
  'ronin': 6,
  'sensei': 7,
  'shogun': 8,
  'daimyo': 9,
};

// ============================================================================
// IMPORT DES IMAGES (36 images PNG)
// ============================================================================

const AVATAR_IMAGES: Record<AvatarPack, Record<AvatarGender, Record<AvatarLevel, any>>> = {
  samurai: {
    male: {
      1: require('@/assets/avatars/samurai/male/samurai_m_1.png'),
      2: require('@/assets/avatars/samurai/male/samurai_m_2.png'),
      3: require('@/assets/avatars/samurai/male/samurai_m_3.png'),
      4: require('@/assets/avatars/samurai/male/samurai_m_4.png'),
      5: require('@/assets/avatars/samurai/male/samurai_m_5.png'),
      6: require('@/assets/avatars/samurai/male/samurai_m_6.png'),
      7: require('@/assets/avatars/samurai/male/samurai_m_7.png'),
      8: require('@/assets/avatars/samurai/male/samurai_m_8.png'),
      9: require('@/assets/avatars/samurai/male/samurai_m_9.png'),
    },
    female: {
      // TODO: Ajouter les vrais avatars féminins - temporairement on utilise les masculins
      1: require('@/assets/avatars/samurai/male/samurai_m_1.png'),
      2: require('@/assets/avatars/samurai/male/samurai_m_2.png'),
      3: require('@/assets/avatars/samurai/male/samurai_m_3.png'),
      4: require('@/assets/avatars/samurai/male/samurai_m_4.png'),
      5: require('@/assets/avatars/samurai/male/samurai_m_5.png'),
      6: require('@/assets/avatars/samurai/male/samurai_m_6.png'),
      7: require('@/assets/avatars/samurai/male/samurai_m_7.png'),
      8: require('@/assets/avatars/samurai/male/samurai_m_8.png'),
      9: require('@/assets/avatars/samurai/male/samurai_m_9.png'),
    },
  },
  ninja: {
    male: {
      1: require('@/assets/avatars/ninja/male/ninja_m_1.png'),
      2: require('@/assets/avatars/ninja/male/ninja_m_2.png'),
      3: require('@/assets/avatars/ninja/male/ninja_m_3.png'),
      4: require('@/assets/avatars/ninja/male/ninja_m_4.png'),
      5: require('@/assets/avatars/ninja/male/ninja_m_5.png'),
      6: require('@/assets/avatars/ninja/male/ninja_m_6.png'),
      7: require('@/assets/avatars/ninja/male/ninja_m_7.png'),
      8: require('@/assets/avatars/ninja/male/ninja_m_8.png'),
      9: require('@/assets/avatars/ninja/male/ninja_m_9.png'),
    },
    female: {
      1: require('@/assets/avatars/ninja/female/ninja_f_1.png'),
      2: require('@/assets/avatars/ninja/female/ninja_f_2.png'),
      3: require('@/assets/avatars/ninja/female/ninja_f_3.png'),
      4: require('@/assets/avatars/ninja/female/ninja_f_4.png'),
      5: require('@/assets/avatars/ninja/female/ninja_f_5.png'),
      6: require('@/assets/avatars/ninja/female/ninja_f_6.png'),
      7: require('@/assets/avatars/ninja/female/ninja_f_7.png'),
      8: require('@/assets/avatars/ninja/female/ninja_f_8.png'),
      9: require('@/assets/avatars/ninja/female/ninja_f_9.png'),
    },
  },
};

// Image de fallback en cas d'erreur
const FALLBACK_IMAGE = require('@/assets/avatars/samurai/male/samurai_m_1.png');

// ============================================================================
// HELPERS - CONVERSION RANG ↔ NIVEAU
// ============================================================================

/**
 * Convertit un rang en niveau d'avatar (1-9)
 */
export function rankToLevel(rank: Rank): AvatarLevel {
  const level = RANK_LEVEL_MAP[rank.id];
  if (!level) {
    logger.warn(`[AvatarSystem] Rang inconnu: ${rank.id}, fallback niveau 1`);
    return 1;
  }
  return level as AvatarLevel;
}

/**
 * Convertit un niveau d'avatar en rang requis
 */
export function levelToRank(level: AvatarLevel): Rank {
  return RANKS[level - 1]; // Index 0-8
}

// ============================================================================
// RÉCUPÉRATION D'IMAGES
// ============================================================================

/**
 * Obtient l'image d'un avatar
 * @param pack Pack d'avatar (optionnel, défaut: pack actuel)
 * @param gender Genre (optionnel, défaut: genre actuel)
 * @param level Niveau (optionnel, défaut: niveau actuel)
 * @returns Image PNG de l'avatar
 */
export function getAvatarImage(
  pack?: AvatarPack,
  gender?: AvatarGender,
  level?: AvatarLevel
): any {
  try {
    // Si pas de paramètres, on ne peut pas récupérer l'image de manière synchrone
    // Cette fonction doit être appelée avec des paramètres explicites
    if (!pack || !gender || !level) {
      logger.warn('[AvatarSystem] getAvatarImage appelé sans paramètres complets');
      return FALLBACK_IMAGE;
    }

    const image = AVATAR_IMAGES[pack]?.[gender]?.[level];
    if (!image) {
      logger.warn(`[AvatarSystem] Image introuvable: ${pack}/${gender}/${level}`);
      return FALLBACK_IMAGE;
    }

    return image;
  } catch (error) {
    logger.error('[AvatarSystem] Erreur getAvatarImage:', error);
    return FALLBACK_IMAGE;
  }
}

// ============================================================================
// GESTION DU STORAGE
// ============================================================================

/**
 * Récupère la sélection stockée (pack + genre)
 */
async function getStoredSelection(): Promise<AvatarSelection> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        pack: parsed.pack || DEFAULT_AVATAR.pack,
        gender: parsed.gender || DEFAULT_AVATAR.gender,
      };
    }
  } catch (error) {
    logger.error('[AvatarSystem] Erreur lecture storage:', error);
  }
  return DEFAULT_AVATAR;
}

/**
 * Sauvegarde la sélection (pack + genre)
 */
async function saveSelection(selection: AvatarSelection): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selection));
  } catch (error) {
    logger.error('[AvatarSystem] Erreur sauvegarde storage:', error);
    throw error;
  }
}

// ============================================================================
// DÉBLOCAGE ET NIVEAU
// ============================================================================

/**
 * Obtient le niveau d'avatar débloqué (basé sur le streak)
 * @returns Niveau débloqué (1-9)
 */
export async function getUnlockedLevel(): Promise<AvatarLevel> {
  try {
    // MODE CRÉATEUR : Tous les avatars débloqués
    return 9;

    // Code normal (commenté temporairement) :
    // const streak = await calculateStreak();
    // const currentRank = getCurrentRank(streak);
    // return rankToLevel(currentRank);
  } catch (error) {
    logger.error('[AvatarSystem] Erreur getUnlockedLevel:', error);
    return 9; // MODE CRÉATEUR: niveau max
  }
}

/**
 * Vérifie si un avatar spécifique est débloqué
 */
export async function isAvatarUnlocked(
  pack: AvatarPack,
  gender: AvatarGender,
  level: AvatarLevel
): Promise<boolean> {
  const unlockedLevel = await getUnlockedLevel();
  return level <= unlockedLevel;
}

// ============================================================================
// API PRINCIPALE
// ============================================================================

/**
 * Obtient la configuration complète de l'avatar actuel
 * @returns Configuration avec pack, genre et niveau auto-calculé
 */
export async function getAvatarConfig(): Promise<AvatarConfig> {
  const selection = await getStoredSelection();
  const level = await getUnlockedLevel();

  return {
    pack: selection.pack,
    gender: selection.gender,
    level,
  };
}

/**
 * Obtient les métadonnées complètes de l'avatar actuel
 */
export async function getAvatarMeta(): Promise<AvatarMeta> {
  const config = await getAvatarConfig();
  const rank = levelToRank(config.level);
  const image = getAvatarImage(config.pack, config.gender, config.level);

  return {
    pack: config.pack,
    gender: config.gender,
    level: config.level,
    rankName: rank.name,
    rankNameJp: rank.nameJp,
    rankNameFeminine: rank.nameFemale || rank.name,
    imagePath: image,
    rank,
  };
}

/**
 * Change le pack d'avatar (garde le genre actuel)
 */
export async function setAvatarPack(pack: AvatarPack): Promise<boolean> {
  try {
    const selection = await getStoredSelection();
    await saveSelection({ ...selection, pack });
    return true;
  } catch (error) {
    logger.error('[AvatarSystem] Erreur setAvatarPack:', error);
    return false;
  }
}

/**
 * Change le genre de l'avatar (garde le pack actuel)
 */
export async function setAvatarGender(gender: AvatarGender): Promise<void> {
  const selection = await getStoredSelection();
  await saveSelection({ ...selection, gender });
}

/**
 * Change le pack ET le genre de l'avatar
 */
export async function setAvatarConfig(pack: AvatarPack, gender: AvatarGender): Promise<boolean> {
  try {
    await saveSelection({ pack, gender });
    return true;
  } catch (error) {
    logger.error('[AvatarSystem] Erreur setAvatarConfig:', error);
    return false;
  }
}

/**
 * Obtient tous les états de déblocage (36 avatars)
 * Utilisé pour afficher la galerie avec les avatars verrouillés/débloqués
 */
export async function getAllAvatarUnlockInfo(): Promise<AvatarUnlockInfo[]> {
  const unlockedLevel = await getUnlockedLevel();
  const result: AvatarUnlockInfo[] = [];

  const packs: AvatarPack[] = ['samurai', 'ninja'];
  const genders: AvatarGender[] = ['male', 'female'];
  const levels: AvatarLevel[] = [1, 2, 3, 4, 5, 6, 7, 8, 9];

  for (const pack of packs) {
    for (const gender of genders) {
      for (const level of levels) {
        const rank = levelToRank(level);
        result.push({
          pack,
          gender,
          level,
          isUnlocked: level <= unlockedLevel,
          requiredRank: rank,
          requiredDays: rank.minDays,
        });
      }
    }
  }

  return result;
}

/**
 * Obtient la progression vers le prochain niveau
 */
export async function getLevelProgress(): Promise<LevelProgress> {
  const streak = await calculateStreak();
  const currentRank = getCurrentRank(streak);
  const nextRank = getNextRank(streak);
  const currentLevel = rankToLevel(currentRank);
  const nextLevel = nextRank ? rankToLevel(nextRank) : null;

  return {
    currentLevel,
    nextLevel: nextLevel as AvatarLevel | null,
    currentDays: streak,
    requiredDays: nextRank ? nextRank.minDays : currentRank.minDays,
    percentage: getRankProgress(streak),
    currentRank,
    nextRank,
    daysToNext: getDaysToNextRank(streak),
  };
}

/**
 * Réinitialise l'avatar au défaut (Samurai Male niveau 1)
 */
export async function resetAvatar(): Promise<void> {
  await saveSelection(DEFAULT_AVATAR);
}
