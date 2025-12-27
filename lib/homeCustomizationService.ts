// ============================================
// YOROI - SERVICE PERSONNALISATION ACCUEIL
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

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
    name: 'En-tête',
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
    id: 'actions_row',
    name: 'Actions Rapides',
    description: 'Infirmerie, Timer, Photo, Toggle Compétition (si compétiteur) ou Savoir',
    icon: 'grid',
    visible: true,
    order: 3,
  },
  {
    id: 'sleep_charge',
    name: 'Sommeil & Charge',
    description: 'Cartes sommeil et charge d\'entraînement',
    icon: 'moon',
    visible: true,
    order: 4,
  },
  {
    id: 'battery_tools',
    name: 'Énergie & Outils',
    description: 'Batterie, Savoir, Calculateurs, Nutrition',
    icon: 'battery',
    visible: true,
    order: 5,
  },
  {
    id: 'challenges',
    name: 'Défis du Jour',
    description: 'Tes objectifs quotidiens',
    icon: 'target',
    visible: true,
    order: 6,
  },
  {
    id: 'performance_radar',
    name: 'Radar de Performance',
    description: 'Vue d\'ensemble de tes stats',
    icon: 'activity',
    visible: true,
    order: 7,
  },
  {
    id: 'healthspan',
    name: 'Courbe Healthspan',
    description: 'Ton espérance de vie en bonne santé',
    icon: 'heart',
    visible: true,
    order: 8,
  },
  {
    id: 'weekly_report',
    name: 'Rapport de Mission',
    description: 'Bilan hebdomadaire',
    icon: 'file-text',
    visible: true,
    order: 9,
  },
  {
    id: 'streak_calendar',
    name: 'Calendrier Streak',
    description: 'Visualise ta régularité',
    icon: 'calendar',
    visible: true,
    order: 10,
  },
  {
    id: 'fighter_mode',
    name: 'Mode Compétiteur',
    description: 'Cut, Compétitions, Palmarès (visible uniquement pour les compétiteurs)',
    icon: 'award',
    visible: true,
    order: 11,
  },
];

// Charger la configuration
export const getHomeCustomization = async (): Promise<HomeSection[]> => {
  try {
    const stored = await AsyncStorage.getItem(HOME_CUSTOMIZATION_KEY);
    if (stored) {
      const customization = JSON.parse(stored) as HomeSection[];
      // Fusionner avec les valeurs par défaut pour les nouvelles sections
      return mergeWithDefaults(customization);
    }
    return DEFAULT_HOME_SECTIONS;
  } catch (error) {
    console.error('Erreur chargement customization:', error);
    return DEFAULT_HOME_SECTIONS;
  }
};

// Fusionner avec les defaults (pour compatibilité futures mises à jour)
const mergeWithDefaults = (saved: HomeSection[]): HomeSection[] => {
  const merged = [...DEFAULT_HOME_SECTIONS];

  saved.forEach(savedSection => {
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
    await AsyncStorage.setItem(HOME_CUSTOMIZATION_KEY, JSON.stringify(sections));
  } catch (error) {
    console.error('Erreur sauvegarde customization:', error);
    throw error;
  }
};

// Réinitialiser aux valeurs par défaut
export const resetHomeCustomization = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(HOME_CUSTOMIZATION_KEY);
  } catch (error) {
    console.error('Erreur reset customization:', error);
    throw error;
  }
};

// Vérifier si une section est visible
export const isSectionVisible = (sections: HomeSection[], sectionId: string): boolean => {
  const section = sections.find(s => s.id === sectionId);
  return section ? section.visible : true;
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
