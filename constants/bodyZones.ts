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
  size: number; // Taille de la zone en %
  injuries?: string[]; // Blessures courantes
}

// ============================================
// VUE DE FACE - COORDONNÉES CALIBRÉES MANUELLEMENT
// ============================================

export const BODY_ZONES_FRONT: BodyZone[] = [
  { id: 'head', name: 'Tête / Visage', x: 50, y: 6, size: 12, injuries: ['Commotion', 'Coupure', 'Contusion'] },
  { id: 'neck', name: 'Cou', x: 50, y: 15, size: 10, injuries: ['Torticolis', 'Contracture', 'Cervicales'] },
  { id: 'shoulder_l', name: 'Épaule G', x: 74, y: 20, size: 12, injuries: ['Luxation', 'Tendinite', 'Bursite', 'Contusion'] },
  { id: 'shoulder_r', name: 'Épaule D', x: 26, y: 20, size: 12, injuries: ['Luxation', 'Tendinite', 'Bursite', 'Contusion'] },
  { id: 'chest', name: 'Thorax / Pectoraux', x: 50, y: 26, size: 18, injuries: ['Contracture', 'Déchirure', 'Contusion', 'Fissure'] },
  { id: 'arm_l', name: 'Bras G', x: 82, y: 32, size: 10, injuries: ['Contracture', 'Élongation', 'Déchirure'] },
  { id: 'arm_r', name: 'Bras D', x: 18, y: 32, size: 10, injuries: ['Contracture', 'Élongation', 'Déchirure'] },
  { id: 'abdomen', name: 'Abdomen', x: 50, y: 40, size: 14, injuries: ['Contracture', 'Déchirure', 'Contusion'] },
  { id: 'elbow_l', name: 'Coude G', x: 85, y: 42, size: 8, injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Contusion'] },
  { id: 'elbow_r', name: 'Coude D', x: 15, y: 42, size: 8, injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Contusion'] },
  { id: 'forearm_l', name: 'Avant-bras G', x: 90, y: 52, size: 8, injuries: ['Tendinite', 'Contracture', 'Contusion'] },
  { id: 'forearm_r', name: 'Avant-bras D', x: 10, y: 52, size: 8, injuries: ['Tendinite', 'Contracture', 'Contusion'] },
  { id: 'pubis', name: 'Pubis / Bassin', x: 50, y: 53, size: 14, injuries: ['Pubalgie', 'Tendinite', 'Bursite'] },

  // MAINS DÉTAILLÉES (zones qui se chevauchent)
  { id: 'wrist_l', name: 'Poignet G', x: 90, y: 57, size: 7, injuries: ['Entorse', 'Tendinite', 'Syndrome canal carpien', 'Fracture'] },
  { id: 'wrist_r', name: 'Poignet D', x: 10, y: 57, size: 7, injuries: ['Entorse', 'Tendinite', 'Syndrome canal carpien', 'Fracture'] },
  { id: 'hand_l', name: 'Main G', x: 92, y: 62, size: 9, injuries: ['Entorse doigt', 'Luxation', 'Fracture', 'Contusion'] },
  { id: 'hand_r', name: 'Main D', x: 8, y: 62, size: 9, injuries: ['Entorse doigt', 'Luxation', 'Fracture', 'Contusion'] },
  { id: 'thumb_l', name: 'Pouce G', x: 94, y: 64, size: 5, injuries: ['Entorse', 'Luxation', 'Fracture', 'Contusion'] },
  { id: 'thumb_r', name: 'Pouce D', x: 6, y: 64, size: 5, injuries: ['Entorse', 'Luxation', 'Fracture', 'Contusion'] },
  { id: 'fingers_l', name: 'Doigts G', x: 92, y: 66, size: 6, injuries: ['Entorse', 'Luxation', 'Fracture', 'Coupure'] },
  { id: 'fingers_r', name: 'Doigts D', x: 8, y: 66, size: 6, injuries: ['Entorse', 'Luxation', 'Fracture', 'Coupure'] },

  { id: 'thigh_l', name: 'Cuisse G', x: 62, y: 65, size: 12, injuries: ['Contracture', 'Élongation', 'Déchirure', 'Contusion'] },
  { id: 'thigh_r', name: 'Cuisse D', x: 38, y: 65, size: 12, injuries: ['Contracture', 'Élongation', 'Déchirure', 'Contusion'] },
  { id: 'knee_l', name: 'Genou G', x: 63, y: 78, size: 9, injuries: ['Entorse LCA', 'Entorse LCL', 'Ménisque', 'Tendinite rotulienne'] },
  { id: 'knee_r', name: 'Genou D', x: 37, y: 78, size: 9, injuries: ['Entorse LCA', 'Entorse LCL', 'Ménisque', 'Tendinite rotulienne'] },
  { id: 'shin_l', name: 'Tibia G', x: 64, y: 88, size: 9, injuries: ['Périostite (shin splints)', 'Contusion', 'Fracture de fatigue'] },
  { id: 'shin_r', name: 'Tibia D', x: 36, y: 88, size: 9, injuries: ['Périostite (shin splints)', 'Contusion', 'Fracture de fatigue'] },

  // PIEDS DÉTAILLÉS (zones qui se chevauchent)
  { id: 'ankle_l', name: 'Cheville G', x: 65, y: 92, size: 7, injuries: ['Entorse', 'Fracture', 'Tendinite', 'Contusion'] },
  { id: 'ankle_r', name: 'Cheville D', x: 35, y: 92, size: 7, injuries: ['Entorse', 'Fracture', 'Tendinite', 'Contusion'] },
  { id: 'foot_l', name: 'Pied G', x: 66, y: 96, size: 8, injuries: ['Fasciite plantaire', 'Entorse', 'Fracture orteil'] },
  { id: 'foot_r', name: 'Pied D', x: 34, y: 96, size: 8, injuries: ['Fasciite plantaire', 'Entorse', 'Fracture orteil'] },
  { id: 'toes_l', name: 'Orteils G', x: 66, y: 98, size: 5, injuries: ['Fracture', 'Luxation', 'Ongle incarné', 'Contusion'] },
  { id: 'toes_r', name: 'Orteils D', x: 34, y: 98, size: 5, injuries: ['Fracture', 'Luxation', 'Ongle incarné', 'Contusion'] },
];

// ============================================
// VUE DE DOS - COORDONNÉES CALIBRÉES MANUELLEMENT
// ============================================

export const BODY_ZONES_BACK: BodyZone[] = [
  { id: 'head_back', name: 'Crâne (Arr)', x: 50, y: 7, size: 12, injuries: ['Commotion', 'Coupure', 'Contusion'] },
  { id: 'neck_back', name: 'Nuque', x: 50, y: 15, size: 10, injuries: ['Torticolis', 'Contracture', 'Raideur'] },
  { id: 'scapula_l', name: 'Omoplate G', x: 30, y: 25, size: 12, injuries: ['Contracture', 'Tension', 'Point douloureux'] },
  { id: 'scapula_r', name: 'Omoplate D', x: 70, y: 25, size: 12, injuries: ['Contracture', 'Tension', 'Point douloureux'] },
  { id: 'spine_upper', name: 'Colonne Thoracique', x: 50, y: 30, size: 10, injuries: ['Contracture', 'Tension', 'Point douloureux'] },
  { id: 'spine_lower', name: 'Lombaires', x: 50, y: 45, size: 12, injuries: ['Lumbago', 'Hernie discale', 'Contracture', 'Sciatique'] },
  { id: 'elbow_back_l', name: 'Coude G', x: 12, y: 42, size: 9, injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Contusion'] },
  { id: 'elbow_back_r', name: 'Coude D', x: 88, y: 42, size: 9, injuries: ['Tennis elbow', 'Golf elbow', 'Bursite', 'Contusion'] },
  { id: 'glute_l', name: 'Fessier G', x: 38, y: 55, size: 12, injuries: ['Contracture', 'Syndrome piriforme', 'Contusion'] },
  { id: 'glute_r', name: 'Fessier D', x: 62, y: 55, size: 12, injuries: ['Contracture', 'Syndrome piriforme', 'Contusion'] },
  { id: 'hamstring_l', name: 'Ischio G', x: 38, y: 68, size: 10, injuries: ['Élongation', 'Déchirure', 'Claquage', 'Contracture'] },
  { id: 'hamstring_r', name: 'Ischio D', x: 62, y: 68, size: 10, injuries: ['Élongation', 'Déchirure', 'Claquage', 'Contracture'] },
  { id: 'calf_l', name: 'Mollet G', x: 37, y: 82, size: 10, injuries: ['Contracture', 'Claquage', 'Déchirure', 'Crampe'] },
  { id: 'calf_r', name: 'Mollet D', x: 63, y: 82, size: 10, injuries: ['Contracture', 'Claquage', 'Déchirure', 'Crampe'] },

  // MAINS DOS (zones qui se chevauchent)
  { id: 'wrist_back_l', name: 'Poignet G (Dos)', x: 8, y: 57, size: 7, injuries: ['Entorse', 'Tendinite', 'Contusion'] },
  { id: 'wrist_back_r', name: 'Poignet D (Dos)', x: 92, y: 57, size: 7, injuries: ['Entorse', 'Tendinite', 'Contusion'] },
  { id: 'hand_back_l', name: 'Main G (Dos)', x: 6, y: 62, size: 8, injuries: ['Contusion', 'Fracture', 'Luxation'] },
  { id: 'hand_back_r', name: 'Main D (Dos)', x: 94, y: 62, size: 8, injuries: ['Contusion', 'Fracture', 'Luxation'] },

  // PIEDS DOS (zones qui se chevauchent)
  { id: 'ankle_back_l', name: 'Cheville G (Dos)', x: 35, y: 92, size: 7, injuries: ['Entorse', 'Tendon Achille'] },
  { id: 'ankle_back_r', name: 'Cheville D (Dos)', x: 65, y: 92, size: 7, injuries: ['Entorse', 'Tendon Achille'] },
  { id: 'heel_l', name: 'Talon G', x: 35, y: 95, size: 8, injuries: ['Épine calcanéenne', 'Contusion', 'Fasciite'] },
  { id: 'heel_r', name: 'Talon D', x: 65, y: 95, size: 8, injuries: ['Épine calcanéenne', 'Contusion', 'Fasciite'] },
];

// ============================================
// TYPES DE DOULEUR
// ============================================

export type PainType = 'acute' | 'dull' | 'burning' | 'tingling' | 'stiffness' | 'cramping';

export const PAIN_TYPES: { id: PainType; label: string; icon: string }[] = [
  { id: 'acute', label: 'Aiguë', icon: 'Zap' },
  { id: 'dull', label: 'Sourde', icon: 'Waves' },
  { id: 'burning', label: 'Brûlure', icon: 'Flame' },
  { id: 'tingling', label: 'Picotement', icon: 'Sparkles' },
  { id: 'stiffness', label: 'Raideur', icon: 'Lock' },
  { id: 'cramping', label: 'Crampe', icon: 'AlertCircle' },
];

// ============================================
// CAUSES DE BLESSURE
// ============================================

export type InjuryCause = 'training' | 'impact' | 'overuse' | 'bad_movement' | 'unknown';

export const INJURY_CAUSES: { id: InjuryCause; label: string; icon: string }[] = [
  { id: 'training', label: 'Entraînement', icon: 'Dumbbell' },
  { id: 'impact', label: 'Choc/Impact', icon: 'Swords' },
  { id: 'overuse', label: 'Surmenage', icon: 'AlertTriangle' },
  { id: 'bad_movement', label: 'Faux mouvement', icon: 'RotateCcw' },
  { id: 'unknown', label: 'Inconnue', icon: 'HelpCircle' },
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
  { id: 'rest', label: 'Repos', icon: 'Bed' },
  { id: 'ice', label: 'Glaçage', icon: 'Snowflake' },
  { id: 'heat', label: 'Chaleur', icon: 'Flame' },
  { id: 'compression', label: 'Compression', icon: 'CircleDot' },
  { id: 'elevation', label: 'Élévation', icon: 'ArrowUp' },
  { id: 'stretch', label: 'Étirements', icon: 'Move' },
  { id: 'medication', label: 'Anti-inflammatoire', icon: 'Pill' },
  { id: 'physio', label: 'Kiné', icon: 'Stethoscope' },
  { id: 'massage', label: 'Massage', icon: 'Hand' },
  { id: 'custom', label: 'Personnalisé', icon: 'Edit3' },
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

// Détecter les zones qui se chevauchent à un point donné (x, y en %)
export const getZonesAtPoint = (x: number, y: number, view: 'front' | 'back'): BodyZone[] => {
  const zones = view === 'front' ? BODY_ZONES_FRONT : BODY_ZONES_BACK;
  return zones.filter(zone => {
    // Calculer le rayon de la zone
    const radius = zone.size / 2;

    // Calculer la distance entre le point cliqué et le centre de la zone
    const dx = x - zone.x;
    const dy = y - zone.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Vérifier si le point est dans la zone (avec une petite tolérance)
    return distance <= radius + 2; // +2% de tolérance
  });
};
