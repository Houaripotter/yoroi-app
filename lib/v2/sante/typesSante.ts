/**
 * Inventaire des types Apple Santé et Health Connect demandés par YOROI (14 octobre 2026, SANTÉ CONNEXION).
 * Source unique : la demande native (YoroiHealthKitModule.requestHealthPermissionsFor), le secours Nitro,
 * la demande des mesures avancées et les textes de l'app lisent ces listes. Pur, testé
 * (__tests__/unit/typesSante.test.ts vérifie aussi que chaque type est vraiment lu ou écrit dans le code).
 *
 * Deux niveaux :
 * - essentiel : demandé à la connexion. Ce qui sert au suivi du poids, des séances et de la forme.
 * - avancé : facultatif, demandé seulement si tu touches « Autoriser les mesures avancées » (Santé, Ta montre).
 *
 * Retirés le 14 octobre 2026 car jamais lus : AppleStandTime (YOROI lit les heures debout, pas les minutes)
 * et RunningCadence (n'existe pas dans HealthKit). Android : StepsCadence et CyclingPedalingCadence
 * (permissions jamais déclarées, donc jamais accordées).
 */

export type CategorieSante = 'corps' | 'activite' | 'coeur' | 'sommeil' | 'seances' | 'nutrition' | 'mobilite' | 'alertes' | 'souffle' | 'environnement' | 'autres-sports' | 'suivi-medical';

export const CATEGORIES_SANTE: Record<CategorieSante, { label: string; exemples: string }> = {
  corps: { label: 'Poids et corps', exemples: 'poids, masse grasse, masse maigre, taille, tour de taille' },
  activite: { label: 'Activité', exemples: 'pas, distance, calories, exercice, étages' },
  coeur: { label: 'Cœur et souffle', exemples: 'fréquence cardiaque, au repos, variabilité, VO2 max, oxygène, tension' },
  sommeil: { label: 'Sommeil', exemples: 'nuits, température au poignet, respiration la nuit' },
  seances: { label: 'Séances', exemples: 'entraînements, tracés GPS, effort, foulée, puissance, vélo, nage' },
  nutrition: { label: 'Eau et repas', exemples: 'eau, calories mangées, protéines, glucides, lipides, caféine' },
  mobilite: { label: 'Marche et équilibre', exemples: 'vitesse de marche, longueur du pas, asymétrie, chutes' },
  alertes: { label: 'Alertes du cœur', exemples: 'rythme irrégulier, FC haute ou basse, ECG, fibrillation' },
  souffle: { label: 'Respiration', exemples: 'capacité vitale, débit expiratoire, apnées' },
  environnement: { label: 'Sons, UV et lumière', exemples: 'son au casque, bruit ambiant, UV, lumière du jour' },
  'autres-sports': { label: 'Autres sports', exemples: 'ski, glisse, rame, pagaie, plongée, fauteuil' },
  'suivi-medical': { label: 'Suivi médical et nutriments', exemples: 'glycémie, température, humeur, vitamines, minéraux' },
};

export type TypeSante = { id: string; cat: CategorieSante };

const q = (n: string, cat: CategorieSante): TypeSante => ({ id: `HKQuantityTypeIdentifier${n}`, cat });
const c = (n: string, cat: CategorieSante): TypeSante => ({ id: `HKCategoryTypeIdentifier${n}`, cat });

// ============================================
// IPHONE : LECTURE ESSENTIELLE (connexion)
// ============================================

