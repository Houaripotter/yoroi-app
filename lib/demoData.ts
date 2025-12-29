import {
  openDatabase,
  saveProfile,
  addWeight,
  addClub,
  addTraining,
  addMeasurementRecord,
  addWeeklyPlanItem,
} from './database';

// ============================================
// YOROI - DONNEES DE DEMONSTRATION
// ============================================

// ═══════════════════════════════════════
// PROFIL UTILISATEUR DEMO
// ═══════════════════════════════════════
export const DEMO_PROFILE = {
  name: 'Houari',
  height_cm: 175,
  start_weight: 99.9,
  target_weight: 75,
  start_date: '2024-06-17',
  avatar_gender: 'homme' as const,
};

// ═══════════════════════════════════════
// CLUBS DE SPORT
// ═══════════════════════════════════════
export const DEMO_CLUBS = [
  {
    name: 'Gracie Barra',
    sport: 'jjb',
    color: '#EF4444',
    logo_uri: undefined,
  },
  {
    name: 'Basic Fit',
    sport: 'musculation',
    color: '#F97316',
    logo_uri: undefined,
  },
  {
    name: 'Running Solo',
    sport: 'running',
    color: '#22C55E',
    logo_uri: undefined,
  },
  {
    name: 'Five Padel',
    sport: 'padel',
    color: '#FBBF24',
    logo_uri: undefined,
  },
];

// ═══════════════════════════════════════
// GENERER HISTORIQUE DE POIDS (6 mois)
// ═══════════════════════════════════════
export const generateWeightHistory = () => {
  const weights = [];
  const startDate = new Date('2024-06-17');
  const startWeight = 99.9;
  const today = new Date();

  // Calculer le nombre de jours depuis le debut
  const totalDays = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  // Perte progressive avec variations realistes
  let currentWeight = startWeight;
  const targetCurrent = 86; // Poids actuel cible
  const dailyLoss = (startWeight - targetCurrent) / totalDays;

  for (let i = 0; i < totalDays; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);

    // Ne pas depasser aujourd'hui
    if (date > today) break;

    // Variation quotidienne realiste (-0.3 a +0.2 kg)
    const dailyVariation = (Math.random() - 0.4) * 0.5;
    currentWeight = currentWeight - dailyLoss + dailyVariation;

    // S'assurer qu'on ne descend pas trop
    currentWeight = Math.max(currentWeight, 85.5);

    // Ajouter une pesee (pas tous les jours, environ 80% des jours)
    if (Math.random() > 0.2) {
      const fatPercent = 25 + (currentWeight - 86) * 0.5 + Math.random() * 2;
      const musclePercent = 42 - (currentWeight - 86) * 0.3 + Math.random() * 1.5;

      weights.push({
        weight: Math.round(currentWeight * 10) / 10,
        fat_percent: Math.round(fatPercent * 10) / 10,
        muscle_percent: Math.round(musclePercent * 10) / 10,
        water_percent: Math.round((55 + Math.random() * 3) * 10) / 10,
        bone_mass: 3.2,
        visceral_fat: Math.round(8 + (currentWeight - 86) * 0.5),
        date: date.toISOString().split('T')[0],
        source: 'body_composition' as const,
      });
    }
  }

  return weights;
};

// ═══════════════════════════════════════
// GENERER MENSURATIONS (1x par semaine)
// ═══════════════════════════════════════
export const generateMeasurements = () => {
  const measurements = [];
  const startDate = new Date('2024-06-17');
  const today = new Date();

  // Calculer le nombre de semaines
  const totalWeeks = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

  // Valeurs de depart
  let chest = 108;
  let waist = 95;
  let hips = 105;
  let leftArm = 35;
  let rightArm = 35.5;
  let leftThigh = 62;
  let rightThigh = 62.5;
  let leftCalf = 38;
  let rightCalf = 38.5;
  let shoulders = 120;
  let neck = 40;

  for (let week = 0; week < totalWeeks; week++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + (week * 7));

    // Ne pas depasser aujourd'hui
    if (date > today) break;

    // Evolution progressive
    waist -= 0.25 + Math.random() * 0.1;
    chest -= 0.1 + Math.random() * 0.05;
    hips -= 0.15 + Math.random() * 0.05;
    leftArm += 0.05 + Math.random() * 0.02;
    rightArm += 0.05 + Math.random() * 0.02;

    measurements.push({
      chest: Math.round(chest * 10) / 10,
      waist: Math.round(waist * 10) / 10,
      hips: Math.round(hips * 10) / 10,
      left_arm: Math.round(leftArm * 10) / 10,
      right_arm: Math.round(rightArm * 10) / 10,
      left_thigh: Math.round(leftThigh * 10) / 10,
      right_thigh: Math.round(rightThigh * 10) / 10,
      left_calf: Math.round(leftCalf * 10) / 10,
      right_calf: Math.round(rightCalf * 10) / 10,
      shoulders: Math.round(shoulders * 10) / 10,
      neck: Math.round(neck * 10) / 10,
      date: date.toISOString().split('T')[0],
    });
  }

  return measurements;
};

