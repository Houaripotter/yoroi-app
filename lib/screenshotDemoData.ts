// ============================================
// YOROI - MODE SCREENSHOT POUR APP STORE
// ============================================
// Données de démonstration complètes et attrayantes pour les captures d'écran

import AsyncStorage from '@react-native-async-storage/async-storage';
import { initDatabase, addWeight, addMeasurementRecord, addTraining, resetDatabase } from './database';
import { format, subDays } from 'date-fns';

// ============================================
// PROFIL DE DÉMONSTRATION
// ============================================
const DEMO_PROFILE = {
  name: 'Thomas Silva',
  height_cm: 175,
  start_weight: 85.0,
  target_weight: 77.0,
  sport: 'jjb', // Jiu-Jitsu Brésilien
  mode: 'competitor',
  startDate: subDays(new Date(), 90), // Il y a 3 mois
};

// ============================================
// GÉNÉRATION DES PESÉES (3 mois)
// ============================================
const generateWeights = () => {
  const weights = [];
  const days = 90;
  const startWeight = 85.0;
  const endWeight = 78.2;
  const totalLoss = startWeight - endWeight; // 6.8kg perdu sur 3 mois

  for (let i = 0; i <= days; i++) {
    const date = subDays(new Date(), days - i);

    // Progression réaliste : belle courbe descendante
    let progress;
    if (i < 30) {
      // Mois 1 : perte initiale rapide (eau + graisse)
      progress = (i / 30) * 0.45; // 45% de la perte totale
    } else if (i < 60) {
      // Mois 2 : progression steady
      progress = 0.45 + ((i - 30) / 30) * 0.35; // +35%
    } else {
      // Mois 3 : derniers kilos (plus difficiles mais constants)
      progress = 0.80 + ((i - 60) / 30) * 0.20; // +20%
    }

    const baseWeight = startWeight - (totalLoss * progress);

    // Petites variations naturelles (±0.3kg max)
    const dailyVariation = (Math.sin(i * 0.3) * 0.15) + (Math.cos(i * 0.2) * 0.1);
    const weight = baseWeight + dailyVariation;

    // Enregistrer 4-5 fois par semaine pour de beaux graphiques
    if (i % 2 === 0 || i % 3 === 1) {
      weights.push({
        date: format(date, 'yyyy-MM-dd'),
        weight: Math.round(weight * 10) / 10,
        bodyFat: Math.round((20 - (progress * 4)) * 10) / 10, // 20% → 16% (belle composition)
        muscleMass: Math.round((40 + (progress * 3)) * 10) / 10, // 40% → 43% (gain muscle)
        water: Math.round((54 + (progress * 2)) * 10) / 10, // 54% → 56%
      });
    }
  }

  return weights;
};

// ============================================
// GÉNÉRATION DES MENSURATIONS (3 mois - 7 zones)
// ============================================
const generateMeasurements = () => {
  const measurements = [];
  const months = 3;

  for (let i = 0; i <= months; i++) {
    const date = subDays(new Date(), (months - i) * 30);
    const progress = i / months;

    measurements.push({
      date: format(date, 'yyyy-MM-dd'),
      waist: Math.round((94 - progress * 10) * 10) / 10, // 94cm → 84cm (-10cm taille!)
      chest: Math.round((102 + progress * 3) * 10) / 10, // 102cm → 105cm (+3cm pecs!)
      hips: Math.round((100 - progress * 4) * 10) / 10, // 100cm → 96cm (-4cm)
      left_thigh: Math.round((58 - progress * 2) * 10) / 10, // 58cm → 56cm (-2cm)
      right_thigh: Math.round((58 - progress * 2) * 10) / 10, // 58cm → 56cm (-2cm)
      left_arm: Math.round((35 + progress * 2.5) * 10) / 10, // 35cm → 37.5cm (+2.5cm biceps!)
      right_arm: Math.round((35 + progress * 2.5) * 10) / 10, // 35cm → 37.5cm (+2.5cm biceps!)
      left_calf: Math.round((38.5 + progress * 0.5) * 10) / 10, // 38.5cm → 39cm
      right_calf: Math.round((38.5 + progress * 0.5) * 10) / 10, // 38.5cm → 39cm
      neck: Math.round((39.5 - progress * 1.5) * 10) / 10, // 39.5cm → 38cm (-1.5cm)
    });
  }

  return measurements;
};

