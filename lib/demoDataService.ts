// ============================================
// DONNEES DE DEMO : un seul profil, Heny
// Musculation (Basic-Fit Prado), jiu-jitsu brésilien (First Jiu-Jitsu Academy), course sur la
// Corniche le samedi et foot à 5 un dimanche soir sur deux ou trois. Sept mois d'historique qui se
// tiennent : pesées qui suivent le plan vers le torii, charges et records qui montent, sparrings
// avec rounds, ceinture bleue, deux compétitions passées et une à venir (nom fictif),
// mensurations, sommeil, eau et santé du jour (mode démo seulement, jamais lue dans Santé).
// Sert aux captures de l'App Store et aux tests du Studio (mode créateur seulement).
//
// SECURITE : avant la démo, TOUTES les tables de la base sont copiées dans des tables
// de sauvegarde (demo_bak_<table>, dans la même base, sans limite de taille), avec les
// clés AsyncStorage et SecureStore touchées par la démo. restoreRealData remet tout
// à l'identique, ligne par ligne, puis efface les copies. Les données de l'utilisateur
// ne sont jamais perdues. Les anciens profils (Houari, Louis, Hedi, Yanis...) sont
// archivés dans _archive_ancien_design_2026-10-09/vague23/studio/.
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
  saveHealthDataBatch,
  initDatabase,
  exportAllData,
  importData,
  resetDatabase,
  addInjury,
  openDatabase,
  getWeights,
} from './database';
import type { Exercise, HealthDataRecord } from './database';
import { addCombat } from './fighterModeService';
import { setGoal } from './trainingGoalsService';
import { saveEspace } from './v2/espace';
import { markCelebrationSeen, markWelcomeSeen, syncArmure } from './v2/armure';
import { LOGO_FIRST_JJA } from './v2/demo/logoFirstJJA';
import { toDailySeries } from './v2/weightStats';
import { dateAuRythme } from './v2/pesee/arrivee';
import { oublierTorii } from './v2/pesee/usePlanPoids';
import { vitrineActive } from './v2/visite/vitrine';

// ============================================
// CLES DE SAUVEGARDE
// ============================================

const DEMO_ACTIVE_KEY = '@yoroi_demo_data_active';
const DEMO_BACKUP_SQLITE_KEY = '@yoroi_demo_backup_sqlite';
const DEMO_BACKUP_ASYNC_KEY = '@yoroi_demo_backup_async';
const DEMO_BACKUP_TABLES_KEY = '@yoroi_demo_backup_tables';
const DEMO_PROFILE_KEY = '@yoroi_demo_profile_key';
/** Anciens profils et instantanés : effacés au chargement de Heny et au retour des vraies données */
const LEGACY_DEMO_KEYS = ['@yoroi_demo_period'];
const LEGACY_SNAPSHOT_PREFIXES = ['@yoroi_demo_snapshot_'];

/** Clés qui gardent les vraies données pendant la démo : jamais effaçables à la main */
export const DEMO_PROTECTED_KEYS = [DEMO_ACTIVE_KEY, DEMO_BACKUP_SQLITE_KEY, DEMO_BACKUP_ASYNC_KEY, DEMO_BACKUP_TABLES_KEY];

/** Préfixe des tables de sauvegarde dans la base */
export const DEMO_BACKUP_TABLE_PREFIX = 'demo_bak_';
/** Tables de catalogue, que la démo ne touche pas */
const KEEP_TABLES = new Set(['events_catalog']);
/** Tables que l'ancienne démo vidait (sa sauvegarde JSON les couvrait) */
const LEGACY_RESET_TABLES = new Set([
  'sync_state', 'sync_tombstones', 'weights', 'trainings', 'measurements', 'photos', 'achievements', 'weekly_plan', 'clubs',
  'profile', 'competitions', 'objectives', 'treatment_reminders', 'injury_treatments', 'injury_eva_history', 'injuries',
  'benchmark_entries', 'benchmarks', 'skills', 'health_data',
]);

// Clés SecureStore touchées par la démo
const DEMO_SECURE_KEYS = [
  '@yoroi_current_weight',
  '@yoroi_target_weight',
  '@yoroi_sleep_entries',
  '@yoroi_mood_log',
];

// Clés AsyncStorage touchées par la démo : mises de côté puis rendues
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
  '@yoroi_hydration_history',
  '@yoroi_hydration_today',
  'yoroi_benchmarks_v2',
  'yoroi_skills_v2',
  'yoroi_carnet_initialized_v2',
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
  '@yoroi_weekly_sparring_goal',
  // Voie de l'Armure (v2) : le journal d'XP et ses reglages suivent les donnees,
  // la demo a les siens et la sortie du mode demo rend ceux de l'utilisateur
  'yoroi_xp_ledger_v1',
  'yoroi_armure_meta_v1',
  // Ton espace (scene, personnage, sports favoris, blocs de l'accueil) : la demo a le sien
  'yoroi_espace_v1',
  // 17 octobre (captures des stores) : le sommeil est lu dans AsyncStorage (lib/sleepService.ts),
  // les jours de pesee de l'accueil, les objectifs des anneaux et l'humeur
  '@yoroi_sleep_entries',
  '@yoroi_sleep_migrated_to_async',
  '@yoroi_pesee_habitude_v1',
  '@yoroi_v2_sante_ring_goals',
  'yoroi_torii_v1',
  // NOTE : PAS @yoroi_dev_mode ni @yoroi_screenshot_menu_unlocked (etats de l'app, pas des donnees)
];

/** Clé du jour de l'hydratation (une par date) */
const hydrationDayKey = (iso: string) => `@yoroi_hydration_today_${iso}`;
const isHydrationDayKey = (k: string) => k.startsWith('@yoroi_hydration_today_');

// ============================================
// HASARD REPRODUCTIBLE : Heny est le meme a chaque chargement (dates relatives a aujourd'hui)
// ============================================

