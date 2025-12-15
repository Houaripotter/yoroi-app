// ============================================
// YOROI - SYSTEME DE SPORTS
// ============================================

export interface Sport {
  id: string;
  name: string;
  icon: string;
  color: string;
  muscles?: string[];
}

export const SPORTS: Sport[] = [
  {
    id: 'jjb',
    name: 'JJB',
    icon: '🥋',
    color: '#EF4444',
  },
  {
    id: 'mma',
    name: 'MMA',
    icon: '🥊',
    color: '#F97316',
  },
  {
    id: 'boxe',
    name: 'Boxe',
    icon: '🥊',
    color: '#DC2626',
  },
  {
    id: 'musculation',
    name: 'Musculation',
    icon: '💪',
    color: '#3B82F6',
    muscles: ['pectoraux', 'dos', 'epaules', 'biceps', 'triceps', 'abdos', 'jambes', 'mollets'],
  },
  {
    id: 'running',
    name: 'Running',
    icon: '🏃',
    color: '#22C55E',
  },
  {
    id: 'football',
    name: 'Football',
    icon: '⚽',
    color: '#10B981',
  },
  {
    id: 'natation',
    name: 'Natation',
    icon: '🏊',
    color: '#06B6D4',
  },
  {
    id: 'yoga',
    name: 'Yoga',
    icon: '🧘',
    color: '#A855F7',
  },
  {
    id: 'padel',
    name: 'Padel',
    icon: '🎾',
    color: '#FBBF24',
  },
  {
    id: 'crossfit',
    name: 'CrossFit',
    icon: '🏋️',
    color: '#F59E0B',
  },
  {
    id: 'velo',
    name: 'Velo',
    icon: '🚴',
    color: '#8B5CF6',
  },
  {
    id: 'autre',
    name: 'Autre',
    icon: '🏋️',
    color: '#6B7280',
  },
];

export const MUSCLES = [
  { id: 'pectoraux', name: 'Pectoraux', icon: '💪' },
  { id: 'dos', name: 'Dos', icon: '🔙' },
  { id: 'epaules', name: 'Epaules', icon: '💪' },
  { id: 'biceps', name: 'Biceps', icon: '💪' },
  { id: 'triceps', name: 'Triceps', icon: '💪' },
  { id: 'abdos', name: 'Abdos', icon: '🎯' },
  { id: 'jambes', name: 'Jambes', icon: '🦵' },
  { id: 'mollets', name: 'Mollets', icon: '🦶' },
  { id: 'avant_bras', name: 'Avant-bras', icon: '💪' },
  { id: 'fessiers', name: 'Fessiers', icon: '🍑' },
];

export const getSportById = (id: string): Sport | undefined => {
  return SPORTS.find(s => s.id === id);
};

export const getSportColor = (id: string): string => {
  return getSportById(id)?.color || '#6B7280';
};

export const getSportIcon = (id: string): string => {
  return getSportById(id)?.icon || '🏋️';
};

export const getSportName = (id: string): string => {
  return getSportById(id)?.name || 'Autre';
};

export default SPORTS;
