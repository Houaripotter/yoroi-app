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
  { id: 'head', name: 'Tête', x: 50, y: 4, radius: 4 },
  { id: 'jaw_right', name: 'Mâchoire droite', x: 45, y: 7, radius: 1.5 },
  { id: 'jaw_left', name: 'Mâchoire gauche', x: 55, y: 7, radius: 1.5 },
  { id: 'neck_front', name: 'Cou (avant)', x: 50, y: 9.5, radius: 2 },
  { id: 'throat', name: 'Gorge', x: 50, y: 8.5, radius: 1.2 },

  // ============================================
  // ÉPAULES & CLAVICULES
  // ============================================
  { id: 'clavicle_right', name: 'Clavicule droite', x: 38, y: 12, radius: 2.5 },
  { id: 'clavicle_left', name: 'Clavicule gauche', x: 62, y: 12, radius: 2.5 },
  { id: 'shoulder_right', name: 'Épaule droite', x: 27, y: 14, radius: 4 },
  { id: 'shoulder_left', name: 'Épaule gauche', x: 73, y: 14, radius: 4 },
  { id: 'rotator_cuff_right', name: 'Coiffe rotateurs droite', x: 27, y: 15, radius: 2.5 },
  { id: 'rotator_cuff_left', name: 'Coiffe rotateurs gauche', x: 73, y: 15, radius: 2.5 },
  { id: 'ac_joint_right', name: 'Articulation AC droite', x: 32, y: 12.5, radius: 1.2 },
  { id: 'ac_joint_left', name: 'Articulation AC gauche', x: 68, y: 12.5, radius: 1.2 },

  // ============================================
  // BRAS DROIT (Vue anatomique)
  // ============================================
  { id: 'deltoid_right', name: 'Deltoïde droit', x: 23, y: 16, radius: 3.5 },
  { id: 'bicep_right', name: 'Biceps droit', x: 20, y: 23, radius: 3 },
  { id: 'bicep_tendon_right', name: 'Tendon biceps droit', x: 20, y: 18, radius: 1.5 },
  { id: 'elbow_right', name: 'Coude droit', x: 17, y: 31, radius: 2.5 },
  { id: 'lateral_epicondyle_right', name: 'Tennis elbow droit', x: 15, y: 31, radius: 2 },
  { id: 'medial_epicondyle_right', name: 'Golf elbow droit', x: 19, y: 31, radius: 2 },
  { id: 'forearm_right', name: 'Avant-bras droit', x: 15, y: 37, radius: 2.5 },
  { id: 'wrist_right', name: 'Poignet droit', x: 13, y: 44, radius: 2 },
  { id: 'hand_right', name: 'Main droite', x: 11, y: 49, radius: 2.5 },
  { id: 'thumb_right', name: 'Pouce droit', x: 9, y: 48, radius: 1.2 },
  { id: 'fingers_right', name: 'Doigts droits', x: 11, y: 51, radius: 1.5 },

  // ============================================
  // BRAS GAUCHE (Vue anatomique)
  // ============================================
  { id: 'deltoid_left', name: 'Deltoïde gauche', x: 77, y: 16, radius: 3.5 },
  { id: 'bicep_left', name: 'Biceps gauche', x: 80, y: 23, radius: 3 },
  { id: 'bicep_tendon_left', name: 'Tendon biceps gauche', x: 80, y: 18, radius: 1.5 },
  { id: 'elbow_left', name: 'Coude gauche', x: 83, y: 31, radius: 2.5 },
  { id: 'lateral_epicondyle_left', name: 'Tennis elbow gauche', x: 85, y: 31, radius: 2 },
  { id: 'medial_epicondyle_left', name: 'Golf elbow gauche', x: 81, y: 31, radius: 2 },
  { id: 'forearm_left', name: 'Avant-bras gauche', x: 85, y: 37, radius: 2.5 },
  { id: 'wrist_left', name: 'Poignet gauche', x: 87, y: 44, radius: 2 },
  { id: 'hand_left', name: 'Main gauche', x: 89, y: 49, radius: 2.5 },
  { id: 'thumb_left', name: 'Pouce gauche', x: 91, y: 48, radius: 1.2 },
  { id: 'fingers_left', name: 'Doigts gauches', x: 89, y: 51, radius: 1.5 },

  // ============================================
  // TORSE
  // ============================================
  { id: 'chest_right', name: 'Pectoral droit', x: 37, y: 17, radius: 4.5 },
  { id: 'chest_left', name: 'Pectoral gauche', x: 63, y: 17, radius: 4.5 },
  { id: 'sternum', name: 'Sternum', x: 50, y: 19, radius: 2 },
  { id: 'ribs_right_upper', name: 'Côtes hautes droites', x: 35, y: 22, radius: 2.5 },
  { id: 'ribs_left_upper', name: 'Côtes hautes gauches', x: 65, y: 22, radius: 2.5 },
  { id: 'ribs_right_lower', name: 'Côtes basses droites', x: 35, y: 27, radius: 2.5 },
  { id: 'ribs_left_lower', name: 'Côtes basses gauches', x: 65, y: 27, radius: 2.5 },
  { id: 'floating_rib_right', name: 'Côte flottante droite', x: 38, y: 30, radius: 1.5 },
  { id: 'floating_rib_left', name: 'Côte flottante gauche', x: 62, y: 30, radius: 1.5 },

  // ============================================
  // ABDOMEN
  // ============================================
  { id: 'abs_upper', name: 'Abdominaux hauts', x: 50, y: 27, radius: 3.5 },
  { id: 'abs_middle', name: 'Abdominaux moyens', x: 50, y: 33, radius: 3.5 },
  { id: 'abs_lower', name: 'Abdominaux bas', x: 50, y: 39, radius: 3.5 },
  { id: 'oblique_right', name: 'Oblique droit', x: 38, y: 33, radius: 2.5 },
  { id: 'oblique_left', name: 'Oblique gauche', x: 62, y: 33, radius: 2.5 },
  { id: 'serratus_right', name: 'Dentelé droit', x: 36, y: 24, radius: 1.8 },
  { id: 'serratus_left', name: 'Dentelé gauche', x: 64, y: 24, radius: 1.8 },

  // ============================================
  // BASSIN & HANCHES
  // ============================================
  { id: 'hip_right', name: 'Hanche droite', x: 36, y: 43, radius: 3 },
  { id: 'hip_left', name: 'Hanche gauche', x: 64, y: 43, radius: 3 },
  { id: 'groin_right', name: 'Aine droite', x: 42, y: 46, radius: 2.5 },
  { id: 'groin_left', name: 'Aine gauche', x: 58, y: 46, radius: 2.5 },
  { id: 'pubis', name: 'Pubis (pubalgie)', x: 50, y: 46, radius: 2 },
  { id: 'iliac_crest_right', name: 'Crête iliaque droite', x: 34, y: 41, radius: 2 },
  { id: 'iliac_crest_left', name: 'Crête iliaque gauche', x: 66, y: 41, radius: 2 },

  // ============================================
  // CUISSE DROITE (Vue anatomique)
  // ============================================
  { id: 'quad_right', name: 'Quadriceps droit', x: 40, y: 54, radius: 4 },
  { id: 'rectus_femoris_right', name: 'Droit fémoral droit', x: 40, y: 52, radius: 2.5 },
  { id: 'vastus_medialis_right', name: 'Vaste médial droit', x: 43, y: 58, radius: 2.5 },
  { id: 'vastus_lateralis_right', name: 'Vaste latéral droit', x: 37, y: 55, radius: 2.5 },
  { id: 'adductor_right', name: 'Adducteurs droits', x: 44, y: 50, radius: 2.5 },
  { id: 'it_band_right', name: 'Bandelette ilio-tibiale droite', x: 36, y: 56, radius: 2 },
  { id: 'sartorius_right', name: 'Couturier droit', x: 41, y: 49, radius: 2 },

  // ============================================
  // CUISSE GAUCHE (Vue anatomique)
  // ============================================
  { id: 'quad_left', name: 'Quadriceps gauche', x: 60, y: 54, radius: 4 },
  { id: 'rectus_femoris_left', name: 'Droit fémoral gauche', x: 60, y: 52, radius: 2.5 },
  { id: 'vastus_medialis_left', name: 'Vaste médial gauche', x: 57, y: 58, radius: 2.5 },
  { id: 'vastus_lateralis_left', name: 'Vaste latéral gauche', x: 63, y: 55, radius: 2.5 },
  { id: 'adductor_left', name: 'Adducteurs gauches', x: 56, y: 50, radius: 2.5 },
  { id: 'it_band_left', name: 'Bandelette ilio-tibiale gauche', x: 64, y: 56, radius: 2 },
  { id: 'sartorius_left', name: 'Couturier gauche', x: 59, y: 49, radius: 2 },

  // ============================================
  // GENOU DROIT (Vue anatomique)
  // ============================================
  { id: 'knee_right', name: 'Genou droit', x: 40, y: 65, radius: 3.5 },
  { id: 'patella_right', name: 'Rotule droite', x: 40, y: 64, radius: 2 },
  { id: 'patellar_tendon_right', name: 'Tendon rotulien droit', x: 40, y: 66.5, radius: 2 },
  { id: 'mcl_right', name: 'LCM droit', x: 42, y: 65, radius: 1.8 },
  { id: 'lcl_right', name: 'LCL droit', x: 38, y: 65, radius: 1.8 },
  { id: 'meniscus_right', name: 'Ménisque droit', x: 40, y: 65.5, radius: 1.5 },

  // ============================================
  // GENOU GAUCHE (Vue anatomique)
  // ============================================
  { id: 'knee_left', name: 'Genou gauche', x: 60, y: 65, radius: 3.5 },
  { id: 'patella_left', name: 'Rotule gauche', x: 60, y: 64, radius: 2 },
  { id: 'patellar_tendon_left', name: 'Tendon rotulien gauche', x: 60, y: 66.5, radius: 2 },
  { id: 'mcl_left', name: 'LCM gauche', x: 58, y: 65, radius: 1.8 },
  { id: 'lcl_left', name: 'LCL gauche', x: 62, y: 65, radius: 1.8 },
  { id: 'meniscus_left', name: 'Ménisque gauche', x: 60, y: 65.5, radius: 1.5 },

  // ============================================
  // JAMBE DROITE (Vue anatomique)
  // ============================================
  { id: 'shin_right', name: 'Tibia droit', x: 40, y: 74, radius: 3 },
  { id: 'tibialis_anterior_right', name: 'Périostite tibiale droite', x: 39, y: 73, radius: 2 },
  { id: 'fibula_right', name: 'Péroné droit', x: 38, y: 75, radius: 1.5 },
  { id: 'calf_front_right', name: 'Mollet avant droit', x: 41, y: 76, radius: 2 },
  { id: 'ankle_right', name: 'Cheville droite', x: 40, y: 87, radius: 2.5 },
  { id: 'lateral_ankle_right', name: 'Malléole latérale droite', x: 38, y: 87, radius: 1.8 },
  { id: 'medial_ankle_right', name: 'Malléole médiale droite', x: 42, y: 87, radius: 1.8 },
  { id: 'ankle_sprain_right', name: 'Entorse cheville droite', x: 38, y: 88, radius: 2 },

  // ============================================
  // JAMBE GAUCHE (Vue anatomique)
  // ============================================
  { id: 'shin_left', name: 'Tibia gauche', x: 60, y: 74, radius: 3 },
  { id: 'tibialis_anterior_left', name: 'Périostite tibiale gauche', x: 61, y: 73, radius: 2 },
  { id: 'fibula_left', name: 'Péroné gauche', x: 62, y: 75, radius: 1.5 },
  { id: 'calf_front_left', name: 'Mollet avant gauche', x: 59, y: 76, radius: 2 },
  { id: 'ankle_left', name: 'Cheville gauche', x: 60, y: 87, radius: 2.5 },
  { id: 'lateral_ankle_left', name: 'Malléole latérale gauche', x: 62, y: 87, radius: 1.8 },
  { id: 'medial_ankle_left', name: 'Malléole médiale gauche', x: 58, y: 87, radius: 1.8 },
  { id: 'ankle_sprain_left', name: 'Entorse cheville gauche', x: 62, y: 88, radius: 2 },

  // ============================================
  // PIEDS
  // ============================================
  { id: 'foot_right', name: 'Pied droit', x: 40, y: 92, radius: 2.5 },
  { id: 'plantar_fascia_right', name: 'Fasciite plantaire droite', x: 40, y: 93, radius: 2 },
  { id: 'toes_right', name: 'Orteils droits', x: 40, y: 95, radius: 1.5 },
  { id: 'big_toe_right', name: 'Gros orteil droit', x: 41, y: 95, radius: 1.2 },

  { id: 'foot_left', name: 'Pied gauche', x: 60, y: 92, radius: 2.5 },
  { id: 'plantar_fascia_left', name: 'Fasciite plantaire gauche', x: 60, y: 93, radius: 2 },
  { id: 'toes_left', name: 'Orteils gauches', x: 60, y: 95, radius: 1.5 },
  { id: 'big_toe_left', name: 'Gros orteil gauche', x: 59, y: 95, radius: 1.2 },
];