let seedState = 20261010;
function rng(): number {
  seedState |= 0;
  seedState = (seedState + 0x6d2b79f5) | 0;
  let t = Math.imul(seedState ^ (seedState >>> 15), 1 | seedState);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

const generateId = (): string => `demo-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const rand = (min: number, max: number, decimals = 1): number => parseFloat((min + rng() * (max - min)).toFixed(decimals));

const randInt = (min: number, max: number): number => Math.floor(min + rng() * (max - min + 1));

const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];

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

const fmtTime = (h: number, m: number): string => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

const JJB_THEMES = [
  'Passage de garde', 'Balayage', 'Triangle depuis garde fermee',
  'Kimura', 'Demi-garde', 'De la Riva', 'Takedowns', 'Back take',
  'Mount escapes', 'Side control', 'Knee cut', 'Etranglement arriere',
  'Arm drag', 'X-Guard', 'Berimbolo', 'Omoplata', 'Leg locks',
  'Guillotine', 'Darce choke', 'Anaconda',
];

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
  { name: 'Professeur Sandro',  belt: 'noire',    skill: 10, notes: 'Référence technique. Jeu de garde redoutable, passages précis.' },
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
function buildDemoRounds(count: number, progress: number): any[] {
  const rounds: any[] = [];

  // Sélectionner 2-4 partenaires pour cette session (sur les 6 disponibles)
  const nb = randInt(3, 4);
  // 17 octobre : au plus un professeur ceinture noire par seance (sinon une seance de rounds tous perdus)
  const melange = [...SPARRING_PARTNERS].sort(() => rng() - 0.5);
  const prof = melange.find((x) => x.belt === 'noire');
  const pool = [...(prof ? [prof] : []), ...melange.filter((x) => x.belt !== 'noire')].slice(0, nb);

  for (let i = 1; i <= count; i++) {
    const partner = pool[i % pool.length];

    // Résultat selon skill : plus skill élevé, plus de chances de perdre.
    // RESPECT CEINTURES NOIRES : contre un prof noir, on ne gagne JAMAIS (loss ou draw uniquement).
    let result: 'win' | 'loss' | 'draw';
    if (partner.belt === 'noire') {
      // 80% loss, 20% draw, jamais de win contre un prof ceinture noire
      result = rng() < 0.8 ? 'loss' : 'draw';
    } else {
      const skillDiff = partner.skill - 7; // Heny ~ niveau 7 (ceinture bleue)
      const winChance = Math.max(0.1, Math.min(0.8, 0.5 - skillDiff * 0.1 + progress * 0.2));
      const drawChance = 0.15;
      const r = rng();
      result = r < winChance ? 'win' : r < winChance + drawChance ? 'draw' : 'loss';
    }

    // Techniques utilisées dans ce round (1-4)
    const usedTechs = [...JJB_TECHNIQUES]
      .sort(() => rng() - 0.5)
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
      if (rng() > 0.7) methodsGiven.push(pick(SUBMISSIONS));
    } else if (result === 'loss') {
      // Perdu : 1-2 soumissions subies
      const nbSubs = randInt(1, 2);
      for (let j = 0; j < nbSubs; j++) methodsTaken.push(pick(SUBMISSIONS));
    } else {
      // Nul : parfois 1 soum des deux côtés
      if (rng() > 0.5) methodsGiven.push(pick(SUBMISSIONS));
      if (rng() > 0.5) methodsTaken.push(pick(SUBMISSIONS));
    }

    const intensity = i > count - 2 ? 'guerre' : pick(['technique', 'technique', 'guerre', 'detendu']);
    const selfRating = result === 'win' ? randInt(7, 10) : result === 'loss' ? randInt(4, 7) : randInt(5, 8);
    const partnerRating = Math.min(10, partner.skill + (rng() > 0.5 ? 0 : -1));

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
    if (rng() > 0.05) {
      round.gamePlan = pick(GAME_PLANS);
      round.whatWorked = pick(WHAT_WORKED_SAMPLES);
      round.whatDidntWork = pick(WHAT_DIDNT_WORK_SAMPLES);
      round.improvement = pick(IMPROVEMENT_SAMPLES);
      // Contre-technique si perdu
      if (result === 'loss' && rng() > 0.5) {
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
  'Professeur Sandro': {
    strengths: [
      'Contrôle des grips imparable',
      'Passage de garde pressure incroyable',
      'Lecture du sparring, toujours 2 coups d\'avance',
      'Back take depuis n\'importe quelle position',
    ],
    weaknesses: [
      '(aucune vraie faiblesse, ceinture noire 3e degré)',
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
      '(ceinture noire, cherche pas de faiblesses)',
    ],
    whatWorks: [
      'Le frame précoce avant qu\'il ne pose la pression',
      'Ne pas accepter la mount passivement',
      'Donner les grips, ne pas se battre pour des grips qu\'on va perdre',
    ],
    tacticalNotes: [
      'Style completement opposé à Prof Sandro. Lui c\'est pressure, Sandro c\'est technique.',
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
      'Bouger constamment en bottom, un Larbi statique = un Larbi qui passe',
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
    activeGoal: 'Atteindre 20% de winrate contre lui',
  },
  'Hedi': {
    strengths: [
      'Triangle depuis la garde fermée redoutable',
      'Flexibilité au-dessus de la moyenne',
      'Transitions omoplata ↔ triangle fluides',
      'Bonne lecture du timing',
    ],
    weaknesses: [
      'Cardio moyen, gaz après 6 rounds',
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
    activeGoal: 'Gagner 60% des rounds',
  },
  'Yanis': {
    strengths: [
      'Takedowns explosifs (fond wrestling)',
      'Double-leg en force de la nature',
      'Jeu top avec beaucoup d\'énergie',
    ],
    weaknesses: [
      'Très peu de jeu de garde, se fait passer facilement',
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
      'Attendre ses erreurs, il en fait beaucoup',
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

async function seedSparringPartners(tally: Record<string, { w: number; l: number; d: number }>): Promise<void> {
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
      matchCount: (tally[p.name]?.w ?? 0) + (tally[p.name]?.l ?? 0) + (tally[p.name]?.d ?? 0),
      wins: tally[p.name]?.w ?? 0,
      losses: tally[p.name]?.l ?? 0,
      draws: tally[p.name]?.d ?? 0,
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
  'Le Prof Sandro m\'a corrigé les grips, différence énorme.',
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
      'Prof. Sandro : couper l\'angle à 45° AVANT de serrer. Sans ça, l\'adversaire se dégage.',
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
      'Contre Prof. Sandro : il casse les grips en 2 secondes. Solution = chainer vite.',
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
      'Prof. Sandro m\'a montré le berimbolo setup, je dois drill.',
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
      'Pas autorisé en gi dans la plupart des compétitions. Je drill en no-gi open mat.',
      'Encore flou sur les positions d\'entrée, besoin de séance dédiée avec Prof. Lucas.',
    ],
    'Double Leg': [
      'Level change trop lent, je me fais sprawl systématiquement.',
      'Drill le changement de niveau seul, 30 reps/jour.',
    ],
    'Berimbolo': [
      'Setup depuis De la Riva, pas depuis la garde fermée.',
      'Prof. Sandro a montré la bascule arrière en 3 phases. À drill 100 reps.',
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
// ETAT DE LA DEMO
// ============================================

export const isDemoDataActive = async (): Promise<boolean> => {
  const val = await AsyncStorage.getItem(DEMO_ACTIVE_KEY);
  return val === 'true';
};

/**
 * Vague 45 : une demo chargee par une ancienne version (pesees et records jusqu'au 31 janvier 2027)
 * garde des lignes apres aujourd'hui. Seulement quand la demo est active (tes vraies donnees sont
 * de cote dans les tables demo_bak_ et n'y sont jamais touchees) : on retire de la demo tout ce qui
 * est date apres aujourd'hui, sauf les competitions et le planning (a venir par nature).
 * Renvoie le nombre de lignes retirees.
 */
/**
 * Competitions a venir inventees par les versions de la demo (aout puis octobre 2026), dont « Championnat Regional
 * PACA, 7 novembre, Gymnase Borely ». En mode demo seulement, celles a venir sont retirees au demarrage. Les
 * competitions passees de la demo (Open des Garrigues, Tournoi des Collines) restent : elles portent l'historique
 * de combats de Heny. 16 octobre nuit : la demo n'ajoute plus aucune competition a venir (Houari : « laisse
 * l'utilisateur choisir seul sa prochaine compétition »), et lib/v2/competition/verifiees.ts n'est plus importe.
 */
export const COMPETITIONS_INVENTEES_DEMO: string[] = [
  'Open de Marseille JJB',
  'IBJJF Paris Open',
  'Coupe de France Grappling',
  'Championnat Regional PACA',
  'Open de la Côte',
  'Open de Toulouse',
  'Open de Corse',
  'Paris Fall International Open IBJJF',
  'Open de Guilherand-Granges',
  'Open de Chilly Mazarin',
  // 17 octobre nuit (Houari : « enlève les compétitions par défaut ») : la demo ne cree plus aucune competition,
  // ni a venir ni passee ; celles des versions precedentes partent aussi des appareils qui les ont deja
  'Open des Lavandes',
  'Open des Garrigues',
  'Tournoi des Collines',
];

/** 17 octobre : clubs de la demo (noms affiches tels quels). Plus aucune competition creee par la demo. */
export const CLUB_JJB_DEMO = 'First Jiu-Jitsu Academy';
export const CLUB_MUSCU_DEMO = 'Basic-Fit Prado';
const OBJECTIF_SEMAINE = 6;

const DEMO_PAST_ONLY_TABLES = ['weights', 'trainings', 'measurements', 'health_data', 'photos', 'combats', 'sleep_entries', 'hydration_logs', 'body_compositions'];
export async function trimDemoFuture(): Promise<number> {
  if (!(await isDemoDataActive())) return 0;
  const todayIso = fmtDate(new Date());
  let removed = 0;
  try {
    const tables = new Set(await userTables());
    const db = await openDatabase();
    for (const t of DEMO_PAST_ONLY_TABLES) {
      if (!tables.has(t)) continue;
      const cols = await columnsOf(t);
      if (!cols.includes('date')) continue;
      const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM "${t}" WHERE substr(date, 1, 10) > ?`, [todayIso]);
      const n = Number(row?.n ?? 0);
      if (n > 0) {
        await db.runAsync(`DELETE FROM "${t}" WHERE substr(date, 1, 10) > ?`, [todayIso]);
        removed += n;
      }
    }
    // 16 octobre : les competitions inventees par les anciennes demos (dont « Championnat Regional PACA ») partent.
    // 17 octobre nuit : passees comme a venir (Open des Lavandes, Open des Garrigues, Tournoi des Collines) ; les
    // combats de Heny restent, detaches de la competition retiree. Mode demo seulement : tes vraies competitions,
    // mises de cote pendant la demo, ne sont jamais touchees.
    if (tables.has('competitions')) {
      const noms = COMPETITIONS_INVENTEES_DEMO;
      const marques = noms.map(() => '?').join(', ');
      const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM competitions WHERE nom IN (${marques})`, [...noms]);
      const n = Number(row?.n ?? 0);
      if (n > 0) {
        if (tables.has('combats')) await db.runAsync(`UPDATE combats SET competition_id = NULL WHERE competition_id IN (SELECT id FROM competitions WHERE nom IN (${marques}))`, [...noms]);
        if (tables.has('objectifs_poids')) await db.runAsync(`UPDATE objectifs_poids SET competition_id = NULL WHERE competition_id IN (SELECT id FROM competitions WHERE nom IN (${marques}))`, [...noms]);
        await db.runAsync(`DELETE FROM competitions WHERE nom IN (${marques})`, [...noms]);
        removed += n;
      }
    }
    const raw = await AsyncStorage.getItem('yoroi_benchmarks_v2');
    if (raw) {
      const list = JSON.parse(raw) as { entries?: { date?: string }[] }[];
      let changed = false;
      for (const b of list) {
        const before = b.entries?.length ?? 0;
        b.entries = (b.entries ?? []).filter((e) => !e.date || String(e.date).slice(0, 10) <= todayIso);
        if (b.entries.length !== before) {
          removed += before - b.entries.length;
          changed = true;
        }
      }
      if (changed) await AsyncStorage.setItem('yoroi_benchmarks_v2', JSON.stringify(list));
    }
  } catch (e) {
    logger.warn('[DemoData] nettoyage des dates futures de la démo', e);
  }
  if (removed > 0) logger.info(`[DemoData] ${removed} lignes datées après aujourd’hui retirées de la démo`);
  return removed;
}

/** Profil chargé : 'heny', ou null (vraies données). Une ancienne démo compte comme Heny. */
export const getActiveDemoProfile = async (): Promise<'heny' | null> => ((await isDemoDataActive()) ? 'heny' : null);

// ============================================
// SAUVEGARDE DES TABLES (dans la base elle-meme)
// ============================================

type TablesMeta = { v: 2; mode: 'full' | 'legacy'; tables: string[]; at: string };
type AsyncBackup = { v?: number; async: Record<string, string | null>; secure: Record<string, unknown> };

const safeName = (t: string) => /^[A-Za-z0-9_]+$/.test(t);

async function userTables(): Promise<string[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
  return rows
    .map((r) => r.name)
    .filter((n) => safeName(n) && !n.startsWith(DEMO_BACKUP_TABLE_PREFIX) && !KEEP_TABLES.has(n));
}

async function columnsOf(table: string): Promise<string[]> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ name: string }>(`PRAGMA table_info("${table}")`);
  return rows.map((r) => r.name).filter(safeName);
}

async function countOf(table: string): Promise<number> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM "${table}"`);
  return Number(row?.n ?? 0);
}

/** Copie chaque table dans demo_bak_<table>, puis vérifie le nombre de lignes. Rien n'est effacé ici. */
async function backupTables(tables: string[]): Promise<void> {
  const db = await openDatabase();
  for (const t of tables) {
    const bak = `${DEMO_BACKUP_TABLE_PREFIX}${t}`;
    await db.execAsync(`DROP TABLE IF EXISTS "${bak}"; CREATE TABLE "${bak}" AS SELECT * FROM "${t}";`);
    const [a, b] = [await countOf(t), await countOf(bak)];
    if (a !== b) throw new Error(`Sauvegarde incomplète de la table ${t}`);
  }
}

/** Clés étrangères coupées le temps de vider et remplir (rétablies ensuite si elles étaient actives) */
async function withForeignKeysOff(fn: () => Promise<void>): Promise<void> {
  const db = await openDatabase();
  const row = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
  const wasOn = Number(row?.foreign_keys ?? 0) === 1;
  if (wasOn) await db.execAsync('PRAGMA foreign_keys = OFF;');
  try {
    await fn();
  } finally {
    if (wasOn) await db.execAsync('PRAGMA foreign_keys = ON;');
  }
}

