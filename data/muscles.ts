// ============================================
// YOROI - GROUPES MUSCULAIRES EN FRANÇAIS
// ============================================

export interface MuscleGroup {
  id: string;
  fr: string;
  en: string;
  icon: string;
  category: 'upper' | 'core' | 'lower' | 'fullbody';
}

export const MUSCLE_GROUPS: Record<string, MuscleGroup> = {
  // Haut du corps
  chest: { id: 'chest', fr: 'Pectoraux', en: 'Chest', icon: '💪', category: 'upper' },
  back: { id: 'back', fr: 'Dos', en: 'Back', icon: '🔙', category: 'upper' },
  shoulders: { id: 'shoulders', fr: 'Épaules', en: 'Shoulders', icon: '🦾', category: 'upper' },
  biceps: { id: 'biceps', fr: 'Biceps', en: 'Biceps', icon: '💪', category: 'upper' },
  triceps: { id: 'triceps', fr: 'Triceps', en: 'Triceps', icon: '💪', category: 'upper' },
  forearms: { id: 'forearms', fr: 'Avant-bras', en: 'Forearms', icon: '🦾', category: 'upper' },

  // Tronc
  abs: { id: 'abs', fr: 'Abdos', en: 'Abs', icon: '🎯', category: 'core' },
  obliques: { id: 'obliques', fr: 'Obliques', en: 'Obliques', icon: '🎯', category: 'core' },
  core: { id: 'core', fr: 'Gainage', en: 'Core', icon: '🎯', category: 'core' },
  lowerback: { id: 'lowerback', fr: 'Lombaires', en: 'Lower Back', icon: '🔙', category: 'core' },

  // Bas du corps
  quads: { id: 'quads', fr: 'Quadriceps', en: 'Quads', icon: '🦵', category: 'lower' },
  hamstrings: { id: 'hamstrings', fr: 'Ischio-jambiers', en: 'Hamstrings', icon: '🦵', category: 'lower' },
  glutes: { id: 'glutes', fr: 'Fessiers', en: 'Glutes', icon: '🍑', category: 'lower' },
  calves: { id: 'calves', fr: 'Mollets', en: 'Calves', icon: '🦵', category: 'lower' },
  adductors: { id: 'adductors', fr: 'Adducteurs', en: 'Adductors', icon: '🦵', category: 'lower' },

  // Full body
  fullbody: { id: 'fullbody', fr: 'Full Body', en: 'Full Body', icon: '🏋️', category: 'fullbody' },
  cardio: { id: 'cardio', fr: 'Cardio', en: 'Cardio', icon: '❤️', category: 'fullbody' },
  hiit: { id: 'hiit', fr: 'HIIT', en: 'HIIT', icon: '🔥', category: 'fullbody' },
};

// Liste pour le sélecteur
export const MUSCLE_LIST = [
  { id: 'chest', label: 'Pectoraux', category: 'upper' },
  { id: 'back', label: 'Dos', category: 'upper' },
  { id: 'shoulders', label: 'Épaules', category: 'upper' },
  { id: 'biceps', label: 'Biceps', category: 'upper' },
  { id: 'triceps', label: 'Triceps', category: 'upper' },
  { id: 'forearms', label: 'Avant-bras', category: 'upper' },
  { id: 'abs', label: 'Abdos', category: 'core' },
  { id: 'obliques', label: 'Obliques', category: 'core' },
  { id: 'core', label: 'Gainage', category: 'core' },
  { id: 'lowerback', label: 'Lombaires', category: 'core' },
  { id: 'quads', label: 'Quadriceps', category: 'lower' },
  { id: 'hamstrings', label: 'Ischio-jambiers', category: 'lower' },
  { id: 'glutes', label: 'Fessiers', category: 'lower' },
  { id: 'calves', label: 'Mollets', category: 'lower' },
  { id: 'fullbody', label: 'Full Body', category: 'fullbody' },
  { id: 'cardio', label: 'Cardio', category: 'fullbody' },
  { id: 'hiit', label: 'HIIT', category: 'fullbody' },
];

// Types de séances JJB
export const JJB_SESSIONS = [
  { id: 'openmat', label: 'Open Mat' },
  { id: 'drilling', label: 'Drilling' },
  { id: 'technique', label: 'Technique' },
  { id: 'sparring', label: 'Sparring' },
  { id: 'competition', label: 'Compétition' },
  { id: 'nogi', label: 'No-Gi' },
  { id: 'gi', label: 'Gi (Kimono)' },
];

// Types de séances MMA/Boxe/Combat
export const COMBAT_SESSIONS = [
  { id: 'technique', label: 'Technique' },
  { id: 'sparring', label: 'Sparring' },
  { id: 'pads', label: 'Paos/Pads' },
  { id: 'shadowboxing', label: 'Shadow Boxing' },
  { id: 'cardio', label: 'Cardio Boxing' },
  { id: 'competition', label: 'Compétition' },
  { id: 'conditioning', label: 'Conditioning' },
];

// Helpers
export const getMuscleName = (id: string): string => {
  return MUSCLE_GROUPS[id]?.fr || id;
};

export const getMuscleIcon = (id: string): string => {
  return MUSCLE_GROUPS[id]?.icon || '💪';
};

export default MUSCLE_GROUPS;
