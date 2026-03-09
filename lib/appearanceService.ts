// ============================================
// YOROI - SERVICE APPARENCE & THÈMES
// ============================================
// Gestion des préférences d'apparence utilisateur

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColor } from '@/constants/themes';
import logger from '@/lib/security/logger';

// ============================================
// TYPES
// ============================================

export type AvatarFormat = 'circle' | 'rounded';

export interface AppearanceSettings {
  avatarFormat: AvatarFormat;
  selectedIcon: string | null; // iOS alternate icon name
}

// ============================================
// MAPPING THÈMES GUERRIERS → THEME COLORS
// ============================================
// Les thèmes "guerriers" débloquables mappent vers les couleurs du ThemeContext

export interface WarriorTheme {
  id: string;
  name: string;
  themeColor: ThemeColor; // Mapping vers ThemeContext
  description: string;
  unlockXP: number;
  icon: string;
}

export const WARRIOR_THEMES: WarriorTheme[] = [
  // ── Thèmes combo existants ──
  {
    id: 'charcoal',
    name: 'Charcoal',
    themeColor: 'charcoal',
    description: 'Rouge Cadillac',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'fizz',
    name: 'Fizz',
    themeColor: 'fizz',
    description: 'Indigo Dusk',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'mint',
    name: 'Mint',
    themeColor: 'mint',
    description: 'Vert Menthe',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'royal',
    name: 'Royal',
    themeColor: 'royal',
    description: 'Bleu Royal',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'pumpkin',
    name: 'Pumpkin',
    themeColor: 'pumpkin',
    description: 'Orange Citrouille',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'vista',
    name: 'Vista',
    themeColor: 'vista',
    description: 'Bleu Ciel',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'lavender',
    name: 'Lavender',
    themeColor: 'lavender',
    description: 'Rose Poudré',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'peach',
    name: 'Peach',
    themeColor: 'peach',
    description: 'Peche Douce',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'cadet',
    name: 'Cadet',
    themeColor: 'cadet',
    description: 'Bleu Cadet',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'obsidian',
    name: 'Obsidian',
    themeColor: 'obsidian',
    description: 'Or Antique',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'amber',
    name: 'Amber',
    themeColor: 'amber',
    description: 'Or Ambre',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'slate',
    name: 'Slate',
    themeColor: 'slate',
    description: 'Pervenche',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'ambersmoke',
    name: 'Amber Smoke',
    themeColor: 'ambersmoke',
    description: 'Fumee Ambre',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'dreamy',
    name: 'Dreamy',
    themeColor: 'dreamy',
    description: 'Bleu Profond',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'chartreuse',
    name: 'Chartreuse',
    themeColor: 'chartreuse',
    description: 'Vert Fluo',
    unlockXP: 0,
    icon: '',
  },
  // ── Nouveaux thèmes couleur pure ──
  {
    id: 'classic',
    name: 'Classic',
    themeColor: 'classic',
    description: 'Monochrome',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'volt',
    name: 'Volt',
    themeColor: 'volt',
    description: 'Jaune Electrique',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'magma',
    name: 'Magma',
    themeColor: 'magma',
    description: 'Rouge Lave',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    themeColor: 'sakura',
    description: 'Rose Cerisier',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    themeColor: 'matrix',
    description: 'Vert Cyber',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'blaze',
    name: 'Blaze',
    themeColor: 'blaze',
    description: 'Orange Feu',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    themeColor: 'phantom',
    description: 'Violet Profond',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    themeColor: 'ghost',
    description: 'Gris Minimal',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    themeColor: 'ocean',
    description: 'Bleu Ocean',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'indigo',
    name: 'Indigo',
    themeColor: 'indigo',
    description: 'Bleu Indigo',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'gold',
    name: 'Gold',
    themeColor: 'gold',
    description: 'Or Luxueux',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'emerald',
    name: 'Emerald',
    themeColor: 'emerald',
    description: 'Vert Emeraude',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'sunset',
    name: 'Sunset',
    themeColor: 'sunset',
    description: 'Coucher de Soleil',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'tiffany',
    name: 'Tiffany',
    themeColor: 'tiffany',
    description: 'Bleu Tiffany',
    unlockXP: 0,
    icon: '',
  },
  {
    id: 'lavendar',
    name: 'Lavender',
    themeColor: 'lavendar',
    description: 'Violet Lavande',
    unlockXP: 0,
    icon: '',
  },
];

