// ============================================
// YOROI - SERVICE PERSONNALISATION GRILLE OUTILS
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
}

// Configuration par défaut - Organisée par thème (3 par ligne)
export const DEFAULT_ACTION_GRID_ITEMS: ActionGridItem[] = [
  // LIGNE 1 - ENTRAÎNEMENT
  {
    id: 'timer',
    label: 'Timer',
    description: 'Chronomètres séances',
    icon: 'Timer',
    color: '#4ECDC4',
    route: '/timer',
    order: 0,
  },
  {
    id: 'carnet',
    label: 'Carnet',
    description: 'Journal d\'entraînement',
    icon: 'BookOpen',
    color: '#F97316',
    route: '/training-journal',
    order: 1,
  },
  {
    id: 'calculateurs',
    label: 'Calculs',
    description: 'Outils de calcul sportif',
    icon: 'Calculator',
    color: '#F59E0B',
    route: '/calculators',
    order: 2,
  },

  // LIGNE 2 - SANTÉ & BIEN-ÊTRE
  {
    id: 'jeune',
    label: 'Jeûne',
    description: 'Suivi jeûne intermittent',
    icon: 'Clock',
    color: '#A855F7',
    route: '/fasting',
    order: 3,
  },
  {
    id: 'nutrition',
    label: 'Nutrition',
    description: 'Plans alimentaires',
    icon: 'Utensils',
    color: '#10B981',
    route: '/nutrition-plan',
    order: 4,
  },
  {
    id: 'health',
    label: 'Apple Health',
    description: 'Sync données santé',
    icon: 'Heart',
    color: '#EC4899',
    route: '/health-connect',
    order: 5,
  },

  // LIGNE 3 - CONNAISSANCE & GAMIFICATION
  {
    id: 'savoir',
    label: 'Savoir',
    description: 'Articles et connaissances',
    icon: 'BookMarked',
    color: '#8B5CF6',
    route: '/savoir',
    order: 6,
  },
  {
    id: 'dojo',
    label: 'Mon Dojo',
    description: 'XP, badges, avatars',
    icon: 'Sparkles',
    color: '#FBBF24',
    route: '/gamification',
    order: 7,
  },
  {
    id: 'notifications',
    label: 'Notifs',
    description: 'Rappels et alertes',
    icon: 'Bell',
    color: '#F59E0B',
    route: '/notifications',
    order: 8,
  },

  // LIGNE 4 - SOCIAL
  {
    id: 'partager',
    label: 'Partager',
    description: 'Partage tes résultats',
    icon: 'Share2',
    color: '#EC4899',
    route: '/share-hub',
    order: 9,
  },
  {
    id: 'clubs',
    label: 'Clubs & Coach',
    description: 'Partenaires et salles',
    icon: 'Users',
    color: '#818CF8',
    route: '/partners',
    order: 10,
  },
  {
    id: 'competiteur',
    label: 'Compète',
    description: 'Espace compétitions',
    icon: 'Trophy',
    color: '#EF4444',
    route: '/competitor-space',
    order: 11,
  },

  // LIGNE 5 - PERSONNALISATION
  {
    id: 'profil',
    label: 'Profil',
    description: 'Paramètres personnels',
    icon: 'User',
    color: '#60A5FA',
    route: '/profile',
    order: 12,
  },
  {
    id: 'themes',
    label: 'Thèmes',
    description: 'Personnalisation visuelle',
    icon: 'Palette',
    color: '#A78BFA',
    route: '/appearance',
    order: 13,
  },
  {
    id: 'photos',
    label: 'Photos',
    description: 'Galerie de progression',
    icon: 'Camera',
    color: '#F472B6',
    route: '/photos',
    order: 14,
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
    logger.info('[ACTION_GRID_SERVICE] Sauvegarde de', items.length, 'items');
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
