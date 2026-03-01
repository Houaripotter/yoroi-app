// ============================================
// SERVICE DE TIPS CONTEXTUELS
// Remplace l'ancien FeatureDiscoveryModal intrusif
// par des bulles legeres + un guide complet
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '@/lib/security/logger';

const TIPS_KEY = '@yoroi_contextual_tips_v1';
const OLD_DISCOVERY_KEY = 'yoroi_feature_discovery_v2';

// ============================================
// TYPES
// ============================================

export type TipId = 'home' | 'stats' | 'add' | 'planning' | 'more' | 'carnet' | 'charge' | 'profile';

export interface ContextualTipData {
  title: string;
  lines: [string, string, string];
  icon: string; // Lucide icon name
  color: string;
}

export interface GuideTip {
  text: string;
}

export interface GuideSection {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  tips: GuideTip[];
}

export interface TipsState {
  [key: string]: boolean;
}

// ============================================
// 8 TIPS CONTEXTUELS (bulles)
// ============================================

export const CONTEXTUAL_TIPS: Record<TipId, ContextualTipData> = {
  home: {
    title: 'Tableau de bord',
    lines: [
      'Appuie sur une carte pour saisir ta valeur du jour',
      'Actions rapides en bas',
      'Defile pour voir defis et progression',
    ],
    icon: 'home',
    color: '#F59E0B',
  },
  stats: {
    title: 'Tes statistiques',
    lines: [
      'Glisse gauche/droite pour changer d\'onglet',
      'Appuie sur un graphique pour le detail',
      'L\'onglet Sante synchronise Apple Health',
    ],
    icon: 'bar-chart',
    color: '#8B5CF6',
  },
  add: {
    title: 'Ajouter rapidement',
    lines: [
      'Bouton Entrainement en haut pour saisie complete',
      'Logue poids, composition ou humeur ici',
      'Sauvegarde locale sans connexion',
    ],
    icon: 'plus',
    color: '#10B981',
  },
  planning: {
    title: 'Ton planning',
    lines: [
      'Glisse entre Calendrier, Seances et Competitions',
      'Appuie sur un jour pour voir/ajouter',
      'Competitions avec compte a rebours',
    ],
    icon: 'calendar',
    color: '#06B6D4',
  },
  more: {
    title: '40+ outils',
    lines: [
      'Barre de recherche pour trouver instantanement',
      'Etoile pour epingler en favoris',
      'Groupes par theme',
    ],
    icon: 'menu',
    color: '#EF4444',
  },
  carnet: {
    title: 'Carnet d\'entrainement',
    lines: [
      'Onglet Records pour tes perfs',
      'Onglet Techniques pour skills JJB, Boxe...',
      'Bouton + en bas a droite pour commencer',
    ],
    icon: 'book',
    color: '#F59E0B',
  },
  charge: {
    title: 'Charge d\'entrainement',
    lines: [
      'Score calcule depuis tes seances',
      'Vert=ok, Orange=eleve, Rouge=surcharge',
      'Adapte ton volume chaque semaine',
    ],
    icon: 'zap',
    color: '#F97316',
  },
  profile: {
    title: 'Ton profil',
    lines: [
      'Crayon pour modifier nom et sport',
      'XP gagne en loguant chaque activite',
      'Chaque niveau debloque de nouveaux rangs',
    ],
    icon: 'user',
    color: '#3B82F6',
  },
};

// ============================================
// GUIDE COMPLET (ecran /guide)
// ============================================

