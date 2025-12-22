// ============================================
// ⚔️ YOROI - SERVICE APPARENCE & THÈMES
// ============================================
// Gestion des préférences d'apparence utilisateur

import AsyncStorage from '@react-native-async-storage/async-storage';
import { ThemeColor } from '@/constants/themes';

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
    themeColor: 'classic', // Turquoise classique
    description: 'Le style intemporel',
    unlockXP: 0, // GRATUIT
    icon: '⚔️',
  },
  {
    id: 'tiffany',
    name: 'Tiffany',
    themeColor: 'tiffany', // Bleu Tiffany
    description: 'Élégance turquoise',
    unlockXP: 0, // GRATUIT
    icon: '💎',
  },

  // === THÈMES PREMIUM ===
  {
    id: 'samurai',
    name: 'Samouraï',
    themeColor: 'magma', // Rouge
    description: 'La voie du bushido',
    unlockXP: 2000,
    icon: '🗡️',
  },
  {
    id: 'shogun',
    name: 'Shogun',
    themeColor: 'volt', // Or électrique
    description: 'Le commandant suprême',
    unlockXP: 4000,
    icon: '👑',
  },
  {
    id: 'ninja',
    name: 'Ninja',
    themeColor: 'phantom', // Violet/sombre
    description: "L'ombre silencieuse",
    unlockXP: 6000,
    icon: '🥷',
  },
  {
    id: 'ronin',
    name: 'Ronin',
    themeColor: 'ghost', // Gris
    description: 'Le guerrier sans maître',
    unlockXP: 8000,
    icon: '🌙',
  },
  {
    id: 'sakura',
    name: 'Sakura',
    themeColor: 'sakura', // Rose
    description: 'La beauté du cerisier',
    unlockXP: 10000,
    icon: '🌸',
  },
  {
    id: 'ocean',
    name: 'Ocean',
    themeColor: 'ocean', // Bleu océan
    description: 'Profondeur marine',
    unlockXP: 12000,
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
      console.error('[AppearanceService] Erreur chargement paramètres:', error);
      return DEFAULT_SETTINGS;
    }
  }

  // Sauvegarder le format d'avatar
  async setAvatarFormat(format: AvatarFormat): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.AVATAR_FORMAT, format);
    } catch (error) {
      console.error('[AppearanceService] Erreur sauvegarde format avatar:', error);
      throw error;
    }
  }

  // Sauvegarder l'icône sélectionnée (iOS uniquement)
  async setAppIcon(iconName: string | null): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_ICON, iconName || '');
    } catch (error) {
      console.error('[AppearanceService] Erreur sauvegarde icône:', error);
      throw error;
    }
  }

  // Vérifier si un thème guerrier est débloqué
  isWarriorThemeUnlocked(themeId: string, userXP: number): boolean {
    const theme = WARRIOR_THEMES.find((t) => t.id === themeId);
    if (!theme) return false;
    return userXP >= theme.unlockXP;
  }

  // Obtenir tous les thèmes guerriers débloqués
  getUnlockedWarriorThemes(userXP: number): WarriorTheme[] {
    return WARRIOR_THEMES.filter((theme) => userXP >= theme.unlockXP);
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
      console.error('[AppearanceService] Erreur réinitialisation:', error);
      throw error;
    }
  }
}

export const appearanceService = new AppearanceService();
export default appearanceService;
