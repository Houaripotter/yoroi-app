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
    // TEMPORAIREMENT VIDE - EN COURS DE CREATION DE NOUVEAUX AVATARS
    const PACK_IMAGES: Record<string, AvatarImages> = {};

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
