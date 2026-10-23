// ============================================
// UNIFIED WATCH SYNC SERVICE
// Service de haut niveau qui pousse des données enrichies vers
// Apple Watch (via WatchConnectivity) ET Android Wear (via DataClient)
// en une seule API. Appelé automatiquement après chaque modif importante.
// ============================================

import { Platform, DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from './security/logger';
import WearSyncService from './wearSyncService';

export interface EnrichedWatchPayload {
  // Profile
  userName?: string;
  level?: number;
  rank?: string;
  avatarId?: string;

  // Activité
  streakDays?: number;
  trainingsThisWeek?: number;
  trainingsThisMonth?: number;
  trainingsThisYear?: number;
  yearlyGoal?: number;

  // Dernière séance
  lastTrainingDate?: string;   // ISO
  lastTrainingSport?: string;
  lastTrainingRating?: number; // 1-10
  lastTrainingMood?: string;   // fire / flow / focus / etc.

  // Corps
  currentWeight?: number;
  targetWeight?: number;
  weightProgress?: number; // %
  currentBodyFat?: number;

  // Hydratation
  hydrationCurrent?: number;
  hydrationGoal?: number;

  // Sommeil
  sleepDurationMin?: number;
  sleepQuality?: number;

  // Combat / fighter
  submissionsGivenThisMonth?: number;
  submissionsTakenThisMonth?: number;
  combatWinsThisMonth?: number;
  combatLossesThisMonth?: number;

  // Sparring de la semaine (pour complication Apple Watch Sparring)
  sparringRoundsWeek?: number;
  sparringRoundsGoal?: number;
  sparringWinRate?: number; // 0-100
  sparringWinsWeek?: number;
  sparringLossesWeek?: number;

  // Prochaine compétition (pour complication Apple Watch countdown)
  nextCompetitionName?: string;
  nextCompetitionDate?: string; // ISO date string

  // Age (calcul zones FC sur complication FC Zone)
  userAge?: number;

  // Charge d'entraînement hebdo (complication Training Load)
  trainingLoadWeek?: number; // points (somme duration × RPE / 10 sur la semaine)
  trainingLoadTarget?: number; // target (défaut 1000)
}

/**
 * Pousse les données enrichies vers toutes les montres connectées.
 * À appeler après : nouvelle séance, nouvelle pesée, changement de profil, etc.
 */
export async function pushEnrichedToWatches(payload: EnrichedWatchPayload): Promise<void> {
  const ts = Date.now();
  logger.info('[UnifiedWatchSync] Push vers montres:', Object.keys(payload).join(', '));

  // Apple Watch (iOS) : depuis le 13 octobre 2026, lib/v2/montre (contrat v1) s'en charge seul.
  // Ce service ne sert plus qu'a Wear OS.
  if (Platform.OS === 'ios') return;

  // Android Wear (Android)
  if (Platform.OS === 'android') {
    try {
      // Le module WearSyncModule accepte un dict flat, on envoie tout d'un coup
      const flatData: Record<string, string | number | boolean> = { type: 'enriched', ts };
      for (const [key, value] of Object.entries(payload)) {
        if (value !== undefined && value !== null) {
          flatData[key] = value as any;
        }
      }
      await WearSyncService.sendToWatch(flatData);
    } catch (e) {
      logger.warn('[UnifiedWatchSync] Erreur Wear OS:', e);
    }
  }
}

/**
 * Persiste les données enrichies en cache pour que `appleWatchService.prepareWatchData`
 * puisse les lire lors du prochain `syncToWatch()`.
 */
async function persistWatchCache(payload: EnrichedWatchPayload): Promise<void> {
  try {
    const existing = await AsyncStorage.getItem('@yoroi_watch_cache');
    const current = existing ? JSON.parse(existing) : {};
    const updated = { ...current, ...payload, updatedAt: new Date().toISOString() };
    await AsyncStorage.setItem('@yoroi_watch_cache', JSON.stringify(updated));
  } catch (e) {
    logger.warn('[UnifiedWatchSync] Erreur persist cache:', e);
  }
}

/**
 * Calcule les données enrichies depuis la base et les pousse aux watches.
 * Lecture batch pour performance.
 */
export async function syncAllWatchesEnriched(): Promise<void> {
  try {
    const [
      { getProfile, getTrainings, getWeights, getLatestWeight },
      { refreshWatchIdentity },
      { getEspace },
    ] = await Promise.all([
      import('./database'),
      import('./v2/watchIdentity'),
      import('./v2/espace'),
    ]);

    // Rang d'armure actuel (v2) et personnage choisi ; recrit aussi les anciennes cles lues par la montre
    const [profile, trainings, weights, latestWeight, armure, espace] = await Promise.all([
      getProfile().catch(() => null),
      getTrainings().catch(() => []),
      getWeights().catch(() => []),
      getLatestWeight().catch(() => null),
      refreshWatchIdentity().catch(() => null),
      getEspace().catch(() => null),
    ]);
    // niveau 1 a 5, un par rang d'armure (meme valeur que @yoroi_level)
    const watchLevel = (armure?.rank.index ?? 0) + 1;

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);

    const trainingsThisWeek = trainings.filter(t => new Date(t.date) >= weekAgo).length;
    const trainingsThisMonth = trainings.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    }).length;
    const trainingsThisYear = trainings.filter(t => new Date(t.date).getFullYear() === currentYear).length;

    const lastTraining = trainings[0]; // trié DESC
    const rank = { name: armure?.rank.name ?? 'Ashigaru' };

    // Streak : nombre de jours consécutifs avec une activité
    const streakDays = computeStreak(trainings.map(t => t.date));

    const objectiveStr = await AsyncStorage.getItem('@yoroi_yearly_objective').catch(() => null);
    const yearlyGoal = objectiveStr ? parseInt(objectiveStr, 10) : 365;

    // Combat stats du mois
    const thisMonthTrainings = trainings.filter(t => {
      const d = new Date(t.date);
      return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
    });
    let subsGiven = 0, subsTaken = 0, wins = 0, losses = 0;
    for (const t of thisMonthTrainings) {
      if (!Array.isArray(t.combat_rounds)) continue;
      for (const r of t.combat_rounds) {
        subsGiven += r.submissionsGiven ?? 0;
        subsTaken += r.submissionsTaken ?? 0;
        if (r.result === 'win') wins++;
        else if (r.result === 'loss') losses++;
      }
    }

    // Sparring de la semaine (lundi → dimanche)
    const weekStart = new Date(now);
    const day = weekStart.getDay(); // 0 dim, 1 lun…
    const diff = day === 0 ? -6 : 1 - day;
    weekStart.setDate(weekStart.getDate() + diff);
    weekStart.setHours(0, 0, 0, 0);
    let sparringRoundsWeek = 0, sparringWinsWeek = 0, sparringLossesWeek = 0;
    for (const t of trainings) {
      if (new Date(t.date) < weekStart) continue;
      if (!Array.isArray(t.combat_rounds)) continue;
      for (const r of t.combat_rounds) {
        sparringRoundsWeek++;
        if (r.result === 'win') sparringWinsWeek++;
        else if (r.result === 'loss') sparringLossesWeek++;
      }
    }
    const totalCounted = sparringWinsWeek + sparringLossesWeek;
    const sparringWinRate = totalCounted > 0
      ? Math.round((sparringWinsWeek / totalCounted) * 100)
      : 0;
    const sparringGoalStr = await AsyncStorage.getItem('@sparring_weekly_goal').catch(() => null);
    const sparringRoundsGoal = sparringGoalStr ? parseInt(sparringGoalStr, 10) : 30;

    // Prochaine compétition (date >= aujourd'hui)
    let nextCompetitionName: string | undefined;
    let nextCompetitionDate: string | undefined;
    try {
      const { getCompetitions } = await import('./database');
      const competitions = await getCompetitions();
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const upcoming = competitions
        .filter((c: any) => {
          try { return new Date(c.date) >= today; } catch { return false; }
        })
        .sort((a: any, b: any) => a.date.localeCompare(b.date));
      if (upcoming.length > 0) {
        nextCompetitionName = upcoming[0].nom;
        nextCompetitionDate = new Date(upcoming[0].date).toISOString();
      }
    } catch { /* competitions non disponible */ }

    // Age utilisateur (pour zones FC sur complication)
    const userAge = profile?.age && profile.age > 0 ? profile.age : undefined;

    // Charge d'entraînement hebdo : somme (duration_min × RPE) / 10 sur 7 derniers jours
    // Convention inspirée Garmin : 1000 points = semaine soutenue normale
    let trainingLoadWeek = 0;
    for (const t of trainings) {
      try {
        if (new Date(t.date) < weekAgo) continue;
        const dur = t.duration_minutes || 0;
        const rpe = t.intensity || 5; // RPE par défaut 5 si pas renseigné
        trainingLoadWeek += Math.round((dur * rpe) / 10);
      } catch {}
    }
    const trainingLoadTarget = 1000;

    // Progression poids
    let weightProgress = 0;
    if (profile?.target_weight && latestWeight?.weight && weights.length > 1) {
      const start = weights[weights.length - 1].weight;
      const current = latestWeight.weight;
      const target = profile.target_weight;
      const totalDelta = target - start;
      const currentDelta = current - start;
      if (totalDelta !== 0) {
        weightProgress = Math.max(0, Math.min(100, Math.round((currentDelta / totalDelta) * 100)));
      }
    }

    const payload: EnrichedWatchPayload = {
      userName: profile?.name,
      level: watchLevel,
      rank: rank.name,
      avatarId: espace?.personnage,
      streakDays,
      trainingsThisWeek,
      trainingsThisMonth,
      trainingsThisYear,
      yearlyGoal,
      lastTrainingDate: lastTraining?.date,
      lastTrainingSport: lastTraining?.sport,
      // la note se saisit maintenant sur 5, la montre l'affiche sur 10
      lastTrainingRating: (() => {
        const r = Number((lastTraining as any)?.session_rating);
        return Number.isFinite(r) && r > 0 ? (r <= 5 ? r * 2 : r) : undefined;
      })(),
      lastTrainingMood: (lastTraining as any)?.session_mood,
      currentWeight: latestWeight?.weight,
      targetWeight: profile?.target_weight,
      weightProgress,
      currentBodyFat: latestWeight?.fat_percent,
      submissionsGivenThisMonth: subsGiven,
      submissionsTakenThisMonth: subsTaken,
      combatWinsThisMonth: wins,
      combatLossesThisMonth: losses,
      // Sparring semaine (complication Apple Watch)
      sparringRoundsWeek,
      sparringRoundsGoal,
      sparringWinRate,
      sparringWinsWeek,
      sparringLossesWeek,
      // Prochaine compétition (complication Apple Watch)
      nextCompetitionName,
      nextCompetitionDate,
      // Age (pour zones FC)
      userAge,
      // Charge d'entraînement hebdo (complication)
      trainingLoadWeek,
      trainingLoadTarget,
    };

    await pushEnrichedToWatches(payload);
  } catch (e) {
    logger.error('[UnifiedWatchSync] Erreur sync enriched:', e);
  }
}

/**
 * Calcule le nombre de jours consécutifs d'activité à partir d'aujourd'hui.
 */
function computeStreak(dates: string[]): number {
  if (dates.length === 0) return 0;
  // Set des jours d'entraînement (YYYY-MM-DD)
  const days = new Set(dates.map(d => d.split('T')[0]));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(0, 0, 0, 0);
  for (let i = 0; i < 365; i++) {
    // Date locale (toISOString décalait d'un jour en France)
    const key = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`;
    if (days.has(key)) {
      streak++;
    } else if (i > 0) {
      // Le jour actuel peut être "vide" (pas encore entraîné aujourd'hui)
      // mais on break dès qu'on trouve un trou après le jour 1
      break;
    }
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

/**
 * Initialise les triggers auto : quand des events "data changed" sont émis,
 * on sync les montres en arrière-plan (debounced).
 */
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function initAutoWatchSync(): void {
  const trigger = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      syncAllWatchesEnriched().catch(() => {});
    }, 3000); // debounce 3s pour grouper plusieurs changements
  };

  DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', trigger);
  DeviceEventEmitter.addListener('YOROI_AUTO_BACKUP_DONE', trigger);
  DeviceEventEmitter.addListener('YOROI_PARTNERS_CHANGED', trigger);
}
