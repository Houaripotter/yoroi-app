// ============================================
// YOROI - CITATIONS DE MOTIVATION PURE
// ============================================
// Multi-language motivational quotes
// 100% Offline - Stockage AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Flame, Dumbbell, Shield, Swords, Target, Sparkles, type LucideIcon } from 'lucide-react-native';
import logger from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

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
    description: traduire('Dépassement de soi'),
  },
  {
    id: 'discipline',
    label: 'Discipline',
    labelJp: '規律',
    icon: '',
    iconComponent: Dumbbell,
    description: traduire('Travail et rigueur'),
  },
  {
    id: 'mental',
    label: 'Force mentale',
    labelJp: '精神力',
    icon: '',
    iconComponent: Shield,
    description: 'Mental de champion',
  },
  {
    id: 'warrior',
    label: traduire('Athlète'),
    labelJp: '戦士',
    icon: '',
    iconComponent: Swords,
    description: 'Esprit combattant',
  },
  {
    id: 'perseverance',
    label: traduire('Persévérance'),
    labelJp: '忍耐',
    icon: '',
    iconComponent: Target,
    description: traduire('Ne jamais abandonner'),
  },
  {
    id: 'all',
    label: traduire('Toutes'),
    labelJp: '全部',
    icon: '',
    iconComponent: Sparkles,
    description: 'Mélange aléatoire',
  },
];

// ═══════════════════════════════════════════════
// CITATIONS - MOTIVATION & DÉPASSEMENT
// ═══════════════════════════════════════════════

const MOTIVATION_QUOTES: Citation[] = [
  { text: traduire("La douleur est temporaire. Abandonner est définitif."), category: 'motivation' },
  { text: traduire("Tu ne sauras jamais jusqu'où tu peux aller si tu n'essaies pas."), category: 'motivation' },
  { text: traduire("Ce n'est pas la taille du chien dans le combat, c'est la taille du combat dans le chien."), category: 'motivation' },
  { text: traduire("Quand tu veux abandonner, rappelle-toi pourquoi tu as commencé."), category: 'motivation' },
  { text: traduire("Le succès, c'est tomber 7 fois et se relever 8."), category: 'motivation' },
  { text: traduire("Ton seul adversaire, c'est toi-même."), category: 'motivation' },
  { text: traduire("Les excuses ne brûlent pas de calories."), category: 'motivation' },
  { text: traduire("Soit tu trouves un chemin, soit tu en crées un."), category: 'motivation' },
  { text: traduire("Le corps abandonne bien avant l'esprit. Force ton esprit."), category: 'motivation' },
  { text: traduire("Chaque champion a un jour été un débutant qui n'a pas abandonné."), category: 'motivation' },
  { text: traduire("Le meilleur moment pour commencer était hier. Le deuxième meilleur moment, c'est maintenant."), category: 'motivation' },
  { text: traduire("Ta seule compétition, c'est la personne que tu étais hier."), category: 'motivation' },
  { text: traduire("Si ça ne te défie pas, ça ne te change pas."), category: 'motivation' },
  { text: traduire("Rêve grand. Travaille dur. Reste humble."), category: 'motivation' },
  { text: traduire("Les grands rêves commencent par de petites actions."), category: 'motivation' },
  { text: traduire("Tu es capable de bien plus que ce que tu penses."), category: 'motivation' },
  { text: traduire("Chaque jour est une nouvelle chance de devenir meilleur."), category: 'motivation' },
  { text: traduire("Ne laisse pas hier prendre trop de place dans ton aujourd'hui."), category: 'motivation' },
  { text: traduire("La seule limite est celle que tu te fixes."), category: 'motivation' },
  { text: traduire("Fais-le avec passion ou pas du tout."), category: 'motivation' },
];

// ═══════════════════════════════════════════════
// CITATIONS - TRAVAIL & DISCIPLINE
// ═══════════════════════════════════════════════

