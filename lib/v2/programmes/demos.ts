/**
 * Animations d'exercices : cle d'un exercice et recherche de son GIF de test (mode createur seulement).
 */
import type { ImageSourcePropType } from 'react-native';
import { demoEnLigne, sourceDemosActive } from './demosTest';

/** « Développé Couché (Barre) » -> « developpe_couche_barre » */
export function demoSlug(nom: string): string {
  return nom
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

/**
 * Le même mouvement sous un autre nom dans la bibliothèque : il reprend l'animation déjà faite
 * (25 octobre 2026). Uniquement des mouvements identiques, pas des variantes qui se ressemblent.
 */
export const MEME_MOUVEMENT: Record<string, string> = {
  deadlift_sumo: 'sumo_deadlift',
  tractions_larges: 'tractions_pronation',
  standing_calf_raise: 'mollets_debout_machine',
  cable_curl: 'curl_poulie_basse',
  cable_crossover: 'ecartes_a_la_poulie_haute',
  extension_triceps_poulie_v_bar: 'extension_triceps_poulie_barre',
  diamond_push_ups: 'pompes_diamant',
  front_squat_crossfit: 'front_squat',
  mountain_climbers_hiit: 'mountain_climbers',
  fentes_arriere: 'reverse_lunges',
  banc_a_lombaires: 'hyperextensions',
  seated_leg_curl: 'leg_curl_assis',
  seated_calf_raise: 'mollets_assis_machine',
  ab_rollout: 'roulette_abdos_abs_wheel',
  cable_overhead_extension: 'overhead_extension_poulie',
  machine_lateral_raise: 'elevations_laterales_machine',
  single_leg_calf_raise: 'mollets_unilateral',
  fentes_bulgares: 'squat_bulgare',
};

/** Une ou deux images : deux s'enchainent en fondu, une seule est deja animee */
/** Le GIF Gym visual ou les dessins Flow d'un exercice, seulement en mode createur avec la source choisie dans le Studio */
export function demoDe(nom: string | undefined | null): ImageSourcePropType[] | null {
  if (!nom) return null;
  // public : aucune animation (26 octobre 2026)
  const source = sourceDemosActive();
  if (source === 'aucune') return null;
  const cle = demoSlug(nom);
  return demoEnLigne(cle, source) ?? (MEME_MOUVEMENT[cle] ? demoEnLigne(MEME_MOUVEMENT[cle], source) : null);
}
