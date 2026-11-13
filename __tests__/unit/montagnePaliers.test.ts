/**
 * La montagne des paliers de la carte « Ton poids » (13 novembre 2026, bloc C choisi par Houari) :
 * la geometrie pure (lib/v2/accueil/montagnePaliers.ts).
 */
import { geometrieMontagne, MONTAGNE, progressionPropre, texteMontagne } from '@/lib/v2/accueil/montagnePaliers';
import { etatsLignePaliers } from '@/lib/v2/accueil/lignePaliers';

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

describe('geometrieMontagne', () => {
  it('pose les paliers a intervalles reguliers sur le chemin, en montant', () => {
    const g = geometrieMontagne(307, 4, 0.9);
    expect(g.paliers).toHaveLength(3);
    expect(g.paliers.map((p) => p.part)).toEqual([0.25, 0.5, 0.75]);
    // ils montent : chaque palier est plus haut et plus a droite que le precedent
    for (let i = 1; i < g.paliers.length; i++) {
      expect(g.paliers[i].y).toBeLessThan(g.paliers[i - 1].y);
      expect(g.paliers[i].x).toBeGreaterThan(g.paliers[i - 1].x);
    }
    expect(g.objectif.y).toBeLessThan(g.paliers[2].y);
    expect(g.depart.y).toBeGreaterThan(g.paliers[0].y);
  });

  it('un nombre de paliers variable : n - 1 ronds, l objectif au sommet', () => {
    expect(geometrieMontagne(307, 1, 0.5).paliers).toHaveLength(0);
    expect(geometrieMontagne(307, 2, 0.5).paliers.map((p) => p.part)).toEqual([0.5]);
    expect(geometrieMontagne(307, 6, 0.5).paliers).toHaveLength(5);
    expect(geometrieMontagne(307, 0, 0.5).paliers).toHaveLength(0);
  });

  it('la partie parcourue suit la progression reelle, entre 0 et 100 %', () => {
    const g = geometrieMontagne(307, 4, 0.5);
    expect(g.longueurParcourue).toBeCloseTo(g.longueur / 2, 5);
    // a 50 %, tu es exactement sur le palier 2
    expect(dist(g.toi, g.paliers[1])).toBeLessThan(0.01);
    expect(geometrieMontagne(307, 4, 0).parcouru).toBeNull();
    expect(geometrieMontagne(307, 4, 0).toi).toEqual(geometrieMontagne(307, 4, 0).depart);
    expect(geometrieMontagne(307, 4, -0.4).progression).toBe(0);
    expect(geometrieMontagne(307, 4, 1.7).progression).toBe(1);
    expect(geometrieMontagne(307, 4, NaN).progression).toBe(0);
  });

  it('objectif atteint : le chemin est plein et tu es au sommet', () => {
    const g = geometrieMontagne(307, 4, 1);
    expect(g.longueurParcourue).toBeCloseTo(g.longueur, 5);
    expect(g.toi).toEqual(g.objectif);
    expect(g.parcouru).toBe(g.chemin);
  });

  it('la progression ne recule jamais le long du chemin', () => {
    let avant = geometrieMontagne(307, 4, 0).toi;
    for (let p = 0.05; p <= 1.0001; p += 0.05) {
      const ici = geometrieMontagne(307, 4, p).toi;
      expect(ici.y).toBeLessThanOrEqual(avant.y + 1e-6);
      avant = ici;
    }
  });

  it('rien ne deborde, du petit au grand ecran', () => {
    for (const w of [200, 252, 307, 325, 362, 600]) {
      for (const p of [0, 0.12, 0.5, 0.97, 1]) {
        const g = geometrieMontagne(w, 4, p, 110);
        const tous = [g.depart, g.objectif, g.toi, g.pic, ...g.paliers];
        for (const q of tous) {
          expect(q.x).toBeGreaterThanOrEqual(0);
          expect(q.x).toBeLessThanOrEqual(g.largeur);
          expect(q.y).toBeGreaterThanOrEqual(0);
          expect(q.y).toBeLessThanOrEqual(g.hauteur);
        }
        // la bulle reste dans la carte, sous la place du fanion
        const b = g.bulle;
        expect(b.x).toBeGreaterThanOrEqual(0);
        expect(b.x + b.largeur).toBeLessThanOrEqual(g.largeur + 1e-6);
        expect(b.y).toBeGreaterThanOrEqual(MONTAGNE.bulleHautMin);
        expect(b.y + MONTAGNE.bulleH).toBeLessThanOrEqual(g.hauteur);
        expect(MONTAGNE.bulleHautMin).toBeGreaterThanOrEqual(MONTAGNE.fanion);
        if (b.cote === 'droite') {
          // a droite de toi, sa pointe dans sa hauteur
          expect(b.x).toBeGreaterThan(g.toi.x);
          expect(b.pointe).toBeGreaterThanOrEqual(6);
          expect(b.pointe).toBeLessThanOrEqual(MONTAGNE.bulleH - 6);
        } else {
          // au-dessus de toi, sa pointe dans sa largeur
          expect(b.y + MONTAGNE.bulleH + MONTAGNE.bulleFleche).toBeLessThanOrEqual(g.toi.y);
          expect(b.pointe).toBeGreaterThanOrEqual(10);
          expect(b.pointe).toBeLessThanOrEqual(b.largeur - 10);
        }
      }
    }
  });

  it('les etiquettes passent en version courte quand la place manque a gauche du premier rond', () => {
    expect(geometrieMontagne(252, 4, 0.5).court).toBe(true);
    expect(geometrieMontagne(600, 4, 0.5).court).toBe(false);
    const g = geometrieMontagne(307, 4, 0.5);
    const place = g.paliers[0].x - MONTAGNE.rond / 2 - MONTAGNE.ecartEtiquette;
    expect(g.court).toBe(place < MONTAGNE.etiquetteLongue);
    // meme courte, l etiquette tient a gauche du premier rond, du plus petit ecran (320 - 68) au plus grand
    for (const w of [252, 307, 325, 362]) {
      const q = geometrieMontagne(w, 4, 0.5);
      const placeQ = q.paliers[0].x - MONTAGNE.rond / 2 - MONTAGNE.ecartEtiquette;
      expect(placeQ).toBeGreaterThanOrEqual(q.court ? MONTAGNE.etiquetteCourte : MONTAGNE.etiquetteLongue);
    }
  });

  it('les etiquettes ne se touchent pas et ne touchent pas les ronds', () => {
    for (const w of [252, 307, 325, 362, 600]) {
      const g = geometrieMontagne(w, 4, 0.5);
      const e = g.etiquettes;
      expect(e).toHaveLength(3);
      for (let i = 0; i < e.length; i++) {
        expect(e[i].x).toBeGreaterThanOrEqual(0);
        expect(e[i].largeur).toBe(g.court ? MONTAGNE.etiquetteCourte : MONTAGNE.etiquetteLongue);
        for (let j = i + 1; j < e.length; j++) {
          const chevauche = e[i].x < e[j].x + e[j].largeur && e[j].x < e[i].x + e[i].largeur && e[i].y < e[j].y + e[j].hauteur && e[j].y < e[i].y + e[i].hauteur;
          expect(chevauche).toBe(false);
        }
        // le rond suivant reste a droite de l etiquette ou plus haut qu elle
        const r = g.paliers[i + 1];
        if (r) expect(r.x - MONTAGNE.rond / 2 >= e[i].x + e[i].largeur || r.y + MONTAGNE.rond / 2 <= e[i].y).toBe(true);
      }
    }
  });

  it('la bulle se pose a droite de toi quand la place suffit, au-dessus sinon', () => {
    expect(geometrieMontagne(307, 4, 0.5, 96).bulle.cote).toBe('droite');
    expect(geometrieMontagne(200, 4, 1, 110).bulle.cote).toBe('haut');
    // a droite, elle ne touche aucune etiquette (elles sont toutes a gauche de leur rond)
    for (const p of [0, 0.3, 0.5, 0.8, 1]) {
      const g = geometrieMontagne(307, 4, p, 96);
      if (g.bulle.cote !== 'droite') continue;
      for (const e of g.etiquettes) expect(e.x + e.largeur <= g.bulle.x || e.y + e.hauteur <= g.bulle.y || e.y >= g.bulle.y + MONTAGNE.bulleH).toBe(true);
    }
  });

  it('la bulle a droite ne touche ni un rond ni une etiquette, meme au tout debut', () => {
    for (const w of [252, 307, 334, 362]) {
      for (const p of [0, 0.03, 0.1, 0.3, 0.6, 0.9]) {
        const g = geometrieMontagne(w, 4, p, 96);
        if (g.bulle.cote !== 'droite') continue;
        const b = g.bulle;
        for (const q of g.paliers) {
          const touche = q.y - MONTAGNE.rond / 2 < b.y + MONTAGNE.bulleH && b.y < q.y + MONTAGNE.rond / 2 && q.x - MONTAGNE.rond / 2 < b.x + b.largeur && b.x < q.x + MONTAGNE.rond / 2;
          expect(touche).toBe(false);
        }
      }
    }
  });

  it('« Objectif » passe a gauche du fanion sur petit ecran', () => {
    expect(geometrieMontagne(252, 4, 0.5).objectifAGauche).toBe(true);
    expect(geometrieMontagne(334, 4, 0.5).objectifAGauche).toBe(false);
  });

  it('les chemins SVG sont valides (aucun NaN)', () => {
    const g = geometrieMontagne(307, 4, 0.83);
    for (const d of [g.montagne, g.neige, g.chemin, g.parcouru ?? '']) expect(d).not.toMatch(/NaN|Infinity/);
    expect(g.montagne.startsWith('M')).toBe(true);
    expect(g.parcouru?.startsWith('M')).toBe(true);
  });

  it('progressionPropre', () => {
    expect(progressionPropre(0.3)).toBe(0.3);
    expect(progressionPropre(Infinity)).toBe(0);
  });
});