const DISCIPLINE_QUOTES: Citation[] = [
  { text: traduire("Le talent, c'est 1 %. Le travail, c'est 99 %."), category: 'discipline' },
  { text: traduire("Pendant que tu dors, quelqu'un s'entraîne."), category: 'discipline' },
  { text: traduire("La discipline fait ce que la motivation ne peut pas."), category: 'discipline' },
  { text: traduire("Pas d'excuses. Pas de raccourcis. Pas de limites."), category: 'discipline' },
  { text: traduire("Le travail bat le talent quand le talent ne travaille pas."), category: 'discipline' },
  { text: traduire("Ce que tu fais quand personne ne regarde définit qui tu es."), category: 'discipline' },
  { text: traduire("Un jour ou jour un. C'est toi qui décides."), category: 'discipline' },
  { text: traduire("La sueur d'aujourd'hui, c'est le sourire de demain."), category: 'discipline' },
  { text: traduire("Tu ne regrettes jamais un entraînement. Tu regrettes celui que tu as raté."), category: 'discipline' },
  { text: traduire("Fais-le maintenant. Ton futur toi te remerciera."), category: 'discipline' },
  { text: traduire("Le succès n'est pas donné. Il se mérite."), category: 'discipline' },
  { text: traduire("Chaque répétition compte. Chaque effort compte."), category: 'discipline' },
  { text: traduire("La constance bat le talent."), category: 'discipline' },
  { text: traduire("Fais aujourd'hui ce que les autres ne veulent pas faire pour avoir demain ce qu'ils n'auront jamais."), category: 'discipline' },
  { text: traduire("Les champions sont faits quand personne ne regarde."), category: 'discipline' },
  { text: traduire("La routine bat l'exception tous les jours."), category: 'discipline' },
  { text: traduire("Celui qui maîtrise la discipline maîtrise sa vie."), category: 'discipline' },
  { text: traduire("Le secret du succès : fais-le même quand tu n'en as pas envie."), category: 'discipline' },
  { text: traduire("La discipline est le pont entre tes objectifs et tes accomplissements."), category: 'discipline' },
  { text: traduire("Pas de progrès sans discipline. Pas de discipline sans sacrifice."), category: 'discipline' },
];

// ═══════════════════════════════════════════════
// CITATIONS - FORCE MENTALE
// ═══════════════════════════════════════════════

const MENTAL_QUOTES: Citation[] = [
  { text: traduire("Ta seule limite, c'est toi."), category: 'mental' },
  { text: traduire("Fais taire la voix qui dit que tu ne peux pas."), category: 'mental' },
  { text: traduire("Ils ne croyaient pas en moi. Maintenant ils me regardent."), category: 'mental' },
  { text: traduire("La peur tue plus de rêves que l'échec."), category: 'mental' },
  { text: traduire("Deviens la personne que tu aurais aimé avoir comme modèle."), category: 'mental' },
  { text: traduire("Le confort est l'ennemi du progrès."), category: 'mental' },
  { text: traduire("Souffre maintenant et vis le reste de ta vie en champion."), category: 'mental' },
  { text: traduire("Ce qui ne te tue pas te rend plus fort."), category: 'mental' },
  { text: traduire("Le doute tue plus de rêves que l'échec."), category: 'mental' },
  { text: traduire("Transforme ta douleur en puissance."), category: 'mental' },
  { text: traduire("L'esprit dirige, le corps suit."), category: 'mental' },
  { text: traduire("Crois en toi plus fort que tes doutes."), category: 'mental' },
  { text: traduire("Ton mental est ton arme la plus puissante."), category: 'mental' },
  { text: traduire("La force ne vient pas du corps. Elle vient de la volonté."), category: 'mental' },
  { text: traduire("Si tu penses que tu peux ou que tu ne peux pas, tu as raison."), category: 'mental' },
  { text: traduire("Le succès commence dans ta tête avant de se voir dans ton corps."), category: 'mental' },
  { text: traduire("Tes pensées deviennent ta réalité. Choisis-les bien."), category: 'mental' },
  { text: traduire("Un esprit faible trouvera mille excuses. Un esprit fort trouvera mille solutions."), category: 'mental' },
  { text: traduire("La zone de confort est un bel endroit, mais rien n'y pousse."), category: 'mental' },
  { text: traduire("L'échec n'existe que si tu abandonnes."), category: 'mental' },
];

