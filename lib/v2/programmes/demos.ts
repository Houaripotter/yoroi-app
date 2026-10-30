/**
 * Animations d'exercices : cle d'un exercice et recherche de son GIF de test (mode createur seulement).
 */
import type { ImageSourcePropType } from 'react-native';
import { demoEnLigne, sourceDemosActive } from './demosTest';
import { NOMS_FR } from '@/lib/v2/seance/rechercheExo';
import { sansPrise } from '@/lib/v2/seance/prise';

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

/**
 * 30 octobre 2026 (verification du Studio Gym visual) : le meme mouvement se lit dans les deux sens. Avant, seul
 * le premier nom reprenait l'animation du second : « Écartés à la Poulie Haute » (programmes) restait sans GIF
 * alors que « Cable Crossover » en a un.
 */
const MEME_INVERSE: Record<string, string> = Object.fromEntries(Object.entries(MEME_MOUVEMENT).map(([a, b]) => [b, a]));

/**
 * 30 octobre 2026 : le choix d'exercice en seance enregistre le nom francais affiche (NOMS_FR, « Écartés vis à vis
 * (poulies) ») et les programmes le nom de la bibliotheque (« Cable Crossover »). Le GIF est range sous le nom de la
 * bibliotheque : on le retrouve aussi depuis le nom francais.
 */
let nomBiblioParSlug: Map<string, string> | null = null;
function slugBibliotheque(cle: string): string | null {
  if (!nomBiblioParSlug) {
    nomBiblioParSlug = new Map();
    for (const [biblio, fr] of Object.entries(NOMS_FR)) {
      const s = demoSlug(fr);
      if (!nomBiblioParSlug.has(s)) nomBiblioParSlug.set(s, demoSlug(biblio));
    }
  }
  return nomBiblioParSlug.get(cle) ?? null;
}

function gifDeCle(cle: string): ImageSourcePropType[] | null {
  return demoEnLigne(cle)
    ?? (MEME_MOUVEMENT[cle] ? demoEnLigne(MEME_MOUVEMENT[cle]) : null)
    ?? (MEME_INVERSE[cle] ? demoEnLigne(MEME_INVERSE[cle]) : null);
}

/** Une ou deux images : deux s'enchainent en fondu, une seule est deja animee */
/** Le GIF Gym visual d'un exercice, seulement en mode createur avec la source choisie dans le Studio */
export function demoDe(nom: string | undefined | null): ImageSourcePropType[] | null {
  if (!nom) return null;
  // public : aucune animation (26 octobre 2026)
  if (sourceDemosActive() === 'aucune') return null;
  // la prise ajoutee au nom (« (prise large) », lib/v2/seance/prise.ts) ne change pas le mouvement
  const cle = demoSlug(sansPrise(nom).base);
  const gif = gifDeCle(cle);
  if (gif) return gif;
  const biblio = slugBibliotheque(cle);
  return biblio ? gifDeCle(biblio) : null;
}
