// ============================================
// YOROI - CITATIONS DE MOTIVATION PURE
// ============================================
// Multi-language motivational quotes
// 100% Offline - Stockage AsyncStorage

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Flame, Dumbbell, Shield, Swords, Target, Sparkles, type LucideIcon } from 'lucide-react-native';
import logger from '@/lib/security/logger';

// ═══════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════

export type CitationStyle = 'motivation' | 'discipline' | 'mental' | 'warrior' | 'perseverance' | 'all';
export type SupportedLanguage = 'fr' | 'en' | 'es' | 'de' | 'it' | 'pt' | 'ru' | 'ar' | 'zh';

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
// ENGLISH QUOTES
// ═══════════════════════════════════════════════

const EN_MOTIVATION: Citation[] = [
  { text: "Pain is temporary. Quitting is forever.", category: 'motivation' },
  { text: "You'll never know how far you can go unless you try.", category: 'motivation' },
  { text: "It's not the size of the dog in the fight, it's the size of the fight in the dog.", category: 'motivation' },
  { text: "When you want to quit, remember why you started.", category: 'motivation' },
  { text: "Success is falling seven times and getting up eight.", category: 'motivation' },
  { text: "Your only opponent is yourself.", category: 'motivation' },
  { text: "Excuses don't burn calories.", category: 'motivation' },
  { text: "Either find a way or make one.", category: 'motivation' },
  { text: "The body quits long before the mind. Push your mind.", category: 'motivation' },
  { text: "Every champion was once a beginner who refused to give up.", category: 'motivation' },
  { text: "The best time to start was yesterday. The second best time is now.", category: 'motivation' },
  { text: "Your only competition is who you were yesterday.", category: 'motivation' },
  { text: "If it doesn't challenge you, it doesn't change you.", category: 'motivation' },
  { text: "Dream big. Work hard. Stay humble.", category: 'motivation' },
  { text: "Great dreams begin with small actions.", category: 'motivation' },
  { text: "You are capable of so much more than you think.", category: 'motivation' },
  { text: "Every day is a new chance to become better.", category: 'motivation' },
  { text: "Don't let yesterday take up too much of today.", category: 'motivation' },
  { text: "The only limit is the one you set for yourself.", category: 'motivation' },
  { text: "Do it with passion or not at all.", category: 'motivation' },
];

const EN_DISCIPLINE: Citation[] = [
  { text: "Talent is 1%. Hard work is 99%.", category: 'discipline' },
  { text: "While you sleep, someone is training.", category: 'discipline' },
  { text: "Discipline does what motivation can't.", category: 'discipline' },
  { text: "No excuses. No shortcuts. No limits.", category: 'discipline' },
  { text: "Hard work beats talent when talent doesn't work hard.", category: 'discipline' },
  { text: "What you do when nobody's watching defines who you are.", category: 'discipline' },
  { text: "One day or day one. You decide.", category: 'discipline' },
  { text: "Today's sweat is tomorrow's smile.", category: 'discipline' },
  { text: "You never regret a workout. You regret the one you skipped.", category: 'discipline' },
  { text: "Do it now. Your future self will thank you.", category: 'discipline' },
  { text: "Success isn't given. It's earned.", category: 'discipline' },
  { text: "Every rep counts. Every effort counts.", category: 'discipline' },
  { text: "Consistency beats talent.", category: 'discipline' },
  { text: "Do today what others won't, so tomorrow you can do what others can't.", category: 'discipline' },
  { text: "Champions are made when no one is watching.", category: 'discipline' },
  { text: "Routine beats exception every day.", category: 'discipline' },
  { text: "Master discipline, master your life.", category: 'discipline' },
  { text: "The secret to success: do it even when you don't feel like it.", category: 'discipline' },
  { text: "Discipline is the bridge between your goals and accomplishments.", category: 'discipline' },
  { text: "No progress without discipline. No discipline without sacrifice.", category: 'discipline' },
];

const EN_MENTAL: Citation[] = [
  { text: "Your only limit is you.", category: 'mental' },
  { text: "Silence the voice that says you can't.", category: 'mental' },
  { text: "They didn't believe in me. Now they watch me.", category: 'mental' },
  { text: "Fear kills more dreams than failure ever will.", category: 'mental' },
  { text: "Become the person you wish you had as a role model.", category: 'mental' },
  { text: "Comfort is the enemy of progress.", category: 'mental' },
  { text: "Suffer now and live the rest of your life as a champion.", category: 'mental' },
  { text: "What doesn't kill you makes you stronger.", category: 'mental' },
  { text: "Doubt kills more dreams than failure.", category: 'mental' },
  { text: "Turn your pain into power.", category: 'mental' },
  { text: "The mind leads, the body follows.", category: 'mental' },
  { text: "Believe in yourself stronger than your doubts.", category: 'mental' },
  { text: "Your mind is your most powerful weapon.", category: 'mental' },
  { text: "Strength doesn't come from the body. It comes from the will.", category: 'mental' },
  { text: "Whether you think you can or you can't, you're right.", category: 'mental' },
  { text: "Success starts in your head before it shows in your body.", category: 'mental' },
  { text: "Your thoughts become your reality. Choose them wisely.", category: 'mental' },
  { text: "A weak mind finds a thousand excuses. A strong mind finds a thousand solutions.", category: 'mental' },
  { text: "The comfort zone is a nice place, but nothing grows there.", category: 'mental' },
  { text: "Failure only exists if you quit.", category: 'mental' },
];

const EN_WARRIOR: Citation[] = [
  { text: "A champion doesn't train for the fight. They train to never lose.", category: 'warrior' },
  { text: "The fight isn't against others. It's against yourself.", category: 'warrior' },
  { text: "Every day is a battle. Be ready.", category: 'warrior' },
  { text: "A true champion gets up one more time than they fall.", category: 'warrior' },
  { text: "Don't pray for an easy life. Pray for the strength to endure a hard one.", category: 'warrior' },
  { text: "The ring never lies.", category: 'warrior' },
  { text: "Train like you're second. Fight like you're first.", category: 'warrior' },
  { text: "Victory loves preparation.", category: 'warrior' },
  { text: "Show them why they should have believed in you.", category: 'warrior' },
  { text: "Be the champion, not the spectator.", category: 'warrior' },
  { text: "A champion falls but never stays down.", category: 'warrior' },
  { text: "In the arena, it's just you and your courage.", category: 'warrior' },
  { text: "Warriors aren't born, they're forged.", category: 'warrior' },
  { text: "An athlete doesn't count reps. They start counting when it hurts.", category: 'warrior' },
  { text: "Sweat is proof you haven't given up.", category: 'warrior' },
  { text: "The battlefield doesn't forgive weakness.", category: 'warrior' },
  { text: "You play like you practice. Practice like a champion.", category: 'warrior' },
  { text: "Legends aren't born. They're built rep by rep.", category: 'warrior' },
  { text: "The real fight starts when your body says stop but your mind says go.", category: 'warrior' },
  { text: "Every drop of sweat brings you closer to victory.", category: 'warrior' },
];

const EN_PERSEVERANCE: Citation[] = [
  { text: "It's not over until you win.", category: 'perseverance' },
  { text: "Champions keep going when they can't go on.", category: 'perseverance' },
  { text: "The only bad workout is the one that didn't happen.", category: 'perseverance' },
  { text: "You're stronger than you think.", category: 'perseverance' },
  { text: "The more you sweat in training, the less you bleed in battle.", category: 'perseverance' },
  { text: "Never give up on a dream because of the time it takes. Time will pass anyway.", category: 'perseverance' },
  { text: "The difference between trying and succeeding is not stopping.", category: 'perseverance' },
  { text: "When it's hard, that's when you're growing.", category: 'perseverance' },
  { text: "Results come with time, not tomorrow.", category: 'perseverance' },
  { text: "Keep going even when you want to stop. That's when everything changes.", category: 'perseverance' },
  { text: "Every step brings you closer to your goal.", category: 'perseverance' },
  { text: "Success is the sum of small efforts repeated day after day.", category: 'perseverance' },
  { text: "Persistence beats resistance.", category: 'perseverance' },
  { text: "It's not how many times you fall, but how many times you get back up.", category: 'perseverance' },
  { text: "Rome wasn't built in a day, but they laid bricks every single day.", category: 'perseverance' },
  { text: "The marathon is run step by step. Focus on the next step.", category: 'perseverance' },
  { text: "Rivers cut through rock not by force, but by persistence.", category: 'perseverance' },
  { text: "Every expert was once a persistent beginner.", category: 'perseverance' },
  { text: "Success belongs to those who keep going when everyone else has quit.", category: 'perseverance' },
  { text: "Little by little, the bird builds its nest. Keep moving forward.", category: 'perseverance' },
];

const ALL_EN: Citation[] = [...EN_MOTIVATION, ...EN_DISCIPLINE, ...EN_MENTAL, ...EN_WARRIOR, ...EN_PERSEVERANCE];

// ═══════════════════════════════════════════════
// SPANISH QUOTES
// ═══════════════════════════════════════════════

const ES_MOTIVATION: Citation[] = [
  { text: "El dolor es temporal. Rendirse es para siempre.", category: 'motivation' },
  { text: "Nunca sabrás hasta dónde puedes llegar si no lo intentas.", category: 'motivation' },
  { text: "Cuando quieras rendirte, recuerda por qué empezaste.", category: 'motivation' },
  { text: "El éxito es caer siete veces y levantarse ocho.", category: 'motivation' },
  { text: "Tu único oponente eres tú mismo.", category: 'motivation' },
  { text: "Las excusas no queman calorías.", category: 'motivation' },
  { text: "O encuentras un camino o lo creas.", category: 'motivation' },
  { text: "El cuerpo se rinde antes que la mente. Empuja tu mente.", category: 'motivation' },
  { text: "Todo campeón fue alguna vez un principiante que no se rindió.", category: 'motivation' },
  { text: "El mejor momento para empezar fue ayer. El segundo mejor es ahora.", category: 'motivation' },
  { text: "Tu única competencia es quien eras ayer.", category: 'motivation' },
  { text: "Si no te desafía, no te cambia.", category: 'motivation' },
  { text: "Sueña en grande. Trabaja duro. Mantente humilde.", category: 'motivation' },
  { text: "Los grandes sueños empiezan con pequeñas acciones.", category: 'motivation' },
  { text: "Eres capaz de mucho más de lo que crees.", category: 'motivation' },
  { text: "Cada día es una nueva oportunidad para ser mejor.", category: 'motivation' },
  { text: "No dejes que el ayer ocupe demasiado de tu hoy.", category: 'motivation' },
  { text: "El único límite es el que tú te pones.", category: 'motivation' },
  { text: "Hazlo con pasión o no lo hagas.", category: 'motivation' },
  { text: "El que quiere puede, el que puede hace.", category: 'motivation' },
];

