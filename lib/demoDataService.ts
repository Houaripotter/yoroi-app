// ============================================
// DEMO DATA SERVICE - Profil Heny
// Genere des données realistes pour screenshots App Store
//
// SECURITE : backup automatique des vraies données avant injection
// + restauration complete quand on desactive le mode demo
// Les données utilisateur ne sont JAMAIS perdues.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';
import secureStorage from './security/secureStorage';
import {
  saveProfile,
  addClub,
  addWeight,
  addMeasurementRecord,
  addTraining,
  addWeeklyPlanItem,
  upsertSlotOccurrence,
  addCompetition,
  saveHealthData,
  initDatabase,
  exportAllData,
  importData,
  resetDatabase,
  addInjury,
} from './database';
import { addCombat } from './fighterModeService';
import { setGoal } from './trainingGoalsService';

// ============================================
// BACKUP / RESTORE KEYS
// ============================================

const DEMO_ACTIVE_KEY = '@yoroi_demo_data_active';
const DEMO_BACKUP_SQLITE_KEY = '@yoroi_demo_backup_sqlite';
const DEMO_BACKUP_ASYNC_KEY = '@yoroi_demo_backup_async';

// All AsyncStorage keys that the demo modifies
// These will be backed up and restored
// Clés SecureStore touchées par la démo (backup/restore via secureStorage)
const DEMO_SECURE_KEYS = [
  '@yoroi_current_weight',
  '@yoroi_target_weight',
  '@yoroi_sleep_entries',
  '@yoroi_mood_log',
];

const DEMO_ASYNC_KEYS = [
  '@yoroi_user_settings',
  '@yoroi_user_height',
  '@yoroi_user_sport',
  '@yoroi_user_mode',
  '@yoroi_gender',
  '@yoroi_belt',
  '@yoroi_start_weight',
  '@yoroi_first_use_date',
  '@yoroi_user_clubs',
  '@yoroi_favorite_sports',
  '@yoroi_training_loads',
  '@yoroi_sleep_goal',
  '@yoroi_sleep_longest_streak',
  '@yoroi_resting_heart_rate',
  '@yoroi_hrv_current',
  '@yoroi_spo2_current',
  '@yoroi_steps_today',
  '@yoroi_steps_goal',
  '@yoroi_distance_today',
  '@yoroi_distance_goal',
  '@yoroi_calories_today',
  '@yoroi_calories_goal',
  '@yoroi_hydration_log',
  '@yoroi_hydration_goal',
  'yoroi_benchmarks_v2',
  'yoroi_skills_v2',
  '@yoroi_unified_total_points',
  '@yoroi_unified_breakdown',
  '@yoroi_current_streak',
  '@yoroi_best_streak',
  '@yoroi_current_charge',
  '@yoroi_unlocked_badges',
  '@yoroi_badge_unlock_dates',
  '@yoroi_quests_state',
  '@yoroi_avatar_config',
  '@yoroi_weekly_challenge',
  '@yoroi_completed_challenges',
  '@yoroi_challenge_xp',
  '@yoroi_challenge_last_daily_reset',
  '@yoroi_challenge_last_weekly_reset',
  '@yoroi_challenge_last_monthly_reset',
  '@yoroi_personal_records',
  '@yoroi_health_daily_bonus',
  '@yoroi_health_bonus_history',
  '@yoroi_competitor_profile',
  '@yoroi_sparring_partners',
  '@yoroi_fasting_streak',
  '@yoroi_fasting_last_completed',
  '@yoroi_is_premium',
  '@yoroi_premium_expires_at',
  '@yoroi_premium_source',
];

// ============================================
// HELPERS
// ============================================

