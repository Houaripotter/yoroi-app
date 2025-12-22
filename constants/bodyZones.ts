// ============================================
// 🩺 YOROI MEDIC - ZONES CORPORELLES
// ============================================
// Définition COMPLÈTE de toutes les zones de blessures sportives
// Positions calibrées sur images anatomiques réelles
// Vue anatomique standard : gauche patient = droite visuelle

export interface BodyZone {
  id: string;
  name: string;
  x: number; // Position X en % (0-100)
  y: number; // Position Y en % (0-100)
  radius: number; // Rayon de la zone en %
}

// ============================================
// VUE DE FACE (80+ zones)
// ============================================

export const BODY_ZONES_FRONT: BodyZone[] = [
  // ============================================
  // TÊTE & COU
  // ============================================
  { id: 'head', name: 'Tête', x: 50, y: 6, radius: 5 },
  { id: 'jaw_right', name: 'Mâchoire droite', x: 45, y: 9, radius: 2 },
  { id: 'jaw_left', name: 'Mâchoire gauche', x: 55, y: 9, radius: 2 },
  { id: 'neck_front', name: 'Cou (avant)', x: 50, y: 11, radius: 2.5 },
  { id: 'throat', name: 'Gorge', x: 50, y: 10.5, radius: 1.5 },

  // ============================================
  // ÉPAULES & CLAVICULES
  // ============================================
  { id: 'clavicle_right', name: 'Clavicule droite', x: 38, y: 14, radius: 3 },
  { id: 'clavicle_left', name: 'Clavicule gauche', x: 62, y: 14, radius: 3 },
  { id: 'shoulder_right', name: 'Épaule droite', x: 28, y: 16, radius: 4.5 },
  { id: 'shoulder_left', name: 'Épaule gauche', x: 72, y: 16, radius: 4.5 },
  { id: 'rotator_cuff_right', name: 'Coiffe rotateurs droite', x: 28, y: 17, radius: 3 },
  { id: 'rotator_cuff_left', name: 'Coiffe rotateurs gauche', x: 72, y: 17, radius: 3 },
  { id: 'ac_joint_right', name: 'Articulation AC droite', x: 32, y: 14, radius: 1.5 },
  { id: 'ac_joint_left', name: 'Articulation AC gauche', x: 68, y: 14, radius: 1.5 },

  // ============================================
  // BRAS DROIT (Vue anatomique)
  // ============================================
  { id: 'deltoid_right', name: 'Deltoïde droit', x: 24, y: 18, radius: 4 },
  { id: 'bicep_right', name: 'Biceps droit', x: 21, y: 25, radius: 3.5 },
  { id: 'bicep_tendon_right', name: 'Tendon biceps droit', x: 21, y: 20, radius: 1.5 },
  { id: 'elbow_right', name: 'Coude droit', x: 18, y: 33, radius: 2.5 },
  { id: 'lateral_epicondyle_right', name: 'Épicondyle latéral droit', x: 16, y: 33, radius: 1.5 },
  { id: 'medial_epicondyle_right', name: 'Épicondyle médial droit', x: 20, y: 33, radius: 1.5 },
  { id: 'forearm_right', name: 'Avant-bras droit', x: 16, y: 39, radius: 3 },
  { id: 'wrist_right', name: 'Poignet droit', x: 14, y: 46, radius: 2 },
  { id: 'hand_right', name: 'Main droite', x: 12, y: 51, radius: 2.5 },
  { id: 'thumb_right', name: 'Pouce droit', x: 10, y: 50, radius: 1 },
  { id: 'fingers_right', name: 'Doigts droits', x: 12, y: 53, radius: 1.5 },

  // ============================================
  // BRAS GAUCHE (Vue anatomique)
  // ============================================
  { id: 'deltoid_left', name: 'Deltoïde gauche', x: 76, y: 18, radius: 4 },
  { id: 'bicep_left', name: 'Biceps gauche', x: 79, y: 25, radius: 3.5 },
  { id: 'bicep_tendon_left', name: 'Tendon biceps gauche', x: 79, y: 20, radius: 1.5 },
  { id: 'elbow_left', name: 'Coude gauche', x: 82, y: 33, radius: 2.5 },
  { id: 'lateral_epicondyle_left', name: 'Épicondyle latéral gauche', x: 84, y: 33, radius: 1.5 },
  { id: 'medial_epicondyle_left', name: 'Épicondyle médial gauche', x: 80, y: 33, radius: 1.5 },
  { id: 'forearm_left', name: 'Avant-bras gauche', x: 84, y: 39, radius: 3 },
  { id: 'wrist_left', name: 'Poignet gauche', x: 86, y: 46, radius: 2 },
  { id: 'hand_left', name: 'Main gauche', x: 88, y: 51, radius: 2.5 },
  { id: 'thumb_left', name: 'Pouce gauche', x: 90, y: 50, radius: 1 },
  { id: 'fingers_left', name: 'Doigts gauches', x: 88, y: 53, radius: 1.5 },

  // ============================================
  // TORSE
  // ============================================
  { id: 'chest_right', name: 'Pectoral droit', x: 38, y: 20, radius: 5 },
  { id: 'chest_left', name: 'Pectoral gauche', x: 62, y: 20, radius: 5 },
  { id: 'sternum', name: 'Sternum', x: 50, y: 22, radius: 2.5 },
  { id: 'ribs_right_upper', name: 'Côtes hautes droites', x: 36, y: 24, radius: 3 },
  { id: 'ribs_left_upper', name: 'Côtes hautes gauches', x: 64, y: 24, radius: 3 },
  { id: 'ribs_right_lower', name: 'Côtes basses droites', x: 36, y: 30, radius: 3 },
  { id: 'ribs_left_lower', name: 'Côtes basses gauches', x: 64, y: 30, radius: 3 },
  { id: 'floating_rib_right', name: 'Côte flottante droite', x: 40, y: 33, radius: 2 },
  { id: 'floating_rib_left', name: 'Côte flottante gauche', x: 60, y: 33, radius: 2 },

  // ============================================
  // ABDOMEN
  // ============================================
  { id: 'abs_upper', name: 'Abdominaux hauts', x: 50, y: 30, radius: 4 },
  { id: 'abs_middle', name: 'Abdominaux moyens', x: 50, y: 35, radius: 4 },
  { id: 'abs_lower', name: 'Abdominaux bas', x: 50, y: 40, radius: 4 },
  { id: 'oblique_right', name: 'Oblique droit', x: 40, y: 35, radius: 3 },
  { id: 'oblique_left', name: 'Oblique gauche', x: 60, y: 35, radius: 3 },
  { id: 'serratus_right', name: 'Dentelé droit', x: 38, y: 28, radius: 2 },
  { id: 'serratus_left', name: 'Dentelé gauche', x: 62, y: 28, radius: 2 },

  // ============================================
  // BASSIN & HANCHES
  // ============================================
  { id: 'hip_right', name: 'Hanche droite', x: 38, y: 45, radius: 3.5 },
  { id: 'hip_left', name: 'Hanche gauche', x: 62, y: 45, radius: 3.5 },
  { id: 'groin_right', name: 'Aine droite', x: 43, y: 47, radius: 2.5 },
  { id: 'groin_left', name: 'Aine gauche', x: 57, y: 47, radius: 2.5 },
  { id: 'pubis', name: 'Pubis (pubalgie)', x: 50, y: 47, radius: 2 },
  { id: 'iliac_crest_right', name: 'Crête iliaque droite', x: 35, y: 43, radius: 2 },
  { id: 'iliac_crest_left', name: 'Crête iliaque gauche', x: 65, y: 43, radius: 2 },

  // ============================================
  // CUISSE DROITE (Vue anatomique)
  // ============================================
  { id: 'quad_right', name: 'Quadriceps droit', x: 41, y: 56, radius: 4.5 },
  { id: 'rectus_femoris_right', name: 'Droit fémoral droit', x: 41, y: 54, radius: 2.5 },
  { id: 'vastus_medialis_right', name: 'Vaste médial droit', x: 44, y: 60, radius: 2.5 },
  { id: 'vastus_lateralis_right', name: 'Vaste latéral droit', x: 38, y: 57, radius: 2.5 },
  { id: 'adductor_right', name: 'Adducteurs droits', x: 45, y: 53, radius: 3 },
  { id: 'it_band_right', name: 'Bandelette ilio-tibiale droite', x: 37, y: 58, radius: 2 },
  { id: 'sartorius_right', name: 'Couturier droit', x: 42, y: 52, radius: 2 },

  // ============================================
  // CUISSE GAUCHE (Vue anatomique)
  // ============================================
  { id: 'quad_left', name: 'Quadriceps gauche', x: 59, y: 56, radius: 4.5 },
  { id: 'rectus_femoris_left', name: 'Droit fémoral gauche', x: 59, y: 54, radius: 2.5 },
  { id: 'vastus_medialis_left', name: 'Vaste médial gauche', x: 56, y: 60, radius: 2.5 },
  { id: 'vastus_lateralis_left', name: 'Vaste latéral gauche', x: 62, y: 57, radius: 2.5 },
  { id: 'adductor_left', name: 'Adducteurs gauches', x: 55, y: 53, radius: 3 },
  { id: 'it_band_left', name: 'Bandelette ilio-tibiale gauche', x: 63, y: 58, radius: 2 },
  { id: 'sartorius_left', name: 'Couturier gauche', x: 58, y: 52, radius: 2 },

  // ============================================
  // GENOU DROIT (Vue anatomique)
  // ============================================
  { id: 'knee_right', name: 'Genou droit', x: 41, y: 67, radius: 3.5 },
  { id: 'patella_right', name: 'Rotule droite', x: 41, y: 66, radius: 2 },
  { id: 'patellar_tendon_right', name: 'Tendon rotulien droit', x: 41, y: 68.5, radius: 1.5 },
  { id: 'mcl_right', name: 'LCM droit', x: 43, y: 67, radius: 1.5 },
  { id: 'lcl_right', name: 'LCL droit', x: 39, y: 67, radius: 1.5 },
  { id: 'meniscus_right', name: 'Ménisque droit', x: 41, y: 67.5, radius: 1.5 },

  // ============================================
  // GENOU GAUCHE (Vue anatomique)
  // ============================================
  { id: 'knee_left', name: 'Genou gauche', x: 59, y: 67, radius: 3.5 },
  { id: 'patella_left', name: 'Rotule gauche', x: 59, y: 66, radius: 2 },
  { id: 'patellar_tendon_left', name: 'Tendon rotulien gauche', x: 59, y: 68.5, radius: 1.5 },
  { id: 'mcl_left', name: 'LCM gauche', x: 57, y: 67, radius: 1.5 },
  { id: 'lcl_left', name: 'LCL gauche', x: 61, y: 67, radius: 1.5 },
  { id: 'meniscus_left', name: 'Ménisque gauche', x: 59, y: 67.5, radius: 1.5 },

  // ============================================
  // JAMBE DROITE (Vue anatomique)
  // ============================================
  { id: 'shin_right', name: 'Tibia droit', x: 41, y: 76, radius: 3.5 },
  { id: 'tibialis_anterior_right', name: 'Tibial antérieur droit (périostite)', x: 40, y: 75, radius: 2 },
  { id: 'fibula_right', name: 'Péroné droit', x: 39, y: 77, radius: 1.5 },
  { id: 'calf_front_right', name: 'Mollet avant droit', x: 42, y: 78, radius: 2.5 },
  { id: 'ankle_right', name: 'Cheville droite', x: 41, y: 89, radius: 2.5 },
  { id: 'lateral_ankle_right', name: 'Malléole latérale droite', x: 39, y: 89, radius: 1.5 },
  { id: 'medial_ankle_right', name: 'Malléole médiale droite', x: 43, y: 89, radius: 1.5 },
  { id: 'ankle_sprain_right', name: 'Entorse cheville droite', x: 39, y: 90, radius: 2 },

  // ============================================
  // JAMBE GAUCHE (Vue anatomique)
  // ============================================
  { id: 'shin_left', name: 'Tibia gauche', x: 59, y: 76, radius: 3.5 },
  { id: 'tibialis_anterior_left', name: 'Tibial antérieur gauche (périostite)', x: 60, y: 75, radius: 2 },
  { id: 'fibula_left', name: 'Péroné gauche', x: 61, y: 77, radius: 1.5 },
  { id: 'calf_front_left', name: 'Mollet avant gauche', x: 58, y: 78, radius: 2.5 },
  { id: 'ankle_left', name: 'Cheville gauche', x: 59, y: 89, radius: 2.5 },
  { id: 'lateral_ankle_left', name: 'Malléole latérale gauche', x: 61, y: 89, radius: 1.5 },
  { id: 'medial_ankle_left', name: 'Malléole médiale gauche', x: 57, y: 89, radius: 1.5 },
  { id: 'ankle_sprain_left', name: 'Entorse cheville gauche', x: 61, y: 90, radius: 2 },

  // ============================================
  // PIEDS
  // ============================================
  { id: 'foot_right', name: 'Pied droit', x: 41, y: 94, radius: 3 },
  { id: 'plantar_fascia_right', name: 'Fasciite plantaire droite', x: 41, y: 95, radius: 2 },
  { id: 'toes_right', name: 'Orteils droits', x: 41, y: 96, radius: 1.5 },
  { id: 'big_toe_right', name: 'Gros orteil droit', x: 42, y: 96, radius: 1 },

  { id: 'foot_left', name: 'Pied gauche', x: 59, y: 94, radius: 3 },
  { id: 'plantar_fascia_left', name: 'Fasciite plantaire gauche', x: 59, y: 95, radius: 2 },
  { id: 'toes_left', name: 'Orteils gauches', x: 59, y: 96, radius: 1.5 },
  { id: 'big_toe_left', name: 'Gros orteil gauche', x: 58, y: 96, radius: 1 },
];

