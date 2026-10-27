/**
 * 27 octobre 2026 : l'univers montre par le Vestiaire (etiquette et noms des rangs), deduit du personnage.
 * Le Guerrier et le monde samourai sont toujours Japon (Ashigaru a Shogun), le Sportif et Sans personnage toujours
 * Classique (jamais les rangs Japon) ; les autres packs suivent l'univers enregistre (absent : Japon).
 */
import { parsePersonnage } from '@/lib/v2/dojo/personnages';
import type { Univers } from '@/lib/v2/dojo/univers';

export function universAffiche(personnage: string | null | undefined, univers: Univers | null | undefined): Univers {
  const p = parsePersonnage(personnage);
  if (p.kind === 'guerrier' || (p.kind === 'pack' && p.pack.kind === 'monde')) return 'japon';
  if (p.kind === 'classique' || p.kind === 'aucun') return 'classique';
  return univers === 'classique' ? 'classique' : 'japon';
}
