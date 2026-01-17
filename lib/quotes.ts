// ============================================
// YOROI - CITATIONS MOTIVANTES DU GUERRIER
// ============================================
// Multi-language warrior quotes with author attribution

import { SupportedLanguage } from './citations';

export interface Quote {
  text: string;
  author: string;
}

// ═══════════════════════════════════════════════
// FRENCH QUOTES
// ═══════════════════════════════════════════════

const QUOTES_FR: Quote[] = [
  { text: "Le champion victorieux gagne d'abord, puis va à la guerre.", author: "Sun Tzu" },
  { text: "Tombe sept fois, relève-toi huit.", author: "Proverbe japonais" },
  { text: "La discipline est le pont entre les objectifs et l'accomplissement.", author: "Jim Rohn" },
  { text: "Un samouraï doit avant tout garder à l'esprit qu'il doit mourir.", author: "Bushido" },
  { text: "Ce n'est pas la montagne que nous conquérons, mais nous-mêmes.", author: "Edmund Hillary" },
  { text: "La douleur d'aujourd'hui est la force de demain.", author: "Anonyme" },
  { text: "Chaque bataille est gagnée avant même d'être livrée.", author: "Sun Tzu" },
  { text: "Le corps atteint ce que l'esprit croit.", author: "Anonyme" },
  { text: "Sois comme l'eau, mon ami.", author: "Bruce Lee" },
  { text: "La seule mauvaise séance est celle qui n'a pas eu lieu.", author: "Anonyme" },
  { text: "Tu ne perds jamais. Soit tu gagnes, soit tu apprends.", author: "Nelson Mandela" },
  { text: "Le temps passera de toute façon. Autant l'utiliser.", author: "Earl Nightingale" },
  { text: "Connais-toi toi-même.", author: "Socrate" },
  { text: "La victoire appartient au plus persévérant.", author: "Napoléon Bonaparte" },
  { text: "Ce qui ne te tue pas te rend plus fort.", author: "Friedrich Nietzsche" },
  { text: "Le meilleur moment pour planter un arbre était il y a 20 ans. Le deuxième meilleur moment est maintenant.", author: "Proverbe chinois" },
  { text: "La sueur d'aujourd'hui est le succès de demain.", author: "Anonyme" },
  { text: "Un voyage de mille lieues commence par un seul pas.", author: "Lao Tseu" },
  { text: "Le doute tue plus de rêves que l'échec.", author: "Suzy Kassem" },
  { text: "Ne prie pas pour une vie facile. Prie pour avoir la force d'en vivre une difficile.", author: "Bruce Lee" },
];

// ═══════════════════════════════════════════════
// ENGLISH QUOTES
// ═══════════════════════════════════════════════

