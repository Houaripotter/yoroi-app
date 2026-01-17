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
  it: ALL_EN, // Will be replaced with Italian
  pt: ALL_EN, // Will be replaced with Portuguese
  ru: ALL_EN, // Will be replaced with Russian
  ar: ALL_EN, // Will be replaced with Arabic
  zh: ALL_EN, // Will be replaced with Chinese
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