const ES_DISCIPLINE: Citation[] = [
  { text: "El talento es 1%. El trabajo es 99%.", category: 'discipline' },
  { text: "Mientras tú duermes, alguien está entrenando.", category: 'discipline' },
  { text: "La disciplina hace lo que la motivación no puede.", category: 'discipline' },
  { text: "Sin excusas. Sin atajos. Sin límites.", category: 'discipline' },
  { text: "El trabajo duro vence al talento cuando el talento no trabaja duro.", category: 'discipline' },
  { text: "Lo que haces cuando nadie te ve define quién eres.", category: 'discipline' },
  { text: "Un día o día uno. Tú decides.", category: 'discipline' },
  { text: "El sudor de hoy es la sonrisa de mañana.", category: 'discipline' },
  { text: "Nunca te arrepientes de un entrenamiento. Te arrepientes del que te saltaste.", category: 'discipline' },
  { text: "Hazlo ahora. Tu yo del futuro te lo agradecerá.", category: 'discipline' },
  { text: "El éxito no se regala. Se gana.", category: 'discipline' },
  { text: "Cada repetición cuenta. Cada esfuerzo cuenta.", category: 'discipline' },
  { text: "La constancia vence al talento.", category: 'discipline' },
  { text: "Haz hoy lo que otros no quieren para tener mañana lo que otros no tendrán.", category: 'discipline' },
  { text: "Los campeones se hacen cuando nadie está mirando.", category: 'discipline' },
  { text: "La rutina vence a la excepción todos los días.", category: 'discipline' },
  { text: "Domina la disciplina, domina tu vida.", category: 'discipline' },
  { text: "El secreto del éxito: hazlo aunque no tengas ganas.", category: 'discipline' },
  { text: "La disciplina es el puente entre tus metas y tus logros.", category: 'discipline' },
  { text: "No hay progreso sin disciplina. No hay disciplina sin sacrificio.", category: 'discipline' },
];

const ES_MENTAL: Citation[] = [
  { text: "Tu único límite eres tú.", category: 'mental' },
  { text: "Silencia la voz que dice que no puedes.", category: 'mental' },
  { text: "No creían en mí. Ahora me miran.", category: 'mental' },
  { text: "El miedo mata más sueños que el fracaso.", category: 'mental' },
  { text: "Conviértete en la persona que te hubiera gustado tener como modelo.", category: 'mental' },
  { text: "La comodidad es enemiga del progreso.", category: 'mental' },
  { text: "Sufre ahora y vive el resto de tu vida como campeón.", category: 'mental' },
  { text: "Lo que no te mata te hace más fuerte.", category: 'mental' },
  { text: "La duda mata más sueños que el fracaso.", category: 'mental' },
  { text: "Transforma tu dolor en poder.", category: 'mental' },
  { text: "La mente dirige, el cuerpo sigue.", category: 'mental' },
  { text: "Cree en ti más fuerte que tus dudas.", category: 'mental' },
  { text: "Tu mente es tu arma más poderosa.", category: 'mental' },
  { text: "La fuerza no viene del cuerpo. Viene de la voluntad.", category: 'mental' },
  { text: "Si crees que puedes o que no puedes, tienes razón.", category: 'mental' },
  { text: "El éxito empieza en tu cabeza antes de verse en tu cuerpo.", category: 'mental' },
  { text: "Tus pensamientos se convierten en tu realidad. Elígelos bien.", category: 'mental' },
  { text: "Una mente débil encuentra mil excusas. Una mente fuerte encuentra mil soluciones.", category: 'mental' },
  { text: "La zona de confort es un lugar bonito, pero ahí no crece nada.", category: 'mental' },
  { text: "El fracaso solo existe si te rindes.", category: 'mental' },
];

const ES_WARRIOR: Citation[] = [
  { text: "Un campeón no entrena para la pelea. Entrena para nunca perder.", category: 'warrior' },
  { text: "La pelea no es contra otros. Es contra ti mismo.", category: 'warrior' },
  { text: "Cada día es una batalla. Prepárate.", category: 'warrior' },
  { text: "Un verdadero campeón se levanta una vez más de las que cae.", category: 'warrior' },
  { text: "No reces por una vida fácil. Reza por la fuerza para soportar una difícil.", category: 'warrior' },
  { text: "El ring nunca miente.", category: 'warrior' },
  { text: "Entrena como si fueras el segundo. Pelea como si fueras el primero.", category: 'warrior' },
  { text: "La victoria ama la preparación.", category: 'warrior' },
  { text: "Demuéstrales por qué deberían haber creído en ti.", category: 'warrior' },
  { text: "Sé el campeón, no el espectador.", category: 'warrior' },
  { text: "Un campeón cae pero nunca se queda en el suelo.", category: 'warrior' },
  { text: "En la arena, solo estás tú y tu coraje.", category: 'warrior' },
  { text: "Los guerreros no nacen, se forjan.", category: 'warrior' },
  { text: "Un atleta no cuenta repeticiones. Empieza a contar cuando duele.", category: 'warrior' },
  { text: "El sudor es la prueba de que no te has rendido.", category: 'warrior' },
  { text: "El campo de batalla no perdona la debilidad.", category: 'warrior' },
  { text: "Juegas como entrenas. Entrena como un campeón.", category: 'warrior' },
  { text: "Las leyendas no nacen. Se construyen repetición tras repetición.", category: 'warrior' },
  { text: "La verdadera pelea empieza cuando tu cuerpo dice basta pero tu mente dice adelante.", category: 'warrior' },
  { text: "Cada gota de sudor te acerca a la victoria.", category: 'warrior' },
];

const ES_PERSEVERANCE: Citation[] = [
  { text: "No se acaba hasta que ganas.", category: 'perseverance' },
  { text: "Los campeones siguen cuando ya no pueden seguir.", category: 'perseverance' },
  { text: "El único mal entrenamiento es el que no se hizo.", category: 'perseverance' },
  { text: "Eres más fuerte de lo que crees.", category: 'perseverance' },
  { text: "Cuanto más sudas en el entrenamiento, menos sangras en la batalla.", category: 'perseverance' },
  { text: "Nunca abandones un sueño por el tiempo que tomará. El tiempo pasará de todos modos.", category: 'perseverance' },
  { text: "La diferencia entre intentar y lograr es no parar.", category: 'perseverance' },
  { text: "Cuando es difícil, es cuando creces.", category: 'perseverance' },
  { text: "Los resultados llegan con el tiempo, no mañana.", category: 'perseverance' },
  { text: "Sigue aunque quieras parar. Ahí es cuando todo cambia.", category: 'perseverance' },
  { text: "Cada paso te acerca a tu meta.", category: 'perseverance' },
  { text: "El éxito es la suma de pequeños esfuerzos repetidos día tras día.", category: 'perseverance' },
  { text: "La persistencia vence a la resistencia.", category: 'perseverance' },
  { text: "No importa cuántas veces caigas, sino cuántas te levantas.", category: 'perseverance' },
  { text: "Roma no se construyó en un día, pero ponían ladrillos cada día.", category: 'perseverance' },
  { text: "El maratón se corre paso a paso. Concéntrate en el siguiente paso.", category: 'perseverance' },
  { text: "Los ríos cortan las rocas no por su fuerza, sino por su persistencia.", category: 'perseverance' },
  { text: "Todo experto fue alguna vez un principiante persistente.", category: 'perseverance' },
  { text: "El éxito pertenece a quienes siguen cuando todos han abandonado.", category: 'perseverance' },
  { text: "Poco a poco, el pájaro hace su nido. Sigue adelante.", category: 'perseverance' },
];

const ALL_ES: Citation[] = [...ES_MOTIVATION, ...ES_DISCIPLINE, ...ES_MENTAL, ...ES_WARRIOR, ...ES_PERSEVERANCE];

// ═══════════════════════════════════════════════
// GERMAN QUOTES
// ═══════════════════════════════════════════════

const DE_MOTIVATION: Citation[] = [
  { text: "Schmerz ist vorübergehend. Aufgeben ist für immer.", category: 'motivation' },
  { text: "Du wirst nie wissen, wie weit du gehen kannst, wenn du es nicht versuchst.", category: 'motivation' },
  { text: "Wenn du aufgeben willst, erinnere dich, warum du angefangen hast.", category: 'motivation' },
  { text: "Erfolg ist, siebenmal zu fallen und achtmal aufzustehen.", category: 'motivation' },
  { text: "Dein einziger Gegner bist du selbst.", category: 'motivation' },
  { text: "Ausreden verbrennen keine Kalorien.", category: 'motivation' },
  { text: "Finde einen Weg oder schaffe einen.", category: 'motivation' },
  { text: "Der Körper gibt auf, bevor der Geist es tut. Trainiere deinen Geist.", category: 'motivation' },
  { text: "Jeder Champion war einmal ein Anfänger, der nicht aufgegeben hat.", category: 'motivation' },
  { text: "Der beste Zeitpunkt anzufangen war gestern. Der zweitbeste ist jetzt.", category: 'motivation' },
  { text: "Deine einzige Konkurrenz bist du von gestern.", category: 'motivation' },
  { text: "Wenn es dich nicht herausfordert, verändert es dich nicht.", category: 'motivation' },
  { text: "Träume groß. Arbeite hart. Bleibe bescheiden.", category: 'motivation' },
  { text: "Große Träume beginnen mit kleinen Taten.", category: 'motivation' },
  { text: "Du bist zu viel mehr fähig, als du denkst.", category: 'motivation' },
  { text: "Jeder Tag ist eine neue Chance, besser zu werden.", category: 'motivation' },
  { text: "Lass nicht zu, dass gestern zu viel von heute einnimmt.", category: 'motivation' },
  { text: "Die einzige Grenze ist die, die du dir selbst setzt.", category: 'motivation' },
  { text: "Mach es mit Leidenschaft oder gar nicht.", category: 'motivation' },
  { text: "Wer will, findet Wege. Wer nicht will, findet Gründe.", category: 'motivation' },
];

