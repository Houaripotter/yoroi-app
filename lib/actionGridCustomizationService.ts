// ============================================
// YOROI - SERVICE PERSONNALISATION GRILLE OUTILS
// Organisé par thèmes de 4 outils
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const ACTION_GRID_ORDER_KEY = '@yoroi_action_grid_order';

export interface ActionGridItem {
  id: string;
  label: string;
  description: string;
  icon: string; // Nom du composant Lucide (ex: 'BookOpen', 'Timer')
  color: string;
  route: string;
  order: number;
  theme?: string; // Thème de l'outil
}

// Configuration par défaut - Organisée par thème (4 par ligne)
export const DEFAULT_ACTION_GRID_ITEMS: ActionGridItem[] = [
  // ═══════════════════════════════════════════════════════════
  // THÈME 1 - ENTRAÎNEMENT (4 outils)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'timer',
    label: 'Timer',
    description: 'Chrono séance',
    icon: 'Timer',
    color: '#4ECDC4',
    route: '/timer',
    order: 0,
    theme: 'training',
  },
  {
    id: 'carnet',
    label: 'Carnet',
    description: 'Journal',
    icon: 'BookOpen',
    color: '#F97316',
    route: '/training-journal',
    order: 1,
    theme: 'training',
  },
  {
    id: 'competiteur',
    label: 'Compète',
    description: 'À venir',
    icon: 'Trophy',
    color: '#EF4444',
    route: '/competitor-space',
    order: 2,
    theme: 'training',
  },
  {
    id: 'records',
    label: 'Records',
    description: 'Tes PR',
    icon: 'Medal',
    color: '#FFD700',
    route: '/records',
    order: 3,
    theme: 'training',
  },

  // ═══════════════════════════════════════════════════════════
  // THÈME 2 - SANTÉ & CORPS (4 outils)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'infirmerie',
    label: 'Infirmerie',
    description: 'Blessures',
    icon: 'Plus',
    color: '#DC2626',
    route: '/infirmary',
    order: 4,
    theme: 'health',
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    description: 'Repas',
    icon: 'Utensils',
    color: '#10B981',
    route: '/nutrition-plan',
    order: 5,
    theme: 'health',
  },
  {
    id: 'jeune',
    label: 'Jeûne',
    description: 'Intermittent',
    icon: 'Clock',
    color: '#A855F7',
    route: '/fasting',
    order: 6,
    theme: 'health',
  },
  {
    id: 'sommeil',
    label: 'Sommeil',
    description: 'Suivi nuits',
    icon: 'Moon',
    color: '#6366F1',
    route: '/sleep',
    order: 7,
    theme: 'health',
  },

  // ═══════════════════════════════════════════════════════════
  // THÈME 3 - OUTILS & CALCULS (4 outils)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'calculateurs',
    label: 'Calculs',
    description: 'IMC, 1RM',
    icon: 'Calculator',
    color: '#F59E0B',
    route: '/calculators',
    order: 8,
    theme: 'tools',
  },
  {
    id: 'savoir',
    label: 'Savoir',
    description: 'Articles',
    icon: 'BookMarked',
    color: '#8B5CF6',
    route: '/savoir',
    order: 9,
    theme: 'tools',
  },
  {
    id: 'routines',
    label: 'Routines',
    description: 'Warm-up',
    icon: 'ListChecks',
    color: '#14B8A6',
    route: '/routines',
    order: 10,
    theme: 'tools',
  },
  {
    id: 'objectifs',
    label: 'Objectifs',
    description: 'Mes buts',
    icon: 'Target',
    color: '#EF4444',
    route: '/goals',
    order: 11,
    theme: 'tools',
  },

  // ═══════════════════════════════════════════════════════════
  // THÈME 4 - SOCIAL & GAMIFICATION (4 outils)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'dojo',
    label: 'Mon Dojo',
    description: 'XP & Badges',
    icon: 'Sparkles',
    color: '#FBBF24',
    route: '/gamification',
    order: 12,
    theme: 'social',
  },
  {
    id: 'clubs',
    label: 'Clubs & Coach',
    description: 'Partenaires',
    icon: 'Users',
    color: '#818CF8',
    route: '/partners',
    order: 13,
    theme: 'social',
  },
  {
    id: 'partager',
    label: 'Partager',
    description: 'Résultats',
    icon: 'Share2',
    color: '#EC4899',
    route: '/share-hub',
    order: 14,
    theme: 'social',
  },
  {
    id: 'classement',
    label: 'Ranking',
    description: 'Top players',
    icon: 'Crown',
    color: '#F59E0B',
    route: '/leaderboard',
    order: 15,
    theme: 'social',
  },

  // ═══════════════════════════════════════════════════════════
  // THÈME 5 - PERSONNALISATION (4 outils)
  // ═══════════════════════════════════════════════════════════
  {
    id: 'profil',
    label: 'Profil',
    description: 'Paramètres',
    icon: 'User',
    color: '#60A5FA',
    route: '/profile',
    order: 16,
    theme: 'settings',
  },
  {
    id: 'themes',
    label: 'Thèmes',
    description: 'Apparence',
    icon: 'Palette',
    color: '#A78BFA',
    route: '/appearance',
    order: 17,
    theme: 'settings',
  },
  {
    id: 'photos',
    label: 'Photos',
    description: 'Transfo',
    icon: 'Camera',
    color: '#F472B6',
    route: '/photos',
    order: 18,
    theme: 'settings',
  },
  {
    id: 'notifications',
    label: 'Notifs',
    description: 'Alertes',
    icon: 'Bell',
    color: '#F59E0B',
    route: '/notifications',
    order: 19,
    theme: 'settings',
  },
];

