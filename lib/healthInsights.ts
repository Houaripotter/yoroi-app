// ============================================
// YOROI - HEALTH INSIGHTS GENERATOR
// ============================================
// Génère des insights automatiques basés sur les données de santé
// ============================================

import { type Insight } from '@/components/health-charts/InsightCard';

interface HistoricalData {
  date: string;
  value: number;
}

interface SleepData {
  date: string;
  total: number;
  deep: number;
  rem: number;
  core: number;
  awake: number;
}

interface CaloriesData {
  date: string;
  active: number;
  basal: number;
  total: number;
}

export class HealthInsightsGenerator {
  // ============================================
  // HRV INSIGHTS
  // ============================================

  static generateHRVInsights(history: HistoricalData[]): Insight[] {
    if (history.length < 7) return [];

    const insights: Insight[] = [];
    const recent = history.slice(-7);
    const previous = history.slice(-14, -7);

    if (previous.length < 7) return insights;

    const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
    const previousAvg = previous.reduce((sum, d) => sum + d.value, 0) / previous.length;
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;

    // HRV en hausse = bonne récupération
    if (change > 10) {
      insights.push({
        type: 'success',
        title: 'Récupération Excellente',
        message:
          'Ton HRV est en forte hausse ! Ta récupération est optimale. Ton corps est prêt pour des entraînements intenses.',
        metric: `${recentAvg.toFixed(0)} ms`,
        change,
      });
    } else if (change < -10) {
      insights.push({
        type: 'warning',
        title: 'Attention à la Récupération',
        message:
          'Ton HRV a baissé significativement. Ton corps pourrait avoir besoin de plus de repos. Considère une séance légère ou un jour de repos.',
        metric: `${recentAvg.toFixed(0)} ms`,
        change,
      });
    } else if (recentAvg > 60) {
      insights.push({
        type: 'success',
        title: 'HRV Excellente',
        message: 'Ton HRV est dans la zone excellente. Continue comme ça !',
        metric: `${recentAvg.toFixed(0)} ms`,
      });
    } else if (recentAvg < 30) {
      insights.push({
        type: 'danger',
        title: 'HRV Faible',
        message:
          'Ton HRV est basse. Augmente ton temps de récupération et surveille ton sommeil.',
        metric: `${recentAvg.toFixed(0)} ms`,
      });
    }

    return insights;
  }

  // ============================================
  // RESTING HR INSIGHTS
  // ============================================

  static generateRestingHRInsights(history: HistoricalData[]): Insight[] {
    if (history.length < 7) return [];

    const insights: Insight[] = [];
    const recent = history.slice(-7);
    const previous = history.slice(-14, -7);

    if (previous.length < 7) return insights;

    const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
    const previousAvg = previous.reduce((sum, d) => sum + d.value, 0) / previous.length;
    const change = ((recentAvg - previousAvg) / previousAvg) * 100;

    // FC au repos qui baisse = bonne forme
    if (change < -5) {
      insights.push({
        type: 'success',
        title: 'Forme Cardiovasculaire Améliorée',
        message:
          'Ta fréquence cardiaque au repos diminue, signe d\'une meilleure condition physique !',
        metric: `${recentAvg.toFixed(0)} BPM`,
        change,
      });
    } else if (change > 10) {
      insights.push({
        type: 'warning',
        title: 'FC au Repos Élevée',
        message:
          'Ta FC au repos a augmenté. Cela peut indiquer fatigue, stress ou surentraînement. Prends du repos.',
        metric: `${recentAvg.toFixed(0)} BPM`,
        change,
      });
    }

    return insights;
  }

  // ============================================
  // SLEEP INSIGHTS
  // ============================================

  static generateSleepInsights(history: SleepData[]): Insight[] {
    if (history.length < 7) return [];

    const insights: Insight[] = [];
    const recent = history.slice(-7);

    const avgTotal = recent.reduce((sum, d) => sum + d.total, 0) / recent.length;
    const avgDeep = recent.reduce((sum, d) => sum + d.deep, 0) / recent.length;
    const avgRem = recent.reduce((sum, d) => sum + d.rem, 0) / recent.length;
    const avgAwake = recent.reduce((sum, d) => sum + d.awake, 0) / recent.length;

    // Durée totale
    if (avgTotal >= 480) {
      // >= 8h
      insights.push({
        type: 'success',
        title: 'Sommeil Optimal',
        message: `Tu dors en moyenne ${(avgTotal / 60).toFixed(1)}h par nuit. Excellent pour la récupération !`,
      });
    } else if (avgTotal < 360) {
      // < 6h
      insights.push({
        type: 'danger',
        title: 'Manque de Sommeil',
        message: `Tu ne dors que ${(avgTotal / 60).toFixed(1)}h en moyenne. Augmente ton temps de sommeil pour optimiser ta récupération.`,
      });
    }

    // Sommeil profond
    const deepPercent = (avgDeep / avgTotal) * 100;
    if (deepPercent >= 20) {
      insights.push({
        type: 'success',
        title: 'Sommeil Profond Excellent',
        message: `${deepPercent.toFixed(0)}% de sommeil profond. Idéal pour la récupération musculaire !`,
      });
    } else if (deepPercent < 13) {
      insights.push({
        type: 'warning',
        title: 'Peu de Sommeil Profond',
        message: `Seulement ${deepPercent.toFixed(0)}% de sommeil profond. Améliore ton hygiène de sommeil (température, obscurité, régularité).`,
      });
    }

    // REM
    const remPercent = (avgRem / avgTotal) * 100;
    if (remPercent < 15) {
      insights.push({
        type: 'info',
        title: 'REM Limité',
        message: `${remPercent.toFixed(0)}% de REM. Le sommeil REM est crucial pour la mémoire et la récupération mentale.`,
      });
    }

    // Éveils
    if (avgAwake > 60) {
      insights.push({
        type: 'warning',
        title: 'Sommeil Fragmenté',
        message: `Tu passes ${avgAwake.toFixed(0)} minutes éveillé en moyenne. Réduis la caféine et les écrans avant de dormir.`,
      });
    }

    return insights;
  }

