// ============================================
// YOROI - SYSTÈME DE RANGS SAMOURAÏ
// ============================================

export interface Rank {
  id: string;
  name: string;
  nameFemale: string; // Version féminine
  nameJp: string;
  icon: 'target' | 'swords' | 'sword' | 'moon' | 'graduation-cap' | 'crown' | 'castle' | 'shield' | 'star';
  minDays: number;
  color: string;
  description: string;
  descriptionFemale: string;
  reward?: string; // Récompense associée au rang
}

export const RANKS: Rank[] = [
  {
    id: 'ashigaru',
    name: 'Ashigaru',
    nameFemale: 'Ashigaru',
    nameJp: '足軽 (Ashigaru)',
    icon: 'target',
    minDays: 0,
    color: '#60A5FA',
    description: "Fantassin loyal. Le voyage commence.",
    descriptionFemale: "Fantassine loyale. Le voyage commence.",
    reward: 'Démarrage du parcours',
  },
  {
    id: 'bushi',
    name: 'Bushi',
    nameFemale: 'Onna-Bugeisha',
    nameJp: '武士 (Bushi)',
    icon: 'shield',
    minDays: 15,
    color: '#34D399',
    description: "Athlète discipliné. L'honneur guide tes pas.",
    descriptionFemale: "Guerrière disciplinée. L'honneur guide tes pas.",
    reward: 'Nouveaux avatars débloqués',
  },
  {
    id: 'samurai',
    name: 'Samouraï',
    nameFemale: 'Onna-Musha',
    nameJp: '侍 (Samurai)',
    icon: 'sword',
    minDays: 30,
    color: '#D4AF37',
    description: "Athlète d'élite. La voie du bushido est la tienne.",
    descriptionFemale: "Guerrière d'élite. La voie du bushido est la tienne.",
    reward: 'Packs d\'avatars élites',
  },
  {
    id: 'ronin',
    name: 'Rōnin',
    nameFemale: 'Rōnin',
    nameJp: '浪人 (Rōnin)',
    icon: 'moon',
    minDays: 90,
    color: '#A855F7',
    description: 'Maître vagabond. Tu forges ta propre voie.',
    descriptionFemale: 'Maître vagabonde. Tu forges ta propre voie.',
    reward: 'Packs de collection exclusifs',
  },
  {
    id: 'shogun',
    name: 'Shōgun',
    nameFemale: 'Onna-Shōgun',
    nameJp: '将軍 (Shōgun)',
    icon: 'crown',
    minDays: 250,
    color: '#FFD700',
    description: 'Commandant suprême. Légende vivante.',
    descriptionFemale: 'Commandante suprême. Légende vivante.',
    reward: 'Avatars légendaires',
  },
];

// Obtenir le rang actuel en fonction du nombre de jours de streak
export const getCurrentRank = (streakDays: number): Rank => {
  return RANKS.reduce((current, rank) => {
    return streakDays >= rank.minDays ? rank : current;
  }, RANKS[0]);
};

// Obtenir le prochain rang
export const getNextRank = (streakDays: number): Rank | null => {
  const nextRank = RANKS.find(r => r.minDays > streakDays);
  return nextRank || null;
};

// Jours restants pour le prochain rang
export const getDaysToNextRank = (streakDays: number): number => {
  const nextRank = getNextRank(streakDays);
  if (!nextRank) return 0;
  return nextRank.minDays - streakDays;
};

// Obtenir l'avatar correspondant au rang
// TEMPORAIREMENT DESACTIVE - EN COURS DE CREATION DE NOUVEAUX AVATARS
export const getAvatarForRank = (rankId: string) => {
  return null;
};

// Progression vers le prochain rang (en %)
export const getRankProgress = (streakDays: number): number => {
  const currentRank = getCurrentRank(streakDays);
  const nextRank = getNextRank(streakDays);

  if (!nextRank) return 100;

  const totalDays = nextRank.minDays - currentRank.minDays;
  const progressDays = streakDays - currentRank.minDays;

  return Math.min(100, Math.max(0, (progressDays / totalDays) * 100));
};

// Couleur du rang
export const getRankColor = (rankId: string): string => {
  const rank = RANKS.find(r => r.id === rankId);
  return rank?.color || '#6B7280';
};

export default RANKS;
