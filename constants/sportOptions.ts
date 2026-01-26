/**
 * Sport Options Constants
 *
 * Définitions des sous-options pour chaque sport
 * (Exercices, techniques, styles, etc.)
 */

export type SportOption = {
  id: string;
  label: string;
  icon?: string;
  color?: string;
  group?: string;
};

export const SPORT_OPTIONS: Record<string, SportOption[]> = {
  // ═══════════════════════════════════════════
  // COMBAT - GRAPPLING
  // ═══════════════════════════════════════════
  jjb: [
    // TYPE D'ENTRAÎNEMENT
    { id: 'jjb_tech', label: 'Technique', icon: 'school', color: '#8B5CF6', group: 'TYPE' },
    { id: 'jjb_drill', label: 'Drill', icon: 'refresh', color: '#3B82F6', group: 'TYPE' },
    { id: 'jjb_spar', label: 'Sparring', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'jjb_roll', label: 'Rolling', icon: 'refresh-circle', color: '#10B981', group: 'TYPE' },
    { id: 'jjb_comp', label: 'Compétition', icon: 'trophy', color: '#EAB308', group: 'TYPE' },
    { id: 'jjb_flow', label: 'Flow Roll', icon: 'water', color: '#06B6D4', group: 'TYPE' },
    { id: 'jjb_pos', label: 'Positional', icon: 'target', color: '#F97316', group: 'TYPE' },
    // GARDES
    { id: 'g_closed', label: 'Garde Fermée', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_half', label: 'Demi-Garde', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_open', label: 'Garde Ouverte', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_dlr', label: 'De La Riva', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_rdlr', label: 'Reverse DLR', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_spider', label: 'Spider Guard', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_lasso', label: 'Lasso Guard', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_xguard', label: 'X-Guard', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_slx', label: 'Single Leg X', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_butterfly', label: 'Papillon', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_rubber', label: 'Rubber Guard', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_worm', label: 'Worm Guard', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_50', label: '50/50', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    { id: 'g_kguard', label: 'K-Guard', icon: 'shield', color: '#06B6D4', group: 'GARDES' },
    // PASSAGES
    { id: 'p_knee', label: 'Knee Cut', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 'p_tor', label: 'Torreando', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 'p_stack', label: 'Stack Pass', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 'p_smash', label: 'Smash Pass', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 'p_legdrag', label: 'Leg Drag', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 'p_bodylock', label: 'Body Lock', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 'p_xpass', label: 'X-Pass', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 'p_overunder', label: 'Over/Under', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    { id: 'p_hq', label: 'Headquarters', icon: 'arrow-right-bold', color: '#84CC16', group: 'PASSAGES' },
    // SOUMISSIONS
    { id: 's_arm', label: 'Armbar', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_tri', label: 'Triangle', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_kim', label: 'Kimura', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_rnc', label: 'RNC', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_guil', label: 'Guillotine', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_darce', label: 'D\'arce', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_ana', label: 'Anaconda', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_omo', label: 'Omoplata', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    { id: 's_bow', label: 'Bow & Arrow', icon: 'hand-back-left', color: '#EC4899', group: 'SOUMISSIONS' },
    // LEG LOCKS
    { id: 'll_heel', label: 'Heel Hook', icon: 'shoe-formal', color: '#DC2626', group: 'LEG LOCKS' },
    { id: 'll_ankle', label: 'Ankle Lock', icon: 'shoe-formal', color: '#DC2626', group: 'LEG LOCKS' },
    { id: 'll_knee', label: 'Kneebar', icon: 'shoe-formal', color: '#DC2626', group: 'LEG LOCKS' },
    { id: 'll_toe', label: 'Toe Hold', icon: 'shoe-formal', color: '#DC2626', group: 'LEG LOCKS' },
    { id: 'll_calf', label: 'Calf Slicer', icon: 'shoe-formal', color: '#DC2626', group: 'LEG LOCKS' },
    // SWEEPS
    { id: 'sw_scis', label: 'Scissor', icon: 'swap-vertical', color: '#14B8A6', group: 'SWEEPS' },
    { id: 'sw_hip', label: 'Hip Bump', icon: 'swap-vertical', color: '#14B8A6', group: 'SWEEPS' },
    { id: 'sw_flower', label: 'Flower', icon: 'swap-vertical', color: '#14B8A6', group: 'SWEEPS' },
    { id: 'sw_butterfly', label: 'Butterfly', icon: 'swap-vertical', color: '#14B8A6', group: 'SWEEPS' },
    { id: 'sw_berim', label: 'Berimbolo', icon: 'swap-vertical', color: '#14B8A6', group: 'SWEEPS' },
    // LUTTE
    { id: 'l_sing', label: 'Single Leg', icon: 'arrow-down-bold', color: '#F97316', group: 'LUTTE' },
    { id: 'l_doub', label: 'Double Leg', icon: 'arrow-down-bold', color: '#F97316', group: 'LUTTE' },
    { id: 'l_snap', label: 'Snapdown', icon: 'arrow-down-bold', color: '#F97316', group: 'LUTTE' },
    { id: 'l_armdrag', label: 'Arm Drag', icon: 'arrow-down-bold', color: '#F97316', group: 'LUTTE' },
    { id: 'l_collar', label: 'Collar Drag', icon: 'arrow-down-bold', color: '#F97316', group: 'LUTTE' },
    { id: 'l_ankle', label: 'Ankle Pick', icon: 'arrow-down-bold', color: '#F97316', group: 'LUTTE' },
  ],

  judo: [
    // TYPE
    { id: 'j_rand', label: 'Randori', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'j_uchi', label: 'Uchi-komi', icon: 'refresh', color: '#3B82F6', group: 'TYPE' },
    { id: 'j_nage', label: 'Nage-komi', icon: 'arrow-down', color: '#8B5CF6', group: 'TYPE' },
    { id: 'j_kata', label: 'Kata', icon: 'account-group', color: '#10B981', group: 'TYPE' },
    { id: 'j_newaza', label: 'Ne-waza', icon: 'floor-plan', color: '#F59E0B', group: 'TYPE' },
    // PROJECTIONS JAMBES
    { id: 't_osoto', label: 'O-soto-gari', icon: 'shoe-sneaker', color: '#F97316', group: 'ASHI-WAZA' },
    { id: 't_ouchi', label: 'O-uchi-gari', icon: 'shoe-sneaker', color: '#F97316', group: 'ASHI-WAZA' },
    { id: 't_kouchi', label: 'Ko-uchi-gari', icon: 'shoe-sneaker', color: '#F97316', group: 'ASHI-WAZA' },
    { id: 't_deashi', label: 'De-ashi-barai', icon: 'shoe-sneaker', color: '#F97316', group: 'ASHI-WAZA' },
    { id: 't_sasae', label: 'Sasae', icon: 'shoe-sneaker', color: '#F97316', group: 'ASHI-WAZA' },
    // PROJECTIONS HANCHES
    { id: 't_ogoshi', label: 'O-goshi', icon: 'human', color: '#EAB308', group: 'KOSHI-WAZA' },
    { id: 't_harai', label: 'Harai-goshi', icon: 'human', color: '#EAB308', group: 'KOSHI-WAZA' },
    { id: 't_uchimata', label: 'Uchi-mata', icon: 'human', color: '#EAB308', group: 'KOSHI-WAZA' },
    { id: 't_hanegoshi', label: 'Hane-goshi', icon: 'human', color: '#EAB308', group: 'KOSHI-WAZA' },
    // PROJECTIONS BRAS
    { id: 't_seoi', label: 'Seoi-nage', icon: 'hand-front-right', color: '#14B8A6', group: 'TE-WAZA' },
    { id: 't_ippon', label: 'Ippon-seoi', icon: 'hand-front-right', color: '#14B8A6', group: 'TE-WAZA' },
    { id: 't_tai', label: 'Tai-otoshi', icon: 'hand-front-right', color: '#14B8A6', group: 'TE-WAZA' },
    { id: 't_kata', label: 'Kata-guruma', icon: 'hand-front-right', color: '#14B8A6', group: 'TE-WAZA' },
    // SACRIFICES
    { id: 't_tomoe', label: 'Tomoe-nage', icon: 'rotate-3d-variant', color: '#EC4899', group: 'SUTEMI' },
    { id: 't_sumi', label: 'Sumi-gaeshi', icon: 'rotate-3d-variant', color: '#EC4899', group: 'SUTEMI' },
    { id: 't_tani', label: 'Tani-otoshi', icon: 'rotate-3d-variant', color: '#EC4899', group: 'SUTEMI' },
    // SOL
    { id: 'n_kesa', label: 'Kesa-gatame', icon: 'floor-plan', color: '#F59E0B', group: 'NE-WAZA' },
    { id: 'n_juji', label: 'Juji-gatame', icon: 'floor-plan', color: '#F59E0B', group: 'NE-WAZA' },
    { id: 'n_sankaku', label: 'Sankaku', icon: 'floor-plan', color: '#F59E0B', group: 'NE-WAZA' },
    { id: 'n_hadaka', label: 'Hadaka-jime', icon: 'floor-plan', color: '#F59E0B', group: 'NE-WAZA' },
  ],

  lutte: [
    // TYPE
    { id: 'lu_tech', label: 'Technique', icon: 'school', color: '#8B5CF6', group: 'TYPE' },
    { id: 'lu_spar', label: 'Combat', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'lu_greco', label: 'Gréco-Romaine', icon: 'human-male', color: '#F59E0B', group: 'TYPE' },
    { id: 'lu_libre', label: 'Lutte Libre', icon: 'run', color: '#3B82F6', group: 'TYPE' },
    { id: 'lu_chain', label: 'Chain Wrestling', icon: 'link', color: '#10B981', group: 'TYPE' },
    // TAKEDOWNS
    { id: 'lu_sing', label: 'Single Leg', icon: 'human-male', color: '#3B82F6', group: 'TAKEDOWNS' },
    { id: 'lu_doub', label: 'Double Leg', icon: 'run', color: '#3B82F6', group: 'TAKEDOWNS' },
    { id: 'lu_high', label: 'High Crotch', icon: 'arrow-up-bold', color: '#3B82F6', group: 'TAKEDOWNS' },
    { id: 'lu_fire', label: 'Fireman\'s Carry', icon: 'arm-flex', color: '#3B82F6', group: 'TAKEDOWNS' },
    { id: 'lu_ankle', label: 'Ankle Pick', icon: 'shoe-sneaker', color: '#3B82F6', group: 'TAKEDOWNS' },
    { id: 'lu_duck', label: 'Duck Under', icon: 'arrow-down', color: '#3B82F6', group: 'TAKEDOWNS' },
    { id: 'lu_slide', label: 'Slide By', icon: 'arrow-right', color: '#3B82F6', group: 'TAKEDOWNS' },
    { id: 'lu_snap', label: 'Snap Down', icon: 'arrow-down-bold', color: '#3B82F6', group: 'TAKEDOWNS' },
    { id: 'lu_front', label: 'Front Headlock', icon: 'head', color: '#3B82F6', group: 'TAKEDOWNS' },
    // GRÉCO
    { id: 'lu_arm', label: 'Arm Throw', icon: 'arm-flex', color: '#F59E0B', group: 'GRÉCO' },
    { id: 'lu_sup', label: 'Suplex', icon: 'rotate-3d', color: '#F59E0B', group: 'GRÉCO' },
    { id: 'lu_hip', label: 'Hip Toss', icon: 'human', color: '#F59E0B', group: 'GRÉCO' },
    { id: 'lu_body', label: 'Body Lock', icon: 'account-multiple', color: '#F59E0B', group: 'GRÉCO' },
    { id: 'lu_lateral', label: 'Lateral Drop', icon: 'arrow-left-right', color: '#F59E0B', group: 'GRÉCO' },
    // PAR TERRE
    { id: 'lu_break', label: 'Breakdown', icon: 'floor-plan', color: '#10B981', group: 'PAR TERRE' },
    { id: 'lu_gut', label: 'Gut Wrench', icon: 'stomach', color: '#10B981', group: 'PAR TERRE' },
    { id: 'lu_leg', label: 'Leg Riding', icon: 'shoe-formal', color: '#10B981', group: 'PAR TERRE' },
    { id: 'lu_cradle', label: 'Cradle', icon: 'baby-carriage', color: '#10B981', group: 'PAR TERRE' },
    { id: 'lu_half', label: 'Half Nelson', icon: 'hand-back-right', color: '#10B981', group: 'PAR TERRE' },
    // ESCAPES
    { id: 'lu_stand', label: 'Stand Up', icon: 'arrow-up', color: '#EC4899', group: 'ESCAPES' },
    { id: 'lu_sit', label: 'Sit Out', icon: 'seat', color: '#EC4899', group: 'ESCAPES' },
    { id: 'lu_switch', label: 'Switch', icon: 'swap-horizontal', color: '#EC4899', group: 'ESCAPES' },
    { id: 'lu_granby', label: 'Granby Roll', icon: 'rotate-3d-variant', color: '#EC4899', group: 'ESCAPES' },
  ],

  // ═══════════════════════════════════════════
  // COMBAT - STRIKING
  // ═══════════════════════════════════════════
  boxe: [
    // TYPE
    { id: 'bo_shad', label: 'Shadow', icon: 'human-handsup', color: '#3B82F6', group: 'TYPE' },
    { id: 'bo_bag', label: 'Sac de frappe', icon: 'bag-personal', color: '#8B5CF6', group: 'TYPE' },
    { id: 'bo_pads', label: 'Pattes d\'ours', icon: 'hand-back-left', color: '#F59E0B', group: 'TYPE' },
    { id: 'bo_spar', label: 'Sparring', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'bo_sparlight', label: 'Sparring Light', icon: 'sword-cross', color: '#10B981', group: 'TYPE' },
    { id: 'bo_tech', label: 'Technique', icon: 'school', color: '#14B8A6', group: 'TYPE' },
    // FRAPPES
    { id: 'bo_jab', label: 'Jab', icon: 'boxing-glove', color: '#3B82F6', group: 'FRAPPES' },
    { id: 'bo_cross', label: 'Cross', icon: 'boxing-glove', color: '#3B82F6', group: 'FRAPPES' },
    { id: 'bo_hook', label: 'Crochet', icon: 'boxing-glove', color: '#3B82F6', group: 'FRAPPES' },
    { id: 'bo_upper', label: 'Uppercut', icon: 'boxing-glove', color: '#3B82F6', group: 'FRAPPES' },
    { id: 'bo_over', label: 'Overhand', icon: 'boxing-glove', color: '#3B82F6', group: 'FRAPPES' },
    { id: 'bo_body', label: 'Body Shots', icon: 'boxing-glove', color: '#3B82F6', group: 'FRAPPES' },
    // COMBOS
    { id: 'bo_12', label: 'Jab-Cross (1-2)', icon: 'numeric-2-box', color: '#8B5CF6', group: 'COMBOS' },
    { id: 'bo_123', label: '1-2-Hook', icon: 'numeric-3-box', color: '#8B5CF6', group: 'COMBOS' },
    { id: 'bo_1232', label: '1-2-Hook-Cross', icon: 'numeric-4-box', color: '#8B5CF6', group: 'COMBOS' },
    // FOCUS
    { id: 'bo_foot', label: 'Footwork', icon: 'shoe-sneaker', color: '#06B6D4', group: 'FOCUS' },
    { id: 'bo_def', label: 'Défense', icon: 'shield', color: '#EC4899', group: 'FOCUS' },
    { id: 'bo_speed', label: 'Vitesse', icon: 'lightning-bolt', color: '#EAB308', group: 'FOCUS' },
    { id: 'bo_power', label: 'Puissance', icon: 'arm-flex', color: '#DC2626', group: 'FOCUS' },
    { id: 'bo_counter', label: 'Counter', icon: 'undo', color: '#10B981', group: 'FOCUS' },
    { id: 'bo_clinch', label: 'Clinch', icon: 'account-multiple', color: '#F97316', group: 'FOCUS' },
  ],

  muay_thai: [
    // TYPE
    { id: 'mt_pads', label: 'Paos Thai', icon: 'hand-back-left', color: '#F59E0B', group: 'TYPE' },
    { id: 'mt_spar', label: 'Sparring', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'mt_tech', label: 'Technique', icon: 'school', color: '#8B5CF6', group: 'TYPE' },
    { id: 'mt_shad', label: 'Shadow', icon: 'human-handsup', color: '#3B82F6', group: 'TYPE' },
    { id: 'mt_bag', label: 'Heavy Bag', icon: 'bag-personal', color: '#10B981', group: 'TYPE' },
    { id: 'mt_cond', label: 'Conditioning', icon: 'fire', color: '#DC2626', group: 'TYPE' },
    // TECHNIQUES
    { id: 'mt_teep', label: 'Teep', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    { id: 'mt_low', label: 'Low Kick', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    { id: 'mt_body', label: 'Body Kick', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    { id: 'mt_head', label: 'Head Kick', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    { id: 'mt_switch', label: 'Switch Kick', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    { id: 'mt_question', label: 'Question Mark', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    // CLINCH
    { id: 'mt_clinch', label: 'Clinch', icon: 'account-multiple', color: '#3B82F6', group: 'CLINCH' },
    { id: 'mt_elbows', label: 'Coudes', icon: 'arm-flex', color: '#06B6D4', group: 'CLINCH' },
    { id: 'mt_knees', label: 'Genoux', icon: 'human-male', color: '#EC4899', group: 'CLINCH' },
    { id: 'mt_dump', label: 'Dump', icon: 'arrow-down-bold', color: '#F97316', group: 'CLINCH' },
    { id: 'mt_sweep', label: 'Sweep', icon: 'swap-vertical', color: '#14B8A6', group: 'CLINCH' },
    // DÉFENSE
    { id: 'mt_check', label: 'Check', icon: 'shield', color: '#EC4899', group: 'DÉFENSE' },
    { id: 'mt_catch', label: 'Catch & Kick', icon: 'hand-back-right', color: '#EC4899', group: 'DÉFENSE' },
  ],

  mma: [
    // TYPE
    { id: 'mma_spar', label: 'Sparring', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'mma_sparlight', label: 'Sparring Light', icon: 'sword-cross', color: '#10B981', group: 'TYPE' },
    { id: 'mma_tech', label: 'Technique', icon: 'school', color: '#8B5CF6', group: 'TYPE' },
    { id: 'mma_shad', label: 'Shadow MMA', icon: 'human-handsup', color: '#3B82F6', group: 'TYPE' },
    { id: 'mma_pads', label: 'Pads MMA', icon: 'hand-back-left', color: '#F59E0B', group: 'TYPE' },
    // STRIKING
    { id: 'mma_strike', label: 'Striking', icon: 'boxing-glove', color: '#3B82F6', group: 'STRIKING' },
    { id: 'mma_dirty', label: 'Dirty Boxing', icon: 'boxing-glove', color: '#F97316', group: 'STRIKING' },
    { id: 'mma_kicks', label: 'Leg Kicks', icon: 'shoe-sneaker', color: '#06B6D4', group: 'STRIKING' },
    { id: 'mma_elbow', label: 'Coudes', icon: 'arm-flex', color: '#EC4899', group: 'STRIKING' },
    { id: 'mma_knee', label: 'Genoux', icon: 'human-male', color: '#14B8A6', group: 'STRIKING' },
    { id: 'mma_gnp', label: 'Ground & Pound', icon: 'fist', color: '#DC2626', group: 'STRIKING' },
    // GRAPPLING
    { id: 'mma_wall', label: 'Wall Wrestling', icon: 'wall', color: '#8B5CF6', group: 'GRAPPLING' },
    { id: 'mma_cage', label: 'Cage Work', icon: 'vector-polygon', color: '#8B5CF6', group: 'GRAPPLING' },
    { id: 'mma_td', label: 'Takedowns', icon: 'arrow-down-bold', color: '#8B5CF6', group: 'GRAPPLING' },
    { id: 'mma_tdd', label: 'TD Defense', icon: 'shield', color: '#EC4899', group: 'GRAPPLING' },
    { id: 'mma_sub', label: 'Submissions', icon: 'hand-back-left', color: '#DC2626', group: 'GRAPPLING' },
    { id: 'mma_getup', label: 'Get Up', icon: 'arrow-up', color: '#10B981', group: 'GRAPPLING' },
    // TRANSITIONS
    { id: 'mma_trans', label: 'Transitions', icon: 'swap-horizontal', color: '#F59E0B', group: 'TRANSITIONS' },
    { id: 'mma_sprawl', label: 'Sprawl & Brawl', icon: 'human-handsdown', color: '#F97316', group: 'TRANSITIONS' },
  ],

  kickboxing: [
    { id: 'kb_shad', label: 'Shadow', icon: 'human-handsup', color: '#3B82F6', group: 'TYPE' },
    { id: 'kb_bag', label: 'Heavy Bag', icon: 'bag-personal', color: '#8B5CF6', group: 'TYPE' },
    { id: 'kb_pads', label: 'Pads', icon: 'hand-back-left', color: '#F59E0B', group: 'TYPE' },
    { id: 'kb_spar', label: 'Sparring', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'kb_front', label: 'Front Kick', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    { id: 'kb_round', label: 'Roundhouse', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    { id: 'kb_side', label: 'Side Kick', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    { id: 'kb_hook', label: 'Hook Kick', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    { id: 'kb_axe', label: 'Axe Kick', icon: 'shoe-sneaker', color: '#06B6D4', group: 'KICKS' },
    { id: 'kb_spin', label: 'Spinning', icon: 'rotate-3d', color: '#EC4899', group: 'KICKS' },
    { id: 'kb_combo', label: 'Combos', icon: 'link', color: '#10B981', group: 'TECHNIQUE' },
  ],

  karate: [
    { id: 'ka_kata', label: 'Kata', icon: 'account-group', color: '#10B981', group: 'TYPE' },
    { id: 'ka_kihon', label: 'Kihon', icon: 'school', color: '#3B82F6', group: 'TYPE' },
    { id: 'ka_kumite', label: 'Kumite', icon: 'sword-cross', color: '#EF4444', group: 'TYPE' },
    { id: 'ka_bunkai', label: 'Bunkai', icon: 'puzzle', color: '#8B5CF6', group: 'TYPE' },
    { id: 'ka_gyaku', label: 'Gyaku-zuki', icon: 'boxing-glove', color: '#06B6D4', group: 'TSUKI' },
    { id: 'ka_oi', label: 'Oi-zuki', icon: 'boxing-glove', color: '#06B6D4', group: 'TSUKI' },
    { id: 'ka_mae', label: 'Mae-geri', icon: 'shoe-sneaker', color: '#F59E0B', group: 'GERI' },
    { id: 'ka_mawa', label: 'Mawashi-geri', icon: 'shoe-sneaker', color: '#F59E0B', group: 'GERI' },
    { id: 'ka_yoko', label: 'Yoko-geri', icon: 'shoe-sneaker', color: '#F59E0B', group: 'GERI' },
    { id: 'ka_ushiro', label: 'Ushiro-geri', icon: 'shoe-sneaker', color: '#F59E0B', group: 'GERI' },
    { id: 'ka_age', label: 'Age-uke', icon: 'shield', color: '#EC4899', group: 'UKE' },
    { id: 'ka_soto', label: 'Soto-uke', icon: 'shield', color: '#EC4899', group: 'UKE' },
    { id: 'ka_gedan', label: 'Gedan-barai', icon: 'shield', color: '#EC4899', group: 'UKE' },
  ],

  krav_maga: [
    { id: 'km_drill', label: 'Drills', icon: 'refresh', color: '#3B82F6', group: 'TYPE' },
    { id: 'km_scenario', label: 'Scénarios', icon: 'alert', color: '#EF4444', group: 'TYPE' },
    { id: 'km_stress', label: 'Stress Drills', icon: 'head-flash', color: '#DC2626', group: 'TYPE' },
    { id: 'km_choke', label: 'Choke Defense', icon: 'hand-back-right', color: '#EC4899', group: 'DÉFENSE' },
    { id: 'km_head', label: 'Headlock Defense', icon: 'head', color: '#EC4899', group: 'DÉFENSE' },
    { id: 'km_bear', label: 'Bear Hug Defense', icon: 'bear', color: '#EC4899', group: 'DÉFENSE' },
    { id: 'km_knife', label: 'Knife Defense', icon: 'knife', color: '#F97316', group: 'ARMES' },
    { id: 'km_gun', label: 'Gun Defense', icon: 'pistol', color: '#F97316', group: 'ARMES' },
    { id: 'km_palm', label: 'Palm Strike', icon: 'hand-back-left', color: '#3B82F6', group: 'FRAPPES' },
    { id: 'km_hammer', label: 'Hammer Fist', icon: 'fist', color: '#3B82F6', group: 'FRAPPES' },
    { id: 'km_elbow', label: 'Elbow', icon: 'arm-flex', color: '#3B82F6', group: 'FRAPPES' },
    { id: 'km_knee', label: 'Knee', icon: 'human-male', color: '#3B82F6', group: 'FRAPPES' },
    { id: 'km_ground', label: 'Ground Defense', icon: 'floor-plan', color: '#8B5CF6', group: 'SOL' },
    { id: 'km_multi', label: 'Multiple Attackers', icon: 'account-group', color: '#DC2626', group: 'AVANCÉ' },
  ],

  // ═══════════════════════════════════════════
  // MUSCULATION (PAR GROUPE MUSCULAIRE)
  // ═══════════════════════════════════════════
  musculation: [
    // PECTORAUX
    { id: 'm_c_be', label: 'Développé Couché', icon: 'arm-flex', color: '#EF4444', group: 'PECTORAUX' },
    { id: 'm_c_in', label: 'Développé Incliné', icon: 'arm-flex', color: '#EF4444', group: 'PECTORAUX' },
    { id: 'm_c_dec', label: 'Développé Décliné', icon: 'arm-flex', color: '#EF4444', group: 'PECTORAUX' },
    { id: 'm_c_fl', label: 'Écartés', icon: 'arm-flex', color: '#EF4444', group: 'PECTORAUX' },
    { id: 'm_c_pec', label: 'Pec Deck', icon: 'arm-flex', color: '#EF4444', group: 'PECTORAUX' },
    { id: 'm_c_dip', label: 'Dips Pecs', icon: 'arm-flex', color: '#EF4444', group: 'PECTORAUX' },
    { id: 'm_c_pump', label: 'Pompes', icon: 'arm-flex', color: '#EF4444', group: 'PECTORAUX' },
    // DOS
    { id: 'm_b_pu', label: 'Tractions', icon: 'human', color: '#3B82F6', group: 'DOS' },
    { id: 'm_b_ro', label: 'Rowing', icon: 'human', color: '#3B82F6', group: 'DOS' },
    { id: 'm_b_pd', label: 'Tirage Vertical', icon: 'human', color: '#3B82F6', group: 'DOS' },
    { id: 'm_b_hr', label: 'Tirage Horizontal', icon: 'human', color: '#3B82F6', group: 'DOS' },
    { id: 'm_b_dl', label: 'Soulevé de Terre', icon: 'human', color: '#3B82F6', group: 'DOS' },
    { id: 'm_b_lom', label: 'Lombaires', icon: 'human', color: '#3B82F6', group: 'DOS' },
    // ÉPAULES
    { id: 'm_s_pr', label: 'Militaire', icon: 'triangle', color: '#F59E0B', group: 'ÉPAULES' },
    { id: 'm_s_la', label: 'Latérales', icon: 'triangle', color: '#F59E0B', group: 'ÉPAULES' },
    { id: 'm_s_fr', label: 'Frontales', icon: 'triangle', color: '#F59E0B', group: 'ÉPAULES' },
    { id: 'm_s_oi', label: 'Oiseau', icon: 'triangle', color: '#F59E0B', group: 'ÉPAULES' },
    { id: 'm_s_sh', label: 'Shrugs', icon: 'triangle', color: '#F59E0B', group: 'ÉPAULES' },
    { id: 'm_s_fp', label: 'Face Pull', icon: 'triangle', color: '#F59E0B', group: 'ÉPAULES' },
    // BRAS
    { id: 'm_a_bi', label: 'Biceps', icon: 'arm-flex', color: '#8B5CF6', group: 'BRAS' },
    { id: 'm_a_tr', label: 'Triceps', icon: 'arm-flex-outline', color: '#8B5CF6', group: 'BRAS' },
    { id: 'm_a_av', label: 'Avant-bras', icon: 'arm-flex', color: '#8B5CF6', group: 'BRAS' },
    // JAMBES
    { id: 'm_l_sq', label: 'Squat', icon: 'human-male', color: '#06B6D4', group: 'JAMBES' },
    { id: 'm_l_pr', label: 'Presse', icon: 'human-male', color: '#06B6D4', group: 'JAMBES' },
    { id: 'm_l_le', label: 'Leg Extension', icon: 'human-male', color: '#06B6D4', group: 'JAMBES' },
    { id: 'm_l_lc', label: 'Leg Curl', icon: 'human-male', color: '#06B6D4', group: 'JAMBES' },
    { id: 'm_l_lu', label: 'Fentes', icon: 'human-male', color: '#06B6D4', group: 'JAMBES' },
    { id: 'm_l_ht', label: 'Hip Thrust', icon: 'human-male', color: '#06B6D4', group: 'JAMBES' },
    { id: 'm_l_mo', label: 'Mollets', icon: 'human-male', color: '#06B6D4', group: 'JAMBES' },
    // ABDOMINAUX
    { id: 'm_abs_c', label: 'Crunch', icon: 'view-grid', color: '#84CC16', group: 'ABDOMINAUX' },
    { id: 'm_abs_p', label: 'Planche', icon: 'view-grid', color: '#84CC16', group: 'ABDOMINAUX' },
    { id: 'm_abs_r', label: 'Relevé Jambes', icon: 'view-grid', color: '#84CC16', group: 'ABDOMINAUX' },
    { id: 'm_abs_t', label: 'Russian Twist', icon: 'view-grid', color: '#84CC16', group: 'ABDOMINAUX' },
    { id: 'm_abs_w', label: 'Ab Wheel', icon: 'view-grid', color: '#84CC16', group: 'ABDOMINAUX' },
    // KETTLEBELL
    { id: 'm_ket_sw', label: 'Kettlebell Swing', icon: 'kettlebell', color: '#F59E0B', group: 'KETTLEBELL' },
    { id: 'm_ket_sn', label: 'KB Snatch', icon: 'kettlebell', color: '#F59E0B', group: 'KETTLEBELL' },
    { id: 'm_ket_cl', label: 'KB Clean & Press', icon: 'kettlebell', color: '#F59E0B', group: 'KETTLEBELL' },
    { id: 'm_ket_tgu', label: 'Turkish Get-up', icon: 'kettlebell', color: '#F59E0B', group: 'KETTLEBELL' },
    // CARDIO
    { id: 'm_car_tre', label: 'Tapis de course', icon: 'run-fast', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_inc', label: 'Marche Inclinée', icon: 'trending-up', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_bik', label: 'Vélo Stationnaire', icon: 'bike', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_row', label: 'Rameur', icon: 'rowing', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_stai', label: 'Stairmaster', icon: 'stairs', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_elli', label: 'Elliptique', icon: 'bike-fast', color: '#10B981', group: 'CARDIO' },
    { id: 'm_car_ski', label: 'SkiErg', icon: 'ski', color: '#10B981', group: 'CARDIO' },
  ],

  // ═══════════════════════════════════════════
  // RUNNING
  // ═══════════════════════════════════════════
  running: [
    // DISTANCES
    { id: 'r_5k', label: '5 KM', icon: 'run', color: '#3B82F6', group: 'DISTANCES' },
    { id: 'r_10k', label: '10 KM', icon: 'run-fast', color: '#3B82F6', group: 'DISTANCES' },
    { id: 'r_semi', label: 'Semi-Marathon', icon: 'trophy', color: '#3B82F6', group: 'DISTANCES' },
    { id: 'r_mara', label: 'Marathon', icon: 'medal', color: '#3B82F6', group: 'DISTANCES' },
    // TYPE
    { id: 'r_endu', label: 'Endurance', icon: 'clock-outline', color: '#10B981', group: 'TYPE' },
    { id: 'r_long', label: 'Sortie Longue', icon: 'map-marker-distance', color: '#10B981', group: 'TYPE' },
    { id: 'r_frac', label: 'Fractionné', icon: 'chart-line', color: '#EF4444', group: 'TYPE' },
    { id: 'r_tempo', label: 'Tempo Run', icon: 'speedometer', color: '#F59E0B', group: 'TYPE' },
    { id: 'r_fart', label: 'Fartlek', icon: 'shuffle', color: '#8B5CF6', group: 'TYPE' },
    { id: 'r_recup', label: 'Récupération', icon: 'sleep', color: '#06B6D4', group: 'TYPE' },
    { id: 'r_sprint', label: 'Sprint', icon: 'flash', color: '#DC2626', group: 'TYPE' },
    { id: 'r_cotes', label: 'Côtes', icon: 'trending-up', color: '#F97316', group: 'TYPE' },
    // LIEU
    { id: 'r_trai', label: 'Trail', icon: 'terrain', color: '#F97316', group: 'LIEU' },
    { id: 'r_trea', label: 'Tapis', icon: 'run-fast', color: '#8B5CF6', group: 'LIEU' },
    { id: 'r_piste', label: 'Piste', icon: 'stadium', color: '#10B981', group: 'LIEU' },
    { id: 'r_route', label: 'Route', icon: 'road', color: '#3B82F6', group: 'LIEU' },
    // ALLURE
    { id: 'r_easy', label: 'Allure Facile', icon: 'tortoise', color: '#10B981', group: 'ALLURE' },
    { id: 'r_mod', label: 'Allure Modérée', icon: 'run', color: '#F59E0B', group: 'ALLURE' },
    { id: 'r_race', label: 'Allure Course', icon: 'run-fast', color: '#EF4444', group: 'ALLURE' },
  ],

  trail: [
    { id: 'tr_endu', label: 'Endurance', icon: 'clock-outline', color: '#10B981', group: 'TYPE' },
    { id: 'tr_tech', label: 'Technique', icon: 'terrain', color: '#F59E0B', group: 'TYPE' },
    { id: 'tr_dplus', label: 'Dénivelé +', icon: 'trending-up', color: '#EF4444', group: 'TYPE' },
    { id: 'tr_desc', label: 'Descente', icon: 'trending-down', color: '#8B5CF6', group: 'TYPE' },
    { id: 'tr_ultra', label: 'Ultra', icon: 'infinity', color: '#DC2626', group: 'TYPE' },
    { id: 'tr_rando', label: 'Rando-Course', icon: 'hiking', color: '#3B82F6', group: 'TYPE' },
    { id: 'tr_baton', label: 'Bâtons', icon: 'ski-pole', color: '#14B8A6', group: 'ÉQUIPEMENT' },
  ],

  // ═══════════════════════════════════════════
  // NATATION
  // ═══════════════════════════════════════════
  natation: [
    // STYLES
    { id: 'sw_crawl', label: 'Crawl', icon: 'swim', color: '#3B82F6', group: 'STYLES' },
    { id: 'sw_brasse', label: 'Brasse', icon: 'swim', color: '#3B82F6', group: 'STYLES' },
    { id: 'sw_dos', label: 'Dos Crawlé', icon: 'swim', color: '#3B82F6', group: 'STYLES' },
    { id: 'sw_pap', label: 'Papillon', icon: 'swim', color: '#3B82F6', group: 'STYLES' },
    { id: 'sw_4nages', label: '4 Nages', icon: 'swim', color: '#8B5CF6', group: 'STYLES' },
    // TYPE
    { id: 'sw_endu', label: 'Endurance', icon: 'clock-outline', color: '#10B981', group: 'TYPE' },
    { id: 'sw_speed', label: 'Vitesse', icon: 'lightning-bolt', color: '#EF4444', group: 'TYPE' },
    { id: 'sw_tech', label: 'Technique', icon: 'school', color: '#F59E0B', group: 'TYPE' },
    { id: 'sw_educ', label: 'Éducatifs', icon: 'school-outline', color: '#8B5CF6', group: 'TYPE' },
    // ÉQUIPEMENT
    { id: 'sw_pull', label: 'Pull Buoy', icon: 'swim', color: '#06B6D4', group: 'ÉQUIPEMENT' },
    { id: 'sw_plaq', label: 'Plaquettes', icon: 'hand-back-left', color: '#06B6D4', group: 'ÉQUIPEMENT' },
    { id: 'sw_palm', label: 'Palmes', icon: 'shoe-formal', color: '#06B6D4', group: 'ÉQUIPEMENT' },
    // LIEU
    { id: 'sw_piscine', label: 'Piscine', icon: 'pool', color: '#3B82F6', group: 'LIEU' },
    { id: 'sw_libre', label: 'Eau Libre', icon: 'waves', color: '#14B8A6', group: 'LIEU' },
  ],

  // ═══════════════════════════════════════════
  // VÉLO
  // ═══════════════════════════════════════════
  velo: [
    { id: 've_road', label: 'Vélo de Route', icon: 'bike-fast', color: '#3B82F6', group: 'TYPE' },
    { id: 've_vtt', label: 'VTT / Cross', icon: 'terrain', color: '#10B981', group: 'TYPE' },
    { id: 've_indoor', label: 'Home Trainer', icon: 'bike', color: '#8B5CF6', group: 'TYPE' },
    { id: 've_spinning', label: 'Spinning/RPM', icon: 'fire', color: '#EF4444', group: 'TYPE' },
    { id: 've_zwift', label: 'Zwift', icon: 'monitor', color: '#F59E0B', group: 'TYPE' },
    { id: 've_endu', label: 'Endurance', icon: 'clock-outline', color: '#10B981', group: 'INTENSITÉ' },
    { id: 've_frac', label: 'Fractionné', icon: 'chart-line', color: '#EF4444', group: 'INTENSITÉ' },
    { id: 've_ftp', label: 'FTP Test', icon: 'speedometer', color: '#DC2626', group: 'INTENSITÉ' },
    { id: 've_sweet', label: 'Sweet Spot', icon: 'target', color: '#F59E0B', group: 'INTENSITÉ' },
    { id: 've_col', label: 'Col / Montée', icon: 'trending-up', color: '#F97316', group: 'TERRAIN' },
    { id: 've_plat', label: 'Plat', icon: 'minus', color: '#3B82F6', group: 'TERRAIN' },
    { id: 've_sprint', label: 'Sprint', icon: 'flash', color: '#DC2626', group: 'TECHNIQUE' },
    { id: 've_cadence', label: 'Cadence', icon: 'rotate-right', color: '#8B5CF6', group: 'TECHNIQUE' },
    { id: 've_force', label: 'Force', icon: 'weight', color: '#F97316', group: 'TECHNIQUE' },
  ],

  marche: [
    { id: 'ma_walk', label: 'Marche Active', icon: 'walk', color: '#10B981', group: 'TYPE' },
    { id: 'ma_incl', label: 'Marche Inclinée', icon: 'trending-up', color: '#F59E0B', group: 'TYPE' },
    { id: 'ma_nord', label: 'Marche Nordique', icon: 'ski-pole', color: '#3B82F6', group: 'TYPE' },
    { id: 'ma_hike', label: 'Randonnée', icon: 'terrain', color: '#10B981', group: 'LIEU' },
    { id: 'ma_urban', label: 'Marche Urbaine', icon: 'city', color: '#3B82F6', group: 'LIEU' },
    { id: 'ma_tapis', label: 'Tapis', icon: 'run-fast', color: '#8B5CF6', group: 'LIEU' },
  ],

  // ═══════════════════════════════════════════
  // CROSSFIT / FONCTIONNEL
  // ═══════════════════════════════════════════
  crossfit: [
    { id: 'cf_wod', label: 'WOD', icon: 'clipboard-text', color: '#EF4444', group: 'TYPE' },
    { id: 'cf_emom', label: 'EMOM', icon: 'timer', color: '#3B82F6', group: 'TYPE' },
    { id: 'cf_amrap', label: 'AMRAP', icon: 'infinity', color: '#8B5CF6', group: 'TYPE' },
    { id: 'cf_fortime', label: 'For Time', icon: 'clock-fast', color: '#F59E0B', group: 'TYPE' },
    { id: 'cf_skill', label: 'Skill Work', icon: 'school', color: '#10B981', group: 'TYPE' },
    { id: 'cf_strength', label: 'Strength', icon: 'weight', color: '#DC2626', group: 'TYPE' },
    { id: 'cf_oly', label: 'Haltérophilie', icon: 'weight-lifter', color: '#F97316', group: 'MOUVEMENTS' },
    { id: 'cf_gym', label: 'Gymnastique', icon: 'human-handsup', color: '#EC4899', group: 'MOUVEMENTS' },
    { id: 'cf_cardio', label: 'Cardio', icon: 'run-fast', color: '#06B6D4', group: 'MOUVEMENTS' },
    { id: 'cf_kb', label: 'Kettlebell', icon: 'kettlebell', color: '#84CC16', group: 'MOUVEMENTS' },
  ],

  hyrox: [
    { id: 'hy_full', label: 'Simulation', icon: 'timer', color: '#EF4444', group: 'TYPE' },
    { id: 'hy_station', label: 'Stations', icon: 'dumbbell', color: '#3B82F6', group: 'TYPE' },
    { id: 'hy_run', label: 'Course', icon: 'run', color: '#10B981', group: 'TYPE' },
    { id: 'hy_ski', label: 'SkiErg', icon: 'ski', color: '#06B6D4', group: 'STATIONS' },
    { id: 'hy_sled', label: 'Sled Push/Pull', icon: 'cart', color: '#8B5CF6', group: 'STATIONS' },
    { id: 'hy_burpee', label: 'Burpee Broad Jump', icon: 'human-handsup', color: '#F59E0B', group: 'STATIONS' },
    { id: 'hy_row', label: 'Rameur', icon: 'rowing', color: '#EC4899', group: 'STATIONS' },
    { id: 'hy_farmer', label: 'Farmers Carry', icon: 'weight', color: '#84CC16', group: 'STATIONS' },
    { id: 'hy_lunge', label: 'Sandbag Lunges', icon: 'bag-carry-on', color: '#F97316', group: 'STATIONS' },
    { id: 'hy_wall', label: 'Wall Balls', icon: 'basketball', color: '#DC2626', group: 'STATIONS' },
  ],

  street_workout: [
    { id: 'sw_stat', label: 'Statiques', icon: 'human', color: '#8B5CF6', group: 'TYPE' },
    { id: 'sw_dyn', label: 'Dynamiques', icon: 'arrow-up-bold', color: '#3B82F6', group: 'TYPE' },
    { id: 'sw_planche', label: 'Planche', icon: 'human', color: '#EC4899', group: 'STATIQUES' },
    { id: 'sw_fl', label: 'Front Lever', icon: 'human', color: '#EC4899', group: 'STATIQUES' },
    { id: 'sw_bl', label: 'Back Lever', icon: 'human', color: '#EC4899', group: 'STATIQUES' },
    { id: 'sw_flag', label: 'Human Flag', icon: 'flag', color: '#EC4899', group: 'STATIQUES' },
    { id: 'sw_hs', label: 'Handstand', icon: 'human-handsup', color: '#EC4899', group: 'STATIQUES' },
    { id: 'sw_mu', label: 'Muscle Up', icon: 'arrow-up-bold', color: '#10B981', group: 'DYNAMIQUES' },
    { id: 'sw_oap', label: 'One Arm Pull-up', icon: 'arm-flex', color: '#10B981', group: 'DYNAMIQUES' },
    { id: 'sw_hspu', label: 'HSPU', icon: 'human-handsup', color: '#10B981', group: 'DYNAMIQUES' },
    { id: 'sw_pistol', label: 'Pistol Squat', icon: 'human-male', color: '#10B981', group: 'DYNAMIQUES' },
  ],

  // ═══════════════════════════════════════════
  // YOGA / PILATES / STRETCHING
  // ═══════════════════════════════════════════
  yoga: [
    { id: 'yo_hatha', label: 'Hatha', icon: 'meditation', color: '#10B981', group: 'STYLE' },
    { id: 'yo_vinyasa', label: 'Vinyasa', icon: 'waves', color: '#3B82F6', group: 'STYLE' },
    { id: 'yo_ashtanga', label: 'Ashtanga', icon: 'fire', color: '#EF4444', group: 'STYLE' },
    { id: 'yo_yin', label: 'Yin', icon: 'moon-waning-crescent', color: '#8B5CF6', group: 'STYLE' },
    { id: 'yo_power', label: 'Power', icon: 'arm-flex', color: '#F59E0B', group: 'STYLE' },
    { id: 'yo_rest', label: 'Restauratif', icon: 'sleep', color: '#06B6D4', group: 'STYLE' },
    { id: 'yo_hot', label: 'Hot Yoga', icon: 'thermometer', color: '#DC2626', group: 'STYLE' },
    { id: 'yo_salut', label: 'Salutation Soleil', icon: 'white-balance-sunny', color: '#F59E0B', group: 'SÉQUENCE' },
  ],

  pilates: [
    { id: 'pi_mat', label: 'Mat', icon: 'yoga', color: '#10B981', group: 'TYPE' },
    { id: 'pi_reform', label: 'Reformer', icon: 'bed', color: '#8B5CF6', group: 'TYPE' },
    { id: 'pi_core', label: 'Core', icon: 'view-grid', color: '#3B82F6', group: 'FOCUS' },
    { id: 'pi_flex', label: 'Flexibilité', icon: 'yoga', color: '#F59E0B', group: 'FOCUS' },
    { id: 'pi_posture', label: 'Posture', icon: 'human', color: '#EC4899', group: 'FOCUS' },
  ],

  stretching: [
    { id: 'st_global', label: 'Global', icon: 'yoga', color: '#10B981', group: 'TYPE' },
    { id: 'st_haut', label: 'Haut du Corps', icon: 'human-handsup', color: '#3B82F6', group: 'ZONE' },
    { id: 'st_bas', label: 'Bas du Corps', icon: 'human-male', color: '#8B5CF6', group: 'ZONE' },
    { id: 'st_dos', label: 'Dos', icon: 'human', color: '#F59E0B', group: 'ZONE' },
    { id: 'st_foam', label: 'Foam Rolling', icon: 'cylinder', color: '#EC4899', group: 'TYPE' },
    { id: 'st_mob', label: 'Mobilité', icon: 'rotate-3d', color: '#06B6D4', group: 'TYPE' },
  ],

  hiit: [
    { id: 'hi_circuit', label: 'Circuit', icon: 'refresh', color: '#EF4444', group: 'TYPE' },
    { id: 'hi_tabata', label: 'Tabata', icon: 'timer', color: '#F59E0B', group: 'TYPE' },
    { id: 'hi_emom', label: 'EMOM', icon: 'clock', color: '#3B82F6', group: 'TYPE' },
    { id: 'hi_amrap', label: 'AMRAP', icon: 'infinity', color: '#8B5CF6', group: 'TYPE' },
    { id: 'hi_full', label: 'Full Body', icon: 'human', color: '#10B981', group: 'FOCUS' },
    { id: 'hi_upper', label: 'Upper Body', icon: 'arm-flex', color: '#06B6D4', group: 'FOCUS' },
    { id: 'hi_lower', label: 'Lower Body', icon: 'human-male', color: '#EC4899', group: 'FOCUS' },
    { id: 'hi_cardio', label: 'Cardio', icon: 'heart-pulse', color: '#DC2626', group: 'FOCUS' },
  ],

  // ═══════════════════════════════════════════
  // SPORTS COLLECTIFS
  // ═══════════════════════════════════════════
  football: [
    { id: 'fb_match', label: 'Match', icon: 'soccer', color: '#10B981', group: 'TYPE' },
    { id: 'fb_train', label: 'Entraînement', icon: 'whistle', color: '#3B82F6', group: 'TYPE' },
    { id: 'fb_tech', label: 'Technique', icon: 'school', color: '#8B5CF6', group: 'TYPE' },
    { id: 'fb_tact', label: 'Tactique', icon: 'strategy', color: '#F59E0B', group: 'TYPE' },
    { id: 'fb_physique', label: 'Physique', icon: 'run', color: '#EF4444', group: 'TYPE' },
  ],

  basketball: [
    { id: 'bb_match', label: 'Match', icon: 'basketball', color: '#F59E0B', group: 'TYPE' },
    { id: 'bb_train', label: 'Entraînement', icon: 'whistle', color: '#3B82F6', group: 'TYPE' },
    { id: 'bb_shoot', label: 'Tirs', icon: 'basketball-hoop', color: '#10B981', group: 'TECHNIQUE' },
    { id: 'bb_dribble', label: 'Dribble', icon: 'hand-ball', color: '#8B5CF6', group: 'TECHNIQUE' },
    { id: 'bb_layup', label: 'Lay-ups', icon: 'basketball', color: '#EC4899', group: 'TECHNIQUE' },
  ],

  rugby: [
    { id: 'ru_match', label: 'Match', icon: 'rugby', color: '#10B981', group: 'TYPE' },
    { id: 'ru_train', label: 'Entraînement', icon: 'whistle', color: '#3B82F6', group: 'TYPE' },
    { id: 'ru_melee', label: 'Mêlée', icon: 'account-group', color: '#8B5CF6', group: 'TECHNIQUE' },
    { id: 'ru_touche', label: 'Touche', icon: 'arrow-up', color: '#F59E0B', group: 'TECHNIQUE' },
    { id: 'ru_plaquage', label: 'Plaquage', icon: 'human-male', color: '#EF4444', group: 'TECHNIQUE' },
  ],

  // ═══════════════════════════════════════════
  // SPORTS DE RAQUETTE
  // ═══════════════════════════════════════════
  tennis: [
    { id: 'te_match', label: 'Match', icon: 'tennis', color: '#84CC16', group: 'TYPE' },
    { id: 'te_train', label: 'Entraînement', icon: 'whistle', color: '#3B82F6', group: 'TYPE' },
    { id: 'te_service', label: 'Service', icon: 'tennis-ball', color: '#F59E0B', group: 'TECHNIQUE' },
    { id: 'te_droit', label: 'Coup Droit', icon: 'tennis', color: '#10B981', group: 'TECHNIQUE' },
    { id: 'te_revers', label: 'Revers', icon: 'tennis', color: '#8B5CF6', group: 'TECHNIQUE' },
    { id: 'te_volee', label: 'Volée', icon: 'tennis', color: '#EC4899', group: 'TECHNIQUE' },
  ],

  padel: [
    { id: 'pa_match', label: 'Match', icon: 'tennis', color: '#3B82F6', group: 'TYPE' },
    { id: 'pa_train', label: 'Entraînement', icon: 'whistle', color: '#8B5CF6', group: 'TYPE' },
    { id: 'pa_smash', label: 'Smash', icon: 'arrow-down-bold', color: '#EF4444', group: 'TECHNIQUE' },
    { id: 'pa_bandeja', label: 'Bandeja', icon: 'tennis', color: '#F59E0B', group: 'TECHNIQUE' },
    { id: 'pa_vibora', label: 'Vibora', icon: 'tennis', color: '#10B981', group: 'TECHNIQUE' },
    { id: 'pa_mur', label: 'Jeu au Mur', icon: 'wall', color: '#06B6D4', group: 'TECHNIQUE' },
  ],

  badminton: [
    { id: 'ba_match', label: 'Match', icon: 'badminton', color: '#10B981', group: 'TYPE' },
    { id: 'ba_train', label: 'Entraînement', icon: 'whistle', color: '#3B82F6', group: 'TYPE' },
    { id: 'ba_smash', label: 'Smash', icon: 'arrow-down-bold', color: '#EF4444', group: 'TECHNIQUE' },
    { id: 'ba_clear', label: 'Clear', icon: 'arrow-up', color: '#8B5CF6', group: 'TECHNIQUE' },
    { id: 'ba_drop', label: 'Drop Shot', icon: 'arrow-down', color: '#F59E0B', group: 'TECHNIQUE' },
  ],

  // ═══════════════════════════════════════════
  // ESCALADE
  // ═══════════════════════════════════════════
  escalade: [
    { id: 'es_bloc', label: 'Bloc', icon: 'wall', color: '#F59E0B', group: 'TYPE' },
    { id: 'es_voie', label: 'Voie', icon: 'arrow-up', color: 'EF4444', group: 'TYPE' },
    { id: 'es_moulinette', label: 'Moulinette', icon: 'rope', color: '#3B82F6', group: 'TYPE' },
    { id: 'es_poutre', label: 'Poutre', icon: 'hand-back-right', color: '#8B5CF6', group: 'ENTRAÎNEMENT' },
    { id: 'es_campus', label: 'Campus Board', icon: 'arm-flex', color: '#10B981', group: 'ENTRAÎNEMENT' },
    { id: 'es_pan', label: 'Pan', icon: 'wall', color: '#EC4899', group: 'ENTRAÎNEMENT' },
    { id: 'es_projet', label: 'Projets', icon: 'target', color: '#DC2626', group: 'TYPE' },
  ],
};

// Options par défaut pour les sports sans options spécifiques
export const DEFAULT_OPTIONS: SportOption[] = [
  { id: 'training', label: 'Entraînement', icon: 'dumbbell', color: '#3B82F6' },
  { id: 'technique', label: 'Technique', icon: 'school', color: '#8B5CF6' },
  { id: 'sparring', label: 'Sparring/Match', icon: 'sword-cross', color: '#EF4444' },
  { id: 'competition', label: 'Compétition', icon: 'trophy', color: '#10B981' },
  { id: 'conditioning', label: 'Conditioning', icon: 'fire', color: '#F59E0B' },
  { id: 'recovery', label: 'Récupération', icon: 'sleep', color: '#06B6D4' },
];