export const IOS_LECTURE_ESSENTIEL: TypeSante[] = [
  // Poids et corps
  q('BodyMass', 'corps'),
  q('BodyFatPercentage', 'corps'),
  q('LeanBodyMass', 'corps'),
  q('Height', 'corps'),
  q('BodyMassIndex', 'corps'),
  q('WaistCircumference', 'corps'),
  // Activité
  q('StepCount', 'activite'),
  q('DistanceWalkingRunning', 'activite'),
  q('AppleExerciseTime', 'activite'),
  c('AppleStandHour', 'activite'),
  q('AppleMoveTime', 'activite'),
  q('FlightsClimbed', 'activite'),
  q('ActiveEnergyBurned', 'activite'),
  q('BasalEnergyBurned', 'activite'),
  { id: 'HKActivitySummaryTypeIdentifier', cat: 'activite' },
  // Cœur et souffle
  q('HeartRate', 'coeur'),
  q('RestingHeartRate', 'coeur'),
  q('HeartRateVariabilitySDNN', 'coeur'),
  q('WalkingHeartRateAverage', 'coeur'),
  q('HeartRateRecoveryOneMinute', 'coeur'),
  q('VO2Max', 'coeur'),
  q('OxygenSaturation', 'coeur'),
  q('RespiratoryRate', 'coeur'),
  q('BloodPressureSystolic', 'coeur'),
  q('BloodPressureDiastolic', 'coeur'),
  // Sommeil
  c('SleepAnalysis', 'sommeil'),
  q('AppleSleepingWristTemperature', 'sommeil'),
  q('AppleSleepingBreathingDisturbances', 'sommeil'),
  // Séances (zones iOS 27 : séances, FC et puissance vélo ; météo : métadonnées des séances)
  { id: 'HKWorkoutTypeIdentifier', cat: 'seances' },
  { id: 'HKWorkoutRouteTypeIdentifier', cat: 'seances' },
  q('WorkoutEffortScore', 'seances'),
  q('EstimatedWorkoutEffortScore', 'seances'),
  q('PhysicalEffort', 'seances'),
  q('RunningPower', 'seances'),
  q('RunningSpeed', 'seances'),
  q('RunningStrideLength', 'seances'),
  q('RunningVerticalOscillation', 'seances'),
  q('RunningGroundContactTime', 'seances'),
  q('DistanceCycling', 'seances'),
  q('CyclingPower', 'seances'),
  q('CyclingCadence', 'seances'),
  q('CyclingSpeed', 'seances'),
  q('CyclingFunctionalThresholdPower', 'seances'),
  q('DistanceSwimming', 'seances'),
  q('SwimmingStrokeCount', 'seances'),
  // Eau et repas (hydratation, plan nutrition, sèche)
  q('DietaryWater', 'nutrition'),
  q('DietaryEnergyConsumed', 'nutrition'),
  q('DietaryProtein', 'nutrition'),
  q('DietaryCarbohydrates', 'nutrition'),
  q('DietaryFatTotal', 'nutrition'),
  q('DietaryCaffeine', 'nutrition'),
];

// ============================================
// IPHONE : LECTURE AVANCÉE (facultative)
// ============================================

const MICRONUTRIMENTS = [
  'Fiber', 'Sugar', 'FatSaturated', 'FatMonounsaturated', 'FatPolyunsaturated', 'Cholesterol', 'Sodium', 'Potassium',
  'Calcium', 'Magnesium', 'Iron', 'Zinc', 'Phosphorus', 'Iodine', 'Selenium', 'Copper', 'Manganese', 'Chromium',
  'Molybdenum', 'Chloride', 'VitaminA', 'Thiamin', 'Riboflavin', 'Niacin', 'PantothenicAcid', 'Biotin', 'Folate',
  'VitaminC', 'VitaminD', 'VitaminE', 'VitaminK',
];