const QUOTES_EN: Quote[] = [
  { text: "The victorious warrior wins first, then goes to war.", author: "Sun Tzu" },
  { text: "Fall seven times, stand up eight.", author: "Japanese Proverb" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "A samurai must first keep in mind that he must die.", author: "Bushido" },
  { text: "It is not the mountain we conquer, but ourselves.", author: "Edmund Hillary" },
  { text: "Today's pain is tomorrow's strength.", author: "Anonymous" },
  { text: "Every battle is won before it is fought.", author: "Sun Tzu" },
  { text: "The body achieves what the mind believes.", author: "Anonymous" },
  { text: "Be water, my friend.", author: "Bruce Lee" },
  { text: "The only bad workout is the one that didn't happen.", author: "Anonymous" },
  { text: "You never lose. Either you win or you learn.", author: "Nelson Mandela" },
  { text: "Time will pass anyway. Might as well use it.", author: "Earl Nightingale" },
  { text: "Know thyself.", author: "Socrates" },
  { text: "Victory belongs to the most persevering.", author: "Napoleon Bonaparte" },
  { text: "What doesn't kill you makes you stronger.", author: "Friedrich Nietzsche" },
  { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
  { text: "Today's sweat is tomorrow's success.", author: "Anonymous" },
  { text: "A journey of a thousand miles begins with a single step.", author: "Lao Tzu" },
  { text: "Doubt kills more dreams than failure ever will.", author: "Suzy Kassem" },
  { text: "Don't pray for an easy life. Pray for the strength to endure a hard one.", author: "Bruce Lee" },
];

// ═══════════════════════════════════════════════
// SPANISH QUOTES
// ═══════════════════════════════════════════════

const QUOTES_ES: Quote[] = [
  { text: "El guerrero victorioso gana primero, luego va a la guerra.", author: "Sun Tzu" },
  { text: "Cae siete veces, levántate ocho.", author: "Proverbio japonés" },
  { text: "La disciplina es el puente entre las metas y los logros.", author: "Jim Rohn" },
  { text: "Un samurái debe tener siempre presente que debe morir.", author: "Bushido" },
  { text: "No es la montaña lo que conquistamos, sino a nosotros mismos.", author: "Edmund Hillary" },
  { text: "El dolor de hoy es la fuerza de mañana.", author: "Anónimo" },
  { text: "Cada batalla se gana antes de librarse.", author: "Sun Tzu" },
  { text: "El cuerpo logra lo que la mente cree.", author: "Anónimo" },
  { text: "Sé como el agua, amigo mío.", author: "Bruce Lee" },
  { text: "El único mal entrenamiento es el que no se hizo.", author: "Anónimo" },
  { text: "Nunca pierdes. O ganas o aprendes.", author: "Nelson Mandela" },
  { text: "El tiempo pasará de todos modos. Mejor úsalo.", author: "Earl Nightingale" },
  { text: "Conócete a ti mismo.", author: "Sócrates" },
  { text: "La victoria pertenece al más perseverante.", author: "Napoleón Bonaparte" },
  { text: "Lo que no te mata te hace más fuerte.", author: "Friedrich Nietzsche" },
  { text: "El mejor momento para plantar un árbol fue hace 20 años. El segundo mejor momento es ahora.", author: "Proverbio chino" },
  { text: "El sudor de hoy es el éxito de mañana.", author: "Anónimo" },
  { text: "Un viaje de mil leguas comienza con un solo paso.", author: "Lao Tsé" },
  { text: "La duda mata más sueños que el fracaso.", author: "Suzy Kassem" },
  { text: "No reces por una vida fácil. Reza por la fuerza para soportar una difícil.", author: "Bruce Lee" },
];

// ═══════════════════════════════════════════════
// GERMAN QUOTES
// ═══════════════════════════════════════════════

const QUOTES_DE: Quote[] = [
  { text: "Der siegreiche Krieger gewinnt zuerst, dann zieht er in den Krieg.", author: "Sun Tzu" },
  { text: "Falle siebenmal, stehe achtmal auf.", author: "Japanisches Sprichwort" },
  { text: "Disziplin ist die Brücke zwischen Zielen und Erfolg.", author: "Jim Rohn" },
  { text: "Ein Samurai muss immer bedenken, dass er sterben muss.", author: "Bushido" },
  { text: "Es ist nicht der Berg, den wir bezwingen, sondern uns selbst.", author: "Edmund Hillary" },
  { text: "Der Schmerz von heute ist die Stärke von morgen.", author: "Anonym" },
  { text: "Jede Schlacht wird gewonnen, bevor sie geschlagen wird.", author: "Sun Tzu" },
  { text: "Der Körper erreicht, was der Geist glaubt.", author: "Anonym" },
  { text: "Sei wie Wasser, mein Freund.", author: "Bruce Lee" },
  { text: "Das einzige schlechte Training ist das, das nicht stattfand.", author: "Anonym" },
  { text: "Du verlierst nie. Entweder gewinnst du oder du lernst.", author: "Nelson Mandela" },
  { text: "Die Zeit vergeht sowieso. Nutze sie lieber.", author: "Earl Nightingale" },
  { text: "Erkenne dich selbst.", author: "Sokrates" },
  { text: "Der Sieg gehört dem Ausdauerndsten.", author: "Napoleon Bonaparte" },
  { text: "Was dich nicht umbringt, macht dich stärker.", author: "Friedrich Nietzsche" },
  { text: "Der beste Zeitpunkt, einen Baum zu pflanzen, war vor 20 Jahren. Der zweitbeste ist jetzt.", author: "Chinesisches Sprichwort" },
  { text: "Der Schweiß von heute ist der Erfolg von morgen.", author: "Anonym" },
  { text: "Eine Reise von tausend Meilen beginnt mit einem einzigen Schritt.", author: "Laotse" },
  { text: "Zweifel töten mehr Träume als das Scheitern.", author: "Suzy Kassem" },
  { text: "Bete nicht für ein einfaches Leben. Bete um die Kraft, ein schweres zu ertragen.", author: "Bruce Lee" },
];

// ═══════════════════════════════════════════════
// QUOTES BY LANGUAGE
// ═══════════════════════════════════════════════

const QUOTES_BY_LANGUAGE: Record<SupportedLanguage, Quote[]> = {
  fr: QUOTES_FR,
  en: QUOTES_EN,
  es: QUOTES_ES,
  de: QUOTES_DE,
  it: QUOTES_EN, // Fallback to English
  pt: QUOTES_ES, // Fallback to Spanish (similar language)
  ru: QUOTES_EN, // Fallback to English
  ar: QUOTES_EN, // Fallback to English
  zh: QUOTES_EN, // Fallback to English
};

// For backward compatibility
export const QUOTES = QUOTES_FR;

// ═══════════════════════════════════════════════
// FUNCTIONS
// ═══════════════════════════════════════════════

// Obtenir une citation aléatoire
export const getRandomQuote = (language: SupportedLanguage = 'fr'): Quote => {
  const quotes = QUOTES_BY_LANGUAGE[language] || QUOTES_FR;
  return quotes[Math.floor(Math.random() * quotes.length)];
};

// Obtenir la citation du jour (basée sur le jour de l'année)
export const getDailyQuote = (language: SupportedLanguage = 'fr'): Quote => {
  const quotes = QUOTES_BY_LANGUAGE[language] || QUOTES_FR;
  const startOfYear = new Date(new Date().getFullYear(), 0, 0);
  const diff = Date.now() - startOfYear.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return quotes[dayOfYear % quotes.length];
};

// Obtenir une citation par index
export const getQuoteByIndex = (index: number, language: SupportedLanguage = 'fr'): Quote => {
  const quotes = QUOTES_BY_LANGUAGE[language] || QUOTES_FR;
  return quotes[index % quotes.length];
};

export default QUOTES;