export const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: 'tabs',
    title: 'Onglets Principaux',
    description: 'Les 5 onglets de navigation',
    icon: 'layout',
    color: '#F59E0B',
    tips: [],
  },
  {
    id: 'tabs-home',
    title: 'Accueil',
    description: 'Ton tableau de bord quotidien',
    icon: 'home',
    color: '#F59E0B',
    tips: [
      { text: 'Appuie sur une carte (poids, eau, sommeil) pour saisir ta valeur du jour' },
      { text: 'Glisse les actions rapides en bas pour acceder aux outils frequents' },
      { text: 'Le score Batterie resume ta forme (sommeil + charge + recuperation)' },
      { text: 'Les defis du jour apparaissent en bas, complete-les pour gagner de l\'XP' },
      { text: 'Appuie sur ta photo de profil pour personnaliser ton avatar' },
    ],
  },
  {
    id: 'tabs-stats',
    title: 'Statistiques',
    description: 'Analyse detaillee de tes performances',
    icon: 'bar-chart',
    color: '#8B5CF6',
    tips: [
      { text: 'Glisse gauche/droite pour naviguer entre les 7 onglets' },
      { text: 'Appuie sur un point du graphique pour voir le detail de ce jour' },
      { text: 'Onglet Discipline : assiduité par sport avec calendrier de streaks' },
      { text: 'Onglet Sante synchronise les donnees Apple Health / Google Fit' },
      { text: 'Change la periode (semaine, mois, annee) avec les boutons en haut' },
    ],
  },
  {
    id: 'tabs-add',
    title: 'Ajout Rapide',
    description: 'Enregistre tes donnees en quelques taps',
    icon: 'plus',
    color: '#10B981',
    tips: [
      { text: 'Bouton Entrainement en haut pour une saisie complete avec details' },
      { text: 'Logue ton poids, ta composition corporelle ou ton humeur ici' },
      { text: 'Les donnees sont sauvegardees localement, pas besoin de connexion' },
      { text: 'Apres chaque saisie, les stats se mettent a jour automatiquement' },
      { text: 'Tu peux aussi ajouter un combat ou une competition depuis cet ecran' },
    ],
  },
  {
    id: 'tabs-planning',
    title: 'Planning',
    description: 'Organise tes entrainements et competitions',
    icon: 'calendar',
    color: '#06B6D4',
    tips: [
      { text: 'Glisse entre les vues Calendrier, Seances et Competitions' },
      { text: 'Appuie sur un jour du calendrier pour voir ou ajouter une seance' },
      { text: 'Les competitions affichent un compte a rebours automatique' },
      { text: 'Filtre par sport pour voir uniquement les seances qui t\'interessent' },
      { text: 'Les couleurs correspondent a tes sports (configurable dans Mes Sports)' },
    ],
  },
  {
    id: 'tabs-more',
    title: 'Outils',
    description: '40+ outils organises par theme',
    icon: 'menu',
    color: '#EF4444',
    tips: [
      { text: 'Utilise la barre de recherche pour trouver n\'importe quel outil' },
      { text: 'Appuie sur l\'etoile pour epingler un outil en favori (acces rapide)' },
      { text: 'Les outils sont groupes : Entrainement, Corps, Suivi, Competiteur...' },
      { text: 'Calculateurs IMC, macros, 1RM et metabolisme dans Outils & Calculs' },
      { text: 'Section Donnees pour importer/exporter tes donnees' },
    ],
  },
  {
    id: 'features',
    title: 'Autres Fonctionnalites',
    description: 'Ecrans et outils avances',
    icon: 'sparkles',
    color: '#8B5CF6',
    tips: [],
  },
  {
    id: 'features-carnet',
    title: 'Carnet d\'entrainement',
    description: 'Records et techniques',
    icon: 'book',
    color: '#F59E0B',
    tips: [
      { text: 'Onglet Records pour suivre tes benchmarks (force, running, Hyrox)' },
      { text: 'Onglet Techniques pour tes skills JJB, Boxe, Lutte, Grappling' },
      { text: 'Graphiques d\'evolution pour chaque exercice' },
      { text: 'Bouton + en bas a droite pour ajouter un nouveau record ou skill' },
      { text: 'Systeme de corbeille : les elements supprimes sont recuperables' },
    ],
  },
  {
    id: 'features-charge',
    title: 'Charge d\'entrainement',
    description: 'Suivi de ta charge et recuperation',
    icon: 'zap',
    color: '#F97316',
    tips: [
      { text: 'Le score est calcule automatiquement depuis tes seances' },
      { text: 'Vert = charge optimale, Orange = elevee, Rouge = surcharge' },
      { text: 'Le ratio aigu/chronique compare ta semaine vs ta moyenne 4 semaines' },
      { text: 'Adapte ton volume d\'entrainement chaque semaine en fonction du score' },
      { text: 'Combine avec le sommeil et l\'hydratation pour une vue complete' },
    ],
  },
  {
    id: 'features-profile',
    title: 'Profil',
    description: 'Ton identite dans l\'app',
    icon: 'user',
    color: '#3B82F6',
    tips: [
      { text: 'Appuie sur le crayon pour modifier ton nom, sport et photo' },
      { text: 'L\'XP se gagne en loguant des activites chaque jour' },
      { text: 'Chaque niveau debloque de nouveaux rangs et badges' },
      { text: 'Ton avatar evolue avec ta progression' },
      { text: 'Partage ton profil depuis le menu Partager' },
    ],
  },
];

// ============================================
// FONCTIONS
// ============================================

/**
 * Charge l'etat de tous les tips
 */
export const loadAllTipState = async (): Promise<TipsState> => {
  try {
    const data = await AsyncStorage.getItem(TIPS_KEY);
    if (data) {
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    logger.error('Error loading tip state:', error);
    return {};
  }
};

/**
 * Verifie si un tip doit etre affiche (pas encore vu)
 * Gere aussi la migration depuis l'ancien systeme
 */
export const shouldShowTip = async (tipId: TipId): Promise<boolean> => {
  try {
    // Migration : si l'ancien systeme existe, pre-marquer tous les tips comme vus
    const oldData = await AsyncStorage.getItem(OLD_DISCOVERY_KEY);
    if (oldData) {
      const allTipIds: TipId[] = ['home', 'stats', 'add', 'planning', 'more', 'carnet', 'charge', 'profile'];
      const migratedState: TipsState = {};
      for (const id of allTipIds) {
        migratedState[id] = true; // Marquer comme deja vu
      }
      await AsyncStorage.setItem(TIPS_KEY, JSON.stringify(migratedState));
      await AsyncStorage.removeItem(OLD_DISCOVERY_KEY);
      return false; // Ancien utilisateur -> pas de tip
    }

    const state = await loadAllTipState();
    return state[tipId] !== true;
  } catch (error) {
    logger.error('Error checking tip:', error);
    return false; // En cas d'erreur, ne pas afficher
  }
};

/**
 * Marque un tip comme vu (ne plus l'afficher)
 */
export const dismissTip = async (tipId: TipId): Promise<void> => {
  try {
    const state = await loadAllTipState();
    state[tipId] = true;
    await AsyncStorage.setItem(TIPS_KEY, JSON.stringify(state));
  } catch (error) {
    logger.error('Error dismissing tip:', error);
  }
};

/**
 * Reset tous les tips (pour le bouton "Revoir les astuces")
 */
export const resetAllTips = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(TIPS_KEY);
  } catch (error) {
    logger.error('Error resetting tips:', error);
  }
};
