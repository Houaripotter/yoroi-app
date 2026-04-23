// ============================================
// COACH DU JOUR · Recommandation personnalisee quotidienne
// ============================================
// Analyse l'historique et genere 1 suggestion du jour sur le dashboard.
// Pure TS, pas de reseau, rapide.
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTrainings, getWeights } from './database';
import logger from '@/lib/security/logger';

export type CoachCategory =
  | 'cardio_gap'       // pas de cardio recemment
  | 'pr_retry'         // un PR vieux, retenter
  | 'weekly_goal'      // encourager pour atteindre objectif semaine
  | 'rest'             // conseil repos (over-training)
  | 'streak_push'      // pousser pour la streak
  | 'weight_log'       // rappel pesee
  | 'first_session'    // premiere session jamais
  | 'comeback'         // retour apres pause
  | 'balance'          // equilibrer les types d'effort
  | 'motivation';      // default motivationnel

export interface CoachSuggestion {
  category: CoachCategory;
  icon: string;       // nom Lucide
  title: string;      // court
  message: string;    // 1-2 phrases
  actionLabel?: string;
  actionRoute?: string;
  color: string;      // hex
}

const SEEN_KEY = '@yoroi_coach_seen_date';

/**
 * Genere la recommandation du jour.
 * Idempotent sur la meme journee (meme suggestion tant qu'on change pas de date).
 */
