// ============================================
// YOROI - HEALTH INSIGHTS GENERATOR
// ============================================
// Génère des insights automatiques basés sur les données de santé
// ============================================

import { type Insight } from '@/components/health-charts/InsightCard';
import { formatDurationHM } from '@/lib/formatDuration';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

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
    const change = previousAvg !== 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    // HRV en hausse = bonne récupération
    if (change > 10) {
      insights.push({
        type: 'success',
        title: traduire('Récupération excellente'),
        message:
          traduire('Ta variabilité cardiaque monte nettement. Tu récupères bien, ton corps est prêt pour une séance intense.'),
        metric: `${recentAvg.toFixed(0)} ms`,
        change,
      });
    } else if (change < -10) {
      insights.push({
        type: 'warning',
        title: traduire('Récupération en baisse'),
        message:
          traduire('Ta variabilité cardiaque a nettement baissé. Ton corps a peut-être besoin de repos : séance légère ou jour off.'),
        metric: `${recentAvg.toFixed(0)} ms`,
        change,
      });
    } else if (recentAvg > 60) {
      insights.push({
        type: 'success',
        title: traduire('Variabilité cardiaque haute'),
        message: traduire('Ta variabilité cardiaque est haute cette semaine, signe d\'une bonne récupération.'),
        metric: `${recentAvg.toFixed(0)} ms`,
      });
    } else if (recentAvg < 30) {
      insights.push({
        type: 'danger',
        title: traduire('Variabilité cardiaque basse'),
        message:
          traduire('Ta variabilité cardiaque est basse. Laisse plus de temps à la récupération et soigne ton sommeil.'),
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
    const change = previousAvg !== 0 ? ((recentAvg - previousAvg) / previousAvg) * 100 : 0;

    // FC au repos qui baisse = bonne forme
    if (change < -5) {
      insights.push({
        type: 'success',
        title: traduire('Ton cœur se renforce'),
        message:
          traduire('Ta fréquence cardiaque au repos baisse, signe d\'une meilleure condition physique.'),
        metric: `${recentAvg.toFixed(0)} BPM`,
        change,
      });
    } else if (change > 10) {
      insights.push({
        type: 'warning',
        title: traduire('Fréquence au repos en hausse'),
        message:
          traduire('Ta fréquence cardiaque au repos a augmenté. Ça peut venir de la fatigue, du stress ou d\'un excès d\'entraînement.'),
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
        title: traduire('Bonnes nuits'),
        message: traduire("Tu dors en moyenne {0} par nuit. Idéal pour récupérer.", formatDurationHM(avgTotal)),
      });
    } else if (avgTotal < 360) {
      // < 6h
      insights.push({
        type: 'danger',
        title: traduire('Nuits trop courtes'),
        message: traduire("Tu ne dors que {0} en moyenne. Augmente ton temps de sommeil pour optimiser ta récupération.", formatDurationHM(avgTotal)),
      });
    }

    // Sommeil profond
    const deepPercent = (avgDeep / avgTotal) * 100;
    if (deepPercent >= 20) {
      insights.push({
        type: 'success',
        title: traduire('Beaucoup de sommeil profond'),
        message: traduire("{0} % de sommeil profond. Idéal pour la récupération musculaire.", deepPercent.toFixed(0)),
      });
    } else if (deepPercent < 13) {
      insights.push({
        type: 'warning',
        title: traduire('Peu de sommeil profond'),
        message: traduire("Seulement {0} % de sommeil profond. Améliore ton hygiène de sommeil (température, obscurité, régularité).", deepPercent.toFixed(0)),
      });
    }

    // REM
    const remPercent = (avgRem / avgTotal) * 100;
    if (remPercent < 15) {
      insights.push({
        type: 'info',
        title: traduire('Peu de sommeil paradoxal'),
        message: traduire("{0} % de sommeil paradoxal. Il compte pour la mémoire et la récupération mentale.", remPercent.toFixed(0)),
      });
    }

    // Éveils
    if (avgAwake > 60) {
      insights.push({
        type: 'warning',
        title: traduire('Nuits agitées'),
        message: traduire("Tu passes {0} minutes éveillé en moyenne. Réduis la caféine et les écrans avant de dormir.", avgAwake.toFixed(0)),
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
        title: traduire('Grosse activité'),
        message: traduire("Tu brûles {0} kcal actives en moyenne par jour. Très bon niveau d'activité.", avgActive.toFixed(0)),
      });
    } else if (avgActive < 300) {
      insights.push({
        type: 'info',
        title: traduire('Activité modérée'),
        message: traduire("{0} kcal actives en moyenne. Augmente ton activité quotidienne pour améliorer ta condition physique.", avgActive.toFixed(0)),
      });
    }

    // Régularité
    const stdDev = calculateStdDev(recent.map(d => d.active));
    if (stdDev < 100) {
      insights.push({
        type: 'success',
        title: traduire('Activité régulière'),
        message: traduire('Ton niveau d\'activité est très régulier d\'un jour à l\'autre.'),
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
          title: traduire('Objectif atteint'),
          message: traduire("Bravo, tu as atteint ton objectif de {0} kg. Tu es à {1} kg.", goal, current),
        });
      } else if (change < -0.5) {
        const weeksToGoal = Math.ceil(remaining / Math.abs(change));
        insights.push({
          type: 'success',
          title: traduire('Belle progression'),
          message: traduire("Tu perds {0} kg par semaine. À ce rythme, ton objectif est dans environ {1} semaines.", Math.abs(change).toFixed(1).replace('.', DECIMAL), weeksToGoal),
        });
      } else if (change > 0.5) {
        insights.push({
          type: 'warning',
          title: traduire('Poids en hausse'),
          message: traduire("Tu as pris {0} kg cette semaine. Vérifie ton alimentation et ton niveau d'activité.", change.toFixed(1).replace('.', DECIMAL)),
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
          title: traduire('Poids stable'),
          message: traduire('Ton poids est stable depuis 2 semaines. Ajuste ton plan si tu veux continuer à progresser.'),
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
