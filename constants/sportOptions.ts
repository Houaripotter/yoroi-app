/**
 * Sport Options Constants
 *
 * Définitions des sous-options pour chaque sport
 * (Exercices, techniques, styles, etc.)
 *
 * Extrait de add-training.tsx pour améliorer la maintenabilité
 */

// ============================================
// TYPES
// ============================================

export type SportOption = {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  group?: string;
};

// ============================================
// OPTIONS PAR SPORT
// ============================================

export const SPORT_OPTIONS: Record<string, SportOption[]> = {
  // ═══════════════════════════════════════════
  // COMBAT - GRAPPLING
  // ═══════════════════════════════════════════
  jjb: [
    { id: 'jjb_tech', label: 'Technique', icon: 'school', color: '#8B5CF6', group: 'TYPE' },
    { id: 'jjb_drill', label: 'Drill', icon: 'refresh', color: '#3B82F6', group: 'TYPE' },
    { id: 'jjb_spar', label: 'Sparring', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'jjb_roll', label: 'Rolling', icon: 'refresh-circle', color: '#10B981', group: 'TYPE' },
    { id: 'jjb_comp', label: 'Compétition', icon: 'trophy', color: '#EAB308', group: 'TYPE' },
    { id: 'g_closed', label: 'Garde Fermée', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_half', label: 'Demi-Garde', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_open', label: 'Garde Ouverte', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_dlr', label: 'De La Riva', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_spider', label: 'Spider Guard', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'p_knee', label: 'Knee Cut', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 'p_tor', label: 'Torreando', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 'p_stack', label: 'Stack Pass', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 's_arm', label: 'Clé de bras', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_tri', label: 'Triangle', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_kim', label: 'Kimura', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_rnc', label: 'Étrang. Arrière', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 'l_sing', label: 'Single Leg', icon: 'arrow-down-bold', color: '#F97316', group: 'LUTTE' },
    { id: 'l_doub', label: 'Double Leg', icon: 'arrow-down-bold', color: '#F97316', group: 'LUTTE' },
    { id: 'l_snap', label: 'Snapdown', icon: 'arrow-down-bold', color: '#F97316', group: 'LUTTE' },
  ],
  judo: [
    { id: 'j_rand', label: 'Randori', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'j_uchi', label: 'Uchi-komi', icon: 'refresh', color: '#3B82F6', group: 'TYPE' },
    { id: 'j_kata', label: 'Kata', icon: 'account-group', color: '#10B981', group: 'TYPE' },
    { id: 't_ashi', label: 'Jambes (Ashi)', icon: 'shoe-sneaker', color: '#F97316', group: 'PROJECTIONS' },
    { id: 't_te', label: 'Bras (Te)', icon: 'hand-front-right', color: '#14B8A6', group: 'PROJECTIONS' },
    { id: 't_koshi', label: 'Hanches (Koshi)', icon: 'human', color: '#EAB308', group: 'PROJECTIONS' },
    { id: 't_ne', label: 'Sol (Ne-waza)', icon: 'floor-plan', color: '#F59E0B', group: 'PROJECTIONS' },
  ],
  lutte: [
    { id: 'lu_tech', label: 'Technique', icon: 'school', color: '#8B5CF6', group: 'TYPE' },
    { id: 'lu_spar', label: 'Combat', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'lu_sing', label: 'Single Leg', icon: 'human-male', color: '#3B82F6', group: 'TAKEDOWNS' },
    { id: 'lu_doub', label: 'Double Leg', icon: 'run', color: '#3B82F6', group: 'TAKEDOWNS' },
    { id: 'lu_clinch', label: 'Clinch', icon: 'account-multiple', color: '#10B981', group: 'TECHNIQUE' },
    { id: 'lu_ground', label: 'Travail au sol', icon: 'floor-plan', color: '#F59E0B', group: 'TECHNIQUE' },
  ],

  // ═══════════════════════════════════════════
  // COMBAT - STRIKING
  // ═══════════════════════════════════════════
  boxe: [
    { id: 'bo_shad', label: 'Shadow', icon: 'human-handsup', color: '#3B82F6', group: 'TYPE' },
    { id: 'bo_bag', label: 'Sac de frappe', icon: 'bag-personal', color: '#8B5CF6', group: 'TYPE' },
    { id: 'bo_pads', label: 'Pattes d\'ours', icon: 'hand-back-left', color: '#F59E0B', group: 'TYPE' },
    { id: 'bo_spar', label: 'Sparring', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'bo_foot', label: 'Footwork', icon: 'shoe-sneaker', color: '#06B6D4', group: 'FOCUS' },
    { id: 'bo_def', label: 'Défense', icon: 'shield', color: '#EC4899', group: 'FOCUS' },
    { id: 'bo_speed', label: 'Vitesse', icon: 'lightning-bolt', color: '#EAB308', group: 'FOCUS' },
  ],
  muay_thai: [
    { id: 'mt_pads', label: 'Paos Thai', icon: 'hand-back-left', color: '#F59E0B', group: 'TYPE' },
    { id: 'mt_spar', label: 'Sparring', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'mt_clinch', label: 'Clinch', icon: 'account-multiple', color: '#3B82F6', group: 'TECHNIQUES' },
    { id: 'mt_elbows', label: 'Coudes', icon: 'arm-flex', color: '#06B6D4', group: 'TECHNIQUES' },
    { id: 'mt_knees', label: 'Genoux', icon: 'human-male', color: '#EC4899', group: 'TECHNIQUES' },
    { id: 'mt_kicks', label: 'Kicks', icon: 'karate', color: '#84CC16', group: 'TECHNIQUES' },
  ],

  // ═══════════════════════════════════════════
  // MUSCULATION (PAR GROUPE MUSCULAIRE)
  // ═══════════════════════════════════════════
  musculation: [
    { id: 'm_c_be', label: 'Développé Couché', icon: 'arm-flex', color: '#EF4444', group: 'PECTORAUX' },
    { id: 'm_c_in', label: 'Développé Incliné', icon: 'arm-flex', color: '#EF4444', group: 'PECTORAUX' },
    { id: 'm_c_fl', label: 'Écartés', icon: 'arm-flex', color: '#EF4444', group: 'PECTORAUX' },
    { id: 'm_b_pu', label: 'Tractions', icon: 'human', color: '#3B82F6', group: 'DOS' },
    { id: 'm_b_ro', label: 'Rowing', icon: 'human', color: '#3B82F6', group: 'DOS' },
    { id: 'm_b_pd', label: 'Tirage Vertical', icon: 'human', color: '#3B82F6', group: 'DOS' },
    { id: 'm_s_pr', label: 'Militaire', icon: 'triangle', color: '#F59E0B', group: 'ÉPAULES' },
    { id: 'm_s_la', label: 'Latérales', icon: 'triangle', color: '#F59E0B', group: 'ÉPAULES' },
    { id: 'm_a_bi', label: 'Biceps', icon: 'arm-flex', color: '#8B5CF6', group: 'BRAS' },
    { id: 'm_a_tr', label: 'Triceps', icon: 'arm-flex-outline', color: '#8B5CF6', group: 'BRAS' },
    { id: 'm_l_sq', label: 'Squat', icon: 'human-male', color: '#06B6D4', group: 'JAMBES' },
    { id: 'm_l_pr', label: 'Presse', icon: 'human-male', color: '#06B6D4', group: 'JAMBES' },
    { id: 'm_abs_c', label: 'Crunch', icon: 'view-grid', color: '#84CC16', group: 'ABDOMINAUX' },
    { id: 'm_abs_p', label: 'Planche', icon: 'view-grid', color: '#84CC16', group: 'ABDOMINAUX' },
    // AJOUT KETTLEBELL & LOMBAIRES
    { id: 'm_ket_sw', label: 'Kettlebell Swing', icon: 'kettlebell', color: '#F59E0B', group: 'KETTLEBELL' },
    { id: 'm_ket_sn', label: 'KB Snatch', icon: 'kettlebell', color: '#F59E0B', group: 'KETTLEBELL' },
    { id: 'm_ket_cl', label: 'KB Clean & Press', icon: 'kettlebell', color: '#F59E0B', group: 'KETTLEBELL' },
    { id: 'm_ket_grip', label: 'Grip avec manchon training', icon: 'hand-back-right', color: '#F59E0B', group: 'KETTLEBELL' },
    { id: 'm_lom_ma', label: 'Banc à Lombaires', icon: 'human', color: '#3B82F6', group: 'LOMBAIRES' },
    { id: 'm_lom_hi', label: 'Hyperextensions', icon: 'human', color: '#3B82F6', group: 'LOMBAIRES' },
    // AJOUT CARDIO DANS MUSCULATION
    { id: 'm_car_tre', label: 'Tapis de course', icon: 'run-fast', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_inc', label: 'Marche Inclinée', icon: 'trending-up', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_bik', label: 'Vélo Stationnaire', icon: 'bike', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_row', label: 'Rameur', icon: 'rowing', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_stai', label: 'Stairmaster', icon: 'stairs', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_elli', label: 'Elliptique', icon: 'bike-fast', color: '#10B981', group: 'CARDIO' },
  ],

  // ═══════════════════════════════════════════
  // RUNNING
  // ═══════════════════════════════════════════
  running: [
    { id: 'r_5k', label: '5 KM', icon: 'run', color: '#3B82F6', group: 'DISTANCES' },
    { id: 'r_10k', label: '10 KM', icon: 'run-fast', color: '#3B82F6', group: 'DISTANCES' },
    { id: 'r_semi', label: 'Semi-Marathon', icon: 'trophy', color: '#3B82F6', group: 'DISTANCES' },
    { id: 'r_mara', label: 'Marathon', icon: 'medal', color: '#3B82F6', group: 'DISTANCES' },
    { id: 'r_endu', label: 'Endurance', icon: 'clock-outline', color: '#10B981', group: 'TYPE' },
    { id: 'r_frac', label: 'Fractionné', icon: 'chart-line', color: '#EF4444', group: 'TYPE' },
    { id: 'r_incl', label: 'Marche Inclinée', icon: 'trending-up', color: '#F59E0B', group: 'TYPE' },
    { id: 'r_trai', label: 'Trail', icon: 'terrain', color: '#F97316', group: 'LIEU' },
    { id: 'r_trea', label: 'Tapis', icon: 'run-fast', color: '#8B5CF6', group: 'LIEU' },
  ],
  natation: [
    { id: 'sw_crawl', label: 'Crawl', icon: 'swim', color: '#3B82F6', group: 'STYLES' },
    { id: 'sw_brasse', label: 'Brasse', icon: 'swim', color: '#3B82F6', group: 'STYLES' },
    { id: 'sw_dos', label: 'Dos Crawlé', icon: 'swim', color: '#3B82F6', group: 'STYLES' },
    { id: 'sw_pap', label: 'Papillon', icon: 'swim', color: '#3B82F6', group: 'STYLES' },
    { id: 'sw_endu', label: 'Endurance', icon: 'clock-outline', color: '#10B981', group: 'TYPE' },
    { id: 'sw_speed', label: 'Vitesse', icon: 'lightning-bolt', color: '#EF4444', group: 'TYPE' },
  ],
  marche: [
    { id: 'ma_walk', label: 'Marche Active', icon: 'walk', color: '#10B981', group: 'TYPE' },
    { id: 'ma_incl', label: 'Marche Inclinée', icon: 'trending-up', color: '#F59E0B', group: 'TYPE' },
    { id: 'ma_hike', label: 'Randonnée', icon: 'terrain', color: '#10B981', group: 'LIEU' },
    { id: 'ma_urban', label: 'Marche Urbaine', icon: 'city', color: '#3B82F6', group: 'LIEU' },
  ],
  velo: [
    { id: 've_road', label: 'Vélo de Route', icon: 'bike-fast', color: '#3B82F6', group: 'TYPE' },
    { id: 've_vtt', label: 'VTT / Cross', icon: 'terrain', color: '#10B981', group: 'TYPE' },
    { id: 've_indoor', label: 'Vélo Appart.', icon: 'bike', color: '#8B5CF6', group: 'TYPE' },
    { id: 've_spinning', label: 'Spinning/RPM', icon: 'fire', color: '#EF4444', group: 'TYPE' },
  ],
};

// Options par défaut pour les sports sans options spécifiques
export const DEFAULT_OPTIONS: SportOption[] = [
  { id: 'training', label: 'Entrainement', icon: 'dumbbell', color: '#3B82F6' },
  { id: 'technique', label: 'Technique', icon: 'school', color: '#8B5CF6' },
  { id: 'sparring', label: 'Sparring/Match', icon: 'sword-cross', color: '#EF4444' },
  { id: 'competition', label: 'Competition', icon: 'trophy', color: '#10B981' },
];
