// ============================================
// ⚔️ YOROI - SERVICE GALERIE D'AVATARS
// ============================================
// Gestion des avatars débloquables

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AvatarState } from './avatarState';

// ============================================
// TYPES
// ============================================

export interface AvatarPack {
  id: string;
  name: string;
  description: string;
  folder: string;
  unlockXP: number;
  unlockAchievement?: string; // ID achievement requis
  icon: string;
  category: 'martial' | 'legend' | 'special';
}

export interface AvatarImages {
  legendary: any;
  strong: any;
  neutral: any;
  tired: any;
  down: any;
}

// ============================================
// PACKS D'AVATARS DISPONIBLES
// ============================================

export const AVATAR_PACKS: AvatarPack[] = [
  // === PACKS GRATUITS (2 packs) ===
  {
    id: 'samurai',
    name: 'Samouraï',
    description: 'Le guerrier classique',
    folder: 'samurai',
    unlockXP: 0, // GRATUIT
    icon: '🗡️',
    category: 'martial',
  },
  {
    id: 'boxer',
    name: 'Boxeur',
    description: 'Champion de boxe',
    folder: 'boxer',
    unlockXP: 0, // GRATUIT
    icon: '🥊',
    category: 'martial',
  },

  // === ARTS MARTIAUX (Premium) ===
  {
    id: 'judoka',
    name: 'Judoka',
    description: 'Maître du judo',
    folder: 'judoka',
    unlockXP: 1000,
    icon: '🥋',
    category: 'martial',
  },
  {
    id: 'karateka',
    name: 'Karatéka',
    description: 'Expert en karaté',
    folder: 'karateka',
    unlockXP: 2000,
    icon: '🥊',
    category: 'martial',
  },
  {
    id: 'ninja',
    name: 'Ninja',
    description: "L'assassin de l'ombre",
    folder: 'ninja',
    unlockXP: 3000,
    icon: '🥷',
    category: 'martial',
  },
  {
    id: 'mma',
    name: 'Fighter MMA',
    description: 'Combattant complet',
    folder: 'mma',
    unlockXP: 4000,
    icon: '🥊',
    category: 'martial',
  },
  {
    id: 'wrestler',
    name: 'Lutteur',
    description: 'Force brute',
    folder: 'wrestler',
    unlockXP: 5000,
    icon: '🤼',
    category: 'martial',
  },
  {
    id: 'ronin',
    name: 'Ronin',
    description: 'Le guerrier errant',
    folder: 'ronin',
    unlockXP: 6000,
    icon: '🌙',
    category: 'martial',
  },

  // === LÉGENDES ===
  {
    id: 'shogun',
    name: 'Shogun',
    description: 'Le commandant suprême',
    folder: 'shogun',
    unlockXP: 5000,
    icon: '👑',
    category: 'legend',
  },
  {
    id: 'emperor',
    name: 'Empereur',
    description: "L'empire du guerrier",
    folder: 'emperor',
    unlockXP: 7500,
    icon: '⚜️',
    category: 'legend',
  },
  {
    id: 'champion',
    name: 'Champion',
    description: 'Le plus grand',
    folder: 'champion',
    unlockXP: 10000,
    unlockAchievement: 'hundred_trainings',
    icon: '🏆',
    category: 'legend',
  },

  // === SPÉCIAUX ===
  {
    id: 'oni',
    name: 'Oni',
    description: 'Démon du combat',
    folder: 'oni',
    unlockXP: 12000,
    icon: '👹',
    category: 'special',
  },
  {
    id: 'ghost',
    name: 'Fantôme',
    description: "L'esprit invaincu",
    folder: 'ghost',
    unlockXP: 15000,
    icon: '👻',
    category: 'special',
  },
  // === PACK FEMMES (5 avatars dans le pack) ===
  {
    id: 'pack_femmes',
    name: 'Pack Femmes',
    description: '5 guerrières puissantes',
    folder: 'pack_femmes',
    unlockXP: 0, // GRATUIT
    icon: '👩‍🦰',
    category: 'special',
  },

  // === PACK COMBAT (5 avatars dans le pack) ===
  {
    id: 'pack_combat',
    name: 'Pack Combat',
    description: '5 styles de combat',
    folder: 'pack_combat',
    unlockXP: 10000,
    icon: '⚔️',
    category: 'special',
  },

  // === PACK MONSTRES (5 avatars dans le pack) ===
  {
    id: 'pack_monstres',
    name: 'Pack Monstres',
    description: '5 créatures légendaires',
    folder: 'pack_monstres',
    unlockXP: 15000,
    icon: '👹',
    category: 'special',
  },

  // === PACK BJJ HOMMES (5 avatars) ===
  {
    id: 'BJJ_Male',
    name: 'BJJ Hommes',
    description: 'Jiu-Jitsu Brésilien masculin',
    folder: 'BJJ_Male',
    unlockXP: 0, // GRATUIT
    icon: '🥋',
    category: 'martial',
  },

  // === PACK BJJ FEMMES (5 avatars) ===
  {
    id: 'BJJ_Female',
    name: 'BJJ Femmes',
    description: 'Jiu-Jitsu Brésilien féminin',
    folder: 'BJJ_Female',
    unlockXP: 0, // GRATUIT
    icon: '🥋',
    category: 'martial',
  },
];