const DE_DISCIPLINE: Citation[] = [
  { text: "Talent ist 1%. Harte Arbeit ist 99%.", category: 'discipline' },
  { text: "Während du schläfst, trainiert jemand.", category: 'discipline' },
  { text: "Disziplin schafft, was Motivation nicht kann.", category: 'discipline' },
  { text: "Keine Ausreden. Keine Abkürzungen. Keine Grenzen.", category: 'discipline' },
  { text: "Fleiß schlägt Talent, wenn Talent nicht fleißig ist.", category: 'discipline' },
  { text: "Was du tust, wenn niemand zusieht, definiert, wer du bist.", category: 'discipline' },
  { text: "Eines Tages oder Tag eins. Du entscheidest.", category: 'discipline' },
  { text: "Der Schweiß von heute ist das Lächeln von morgen.", category: 'discipline' },
  { text: "Du bereust nie ein Training. Du bereust das, das du ausgelassen hast.", category: 'discipline' },
  { text: "Tu es jetzt. Dein zukünftiges Ich wird es dir danken.", category: 'discipline' },
  { text: "Erfolg wird nicht geschenkt. Er wird verdient.", category: 'discipline' },
  { text: "Jede Wiederholung zählt. Jede Anstrengung zählt.", category: 'discipline' },
  { text: "Beständigkeit schlägt Talent.", category: 'discipline' },
  { text: "Tu heute, was andere nicht wollen, um morgen zu haben, was andere nicht haben werden.", category: 'discipline' },
  { text: "Champions werden gemacht, wenn niemand zusieht.", category: 'discipline' },
  { text: "Routine schlägt Ausnahme jeden Tag.", category: 'discipline' },
  { text: "Meistere die Disziplin, meistere dein Leben.", category: 'discipline' },
  { text: "Das Geheimnis des Erfolgs: Tu es, auch wenn du keine Lust hast.", category: 'discipline' },
  { text: "Disziplin ist die Brücke zwischen deinen Zielen und deinen Erfolgen.", category: 'discipline' },
  { text: "Kein Fortschritt ohne Disziplin. Keine Disziplin ohne Opfer.", category: 'discipline' },
];

const DE_MENTAL: Citation[] = [
  { text: "Deine einzige Grenze bist du.", category: 'mental' },
  { text: "Bringe die Stimme zum Schweigen, die sagt, dass du es nicht kannst.", category: 'mental' },
  { text: "Sie haben nicht an mich geglaubt. Jetzt schauen sie mir zu.", category: 'mental' },
  { text: "Angst tötet mehr Träume als Scheitern.", category: 'mental' },
  { text: "Werde die Person, die du dir als Vorbild gewünscht hättest.", category: 'mental' },
  { text: "Komfort ist der Feind des Fortschritts.", category: 'mental' },
  { text: "Leide jetzt und lebe den Rest deines Lebens als Champion.", category: 'mental' },
  { text: "Was dich nicht umbringt, macht dich stärker.", category: 'mental' },
  { text: "Zweifel töten mehr Träume als Scheitern.", category: 'mental' },
  { text: "Verwandle deinen Schmerz in Kraft.", category: 'mental' },
  { text: "Der Geist führt, der Körper folgt.", category: 'mental' },
  { text: "Glaube an dich stärker als an deine Zweifel.", category: 'mental' },
  { text: "Dein Geist ist deine mächtigste Waffe.", category: 'mental' },
  { text: "Stärke kommt nicht vom Körper. Sie kommt vom Willen.", category: 'mental' },
  { text: "Ob du denkst, du kannst es oder nicht, du hast recht.", category: 'mental' },
  { text: "Erfolg beginnt im Kopf, bevor er sich im Körper zeigt.", category: 'mental' },
  { text: "Deine Gedanken werden deine Realität. Wähle sie weise.", category: 'mental' },
  { text: "Ein schwacher Geist findet tausend Ausreden. Ein starker Geist findet tausend Lösungen.", category: 'mental' },
  { text: "Die Komfortzone ist ein schöner Ort, aber dort wächst nichts.", category: 'mental' },
  { text: "Scheitern existiert nur, wenn du aufgibst.", category: 'mental' },
];

const DE_WARRIOR: Citation[] = [
  { text: "Ein Champion trainiert nicht für den Kampf. Er trainiert, um nie zu verlieren.", category: 'warrior' },
  { text: "Der Kampf ist nicht gegen andere. Er ist gegen dich selbst.", category: 'warrior' },
  { text: "Jeder Tag ist ein Kampf. Sei bereit.", category: 'warrior' },
  { text: "Ein wahrer Champion steht einmal öfter auf, als er fällt.", category: 'warrior' },
  { text: "Bete nicht für ein einfaches Leben. Bete um die Kraft, ein schweres zu ertragen.", category: 'warrior' },
  { text: "Der Ring lügt nie.", category: 'warrior' },
  { text: "Trainiere, als wärst du der Zweite. Kämpfe, als wärst du der Erste.", category: 'warrior' },
  { text: "Der Sieg liebt die Vorbereitung.", category: 'warrior' },
  { text: "Zeig ihnen, warum sie an dich hätten glauben sollen.", category: 'warrior' },
  { text: "Sei der Champion, nicht der Zuschauer.", category: 'warrior' },
  { text: "Ein Champion fällt, aber bleibt nie am Boden.", category: 'warrior' },
  { text: "In der Arena bist nur du und dein Mut.", category: 'warrior' },
  { text: "Krieger werden nicht geboren, sie werden geschmiedet.", category: 'warrior' },
  { text: "Ein Athlet zählt keine Wiederholungen. Er beginnt zu zählen, wenn es wehtut.", category: 'warrior' },
  { text: "Schweiß ist der Beweis, dass du nicht aufgegeben hast.", category: 'warrior' },
  { text: "Das Schlachtfeld vergibt keine Schwäche.", category: 'warrior' },
  { text: "Du spielst, wie du trainierst. Trainiere wie ein Champion.", category: 'warrior' },
  { text: "Legenden werden nicht geboren. Sie werden Wiederholung für Wiederholung gebaut.", category: 'warrior' },
  { text: "Der wahre Kampf beginnt, wenn dein Körper stopp sagt, aber dein Geist weitermachen will.", category: 'warrior' },
  { text: "Jeder Tropfen Schweiß bringt dich dem Sieg näher.", category: 'warrior' },
];

const DE_PERSEVERANCE: Citation[] = [
  { text: "Es ist nicht vorbei, bis du gewinnst.", category: 'perseverance' },
  { text: "Champions machen weiter, wenn sie nicht mehr können.", category: 'perseverance' },
  { text: "Das einzige schlechte Training ist das, das nicht stattfand.", category: 'perseverance' },
  { text: "Du bist stärker, als du denkst.", category: 'perseverance' },
  { text: "Je mehr du im Training schwitzt, desto weniger blutest du im Kampf.", category: 'perseverance' },
  { text: "Gib niemals einen Traum auf wegen der Zeit, die er braucht. Die Zeit vergeht sowieso.", category: 'perseverance' },
  { text: "Der Unterschied zwischen Versuchen und Erfolg ist, nicht aufzuhören.", category: 'perseverance' },
  { text: "Wenn es schwer ist, wächst du.", category: 'perseverance' },
  { text: "Ergebnisse kommen mit der Zeit, nicht morgen.", category: 'perseverance' },
  { text: "Mach weiter, auch wenn du aufhören willst. Da verändert sich alles.", category: 'perseverance' },
  { text: "Jeder Schritt bringt dich deinem Ziel näher.", category: 'perseverance' },
  { text: "Erfolg ist die Summe kleiner Anstrengungen, die Tag für Tag wiederholt werden.", category: 'perseverance' },
  { text: "Ausdauer schlägt Widerstand.", category: 'perseverance' },
  { text: "Es zählt nicht, wie oft du fällst, sondern wie oft du aufstehst.", category: 'perseverance' },
  { text: "Rom wurde nicht an einem Tag erbaut, aber sie legten jeden Tag Steine.", category: 'perseverance' },
  { text: "Der Marathon wird Schritt für Schritt gelaufen. Konzentriere dich auf den nächsten Schritt.", category: 'perseverance' },
  { text: "Flüsse schneiden durch Felsen nicht durch Kraft, sondern durch Beharrlichkeit.", category: 'perseverance' },
  { text: "Jeder Experte war einmal ein beharrlicher Anfänger.", category: 'perseverance' },
  { text: "Erfolg gehört denen, die weitermachen, wenn alle anderen aufgegeben haben.", category: 'perseverance' },
  { text: "Nach und nach baut der Vogel sein Nest. Mach weiter.", category: 'perseverance' },
];

const ALL_DE: Citation[] = [...DE_MOTIVATION, ...DE_DISCIPLINE, ...DE_MENTAL, ...DE_WARRIOR, ...DE_PERSEVERANCE];

// ═══════════════════════════════════════════════
// ARABIC QUOTES
// ═══════════════════════════════════════════════

