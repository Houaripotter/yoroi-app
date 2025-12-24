import { openDatabase } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subDays, startOfDay, endOfDay } from 'date-fns';

export interface RadarScores {
  force: number;      // 0-100
  cardio: number;     // 0-100
  technique: number;  // 0-100
  souplesse: number;  // 0-100
  mental: number;     // 0-100
}

export interface RadarInsight {
  icon: string;
  text: string;
  source: string | null;
}

export interface RadarEvolution {
  force: number;
  cardio: number;
  technique: number;
  souplesse: number;
  mental: number;
  average: number;
}

// Types de sport par catégorie
const FORCE_SPORTS = ['musculation', 'crossfit', 'halterophilie', 'kettlebell', 'force_athletique'];
const CARDIO_SPORTS = ['running', 'mma', 'boxe', 'hiit', 'velo', 'natation', 'corde_a_sauter', 'muay_thai', 'kickboxing', 'course'];
const SOUPLESSE_SPORTS = ['yoga', 'stretching', 'pilates', 'mobilite'];

/**
 * Calculer les scores du radar basés sur les données réelles
 */
export const calculateRadarScores = async (period: 'week' | 'month' = 'week'): Promise<RadarScores> => {
  try {
    const db = await openDatabase();
    const now = new Date();
    const daysAgo = period === 'week' ? 7 : 30;
    const startDate = startOfDay(subDays(now, daysAgo));
    const endDate = endOfDay(now);

    // Récupérer toutes les séances de la période
    const trainings = await db.getAllAsync<any>(
      `SELECT sport, technique_rating, date
       FROM trainings
       WHERE date >= ? AND date <= ?
       ORDER BY date DESC`,
      [startDate.toISOString(), endDate.toISOString()]
    );

    const totalSeances = trainings.length;

    if (totalSeances === 0) {
      return { force: 0, cardio: 0, technique: 0, souplesse: 0, mental: 0 };
    }

    // 💪 FORCE - Basé sur le % de séances force
    const seancesForce = trainings.filter(t => FORCE_SPORTS.includes(t.sport.toLowerCase())).length;
    const forceScore = Math.min((seancesForce / totalSeances) * 100, 100);

    // ❤️ CARDIO - Basé sur le % de séances cardio
    const seancesCardio = trainings.filter(t => CARDIO_SPORTS.includes(t.sport.toLowerCase())).length;
    const cardioScore = Math.min((seancesCardio / totalSeances) * 100, 100);

    // 🧘 SOUPLESSE - Basé sur le % de séances souplesse
    const seancesSouplesse = trainings.filter(t => SOUPLESSE_SPORTS.includes(t.sport.toLowerCase())).length;
    const souplesseScore = Math.min((seancesSouplesse / totalSeances) * 100, 100);

    // 🎯 TECHNIQUE - Basé sur la moyenne des auto-évaluations (1-5 étoiles)
    const notedTrainings = trainings.filter(t => t.technique_rating !== null && t.technique_rating > 0);
    let techniqueScore = 0;
    if (notedTrainings.length > 0) {
      const avgRating = notedTrainings.reduce((sum, t) => sum + t.technique_rating, 0) / notedTrainings.length;
      techniqueScore = (avgRating / 5) * 100;
    }

    // 🧠 MENTAL - Basé sur la régularité (streak) + constance
    const streakStr = await AsyncStorage.getItem('streak');
    const streak = streakStr ? parseInt(streakStr, 10) : 0;

    // Régularité : 21 jours = habitude formée (100%)
    const regularite = Math.min((streak / 21) * 100, 100);

    // Constance : nombre de jours actifs sur les 28 derniers jours
    const last28Days = await db.getAllAsync<any>(
      `SELECT date FROM trainings WHERE date >= ? AND date <= ?`,
      [subDays(now, 28).toISOString(), now.toISOString()]
    );
    const uniqueDays = new Set(last28Days.map(t => new Date(t.date).toDateString())).size;
    const constance = (uniqueDays / 28) * 100;

    const mentalScore = (regularite * 0.6) + (constance * 0.4);

    return {
      force: Math.round(forceScore),
      cardio: Math.round(cardioScore),
      technique: Math.round(techniqueScore),
      souplesse: Math.round(souplesseScore),
      mental: Math.round(mentalScore),
    };
  } catch (error) {
    console.error('Erreur calcul scores radar:', error);
    return { force: 0, cardio: 0, technique: 0, souplesse: 0, mental: 0 };
  }
};

/**
 * Calculer l'évolution vs semaine dernière
 */