// ============================================
// GÉNÉRATION DES ENTRAÎNEMENTS (3 mois)
// ============================================
const generateTrainings = () => {
  const trainings = [];
  const days = 90;

  const sessionTypes = {
    jjb: [
      { duration: 90, rpe: 8, notes: 'Gracie Barra - Passage de garde et contrôles' },
      { duration: 90, rpe: 7, notes: 'Gracie Barra - Soumissions bras et étranglements' },
      { duration: 120, rpe: 9, notes: 'Gracie Barra - Open Mat (sparring intense)' },
      { duration: 90, rpe: 7, notes: 'Gracie Barra - Techniques de balayages' },
      { duration: 90, rpe: 8, notes: 'Gracie Barra - Travail depuis la garde fermée' },
    ],
    musculation: [
      { duration: 60, rpe: 8, notes: 'Basic Fit - Pecs/Triceps (développé couché 5x5)' },
      { duration: 65, rpe: 8, notes: 'Basic Fit - Dos/Biceps (tractions + rowing)' },
      { duration: 50, rpe: 9, notes: 'Basic Fit - Jambes (squat 5x5 intense)' },
      { duration: 45, rpe: 7, notes: 'Basic Fit - Épaules/Abdos' },
      { duration: 55, rpe: 7, notes: 'Basic Fit - Full body (circuit training)' },
    ],
  };

  // Pattern : 5 séances par semaine (lun, mar, mer, ven, sam)
  for (let i = 0; i <= days; i++) {
    const date = subDays(new Date(), days - i);
    const dayOfWeek = date.getDay();

    // Lundi, Mercredi, Samedi = JJB à Gracie Barra
    // Mardi, Vendredi = Musculation à Basic Fit
    if ([1, 2, 3, 5, 6].includes(dayOfWeek)) {
      const sportType = [1, 3, 6].includes(dayOfWeek) ? 'jjb' : 'musculation';
      const sessions = sessionTypes[sportType];
      const session = sessions[Math.floor(Math.random() * sessions.length)];

      trainings.push({
        date: format(date, 'yyyy-MM-dd'),
        type: sportType,
        duration: session.duration,
        intensity: session.rpe,
        notes: session.notes,
      });

      // Samedi matin : parfois double séance (JJB + muscu light)
      if (dayOfWeek === 6 && Math.random() < 0.2) {
        trainings.push({
          date: format(date, 'yyyy-MM-dd'),
          type: 'musculation',
          duration: 40,
          intensity: 6,
          notes: 'Basic Fit - Cardio léger + étirements (récup)',
        });
      }
    }
  }

  return trainings;
};

// ============================================
// GÉNÉRATION DES DONNÉES DE SOMMEIL
// ============================================
const generateSleepData = () => {
  const sleepEntries = [];
  const days = 30; // Dernier mois

  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - i);
    const dayOfWeek = date.getDay();

    // Sommeil plus long le weekend, plus court en semaine
    let baseDuration;
    let bedTime;
    let wakeTime;

    if ([0, 6].includes(dayOfWeek)) {
      // Weekend : 8h-9h de sommeil
      baseDuration = 8.5 * 60; // 8h30
      bedTime = '23:30';
      wakeTime = '08:00';
    } else {
      // Semaine : 7h-8h de sommeil
      baseDuration = 7.5 * 60; // 7h30
      bedTime = '23:00';
      wakeTime = '06:30';
    }

    // Petites variations naturelles
    const variation = (Math.sin(i * 0.4) * 30) + (Math.random() - 0.5) * 30; // ±30-60min
    const duration = Math.max(420, Math.round(baseDuration + variation)); // Minimum 7h

    // Qualité : 4-5 étoiles (bon sommeil régulier)
    const quality = duration > 480 ? 5 : (duration > 450 ? 4 : 4);

    sleepEntries.push({
      id: `sleep_${date.getTime()}`,
      date: format(date, 'yyyy-MM-dd'),
      bedTime,
      wakeTime,
      duration,
      quality,
      notes: quality === 5 ? 'Sommeil récupérateur' : '',
    });
  }

  return sleepEntries;
};

// ============================================
// GÉNÉRATION DES DONNÉES D'HYDRATATION
// ============================================
const generateHydrationData = async () => {
  const days = 30;

  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - i);
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayOfWeek = date.getDay();

    // Hydratation basée sur les jours d'entraînement
    let baseHydration;

    if ([1, 2, 3, 5, 6].includes(dayOfWeek)) {
      // Jours d'entraînement : 2.8L - 3.5L
      baseHydration = 2800 + Math.random() * 700;
    } else {
      // Repos : 2.2L - 2.8L
      baseHydration = 2200 + Math.random() * 600;
    }

    // Petites variations pour réalisme
    const variation = (Math.sin(i * 0.5) * 200);
    const finalHydration = Math.round(baseHydration + variation);

    await AsyncStorage.setItem(`hydration_${dateStr}`, finalHydration.toString());
  }
};

