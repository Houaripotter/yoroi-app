// ============================================
// YOROI - CITATIONS DE MOTIVATION PURE
// ============================================
// Des citations qui poussent a se depasser
// 100% Offline - Stockage AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Flame, Dumbbell, Shield, Swords, Target, Sparkles, type LucideIcon } from 'lucide-react-native';
import logger from '@/lib/security/logger';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type CitationStyle = 'motivation' | 'discipline' | 'mental' | 'warrior' | 'perseverance' | 'all';

export interface Citation {
  text: string;
  category: CitationStyle;
}

export interface CitationStyleOption {
  id: CitationStyle;
  label: string;
  labelJp: string;
  icon: string;  // Gardé pour compatibilité
  iconComponent: LucideIcon;  // Nouveau: composant icône Lucide
  description: string;
}

// ═══════════════════════════════════════════════
// OPTIONS DE STYLE
// ═══════════════════════════════════════════════

export const CITATION_STYLE_OPTIONS: CitationStyleOption[] = [
  {
    id: 'motivation',
    label: 'Motivation',
    labelJp: '動機',
    icon: '🔥',  // Gardé pour compatibilité
    iconComponent: Flame,
    description: 'Depassement de soi',
  },
  {
    id: 'discipline',
    label: 'Discipline',
    labelJp: '規律',
    icon: '💪',  // Gardé pour compatibilité
    iconComponent: Dumbbell,
    description: 'Travail et rigueur',
  },
  {
    id: 'mental',
    label: 'Force mentale',
    labelJp: '精神力',
    icon: '🧠',  // Gardé pour compatibilité
    iconComponent: Shield,
    description: 'Mindset de champion',
  },
  {
    id: 'warrior',
    label: 'Athlète',
    labelJp: '戦士',
    icon: '⚔️',  // Gardé pour compatibilité
    iconComponent: Swords,
    description: 'Esprit combattant',
  },
  {
    id: 'perseverance',
    label: 'Perseverance',
    labelJp: '忍耐',
    icon: '🎯',  // Gardé pour compatibilité
    iconComponent: Target,
    description: 'Ne jamais abandonner',
  },
  {
    id: 'all',
    label: 'Toutes',
    labelJp: '全部',
    icon: '🎲',  // Gardé pour compatibilité
    iconComponent: Sparkles,
    description: 'Melange aleatoire',
  },
];

// ═══════════════════════════════════════════════
// CITATIONS - MOTIVATION & DÉPASSEMENT
// ═══════════════════════════════════════════════

const MOTIVATION_QUOTES: Citation[] = [
  { text: "La douleur est temporaire. Abandonner est definitif.", category: 'motivation' },
  { text: "Tu ne sauras jamais jusqu'ou tu peux aller si tu n'essaies pas.", category: 'motivation' },
  { text: "Ce n'est pas la taille du chien dans le combat, c'est la taille du combat dans le chien.", category: 'motivation' },
  { text: "Quand tu veux abandonner, rappelle-toi pourquoi tu as commence.", category: 'motivation' },
  { text: "Le succes, c'est tomber 7 fois et se relever 8.", category: 'motivation' },
  { text: "Ton seul adversaire, c'est toi-meme.", category: 'motivation' },
  { text: "Les excuses ne brulent pas de calories.", category: 'motivation' },
  { text: "Soit tu trouves un chemin, soit tu en crees un.", category: 'motivation' },
  { text: "Le corps abandonne bien avant l'esprit. Force ton esprit.", category: 'motivation' },
  { text: "Chaque champion a un jour ete un debutant qui n'a pas abandonne.", category: 'motivation' },
  { text: "Le meilleur moment pour commencer etait hier. Le deuxieme meilleur moment, c'est maintenant.", category: 'motivation' },
  { text: "Ta seule competition, c'est la personne que tu etais hier.", category: 'motivation' },
];

// ═══════════════════════════════════════════════
// CITATIONS - TRAVAIL & DISCIPLINE
// ═══════════════════════════════════════════════

const DISCIPLINE_QUOTES: Citation[] = [
  { text: "Le talent, c'est 1%. Le travail, c'est 99%.", category: 'discipline' },
  { text: "Pendant que tu dors, quelqu'un s'entraine.", category: 'discipline' },
  { text: "La discipline fait ce que la motivation ne peut pas.", category: 'discipline' },
  { text: "Pas d'excuses. Pas de raccourcis. Pas de limites.", category: 'discipline' },
  { text: "Le travail bat le talent quand le talent ne travaille pas.", category: 'discipline' },
  { text: "Ce que tu fais quand personne ne regarde definit qui tu es.", category: 'discipline' },
  { text: "Un jour ou jour un. C'est toi qui decides.", category: 'discipline' },
  { text: "La sueur d'aujourd'hui, c'est le sourire de demain.", category: 'discipline' },
  { text: "Tu ne regrettes jamais un entrainement. Tu regrettes celui que tu as rate.", category: 'discipline' },
  { text: "Fais-le maintenant. Ton futur toi te remerciera.", category: 'discipline' },
  { text: "Le succes n'est pas donne. Il se merite.", category: 'discipline' },
  { text: "Chaque repetition compte. Chaque effort compte.", category: 'discipline' },
];

