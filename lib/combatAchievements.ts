// ============================================
// YOROI : Système d'achievements Sparring
// Badges automatiquement débloqués selon les stats
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Training, CombatRound } from '@/lib/database';
import { getMethodDisplayName } from '@/components/BJJBodyMap';
import logger from '@/lib/security/logger';
import { traduire } from '@/lib/i18n/tr';

const UNLOCKED_KEY = '@yoroi_combat_achievements';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  color: string;
  category: 'milestone' | 'technique' | 'mental' | 'legendary';
  check: (stats: CombatStats) => boolean;
}

export interface CombatStats {
  totalRounds: number;
  totalSessions: number;
  totalWins: number;
  totalLosses: number;
  totalDraws: number;
  totalSubmissionsGiven: number;
  totalSubmissionsTaken: number;
  uniquePartners: number;
  uniqueMethodsGiven: Set<string>;
  uniqueMethodsTaken: Set<string>;
  methodsGivenCount: Record<string, number>;
  selfRatingAvg: number | null;
  gamePlansFilled: number;
  gamePlansExecuted: number; // gamePlan + whatWorked remplis
  longestWinStreak: number;
  longestLossStreak: number;
  partnersBeaten10: number; // partenaires battus avec note 9-10
  comebacks: number; // rounds où on gagne après >=3 défaites contre ce partenaire
  maxSelfRating: number;
  roundsAnalysedFull: number; // les 5 champs d'analyse remplis
}

// ============================================
// LISTE DES ACHIEVEMENTS
// ============================================

