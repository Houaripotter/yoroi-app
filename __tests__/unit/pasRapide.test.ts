/**
 * Pas des boutons de charge (lib/v2/seances/pasRapide.ts).
 * 17 novembre 2026, retour de Houari : « que ca monte par 10 seulement apres 10 clics rapides, ou 15 ».
 */
import { compterTape, delaiRepetition, DELAI_TAPE_RAPIDE_MS, PAS_AVANT_ACCELERATION, PAS_AVANT_SAUT, pasAccelere, pasAppuiMaintenu, RAFALE_VIDE, REPETITION_MS, valeurSuivante, type Rafale } from '../../lib/v2/seances/pasRapide';

const taper = (temps: number[], bouton = 'plus') => {
  let r: Rafale = RAFALE_VIDE;
  return temps.map((t) => {
    const out = compterTape(r, bouton, t);
    r = out.rafale;
    return out.saut;
  });
};

/** Charge obtenue apres une suite d'appuis rapides sur + (kilos : pas 1, saut 10), comme le fait Stepper.tsx */
const charge = (depart: number, temps: number[], pas = 1, saut = 10) => {
  let r: Rafale = RAFALE_VIDE;
  let v = depart;
  for (const t of temps) {
    const out = compterTape(r, 'plus', t);
    r = out.rafale;
    v = valeurSuivante(v, 1, pas, out.saut ? pasAccelere(r.compte, saut, pas) : null);
  }
  return v;
};
const rapides = (n: number, ecart = 150) => Array.from({ length: n }, (_, i) => i * ecart);

describe('appuis rapides', () => {
  it('seuils nommes', () => {
    expect(DELAI_TAPE_RAPIDE_MS).toBe(300);
    expect(PAS_AVANT_ACCELERATION).toBe(10);
    expect(PAS_AVANT_SAUT).toBe(15);
  });
  it('10 appuis tres rapides : 10 fois le pas normal, aucun saut', () => {
    expect(taper(rapides(10))).toEqual(Array(10).fill(false));
    expect(charge(20, rapides(10))).toBe(30);
  });
  it('11e a 15e appui : pas moyen de 5 kg, puis 10 kg a partir du 16e', () => {
    // 20 + 10 x 1 = 30, puis 35, 40, 45, 50, 55, puis 60 (le saut se cale sur la dizaine)
    expect(charge(20, rapides(11))).toBe(35);
    expect(charge(20, rapides(15))).toBe(55);
    expect(charge(20, rapides(16))).toBe(60);
    expect(charge(20, rapides(17))).toBe(70);
  });
  it('le cas de Houari : 3 appuis rapides ne font plus +10', () => {
    expect(charge(20, rapides(3, 100))).toBe(23);
  });
  it('une pause de plus de 300 ms repart du pas normal', () => {
    const t = [...rapides(12), 11 * 150 + 400];
    expect(taper(t).slice(-1)).toEqual([false]);
  });
  it('changer de bouton repart de zero', () => {
    let r: Rafale = RAFALE_VIDE;
    const res: boolean[] = [];
    for (let i = 0; i < 12; i++) {
      const out = compterTape(r, i < 6 ? 'plus' : 'moins', i * 100);
      r = out.rafale;
      res.push(out.saut);
    }
    expect(res.every((x) => !x)).toBe(true);
  });
});

describe('pas accelere', () => {
  it('rien avant le 11e pas, ni sans saut', () => {
    expect(pasAccelere(10, 10)).toBeNull();
    expect(pasAccelere(30, undefined)).toBeNull();
    expect(pasAccelere(30, 0)).toBeNull();
    expect(pasAccelere(NaN, 10)).toBeNull();
  });
  it('kilos, livres, plaques : moitie du saut arrondie au pas, puis le saut', () => {
    expect(pasAccelere(11, 10, 1)).toBe(5);
    expect(pasAccelere(16, 10, 1)).toBe(10);
    expect(pasAccelere(11, 20, 2)).toBe(10);
    expect(pasAccelere(11, 5, 1)).toBe(2);
    expect(pasAccelere(16, 5, 1)).toBe(5);
  });
});

describe('appui maintenu', () => {
  it('10 pas normaux, puis moyen, puis saut, sans palier brutal', () => {
    const pas = Array.from({ length: 20 }, (_, i) => pasAppuiMaintenu(i + 1, 10, 1));
    expect(pas.slice(0, 10)).toEqual(Array(10).fill(null));
    expect(pas.slice(10, 15)).toEqual(Array(5).fill(5));
    expect(pas.slice(15)).toEqual(Array(5).fill(10));
  });
  it('repetitions : cadence reguliere 10 pas, puis un peu plus vive', () => {
    expect(delaiRepetition(1)).toBe(REPETITION_MS);
    expect(delaiRepetition(10)).toBe(REPETITION_MS);
    expect(delaiRepetition(11)).toBe(120);
    expect(delaiRepetition(25)).toBe(90);
    // jamais aussi brutal qu'avant (45 ms des le 13e pas)
    for (let i = 1; i < 60; i++) expect(delaiRepetition(i)).toBeGreaterThanOrEqual(90);
  });
});

describe('valeur suivante', () => {
  it('pas normal', () => {
    expect(valeurSuivante(81, 1, 1, null)).toBe(82);
    expect(valeurSuivante(81, -1, 0.5, null)).toBe(80.5);
  });
  it('gros pas cale sur son multiple', () => {
    expect(valeurSuivante(63, 1, 1, 10)).toBe(70);
    expect(valeurSuivante(63, -1, 1, 10)).toBe(60);
    expect(valeurSuivante(70, 1, 1, 10)).toBe(80);
    expect(valeurSuivante(63, 1, 1, 5)).toBe(65);
  });
  it('bornes', () => {
    expect(valeurSuivante(495, 1, 1, 10, 0, 500)).toBe(500);
    expect(valeurSuivante(3, -1, 1, 10)).toBe(0);
  });
});
