// ============================================ 
// YOROI - BIBLIOTHÈQUE MASSIVE D'EXERCICES PRO 
// Classé par Sport, Muscle et Équipement
// ============================================ 

export interface ExerciseDefinition {
  name: string;
  category: string;
  muscle?: string;
  unit: 'reps' | 'time' | 'km';
}

export const EXERCISE_LIBRARY: ExerciseDefinition[] = [
  // === CARDIO (CLASSÉ PAR APPAREIL) === 
  { name: 'Course (Tapis Matrix)', category: 'cardio', muscle: 'TAPIS', unit: 'km' },
  { name: 'Marche Inclinée (Matrix)', category: 'cardio', muscle: 'TAPIS', unit: 'km' },
  { name: 'Vélo de Biking / Spinning', category: 'cardio', muscle: 'VÉLO', unit: 'km' },
  { name: 'Vélo Statique (Technogym)', category: 'cardio', muscle: 'VÉLO', unit: 'time' },
  { name: 'Rameur Concept2', category: 'cardio', muscle: 'RAMEUR', unit: 'km' },
  { name: 'Vélo Elliptique', category: 'cardio', muscle: 'ELLIPTIQUE', unit: 'time' },
  { name: 'Vario (Technogym)', category: 'cardio', muscle: 'ELLIPTIQUE', unit: 'time' },
  { name: 'SkiErg PM5', category: 'cardio', muscle: 'SKIERG', unit: 'time' },
  { name: 'Assault Bike (AirBike)', category: 'cardio', muscle: 'ASSAULT BIKE', unit: 'time' },
  { name: 'Stairmaster / Escaliers', category: 'cardio', muscle: 'ESCALIER', unit: 'time' },
  { name: 'Corde à sauter Speed', category: 'cardio', muscle: 'CORDE', unit: 'time' },

  // === MUSCULATION (CLASSÉ PAR GROUPE MUSCULAIRE) === 
  // Pectoraux
  { name: 'Développé Couché (Barre)', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' },
  { name: 'Développé Couché (Haltères)', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' },
  { name: 'Développé Incliné (Barre)', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' },
  { name: 'Développé Incliné (Haltères)', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' },
  { name: 'Écartés Couché (Haltères)', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' },
  { name: 'Écartés à la Poulie Haute', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' },
  { name: 'Chest Press (Machine)', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' },
  { name: 'Pec Deck (Butterfly)', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' },
  { name: 'Dips (Focus Pectoraux)', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' },
  { name: 'Pompes (Poids du corps)', category: 'musculation', muscle: 'PECTORAUX', unit: 'reps' },

  // Dos
  { name: 'Tractions (Pronation)', category: 'musculation', muscle: 'DOS', unit: 'reps' },
  { name: 'Tractions (Supination)', category: 'musculation', muscle: 'DOS', unit: 'reps' },
  { name: 'Tirage Poitrine (Lat Pulldown)', category: 'musculation', muscle: 'DOS', unit: 'reps' },
  { name: 'Rowing Barre (Bent Over)', category: 'musculation', muscle: 'DOS', unit: 'reps' },
  { name: 'Rowing Haltère (One Arm)', category: 'musculation', muscle: 'DOS', unit: 'reps' },
  { name: 'Tirage Horizontal (Seated Row)', category: 'musculation', muscle: 'DOS', unit: 'reps' },
  { name: 'Deadlift (Soulevé de terre)', category: 'musculation', muscle: 'DOS', unit: 'reps' },
  { name: 'Pull Over Poulie Haute', category: 'musculation', muscle: 'DOS', unit: 'reps' },
  { name: 'Banc à Lombaires', category: 'musculation', muscle: 'DOS', unit: 'reps' },
  { name: 'Low Row Machine', category: 'musculation', muscle: 'DOS', unit: 'reps' },

  // Épaules
  { name: 'Développé Militaire (Barre)', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' },
  { name: 'Développé Haltères Assis', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' },
  { name: 'Élévations Latérales (Haltères)', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' },
  { name: 'Oiseau Haltères (Rear Delts)', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' },
  { name: 'Arnold Press', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' },
  { name: 'Shoulder Press Machine', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' },
  { name: 'Facepull Poulie', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' },
  { name: 'Shrugs (Trapèzes)', category: 'musculation', muscle: 'ÉPAULES', unit: 'reps' },

  // Bras (Biceps / Triceps)
  { name: 'Curl Barre EZ', category: 'musculation', muscle: 'BICEPS', unit: 'reps' },
  { name: 'Curl Haltères Alternative', category: 'musculation', muscle: 'BICEPS', unit: 'reps' },
  { name: 'Curl Marteau (Hammer)', category: 'musculation', muscle: 'BICEPS', unit: 'reps' },
  { name: 'Curl Larry Scott (Pupitre)', category: 'musculation', muscle: 'BICEPS', unit: 'reps' },
  { name: 'Extension Triceps Poulie', category: 'musculation', muscle: 'TRICEPS', unit: 'reps' },
  { name: 'Barre au front (Skullcrusher)', category: 'musculation', muscle: 'TRICEPS', unit: 'reps' },
  { name: 'Dips (Focus Triceps)', category: 'musculation', muscle: 'TRICEPS', unit: 'reps' },
  { name: 'Extension Haltère Nuque', category: 'musculation', muscle: 'TRICEPS', unit: 'reps' },

  // Jambes
  { name: 'Squat Barre Libre', category: 'musculation', muscle: 'JAMBES', unit: 'reps' },
  { name: 'Presse à Cuisses', category: 'musculation', muscle: 'JAMBES', unit: 'reps' },
  { name: 'Leg Extension', category: 'musculation', muscle: 'JAMBES', unit: 'reps' },
  { name: 'Leg Curl (Ischios)', category: 'musculation', muscle: 'JAMBES', unit: 'reps' },
  { name: 'Fentes Haltères', category: 'musculation', muscle: 'JAMBES', unit: 'reps' },
  { name: 'Hack Squat', category: 'musculation', muscle: 'JAMBES', unit: 'reps' },
  { name: 'SDT Jambes Tendues', category: 'musculation', muscle: 'JAMBES', unit: 'reps' },
  { name: 'Adducteurs Machine', category: 'musculation', muscle: 'JAMBES', unit: 'reps' },
  { name: 'Machine à Mollets Debout', category: 'musculation', muscle: 'MOLLETS', unit: 'reps' },

  // Fessiers
  { name: 'Hip Thrust Barre', category: 'musculation', muscle: 'FESSIERS', unit: 'reps' },
  { name: 'Fentes Bulgares', category: 'musculation', muscle: 'FESSIERS', unit: 'reps' },
  { name: 'Abducteurs Machine', category: 'musculation', muscle: 'FESSIERS', unit: 'reps' },
  { name: 'Kick-back Poulie', category: 'musculation', muscle: 'FESSIERS', unit: 'reps' },

  // Abdominaux
  { name: 'Crunch Abdominal', category: 'musculation', muscle: 'ABDOS', unit: 'reps' },
  { name: 'Relevé de jambes Suspendu', category: 'musculation', muscle: 'ABDOS', unit: 'reps' },
  { name: 'Gainage Planche', category: 'musculation', muscle: 'ABDOS', unit: 'time' },
  { name: 'Russian Twist', category: 'musculation', muscle: 'ABDOS', unit: 'reps' },
  { name: 'Roulette Abdos (Abs Wheel)', category: 'musculation', muscle: 'ABDOS', unit: 'reps' },

  // === STREET WORKOUT === 
  { name: 'Planche (Hold)', category: 'street_workout', muscle: 'STATIQUE', unit: 'time' },
  { name: 'Front Lever (Hold)', category: 'street_workout', muscle: 'STATIQUE', unit: 'time' },
  { name: 'Back Lever (Hold)', category: 'street_workout', muscle: 'STATIQUE', unit: 'time' },
  { name: 'Human Flag (Drapeau)', category: 'street_workout', muscle: 'STATIQUE', unit: 'time' },
  { name: 'Muscle Up', category: 'street_workout', muscle: 'DYNAMIQUE', unit: 'reps' },
  { name: 'Tractions Lestées', category: 'street_workout', muscle: 'DYNAMIQUE', unit: 'reps' },
  { name: 'Dips Lestés', category: 'street_workout', muscle: 'DYNAMIQUE', unit: 'reps' },
  { name: 'Handstand Push-ups', category: 'street_workout', muscle: 'DYNAMIQUE', unit: 'reps' },

  // === HYROX === 
  { name: '1000m SkiErg', category: 'hyrox', muscle: 'STATIONS', unit: 'time' },
  { name: '50m Sled Push', category: 'hyrox', muscle: 'STATIONS', unit: 'time' },
  { name: '50m Sled Pull', category: 'hyrox', muscle: 'STATIONS', unit: 'time' },
  { name: '80m Burpee Broad Jumps', category: 'hyrox', muscle: 'STATIONS', unit: 'time' },
  { name: '1000m Rameur', category: 'hyrox', muscle: 'STATIONS', unit: 'time' },
  { name: '200m Farmers Carry', category: 'hyrox', muscle: 'STATIONS', unit: 'time' },
  { name: '100m Sandbag Lunges', category: 'hyrox', muscle: 'STATIONS', unit: 'time' },
  { name: '100 Wall Balls', category: 'hyrox', muscle: 'STATIONS', unit: 'time' },

  // === JJB (Jiu-Jitsu Brésilien) ===
  { name: 'Drilling Passage de Garde', category: 'jjb', muscle: 'PASSAGE', unit: 'reps' },
  { name: 'Sparring Thématique', category: 'jjb', muscle: 'COMBAT', unit: 'time' },
  { name: 'Répétitions Soumissions', category: 'jjb', muscle: 'SOUMISSION', unit: 'reps' },
  { name: 'Travail de Garde (Berimbolo/De la Riva)', category: 'jjb', muscle: 'GARDE', unit: 'reps' },
  { name: 'Lutte JJB (Takedowns)', category: 'jjb', muscle: 'LUTTE', unit: 'reps' },

  // === BOXE ANGLAISE ===
  { name: 'Shadow Boxing', category: 'boxe', muscle: 'TECHNIQUE', unit: 'time' },
  { name: 'Travail au Sac (Heavy Bag)', category: 'boxe', muscle: 'PUISSANCE', unit: 'time' },
  { name: 'Mitts / Pattes d\'ours', category: 'boxe', muscle: 'PRÉCISION', unit: 'time' },
  { name: 'Sparring Boxe', category: 'boxe', muscle: 'COMBAT', unit: 'time' },
  { name: 'Corde à sauter (Rounds)', category: 'boxe', muscle: 'CARDIO', unit: 'time' },

  // === MMA (Arts Martiaux Mixtes) ===
  { name: 'MMA Sparring (Light)', category: 'mma', muscle: 'COMBAT', unit: 'time' },
  { name: 'Wall Wrestling (Lutte contre cage)', category: 'mma', muscle: 'LUTTE', unit: 'time' },
  { name: 'Ground and Pound (Sac)', category: 'mma', muscle: 'FRAPPE', unit: 'time' },
  { name: 'Transitions Striking/Wrestling', category: 'mma', muscle: 'TECHNIQUE', unit: 'reps' },

  // === MUAY THAI ===
  { name: 'Thai Pads (Pao)', category: 'muay_thai', muscle: 'INTENSITÉ', unit: 'time' },
  { name: 'Clinch / Corps à corps', category: 'muay_thai', muscle: 'TECHNIQUE', unit: 'time' },
  { name: 'Kick Rounds (Sac)', category: 'muay_thai', muscle: 'PUISSANCE', unit: 'reps' },
];