/** Remet chaque table à l'identique depuis sa copie (colonnes communes, ids compris) */
async function restoreTables(tables: string[], clearOthers: boolean): Promise<void> {
  const db = await openDatabase();
  const present = await userTables();
  const plan: { t: string; cols: string[] }[] = [];
  // ordre de creation des tables : les parents avant les enfants
  for (const t of present) {
    if (!tables.includes(t)) continue;
    const bak = `${DEMO_BACKUP_TABLE_PREFIX}${t}`;
    const exists = await db.getFirstAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?", [bak]);
    if (!exists) continue;
    const target = new Set(await columnsOf(t));
    const cols = (await columnsOf(bak)).filter((c) => target.has(c));
    plan.push({ t, cols });
  }
  await withForeignKeysOff(async () => {
    await db.withTransactionAsync(async () => {
      // 1. on vide : les tables restaurees, et celles nees pendant la demo (elles ne contiennent que la demo)
      for (const t of present) {
        if (plan.some((x) => x.t === t) || (clearOthers && !tables.includes(t))) await db.execAsync(`DELETE FROM "${t}";`);
      }
      // 2. on remplit
      for (const { t, cols } of plan) {
        if (!cols.length) continue;
        const list = cols.map((c) => `"${c}"`).join(', ');
        await db.execAsync(`INSERT INTO "${t}" (${list}) SELECT ${list} FROM "${DEMO_BACKUP_TABLE_PREFIX}${t}";`);
      }
    });
  });
}

async function dropBackupTables(): Promise<void> {
  const db = await openDatabase();
  const rows = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name LIKE 'demo_bak_%'");
  for (const r of rows) if (safeName(r.name)) await db.execAsync(`DROP TABLE IF EXISTS "${r.name}";`);
}

/** Vide les tables pour la démo (jamais les copies de sauvegarde ni le catalogue) */
async function clearTablesForDemo(): Promise<void> {
  const db = await openDatabase();
  const tables = await userTables();
  await withForeignKeysOff(async () => {
    await db.withTransactionAsync(async () => {
      for (const t of tables) await db.execAsync(`DELETE FROM "${t}";`);
    });
  });
}

async function readTablesMeta(): Promise<TablesMeta | null> {
  try {
    const raw = await AsyncStorage.getItem(DEMO_BACKUP_TABLES_KEY);
    const m = raw ? (JSON.parse(raw) as TablesMeta) : null;
    return m && Array.isArray(m.tables) ? m : null;
  } catch {
    return null;
  }
}

async function readAsyncBackup(): Promise<AsyncBackup | null> {
  const raw = await AsyncStorage.getItem(DEMO_BACKUP_ASYNC_KEY);
  if (!raw) return null;
  const parsed = JSON.parse(raw);
  // ancien format a plat ou format { async, secure }
  return { v: parsed.v, async: parsed.async ?? parsed, secure: parsed.secure ?? {} };
}

/** Clés réglages à mettre de côté aujourd'hui */
const asyncKeysNow = () => [...DEMO_ASYNC_KEYS, hydrationDayKey(fmtDate(new Date()))];

// ============================================
// SAUVEGARDE DES VRAIES DONNEES (avant la demo)
// ============================================

const backupRealData = async (): Promise<void> => {
  logger.info('[DemoData] Sauvegarde des vraies données...');

  // 1. Toutes les tables, copiées dans la base (exact, sans limite de taille)
  const tables = await userTables();
  await backupTables(tables);

  // 2. Copie JSON de secours (ancien format), sans bloquer si elle est trop grosse
  try {
    const sqliteData = await exportAllData();
    await AsyncStorage.setItem(DEMO_BACKUP_SQLITE_KEY, JSON.stringify(sqliteData));
  } catch (e) {
    logger.warn('[DemoData] Copie JSON de secours impossible, les tables suffisent', e);
  }

  // 3. Les clés réglages et les clés sécurisées que la démo touche
  const asyncBackup: Record<string, string | null> = {};
  for (const key of asyncKeysNow()) asyncBackup[key] = await AsyncStorage.getItem(key);
  const secureBackup: Record<string, unknown> = {};
  for (const key of DEMO_SECURE_KEYS) secureBackup[key] = await secureStorage.getItem(key);
  await AsyncStorage.setItem(DEMO_BACKUP_ASYNC_KEY, JSON.stringify({ v: 2, async: asyncBackup, secure: secureBackup }));

  // 4. Seulement maintenant : la liste des tables sauvegardées
  const meta: TablesMeta = { v: 2, mode: 'full', tables, at: new Date().toISOString() };
  await AsyncStorage.setItem(DEMO_BACKUP_TABLES_KEY, JSON.stringify(meta));
  logger.info('[DemoData] Sauvegarde terminée.');
};

/**
 * Démo déjà chargée : la sauvegarde existe. On la complète seulement avec ce qu'elle ne couvre pas
 * encore (clés ajoutées depuis, tables d'une ancienne démo) : ces valeurs-là sont encore les vraies.
 */
const completeBackup = async (): Promise<void> => {
  const backup = (await readAsyncBackup()) ?? { async: {}, secure: {} };
  let changed = false;
  for (const key of asyncKeysNow()) {
    if (!Object.prototype.hasOwnProperty.call(backup.async, key)) {
      backup.async[key] = await AsyncStorage.getItem(key);
      changed = true;
    }
  }
  for (const key of DEMO_SECURE_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(backup.secure, key)) {
      backup.secure[key] = await secureStorage.getItem(key);
      changed = true;
    }
  }
  if (changed) await AsyncStorage.setItem(DEMO_BACKUP_ASYNC_KEY, JSON.stringify({ v: 2, async: backup.async, secure: backup.secure }));

  if (!(await readTablesMeta())) {
    // ancienne démo : les tables qu'elle ne vidait pas gardent encore les vraies lignes
    const tables = (await userTables()).filter((t) => !LEGACY_RESET_TABLES.has(t));
    await backupTables(tables);
    const meta: TablesMeta = { v: 2, mode: 'legacy', tables, at: new Date().toISOString() };
    await AsyncStorage.setItem(DEMO_BACKUP_TABLES_KEY, JSON.stringify(meta));
  }
};

async function removeLegacyDemoKeys(): Promise<void> {
  try {
    const all = await AsyncStorage.getAllKeys();
    const old = all.filter((k) => LEGACY_SNAPSHOT_PREFIXES.some((p) => k.startsWith(p)));
    await AsyncStorage.multiRemove([...old, ...LEGACY_DEMO_KEYS]);
  } catch {
    // sans importance
  }
}

// ============================================
// RETOUR DES VRAIES DONNEES
// ============================================

export const restoreRealData = async (): Promise<boolean> => {
  const isActive = await isDemoDataActive();
  if (!isActive) {
    logger.info('[DemoData] Aucune démo chargée, rien à remettre.');
    return false;
  }

  logger.info('[DemoData] Retour des vraies données...');

  try {
    const meta = await readTablesMeta();

    // 1. La base
    if (meta && meta.mode === 'full') {
      await restoreTables(meta.tables, true);
    } else {
      // ancienne sauvegarde JSON (démo chargée avant cette version)
      await resetDatabase();
      const sqliteBackupStr = await AsyncStorage.getItem(DEMO_BACKUP_SQLITE_KEY);
      if (sqliteBackupStr) await importData(sqliteBackupStr);
      if (meta) await restoreTables(meta.tables, false);
    }

    // 2. Les réglages et les clés sécurisées : seulement celles que la sauvegarde contient
    const backup = await readAsyncBackup();
    if (backup) {
      for (const key of Object.keys(backup.async)) {
        if (!DEMO_ASYNC_KEYS.includes(key) && !isHydrationDayKey(key)) continue;
        const value = backup.async[key];
        if (value !== null && value !== undefined) await AsyncStorage.setItem(key, value);
        else await AsyncStorage.removeItem(key);
      }
      for (const key of Object.keys(backup.secure)) {
        if (!DEMO_SECURE_KEYS.includes(key)) continue;
        const value = backup.secure[key];
        if (value !== null && value !== undefined) await secureStorage.setItem(key, value as never);
        else await secureStorage.removeItem(key);
      }
    }

    // 3. Les copies et le drapeau, en dernier
    await dropBackupTables();
    await AsyncStorage.multiRemove([DEMO_ACTIVE_KEY, DEMO_BACKUP_SQLITE_KEY, DEMO_BACKUP_ASYNC_KEY, DEMO_BACKUP_TABLES_KEY, DEMO_PROFILE_KEY]);
    await removeLegacyDemoKeys();

    logger.info('[DemoData] Vraies données de retour.');
    return true;
  } catch (error) {
    logger.error('[DemoData] Retour des vraies données impossible:', error);
    throw error;
  }
};

/** Vérifie la sauvegarde en cours sans rien toucher (pour le Studio) */
export async function inspectDemoBackup(): Promise<{ active: boolean; mode: 'full' | 'legacy' | 'json' | null; tables: number; rows: number; at: string | null }> {
  const active = await isDemoDataActive();
  if (!active) return { active, mode: null, tables: 0, rows: 0, at: null };
  const meta = await readTablesMeta();
  if (!meta) return { active, mode: 'json', tables: 0, rows: 0, at: null };
  let rows = 0;
  let tables = 0;
  for (const t of meta.tables) {
    try {
      rows += await countOf(`${DEMO_BACKUP_TABLE_PREFIX}${t}`);
      tables += 1;
    } catch {
      // copie absente
    }
  }
  return { active, mode: meta.mode, tables, rows, at: meta.at };
}

// ============================================
// LE PROFIL HENY
// ============================================

export type HenyStats = {
  workouts: number;
  muscu: number;
  jjb: number;
  course: number;
  foot: number;
  weights: number;
  measurements: number;
  sleepEntries: number;
  competitions: number;
  combats: number;
  skills: number;
};

const WEEKS = 30;

type Lift = { name: string; group: string; sets: number; reps: number; from: number; to: number; step: number; repsTo?: number };

