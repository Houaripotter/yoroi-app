// ============================================
// YOROI - MODE RONIN
// ============================================
// Mode Focus ultra-minimaliste pour la salle de sport

import AsyncStorage from '@react-native-async-storage/async-storage';

const RONIN_MODE_KEY = '@yoroi_ronin_mode';

export interface RoninTheme {
  background: string;
  primary: string;
  secondary: string;
  text: string;
  accent: string;
  timer: {
    fontSize: number;
    fontWeight: string;
    color: string;
  };
  phase: {
    fontSize: number;
    fontWeight: string;
    letterSpacing: number;
    color: string;
  };
}

// Thème Ronin - Minimaliste noir/rouge
export const RONIN_THEME: RoninTheme = {
  background: '#000000',       // Noir pur
  primary: '#FF0000',          // Rouge sang
  secondary: '#1A1A1A',        // Gris très foncé
  text: '#FFFFFF',             // Blanc
  accent: '#8B0000',           // Rouge foncé

  timer: {
    fontSize: 120,
    fontWeight: '100',         // Ultra light
    color: '#FF0000',
  },

  phase: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 8,
    color: '#FFFFFF',
  },
};

class RoninModeService {
  /**
   * Activer le mode Ronin
   */
  async activate(): Promise<void> {
    try {
      await AsyncStorage.setItem(RONIN_MODE_KEY, 'true');
    } catch (error) {
      console.error('[RoninMode] Erreur activation:', error);
    }
  }

  /**
   * Désactiver le mode Ronin
   */
  async deactivate(): Promise<void> {
    try {
      await AsyncStorage.setItem(RONIN_MODE_KEY, 'false');
    } catch (error) {
      console.error('[RoninMode] Erreur désactivation:', error);
    }
  }

  /**
   * Vérifier si le mode Ronin est actif
   */
  async isActive(): Promise<boolean> {
    try {
      const value = await AsyncStorage.getItem(RONIN_MODE_KEY);
      return value === 'true';
    } catch (error) {
      console.error('[RoninMode] Erreur vérification:', error);
      return false;
    }
  }

  /**
   * Toggle le mode Ronin
   */
  async toggle(): Promise<boolean> {
    const isActive = await this.isActive();
    if (isActive) {
      await this.deactivate();
      return false;
    } else {
      await this.activate();
      return true;
    }
  }
}

// Instance singleton
export const roninModeService = new RoninModeService();

export default roninModeService;
