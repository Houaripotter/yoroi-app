/**
 * Ligne de paliers de la carte « Ton poids » de l'accueil (2 novembre 2026, proposition A) : l'etat de chaque rond
 * (atteint, prochain, a venir) tire de paliersDuChemin, avec les chiffres de la maquette (debut 88,1, objectif 85).
 */
import { AVANCE_MAX, avanceEntre, etatsLignePaliers } from '@/lib/v2/accueil/lignePaliers';

const etats = (l: ReturnType<typeof etatsLignePaliers>) => l.paliers.map((p) => p.etat);

describe('etatsLignePaliers', () => {
  it('donne les 4 paliers de la maquette : 87,3, 86,6, 85,8 et 85,0', () => {
    const l = etatsLignePaliers(88.1, 85, 86.4, 1.7 / 3.1, false);
    expect(l.paliers.map((p) => p.kg)).toEqual([87.3, 86.6, 85.8, 85]);
  });

  it('a mi-chemin : 2 atteints, le prochain 85,8 kg a 0,6 kg, le dernier a venir', () => {
    const l = etatsLignePaliers(88.1, 85, 86.4, 1.7 / 3.1, false);
    expect(etats(l)).toEqual(['atteint', 'atteint', 'prochain', 'a_venir']);
    expect(l.atteints).toBe(2);
    expect(l.prochain).toEqual({ kg: 85.8, encore: 0.6, dernier: false });
  });

  it('torii atteint : les 4 paliers atteints, plus de prochain', () => {
    const l = etatsLignePaliers(88.1, 85, 75, 1, true);
    expect(etats(l)).toEqual(['atteint', 'atteint', 'atteint', 'atteint']);
    expect(l.atteints).toBe(4);
    expect(l.prochain).toBeNull();
  });

  it('au tout debut : le premier palier est le prochain, les autres a venir', () => {
    const l = etatsLignePaliers(88.1, 85, 88.1, 0, false);
    expect(etats(l)).toEqual(['prochain', 'a_venir', 'a_venir', 'a_venir']);
    expect(l.atteints).toBe(0);
    expect(l.prochain?.kg).toBe(87.3);
  });

  it('100 % du chemin sans torii : ton objectif reste le prochain, jamais montre atteint', () => {
    const l = etatsLignePaliers(88.1, 85, 85, 1, false);
    expect(etats(l)).toEqual(['atteint', 'atteint', 'atteint', 'prochain']);
    expect(l.atteints).toBe(3);
    expect(l.prochain).toEqual({ kg: 85, encore: 0, dernier: true });
  });

  it('dernier quart : le prochain est ton objectif', () => {
    const l = etatsLignePaliers(88.1, 85, 85.5, 0.8, false);
    expect(etats(l)).toEqual(['atteint', 'atteint', 'atteint', 'prochain']);
    expect(l.prochain?.dernier).toBe(true);
    expect(l.prochain?.encore).toBe(0.5);
  });

  it('prise de poids : les paliers montent et suivent la meme regle', () => {
    const l = etatsLignePaliers(70, 74, 72.5, 0.6, false);
    expect(l.paliers.map((p) => p.kg)).toEqual([71, 72, 73, 74]);
    expect(etats(l)).toEqual(['atteint', 'atteint', 'prochain', 'a_venir']);
    expect(l.prochain).toEqual({ kg: 73, encore: 0.5, dernier: false });
  });

  it('le trait vers le prochain palier se remplit : 86 entre 87,5 et 85, environ 60 %', () => {
    const l = etatsLignePaliers(90, 80, 86, 0.4, false);
    expect(l.paliers.map((p) => p.kg)).toEqual([87.5, 85, 82.5, 80]);
    expect(etats(l)).toEqual(['atteint', 'prochain', 'a_venir', 'a_venir']);
    expect(l.avance).toBeCloseTo(0.6, 6);
  });

  it('prise de poids : meme remplissage entre deux paliers qui montent', () => {
    const l = etatsLignePaliers(70, 78, 73.2, 0.4, false);
    expect(l.paliers.map((p) => p.kg)).toEqual([72, 74, 76, 78]);
    expect(etats(l)).toEqual(['atteint', 'prochain', 'a_venir', 'a_venir']);
    expect(l.avance).toBeCloseTo(0.6, 6);
  });

  it('avant le premier palier : le trait part de ton depart', () => {
    const l = etatsLignePaliers(90, 80, 89, 0.1, false);
    expect(l.atteints).toBe(0);
    expect(l.avance).toBeCloseTo(0.4, 6);
  });

  it('le remplissage reste entre 0 et AVANCE_MAX, et vaut 0 au torii', () => {
    expect(avanceEntre(87.5, 85, 88)).toBe(0);
    expect(avanceEntre(87.5, 85, 84.9)).toBe(AVANCE_MAX);
    expect(avanceEntre(85, 85, 85)).toBe(0);
    expect(etatsLignePaliers(88.1, 85, 75, 1, true).avance).toBe(0);
  });
});
