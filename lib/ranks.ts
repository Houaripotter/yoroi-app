// ============================================
// YOROI - SYSTEME DE RANGS SAMURAI UNIFIE
// ============================================
// Un seul systeme : 5 rangs bases sur les XP totaux
// Le streak donne des XP bonus (via gamification.ts)

export interface Rank {
  id: string;
  name: string;
  nameFemale: string;
  nameJp: string;
  icon: 'target' | 'swords' | 'sword' | 'moon' | 'graduation-cap' | 'crown' | 'castle' | 'shield' | 'star';
  minPoints: number;
  color: string;
  description: string;
  descriptionFemale: string;
  reward?: string;
}

export const RANKS: Rank[] = [
  {
    id: 'ashigaru',
    name: 'Ashigaru',
    nameFemale: 'Ashigaru',
    nameJp: '足軽 (Ashigaru)',
    icon: 'target',
    minPoints: 0,
    color: '#60A5FA',
    description: "Fantassin loyal. Le voyage commence.",
    descriptionFemale: "Fantassine loyale. Le voyage commence.",
    reward: 'Demarrage du parcours',
  },
  {
    id: 'bushi',
    name: 'Bushi',
    nameFemale: 'Onna-Bugeisha',
    nameJp: '武士 (Bushi)',
    icon: 'shield',
    minPoints: 500,
    color: '#34D399',
    description: "Athlete discipline. L'honneur guide tes pas.",
    descriptionFemale: "Guerriere disciplinee. L'honneur guide tes pas.",
    reward: 'Nouveaux avatars debloques',
  },
  {
    id: 'samurai',
    name: 'Samourai',
    nameFemale: 'Onna-Musha',
    nameJp: '侍 (Samurai)',
    icon: 'sword',
    minPoints: 2000,
    color: '#D4AF37',
    description: "Athlete d'elite. La voie du bushido est la tienne.",
    descriptionFemale: "Guerriere d'elite. La voie du bushido est la tienne.",
    reward: "Packs d'avatars elites",
  },
  {
    id: 'ronin',
    name: 'Ronin',
    nameFemale: 'Ronin',
    nameJp: '浪人 (Ronin)',
    icon: 'moon',
    minPoints: 5000,
    color: '#A855F7',
    description: 'Maitre vagabond. Tu forges ta propre voie.',
    descriptionFemale: 'Maitre vagabonde. Tu forges ta propre voie.',
    reward: 'Packs de collection exclusifs',
  },
  {
    id: 'shogun',
    name: 'Shogun',
    nameFemale: 'Onna-Shogun',
    nameJp: '将軍 (Shogun)',
    icon: 'crown',
    minPoints: 10000,
    color: '#FFD700',
    description: 'Commandant supreme. Legende vivante.',
    descriptionFemale: 'Commandante supreme. Legende vivante.',
    reward: 'Avatars legendaires',
  },
];

// Obtenir le rang actuel en fonction des XP
export const getCurrentRank = (points: number): Rank => {
  return RANKS.reduce((current, rank) => {
    return points >= rank.minPoints ? rank : current;
  }, RANKS[0]);
};

// Obtenir le prochain rang
export const getNextRank = (points: number): Rank | null => {
  const nextRank = RANKS.find(r => r.minPoints > points);
  return nextRank || null;
};

// Points restants pour le prochain rang
export const getDaysToNextRank = (points: number): number => {
  const nextRank = getNextRank(points);
  if (!nextRank) return 0;
  return nextRank.minPoints - points;
};

// Obtenir l'avatar correspondant au rang
export const getAvatarForRank = (rankId: string) => {
  return null;
};

// Progression vers le prochain rang (en %)
export const getRankProgress = (points: number): number => {
  const currentRank = getCurrentRank(points);
  const nextRank = getNextRank(points);

  if (!nextRank) return 100;

  const totalPoints = nextRank.minPoints - currentRank.minPoints;
  const progressPoints = points - currentRank.minPoints;

  return Math.min(100, Math.max(0, (progressPoints / totalPoints) * 100));
};

// Couleur du rang
export const getRankColor = (rankId: string): string => {
  const rank = RANKS.find(r => r.id === rankId);
  return rank?.color || '#6B7280';
};

// Niveau numerique (1-5) depuis un rang
export const rankToLevel = (rank: Rank): number => {
  const idx = RANKS.findIndex(r => r.id === rank.id);
  return idx >= 0 ? idx + 1 : 1;
};

export default RANKS;
