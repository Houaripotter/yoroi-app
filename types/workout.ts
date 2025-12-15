export type WorkoutType = 'gracie_barra' | 'basic_fit' | 'running';

export interface Workout {
  id: string;
  user_id: string;
  date: string;
  type: WorkoutType;
  duration?: number;
  notes?: string;
  created_at: string;
  updated_at: string;
  club_id?: number;
}

export const WORKOUT_TYPES = {
  gracie_barra: {
    label: 'Gracie Barra',
    shortLabel: 'JJB',
    logo: undefined, // Utilise emoji 🥋 comme fallback
    emoji: '🥋',
    color: '#DC2626', // Rouge
  },
  basic_fit: {
    label: 'Basic Fit',
    shortLabel: 'Muscu',
    logo: undefined, // Utilise emoji 🏋️ comme fallback
    emoji: '🏋️',
    color: '#F59E0B', // Orange
  },
  running: {
    label: 'Running',
    shortLabel: 'Course',
    logo: undefined, // Utilise une icône Lucide/MaterialCommunityIcons au lieu d'une image
    color: '#10B981', // Vert
  },
} as const;
