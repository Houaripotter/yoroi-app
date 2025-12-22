// ============================================
// 🩺 YOROI MEDIC - ZONES CORPORELLES
// ============================================
// Coordonnées EXACTES calibrées sur l'image anatomique
// Le corps occupe 25-75% de la largeur de l'image
// Centre du corps = 50%

export interface BodyZone {
  id: string;
  name: string;
  x: number; // Position X en % (0-100)
  y: number; // Position Y en % (0-100)
  radius: number; // Rayon de la zone en %
  injuries?: string[]; // Blessures courantes
}

// ============================================
// VUE DE FACE - COORDONNÉES CALIBRÉES
// ============================================

export const BODY_ZONES_FRONT: BodyZone[] = [
  // ============================================
  // TÊTE
  // ============================================
  {
    id: 'head',
    name: 'Tête',
    x: 50,   // Centre
    y: 6,    // Haut de la tête
    radius: 4,
    injuries: ['Commotion', 'Coupure', 'Contusion']
  },

  // ============================================
  // COU
  // ============================================
  {
    id: 'neck',
    name: 'Cou',
    x: 50,   // Centre
    y: 12,   // Sous la tête
    radius: 3,
    injuries: ['Torticolis', 'Contracture', 'Cervicales']
  },

  // ============================================
  // ÉPAULES
  // ============================================
  {
    id: 'shoulder_left',
    name: 'Épaule gauche',
    x: 35,   // Gauche du corps
    y: 16,   // Niveau des épaules
    radius: 4,
    injuries: ['Luxation', 'Tendinite', 'Bursite', 'Contusion']
  },
  {
    id: 'shoulder_right',
    name: 'Épaule droite',
    x: 65,   // Droite du corps
    y: 16,
    radius: 4,
    injuries: ['Luxation', 'Tendinite', 'Bursite', 'Contusion']
  },

  // ============================================
  // PECTORAUX
  // ============================================
  {
    id: 'pec_left',
    name: 'Pectoral gauche',
    x: 42,   // Sur le pec gauche
    y: 20,   // Niveau des pecs
    radius: 4,
    injuries: ['Contracture', 'Déchirure', 'Contusion']
  },
  {
    id: 'pec_right',
    name: 'Pectoral droit',
    x: 58,   // Sur le pec droit
    y: 20,
    radius: 4,
    injuries: ['Contracture', 'Déchirure', 'Contusion']
  },

  // ============================================
  // BICEPS
  // ============================================
  {
    id: 'biceps_left',
    name: 'Biceps gauche',
    x: 30,   // Sur le bras gauche
    y: 24,   // Niveau biceps
    radius: 3,
    injuries: ['Contracture', 'Élongation', 'Déchirure']
  },
  {
    id: 'biceps_right',
    name: 'Biceps droit',
    x: 70,   // Sur le bras droit
    y: 24,
    radius: 3,
    injuries: ['Contracture', 'Élongation', 'Déchirure']
  },

  // ============================================
  // CÔTES
  // ============================================
  {
    id: 'ribs_left',
    name: 'Côtes gauches',
    x: 38,
    y: 27,
    radius: 3,
    injuries: ['Contusion', 'Fissure', 'Fracture']
  },
  {
    id: 'ribs_right',
    name: 'Côtes droites',
    x: 62,
    y: 27,
    radius: 3,
    injuries: ['Contusion', 'Fissure', 'Fracture']
  },

  // ============================================
  // COUDES
  // ============================================
  {
    id: 'elbow_left',
    name: 'Coude gauche',
    x: 26,   // Coude gauche
    y: 32,   // Niveau coude
    radius: 3,
    injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Contusion']
  },
  {
    id: 'elbow_right',
    name: 'Coude droit',
    x: 74,
    y: 32,
    radius: 3,
    injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Contusion']
  },

  // ============================================
  // ABDOMINAUX
  // ============================================
  {
    id: 'abs',
    name: 'Abdominaux',
    x: 50,   // Centre
    y: 33,   // Sous les pecs
    radius: 5,
    injuries: ['Contracture', 'Déchirure', 'Contusion']
  },

  // ============================================
  // AVANT-BRAS
  // ============================================
  {
    id: 'forearm_left',
    name: 'Avant-bras gauche',
    x: 23,
    y: 38,
    radius: 3,
    injuries: ['Tendinite', 'Contracture', 'Contusion']
  },
  {
    id: 'forearm_right',
    name: 'Avant-bras droit',
    x: 77,
    y: 38,
    radius: 3,
    injuries: ['Tendinite', 'Contracture', 'Contusion']
  },

  // ============================================
  // HANCHES
  // ============================================
  {
    id: 'hip_left',
    name: 'Hanche gauche',
    x: 40,
    y: 42,
    radius: 3,
    injuries: ['Tendinite', 'Bursite', 'Contusion']
  },
  {
    id: 'hip_right',
    name: 'Hanche droite',
    x: 60,
    y: 42,
    radius: 3,
    injuries: ['Tendinite', 'Bursite', 'Contusion']
  },

  // ============================================
  // POIGNETS
  // ============================================
  {
    id: 'wrist_left',
    name: 'Poignet gauche',
    x: 20,
    y: 44,
    radius: 2,
    injuries: ['Entorse', 'Tendinite', 'Fracture']
  },
  {
    id: 'wrist_right',
    name: 'Poignet droit',
    x: 80,
    y: 44,
    radius: 2,
    injuries: ['Entorse', 'Tendinite', 'Fracture']
  },

  // ============================================
  // AINES / ADDUCTEURS
  // ============================================
  {
    id: 'groin_left',
    name: 'Aine gauche',
    x: 45,
    y: 47,
    radius: 3,
    injuries: ['Pubalgie', 'Élongation adducteurs', 'Tendinite']
  },
  {
    id: 'groin_right',
    name: 'Aine droite',
    x: 55,
    y: 47,
    radius: 3,
    injuries: ['Pubalgie', 'Élongation adducteurs', 'Tendinite']
  },

  // ============================================
  // MAINS
  // ============================================
  {
    id: 'hand_left',
    name: 'Main gauche',
    x: 18,
    y: 50,
    radius: 3,
    injuries: ['Entorse doigt', 'Luxation', 'Fracture', 'Contusion']
  },
  {
    id: 'hand_right',
    name: 'Main droite',
    x: 82,
    y: 50,
    radius: 3,
    injuries: ['Entorse doigt', 'Luxation', 'Fracture', 'Contusion']
  },

  // ============================================
  // QUADRICEPS
  // ============================================
  {
    id: 'quad_left',
    name: 'Quadriceps gauche',
    x: 43,
    y: 55,
    radius: 4,
    injuries: ['Contracture', 'Élongation', 'Déchirure', 'Contusion']
  },
  {
    id: 'quad_right',
    name: 'Quadriceps droit',
    x: 57,
    y: 55,
    radius: 4,
    injuries: ['Contracture', 'Élongation', 'Déchirure', 'Contusion']
  },

  // ============================================
  // GENOUX
  // ============================================
  {
    id: 'knee_left',
    name: 'Genou gauche',
    x: 43,
    y: 66,
    radius: 3,
    injuries: ['Entorse LCA', 'Entorse LCL', 'Ménisque', 'Tendinite rotulienne']
  },
  {
    id: 'knee_right',
    name: 'Genou droit',
    x: 57,
    y: 66,
    radius: 3,
    injuries: ['Entorse LCA', 'Entorse LCL', 'Ménisque', 'Tendinite rotulienne']
  },

  // ============================================
  // TIBIAS
  // ============================================
  {
    id: 'shin_left',
    name: 'Tibia gauche',
    x: 44,
    y: 75,
    radius: 3,
    injuries: ['Périostite (shin splints)', 'Contusion', 'Fracture de fatigue']
  },
  {
    id: 'shin_right',
    name: 'Tibia droit',
    x: 56,
    y: 75,
    radius: 3,
    injuries: ['Périostite (shin splints)', 'Contusion', 'Fracture de fatigue']
  },

  // ============================================
  // CHEVILLES
  // ============================================
  {
    id: 'ankle_left',
    name: 'Cheville gauche',
    x: 44,
    y: 85,
    radius: 2,
    injuries: ['Entorse', 'Tendinite', 'Fracture']
  },
  {
    id: 'ankle_right',
    name: 'Cheville droite',
    x: 56,
    y: 85,
    radius: 2,
    injuries: ['Entorse', 'Tendinite', 'Fracture']
  },

  // ============================================
  // PIEDS
  // ============================================
  {
    id: 'foot_left',
    name: 'Pied gauche',
    x: 44,
    y: 92,
    radius: 3,
    injuries: ['Fasciite plantaire', 'Entorse', 'Fracture orteil']
  },
  {
    id: 'foot_right',
    name: 'Pied droit',
    x: 56,
    y: 92,
    radius: 3,
    injuries: ['Fasciite plantaire', 'Entorse', 'Fracture orteil']
  },
];

