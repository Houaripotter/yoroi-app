/**
 * avatarSystem.ts
 * Système d'avatars YOROI V3
 *
 * Gère 16 packs d'avatars répartis sur 5 niveaux avec états dynamiques
 * - 13 packs de personnages avec 5 états (down, legendary, neutral, strong, tired)
 * - 3 packs de collection avec 5 personnages chacun
 * - Déblocage progressif sur 5 niveaux : Ashigaru, Bushi, Samouraï, Rōnin, Shōgun
 * - États dynamiques basés sur la forme physique de l'utilisateur
 *
 * STRATÉGIE MARKETING : Tous les avatars sont débloqués gratuitement
 * pour créer l'engagement et l'envie. Le système d'abonnement sera
 * activé ultérieurement pour restreindre certains contenus premium.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateStreak } from './database';
import { getCurrentRank, getNextRank, getDaysToNextRank, getRankProgress, RANKS, type Rank } from './ranks';
import logger from '@/lib/security/logger';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Tous les packs d'avatars disponibles (17 packs)
 */
export type AvatarPack =
  // Packs de personnages avec états (14) - incluant BJJ
  | 'ninja' | 'samurai' | 'boxer' | 'champion' | 'emperor' | 'ghost'
  | 'judoka' | 'karateka' | 'mma' | 'oni' | 'ronin' | 'shogun' | 'wrestler'
  | 'bjj'
  // Packs de collection (3)
  | 'pack_combat' | 'pack_femmes' | 'pack_monstres';

/**
 * États dynamiques d'un avatar
 */
export type AvatarState = 'down' | 'legendary' | 'neutral' | 'strong' | 'tired';

/**
 * Type de pack: character (avec états) ou collection (choix de personnages)
 */
export type AvatarPackType = 'character' | 'collection';

/**
 * Personnages disponibles dans les packs de collection
 */
export type CollectionCharacter =
  // pack_combat
  | 'capoeira' | 'kravmaga' | 'muaythai' | 'sumo' | 'taekwondo'
  // pack_femmes
  | 'amazon' | 'boxer_woman' | 'kunoichi' | 'mma_woman' | 'valkyrie'
  // pack_monstres
  | 'dragon' | 'kappa' | 'oni_blue' | 'tengu' | 'yokai';

export type AvatarGender = 'male' | 'female';
export type AvatarLevel = 1 | 2 | 3 | 4 | 5;

/**
 * Configuration complète de l'avatar
 */
export interface AvatarConfig {
  pack: AvatarPack;
  packType: AvatarPackType;
  gender: AvatarGender;
  level: AvatarLevel; // Calculé depuis getCurrentRank()
  state: AvatarState; // État dynamique calculé (pour character packs)
  collectionCharacter?: CollectionCharacter; // Pour les collection packs
}

/**
 * Sélection stockée dans AsyncStorage
 */
