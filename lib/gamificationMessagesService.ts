// ============================================
// YOROI - MESSAGES GAMIFICATION (CLOCHE IN-APP)
// ============================================
// Injecte des messages de motivation dans la cloche
// sans aucune notification systeme (0 push notification)
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';
import { saveNotification } from '@/lib/notificationHistoryService';
import { getCurrentRank, getNextRank, getDaysToNextRank, getRankProgress } from '@/lib/ranks';
import logger from '@/lib/security/logger';

// ============================================
// CLES DE THROTTLE (1 message max par cle par jour)
// ============================================

const KEY_LOGIN_BONUS = '@yoroi_gamif_login_bonus_date';
const KEY_RANK_PROGRESS = '@yoroi_gamif_rank_progress_date';
const KEY_WEEKLY_RECAP = '@yoroi_gamif_weekly_recap_date';
const KEY_STREAK_WARNING = '@yoroi_gamif_streak_warning_date';
const KEY_XP_SNAPSHOT = '@yoroi_gamif_xp_snapshot'; // XP d'hier pour calculer le gain

// ============================================
// HELPERS
// ============================================

async function wasAlreadySentToday(key: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (!stored) return false;
    const today = new Date().toISOString().split('T')[0];
    return stored === today;
  } catch {
    return false;
  }
}

async function markSentToday(key: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  await AsyncStorage.setItem(key, today);
}

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0];
}

function getThisWeekStr(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // lundi
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().split('T')[0];
}

// ============================================
// BONUS JOURNALIER DE CONNEXION
// 10 XP offerts juste pour ouvrir l'app
// Injecte 1 message dans la cloche (1 fois par jour)
// ============================================

const KEY_LOGIN_BONUS_XP_TOTAL = '@yoroi_login_bonus_xp_total';

export async function triggerDailyLoginBonus(currentPoints: number): Promise<number> {
  try {
    const alreadySent = await wasAlreadySentToday(KEY_LOGIN_BONUS);
    if (alreadySent) return 0;

    const BONUS = 10;
    await markSentToday(KEY_LOGIN_BONUS);

    // Accumuler le bonus dans AsyncStorage pour le calcul des points
    const existing = await AsyncStorage.getItem(KEY_LOGIN_BONUS_XP_TOTAL);
    const total = (existing ? parseInt(existing, 10) : 0) + BONUS;
    await AsyncStorage.setItem(KEY_LOGIN_BONUS_XP_TOTAL, total.toString());

    await saveNotification(
      '+10 XP - Bonus de connexion',
      'Tu es la chaque jour. C\'est ca la discipline.',
      'gamification',
      { screen: 'gamification' }
    );

    return BONUS;
  } catch (error) {
    logger.error('[GamifMessages] Erreur bonus connexion:', error);
    return 0;
  }
}

// ============================================
// MESSAGE DE PROGRESSION VERS LE PROCHAIN RANG
// "Tu es a X XP de Bushi - continue !"
// 1 fois par jour max
// ============================================

export async function triggerRankProgressMessage(totalPoints: number): Promise<void> {
  try {
    const alreadySent = await wasAlreadySentToday(KEY_RANK_PROGRESS);
    if (alreadySent) return;

    const nextRank = getNextRank(totalPoints);
    if (!nextRank) return; // rang max atteint

    const xpLeft = getDaysToNextRank(totalPoints);
    const progress = Math.round(getRankProgress(totalPoints));
    const currentRank = getCurrentRank(totalPoints);

    // Ne pas envoyer si trop loin (> 2000 XP restants, pas motivant)
    if (xpLeft > 2000) return;

    await markSentToday(KEY_RANK_PROGRESS);

    let body: string;
    if (xpLeft <= 50) {
      body = `Tu es a ${xpLeft} XP de ${nextRank.name} - tu y es presque !`;
    } else if (xpLeft <= 200) {
      body = `${progress}% vers ${nextRank.name}. Encore ${xpLeft} XP !`;
    } else {
      body = `${progress}% accompli en tant que ${currentRank.name}. Continue !`;
    }

    await saveNotification(
      `Objectif : ${nextRank.name}`,
      body,
      'gamification',
      { screen: 'gamification' }
    );
  } catch (error) {
    logger.error('[GamifMessages] Erreur message rang:', error);
  }
}

// ============================================
// RECAP HEBDOMADAIRE (chaque lundi)
// "La semaine derniere : +X XP, Y séances"
// ============================================