export const IOS_LECTURE_AVANCE: TypeSante[] = [
  // Marche et équilibre
  q('WalkingSpeed', 'mobilite'),
  q('WalkingStepLength', 'mobilite'),
  q('WalkingAsymmetryPercentage', 'mobilite'),
  q('WalkingDoubleSupportPercentage', 'mobilite'),
  q('AppleWalkingSteadiness', 'mobilite'),
  q('StairAscentSpeed', 'mobilite'),
  q('StairDescentSpeed', 'mobilite'),
  q('SixMinuteWalkTestDistance', 'mobilite'),
  q('NumberOfTimesFallen', 'mobilite'),
  c('AppleWalkingSteadinessEvent', 'mobilite'),
  // Alertes du cœur
  c('HighHeartRateEvent', 'alertes'),
  c('LowHeartRateEvent', 'alertes'),
  c('IrregularHeartRhythmEvent', 'alertes'),
  c('LowCardioFitnessEvent', 'alertes'),
  q('AtrialFibrillationBurden', 'alertes'),
  q('PeripheralPerfusionIndex', 'alertes'),
  { id: 'HKElectrocardiogramType', cat: 'alertes' },
  // Respiration
  q('ForcedVitalCapacity', 'souffle'),
  q('PeakExpiratoryFlowRate', 'souffle'),
  c('SleepApneaEvent', 'souffle'),
  // Sons, UV et lumière
  q('HeadphoneAudioExposure', 'environnement'),
  q('EnvironmentalAudioExposure', 'environnement'),
  c('HeadphoneAudioExposureEvent', 'environnement'),
  c('EnvironmentalAudioExposureEvent', 'environnement'),
  q('UVExposure', 'environnement'),
  q('TimeInDaylight', 'environnement'),
  // Autres sports
  q('DistanceDownhillSnowSports', 'autres-sports'),
  q('DistanceCrossCountrySkiing', 'autres-sports'),
  q('CrossCountrySkiingSpeed', 'autres-sports'),
  q('DistanceSkatingSports', 'autres-sports'),
  q('DistanceRowing', 'autres-sports'),
  q('RowingSpeed', 'autres-sports'),
  q('DistancePaddleSports', 'autres-sports'),
  q('PaddleSportsSpeed', 'autres-sports'),
  q('UnderwaterDepth', 'autres-sports'),
  q('WaterTemperature', 'autres-sports'),
  q('DistanceWheelchair', 'autres-sports'),
  q('PushCount', 'autres-sports'),
  // Suivi médical et nutriments
  q('BloodGlucose', 'suivi-medical'),
  q('BodyTemperature', 'suivi-medical'),
  q('ElectrodermalActivity', 'suivi-medical'),
  q('InsulinDelivery', 'suivi-medical'),
  q('BloodAlcoholContent', 'suivi-medical'),
  q('NumberOfAlcoholicBeverages', 'suivi-medical'),
  c('MindfulSession', 'suivi-medical'),
  { id: 'HKStateOfMindTypeIdentifier', cat: 'suivi-medical' },
  ...MICRONUTRIMENTS.map((n) => q(`Dietary${n}`, 'suivi-medical')),
];

// ============================================
// IPHONE ET MONTRE : ÉCRITURE
// ============================================

/** Ce que l'app iPhone écrit (pesée, masse grasse, eau, sommeil saisi, séance notée) */
export const IOS_ECRITURE_IPHONE: TypeSante[] = [
  q('BodyMass', 'corps'),
  q('BodyFatPercentage', 'corps'),
  q('DietaryWater', 'nutrition'),
  c('SleepAnalysis', 'sommeil'),
  { id: 'HKWorkoutTypeIdentifier', cat: 'seances' },
];

/** Demandé par l'app de la montre (ios/YoroiWatch/Services/Sante.swift), listé sous la même app dans Réglages */
export const MONTRE_ECRITURE: TypeSante[] = [
  { id: 'HKWorkoutTypeIdentifier', cat: 'seances' },
  q('BodyMass', 'corps'),
  q('ActiveEnergyBurned', 'activite'),
  q('HeartRate', 'coeur'),
];

export const MONTRE_LECTURE: TypeSante[] = [
  { id: 'HKWorkoutTypeIdentifier', cat: 'seances' },
  q('HeartRate', 'coeur'),
  q('ActiveEnergyBurned', 'activite'),
  q('BodyMass', 'corps'),
  { id: 'HKCharacteristicTypeIdentifierDateOfBirth', cat: 'coeur' },
  q('OxygenSaturation', 'coeur'),
  q('RestingHeartRate', 'coeur'),
  q('HeartRateVariabilitySDNN', 'coeur'),
  q('RespiratoryRate', 'coeur'),
];

export const ids = (l: TypeSante[]): string[] => l.map((t) => t.id);

// ============================================
// ANDROID (HEALTH CONNECT)
// ============================================

export type PermissionHC = { accessType: 'read' | 'write'; recordType: string };

const r = (recordType: string): PermissionHC => ({ accessType: 'read', recordType });
const w = (recordType: string): PermissionHC => ({ accessType: 'write', recordType });

