// ============================================
// 🩺 YOROI MEDIC - ZONES CORPORELLES
// ============================================
// Définition de toutes les zones tactiles du body map

export interface BodyZone {
  id: string;
  name: string;
  x: number; // Position X en % (0-100)
  y: number; // Position Y en % (0-100)
  radius: number; // Rayon de la zone en %
}

// ============================================
// VUE DE FACE (55+ zones)
// ============================================

export const BODY_ZONES_FRONT: BodyZone[] = [
  // TÊTE & COU
  { id: 'head', name: 'Tête', x: 50, y: 4, radius: 6 },
  { id: 'neck_front', name: 'Cou', x: 50, y: 10, radius: 3 },

  // ÉPAULES
  { id: 'shoulder_left', name: 'Épaule gauche', x: 32, y: 14, radius: 5 },
  { id: 'shoulder_right', name: 'Épaule droite', x: 68, y: 14, radius: 5 },

  // BRAS GAUCHE
  { id: 'deltoid_left', name: 'Deltoïde gauche', x: 26, y: 17, radius: 4 },
  { id: 'bicep_left', name: 'Biceps gauche', x: 23, y: 24, radius: 4 },
  { id: 'elbow_left', name: 'Coude gauche', x: 20, y: 32, radius: 3 },
  { id: 'forearm_left', name: 'Avant-bras gauche', x: 17, y: 38, radius: 4 },
  { id: 'wrist_left', name: 'Poignet gauche', x: 14, y: 45, radius: 2 },
  { id: 'hand_left', name: 'Main gauche', x: 12, y: 50, radius: 3 },

  // BRAS DROIT
  { id: 'deltoid_right', name: 'Deltoïde droit', x: 74, y: 17, radius: 4 },
  { id: 'bicep_right', name: 'Biceps droit', x: 77, y: 24, radius: 4 },
  { id: 'elbow_right', name: 'Coude droit', x: 80, y: 32, radius: 3 },
  { id: 'forearm_right', name: 'Avant-bras droit', x: 83, y: 38, radius: 4 },
  { id: 'wrist_right', name: 'Poignet droit', x: 86, y: 45, radius: 2 },
  { id: 'hand_right', name: 'Main droite', x: 88, y: 50, radius: 3 },

  // TORSE
  { id: 'chest_left', name: 'Pectoral gauche', x: 40, y: 20, radius: 5 },
  { id: 'chest_right', name: 'Pectoral droit', x: 60, y: 20, radius: 5 },
  { id: 'sternum', name: 'Sternum', x: 50, y: 22, radius: 3 },
  { id: 'ribs_left', name: 'Côtes gauches', x: 38, y: 28, radius: 4 },
  { id: 'ribs_right', name: 'Côtes droites', x: 62, y: 28, radius: 4 },
  { id: 'abs_upper', name: 'Abdominaux hauts', x: 50, y: 30, radius: 4 },
  { id: 'abs_lower', name: 'Abdominaux bas', x: 50, y: 38, radius: 4 },
  { id: 'oblique_left', name: 'Oblique gauche', x: 40, y: 35, radius: 3 },
  { id: 'oblique_right', name: 'Oblique droit', x: 60, y: 35, radius: 3 },

  // BASSIN
  { id: 'hip_left', name: 'Hanche gauche', x: 38, y: 44, radius: 4 },
  { id: 'hip_right', name: 'Hanche droite', x: 62, y: 44, radius: 4 },
  { id: 'groin_left', name: 'Aine gauche', x: 43, y: 48, radius: 3 },
  { id: 'groin_right', name: 'Aine droite', x: 57, y: 48, radius: 3 },

  // JAMBE GAUCHE
  { id: 'quad_left', name: 'Quadriceps gauche', x: 42, y: 56, radius: 5 },
  { id: 'knee_left', name: 'Genou gauche', x: 42, y: 67, radius: 4 },
  { id: 'shin_left', name: 'Tibia gauche', x: 42, y: 76, radius: 4 },
  { id: 'ankle_left', name: 'Cheville gauche', x: 42, y: 88, radius: 3 },
  { id: 'foot_left', name: 'Pied gauche', x: 42, y: 94, radius: 4 },

  // JAMBE DROITE
  { id: 'quad_right', name: 'Quadriceps droit', x: 58, y: 56, radius: 5 },
  { id: 'knee_right', name: 'Genou droit', x: 58, y: 67, radius: 4 },
  { id: 'shin_right', name: 'Tibia droit', x: 58, y: 76, radius: 4 },
  { id: 'ankle_right', name: 'Cheville droite', x: 58, y: 88, radius: 3 },
  { id: 'foot_right', name: 'Pied droit', x: 58, y: 94, radius: 4 },
];

