// ============================================
// YOROI - SERVICE RAPPORT DE MISSION HEBDOMADAIRE
// ============================================
// Génère un bilan hebdomadaire à partager sur les réseaux

import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';
import { fr } from 'date-fns/locale';
import { getWeights, getTrainings, Training, Weight } from '@/lib/database';
import { getSleepStats, formatSleepDuration } from '@/lib/sleepService';
import { getWeeklyLoadStats } from '@/lib/trainingLoadService';
import { calculateStreak } from '@/lib/database';

// ============================================
// TYPES
// ============================================

export interface WeeklyReport {
  // Période
  weekStart: string;
  weekEnd: string;
  weekNumber: number;
  
  // Entraînements
  totalTrainings: number;
  totalTrainingTime: number; // minutes d'entraînement
  sportBreakdown: { sport: string; count: number; duration: number }[];
  
  // Poids
  startWeight: number | null;
  endWeight: number | null;
  weightChange: number;
  
  // Sommeil
  avgSleepHours: number;
  sleepQuality: number;
  sleepDebtHours: number;
  
  // Charge
  totalLoad: number;
  avgRPE: number;
  riskLevel: string;
  
  // Streak
  currentStreak: number;
  
  // Verdict global
  verdict: {
    title: string;
    message: string;
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
    emoji: string;
  };
  
  // Score global (0-100)
  overallScore: number;
}

// ============================================
// GÉNÉRATION DU RAPPORT
// ============================================

export const generateWeeklyReport = async (): Promise<WeeklyReport> => {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Lundi
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  
  // Récupérer les données
  const [allWeights, allTrainings, sleepStats, loadStats, streak] = await Promise.all([
    getWeights(14), // 2 dernières semaines
    getTrainings(),
    getSleepStats(),
    getWeeklyLoadStats(),
    calculateStreak(),
  ]);
  
  // Filtrer les entraînements de la semaine
  const weekTrainings = allTrainings.filter(t => {
    const date = new Date(t.date);
    return date >= weekStart && date <= weekEnd;
  });
  
  // Total temps d'entraînement
  const totalTrainingTime = weekTrainings.reduce((sum, t) => sum + (t.duration_minutes || 60), 0);
  
  // Répartition par sport
  const sportMap: Record<string, { count: number; duration: number }> = {};
  weekTrainings.forEach(t => {
    const sport = t.sport || 'Autre';
    if (!sportMap[sport]) sportMap[sport] = { count: 0, duration: 0 };
    sportMap[sport].count++;
    sportMap[sport].duration += t.duration_minutes || 60;
  });
  const sportBreakdown = Object.entries(sportMap).map(([sport, data]) => ({
    sport,
    count: data.count,
    duration: data.duration,
  })).sort((a, b) => b.count - a.count);
  
  // Poids début/fin de semaine
  const weekWeights = allWeights.filter(w => {
    const date = new Date(w.date);
    return date >= weekStart && date <= weekEnd;
  });
  const startWeight = weekWeights.length > 0 ? weekWeights[weekWeights.length - 1].weight : null;
  const endWeight = weekWeights.length > 0 ? weekWeights[0].weight : null;
  const weightChange = startWeight && endWeight ? endWeight - startWeight : 0;
  
  // Sommeil
  const avgSleepHours = Math.round(sleepStats.averageDuration / 60 * 10) / 10;
  
  // Calcul du score global (0-100)
  let overallScore = 0; // Base - commence à 0 pour un nouvel utilisateur

  // Entraînements (max +25)
  overallScore += Math.min(weekTrainings.length * 5, 25);

  // Sommeil (max +20)
  if (avgSleepHours >= 7) overallScore += 20;
  else if (avgSleepHours >= 6) overallScore += 10;
  else if (avgSleepHours > 0) overallScore -= 10; // Seulement si des données existent
  
  // Charge OK (max +15)
  if (loadStats.riskLevel === 'safe') overallScore += 15;
  else if (loadStats.riskLevel === 'moderate') overallScore += 10;
  else if (loadStats.riskLevel === 'high') overallScore += 0;
  else overallScore -= 10;
  
  // Streak (max +15)
  overallScore += Math.min(streak, 15);
  
  // Perte de poids bonus (+10 max)
  if (weightChange < -0.5) overallScore += 10;
  else if (weightChange < 0) overallScore += 5;
  
  overallScore = Math.max(0, Math.min(100, overallScore));
  
  // Verdict
  const verdict = getVerdict(overallScore, weekTrainings.length, avgSleepHours, streak);
  
  return {
    weekStart: format(weekStart, 'dd MMM', { locale: fr }),
    weekEnd: format(weekEnd, 'dd MMM yyyy', { locale: fr }),
    weekNumber: parseInt(format(now, 'w')),
    totalTrainings: weekTrainings.length,
    totalTrainingTime,
    sportBreakdown,
    startWeight,
    endWeight,
    weightChange,
    avgSleepHours,
    sleepQuality: sleepStats.averageQuality,
    sleepDebtHours: sleepStats.sleepDebtHours,
    totalLoad: loadStats.totalLoad,
    avgRPE: loadStats.averageRPE,
    riskLevel: loadStats.riskLevel,
    currentStreak: streak,
    verdict,
    overallScore,
  };
};

