// Icônes et couleurs pour chaque sport

export interface SportIconConfig {
  icon: string;
  color: string;
}

export const SPORT_ICONS: Record<string, SportIconConfig> = {
  // Combat - Grappling
  'jjb': { icon: '🥋', color: '#1E88E5' },
  'bjj': { icon: '🥋', color: '#1E88E5' },
  'judo': { icon: '🥋', color: '#FF5722' },
  'lutte': { icon: '🤼', color: '#795548' },
  'grappling': { icon: '🥋', color: '#1E88E5' },
  
  // Combat - Striking
  'mma': { icon: '🥊', color: '#E53935' },
  'boxe': { icon: '🥊', color: '#E53935' },
  'boxe_anglaise': { icon: '🥊', color: '#E53935' },
  'boxe_thai': { icon: '🥊', color: '#FF6F00' },
  'muay_thai': { icon: '🥊', color: '#FF6F00' },
  'kickboxing': { icon: '🥊', color: '#FF6F00' },
  'karate': { icon: '🥋', color: '#9C27B0' },
  'taekwondo': { icon: '🥋', color: '#00BCD4' },
  
  // Fitness
  'musculation': { icon: '🏋️', color: '#43A047' },
  'fitness': { icon: '🏋️', color: '#43A047' },
  'crossfit': { icon: '🏋️', color: '#FB8C00' },
  'haltérophilie': { icon: '🏋️', color: '#43A047' },
  'powerlifting': { icon: '🏋️', color: '#43A047' },
  
  // Cardio
  'running': { icon: '🏃', color: '#00BCD4' },
  'course': { icon: '🏃', color: '#00BCD4' },
  'cardio': { icon: '❤️', color: '#E91E63' },
  'hiit': { icon: '⚡', color: '#FF5722' },
  'vélo': { icon: '🚴', color: '#00BCD4' },
  'cyclisme': { icon: '🚴', color: '#00BCD4' },
  'natation': { icon: '🏊', color: '#0288D1' },
  
  // Souplesse & Bien-être
  'yoga': { icon: '🧘', color: '#9C27B0' },
  'pilates': { icon: '🧘', color: '#E91E63' },
  'stretching': { icon: '🧘', color: '#9C27B0' },
  'méditation': { icon: '🧘', color: '#673AB7' },
  
  // Sports collectifs
  'football': { icon: '⚽', color: '#4CAF50' },
  'basket': { icon: '🏀', color: '#FF5722' },
  'rugby': { icon: '🏉', color: '#795548' },
  'handball': { icon: '🤾', color: '#2196F3' },
  'volley': { icon: '🏐', color: '#FFEB3B' },
  
  // Sports de raquette
  'tennis': { icon: '🎾', color: '#8BC34A' },
  'padel': { icon: '🏓', color: '#00BCD4' },
  'badminton': { icon: '🏸', color: '#03A9F4' },
  'squash': { icon: '🏓', color: '#009688' },
  
  // Autres
  'escalade': { icon: '🧗', color: '#795548' },
  'ski': { icon: '⛷️', color: '#00BCD4' },
  'surf': { icon: '🏄', color: '#00BCD4' },
  
  // Default
  'default': { icon: '💪', color: '#607D8B' },
};

export const getSportIcon = (sportName: string): SportIconConfig => {
  const key = sportName.toLowerCase().replace(/\s+/g, '_').replace(/[éè]/g, 'e');
  return SPORT_ICONS[key] || SPORT_ICONS['default'];
};

export const getSportColor = (sportName: string): string => {
  return getSportIcon(sportName).color;
};

export const getSportEmoji = (sportName: string): string => {
  return getSportIcon(sportName).icon;
};