export const ACHIEVEMENTS: Achievement[] = [
  // ─── JALONS DE BASE ───
  { id: 'first-round',     title: 'Premier round', description: traduire('Ton tout premier round de sparring enregistré'), emoji: '', color: '#3B82F6', category: 'milestone', check: s => s.totalRounds >= 1 },
  { id: 'first-win',       title: traduire('Première victoire'), description: traduire('Ton premier round gagné'), emoji: '', color: '#22C55E', category: 'milestone', check: s => s.totalWins >= 1 },
  { id: 'first-sub',       title: traduire('Première soumission'), description: traduire('Ta première finition par soumission'), emoji: '', color: '#8B5CF6', category: 'milestone', check: s => s.totalSubmissionsGiven >= 1 },
  { id: 'rounds-10',       title: traduire('10 rounds'), description: traduire('10 rounds enregistrés'), emoji: '', color: '#3B82F6', category: 'milestone', check: s => s.totalRounds >= 10 },
  { id: 'rounds-50',       title: '50 rounds', description: traduire('50 rounds enregistrés'), emoji: '', color: '#3B82F6', category: 'milestone', check: s => s.totalRounds >= 50 },
  { id: 'rounds-100',      title: 'Centurion', description: traduire('100 rounds enregistrés'), emoji: '', color: '#F59E0B', category: 'milestone', check: s => s.totalRounds >= 100 },
  { id: 'rounds-500',      title: traduire('Rat de tatami'), description: traduire('500 rounds enregistrés'), emoji: '', color: '#9333EA', category: 'legendary', check: s => s.totalRounds >= 500 },
  { id: 'rounds-1000',     title: traduire('1000 rounds'), description: traduire('Le club des 1000'), emoji: '', color: '#EAB308', category: 'legendary', check: s => s.totalRounds >= 1000 },

  // ─── PARTENAIRES ───
  { id: 'partners-5',      title: traduire('Social'), description: traduire('5 partenaires différents'), emoji: '', color: '#06B6D4', category: 'milestone', check: s => s.uniquePartners >= 5 },
  { id: 'partners-20',     title: traduire('Réseau'), description: traduire('20 partenaires différents'), emoji: '', color: '#06B6D4', category: 'milestone', check: s => s.uniquePartners >= 20 },
  { id: 'beat-black-belt', title: traduire('Tombeur d\'élite'), description: traduire('Battu un partenaire noté 9 à 10/10'), emoji: '', color: '#9333EA', category: 'legendary', check: s => s.partnersBeaten10 >= 1 },
  { id: 'comeback',        title: traduire('Comeback Kid'), description: traduire('Gagné contre un partenaire après 3 défaites d\'affilée'), emoji: '', color: '#EC4899', category: 'legendary', check: s => s.comebacks >= 1 },

  // ─── TECHNIQUES ───
  { id: 'tri',             title: traduire('Triangle Master'), description: traduire('Premier triangle placé'), emoji: '', color: '#22C55E', category: 'technique', check: s => !!s.methodsGivenCount['Triangle'] },
  { id: 'arm',             title: 'Armbar', description: traduire('Premier armbar'), emoji: '', color: '#22C55E', category: 'technique', check: s => !!s.methodsGivenCount['Armbar'] },
  { id: 'rnc',             title: traduire('Rear Naked Choke'), description: traduire('Premier RNC'), emoji: '', color: '#22C55E', category: 'technique', check: s => !!s.methodsGivenCount['RNC'] || !!s.methodsGivenCount['RNC / Mata Leão'] },
  { id: 'kim',             title: 'Kimura', description: traduire('Première kimura'), emoji: '', color: '#22C55E', category: 'technique', check: s => !!s.methodsGivenCount['Kimura'] },
  { id: 'guil',            title: 'Guillotine', description: traduire('Première guillotine'), emoji: '', color: '#22C55E', category: 'technique', check: s => !!s.methodsGivenCount['Guillotine'] || !!s.methodsGivenCount['Arm-in Guillotine'] },
  { id: 'heel',            title: 'Heel hook', description: traduire('Premier heel hook'), emoji: '', color: '#EF4444', category: 'technique', check: s => !!s.methodsGivenCount['Heel Hook'] || !!s.methodsGivenCount['Heel hook'] },
  { id: 'omo',             title: 'Omoplata', description: traduire('Première omoplata'), emoji: '', color: '#22C55E', category: 'technique', check: s => !!s.methodsGivenCount['Omoplata'] },
  { id: 'bow',             title: 'Bow and Arrow', description: traduire('Premier bow and arrow'), emoji: '', color: '#22C55E', category: 'technique', check: s => !!s.methodsGivenCount['Bow & Arrow'] },
  { id: 'darce',           title: "D'Arce", description: traduire('Premier D\'Arce'), emoji: '', color: '#22C55E', category: 'technique', check: s => !!s.methodsGivenCount["D'Arce"] },
  { id: 'tech-5',          title: traduire('Polyvalent'), description: traduire('5 finitions différentes placées'), emoji: '', color: '#8B5CF6', category: 'technique', check: s => s.uniqueMethodsGiven.size >= 5 },
  { id: 'tech-10',         title: traduire('Technicien'), description: traduire('10 finitions différentes placées'), emoji: '', color: '#8B5CF6', category: 'technique', check: s => s.uniqueMethodsGiven.size >= 10 },
  { id: 'tech-20',         title: traduire('Encyclopédie vivante'), description: traduire('20 finitions différentes placées'), emoji: '', color: '#9333EA', category: 'legendary', check: s => s.uniqueMethodsGiven.size >= 20 },

  // ─── STREAKS ───
  { id: 'streak-3',        title: traduire('Tu rerolles'), description: traduire('3 victoires d\'affilée'), emoji: '', color: '#F59E0B', category: 'milestone', check: s => s.longestWinStreak >= 3 },
  { id: 'streak-5',        title: traduire('En feu'), description: traduire('5 victoires d\'affilée'), emoji: '', color: '#EF4444', category: 'milestone', check: s => s.longestWinStreak >= 5 },
  { id: 'streak-10',       title: traduire('Invincible'), description: traduire('10 victoires d\'affilée'), emoji: '', color: '#9333EA', category: 'legendary', check: s => s.longestWinStreak >= 10 },

  // ─── MENTAL / ANALYSE ───
  { id: 'first-gp',        title: traduire('Stratège'), description: traduire('Premier game plan noté'), emoji: '', color: '#8B5CF6', category: 'mental', check: s => s.gamePlansFilled >= 1 },
  { id: 'gp-10',           title: traduire('Penseur'), description: traduire('10 game plans notés'), emoji: '', color: '#8B5CF6', category: 'mental', check: s => s.gamePlansFilled >= 10 },
  { id: 'gp-executed',     title: traduire('Plan parfait'), description: traduire('Un game plan exécuté avec succès'), emoji: '', color: '#22C55E', category: 'mental', check: s => s.gamePlansExecuted >= 1 },
  { id: 'gp-10-executed',  title: traduire('Exécutant'), description: traduire('10 game plans exécutés avec succès'), emoji: '', color: '#22C55E', category: 'mental', check: s => s.gamePlansExecuted >= 10 },
  { id: 'perfect-round',   title: traduire('Round parfait'), description: traduire('Auto rating 10/10 sur un round'), emoji: '', color: '#EAB308', category: 'mental', check: s => s.maxSelfRating >= 10 },
  { id: 'round-analyzed',  title: traduire('Introspectif'), description: traduire('Un round analysé à fond (5 champs remplis)'), emoji: '', color: '#8B5CF6', category: 'mental', check: s => s.roundsAnalysedFull >= 1 },
  { id: 'analyst',         title: 'Analyste', description: traduire('20 rounds analysés à fond'), emoji: '', color: '#9333EA', category: 'legendary', check: s => s.roundsAnalysedFull >= 20 },

  // ─── WIN RATE ───
  { id: 'winrate-60',      title: traduire('Dominant'), description: traduire('Win rate ≥ 60% (min. 20 rounds)'), emoji: '', color: '#22C55E', category: 'milestone', check: s => (s.totalWins + s.totalLosses >= 20) && (s.totalWins / Math.max(1, s.totalWins + s.totalLosses)) >= 0.6 },
  { id: 'winrate-80',      title: traduire('Intouchable'), description: traduire('Win rate ≥ 80% (min. 30 rounds)'), emoji: '', color: '#9333EA', category: 'legendary', check: s => (s.totalWins + s.totalLosses >= 30) && (s.totalWins / Math.max(1, s.totalWins + s.totalLosses)) >= 0.8 },
];