// ============================================
// CLUBS DE SPORT
// ============================================
const generateClubs = () => {
  return [
    {
      id: '1',
      name: 'Gracie Barra Paris',
      sport: 'Jiu-Jitsu Brésilien',
      address: '15 rue de Vaugirard, 75015 Paris',
      phone: '+33 1 45 67 89 01',
      website: 'www.graciebarra-paris.fr',
      logoUrl: 'graciebarra',
      color: '#E31E24',
      joinDate: '2024-10-01',
      rank: 'Ceinture Bleue',
      instructor: 'Prof. Carlos Santos',
    },
    {
      id: '2',
      name: 'Basic-Fit Montparnasse',
      sport: 'Musculation & Fitness',
      address: '42 avenue du Maine, 75014 Paris',
      phone: '+33 1 43 21 45 67',
      website: 'www.basic-fit.com',
      logoUrl: 'basicfit',
      color: '#FF6B00',
      joinDate: '2024-10-01',
      membershipType: 'Premium',
      access: '24/7',
    },
  ];
};

// ============================================
// PLANNING HEBDOMADAIRE
// ============================================
const generateWeeklySchedule = () => {
  return {
    monday: [
      { time: '19:00', activity: 'JJB - Techniques Gi (passage de garde)', club: 'Gracie Barra Paris', duration: 90, sport: 'jjb', instructor: 'Prof. Carlos' }
    ],
    tuesday: [
      { time: '12:30', activity: 'Musculation - Push (Pecs/Triceps/Épaules)', club: 'Basic-Fit Montparnasse', duration: 60, sport: 'musculation', intensity: 'Haute' }
    ],
    wednesday: [
      { time: '19:00', activity: 'JJB - Soumissions et étranglements', club: 'Gracie Barra Paris', duration: 90, sport: 'jjb', instructor: 'Prof. Carlos' }
    ],
    thursday: [], // Repos actif (stretching maison)
    friday: [
      { time: '18:00', activity: 'Musculation - Pull (Dos/Biceps)', club: 'Basic-Fit Montparnasse', duration: 65, sport: 'musculation', intensity: 'Haute' }
    ],
    saturday: [
      { time: '10:00', activity: 'JJB - Open Mat (sparring libre)', club: 'Gracie Barra Paris', duration: 120, sport: 'jjb', instructor: 'Open Mat' },
      { time: '14:00', activity: 'Musculation - Jambes (Squat/Soulevé)', club: 'Basic-Fit Montparnasse', duration: 50, sport: 'musculation', intensity: 'Très haute' }
    ],
    sunday: [], // Repos complet
  };
};

// ============================================
// BADGES DÉBLOQUÉS (3 mois de progression)
// ============================================
const generateUnlockedBadges = () => {
  return [
    'first_weight',
    'first_week',
    'first_month',
    'three_months',
    'streak_7',
    'streak_14',
    'streak_30',
    'streak_60',
    'weight_lost_3kg',
    'weight_lost_5kg',
    'trainings_10',
    'trainings_25',
    'trainings_50',
    'trainings_75',
    'perfect_week',
    'perfect_month',
    'early_riser',
    'night_owl',
    'warrior',
    'consistent',
    'dedicated',
    'hydration_master',
    'sleep_champion',
    'transformation_started',
  ];
};

// ============================================
// GÉNÉRATION DES BLESSURES/INFIRMERIE
// ============================================
const generateInjuries = () => {
  return [
    {
      id: '1',
      date: format(subDays(new Date(), 45), 'yyyy-MM-dd'),
      type: 'Contusion',
      location: 'Côte gauche',
      severity: 'Légère',
      origin: 'Gracie Barra - Sparring',
      status: 'Guérie',
      notes: 'Coup de coude pendant le sparring. Glace appliquée.',
      recoveryDays: 5,
    },
    {
      id: '2',
      date: format(subDays(new Date(), 20), 'yyyy-MM-dd'),
      type: 'Douleur musculaire',
      location: 'Épaule droite',
      severity: 'Légère',
      origin: 'Basic Fit - Développé militaire',
      status: 'En rééducation',
      notes: 'Tendinite légère. Repos + étirements. Éviter mouvements au-dessus de la tête.',
      recoveryDays: 14,
    },
    {
      id: '3',
      date: format(subDays(new Date(), 8), 'yyyy-MM-dd'),
      type: 'Ampoule',
      location: 'Main droite',
      severity: 'Mineure',
      origin: 'Gracie Barra - Travail au gi',
      status: 'Guérie',
      notes: 'Ampoule due aux grips répétés. Bandage + pansement.',
      recoveryDays: 3,
    },
  ];
};

