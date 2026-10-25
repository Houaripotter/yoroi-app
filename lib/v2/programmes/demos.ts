/**
 * Animations d'exercices (24 octobre 2026) : cle d'un exercice et recherche de ses deux images.
 */
import type { ImageSourcePropType } from 'react-native';
import { DEMOS } from './demosArt';

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
};

export function demoDe(nom: string | undefined | null): [ImageSourcePropType, ImageSourcePropType] | null {
  if (!nom) return null;
  const cle = demoSlug(nom);
  return DEMOS[cle] ?? DEMOS[MEME_MOUVEMENT[cle] ?? ''] ?? null;
}
