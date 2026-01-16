// ============================================
// SERVICE DE DÉCOUVERTE DES FONCTIONNALITÉS
// Gère les tutoriels de première visite pour chaque page
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const DISCOVERY_KEY = 'yoroi_feature_discovery_v2';
const CHANGELOG_KEY = 'yoroi_last_changelog_version';

// Version actuelle de l'app pour le changelog
const CURRENT_VERSION = '2.1.0';

export type FeaturePage =
  | 'home'
  | 'stats'
  | 'planning'
  | 'add'
  | 'menu'
  | 'carnet'
  | 'weight'
  | 'composition'
  | 'fasting'
  | 'injury'
  | 'performance';

export interface FeatureDiscoveryState {
  [key: string]: boolean; // Page visitée ou non
}

export interface PageTutorial {
  id: FeaturePage;
  title: string;
  description: string;
  features: string[];
  icon: string; // Nom de l'icône Lucide
  color: string;
}

// ============================================
// TUTORIELS POUR CHAQUE PAGE
// ============================================

export const PAGE_TUTORIALS: Record<FeaturePage, PageTutorial> = {
  home: {
    id: 'home',
    title: 'Accueil',
    description: 'Ta base de suivi quotidien',
    features: [
      'Suivi du poids et de l\'hydratation en temps réel',
      'Monitoring de ton sommeil et ta charge d\'entraînement',
      'Grilles d\'actions rapides personnalisables',
      'Statistiques de performance et santé',
      'Citations motivantes quotidiennes',
    ],
    icon: 'home',
    color: '#F59E0B',
  },
  stats: {
    id: 'stats',
    title: 'Statistiques',
    description: 'Analyse complète de tes performances',
    features: [
      'Onglet Poids : évolution détaillée avec prédictions',
      'Onglet Composition : masse grasse, musculaire, hydratation',
      'Onglet Vitalité : sommeil, charge, récupération',
      'Onglet Performance : force, endurance, vitesse',
      'Onglet Discipline : assiduité par sport',
      'Synchronisation Apple Health disponible',
    ],
    icon: 'bar-chart',
    color: '#8B5CF6',
  },
  planning: {
    id: 'planning',
    title: 'Planning',
    description: 'Organise tes entraînements',
    features: [
      'Vue Calendrier : tous tes entraînements en un coup d\'œil',
      'Vue Entraînements : historique détaillé de toutes tes sessions',
      'Vue Compétitions : gère tes combats et objectifs',
      'Ajoute facilement un nouvel entraînement, combat ou compétition',
      'Filtre par sport et type d\'entraînement',
    ],
    icon: 'calendar',
    color: '#06B6D4',
  },
  add: {
    id: 'add',
    title: 'Ajout Rapide',
    description: 'Enregistre tes performances',
    features: [
      'Bouton Entraînement : enregistre une session complète',
      'Bouton Combat : log un combat avec adversaire et résultat',
      'Bouton Compétition : programme tes futurs événements',
      'Accès rapide depuis toutes les pages',
      'Données sauvegardées localement sur ton téléphone',
    ],
    icon: 'plus',
    color: '#10B981',
  },
  menu: {
    id: 'menu',
    title: 'Menu',
    description: 'Toutes les fonctionnalités de Yoroi',
    features: [
      'Section Suivi : poids, composition, jeûne, blessures',
      'Section Compétition : événements, adversaires, clubs',
      'Section Outils : calculateurs IMC/IMG, catégories de poids',
      'Section Personnalisation : avatar, thème, rappels',
      'Section Communauté : partage, partenaires, Instagram',
      'Aide & Tutoriels pour revoir toutes les explications',
    ],
    icon: 'menu',
    color: '#EF4444',
  },
  carnet: {
    id: 'carnet',
    title: 'Carnet d\'Entraînement',
    description: 'Tes records et techniques',
    features: [
      'Section Records : benchmarks de force, running, Hyrox',
      'Section Techniques : skills de JJB, Boxe, Lutte, Grappling',
      'Graphiques d\'évolution pour chaque exercice',
      'Photos et vidéos de tes performances',
      'Système de corbeille pour restaurer les suppressions',
    ],
    icon: 'book',
    color: '#F59E0B',
  },
  weight: {
    id: 'weight',
    title: 'Suivi du Poids',
    description: 'Track ton poids quotidien',
    features: [
      'Enregistre ton poids chaque jour',
      'Graphique d\'évolution avec prédictions',
      'Synchronisation Apple Health',
      'Historique complet modifiable',
      'Export des données en PDF',
    ],
    icon: 'scale',
    color: '#3B82F6',
  },
  composition: {
    id: 'composition',
    title: 'Composition Corporelle',
    description: 'Analyse ta composition',
    features: [
      'Masse grasse en kg et pourcentage',
      'Masse musculaire et masse osseuse',
      'Taux d\'hydratation corporelle',
      'Graphiques d\'évolution détaillés',
      'Calculateur IMG intégré',
    ],
    icon: 'activity',
    color: '#10B981',
  },
  fasting: {
    id: 'fasting',
    title: 'Jeûne Intermittent',
    description: 'Gère tes périodes de jeûne',
    features: [
      'Protocoles pré-configurés (16/8, 18/6, 20/4, OMAD)',
      'Timer en temps réel avec notifications',
      'Historique de tous tes jeûnes',
      'Statistiques de réussite',
      'Mode sombre adapté',
    ],
    icon: 'clock',
    color: '#F59E0B',
  },
  injury: {
    id: 'injury',
    title: 'Évaluation de Blessures',
    description: 'Évalue tes blessures',
    features: [
      'Schéma corporel interactif',
      'Enregistre type, gravité et date',
      'Suivi de la guérison',
      'Historique complet des blessures',
      'Export pour médecin si besoin',
    ],
    icon: 'heart-pulse',
    color: '#EF4444',
  },
  performance: {
    id: 'performance',
    title: 'Performance Globale',
    description: 'Vue 360° de tes capacités',
    features: [
      'Radar de performance (Force, Endurance, Vitesse, etc.)',
      'Scores calculés automatiquement',
      'Évolution dans le temps',
      'Comparaison par période',
      'Identification des points à travailler',
    ],
    icon: 'gauge',
    color: '#8B5CF6',
  },
};