// ═══════════════════════════════════════
// GENERER ENTRAINEMENTS (6 mois)
// ═══════════════════════════════════════
export const generateTrainings = (clubIds: number[]) => {
  const trainings = [];
  const startDate = new Date('2024-06-17');
  const today = new Date();

  // Calculer le nombre de semaines
  const totalWeeks = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24 * 7));

  for (let week = 0; week < totalWeeks; week++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (week * 7));

    // Pattern typique de la semaine :
    // Lundi: JJB
    // Mardi: Muscu
    // Mercredi: Repos
    // Jeudi: JJB
    // Vendredi: Muscu
    // Samedi: Running ou Padel
    // Dimanche: Repos

    const weekSchedule = [
      { dayOffset: 0, clubIndex: 0, sport: 'jjb', duration: 90, muscles: undefined },
      { dayOffset: 1, clubIndex: 1, sport: 'musculation', duration: 60, muscles: 'pectoraux,triceps' },
      // Mercredi repos
      { dayOffset: 3, clubIndex: 0, sport: 'jjb', duration: 90, muscles: undefined },
      { dayOffset: 4, clubIndex: 1, sport: 'musculation', duration: 60, muscles: 'dos,biceps' },
      { dayOffset: 5, clubIndex: Math.random() > 0.5 ? 2 : 3, sport: Math.random() > 0.5 ? 'running' : 'padel', duration: 45, muscles: undefined },
    ];

    for (const session of weekSchedule) {
      // Parfois on rate une session (20% de chance)
      if (Math.random() > 0.2) {
        const sessionDate = new Date(weekStart);
        sessionDate.setDate(sessionDate.getDate() + session.dayOffset);

        // Ne pas depasser aujourd'hui
        if (sessionDate > today) continue;

        trainings.push({
          club_id: clubIds[session.clubIndex] || undefined,
          sport: session.sport,
          date: sessionDate.toISOString().split('T')[0],
          duration_minutes: session.duration,
          muscles: session.muscles,
          notes: undefined,
        });
      }
    }
  }

  return trainings;
};

// ═══════════════════════════════════════
// PLANNING SEMAINE TYPE
// ═══════════════════════════════════════
export const generateWeeklyPlan = (clubIds: number[]) => {
  return [
    { day_of_week: 1, club_id: clubIds[0], sport: 'jjb', time: '19:00', duration_minutes: 90, is_rest_day: false },
    { day_of_week: 2, club_id: clubIds[1], sport: 'musculation', time: '12:00', duration_minutes: 60, muscles: 'pectoraux,triceps', is_rest_day: false },
    { day_of_week: 3, club_id: undefined, sport: 'repos', time: undefined, duration_minutes: undefined, is_rest_day: true },
    { day_of_week: 4, club_id: clubIds[0], sport: 'jjb', time: '19:00', duration_minutes: 90, is_rest_day: false },
    { day_of_week: 5, club_id: clubIds[1], sport: 'musculation', time: '12:00', duration_minutes: 60, muscles: 'dos,biceps', is_rest_day: false },
    { day_of_week: 6, club_id: clubIds[2], sport: 'running', time: '09:00', duration_minutes: 45, is_rest_day: false },
    { day_of_week: 7, club_id: undefined, sport: 'repos', time: undefined, duration_minutes: undefined, is_rest_day: true },
  ];
};

// ═══════════════════════════════════════
// FONCTION POUR INSERER LES DONNEES DEMO
// ═══════════════════════════════════════
export const insertDemoData = async (): Promise<void> => {
  console.log('⚔️ Fonction insertDemoData désactivée - Aucune donnée de test insérée');
  console.log('💡 Utilisez screenshotDemoData.ts pour charger les données de démo pour screenshots');
  // FONCTION DÉSACTIVÉE - Plus de données pré-enregistrées
  // Pour charger des données de démo, utilisez screenshotDemoData.ts
};

// ═══════════════════════════════════════
// FONCTION POUR EFFACER TOUTES LES DONNEES
// ═══════════════════════════════════════
export const clearAllData = async (): Promise<void> => {
  console.log('🗑️ Suppression de toutes les donnees...');

  try {
    const database = await openDatabase();

    await database.execAsync('DELETE FROM weights');
    await database.execAsync('DELETE FROM measurements');
    await database.execAsync('DELETE FROM trainings');
    await database.execAsync('DELETE FROM weekly_plan');
    await database.execAsync('DELETE FROM clubs');
    await database.execAsync('DELETE FROM photos');
    await database.execAsync('DELETE FROM achievements');
    await database.execAsync('DELETE FROM profile');

    console.log('✅ Toutes les donnees ont ete supprimees');
  } catch (error) {
    console.error('❌ Erreur suppression:', error);
    throw error;
  }
};

// ═══════════════════════════════════════
// STATISTIQUES CALCULEES
// ═══════════════════════════════════════
export const calculateStats = (weights: { weight: number; fat_percent?: number; muscle_percent?: number; water_percent?: number }[]) => {
  if (weights.length === 0) return null;

  const latest = weights[weights.length - 1];
  const first = weights[0];
  const totalLost = first.weight - latest.weight;

  // Moyenne sur 30 jours
  const last30 = weights.slice(-30);
  const avg30 = last30.reduce((sum, w) => sum + w.weight, 0) / last30.length;

  // Changement sur 7 jours
  const last7 = weights.slice(-7);
  const change7 = last7.length >= 2 ? last7[last7.length - 1].weight - last7[0].weight : 0;

  return {
    currentWeight: latest.weight,
    totalLost: Math.round(totalLost * 10) / 10,
    average30d: Math.round(avg30 * 10) / 10,
    change7d: Math.round(change7 * 10) / 10,
    totalMeasures: weights.length,
    fatPercent: latest.fat_percent,
    musclePercent: latest.muscle_percent,
    waterPercent: latest.water_percent,
  };
};

export default {
  insertDemoData,
  clearAllData,
  calculateStats,
  DEMO_PROFILE,
  DEMO_CLUBS,
};
