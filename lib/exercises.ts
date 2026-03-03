// ============================================
// YOROI - BASE DE DONNÉES D'EXERCICES
// ============================================

export interface ExerciseTemplate {
  id: string;
  name: string;
  muscle_group: string;
  category: string;
}

export const MUSCLE_GROUPS = {
  pectoraux: 'Pectoraux',
  dos: 'Dos',
  epaules: 'Épaules',
  biceps: 'Biceps',
  triceps: 'Triceps',
  jambes: 'Jambes',
  abdos: 'Abdominaux',
  fessiers: 'Fessiers',
  mollets: 'Mollets',
  avant_bras: 'Avant-bras',
};

export const CARDIO_EQUIPMENT = {
  tapis: 'Tapis de course',
  velo: 'Vélo / Spinning',
  rameur: 'Rameur',
  elliptique: 'Elliptique',
  skierg: 'SkiErg',
  assault_bike: 'Assault Bike',
  escalier: 'Escaliers / Stairmaster',
  corde: 'Corde à sauter',
};

export const EXERCISES: ExerciseTemplate[] = [
  // === MUSCULATION ===
  // Pectoraux
  { id: 'dev_couche', name: 'Développé couché (Barre)', muscle_group: 'pectoraux', category: 'Compound' },
  { id: 'dev_halteres', name: 'Développé couché (Haltères)', muscle_group: 'pectoraux', category: 'Compound' },
  { id: 'dev_incline', name: 'Développé incliné (Barre)', muscle_group: 'pectoraux', category: 'Compound' },
  { id: 'dev_incline_halteres', name: 'Développé incliné (Haltères)', muscle_group: 'pectoraux', category: 'Compound' },
  { id: 'ecarte_couche', name: 'Écarté couché', muscle_group: 'pectoraux', category: 'Isolation' },
  { id: 'pec_deck', name: 'Pec Deck', muscle_group: 'pectoraux', category: 'Machine' },
  { id: 'dips_pecs', name: 'Dips (Pectoraux)', muscle_group: 'pectoraux', category: 'Bodyweight' },
  { id: 'pompes', name: 'Pompes', muscle_group: 'pectoraux', category: 'Bodyweight' },
  { id: 'cable_fly', name: 'Écartés poulie haute', muscle_group: 'pectoraux', category: 'Cables' },

  // Dos
  { id: 'tractions', name: 'Tractions (Pronation)', muscle_group: 'dos', category: 'Bodyweight' },
  { id: 'tractions_supi', name: 'Tractions (Supination)', muscle_group: 'dos', category: 'Bodyweight' },
  { id: 'rowing_barre', name: 'Rowing barre', muscle_group: 'dos', category: 'Compound' },
  { id: 'rowing_haltere', name: 'Rowing haltère', muscle_group: 'dos', category: 'Compound' },
  { id: 'tirage_vertical', name: 'Tirage poitrine', muscle_group: 'dos', category: 'Machine' },
  { id: 'tirage_horizontal', name: 'Tirage horizontal', muscle_group: 'dos', category: 'Machine' },
  { id: 'souleve_terre', name: 'Soulevé de terre (Deadlift)', muscle_group: 'dos', category: 'Compound' },
  { id: 'pull_over_poulie', name: 'Pull-over poulie haute', muscle_group: 'dos', category: 'Cables' },
  { id: 'lombaires', name: 'Banc à lombaires', muscle_group: 'dos', category: 'Isolation' },

  // Épaules
  { id: 'dev_militaire', name: 'Développé militaire', muscle_group: 'epaules', category: 'Compound' },
  { id: 'dev_halteres_assis', name: 'Développé haltères assis', muscle_group: 'epaules', category: 'Compound' },
  { id: 'elev_laterales', name: 'Élévations latérales', muscle_group: 'epaules', category: 'Isolation' },
  { id: 'oiseau', name: 'Oiseau haltères', muscle_group: 'epaules', category: 'Isolation' },
  { id: 'face_pull', name: 'Face Pull', muscle_group: 'epaules', category: 'Cables' },
  { id: 'arnold_press', name: 'Arnold Press', muscle_group: 'epaules', category: 'Compound' },
  { id: 'shrugs', name: 'Shrugs', muscle_group: 'epaules', category: 'Isolation' },

  // Biceps
  { id: 'curl_barre_ez', name: 'Curl barre EZ', muscle_group: 'biceps', category: 'Isolation' },
  { id: 'curl_halteres', name: 'Curl haltères', muscle_group: 'biceps', category: 'Isolation' },
  { id: 'curl_marteau', name: 'Curl marteau', muscle_group: 'biceps', category: 'Isolation' },
  { id: 'curl_pupitre', name: 'Curl Larry Scott', muscle_group: 'biceps', category: 'Isolation' },
  { id: 'curl_poulie', name: 'Curl poulie basse', muscle_group: 'biceps', category: 'Cables' },

  // Triceps
  { id: 'ext_poulie_corde', name: 'Extensions triceps poulie', muscle_group: 'triceps', category: 'Cables' },
  { id: 'barre_au_front', name: 'Barre au front', muscle_group: 'triceps', category: 'Isolation' },
  { id: 'dips_triceps', name: 'Dips (Triceps)', muscle_group: 'triceps', category: 'Bodyweight' },
  { id: 'ext_haltere', name: 'Extension haltère nuque', muscle_group: 'triceps', category: 'Isolation' },

  // Jambes
  { id: 'squat_barre', name: 'Squat (Barre)', muscle_group: 'jambes', category: 'Compound' },
  { id: 'presse_cuisses', name: 'Presse à cuisses', muscle_group: 'jambes', category: 'Machine' },
  { id: 'leg_extension', name: 'Leg Extension', muscle_group: 'jambes', category: 'Machine' },
  { id: 'leg_curl', name: 'Leg Curl', muscle_group: 'jambes', category: 'Machine' },
  { id: 'fentes_halteres', name: 'Fentes haltères', muscle_group: 'jambes', category: 'Compound' },
  { id: 'hack_squat', name: 'Hack Squat', muscle_group: 'jambes', category: 'Machine' },
  { id: 'sdt_jambes_tendues', name: 'Soulevé de terre jambes tendues', muscle_group: 'jambes', category: 'Compound' },

  // Abdominaux
  { id: 'crunch', name: 'Crunch', muscle_group: 'abdos', category: 'Bodyweight' },
  { id: 'releve_jambes', name: 'Relevé de jambes', muscle_group: 'abdos', category: 'Bodyweight' },
  { id: 'planche', name: 'Planche (Gainage)', muscle_group: 'abdos', category: 'Bodyweight' },
  { id: 'russian_twist', name: 'Russian Twist', muscle_group: 'abdos', category: 'Bodyweight' },
  { id: 'roulette_abdos', name: 'Roulette abdos', muscle_group: 'abdos', category: 'Isolation' },

  // === CARDIO ===
  { id: 'tapis_course', name: 'Course (Tapis)', muscle_group: 'cardio', category: 'Tapis' },
  { id: 'tapis_marche', name: 'Marche inclinée', muscle_group: 'cardio', category: 'Tapis' },
  { id: 'velo_spinning', name: 'Spinning / RPM', muscle_group: 'cardio', category: 'Velo' },
  { id: 'velo_droit', name: 'Vélo statique', muscle_group: 'cardio', category: 'Velo' },
  { id: 'rameur_concept2', name: 'Rameur (Concept2)', muscle_group: 'cardio', category: 'Rameur' },
  { id: 'elliptique_standard', name: 'Elliptique', muscle_group: 'cardio', category: 'Elliptique' },
  { id: 'skierg_pm5', name: 'SkiErg', muscle_group: 'cardio', category: 'SkiErg' },
  { id: 'assault_bike_intense', name: 'Assault Bike', muscle_group: 'cardio', category: 'Assault Bike' },
  { id: 'stairmaster', name: 'Escaliers (Stairmaster)', muscle_group: 'cardio', category: 'Escalier' },
  { id: 'corde_sauter', name: 'Corde à sauter', muscle_group: 'cardio', category: 'Corde' },
];

export const getExercisesByMuscleGroup = (muscleGroup: string): ExerciseTemplate[] => {
  return EXERCISES.filter(e => e.muscle_group === muscleGroup);
};

export const searchExercises = (query: string): ExerciseTemplate[] => {
  const lowerQuery = query.toLowerCase();
  return EXERCISES.filter(e =>
    e.name.toLowerCase().includes(lowerQuery) ||
    e.muscle_group.toLowerCase().includes(lowerQuery)
  );
};

export const getAllMuscleGroups = (): { id: string; name: string }[] => {
  return Object.entries(MUSCLE_GROUPS).map(([id, name]) => ({ id, name }));
};
