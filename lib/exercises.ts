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

export const EXERCISES: ExerciseTemplate[] = [
  // Pectoraux
  { id: 'dev_couche', name: 'Développé couché', muscle_group: 'pectoraux', category: 'compound' },
  { id: 'dev_incline', name: 'Développé incliné', muscle_group: 'pectoraux', category: 'compound' },
  { id: 'dev_decline', name: 'Développé décliné', muscle_group: 'pectoraux', category: 'compound' },
  { id: 'ecarte_couche', name: 'Écarté couché', muscle_group: 'pectoraux', category: 'isolation' },
  { id: 'ecarte_incline', name: 'Écarté incliné', muscle_group: 'pectoraux', category: 'isolation' },
  { id: 'pompes', name: 'Pompes', muscle_group: 'pectoraux', category: 'bodyweight' },
  { id: 'dips_pecs', name: 'Dips pectoraux', muscle_group: 'pectoraux', category: 'bodyweight' },
  { id: 'pec_deck', name: 'Pec Deck', muscle_group: 'pectoraux', category: 'machine' },
  { id: 'cable_crossover', name: 'Cable Crossover', muscle_group: 'pectoraux', category: 'cable' },

  // Dos
  { id: 'tractions', name: 'Tractions', muscle_group: 'dos', category: 'bodyweight' },
  { id: 'rowing_barre', name: 'Rowing barre', muscle_group: 'dos', category: 'compound' },
  { id: 'rowing_haltere', name: 'Rowing haltère', muscle_group: 'dos', category: 'compound' },
  { id: 'tirage_vertical', name: 'Tirage vertical', muscle_group: 'dos', category: 'machine' },
  { id: 'tirage_horizontal', name: 'Tirage horizontal', muscle_group: 'dos', category: 'machine' },
  { id: 'souleve_terre', name: 'Soulevé de terre', muscle_group: 'dos', category: 'compound' },
  { id: 'pull_over', name: 'Pull-over', muscle_group: 'dos', category: 'isolation' },
  { id: 't_bar_row', name: 'T-Bar Row', muscle_group: 'dos', category: 'compound' },

  // Épaules
  { id: 'dev_militaire', name: 'Développé militaire', muscle_group: 'epaules', category: 'compound' },
  { id: 'dev_halteres', name: 'Développé haltères', muscle_group: 'epaules', category: 'compound' },
  { id: 'elev_laterales', name: 'Élévations latérales', muscle_group: 'epaules', category: 'isolation' },
  { id: 'elev_frontales', name: 'Élévations frontales', muscle_group: 'epaules', category: 'isolation' },
  { id: 'oiseau', name: 'Oiseau (deltoïdes postérieurs)', muscle_group: 'epaules', category: 'isolation' },
  { id: 'face_pulls', name: 'Face Pulls', muscle_group: 'epaules', category: 'cable' },
  { id: 'shrugs', name: 'Shrugs (trapèzes)', muscle_group: 'epaules', category: 'isolation' },

  // Biceps
  { id: 'curl_barre', name: 'Curl barre', muscle_group: 'biceps', category: 'isolation' },
  { id: 'curl_haltere', name: 'Curl haltère', muscle_group: 'biceps', category: 'isolation' },
  { id: 'curl_marteau', name: 'Curl marteau', muscle_group: 'biceps', category: 'isolation' },
  { id: 'curl_pupitre', name: 'Curl pupitre', muscle_group: 'biceps', category: 'isolation' },
  { id: 'curl_incline', name: 'Curl incliné', muscle_group: 'biceps', category: 'isolation' },
  { id: 'curl_cable', name: 'Curl à la poulie', muscle_group: 'biceps', category: 'cable' },

  // Triceps
  { id: 'dips_triceps', name: 'Dips triceps', muscle_group: 'triceps', category: 'bodyweight' },
  { id: 'ext_couche', name: 'Extensions couchées', muscle_group: 'triceps', category: 'isolation' },
  { id: 'ext_poulie', name: 'Extensions à la poulie', muscle_group: 'triceps', category: 'cable' },
  { id: 'kick_back', name: 'Kick-back', muscle_group: 'triceps', category: 'isolation' },
  { id: 'ext_nuque', name: 'Extensions nuque', muscle_group: 'triceps', category: 'isolation' },
  { id: 'dev_serre', name: 'Développé prise serrée', muscle_group: 'triceps', category: 'compound' },

  // Jambes
  { id: 'squat', name: 'Squat', muscle_group: 'jambes', category: 'compound' },
  { id: 'squat_front', name: 'Squat avant', muscle_group: 'jambes', category: 'compound' },
  { id: 'presse_cuisses', name: 'Presse à cuisses', muscle_group: 'jambes', category: 'machine' },
  { id: 'leg_extension', name: 'Leg extension', muscle_group: 'jambes', category: 'machine' },
  { id: 'leg_curl', name: 'Leg curl', muscle_group: 'jambes', category: 'machine' },
  { id: 'fentes', name: 'Fentes', muscle_group: 'jambes', category: 'compound' },
  { id: 'sdt_jambes_tendues', name: 'SDT jambes tendues', muscle_group: 'jambes', category: 'compound' },
  { id: 'hack_squat', name: 'Hack squat', muscle_group: 'jambes', category: 'machine' },

  // Fessiers
  { id: 'hip_thrust', name: 'Hip thrust', muscle_group: 'fessiers', category: 'compound' },
  { id: 'fentes_bulgares', name: 'Fentes bulgares', muscle_group: 'fessiers', category: 'compound' },
  { id: 'kick_back_cable', name: 'Kick-back à la poulie', muscle_group: 'fessiers', category: 'cable' },
  { id: 'abduction_machine', name: 'Abduction machine', muscle_group: 'fessiers', category: 'machine' },

  // Mollets
  { id: 'mollets_debout', name: 'Mollets debout', muscle_group: 'mollets', category: 'isolation' },
  { id: 'mollets_assis', name: 'Mollets assis', muscle_group: 'mollets', category: 'isolation' },
  { id: 'mollets_presse', name: 'Mollets à la presse', muscle_group: 'mollets', category: 'machine' },

  // Abdominaux
  { id: 'crunch', name: 'Crunch', muscle_group: 'abdos', category: 'bodyweight' },
  { id: 'planche', name: 'Planche', muscle_group: 'abdos', category: 'bodyweight' },
  { id: 'relevé_jambes', name: 'Relevé de jambes', muscle_group: 'abdos', category: 'bodyweight' },
  { id: 'russian_twist', name: 'Russian twist', muscle_group: 'abdos', category: 'bodyweight' },
  { id: 'mountain_climbers', name: 'Mountain climbers', muscle_group: 'abdos', category: 'bodyweight' },
  { id: 'abs_wheel', name: 'Roue abdominale', muscle_group: 'abdos', category: 'equipment' },
  { id: 'cable_crunch', name: 'Crunch à la poulie', muscle_group: 'abdos', category: 'cable' },

  // Avant-bras
  { id: 'curl_poignet', name: 'Curl poignet', muscle_group: 'avant_bras', category: 'isolation' },
  { id: 'curl_inverse', name: 'Curl inversé', muscle_group: 'avant_bras', category: 'isolation' },
  { id: 'farmers_walk', name: 'Farmers walk', muscle_group: 'avant_bras', category: 'functional' },
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