// ============================================
// GÉNÉRATION DE LA CHARGE D'ENTRAÎNEMENT
// ============================================
const generateTrainingLoad = () => {
  const weeks = [];
  const totalWeeks = 12; // 3 mois

  for (let i = 0; i < totalWeeks; i++) {
    const weekDate = subDays(new Date(), (totalWeeks - i - 1) * 7);

    // Charge progressive : commence à 250, monte à 400
    const baseLoad = 250 + (i * 12);
    const variation = (Math.sin(i * 0.5) * 30) + (Math.random() - 0.5) * 20;
    const load = Math.round(baseLoad + variation);

    weeks.push({
      weekStart: format(weekDate, 'yyyy-MM-dd'),
      load,
      sessions: i < 4 ? 4 : 5, // 4 séances au début, puis 5
      totalDuration: i < 4 ? 240 : 305, // minutes
      avgIntensity: 7.5 + (i * 0.08), // RPE moyen qui augmente
    });
  }

  return weeks;
};

// ============================================
// GÉNÉRATION DES DONNÉES DE CHARGE (BATTERIE)
// ============================================
const generateBatteryData = () => {
  const days = 7; // Dernière semaine
  const batteryData = [];

  for (let i = 0; i < days; i++) {
    const date = subDays(new Date(), days - i - 1);
    const dayOfWeek = date.getDay();

    // Batterie plus haute les jours de repos
    let batteryLevel;
    if ([0, 4].includes(dayOfWeek)) {
      // Dimanche et jeudi (repos)
      batteryLevel = 85 + Math.random() * 10; // 85-95%
    } else if ([1, 3, 6].includes(dayOfWeek)) {
      // Jours JJB (intense)
      batteryLevel = 60 + Math.random() * 15; // 60-75%
    } else {
      // Jours musculation
      batteryLevel = 70 + Math.random() * 10; // 70-80%
    }

    batteryData.push({
      date: format(date, 'yyyy-MM-dd'),
      level: Math.round(batteryLevel),
      sleep: 7.5,
      nutrition: 85,
      recovery: 80,
      stress: 25,
    });
  }

  return batteryData;
};