const PUSH: Lift[] = [
  { name: 'Développé couché (Barre)', group: 'pectoraux', sets: 4, reps: 5, from: 80, to: 100, step: 2.5 },
  { name: 'Développé militaire', group: 'epaules', sets: 3, reps: 8, from: 42.5, to: 55, step: 2.5 },
  { name: 'Développé incliné (Barre)', group: 'pectoraux', sets: 3, reps: 8, from: 60, to: 72.5, step: 2.5 },
  { name: 'Élévations latérales', group: 'epaules', sets: 3, reps: 12, from: 10, to: 14, step: 2 },
  { name: 'Barre au front', group: 'triceps', sets: 3, reps: 10, from: 25, to: 32.5, step: 2.5 },
];
const PULL: Lift[] = [
  { name: 'Soulevé de terre (Deadlift)', group: 'dos', sets: 3, reps: 5, from: 130, to: 170, step: 2.5 },
  { name: 'Tractions (Pronation)', group: 'dos', sets: 4, reps: 6, from: 0, to: 0, step: 1, repsTo: 10 },
  { name: 'Rowing barre', group: 'dos', sets: 4, reps: 8, from: 65, to: 80, step: 2.5 },
  { name: 'Curl barre EZ', group: 'biceps', sets: 3, reps: 10, from: 30, to: 37.5, step: 2.5 },
];
const LEGS: Lift[] = [
  { name: 'Squat (Barre)', group: 'jambes', sets: 4, reps: 5, from: 100, to: 135, step: 2.5 },
  { name: 'Presse à cuisses', group: 'jambes', sets: 3, reps: 10, from: 180, to: 240, step: 10 },
  { name: 'Soulevé de terre jambes tendues', group: 'jambes', sets: 3, reps: 8, from: 80, to: 100, step: 2.5 },
  { name: 'Fentes haltères', group: 'jambes', sets: 3, reps: 10, from: 20, to: 26, step: 2 },
];

/** Vendredi : haut du corps. Le developpe couche suit la meme progression que le lundi (ton exercice le plus
 * suivi), le reste a charge stable : pas de faux record sur des exercices d'appoint. */
const UPPER: Lift[] = [
  PUSH[0],
  { name: 'Tirage vertical', group: 'dos', sets: 3, reps: 10, from: 62.5, to: 62.5, step: 2.5 },
  { name: 'Développé Arnold', group: 'epaules', sets: 3, reps: 10, from: 18, to: 18, step: 2 },
  { name: 'Rowing haltère', group: 'dos', sets: 3, reps: 10, from: 32, to: 32, step: 2 },
  { name: 'Curl marteau', group: 'biceps', sets: 3, reps: 12, from: 16, to: 16, step: 2 },
];

/** Charge du jour : progression rapide puis plus lente, semaine plus légère toutes les 6 semaines */
function liftLoad(l: Lift, w: number, light: boolean): { weight: number; reps: number } {
  const p = Math.min(1, w / (WEEKS - 1));
  // 17 octobre : courbe moins aplatie a la fin (des records jusqu'aux dernieres semaines),
  // semaine plus legere toutes les 6 semaines mais jamais la semaine en cours ni la precedente
  const curve = 1 - Math.pow(1 - p, 1.15);
  const deload = w > 0 && (WEEKS - 1 - w) % 6 === 4;
  const factor = (deload ? 0.9 : 1) * (light ? 0.88 : 1);
  if (l.repsTo) {
    const reps = Math.round(l.reps + (l.repsTo - l.reps) * curve) - (deload || light ? 2 : 0);
    return { weight: 0, reps: Math.max(3, reps) };
  }
  const v = (l.from + (l.to - l.from) * curve) * factor;
  return { weight: Math.round(v / l.step) * l.step, reps: l.reps };
}

function buildExercises(list: Lift[], w: number, light: boolean): Exercise[] {
  return list.map((l) => {
    const { weight, reps } = liftLoad(l, w, light);
    // la derniere serie lache parfois une repetition
    const setsData = Array.from({ length: l.sets }, (_, i) => ({ weight, reps: i === l.sets - 1 && rng() < 0.3 ? Math.max(1, reps - 1) : reps }));
    return { name: l.name, sets: l.sets, reps, weight, muscle_group: l.group, setsData } as Exercise & { setsData: { weight: number; reps: number }[] };
  });
}

/** Courbe du poids : points de passage (jours avant aujourd'hui, kg), puis interpolation */
const WEIGHT_PATH: [number, number][] = [
  // 17 octobre : une baisse reguliere qui suit le plan, un palier en aout, et le cap de 80 kg en vue
  [210, 86.4],
  [175, 85.2],
  [140, 84.0],
  [119, 83.1], // Open des Garrigues
  [95, 82.5],
  [76, 81.9],
  [66, 82.3], // vacances d'aout
  [45, 81.6],
  [41, 81.4], // Tournoi des Collines
  [20, 80.9],
  [0, 80.5],
];

function trendWeight(daysAgo: number): number {
  for (let i = 0; i < WEIGHT_PATH.length - 1; i++) {
    const [d0, v0] = WEIGHT_PATH[i];
    const [d1, v1] = WEIGHT_PATH[i + 1];
    if (daysAgo <= d0 && daysAgo >= d1) {
      const t = (d0 - daysAgo) / (d0 - d1 || 1);
      return v0 + (v1 - v0) * t;
    }
  }
  return daysAgo > WEIGHT_PATH[0][0] ? WEIGHT_PATH[0][1] : WEIGHT_PATH[WEIGHT_PATH.length - 1][1];
}

