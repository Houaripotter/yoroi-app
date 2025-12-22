// ============================================
// 🩺 YOROI MEDIC - ZONES SPORTIFS
// ============================================
// Zones simplifiées pour sportifs (32 zones)
// Pas de termes médicaux techniques, juste ce que les sportifs connaissent
// Coordonnées calibrées sur image anatomique réelle

export interface BodyZone {
  id: string;
  name: string;
  x: number; // Position X en % (0-100)
  y: number; // Position Y en % (0-100)
  radius: number; // Rayon de la zone en %
  injuries?: string[]; // Blessures courantes
}

// ============================================
// VUE DE FACE (18 zones)
// ============================================

export const BODY_ZONES_FRONT: BodyZone[] = [
  // TÊTE & COU
  {
    id: 'head',
    name: 'Tête',
    x: 50, y: 8,
    radius: 5,
    injuries: ['Commotion', 'Coupure', 'Contusion']
  },
  {
    id: 'neck',
    name: 'Cou',
    x: 50, y: 14,
    radius: 3,
    injuries: ['Torticolis', 'Contracture', 'Cervicales']
  },

  // ÉPAULES
  {
    id: 'shoulder_right',
    name: 'Épaule droite',
    x: 28, y: 18,
    radius: 5,
    injuries: ['Luxation', 'Tendinite', 'Bursite', 'Contusion']
  },
  {
    id: 'shoulder_left',
    name: 'Épaule gauche',
    x: 72, y: 18,
    radius: 5,
    injuries: ['Luxation', 'Tendinite', 'Bursite', 'Contusion']
  },

  // BICEPS
  {
    id: 'biceps_right',
    name: 'Biceps droit',
    x: 22, y: 26,
    radius: 4,
    injuries: ['Contracture', 'Élongation', 'Déchirure']
  },
  {
    id: 'biceps_left',
    name: 'Biceps gauche',
    x: 78, y: 26,
    radius: 4,
    injuries: ['Contracture', 'Élongation', 'Déchirure']
  },

  // COUDES (Tennis elbow / Golf elbow)
  {
    id: 'elbow_right',
    name: 'Coude droit',
    x: 18, y: 34,
    radius: 4,
    injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Contusion']
  },
  {
    id: 'elbow_left',
    name: 'Coude gauche',
    x: 82, y: 34,
    radius: 4,
    injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Contusion']
  },

  // AVANT-BRAS
  {
    id: 'forearm_right',
    name: 'Avant-bras droit',
    x: 15, y: 40,
    radius: 3,
    injuries: ['Tendinite', 'Contracture', 'Contusion']
  },
  {
    id: 'forearm_left',
    name: 'Avant-bras gauche',
    x: 85, y: 40,
    radius: 3,
    injuries: ['Tendinite', 'Contracture', 'Contusion']
  },

  // POIGNETS
  {
    id: 'wrist_right',
    name: 'Poignet droit',
    x: 12, y: 46,
    radius: 3,
    injuries: ['Entorse', 'Tendinite', 'Fracture']
  },
  {
    id: 'wrist_left',
    name: 'Poignet gauche',
    x: 88, y: 46,
    radius: 3,
    injuries: ['Entorse', 'Tendinite', 'Fracture']
  },

  // MAINS & DOIGTS
  {
    id: 'hand_right',
    name: 'Main droite',
    x: 10, y: 52,
    radius: 4,
    injuries: ['Entorse doigt', 'Luxation', 'Fracture', 'Contusion']
  },
  {
    id: 'hand_left',
    name: 'Main gauche',
    x: 90, y: 52,
    radius: 4,
    injuries: ['Entorse doigt', 'Luxation', 'Fracture', 'Contusion']
  },

  // PECTORAUX
  {
    id: 'pec_right',
    name: 'Pectoral droit',
    x: 40, y: 22,
    radius: 5,
    injuries: ['Contracture', 'Déchirure', 'Contusion']
  },
  {
    id: 'pec_left',
    name: 'Pectoral gauche',
    x: 60, y: 22,
    radius: 5,
    injuries: ['Contracture', 'Déchirure', 'Contusion']
  },

  // CÔTES
  {
    id: 'ribs_right',
    name: 'Côtes droites',
    x: 35, y: 30,
    radius: 4,
    injuries: ['Contusion', 'Fissure', 'Fracture']
  },
  {
    id: 'ribs_left',
    name: 'Côtes gauches',
    x: 65, y: 30,
    radius: 4,
    injuries: ['Contusion', 'Fissure', 'Fracture']
  },

  // ABDOMINAUX
  {
    id: 'abs',
    name: 'Abdominaux',
    x: 50, y: 35,
    radius: 6,
    injuries: ['Contracture', 'Déchirure', 'Contusion']
  },

  // HANCHES
  {
    id: 'hip_right',
    name: 'Hanche droite',
    x: 38, y: 45,
    radius: 4,
    injuries: ['Tendinite', 'Bursite', 'Contusion']
  },
  {
    id: 'hip_left',
    name: 'Hanche gauche',
    x: 62, y: 45,
    radius: 4,
    injuries: ['Tendinite', 'Bursite', 'Contusion']
  },

  // AINE / ADDUCTEURS (pubalgie très courante)
  {
    id: 'groin_right',
    name: 'Aine droite',
    x: 44, y: 50,
    radius: 4,
    injuries: ['Pubalgie', 'Élongation adducteurs', 'Tendinite']
  },
  {
    id: 'groin_left',
    name: 'Aine gauche',
    x: 56, y: 50,
    radius: 4,
    injuries: ['Pubalgie', 'Élongation adducteurs', 'Tendinite']
  },

  // QUADRICEPS
  {
    id: 'quad_right',
    name: 'Quadriceps droit',
    x: 42, y: 58,
    radius: 5,
    injuries: ['Contracture', 'Élongation', 'Déchirure', 'Contusion']
  },
  {
    id: 'quad_left',
    name: 'Quadriceps gauche',
    x: 58, y: 58,
    radius: 5,
    injuries: ['Contracture', 'Élongation', 'Déchirure', 'Contusion']
  },

  // GENOUX (blessure #1 en sport)
  {
    id: 'knee_right',
    name: 'Genou droit',
    x: 42, y: 70,
    radius: 4,
    injuries: ['Entorse LCA', 'Entorse LCL', 'Ménisque', 'Tendinite rotulienne']
  },
  {
    id: 'knee_left',
    name: 'Genou gauche',
    x: 58, y: 70,
    radius: 4,
    injuries: ['Entorse LCA', 'Entorse LCL', 'Ménisque', 'Tendinite rotulienne']
  },

  // TIBIAS (périostite / shin splints)
  {
    id: 'shin_right',
    name: 'Tibia droit',
    x: 43, y: 78,
    radius: 4,
    injuries: ['Périostite (shin splints)', 'Contusion', 'Fracture de fatigue']
  },
  {
    id: 'shin_left',
    name: 'Tibia gauche',
    x: 57, y: 78,
    radius: 4,
    injuries: ['Périostite (shin splints)', 'Contusion', 'Fracture de fatigue']
  },

  // CHEVILLES (blessure #2 en sport)
  {
    id: 'ankle_right',
    name: 'Cheville droite',
    x: 43, y: 88,
    radius: 3,
    injuries: ['Entorse', 'Tendinite', 'Fracture']
  },
  {
    id: 'ankle_left',
    name: 'Cheville gauche',
    x: 57, y: 88,
    radius: 3,
    injuries: ['Entorse', 'Tendinite', 'Fracture']
  },

  // PIEDS
  {
    id: 'foot_right',
    name: 'Pied droit',
    x: 43, y: 94,
    radius: 4,
    injuries: ['Fasciite plantaire', 'Entorse', 'Fracture orteil']
  },
  {
    id: 'foot_left',
    name: 'Pied gauche',
    x: 57, y: 94,
    radius: 4,
    injuries: ['Fasciite plantaire', 'Entorse', 'Fracture orteil']
  },
];