// ============================================
// FONCTION PRINCIPALE : CHARGER LES DONNÉES
// ============================================
export const loadScreenshotDemoData = async (): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('🎬 Chargement des données de démonstration pour screenshots...');

    // 1. Initialiser la base de données
    await initDatabase();

    // 2. Sauvegarder le profil
    await AsyncStorage.setItem('@yoroi_user_name', DEMO_PROFILE.name);
    await AsyncStorage.setItem('@yoroi_user_height', DEMO_PROFILE.height_cm.toString());
    await AsyncStorage.setItem('@yoroi_start_weight', DEMO_PROFILE.start_weight.toString());
    await AsyncStorage.setItem('@yoroi_target_weight', DEMO_PROFILE.target_weight.toString());
    await AsyncStorage.setItem('@yoroi_user_sport', DEMO_PROFILE.sport);
    await AsyncStorage.setItem('@yoroi_user_mode', DEMO_PROFILE.mode);

    // 3. Générer et insérer les pesées
    console.log('📊 Génération des pesées...');
    const weights = generateWeights();
    for (const w of weights) {
      await addWeight({
        weight: w.weight,
        date: w.date,
        fat_percent: w.bodyFat,
        muscle_percent: w.muscleMass,
        water_percent: w.water,
        source: 'manual',
      });
    }
    console.log(`✅ ${weights.length} pesées ajoutées`);

    // 4. Générer et insérer les mensurations
    console.log('📏 Génération des mensurations...');
    const measurements = generateMeasurements();
    for (const m of measurements) {
      await addMeasurementRecord({
        date: m.date,
        waist: m.waist,
        chest: m.chest,
        hips: m.hips,
        left_thigh: m.left_thigh,
        right_thigh: m.right_thigh,
        left_arm: m.left_arm,
        right_arm: m.right_arm,
        left_calf: m.left_calf,
        right_calf: m.right_calf,
        neck: m.neck,
      });
    }
    console.log(`✅ ${measurements.length} mensurations ajoutées`);

    // 5. Générer et insérer les entraînements
    console.log('🥋 Génération des entraînements...');
    const trainings = generateTrainings();
    for (const t of trainings) {
      await addTraining({
        sport: t.type,
        duration_minutes: t.duration,
        date: t.date,
        technique_rating: t.intensity,
        notes: t.notes,
      });
    }
    console.log(`✅ ${trainings.length} entraînements ajoutés`);

    // 6. Générer les données de sommeil
    console.log('😴 Génération des données de sommeil...');
    const sleepEntries = generateSleepData();
    await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify(sleepEntries));
    await AsyncStorage.setItem('@yoroi_sleep_goal', '480'); // 8h
    console.log(`✅ ${sleepEntries.length} nuits de sommeil ajoutées`);

    // 7. Générer l'hydratation
    console.log('💧 Génération de l\'hydratation...');
    await generateHydrationData();
    await AsyncStorage.setItem('@yoroi_hydration_goal', '2500'); // 2.5L
    console.log('✅ Données d\'hydratation ajoutées');

    // 8. Sauvegarder les clubs
    console.log('🏢 Génération des clubs...');
    const clubs = generateClubs();
    await AsyncStorage.setItem('@yoroi_user_clubs', JSON.stringify(clubs));
    console.log(`✅ ${clubs.length} clubs ajoutés`);

    // 9. Sauvegarder le planning
    console.log('📅 Génération du planning...');
    const schedule = generateWeeklySchedule();
    await AsyncStorage.setItem('@yoroi_weekly_schedule', JSON.stringify(schedule));
    console.log('✅ Planning hebdomadaire ajouté');

    // 10. Débloquer les badges
    console.log('🏆 Déblocage des badges...');
    const badges = generateUnlockedBadges();
    await AsyncStorage.setItem('@yoroi_unlocked_badges', JSON.stringify(badges));
    console.log(`✅ ${badges.length} badges débloqués`);

    // 11. Sauvegarder les blessures/infirmerie
    console.log('🏥 Génération des blessures...');
    const injuries = generateInjuries();
    await AsyncStorage.setItem('@yoroi_injuries', JSON.stringify(injuries));
    console.log(`✅ ${injuries.length} blessures ajoutées`);

    // 12. Sauvegarder la charge d'entraînement
    console.log('📊 Génération de la charge d\'entraînement...');
    const trainingLoad = generateTrainingLoad();
    await AsyncStorage.setItem('@yoroi_training_load', JSON.stringify(trainingLoad));
    console.log(`✅ ${trainingLoad.length} semaines de charge ajoutées`);

    // 13. Sauvegarder les données de batterie
    console.log('🔋 Génération des données de batterie...');
    const batteryData = generateBatteryData();
    await AsyncStorage.setItem('@yoroi_battery_history', JSON.stringify(batteryData));
    console.log(`✅ ${batteryData.length} jours de batterie ajoutés`);

    // 14. Définir des objectifs et paramètres
    await AsyncStorage.setItem('@yoroi_steps_goal', '8000');
    await AsyncStorage.setItem('@yoroi_calories_goal', '400');
    await AsyncStorage.setItem('@yoroi_current_level', '12');
    await AsyncStorage.setItem('@yoroi_total_xp', '2850');
    await AsyncStorage.setItem('@yoroi_current_streak', '63');
    await AsyncStorage.setItem('@yoroi_best_streak', '63');

    console.log('🎉 Mode Screenshot activé avec succès !');
    console.log('📸 Prêt pour les captures d\'écran App Store');
    console.log('');
    console.log('📊 Résumé des données générées:');
    console.log(`   • Profil: Thomas Silva (175cm, 85kg → 78.2kg)`);
    console.log(`   • Pesées: ${weights.length} entrées`);
    console.log(`   • Entraînements: ${trainings.length} sessions`);
    console.log(`   • Clubs: Gracie Barra Paris + Basic-Fit Montparnasse`);
    console.log(`   • Badges: ${badges.length} débloqués`);
    console.log(`   • Streak: 63 jours 🔥`);
    console.log(`   • Niveau: 12`);

    return {
      success: true,
    };
  } catch (error) {
    console.error('❌ Erreur lors du chargement des données de démonstration:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Erreur inconnue',
    };
  }
};

// ============================================
// EFFACER LES DONNÉES DE DÉMONSTRATION
// ============================================
export const clearScreenshotDemoData = async (): Promise<void> => {
  try {
    console.log('🧹 Nettoyage des données de démonstration...');

    // Réinitialiser complètement la base de données
    await resetDatabase();

    // Effacer toutes les clés AsyncStorage liées à Yoroi
    const keys = await AsyncStorage.getAllKeys();
    const yoroiKeys = keys.filter(key => key.startsWith('@yoroi_') || key.startsWith('hydration_') || key.startsWith('sleep_'));
    await AsyncStorage.multiRemove(yoroiKeys);

    console.log('✅ Données de démonstration effacées');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  }
};