describe('la montagne avec les vraies donnees de la carte', () => {
  it('la maquette : 86,4 au depart, objectif 80,0, tu es a 80,6 : 3 paliers franchis, la bulle juste sous le sommet', () => {
    const part = (86.4 - 80.6) / (86.4 - 80);
    const l = etatsLignePaliers(86.4, 80, 80.6, part, false);
    expect(l.paliers.map((p) => p.kg)).toEqual([84.8, 83.2, 81.6, 80]);
    expect(l.atteints).toBe(3);
    const g = geometrieMontagne(307, l.paliers.length, part);
    expect(g.paliers).toHaveLength(3);
    // tu as depasse le palier 3 et tu n es pas encore au sommet
    expect(g.toi.y).toBeLessThan(g.paliers[2].y);
    expect(g.toi.y).toBeGreaterThan(g.objectif.y);
    expect(texteMontagne(l, 0.6, '80', false)).toBe('3 paliers sur 4 franchis, encore 0,6 kg avant ton objectif de 80 kg');
  });

  it('prise de masse : on monte pareil vers l objectif', () => {
    const l = etatsLignePaliers(70, 78, 75, 0.625, false);
    expect(l.paliers.map((p) => p.kg)).toEqual([72, 74, 76, 78]);
    expect(l.atteints).toBe(2);
    const g = geometrieMontagne(307, 4, 0.625);
    expect(g.toi.y).toBeLessThan(g.paliers[1].y);
    expect(g.toi.y).toBeGreaterThan(g.paliers[2].y);
    expect(texteMontagne(l, 3, '78', false)).toBe('2 paliers sur 4 franchis, encore 3,0 kg avant ton objectif de 78 kg');
  });

  it('un seul palier franchi, ou aucun : le singulier', () => {
    expect(texteMontagne(etatsLignePaliers(90, 80, 87, 0.3, false), 7, '80', false)).toBe('1 palier sur 4 franchi, encore 7,0 kg avant ton objectif de 80 kg');
    expect(texteMontagne(etatsLignePaliers(90, 80, 89, 0.1, false), 9, '80', false)).toBe('0 palier sur 4 franchi, encore 9,0 kg avant ton objectif de 80 kg');
  });

  it('objectif atteint : le texte qui existait deja', () => {
    const l = etatsLignePaliers(86.4, 80, 79.8, 1, true);
    expect(texteMontagne(l, 0, '80', true)).toBe('Torii atteint, les 4 paliers franchis');
  });
});
