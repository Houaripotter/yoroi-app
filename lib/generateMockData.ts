import { Measurement } from './storage';
import { addMeasurement, deleteAllMeasurements } from './storage';
import logger from '@/lib/security/logger';

/**
 * Génère des données fictives pour 6 mois (180 jours)
 * FONCTION DÉSACTIVÉE - Plus de données pré-enregistrées
 * Utilisez screenshotDemoData.ts pour charger les données de démo pour screenshots
 */
export async function generateMockMeasurements(): Promise<void> {
  logger.info('⚔️ Fonction generateMockMeasurements désactivée - Aucune donnée fictive insérée');
  logger.info('💡 Utilisez screenshotDemoData.ts pour charger les données de démo pour screenshots');
  // FONCTION DÉSACTIVÉE - Plus de données pré-enregistrées
  return;

  // Code désactivé ci-dessous
  /*
  // Clear existing data first
  await deleteAllMeasurements();

  const today = new Date();
  const measurements: Omit<Measurement, 'id' | 'created_at'>[] = [];
  const days = 180;

  // Valeurs de départ (Day -180)
  const startWeight = 100.0;
  const startBodyFat = 32.0;
  const startWaist = 112.0;
  const startMuscleMass = 60.0;
  const startWater = 50.0;
  const startHips = 115.0;
  const startShoulder = 120.0;
  const startNavel = 110.0;
  const startLeftArm = 35.0;
  const startRightArm = 35.5;
  const startLeftThigh = 62.0;
  const startRightThigh = 62.5;

  // Valeurs finales (Today)
  const endWeight = 86.0;
  const endBodyFat = 18.0;
  const endWaist = 92.0;
  const endMuscleMass = 65.0;
  const endWater = 58.0;
  const endHips = 100.0;
  const endShoulder = 115.0;
  const endNavel = 90.0;
  const endLeftArm = 32.0;
  const endRightArm = 32.5;
  const endLeftThigh = 56.0;
  const endRightThigh = 56.5;

  // Générer 180 jours de données
  for (let day = 0; day < days; day++) {
    const date = new Date(today);
    date.setDate(date.getDate() - (days - day - 1));
    const progress = day / days; // 0 à 1

    // Déterminer la phase
    let phaseProgress: number;
    let weightTarget: number;
    let bodyFatTarget: number;
    let waistTarget: number;

    if (progress < 1/3) {
      // Phase 1 (Mois 1-2): Rapide baisse (Water weight)
      phaseProgress = progress * 3; // 0 à 1 dans cette phase
      weightTarget = startWeight - (phaseProgress * 8); // 100 → 92kg
      bodyFatTarget = startBodyFat - (phaseProgress * 6); // 32 → 26%
      waistTarget = startWaist - (phaseProgress * 8); // 112 → 104cm
    } else if (progress < 2/3) {
      // Phase 2 (Mois 3-4): Plateau (Stagnation autour de 92kg)
      phaseProgress = (progress - 1/3) * 3; // 0 à 1 dans cette phase
      const plateauWeight = 92.0;
      const plateauBodyFat = 24.0;
      const plateauWaist = 100.0;
      
      // Oscillation autour du plateau
      const oscillation = Math.sin(phaseProgress * Math.PI * 4) * 1.5; // ±1.5kg
      weightTarget = plateauWeight + oscillation;
      bodyFatTarget = plateauBodyFat + (oscillation * 0.3);
      waistTarget = plateauWaist + (oscillation * 0.5);
    } else {
      // Phase 3 (Mois 5-6): Discipline, baisse régulière
      phaseProgress = (progress - 2/3) * 3; // 0 à 1 dans cette phase
      weightTarget = 92.0 - (phaseProgress * 6); // 92 → 86kg
      bodyFatTarget = 24.0 - (phaseProgress * 6); // 24 → 18%
      waistTarget = 100.0 - (phaseProgress * 8); // 100 → 92cm
    }

    // Fluctuation aléatoire quotidienne (±0.5kg)
    const dailyNoise = (Math.random() - 0.5) * 0.5;
    const weight = Math.max(85.0, Math.min(101.0, weightTarget + dailyNoise));
    const bodyFat = Math.max(17.0, Math.min(33.0, bodyFatTarget + (dailyNoise * 0.3)));
    const waist = Math.max(90.0, Math.min(113.0, waistTarget + (dailyNoise * 0.5)));

    // Interpolation linéaire pour les autres métriques
    const muscleMass = startMuscleMass + (progress * (endMuscleMass - startMuscleMass));
    const water = startWater + (progress * (endWater - startWater));
    const hips = startHips - (progress * (startHips - endHips));
    const shoulder = startShoulder - (progress * (startShoulder - endShoulder));
    const navel = startNavel - (progress * (startNavel - endNavel));
    const leftArm = startLeftArm - (progress * (startLeftArm - endLeftArm));
    const rightArm = startRightArm - (progress * (startRightArm - endRightArm));
    const leftThigh = startLeftThigh - (progress * (startLeftThigh - endLeftThigh));
    const rightThigh = startRightThigh - (progress * (startRightThigh - endRightThigh));

    // Calculer le BMI (supposons une taille de 175 cm)
    const heightInMeters = 1.75;
    const bmi = weight / (heightInMeters * heightInMeters);

    // Calculer la graisse en kg
    const bodyFatKg = (weight * bodyFat) / 100;
    const waterKg = (weight * water) / 100;

    const measurement: Omit<Measurement, 'id' | 'created_at'> = {
      date: date.toISOString().split('T')[0],
      weight: Math.round(weight * 10) / 10,
      body_fat: Math.round(bodyFat * 10) / 10,
      body_fat_kg: Math.round(bodyFatKg * 10) / 10,
      muscle_mass: Math.round(muscleMass * 10) / 10,
      water: Math.round(water * 10) / 10,
      water_kg: Math.round(waterKg * 10) / 10,
      visceral_fat: Math.round((8 + Math.random() * 2) * 10) / 10,
      metabolic_age: Math.round((28 + Math.random() * 4) * 10) / 10,
      bone_mass: Math.round((3.5 + Math.random() * 0.5) * 10) / 10,
      bmr: Math.round((1800 + Math.random() * 200)),
      bmi: Math.round(bmi * 10) / 10,
      measurements: {
        waist: Math.round(waist * 10) / 10,
        hips: Math.round(hips * 10) / 10,
        chest: Math.round((shoulder - 5) * 10) / 10,
        left_arm: Math.round(leftArm * 10) / 10,
        right_arm: Math.round(rightArm * 10) / 10,
        left_thigh: Math.round(leftThigh * 10) / 10,
        right_thigh: Math.round(rightThigh * 10) / 10,
        navel: Math.round(navel * 10) / 10,
        shoulder: Math.round(shoulder * 10) / 10,
      },
      notes: day === 0 ? 'Début du suivi - 100kg' : day === days - 1 ? '6 mois de transformation !' : undefined,
    };

    measurements.push(measurement);
  }

  // Ajouter toutes les mesures au stockage
  logger.info(`📊 Génération de ${measurements.length} mesures fictives (6 mois / 180 jours)...`);
  for (const measurement of measurements) {
    try {
      await addMeasurement(measurement);
    } catch (error) {
      logger.error(`❌ Erreur lors de l'ajout de la mesure ${measurement.date}:`, error);
    }
  }

  logger.info('✅ Toutes les mesures fictives (6 mois) ont été ajoutées !');
  */
}