const AR_MOTIVATION: Citation[] = [
  { text: "الألم مؤقت، الاستسلام أبدي.", category: 'motivation' },
  { text: "لن تعرف إلى أي مدى يمكنك الذهاب ما لم تحاول.", category: 'motivation' },
  { text: "عندما تريد الاستسلام، تذكر لماذا بدأت.", category: 'motivation' },
  { text: "النجاح هو السقوط سبع مرات والنهوض ثماني.", category: 'motivation' },
  { text: "خصمك الوحيد هو نفسك.", category: 'motivation' },
  { text: "الأعذار لا تحرق السعرات الحرارية.", category: 'motivation' },
  { text: "إما أن تجد طريقاً أو تصنع واحداً.", category: 'motivation' },
  { text: "الجسم يستسلم قبل العقل. ادفع عقلك.", category: 'motivation' },
  { text: "كل بطل كان يوماً مبتدئاً رفض الاستسلام.", category: 'motivation' },
  { text: "أفضل وقت للبدء كان البارحة. ثاني أفضل وقت هو الآن.", category: 'motivation' },
  { text: "منافستك الوحيدة هي مع من كنت عليه البارحة.", category: 'motivation' },
  { text: "إذا لم يتحداك، فلن يغيرك.", category: 'motivation' },
  { text: "احلم كبيراً. اعمل بجد. ابقَ متواضعاً.", category: 'motivation' },
  { text: "الأحلام الكبيرة تبدأ بأفعال صغيرة.", category: 'motivation' },
  { text: "أنت قادر على أكثر مما تعتقد.", category: 'motivation' },
  { text: "كل يوم فرصة جديدة لتصبح أفضل.", category: 'motivation' },
  { text: "لا تدع الأمس يأخذ الكثير من يومك.", category: 'motivation' },
  { text: "الحد الوحيد هو الذي تضعه لنفسك.", category: 'motivation' },
  { text: "افعلها بشغف أو لا تفعلها على الإطلاق.", category: 'motivation' },
  { text: "من يريد يستطيع.", category: 'motivation' },
];

const AR_DISCIPLINE: Citation[] = [
  { text: "الموهبة 1%. العمل الجاد 99%.", category: 'discipline' },
  { text: "بينما تنام، شخص ما يتدرب.", category: 'discipline' },
  { text: "الانضباط يفعل ما لا تستطيع الدافعية فعله.", category: 'discipline' },
  { text: "لا أعذار. لا طرق مختصرة. لا حدود.", category: 'discipline' },
  { text: "العمل الجاد يتفوق على الموهبة عندما لا تعمل الموهبة.", category: 'discipline' },
  { text: "ما تفعله عندما لا يراقبك أحد يحدد من أنت.", category: 'discipline' },
  { text: "يوم ما أو اليوم الأول. أنت تقرر.", category: 'discipline' },
  { text: "عرق اليوم هو ابتسامة الغد.", category: 'discipline' },
  { text: "لن تندم أبداً على التمرين. ستندم على الذي فاتك.", category: 'discipline' },
  { text: "افعلها الآن. نسختك المستقبلية ستشكرك.", category: 'discipline' },
  { text: "النجاح لا يُعطى. يُكتسب.", category: 'discipline' },
  { text: "كل تكرار يُحسب. كل جهد يُحسب.", category: 'discipline' },
  { text: "الثبات يتفوق على الموهبة.", category: 'discipline' },
  { text: "افعل اليوم ما لا يريد الآخرون فعله لتحصل غداً على ما لن يحصلوا عليه.", category: 'discipline' },
  { text: "الأبطال يُصنعون عندما لا يراقب أحد.", category: 'discipline' },
  { text: "الروتين يتفوق على الاستثناء كل يوم.", category: 'discipline' },
  { text: "أتقن الانضباط، أتقن حياتك.", category: 'discipline' },
  { text: "سر النجاح: افعله حتى عندما لا تشعر بالرغبة.", category: 'discipline' },
  { text: "الانضباط هو الجسر بين أهدافك وإنجازاتك.", category: 'discipline' },
  { text: "لا تقدم بدون انضباط. لا انضباط بدون تضحية.", category: 'discipline' },
];

const AR_MENTAL: Citation[] = [
  { text: "حدك الوحيد هو أنت.", category: 'mental' },
  { text: "أسكت الصوت الذي يقول أنك لا تستطيع.", category: 'mental' },
  { text: "لم يؤمنوا بي. الآن يراقبونني.", category: 'mental' },
  { text: "الخوف يقتل أحلاماً أكثر من الفشل.", category: 'mental' },
  { text: "كن الشخص الذي تمنيت أن يكون قدوتك.", category: 'mental' },
  { text: "الراحة عدو التقدم.", category: 'mental' },
  { text: "اعانِ الآن وعش بقية حياتك كبطل.", category: 'mental' },
  { text: "ما لا يقتلك يجعلك أقوى.", category: 'mental' },
  { text: "الشك يقتل أحلاماً أكثر من الفشل.", category: 'mental' },
  { text: "حوّل ألمك إلى قوة.", category: 'mental' },
  { text: "العقل يقود، الجسم يتبع.", category: 'mental' },
  { text: "آمن بنفسك أقوى من شكوكك.", category: 'mental' },
  { text: "عقلك هو أقوى سلاح لديك.", category: 'mental' },
  { text: "القوة لا تأتي من الجسم. تأتي من الإرادة.", category: 'mental' },
  { text: "سواء اعتقدت أنك تستطيع أو لا تستطيع، أنت محق.", category: 'mental' },
  { text: "النجاح يبدأ في رأسك قبل أن يظهر في جسمك.", category: 'mental' },
  { text: "أفكارك تصبح واقعك. اخترها بحكمة.", category: 'mental' },
  { text: "العقل الضعيف يجد ألف عذر. العقل القوي يجد ألف حل.", category: 'mental' },
  { text: "منطقة الراحة مكان جميل، لكن لا شيء ينمو هناك.", category: 'mental' },
  { text: "الفشل لا يوجد إلا إذا استسلمت.", category: 'mental' },
];

const AR_WARRIOR: Citation[] = [
  { text: "البطل لا يتدرب للقتال. يتدرب ليلا يخسر أبداً.", category: 'warrior' },
  { text: "القتال ليس ضد الآخرين. إنه ضد نفسك.", category: 'warrior' },
  { text: "كل يوم معركة. كن مستعداً.", category: 'warrior' },
  { text: "البطل الحقيقي ينهض مرة أكثر مما يسقط.", category: 'warrior' },
  { text: "لا تصلِّ من أجل حياة سهلة. صلِّ من أجل القوة لتحمل حياة صعبة.", category: 'warrior' },
  { text: "الحلبة لا تكذب أبداً.", category: 'warrior' },
  { text: "تدرب وكأنك الثاني. قاتل وكأنك الأول.", category: 'warrior' },
  { text: "النصر يحب الاستعداد.", category: 'warrior' },
  { text: "أرهم لماذا كان يجب أن يؤمنوا بك.", category: 'warrior' },
  { text: "كن البطل، لا المتفرج.", category: 'warrior' },
  { text: "البطل يسقط لكنه لا يبقى على الأرض.", category: 'warrior' },
  { text: "في الحلبة، أنت وشجاعتك فقط.", category: 'warrior' },
  { text: "المحاربون لا يولدون، بل يُصنعون.", category: 'warrior' },
  { text: "الرياضي لا يعد التكرارات. يبدأ العد عندما يصبح صعباً.", category: 'warrior' },
  { text: "العرق دليل على أنك لم تستسلم.", category: 'warrior' },
  { text: "ساحة المعركة لا تغفر الضعف.", category: 'warrior' },
  { text: "تلعب كما تتدرب. تدرب كبطل.", category: 'warrior' },
  { text: "الأساطير لا تولد. تُبنى تكراراً بعد تكرار.", category: 'warrior' },
  { text: "المعركة الحقيقية تبدأ عندما يقول جسمك توقف لكن عقلك يقول استمر.", category: 'warrior' },
  { text: "كل قطرة عرق تقربك من النصر.", category: 'warrior' },
];

const AR_PERSEVERANCE: Citation[] = [
  { text: "لم ينتهِ الأمر حتى تفوز.", category: 'perseverance' },
  { text: "الأبطال يستمرون عندما لا يستطيعون الاستمرار.", category: 'perseverance' },
  { text: "التمرين السيء الوحيد هو الذي لم يحدث.", category: 'perseverance' },
  { text: "أنت أقوى مما تعتقد.", category: 'perseverance' },
  { text: "كلما تعرقت أكثر في التدريب، نزفت أقل في المعركة.", category: 'perseverance' },
  { text: "لا تتخلَّ عن حلم بسبب الوقت الذي سيستغرقه. الوقت سيمر على أي حال.", category: 'perseverance' },
  { text: "الفرق بين المحاولة والنجاح هو عدم التوقف.", category: 'perseverance' },
  { text: "عندما يصعب الأمر، هذا عندما تنمو.", category: 'perseverance' },
  { text: "النتائج تأتي مع الوقت، ليس غداً.", category: 'perseverance' },
  { text: "استمر حتى عندما تريد التوقف. هنا يتغير كل شيء.", category: 'perseverance' },
  { text: "كل خطوة تقربك من هدفك.", category: 'perseverance' },
  { text: "النجاح هو مجموع الجهود الصغيرة المتكررة يوماً بعد يوم.", category: 'perseverance' },
  { text: "المثابرة تتغلب على المقاومة.", category: 'perseverance' },
  { text: "المهم ليس كم مرة تسقط، بل كم مرة تنهض.", category: 'perseverance' },
  { text: "روما لم تُبنَ في يوم، لكنهم وضعوا حجراً كل يوم.", category: 'perseverance' },
  { text: "الماراثون يُركض خطوة بخطوة. ركز على الخطوة التالية.", category: 'perseverance' },
  { text: "الأنهار تشق الصخور ليس بقوتها، بل بمثابرتها.", category: 'perseverance' },
  { text: "كل خبير كان يوماً مبتدئاً مثابراً.", category: 'perseverance' },
  { text: "النجاح يخص أولئك الذين يستمرون عندما يستسلم الجميع.", category: 'perseverance' },
  { text: "شيئاً فشيئاً، يبني الطائر عشه. استمر في التقدم.", category: 'perseverance' },
];

const ALL_AR: Citation[] = [...AR_MOTIVATION, ...AR_DISCIPLINE, ...AR_MENTAL, ...AR_WARRIOR, ...AR_PERSEVERANCE];

// ═══════════════════════════════════════════════
// ITALIAN QUOTES
// ═══════════════════════════════════════════════

