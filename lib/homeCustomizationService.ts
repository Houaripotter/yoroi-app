// ============================================
// YOROI - SERVICE PERSONNALISATION ACCUEIL
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';

const HOME_CUSTOMIZATION_KEY = '@yoroi_home_customization';

export interface HomeSection {
  id: string;
  name: string;
  description: string;
  icon: string;
  visible: boolean;
  order: number;
  mandatory?: boolean; // Ne peut pas être caché
}

// Configuration par défaut des sections de l'accueil
export const DEFAULT_HOME_SECTIONS: HomeSection[] = [
  {
    id: 'header',
    name: 'En-tete',
    description: 'Logo, salutation et citation',
    icon: 'user',
    visible: true,
    order: 0,
    mandatory: true,
  },
  {
    id: 'stats_compact',
    name: 'Stats Rapides',
    description: 'Jours, Niveau, Rang',
    icon: 'trophy',
    visible: true,
    order: 1,
  },
  {
    id: 'weight_hydration',
    name: 'Poids & Hydratation',
    description: 'Cartes poids et hydratation',
    icon: 'scale',
    visible: true,
    order: 2,
  },
  {
    id: 'sleep_charge',
    name: 'Sommeil & Charge',
    description: 'Cartes sommeil et charge d\'entrainement',
    icon: 'moon',
    visible: true,
    order: 3,
  },
  {
    id: 'tools_row_1',
    name: 'Carnet & Planning',
    description: 'Carnet, Timer, Calendrier, Emploi du temps',
    icon: 'book-open',
    visible: true,
    order: 4,
  },
  {
    id: 'tools_row_2',
    name: 'Sante & Outils',
    description: 'Blessures, Energie, Savoir, Calculateurs',
    icon: 'heart',
    visible: true,
    order: 5,
  },
  {
    id: 'tools_row_3',
    name: 'Objectifs & Partage',
    description: 'Prochain objectif, Jeune, Photo, Partager',
    icon: 'share-2',
    visible: true,
    order: 6,
  },
  {
    id: 'healthspan',
    name: 'Tendance Sante',
    description: 'Ton esperance de vie en bonne sante',
    icon: 'heart',
    visible: true,
    order: 7,
  },
  {
    id: 'challenges',
    name: 'Defis du Jour',
    description: 'Tes objectifs quotidiens',
    icon: 'target',
    visible: true,
    order: 8,
    mandatory: true, // Toujours visible - fonctionnalité importante
  },
  {
    id: 'performance_radar',
    name: 'Radar de Performance',
    description: 'Vue d\'ensemble de tes stats',
    icon: 'activity',
    visible: true,
    order: 9,
  },
  {
    id: 'weekly_report',
    name: 'Rapport de Mission',
    description: 'Bilan hebdomadaire',
    icon: 'file-text',
    visible: true,
    order: 10,
  },
  {
    id: 'weight_graph_large',
    name: 'Graphique Poids',
    description: 'Grand graphique de suivi du poids',
    icon: 'trending-down',
    visible: true,
    order: 11,
  },
  {
    id: 'activity_summary',
    name: 'Résumé Activité',
    description: 'Pas et calories brûlées',
    icon: 'activity',
    visible: true,
    order: 12,
  },
];

// Charger la configuration
export const getHomeCustomization = async (): Promise<HomeSection[]> => {
  try {
    const stored = await AsyncStorage.getItem(HOME_CUSTOMIZATION_KEY);
    if (stored) {
      logger.info('[HOME_SERVICE] Configuration trouvée dans AsyncStorage');
      const customization = JSON.parse(stored) as HomeSection[];
      logger.info('[HOME_SERVICE] Sections chargées:', customization.map(s => `${s.id}(${s.order})`).join(', '));
      // Fusionner avec les valeurs par défaut pour les nouvelles sections
      const merged = mergeWithDefaults(customization);
      logger.info('[HOME_SERVICE] Après fusion:', merged.map(s => `${s.id}(${s.order})`).join(', '));
      return merged;
    }
    logger.info('[HOME_SERVICE] Aucune configuration trouvée, utilisation des valeurs par défaut');
    return DEFAULT_HOME_SECTIONS;
  } catch (error) {
    logger.error('[HOME_SERVICE] Erreur chargement customization:', error);
    return DEFAULT_HOME_SECTIONS;
  }
};

// Fusionner avec les defaults (pour compatibilité futures mises à jour)
const mergeWithDefaults = (saved: HomeSection[]): HomeSection[] => {
  const merged = [...DEFAULT_HOME_SECTIONS];

  // Sections obsolètes à ignorer
  const obsoleteSections = ['tools_scroll']; // tools_scroll n'existe plus

  saved.forEach(savedSection => {
    // Ignorer les sections obsolètes
    if (obsoleteSections.includes(savedSection.id)) {
      return;
    }
    const index = merged.findIndex(s => s.id === savedSection.id);
    if (index !== -1) {
      merged[index] = { ...merged[index], ...savedSection };
    }
  });

  return merged.sort((a, b) => a.order - b.order);
};

// Sauvegarder la configuration
export const saveHomeCustomization = async (sections: HomeSection[]): Promise<void> => {
  try {
    logger.info('[HOME_SERVICE] Sauvegarde de', sections.length, 'sections');
    logger.info('[HOME_SERVICE] Ordre:', sections.map(s => `${s.id}(${s.order})`).join(', '));
    await AsyncStorage.setItem(HOME_CUSTOMIZATION_KEY, JSON.stringify(sections));
    logger.info('[HOME_SERVICE] Sauvegarde AsyncStorage réussie');
  } catch (error) {
    logger.error('[HOME_SERVICE] Erreur sauvegarde customization:', error);
    throw error;
  }
};

// Réinitialiser aux valeurs par défaut
export const resetHomeCustomization = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HOME_CUSTOMIZATION_KEY);
  } catch (error) {
    logger.error('Erreur reset customization:', error);
    throw error;
  }
};

// Vérifier si une section est visible
export const isSectionVisible = (sections: HomeSection[], sectionId: string): boolean => {
  const section = sections.find(s => s.id === sectionId);
  if (!section) return true;
  // Les sections mandatory sont toujours visibles
  if (section.mandatory) return true;
  return section.visible;
};

// Obtenir les sections triées
export const getSortedSections = (sections: HomeSection[]): HomeSection[] => {
  return [...sections].sort((a, b) => a.order - b.order);
};

export default {
  getHomeCustomization,
  saveHomeCustomization,
  resetHomeCustomization,
  isSectionVisible,
  getSortedSections,
  DEFAULT_HOME_SECTIONS,
};