// ═══════════════════════════════════════════════
// CITATIONS - GUERRIER / COMBAT
// ═══════════════════════════════════════════════

const WARRIOR_QUOTES: Citation[] = [
  { text: traduire("Un champion ne s'entraîne pas pour le combat. Il s'entraîne pour ne jamais perdre."), category: 'warrior' },
  { text: traduire("Le combat n'est pas contre les autres. C'est contre toi-même."), category: 'warrior' },
  { text: traduire("Chaque jour est un combat. Sois prêt."), category: 'warrior' },
  { text: traduire("Un vrai champion se relève une fois de plus qu'il ne tombe."), category: 'warrior' },
  { text: traduire("Ne prie pas pour une vie facile. Prie pour avoir la force d'en affronter une difficile."), category: 'warrior' },
  { text: traduire("Le ring ne ment jamais."), category: 'warrior' },
  { text: traduire("Entraîne-toi comme si tu étais le deuxième. Combats comme si tu étais le premier."), category: 'warrior' },
  { text: traduire("La victoire aime la préparation."), category: 'warrior' },
  { text: traduire("Montre-leur pourquoi ils auraient dû croire en toi."), category: 'warrior' },
  { text: traduire("Sois le champion, pas le spectateur."), category: 'warrior' },
  { text: traduire("Un champion tombe, mais il ne reste jamais à terre."), category: 'warrior' },
  { text: traduire("Dans l'arène, il n'y a que toi et ton courage."), category: 'warrior' },
  { text: traduire("Les guerriers ne sont pas nés, ils sont forgés."), category: 'warrior' },
  { text: traduire("Un athlète ne compte pas ses répétitions. Il commence à compter quand ça devient dur."), category: 'warrior' },
  { text: traduire("La sueur est la preuve que tu n'as pas abandonné."), category: 'warrior' },
  { text: traduire("Le terrain de jeu ne pardonne pas la faiblesse."), category: 'warrior' },
  { text: traduire("Tu joues comme tu t'entraînes. Entraîne-toi comme un champion."), category: 'warrior' },
  { text: traduire("Les légendes ne naissent pas. Elles se construisent répétition après répétition."), category: 'warrior' },
  { text: traduire("Le véritable combat commence quand ton corps dit stop mais ton esprit dit continue."), category: 'warrior' },
  { text: traduire("Chaque goutte de sueur te rapproche de la victoire."), category: 'warrior' },
];

// ═══════════════════════════════════════════════
// CITATIONS - PERSÉVÉRANCE
// ═══════════════════════════════════════════════

const PERSEVERANCE_QUOTES: Citation[] = [
  { text: traduire("Ce n'est pas fini tant que tu n'as pas gagné."), category: 'perseverance' },
  { text: traduire("Les champions continuent quand ils ne peuvent plus continuer."), category: 'perseverance' },
  { text: traduire("La seule mauvaise séance est celle qui n'a pas eu lieu."), category: 'perseverance' },
  { text: traduire("Tu es plus fort que tu ne le penses."), category: 'perseverance' },
  { text: traduire("Celui qui sue plus à l'entraînement saigne moins au combat."), category: 'perseverance' },
  { text: traduire("N'abandonne jamais un rêve à cause du temps qu'il faudra. Le temps passera de toute façon."), category: 'perseverance' },
  { text: traduire("La différence entre essayer et réussir, c'est continuer."), category: 'perseverance' },
  { text: traduire("Quand c'est dur, c'est là que tu progresses."), category: 'perseverance' },
  { text: traduire("Les résultats arrivent avec le temps, pas demain."), category: 'perseverance' },
  { text: traduire("Continue même quand tu as envie d'arrêter. C'est là que tout change."), category: 'perseverance' },
  { text: traduire("Chaque pas te rapproche de ton objectif."), category: 'perseverance' },
  { text: traduire("Le succès est la somme de petits efforts répétés jour après jour."), category: 'perseverance' },
  { text: traduire("La persistance bat la résistance."), category: 'perseverance' },
  { text: traduire("Ce qui compte, ce n'est pas combien de fois tu tombes, mais combien de fois tu te relèves."), category: 'perseverance' },
  { text: traduire("Rome ne s'est pas construite en un jour, mais chaque jour ils posaient une brique."), category: 'perseverance' },
  { text: traduire("Le marathon se court pas à pas. Concentre-toi sur le prochain pas."), category: 'perseverance' },
  { text: traduire("Les rivières creusent les rochers non par leur force, mais par leur persévérance."), category: 'perseverance' },
  { text: traduire("Chaque expert a un jour été un débutant persévérant."), category: 'perseverance' },
  { text: traduire("La réussite appartient à ceux qui continuent quand tout le monde a abandonné."), category: 'perseverance' },
  { text: traduire("Petit à petit, l'oiseau fait son nid. Continue d'avancer."), category: 'perseverance' },
];