// ============================================
// VUE DE DOS (80+ zones)
// ============================================

export const BODY_ZONES_BACK: BodyZone[] = [
  // ============================================
  // TÊTE & COU
  // ============================================
  { id: 'head_back', name: 'Tête (arrière)', x: 50, y: 4, radius: 4 },
  { id: 'neck_back', name: 'Nuque', x: 50, y: 9.5, radius: 2 },
  { id: 'cervical_spine_upper', name: 'Cervicales hautes', x: 50, y: 8, radius: 1.8 },
  { id: 'cervical_spine_lower', name: 'Cervicales basses', x: 50, y: 11, radius: 1.8 },

  // ============================================
  // ÉPAULES & HAUT DU DOS
  // ============================================
  { id: 'trap_right', name: 'Trapèze droit', x: 37, y: 13, radius: 4 },
  { id: 'trap_left', name: 'Trapèze gauche', x: 63, y: 13, radius: 4 },
  { id: 'trap_upper_right', name: 'Trapèze sup. droit', x: 39, y: 11, radius: 2.5 },
  { id: 'trap_upper_left', name: 'Trapèze sup. gauche', x: 61, y: 11, radius: 2.5 },
  { id: 'levator_scapulae_right', name: 'Élévateur scapulaire droit', x: 41, y: 12, radius: 2 },
  { id: 'levator_scapulae_left', name: 'Élévateur scapulaire gauche', x: 59, y: 12, radius: 2 },
  { id: 'shoulder_blade_right', name: 'Omoplate droite', x: 34, y: 18, radius: 3.5 },
  { id: 'shoulder_blade_left', name: 'Omoplate gauche', x: 66, y: 18, radius: 3.5 },

  // ============================================
  // BRAS (ARRIÈRE) - TRICEPS
  // ============================================
  { id: 'deltoid_back_right', name: 'Deltoïde post. droit', x: 23, y: 16, radius: 3 },
  { id: 'deltoid_back_left', name: 'Deltoïde post. gauche', x: 77, y: 16, radius: 3 },
  { id: 'tricep_right', name: 'Triceps droit', x: 20, y: 23, radius: 3 },
  { id: 'tricep_left', name: 'Triceps gauche', x: 80, y: 23, radius: 3 },
  { id: 'elbow_back_right', name: 'Coude arrière droit', x: 17, y: 31, radius: 2.5 },
  { id: 'elbow_back_left', name: 'Coude arrière gauche', x: 83, y: 31, radius: 2.5 },
  { id: 'forearm_back_right', name: 'Avant-bras post. droit', x: 15, y: 37, radius: 2 },
  { id: 'forearm_back_left', name: 'Avant-bras post. gauche', x: 85, y: 37, radius: 2 },

  // ============================================
  // DOS
  // ============================================
  { id: 'upper_back_right', name: 'Haut du dos droit', x: 39, y: 20, radius: 4 },
  { id: 'upper_back_left', name: 'Haut du dos gauche', x: 61, y: 20, radius: 4 },
  { id: 'rhomboid_right', name: 'Rhomboïde droit', x: 41, y: 19, radius: 2.5 },
  { id: 'rhomboid_left', name: 'Rhomboïde gauche', x: 59, y: 19, radius: 2.5 },
  { id: 'thoracic_spine_upper', name: 'Dorsales hautes', x: 50, y: 18, radius: 2 },
  { id: 'thoracic_spine_middle', name: 'Dorsales moyennes', x: 50, y: 25, radius: 2 },
  { id: 'thoracic_spine_lower', name: 'Dorsales basses', x: 50, y: 32, radius: 2 },

  { id: 'lat_right', name: 'Grand dorsal droit', x: 37, y: 28, radius: 4.5 },
  { id: 'lat_left', name: 'Grand dorsal gauche', x: 63, y: 28, radius: 4.5 },
  { id: 'teres_major_right', name: 'Grand rond droit', x: 33, y: 20, radius: 2 },
  { id: 'teres_major_left', name: 'Grand rond gauche', x: 67, y: 20, radius: 2 },
  { id: 'infraspinatus_right', name: 'Sous-épineux droit', x: 31, y: 17, radius: 2.5 },
  { id: 'infraspinatus_left', name: 'Sous-épineux gauche', x: 69, y: 17, radius: 2.5 },

  // ============================================
  // LOMBAIRES
  // ============================================
  { id: 'lower_back', name: 'Lombaires', x: 50, y: 38, radius: 4.5 },
  { id: 'lumbar_spine_upper', name: 'Lombaires L1-L2', x: 50, y: 35, radius: 2 },
  { id: 'lumbar_spine_middle', name: 'Lombaires L3', x: 50, y: 38, radius: 2 },
  { id: 'lumbar_spine_lower', name: 'Lombaires L4-L5', x: 50, y: 41, radius: 2 },
  { id: 'erector_spinae_right', name: 'Érecteurs rachis droits', x: 47, y: 33, radius: 2 },
  { id: 'erector_spinae_left', name: 'Érecteurs rachis gauches', x: 53, y: 33, radius: 2 },
  { id: 'ql_right', name: 'Carré des lombes droit', x: 44, y: 38, radius: 2.5 },
  { id: 'ql_left', name: 'Carré des lombes gauche', x: 56, y: 38, radius: 2.5 },

  // ============================================
  // SACRUM & FESSIERS
  // ============================================
  { id: 'sacrum', name: 'Sacrum', x: 50, y: 44, radius: 2.5 },
  { id: 'sacroiliac_right', name: 'Sacro-iliaque droit', x: 47, y: 43, radius: 1.8 },
  { id: 'sacroiliac_left', name: 'Sacro-iliaque gauche', x: 53, y: 43, radius: 1.8 },
  { id: 'glute_max_right', name: 'Grand fessier droit', x: 41, y: 48, radius: 4.5 },
  { id: 'glute_max_left', name: 'Grand fessier gauche', x: 59, y: 48, radius: 4.5 },
  { id: 'glute_med_right', name: 'Moyen fessier droit', x: 39, y: 45, radius: 2.5 },
  { id: 'glute_med_left', name: 'Moyen fessier gauche', x: 61, y: 45, radius: 2.5 },
  { id: 'piriformis_right', name: 'Piriforme droit (sciatique)', x: 44, y: 47, radius: 2 },
  { id: 'piriformis_left', name: 'Piriforme gauche (sciatique)', x: 56, y: 47, radius: 2 },

  // ============================================
  // CUISSE ARRIÈRE DROITE
  // ============================================
  { id: 'hamstring_right', name: 'Ischio-jambiers droits', x: 40, y: 58, radius: 4 },
  { id: 'biceps_femoris_right', name: 'Biceps fémoral droit', x: 38, y: 57, radius: 2.5 },
  { id: 'semitendinosus_right', name: 'Semi-tendineux droit', x: 41, y: 59, radius: 2 },
  { id: 'semimembranosus_right', name: 'Semi-membraneux droit', x: 42, y: 58, radius: 2 },

  // ============================================
  // CUISSE ARRIÈRE GAUCHE
  // ============================================
  { id: 'hamstring_left', name: 'Ischio-jambiers gauches', x: 60, y: 58, radius: 4 },
  { id: 'biceps_femoris_left', name: 'Biceps fémoral gauche', x: 62, y: 57, radius: 2.5 },
  { id: 'semitendinosus_left', name: 'Semi-tendineux gauche', x: 59, y: 59, radius: 2 },
  { id: 'semimembranosus_left', name: 'Semi-membraneux gauche', x: 58, y: 58, radius: 2 },

  // ============================================
  // GENOU ARRIÈRE
  // ============================================
  { id: 'knee_back_right', name: 'Creux poplité droit', x: 40, y: 66, radius: 2.5 },
  { id: 'knee_back_left', name: 'Creux poplité gauche', x: 60, y: 66, radius: 2.5 },
  { id: 'pcl_right', name: 'LCP droit', x: 40, y: 65.5, radius: 1.5 },
  { id: 'pcl_left', name: 'LCP gauche', x: 60, y: 65.5, radius: 1.5 },

  // ============================================
  // MOLLETS
  // ============================================
  { id: 'calf_right', name: 'Mollet droit', x: 40, y: 75, radius: 3.5 },
  { id: 'gastrocnemius_right', name: 'Gastrocnémien droit', x: 40, y: 73, radius: 2.5 },
  { id: 'soleus_right', name: 'Soléaire droit', x: 40, y: 78, radius: 2.5 },

  { id: 'calf_left', name: 'Mollet gauche', x: 60, y: 75, radius: 3.5 },
  { id: 'gastrocnemius_left', name: 'Gastrocnémien gauche', x: 60, y: 73, radius: 2.5 },
  { id: 'soleus_left', name: 'Soléaire gauche', x: 60, y: 78, radius: 2.5 },

  // ============================================
  // TENDONS D'ACHILLE
  // ============================================
  { id: 'achilles_right', name: "Tendon d'Achille droit", x: 40, y: 85, radius: 2 },
  { id: 'achilles_left', name: "Tendon d'Achille gauche", x: 60, y: 85, radius: 2 },

  // ============================================
  // CHEVILLES & TALONS
  // ============================================
  { id: 'ankle_back_right', name: 'Cheville arrière droite', x: 40, y: 87, radius: 2.5 },
  { id: 'ankle_back_left', name: 'Cheville arrière gauche', x: 60, y: 87, radius: 2.5 },
  { id: 'heel_right', name: 'Talon droit', x: 40, y: 90, radius: 2.5 },
  { id: 'heel_left', name: 'Talon gauche', x: 60, y: 90, radius: 2.5 },
  { id: 'calcaneus_right', name: 'Calcanéum droit', x: 40, y: 89, radius: 2 },
  { id: 'calcaneus_left', name: 'Calcanéum gauche', x: 60, y: 89, radius: 2 },

  // ============================================
  // PIEDS ARRIÈRE
  // ============================================
  { id: 'foot_back_right', name: 'Pied arrière droit', x: 40, y: 92, radius: 2 },
  { id: 'foot_back_left', name: 'Pied arrière gauche', x: 60, y: 92, radius: 2 },
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