// ============================================
// COURSE DU SAMEDI SUR LA CORNICHE (Marseille), aller et retour depuis les Catalans
// ============================================
const CORNICHE: [number, number][] = [
  [43.2906, 5.3607], [43.2893, 5.3571], [43.2881, 5.3538], [43.2866, 5.3512], [43.2856, 5.3499],
  [43.2842, 5.3484], [43.2826, 5.3476], [43.2808, 5.3483], [43.2797, 5.3505], [43.2789, 5.3536],
  [43.2779, 5.3570], [43.2768, 5.3605], [43.2748, 5.3631], [43.2726, 5.3654], [43.2704, 5.3676],
  [43.2681, 5.3695], [43.2657, 5.3715], [43.2634, 5.3733], [43.2617, 5.3746],
];
const distM = (a: [number, number], b: [number, number]) => {
  const R = 6371000;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLon = ((b[1] - a[1]) * Math.PI) / 180;
  const x = Math.sin(dLat / 2) ** 2 + Math.cos((a[0] * Math.PI) / 180) * Math.cos((b[0] * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
/** Point a m metres du depart, le long de la Corniche */
function surCorniche(m: number): [number, number] {
  let left = m;
  for (let i = 0; i < CORNICHE.length - 1; i++) {
    const d = distM(CORNICHE[i], CORNICHE[i + 1]);
    if (left <= d) {
      const t = left / (d || 1);
      return [CORNICHE[i][0] + (CORNICHE[i + 1][0] - CORNICHE[i][0]) * t, CORNICHE[i][1] + (CORNICHE[i + 1][1] - CORNICHE[i][1]) * t];
    }
    left -= d;
  }
  return CORNICHE[CORNICHE.length - 1];
}
const CORNICHE_M = CORNICHE.slice(1).reduce((acc, p, i) => acc + distM(CORNICHE[i], p), 0);

/** Details de montre d'une course : trace, frequence cardiaque, kilometres, meteo (comme une seance Apple) */
function courseDetails(dateStr: string, time: string, km: number, paceSec: number, progress: number) {
  const [h, mi] = time.split(':').map(Number);
  const start = new Date(`${dateStr}T00:00:00`);
  start.setHours(h, mi, 0, 0);
  const t0 = start.getTime();
  const totalM = km * 1000;
  const half = Math.min(totalM / 2, CORNICHE_M);
  const kmPaces: number[] = [];
  const nKm = Math.ceil(km);
  for (let k = 0; k < nKm; k++) {
    const negative = (k / Math.max(1, nKm - 1)) * -8; // negative split, finit plus vite
    kmPaces.push(Math.round(paceSec + 6 + negative + rand(-5, 5, 0)));
  }
  const timeAt = (m: number) => {
    let t = 0;
    let left = m;
    for (let k = 0; k < nKm && left > 0; k++) {
      const seg = Math.min(1000, left);
      t += (seg / 1000) * kmPaces[k];
      left -= seg;
    }
    return t;
  };
  const durSec = Math.round(timeAt(totalM));
  const routePoints: { latitude: number; longitude: number; altitude: number; timestamp: string }[] = [];
  for (let m = 0; m <= totalM; m += 40) {
    const along = m <= half ? m : Math.max(0, totalM - m);
    const [lat, lon] = surCorniche(Math.min(along, half));
    routePoints.push({ latitude: lat, longitude: lon, altitude: 8 + 14 * Math.sin((along / CORNICHE_M) * Math.PI * 3), timestamp: new Date(t0 + timeAt(m) * 1000).toISOString() });
  }
  const restBase = 150 - progress * 6;
  const heartRateSamples: { timestamp: string; bpm: number }[] = [];
  for (let t = 3; t < durSec; t += 5) {
    const warm = t < 300 ? (t / 300) * 40 : 40;
    const drift = (t / durSec) * 10;
    const v = 105 + warm + drift + (restBase - 150) + 3 * Math.sin(t / 70) + rand(-2, 2, 0);
    heartRateSamples.push({ timestamp: new Date(t0 + t * 1000).toISOString(), bpm: Math.round(v) });
  }
  const bpms = heartRateSamples.map((x) => x.bpm);
  const avg = Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length);
  const splits = kmPaces.map((pace, i) => {
    const d = Math.min(1, km - i);
    const from = Math.floor((timeAt(i * 1000) / durSec) * bpms.length);
    const to = Math.max(from + 1, Math.floor((timeAt(i * 1000 + d * 1000) / durSec) * bpms.length));
    const part = bpms.slice(from, to);
    return { index: i + 1, distanceKm: parseFloat(d.toFixed(2)), paceSecondsPerKm: pace, durationSeconds: Math.round(pace * d), elevationGain: randInt(2, 9), avgHeartRate: Math.round(part.reduce((a, b) => a + b, 0) / (part.length || 1)) };
  });
  const kcal = Math.round(km * 68 + rand(-15, 15, 0));
  return {
    durSec,
    avg,
    max: Math.max(...bpms),
    kcal,
    details: {
      cacheVersion: 10,
      workoutStart: new Date(t0).toISOString(),
      workoutEnd: new Date(t0 + durSec * 1000).toISOString(),
      durationSeconds: durSec,
      durationMinutes: durSec / 60,
      distanceMeters: Math.round(totalM),
      distanceKm: km,
      heartRateSamples,
      avgHeartRate: avg,
      minHeartRate: Math.min(...bpms),
      maxHeartRate: Math.max(...bpms),
      activeCalories: kcal,
      totalCalories: kcal + Math.round(durSec / 60) * 1.4,
      avgPaceSecondsPerKm: Math.round(durSec / km),
      elevationAscended: Math.round(km * 4.5),
      elevationDescended: Math.round(km * 4.5),
      cadence: randInt(164, 172),
      stepsCount: Math.round((durSec / 60) * 168),
      isIndoor: false,
      weatherTemp: randInt(16, 24),
      weatherHumidity: randInt(55, 72),
      weatherCondition: 'Ensoleillé',
      routePoints,
      routeBoundingBox: {
        minLat: Math.min(...routePoints.map((p) => p.latitude)),
        maxLat: Math.max(...routePoints.map((p) => p.latitude)),
        minLon: Math.min(...routePoints.map((p) => p.longitude)),
        maxLon: Math.max(...routePoints.map((p) => p.longitude)),
      },
      startLatitude: routePoints[0].latitude,
      startLongitude: routePoints[0].longitude,
      city: 'Marseille',
      recoveryHR: { atEnd: Math.max(...bpms.slice(-6)), after1Min: Math.max(...bpms.slice(-6)) - 24, after2Min: Math.max(...bpms.slice(-6)) - 41 },
      splits,
      groundContactMs: { avg: randInt(242, 256), min: 220, max: 280 },
      strideLengthM: { avg: parseFloat((1000 / (paceSec / 60) / 168).toFixed(2)) },
      verticalOscCm: { avg: parseFloat(rand(8.6, 9.4, 1).toFixed(1)) },
      vo2Max: parseFloat((47 + progress * 3.5).toFixed(1)),
      effortScore: 7,
      effortEstimated: true,
    },
  };
}

const daysBetween = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / 86400000);

/** Samedi le plus proche de la date (pour les compétitions) */
function nearestSaturday(d: Date): Date {
  const x = new Date(d);
  const diff = (6 - x.getDay() + 7) % 7;
  if (diff <= 3) x.setDate(x.getDate() + diff);
  else x.setDate(x.getDate() - (7 - diff));
  return x;
}

export const generateHenyDemoData = async (): Promise<HenyStats> => {
  await initDatabase();

  // ======= 1. SAUVEGARDE DES VRAIES DONNEES, puis drapeau tout de suite =======
  // Le drapeau est pose AVANT de vider : si quelque chose casse ensuite, le retour
  // des vraies donnees marche toujours.
  const alreadyActive = await isDemoDataActive();
  if (alreadyActive) await completeBackup();
  else await backupRealData();
  await AsyncStorage.setItem(DEMO_ACTIVE_KEY, 'true');

  try {
    return await injectHeny();
  } catch (e) {
    logger.error('[DemoData] Démo Heny interrompue, retour des vraies données', e);
    try {
      await restoreRealData();
    } catch (err) {
      logger.error('[DemoData] Retour automatique impossible, la sauvegarde reste en place', err);
    }
    throw e;
  }
};

/**
 * 18 octobre 2026 : Heny pour la visite guidee, ecrite UNIQUEMENT dans la vitrine en memoire (lib/v2/visite/vitrine.ts).
 * Refuse si la vitrine n'est pas ouverte : sans elle, rien n'est ecrit. Aucune sauvegarde, aucun drapeau dans le
 * vrai stockage : la vitrine disparait avec la memoire (fin de la visite, app fermee ou plantage).
 */
export async function injecterHenyVitrine(): Promise<HenyStats> {
  if (!vitrineActive()) throw new Error('[DemoData] vitrine fermee : Heny n’est pas chargee');
  await AsyncStorage.setItem(DEMO_ACTIVE_KEY, 'true');
  if (!vitrineActive()) throw new Error('[DemoData] vitrine fermee pendant le chargement');
  return injectHeny();
}

async function injectHeny(): Promise<HenyStats> {
  seedState = 20261010;

  // ======= 2. ON VIDE =======
  await clearTablesForDemo();
  await AsyncStorage.multiRemove(DEMO_ASYNC_KEYS);
  for (const key of DEMO_SECURE_KEYS) await secureStorage.removeItem(key).catch(() => false);
  await removeLegacyDemoKeys();

  const now = new Date();
  const today = new Date(now);
  today.setHours(12, 0, 0, 0);
  const todayIso = fmtDate(today);
  // debut : un lundi, 30 semaines avant cette semaine
  const thisMonday = addDays(today, today.getDay() === 0 ? -6 : 1 - today.getDay());
  const startDate = addDays(thisMonday, -(WEEKS - 1) * 7);
  const year = today.getFullYear();
  const vacationFrom = fmtDate(new Date(year, 7, 3));
  const vacationTo = fmtDate(new Date(year, 7, 16));
  const injuryFrom = fmtDate(addDays(startDate, 11 * 7));
  const injuryTo = fmtDate(addDays(startDate, 11 * 7 + 7));
  const comp1 = nearestSaturday(addDays(today, -119));
  const comp2 = nearestSaturday(addDays(today, -41));
  const compDays = new Set([fmtDate(comp1), fmtDate(comp2)]);
  const FIVE_WEEKS = new Set<number>();
  for (let k = 1, step = 0; k < WEEKS; k += [2, 3, 2][step++ % 3]) FIVE_WEEKS.add(k);
  const stats: HenyStats = { workouts: 0, muscu: 0, jjb: 0, course: 0, foot: 0, weights: 0, measurements: 0, sleepEntries: 0, competitions: 0, combats: 0, skills: 0 };

  // ========== PROFIL ==========
  await saveProfile({
    name: 'Heny',
    height_cm: 178,
    target_weight: 80,
    start_weight: 86.4,
    start_date: fmtDate(startDate),
    avatar_gender: 'homme',
    weight_goal: 'lose',
    age: 30,
    birth_date: '1996-05-15',
  });
  await AsyncStorage.multiSet([
    ['@yoroi_user_settings', JSON.stringify({ username: 'Heny', height: 178, weight_unit: 'kg', measurement_unit: 'cm', goal: 'lose_weight', targetWeight: 80, startWeight: 86.4, gender: 'male', onboardingCompleted: true, citationStyle: 'warrior' })],
    ['@yoroi_user_height', '178'],
    ['@yoroi_user_sport', 'jjb'],
    ['@yoroi_user_mode', 'fighter'],
    ['@yoroi_gender', 'male'],
    ['@yoroi_belt', 'bleue'],
    ['@yoroi_start_weight', '86.4'],
    ['@yoroi_first_use_date', startDate.toISOString()],
    ['@yoroi_favorite_sports', JSON.stringify(['musculation', 'jjb', 'running', 'football'])],
    ['@yoroi_pesee_habitude_v1', JSON.stringify({ moment: 'reveil', actif: false, jours: [1, 3, 5] })],
    ['@yoroi_v2_sante_ring_goals', JSON.stringify({ move: 650, exercise: 45, stand: 12 })],
    ['@yoroi_weekly_sparring_goal', '3'],
    ['@yoroi_competitor_profile', JSON.stringify({ gender: 'male', category: 'medio', belt: 'blue', currentWeight: 81.6 })],
    ['yoroi_carnet_initialized_v2', 'true'],
  ]);
  await secureStorage.setItem('@yoroi_target_weight', '80');
  await saveEspace({ scene: 'chateau', personnage: 'guerrier_h', sportsFavoris: ['musculation', 'jjb', 'running', 'football'], objectifSemaine: OBJECTIF_SEMAINE, objectifChoisi: true, identite: 'personnage' });

  // ========== CLUBS ==========
  // 17 octobre (Houari) : le club de son entraineur, First Jiu-Jitsu Academy (logo fourni), et Basic-Fit Prado
  const gbClubId = await addClub({ name: CLUB_JJB_DEMO, sport: 'jjb', color: '#1D2029', logo_uri: LOGO_FIRST_JJA } as never);
  const bfClubId = await addClub({ name: CLUB_MUSCU_DEMO, sport: 'musculation', color: '#2C4A84', logo_uri: 'basic-fit' } as never);
  await AsyncStorage.setItem('@yoroi_user_clubs', JSON.stringify([
    { id: gbClubId, name: CLUB_JJB_DEMO, sport: 'jjb', color: '#1D2029', sessions_per_week: 3 },
    { id: bfClubId, name: CLUB_MUSCU_DEMO, sport: 'musculation', color: '#2C4A84', sessions_per_week: 4 },
  ]));

  // ========== EMPLOI DU TEMPS (0 = lundi) ==========
  // 17 octobre (Houari) : JJB lundi, mardi et jeudi a midi ; Basic-Fit lundi, mardi, jeudi et vendredi a 18 h ;
  // course sur la Corniche le samedi matin ; foot a 5 un dimanche soir sur deux ou trois (pas de creneau fixe)
  type Slot = { id: number; dow: number; sport: 'jjb' | 'musculation' | 'running'; time: string; dur: number; type: string };
  const slotDefs: Omit<Slot, 'id'>[] = [
    { dow: 0, sport: 'jjb', time: '12:00', dur: 75, type: 'cours' },
    { dow: 0, sport: 'musculation', time: '18:00', dur: 65, type: 'push' },
    { dow: 1, sport: 'jjb', time: '12:00', dur: 75, type: 'drilling' },
    { dow: 1, sport: 'musculation', time: '18:00', dur: 65, type: 'pull' },
    { dow: 3, sport: 'jjb', time: '12:00', dur: 75, type: 'sparring' },
    { dow: 3, sport: 'musculation', time: '18:00', dur: 70, type: 'legs' },
    { dow: 4, sport: 'musculation', time: '18:00', dur: 60, type: 'haut_du_corps' },
    { dow: 5, sport: 'running', time: '09:00', dur: 55, type: 'course' },
  ];
  const slots: Slot[] = [];
  for (const s of slotDefs) {
    const id = await addWeeklyPlanItem({
      day_of_week: s.dow,
      club_id: s.sport === 'jjb' ? gbClubId : s.sport === 'musculation' ? bfClubId : undefined,
      sport: s.sport,
      time: s.time,
      duration_minutes: s.dur,
      session_type: s.type,
      label: s.sport === 'running' ? 'Course sur la Corniche' : undefined,
    });
    slots.push({ ...s, id });
  }

  // ========== SEANCES ==========
  const tally: Record<string, { w: number; l: number; d: number }> = {};
  const trainingsByDay = new Map<string, { id: number; sport: string }[]>();
  const loads: { trainingId: number; date: string; duration: number; rpe: number; load: number; sport: string }[] = [];
  const best: Record<string, { value: number; reps: number }> = {};
  const benchEntries: Record<string, { id: string; value: number; reps: number; date: string; rpe: number }[]> = {};
  const BENCH: Record<string, string> = {
    'Squat (Barre)': 'Squat',
    'Développé couché (Barre)': 'Développé Couché',
    'Soulevé de terre (Deadlift)': 'Soulevé de Terre',
    'Développé militaire': 'Développé Militaire',
    'Tractions (Pronation)': 'Tractions',
  };

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const isDone = (dateStr: string, time: string, dur: number) => {
    if (dateStr < todayIso) return true;
    if (dateStr > todayIso) return false;
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m + dur <= nowMin;
  };

  const record = async (dateStr: string, sport: string, id: number, duration: number, rpe: number) => {
    stats.workouts += 1;
    if (sport === 'jjb') stats.jjb += 1;
    else if (sport === 'musculation') stats.muscu += 1;
    const list = trainingsByDay.get(dateStr) ?? [];
    list.push({ id, sport });
    trainingsByDay.set(dateStr, list);
    loads.push({ trainingId: id, date: dateStr, duration, rpe, load: duration * rpe, sport });
  };

  for (let day = new Date(startDate); fmtDate(day) <= todayIso; day = addDays(day, 1)) {
    const dateStr = fmtDate(day);
    const w = Math.floor(daysBetween(startDate, day) / 7);
    const progress = w / (WEEKS - 1);
    const js = day.getDay();
    const dow = js === 0 ? 6 : js - 1;
    const vacation = dateStr >= vacationFrom && dateStr <= vacationTo;
    const injured = dateStr >= injuryFrom && dateStr <= injuryTo;
    const compDay = compDays.has(dateStr);
    const dayBeforeComp = compDays.has(fmtDate(addDays(day, 1)));

    for (const slot of slots.filter((x) => x.dow === dow)) {
      if (compDay) continue;
      const skip = rng() < 0.04;
      if (slot.sport === 'musculation' && !skip) {
        // en vacances : deux seances en salle d'hotel, plus legeres, sans la jambe
        if (!vacation || slot.type !== 'legs') {
          const list = slot.type === 'push' ? PUSH : slot.type === 'pull' ? PULL : slot.type === 'legs' ? LEGS : UPPER;
          const light = vacation || dayBeforeComp;
          const exercises = buildExercises(list, w, light);
          const duration = slot.dur + randInt(-6, 8);
          const rpe = vacation ? 6 : randInt(7, 9);
          if (isDone(dateStr, slot.time, duration)) {
            const id = await addTraining({
              club_id: vacation ? undefined : bfClubId,
              sport: 'musculation',
              session_type: vacation ? 'full_body' : slot.type,
              date: dateStr,
              start_time: slot.time,
              duration_minutes: duration,
              intensity: rpe,
              exercises,
              calories: Math.round(duration * rand(6.5, 8.5, 1)),
              heart_rate: randInt(112, 128),
              max_heart_rate: randInt(152, 168),
              source: 'manual',
              weekly_plan_id: vacation ? undefined : slot.id,
              session_rating: randInt(7, 9),
            } as never);
            await record(dateStr, 'musculation', Number(id), duration, rpe);
            // records du carnet : chaque nouvelle meilleure serie
            for (const e of exercises) {
              const key = BENCH[e.name];
              if (!key) continue;
              const value = e.weight > 0 ? e.weight : e.reps;
              const prev = best[key];
              if (!prev || value > prev.value) {
                best[key] = { value, reps: e.reps };
                (benchEntries[key] = benchEntries[key] ?? []).push({ id: generateId(), value, reps: e.reps, date: dateStr, rpe });
              }
            }
          }
        }
      }
      if (slot.sport === 'jjb' && !skip && !vacation && !injured) {
        const type = dayBeforeComp ? 'drilling' : slot.type;
        const count = type === 'sparring' ? 6 : type === 'cours' ? 3 : 4;
        const rounds = buildDemoRounds(dayBeforeComp ? 2 : count, progress);
        rounds.forEach((r) => {
          const t = (tally[r.partner] = tally[r.partner] ?? { w: 0, l: 0, d: 0 });
          if (r.result === 'win') t.w += 1;
          else if (r.result === 'loss') t.l += 1;
          else t.d += 1;
        });
        const duration = dayBeforeComp ? 50 : slot.dur + randInt(-5, 5);
        const rpe = dayBeforeComp ? 5 : type === 'sparring' ? randInt(8, 9) : randInt(6, 8);
        const narrate = type === 'sparring' || rng() < 0.4;
        if (isDone(dateStr, slot.time, duration)) {
          const id = await addTraining({
            club_id: gbClubId,
            sport: 'jjb',
            session_type: type,
            date: dateStr,
            start_time: slot.time,
            duration_minutes: duration,
            intensity: rpe,
            technical_theme: pick(JJB_THEMES),
            calories: Math.round(duration * rand(8, 11, 1)),
            heart_rate: randInt(128, 150),
            max_heart_rate: randInt(168, 184),
            technique_rating: randInt(3, 5),
            source: 'manual',
            rounds: rounds.length,
            round_duration: type === 'sparring' ? 6 : 5,
            combat_rounds: rounds,
            weekly_plan_id: slot.id,
            game_plan: narrate ? pick(SESSION_GAME_PLANS) : undefined,
            what_worked: narrate ? pick(SESSION_WHAT_WORKED) : undefined,
            what_didnt_work: narrate ? pick(SESSION_WHAT_DIDNT_WORK) : undefined,
            session_rating: randInt(6, 9),
            session_mood: pick(SESSION_MOODS),
          } as never);
          await record(dateStr, 'jjb', Number(id), duration, rpe);
        }
      }

      // course du samedi matin sur la Corniche, sans club
      if (slot.sport === 'running' && !skip && !injured) {
        const km = parseFloat(Math.min(10, 6 + progress * 4 + (w % 3 === 2 ? 1.5 : 0) + rand(-0.4, 0.4, 2)).toFixed(2));
        const paceSec = Math.round(352 - progress * 42 + rand(-4, 4, 0));
        const c = courseDetails(dateStr, slot.time, km, paceSec, progress);
        const duration = Math.round(c.durSec / 60);
        if (isDone(dateStr, slot.time, duration)) {
          const id = await addTraining({
            sport: 'running',
            session_type: 'course',
            date: dateStr,
            start_time: slot.time,
            duration_minutes: duration,
            distance: km,
            intensity: 7,
            calories: c.kcal,
            heart_rate: c.avg,
            max_heart_rate: c.max,
            is_outdoor: true,
            source: 'apple_watch',
            location_lat: c.details.startLatitude,
            location_lon: c.details.startLongitude,
            location_name: 'Corniche Kennedy, Marseille',
            workout_details_json: JSON.stringify(c.details),
            weekly_plan_id: slot.id,
            session_rating: randInt(7, 9),
            notes: pick(['Aller et retour sur la Corniche, la mer à gauche puis à droite.', 'Départ des Catalans, demi-tour au Prophète. Bonnes jambes.', 'Sortie facile au lever du soleil, fini plus vite que parti.']),
          } as never);
          await record(dateStr, 'running', Number(id), duration, 7);
          stats.course += 1;
          try {
            const db = await openDatabase();
            await db.runAsync('UPDATE trainings SET lieu_type = ? WHERE id = ?', ['exterieur', Number(id)]);
          } catch {
            // colonne absente d'une ancienne base : sans importance
          }
        }
      }
    }

    // foot a 5 avec les collegues : un dimanche soir sur deux ou trois, a 20 h
    if (js === 0 && !vacation && !injured && FIVE_WEEKS.has(w)) {
      const duration = 60;
      if (isDone(dateStr, '20:00', duration)) {
        const pour = randInt(6, 12);
        const contre = Math.max(2, pour + randInt(-4, 2));
        const id = await addTraining({
          sport: 'football',
          session_type: 'match',
          date: dateStr,
          start_time: '20:00',
          duration_minutes: duration,
          intensity: 7,
          calories: randInt(560, 690),
          heart_rate: randInt(138, 150),
          max_heart_rate: randInt(178, 188),
          is_outdoor: true,
          location_name: 'Five',
          source: 'manual',
          session_rating: randInt(7, 9),
          notes: pick(['Foot à 5 avec les collègues.', 'Five du dimanche soir avec les collègues, bonne ambiance.', 'Five avec les collègues, trois buts et deux passes.']),
        } as never);
        await record(dateStr, 'football', Number(id), duration, 7);
        stats.foot += 1;
        try {
          const db = await openDatabase();
          await db.runAsync('UPDATE trainings SET score_for = ?, score_against = ?, lieu_type = ? WHERE id = ?', [pour, contre, 'exterieur', Number(id)]);
        } catch {
          // colonnes absentes d'une ancienne base : sans importance
        }
      }
    }
  }
  await AsyncStorage.setItem('@yoroi_training_loads', JSON.stringify(loads));

  // ========== CRENEAUX DES 4 DERNIERES SEMAINES ==========
  for (let k = 0; k < 4; k++) {
    const monday = addDays(thisMonday, -7 * k);
    const weekStart = fmtDate(monday);
    for (const s of slots) {
      const dateStr = fmtDate(addDays(monday, s.dow));
      const done = (trainingsByDay.get(dateStr) ?? []).find((t) => t.sport === s.sport);
      if (done) await upsertSlotOccurrence({ weekly_plan_id: s.id, week_start: weekStart, status: 'validated', training_id: done.id });
      else if (dateStr >= todayIso) await upsertSlotOccurrence({ weekly_plan_id: s.id, week_start: weekStart, status: 'pending' });
      else await upsertSlotOccurrence({ weekly_plan_id: s.id, week_start: weekStart, status: 'cancelled', cancel_reason: compDays.has(dateStr) ? 'Compétition' : 'Réunion au travail' });
    }
  }

  // ========== PESEES (lundi, mercredi, vendredi, et la veille des competitions) ==========
  let lastWeight = 86.4;
  for (let day = new Date(startDate); fmtDate(day) <= todayIso; day = addDays(day, 1)) {
    const dateStr = fmtDate(day);
    const js = day.getDay();
    const vacation = dateStr >= vacationFrom && dateStr <= vacationTo;
    const beforeComp = compDays.has(fmtDate(addDays(day, 1)));
    const usual = (js === 1 || js === 3 || js === 5) && rng() > (vacation ? 0.7 : 0.08);
    if (!usual && !beforeComp) continue;
    const ago = daysBetween(day, today);
    const weekendBump = js === 1 ? 0.3 : 0;
    const weight = parseFloat((trendWeight(ago) + weekendBump + rand(-0.3, 0.3, 2) - (beforeComp ? 0.4 : 0)).toFixed(1));
    const p = 1 - ago / 210;
    await addWeight({
      weight,
      fat_percent: parseFloat((20.6 - (86.4 - weight) * 0.75 + rand(-0.3, 0.3)).toFixed(1)),
      muscle_percent: parseFloat((40.1 + p * 2.1 + rand(-0.2, 0.2)).toFixed(1)),
      water_percent: parseFloat((56.2 + p * 2.0 + rand(-0.4, 0.4)).toFixed(1)),
      bone_mass: parseFloat((3.3 + rand(-0.05, 0.05, 2)).toFixed(2)),
      visceral_fat: Math.round(10 - p * 2),
      metabolic_age: Math.round(31 - p * 3),
      bmr: Math.round(1790 + p * 40 + randInt(-8, 8)),
      date: dateStr,
      source: 'manual',
    } as never);
    lastWeight = weight;
    stats.weights += 1;
  }
  await secureStorage.setItem('@yoroi_current_weight', String(lastWeight));

  // ========== MENSURATIONS (toutes les 4 semaines, le dimanche) ==========
  for (let k = 0; k < 8; k++) {
    const d = addDays(startDate, 6 + k * 28);
    if (fmtDate(d) > todayIso) break;
    const p = k / 7;
    const summer = k === 5 ? 0.6 : 0;
    await addMeasurementRecord({
      chest: parseFloat((103 + p * 1.5 + rand(-0.3, 0.3)).toFixed(1)),
      waist: parseFloat((90.5 - p * 6.5 + summer + rand(-0.2, 0.2)).toFixed(1)),
      navel: parseFloat((93 - p * 6.5 + summer + rand(-0.2, 0.2)).toFixed(1)),
      hips: parseFloat((101 - p * 2.5 + rand(-0.2, 0.2)).toFixed(1)),
      shoulders: parseFloat((117 + p * 2.5 + rand(-0.2, 0.2)).toFixed(1)),
      left_arm: parseFloat((35.6 + p * 1.5 + rand(-0.1, 0.1)).toFixed(1)),
      right_arm: parseFloat((35.9 + p * 1.5 + rand(-0.1, 0.1)).toFixed(1)),
      left_thigh: parseFloat((59 - p * 0.8 + rand(-0.2, 0.2)).toFixed(1)),
      right_thigh: parseFloat((59.3 - p * 0.8 + rand(-0.2, 0.2)).toFixed(1)),
      left_calf: parseFloat((37.4 + p * 0.4 + rand(-0.1, 0.1)).toFixed(1)),
      right_calf: parseFloat((37.6 + p * 0.4 + rand(-0.1, 0.1)).toFixed(1)),
      neck: parseFloat((39.5 - p * 0.5 + rand(-0.1, 0.1)).toFixed(1)),
      date: fmtDate(d),
    } as never);
    stats.measurements += 1;
  }

  // ========== COMPETITIONS ET COMBATS ==========
  const pesee1 = parseFloat((trendWeight(daysBetween(comp1, today)) - 0.4).toFixed(1));
  const pesee2 = parseFloat((trendWeight(daysBetween(comp2, today)) - 0.4).toFixed(1));
  const jourJ1 = parseFloat((pesee1 + 0.9).toFixed(1));
  const jourJ2 = parseFloat((pesee2 + 0.9).toFixed(1));
  // 17 octobre nuit (Houari : « l'app ne doit plus jamais créer de compétition d'elle-même ») : la demo n'ajoute
  // aucune competition. Les combats de Heny gardent leur date, leur adversaire et leur pesee, sans competition liee.
  const c1 = null;
  const c2 = null;
  stats.competitions = 0;
  const combats = [
    { competition_id: c1, date: fmtDate(comp1), resultat: 'victoire', methode: 'points', technique: null, round: 1, temps: '5:00', adversaire_nom: 'Mathis R.', adversaire_club: 'Clan du Mistral', poids_pesee: pesee1, poids_jour_j: jourJ1, notes: 'Victoire 6 à 2 : un balayage depuis la demi-garde et un passage en knee cut. Bon contrôle jusqu’au bout.' },
    { competition_id: c1, date: fmtDate(comp1), resultat: 'victoire', methode: 'soumission', technique: 'Triangle', round: 1, temps: '3:12', adversaire_nom: 'Karim B.', adversaire_club: 'Cercle des Pins', poids_pesee: pesee1, poids_jour_j: jourJ1, notes: 'Il a voulu passer debout, j’ai attrapé le bras et fermé le triangle. Exactement le drill de la semaine.' },
    { competition_id: c1, date: fmtDate(comp1), resultat: 'defaite', methode: 'points', technique: null, round: 1, temps: '5:00', adversaire_nom: 'Lucas D.', adversaire_club: 'Académie des Cigales', poids_pesee: pesee1, poids_jour_j: jourJ1, notes: 'Finale perdue 2 à 4. Sa De la Riva m’a gêné tout le combat. Médaille d’argent, à retravailler : la défense de la DLR.' },
    { competition_id: c2, date: fmtDate(comp2), resultat: 'victoire', methode: 'soumission', technique: 'Kimura', round: 1, temps: '2:41', adversaire_nom: 'Yohan P.', adversaire_club: 'Garde Haute Toulon', poids_pesee: pesee2, poids_jour_j: jourJ2, notes: 'Kimura depuis la demi-garde du dessus, en verrouillant l’épaule au sol d’abord.' },
    { competition_id: c2, date: fmtDate(comp2), resultat: 'victoire', methode: 'points', technique: null, round: 1, temps: '5:00', adversaire_nom: 'Nassim T.', adversaire_club: 'Clan du Mistral', poids_pesee: pesee2, poids_jour_j: jourJ2, notes: 'Victoire 9 à 0 : takedown, passage et prise du dos. Le cardio a tenu.' },
    { competition_id: c2, date: fmtDate(comp2), resultat: 'victoire', methode: 'soumission', technique: 'Étranglement arrière', round: 1, temps: '4:05', adversaire_nom: 'Adrien M.', adversaire_club: 'Académie des Cigales', poids_pesee: pesee2, poids_jour_j: jourJ2, notes: 'Finale gagnée : dos pris sur un scramble, crochets posés, étranglement propre. Médaille d’or.' },
  ];
  for (const c of combats) {
    await addCombat(c as never);
    stats.combats += 1;
  }

  // ========== PARTENAIRES DE SPARRING ==========
  await seedSparringPartners(tally);

  // ========== CARNET : RECORDS ET TECHNIQUES ==========
  const benchmarks = Object.entries(benchEntries).map(([name, entries]) => ({
    id: generateId(),
    name,
    category: 'force',
    unit: name === 'Tractions' ? 'reps' : 'kg',
    iconName: 'dumbbell',
    color: '#B0282E',
    entries,
    createdAt: startDate.toISOString(),
  }));
  await AsyncStorage.setItem('yoroi_benchmarks_v2', JSON.stringify(benchmarks));

  const nowIso = now.toISOString();
  const makeSkill = (name: string, category: string, status: 'mastered' | 'in_progress' | 'to_learn', drills: number) => ({
    id: generateId(),
    name,
    category,
    status,
    drillCount: drills,
    notes: buildSkillNotes(status, name),
    createdAt: startDate.toISOString(),
    updatedAt: nowIso,
  });
  const skills = [
    makeSkill('Garde Fermée', 'jjb_garde', 'mastered', randInt(40, 55)),
    makeSkill('Demi-Garde', 'jjb_garde', 'mastered', randInt(35, 50)),
    makeSkill('Triangle', 'jjb_soumission', 'mastered', randInt(30, 45)),
    makeSkill('Kimura', 'jjb_soumission', 'mastered', randInt(25, 40)),
    makeSkill('Mount Escape', 'jjb_garde', 'mastered', randInt(28, 40)),
    makeSkill('Side Control Escape', 'jjb_garde', 'mastered', randInt(25, 35)),
    makeSkill('Back Control', 'jjb_passage', 'mastered', randInt(20, 32)),
    makeSkill('Knee Cut', 'jjb_passage', 'in_progress', randInt(12, 22)),
    makeSkill('De la Riva', 'jjb_garde', 'in_progress', randInt(10, 20)),
    makeSkill('Etranglement Arriere (RNC)', 'jjb_soumission', 'in_progress', randInt(10, 18)),
    makeSkill('Guillotine', 'jjb_soumission', 'in_progress', randInt(8, 16)),
    makeSkill('Single Leg', 'lutte', 'in_progress', randInt(10, 18)),
    makeSkill('Berimbolo', 'jjb_garde', 'to_learn', 0),
    makeSkill('X-Guard', 'jjb_garde', 'to_learn', 0),
    makeSkill('Omoplata', 'jjb_soumission', 'to_learn', 0),
  ];
  await AsyncStorage.setItem('yoroi_skills_v2', JSON.stringify(skills));
  stats.skills = skills.length;

  // ========== OBJECTIFS ==========
  try {
    await setGoal('jjb', 3);
    await setGoal('musculation', 4);
    await setGoal('running', 1);
  } catch {
    // objectifs deja poses
  }

  // ========== BLESSURES (une guerie, une legere en cours) ==========
  await addInjury({ zone_id: 'fingers_l', zone_view: 'front', pain_type: 'entorse', cause: 'Doigt pris dans le kimono en sparring', eva_score: 0, notes: 'Strapping deux semaines, plus de douleur. Reprise du sparring sans gêne.', date: injuryFrom, status: 'healed', fit_for_duty: 'operational', healed_at: injuryTo } as never);
  await addInjury({ zone_id: 'shoulder_r', zone_view: 'front', pain_type: 'contracture', cause: 'Développé couché lourd sans assez d’échauffement', eva_score: 2, notes: 'Gêne légère à l’échauffement. Élastiques avant chaque séance, charge gardée.', date: fmtDate(addDays(today, -9)), status: 'healing', fit_for_duty: 'operational' } as never);

  // ========== SOMMEIL (120 nuits) ==========
  const sleepEntries: Record<string, unknown>[] = [];
  for (let i = 119; i >= 0; i--) {
    const d = addDays(today, -i);
    const dateStr = fmtDate(d);
    const js = d.getDay();
    const late = js === 5 || js === 6;
    const bed = (late ? 23.6 : 22.9) + rand(-0.4, 0.6, 2);
    const hours = (js === 0 || js === 6 ? 8.2 : 7.6) + rand(-0.45, 0.45, 2);
    const durationMin = Math.round(hours * 60);
    const wake = bed + hours;
    const bedH = Math.floor(bed % 24);
    const wakeH = Math.floor(wake % 24);
    const deep = Math.round(durationMin * rand(0.14, 0.2, 2));
    const rem = Math.round(durationMin * rand(0.19, 0.24, 2));
    const awake = Math.round(durationMin * rand(0.03, 0.06, 2));
    sleepEntries.push({
      id: `sleep_demo_${dateStr}`,
      date: dateStr,
      bedTime: fmtTime(bedH, Math.round(((bed % 1) * 60) / 5) * 5 % 60),
      wakeTime: fmtTime(wakeH, Math.round(((wake % 1) * 60) / 5) * 5 % 60),
      duration: durationMin,
      quality: Math.max(3, Math.min(5, Math.round(3.9 + (hours - 7.6) + rand(-0.6, 0.6)))),
      phases: { deep, rem, core: durationMin - deep - rem - awake, awake, inBed: durationMin + awake + randInt(6, 18) },
      source: 'demo',
      efficiency: Math.round((durationMin / (durationMin + awake + randInt(6, 14))) * 100),
      interruptions: randInt(0, 2),
      sleepHeartRate: { min: randInt(47, 52), max: randInt(66, 74), avg: randInt(54, 59) },
    });
  }
  // 17 octobre : l'app lit le sommeil dans AsyncStorage (lib/sleepService.ts), plus dans SecureStore
  await AsyncStorage.multiSet([['@yoroi_sleep_entries', JSON.stringify(sleepEntries)], ['@yoroi_sleep_migrated_to_async', 'true']]);
  await AsyncStorage.multiSet([['@yoroi_sleep_goal', '450'], ['@yoroi_sleep_longest_streak', '19']]);
  stats.sleepEntries = sleepEntries.length;

  // ========== EAU (30 jours, et aujourd'hui) ==========
  const history: { date: string; amount: number; goal: number }[] = [];
  const hydrationLog: Record<string, unknown>[] = [];
  for (let i = 30; i >= 1; i--) {
    const d = addDays(today, -i);
    const dateStr = fmtDate(d);
    const trained = (trainingsByDay.get(dateStr) ?? []).length > 0;
    const amount = parseFloat((trained ? rand(2.3, 3.1, 2) : rand(1.8, 2.5, 2)).toFixed(2));
    history.push({ date: dateStr, amount, goal: 2.5 });
    let left = Math.round(amount * 1000);
    let h = 8;
    while (left > 0) {
      const q = Math.min(left, pick([250, 330, 500]));
      hydrationLog.push({ date: dateStr, quantite_ml: q, type: 'eau', time: fmtTime(h, randInt(0, 59)) });
      left -= q;
      h = Math.min(21, h + randInt(1, 3));
    }
  }
  const todayMl = now.getHours() < 9 ? 250 : now.getHours() < 14 ? 1000 : 1750;
  await AsyncStorage.multiSet([
    ['@yoroi_hydration_history', JSON.stringify(history)],
    ['@yoroi_hydration_log', JSON.stringify(hydrationLog)],
    ['@yoroi_hydration_goal', '2.5'],
    ['@yoroi_hydration_today', JSON.stringify({ date: now.toDateString(), amount: todayMl / 1000 })],
    [hydrationDayKey(todayIso), String(todayMl)],
  ]);

  // ========== DONNEES SANTE DE LA MONTRE (120 jours) ==========
  const health: HealthDataRecord[] = [];
  for (let i = 119; i >= 0; i--) {
    const d = addDays(today, -i);
    const dateStr = fmtDate(d);
    const trained = (trainingsByDay.get(dateStr) ?? []).length > 0;
    const p = 1 - i / 120;
    // 17 octobre nuit (captures stores) : aujourd'hui, des anneaux partiels lisibles. Pas autour de 80 % du repere
    // de 8 000, exercice au-dela de l'objectif de 45 min (second tour), calories actives autour de 60 % de 650 kcal
    const steps = i === 0 ? randInt(6300, 6500) : trained ? randInt(8500, 13500) : randInt(5000, 9000);
    health.push({ date: dateStr, type: 'steps', value: steps, unit: 'count', source: 'apple_health' });
    health.push({ date: dateStr, type: 'distance', value: parseFloat((steps * 0.00074).toFixed(2)), unit: 'km', source: 'apple_health' });
    health.push({ date: dateStr, type: 'calories_active', value: i === 0 ? randInt(385, 400) : trained ? randInt(560, 860) : randInt(260, 420), unit: 'kcal', source: 'apple_health' });
    // type de ligne lu par Sante (store 'exercise_minutes' de lib/v2/sante/metrics.ts), hors de l'union historique
    health.push({ date: dateStr, type: 'exercise_minutes', value: i === 0 ? randInt(56, 60) : trained ? randInt(38, 75) : randInt(8, 26), unit: 'min', source: 'apple_health' } as never);
    health.push({ date: dateStr, type: 'heart_rate_resting', value: Math.round(58 - p * 4 + rand(-1.5, 1.5)), unit: 'bpm', source: 'apple_health' });
    health.push({ date: dateStr, type: 'hrv', value: Math.round(48 + p * 9 + rand(-5, 5)), unit: 'ms', source: 'apple_health' });
    // 17 octobre : sante du jour complete en mode demo (Sante n'est jamais lue pendant la demo)
    health.push({ date: dateStr, type: 'heart_rate', value: i === 0 ? randInt(66, 72) : trained ? randInt(76, 86) : randInt(66, 74), unit: 'bpm', source: 'apple_health' });
    health.push({ date: dateStr, type: 'spo2', value: randInt(96, 99), unit: '%', source: 'apple_health' });
    health.push({ date: dateStr, type: 'respiratory_rate', value: parseFloat(rand(13.4, 15.2, 1).toFixed(1)), unit: 'count/min', source: 'apple_health' });
    health.push({ date: dateStr, type: 'calories_basal', value: i === 0 ? Math.round(1810 * Math.min(1, now.getHours() / 24)) : randInt(1790, 1840), unit: 'kcal', source: 'apple_health' });
    const nuit = sleepEntries.find((e) => e.date === dateStr) as { duration: number; phases: { deep: number; rem: number; core: number; awake: number } } | undefined;
    if (nuit) health.push({ date: dateStr, type: 'sleep', value: nuit.duration, value2: nuit.phases.deep, value3: nuit.phases.rem, value4: nuit.phases.awake, metadata: JSON.stringify({ phases: nuit.phases }), unit: 'min', source: 'apple_health' } as never);
  }
  try {
    await saveHealthDataBatch(health);
  } catch (e) {
    logger.warn('[DemoData] données santé non écrites', e);
  }
  await AsyncStorage.multiSet([['@yoroi_steps_goal', '10000'], ['@yoroi_calories_goal', '600'], ['@yoroi_resting_heart_rate', '54'], ['@yoroi_hrv_current', '57']]);

  // ========== HUMEUR (30 jours) ==========
  const moods = ['motivated', 'energized', 'focused', 'tired', 'motivated', 'calm', 'focused'];
  const moodEntries = Array.from({ length: 30 }, (_, i) => {
    const d = addDays(today, -i);
    return { id: `demo-mood-${i}`, date: fmtDate(d), mood: moods[i % moods.length], energy: pick([3, 4, 4, 4, 5]), timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 8, 30).toISOString() };
  });
  await secureStorage.setItem('@yoroi_mood_log', moodEntries as never);

  // 17 octobre : le torii retenu est la date de ta tendance du jour, comme si l'app l'avait suivie chaque jour
  try {
    const series = toDailySeries((await getWeights(400)) as never);
    // 17 octobre : la meme prevision a ton rythme actuel que le torii, le bilan et le paywall (lib/v2/pesee/arrivee.ts)
    const tend = dateAuRythme(series, 80, todayIso, 178);
    await oublierTorii();
    if (tend) await AsyncStorage.setItem('yoroi_torii_v1', JSON.stringify({ cle: `${fmtDate(startDate)}|86.4|80`, date: tend, fenetreLe: null }));
  } catch (e) {
    logger.warn('[DemoData] torii de la démo non posé', e);
  }

  await AsyncStorage.setItem(DEMO_PROFILE_KEY, 'heny');
  // vague 45 : rien apres aujourd'hui, au moment du chargement
  await trimDemoFuture();

  // ========== ARMURE : XP et rang calcules sur cet historique ==========
  // La reprise des anciens utilisateurs se joue au premier calcul : on la marque vue pour des
  // captures propres (le Studio sait la rejouer). Les celebrations aussi.
  try {
    await syncArmure(true);
    await markWelcomeSeen();
    await markCelebrationSeen({ plate: true });
  } catch (e) {
    logger.warn('[DemoData] calcul de l’armure de la démo reporté', e);
  }
  // 17 octobre : objectif de 6 seances par semaine (8 creneaux : 3 JJB, 4 musculation, 1 course).
  // Reposé après le calcul de l'armure, qui recalcule l'objectif d'un ancien utilisateur tant qu'il n'est pas choisi.
  await saveEspace({ objectifSemaine: OBJECTIF_SEMAINE, objectifChoisi: true }).catch(() => undefined);

  logger.info(`[DemoData] Heny : ${stats.workouts} séances (${stats.course} courses, ${stats.foot} foot), ${stats.weights} pesées, ${stats.combats} combats.`);
  return stats;
}