// ============================================
// VUE DE DOS - COORDONNÉES CALIBRÉES
// ============================================

export const BODY_ZONES_BACK: BodyZone[] = [
  // ============================================
  // TÊTE (arrière)
  // ============================================
  {
    id: 'head_back',
    name: 'Tête',
    x: 50,
    y: 6,
    radius: 4,
    injuries: ['Commotion', 'Coupure', 'Contusion']
  },

  // ============================================
  // NUQUE
  // ============================================
  {
    id: 'neck_back',
    name: 'Nuque',
    x: 50,
    y: 12,
    radius: 3,
    injuries: ['Torticolis', 'Contracture', 'Raideur']
  },

  // ============================================
  // TRAPÈZES
  // ============================================
  {
    id: 'trap_left',
    name: 'Trapèze gauche',
    x: 42,
    y: 15,
    radius: 4,
    injuries: ['Contracture', 'Tension', 'Trigger point']
  },
  {
    id: 'trap_right',
    name: 'Trapèze droit',
    x: 58,
    y: 15,
    radius: 4,
    injuries: ['Contracture', 'Tension', 'Trigger point']
  },

  // ============================================
  // ÉPAULES ARRIÈRE
  // ============================================
  {
    id: 'shoulder_back_left',
    name: 'Épaule gauche',
    x: 33,
    y: 17,
    radius: 4,
    injuries: ['Tendinite', 'Bursite', 'Contusion']
  },
  {
    id: 'shoulder_back_right',
    name: 'Épaule droite',
    x: 67,
    y: 17,
    radius: 4,
    injuries: ['Tendinite', 'Bursite', 'Contusion']
  },

  // ============================================
  // HAUT DU DOS (Rhomboïdes)
  // ============================================
  {
    id: 'upper_back_left',
    name: 'Haut du dos gauche',
    x: 42,
    y: 23,
    radius: 4,
    injuries: ['Contracture', 'Point douloureux', 'Tension']
  },
  {
    id: 'upper_back_right',
    name: 'Haut du dos droit',
    x: 58,
    y: 23,
    radius: 4,
    injuries: ['Contracture', 'Point douloureux', 'Tension']
  },

  // ============================================
  // TRICEPS
  // ============================================
  {
    id: 'triceps_left',
    name: 'Triceps gauche',
    x: 28,
    y: 25,
    radius: 3,
    injuries: ['Contracture', 'Tendinite', 'Élongation']
  },
  {
    id: 'triceps_right',
    name: 'Triceps droit',
    x: 72,
    y: 25,
    radius: 3,
    injuries: ['Contracture', 'Tendinite', 'Élongation']
  },

  // ============================================
  // DORSAUX (Grand dorsal)
  // ============================================
  {
    id: 'lat_left',
    name: 'Dorsal gauche',
    x: 38,
    y: 30,
    radius: 4,
    injuries: ['Contracture', 'Élongation', 'Déchirure']
  },
  {
    id: 'lat_right',
    name: 'Dorsal droit',
    x: 62,
    y: 30,
    radius: 4,
    injuries: ['Contracture', 'Élongation', 'Déchirure']
  },

  // ============================================
  // COUDES (arrière)
  // ============================================
  {
    id: 'elbow_back_left',
    name: 'Coude gauche',
    x: 25,
    y: 32,
    radius: 3,
    injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Contusion']
  },
  {
    id: 'elbow_back_right',
    name: 'Coude droit',
    x: 75,
    y: 32,
    radius: 3,
    injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Contusion']
  },

  // ============================================
  // AVANT-BRAS (arrière)
  // ============================================
  {
    id: 'forearm_back_left',
    name: 'Avant-bras gauche',
    x: 22,
    y: 38,
    radius: 3,
    injuries: ['Tendinite', 'Contracture', 'Contusion']
  },
  {
    id: 'forearm_back_right',
    name: 'Avant-bras droit',
    x: 78,
    y: 38,
    radius: 3,
    injuries: ['Tendinite', 'Contracture', 'Contusion']
  },

  // ============================================
  // LOMBAIRES
  // ============================================
  {
    id: 'lower_back',
    name: 'Lombaires',
    x: 50,
    y: 38,
    radius: 5,
    injuries: ['Lumbago', 'Hernie discale', 'Contracture', 'Sciatique']
  },

  // ============================================
  // POIGNETS (arrière)
  // ============================================
  {
    id: 'wrist_back_left',
    name: 'Poignet gauche',
    x: 19,
    y: 44,
    radius: 2,
    injuries: ['Entorse', 'Tendinite', 'Fracture']
  },
  {
    id: 'wrist_back_right',
    name: 'Poignet droit',
    x: 81,
    y: 44,
    radius: 2,
    injuries: ['Entorse', 'Tendinite', 'Fracture']
  },

  // ============================================
  // FESSIERS
  // ============================================
  {
    id: 'glute_left',
    name: 'Fessier gauche',
    x: 43,
    y: 47,
    radius: 4,
    injuries: ['Contracture', 'Syndrome piriforme', 'Contusion']
  },
  {
    id: 'glute_right',
    name: 'Fessier droit',
    x: 57,
    y: 47,
    radius: 4,
    injuries: ['Contracture', 'Syndrome piriforme', 'Contusion']
  },

  // ============================================
  // MAINS (arrière)
  // ============================================
  {
    id: 'hand_back_left',
    name: 'Main gauche',
    x: 17,
    y: 50,
    radius: 3,
    injuries: ['Entorse doigt', 'Luxation', 'Fracture', 'Contusion']
  },
  {
    id: 'hand_back_right',
    name: 'Main droite',
    x: 83,
    y: 50,
    radius: 3,
    injuries: ['Entorse doigt', 'Luxation', 'Fracture', 'Contusion']
  },

  // ============================================
  // ISCHIO-JAMBIERS
  // ============================================
  {
    id: 'hamstring_left',
    name: 'Ischio-jambier gauche',
    x: 43,
    y: 57,
    radius: 4,
    injuries: ['Élongation', 'Déchirure', 'Claquage', 'Contracture']
  },
  {
    id: 'hamstring_right',
    name: 'Ischio-jambier droit',
    x: 57,
    y: 57,
    radius: 4,
    injuries: ['Élongation', 'Déchirure', 'Claquage', 'Contracture']
  },

  // ============================================
  // ARRIÈRE DU GENOU
  // ============================================
  {
    id: 'knee_back_left',
    name: 'Creux poplité gauche',
    x: 43,
    y: 66,
    radius: 3,
    injuries: ['Kyste poplité', 'Tendinite', 'Raideur']
  },
  {
    id: 'knee_back_right',
    name: 'Creux poplité droit',
    x: 57,
    y: 66,
    radius: 3,
    injuries: ['Kyste poplité', 'Tendinite', 'Raideur']
  },

  // ============================================
  // MOLLETS
  // ============================================
  {
    id: 'calf_left',
    name: 'Mollet gauche',
    x: 43,
    y: 74,
    radius: 4,
    injuries: ['Contracture', 'Claquage', 'Déchirure', 'Crampe']
  },
  {
    id: 'calf_right',
    name: 'Mollet droit',
    x: 57,
    y: 74,
    radius: 4,
    injuries: ['Contracture', 'Claquage', 'Déchirure', 'Crampe']
  },

  // ============================================
  // TENDONS D'ACHILLE
  // ============================================
  {
    id: 'achilles_left',
    name: "Tendon d'Achille gauche",
    x: 43,
    y: 84,
    radius: 2,
    injuries: ['Tendinite', 'Rupture partielle', 'Rupture totale']
  },
  {
    id: 'achilles_right',
    name: "Tendon d'Achille droit",
    x: 57,
    y: 84,
    radius: 2,
    injuries: ['Tendinite', 'Rupture partielle', 'Rupture totale']
  },

  // ============================================
  // TALONS
  // ============================================
  {
    id: 'heel_left',
    name: 'Talon gauche',
    x: 43,
    y: 92,
    radius: 3,
    injuries: ['Épine calcanéenne', 'Contusion', 'Fasciite']
  },
  {
    id: 'heel_right',
    name: 'Talon droit',
    x: 57,
    y: 92,
    radius: 3,
    injuries: ['Épine calcanéenne', 'Contusion', 'Fasciite']
  },
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

// Obtenir le nombre total de zones
export const getTotalZonesCount = (): number => {
  return BODY_ZONES_FRONT.length + BODY_ZONES_BACK.length;
};

// Rechercher des zones par nom
export const searchZonesByName = (query: string): BodyZone[] => {
  const allZones = getAllZones();
  const lowerQuery = query.toLowerCase();
  return allZones.filter(zone =>
    zone.name.toLowerCase().includes(lowerQuery)
  );
};
