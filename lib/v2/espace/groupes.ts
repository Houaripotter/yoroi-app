/**
 * Vague 44 : les groupes de la galerie « Ta scene » (onglets). Les deux packs qui tournent (Samourai, Lanternes de nuit)
 * puis les autres scenes rangees par moment : jour, saisons, soir et nuit. Chaque scene hors pack est dans un seul groupe.
 */
import type { SceneId } from '@/lib/v2/espace';
import { LANTERNES_IDS } from '@/lib/v2/espace/lanternes';
import { SAMOURAI_IDS } from '@/lib/v2/espace/samourai';
import { CLASSIQUE_SCENE_IDS } from '@/lib/v2/espace/classique';
import { NATURE_SCENE_IDS } from '@/lib/v2/espace/nature';
import { VIE_SCENE_IDS } from '@/lib/v2/espace/packsScenes';
import { MARSEILLE_SCENE_IDS, VOYAGE_SCENE_IDS, estSceneMarseille } from '@/lib/v2/espace/voyages';
import { traduire } from '@/lib/i18n/tr';

export type GroupeScenes = 'toutes' | 'marseille' | 'voyages' | 'vie' | 'classique' | 'nature' | 'samourai' | 'lanternes' | 'jour' | 'saisons' | 'soir';

export const GROUPES: { key: GroupeScenes; label: string }[] = [
  { key: 'toutes', label: traduire('Toutes') },
  // 27 octobre 2026 : les scenes de Marseille (corniche, calanque, paddle), du pack Voyages (voyages.ts)
  { key: 'marseille', label: 'Marseille' },
  // 18 octobre 2026 : le pack Voyages, scenes animees (Tokyo, Paris, desert, neige, avion)
  { key: 'voyages', label: traduire('Voyages') },
  // 16 octobre 2026 : les scenes des packs Vie reelle (caserne, chantier, stade, chateau...)
  { key: 'vie', label: traduire('Vie réelle') },
  // vague 45 : les scenes neutres, sans le Japon
  { key: 'classique', label: 'Classique' },
  // 14 octobre 2026 : plage, desert, foret, cascade, mer et buildings, sans le Japon
  { key: 'nature', label: traduire('Nature et ville') },
  { key: 'samourai', label: traduire('Samouraï') },
  { key: 'lanternes', label: traduire('Lanternes de nuit') },
  { key: 'jour', label: traduire('Jour') },
  { key: 'saisons', label: traduire('Saisons') },
  { key: 'soir', label: traduire('Soir et nuit') },
];

const JOUR: SceneId[] = ['dojo', 'bambous', 'jardin', 'sommet', 'machiya_aube', 'rizieres', 'temple', 'montagne'];
const SAISONS: SceneId[] = ['sakura', 'pont', 'chateau', 'pagode', 'kyudojo', 'onsen', 'port', 'remparts', 'matcha'];
const SOIR: SceneId[] = ['village', 'machiya_couchant', 'festival', 'pavillon', 'cascade', 'plage', 'salle', 'forge', 'camp', 'bataille', 'nuit'];

/** Les scenes d'un groupe, dans l'ordre de la galerie (toutes : l'ordre du catalogue) */
export function scenesDuGroupe(g: GroupeScenes, toutes: SceneId[]): SceneId[] {
  switch (g) {
    case 'marseille':
      return [...MARSEILLE_SCENE_IDS];
    case 'voyages':
      return VOYAGE_SCENE_IDS.filter((id) => !estSceneMarseille(id));
    case 'vie':
      return [...VIE_SCENE_IDS];
    case 'classique':
      return [...CLASSIQUE_SCENE_IDS];
    case 'nature':
      return [...NATURE_SCENE_IDS];
    case 'samourai':
      return [...SAMOURAI_IDS];
    case 'lanternes':
      return ['machiya_nuit', ...LANTERNES_IDS];
    case 'jour':
      return JOUR;
    case 'saisons':
      return SAISONS;
    case 'soir':
      return SOIR;
    default:
      return toutes;
  }
}

/** Le groupe d'une scene (pour ouvrir la galerie sur le bon onglet) */
export function groupeDe(id: SceneId): GroupeScenes {
  if (estSceneMarseille(id)) return 'marseille';
  if ((VOYAGE_SCENE_IDS as readonly string[]).includes(id)) return 'voyages';
  if ((VIE_SCENE_IDS as readonly string[]).includes(id)) return 'vie';
  if ((CLASSIQUE_SCENE_IDS as readonly string[]).includes(id)) return 'classique';
  if ((NATURE_SCENE_IDS as readonly string[]).includes(id)) return 'nature';
  if ((SAMOURAI_IDS as readonly string[]).includes(id)) return 'samourai';
  if (id === 'machiya_nuit' || (LANTERNES_IDS as readonly string[]).includes(id)) return 'lanternes';
  if (JOUR.includes(id)) return 'jour';
  if (SAISONS.includes(id)) return 'saisons';
  if (SOIR.includes(id)) return 'soir';
  return 'toutes';
}