// Charger l'ordre personnalisé
export const getActionGridOrder = async (): Promise<ActionGridItem[]> => {
  try {
    const stored = await AsyncStorage.getItem(ACTION_GRID_ORDER_KEY);
    if (stored) {
      logger.info('[ACTION_GRID_SERVICE] Configuration trouvée dans AsyncStorage');
      const customOrder = JSON.parse(stored) as ActionGridItem[];
      logger.info('[ACTION_GRID_SERVICE] Items chargés:', customOrder.map(i => `${i.id}(${i.order})`).join(', '));
      // Fusionner avec les valeurs par défaut pour les nouvelles items
      const merged = mergeWithDefaults(customOrder);
      logger.info('[ACTION_GRID_SERVICE] Après fusion:', merged.map(i => `${i.id}(${i.order})`).join(', '));
      return merged;
    }
    logger.info('[ACTION_GRID_SERVICE] Aucune configuration trouvée, utilisation des valeurs par défaut');
    return DEFAULT_ACTION_GRID_ITEMS;
  } catch (error) {
    logger.error('[ACTION_GRID_SERVICE] Erreur chargement ordre:', error);
    return DEFAULT_ACTION_GRID_ITEMS;
  }
};

// Fusionner avec les defaults (pour compatibilité futures mises à jour)
const mergeWithDefaults = (saved: ActionGridItem[]): ActionGridItem[] => {
  const merged = [...DEFAULT_ACTION_GRID_ITEMS];

  saved.forEach(savedItem => {
    const index = merged.findIndex(i => i.id === savedItem.id);
    if (index !== -1) {
      // Mettre à jour seulement l'ordre, garder les labels/descriptions par défaut
      merged[index] = {
        ...merged[index],
        order: savedItem.order
      };
    }
  });

  // Trier par ordre
  return merged.sort((a, b) => a.order - b.order);
};

// Sauvegarder l'ordre personnalisé
export const saveActionGridOrder = async (items: ActionGridItem[]): Promise<void> => {
  try {
    logger.info(`[ACTION_GRID_SERVICE] Sauvegarde de ${items.length} items`);
    logger.info('[ACTION_GRID_SERVICE] Ordre:', items.map(i => `${i.id}(${i.order})`).join(', '));
    await AsyncStorage.setItem(ACTION_GRID_ORDER_KEY, JSON.stringify(items));
    logger.info('[ACTION_GRID_SERVICE] Sauvegarde AsyncStorage réussie');
  } catch (error) {
    logger.error('[ACTION_GRID_SERVICE] Erreur sauvegarde ordre:', error);
    throw error;
  }
};

// Réinitialiser aux valeurs par défaut
export const resetActionGridOrder = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(ACTION_GRID_ORDER_KEY);
    logger.info('[ACTION_GRID_SERVICE] Ordre réinitialisé');
  } catch (error) {
    logger.error('[ACTION_GRID_SERVICE] Erreur reset ordre:', error);
    throw error;
  }
};
