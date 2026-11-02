/**
 * Tests du critere A+ (critereAplus.ts), sur masques simules et sur les 15 masques MediaPipe du banc.
 * Chaque masque des fixtures a aussi ete passe dans critere.py (la reference Python, OpenCV) : on exige le meme niveau,
 * les memes raisons, et les memes mesures a l'arrondi pres.
 */
import { arrondiPair, boiteCorps, critereAplus, LARGEUR_REFERENCE, niveauMasque, redimensionner, visagesFiables } from '@/lib/v2/cartes/moteur/critereAplus';
import type { MasqueGris, VisagePart } from '@/lib/v2/cartes/moteur/critereAplus';

const FIXTURES: Fixture[] = require('../fixtures/masquesCritereAplus.json');

type Fixture = {
  nom: string;
  largeur: number;
  hauteur: number;
  plages: number[][];
  visages: number[][];
  attendu: { niveau: string; raisons: string[]; mesures: Record<string, number | number[][]> };
};

function depuisPlages(f: Fixture): MasqueGris {
  const d = new Uint8Array(f.largeur * f.hauteur);
  f.plages.forEach((ligne, y) => {
    for (let i = 0; i < ligne.length; i += 2) d.fill(255, y * f.largeur + ligne[i], y * f.largeur + ligne[i] + ligne[i + 1]);
  });
  return { largeur: f.largeur, hauteur: f.hauteur, donnees: d };
}

/* --------- masques simules, dessines ici */