// ═══════════════════════════════════════════════
// CITATIONS - FORCE MENTALE
// ═══════════════════════════════════════════════

const MENTAL_QUOTES: Citation[] = [
  { text: "Ta seule limite, c'est toi.", category: 'mental' },
  { text: "Fais taire la voix qui dit que tu ne peux pas.", category: 'mental' },
  { text: "Ils ne croyaient pas en moi. Maintenant ils me regardent.", category: 'mental' },
  { text: "La peur tue plus de reves que l'echec.", category: 'mental' },
  { text: "Deviens la personne que tu aurais aime avoir comme modele.", category: 'mental' },
  { text: "Le confort est l'ennemi du progres.", category: 'mental' },
  { text: "Souffre maintenant et vis le reste de ta vie en champion.", category: 'mental' },
  { text: "Ce qui ne te tue pas te rend plus fort.", category: 'mental' },
  { text: "Le doute tue plus de reves que l'echec.", category: 'mental' },
  { text: "Transforme ta douleur en puissance.", category: 'mental' },
  { text: "L'esprit dirige, le corps suit.", category: 'mental' },
  { text: "Crois en toi plus fort que tes doutes.", category: 'mental' },
];

// ═══════════════════════════════════════════════
// CITATIONS - GUERRIER / COMBAT
// ═══════════════════════════════════════════════

const WARRIOR_QUOTES: Citation[] = [
  { text: "Un champion ne s'entraine pas pour le combat. Il s'entraine pour ne jamais perdre.", category: 'warrior' },
  { text: "Le combat n'est pas contre les autres. C'est contre toi-meme.", category: 'warrior' },
  { text: "Chaque jour est un combat. Sois pret.", category: 'warrior' },
  { text: "Un vrai champion se releve une fois de plus qu'il ne tombe.", category: 'warrior' },
  { text: "Ne prie pas pour une vie facile. Prie pour avoir la force d'en affronter une difficile.", category: 'warrior' },
  { text: "Le ring ne ment jamais.", category: 'warrior' },
  { text: "Entraine-toi comme si tu etais le deuxieme. Combats comme si tu etais le premier.", category: 'warrior' },
  { text: "La victoire aime la preparation.", category: 'warrior' },
  { text: "Montre-leur pourquoi ils auraient du croire en toi.", category: 'warrior' },
  { text: "Sois le champion, pas le spectateur.", category: 'warrior' },
  { text: "Un champion tombe, mais il ne reste jamais a terre.", category: 'warrior' },
  { text: "Dans l'arene, il n'y a que toi et ton courage.", category: 'warrior' },
];

// ═══════════════════════════════════════════════
// CITATIONS - PERSÉVÉRANCE
// ═══════════════════════════════════════════════

const PERSEVERANCE_QUOTES: Citation[] = [
  { text: "Ce n'est pas fini tant que tu n'as pas gagne.", category: 'perseverance' },
  { text: "Les champions continuent quand ils ne peuvent plus continuer.", category: 'perseverance' },
  { text: "La seule mauvaise seance est celle qui n'a pas eu lieu.", category: 'perseverance' },
  { text: "Tu es plus fort que tu ne le penses.", category: 'perseverance' },
  { text: "Celui qui sue plus a l'entrainement saigne moins au combat.", category: 'perseverance' },
  { text: "N'abandonne jamais un reve a cause du temps qu'il faudra. Le temps passera de toute facon.", category: 'perseverance' },
  { text: "La difference entre essayer et reussir, c'est continuer.", category: 'perseverance' },
  { text: "Quand c'est dur, c'est la que tu progresses.", category: 'perseverance' },
  { text: "Les resultats arrivent avec le temps, pas demain.", category: 'perseverance' },
  { text: "Continue meme quand tu as envie d'arreter. C'est la que tout change.", category: 'perseverance' },
  { text: "Chaque pas te rapproche de ton objectif.", category: 'perseverance' },
  { text: "Le succes est la somme de petits efforts repetes jour apres jour.", category: 'perseverance' },
];

// ═══════════════════════════════════════════════
// TOUTES LES CITATIONS
// ═══════════════════════════════════════════════

export const ALL_QUOTES: Citation[] = [
  ...MOTIVATION_QUOTES,
  ...DISCIPLINE_QUOTES,
  ...MENTAL_QUOTES,
  ...WARRIOR_QUOTES,
  ...PERSEVERANCE_QUOTES,
];

