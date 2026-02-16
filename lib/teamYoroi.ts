// ============================================
// YOROI - VOCABULAIRE TEAM YOROI
// ============================================
// L'esprit combattant dans chaque mot
// Les utilisateurs sont des ATHLETES, des COMBATTANTS

// ═══════════════════════════════════════════════
// VOCABULAIRE DE BASE
// ═══════════════════════════════════════════════

export const YOROI_VOCAB = {
  // Termes de base
  user: 'Athlète',
  users: 'Athlètes',
  warrior: 'Combattant',
  team: 'Team Yoroi',

  // Corps & Transformation
  body: "L'Armure",
  weight: 'Le Poids',
  loseWeight: 'Forger son armure',
  weightLoss: 'La Forge',
  transformation: 'La Transformation',

  // Entraînement
  training: 'La Forge',
  workout: 'Session',
  gym: 'Le Dojo',

  // Objectifs
  goal: 'Mission',
  objective: 'Objectif',
  target: 'Cible',

  // Régime
  diet: 'Discipline',
  nutrition: 'Ravitaillement',

  // Streak
  streak: 'Série',
  discipline: 'Bushido',
};

// ═══════════════════════════════════════════════
// MESSAGES D'ONBOARDING
// ═══════════════════════════════════════════════

export const ONBOARDING_MESSAGES = {
  welcome: "Bienvenue dans la Team Yoroi, champion.",
  start: "Ton parcours de combattant commence maintenant.",
  ready: "Es-tu prêt à forger ton armure ?",
  letsGo: "En avant, champion !",
};

// ═══════════════════════════════════════════════
// NOTIFICATIONS PESÉE
// ═══════════════════════════════════════════════

export const WEIGH_IN_NOTIFICATIONS = [
  "Hey combattant, la pesée t'attend. On lâche rien.",
  "Athlète, c'est l'heure de monter sur la balance. ⚖️",
  "La discipline forge les champions. Pesée du jour !",
  "Un vrai champion connaît son poids. À la balance !",
  "Mission du matin : la pesée. Go champion !",
];

// ═══════════════════════════════════════════════
// MESSAGES DE SUCCÈS
// ═══════════════════════════════════════════════

export const SUCCESS_MESSAGES = [
  "MISSION ACCOMPLIE. La Team est fière de toi ! 🎖️",
  "Tu as forgé ton armure, champion.",
  "Objectif atteint ! Un vrai champion.",
  "Victoire ! Le Bushido coule dans tes veines.",
  "Honneur à toi, combattant. Mission réussie !",
];

// ═══════════════════════════════════════════════
// MESSAGES D'ENCOURAGEMENT (après échec)
// ═══════════════════════════════════════════════

export const ENCOURAGEMENT_MESSAGES = [
  "Un vrai champion se relève. Demain on repart.",
  "La défaite n'existe pas, seulement l'apprentissage.",
  "On est ensemble. La Team compte sur toi.",
  "Chaque chute te forge plus fort.",
  "Le chemin de l'athlète est semé d'obstacles. Continue !",
  "Tu ne restes jamais à terre. Relève-toi !",
];

// ═══════════════════════════════════════════════
// MESSAGES DE STREAK
// ═══════════════════════════════════════════════

export const STREAK_MESSAGES = {
  // Milestones
  day3: "3 jours de discipline. Le champion s'éveille !",
  day7: "7 jours de discipline. Le Bushido coule dans tes veines.",
  day14: "14 jours ! Tu deviens une légende, combattant.",
  day30: "30 JOURS ! Un mois de discipline pure. RESPECT.",
  day60: "60 jours ! Tu es un exemple pour la Team Yoroi.",
  day100: "100 JOURS ! Tu as atteint le niveau SENSEI.",

  // Streak perdu
  broken: "Tu as brisé ton streak. Mais tu ne restes jamais à terre.",
  restart: "Nouveau départ. La Team croit en toi, champion.",
};

// ═══════════════════════════════════════════════
// MESSAGES DE QUÊTES
// ═══════════════════════════════════════════════