export interface AvatarSelection {
  pack: AvatarPack;
  gender: AvatarGender;
  collectionCharacter?: CollectionCharacter; // Pour les collection packs
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
 * Métadonnées des packs d'avatars
 */
interface PackMetadata {
  id: AvatarPack;
  name: string;
  type: AvatarPackType;
  requiredRankLevel: number; // Niveau de rang requis pour débloquer (1-5)
  category: 'male' | 'female' | 'collection'; // Catégorie du pack
  collectionCharacters?: CollectionCharacter[];
}

const PACK_METADATA: PackMetadata[] = [
  // ===== AVATARS MASCULINS =====

  // NIVEAU 1 - ASHIGARU (Avatars de démarrage)
  { id: 'ninja', name: 'Ninja', type: 'character', requiredRankLevel: 1, category: 'male' },
  { id: 'samurai', name: 'Samouraï', type: 'character', requiredRankLevel: 1, category: 'male' },
  { id: 'boxer', name: 'Boxeur', type: 'character', requiredRankLevel: 1, category: 'male' },
  { id: 'judoka', name: 'Judoka', type: 'character', requiredRankLevel: 1, category: 'male' },
  { id: 'bjj', name: 'BJJ', type: 'character', requiredRankLevel: 1, category: 'male' },

  // NIVEAU 2 - BUSHI (Avatars intermédiaires)
  { id: 'karateka', name: 'Karatéka', type: 'character', requiredRankLevel: 2, category: 'male' },
  { id: 'wrestler', name: 'Lutteur', type: 'character', requiredRankLevel: 2, category: 'male' },
  { id: 'mma', name: 'Combattant MMA', type: 'character', requiredRankLevel: 2, category: 'male' },

  // NIVEAU 3 - SAMURAI (Avatars élites)
  { id: 'champion', name: 'Champion', type: 'character', requiredRankLevel: 3, category: 'male' },
  { id: 'ronin', name: 'Rōnin', type: 'character', requiredRankLevel: 3, category: 'male' },
  { id: 'ghost', name: 'Spectre', type: 'character', requiredRankLevel: 3, category: 'male' },

  // NIVEAU 5 - SHOGUN (Avatars légendaires)
  { id: 'emperor', name: 'Empereur', type: 'character', requiredRankLevel: 5, category: 'male' },
  { id: 'shogun', name: 'Shōgun', type: 'character', requiredRankLevel: 5, category: 'male' },
  { id: 'oni', name: 'Oni Légendaire', type: 'character', requiredRankLevel: 5, category: 'male' },

  // ===== AVATARS FÉMININS =====

  // NIVEAU 1 - Débutante
  { id: 'ninja', name: 'Ninja', type: 'character', requiredRankLevel: 1, category: 'female' },
  { id: 'samurai', name: 'Samouraï', type: 'character', requiredRankLevel: 1, category: 'female' },
  { id: 'bjj', name: 'BJJ', type: 'character', requiredRankLevel: 1, category: 'female' },
  {
    id: 'pack_femmes',
    name: 'Guerrières',
    type: 'collection',
    requiredRankLevel: 1,
    category: 'female',
    collectionCharacters: ['kunoichi', 'boxer_woman', 'mma_woman', 'valkyrie', 'amazon'],
  },

  // ===== PACKS DE COLLECTION MIXTES =====

  // NIVEAU 4 - RONIN
  {
    id: 'pack_combat',
    name: 'Maîtres des Arts Martiaux',
    type: 'collection',
    requiredRankLevel: 4,
    category: 'collection',
    collectionCharacters: ['capoeira', 'kravmaga', 'muaythai', 'sumo', 'taekwondo'],
  },
  {
    id: 'pack_monstres',
    name: 'Créatures Mythiques',
    type: 'collection',
    requiredRankLevel: 4,
    category: 'collection',
    collectionCharacters: ['dragon', 'kappa', 'oni_blue', 'tengu', 'yokai'],
  },
];

/**
 * Mapping Rang ID → Niveau Avatar
 */
const RANK_LEVEL_MAP: Record<string, AvatarLevel> = {
  'ashigaru': 1,
  'bushi': 2,
  'samurai': 3,
  'ronin': 4,
  'shogun': 5,
};

// ============================================================================
// IMPORT DES IMAGES
// ============================================================================

/**
 * Images pour les packs de personnages (avec états)
 * Structure: pack → état → image
 * Pour les packs avec support multi-genre (BJJ), on utilise CHARACTER_IMAGES_BY_GENDER
 */
const CHARACTER_IMAGES: Record<string, Record<AvatarState, any>> = {
  // Note: ninja et samurai sont maintenant dans CHARACTER_IMAGES_BY_GENDER
  boxer: {
    down: require('@/assets/avatars/boxer/boxer_down.png'),
    legendary: require('@/assets/avatars/boxer/boxer_legendary.png'),
    neutral: require('@/assets/avatars/boxer/boxer_neutral.png'),
    strong: require('@/assets/avatars/boxer/boxer_strong.png'),
    tired: require('@/assets/avatars/boxer/boxer_tired.png'),
  },
  champion: {
    down: require('@/assets/avatars/champion/champion_down.png'),
    legendary: require('@/assets/avatars/champion/champion_legendary.png'),
    neutral: require('@/assets/avatars/champion/champion_neutral.png'),
    strong: require('@/assets/avatars/champion/champion_strong.png'),
    tired: require('@/assets/avatars/champion/champion_tired.png'),
  },
  emperor: {
    down: require('@/assets/avatars/emperor/emperor_down.png'),
    legendary: require('@/assets/avatars/emperor/emperor_legendary.png'),
    neutral: require('@/assets/avatars/emperor/emperor_neutral.png'),
    strong: require('@/assets/avatars/emperor/emperor_strong.png'),
    tired: require('@/assets/avatars/emperor/emperor_tired.png'),
  },
  ghost: {
    down: require('@/assets/avatars/ghost/ghost_down.png'),
    legendary: require('@/assets/avatars/ghost/ghost_legendary.png'),
    neutral: require('@/assets/avatars/ghost/ghost_neutral.png'),
    strong: require('@/assets/avatars/ghost/ghost_strong.png'),
    tired: require('@/assets/avatars/ghost/ghost_tired.png'),
  },
  judoka: {
    down: require('@/assets/avatars/judoka/judoka_down.png'),
    legendary: require('@/assets/avatars/judoka/judoka_legendary.png'),
    neutral: require('@/assets/avatars/judoka/judoka_neutral.png'),
    strong: require('@/assets/avatars/judoka/judoka_strong.png'),
    tired: require('@/assets/avatars/judoka/judoka_tired.png'),
  },
  karateka: {
    down: require('@/assets/avatars/karateka/karateka_down.png'),
    legendary: require('@/assets/avatars/karateka/karateka_legendary.png'),
    neutral: require('@/assets/avatars/karateka/karateka_neutral.png'),
    strong: require('@/assets/avatars/karateka/karateka_strong.png'),
    tired: require('@/assets/avatars/karateka/karateka_tired.png'),
  },
  mma: {
    down: require('@/assets/avatars/mma/mma_down.png'),
    legendary: require('@/assets/avatars/mma/mma_legendary.png'),
    neutral: require('@/assets/avatars/mma/mma_neutral.png'),
    strong: require('@/assets/avatars/mma/mma_strong.png'),
    tired: require('@/assets/avatars/mma/mma_tired.png'),
  },
  oni: {
    down: require('@/assets/avatars/oni/oni_down.png'),
    legendary: require('@/assets/avatars/oni/oni_legendary.png'),
    neutral: require('@/assets/avatars/oni/oni_neutral.png'),
    strong: require('@/assets/avatars/oni/oni_strong.png'),
    tired: require('@/assets/avatars/oni/oni_tired.png'),
  },
  ronin: {
    down: require('@/assets/avatars/ronin/ronin_down.png'),
    legendary: require('@/assets/avatars/ronin/ronin_legendary.png'),
    neutral: require('@/assets/avatars/ronin/ronin_neutral.png'),
    strong: require('@/assets/avatars/ronin/ronin_strong.png'),
    tired: require('@/assets/avatars/ronin/ronin_tired.png'),
  },
  shogun: {
    down: require('@/assets/avatars/shogun/shogun_down.png'),
    legendary: require('@/assets/avatars/shogun/shogun_legendary.png'),
    neutral: require('@/assets/avatars/shogun/shogun_neutral.png'),
    strong: require('@/assets/avatars/shogun/shogun_strong.png'),
    tired: require('@/assets/avatars/shogun/shogun_tired.png'),
  },
  wrestler: {
    down: require('@/assets/avatars/wrestler/wrestler_down.png'),
    legendary: require('@/assets/avatars/wrestler/wrestler_legendary.png'),
    neutral: require('@/assets/avatars/wrestler/wrestler_neutral.png'),
    strong: require('@/assets/avatars/wrestler/wrestler_strong.png'),
    tired: require('@/assets/avatars/wrestler/wrestler_tired.png'),
  },
};

/**
 * Images pour les packs avec variantes masculines/féminines
 * Structure: pack → genre → état → image
 */
const CHARACTER_IMAGES_BY_GENDER: Record<string, Record<AvatarGender, Record<AvatarState, any>>> = {
  bjj: {
    male: {
      down: require('@/assets/avatars/bjj_male/char_bjj_m_defeated_ground.png'),
      tired: require('@/assets/avatars/bjj_male/char_bjj_m_tired_stool.png'),
      neutral: require('@/assets/avatars/bjj_male/char_bjj_m_idle_stand.png'),
      strong: require('@/assets/avatars/bjj_male/char_bjj_m_powered_up.png'),
      legendary: require('@/assets/avatars/bjj_male/char_bjj_m_victory_champion.png'),
    },
    female: {
      down: require('@/assets/avatars/bjj_female/char_bjj_f_defeated_ground.png'),
      tired: require('@/assets/avatars/bjj_female/char_bjj_f_tired_stool.png'),
      neutral: require('@/assets/avatars/bjj_female/char_bjj_f_idle_stand.png'),
      strong: require('@/assets/avatars/bjj_female/char_bjj_f_powered_up.png'),
      legendary: require('@/assets/avatars/bjj_female/char_bjj_f_victory_champion.png'),
    },
  },
  ninja: {
    male: {
      down: require('@/assets/avatars/ninja/ninja_down.png'),
      tired: require('@/assets/avatars/ninja/ninja_tired.png'),
      neutral: require('@/assets/avatars/ninja/ninja_neutral.png'),
      strong: require('@/assets/avatars/ninja/ninja_strong.png'),
      legendary: require('@/assets/avatars/ninja/ninja_legendary.png'),
    },
    female: {
      down: require('@/assets/avatars/ninja/female/ninja_f_1.png'),
      tired: require('@/assets/avatars/ninja/female/ninja_f_3.png'),
      neutral: require('@/assets/avatars/ninja/female/ninja_f_5.png'),
      strong: require('@/assets/avatars/ninja/female/ninja_f_7.png'),
      legendary: require('@/assets/avatars/ninja/female/ninja_f_9.png'),
    },
  },
  samurai: {
    male: {
      down: require('@/assets/avatars/samurai/samurai_down.png'),
      tired: require('@/assets/avatars/samurai/samurai_tired.png'),
      neutral: require('@/assets/avatars/samurai/samurai_neutral.png'),
      strong: require('@/assets/avatars/samurai/samurai_strong.png'),
      legendary: require('@/assets/avatars/samurai/samurai_legendary.png'),
    },
    female: {
      down: require('@/assets/avatars/samurai/female/samurai_f_1.png'),
      tired: require('@/assets/avatars/samurai/female/samurai_f_3.png'),
      neutral: require('@/assets/avatars/samurai/female/samurai_f_5.png'),
      strong: require('@/assets/avatars/samurai/female/samurai_f_7.png'),
      legendary: require('@/assets/avatars/samurai/female/samurai_f_9.png'),
    },
  },
};

/**
 * Images pour les packs de collection
 * Structure: personnage → image
 */
const COLLECTION_IMAGES: Record<CollectionCharacter, any> = {
  // pack_combat
  capoeira: require('@/assets/avatars/pack_combat/capoeira.png'),
  kravmaga: require('@/assets/avatars/pack_combat/kravmaga.png'),
  muaythai: require('@/assets/avatars/pack_combat/muaythai.png'),
  sumo: require('@/assets/avatars/pack_combat/sumo.png'),
  taekwondo: require('@/assets/avatars/pack_combat/taekwondo.png'),
  // pack_femmes
  amazon: require('@/assets/avatars/pack_femmes/amazon.png'),
  boxer_woman: require('@/assets/avatars/pack_femmes/boxer_woman.png'),
  kunoichi: require('@/assets/avatars/pack_femmes/kunoichi.png'),
  mma_woman: require('@/assets/avatars/pack_femmes/mma_woman.png'),
  valkyrie: require('@/assets/avatars/pack_femmes/valkyrie.png'),
  // pack_monstres
  dragon: require('@/assets/avatars/pack_monstres/dragon.png'),
  kappa: require('@/assets/avatars/pack_monstres/kappa.png'),
  oni_blue: require('@/assets/avatars/pack_monstres/oni_blue.png'),
  tengu: require('@/assets/avatars/pack_monstres/tengu.png'),
  yokai: require('@/assets/avatars/pack_monstres/yokai.png'),
};

// Image de fallback en cas d'erreur
const FALLBACK_IMAGE = require('@/assets/avatars/samurai/samurai_neutral.png');

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

/**
 * Obtient le type d'un pack (character ou collection)
 */
export function getPackType(pack: AvatarPack): AvatarPackType {
  const metadata = PACK_METADATA.find((p) => p.id === pack);
  return metadata?.type || 'character';
}

/**
 * Obtient le nom d'affichage d'un pack
 */
export function getPackName(pack: AvatarPack): string {
  const metadata = PACK_METADATA.find((p) => p.id === pack);
  return metadata?.name || pack;
}

/**
 * Obtient les métadonnées d'un pack
 */
export function getPackMetadata(pack: AvatarPack): PackMetadata | undefined {
  return PACK_METADATA.find((p) => p.id === pack);
}

/**
 * Obtient les personnages disponibles pour un pack de collection
 */
export function getCollectionCharacters(pack: AvatarPack): CollectionCharacter[] {
  const metadata = PACK_METADATA.find((p) => p.id === pack);
  return metadata?.collectionCharacters || [];
}

/**
 * Obtient tous les packs disponibles
 */
export function getAllPacks(): PackMetadata[] {
  return PACK_METADATA;
}

/**
 * Obtient les packs par catégorie
 */
export function getPacksByCategory(category: 'male' | 'female' | 'collection'): PackMetadata[] {
  return PACK_METADATA.filter((p) => p.category === category);
}

/**
 * Obtient tous les packs organisés par catégorie
 */
export function getPacksGroupedByCategory(): {
  male: PackMetadata[];
  female: PackMetadata[];
  collection: PackMetadata[];
} {
  return {
    male: PACK_METADATA.filter((p) => p.category === 'male'),
    female: PACK_METADATA.filter((p) => p.category === 'female'),
    collection: PACK_METADATA.filter((p) => p.category === 'collection'),
  };
}

/**
 * Obtient tous les packs organisés par niveau
 */
export function getPacksGroupedByLevel(): Record<AvatarLevel, PackMetadata[]> {
  const grouped: Record<number, PackMetadata[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  PACK_METADATA.forEach((pack) => {
    grouped[pack.requiredRankLevel].push(pack);
  });
  return grouped as Record<AvatarLevel, PackMetadata[]>;
}

// ============================================================================
// CALCUL DE L'ÉTAT DYNAMIQUE
// ============================================================================

/**
 * Calcule l'état dynamique de l'avatar basé sur la forme physique
 * @param streak Streak actuel
 * @param charge Charge d'entraînement (0-100)
 * @param sleep Qualité du sommeil (0-100)
 * @param daysWithoutTraining Nombre de jours sans entraînement
 * @returns État de l'avatar
 */
export async function calculateAvatarState(
  streak?: number,
  charge?: number,
  sleep?: number,
  daysWithoutTraining?: number
): Promise<AvatarState> {
  try {
    // Récupérer les données si non fournies
    if (streak === undefined) {
      streak = await calculateStreak();
    }

    // Charger charge et sommeil depuis storage si non fournis
    if (charge === undefined || sleep === undefined) {
      try {
        const chargeStr = await AsyncStorage.getItem('@yoroi_current_charge');
        const sleepStr = await AsyncStorage.getItem('@yoroi_last_sleep_quality');
        charge = chargeStr ? parseFloat(chargeStr) : 50;
        sleep = sleepStr ? parseFloat(sleepStr) : 50;
      } catch (error) {
        logger.warn('[AvatarSystem] Impossible de récupérer charge/sommeil:', error);
        charge = 50;
        sleep = 50;
      }
    }

    // Calculer jours sans entraînement si non fourni
    if (daysWithoutTraining === undefined) {
      try {
        const lastTrainingStr = await AsyncStorage.getItem('@yoroi_last_training_date');
        if (lastTrainingStr) {
          const lastTraining = new Date(lastTrainingStr);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - lastTraining.getTime());
          daysWithoutTraining = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        } else {
          daysWithoutTraining = 0;
        }
      } catch (error) {
        logger.warn('[AvatarSystem] Impossible de calculer jours sans entraînement:', error);
        daysWithoutTraining = 0;
      }
    }

    const currentRank = getCurrentRank(streak);
    const rankLevel = rankToLevel(currentRank);

    // Pénalité : 3+ jours sans entraînement OU (charge très faible ET sommeil très faible)
    if (daysWithoutTraining >= 3 || (charge < 20 && sleep < 30)) {
      return 'down';
    }

    // NOUVEAU SYSTÈME : État basé sur le niveau de rang
    // avec modulation selon la forme physique (charge + sommeil)
    const fitnessScore = (charge + sleep) / 2;

    // Niveau 5 (Shogun) → LEGENDARY
    if (rankLevel >= 5) {
      return 'legendary';
    }

    // Niveau 4 (Ronin) → STRONG ou LEGENDARY si bonne forme
    if (rankLevel >= 4) {
      return fitnessScore >= 60 ? 'legendary' : 'strong';
    }

    // Niveau 3 (Samurai) → NEUTRAL ou STRONG si bonne forme
    if (rankLevel >= 3) {
      return fitnessScore >= 60 ? 'strong' : 'neutral';
    }

    // Niveau 2 (Bushi) → TIRED ou NEUTRAL si bonne forme
    if (rankLevel >= 2) {
      return fitnessScore >= 60 ? 'neutral' : 'tired';
    }

    // Niveau 1 (Ashigaru) → DOWN ou TIRED si bonne forme
    return fitnessScore >= 60 ? 'tired' : 'down';
  } catch (error) {
    logger.error('[AvatarSystem] Erreur calcul état avatar:', error);
    return 'neutral';
  }
}

// ============================================================================
// RÉCUPÉRATION D'IMAGES
// ============================================================================

/**
 * Obtient l'image d'un avatar
 * @param pack Pack d'avatar
 * @param state État de l'avatar (pour character packs)
 * @param collectionCharacter Personnage (pour collection packs)
 * @param gender Genre de l'avatar (pour packs multi-genres comme BJJ)
 * @returns Image PNG de l'avatar
 */
export function getAvatarImage(
  pack: AvatarPack,
  state?: AvatarState,
  collectionCharacter?: CollectionCharacter,
  gender?: AvatarGender
): any {
  try {
    const packType = getPackType(pack);

    if (packType === 'character') {
      // Pack de personnage avec états
      const avatarState = state || 'neutral';

      // Vérifier si le pack a des images spécifiques par genre
      if (CHARACTER_IMAGES_BY_GENDER[pack] && gender) {
        const image = CHARACTER_IMAGES_BY_GENDER[pack][gender]?.[avatarState];

        if (!image) {
          logger.warn(`[AvatarSystem] Image introuvable: ${pack}/${gender}/${avatarState}`);
          return FALLBACK_IMAGE;
        }

        return image;
      }

      // Sinon, utiliser les images standard
      const image = CHARACTER_IMAGES[pack]?.[avatarState];

      if (!image) {
        logger.warn(`[AvatarSystem] Image introuvable: ${pack}/${avatarState}`);
        return FALLBACK_IMAGE;
      }

      return image;
    } else {
      // Pack de collection
      if (!collectionCharacter) {
        logger.warn(`[AvatarSystem] Collection character requis pour ${pack}`);
        return FALLBACK_IMAGE;
      }

      const image = COLLECTION_IMAGES[collectionCharacter];

      if (!image) {
        logger.warn(`[AvatarSystem] Image introuvable: ${collectionCharacter}`);
        return FALLBACK_IMAGE;
      }

      return image;
    }
  } catch (error) {
    logger.error('[AvatarSystem] Erreur getAvatarImage:', error);
    return FALLBACK_IMAGE;
  }
}

// ============================================================================
// GESTION DU STORAGE
// ============================================================================

/**
 * Récupère la sélection stockée (pack + genre + niveau optionnel)
 */
async function getStoredSelection(): Promise<AvatarSelection> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        pack: parsed.pack || DEFAULT_AVATAR.pack,
        gender: parsed.gender || DEFAULT_AVATAR.gender,
        collectionCharacter: parsed.collectionCharacter,
      };
    }

    // Si pas de sélection stockée, définir l'avatar par défaut selon le genre de l'utilisateur
    try {
      const { getUserSettings } = await import('./storage');
      const settings = await getUserSettings();
      const userGender = settings.gender || 'male';

      return {
        pack: userGender === 'female' ? 'ninja' : 'samurai',
        gender: userGender === 'female' ? 'female' : 'male',
      };
    } catch (err) {
      logger.warn('[AvatarSystem] Impossible de récupérer le genre utilisateur:', err);
    }
  } catch (error) {
    logger.error('[AvatarSystem] Erreur lecture storage:', error);
  }
  return DEFAULT_AVATAR;
}

