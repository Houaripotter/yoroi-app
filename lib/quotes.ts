// ============================================
// YOROI - CITATIONS MOTIVANTES DU GUERRIER
// ============================================

export interface Quote {
  text: string;
  author: string;
}

export const QUOTES: Quote[] = [
  {
    text: "Le champion victorieux gagne d'abord, puis va à la guerre.",
    author: "Sun Tzu",
  },
  {
    text: "Tombe sept fois, relève-toi huit.",
    author: "Proverbe japonais",
  },
  {
    text: "La discipline est le pont entre les objectifs et l'accomplissement.",
    author: "Jim Rohn",
  },
  {
    text: "Un samouraï doit avant tout garder à l'esprit qu'il doit mourir.",
    author: "Bushido",
  },
  {
    text: "Ce n'est pas la montagne que nous conquérons, mais nous-mêmes.",
    author: "Edmund Hillary",
  },
  {
    text: "La douleur d'aujourd'hui est la force de demain.",
    author: "Anonyme",
  },
  {
    text: "Chaque bataille est gagnée avant même d'être livrée.",
    author: "Sun Tzu",
  },
  {
    text: "Le corps atteint ce que l'esprit croit.",
    author: "Anonyme",
  },
  {
    text: "Sois comme l'eau, mon ami.",
    author: "Bruce Lee",
  },
  {
    text: "La seule mauvaise séance est celle qui n'a pas eu lieu.",
    author: "Anonyme",
  },
  {
    text: "Tu ne perds jamais. Soit tu gagnes, soit tu apprends.",
    author: "Nelson Mandela",
  },
  {
    text: "Le temps passera de toute façon. Autant l'utiliser.",
    author: "Earl Nightingale",
  },
  {
    text: "Connais-toi toi-même.",
    author: "Socrate",
  },
  {
    text: "La victoire appartient au plus persévérant.",
    author: "Napoléon Bonaparte",
  },
  {
    text: "Ce qui ne te tue pas te rend plus fort.",
    author: "Friedrich Nietzsche",
  },
  {
    text: "Le meilleur moment pour planter un arbre était il y a 20 ans. Le deuxième meilleur moment est maintenant.",
    author: "Proverbe chinois",
  },
  {
    text: "La sueur d'aujourd'hui est le succès de demain.",
    author: "Anonyme",
  },
  {
    text: "Un voyage de mille lieues commence par un seul pas.",
    author: "Lao Tseu",
  },
  {
    text: "Le doute tue plus de rêves que l'échec.",
    author: "Suzy Kassem",
  },
  {
    text: "Ne prie pas pour une vie facile. Prie pour avoir la force d'en vivre une difficile.",
    author: "Bruce Lee",
  },
];

// Obtenir une citation aléatoire
export const getRandomQuote = (): Quote => {
  return QUOTES[Math.floor(Math.random() * QUOTES.length)];
};

// Obtenir la citation du jour (basée sur le jour de l'année)
export const getDailyQuote = (): Quote => {
  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return QUOTES[dayOfYear % QUOTES.length];
};

// Obtenir une citation par index
export const getQuoteByIndex = (index: number): Quote => {
  return QUOTES[index % QUOTES.length];
};

export default QUOTES;