// ============================================
// STORAGE KEYS
// ============================================

const STORAGE_KEYS = {
  AVATAR_FORMAT: '@yoroi/appearance/avatarFormat',
  SELECTED_ICON: '@yoroi/appearance/selectedIcon',
};

// ============================================
// VALEURS PAR DÉFAUT
// ============================================

const DEFAULT_SETTINGS: AppearanceSettings = {
  avatarFormat: 'circle',
  selectedIcon: null,
};

// ============================================
// SERVICE
// ============================================

class AppearanceService {
  // Charger les paramètres d'apparence
  async loadSettings(): Promise<AppearanceSettings> {
    try {
      const [avatarFormat, selectedIcon] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.AVATAR_FORMAT),
        AsyncStorage.getItem(STORAGE_KEYS.SELECTED_ICON),
      ]);

      return {
        avatarFormat: (avatarFormat as AvatarFormat) || DEFAULT_SETTINGS.avatarFormat,
        selectedIcon: selectedIcon || DEFAULT_SETTINGS.selectedIcon,
      };
    } catch (error) {
      logger.error('[AppearanceService] Erreur chargement paramètres:', error);
      return DEFAULT_SETTINGS;
    }
  }

  // Sauvegarder le format d'avatar
  async setAvatarFormat(format: AvatarFormat): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AVATAR_FORMAT, format);
    } catch (error) {
      logger.error('[AppearanceService] Erreur sauvegarde format avatar:', error);
      throw error;
    }
  }

  // Sauvegarder l'icône sélectionnée (iOS uniquement)
  async setAppIcon(iconName: string | null): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_ICON, iconName || '');
    } catch (error) {
      logger.error('[AppearanceService] Erreur sauvegarde icône:', error);
      throw error;
    }
  }

  // Vérifier si un thème guerrier est débloqué
  // TOUS LES THÈMES DÉBLOQUÉS POUR LE DÉVELOPPEMENT
  isWarriorThemeUnlocked(themeId: string, userXP: number): boolean {
    // Pendant le développement, tous les thèmes sont débloqués
    // Plus tard, remplacer par: return userXP >= theme.unlockXP;
    return true;
  }

  // Obtenir tous les thèmes guerriers débloqués
  // TOUS LES THÈMES DÉBLOQUÉS POUR LE DÉVELOPPEMENT
  getUnlockedWarriorThemes(userXP: number): WarriorTheme[] {
    // Pendant le développement, tous les thèmes sont débloqués
    // Plus tard, remplacer par: return WARRIOR_THEMES.filter((theme) => userXP >= theme.unlockXP);
    return WARRIOR_THEMES;
  }

  // Obtenir le prochain thème à débloquer
  getNextThemeToUnlock(userXP: number): WarriorTheme | null {
    const locked = WARRIOR_THEMES.filter((theme) => userXP < theme.unlockXP);
    if (locked.length === 0) return null;
    return locked.reduce((nearest, current) =>
      current.unlockXP < nearest.unlockXP ? current : nearest
    );
  }

  // Réinitialiser les paramètres
  async resetSettings(): Promise<void> {
    try {
      await Promise.all([
        AsyncStorage.removeItem(STORAGE_KEYS.AVATAR_FORMAT),
        AsyncStorage.removeItem(STORAGE_KEYS.SELECTED_ICON),
      ]);
    } catch (error) {
      logger.error('[AppearanceService] Erreur réinitialisation:', error);
      throw error;
    }
  }
}

export const appearanceService = new AppearanceService();
export default appearanceService;