export async function triggerWeeklyRecap(
  totalPoints: number,
  streak: number,
  trainingsThisWeek: number,
): Promise<void> {
  try {
    const isMonday = new Date().getDay() === 1;
    if (!isMonday) return;

    const thisWeek = getThisWeekStr();
    const stored = await AsyncStorage.getItem(KEY_WEEKLY_RECAP);
    if (stored === thisWeek) return;

    await AsyncStorage.setItem(KEY_WEEKLY_RECAP, thisWeek);

    const rank = getCurrentRank(totalPoints);

    let body: string;
    if (trainingsThisWeek === 0) {
      body = `Serie de ${streak} jours. Cette semaine : 0 séances. Tu peux mieux !`;
    } else if (trainingsThisWeek >= 4) {
      body = `${trainingsThisWeek} séances cette semaine. Serie de ${streak} jours. Exceptionnel !`;
    } else {
      body = `${trainingsThisWeek} séances cette semaine. Serie de ${streak} jours. Bon travail !`;
    }

    await saveNotification(
      `Recap de ta semaine - ${rank.name}`,
      body,
      'gamification',
      { screen: 'gamification' }
    );
  } catch (error) {
    logger.error('[GamifMessages] Erreur recap hebdo:', error);
  }
}

// ============================================
// ALERTE SERIE EN DANGER
// Si l'heure > 19h et pas encore de log aujourd'hui
// ============================================

export async function triggerStreakWarning(
  streak: number,
  hasActivityToday: boolean,
): Promise<void> {
  try {
    if (hasActivityToday) return;
    if (streak < 2) return; // pas la peine si serie de 0 ou 1 jour

    const hour = new Date().getHours();
    if (hour < 19) return; // seulement a partir de 19h

    const alreadySent = await wasAlreadySentToday(KEY_STREAK_WARNING);
    if (alreadySent) return;

    await markSentToday(KEY_STREAK_WARNING);

    await saveNotification(
      `Serie de ${streak} jours en danger`,
      'Tu n\'as encore rien logue aujourd\'hui. Fais quelque chose, meme 5 minutes !',
      'streak',
      { screen: 'add-training' }
    );
  } catch (error) {
    logger.error('[GamifMessages] Erreur warning streak:', error);
  }
}

// ============================================
// GAIN XP DU JOUR
// Compare les XP actuels avec ceux d'hier
// "Tu as gagne +45 XP aujourd'hui !"
// ============================================

export async function triggerDailyXpGain(currentPoints: number): Promise<void> {
  try {
    const todayStr = getTodayStr();
    const raw = await AsyncStorage.getItem(KEY_XP_SNAPSHOT);

    if (raw) {
      const snapshot = JSON.parse(raw) as { date: string; points: number };
      // Si le snapshot est d'hier, calculer le gain
      if (snapshot.date !== todayStr) {
        const gained = currentPoints - snapshot.points;
        if (gained >= 20) {
          await saveNotification(
            `+${gained} XP hier`,
            'Beau travail ! Chaque point te rapproche du prochain rang.',
            'gamification',
            { screen: 'gamification' }
          );
        }
      }
    }

    // Mettre a jour le snapshot avec les XP d'aujourd'hui
    await AsyncStorage.setItem(KEY_XP_SNAPSHOT, JSON.stringify({
      date: todayStr,
      points: currentPoints,
    }));
  } catch (error) {
    logger.error('[GamifMessages] Erreur gain XP:', error);
  }
}

// ============================================
// BONUS XP WEEKEND
// +50% XP le samedi et dimanche (modifier le multiplicateur)
// ============================================

export function getWeekendXpMultiplier(): number {
  const day = new Date().getDay();
  return (day === 0 || day === 6) ? 1.5 : 1.0;
}

export async function triggerWeekendBoostMessage(): Promise<void> {
  try {
    const day = new Date().getDay();
    const isWeekend = day === 0 || day === 6;
    if (!isWeekend) return;

    const alreadySent = await wasAlreadySentToday(KEY_LOGIN_BONUS + '_weekend');
    if (alreadySent) return;

    await AsyncStorage.setItem(
      KEY_LOGIN_BONUS + '_weekend',
      new Date().toISOString().split('T')[0]
    );

    await saveNotification(
      'Boost weekend actif - x1.5 XP',
      'Profite du weekend ! Tous tes XP sont multiplies par 1.5 aujourd\'hui.',
      'gamification',
      { screen: 'gamification' }
    );
  } catch (error) {
    logger.error('[GamifMessages] Erreur boost weekend:', error);
  }
}

// ============================================
// POINT D'ENTREE PRINCIPAL
// Appeler depuis l'ecran d'accueil au montage
// ============================================

export async function runGamificationMessages(params: {
  totalPoints: number;
  streak: number;
  trainingsThisWeek: number;
  hasActivityToday: boolean;
}): Promise<{ loginBonusXp: number }> {
  const { totalPoints, streak, trainingsThisWeek, hasActivityToday } = params;

  const [loginBonusXp] = await Promise.all([
    triggerDailyLoginBonus(totalPoints),
    triggerRankProgressMessage(totalPoints),
    triggerWeeklyRecap(totalPoints, streak, trainingsThisWeek),
    triggerStreakWarning(streak, hasActivityToday),
    triggerDailyXpGain(totalPoints),
    triggerWeekendBoostMessage(),
  ]);

  return { loginBonusXp };
}