  // ============================================
  // CALORIES INSIGHTS
  // ============================================

  static generateCaloriesInsights(history: CaloriesData[]): Insight[] {
    if (history.length < 7) return [];

    const insights: Insight[] = [];
    const recent = history.slice(-7);

    const avgActive = recent.reduce((sum, d) => sum + d.active, 0) / recent.length;

    if (avgActive > 600) {
      insights.push({
        type: 'success',
        title: 'Activité Élevée',
        message: `Tu brûles ${avgActive.toFixed(0)} kcal actives en moyenne par jour. Excellent niveau d'activité !`,
      });
    } else if (avgActive < 300) {
      insights.push({
        type: 'info',
        title: 'Activité Modérée',
        message: `${avgActive.toFixed(0)} kcal actives en moyenne. Augmente ton activité quotidienne pour améliorer ta condition physique.`,
      });
    }

    // Régularité
    const stdDev = calculateStdDev(recent.map(d => d.active));
    if (stdDev < 100) {
      insights.push({
        type: 'success',
        title: 'Régularité Parfaite',
        message: 'Ton niveau d\'activité est très régulier d\'un jour à l\'autre. Continue comme ça !',
      });
    }

    return insights;
  }

  // ============================================
  // WEIGHT INSIGHTS
  // ============================================

  static generateWeightInsights(
    history: HistoricalData[],
    goal?: number
  ): Insight[] {
    if (history.length < 7) return [];

    const insights: Insight[] = [];
    const recent = history.slice(-7);
    const current = recent[recent.length - 1].value;
    const weekAgo = recent[0].value;
    const change = current - weekAgo;

    if (goal) {
      const remaining = current - goal;

      if (remaining <= 0) {
        insights.push({
          type: 'success',
          title: 'Objectif Atteint ! 🎉',
          message: `Félicitations ! Tu as atteint ton objectif de ${goal}kg. Tu es à ${current}kg !`,
        });
      } else if (change < -0.5) {
        const weeksToGoal = Math.ceil(remaining / Math.abs(change));
        insights.push({
          type: 'success',
          title: 'Progression Excellente',
          message: `Tu perds ${Math.abs(change).toFixed(1)}kg par semaine. À ce rythme, tu atteindras ton objectif dans environ ${weeksToGoal} semaines !`,
        });
      } else if (change > 0.5) {
        insights.push({
          type: 'warning',
          title: 'Prise de Poids',
          message: `Tu as pris ${change.toFixed(1)}kg cette semaine. Vérifie ton alimentation et ton niveau d'activité.`,
        });
      }
    }

    // Tendance générale
    if (history.length >= 14) {
      const twoWeeksAgo = history[history.length - 14].value;
      const twoWeekChange = current - twoWeeksAgo;

      if (Math.abs(twoWeekChange) < 0.3) {
        insights.push({
          type: 'info',
          title: 'Poids Stable',
          message: 'Ton poids est stable depuis 2 semaines. Ajuste ton plan si tu veux continuer à progresser.',
        });
      }
    }

    return insights;
  }

  // ============================================
  // COMBINED INSIGHTS
  // ============================================

  static generateCombinedInsights(data: {
    hrvHistory?: HistoricalData[];
    restingHRHistory?: HistoricalData[];
    sleepHistory?: SleepData[];
    caloriesHistory?: CaloriesData[];
    weightHistory?: HistoricalData[];
    goal?: number;
  }): Insight[] {
    const insights: Insight[] = [];

    if (data.hrvHistory) {
      insights.push(...this.generateHRVInsights(data.hrvHistory));
    }

    if (data.restingHRHistory) {
      insights.push(...this.generateRestingHRInsights(data.restingHRHistory));
    }

    if (data.sleepHistory) {
      insights.push(...this.generateSleepInsights(data.sleepHistory));
    }

    if (data.caloriesHistory) {
      insights.push(...this.generateCaloriesInsights(data.caloriesHistory));
    }

    if (data.weightHistory) {
      insights.push(...this.generateWeightInsights(data.weightHistory, data.goal));
    }

    // Trier par importance (danger > warning > success > info > neutral)
    const priority: { [key: string]: number } = {
      danger: 0,
      warning: 1,
      success: 2,
      info: 3,
      neutral: 4,
    };

    return insights.sort((a, b) => priority[a.type] - priority[b.type]);
  }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateStdDev(values: number[]): number {
  const avg = values.reduce((sum, val) => sum + val, 0) / values.length;
  const squareDiffs = values.map(val => Math.pow(val - avg, 2));
  const avgSquareDiff = squareDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  return Math.sqrt(avgSquareDiff);
}
