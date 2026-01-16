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
    icon: '',
    iconComponent: Flame,
    description: 'Depassement de soi',
  },
  {
    id: 'discipline',
    label: 'Discipline',
    labelJp: '規律',
    icon: '',
    iconComponent: Dumbbell,
    description: 'Travail et rigueur',
  },
  {
    id: 'mental',
    label: 'Force mentale',
    labelJp: '精神力',
    icon: '',
    iconComponent: Shield,
    description: 'Mindset de champion',
  },
  {
    id: 'warrior',
    label: 'Athlète',
    labelJp: '戦士',
    icon: '',
    iconComponent: Swords,
    description: 'Esprit combattant',
  },
  {
    id: 'perseverance',
    label: 'Perseverance',
    labelJp: '忍耐',
    icon: '',
    iconComponent: Target,
    description: 'Ne jamais abandonner',
  },
  {
    id: 'all',
    label: 'Toutes',
    labelJp: '全部',
    icon: '',
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
  { text: "Si ca ne te defie pas, ca ne te change pas.", category: 'motivation' },
  { text: "Reve grand. Travaille dur. Reste humble.", category: 'motivation' },
  { text: "Les grands reves commencent par de petites actions.", category: 'motivation' },
  { text: "Tu es capable de bien plus que ce que tu penses.", category: 'motivation' },
  { text: "Chaque jour est une nouvelle chance de devenir meilleur.", category: 'motivation' },
  { text: "Ne laisse pas hier prendre trop de place dans ton aujourd'hui.", category: 'motivation' },
  { text: "La seule limite est celle que tu te fixes.", category: 'motivation' },
  { text: "Fais-le avec passion ou pas du tout.", category: 'motivation' },
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
  { text: "La constance bat le talent.", category: 'discipline' },
  { text: "Fais aujourd'hui ce que les autres ne veulent pas faire pour avoir demain ce qu'ils n'auront jamais.", category: 'discipline' },
  { text: "Les champions sont faits quand personne ne regarde.", category: 'discipline' },
  { text: "La routine bat l'exception tous les jours.", category: 'discipline' },
  { text: "Celui qui maitrise la discipline maitrise sa vie.", category: 'discipline' },
  { text: "Le secret du succes: fais-le meme quand tu n'en as pas envie.", category: 'discipline' },
  { text: "La discipline est le pont entre tes objectifs et tes accomplissements.", category: 'discipline' },
  { text: "Pas de progres sans discipline. Pas de discipline sans sacrifice.", category: 'discipline' },
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
  { text: "Ton mental est ton arme la plus puissante.", category: 'mental' },
  { text: "La force ne vient pas du corps. Elle vient de la volonte.", category: 'mental' },
  { text: "Si tu penses que tu peux ou que tu ne peux pas, tu as raison.", category: 'mental' },
  { text: "Le succes commence dans ta tete avant de se voir dans ton corps.", category: 'mental' },
  { text: "Tes pensees deviennent ta realite. Choisis-les bien.", category: 'mental' },
  { text: "Un esprit faible trouvera mille excuses. Un esprit fort trouvera mille solutions.", category: 'mental' },
  { text: "La zone de confort est un bel endroit, mais rien n'y pousse.", category: 'mental' },
  { text: "L'echec n'existe que si tu abandonnes.", category: 'mental' },
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
  { text: "Les guerriers ne sont pas nes, ils sont forges.", category: 'warrior' },
  { text: "Un athlete ne compte pas ses repetitions. Il commence a compter quand ca devient dur.", category: 'warrior' },
  { text: "La sueur est la preuve que tu n'as pas abandonne.", category: 'warrior' },
  { text: "Le terrain de jeu ne pardonne pas la faiblesse.", category: 'warrior' },
  { text: "Tu joues comme tu t'entraines. Entraine-toi comme un champion.", category: 'warrior' },
  { text: "Les legendes ne naissent pas. Elles se construisent repetition apres repetition.", category: 'warrior' },
  { text: "Le veritable combat commence quand ton corps dit stop mais ton esprit dit continue.", category: 'warrior' },
  { text: "Chaque goutte de sueur te rapproche de la victoire.", category: 'warrior' },
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
  { text: "La persistance bat la resistance.", category: 'perseverance' },
  { text: "Ce qui compte, ce n'est pas combien de fois tu tombes, mais combien de fois tu te releves.", category: 'perseverance' },
  { text: "Rome ne s'est pas construite en un jour, mais chaque jour ils posaient une brique.", category: 'perseverance' },
  { text: "Le marathon se court pas a pas. Concentre-toi sur le prochain pas.", category: 'perseverance' },
  { text: "Les rivières creusent les rochers non par leur force, mais par leur perseverance.", category: 'perseverance' },
  { text: "Chaque expert a un jour ete un debutant perseverant.", category: 'perseverance' },
  { text: "La reussite appartient a ceux qui continuent quand tout le monde a abandonne.", category: 'perseverance' },
  { text: "Petit a petit, l'oiseau fait son nid. Continue d'avancer.", category: 'perseverance' },
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
const SESSION_CITATION_KEY = '@yoroi_sessionCitation';
const SESSION_ID_KEY = '@yoroi_sessionId';
const CITATION_NOTIF_ENABLED_KEY = '@yoroi_citation_notif_enabled';
const CITATION_NOTIF_FREQUENCY_KEY = '@yoroi_citation_notif_frequency';
const CITATION_NOTIF_TIME_KEY = '@yoroi_citation_notif_time';

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

// ═══════════════════════════════════════════════
// CITATION DE SESSION (change à chaque ouverture)
// ═══════════════════════════════════════════════

/**
 * Génère un ID de session unique
 */
const generateSessionId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

/**
 * Obtient une nouvelle citation pour cette session d'app
 * Change à chaque ouverture de l'application
 */
export const getSessionQuote = async (): Promise<Citation> => {
  try {
    const style = await getCitationStyle();
    const citation = getRandomQuote(style);

    // Sauvegarder pour cette session
    await AsyncStorage.setItem(SESSION_CITATION_KEY, JSON.stringify(citation));
    await AsyncStorage.setItem(SESSION_ID_KEY, generateSessionId());

    return citation;
  } catch (error) {
    logger.error('Erreur citation session:', error);
    return getRandomQuote('all');
  }
};

// ═══════════════════════════════════════════════
// NOTIFICATIONS DE CITATIONS
// ═══════════════════════════════════════════════

export interface CitationNotifSettings {
  enabled: boolean;
  frequency: number; // Nombre de notifications par jour (1, 2, 3, etc.)
  time: string; // Heure préférée HH:MM
}

/**
 * Récupère les paramètres de notification des citations
 */
export const getCitationNotifSettings = async (): Promise<CitationNotifSettings> => {
  try {
    const enabled = await AsyncStorage.getItem(CITATION_NOTIF_ENABLED_KEY);
    const frequency = await AsyncStorage.getItem(CITATION_NOTIF_FREQUENCY_KEY);
    const time = await AsyncStorage.getItem(CITATION_NOTIF_TIME_KEY);

    return {
      enabled: enabled !== null ? enabled === 'true' : true, // ACTIVÉ par défaut - 2 citations/jour
      frequency: frequency ? parseInt(frequency, 10) : 2, // 2×/jour par défaut (matin et soir)
      time: time || '08:00',
    };
  } catch (error) {
    logger.error('Erreur lecture paramètres notif citations:', error);
    return { enabled: true, frequency: 2, time: '08:00' }; // ACTIVÉ par défaut - 2×/jour
  }
};

/**
 * Sauvegarde les paramètres de notification des citations
 */
export const setCitationNotifSettings = async (settings: CitationNotifSettings): Promise<void> => {
  try {
    await AsyncStorage.setItem(CITATION_NOTIF_ENABLED_KEY, settings.enabled.toString());
    await AsyncStorage.setItem(CITATION_NOTIF_FREQUENCY_KEY, settings.frequency.toString());
    await AsyncStorage.setItem(CITATION_NOTIF_TIME_KEY, settings.time);
  } catch (error) {
    logger.error('Erreur sauvegarde paramètres notif citations:', error);
  }
};

/**
 * Active/désactive les notifications de citations
 */
export const setCitationNotifEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(CITATION_NOTIF_ENABLED_KEY, enabled.toString());
  } catch (error) {
    logger.error('Erreur activation notif citations:', error);
  }
};

/**
 * Définit la fréquence des notifications (nombre par jour)
 */
export const setCitationNotifFrequency = async (frequency: number): Promise<void> => {
  try {
    await AsyncStorage.setItem(CITATION_NOTIF_FREQUENCY_KEY, frequency.toString());
  } catch (error) {
    logger.error('Erreur fréquence notif citations:', error);
  }
};

export default {
  getCitationStyle,
  setCitationStyle,
  getRandomQuote,
  getDailyQuote,
  getDailyQuoteByStyle,
  getDailyQuoteText,
  forceNewCitation,
  getSessionQuote,
  getCitationNotifSettings,
  setCitationNotifSettings,
  setCitationNotifEnabled,
  setCitationNotifFrequency,
  ALL_QUOTES,
  QUOTES_BY_CATEGORY,
  CITATION_STYLE_OPTIONS,
};