// ============================================
// VUE DE DOS (55+ zones)
// ============================================

export const BODY_ZONES_BACK: BodyZone[] = [
  // TÊTE & COU
  { id: 'head_back', name: 'Tête (arrière)', x: 50, y: 4, radius: 6 },
  { id: 'neck_back', name: 'Nuque', x: 50, y: 10, radius: 3 },

  // ÉPAULES & HAUT DU DOS
  { id: 'trap_left', name: 'Trapèze gauche', x: 40, y: 14, radius: 5 },
  { id: 'trap_right', name: 'Trapèze droit', x: 60, y: 14, radius: 5 },

  // BRAS (ARRIÈRE)
  { id: 'tricep_left', name: 'Triceps gauche', x: 23, y: 24, radius: 4 },
  { id: 'tricep_right', name: 'Triceps droit', x: 77, y: 24, radius: 4 },

  // DOS
  { id: 'upper_back_left', name: 'Haut du dos gauche', x: 42, y: 22, radius: 5 },
  { id: 'upper_back_right', name: 'Haut du dos droit', x: 58, y: 22, radius: 5 },
  { id: 'spine_upper', name: 'Colonne dorsale', x: 50, y: 20, radius: 3 },
  { id: 'lat_left', name: 'Grand dorsal gauche', x: 38, y: 30, radius: 5 },
  { id: 'lat_right', name: 'Grand dorsal droit', x: 62, y: 30, radius: 5 },
  { id: 'lower_back', name: 'Lombaires', x: 50, y: 40, radius: 5 },
  { id: 'spine_lower', name: 'Bas de la colonne', x: 50, y: 44, radius: 3 },

  // FESSIERS
  { id: 'glute_left', name: 'Fessier gauche', x: 43, y: 50, radius: 5 },
  { id: 'glute_right', name: 'Fessier droit', x: 57, y: 50, radius: 5 },

  // JAMBES (ARRIÈRE)
  { id: 'hamstring_left', name: 'Ischio-jambier gauche', x: 42, y: 60, radius: 5 },
  { id: 'hamstring_right', name: 'Ischio-jambier droit', x: 58, y: 60, radius: 5 },
  { id: 'knee_back_left', name: 'Creux poplité gauche', x: 42, y: 68, radius: 3 },
  { id: 'knee_back_right', name: 'Creux poplité droit', x: 58, y: 68, radius: 3 },
  { id: 'calf_left', name: 'Mollet gauche', x: 42, y: 76, radius: 5 },
  { id: 'calf_right', name: 'Mollet droit', x: 58, y: 76, radius: 5 },
  { id: 'achilles_left', name: "Tendon d'Achille gauche", x: 42, y: 86, radius: 2 },
  { id: 'achilles_right', name: "Tendon d'Achille droit", x: 58, y: 86, radius: 2 },
  { id: 'heel_left', name: 'Talon gauche', x: 42, y: 92, radius: 3 },
  { id: 'heel_right', name: 'Talon droit', x: 58, y: 92, radius: 3 },
];

// ============================================
// TYPES DE DOULEUR
// ============================================

export type PainType = 'acute' | 'dull' | 'burning' | 'tingling' | 'stiffness' | 'cramping';