const IT_MOTIVATION: Citation[] = [
  { text: "Il dolore è temporaneo. Arrendersi è per sempre.", category: 'motivation' },
  { text: "Non saprai mai fin dove puoi arrivare se non provi.", category: 'motivation' },
  { text: "Quando vuoi arrenderti, ricorda perché hai iniziato.", category: 'motivation' },
  { text: "Il successo è cadere sette volte e rialzarsi otto.", category: 'motivation' },
  { text: "Il tuo unico avversario sei tu stesso.", category: 'motivation' },
  { text: "Le scuse non bruciano calorie.", category: 'motivation' },
  { text: "O trovi una strada o ne crei una.", category: 'motivation' },
  { text: "Il corpo si arrende prima della mente. Spingi la tua mente.", category: 'motivation' },
  { text: "Ogni campione è stato un principiante che non si è arreso.", category: 'motivation' },
  { text: "Il momento migliore per iniziare era ieri. Il secondo migliore è adesso.", category: 'motivation' },
  { text: "La tua unica competizione è chi eri ieri.", category: 'motivation' },
  { text: "Se non ti sfida, non ti cambia.", category: 'motivation' },
  { text: "Sogna in grande. Lavora sodo. Resta umile.", category: 'motivation' },
  { text: "I grandi sogni iniziano con piccole azioni.", category: 'motivation' },
  { text: "Sei capace di molto più di quanto pensi.", category: 'motivation' },
  { text: "Ogni giorno è una nuova opportunità per migliorare.", category: 'motivation' },
  { text: "Non lasciare che ieri occupi troppo del tuo oggi.", category: 'motivation' },
  { text: "L'unico limite è quello che ti poni.", category: 'motivation' },
  { text: "Fallo con passione o non farlo affatto.", category: 'motivation' },
  { text: "Chi vuole può.", category: 'motivation' },
];

const IT_DISCIPLINE: Citation[] = [
  { text: "Il talento è l'1%. Il duro lavoro è il 99%.", category: 'discipline' },
  { text: "Mentre dormi, qualcuno si sta allenando.", category: 'discipline' },
  { text: "La disciplina fa ciò che la motivazione non può.", category: 'discipline' },
  { text: "Niente scuse. Niente scorciatoie. Niente limiti.", category: 'discipline' },
  { text: "Il duro lavoro batte il talento quando il talento non lavora.", category: 'discipline' },
  { text: "Ciò che fai quando nessuno guarda definisce chi sei.", category: 'discipline' },
  { text: "Un giorno o giorno uno. Decidi tu.", category: 'discipline' },
  { text: "Il sudore di oggi è il sorriso di domani.", category: 'discipline' },
  { text: "Non rimpiangi mai un allenamento. Rimpiangi quello che hai saltato.", category: 'discipline' },
  { text: "Fallo ora. Il tuo io futuro ti ringrazierà.", category: 'discipline' },
  { text: "Il successo non si regala. Si guadagna.", category: 'discipline' },
  { text: "Ogni ripetizione conta. Ogni sforzo conta.", category: 'discipline' },
  { text: "La costanza batte il talento.", category: 'discipline' },
  { text: "Fai oggi ciò che altri non vogliono per avere domani ciò che altri non avranno.", category: 'discipline' },
  { text: "I campioni si fanno quando nessuno guarda.", category: 'discipline' },
  { text: "La routine batte l'eccezione ogni giorno.", category: 'discipline' },
  { text: "Padroneggia la disciplina, padroneggia la tua vita.", category: 'discipline' },
  { text: "Il segreto del successo: fallo anche quando non ne hai voglia.", category: 'discipline' },
  { text: "La disciplina è il ponte tra i tuoi obiettivi e i tuoi risultati.", category: 'discipline' },
  { text: "Nessun progresso senza disciplina. Nessuna disciplina senza sacrificio.", category: 'discipline' },
];

const IT_MENTAL: Citation[] = [
  { text: "Il tuo unico limite sei tu.", category: 'mental' },
  { text: "Zittisci la voce che dice che non puoi.", category: 'mental' },
  { text: "Non credevano in me. Ora mi guardano.", category: 'mental' },
  { text: "La paura uccide più sogni del fallimento.", category: 'mental' },
  { text: "Diventa la persona che avresti voluto come modello.", category: 'mental' },
  { text: "Il comfort è nemico del progresso.", category: 'mental' },
  { text: "Soffri ora e vivi il resto della tua vita da campione.", category: 'mental' },
  { text: "Ciò che non ti uccide ti rende più forte.", category: 'mental' },
  { text: "Il dubbio uccide più sogni del fallimento.", category: 'mental' },
  { text: "Trasforma il tuo dolore in potere.", category: 'mental' },
  { text: "La mente guida, il corpo segue.", category: 'mental' },
  { text: "Credi in te stesso più dei tuoi dubbi.", category: 'mental' },
  { text: "La tua mente è la tua arma più potente.", category: 'mental' },
  { text: "La forza non viene dal corpo. Viene dalla volontà.", category: 'mental' },
  { text: "Che tu creda di potercela fare o no, hai ragione.", category: 'mental' },
  { text: "Il successo inizia nella tua testa prima di mostrarsi nel tuo corpo.", category: 'mental' },
  { text: "I tuoi pensieri diventano la tua realtà. Sceglili bene.", category: 'mental' },
  { text: "Una mente debole trova mille scuse. Una mente forte trova mille soluzioni.", category: 'mental' },
  { text: "La zona di comfort è un bel posto, ma lì non cresce nulla.", category: 'mental' },
  { text: "Il fallimento esiste solo se ti arrendi.", category: 'mental' },
];

const IT_WARRIOR: Citation[] = [
  { text: "Un campione non si allena per la lotta. Si allena per non perdere mai.", category: 'warrior' },
  { text: "La lotta non è contro gli altri. È contro te stesso.", category: 'warrior' },
  { text: "Ogni giorno è una battaglia. Sii pronto.", category: 'warrior' },
  { text: "Un vero campione si rialza una volta in più di quante cade.", category: 'warrior' },
  { text: "Non pregare per una vita facile. Prega per la forza di affrontarne una difficile.", category: 'warrior' },
  { text: "Il ring non mente mai.", category: 'warrior' },
  { text: "Allenati come se fossi secondo. Combatti come se fossi primo.", category: 'warrior' },
  { text: "La vittoria ama la preparazione.", category: 'warrior' },
  { text: "Mostragli perché avrebbero dovuto credere in te.", category: 'warrior' },
  { text: "Sii il campione, non lo spettatore.", category: 'warrior' },
  { text: "Un campione cade ma non resta mai a terra.", category: 'warrior' },
  { text: "Nell'arena ci sei solo tu e il tuo coraggio.", category: 'warrior' },
  { text: "I guerrieri non nascono, vengono forgiati.", category: 'warrior' },
  { text: "Un atleta non conta le ripetizioni. Inizia a contare quando fa male.", category: 'warrior' },
  { text: "Il sudore è la prova che non ti sei arreso.", category: 'warrior' },
  { text: "Il campo di battaglia non perdona la debolezza.", category: 'warrior' },
  { text: "Giochi come ti alleni. Allenati come un campione.", category: 'warrior' },
  { text: "Le leggende non nascono. Si costruiscono ripetizione dopo ripetizione.", category: 'warrior' },
  { text: "La vera lotta inizia quando il tuo corpo dice basta ma la tua mente dice continua.", category: 'warrior' },
  { text: "Ogni goccia di sudore ti avvicina alla vittoria.", category: 'warrior' },
];

const IT_PERSEVERANCE: Citation[] = [
  { text: "Non è finita finché non vinci.", category: 'perseverance' },
  { text: "I campioni continuano quando non possono più continuare.", category: 'perseverance' },
  { text: "L'unico cattivo allenamento è quello che non è stato fatto.", category: 'perseverance' },
  { text: "Sei più forte di quanto pensi.", category: 'perseverance' },
  { text: "Più sudi in allenamento, meno sanguini in battaglia.", category: 'perseverance' },
  { text: "Non rinunciare mai a un sogno per il tempo che richiederà. Il tempo passerà comunque.", category: 'perseverance' },
  { text: "La differenza tra provare e riuscire è non fermarsi.", category: 'perseverance' },
  { text: "Quando è duro, è quando cresci.", category: 'perseverance' },
  { text: "I risultati arrivano con il tempo, non domani.", category: 'perseverance' },
  { text: "Continua anche quando vuoi fermarti. È lì che tutto cambia.", category: 'perseverance' },
  { text: "Ogni passo ti avvicina al tuo obiettivo.", category: 'perseverance' },
  { text: "Il successo è la somma di piccoli sforzi ripetuti giorno dopo giorno.", category: 'perseverance' },
  { text: "La persistenza batte la resistenza.", category: 'perseverance' },
  { text: "Non conta quante volte cadi, ma quante volte ti rialzi.", category: 'perseverance' },
  { text: "Roma non fu costruita in un giorno, ma ogni giorno posavano mattoni.", category: 'perseverance' },
  { text: "La maratona si corre passo dopo passo. Concentrati sul prossimo passo.", category: 'perseverance' },
  { text: "I fiumi scavano le rocce non con la forza, ma con la perseveranza.", category: 'perseverance' },
  { text: "Ogni esperto è stato un principiante perseverante.", category: 'perseverance' },
  { text: "Il successo appartiene a chi continua quando tutti hanno abbandonato.", category: 'perseverance' },
  { text: "Piano piano, l'uccello costruisce il suo nido. Continua ad andare avanti.", category: 'perseverance' },
];

const ALL_IT: Citation[] = [...IT_MOTIVATION, ...IT_DISCIPLINE, ...IT_MENTAL, ...IT_WARRIOR, ...IT_PERSEVERANCE];

// ═══════════════════════════════════════════════
// PORTUGUESE QUOTES
// ═══════════════════════════════════════════════