export const QUOTES_BY_CATEGORY: Record<CitationStyle, Citation[]> = {
  motivation: MOTIVATION_QUOTES,
  discipline: DISCIPLINE_QUOTES,
  mental: MENTAL_QUOTES,
  warrior: WARRIOR_QUOTES,
  perseverance: PERSEVERANCE_QUOTES,
  all: ALL_QUOTES,
};

// ═══════════════════════════════════════════════
// STORAGE KEYS
// ═══════════════════════════════════════════════

const CITATION_STYLE_KEY = '@yoroi_citationStyle';
const LAST_CITATION_KEY = '@yoroi_lastCitation';
const LAST_CITATION_DATE_KEY = '@yoroi_lastCitationDate';

// ═══════════════════════════════════════════════
// FONCTIONS - STYLE
// ═══════════════════════════════════════════════

/**
 * Recupere le style de citation stocke
 */
export const getCitationStyle = async (): Promise<CitationStyle> => {
  try {
    const style = await AsyncStorage.getItem(CITATION_STYLE_KEY);
    return (style as CitationStyle) || 'all';
  } catch (error) {
    logger.error('Erreur lecture style citation:', error);
    return 'all';
  }
};

/**
 * Sauvegarde le style de citation
 */
export const setCitationStyle = async (style: CitationStyle): Promise<void> => {
  try {
    await AsyncStorage.setItem(CITATION_STYLE_KEY, style);
    // Reset la citation du jour pour forcer le changement
    await AsyncStorage.removeItem(LAST_CITATION_DATE_KEY);
  } catch (error) {
    logger.error('Erreur sauvegarde style citation:', error);
  }
};

// ═══════════════════════════════════════════════
// FONCTIONS - CITATIONS
// ═══════════════════════════════════════════════

/**
 * Obtient une citation aleatoire selon le style
 */
export const getRandomQuote = (style: CitationStyle = 'all'): Citation => {
  const quotes = QUOTES_BY_CATEGORY[style] || ALL_QUOTES;
  const index = Math.floor(Math.random() * quotes.length);
  return quotes[index];
};

/**
 * Obtient la citation du jour (deterministe basee sur la date)
 * Change chaque jour mais reste la meme toute la journee
 */
export const getDailyQuote = async (): Promise<Citation> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const lastDate = await AsyncStorage.getItem(LAST_CITATION_DATE_KEY);
    const style = await getCitationStyle();

    // Si meme jour, retourner la citation stockee
    if (lastDate === today) {
      const stored = await AsyncStorage.getItem(LAST_CITATION_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    }

    // Nouveau jour = nouvelle citation (deterministe)
    const quotes = QUOTES_BY_CATEGORY[style] || ALL_QUOTES;
    const dayHash = hashDate(today);
    const index = dayHash % quotes.length;
    const citation = quotes[index];

    // Sauvegarder
    await AsyncStorage.setItem(LAST_CITATION_DATE_KEY, today);
    await AsyncStorage.setItem(LAST_CITATION_KEY, JSON.stringify(citation));

    return citation;
  } catch (error) {
    logger.error('Erreur citation du jour:', error);
    return getRandomQuote('all');
  }
};

/**
 * Hash simple pour avoir une citation deterministe par date
 */
const hashDate = (dateStr: string): number => {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
};

/**
 * Obtient la citation du jour selon un style (deterministe par date)
 */
export const getDailyQuoteByStyle = (style: CitationStyle = 'all'): Citation => {
  const quotes = QUOTES_BY_CATEGORY[style] || ALL_QUOTES;
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % quotes.length;
  return quotes[index];
};

/**
 * Force une nouvelle citation (ignore le cache du jour)
 */
export const forceNewCitation = async (): Promise<Citation> => {
  try {
    const style = await getCitationStyle();
    const citation = getRandomQuote(style);
    const today = new Date().toISOString().split('T')[0];

    await AsyncStorage.setItem(LAST_CITATION_DATE_KEY, today);
    await AsyncStorage.setItem(LAST_CITATION_KEY, JSON.stringify(citation));

    return citation;
  } catch (error) {
    logger.error('Erreur nouvelle citation:', error);
    return getRandomQuote('all');
  }
};

/**
 * Obtient juste le texte de la citation du jour (sans structure)
 */
export const getDailyQuoteText = async (): Promise<string> => {
  const citation = await getDailyQuote();
  return citation.text;
};

export default {
  getCitationStyle,
  setCitationStyle,
  getRandomQuote,
  getDailyQuote,
  getDailyQuoteByStyle,
  getDailyQuoteText,
  forceNewCitation,
  ALL_QUOTES,
  QUOTES_BY_CATEGORY,
  CITATION_STYLE_OPTIONS,
};
