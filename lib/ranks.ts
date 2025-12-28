// ============================================
// ⚔️ YOROI - SYSTÈME DE RANGS SAMOURAÏ
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
}

export const RANKS: Rank[] = [
  {
    id: 'recrue',
    name: 'Recrue',
    nameFemale: 'Recrue',
    nameJp: '新兵 (Shinpei)',
    icon: 'target',
    minDays: 0,
    color: '#6B7280',
    description: 'Le voyage commence. Tu fais tes premiers pas.',
    descriptionFemale: 'Le voyage commence. Tu fais tes premiers pas.',
  },
  {
    id: 'ashigaru',
    name: 'Ashigaru',
    nameFemale: 'Ashigaru',
    nameJp: '足軽 (Ashigaru)',
    icon: 'swords',
    minDays: 7,
    color: '#60A5FA',
    description: "Fantassin loyal. Tu as prouvé ta détermination.",
    descriptionFemale: "Fantassine loyale. Tu as prouvé ta détermination.",
  },
  {
    id: 'bushi',
    name: 'Bushi',
    nameFemale: 'Onna-Bugeisha',
    nameJp: '武士 (Bushi)',
    icon: 'shield',
    minDays: 21,
    color: '#34D399',
    description: "Guerrier discipliné. L'honneur guide tes pas.",
    descriptionFemale: "Guerrière disciplinée. L'honneur guide tes pas.",
  },
  {
    id: 'knight',
    name: 'Chevalier',
    nameFemale: 'Chevalière',
    nameJp: '騎士 (Kishi)',
    icon: 'shield',
    minDays: 30,
    color: '#C0C0C0',
    description: "Noble guerrier. L'honneur et le courage te guident.",
    descriptionFemale: "Noble guerrière. L'honneur et le courage te guident.",
  },
  {
    id: 'samurai',
    name: 'Samouraï',
    nameFemale: 'Onna-Musha',
    nameJp: '侍 (Samurai)',
    icon: 'sword',
    minDays: 45,
    color: '#D4AF37',
    description: "Guerrier d'élite. La voie du bushido est la tienne.",
    descriptionFemale: "Guerrière d'élite. La voie du bushido est la tienne.",
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
  },
  {
    id: 'sensei',
    name: 'Sensei',
    nameFemale: 'Sensei',
    nameJp: '先生 (Sensei)',
    icon: 'graduation-cap',
    minDays: 150,
    color: '#EC4899',
    description: 'Maître et guide. Tu inspires les autres.',
    descriptionFemale: 'Maître et guide. Tu inspires les autres.',
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
  },
  {
    id: 'daimyo',
    name: 'Daimyō',
    nameFemale: 'Onna-Daimyō',
    nameJp: '大名 (Daimyō)',
    icon: 'castle',
    minDays: 365,
    color: '#DC2626',
    description: 'Seigneur légendaire. Immortel.',
    descriptionFemale: 'Dame légendaire. Immortelle.',
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
export const getAvatarForRank = (rankId: string) => {
  const avatarMap: Record<string, any> = {
    recrue: require('@/assets/avatars/samurai/samurai_neutral.png'),
    ashigaru: require('@/assets/avatars/samurai/samurai_neutral.png'),
    bushi: require('@/assets/avatars/samurai/samurai_neutral.png'),
    knight: require('@/assets/avatars/knight/knight.png'),
    samurai: require('@/assets/avatars/samurai/samurai_strong.png'),
    ronin: require('@/assets/avatars/samurai/samurai_tired.png'),
    sensei: require('@/assets/avatars/samurai/samurai_strong.png'),
    shogun: require('@/assets/avatars/samurai/samurai_legendary.png'),
    daimyo: require('@/assets/avatars/samurai/samurai_legendary.png'),
  };
  return avatarMap[rankId] || avatarMap.recrue;
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