export const QUEST_MESSAGES = {
  available: "Tes missions du jour t'attendent, combattant.",
  completed1: "1 quête accomplie. Continue, champion !",
  completed2: "2 quêtes accomplies. Tu avances bien !",
  completedAll: "Toutes les quêtes accomplies ! Honneur à toi, champion.",
  xpGained: (xp: number) => `+${xp} XP ! Tu te rapproches du prochain rang.`,
};

// ═══════════════════════════════════════════════
// SALUTATIONS DYNAMIQUES
// ═══════════════════════════════════════════════

export const getGreeting = (name: string, hour: number, gender?: 'male' | 'female' | 'homme' | 'femme'): string => {
  const firstName = name?.split(' ')[0] || 'Athlète';

  // Déterminer le titre selon le genre
  const isFemale = gender === 'female' || gender === 'femme';
  const title = isFemale ? 'Championne' : 'Champion';

  // Salutation simple selon l'heure
  if (hour >= 5 && hour < 12) {
    return `Bonjour ${title}, ${firstName}`;
  }

  if (hour >= 12 && hour < 18) {
    return `Hello ${title}, ${firstName}`;
  }

  // Soir
  return `Bonsoir ${title}, ${firstName}`;
};

// Ancienne fonction getGreeting avec les messages plus longs (legacy)
export const getGreetingLong = (name: string, hour: number): string => {
  const firstName = name?.split(' ')[0] || 'Athlète';

  if (hour >= 5 && hour < 12) {
    const morningGreetings = [
      `Bonjour ${firstName}, prêt pour la forge ?`,
      `Salut combattant ! Une nouvelle journée de discipline.`,
      `${firstName}, le champion se lève tôt. Respect ! 🌅`,
    ];
    return morningGreetings[Math.floor(Math.random() * morningGreetings.length)];
  }

  if (hour >= 12 && hour < 18) {
    const afternoonGreetings = [
      `${firstName}, la Team Yoroi te salue !`,
      `Combattant, continue ta mission !`,
      `${firstName}, forge ton armure !`,
    ];
    return afternoonGreetings[Math.floor(Math.random() * afternoonGreetings.length)];
  }

  // Soir
  const eveningGreetings = [
    `Bonsoir ${firstName}, journée de champion accomplie ?`,
    `${firstName}, repos du combattant mérité.`,
    `La nuit t'appartient, ${firstName}.`,
  ];
  return eveningGreetings[Math.floor(Math.random() * eveningGreetings.length)];
};

// ═══════════════════════════════════════════════
// MESSAGES ALÉATOIRES
// ═══════════════════════════════════════════════

export const getRandomMessage = (messages: string[]): string => {
  return messages[Math.floor(Math.random() * messages.length)];
};

export const getRandomSuccessMessage = () => getRandomMessage(SUCCESS_MESSAGES);
export const getRandomEncouragementMessage = () => getRandomMessage(ENCOURAGEMENT_MESSAGES);
export const getRandomWeighInNotification = () => getRandomMessage(WEIGH_IN_NOTIFICATIONS);

// ═══════════════════════════════════════════════
// MESSAGES DE RANG
// ═══════════════════════════════════════════════

export const RANK_MESSAGES = {
  rankUp: (newRank: string) => `🎖️ PROMOTION ! Tu es maintenant ${newRank}. La Team est fière !`,
  almostRankUp: (nextRank: string, daysLeft: number) =>
    `Plus que ${daysLeft} jours pour devenir ${nextRank}. Continue, champion !`,
};

// ═══════════════════════════════════════════════
// BADGE TEAM YOROI
// ═══════════════════════════════════════════════

export const TEAM_YOROI_BADGE = {
  id: 'team_yoroi_member',
  name: 'Membre Team Yoroi',
  description: 'Tu fais partie de la famille. Bienvenue, champion.',
  icon: '',
  rarity: 'legendary',
  unlockedAt: 'inscription',
};

export default {
  YOROI_VOCAB,
  ONBOARDING_MESSAGES,
  WEIGH_IN_NOTIFICATIONS,
  SUCCESS_MESSAGES,
  ENCOURAGEMENT_MESSAGES,
  STREAK_MESSAGES,
  QUEST_MESSAGES,
  RANK_MESSAGES,
  TEAM_YOROI_BADGE,
  getGreeting,
  getRandomSuccessMessage,
  getRandomEncouragementMessage,
  getRandomWeighInNotification,
};