// ═══════════════════════════════════════════════

// TOUTES LES CITATIONS (FRENCH - DEFAULT)
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
 * Obtient une citation aleatoire selon le style et la langue
 */
export const getRandomQuote = (style: CitationStyle = 'all'): Citation => {
  const allQuotes = ALL_QUOTES;
  // Filter by category if not 'all'
  const quotes = style === 'all' ? allQuotes : allQuotes.filter(q => q.category === style);
  const index = Math.floor(Math.random() * quotes.length);
  return quotes[index] || allQuotes[0];
};

/**
 * Obtient la citation du jour (deterministe basee sur la date)
 * Change chaque jour mais reste la meme toute la journee
 */
export const getDailyQuote = async (): Promise<Citation> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = LAST_CITATION_DATE_KEY;
    const citationKey = LAST_CITATION_KEY;
    const lastDate = await AsyncStorage.getItem(cacheKey);
    const style = await getCitationStyle();

    // Si meme jour, retourner la citation stockee
    if (lastDate === today) {
      const stored = await AsyncStorage.getItem(citationKey);
      if (stored) {
        return JSON.parse(stored);
      }
    }

    // Nouveau jour = nouvelle citation (deterministe)
    const allQuotes = ALL_QUOTES;
    const quotes = style === 'all' ? allQuotes : allQuotes.filter(q => q.category === style);
    const dayHash = hashDate(today);
    const index = dayHash % quotes.length;
    const citation = quotes[index] || allQuotes[0];

    // Sauvegarder
    await AsyncStorage.setItem(cacheKey, today);
    await AsyncStorage.setItem(citationKey, JSON.stringify(citation));

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
  const allQuotes = ALL_QUOTES;
  const quotes = style === 'all' ? allQuotes : allQuotes.filter(q => q.category === style);
  const today = new Date();
  const dayOfYear = Math.floor(
    (today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24)
  );
  const index = dayOfYear % quotes.length;
  return quotes[index] || allQuotes[0];
};

/**
 * Force une nouvelle citation (ignore le cache du jour)
 */
export const forceNewCitation = async (): Promise<Citation> => {
  try {
    const style = await getCitationStyle();
    const citation = getRandomQuote(style);
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = LAST_CITATION_DATE_KEY;
    const citationKey = LAST_CITATION_KEY;

    await AsyncStorage.setItem(cacheKey, today);
    await AsyncStorage.setItem(citationKey, JSON.stringify(citation));

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
      enabled: enabled !== null ? enabled === 'true' : true, // ACTIVÉ par défaut
      frequency: 1, // FORCÉ: 1×/jour matin uniquement - ignorer la valeur sauvegardée
      time: time || '08:00',
    };
  } catch (error) {
    logger.error('Erreur lecture paramètres notif citations:', error);
    return { enabled: true, frequency: 1, time: '08:00' }; // ACTIVÉ par défaut - 1×/jour matin
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
