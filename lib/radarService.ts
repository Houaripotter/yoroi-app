import { openDatabase } from './database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { subDays, startOfDay, endOfDay } from 'date-fns';
import logger from '@/lib/security/logger';

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
       WHERE date >= ? AND date <= ?
       ORDER BY date DESC`,
      [startDate.toISOString(), endDate.toISOString()]
    );

    const totalSeances = trainings.length;

    if (totalSeances === 0) {
      return { force: 0, cardio: 0, technique: 0, souplesse: 0, mental: 0 };
    }

    // FORCE - Basé sur le % de séances force
    const seancesForce = trainings.filter(t => FORCE_SPORTS.includes(t.sport.toLowerCase())).length;
    const forceScore = Math.min((seancesForce / totalSeances) * 100, 100);

    // CARDIO - Basé sur le % de séances cardio
    const seancesCardio = trainings.filter(t => CARDIO_SPORTS.includes(t.sport.toLowerCase())).length;
    const cardioScore = Math.min((seancesCardio / totalSeances) * 100, 100);

    // SOUPLESSE - Basé sur le % de séances souplesse
    const seancesSouplesse = trainings.filter(t => SOUPLESSE_SPORTS.includes(t.sport.toLowerCase())).length;
    const souplesseScore = Math.min((seancesSouplesse / totalSeances) * 100, 100);

    // TECHNIQUE - Basé sur la moyenne des auto-évaluations (1-5 étoiles)
    const notedTrainings = trainings.filter(t => t.technique_rating !== null && t.technique_rating > 0);
    let techniqueScore = 0;
    if (notedTrainings.length > 0) {
      const avgRating = notedTrainings.reduce((sum, t) => sum + t.technique_rating, 0) / notedTrainings.length;
      techniqueScore = (avgRating / 5) * 100;
    }

    // MENTAL - Basé sur la régularité (streak) + constance
    const streakStr = await AsyncStorage.getItem('streak');
    const streak = streakStr ? parseInt(streakStr, 10) : 0;

    // Régularité : 21 jours = habitude formée (100%)
    const régularité = Math.min((streak / 21) * 100, 100);

    // Constance : nombre de jours actifs sur les 28 derniers jours
    const last28Days = await db.getAllAsync<any>(
      `SELECT date FROM trainings WHERE date >= ? AND date <= ?`,
      [subDays(now, 28).toISOString(), now.toISOString()]
    );
    const uniqueDays = new Set(last28Days.map(t => new Date(t.date).toDateString())).size;
    const constance = (uniqueDays / 28) * 100;

    const mentalScore = (régularité * 0.6) + (constance * 0.4);

    return {
      force: Math.round(forceScore),
      cardio: Math.round(cardioScore),
      technique: Math.round(techniqueScore),
      souplesse: Math.round(souplesseScore),
      mental: Math.round(mentalScore),
    };
  } catch (error) {
    logger.error('Erreur calcul scores radar:', error);
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
      `SELECT sport, technique_rating FROM trainings WHERE date >= ? AND date <= ?`,
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
    logger.error('Erreur calcul évolution radar:', error);
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
      icon: 'dumbbell',
      text: "Ton score force est en retrait. Deux séances de renforcement par semaine, c'est un bon début.",
      source: "ACSM (2009) : deux à trois séances par semaine pour débuter le renforcement",
    };
  }

  // Cardio faible
  if (scores.cardio < 30) {
    return {
      icon: 'heart',
      text: "Ton cardio est en retrait. Ajoute une ou deux séances d'endurance dans ta semaine.",
      source: "OMS (2020) : 150 à 300 minutes d'activité modérée par semaine pour un adulte",
    };
  }

  // Mental faible (régularité)
  if (scores.mental < 40) {
    return {
      icon: 'brain',
      text: "La régularité bat l'intensité. Vise 3 séances légères plutôt qu'une grosse.",
      source: "Lally et al. (2010) : en moyenne 66 jours pour ancrer une habitude",
    };
  }

  // Souplesse faible
  if (scores.souplesse < 20) {
    return {
      icon: 'flame',
      text: "Quelques minutes d'étirements après ta séance t'aident à garder ta mobilité.",
      source: null,
    };
  }

  // Technique non notée
  if (scores.technique === 0) {
    return {
      icon: 'target',
      text: 'Note ta technique après chaque séance pour suivre ta progression.',
      source: null,
    };
  }

  // Tout est équilibré
  const avg = (scores.force + scores.cardio + scores.technique + scores.souplesse + scores.mental) / 5;
  if (avg >= 50) {
    return {
      icon: 'trophy',
      text: 'Profil équilibré. Tu es sur la bonne voie, continue comme ça.',
      source: null,
    };
  }

  // Par défaut
  return {
    icon: 'lightbulb',
    text: 'Varie tes entraînements pour développer un profil complet.',
    source: null,
  };
};

/**
 * Explications de chaque axe. Seules les sources vérifiées gardent un lien,
 * aucun chiffre n'est avancé sans source.
 */
export const RADAR_REFERENCES = {
  charge: {
    title: 'Charge',
    description: "Basé sur la fréquence et l'intensité de tes entraînements.",
    reference: "Monter la charge d'entraînement progressivement aide à limiter les blessures.",
    source: 'Gabbett, The training-injury prevention paradox, British Journal of Sports Medicine, 2016',
    url: 'https://pubmed.ncbi.nlm.nih.gov/26758673/',
  },
  hydratation: {
    title: 'Hydratation',
    description: 'Basé sur ton apport quotidien en eau.',
    reference: "Perdre plus de 2 % de ton poids en eau pendant l'effort peut faire baisser tes performances.",
    source: 'Exercise and Fluid Replacement, ACSM Position Stand, 2007',
    url: 'https://pubmed.ncbi.nlm.nih.gov/17277604/',
  },
  poids: {
    title: 'Poids',
    description: 'Basé sur ta progression vers ton objectif de poids.',
    reference: 'Ta composition corporelle compte autant que ton poids sur la balance.',
  },
  régularité: {
    title: 'Régularité',
    description: 'Basé sur ta constance dans les entraînements.',
    reference: "Il faut en moyenne 66 jours pour ancrer une habitude. La constance compte plus que l'intensité.",
    source: 'Lally et al., How are habits formed, European Journal of Social Psychology, 2010',
    url: 'https://doi.org/10.1002/ejsp.674',
  },
  sommeil: {
    title: 'Sommeil',
    description: 'Basé sur la qualité et la durée de ton sommeil.',
    reference: 'Sept à neuf heures de sommeil sont recommandées pour un adulte, elles aident ta récupération.',
    source: 'National Sleep Foundation',
    url: 'https://www.sleepfoundation.org/how-sleep-works/how-much-sleep-do-we-really-need',
  },
  force: {
    title: 'Force',
    description: 'Basé sur tes séances de musculation, crossfit, haltérophilie, kettlebell.',
    reference: 'Deux à trois séances de renforcement par semaine suffisent pour progresser quand tu débutes.',
    source: 'Progression Models in Resistance Training for Healthy Adults, ACSM Position Stand, 2009',
    url: 'https://pubmed.ncbi.nlm.nih.gov/19204579/',
  },
  cardio: {
    title: 'Cardio',
    description: 'Basé sur tes séances de running, boxe, MMA, HIIT, natation, vélo.',
    reference: "L'OMS recommande 150 à 300 minutes d'activité modérée par semaine pour un adulte.",
    source: "Lignes directrices de l'OMS sur l'activité physique, 2020",
  },
  mental: {
    title: 'Mental',
    description: 'Basé sur ta régularité (série de jours) et ta constance sur 4 semaines.',
    reference: "Une activité physique régulière fait du bien au moral. La constance compte plus que l'intensité.",
  },
  technique: {
    title: 'Technique',
    description: 'Basé sur tes auto-évaluations après chaque séance (1 à 5 étoiles).',
    reference: "Noter tes séances t'aide à voir ce qui progresse et ce qui coince.",
  },
  souplesse: {
    title: 'Souplesse',
    description: 'Basé sur tes séances de yoga, stretching, pilates, mobilité.',
    reference: "S'étirer régulièrement entretient ta mobilité.",
  },
  intro: {
    title: 'Ton radar expliqué',
    description: 'Ce radar résume 5 dimensions de ton entraînement, calculées à partir de tes séances réelles.',
  },
};