// ============================================
// FONCTIONS DE GESTION
// ============================================

/**
 * Charge l'état de découverte des fonctionnalités
 */
export const loadDiscoveryState = async (): Promise<FeatureDiscoveryState> => {
  try {
    const data = await AsyncStorage.getItem(DISCOVERY_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('Error loading discovery state:', error);
    return {};
  }
};

/**
 * Marque une page comme visitée
 */
export const markPageAsVisited = async (page: FeaturePage): Promise<void> => {
  try {
    const state = await loadDiscoveryState();
    state[page] = true;
    await AsyncStorage.setItem(DISCOVERY_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Error marking page as visited:', error);
  }
};

/**
 * Vérifie si une page a été visitée
 */
export const hasVisitedPage = async (page: FeaturePage): Promise<boolean> => {
  try {
    const state = await loadDiscoveryState();
    return state[page] === true;
  } catch (error) {
    console.error('Error checking page visit:', error);
    return true; // En cas d'erreur, on ne montre pas le tutoriel
  }
};

/**
 * Reset tous les tutoriels (pour debug ou réinitialisation)
 */
export const resetAllTutorials = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(DISCOVERY_KEY);
  } catch (error) {
    console.error('Error resetting tutorials:', error);
  }
};

// ============================================
// GESTION DU CHANGELOG
// ============================================

/**
 * Vérifie si le changelog doit être affiché
 */
export const shouldShowChangelog = async (): Promise<boolean> => {
  try {
    const lastVersion = await AsyncStorage.getItem(CHANGELOG_KEY);
    return lastVersion !== CURRENT_VERSION;
  } catch (error) {
    console.error('Error checking changelog:', error);
    return false;
  }
};

/**
 * Marque le changelog comme lu
 */
export const markChangelogAsRead = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(CHANGELOG_KEY, CURRENT_VERSION);
  } catch (error) {
    console.error('Error marking changelog as read:', error);
  }
};

/**
 * Force l'affichage du changelog (pour debug)
 */
export const resetChangelog = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(CHANGELOG_KEY);
  } catch (error) {
    console.error('Error resetting changelog:', error);
  }
};