/**
 * Sauvegarde la sélection (pack + genre + niveau optionnel)
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
 * @returns Niveau débloqué (1-5)
 */
export async function getUnlockedLevel(): Promise<AvatarLevel> {
  try {
    // Vérifier si le mode screenshot est activé
    const screenshotMode = await AsyncStorage.getItem('@yoroi_screenshot_mode');
    if (screenshotMode === 'true') {
      // Mode screenshot : afficher niveau max pour les captures App Store
      return 5;
    }

    // Calcul normal basé sur le streak réel
    const streak = await calculateStreak();
    const currentRank = getCurrentRank(streak);
    return rankToLevel(currentRank);
  } catch (error) {
    logger.error('[AvatarSystem] Erreur getUnlockedLevel:', error);
    return 1; // En cas d'erreur, niveau Ashigaru par défaut
  }
}

/**
 * Vérifie si un pack d'avatar est débloqué
 *
 * STRATÉGIE MARKETING : Tous les avatars sont débloqués par défaut
 * pour donner envie aux utilisateurs. Le système d'abonnement sera
 * activé plus tard en modifiant cette fonction.
 */
export async function isPackUnlocked(pack: AvatarPack): Promise<boolean> {
  const metadata = PACK_METADATA.find((p) => p.id === pack);
  if (!metadata) {
    logger.warn(`[AvatarSystem] Pack inconnu: ${pack}`);
    return false;
  }

  // TEMPORAIRE : Tous les packs sont débloqués pour tous les utilisateurs
  // TODO: Réactiver le système de déblocage progressif lors de la mise en place de l'abonnement
  return true;

  // Code original (à réactiver pour l'abonnement) :
  // const unlockedLevel = await getUnlockedLevel();
  // return unlockedLevel >= metadata.requiredRankLevel;
}

