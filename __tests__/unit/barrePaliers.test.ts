/**
 * La barre des paliers de la carte « Ton poids » (14 novembre 2026, bloc A choisi par Houari) :
 * la geometrie pure (lib/v2/accueil/barrePaliers.ts).
 */
import { BARRE, couleurDegrade, geometrieBarre, largeurPoids } from '@/lib/v2/accueil/barrePaliers';
import { etatsLignePaliers } from '@/lib/v2/accueil/lignePaliers';

/** l'etat des paliers comme la carte le calcule (perte : depart > objectif) */
const etat = (d: number, o: number, a: number, fini = false) => {
  const part = fini ? 1 : Math.max(0, Math.min(1, (d - a) / (d - o)));
  return etatsLignePaliers(d, o, a, part, fini);
};
const ligneDe = (n: number, atteints: number, avance: number) => ({ paliers: Array.from({ length: n }, () => ({})), atteints, avance });
const chevauche = (a0: number, a1: number, b0: number, b1: number) => a0 < b1 && b0 < a1;

describe('geometrieBarre', () => {
  it('le cas de la maquette : 4 tranches, 3 franchies, la 4e remplie jusqu a toi', () => {
    const l = etat(86.4, 80, 80.6);
    expect(l.atteints).toBe(3);
    const g = geometrieBarre(350, l, false);
    expect(g.tranches).toHaveLength(4);
    expect(g.tranches.map((t) => t.rempli).slice(0, 3)).toEqual([1, 1, 1]);
    expect(g.tranches[3].rempli).toBeCloseTo(l.avance, 5);
    expect(g.tranches[3].rempli).toBeGreaterThan(0);
    expect(g.tranches[3].rempli).toBeLessThan(1);
    // 3 coches, une par palier franchi, dans le degrade qui va du violet a l'orange
    expect(g.coches).toHaveLength(3);
    expect(g.coches[0].couleur).not.toBe(g.coches[2].couleur);
    expect(g.poidsVisibles).toBe(true);
    expect(g.bulle?.cote).toBe('haut');
  });

  it('80 points de haut au plus', () => {
    for (const w of [216, 252, 307, 334, 366, 600]) {
      for (const n of [1, 2, 4, 6]) {
        // 6 paliers sur la plus petite carte : la bulle peut passer sous la barre (la carte en a 4 aujourd'hui)
        if (w < 250 && n > 4) continue;
        for (let a = 0; a < n; a++) for (const av of [0, 0.4, 0.95]) expect(geometrieBarre(w, ligneDe(n, a, av), false).hauteur).toBeLessThanOrEqual(80);
      }
    }
    expect(BARRE.barreH).toBeGreaterThanOrEqual(12);
    expect(BARRE.barreH).toBeLessThanOrEqual(14);
    expect(BARRE.ecart).toBeGreaterThanOrEqual(5);
    expect(BARRE.ecart).toBeLessThanOrEqual(6);
    expect(BARRE.coche).toBeGreaterThanOrEqual(24);
    expect(BARRE.coche).toBeLessThanOrEqual(28);
  });

  it('les tranches couvrent la barre, avec le meme espace entre elles, le fanion au bout', () => {
    const g = geometrieBarre(334, ligneDe(4, 1, 0.5), false);
    const fin = g.tranches[3].x + g.tranches[3].largeur;
    expect(fin).toBeCloseTo(g.finBarre, 5);
    for (let i = 1; i < 4; i++) expect(g.tranches[i].x - (g.tranches[i - 1].x + g.tranches[i - 1].largeur)).toBeCloseTo(BARRE.ecart, 5);
    expect(g.fanion.x).toBeGreaterThan(g.finBarre);
    expect(g.fanion.x + BARRE.fanion).toBeCloseTo(334, 5);
  });

  it('un nombre de paliers variable', () => {
    for (const n of [1, 2, 3, 5, 6]) {
      const g = geometrieBarre(334, ligneDe(n, n - 1, 0.3), false);
      expect(g.tranches).toHaveLength(n);
      expect(g.coches).toHaveLength(n - 1);
    }
    expect(geometrieBarre(334, ligneDe(0, 0, 0), false).tranches).toHaveLength(1);
  });

  it('ta bulle ne recouvre jamais une coche, ni le fanion, et sa pointe tombe sur toi', () => {
    for (const w of [252, 307, 334, 366]) {
      for (const n of [2, 3, 4, 5]) {
        for (let a = 0; a < n; a++) {
          for (const av of [0, 0.02, 0.1, 0.5, 0.95]) {
            const g = geometrieBarre(w, ligneDe(n, a, av), false);
            const b = g.bulle!;
            expect(g.hauteur).toBeLessThanOrEqual(80);
            expect(b).not.toBeNull();
            expect(b.x).toBeGreaterThanOrEqual(0);
            expect(b.x + b.largeur).toBeLessThanOrEqual(g.finBarre + 0.01);
            if (b.cote === 'haut') {
              // la pointe tombe sur toi (tout au bord, elle reste a sa marge du bord de la bulle)
              expect(Math.abs(b.x + b.pointe - (g.toi as number))).toBeLessThanOrEqual(BARRE.bulleMarge);
              expect(b.pointe).toBeGreaterThanOrEqual(BARRE.bulleMarge);
              expect(b.pointe).toBeLessThanOrEqual(b.largeur - BARRE.bulleMarge);
              const col = g.poidsVisibles ? Math.max(BARRE.coche, largeurPoids('00,0')) : BARRE.coche;
              for (const c of g.coches) expect(chevauche(b.x, b.x + b.largeur, c.x - col / 2, c.x + col / 2)).toBe(false);
            }
          }
        }
      }
    }
  });

  it('la bulle glisse, puis la coche se decale, quand tu viens de franchir un palier', () => {
    // pres du palier franchi : la bulle part a droite, sa pointe reste sur toi
    const g = geometrieBarre(334, ligneDe(4, 2, 0.3), false);
    expect(g.bulle!.x).toBeGreaterThan((g.toi as number) - g.bulle!.largeur / 2);
    // tout juste franchi : la coche se decale un peu vers la gauche
    const h = geometrieBarre(334, ligneDe(4, 2, 0), false);
    expect(h.coches[1].x).toBeLessThan(h.coches[1].xPalier);
    expect(h.bulle!.cote).toBe('haut');
  });

  it('petit ecran 320 : les coches restent, les poids peuvent se cacher', () => {
    const g = geometrieBarre(216, ligneDe(6, 5, 0.1), false);
    expect(g.coches).toHaveLength(5);
    expect(g.poidsVisibles).toBe(false);
    const m = geometrieBarre(252, etat(86.4, 80, 80.6), false);
    expect(m.coches).toHaveLength(3);
    expect(m.poidsVisibles).toBe(true);
    // « Depart 86,4 » laisse la ligne a ton objectif sur la plus petite carte
    expect(m.departVisible).toBe(false);
    expect(geometrieBarre(307, etat(86.4, 80, 80.6), false).departVisible).toBe(true);
  });

  it('objectif atteint : toutes les tranches pleines, pas de bulle, une coche par palier avant l objectif', () => {
    const l = etat(86.4, 80, 79.8, true);
    const g = geometrieBarre(334, l, true);
    expect(g.tranches.every((t) => t.rempli === 1)).toBe(true);
    expect(g.bulle).toBeNull();
    expect(g.toi).toBeNull();
    expect(g.coches).toHaveLength(l.paliers.length - 1);
  });

  it('prise de masse : la barre marche pareil', () => {
    const l = etatsLignePaliers(70, 78, 75, (75 - 70) / 8, false);
    const g = geometrieBarre(334, l, false);
    expect(g.coches).toHaveLength(l.atteints);
    expect(g.tranches[l.atteints].rempli).toBeCloseTo(l.avance, 5);
    expect(g.bulle?.cote).toBe('haut');
  });

  it('tout debut : la bulle au debut, aucune coche', () => {
    const g = geometrieBarre(334, etat(86.4, 80, 86.3), false);
    expect(g.coches).toHaveLength(0);
    expect(g.bulle!.x).toBe(0);
  });

  it('des valeurs bancales ne cassent rien', () => {
    const g = geometrieBarre(NaN, { paliers: [{}, {}], atteints: NaN, avance: NaN }, false);
    expect(g.largeur).toBeGreaterThan(0);
    expect(g.tranches.every((t) => t.rempli === 0)).toBe(true);
  });
});

describe('couleurDegrade', () => {
  it('va du violet au debut a l orange a la fin', () => {
    expect(couleurDegrade(0)).toBe('#6E4BFF');
    expect(couleurDegrade(1)).toBe('#FF8A5B');
    expect(couleurDegrade(-1)).toBe('#6E4BFF');
    expect(couleurDegrade(0.6)).toBe('#C55BEA');
    expect(couleurDegrade(0.3)).toMatch(/^#[0-9A-F]{6}$/);
  });
  it('jamais de rouge', () => {
    for (let t = 0; t <= 1; t += 0.05) {
      const c = couleurDegrade(t);
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
      expect(r > 200 && g < 80 && b < 80).toBe(false);
    }
  });
});
