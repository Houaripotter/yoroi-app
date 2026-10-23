/**
 * Decoupe d'une planche d'illustrations (2 x 2 ou 3 x 3) : la meme logique que
 * _propositions/exercices/decoupe.py, en code pur pour la tester.
 * Entree : un profil, la part de pixels « encre » par colonne (ou par ligne), entre 0 et 1.
 * Sortie : les positions de coupe, au milieu des marges unies qui separent les cases.
 */

export type Bande = [debut: number, fin: number];

/** intervalles consecutifs ou le profil reste sous le seuil (une marge sans trait) */
export function bandesUnies(profil: number[], seuil = 0.002, mini = 4): Bande[] {
  const out: Bande[] = [];
  let debut: number | null = null;
  profil.forEach((v, i) => {
    if (v <= seuil) {
      if (debut === null) debut = i;
    } else if (debut !== null) {
      if (i - debut >= mini) out.push([debut, i]);
      debut = null;
    }
  });
  if (debut !== null && profil.length - debut >= mini) out.push([debut, profil.length]);
  return out;
}

/**
 * n cases : n - 1 coupes au centre des marges internes les plus proches des positions regulieres.
 * Sans marge nette a moins d'une demi-case, la coupe reste reguliere.
 */
export function coupesPlanche(profil: number[], n: number): number[] {
  const L = profil.length;
  const internes = bandesUnies(profil).filter(([a, b]) => a > 0 && b < L);
  const res: number[] = [0];
  for (let k = 1; k < n; k++) {
    const cible = (L * k) / n;
    let coupe = Math.floor(cible);
    if (internes.length) {
      const proche = internes.reduce((m, b) => (Math.abs((b[0] + b[1]) / 2 - cible) < Math.abs((m[0] + m[1]) / 2 - cible) ? b : m));
      const centre = Math.floor((proche[0] + proche[1]) / 2);
      if (Math.abs(centre - cible) < L / (2 * n)) coupe = centre;
    }
    res.push(coupe);
  }
  res.push(L);
  return res;
}

/** rectangles des cases, ligne par ligne : [x, y, largeur, hauteur] */
export function casesPlanche(profilColonnes: number[], profilLignes: number[], n: number): [number, number, number, number][] {
  const xs = coupesPlanche(profilColonnes, n);
  const ys = coupesPlanche(profilLignes, n);
  const out: [number, number, number, number][] = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) out.push([xs[c], ys[r], xs[c + 1] - xs[c], ys[r + 1] - ys[r]]);
  return out;
}