/**
 * Obtient tous les packs débloqués
 */
export async function getUnlockedPacks(): Promise<AvatarPack[]> {
  const unlockedLevel = await getUnlockedLevel();
  return PACK_METADATA.filter((p) => p.requiredRankLevel <= unlockedLevel).map((p) => p.id);
}

/**
 * Obtient tous les packs avec leur statut de déblocage
 *
 * STRATÉGIE MARKETING : Tous les packs sont débloqués par défaut
 */
export async function getAllPacksWithUnlockStatus(): Promise<
  Array<PackMetadata & { isUnlocked: boolean }>
> {
  // TEMPORAIRE : Tous les packs sont débloqués
  return PACK_METADATA.map((pack) => ({
    ...pack,
    isUnlocked: true, // Tous débloqués par défaut
  }));

  // Code original (à réactiver pour l'abonnement) :
  // const unlockedLevel = await getUnlockedLevel();
  // return PACK_METADATA.map((pack) => ({
  //   ...pack,
  //   isUnlocked: unlockedLevel >= pack.requiredRankLevel,
  // }));
}

// ============================================================================
// API PRINCIPALE
// ============================================================================

/**
 * Obtient la configuration complète de l'avatar actuel
 * @returns Configuration avec pack, type, genre, niveau, état et personnage de collection
 */
