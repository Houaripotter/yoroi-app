import { BadgeId } from '@/types/badges';
import { Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import {
  unlockBadge as unlockBadgeLocal,
  isBadgeUnlocked,
  getAllMeasurements,
  getUserSettings,
  calculateWeightStreak,
  getAllWorkouts,
  calculateWorkoutStreak,
} from './storage';

// Débloquer un badge et afficher une notification
export const unlockBadge = async (badgeId: BadgeId): Promise<boolean> => {
  try {
    // Vérifier si le badge est déjà débloqué
    const alreadyUnlocked = await isBadgeUnlocked(badgeId);
    if (alreadyUnlocked) {
      return false;
    }

    // Débloquer le badge localement
    const success = await unlockBadgeLocal(badgeId);

    if (success) {
      console.log('✅ Badge débloqué:', badgeId);
      return true;
    }

    return false;
  } catch (error) {
    console.error('❌ Exception:', error);
    return false;
  }
};

// Vérifier et débloquer les badges après une nouvelle mesure
export const checkWeightBadges = async () => {
  try {
    // Récupérer toutes les mesures depuis le stockage local
    const measurements = await getAllMeasurements();

    if (!measurements || measurements.length === 0) return;

    const unlockedBadges: BadgeId[] = [];

    // Badge "Première pesée"
    if (measurements.length >= 1) {
      const unlocked = await unlockBadge('first_weight');
      if (unlocked) unlockedBadges.push('first_weight');
    }

    // Badge "7 jours consécutifs"
    const streak = await calculateWeightStreak();
    if (streak >= 7) {
      const unlocked = await unlockBadge('streak_7');
      if (unlocked) unlockedBadges.push('streak_7');
    }

    // Badge "30 jours consécutifs"
    if (streak >= 30) {
      const unlocked = await unlockBadge('streak_30');
      if (unlocked) unlockedBadges.push('streak_30');
    }

    // Badges de progression (perte de poids)
    if (measurements.length >= 2) {
      // Trier par date (oldest first)
      const sorted = [...measurements].sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );

      const firstWeight = sorted[0].weight;
      const lastWeight = sorted[sorted.length - 1].weight;
      const weightLoss = firstWeight - lastWeight;

      if (weightLoss >= 1) {
        const unlocked = await unlockBadge('lost_1kg');
        if (unlocked) unlockedBadges.push('lost_1kg');
      }

      if (weightLoss >= 5) {
        const unlocked = await unlockBadge('lost_5kg');
        if (unlocked) unlockedBadges.push('lost_5kg');
      }

      // Badge "Objectif atteint"
      const settings = await getUserSettings();
      if (settings.weight_goal && lastWeight <= settings.weight_goal) {
        const unlocked = await unlockBadge('goal_reached');
        if (unlocked) unlockedBadges.push('goal_reached');
      }
    }

    // Afficher les notifications pour les nouveaux badges
    if (unlockedBadges.length > 0) {
      showBadgeNotification(unlockedBadges);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des badges de poids:', error);
  }
};

// Vérifier et débloquer les badges après un nouvel entraînement
export const checkWorkoutBadges = async () => {
  try {
    // Récupérer tous les entraînements depuis le stockage local
    const workouts = await getAllWorkouts();

    if (!workouts) return;

    const unlockedBadges: BadgeId[] = [];

    // Badge "Premier entraînement"
    if (workouts.length >= 1) {
      const unlocked = await unlockBadge('first_workout');
      if (unlocked) unlockedBadges.push('first_workout');
    }

    // Badge "Sportif du mois" (20 entraînements dans le mois en cours)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const workoutsThisMonth = workouts.filter(
      w => new Date(w.date) >= startOfMonth
    );

    if (workoutsThisMonth.length >= 20) {
      const unlocked = await unlockBadge('workout_month');
      if (unlocked) unlockedBadges.push('workout_month');
    }

    // Afficher les notifications pour les nouveaux badges
    if (unlockedBadges.length > 0) {
      showBadgeNotification(unlockedBadges);
    }
  } catch (error) {
    console.error('❌ Erreur lors de la vérification des badges d\'entraînement:', error);
  }
};

// Afficher une notification pour un nouveau badge
const showBadgeNotification = (badgeIds: BadgeId[]) => {
  if (Platform.OS !== 'web') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const badgeNames = badgeIds.map(id => {
    switch (id) {
      case 'first_weight': return 'Première pesée';
      case 'first_workout': return 'Premier entraînement';
      case 'complete_profile': return 'Profil complet';
      case 'streak_7': return '7 jours consécutifs';
      case 'streak_30': return '30 jours consécutifs';
      case 'workout_month': return 'Sportif du mois';
      case 'lost_1kg': return 'Premier kilo perdu';
      case 'lost_5kg': return '5 kilos perdus';
      case 'goal_reached': return 'Objectif atteint';
      default: return 'Badge';
    }
  });

  const message = badgeIds.length === 1
    ? `Nouveau badge débloqué : ${badgeNames[0]} 🎉`
    : `${badgeIds.length} nouveaux badges débloqués ! 🎉`;

  Alert.alert('🏆 Félicitations !', message, [{ text: 'Super !' }]);
};

// Vérifier tous les badges
export const checkAllBadges = async () => {
  await checkWeightBadges();
  await checkWorkoutBadges();
};
