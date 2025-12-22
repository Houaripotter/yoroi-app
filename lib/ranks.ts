// ============================================
// ⚔️ YOROI - SYSTÈME DE RANGS GUERRIER
// ============================================

export interface Rank {
  id: string;
  name: string;
  nameJp: string;
  icon: string;
  minDays: number;
  color: string;
  description: string;
}

export const RANKS: Rank[] = [
  {
    id: 'recrue',
    name: 'Recrue',
    nameJp: '新兵',
    icon: 'target',
    minDays: 0,
    color: '#6B7280',
    description: 'Tu commences ton voyage',
  },
  {
    id: 'ashigaru',
    name: 'Ashigaru',
    nameJp: '足軽',
    icon: 'swords',
    minDays: 7,
    color: '#3B82F6',
    description: "Soldat d'infanterie",
  },
  {
    id: 'samurai',
    name: 'Samouraï',
    nameJp: '侍',
    icon: 'sword',
    minDays: 30,
    color: '#D4AF37',
    description: "Guerrier d'élite",
  },
  {
    id: 'ronin',
    name: 'Rōnin',
    nameJp: '浪人',
    icon: 'moon',
    minDays: 90,
    color: '#A855F7',
    description: 'Maître sans maître',
  },
  {
    id: 'sensei',
    name: 'Sensei',
    nameJp: '先生',
    icon: 'graduation-cap',
    minDays: 120,
    color: '#EC4899',
    description: 'Maître et guide',
  },
  {
    id: 'shogun',
    name: 'Shōgun',
    nameJp: '将軍',
    icon: 'crown',
    minDays: 180,
    color: '#FFD700',
    description: 'Commandant suprême',
  },
  {
    id: 'daimyo',
    name: 'Daimyō',
    nameJp: '大名',
    icon: 'castle',
    minDays: 365,
    color: '#DC2626',
    description: 'Seigneur légendaire',
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

export default RANKS;
