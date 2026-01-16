// ============================================
// ⚔️ YOROI - SERVICE APPARENCE & THÈMES
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
  // === THÈMES GRATUITS (2 thèmes) ===
  {
    id: 'classic',
    name: 'Classic',
    themeColor: 'classic',
    description: 'Le style intemporel',
    unlockXP: 0, // GRATUIT
    icon: '⬜',
  },
  {
    id: 'tiffany',
    name: 'Tiffany',
    themeColor: 'tiffany',
    description: 'Élégance turquoise',
    unlockXP: 0, // GRATUIT
    icon: '💎',
  },

  // === THÈMES PREMIUM (8 thèmes) ===
  {
    id: 'volt',
    name: 'Volt',
    themeColor: 'volt',
    description: 'Énergie électrique',
    unlockXP: 1000,
    icon: '⚡',
  },
  {
    id: 'magma',
    name: 'Magma',
    themeColor: 'magma',
    description: 'Feu du combat',
    unlockXP: 2000,
    icon: '🔥',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    themeColor: 'sakura',
    description: 'Beauté du cerisier',
    unlockXP: 3000,
    icon: '🌸',
  },
  {
    id: 'matrix',
    name: 'Matrix',
    themeColor: 'matrix',
    description: 'Vert cybernétique',
    unlockXP: 4000,
    icon: '💚',
  },
  {
    id: 'blaze',
    name: 'Blaze',
    themeColor: 'blaze',
    description: 'Flammes orangées',
    unlockXP: 5000,
    icon: '🟠',
  },
  {
    id: 'phantom',
    name: 'Phantom',
    themeColor: 'phantom',
    description: "L'ombre mystérieuse",
    unlockXP: 6000,
    icon: '💜',
  },
  {
    id: 'ghost',
    name: 'Ghost',
    themeColor: 'ghost',
    description: "L'esprit minimaliste",
    unlockXP: 7000,
    icon: '🤍',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    themeColor: 'ocean',
    description: 'Profondeur marine',
    unlockXP: 8000,
    icon: '🌊',
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
  // 🎁 TOUS LES THÈMES DÉBLOQUÉS POUR LE DÉVELOPPEMENT
  isWarriorThemeUnlocked(themeId: string, userXP: number): boolean {
    // 🎁 Pendant le développement, tous les thèmes sont débloqués
    // Plus tard, remplacer par: return userXP >= theme.unlockXP;
    return true;
  }

  // Obtenir tous les thèmes guerriers débloqués
  // 🎁 TOUS LES THÈMES DÉBLOQUÉS POUR LE DÉVELOPPEMENT
  getUnlockedWarriorThemes(userXP: number): WarriorTheme[] {
    // 🎁 Pendant le développement, tous les thèmes sont débloqués
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