const PT_MOTIVATION: Citation[] = [
  { text: "A dor é temporária. Desistir é para sempre.", category: 'motivation' },
  { text: "Você nunca saberá até onde pode ir se não tentar.", category: 'motivation' },
  { text: "Quando quiser desistir, lembre-se por que começou.", category: 'motivation' },
  { text: "O sucesso é cair sete vezes e levantar oito.", category: 'motivation' },
  { text: "Seu único oponente é você mesmo.", category: 'motivation' },
  { text: "Desculpas não queimam calorias.", category: 'motivation' },
  { text: "Ou você encontra um caminho ou cria um.", category: 'motivation' },
  { text: "O corpo desiste antes da mente. Force sua mente.", category: 'motivation' },
  { text: "Todo campeão foi um iniciante que não desistiu.", category: 'motivation' },
  { text: "O melhor momento para começar foi ontem. O segundo melhor é agora.", category: 'motivation' },
  { text: "Sua única competição é quem você era ontem.", category: 'motivation' },
  { text: "Se não te desafia, não te muda.", category: 'motivation' },
  { text: "Sonhe grande. Trabalhe duro. Seja humilde.", category: 'motivation' },
  { text: "Grandes sonhos começam com pequenas ações.", category: 'motivation' },
  { text: "Você é capaz de muito mais do que pensa.", category: 'motivation' },
  { text: "Cada dia é uma nova chance de ser melhor.", category: 'motivation' },
  { text: "Não deixe o ontem ocupar muito do seu hoje.", category: 'motivation' },
  { text: "O único limite é o que você coloca para si mesmo.", category: 'motivation' },
  { text: "Faça com paixão ou não faça.", category: 'motivation' },
  { text: "Quem quer consegue.", category: 'motivation' },
];

const PT_DISCIPLINE: Citation[] = [
  { text: "Talento é 1%. Trabalho duro é 99%.", category: 'discipline' },
  { text: "Enquanto você dorme, alguém está treinando.", category: 'discipline' },
  { text: "A disciplina faz o que a motivação não consegue.", category: 'discipline' },
  { text: "Sem desculpas. Sem atalhos. Sem limites.", category: 'discipline' },
  { text: "O trabalho duro vence o talento quando o talento não trabalha.", category: 'discipline' },
  { text: "O que você faz quando ninguém está olhando define quem você é.", category: 'discipline' },
  { text: "Um dia ou dia um. Você decide.", category: 'discipline' },
  { text: "O suor de hoje é o sorriso de amanhã.", category: 'discipline' },
  { text: "Você nunca se arrepende de um treino. Se arrepende do que perdeu.", category: 'discipline' },
  { text: "Faça agora. Seu eu futuro vai agradecer.", category: 'discipline' },
  { text: "O sucesso não é dado. É conquistado.", category: 'discipline' },
  { text: "Cada repetição conta. Cada esforço conta.", category: 'discipline' },
  { text: "A consistência vence o talento.", category: 'discipline' },
  { text: "Faça hoje o que outros não querem para ter amanhã o que outros não terão.", category: 'discipline' },
  { text: "Campeões são feitos quando ninguém está olhando.", category: 'discipline' },
  { text: "A rotina vence a exceção todos os dias.", category: 'discipline' },
  { text: "Domine a disciplina, domine sua vida.", category: 'discipline' },
  { text: "O segredo do sucesso: faça mesmo quando não tiver vontade.", category: 'discipline' },
  { text: "A disciplina é a ponte entre seus objetivos e suas conquistas.", category: 'discipline' },
  { text: "Sem progresso sem disciplina. Sem disciplina sem sacrifício.", category: 'discipline' },
];

const PT_MENTAL: Citation[] = [
  { text: "Seu único limite é você.", category: 'mental' },
  { text: "Silencie a voz que diz que você não consegue.", category: 'mental' },
  { text: "Eles não acreditavam em mim. Agora me assistem.", category: 'mental' },
  { text: "O medo mata mais sonhos que o fracasso.", category: 'mental' },
  { text: "Torne-se a pessoa que você gostaria de ter como modelo.", category: 'mental' },
  { text: "O conforto é inimigo do progresso.", category: 'mental' },
  { text: "Sofra agora e viva o resto da sua vida como campeão.", category: 'mental' },
  { text: "O que não te mata te torna mais forte.", category: 'mental' },
  { text: "A dúvida mata mais sonhos que o fracasso.", category: 'mental' },
  { text: "Transforme sua dor em poder.", category: 'mental' },
  { text: "A mente lidera, o corpo segue.", category: 'mental' },
  { text: "Acredite em si mesmo mais do que em suas dúvidas.", category: 'mental' },
  { text: "Sua mente é sua arma mais poderosa.", category: 'mental' },
  { text: "A força não vem do corpo. Vem da vontade.", category: 'mental' },
  { text: "Se você pensa que pode ou não pode, você está certo.", category: 'mental' },
  { text: "O sucesso começa na sua cabeça antes de aparecer no seu corpo.", category: 'mental' },
  { text: "Seus pensamentos se tornam sua realidade. Escolha-os bem.", category: 'mental' },
  { text: "Uma mente fraca encontra mil desculpas. Uma mente forte encontra mil soluções.", category: 'mental' },
  { text: "A zona de conforto é um lugar bonito, mas nada cresce lá.", category: 'mental' },
  { text: "O fracasso só existe se você desistir.", category: 'mental' },
];

const PT_WARRIOR: Citation[] = [
  { text: "Um campeão não treina para a luta. Treina para nunca perder.", category: 'warrior' },
  { text: "A luta não é contra os outros. É contra você mesmo.", category: 'warrior' },
  { text: "Cada dia é uma batalha. Esteja pronto.", category: 'warrior' },
  { text: "Um verdadeiro campeão se levanta uma vez a mais do que cai.", category: 'warrior' },
  { text: "Não reze por uma vida fácil. Reze pela força de enfrentar uma difícil.", category: 'warrior' },
  { text: "O ringue nunca mente.", category: 'warrior' },
  { text: "Treine como se fosse o segundo. Lute como se fosse o primeiro.", category: 'warrior' },
  { text: "A vitória ama a preparação.", category: 'warrior' },
  { text: "Mostre a eles por que deveriam ter acreditado em você.", category: 'warrior' },
  { text: "Seja o campeão, não o espectador.", category: 'warrior' },
  { text: "Um campeão cai mas nunca fica no chão.", category: 'warrior' },
  { text: "Na arena, só existe você e sua coragem.", category: 'warrior' },
  { text: "Guerreiros não nascem, são forjados.", category: 'warrior' },
  { text: "Um atleta não conta repetições. Começa a contar quando dói.", category: 'warrior' },
  { text: "O suor é a prova de que você não desistiu.", category: 'warrior' },
  { text: "O campo de batalha não perdoa fraqueza.", category: 'warrior' },
  { text: "Você joga como treina. Treine como um campeão.", category: 'warrior' },
  { text: "Lendas não nascem. São construídas repetição por repetição.", category: 'warrior' },
  { text: "A verdadeira luta começa quando seu corpo diz pare mas sua mente diz continue.", category: 'warrior' },
  { text: "Cada gota de suor te aproxima da vitória.", category: 'warrior' },
];

const PT_PERSEVERANCE: Citation[] = [
  { text: "Não acabou até você vencer.", category: 'perseverance' },
  { text: "Campeões continuam quando não podem mais continuar.", category: 'perseverance' },
  { text: "O único treino ruim é o que não aconteceu.", category: 'perseverance' },
  { text: "Você é mais forte do que pensa.", category: 'perseverance' },
  { text: "Quanto mais você sua no treino, menos sangra na batalha.", category: 'perseverance' },
  { text: "Nunca desista de um sonho pelo tempo que vai levar. O tempo vai passar de qualquer forma.", category: 'perseverance' },
  { text: "A diferença entre tentar e conseguir é não parar.", category: 'perseverance' },
  { text: "Quando é difícil, é quando você cresce.", category: 'perseverance' },
  { text: "Resultados vêm com o tempo, não amanhã.", category: 'perseverance' },
  { text: "Continue mesmo quando quiser parar. É aí que tudo muda.", category: 'perseverance' },
  { text: "Cada passo te aproxima do seu objetivo.", category: 'perseverance' },
  { text: "O sucesso é a soma de pequenos esforços repetidos dia após dia.", category: 'perseverance' },
  { text: "A persistência vence a resistência.", category: 'perseverance' },
  { text: "Não importa quantas vezes você cai, mas quantas vezes se levanta.", category: 'perseverance' },
  { text: "Roma não foi construída em um dia, mas colocavam tijolos todos os dias.", category: 'perseverance' },
  { text: "A maratona é corrida passo a passo. Foque no próximo passo.", category: 'perseverance' },
  { text: "Rios cortam rochas não pela força, mas pela persistência.", category: 'perseverance' },
  { text: "Todo expert foi um iniciante persistente.", category: 'perseverance' },
  { text: "O sucesso pertence aos que continuam quando todos desistiram.", category: 'perseverance' },
  { text: "Pouco a pouco, o pássaro constrói seu ninho. Continue avançando.", category: 'perseverance' },
];

const ALL_PT: Citation[] = [...PT_MOTIVATION, ...PT_DISCIPLINE, ...PT_MENTAL, ...PT_WARRIOR, ...PT_PERSEVERANCE];

// ═══════════════════════════════════════════════
// RUSSIAN QUOTES
// ═══════════════════════════════════════════════

const RU_MOTIVATION: Citation[] = [
  { text: "Боль временна. Отказ — навсегда.", category: 'motivation' },
  { text: "Ты никогда не узнаешь, как далеко можешь зайти, если не попробуешь.", category: 'motivation' },
  { text: "Когда хочешь сдаться, вспомни, зачем начал.", category: 'motivation' },
  { text: "Успех — это упасть семь раз и подняться восемь.", category: 'motivation' },
  { text: "Твой единственный соперник — это ты сам.", category: 'motivation' },
  { text: "Отговорки не сжигают калории.", category: 'motivation' },
  { text: "Либо найди путь, либо создай его.", category: 'motivation' },
  { text: "Тело сдаётся раньше разума. Тренируй свой разум.", category: 'motivation' },
  { text: "Каждый чемпион когда-то был новичком, который не сдался.", category: 'motivation' },
  { text: "Лучшее время начать было вчера. Второе лучшее — сейчас.", category: 'motivation' },
  { text: "Твоё единственное соревнование — с тем, кем ты был вчера.", category: 'motivation' },
  { text: "Если это тебя не бросает вызов, это тебя не изменит.", category: 'motivation' },
  { text: "Мечтай по-крупному. Работай усердно. Оставайся скромным.", category: 'motivation' },
  { text: "Великие мечты начинаются с маленьких действий.", category: 'motivation' },
  { text: "Ты способен на гораздо большее, чем думаешь.", category: 'motivation' },
  { text: "Каждый день — новый шанс стать лучше.", category: 'motivation' },
  { text: "Не позволяй вчерашнему дню занимать слишком много сегодняшнего.", category: 'motivation' },
  { text: "Единственный предел — тот, что ты сам себе устанавливаешь.", category: 'motivation' },
  { text: "Делай это со страстью или не делай вообще.", category: 'motivation' },
  { text: "Кто хочет — тот может.", category: 'motivation' },
];