export const ANDROID_LECTURE: PermissionHC[] = [
  r('Weight'), r('BodyFat'), r('LeanBodyMass'), r('Height'), r('BoneMass'), r('BodyWaterMass'),
  r('Steps'), r('Distance'), r('ActiveCaloriesBurned'), r('TotalCaloriesBurned'), r('BasalMetabolicRate'), r('FloorsClimbed'), r('ElevationGained'),
  r('HeartRate'), r('RestingHeartRate'), r('HeartRateVariabilityRmssd'), r('Vo2Max'), r('OxygenSaturation'), r('RespiratoryRate'), r('BloodPressure'),
  r('SleepSession'), r('BodyTemperature'),
  r('ExerciseSession'), r('Speed'), r('Power'),
  r('Hydration'), r('Nutrition'),
  // historique au-delà de 30 jours (sans lui, l'import complet s'arrête à un mois)
  r('ReadHealthDataHistory'),
];

/** Facultatif, comme sur iPhone */
export const ANDROID_LECTURE_AVANCE: PermissionHC[] = [r('BloodGlucose'), r('WheelchairPushes')];

export const ANDROID_ECRITURE: PermissionHC[] = [w('Weight'), w('BodyFat'), w('Hydration'), w('SleepSession'), w('ExerciseSession')];

/** Nom de la permission du manifeste Android (app.json) pour une permission Health Connect */
export function permissionManifeste(p: PermissionHC): string {
  if (p.recordType === 'ReadHealthDataHistory') return 'android.permission.health.READ_HEALTH_DATA_HISTORY';
  const special: Record<string, string> = {
    SleepSession: 'SLEEP',
    ExerciseSession: 'EXERCISE',
    HeartRateVariabilityRmssd: 'HEART_RATE_VARIABILITY',
    Vo2Max: 'VO2_MAX',
  };
  const nom = special[p.recordType] ?? p.recordType.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toUpperCase();
  return `android.permission.health.${p.accessType === 'read' ? 'READ' : 'WRITE'}_${nom}`;
}

/** Clé unique d'une permission (lecture et écriture d'un même type sont deux permissions) */
export const clePermission = (p: { accessType?: string; recordType?: string }): string => `${p?.accessType ?? ''}:${p?.recordType ?? ''}`;

// ============================================
// RÉSUMÉ LISIBLE (textes de l'app)
// ============================================

export type ResumeDemande = {
  lecture: number;
  ecriture: number;
  /** Catégories dans l'ordre d'affichage, avec le nombre de types lus */
  categories: { cat: CategorieSante; label: string; exemples: string; lecture: number }[];
};

const unique = (l: string[]): string[] => Array.from(new Set(l));

/**
 * Ce qui apparaît dans Réglages, Santé, Accès aux données, YOROI (iPhone), ou dans Health Connect.
 * iOS liste séparément la lecture et l'écriture, chaque type une fois.
 */
export function resumeDemande(platform: string, avance = false): ResumeDemande {
  if (platform === 'android') {
    const lus = [...ANDROID_LECTURE, ...(avance ? ANDROID_LECTURE_AVANCE : [])].filter((p) => p.recordType !== 'ReadHealthDataHistory');
    return {
      lecture: lus.length,
      ecriture: ANDROID_ECRITURE.length,
      categories: [],
    };
  }
  const lecture: TypeSante[] = [...IOS_LECTURE_ESSENTIEL, ...MONTRE_LECTURE, ...(avance ? IOS_LECTURE_AVANCE : [])];
  const ecriture: TypeSante[] = [...IOS_ECRITURE_IPHONE, ...MONTRE_ECRITURE];
  const vus = new Map<string, TypeSante>();
  for (const t of lecture) if (!vus.has(t.id)) vus.set(t.id, t);
  const ordre = Object.keys(CATEGORIES_SANTE) as CategorieSante[];
  const categories = ordre
    .map((cat) => ({ cat, ...CATEGORIES_SANTE[cat], lecture: Array.from(vus.values()).filter((t) => t.cat === cat).length }))
    .filter((x) => x.lecture > 0);
  return { lecture: vus.size, ecriture: unique(ids(ecriture)).length, categories };
}

/** « 52 en lecture, 7 en écriture » */
export function texteResume(platform: string, avance = false): string {
  const r0 = resumeDemande(platform, avance);
  return `${r0.lecture} en lecture, ${r0.ecriture} en écriture`;
}

/** Nombre de types ajoutés par les mesures avancées */
export function nombreAvance(platform: string): number {
  return platform === 'android' ? ANDROID_LECTURE_AVANCE.length : IOS_LECTURE_AVANCE.length;
}