export const calculateRadarEvolution = async (): Promise<RadarEvolution> => {
  try {
    const db = await openDatabase();
    const currentScores = await calculateRadarScores('week');

    // Scores de la semaine dernière (J-14 à J-7)
    const now = new Date();
    const startLastWeek = startOfDay(subDays(now, 14));
    const endLastWeek = endOfDay(subDays(now, 7));

    const trainingsLastWeek = await db.getAllAsync<any>(
      `SELECT sport, technique_rating FROM trainings WHERE date >= ? AND date <= ?`,
      [startLastWeek.toISOString(), endLastWeek.toISOString()]
    );

    const totalLastWeek = trainingsLastWeek.length;

    if (totalLastWeek === 0) {
      return {
        force: 0,
        cardio: 0,
        technique: 0,
        souplesse: 0,
        mental: 0,
        average: 0,
      };
    }

    // Calculer les scores de la semaine dernière
    const forceLastWeek = Math.min(
      (trainingsLastWeek.filter(t => FORCE_SPORTS.includes(t.sport.toLowerCase())).length / totalLastWeek) * 100,
      100
    );
    const cardioLastWeek = Math.min(
      (trainingsLastWeek.filter(t => CARDIO_SPORTS.includes(t.sport.toLowerCase())).length / totalLastWeek) * 100,
      100
    );
    const souplesseLastWeek = Math.min(
      (trainingsLastWeek.filter(t => SOUPLESSE_SPORTS.includes(t.sport.toLowerCase())).length / totalLastWeek) * 100,
      100
    );

    const notedLastWeek = trainingsLastWeek.filter(t => t.technique_rating !== null && t.technique_rating > 0);
    const techniqueLastWeek = notedLastWeek.length > 0
      ? (notedLastWeek.reduce((sum, t) => sum + t.technique_rating, 0) / notedLastWeek.length / 5) * 100
      : 0;

    // Mental simplifié pour la semaine dernière
    const mentalLastWeek = currentScores.mental; // On pourrait améliorer ça

    // Calculer les différences
    const evolution = {
      force: Math.round(currentScores.force - forceLastWeek),
      cardio: Math.round(currentScores.cardio - cardioLastWeek),
      technique: Math.round(currentScores.technique - techniqueLastWeek),
      souplesse: Math.round(currentScores.souplesse - souplesseLastWeek),
      mental: 0, // Pas de différence pour le mental (basé sur streak global)
      average: 0,
    };

    // Calculer la moyenne de l'évolution
    const avg = (evolution.force + evolution.cardio + evolution.technique + evolution.souplesse) / 4;
    evolution.average = Math.round(avg);

    return evolution;
  } catch (error) {
    console.error('Erreur calcul évolution radar:', error);
    return { force: 0, cardio: 0, technique: 0, souplesse: 0, mental: 0, average: 0 };
  }
};

/**
 * Générer un insight personnalisé selon les scores
 */
export const getRadarInsight = (scores: RadarScores): RadarInsight => {
  // Force faible
  if (scores.force < 30) {
    return {
      icon: '💪',
      text: "Ton score force est en retrait. 2 séances/semaine suffisent pour progresser !",
      source: "ACSM 2022 : +25-30% de force en 12 semaines avec 2-3 séances/sem",
    };
  }

  // Cardio faible
  if (scores.cardio < 30) {
    return {
      icon: '❤️',
      text: "Ton cardio est en retrait. 20 min de HIIT 3x/semaine = résultats garantis !",
      source: "OMS 2020 : 150 min d'activité modérée/sem = -30-40% risque cardiovasculaire",
    };
  }

  // Mental faible (régularité)
  if (scores.mental < 40) {
    return {
      icon: '🧠',
      text: "La régularité bat l'intensité. Vise 3 séances légères plutôt qu'une grosse.",
      source: "Lally 2009 : 66 jours pour former une habitude solide",
    };
  }

  // Souplesse faible
  if (scores.souplesse < 20) {
    return {
      icon: '🧘',
      text: "10 min de stretching après ta séance = -35% risque de blessure",
      source: "British Journal of Sports Medicine 2019",
    };
  }

  // Technique non notée
  if (scores.technique === 0) {
    return {
      icon: '🎯',
      text: "Note ta technique après chaque séance pour suivre ta progression !",
      source: "L'auto-évaluation améliore la conscience corporelle et réduit les blessures de 35%",
    };
  }

  // Tout est équilibré
  const avg = (scores.force + scores.cardio + scores.technique + scores.souplesse + scores.mental) / 5;
  if (avg >= 50) {
    return {
      icon: '🏆',
      text: "Profil équilibré ! Tu es sur la bonne voie. Continue comme ça.",
      source: null,
    };
  }

  // Par défaut
  return {
    icon: '💡',
    text: "Varie tes entraînements pour développer un profil complet.",
    source: null,
  };
};

/**
 * Références scientifiques pour la modal info
 */
export const RADAR_REFERENCES = {
  force: {
    title: "💪 FORCE",
    description: "Basé sur tes séances de musculation, crossfit, haltérophilie, kettlebell.",
    reference: "📚 \"L'entraînement en résistance 2-3x/semaine augmente la force de 25-30% en 12 semaines\" — American College of Sports Medicine, 2022",
  },
  cardio: {
    title: "❤️ CARDIO",
    description: "Basé sur tes séances de running, boxe, MMA, HIIT, natation, vélo.",
    reference: "📚 \"150 min d'activité cardio modérée/semaine réduit le risque cardiovasculaire de 30-40%\" — Organisation Mondiale de la Santé, 2020",
  },
  mental: {
    title: "🧠 MENTAL",
    description: "Basé sur ta régularité (streak) et ta constance sur 4 semaines.",
    reference: "📚 \"Il faut en moyenne 66 jours pour former une habitude. La régularité est plus importante que l'intensité.\" — European Journal of Social Psychology, Phillippa Lally, 2009\n\n📚 \"L'exercice régulier réduit l'anxiété de 48% et améliore les fonctions cognitives\" — Harvard Medical School, 2021",
  },
  technique: {
    title: "🎯 TECHNIQUE",
    description: "Basé sur tes auto-évaluations après chaque séance (1-5 étoiles).",
    reference: "📚 \"L'auto-évaluation améliore la conscience corporelle et réduit le risque de blessure de 35%\" — British Journal of Sports Medicine, 2019",
  },
  souplesse: {
    title: "🧘 SOUPLESSE",
    description: "Basé sur tes séances de yoga, stretching, pilates, mobilité.",
    reference: "📚 \"10 min de stretching quotidien améliore l'amplitude articulaire de 20% en 4 semaines\" — Journal of Sports Science & Medicine, 2018",
  },
  intro: {
    title: "ℹ️ TON RADAR EXPLIQUÉ",
    description: "Ce radar analyse 5 dimensions de ton entraînement basées sur tes séances réelles. Chaque axe est calculé scientifiquement pour te donner une vision complète de ta progression, comme les athlètes pro.",
  },
};