function vide(w: number, h: number): MasqueGris {
  return { largeur: w, hauteur: h, donnees: new Uint8Array(w * h) };
}
function ellipse(m: MasqueGris, cx: number, cy: number, rx: number, ry: number, v = 255) {
  for (let y = Math.max(0, Math.floor(cy - ry)); y <= Math.min(m.hauteur - 1, Math.ceil(cy + ry)); y++) {
    for (let x = Math.max(0, Math.floor(cx - rx)); x <= Math.min(m.largeur - 1, Math.ceil(cx + rx)); x++) {
      if (((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1) m.donnees[y * m.largeur + x] = v;
    }
  }
}
function rect(m: MasqueGris, x0: number, y0: number, x1: number, y1: number, v = 255) {
  for (let y = Math.max(0, y0); y <= Math.min(m.hauteur - 1, y1); y++) m.donnees.fill(v, y * m.largeur + Math.max(0, x0), y * m.largeur + Math.min(m.largeur - 1, x1) + 1);
}
/** Une personne propre : tete ovale, cheveux au-dessus du visage, torse sous le menton. Le visage en part de la photo */
function personne(w = 1080, h = 1500): { m: MasqueGris; visage: VisagePart } {
  const m = vide(w, h);
  const rx = 200;
  const ry = 250;
  const cx = 540;
  const cy = 300 + ry;
  ellipse(m, cx, cy, rx, ry);
  rect(m, cx - rx - 40, cy + ry - 60, cx + rx + 40, h - 1);
  const fw = Math.trunc(1.3 * rx);
  const fh = Math.trunc(1.25 * ry);
  return { m, visage: { x: (cx - Math.floor(fw / 2)) / w, y: (cy - Math.trunc(0.45 * ry)) / h, w: fw / w, h: fh / h, confiance: 0.9 } };
}

describe('critere A+ : masques simules', () => {
  it('une silhouette propre donne A+', () => {
    const { m, visage } = personne();
    const r = critereAplus(m, [visage]);
    expect(r.raisons).toEqual([]);
    expect(r.niveau).toBe('A+');
  });

  it('une coupe dans les cheveux donne A, avec la raison', () => {
    const { m, visage } = personne();
    const x = Math.round(visage.x * 1080 + (visage.w * 1080) / 2);
    const y = Math.round(visage.y * 1500);
    ellipse(m, x, y - 60, 22, 22, 0);
    rect(m, x - 8, y - 140, x + 8, y - 60, 0);
    const r = critereAplus(m, [visage]);
    expect(r.niveau).toBe('A');
    expect(r.raisons.join(' ')).toMatch(/cheveux|entaill|contour/);
  });

  it('deux personnes separees donnent A (plusieurs morceaux)', () => {
    const { m, visage } = personne();
    ellipse(m, 120, 1150, 90, 300);
    const r = critereAplus(m, [visage]);
    expect(r.niveau).toBe('A');
    expect(r.raisons).toContain('plusieurs morceaux : deux personnes ou du décor détouré');
  });

  it('des trous dans le corps donnent A', () => {
    const { m, visage } = personne();
    ellipse(m, 540, 1300, 60, 60, 0);
    ellipse(m, 400, 1200, 50, 50, 0);
    expect(critereAplus(m, [visage]).raisons).toContain('trous dans le corps');
  });

  it('sans visage : Secours, meme avec un masque parfait', () => {
    const { m } = personne();
    const r = critereAplus(m, []);
    expect(r.niveau).toBe('Secours');
  });

  it('visage sans masque (avant iOS 17, ou detourage en echec) : A', () => {
    const { visage } = personne();
    const r = critereAplus(null, [visage], 1500 / 1080);
    expect(r.niveau).toBe('A');
    expect(r.raisons).toEqual(['aucune personne détourée']);
  });

  it('masque vide : A', () => {
    const { visage } = personne();
    expect(critereAplus(vide(1080, 1500), [visage]).niveau).toBe('A');
  });

  it('masque abime (taille fausse) : traite comme absent, jamais d erreur', () => {
    const { visage } = personne();
    const casse: MasqueGris = { largeur: 100, hauteur: 100, donnees: new Uint8Array(10) };
    expect(critereAplus(casse, [visage]).niveau).toBe('A');
  });

  it('un visage peu sur (moins de 0,5) est ignore : Secours', () => {
    const { m, visage } = personne();
    expect(critereAplus(m, [{ ...visage, confiance: 0.3 }]).niveau).toBe('Secours');
  });

  it('ML Kit ne donne pas de score : le visage est garde', () => {
    const { m, visage } = personne();
    expect(critereAplus(m, [{ ...visage, confiance: null }]).niveau).toBe('A+');
  });

  it('un visage minuscule (moins de 4 % de la largeur) est ignore', () => {
    expect(visagesFiables([{ x: 0.5, y: 0.5, w: 0.03, h: 0.03, confiance: 0.9 }])).toEqual([]);
  });

  it('un masque reduit (module a 1024 px) est ramene a 1080 px de large, et le niveau ne change pas', () => {
    const { m, visage } = personne();
    const petit = redimensionner(m, 737, 1024);
    const r = critereAplus(petit, [visage], 1500 / 1080);
    expect(r.niveau).toBe('A+');
    expect(LARGEUR_REFERENCE).toBe(1080);
  });

  it('la boite du corps suit la plus grande forme', () => {
    const { m } = personne();
    const b = boiteCorps(m);
    expect(b).not.toBeNull();
    expect(b!.x).toBeCloseTo(300 / 1080, 3);
    expect(b!.y).toBeCloseTo(300 / 1500, 3);
    expect(boiteCorps(vide(100, 100))).toBeNull();
    expect(boiteCorps(null)).toBeNull();
  });

  it('arrondi de Python (au pair)', () => {
    expect([0.5, 1.5, 2.5, -0.5, 2.4, 2.6].map(arrondiPair)).toEqual([0, 2, 2, 0, 2, 3]);
  });

  it('le plus grand visage est controle, comme critere.py', () => {
    const { m, visage } = personne();
    const petit = { ...visage, w: visage.w * 0.5, h: visage.h * 0.5 };
    expect(critereAplus(m, [petit, visage]).niveau).toBe('A+');
  });
});

describe('critere A+ : meme resultat que critere.py (OpenCV)', () => {
  it(`les fixtures sont la (${FIXTURES.length} masques)`, () => {
    expect(FIXTURES.length).toBeGreaterThanOrEqual(20);
  });

  for (const f of FIXTURES) {
    it(f.nom, () => {
      const m = depuisPlages(f);
      const r = niveauMasque(m, f.visages as [number, number, number, number, number][]);
      expect(r.niveau).toBe(f.attendu.niveau);
      expect(r.raisons).toEqual(f.attendu.raisons);
      for (const [cle, attendu] of Object.entries(f.attendu.mesures)) {
        const obtenu = r.mesures[cle];
        if (Array.isArray(attendu)) {
          expect(Array.isArray(obtenu)).toBe(true);
          expect((obtenu as number[][]).length).toBe(attendu.length);
          const tri = (a: number[][]) => [...a].map((k) => `${k[1]},${k[2]}`).sort();
          expect(tri(obtenu as number[][])).toEqual(tri(attendu as number[][]));
        } else {
          expect(Math.abs((obtenu as number) - attendu)).toBeLessThanOrEqual(cle === 'entailles_tete_7px' ? 2e-5 : 1.5e-3);
        }
      }
    });
  }

  it('via critereAplus (visages en part de la photo) : meme niveau sur les masques MediaPipe', () => {
    for (const f of FIXTURES.filter((x) => x.nom.startsWith('mediapipe_'))) {
      const m = depuisPlages(f);
      const v = f.visages.map((b) => ({ x: b[0] / f.largeur, y: b[1] / f.hauteur, w: b[2] / f.largeur, h: b[3] / f.hauteur, confiance: b[4] ?? null }));
      expect(critereAplus(m, v, f.hauteur / f.largeur).niveau).toBe(f.attendu.niveau);
    }
  });
});