export async function getCoachSuggestionOfTheDay(): Promise<CoachSuggestion> {
  try {
    const trainings = await getTrainings(200).catch(() => []);
    const weights = await getWeights(30).catch(() => []);

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);

    // === Cas 1 : premiere session jamais ===
    if (trainings.length === 0) {
      return {
        category: 'first_session',
        icon: 'Sparkles',
        title: 'Premiere seance',
        message: 'Ton voyage commence maintenant. Meme 15min aujourd\'hui, et demain t\'en seras fier.',
        actionLabel: 'Demarrer une seance',
        actionRoute: '/timer',
        color: '#D4AF37',
      };
    }

    const trainingDates = trainings.map(t => new Date(t.date).getTime()).sort((a, b) => b - a);
    const lastTraining = new Date(trainingDates[0]);
    const daysSinceLast = Math.floor((today.getTime() - lastTraining.getTime()) / 86400000);

    // === Cas 2 : retour apres pause (10+ jours) ===
    if (daysSinceLast >= 10) {
      return {
        category: 'comeback',
        icon: 'Flame',
        title: `${daysSinceLast} jours sans seance`,
        message: 'La rouille est l\'ennemi du samourai. Une courte session aujourd\'hui suffit pour relancer la machine.',
        actionLabel: 'Reprendre',
        actionRoute: '/timer',
        color: '#FF9500',
      };
    }

    // === Cas 3 : over-training (6+ jours d'affilee) ===
    const last7Days = trainings.filter(t => {
      const d = new Date(t.date).getTime();
      return d >= today.getTime() - 7 * 86400000;
    });
    const uniqueDaysTrainedThisWeek = new Set(last7Days.map(t => new Date(t.date).toISOString().slice(0, 10))).size;
    if (uniqueDaysTrainedThisWeek >= 6) {
      return {
        category: 'rest',
        icon: 'Moon',
        title: 'Jour de repos conseille',
        message: `Tu t'es entraine ${uniqueDaysTrainedThisWeek}j cette semaine. La recuperation, c'est la ou les gains se font.`,
        actionLabel: 'Suivre mon sommeil',
        actionRoute: '/sleep',
        color: '#3B82F6',
      };
    }

    // === Cas 4 : analyse des types d'effort (cardio_gap / balance) ===
    const cardioTypes = ['course', 'running', 'velo', 'cycling', 'natation', 'swimming', 'cardio', 'rowing', 'hyrox'];
    const last14 = trainings.filter(t => new Date(t.date).getTime() >= today.getTime() - 14 * 86400000);
    const hasCardioLately = last14.some(t => {
      const type = (t.sport || '').toLowerCase();
      return cardioTypes.some(k => type.includes(k));
    });
    if (!hasCardioLately && last14.length >= 3) {
      return {
        category: 'cardio_gap',
        icon: 'Wind',
        title: 'Ton cardio dort',
        message: 'Pas de cardio depuis 2 semaines. 20min de course ou velo te redonneront du souffle sur le tapis.',
        actionLabel: 'Logger un cardio',
        actionRoute: '/add-training',
        color: '#06B6D4',
      };
    }

    // === Cas 5 : weekly_goal (encourager objectif) ===
    const goalSessions = 4; // objectif implicite : 4 seances/semaine
    if (uniqueDaysTrainedThisWeek < goalSessions && uniqueDaysTrainedThisWeek >= 1) {
      const missing = goalSessions - uniqueDaysTrainedThisWeek;
      return {
        category: 'weekly_goal',
        icon: 'Target',
        title: `${missing} seance${missing > 1 ? 's' : ''} pour ton objectif`,
        message: `Tu es a ${uniqueDaysTrainedThisWeek}/${goalSessions} cette semaine. Encore ${missing}, tu gardes le rythme des champions.`,
        actionLabel: 'Logger une seance',
        actionRoute: '/add-training',
        color: '#10B981',
      };
    }

    // === Cas 6 : weight_log (pesee si pas pese depuis 7j) ===
    if (weights.length > 0) {
      const lastWeightDate = new Date(weights[0].date).getTime();
      const daysSinceWeight = Math.floor((today.getTime() - lastWeightDate) / 86400000);
      if (daysSinceWeight >= 7) {
        return {
          category: 'weight_log',
          icon: 'Scale',
          title: 'Pesee hebdomadaire',
          message: `Ca fait ${daysSinceWeight}j que tu ne t'es pas pese. 10 secondes, zero excuse.`,
          actionLabel: 'Ajouter ma pesee',
          actionRoute: '/entry',
          color: '#8B5CF6',
        };
      }
    }

    // === Cas 7 : streak_push ===
    if (daysSinceLast === 1) {
      return {
        category: 'streak_push',
        icon: 'Flame',
        title: 'Continue ta serie',
        message: 'Tu t\'es entraine hier. Une session aujourd\'hui, et demain c\'est du quasi-automatique.',
        actionLabel: 'Nouvelle seance',
        actionRoute: '/timer',
        color: '#EF4444',
      };
    }

    // === Cas 8 : balance (detecter monotonie) ===
    if (last14.length >= 5) {
      const types = last14.map(t => (t.sport || '').toLowerCase()).filter(Boolean);
      const mostCommon = types.reduce<Record<string, number>>((acc, t) => {
        acc[t] = (acc[t] || 0) + 1;
        return acc;
      }, {});
      const entries = Object.entries(mostCommon);
      if (entries.length > 0) {
        const [topType, topCount] = entries.sort((a, b) => b[1] - a[1])[0];
        if (topCount / last14.length > 0.7) {
          return {
            category: 'balance',
            icon: 'Shuffle',
            title: 'Varie tes entrainements',
            message: `Plus de ${Math.round((topCount / last14.length) * 100)}% de ${topType}. Un samourai maitrise plusieurs armes : essaie autre chose aujourd'hui.`,
            actionLabel: 'Explorer',
            actionRoute: '/sport',
            color: '#F59E0B',
          };
        }
      }
    }

    // === Default : motivation pure ===
    const motivations: CoachSuggestion[] = [
      {
        category: 'motivation',
        icon: 'Sword',
        title: 'Aiguise ta lame',
        message: 'Les grandes victoires naissent des petites habitudes quotidiennes.',
        color: '#D4AF37',
      },
      {
        category: 'motivation',
        icon: 'Mountain',
        title: 'Une seule priorite',
        message: 'Aujourd\'hui n\'a pas besoin d\'etre parfait. Il a juste besoin d\'etre fait.',
        color: '#D4AF37',
      },
      {
        category: 'motivation',
        icon: 'Zap',
        title: 'Energie brute',
        message: '3% mieux chaque jour = 36x mieux en un an. La patience est une arme.',
        color: '#D4AF37',
      },
      {
        category: 'motivation',
        icon: 'Shield',
        title: 'Discipline',
        message: 'La motivation se dissipe. La discipline reste. Choisis ta voie.',
        color: '#D4AF37',
      },
    ];
    // Selection deterministe selon le jour (meme suggestion toute la journee)
    const seed = today.getFullYear() * 1000 + today.getMonth() * 50 + today.getDate();
    return motivations[seed % motivations.length];
  } catch (e) {
    logger.warn('[Coach] erreur suggestion', e);
    return {
      category: 'motivation',
      icon: 'Sword',
      title: 'Un pas de plus',
      message: 'Commence par quelque chose aujourd\'hui.',
      color: '#D4AF37',
    };
  }
}

/**
 * Marque la suggestion comme vue (utilise pour analytics/opt-in).
 */
export async function markCoachSeenToday(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  await AsyncStorage.setItem(SEEN_KEY, today);
}

export async function wasCoachSeenToday(): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const seen = await AsyncStorage.getItem(SEEN_KEY);
  return seen === today;
}