/**
 * Détermine le verdict de la semaine
 */
const getVerdict = (
  score: number,
  trainings: number,
  sleepHours: number,
  streak: number
): WeeklyReport['verdict'] => {
  if (score >= 90) {
    return {
      title: 'SEMAINE LÉGENDAIRE',
      message: 'Tu as tout déchiré ! Performance exceptionnelle.',
      grade: 'S',
      emoji: 'flame', // Icône au lieu d'emoji
    };
  } else if (score >= 80) {
    return {
      title: 'Excellente semaine',
      message: 'Performance remarquable. Continue sur cette lancée !',
      grade: 'A',
      emoji: 'zap',
    };
  } else if (score >= 70) {
    return {
      title: 'Bonne semaine',
      message: 'Solide ! Quelques ajustements et tu seras au top.',
      grade: 'B',
      emoji: 'trophy',
    };
  } else if (score >= 55) {
    return {
      title: 'Semaine correcte',
      message: 'Pas mal, mais tu peux faire mieux. On se remotive !',
      grade: 'C',
      emoji: 'target',
    };
  } else if (score >= 40) {
    return {
      title: 'Semaine à améliorer',
      message: 'La discipline doit revenir. Fixe-toi des objectifs clairs.',
      grade: 'D',
      emoji: 'activity',
    };
  } else {
    return {
      title: 'Discipline à revoir',
      message: 'Cette semaine n\'était pas à la hauteur. Ressaisis-toi !',
      grade: 'F',
      emoji: 'alert',
    };
  }
};

/**
 * Formate le rapport pour le partage
 */
export const formatReportForSharing = (report: WeeklyReport): string => {
  const lines = [
    `RAPPORT DE MISSION YOROI`,
    `━━━━━━━━━━━━━━━━━━━━`,
    `Semaine ${report.weekNumber} (${report.weekStart} - ${report.weekEnd})`,
    ``,
    `ENTRAÎNEMENTS`,
    `   ${report.totalTrainings} séances | ${Math.round(report.totalTrainingTime / 60 * 10) / 10}h d'effort`,
    ``,
    `SOMMEIL`,
    `   ${report.avgSleepHours}h de moyenne | Dette: ${report.sleepDebtHours}h`,
    ``,
    `POIDS`,
    report.weightChange !== 0 
      ? `   ${report.weightChange > 0 ? '+' : ''}${report.weightChange.toFixed(1)} kg cette semaine`
      : `   Stable cette semaine`,
    ``,
    `STREAK: ${report.currentStreak} jours`,
    ``,
    `━━━━━━━━━━━━━━━━━━━━`,
    `VERDICT: ${report.verdict.title}`,
    `Grade: ${report.verdict.grade} | Score: ${report.overallScore}/100`,
    ``,
    `"${report.verdict.message}"`,
    ``,
    `#YOROI #Discipline #Sport #Fitness`,
  ];
  
  return lines.join('\n');
};

/**
 * Génère les données pour une image de partage
 */
export const getReportShareData = (report: WeeklyReport) => {
  return {
    title: `Rapport Semaine ${report.weekNumber}`,
    score: report.overallScore,
    grade: report.verdict.grade,
    stats: [
      { label: 'Entraînements', value: report.totalTrainings.toString(), icon: '💪' },
      { label: 'Temps', value: `${Math.round(report.totalTrainingTime / 60)}h`, icon: '⏱️' },
      { label: 'Sommeil', value: `${report.avgSleepHours}h`, icon: '😴' },
      { label: 'Streak', value: `${report.currentStreak}j`, icon: '🔥' },
    ],
    verdict: report.verdict,
  };
};

export default {
  generateWeeklyReport,
  formatReportForSharing,
  getReportShareData,
};