export async function getAvatarConfig(): Promise<AvatarConfig> {
  const selection = await getStoredSelection();
  const unlockedLevel = await getUnlockedLevel();
  const packType = getPackType(selection.pack);
  const state = await calculateAvatarState();

  return {
    pack: selection.pack,
    packType,
    gender: selection.gender,
    level: unlockedLevel,
    state,
    collectionCharacter: selection.collectionCharacter,
  };
}

/**
 * Obtient les métadonnées complètes de l'avatar actuel
 */
export async function getAvatarMeta(): Promise<AvatarMeta> {
  const config = await getAvatarConfig();
  const rank = levelToRank(config.level);
  const image = getAvatarImage(
    config.pack,
    config.packType === 'character' ? config.state : undefined,
    config.collectionCharacter,
    config.gender
  );

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
export async function setAvatarConfig(
  pack: AvatarPack,
  gender: AvatarGender,
  collectionCharacter?: CollectionCharacter
): Promise<boolean> {
  try {
    await saveSelection({ pack, gender, collectionCharacter });
    return true;
  } catch (error) {
    logger.error('[AvatarSystem] Erreur setAvatarConfig:', error);
    return false;
  }
}

/**
 * Change complètement l'avatar (avec personnage de collection si applicable)
 */
export async function setFullAvatarConfig(
  pack: AvatarPack,
  gender: AvatarGender,
  collectionCharacter?: CollectionCharacter
): Promise<boolean> {
  try {
    // Vérifier que le pack est débloqué
    const isUnlocked = await isPackUnlocked(pack);
    if (!isUnlocked) {
      logger.warn(`[AvatarSystem] Pack ${pack} non débloqué`);
      return false;
    }

    // Pour les packs de collection, vérifier que le personnage est fourni
    const packType = getPackType(pack);
    if (packType === 'collection' && !collectionCharacter) {
      logger.warn(`[AvatarSystem] Personnage de collection requis pour ${pack}`);
      return false;
    }

    await saveSelection({ pack, gender, collectionCharacter });
    return true;
  } catch (error) {
    logger.error('[AvatarSystem] Erreur setFullAvatarConfig:', error);
    return false;
  }
}

/**
 * Obtient les infos de déblocage pour tous les packs
 * @deprecated Utilisez getAllPacksWithUnlockStatus à la place
 */
export async function getAllAvatarUnlockInfo(): Promise<AvatarUnlockInfo[]> {
  // Compatibilité avec l'ancien système - retourne un tableau vide
  // Cette fonction sera supprimée dans une future version
  logger.warn('[AvatarSystem] getAllAvatarUnlockInfo est obsolète, utilisez getAllPacksWithUnlockStatus');
  return [];
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