const generateId = (): string =>
  `demo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const rand = (min: number, max: number, decimals = 1): number =>
  parseFloat((min + Math.random() * (max - min)).toFixed(decimals));

const randInt = (min: number, max: number): number =>
  Math.floor(min + Math.random() * (max - min + 1));

const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

const fmtDate = (d: Date): string => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const addDays = (d: Date, n: number): Date => {
  const result = new Date(d);
  result.setDate(result.getDate() + n);
  return result;
};

const dow = (d: Date): number => d.getDay();

const fmtTime = (h: number, m: number): string =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

const JJB_THEMES = [
  'Passage de garde', 'Balayage', 'Triangle depuis garde fermee',
  'Kimura', 'Demi-garde', 'De la Riva', 'Takedowns', 'Back take',
  'Mount escapes', 'Side control', 'Knee cut', 'Etranglement arriere',
  'Arm drag', 'X-Guard', 'Berimbolo', 'Omoplata', 'Leg locks',
  'Guillotine', 'Darce choke', 'Anaconda', 'Open mat',
];

const MUSCU_MUSCLES: Record<string, string[]> = {
  'Push': ['chest', 'shoulders', 'triceps'],
  'Pull': ['back', 'biceps', 'forearms'],
  'Legs': ['quadriceps', 'hamstrings', 'glutes', 'calves'],
  'Full Body': ['chest', 'back', 'shoulders', 'quadriceps', 'core'],
};

// ============================================
// PARTENAIRES DE SPARRING (pour screenshots)
// ============================================
// Profs ceinture noire → meilleurs techniciens, victoires rares, nombreuses soumissions subies (apprentissage)
// Autres → niveau varié, interactions plus équilibrées

interface DemoPartner {
  name: string;
  belt: 'blanche' | 'bleue' | 'violette' | 'marron' | 'noire';
  skill: number;    // 1-10, influence winRate
  notes?: string;
}

const SPARRING_PARTNERS: DemoPartner[] = [
  { name: 'Professeur Veni',  belt: 'noire',    skill: 10, notes: 'Référence technique. Jeu de garde redoutable, passages précis.' },
  { name: 'Professeur Lucas', belt: 'noire',    skill: 10, notes: 'Style pressing, passages en force, top lourd.' },
  { name: 'Hedi',             belt: 'violette', skill: 8,  notes: 'Partenaire régulier. Jeu fluide, beaucoup de triangles.' },
  { name: 'Eliott',           belt: 'bleue',    skill: 6,  notes: 'Jeune, explosif, enchaînements rapides. En progrès.' },
  { name: 'Yanis',            belt: 'bleue',    skill: 6,  notes: 'Style wrestling, takedowns agressifs, peu de guard pull.' },
  { name: 'Larbi',            belt: 'marron',   skill: 9,  notes: 'Énorme pressure, étranglements mortels, patience inégalée.' },
];

const JJB_TECHNIQUES = [
  { label: 'Triangle', pts: 3 },
  { label: 'Kimura', pts: 3 },
  { label: 'Armbar', pts: 3 },
  { label: 'Étranglement arrière', pts: 3 },
  { label: 'Guillotine', pts: 3 },
  { label: 'Darce', pts: 3 },
  { label: 'Omoplata', pts: 3 },
  { label: 'Leg lock', pts: 3 },
  { label: 'Passage de garde', pts: 2 },
  { label: 'Berimbolo', pts: 2 },
  { label: 'Balayage De la Riva', pts: 2 },
  { label: 'Balayage papillon', pts: 2 },
  { label: 'Knee cut', pts: 2 },
  { label: 'Back take', pts: 2 },
  { label: 'Mount', pts: 2 },
  { label: 'Takedown double-leg', pts: 2 },
  { label: 'Garde fermée', pts: 1 },
  { label: 'Demi-garde', pts: 1 },
];

const SUBMISSIONS = [
  'Triangle', 'Kimura', 'Armbar', 'Étranglement arrière',
  'Guillotine', 'Darce', 'Omoplata', 'Ezekiel', 'Leg lock',
  'Americana', 'Crucifix', 'Papa-bear',
];

const GAME_PLANS = [
  'Jouer la garde fermée et chercher le triangle',
  'Passage knee-cut depuis combat grip',
  'Berimbolo + back take',
  'Pressure top, étouffer et chercher la mount',
  'Sortir en demi-garde profonde',
  'Prendre le dos tôt dans le round',
];

const WHAT_WORKED_SAMPLES = [
  'Belle entrée en garde fermée, j\'ai enchaîné sur un triangle',
  'Passage propre après feinte, j\'ai bien contrôlé la hanche',
  'Back take après balayage, le contrôle du dos a tenu',
  'Bon setup de kimura depuis demi-garde',
  'Pressure en top, j\'ai vidé son gaz',
];

const WHAT_DIDNT_WORK_SAMPLES = [
  'Je me suis laissé passer la demi-garde trop vite',
  'Mon étranglement n\'était pas assez serré',
  'Trop statique, je n\'ai pas créé de mouvement',
  'Grip cassé trop tôt',
  'J\'ai laissé l\'underhook, il est passé direct',
];

const IMPROVEMENT_SAMPLES = [
  'Travailler le contrôle des grips avant la tentative',
  'Caler le grappling timing sur le rythme adverse',
  'Drill la sortie de dos 15min par session',
  'Améliorer la pression en top',
  'Meilleure gestion du cardio sur les gros rounds',
];

const MOODS = ['fire', 'strong', 'focus', 'fire', 'strong', 'gassed', 'tired', 'focus'];

/**
 * Construit des rounds réalistes pour une session sparring.
 * Retourne : { rounds, technicalTheme, notes }
 */
function buildDemoRounds(sessionType: 'sparring' | 'open_mat' | 'cours', dateStr: string): any[] {
  const count = sessionType === 'open_mat' ? randInt(6, 10) : randInt(4, 7);
  const rounds: any[] = [];

  // Sélectionner 2-4 partenaires pour cette session (sur les 6 disponibles)
  const nb = randInt(2, 4);
  const pool = [...SPARRING_PARTNERS].sort(() => Math.random() - 0.5).slice(0, nb);

  for (let i = 1; i <= count; i++) {
    const partner = pool[i % pool.length];

    // Résultat selon skill : plus skill élevé, plus de chances de perdre.
    // RESPECT CEINTURES NOIRES : contre un prof noir, on ne gagne JAMAIS (loss ou draw uniquement).
    let result: 'win' | 'loss' | 'draw';
    if (partner.belt === 'noire') {
      // 80% loss, 20% draw — jamais de win contre un prof ceinture noire
      result = Math.random() < 0.8 ? 'loss' : 'draw';
    } else {
      const skillDiff = partner.skill - 7; // Heny ~ niveau 7 (ceinture bleue)
      const winChance = Math.max(0.1, Math.min(0.8, 0.5 - skillDiff * 0.1));
      const drawChance = 0.15;
      const r = Math.random();
      result = r < winChance ? 'win' : r < winChance + drawChance ? 'draw' : 'loss';
    }

    // Techniques utilisées dans ce round (1-4)
    const usedTechs = [...JJB_TECHNIQUES]
      .sort(() => Math.random() - 0.5)
      .slice(0, randInt(1, 4))
      .map(t => ({ label: t.label, pts: t.pts, count: randInt(1, 3) }));

    const methodsGiven: string[] = [];
    const methodsTaken: string[] = [];
    if (partner.belt === 'noire') {
      // Contre un prof noir : AUCUNE soumission donnée, 1-3 soumissions subies
      const nbSubs = result === 'loss' ? randInt(1, 3) : randInt(0, 1);
      for (let j = 0; j < nbSubs; j++) methodsTaken.push(pick(SUBMISSIONS));
    } else if (result === 'win') {
      // Gagné : 1-2 soumissions données
      methodsGiven.push(pick(SUBMISSIONS));
      if (Math.random() > 0.7) methodsGiven.push(pick(SUBMISSIONS));
    } else if (result === 'loss') {
      // Perdu : 1-2 soumissions subies
      const nbSubs = randInt(1, 2);
      for (let j = 0; j < nbSubs; j++) methodsTaken.push(pick(SUBMISSIONS));
    } else {
      // Nul : parfois 1 soum des deux côtés
      if (Math.random() > 0.5) methodsGiven.push(pick(SUBMISSIONS));
      if (Math.random() > 0.5) methodsTaken.push(pick(SUBMISSIONS));
    }

    const intensity = i > count - 2 ? 'guerre' : pick(['technique', 'technique', 'guerre', 'detendu']);
    const selfRating = result === 'win' ? randInt(7, 10) : result === 'loss' ? randInt(4, 7) : randInt(5, 8);
    const partnerRating = Math.min(10, partner.skill + (Math.random() > 0.5 ? 0 : -1));

    const round: any = {
      number: i,
      partner: partner.name,
      partnerRating,
      result,
      methodsGiven,
      methodsTaken,
      submissionsGiven: methodsGiven.length,
      submissionsTaken: methodsTaken.length,
      pointsFor: result === 'win' ? randInt(2, 8) : randInt(0, 3),
      pointsAgainst: result === 'loss' ? randInt(2, 8) : randInt(0, 3),
      roundIntensity: intensity,
      usedTechniques: usedTechs,
      selfRating,
      mood: pick(MOODS),
      energyLevel: Math.max(3, 10 - i),
    };

    // 95% de chance d'avoir du contenu narratif (screenshots → on veut que ça soit plein)
    if (Math.random() > 0.05) {
      round.gamePlan = pick(GAME_PLANS);
      round.whatWorked = pick(WHAT_WORKED_SAMPLES);
      round.whatDidntWork = pick(WHAT_DIDNT_WORK_SAMPLES);
      round.improvement = pick(IMPROVEMENT_SAMPLES);
      // Contre-technique si perdu
      if (result === 'loss' && Math.random() > 0.5) {
        round.counteredBy = `${partner.name} a ${pick(['passé ma garde en knee-cut', 'pris mon dos sur une erreur de hanche', 'utilisé un crossface pour m\'écraser', 'enchaîné sur un étranglement arrière'])}`;
      }
    }

    rounds.push(round);
  }

  return rounds;
}

/**
 * Fiches complètes pour chaque partenaire : forces/faiblesses/ce-qui-marche/notes tactiques.
 * Utilisé par l'écran sparring-partners.tsx pour le détail riche.
 */
const PARTNER_SCOUTING_REPORTS: Record<string, {
  strengths: string[];
  weaknesses: string[];
  whatWorks: string[];
  tacticalNotes: string[];
  matchCount: number;
  wins: number;
  losses: number;
  draws: number;
  weight: string;
  activeGoal?: string;
}> = {
  'Professeur Veni': {
    strengths: [
      'Contrôle des grips imparable',
      'Passage de garde pressure incroyable',
      'Lecture du sparring, toujours 2 coups d\'avance',
      'Back take depuis n\'importe quelle position',
    ],
    weaknesses: [
      '(aucune vraie faiblesse — ceinture noire 3e degré)',
    ],
    whatWorks: [
      'Rester calme et ne pas paniquer quand il prend la position',
      'Bouger constamment les hanches pour ne pas se faire figer',
      'Survivre les 5min est déjà une victoire',
    ],
    tacticalNotes: [
      'Il casse toujours les grips en serrant les doigts, pas en tirant. Contre-grip intérieur.',
      'Son jeu favori = pressure passing → side control → mount. Anticiper.',
      'Si je bouge trop vite, il m\'attend. Si je bouge trop lentement, il passe. Trouver le juste milieu.',
      'Aujourd\'hui il m\'a chopé 3 fois sur le même triangle setup. À drill.',
      'Il m\'a dit : "Tes grips sont bons mais tu les poses trop tôt. Attend le bon moment."',
    ],
    matchCount: 52, wins: 0, losses: 41, draws: 11,
    weight: '78 kg',
    activeGoal: 'Survivre 5 rounds complets sans soumission',
  },
  'Professeur Lucas': {
    strengths: [
      'Top pressure énorme, impossible à pousser',
      'Crossface dévastateur',
      'Leg locks, surtout heel hook no-gi',
      'Calme absolu, ne se précipite jamais',
    ],
    weaknesses: [
      '(ceinture noire — cherche pas de faiblesses)',
    ],
    whatWorks: [
      'Le frame précoce avant qu\'il ne pose la pression',
      'Ne pas accepter la mount passivement',
      'Donner les grips, ne pas se battre pour des grips qu\'on va perdre',
    ],
    tacticalNotes: [
      'Style completement opposé à Prof Veni. Lui c\'est pressure, Veni c\'est technique.',
      'Son heel hook vient toujours depuis saddle / 411. Éviter cette position en no-gi.',
      'Il m\'a soumis 4 fois aujourd\'hui, toutes des étranglements.',
      'Il est généreux avec les feedbacks pendant les rounds. Écouter à fond.',
      'Ses passages de garde : "Ne pousse pas les jambes, décolle le bas du dos."',
    ],
    matchCount: 38, wins: 0, losses: 30, draws: 8,
    weight: '82 kg',
    activeGoal: 'Tenir un round entier sans perdre la position dominante',
  },
  'Larbi': {
    strengths: [
      'Pressure top redoutable',
      'Étranglements arrière très propres',
      'Cardio infini (il est frais au round 10)',
      'Jeu mental : il attend ton erreur, il ne force jamais',
    ],
    weaknesses: [
      'Moins à l\'aise en garde ouverte quand il est en dessous',
      'Takedowns basiques, pas de wrestling avancé',
      'Transitions latérales un peu lentes',
    ],
    whatWorks: [
      'Jouer la garde ouverte tôt pour l\'empêcher de poser la pression',
      'Bouger constamment en bottom — un Larbi statique = un Larbi qui passe',
      'Défendre préventivement les étranglements arrière (main sur le cou)',
    ],
    tacticalNotes: [
      'Partenaire de drilling préféré. Super honnête, corrige mes erreurs techniques.',
      'Il m\'étouffe systématiquement avec le même RNC. Drill la défense en priorité.',
      'Rounds avec lui = écoles de patience. Il m\'apprend à ne pas griller le gaz.',
      'Sa pression de passage est digne d\'une ceinture noire. Il est solide pour sa ceinture.',
      'Session d\'hier : je l\'ai tenu 4 minutes en demi-garde profonde. Premier vrai succès.',
    ],
    matchCount: 47, wins: 9, losses: 28, draws: 10,
    weight: '85 kg',
    activeGoal: 'Atteindre 20% de winrate contre lui (actuel 19%)',
  },
  'Hedi': {
    strengths: [
      'Triangle depuis la garde fermée redoutable',
      'Flexibilité au-dessus de la moyenne',
      'Transitions omoplata ↔ triangle fluides',
      'Bonne lecture du timing',
    ],
    weaknesses: [
      'Cardio moyen — gaz après 6 rounds',
      'Wrestling presque inexistant',
      'Parfois trop passif en top position',
    ],
    whatWorks: [
      'Rester actif, créer des scrambles pour griller son gaz',
      'Dominer debout pour le forcer en défense dès le départ',
      'Défendre tôt les triangles, garder posture haute en garde',
    ],
    tacticalNotes: [
      'Partenaire régulier depuis 8 mois. Les rolls avec lui me font progresser.',
      'Son triangle m\'a chopé 6 fois avant que je trouve la défense.',
      'Il est trop confortable quand je lui donne la garde. Ne jamais pull guard contre lui.',
      'Weekend open mat : 3 wins / 2 losses sur 5 rounds. Match équilibré.',
      'Il bosse le berimbolo en ce moment. Attention aux entrées DLR.',
    ],
    matchCount: 68, wins: 32, losses: 28, draws: 8,
    weight: '76 kg',
    activeGoal: 'Gagner 60% des rounds (actuel 47%)',
  },
  'Yanis': {
    strengths: [
      'Takedowns explosifs (fond wrestling)',
      'Double-leg en force de la nature',
      'Jeu top avec beaucoup d\'énergie',
    ],
    weaknesses: [
      'Très peu de jeu de garde — se fait passer facilement',
      'Étranglements subis facilement',
      'Gestion du cardio médiocre',
      'Pas patient, il force tout',
    ],
    whatWorks: [
      'Défense de takedown : whizzer + sprawl dès qu\'il change de niveau',
      'Guillotine sur son shoot (il plonge tête en avant)',
      'Le laisser se fatiguer, attendre la bonne ouverture',
      'Préparer un gameplan de soumission pour le round 1 avant qu\'il ne gaze',
    ],
    tacticalNotes: [
      'Gagne souvent le takedown mais perd souvent au sol. Le laisser en top puis balayer.',
      'Sa guillotine à lui est faible, pas d\'inquiétude si on saute dans sa garde.',
      'Je l\'ai guillotiné 2 fois cette semaine sur son double-leg. Il apprend pas.',
      'Ultra-motivé, toujours à fond. Respecte mais attention : dangereux si on le sous-estime.',
    ],
    matchCount: 43, wins: 27, losses: 13, draws: 3,
    weight: '80 kg',
  },
  'Eliott': {
    strengths: [
      'Explosivité et rapidité',
      'Bon instinct pour les balayages',
      'Jeune, motivé, progresse vite',
    ],
    weaknesses: [
      'Technique encore en construction',
      'Manque d\'expérience en sparring long',
      'Panique quand il est dominé',
    ],
    whatWorks: [
      'Le calmer dès le premier round en imposant un rythme technique',
      'Attendre ses erreurs — il en fait beaucoup',
      'Le pousser en défense tôt, avant qu\'il ne se sente confortable',
    ],
    tacticalNotes: [
      'Ceinture bleue récente, énergie débordante. Bon partenaire pour drill les soumissions.',
      'Super positif, bonne mentalité. Toujours partant pour un roll supplémentaire.',
      'Je dois le forcer à ralentir pour qu\'il apprenne vraiment, pas juste qu\'il encaisse.',
    ],
    matchCount: 31, wins: 24, losses: 5, draws: 2,
    weight: '72 kg',
  },
};

async function seedSparringPartners(): Promise<void> {
  const nowIso = new Date().toISOString();

  const partners = SPARRING_PARTNERS.map(p => {
    const scout = PARTNER_SCOUTING_REPORTS[p.name];
    const notes = scout?.tacticalNotes.map(content => ({
      id: generateId(),
      date: new Date(Date.now() - randInt(3, 90) * 86400000).toISOString(),
      content,
    })) || [];
    return {
      id: generateId(),
      name: p.name,
      belt: p.belt,
      weight: scout?.weight || '',
      sport: 'jjb',
      strengths: scout?.strengths || [],
      weaknesses: scout?.weaknesses || [],
      whatWorks: scout?.whatWorks || [],
      notes,
      matchCount: scout?.matchCount || 0,
      wins: scout?.wins || 0,
      losses: scout?.losses || 0,
      draws: scout?.draws || 0,
      createdAt: nowIso,
      activeGoal: scout?.activeGoal
        ? { text: scout.activeGoal, createdAt: nowIso }
        : undefined,
    };
  });
  await AsyncStorage.setItem('@yoroi_sparring_partners', JSON.stringify(partners));
}

// ============================================
// GAME PLANS SESSION (niveau session, plus détaillés que par round)
// ============================================

const SESSION_GAME_PLANS = [
  'Focus sur la garde fermée et le triangle. Garder les grips longs.',
  'Travailler le passage knee-cut tout le long. Pas de pull guard.',
  'Jouer le dos dès que possible, drill berimbolo en isolation au warm-up.',
  'Pressure passing + mount. Pas jouer la garde ce soir.',
  'Rester calme, économiser le gaz, jouer défensif puis contre-attaquer.',
  'Spam les étranglements arrière. Build le dos fort.',
  'Travailler la demi-garde profonde et la remontée. Pas de garde fermée.',
  'Tester les leg entries en no-gi. Objectif : 3 tentatives par round.',
  'Focus lutte debout. Prendre 1 takedown par round minimum.',
  'Récupération active : rouler léger, technique uniquement, 0 ego.',
  'Pratiquer les retournements depuis side control. 10 mouvements par round.',
  'Cours du jour : spider guard. Appliquer direct en sparring.',
];

const SESSION_WHAT_WORKED = [
  'Le triangle depuis la garde fermée est resté solide toute la session.',
  'Bonne lecture des timings sur les passages. Plus fluide que d\'habitude.',
  'Garde fermée + étranglement cross collar a fonctionné 2 fois.',
  'J\'ai tenu le dos pendant 4 rounds d\'affilée, gros progrès.',
  'Le Prof Veni m\'a corrigé les grips, différence énorme.',
  'Kimura depuis demi-garde plus propre grâce aux drills de la semaine.',
  'La récupération entre rounds est 2x meilleure qu\'il y a un mois.',
  'Passage knee-cut automatique maintenant, ça sort sans réfléchir.',
  'Mental solide contre les profs, aucune frustration.',
  'Setup de back take depuis demi-garde validé 3 fois.',
  'Défense du triangle améliorée, plus aucune prise ce soir.',
  'Score de points constant sur les passages, bon timing.',
];

const SESSION_WHAT_DIDNT_WORK = [
  'Toujours trop statique en garde. Il faut créer des mouvements.',
  'Cardio en baisse sur les 2 derniers rounds, je tombe en qualité.',
  'Je laisse passer Yanis sur le takedown double-leg à chaque fois.',
  'Mes grips lâchent trop vite face à Larbi. À travailler.',
  'Le berimbolo manque de propreté, je me retrouve en side control.',
  'Défense des back takes médiocre contre les profs.',
  'Trop d\'énergie dépensée sur les premiers rounds, je paye à la fin.',
  'Je tiens trop la garde fermée, je dois ouvrir plus vite pour scorer.',
  'Les grips cassent trop facilement face aux ceintures supérieures.',
  'Hésitation sur les leg entries, à drill en iso.',
  'Sortie de side control pas assez fluide, plusieurs positions bloquées.',
  'Spam des mêmes techniques, il faut diversifier pour surprendre.',
];

const SESSION_MOODS = ['fire', 'strong', 'focus', 'gassed', 'tired', 'strong', 'fire'];

/**
 * Génère des notes riches pour un skill mastered/in_progress.
 */
function buildSkillNotes(
  status: 'mastered' | 'in_progress' | 'to_learn',
  skillName: string
): any[] {
  if (status === 'to_learn') return [];
  const notes: any[] = [];
  const count = status === 'mastered' ? randInt(3, 5) : randInt(1, 3);

  const masteredTips: Record<string, string[]> = {
    'Triangle': [
      'Prof. Veni : couper l\'angle à 45° AVANT de serrer. Sans ça, l\'adversaire se dégage.',
      'Toujours contrôler la tête AVEC le bras extérieur, sinon il sort postures.',
      'Drill : 50 reps de finition depuis la garde fermée. Ça a tout changé.',
      'Si il se redresse, je bascule direct sur omoplata.',
      'Note session contre Larbi : son truc c\'est de plonger en avant, je dois reculer les hanches en même temps que je serre.',
    ],
    'Kimura': [
      'Prof. Lucas : verrouillage double-main AVANT tout mouvement de hanches.',
      'Depuis demi-garde top : coller l\'épaule au sol pour l\'immobiliser avant de tourner.',
      'Éviter de chercher le tap trop tôt. Build la position d\'abord.',
      'Contre Hedi : il défend bien en flexion, je dois le forcer à étendre le bras.',
    ],
    'Garde Fermée': [
      'Les hanches sont l\'arme, pas les bras. Push-pull constant.',
      'Grips : col + manche opposée. Toujours.',
      'Open la garde seulement pour setup une soum ou un balayage, jamais par fatigue.',
      'Contre Prof. Veni : il casse les grips en 2 secondes. Solution = chainer vite.',
    ],
    'Demi-Garde': [
      'Underhook = or. Sans underhook, je meurs.',
      'Knee-shield plus haut pour bloquer le passage en force de Prof. Lucas.',
      'Depuis deep half : bascule direct sur le single leg.',
    ],
    'Single Leg': [
      'Tête dedans, pas en dehors. Sinon tu prends une guillotine.',
      'Chain du takedown même si le premier run rate. Ne pas abandonner à mi-chemin.',
      'Yanis me passe à travers quand je baisse les yeux. Keep posture.',
    ],
    'Mount Escape': [
      'Le upa fonctionne seulement si les bras sont piégés. Sinon shrimp.',
      'Framer tôt, avant qu\'il ne stabilise la high mount.',
      'Prof. Lucas : "Une sortie de mount commence AVANT le mount." Sentir l\'entrée.',
      'Contre Larbi : il m\'étouffe en 10s si je bouge pas. Reflexe à drill.',
    ],
    'Side Control Escape': [
      'Replacer le coude intérieur en priorité. Sans ça, tout le reste casse.',
      'Knee-elbow escape quand il est dépressuré, underhook quand il est posé.',
      'Ne jamais pousser les épaules. C\'est le piège n°1.',
    ],
    'Back Control': [
      'Hooks + body lock = contrôle total. Pas de raccourci.',
      'Garder la tête collée à la sienne, sinon il retourne en escape.',
      'Setup favori : étranglement cross collar → RNC si échec.',
    ],
  };

  const inProgressTips: Record<string, string[]> = {
    'De la Riva': [
      'Encore du mal avec le grip de la manche. À retravailler.',
      'Le DLR X-guard transition est pas encore automatique.',
      'Prof. Veni m\'a montré le berimbolo setup, je dois drill.',
    ],
    'Knee Cut': [
      'Le shoulder-to-shoulder contact n\'est pas assez serré, je perds la pression.',
      'Quand l\'adversaire fait framing, je dois passer sur le knee-slice strict.',
    ],
    'Cle de Bras (Armbar)': [
      'Depuis la mount ça passe. Depuis la garde c\'est plus dur.',
      'Serrer le genou contre la tête avant de tirer le bras.',
    ],
    'Etranglement Arriere (RNC)': [
      'Hooks profonds, pas de crochets cassés.',
      'Main under chin, pas sur la mâchoire. Sinon il va dormir pour de mauvaises raisons.',
    ],
    'Heel Hook': [
      'Pas autorisé en IBJJF gi. Je drill en no-gi open mat.',
      'Encore flou sur les positions d\'entrée, besoin de séance dédiée avec Prof. Lucas.',
    ],
    'Double Leg': [
      'Level change trop lent, je me fais sprawl systématiquement.',
      'Drill le changement de niveau seul, 30 reps/jour.',
    ],
    'Berimbolo': [
      'Setup depuis De la Riva, pas depuis la garde fermée.',
      'Prof. Veni a montré la bascule arrière en 3 phases. À drill 100 reps.',
      'Pas encore clean contre résistance. Je finis en side control.',
    ],
    'Spider Guard': [
      'Grips sur les manches, pas les bouts de manche.',
      'Jambes actives, pas passives. Si tu sens les jambes immobiles, tu vas te faire passer.',
      'Bonne setup pour triangle et omoplata.',
    ],
    'Ezekiel Choke': [
      'Plus facile depuis la mount que depuis la garde adverse.',
      'Mieux marcher le positionnement du poignet intérieur.',
      'Hedi m\'a chopé là-dessus au dernier open mat. À pratiquer.',
    ],
    'Guillotine': [
      'Arrière du cou, pas la nuque. C\'est le détail qui change tout.',
      'Bon anti-takedown face à Yanis qui fonce tête en avant.',
      'Garder les coudes vers l\'intérieur sinon pas de squeeze.',
    ],
  };

  const generic = [
    'Notes prises après session sparring.',
    'À retravailler en drilling la semaine prochaine.',
    'Vidéo regardée : technique différente de ce qu\'on fait au club.',
    'Premier succès en sparring ce soir, sensation validée.',
  ];

  const pool = status === 'mastered'
    ? (masteredTips[skillName] || generic)
    : (inProgressTips[skillName] || generic);

  for (let i = 0; i < count && i < pool.length; i++) {
    notes.push({
      id: generateId(),
      text: pool[i],
      date: fmtDate(new Date(Date.now() - randInt(5, 120) * 86400000)),
    });
  }
  return notes;
}

// ============================================
// CHECK IF DEMO IS ACTIVE
// ============================================

export const isDemoDataActive = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(DEMO_ACTIVE_KEY);
  return val === 'true';
};

// ============================================
// BACKUP REAL DATA (before demo injection)
// ============================================

const backupRealData = async (): Promise<void> => {
  logger.info('[DemoData] Backing up real user data...');

  // 1. Backup SQLite via exportAllData
  const sqliteData = await exportAllData();
  await AsyncStorage.setItem(DEMO_BACKUP_SQLITE_KEY, JSON.stringify(sqliteData));

  // 2. Backup all AsyncStorage keys that demo will touch
  const asyncBackup: Record<string, string | null> = {};
  for (const key of DEMO_ASYNC_KEYS) {
    asyncBackup[key] = await AsyncStorage.getItem(key);
  }
  // Backup SecureStore keys
  const secureBackup: Record<string, any> = {};
  for (const key of DEMO_SECURE_KEYS) {
    secureBackup[key] = await secureStorage.getItem(key);
  }
  await AsyncStorage.setItem(DEMO_BACKUP_ASYNC_KEY, JSON.stringify({ async: asyncBackup, secure: secureBackup }));

  logger.info('[DemoData] Backup complete.');
};

// ============================================
// RESTORE REAL DATA (when disabling demo)
// ============================================

export const restoreRealData = async (): Promise<boolean> => {
  const isActive = await isDemoDataActive();
  if (!isActive) {
    logger.info('[DemoData] No demo data active, nothing to restore.');
    return false;
  }

  logger.info('[DemoData] Restoring real user data...');

  try {
    // 1. Reset all SQLite tables (clears demo data)
    await resetDatabase();

    // 2. Restore SQLite data from backup
    const sqliteBackupStr = await AsyncStorage.getItem(DEMO_BACKUP_SQLITE_KEY);
    if (sqliteBackupStr) {
      await importData(sqliteBackupStr);
      logger.info('[DemoData] SQLite data restored.');
    }

    // 3. Restore AsyncStorage + SecureStore keys from backup
    const asyncBackupStr = await AsyncStorage.getItem(DEMO_BACKUP_ASYNC_KEY);
    if (asyncBackupStr) {
      const parsed = JSON.parse(asyncBackupStr);
      // Support both old flat format and new { async, secure } format
      const asyncBackup: Record<string, string | null> = parsed.async ?? parsed;
      const secureBackup: Record<string, any> = parsed.secure ?? {};

      for (const key of DEMO_ASYNC_KEYS) {
        const value = asyncBackup[key];
        if (value !== null && value !== undefined) {
          await AsyncStorage.setItem(key, value);
        } else {
          await AsyncStorage.removeItem(key);
        }
      }

      for (const key of DEMO_SECURE_KEYS) {
        const value = secureBackup[key];
        if (value !== null && value !== undefined) {
          await secureStorage.setItem(key, value);
        } else {
          await secureStorage.removeItem(key);
        }
      }

      logger.info('[DemoData] AsyncStorage + SecureStore data restored.');
    }

    // 4. Clean up backup keys and flag
    await AsyncStorage.multiRemove([
      DEMO_ACTIVE_KEY,
      DEMO_BACKUP_SQLITE_KEY,
      DEMO_BACKUP_ASYNC_KEY,
    ]);

    logger.info('[DemoData] Restore complete. Real data is back.');
    return true;
  } catch (error) {
    logger.error('[DemoData] Restore failed:', error);
    throw error;
  }
};

// ============================================
// MAIN GENERATOR
// ============================================

export const generateHenyDemoData = async (): Promise<{
  workouts: number;
  weights: number;
  measurements: number;
  sleepEntries: number;
  benchmarks: number;
  skills: number;
}> => {
  await initDatabase();

  // ======= STEP 0: BACKUP REAL DATA =======
  const alreadyActive = await isDemoDataActive();
  if (!alreadyActive) {
    // Only backup if not already in demo mode (avoid backing up demo data)
    await backupRealData();
  }

  // ======= STEP 1: CLEAR EXISTING DATA =======
  await resetDatabase();
  // Clear AsyncStorage keys that demo will write to
  for (const key of DEMO_ASYNC_KEYS) {
    await AsyncStorage.removeItem(key);
  }

  // ======= STEP 2: INJECT DEMO DATA =======
  const startDate = new Date(2026, 0, 1);    // 1er janvier 2026
  const endDate = new Date(2027, 0, 31);     // 31 janvier 2027
  const totalDays = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  let workoutCount = 0;
  let weightCount = 0;
  let measurementCount = 0;
  let sleepCount = 0;

  // ========== 1. PROFILE ==========
  await saveProfile({
    name: 'Heny',
    height_cm: 178,
    target_weight: 80,
    start_weight: 87,
    start_date: fmtDate(startDate),
    avatar_gender: 'homme',
    weight_goal: 'lose',
    age: 30,
    birth_date: '1996-05-15',
  });

  await AsyncStorage.setItem('@yoroi_user_settings', JSON.stringify({
    username: 'Heny',
    height: 178,
    weight_unit: 'kg',
    measurement_unit: 'cm',
    goal: 'lose_weight',
    targetWeight: 80,
    startWeight: 87,
    gender: 'male',
    onboardingCompleted: true,
    citationStyle: 'warrior',
  }));
  await AsyncStorage.setItem('@yoroi_user_height', '178');
  await AsyncStorage.setItem('@yoroi_user_sport', 'jjb');
  await AsyncStorage.setItem('@yoroi_user_mode', 'fighter');
  await AsyncStorage.setItem('@yoroi_gender', 'male');
  await AsyncStorage.setItem('@yoroi_belt', 'bleue');
  await secureStorage.setItem('@yoroi_current_weight', '83.2');
  await AsyncStorage.setItem('@yoroi_start_weight', '87');
  await secureStorage.setItem('@yoroi_target_weight', '80');
  await AsyncStorage.setItem('@yoroi_first_use_date', startDate.toISOString());

  // ========== 2. CLUBS ==========
  const gbClubId = await addClub({ name: 'Gracie Barra Les Olives', sport: 'jjb', color: '#EF4444', sessions_per_week: 4, logo_uri: 'graciebarra' });
  const bfClubId = await addClub({ name: 'Basic-Fit Prado', sport: 'musculation', color: '#3B82F6', sessions_per_week: 3, logo_uri: 'basic-fit' });
  // 3e club : no-gi / open mat du dimanche avec un collectif indépendant
  const nogiClubId = await addClub({ name: 'Open Mat Marseille No-Gi', sport: 'jjb', color: '#8B5CF6', sessions_per_week: 1 });

  await AsyncStorage.setItem('@yoroi_user_clubs', JSON.stringify([
    { id: gbClubId, name: 'Gracie Barra Les Olives', sport: 'jjb', color: '#EF4444', sessions_per_week: 4, logo_uri: 'graciebarra' },
    { id: bfClubId, name: 'Basic-Fit Prado', sport: 'musculation', color: '#3B82F6', sessions_per_week: 3, logo_uri: 'basic-fit' },
    { id: nogiClubId, name: 'Open Mat Marseille No-Gi', sport: 'jjb', color: '#8B5CF6', sessions_per_week: 1 },
  ]));
  await AsyncStorage.setItem('@yoroi_favorite_sports', JSON.stringify(['jjb', 'musculation']));

  // ========== 3. EMPLOI DU TEMPS ==========
  const slotId1 = await addWeeklyPlanItem({ day_of_week: 0, club_id: gbClubId, sport: 'jjb', time: '19:00', duration_minutes: 90, session_type: 'Cours', label: 'JJB lundi soir' });
  const slotId2 = await addWeeklyPlanItem({ day_of_week: 1, club_id: bfClubId, sport: 'musculation', time: '12:00', duration_minutes: 70, session_type: 'Push', label: 'Muscu mardi midi' });
  const slotId3 = await addWeeklyPlanItem({ day_of_week: 2, club_id: gbClubId, sport: 'jjb', time: '19:00', duration_minutes: 90, session_type: 'Sparring' });
  const slotId4 = await addWeeklyPlanItem({ day_of_week: 3, club_id: bfClubId, sport: 'musculation', time: '12:00', duration_minutes: 70, session_type: 'Pull' });
  const slotId5 = await addWeeklyPlanItem({ day_of_week: 4, club_id: gbClubId, sport: 'jjb', time: '19:00', duration_minutes: 90, session_type: 'Drilling' });
  const slotId6 = await addWeeklyPlanItem({ day_of_week: 5, club_id: gbClubId, sport: 'jjb', time: '10:00', duration_minutes: 120, session_type: 'Open Mat' });
  const slotId7 = await addWeeklyPlanItem({ day_of_week: 5, club_id: bfClubId, sport: 'musculation', time: '15:00', duration_minutes: 60, session_type: 'Legs' });
  await addWeeklyPlanItem({ day_of_week: 6, sport: 'repos', is_rest_day: true });

  // ========== 3b. SLOT OCCURRENCES DEMO ==========
  // Calculer les 4 derniers lundis pour creer des occurrences variees
  const now = new Date();
  const jsDay = now.getDay();
  const diffToMonday = jsDay === 0 ? -6 : 1 - jsDay;
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() + diffToMonday);

  const weekStarts = [];
  for (let i = 0; i < 4; i++) {
    const ws = new Date(thisMonday);
    ws.setDate(thisMonday.getDate() - i * 7);
    weekStarts.push(ws.toISOString().split('T')[0]);
  }

  // Semaine courante: quelques valides, quelques en attente
  await upsertSlotOccurrence({ weekly_plan_id: slotId1, week_start: weekStarts[0], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId2, week_start: weekStarts[0], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId3, week_start: weekStarts[0], status: 'pending' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId4, week_start: weekStarts[0], status: 'pending' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId5, week_start: weekStarts[0], status: 'pending' });

  // Semaine -1: tout valide sauf 1 annule
  await upsertSlotOccurrence({ weekly_plan_id: slotId1, week_start: weekStarts[1], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId2, week_start: weekStarts[1], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId3, week_start: weekStarts[1], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId4, week_start: weekStarts[1], status: 'cancelled', cancel_reason: 'Fatigue' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId5, week_start: weekStarts[1], status: 'validated' });

  // Semaine -2: valide
  await upsertSlotOccurrence({ weekly_plan_id: slotId1, week_start: weekStarts[2], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId2, week_start: weekStarts[2], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId3, week_start: weekStarts[2], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId4, week_start: weekStarts[2], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId5, week_start: weekStarts[2], status: 'validated' });

  // Semaine -3: quelques annules (blessure)
  await upsertSlotOccurrence({ weekly_plan_id: slotId1, week_start: weekStarts[3], status: 'cancelled', cancel_reason: 'Blessure genou' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId2, week_start: weekStarts[3], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId3, week_start: weekStarts[3], status: 'cancelled', cancel_reason: 'Blessure genou' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId4, week_start: weekStarts[3], status: 'validated' });
  await upsertSlotOccurrence({ weekly_plan_id: slotId5, week_start: weekStarts[3], status: 'skipped' });

  // ========== 3c. PARTENAIRES SPARRING (fiches + belts) ==========
  await seedSparringPartners();

  // ========== 4. TRAININGS ==========
  let current = new Date(startDate);
  const trainingLoads: any[] = [];

  while (current <= endDate) {
    const d = dow(current);
    const dateStr = fmtDate(current);
    const dayIdx = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const progress = dayIdx / totalDays;

    // JJB: Lun(1), Mer(3), Ven(5) 19h
    if (d === 1 || d === 3 || d === 5) {
      if (Math.random() > 0.1) {
        const duration = randInt(75, 95);
        const intensity = randInt(6, 9);
        const sessionType: 'cours' | 'drilling' | 'sparring' = pick(['cours', 'cours', 'cours', 'drilling', 'sparring']);
        // Rounds réalistes sur les sessions sparring (et 1/3 des drilling)
        const hasRounds = sessionType === 'sparring' || (sessionType === 'drilling' && Math.random() > 0.6);
        const rounds = hasRounds ? buildDemoRounds(sessionType === 'sparring' ? 'sparring' : 'cours', dateStr) : undefined;
        // Narration session : gamePlan / whatWorked / didntWork / mood / rating — sur les sparrings avec rounds
        const hasNarration = hasRounds && Math.random() > 0.3;
        await addTraining({
          club_id: gbClubId, sport: 'jjb',
          session_type: sessionType,
          date: dateStr, start_time: '19:00', duration_minutes: duration, intensity,
          technical_theme: pick(JJB_THEMES),
          calories: Math.round(duration * rand(8, 12, 0)),
          heart_rate: randInt(125, 155), max_heart_rate: randInt(165, 185),
          technique_rating: randInt(2, 5), source: 'manual',
          rounds: rounds?.length, round_duration: 5,
          combat_rounds: rounds,
          game_plan: hasNarration ? pick(SESSION_GAME_PLANS) : undefined,
          what_worked: hasNarration ? pick(SESSION_WHAT_WORKED) : undefined,
          what_didnt_work: hasNarration ? pick(SESSION_WHAT_DIDNT_WORK) : undefined,
          session_rating: hasNarration ? randInt(6, 9) : undefined,
          session_mood: hasNarration ? pick(SESSION_MOODS) : undefined,
        });
        workoutCount++;
        trainingLoads.push({ date: dateStr, duration, rpe: intensity, load: duration * intensity, sport: 'jjb' });
      }
    }

    // JJB: Sam(6) 10h open mat (avec combat_rounds riches)
    if (d === 6 && Math.random() > 0.2) {
      const duration = randInt(90, 130);
      const intensity = randInt(7, 10);
      const rounds = buildDemoRounds('open_mat', dateStr);
      await addTraining({
        club_id: gbClubId, sport: 'jjb', session_type: 'open_mat',
        date: dateStr, start_time: '10:00', duration_minutes: duration, intensity,
        technical_theme: 'Open mat',
        calories: Math.round(duration * rand(9, 13, 0)),
        heart_rate: randInt(135, 160), max_heart_rate: randInt(170, 190),
        technique_rating: randInt(3, 5), rounds: rounds.length, round_duration: 5, source: 'manual',
        combat_rounds: rounds,
        game_plan: pick(SESSION_GAME_PLANS),
        what_worked: pick(SESSION_WHAT_WORKED),
        what_didnt_work: pick(SESSION_WHAT_DIDNT_WORK),
        session_rating: randInt(7, 10),
        session_mood: pick(SESSION_MOODS),
      });
      workoutCount++;
      trainingLoads.push({ date: dateStr, duration, rpe: intensity, load: duration * intensity, sport: 'jjb' });
    }

    // Musculation: Mar(2), Jeu(4) 12h
    if (d === 2 || d === 4) {
      if (Math.random() > 0.08) {
        const mg = pick(Object.keys(MUSCU_MUSCLES));
        const duration = randInt(55, 75);
        const intensity = randInt(6, 9);
        await addTraining({
          club_id: bfClubId, sport: 'musculation', session_type: 'entraînement',
          date: dateStr, start_time: '12:00', duration_minutes: duration, intensity,
          muscles: JSON.stringify(MUSCU_MUSCLES[mg]), notes: mg,
          calories: Math.round(duration * rand(6, 10, 0)),
          heart_rate: randInt(105, 135), max_heart_rate: randInt(150, 170), source: 'manual',
        });
        workoutCount++;
        trainingLoads.push({ date: dateStr, duration, rpe: intensity, load: duration * intensity, sport: 'musculation' });
      }
    }

    // Musculation: Sam(6) 15h
    if (d === 6 && Math.random() > 0.3) {
      const mg = pick(Object.keys(MUSCU_MUSCLES));
      const duration = randInt(50, 65);
      const intensity = randInt(6, 8);
      await addTraining({
        club_id: bfClubId, sport: 'musculation', session_type: 'entraînement',
        date: dateStr, start_time: '15:00', duration_minutes: duration, intensity,
        muscles: JSON.stringify(MUSCU_MUSCLES[mg]), notes: mg,
        calories: Math.round(duration * rand(6, 10, 0)),
        heart_rate: randInt(110, 140), max_heart_rate: randInt(155, 175), source: 'manual',
      });
      workoutCount++;
      trainingLoads.push({ date: dateStr, duration, rpe: intensity, load: duration * intensity, sport: 'musculation' });
    }

    current = addDays(current, 1);
  }

  await AsyncStorage.setItem('@yoroi_training_loads', JSON.stringify(trainingLoads));

  // ========== 5. PESEES ==========
  current = new Date(startDate);
  while (current <= endDate) {
    const d = dow(current);
    if (d === 1 || d === 3 || d === 5) {
      const dayIdx = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const progress = dayIdx / totalDays;
      const weight = parseFloat((87 - progress * 6 + rand(-0.4, 0.4)).toFixed(1));
      await addWeight({
        weight,
        fat_percent: parseFloat((22 - progress * 6 + rand(-0.3, 0.3)).toFixed(1)),
        muscle_percent: parseFloat((38 + progress * 4 + rand(-0.2, 0.2)).toFixed(1)),
        water_percent: parseFloat((55 + progress * 5 + rand(-0.5, 0.5)).toFixed(1)),
        bone_mass: parseFloat((3.2 + progress * 0.2 + rand(-0.05, 0.05)).toFixed(1)),
        visceral_fat: Math.round(12 - progress * 3),
        metabolic_age: Math.round(32 - progress * 4),
        bmr: Math.round(1750 + progress * 70 + randInt(-10, 10)),
        date: fmtDate(current), source: 'manual',
      });
      weightCount++;
    }
    current = addDays(current, 1);
  }

  // ========== 6. MENSURATIONS ==========
  for (let m = 0; m < 10; m++) {
    const monthDate = new Date(2027, m, 1);
    while (monthDate.getDay() !== 1) monthDate.setDate(monthDate.getDate() + 1);
    const progress = m / 9;
    await addMeasurementRecord({
      chest: parseFloat((102 + progress * 3 + rand(-0.5, 0.5)).toFixed(1)),
      waist: parseFloat((90 - progress * 7 + rand(-0.3, 0.3)).toFixed(1)),
      navel: parseFloat((95 - progress * 8 + rand(-0.3, 0.3)).toFixed(1)),
      hips: parseFloat((100 - progress * 3 + rand(-0.3, 0.3)).toFixed(1)),
      shoulders: parseFloat((118 + progress * 2 + rand(-0.3, 0.3)).toFixed(1)),
      left_arm: parseFloat((35 + progress * 1.5 + rand(-0.2, 0.2)).toFixed(1)),
      right_arm: parseFloat((35.5 + progress * 1.5 + rand(-0.2, 0.2)).toFixed(1)),
      left_thigh: parseFloat((58 - progress * 1 + rand(-0.3, 0.3)).toFixed(1)),
      right_thigh: parseFloat((58.5 - progress * 1 + rand(-0.3, 0.3)).toFixed(1)),
      left_calf: parseFloat((37 + progress * 0.5 + rand(-0.2, 0.2)).toFixed(1)),
      right_calf: parseFloat((37.2 + progress * 0.5 + rand(-0.2, 0.2)).toFixed(1)),
      neck: parseFloat((39 - progress * 0.5 + rand(-0.2, 0.2)).toFixed(1)),
      date: fmtDate(monthDate),
    });
    measurementCount++;
  }

  // ========== 7. SOMMEIL ==========
  const sleepEntries: any[] = [];
  current = new Date(startDate);
  while (current <= endDate) {
    const dayIdx = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const progress = dayIdx / totalDays;
    const d = dow(current);
    const dateStr = fmtDate(current);
    if (Math.random() < 0.05) { current = addDays(current, 1); continue; }

    const baseBedHour = d === 5 || d === 6 ? 23.5 : 22.5;
    const bedHourDecimal = baseBedHour + rand(-0.5, 1.0) - progress * 0.3;
    const bedH = Math.floor(bedHourDecimal >= 24 ? bedHourDecimal - 24 : bedHourDecimal);
    const bedM = Math.round((bedHourDecimal % 1) * 60 / 15) * 15;
    const bedTime = fmtTime(bedH, Math.min(bedM, 45));

    const baseDuration = d === 0 || d === 6 ? 8.0 : 7.0;
    const durationHours = baseDuration + progress * 0.5 + rand(-0.5, 0.5);
    const durationMin = Math.round(Math.max(300, Math.min(600, durationHours * 60)));

    const wakeHourDecimal = bedHourDecimal + durationHours;
    const wakeH = Math.floor(wakeHourDecimal >= 24 ? wakeHourDecimal - 24 : wakeHourDecimal);
    const wakeM = Math.round(((wakeHourDecimal % 1) * 60) / 15) * 15;
    const wakeTime = fmtTime(wakeH, Math.min(wakeM, 45));

    const quality = Math.min(5, Math.max(1, Math.round(3 + progress * 1.5 + rand(-0.8, 0.8))));
    const deepMin = Math.round(durationMin * rand(0.13, 0.20));
    const remMin = Math.round(durationMin * rand(0.18, 0.25));
    const awakeMin = Math.round(durationMin * rand(0.03, 0.08));
    const coreMin = durationMin - deepMin - remMin - awakeMin;

    sleepEntries.push({
      id: `sleep_demo_${dateStr}`, date: dateStr, bedTime, wakeTime, duration: durationMin, quality,
      phases: { deep: deepMin, rem: remMin, core: coreMin, awake: awakeMin, inBed: durationMin + awakeMin + randInt(5, 20) },
      source: 'demo', efficiency: Math.round((durationMin / (durationMin + awakeMin + randInt(5, 15))) * 100),
      interruptions: randInt(0, 3),
      sleepHeartRate: { min: randInt(48, 55), max: randInt(68, 78), avg: randInt(56, 64) },
      respiratoryRate: { min: rand(12, 14), max: rand(16, 19), avg: rand(14, 16) },
      wristTemperature: rand(-0.3, 0.3),
    });
    sleepCount++;
    current = addDays(current, 1);
  }

  await secureStorage.setItem('@yoroi_sleep_entries', sleepEntries);
  await AsyncStorage.setItem('@yoroi_sleep_goal', '480');
  await AsyncStorage.setItem('@yoroi_sleep_longest_streak', '21');

  // ========== 8. HEALTH DATA ==========
  current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = fmtDate(current);
    const dayIdx = Math.floor((current.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const progress = dayIdx / totalDays;
    const d = dow(current);
    const isTrainingDay = d >= 1 && d <= 6;

    const steps = isTrainingDay ? randInt(8000, 14000) : randInt(4000, 8000);
    await saveHealthData({ date: dateStr, type: 'steps', value: steps, unit: 'count', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'distance', value: parseFloat((steps * 0.00075).toFixed(2)), unit: 'km', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'calories_active', value: isTrainingDay ? randInt(400, 800) : randInt(200, 400), unit: 'kcal', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'heart_rate_resting', value: Math.round(68 - progress * 10 + rand(-2, 2)), unit: 'bpm', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'hrv', value: Math.round(35 + progress * 20 + rand(-5, 5)), unit: 'ms', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'spo2', value: rand(96, 99, 0), unit: '%', source: 'demo' });
    await saveHealthData({ date: dateStr, type: 'respiratory_rate', value: rand(13, 17), unit: 'brpm', source: 'demo' });

    current = addDays(current, 1);
  }

  await AsyncStorage.setItem('@yoroi_resting_heart_rate', '60');
  await AsyncStorage.setItem('@yoroi_hrv_current', '50');
  await AsyncStorage.setItem('@yoroi_spo2_current', '98');
  await AsyncStorage.setItem('@yoroi_steps_today', '10542');
  await AsyncStorage.setItem('@yoroi_steps_goal', '10000');
  await AsyncStorage.setItem('@yoroi_distance_today', '7.9');
  await AsyncStorage.setItem('@yoroi_distance_goal', '8.0');
  await AsyncStorage.setItem('@yoroi_calories_today', '580');
  await AsyncStorage.setItem('@yoroi_calories_goal', '600');

  // ========== 9. HYDRATATION ==========
  const hydrationLog: any[] = [];
  current = new Date(startDate);
  while (current <= endDate) {
    const dateStr = fmtDate(current);
    const d = dow(current);
    const numEntries = randInt(2, d >= 1 && d <= 6 ? 5 : 3);
    for (let i = 0; i < numEntries; i++) {
      hydrationLog.push({
        date: dateStr,
        quantite_ml: pick([250, 300, 350, 500]),
        type: i === 0 && Math.random() > 0.6 ? 'cafe' : 'eau',
        time: fmtTime(randInt(7, 21), randInt(0, 59)),
      });
    }
    current = addDays(current, 1);
  }
  await AsyncStorage.setItem('@yoroi_hydration_log', JSON.stringify(hydrationLog));
  await AsyncStorage.setItem('@yoroi_hydration_goal', '2500');

  // ========== 10. COMPETITIONS ==========
  await addCompetition({ nom: 'Open de Marseille JJB', date: '2026-04-18', lieu: 'Palais des Sports, Marseille', sport: 'jjb', type_evenement: 'competition', categorie_poids: '-82.3kg', poids_max: 82.3, statut: 'a_venir', rappels_actifs: true });
  await addCompetition({ nom: 'IBJJF Paris Open', date: '2026-06-20', lieu: 'Paris Expo, Paris', sport: 'jjb', type_evenement: 'competition', categorie_poids: '-82.3kg', poids_max: 82.3, statut: 'a_venir', rappels_actifs: true });
  await addCompetition({ nom: 'Coupe de France Grappling', date: '2026-09-12', lieu: 'INSEP, Paris', sport: 'jjb', type_evenement: 'competition', categorie_poids: '-80kg', poids_max: 80, statut: 'a_venir', rappels_actifs: true });
  await addCompetition({ nom: 'Championnat Regional PACA', date: '2026-11-07', lieu: 'Gymnase Borely, Marseille', sport: 'jjb', type_evenement: 'competition', categorie_poids: '-80kg', poids_max: 80, statut: 'a_venir', rappels_actifs: true });

  // ========== 11. BENCHMARKS ==========
  const benchmarks: any[] = [];
  const makeEntries = (startVal: number, endVal: number, unit: string, monthlyEntries = 3) => {
    const entries: any[] = [];
    for (let m = 0; m < 10; m++) {
      for (let e = 0; e < monthlyEntries; e++) {
        const progress = (m * monthlyEntries + e) / (10 * monthlyEntries);
        const value = unit === 'time'
          ? Math.round(startVal - progress * (startVal - endVal))
          : parseFloat((startVal + progress * (endVal - startVal)).toFixed(1));
        entries.push({ id: generateId(), value, reps: unit === 'reps' ? value : (unit === 'kg' ? randInt(1, 5) : undefined), date: fmtDate(new Date(2026, 2 + m, randInt(1, 28))), rpe: randInt(6, 10) });
      }
    }
    return entries;
  };

  benchmarks.push({ id: generateId(), name: 'Squat', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444', entries: makeEntries(100, 130, 'kg'), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: 'Developpe Couche', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444', entries: makeEntries(80, 100, 'kg'), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: 'Souleve de Terre', category: 'force', unit: 'kg', iconName: 'dumbbell', color: '#EF4444', entries: makeEntries(120, 160, 'kg'), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: 'Tractions', category: 'force', unit: 'reps', iconName: 'dumbbell', color: '#EF4444', entries: makeEntries(8, 16, 'reps', 2), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: 'Poids de Corps', category: 'bodyweight', unit: 'kg', iconName: 'scale', color: '#8B5CF6', entries: makeEntries(87, 81, 'kg', 4), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: '5km', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6', entries: makeEntries(1680, 1440, 'time', 2), createdAt: startDate.toISOString() });
  benchmarks.push({ id: generateId(), name: '10km', category: 'running', unit: 'time', iconName: 'timer', color: '#3B82F6', entries: makeEntries(3600, 3180, 'time', 1), createdAt: startDate.toISOString() });
  await AsyncStorage.setItem('yoroi_benchmarks_v2', JSON.stringify(benchmarks));

  // ========== 12. TECHNIQUES BJJ ==========
  const skills: any[] = [];
  const nowIso = new Date().toISOString();
  // Quelques refs video YouTube (tutos publics BJJ reconnus) pour les skills mastered.
  // → montre la feature "vidéo attachée" pleine dans les screenshots.
  const SKILL_VIDEO_URLS: Record<string, string> = {
    'Triangle': 'https://www.youtube.com/watch?v=vDp43CuwPyY',
    'Kimura': 'https://www.youtube.com/watch?v=d4Jg8IzRuNg',
    'Garde Fermee': 'https://www.youtube.com/watch?v=VnZAomJxgHQ',
    'Etranglement Arriere (RNC)': 'https://www.youtube.com/watch?v=k-O0LJU8MBo',
    'Berimbolo': 'https://www.youtube.com/watch?v=v80GyVBXlYU',
    'Knee Cut': 'https://www.youtube.com/watch?v=J-7oNtu6hvE',
    'Single Leg': 'https://www.youtube.com/watch?v=kxhH0YepfJ0',
  };

  const makeSkill = (name: string, cat: string, status: 'mastered' | 'in_progress' | 'to_learn', drills: number) => ({
    id: generateId(),
    name,
    category: cat,
    status,
    drillCount: drills,
    notes: buildSkillNotes(status, name),
    videoUrl: SKILL_VIDEO_URLS[name] || undefined,
    createdAt: startDate.toISOString(),
    updatedAt: nowIso,
  });
  skills.push(makeSkill('Garde Fermee', 'jjb_garde', 'mastered', randInt(40, 60)));
  skills.push(makeSkill('Demi-Garde', 'jjb_garde', 'mastered', randInt(35, 55)));
  skills.push(makeSkill('Triangle', 'jjb_soumission', 'mastered', randInt(30, 50)));
  skills.push(makeSkill('Kimura', 'jjb_soumission', 'mastered', randInt(25, 45)));
  skills.push(makeSkill('Single Leg', 'lutte', 'mastered', randInt(20, 40)));
  skills.push(makeSkill('De la Riva', 'jjb_garde', 'in_progress', randInt(10, 25)));
  skills.push(makeSkill('Knee Cut', 'jjb_passage', 'in_progress', randInt(12, 22)));
  skills.push(makeSkill('Cle de Bras (Armbar)', 'jjb_soumission', 'in_progress', randInt(15, 28)));
  skills.push(makeSkill('Etranglement Arriere (RNC)', 'jjb_soumission', 'in_progress', randInt(8, 18)));
  skills.push(makeSkill('Heel Hook', 'jjb_nogi', 'in_progress', randInt(5, 15)));
  skills.push(makeSkill('Double Leg', 'lutte', 'in_progress', randInt(10, 20)));
  skills.push(makeSkill('X-Guard', 'jjb_garde', 'to_learn', 0));
  skills.push(makeSkill('Body Lock Pass', 'jjb_passage', 'to_learn', 0));
  skills.push(makeSkill('Omoplata', 'jjb_soumission', 'to_learn', 0));
  skills.push(makeSkill('Darce Choke', 'jjb_nogi', 'to_learn', 0));

  // Skills supplementaires pour un carnet bien rempli
  skills.push(makeSkill('Berimbolo', 'jjb_garde', 'in_progress', randInt(8, 18)));
  skills.push(makeSkill('Spider Guard', 'jjb_garde', 'in_progress', randInt(12, 22)));
  skills.push(makeSkill('Ezekiel Choke', 'jjb_soumission', 'in_progress', randInt(6, 14)));
  skills.push(makeSkill('Guillotine', 'jjb_soumission', 'in_progress', randInt(10, 20)));
  skills.push(makeSkill('Mount Escape', 'jjb_garde', 'mastered', randInt(30, 45)));
  skills.push(makeSkill('Side Control Escape', 'jjb_garde', 'mastered', randInt(25, 40)));
  skills.push(makeSkill('Back Control', 'jjb_passage', 'mastered', randInt(20, 35)));
  skills.push(makeSkill('Takedown Ankle Pick', 'lutte', 'to_learn', 0));
  skills.push(makeSkill('Crucifix', 'jjb_soumission', 'to_learn', 0));
  skills.push(makeSkill('Leg Drag Pass', 'jjb_passage', 'to_learn', 0));

  await AsyncStorage.setItem('yoroi_skills_v2', JSON.stringify(skills));

  // ========== 13. GAMIFICATION ==========
  await AsyncStorage.setItem('@yoroi_unified_total_points', '1220');
  await AsyncStorage.setItem('@yoroi_unified_breakdown', JSON.stringify({ activityPoints: 580, questsXp: 240, challengesXp: 180, challengeServiceXp: 120, healthBonus: 100, total: 1220 }));
  await AsyncStorage.setItem('@yoroi_current_streak', '23');
  await AsyncStorage.setItem('@yoroi_best_streak', '28');
  await AsyncStorage.setItem('@yoroi_current_charge', '78');

  // ========== 14. BADGES ==========
  const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
  const unlockedBadges = [
    'first_flame',
    'fortnight_warrior',
    'first_training',
    'beginner',
    'committed',
    'regular',
    'warrior',
    'veteran',
    'first_step',
    'first_kilo',
    'first_three',
    'launched',
    'team_yoroi_member',
    'analyst',
  ];
  const badgeUnlockDates: Record<string, string> = {
    first_flame:       daysAgo(180),
    fortnight_warrior: daysAgo(150),
    first_training:    daysAgo(180),
    beginner:          daysAgo(160),
    committed:         daysAgo(120),
    regular:           daysAgo(90),
    warrior:           daysAgo(60),
    veteran:           daysAgo(30),
    first_step:        daysAgo(175),
    first_kilo:        daysAgo(140),
    first_three:       daysAgo(100),
    launched:          daysAgo(50),
    team_yoroi_member: daysAgo(180),
    analyst:           daysAgo(20),
  };
  await AsyncStorage.setItem('@yoroi_unlocked_badges', JSON.stringify(unlockedBadges));
  await AsyncStorage.setItem('@yoroi_badge_unlock_dates', JSON.stringify(badgeUnlockDates));

  // ========== 15. QUETES ==========
  const questsState = {
    daily: [
      { id: 'daily_train', title: 'Séance du jour', description: 'Compléter une séance d\'entraînement', xpReward: 30, target: 1, progress: 1, completed: true, type: 'daily' },
      { id: 'daily_hydration', title: 'Hydratation', description: 'Boire 2L d\'eau', xpReward: 15, target: 8, progress: 8, completed: true, type: 'daily' },
      { id: 'daily_steps', title: 'Objectif pas', description: 'Atteindre 8000 pas', xpReward: 20, target: 8000, progress: 8000, completed: true, type: 'daily' },
      { id: 'daily_sleep', title: 'Sommeil récupérateur', description: 'Dormir 7h ou plus', xpReward: 25, target: 7, progress: 7, completed: true, type: 'daily' },
      { id: 'daily_log', title: 'Journal du guerrier', description: 'Enregistrer une donnée de santé', xpReward: 10, target: 1, progress: 0, completed: false, type: 'daily' },
    ],
    weekly: [
      { id: 'weekly_sessions', title: 'Semaine active', description: '4 séances cette semaine', xpReward: 80, target: 4, progress: 3, completed: false, type: 'weekly' },
      { id: 'weekly_weight', title: 'Suivi du poids', description: 'Peser 3 fois cette semaine', xpReward: 40, target: 3, progress: 3, completed: true, type: 'weekly' },
      { id: 'weekly_bjj', title: 'Tapis de BJJ', description: '2 séances de BJJ', xpReward: 60, target: 2, progress: 2, completed: true, type: 'weekly' },
      { id: 'weekly_cardio', title: 'Cardio warrior', description: '1 séance cardio de 30min', xpReward: 50, target: 1, progress: 1, completed: true, type: 'weekly' },
      { id: 'weekly_streak', title: 'Sans relâche', description: 'Maintenir la série 7 jours', xpReward: 100, target: 7, progress: 5, completed: false, type: 'weekly' },
    ],
    monthly: [
      { id: 'monthly_sessions', title: 'Mois de guerrier', description: '16 séances ce mois', xpReward: 200, target: 16, progress: 14, completed: false, type: 'monthly' },
      { id: 'monthly_weight_loss', title: 'Perte de poids', description: 'Perdre 1kg ce mois', xpReward: 150, target: 1, progress: 1, completed: true, type: 'monthly' },
      { id: 'monthly_new_record', title: 'Record brisé', description: 'Battre un record personnel', xpReward: 120, target: 1, progress: 1, completed: true, type: 'monthly' },
      { id: 'monthly_consistency', title: 'Consistance', description: '20 jours actifs ce mois', xpReward: 180, target: 20, progress: 16, completed: false, type: 'monthly' },
      { id: 'monthly_scan', title: 'Analyse complète', description: 'Remplir toutes les métriques santé', xpReward: 100, target: 5, progress: 3, completed: false, type: 'monthly' },
    ],
    lastReset: { daily: daysAgo(0), weekly: daysAgo(2), monthly: daysAgo(10) },
  };
  await AsyncStorage.setItem('@yoroi_quests_state', JSON.stringify(questsState));

  // ========== 16. BLESSURES ==========
  await addInjury({ zone_id: 'shoulder_r', zone_view: 'front', pain_type: 'tendinite', cause: 'Surcharge en développé couché (95kg × 5 séries)', eva_score: 3, notes: 'Douleur à la rotation externe. Kiné 1x/sem, élastique bande verte 3x/jour. Nette amélioration depuis 2 sem. Reprise muscu pecs progressive à 70% charge.', date: daysAgo(45), status: 'healing', fit_for_duty: 'restricted' });
  await addInjury({ zone_id: 'wrist_r', zone_view: 'front', pain_type: 'entorse', cause: 'Chute en sparring BJJ contre Larbi (back take mal posé)', eva_score: 2, notes: 'Instabilité légère. Strapping obligatoire pendant 3 sem. Drilling OK, sparring contrôlé autorisé. À surveiller sur les grips profonds.', date: daysAgo(30), status: 'healing', fit_for_duty: 'restricted' });
  await addInjury({ zone_id: 'knee_l', zone_view: 'front', pain_type: 'entorse', cause: 'Shoot raté lors de l\'Open de Marseille (1er round)', eva_score: 5, notes: 'IRM programmée semaine prochaine. Douleur vive au ligament interne. Pas de sparring, pas de takedown, juste drilling léger. Estimé 4-6 semaines d\'arrêt.', date: daysAgo(18), status: 'active', fit_for_duty: 'unfit' });
  await addInjury({ zone_id: 'spine_lower', zone_view: 'back', pain_type: 'lumbago', cause: 'Soulevé de terre 150kg avec technique dégradée', eva_score: 4, notes: 'Séances kiné 2x/semaine + McKenzie exercises quotidiens. Amélioration 60%. Reprise muscu jambes uniquement en squat goblet léger pour l\'instant.', date: daysAgo(60), status: 'healing', fit_for_duty: 'restricted' });
  await addInjury({ zone_id: 'hamstring_l', zone_view: 'back', pain_type: 'contracture', cause: 'Échauffement insuffisant avant open mat', eva_score: 0, notes: 'Totalement rétabli. Leçon retenue : warmup dynamique 15min obligatoire avant tout sparring intense. Zéro récidive en 3 mois.', date: daysAgo(90), status: 'healed', fit_for_duty: 'operational' });
  // 2 blessures supplementaires pour un historique plus epais
  await addInjury({ zone_id: 'fingers_l', zone_view: 'front', pain_type: 'entorse', cause: 'Grip accroché dans le gi de Prof. Veni', eva_score: 1, notes: 'Classique du BJJ. Bandage noué + patience. À surveiller, ne pas brusquer.', date: daysAgo(10), status: 'active', fit_for_duty: 'operational' });
  await addInjury({ zone_id: 'ankle_r', zone_view: 'front', pain_type: 'entorse', cause: 'Torsion en leg lock défendu (heel hook Prof. Lucas)', eva_score: 3, notes: 'Glaçage + repos 1 semaine. Retour progressif avec chevillère. Ne plus attraper les leg locks sans tap rapide.', date: daysAgo(120), status: 'healed', fit_for_duty: 'operational' });

  // ========== 17. AVATAR ==========
  await AsyncStorage.setItem('@yoroi_avatar_config', JSON.stringify({
    pack: 'bjj',
    packType: 'character',
    gender: 'male',
    level: 3,
    state: 'strong',
  }));

  // ========== 18. CHALLENGES ==========
  const challengeMonday = new Date(now);
  const challengeDayOfWeek = challengeMonday.getDay();
  const challengeDiffToMonday = challengeDayOfWeek === 0 ? -6 : 1 - challengeDayOfWeek;
  challengeMonday.setDate(challengeMonday.getDate() + challengeDiffToMonday);
  challengeMonday.setHours(0, 0, 0, 0);
  const challengeSunday = new Date(challengeMonday);
  challengeSunday.setDate(challengeSunday.getDate() + 6);
  challengeSunday.setHours(23, 59, 59, 999);

  await AsyncStorage.setItem('@yoroi_weekly_challenge', JSON.stringify({
    challenge: { id: 'warrior', name: 'Athlète', nameJp: '戦士', description: '4 entraînements cette semaine', target: 4, xpReward: 150, icon: '', color: '#EF4444' },
    weekStart: challengeMonday.toISOString(),
    weekEnd: challengeSunday.toISOString(),
    progress: 3,
    completed: false,
    xpClaimed: false,
  }));

  const makePastChallenge = (
    id: string, name: string, nameJp: string, desc: string,
    target: number, xp: number, color: string, weeksAgo: number
  ) => {
    const mon = new Date(now);
    mon.setDate(mon.getDate() - weeksAgo * 7 + challengeDiffToMonday);
    mon.setHours(0, 0, 0, 0);
    const sun = new Date(mon); sun.setDate(sun.getDate() + 6); sun.setHours(23, 59, 59, 999);
    const completedAt = new Date(sun); completedAt.setHours(20, 0, 0, 0);
    return {
      challenge: { id, name, nameJp, description: desc, target, xpReward: xp, icon: '', color },
      weekStart: mon.toISOString(),
      weekEnd: sun.toISOString(),
      progress: target,
      completed: true,
      completedAt: completedAt.toISOString(),
      xpClaimed: true,
    };
  };

  const completedChallenges = [
    makePastChallenge('regularity', 'Régularité', '規則性', '5 pesées cette semaine', 5, 100, '#3B82F6', 1),
    makePastChallenge('warrior', 'Athlète', '戦士', '4 entraînements cette semaine', 4, 150, '#EF4444', 2),
    makePastChallenge('complete', 'Complet', '完全', 'Pesée + mensurations + entraînement', 3, 200, '#8B5CF6', 3),
    makePastChallenge('streak', 'Série', '連続', '7 jours de suite', 7, 250, '#F59E0B', 4),
    makePastChallenge('warrior', 'Athlète', '戦士', '4 entraînements cette semaine', 4, 150, '#EF4444', 5),
    makePastChallenge('regularity', 'Régularité', '規則性', '5 pesées cette semaine', 5, 100, '#3B82F6', 6),
    makePastChallenge('complete', 'Complet', '完全', 'Pesée + mensurations + entraînement', 3, 200, '#8B5CF6', 7),
    makePastChallenge('photo', 'Photo', '写真', '1 photo de transformation', 1, 50, '#10B981', 8),
  ];
  await AsyncStorage.setItem('@yoroi_completed_challenges', JSON.stringify(completedChallenges));
  await AsyncStorage.setItem('@yoroi_challenge_xp', '1250');
  await AsyncStorage.setItem('@yoroi_challenge_last_daily_reset', daysAgo(0));
  await AsyncStorage.setItem('@yoroi_challenge_last_weekly_reset', challengeMonday.toISOString());
  await AsyncStorage.setItem('@yoroi_challenge_last_monthly_reset', daysAgo(10));

  // ========== 19. COMBATS BJJ ==========
  const combatsData = [
    { date: fmtDate(addDays(now, -5)),  resultat: 'victoire', methode: 'soumission', technique: 'Triangle',           round: 2, temps: '3:42', adversaire_nom: 'Lucas Fernandez',  adversaire_club: 'Alliance BJJ',          poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Belle entrée en triangle depuis la garde ouverte. Il a voulu passer en torreando, j\'ai saisi la tête et verrouillé direct. Tap à 3\'42. Finale de poule.' },
    { date: fmtDate(addDays(now, -12)), resultat: 'victoire', methode: 'soumission', technique: 'Kimura',             round: 1, temps: '1:58', adversaire_nom: 'Rayan Benali',     adversaire_club: 'Gracie Barra Lyon',     poids_pesee: 82.0, poids_jour_j: 82.5, notes: 'Kimura depuis garde fermée en 2 min. Setup exactement comme drillé avec Prof. Lucas. Adversaire beaucoup plus fort physiquement, mais technique supérieure.' },
    { date: fmtDate(addDays(now, -19)), resultat: 'defaite',  methode: 'points',     technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Marco Costa',      adversaire_club: 'Checkmat Paris',        poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Perdu 8-4 aux points. Son jeu de De La Riva était au-dessus. Je dois bosser la défense DLR en priorité. Frustrant mais lucide.' },
    { date: fmtDate(addDays(now, -26)), resultat: 'victoire', methode: 'soumission', technique: 'Rear Naked Choke',   round: 2, temps: '4:15', adversaire_nom: 'Sofiane Hadj',     adversaire_club: 'Team Nogueira',         poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Pris le dos après balayage depuis demi-garde. Hooks posés, RNC propre, tap rapide. Le drill back control du mois dernier a payé.' },
    { date: fmtDate(addDays(now, -33)), resultat: 'victoire', methode: 'points',     technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Ahmed Touati',     adversaire_club: 'Metamoris France',      poids_pesee: 81.5, poids_jour_j: 82.0, notes: 'Victoire 12-2 : 2 passages + mount + back control. Gestion parfaite, j\'ai contrôlé tout le match. Mental solide.' },
    { date: fmtDate(addDays(now, -45)), resultat: 'nul',      methode: 'decision',   technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Pierre Moreau',    adversaire_club: 'Gracie Barra Paris',    poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Match super serré, 2-2 à la fin. Décision du jury en sa faveur sur critères. Aucun regret, j\'ai tout donné.' },
    { date: fmtDate(addDays(now, -60)), resultat: 'victoire', methode: 'soumission', technique: 'Armbar',             round: 1, temps: '2:30', adversaire_nom: 'Yoann Petit',      adversaire_club: 'Basic-Fit BJJ',         poids_pesee: 82.0, poids_jour_j: 81.5, notes: 'Armbar depuis la mount. Transition balayage → mount → armbar. Technique fluide, la séquence était dans le game plan avant le match.' },
    { date: fmtDate(addDays(now, -75)), resultat: 'defaite',  methode: 'soumission', technique: 'Heel Hook',          round: 2, temps: '3:10', adversaire_nom: 'Mateus Silva',     adversaire_club: 'Atos Paris',            poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Heel hook rapide que je n\'ai pas vu venir. Leg lock game encore en retard. Je prends des cours spécifiques au dojo no-gi maintenant.' },
    { date: fmtDate(addDays(now, -90)), resultat: 'victoire', methode: 'soumission', technique: 'Guillotine',         round: 1, temps: '1:22', adversaire_nom: 'Thomas Blanc',     adversaire_club: 'Tristar Paris',         poids_pesee: 81.5, poids_jour_j: 82.0, notes: 'Guillotine en sprawl sur son takedown. Il fonçait tête en avant, j\'avais le grip prêt. Tap en 1\'22. Round 1 du Paris Open.' },
    { date: fmtDate(addDays(now, -110)),resultat: 'victoire', methode: 'points',     technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Karim Hadjadj',    adversaire_club: 'Lotus Club',            poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Passage en side control très dominant. 7-0 aux points. J\'ai maintenu la pression du début à la fin, il a jamais pu créer.' },
    { date: fmtDate(addDays(now, -130)),resultat: 'defaite',  methode: 'points',     technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Julien Vasseur',   adversaire_club: 'Carlson Gracie Paris',  poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Perdu 4-6 dans les dernières secondes. Il m\'a scoré un balayage que j\'aurais pu voir venir. Debrief à la vidéo, beaucoup à apprendre.' },
    { date: fmtDate(addDays(now, -150)),resultat: 'victoire', methode: 'soumission', technique: 'Cross Collar Choke', round: 2, temps: '4:48', adversaire_nom: 'Nassim Boucharel', adversaire_club: 'Ribeiro Jiu-Jitsu',     poids_pesee: 82.5, poids_jour_j: 82.5, notes: 'Étranglement cross collar depuis la mount. Setup en 3 phases : mount → postural control → double grip → squeeze. Le drill du mois a payé.' },
    // Combats supplementaires pour un palmares plus epais
    { date: fmtDate(addDays(now, -175)),resultat: 'victoire', methode: 'soumission', technique: 'Omoplata',            round: 2, temps: '3:05', adversaire_nom: 'Anthony Pereira',  adversaire_club: 'New School Paris',      poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Omoplata depuis spider guard. Transition atypique qui l\'a surpris. Il a tenté de rouler mais je l\'avais verrouillé bassin.' },
    { date: fmtDate(addDays(now, -195)),resultat: 'defaite',  methode: 'points',     technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Rafael Morais',    adversaire_club: 'Gordo Jiu-Jitsu',       poids_pesee: 82.5, poids_jour_j: 82.5, notes: 'Perdu aux avantages 0-0 / 2-3. Super match contre un marron, j\'ai tenu le round. Beaucoup appris sur sa pressure passing.' },
    { date: fmtDate(addDays(now, -220)),resultat: 'victoire', methode: 'soumission', technique: 'Darce',               round: 2, temps: '2:45', adversaire_nom: 'Vincent Leroy',    adversaire_club: 'Marcelo Garcia Paris',  poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Darce depuis head-and-arm scramble. Setup rapide sur une erreur de posture. Finish clean.' },
    { date: fmtDate(addDays(now, -245)),resultat: 'victoire', methode: 'points',     technique: null,                 round: 3, temps: '5:00', adversaire_nom: 'Hugo Bertrand',    adversaire_club: 'Nova União France',     poids_pesee: 82.0, poids_jour_j: 82.0, notes: 'Contrôle total 10-0. Demi-finale du Regional. Énorme confiance après ce match.' },
  ];
  for (const combat of combatsData) {
    try { await addCombat(combat as any); } catch { /* table déjà initialisée */ }
  }

  // ========== 20. OBJECTIFS ENTRAINEMENT ==========
  try {
    await setGoal('jjb', 3);
    await setGoal('musculation', 2);
    await setGoal('running', 1);
  } catch { /* ignore si déjà défini */ }

  // ========== 21. RECORDS PERSONNELS ==========
  const personalRecords = {
    lowestWeight:         { value: 81.2, date: fmtDate(addDays(now, -7)),   label: 'Plus bas poids' },
    startingWeight:       { value: 87.5, date: fmtDate(addDays(now, -180)), label: 'Poids de départ' },
    maxWeeklyLoss:        { value: 1.8,  date: fmtDate(addDays(now, -60)),  label: 'Perte semaine max' },
    maxMonthlyLoss:       { value: 2.5,  date: fmtDate(addDays(now, -90)),  label: 'Perte mois max' },
    totalWeightLoss:      6.3,
    longestStreak:        { value: 28, date: fmtDate(addDays(now, -30)),    label: 'Meilleure série' },
    currentStreak:        23,
    lowestWaist:          { value: 83, date: fmtDate(addDays(now, -14)),    label: 'Tour de taille min' },
    totalWaistLoss:       5,
    maxWeeklyWorkouts:    { value: 6, date: fmtDate(addDays(now, -45)),     label: 'Séances max/semaine' },
    totalWorkouts:        187,
    favoriteSport:        { type: 'jjb', count: 112 },
    bestMonthRegularity:  { value: 92, date: fmtDate(addDays(now, -60)),   label: 'Meilleure régularité' },
    totalMeasurements:    42,
    bestEnergyStreak:     { value: 14, date: fmtDate(addDays(now, -20)),   label: 'Série énergie haute' },
    lastUpdated:          now.toISOString(),
  };
  await AsyncStorage.setItem('@yoroi_personal_records', JSON.stringify(personalRecords));

  // ========== 22. MOOD / ENERGIE ==========
  const moodTypes = ['motivated', 'energized', 'focused', 'tired', 'motivated', 'stressed', 'motivated', 'energized', 'calm', 'focused'];
  const energyPattern = [4, 4, 3, 4, 5, 2, 4, 4, 3, 4, 4, 5, 3, 4, 4, 2, 4, 4, 5, 4, 3, 4, 4, 4, 5, 4, 3, 4, 4, 4];
  const moodEntries = Array.from({ length: 30 }, (_, i) => {
    const entryDate = addDays(now, -i);
    return {
      id: `demo-mood-${i}`,
      date: fmtDate(entryDate),
      mood: moodTypes[i % moodTypes.length],
      energy: energyPattern[i] ?? 4,
      timestamp: new Date(entryDate.getFullYear(), entryDate.getMonth(), entryDate.getDate(), 8, 30).toISOString(),
    };
  });
  await secureStorage.setItem('@yoroi_mood_log', moodEntries);

  // ========== 23. BONUS SANTE ==========
  const healthBonusEntries = Array.from({ length: 60 }, (_, i) => {
    const hasSteps   = i % 4 !== 3;
    const hasSleep   = i % 5 !== 4;
    const hasCalories = i % 3 !== 2;
    return {
      date: fmtDate(addDays(now, -i)),
      stepsBonus:    hasSteps    ? 10 : 0,
      sleepBonus:    hasSleep    ? 10 : 0,
      caloriesBonus: hasCalories ? 5  : 0,
      total:         (hasSteps ? 10 : 0) + (hasSleep ? 10 : 0) + (hasCalories ? 5 : 0),
    };
  });
  const healthBonusTotal = healthBonusEntries.reduce((sum, e) => sum + e.total, 0);
  await AsyncStorage.setItem('@yoroi_health_daily_bonus', String(healthBonusTotal));
  await AsyncStorage.setItem('@yoroi_health_bonus_history', JSON.stringify({
    entries: healthBonusEntries,
    cumulativeTotal: healthBonusTotal,
  }));

  // ========== 24. PROFIL COMPETITEUR ==========
  await AsyncStorage.setItem('@yoroi_competitor_profile', JSON.stringify({
    gender: 'male',
    category: 'medium-heavy',
    belt: 'blue',
    currentWeight: 82.0,
  }));

  // ========== 25. JEUNE INTERMITTENT (15 sessions, 12 complétées) ==========
  const fastingHistory: any[] = [];
  for (let i = 0; i < 15; i++) {
    const dayOffset = i * 2; // tous les 2 jours environ
    const startDate = new Date(now.getTime() - (dayOffset + 1) * 86400000);
    startDate.setHours(20, 0, 0, 0); // start 20h la veille
    const endDate = new Date(startDate.getTime() + 16 * 3600 * 1000); // 16h plus tard = 12h le lendemain
    const completed = i < 12; // 12 sur 15 completées (80%)
    const targetMin = 16 * 60;
    const actualMin = completed ? targetMin + randInt(0, 45) : randInt(8 * 60, 14 * 60); // tenu ou abandonné
    fastingHistory.push({
      id: generateId(),
      date: fmtDate(startDate),
      modeId: '16_8',
      startTime: startDate.toISOString(),
      endTime: completed ? endDate.toISOString() : new Date(startDate.getTime() + actualMin * 60 * 1000).toISOString(),
      targetDuration: targetMin,
      actualDuration: actualMin,
      completed,
      notes: completed && i < 3 ? pick([
        'Facile, j\'ai même pas ressenti la faim',
        'Cassé juste après le training JJB, parfait timing',
        'Bon niveau d\'énergie toute la matinée',
      ]) : undefined,
    });
  }
  await secureStorage.setItem('@yoroi_fasting_history', fastingHistory);
  await AsyncStorage.setItem('@yoroi_fasting_streak', '7');
  await AsyncStorage.setItem('@yoroi_fasting_last_completed', fmtDate(addDays(now, -2)));

  // ========== 26. PREMIUM DÉBLOQUÉ (pour screenshots des features locked) ==========
  await AsyncStorage.setItem('@yoroi_is_premium', 'true');
  await AsyncStorage.setItem('@yoroi_premium_expires_at', String(Date.now() + 365 * 86400 * 1000));
  await AsyncStorage.setItem('@yoroi_premium_source', 'creator_demo');

  // ======= STEP 3: MARK DEMO AS ACTIVE =======
  await AsyncStorage.setItem(DEMO_ACTIVE_KEY, 'true');

  const benchmarkCount = benchmarks.reduce((acc, b) => acc + b.entries.length, 0);
  logger.info(`[DemoData] Heny profile generated: ${workoutCount} trainings, ${weightCount} weights, ${measurementCount} measurements, ${sleepCount} sleep, ${benchmarkCount} benchmarks, ${skills.length} skills, ${unlockedBadges.length} badges, 5 injuries, ${combatsData.length} combats, 8 challenges completed, 30 mood entries. Real data backed up.`);

  return {
    workouts: workoutCount,
    weights: weightCount,
    measurements: measurementCount,
    sleepEntries: sleepCount,
    benchmarks: benchmarkCount,
    skills: skills.length,
  };
};