const RU_DISCIPLINE: Citation[] = [
  { text: "Талант — это 1%. Упорный труд — 99%.", category: 'discipline' },
  { text: "Пока ты спишь, кто-то тренируется.", category: 'discipline' },
  { text: "Дисциплина делает то, что не может мотивация.", category: 'discipline' },
  { text: "Без оправданий. Без коротких путей. Без ограничений.", category: 'discipline' },
  { text: "Упорный труд побеждает талант, когда талант не работает.", category: 'discipline' },
  { text: "То, что ты делаешь, когда никто не смотрит, определяет, кто ты.", category: 'discipline' },
  { text: "Когда-нибудь или день первый. Ты решаешь.", category: 'discipline' },
  { text: "Сегодняшний пот — завтрашняя улыбка.", category: 'discipline' },
  { text: "Ты никогда не пожалеешь о тренировке. Пожалеешь о пропущенной.", category: 'discipline' },
  { text: "Сделай это сейчас. Твоё будущее «я» поблагодарит тебя.", category: 'discipline' },
  { text: "Успех не дарят. Его зарабатывают.", category: 'discipline' },
  { text: "Каждое повторение важно. Каждое усилие важно.", category: 'discipline' },
  { text: "Постоянство побеждает талант.", category: 'discipline' },
  { text: "Делай сегодня то, что другие не хотят, чтобы завтра иметь то, что другие не будут.", category: 'discipline' },
  { text: "Чемпионы создаются, когда никто не смотрит.", category: 'discipline' },
  { text: "Рутина побеждает исключение каждый день.", category: 'discipline' },
  { text: "Овладей дисциплиной — овладеешь своей жизнью.", category: 'discipline' },
  { text: "Секрет успеха: делай это, даже когда не хочется.", category: 'discipline' },
  { text: "Дисциплина — мост между твоими целями и достижениями.", category: 'discipline' },
  { text: "Нет прогресса без дисциплины. Нет дисциплины без жертв.", category: 'discipline' },
];

const RU_MENTAL: Citation[] = [
  { text: "Твой единственный предел — это ты сам.", category: 'mental' },
  { text: "Заглуши голос, который говорит, что ты не можешь.", category: 'mental' },
  { text: "Они не верили в меня. Теперь они наблюдают за мной.", category: 'mental' },
  { text: "Страх убивает больше мечт, чем провал.", category: 'mental' },
  { text: "Стань тем, кого ты хотел бы иметь в качестве примера.", category: 'mental' },
  { text: "Комфорт — враг прогресса.", category: 'mental' },
  { text: "Страдай сейчас и живи остаток жизни как чемпион.", category: 'mental' },
  { text: "То, что тебя не убивает, делает тебя сильнее.", category: 'mental' },
  { text: "Сомнение убивает больше мечт, чем провал.", category: 'mental' },
  { text: "Преврати свою боль в силу.", category: 'mental' },
  { text: "Разум ведёт, тело следует.", category: 'mental' },
  { text: "Верь в себя сильнее, чем в свои сомнения.", category: 'mental' },
  { text: "Твой разум — твоё самое мощное оружие.", category: 'mental' },
  { text: "Сила идёт не от тела. Она идёт от воли.", category: 'mental' },
  { text: "Думаешь ли ты, что можешь или не можешь — ты прав.", category: 'mental' },
  { text: "Успех начинается в голове, прежде чем проявиться в теле.", category: 'mental' },
  { text: "Твои мысли становятся твоей реальностью. Выбирай их мудро.", category: 'mental' },
  { text: "Слабый разум находит тысячу оправданий. Сильный разум находит тысячу решений.", category: 'mental' },
  { text: "Зона комфорта — приятное место, но там ничего не растёт.", category: 'mental' },
  { text: "Провал существует только если ты сдаёшься.", category: 'mental' },
];

const RU_WARRIOR: Citation[] = [
  { text: "Чемпион тренируется не для боя. Он тренируется, чтобы никогда не проигрывать.", category: 'warrior' },
  { text: "Борьба не с другими. Она с самим собой.", category: 'warrior' },
  { text: "Каждый день — это битва. Будь готов.", category: 'warrior' },
  { text: "Настоящий чемпион встаёт на один раз больше, чем падает.", category: 'warrior' },
  { text: "Не молись о лёгкой жизни. Молись о силе выдержать трудную.", category: 'warrior' },
  { text: "Ринг никогда не лжёт.", category: 'warrior' },
  { text: "Тренируйся, будто ты второй. Сражайся, будто ты первый.", category: 'warrior' },
  { text: "Победа любит подготовку.", category: 'warrior' },
  { text: "Покажи им, почему они должны были верить в тебя.", category: 'warrior' },
  { text: "Будь чемпионом, а не зрителем.", category: 'warrior' },
  { text: "Чемпион падает, но никогда не остаётся на земле.", category: 'warrior' },
  { text: "На арене только ты и твоя смелость.", category: 'warrior' },
  { text: "Воины не рождаются, они выковываются.", category: 'warrior' },
  { text: "Атлет не считает повторения. Он начинает считать, когда становится больно.", category: 'warrior' },
  { text: "Пот — доказательство того, что ты не сдался.", category: 'warrior' },
  { text: "Поле битвы не прощает слабости.", category: 'warrior' },
  { text: "Ты играешь так, как тренируешься. Тренируйся как чемпион.", category: 'warrior' },
  { text: "Легенды не рождаются. Они строятся повторение за повторением.", category: 'warrior' },
  { text: "Настоящий бой начинается, когда тело говорит стоп, но разум говорит продолжай.", category: 'warrior' },
  { text: "Каждая капля пота приближает тебя к победе.", category: 'warrior' },
];

const RU_PERSEVERANCE: Citation[] = [
  { text: "Не конец, пока ты не победил.", category: 'perseverance' },
  { text: "Чемпионы продолжают, когда уже не могут продолжать.", category: 'perseverance' },
  { text: "Единственная плохая тренировка — та, которой не было.", category: 'perseverance' },
  { text: "Ты сильнее, чем думаешь.", category: 'perseverance' },
  { text: "Чем больше потеешь на тренировке, тем меньше истекаешь кровью в бою.", category: 'perseverance' },
  { text: "Никогда не отказывайся от мечты из-за времени, которое потребуется. Время пройдёт в любом случае.", category: 'perseverance' },
  { text: "Разница между попыткой и успехом — не останавливаться.", category: 'perseverance' },
  { text: "Когда трудно — тогда ты растёшь.", category: 'perseverance' },
  { text: "Результаты приходят со временем, не завтра.", category: 'perseverance' },
  { text: "Продолжай, даже когда хочешь остановиться. Там всё меняется.", category: 'perseverance' },
  { text: "Каждый шаг приближает тебя к цели.", category: 'perseverance' },
  { text: "Успех — это сумма маленьких усилий, повторяемых день за днём.", category: 'perseverance' },
  { text: "Настойчивость побеждает сопротивление.", category: 'perseverance' },
  { text: "Важно не сколько раз ты падаешь, а сколько раз встаёшь.", category: 'perseverance' },
  { text: "Рим не был построен за день, но они клали кирпичи каждый день.", category: 'perseverance' },
  { text: "Марафон бегут шаг за шагом. Сосредоточься на следующем шаге.", category: 'perseverance' },
  { text: "Реки прорезают скалы не силой, а настойчивостью.", category: 'perseverance' },
  { text: "Каждый эксперт когда-то был настойчивым новичком.", category: 'perseverance' },
  { text: "Успех принадлежит тем, кто продолжает, когда все сдались.", category: 'perseverance' },
  { text: "Понемногу птица строит своё гнездо. Продолжай двигаться вперёд.", category: 'perseverance' },
];

const ALL_RU: Citation[] = [...RU_MOTIVATION, ...RU_DISCIPLINE, ...RU_MENTAL, ...RU_WARRIOR, ...RU_PERSEVERANCE];

// ═══════════════════════════════════════════════
// CHINESE QUOTES
// ═══════════════════════════════════════════════

const ZH_MOTIVATION: Citation[] = [
  { text: "疼痛是暂时的，放弃是永恒的。", category: 'motivation' },
  { text: "不尝试，你永远不知道自己能走多远。", category: 'motivation' },
  { text: "当你想放弃时，记住你为什么开始。", category: 'motivation' },
  { text: "成功是跌倒七次，第八次站起来。", category: 'motivation' },
  { text: "你唯一的对手是你自己。", category: 'motivation' },
  { text: "借口不燃烧卡路里。", category: 'motivation' },
  { text: "要么找到一条路，要么开创一条路。", category: 'motivation' },
  { text: "身体比意志先放弃。锻炼你的意志。", category: 'motivation' },
  { text: "每个冠军曾经都是一个不肯放弃的初学者。", category: 'motivation' },
  { text: "开始的最佳时机是昨天，其次是现在。", category: 'motivation' },
  { text: "你唯一的竞争对手是昨天的自己。", category: 'motivation' },
  { text: "如果它不挑战你，它就不会改变你。", category: 'motivation' },
  { text: "梦想要大，工作要努力，保持谦虚。", category: 'motivation' },
  { text: "伟大的梦想从小小的行动开始。", category: 'motivation' },
  { text: "你比你想象的更有能力。", category: 'motivation' },
  { text: "每一天都是变得更好的新机会。", category: 'motivation' },
  { text: "不要让昨天占用今天太多时间。", category: 'motivation' },
  { text: "唯一的限制是你给自己设定的。", category: 'motivation' },
  { text: "带着热情去做，或者根本不要做。", category: 'motivation' },
  { text: "有志者事竟成。", category: 'motivation' },
];