// ============================================
// VUE DE DOS (80+ zones)
// ============================================

export const BODY_ZONES_BACK: BodyZone[] = [
  // ============================================
  // TÊTE & COU
  // ============================================
  { id: 'head_back', name: 'Tête (arrière)', x: 50, y: 6, radius: 5 },
  { id: 'neck_back', name: 'Nuque', x: 50, y: 11, radius: 2.5 },
  { id: 'cervical_spine_upper', name: 'Cervicales hautes', x: 50, y: 10, radius: 2 },
  { id: 'cervical_spine_lower', name: 'Cervicales basses', x: 50, y: 13, radius: 2 },

  // ============================================
  // ÉPAULES & HAUT DU DOS
  // ============================================
  { id: 'trap_right', name: 'Trapèze droit', x: 38, y: 15, radius: 4.5 },
  { id: 'trap_left', name: 'Trapèze gauche', x: 62, y: 15, radius: 4.5 },
  { id: 'trap_upper_right', name: 'Trapèze sup. droit', x: 40, y: 13, radius: 2.5 },
  { id: 'trap_upper_left', name: 'Trapèze sup. gauche', x: 60, y: 13, radius: 2.5 },
  { id: 'levator_scapulae_right', name: 'Élévateur scapulaire droit', x: 42, y: 14, radius: 2 },
  { id: 'levator_scapulae_left', name: 'Élévateur scapulaire gauche', x: 58, y: 14, radius: 2 },
  { id: 'shoulder_blade_right', name: 'Omoplate droite', x: 35, y: 20, radius: 4 },
  { id: 'shoulder_blade_left', name: 'Omoplate gauche', x: 65, y: 20, radius: 4 },

  // ============================================
  // BRAS (ARRIÈRE) - TRICEPS
  // ============================================
  { id: 'deltoid_back_right', name: 'Deltoïde post. droit', x: 24, y: 18, radius: 3.5 },
  { id: 'deltoid_back_left', name: 'Deltoïde post. gauche', x: 76, y: 18, radius: 3.5 },
  { id: 'tricep_right', name: 'Triceps droit', x: 21, y: 25, radius: 3.5 },
  { id: 'tricep_left', name: 'Triceps gauche', x: 79, y: 25, radius: 3.5 },
  { id: 'elbow_back_right', name: 'Coude arrière droit', x: 18, y: 33, radius: 2.5 },
  { id: 'elbow_back_left', name: 'Coude arrière gauche', x: 82, y: 33, radius: 2.5 },
  { id: 'forearm_back_right', name: 'Avant-bras post. droit', x: 16, y: 39, radius: 2.5 },
  { id: 'forearm_back_left', name: 'Avant-bras post. gauche', x: 84, y: 39, radius: 2.5 },

  // ============================================
  // DOS
  // ============================================
  { id: 'upper_back_right', name: 'Haut du dos droit', x: 40, y: 22, radius: 4.5 },
  { id: 'upper_back_left', name: 'Haut du dos gauche', x: 60, y: 22, radius: 4.5 },
  { id: 'rhomboid_right', name: 'Rhomboïde droit', x: 42, y: 21, radius: 3 },
  { id: 'rhomboid_left', name: 'Rhomboïde gauche', x: 58, y: 21, radius: 3 },
  { id: 'thoracic_spine_upper', name: 'Dorsales hautes', x: 50, y: 20, radius: 2.5 },
  { id: 'thoracic_spine_middle', name: 'Dorsales moyennes', x: 50, y: 27, radius: 2.5 },
  { id: 'thoracic_spine_lower', name: 'Dorsales basses', x: 50, y: 34, radius: 2.5 },

  { id: 'lat_right', name: 'Grand dorsal droit', x: 38, y: 30, radius: 5 },
  { id: 'lat_left', name: 'Grand dorsal gauche', x: 62, y: 30, radius: 5 },
  { id: 'teres_major_right', name: 'Grand rond droit', x: 34, y: 22, radius: 2 },
  { id: 'teres_major_left', name: 'Grand rond gauche', x: 66, y: 22, radius: 2 },
  { id: 'infraspinatus_right', name: 'Sous-épineux droit', x: 32, y: 19, radius: 2.5 },
  { id: 'infraspinatus_left', name: 'Sous-épineux gauche', x: 68, y: 19, radius: 2.5 },

  // ============================================
  // LOMBAIRES
  // ============================================
  { id: 'lower_back', name: 'Lombaires', x: 50, y: 40, radius: 5 },
  { id: 'lumbar_spine_upper', name: 'Lombaires L1-L2', x: 50, y: 37, radius: 2 },
  { id: 'lumbar_spine_middle', name: 'Lombaires L3', x: 50, y: 40, radius: 2 },
  { id: 'lumbar_spine_lower', name: 'Lombaires L4-L5', x: 50, y: 43, radius: 2 },
  { id: 'erector_spinae_right', name: 'Érecteurs rachis droits', x: 47, y: 35, radius: 2 },
  { id: 'erector_spinae_left', name: 'Érecteurs rachis gauches', x: 53, y: 35, radius: 2 },
  { id: 'ql_right', name: 'Carré des lombes droit', x: 45, y: 40, radius: 2.5 },
  { id: 'ql_left', name: 'Carré des lombes gauche', x: 55, y: 40, radius: 2.5 },

  // ============================================
  // SACRUM & FESSIERS
  // ============================================
  { id: 'sacrum', name: 'Sacrum', x: 50, y: 46, radius: 2.5 },
  { id: 'sacroiliac_right', name: 'Sacro-iliaque droit', x: 47, y: 45, radius: 1.5 },
  { id: 'sacroiliac_left', name: 'Sacro-iliaque gauche', x: 53, y: 45, radius: 1.5 },
  { id: 'glute_max_right', name: 'Grand fessier droit', x: 42, y: 50, radius: 5 },
  { id: 'glute_max_left', name: 'Grand fessier gauche', x: 58, y: 50, radius: 5 },
  { id: 'glute_med_right', name: 'Moyen fessier droit', x: 40, y: 47, radius: 3 },
  { id: 'glute_med_left', name: 'Moyen fessier gauche', x: 60, y: 47, radius: 3 },
  { id: 'piriformis_right', name: 'Piriforme droit (sciatique)', x: 45, y: 49, radius: 2 },
  { id: 'piriformis_left', name: 'Piriforme gauche (sciatique)', x: 55, y: 49, radius: 2 },

  // ============================================
  // CUISSE ARRIÈRE DROITE
  // ============================================
  { id: 'hamstring_right', name: 'Ischio-jambiers droits', x: 41, y: 60, radius: 4.5 },
  { id: 'biceps_femoris_right', name: 'Biceps fémoral droit', x: 39, y: 59, radius: 2.5 },
  { id: 'semitendinosus_right', name: 'Semi-tendineux droit', x: 42, y: 61, radius: 2 },
  { id: 'semimembranosus_right', name: 'Semi-membraneux droit', x: 43, y: 60, radius: 2 },

  // ============================================
  // CUISSE ARRIÈRE GAUCHE
  // ============================================
  { id: 'hamstring_left', name: 'Ischio-jambiers gauches', x: 59, y: 60, radius: 4.5 },
  { id: 'biceps_femoris_left', name: 'Biceps fémoral gauche', x: 61, y: 59, radius: 2.5 },
  { id: 'semitendinosus_left', name: 'Semi-tendineux gauche', x: 58, y: 61, radius: 2 },
  { id: 'semimembranosus_left', name: 'Semi-membraneux gauche', x: 57, y: 60, radius: 2 },

  // ============================================
  // GENOU ARRIÈRE
  // ============================================
  { id: 'knee_back_right', name: 'Creux poplité droit', x: 41, y: 68, radius: 2.5 },
  { id: 'knee_back_left', name: 'Creux poplité gauche', x: 59, y: 68, radius: 2.5 },
  { id: 'pcl_right', name: 'LCP droit', x: 41, y: 67.5, radius: 1.5 },
  { id: 'pcl_left', name: 'LCP gauche', x: 59, y: 67.5, radius: 1.5 },

  // ============================================
  // MOLLETS
  // ============================================
  { id: 'calf_right', name: 'Mollet droit', x: 41, y: 77, radius: 4 },
  { id: 'gastrocnemius_right', name: 'Gastrocnémien droit', x: 41, y: 75, radius: 3 },
  { id: 'soleus_right', name: 'Soléaire droit', x: 41, y: 80, radius: 2.5 },

  { id: 'calf_left', name: 'Mollet gauche', x: 59, y: 77, radius: 4 },
  { id: 'gastrocnemius_left', name: 'Gastrocnémien gauche', x: 59, y: 75, radius: 3 },
  { id: 'soleus_left', name: 'Soléaire gauche', x: 59, y: 80, radius: 2.5 },

  // ============================================
  // TENDONS D'ACHILLE
  // ============================================
  { id: 'achilles_right', name: "Tendon d'Achille droit", x: 41, y: 87, radius: 2 },
  { id: 'achilles_left', name: "Tendon d'Achille gauche", x: 59, y: 87, radius: 2 },

  // ============================================
  // CHEVILLES & TALONS
  // ============================================
  { id: 'ankle_back_right', name: 'Cheville arrière droite', x: 41, y: 89, radius: 2.5 },
  { id: 'ankle_back_left', name: 'Cheville arrière gauche', x: 59, y: 89, radius: 2.5 },
  { id: 'heel_right', name: 'Talon droit', x: 41, y: 92, radius: 2.5 },
  { id: 'heel_left', name: 'Talon gauche', x: 59, y: 92, radius: 2.5 },
  { id: 'calcaneus_right', name: 'Calcanéum droit', x: 41, y: 91, radius: 2 },
  { id: 'calcaneus_left', name: 'Calcanéum gauche', x: 59, y: 91, radius: 2 },

  // ============================================
  // PIEDS ARRIÈRE
  // ============================================
  { id: 'foot_back_right', name: 'Pied arrière droit', x: 41, y: 94, radius: 2.5 },
  { id: 'foot_back_left', name: 'Pied arrière gauche', x: 59, y: 94, radius: 2.5 },
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
