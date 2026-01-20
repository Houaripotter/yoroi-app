// ============================================ 
// YOROI - BIBLIOTHÈQUE MASSIVE D'EXERCICES PRO 
// ============================================ 

export interface ExerciseDefinition { 
  name: string; 
  category: string; 
  muscle?: string; 
  unit: 'reps' | 'time' | 'km'; 
} 

export const EXERCISE_LIBRARY: ExerciseDefinition[] = [ 
  // === CARDIO MACHINES (MATRIX / TECHNOGYM) === 
  { name: 'Tapis de course (Matrix)', category: 'cardio', muscle: 'CARDIO', unit: 'km' }, 
  { name: 'Vélo Elliptique (Technogym)', category: 'cardio', muscle: 'CARDIO', unit: 'time' }, 
  { name: 'Stairmaster / Escalier', category: 'cardio', muscle: 'JAMBES', unit: 'time' }, 
  { name: 'Rameur Concept2', category: 'cardio', muscle: 'DOS', unit: 'km' }, 
  { name: 'Vélo de Biking / Spinning', category: 'cardio', muscle: 'JAMBES', unit: 'km' }, 
  { name: 'Assault Bike', category: 'cardio', muscle: 'CORPS ENTIER', unit: 'time' }, 
  { name: 'SkiErg', category: 'cardio', muscle: 'BRAS/DOS', unit: 'time' }, 
  { name: 'Marche Inclinée (Matrix)', category: 'cardio', muscle: 'FESSIERS', unit: 'km' }, 
  { name: 'Vario (Technogym)', category: 'cardio', muscle: 'CARDIO', unit: 'time' }, 

  // === MUSCULATION (40+ EXERCICES) === 
  { name: 'Développé Couché Barre', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' }, 
  { name: 'Développé Couché Haltères', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' }, 
  { name: 'Dips Poids de corps', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' }, 
  { name: 'Écartés à la Poulie', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' }, 
  { name: 'Chest Press Machine', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' }, 
  { name: 'Tractions Pronation', category: 'musculation', muscle: 'DOS', unit: 'reps' }, 
  { name: 'Tirage Vertical', category: 'musculation', muscle: 'DOS', unit: 'reps' }, 
  { name: 'Rowing Barre', category: 'musculation', muscle: 'DOS', unit: 'reps' }, 
  { name: 'Low Row Machine', category: 'musculation', muscle: 'DOS', unit: 'reps' }, 
  { name: 'Pull Over Poulie', category: 'musculation', muscle: 'DOS', unit: 'reps' }, 
  { name: 'Squat Barre Libre', category: 'musculation', muscle: 'JAMBES', unit: 'reps' }, 
  { name: 'Presse à Cuisses Matrix', category: 'musculation', muscle: 'JAMBES', unit: 'reps' }, 
  { name: 'Leg Extension', category: 'musculation', muscle: 'JAMBES', unit: 'reps' }, 
  { name: 'Leg Curl Ischios', category: 'musculation', muscle: 'JAMBES', unit: 'reps' }, 
  { name: 'Adducteurs Machine', category: 'musculation', muscle: 'JAMBES', unit: 'reps' }, 
  { name: 'Abducteurs Machine', category: 'musculation', muscle: 'FESSIERS', unit: 'reps' }, 
  { name: 'Développé Militaire', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' }, 
  { name: 'Élévations Latérales', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' }, 
  { name: 'Shoulder Press Machine', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' }, 
  { name: 'Facepull Poulie', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' }, 
  { name: 'Curl Biceps Haltères', category: 'musculation', muscle: 'BICEPS', unit: 'reps' }, 
  { name: 'Curl Marteau', category: 'musculation', muscle: 'BICEPS', unit: 'reps' }, 
  { name: 'Barre au front', category: 'musculation', muscle: 'TRICEPS', unit: 'reps' }, 
  { name: 'Extension Triceps Poulie', category: 'musculation', muscle: 'TRICEPS', unit: 'reps' }, 
  { name: 'Crunch Machine', category: 'musculation', muscle: 'ABDOS', unit: 'reps' }, 
  { name: 'Gainage Planche', category: 'musculation', muscle: 'ABDOS', unit: 'time' }, 
  { name: 'Deadlift Soulevé de terre', category: 'musculation', muscle: 'DOS/JAMBES', unit: 'reps' }, 
  { name: 'Fentes Marchées', category: 'musculation', muscle: 'JAMBES', unit: 'reps' }, 
  { name: 'Hip Thrust Barre', category: 'musculation', muscle: 'FESSIERS', unit: 'reps' }, 
  { name: 'Skullcrusher', category: 'musculation', muscle: 'TRICEPS', unit: 'reps' }, 
  { name: 'Preacher Curl', category: 'musculation', muscle: 'BICEPS', unit: 'reps' }, 
  { name: 'Upright Row', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' }, 
  { name: 'Hack Squat', category: 'musculation', muscle: 'JAMBES', unit: 'reps' }, 
  { name: 'Machine à Mollets', category: 'musculation', muscle: 'MOLLETS', unit: 'reps' }, 

  // === SPORTS DE COMBAT === 
  { name: 'Drilling Technique', category: 'jjb', unit: 'reps' }, 
  { name: 'Sparring Souple', category: 'jjb', unit: 'time' }, 
  { name: 'Sparring Intensif', category: 'jjb', unit: 'time' }, 
  { name: 'Passages de garde', category: 'jjb', unit: 'reps' }, 
  { name: 'Lutte à genoux', category: 'jjb', unit: 'time' }, 
  { name: 'Shadow Boxing', category: 'boxe', unit: 'time' }, 
  { name: 'Travail au Sac', category: 'boxe', unit: 'time' }, 
  { name: 'Mitts (Pattes d\'ours)', category: 'boxe', unit: 'time' }, 
  { name: 'Sparring Boxe', category: 'boxe', unit: 'time' }, 
  { name: 'Corde à sauter', category: 'boxe', unit: 'time' }, 
];
