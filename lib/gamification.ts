// ============================================
// YOROI - SYSTEME DE GAMIFICATION SIMPLIFIE
// ============================================
// Style Pokemon : Avatar qui evolue avec des paliers clairs

export interface Level {
  level: number;
  name: string;
  nameJp: string;
  pointsRequired: number;
  icon: string;
  color: string;
  description: string;
}

// 5 niveaux simples et clairs
export const LEVELS: Level[] = [
  {
    level: 1,
    name: 'Debutant',
    nameJp: '初心者',
    pointsRequired: 0,
    icon: 'Sprout',
    color: '#6B7280',
    description: 'Tu commences ton voyage',
  },
  {
    level: 2,
    name: 'Apprenti',
    nameJp: '見習い',
    pointsRequired: 100,
    icon: 'Shield',
    color: '#3B82F6',
    description: 'Tu apprends les bases',
  },
  {
    level: 3,
    name: 'Athlète',
    nameJp: '戦士',
    pointsRequired: 300,
    icon: 'Swords',
    color: '#10B981',
    description: 'Tu maitrises la discipline',
  },
  {
    level: 4,
    name: 'Champion',
    nameJp: '勇者',
    pointsRequired: 600,
    icon: 'Trophy',
    color: '#F59E0B',
    description: 'Tu inspires les autres',
  },
  {
    level: 5,
    name: 'Legende',
    nameJp: '伝説',
    pointsRequired: 1000,
    icon: 'Crown',
    color: '#FFD700',
    description: 'Tu as atteint le sommet',
  },
];

// Actions qui donnent des points (SIMPLE)
export const POINTS_ACTIONS = {
  peser: 5,              // Se peser = +5 pts
  entrainement: 20,      // Entrainement = +20 pts
  objectif_jour: 10,     // Completer objectif du jour = +10 pts
  photo: 15,             // Ajouter une photo = +15 pts
  hydration_complete: 10, // Objectif hydratation atteint = +10 pts
  streak_7: 50,          // 7 jours de suite = +50 pts bonus
  streak_30: 200,        // 30 jours de suite = +200 pts bonus
  streak_100: 500,       // 100 jours de suite = +500 pts bonus
};

// Obtenir le niveau actuel en fonction des points
export const getLevel = (points: number): Level => {
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (points >= LEVELS[i].pointsRequired) {
      return LEVELS[i];
    }
  }
  return LEVELS[0];
};

// Obtenir le prochain niveau
export const getNextLevel = (points: number): Level | null => {
  const currentLevel = getLevel(points);
  const nextIndex = LEVELS.findIndex(l => l.level === currentLevel.level) + 1;
  return nextIndex < LEVELS.length ? LEVELS[nextIndex] : null;
};

// Progression vers le prochain niveau (en %)
export const getLevelProgress = (points: number): {
  progress: number;
  pointsToNext: number;
  currentLevelPoints: number;
  nextLevelPoints: number;
} => {
  const currentLevel = getLevel(points);
  const nextLevel = getNextLevel(points);

  if (!nextLevel) {
    return {
      progress: 100,
      pointsToNext: 0,
      currentLevelPoints: points,
      nextLevelPoints: currentLevel.pointsRequired,
    };
  }

  const pointsInLevel = points - currentLevel.pointsRequired;
  const pointsNeeded = nextLevel.pointsRequired - currentLevel.pointsRequired;
  const progress = Math.round((pointsInLevel / pointsNeeded) * 100);

  return {
    progress: Math.min(100, Math.max(0, progress)),
    pointsToNext: nextLevel.pointsRequired - points,
    currentLevelPoints: currentLevel.pointsRequired,
    nextLevelPoints: nextLevel.pointsRequired,
  };
};

// Calculer les points totaux depuis les activites
export const calculateTotalPoints = async (
  weightsCount: number,
  trainingsCount: number,
  photosCount: number,
  streak: number,
  hydrationDaysComplete: number
): Promise<number> => {
  let total = 0;

  // Points de base
  total += weightsCount * POINTS_ACTIONS.peser;
  total += trainingsCount * POINTS_ACTIONS.entrainement;
  total += photosCount * POINTS_ACTIONS.photo;
  total += hydrationDaysComplete * POINTS_ACTIONS.hydration_complete;

  // Bonus streak
  if (streak >= 100) {
    total += POINTS_ACTIONS.streak_100;
  } else if (streak >= 30) {
    total += POINTS_ACTIONS.streak_30;
  } else if (streak >= 7) {
    total += POINTS_ACTIONS.streak_7;
  }

  return total;
};

export default {
  LEVELS,
  POINTS_ACTIONS,
  getLevel,
  getNextLevel,
  getLevelProgress,
  calculateTotalPoints,
};