// ============================================
// STORAGE
// ============================================

const STORAGE_KEY = '@yoroi/avatar/selected_pack';

// ============================================
// SERVICE
// ============================================

class AvatarGalleryService {
  // Obtenir le pack sélectionné
  async getSelectedPack(): Promise<string> {
    try {
      const selected = await AsyncStorage.getItem(STORAGE_KEY);
      return selected || 'samurai'; // Défaut
    } catch (error) {
      console.error('[AvatarGallery] Erreur lecture pack:', error);
      return 'samurai';
    }
  }

  // Sélectionner un pack
  async setSelectedPack(packId: string): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, packId);

      // Synchroniser avec AvatarService pour que l'avatar s'affiche partout
      const { equipAvatar } = require('@/services/AvatarService');
      await equipAvatar(packId);
    } catch (error) {
      console.error('[AvatarGallery] Erreur sauvegarde pack:', error);
      throw error;
    }
  }

  // Vérifier si un pack est débloqué
  isPackUnlocked(
    packId: string,
    userXP: number,
    unlockedAchievements: string[],
    isPro: boolean = false
  ): boolean {
    // Tous les packs sont maintenant gratuits et débloqués
    return true;
  }

  // Obtenir tous les packs débloqués
  getUnlockedPacks(userXP: number, unlockedAchievements: string[], isPro: boolean = false): AvatarPack[] {
    return AVATAR_PACKS.filter((pack) =>
      this.isPackUnlocked(pack.id, userXP, unlockedAchievements, isPro)
    );
  }

  // Obtenir les packs par catégorie
  getPacksByCategory(category: AvatarPack['category']): AvatarPack[] {
    return AVATAR_PACKS.filter((pack) => pack.category === category);
  }

  // Obtenir le prochain pack à débloquer
  getNextPackToUnlock(userXP: number, unlockedAchievements: string[], isPro: boolean = false): AvatarPack | null {
    // Si Mode Créateur activé, tout est débloqué
    if (isPro) return null;

    const locked = AVATAR_PACKS.filter(
      (pack) => !this.isPackUnlocked(pack.id, userXP, unlockedAchievements, isPro)
    );

    if (locked.length === 0) return null;

    return locked.reduce((nearest, current) =>
      current.unlockXP < nearest.unlockXP ? current : nearest
    );
  }

  // Charger les images d'un pack
  getPackImages(packId: string): AvatarImages | null {
    // React Native requires static imports
    const PACK_IMAGES: Record<string, AvatarImages> = {
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
      boxer: {
        legendary: require('@/assets/avatars/boxer/boxer_legendary.png'),
        strong: require('@/assets/avatars/boxer/boxer_strong.png'),
        neutral: require('@/assets/avatars/boxer/boxer_neutral.png'),
        tired: require('@/assets/avatars/boxer/boxer_tired.png'),
        down: require('@/assets/avatars/boxer/boxer_down.png'),
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
      emperor: {
        legendary: require('@/assets/avatars/emperor/emperor_legendary.png'),
        strong: require('@/assets/avatars/emperor/emperor_strong.png'),
        neutral: require('@/assets/avatars/emperor/emperor_neutral.png'),
        tired: require('@/assets/avatars/emperor/emperor_tired.png'),
        down: require('@/assets/avatars/emperor/emperor_down.png'),
      },
      champion: {
        legendary: require('@/assets/avatars/champion/champion_legendary.png'),
        strong: require('@/assets/avatars/champion/champion_strong.png'),
        neutral: require('@/assets/avatars/champion/champion_neutral.png'),
        tired: require('@/assets/avatars/champion/champion_tired.png'),
        down: require('@/assets/avatars/champion/champion_down.png'),
      },
      oni: {
        legendary: require('@/assets/avatars/oni/oni_legendary.png'),
        strong: require('@/assets/avatars/oni/oni_strong.png'),
        neutral: require('@/assets/avatars/oni/oni_neutral.png'),
        tired: require('@/assets/avatars/oni/oni_tired.png'),
        down: require('@/assets/avatars/oni/oni_down.png'),
      },
      ghost: {
        legendary: require('@/assets/avatars/ghost/ghost_legendary.png'),
        strong: require('@/assets/avatars/ghost/ghost_strong.png'),
        neutral: require('@/assets/avatars/ghost/ghost_neutral.png'),
        tired: require('@/assets/avatars/ghost/ghost_tired.png'),
        down: require('@/assets/avatars/ghost/ghost_down.png'),
      },

      // === PACK FEMMES - 5 guerrières différentes ===
      pack_femmes: {
        legendary: require('@/assets/avatars/pack_femmes/amazon.png'),
        strong: require('@/assets/avatars/pack_femmes/boxer_woman.png'),
        neutral: require('@/assets/avatars/pack_femmes/kunoichi.png'),
        tired: require('@/assets/avatars/pack_femmes/mma_woman.png'),
        down: require('@/assets/avatars/pack_femmes/valkyrie.png'),
      },

      // === PACK COMBAT - 5 styles de combat différents ===
      pack_combat: {
        legendary: require('@/assets/avatars/pack_combat/capoeira.png'),
        strong: require('@/assets/avatars/pack_combat/kravmaga.png'),
        neutral: require('@/assets/avatars/pack_combat/muaythai.png'),
        tired: require('@/assets/avatars/pack_combat/sumo.png'),
        down: require('@/assets/avatars/pack_combat/taekwondo.png'),
      },

      // === PACK MONSTRES - 5 créatures légendaires différentes ===
      pack_monstres: {
        legendary: require('@/assets/avatars/pack_monstres/dragon.png'),
        strong: require('@/assets/avatars/pack_monstres/kappa.png'),
        neutral: require('@/assets/avatars/pack_monstres/oni_blue.png'),
        tired: require('@/assets/avatars/pack_monstres/tengu.png'),
        down: require('@/assets/avatars/pack_monstres/yokai.png'),
      },

      // === PACK BJJ HOMMES ===
      BJJ_Male: {
        legendary: require('@/assets/avatars/BJJ_Male/char_bjj_m_victory_champion.png'),
        strong: require('@/assets/avatars/BJJ_Male/char_bjj_m_powered_up.png'),
        neutral: require('@/assets/avatars/BJJ_Male/char_bjj_m_idle_stand.png'),
        tired: require('@/assets/avatars/BJJ_Male/char_bjj_m_tired_stool.png'),
        down: require('@/assets/avatars/BJJ_Male/char_bjj_m_defeated_ground.png'),
      },

      // === PACK BJJ FEMMES ===
      BJJ_Female: {
        legendary: require('@/assets/avatars/BJJ_Female/char_bjj_f_victory_champion.png'),
        strong: require('@/assets/avatars/BJJ_Female/char_bjj_f_powered_up.png'),
        neutral: require('@/assets/avatars/BJJ_Female/char_bjj_f_idle_stand.png'),
        tired: require('@/assets/avatars/BJJ_Female/char_bjj_f_tired_stool.png'),
        down: require('@/assets/avatars/BJJ_Female/char_bjj_f_defeated_ground.png'),
      },
    };

    return PACK_IMAGES[packId] || null;
  }

  // Obtenir l'image d'un pack pour un état donné
  getPackStateImage(packId: string, state: AvatarState): any {
    const images = this.getPackImages(packId);
    if (!images) return null;
    return images[state];
  }
}

export const avatarGalleryService = new AvatarGalleryService();
export default avatarGalleryService;