const ZH_DISCIPLINE: Citation[] = [
  { text: "天才是1%，努力是99%。", category: 'discipline' },
  { text: "当你睡觉时，有人在训练。", category: 'discipline' },
  { text: "自律能做到动力做不到的事情。", category: 'discipline' },
  { text: "没有借口，没有捷径，没有限制。", category: 'discipline' },
  { text: "当天才不努力时，努力会打败天才。", category: 'discipline' },
  { text: "没人看时你做什么定义了你是谁。", category: 'discipline' },
  { text: "某一天还是第一天，你来决定。", category: 'discipline' },
  { text: "今天的汗水是明天的微笑。", category: 'discipline' },
  { text: "你永远不会后悔一次训练，只会后悔错过的那次。", category: 'discipline' },
  { text: "现在就做，未来的你会感谢你。", category: 'discipline' },
  { text: "成功不是赐予的，是赢得的。", category: 'discipline' },
  { text: "每一次重复都很重要，每一份努力都很重要。", category: 'discipline' },
  { text: "坚持战胜天赋。", category: 'discipline' },
  { text: "今天做别人不愿做的事，明天拥有别人得不到的东西。", category: 'discipline' },
  { text: "冠军是在无人注视时塑造的。", category: 'discipline' },
  { text: "日常打败例外，每一天。", category: 'discipline' },
  { text: "掌握自律，掌握你的人生。", category: 'discipline' },
  { text: "成功的秘诀：即使不想也要去做。", category: 'discipline' },
  { text: "自律是目标与成就之间的桥梁。", category: 'discipline' },
  { text: "没有自律就没有进步，没有牺牲就没有自律。", category: 'discipline' },
];

const ZH_MENTAL: Citation[] = [
  { text: "你唯一的限制是你自己。", category: 'mental' },
  { text: "让那个说你不能的声音闭嘴。", category: 'mental' },
  { text: "他们不相信我，现在他们在看着我。", category: 'mental' },
  { text: "恐惧比失败杀死更多的梦想。", category: 'mental' },
  { text: "成为你希望拥有的榜样那样的人。", category: 'mental' },
  { text: "舒适是进步的敌人。", category: 'mental' },
  { text: "现在受苦，余生像冠军一样生活。", category: 'mental' },
  { text: "杀不死你的会让你更强大。", category: 'mental' },
  { text: "怀疑比失败杀死更多的梦想。", category: 'mental' },
  { text: "把你的痛苦转化为力量。", category: 'mental' },
  { text: "意志引领，身体跟随。", category: 'mental' },
  { text: "相信自己，比相信怀疑更坚定。", category: 'mental' },
  { text: "你的意志是你最强大的武器。", category: 'mental' },
  { text: "力量不来自身体，来自意志。", category: 'mental' },
  { text: "无论你认为你能还是不能，你都是对的。", category: 'mental' },
  { text: "成功先在脑海中开始，然后才在身体上显现。", category: 'mental' },
  { text: "你的思想成为你的现实，明智地选择它们。", category: 'mental' },
  { text: "软弱的心智找到一千个借口，强大的心智找到一千个解决方案。", category: 'mental' },
  { text: "舒适区是个好地方，但那里什么也不会生长。", category: 'mental' },
  { text: "只有放弃才会失败。", category: 'mental' },
];

const ZH_WARRIOR: Citation[] = [
  { text: "冠军不是为了战斗而训练，而是为了永不失败而训练。", category: 'warrior' },
  { text: "战斗不是与他人，而是与自己。", category: 'warrior' },
  { text: "每一天都是一场战斗，做好准备。", category: 'warrior' },
  { text: "真正的冠军比跌倒多站起来一次。", category: 'warrior' },
  { text: "不要祈求轻松的生活，祈求有力量承受艰难的生活。", category: 'warrior' },
  { text: "擂台从不说谎。", category: 'warrior' },
  { text: "像第二名一样训练，像第一名一样战斗。", category: 'warrior' },
  { text: "胜利热爱准备。", category: 'warrior' },
  { text: "让他们看到为什么他们应该相信你。", category: 'warrior' },
  { text: "做冠军，不做观众。", category: 'warrior' },
  { text: "冠军会倒下，但永远不会躺在地上。", category: 'warrior' },
  { text: "在竞技场上，只有你和你的勇气。", category: 'warrior' },
  { text: "战士不是天生的，是锻造出来的。", category: 'warrior' },
  { text: "运动员不数次数，他们在疼痛时才开始数。", category: 'warrior' },
  { text: "汗水是你没有放弃的证明。", category: 'warrior' },
  { text: "战场不会原谅软弱。", category: 'warrior' },
  { text: "你怎么训练就怎么比赛。像冠军一样训练。", category: 'warrior' },
  { text: "传奇不是天生的，是一次次重复建立的。", category: 'warrior' },
  { text: "真正的战斗是当你的身体说停止但你的意志说继续。", category: 'warrior' },
  { text: "每一滴汗水都让你更接近胜利。", category: 'warrior' },
];

const ZH_PERSEVERANCE: Citation[] = [
  { text: "不到胜利不算结束。", category: 'perseverance' },
  { text: "冠军在无法继续时继续前进。", category: 'perseverance' },
  { text: "唯一糟糕的训练是没有发生的训练。", category: 'perseverance' },
  { text: "你比你想象的更强大。", category: 'perseverance' },
  { text: "训练时流的汗越多，战斗时流的血越少。", category: 'perseverance' },
  { text: "永远不要因为需要时间而放弃梦想，时间无论如何都会过去。", category: 'perseverance' },
  { text: "尝试和成功之间的区别是不放弃。", category: 'perseverance' },
  { text: "当困难时，那是你成长的时候。", category: 'perseverance' },
  { text: "结果需要时间，不是明天。", category: 'perseverance' },
  { text: "即使想停下来也要继续，那是一切改变的时候。", category: 'perseverance' },
  { text: "每一步都让你更接近目标。", category: 'perseverance' },
  { text: "成功是日复一日重复的小努力的总和。", category: 'perseverance' },
  { text: "坚持战胜阻力。", category: 'perseverance' },
  { text: "重要的不是你跌倒多少次，而是你站起来多少次。", category: 'perseverance' },
  { text: "罗马不是一天建成的，但他们每天都在砌砖。", category: 'perseverance' },
  { text: "马拉松是一步一步跑的。专注于下一步。", category: 'perseverance' },
  { text: "河流穿过岩石不是靠力量，而是靠坚持。", category: 'perseverance' },
  { text: "每个专家都曾是一个坚持不懈的初学者。", category: 'perseverance' },
  { text: "成功属于当所有人都放弃时还在坚持的人。", category: 'perseverance' },
  { text: "一点一点，鸟儿筑起它的巢。继续前进。", category: 'perseverance' },
];

const ALL_ZH: Citation[] = [...ZH_MOTIVATION, ...ZH_DISCIPLINE, ...ZH_MENTAL, ...ZH_WARRIOR, ...ZH_PERSEVERANCE];

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
// QUOTES BY LANGUAGE
// ═══════════════════════════════════════════════

const QUOTES_BY_LANGUAGE: Record<SupportedLanguage, Citation[]> = {
  fr: ALL_QUOTES,
  en: ALL_EN,
  es: ALL_ES,
  de: ALL_DE,
  it: ALL_IT,
  pt: ALL_PT,
  ru: ALL_RU,
  ar: ALL_AR,
  zh: ALL_ZH,
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
 * Obtient une citation aleatoire selon le style et la langue
 */
export const getRandomQuote = (style: CitationStyle = 'all', language: SupportedLanguage = 'fr'): Citation => {
  const allQuotes = QUOTES_BY_LANGUAGE[language] || ALL_QUOTES;
  // Filter by category if not 'all'
  const quotes = style === 'all' ? allQuotes : allQuotes.filter(q => q.category === style);
  const index = Math.floor(Math.random() * quotes.length);
  return quotes[index] || allQuotes[0];
};

/**
 * Obtient la citation du jour (deterministe basee sur la date)
 * Change chaque jour mais reste la meme toute la journee
 */
export const getDailyQuote = async (language: SupportedLanguage = 'fr'): Promise<Citation> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${LAST_CITATION_DATE_KEY}_${language}`;
    const citationKey = `${LAST_CITATION_KEY}_${language}`;
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
    const allQuotes = QUOTES_BY_LANGUAGE[language] || ALL_QUOTES;
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
    return getRandomQuote('all', language);
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
export const getDailyQuoteByStyle = (style: CitationStyle = 'all', language: SupportedLanguage = 'fr'): Citation => {
  const allQuotes = QUOTES_BY_LANGUAGE[language] || ALL_QUOTES;
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
export const forceNewCitation = async (language: SupportedLanguage = 'fr'): Promise<Citation> => {
  try {
    const style = await getCitationStyle();
    const citation = getRandomQuote(style, language);
    const today = new Date().toISOString().split('T')[0];
    const cacheKey = `${LAST_CITATION_DATE_KEY}_${language}`;
    const citationKey = `${LAST_CITATION_KEY}_${language}`;

    await AsyncStorage.setItem(cacheKey, today);
    await AsyncStorage.setItem(citationKey, JSON.stringify(citation));

    return citation;
  } catch (error) {
    logger.error('Erreur nouvelle citation:', error);
    return getRandomQuote('all', language);
  }
};

/**
 * Obtient juste le texte de la citation du jour (sans structure)
 */
export const getDailyQuoteText = async (language: SupportedLanguage = 'fr'): Promise<string> => {
  const citation = await getDailyQuote(language);
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
export const getSessionQuote = async (language: SupportedLanguage = 'fr'): Promise<Citation> => {
  try {
    const style = await getCitationStyle();
    const citation = getRandomQuote(style, language);

    // Sauvegarder pour cette session
    await AsyncStorage.setItem(SESSION_CITATION_KEY, JSON.stringify(citation));
    await AsyncStorage.setItem(SESSION_ID_KEY, generateSessionId());

    return citation;
  } catch (error) {
    logger.error('Erreur citation session:', error);
    return getRandomQuote('all', language);
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
