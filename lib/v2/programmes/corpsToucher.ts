/**
 * Quelle zone est sous le doigt (24 octobre 2026) : lit la grille du corps (lib/v2/programmes/corpsCarte.ts).
 * Si le doigt tombe juste à côté d'une zone (liseré, petit muscle), on prend la zone la plus proche à deux
 * cases près : un doigt est plus gros qu'un trait. Données pures, testées dans __tests__/unit/corpsToucher.test.ts.
 */
export type GrilleCorps = { ids: readonly string[]; grille: readonly string[] };

const LETTRES = 'abcdefghij';
const PORTEE = 2;

/** x et y entre 0 et 1 (fraction de la largeur et de la hauteur du dessin) ; null si rien de proche */
export function zoneSousLeDoigt(carte: GrilleCorps, x: number, y: number): string | null {
  const h = carte.grille.length;
  const w = carte.grille[0]?.length ?? 0;
  if (!h || !w || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > 1 || y > 1) return null;
  const c0 = Math.min(w - 1, Math.floor(x * w));
  const r0 = Math.min(h - 1, Math.floor(y * h));
  let mieux: string | null = null;
  let dist = Infinity;
  for (let dr = -PORTEE; dr <= PORTEE; dr++)
    for (let dc = -PORTEE; dc <= PORTEE; dc++) {
      const r = r0 + dr;
      const c = c0 + dc;
      if (r < 0 || c < 0 || r >= h || c >= w) continue;
      const i = LETTRES.indexOf(carte.grille[r][c]);
      if (i < 0 || i >= carte.ids.length) continue;
      const d = dr * dr + dc * dc;
      if (d < dist) {
        dist = d;
        mieux = carte.ids[i];
      }
    }
  return mieux;
}