// ============================================
// CALCUL DES STATS DEPUIS LES TRAININGS
// ============================================

export function computeStats(trainings: Training[]): CombatStats {
  const stats: CombatStats = {
    totalRounds: 0,
    totalSessions: 0,
    totalWins: 0,
    totalLosses: 0,
    totalDraws: 0,
    totalSubmissionsGiven: 0,
    totalSubmissionsTaken: 0,
    uniquePartners: 0,
    uniqueMethodsGiven: new Set<string>(),
    uniqueMethodsTaken: new Set<string>(),
    methodsGivenCount: {},
    selfRatingAvg: null,
    gamePlansFilled: 0,
    gamePlansExecuted: 0,
    longestWinStreak: 0,
    longestLossStreak: 0,
    partnersBeaten10: 0,
    comebacks: 0,
    maxSelfRating: 0,
    roundsAnalysedFull: 0,
  };

  const partners = new Set<string>();
  const partnersBeaten10 = new Set<string>();
  const partnerLossStreaks: Record<string, number> = {};
  const partnerHasComeback = new Set<string>();
  let ratingSum = 0, ratingCount = 0;
  let curWin = 0, curLoss = 0;

  const sessionsWithCombat = trainings.filter(t => !!t.combat_rounds);
  stats.totalSessions = sessionsWithCombat.length;

  // Itérer chronologiquement (asc) pour les streaks
  const sorted = [...sessionsWithCombat].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  for (const t of sorted) {
    const rounds = (t.combat_rounds ?? []) as CombatRound[];
    for (const r of rounds) {
      stats.totalRounds++;
      if (r.partner) partners.add(r.partner.trim().toLowerCase());
      if (r.result === 'win') {
        stats.totalWins++;
        curWin++;
        curLoss = 0;
        if (stats.longestWinStreak < curWin) stats.longestWinStreak = curWin;
        // Comeback : battu après 3+ défaites d'affilée contre ce partenaire
        if (r.partner) {
          const k = r.partner.trim().toLowerCase();
          if ((partnerLossStreaks[k] ?? 0) >= 3 && !partnerHasComeback.has(k)) {
            partnerHasComeback.add(k);
            stats.comebacks++;
          }
          partnerLossStreaks[k] = 0;
        }
        // Battu un adversaire 9-10/10
        if (r.partner && r.partnerRating != null && r.partnerRating >= 9) {
          partnersBeaten10.add(r.partner.trim().toLowerCase());
        }
      } else if (r.result === 'loss') {
        stats.totalLosses++;
        curLoss++;
        curWin = 0;
        if (stats.longestLossStreak < curLoss) stats.longestLossStreak = curLoss;
        if (r.partner) {
          const k = r.partner.trim().toLowerCase();
          partnerLossStreaks[k] = (partnerLossStreaks[k] ?? 0) + 1;
        }
      } else if (r.result === 'draw') {
        stats.totalDraws++;
        curWin = 0;
        curLoss = 0;
      }
      for (const m of (r.methodsGiven ?? [])) {
        const display = getMethodDisplayName(m);
        stats.uniqueMethodsGiven.add(display);
        stats.methodsGivenCount[display] = (stats.methodsGivenCount[display] ?? 0) + 1;
        stats.totalSubmissionsGiven++;
      }
      for (const m of (r.methodsTaken ?? [])) {
        const display = getMethodDisplayName(m);
        stats.uniqueMethodsTaken.add(display);
        stats.totalSubmissionsTaken++;
      }
      if (r.selfRating) {
        ratingSum += r.selfRating;
        ratingCount++;
        if (r.selfRating > stats.maxSelfRating) stats.maxSelfRating = r.selfRating;
      }
      if (r.gamePlan && r.gamePlan.trim()) stats.gamePlansFilled++;
      if (r.gamePlan && r.gamePlan.trim() && r.whatWorked && r.whatWorked.trim()) stats.gamePlansExecuted++;
      if (
        r.gamePlan?.trim() &&
        r.whatWorked?.trim() &&
        r.whatDidntWork?.trim() &&
        r.counteredBy?.trim() &&
        r.improvement?.trim()
      ) {
        stats.roundsAnalysedFull++;
      }
    }
  }

  stats.uniquePartners = partners.size;
  stats.partnersBeaten10 = partnersBeaten10.size;
  stats.selfRatingAvg = ratingCount > 0 ? Math.round((ratingSum / ratingCount) * 10) / 10 : null;

  return stats;
}

