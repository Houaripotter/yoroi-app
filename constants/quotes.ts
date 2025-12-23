// ============================================
// YOROI - CITATIONS MOTIVANTES
// ============================================
// Citations qui changent chaque jour

export const MOTIVATIONAL_QUOTES = [
  "La discipline bat le talent quand le talent ne travaille pas.",
  "Chaque pesée est une victoire sur toi-même.",
  "Le corps atteint ce que l'esprit croit.",
  "Ta seule limite, c'est toi.",
  "Un guerrier n'abandonne jamais.",
  "La douleur est temporaire, la fierté est éternelle.",
  "Petit à petit, le guerrier devient légende.",
  "Ton futur toi te remerciera.",
  "La constance bat l'intensité.",
  "Chaque jour est une nouvelle bataille à gagner.",
  "Le succès est la somme de petits efforts répétés.",
  "Ne compte pas les jours, fais que les jours comptent.",
  "La sueur d'aujourd'hui est le succès de demain.",
  "Deviens la meilleure version de toi-même.",
  "Le changement commence quand tu décides.",
  "Ton corps peut presque tout. C'est ton esprit qu'il faut convaincre.",
  "Chaque rep compte. Chaque gramme compte.",
  "La force ne vient pas du corps. Elle vient de la volonté.",
  "Sois plus fort que tes excuses.",
  "Le guerrier se forge dans la difficulté.",
  "Aujourd'hui est un bon jour pour progresser.",
  "La transformation commence par un premier pas.",
  "Ne rêve pas ta vie, vis ton rêve.",
  "Le meilleur moment pour commencer, c'était hier. Le deuxième meilleur, c'est maintenant.",
  "Chaque jour, tu te rapproches de ton objectif.",
  "La victoire appartient aux persévérants.",
  "Forge ton corps, forge ton esprit.",
  "Le chemin du guerrier est fait de discipline.",
  "Ton seul adversaire, c'est toi-même.",
  "La vraie force se mesure à la régularité.",
];

/**
 * Obtient la citation du jour (change chaque jour)
 * Utilise la date pour avoir une citation différente chaque jour
 */
export const getDailyQuote = (): string => {
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) /
      (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % MOTIVATIONAL_QUOTES.length;
  return MOTIVATIONAL_QUOTES[index];
};

/**
 * Obtient une citation aléatoire
 */
export const getRandomQuote = (): string => {
  const index = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length);
  return MOTIVATIONAL_QUOTES[index];
};