// ============================================
// VUE DE DOS (14 zones)
// ============================================

export const BODY_ZONES_BACK: BodyZone[] = [
  // NUQUE & TRAPÈZES
  {
    id: 'neck_back',
    name: 'Nuque',
    x: 50, y: 12,
    radius: 4,
    injuries: ['Torticolis', 'Contracture', 'Raideur']
  },
  {
    id: 'trap_right',
    name: 'Trapèze droit',
    x: 38, y: 18,
    radius: 5,
    injuries: ['Contracture', 'Tension', 'Trigger point']
  },
  {
    id: 'trap_left',
    name: 'Trapèze gauche',
    x: 62, y: 18,
    radius: 5,
    injuries: ['Contracture', 'Tension', 'Trigger point']
  },

  // ÉPAULES ARRIÈRE
  {
    id: 'shoulder_back_right',
    name: 'Épaule arrière droite',
    x: 28, y: 20,
    radius: 4,
    injuries: ['Tendinite', 'Bursite', 'Contusion']
  },
  {
    id: 'shoulder_back_left',
    name: 'Épaule arrière gauche',
    x: 72, y: 20,
    radius: 4,
    injuries: ['Tendinite', 'Bursite', 'Contusion']
  },

  // TRICEPS
  {
    id: 'triceps_right',
    name: 'Triceps droit',
    x: 22, y: 28,
    radius: 4,
    injuries: ['Contracture', 'Tendinite', 'Élongation']
  },
  {
    id: 'triceps_left',
    name: 'Triceps gauche',
    x: 78, y: 28,
    radius: 4,
    injuries: ['Contracture', 'Tendinite', 'Élongation']
  },

  // HAUT DU DOS
  {
    id: 'upper_back_right',
    name: 'Haut du dos droit',
    x: 40, y: 26,
    radius: 5,
    injuries: ['Contracture', 'Point douloureux', 'Tension']
  },
  {
    id: 'upper_back_left',
    name: 'Haut du dos gauche',
    x: 60, y: 26,
    radius: 5,
    injuries: ['Contracture', 'Point douloureux', 'Tension']
  },

  // DORSAUX (grand dorsal)
  {
    id: 'lat_right',
    name: 'Dorsal droit',
    x: 35, y: 34,
    radius: 5,
    injuries: ['Contracture', 'Élongation', 'Déchirure']
  },
  {
    id: 'lat_left',
    name: 'Dorsal gauche',
    x: 65, y: 34,
    radius: 5,
    injuries: ['Contracture', 'Élongation', 'Déchirure']
  },

  // LOMBAIRES (blessure très courante)
  {
    id: 'lower_back',
    name: 'Lombaires',
    x: 50, y: 42,
    radius: 6,
    injuries: ['Lumbago', 'Hernie discale', 'Contracture', 'Sciatique']
  },

  // FESSIERS
  {
    id: 'glute_right',
    name: 'Fessier droit',
    x: 42, y: 52,
    radius: 5,
    injuries: ['Contracture', 'Syndrome piriforme', 'Contusion']
  },
  {
    id: 'glute_left',
    name: 'Fessier gauche',
    x: 58, y: 52,
    radius: 5,
    injuries: ['Contracture', 'Syndrome piriforme', 'Contusion']
  },

  // ISCHIO-JAMBIERS (blessure TRÈS courante)
  {
    id: 'hamstring_right',
    name: 'Ischio-jambier droit',
    x: 42, y: 62,
    radius: 5,
    injuries: ['Élongation', 'Déchirure', 'Claquage', 'Contracture']
  },
  {
    id: 'hamstring_left',
    name: 'Ischio-jambier gauche',
    x: 58, y: 62,
    radius: 5,
    injuries: ['Élongation', 'Déchirure', 'Claquage', 'Contracture']
  },

  // CREUX POPLITÉ (arrière du genou)
  {
    id: 'knee_back_right',
    name: 'Arrière genou droit',
    x: 42, y: 72,
    radius: 3,
    injuries: ['Kyste poplité', 'Tendinite', 'Raideur']
  },
  {
    id: 'knee_back_left',
    name: 'Arrière genou gauche',
    x: 58, y: 72,
    radius: 3,
    injuries: ['Kyste poplité', 'Tendinite', 'Raideur']
  },

  // MOLLETS (claquage très courant)
  {
    id: 'calf_right',
    name: 'Mollet droit',
    x: 42, y: 80,
    radius: 4,
    injuries: ['Contracture', 'Claquage', 'Déchirure', 'Crampe']
  },
  {
    id: 'calf_left',
    name: 'Mollet gauche',
    x: 58, y: 80,
    radius: 4,
    injuries: ['Contracture', 'Claquage', 'Déchirure', 'Crampe']
  },

  // TENDON D'ACHILLE (blessure grave)
  {
    id: 'achilles_right',
    name: "Tendon d'Achille droit",
    x: 42, y: 88,
    radius: 3,
    injuries: ['Tendinite', 'Rupture partielle', 'Rupture totale']
  },
  {
    id: 'achilles_left',
    name: "Tendon d'Achille gauche",
    x: 58, y: 88,
    radius: 3,
    injuries: ['Tendinite', 'Rupture partielle', 'Rupture totale']
  },

  // TALONS
  {
    id: 'heel_right',
    name: 'Talon droit',
    x: 42, y: 94,
    radius: 3,
    injuries: ['Épine calcanéenne', 'Contusion', 'Fasciite']
  },
  {
    id: 'heel_left',
    name: 'Talon gauche',
    x: 58, y: 94,
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