// ============================================
// STORAGE : badges déjà vus
// ============================================

export async function getUnlockedAchievements(): Promise<Set<string>> {
  try {
    const raw = await AsyncStorage.getItem(UNLOCKED_KEY);
    if (raw) return new Set(JSON.parse(raw));
  } catch (e) {
    logger.error('[CombatAchievements] load error:', e);
  }
  return new Set();
}

export async function saveUnlockedAchievements(ids: Set<string>): Promise<void> {
  try {
    await AsyncStorage.setItem(UNLOCKED_KEY, JSON.stringify(Array.from(ids)));
  } catch (e) {
    logger.error('[CombatAchievements] save error:', e);
  }
}

/**
 * Retourne les achievements nouvellement débloqués (et sauvegarde)
 */
export async function checkNewAchievements(stats: CombatStats): Promise<Achievement[]> {
  const unlocked = await getUnlockedAchievements();
  const newly: Achievement[] = [];
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.check(stats)) {
      unlocked.add(a.id);
      newly.push(a);
    }
  }
  if (newly.length > 0) await saveUnlockedAchievements(unlocked);
  return newly;
}

/**
 * Liste tous les achievements avec leur statut (unlocked ou non)
 */
export async function listAchievements(stats: CombatStats): Promise<Array<Achievement & { unlocked: boolean }>> {
  const unlocked = await getUnlockedAchievements();
  // Débloquer ceux qui devraient l'être (rattrapage si import ou bug)
  for (const a of ACHIEVEMENTS) {
    if (!unlocked.has(a.id) && a.check(stats)) unlocked.add(a.id);
  }
  await saveUnlockedAchievements(unlocked);
  return ACHIEVEMENTS.map(a => ({ ...a, unlocked: unlocked.has(a.id) }));
}
