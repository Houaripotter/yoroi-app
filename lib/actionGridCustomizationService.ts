// ============================================
// ACTION GRID CUSTOMIZATION SERVICE
// Liste des outils affichés dans Page2ActionGrid
// Version simplifiée sans drag & drop
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const GRID_ORDER_KEY = '@yoroi_action_grid_order';

export interface ActionGridItem {
  id: string;
  icon: string;
  route: string;
  label: string;
  description: string;
  color: string;
}

// Ordre par défaut des outils
const DEFAULT_GRID_ITEMS: ActionGridItem[] = [
  {
    id: 'carnet',
    icon: 'BookOpen',
    route: '/training-journal',
    label: "Carnet",
    description: "Records et PR",
    color: '#F97316',
  },
  {
    id: 'timer',
    icon: 'Timer',
    route: '/timer',
    label: 'Timer',
    description: 'Rounds, HIIT, Tabata',
    color: '#4ECDC4',
  },
  {
    id: 'infirmerie',
    icon: 'Heart',
    route: '/infirmary',
    label: 'Infirmerie',
    description: 'Blessures et récup',
    color: '#EF4444',
  },
  {
    id: 'photos',
    icon: 'Camera',
    route: '/photos',
    label: 'Photos',
    description: 'Avant / après',
    color: '#8B5CF6',
  },
  {
    id: 'jeune',
    icon: 'Clock',
    route: '/fasting',
    label: 'Jeûne',
    description: 'Intermittent, Ramadan',
    color: '#A855F7',
  },
  {
    id: 'partager',
    icon: 'Share2',
    route: '/social-share/last-session',
    label: 'Partager',
    description: 'Réseaux sociaux',
    color: '#EC4899',
  },
  {
    id: 'competiteur',
    icon: 'Trophy',
    route: '/competitions',
    label: 'Compétitions',
    description: 'Calendrier & palmarès',
    color: '#F59E0B',
  },
  {
    id: 'calculateurs',
    icon: 'Calculator',
    route: '/calculators',
    label: 'Calculateurs',
    description: 'IMC, BMR...',
    color: '#3B82F6',
  },
  {
    id: 'nutrition',
    icon: 'Utensils',
    route: '/nutrition-plan',
    label: 'Nutrition',
    description: 'Plan alimentaire',
    color: '#10B981',
  },
  {
    id: 'clubs',
    icon: 'Users',
    route: '/planning',
    label: 'Clubs',
    description: 'Coachs & partenaires',
    color: '#6366F1',
  },
  {
    id: 'health',
    icon: 'Heart',
    route: '/health-metrics',
    label: 'Santé',
    description: 'Apple Health',
    color: '#EC4899',
  },
  {
    id: 'themes',
    icon: 'Palette',
    route: '/settings/appearance',
    label: 'Thèmes',
    description: 'Personnalisation',
    color: '#8B5CF6',
  },
  {
    id: 'savoir',
    icon: 'BookMarked',
    route: '/savoir',
    label: 'Savoir',
    description: 'Culture générale',
    color: '#F97316',
  },
  {
    id: 'profil',
    icon: 'User',
    route: '/profile',
    label: 'Profil',
    description: 'Mon compte',
    color: '#6366F1',
  },
  {
    id: 'notifications',
    icon: 'Bell',
    route: '/settings',
    label: 'Notifications',
    description: 'Rappels et alertes',
    color: '#F59E0B',
  },
];

/**
 * Retourne la liste des items de la grille d'outils.
 * Si une commande personnalisée est sauvegardée, elle est utilisée.
 * Sinon, l'ordre par défaut est retourné.
 */
export async function getActionGridOrder(): Promise<ActionGridItem[]> {
  try {
    const saved = await AsyncStorage.getItem(GRID_ORDER_KEY);
    if (!saved) return DEFAULT_GRID_ITEMS;

    const savedIds: string[] = JSON.parse(saved);
    if (!Array.isArray(savedIds) || savedIds.length === 0) return DEFAULT_GRID_ITEMS;

    // Réordonne selon l'ordre sauvegardé, et ajoute les nouveaux items à la fin
    const ordered: ActionGridItem[] = [];
    for (const id of savedIds) {
      const item = DEFAULT_GRID_ITEMS.find(i => i.id === id);
      if (item) ordered.push(item);
    }
    // Ajouter les items qui n'étaient pas dans l'ordre sauvegardé
    for (const item of DEFAULT_GRID_ITEMS) {
      if (!ordered.find(i => i.id === item.id)) {
        ordered.push(item);
      }
    }
    return ordered;
  } catch {
    return DEFAULT_GRID_ITEMS;
  }
}

/**
 * Sauvegarde l'ordre personnalisé des items (liste d'IDs).
 */
export async function saveActionGridOrder(items: ActionGridItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(GRID_ORDER_KEY, JSON.stringify(items.map(i => i.id)));
  } catch {
    // Ignorer les erreurs de stockage
  }
}