export const PAIN_TYPES: { id: PainType; label: string; icon: string }[] = [
  { id: 'acute', label: 'Aiguë', icon: '⚡' },
  { id: 'dull', label: 'Sourde', icon: '〰️' },
  { id: 'burning', label: 'Brûlure', icon: '🔥' },
  { id: 'tingling', label: 'Picotement', icon: '✨' },
  { id: 'stiffness', label: 'Raideur', icon: '🔒' },
  { id: 'cramping', label: 'Crampe', icon: '💢' },
];

// ============================================
// CAUSES DE BLESSURE
// ============================================

export type InjuryCause = 'training' | 'impact' | 'overuse' | 'bad_movement' | 'unknown';

export const INJURY_CAUSES: { id: InjuryCause; label: string; icon: string }[] = [
  { id: 'training', label: 'Entraînement', icon: '🥋' },
  { id: 'impact', label: 'Choc/Impact', icon: '💥' },
  { id: 'overuse', label: 'Surmenage', icon: '⚠️' },
  { id: 'bad_movement', label: 'Faux mouvement', icon: '🔄' },
  { id: 'unknown', label: 'Inconnue', icon: '❓' },
];

// ============================================
// TYPES DE TRAITEMENT
// ============================================

export type TreatmentType =
  | 'rest'
  | 'ice'
  | 'heat'
  | 'compression'
  | 'elevation'
  | 'stretch'
  | 'medication'
  | 'physio'
  | 'massage'
  | 'custom';

export const TREATMENT_TYPES: { id: TreatmentType; label: string; icon: string }[] = [
  { id: 'rest', label: 'Repos', icon: '🛌' },
  { id: 'ice', label: 'Glaçage', icon: '🧊' },
  { id: 'heat', label: 'Chaleur', icon: '🔥' },
  { id: 'compression', label: 'Compression', icon: '🩹' },
  { id: 'elevation', label: 'Élévation', icon: '⬆️' },
  { id: 'stretch', label: 'Étirements', icon: '🤸' },
  { id: 'medication', label: 'Anti-inflammatoire', icon: '💊' },
  { id: 'physio', label: 'Kiné', icon: '👨‍⚕️' },
  { id: 'massage', label: 'Massage', icon: '💆' },
  { id: 'custom', label: 'Personnalisé', icon: '✏️' },
];

// ============================================
// STATUT FIT FOR DUTY
// ============================================

export type FitForDutyStatus = 'operational' | 'restricted' | 'unfit';

export interface FitForDutyInfo {
  status: FitForDutyStatus;
  color: string;
  backgroundColor: string;
  icon: string;
  title: string;
  subtitle: string;
  advice: string;
}

export const FIT_FOR_DUTY_STATUS: Record<FitForDutyStatus, FitForDutyInfo> = {
  operational: {
    status: 'operational',
    color: '#4CAF50',
    backgroundColor: '#E8F5E9',
    icon: '🛡️',
    title: 'OPÉRATIONNEL',
    subtitle: 'Aucune restriction',
    advice: 'Vous êtes apte à tous les entraînements',
  },
  restricted: {
    status: 'restricted',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    icon: '⚠️',
    title: 'RESTREINT',
    subtitle: 'Adaptation nécessaire',
    advice: 'Éviter les mouvements impliquant la zone blessée',
  },
  unfit: {
    status: 'unfit',
    color: '#F44336',
    backgroundColor: '#FFEBEE',
    icon: '🚫',
    title: 'INAPTE',
    subtitle: 'Repos forcé recommandé',
    advice: 'Consultation médicale conseillée si douleur > 48h',
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

export const getZoneById = (zoneId: string, view: 'front' | 'back'): BodyZone | undefined => {
  const zones = view === 'front' ? BODY_ZONES_FRONT : BODY_ZONES_BACK;
  return zones.find(z => z.id === zoneId);
};

export const getAllZones = (): BodyZone[] => {
  return [...BODY_ZONES_FRONT, ...BODY_ZONES_BACK];
};
