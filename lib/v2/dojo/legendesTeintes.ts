/**
 * 18 octobre 2026 : teintes de peau des Legendes (Dragon d'or, Kitsune, Kunoichi, Moine de la montagne),
 * une image par niveau (1 a 3, comme le dessin d'origine qui evolue avec ton rang).
 * Images : assets/avatars/app/packs/<id>/teintes/<id>_<niveau>_<variante>.webp (600 x 800).
 * Meme cle que les packs Vie reelle (« kunoichi_h.peau_foncee », lib/v2/dojo/personnages.ts cleAvecTeinte).
 * Le dessin est le meme pour homme et femme (comme les images d'origine des Legendes).
 * 18 octobre 2026 (soir) : l'Oni aussi (au niveau 3, le visage est sous le casque : seuls les bras changent). Ne pas confondre avec packsTeintes.ts (fichier genere, Vie reelle).
 */
import type { VarianteTeinte } from './packsTeintes';

export const TEINTES_LEGENDES: Record<string, Partial<Record<VarianteTeinte, number[]>>> = {
  dragon: {
    peau_foncee: [require('@/assets/avatars/app/packs/dragon/teintes/dragon_1_peau_foncee.webp'), require('@/assets/avatars/app/packs/dragon/teintes/dragon_2_peau_foncee.webp'), require('@/assets/avatars/app/packs/dragon/teintes/dragon_3_peau_foncee.webp')],
    peau_mate: [require('@/assets/avatars/app/packs/dragon/teintes/dragon_1_peau_mate.webp'), require('@/assets/avatars/app/packs/dragon/teintes/dragon_2_peau_mate.webp'), require('@/assets/avatars/app/packs/dragon/teintes/dragon_3_peau_mate.webp')],
  },
  kitsune: {
    peau_foncee: [require('@/assets/avatars/app/packs/kitsune/teintes/kitsune_1_peau_foncee.webp'), require('@/assets/avatars/app/packs/kitsune/teintes/kitsune_2_peau_foncee.webp'), require('@/assets/avatars/app/packs/kitsune/teintes/kitsune_3_peau_foncee.webp')],
    peau_mate: [require('@/assets/avatars/app/packs/kitsune/teintes/kitsune_1_peau_mate.webp'), require('@/assets/avatars/app/packs/kitsune/teintes/kitsune_2_peau_mate.webp'), require('@/assets/avatars/app/packs/kitsune/teintes/kitsune_3_peau_mate.webp')],
  },
  kunoichi: {
    peau_foncee: [require('@/assets/avatars/app/packs/kunoichi/teintes/kunoichi_1_peau_foncee.webp'), require('@/assets/avatars/app/packs/kunoichi/teintes/kunoichi_2_peau_foncee.webp'), require('@/assets/avatars/app/packs/kunoichi/teintes/kunoichi_3_peau_foncee.webp')],
    peau_mate: [require('@/assets/avatars/app/packs/kunoichi/teintes/kunoichi_1_peau_mate.webp'), require('@/assets/avatars/app/packs/kunoichi/teintes/kunoichi_2_peau_mate.webp'), require('@/assets/avatars/app/packs/kunoichi/teintes/kunoichi_3_peau_mate.webp')],
  },
  moine: {
    peau_foncee: [require('@/assets/avatars/app/packs/moine/teintes/moine_1_peau_foncee.webp'), require('@/assets/avatars/app/packs/moine/teintes/moine_2_peau_foncee.webp'), require('@/assets/avatars/app/packs/moine/teintes/moine_3_peau_foncee.webp')],
    peau_mate: [require('@/assets/avatars/app/packs/moine/teintes/moine_1_peau_mate.webp'), require('@/assets/avatars/app/packs/moine/teintes/moine_2_peau_mate.webp'), require('@/assets/avatars/app/packs/moine/teintes/moine_3_peau_mate.webp')],
  },
  oni: {
    peau_foncee: [require('@/assets/avatars/app/packs/oni/teintes/oni_1_peau_foncee.webp'), require('@/assets/avatars/app/packs/oni/teintes/oni_2_peau_foncee.webp'), require('@/assets/avatars/app/packs/oni/teintes/oni_3_peau_foncee.webp')],
    peau_mate: [require('@/assets/avatars/app/packs/oni/teintes/oni_1_peau_mate.webp'), require('@/assets/avatars/app/packs/oni/teintes/oni_2_peau_mate.webp'), require('@/assets/avatars/app/packs/oni/teintes/oni_3_peau_mate.webp')],
  },
};

/** Variantes disponibles d'une Legende (dans l'ordre foncee puis mate) */
export function variantesLegende(packId: string): VarianteTeinte[] {
  const t = TEINTES_LEGENDES[packId];
  if (!t) return [];
  return (['peau_foncee', 'peau_mate', 'asie'] as VarianteTeinte[]).filter((v) => (t[v]?.length ?? 0) > 0);
}

/** Image d'une variante a un niveau (1 a 3), ou undefined */
export function imageTeinteLegende(packId: string, variante: VarianteTeinte, niveau: number): number | undefined {
  const l = TEINTES_LEGENDES[packId]?.[variante];
  if (!l || !l.length) return undefined;
  return l[Math.max(0, Math.min(l.length - 1, Math.round(niveau) - 1))];
}
