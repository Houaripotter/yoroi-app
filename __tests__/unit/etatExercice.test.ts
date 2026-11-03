/**
 * 3 novembre 2026 (demande de Houari) : un exercice est validé seulement quand toutes ses series prevues sont
 * faites ; sinon « 1 série manquante », et la serie qui manque est reperee (lib/v2/seances/etatExo.ts).
 */
import { etatExo, texteManquantes } from '@/lib/v2/seances/etatExo';

const s = (done: boolean, reps = 10, type?: 'warmup' | 'dropset') => ({ done, reps, weight: 40, ...(type ? { type } : {}) });

describe('exercice complet', () => {
  it('toutes les series prevues faites : validé', () => {
    expect(etatExo({ sets: [s(true), s(true), s(true)], objectifSeries: 3 })).toEqual({ etat: 'valide', faites: 3, total: 3, manquantes: 0, indexManquants: [] });
  });

  it('une serie ajoutee en plus et pas faite ne retire pas le « validé »', () => {
    expect(etatExo({ sets: [s(true), s(true), s(true), s(false)], objectifSeries: 3 }).etat).toBe('valide');
  });

  it('echauffement et drop set ne comptent ni comme faits ni comme manquants', () => {
    expect(etatExo({ sets: [s(true, 12, 'warmup'), s(true), s(true), s(true), s(false, 8, 'dropset')], objectifSeries: 3 }).etat).toBe('valide');
    // un echauffement seul ne valide rien
    expect(etatExo({ sets: [s(true, 12, 'warmup'), s(false), s(false)], objectifSeries: 2 }).etat).toBe('incomplet');
  });

  it('sans objectif retenu : les series de travail de la liste', () => {
    expect(etatExo({ sets: [s(true), s(true)] }).etat).toBe('valide');
    expect(etatExo({ sets: [s(true), s(false)] }).manquantes).toBe(1);
  });
});

describe('exercice avec des series manquantes', () => {
  it('une serie sautee : 1 série manquante, et c est la deuxieme', () => {
    const e = etatExo({ sets: [s(true), s(false), s(true)], objectifSeries: 3 });
    expect(e).toEqual({ etat: 'incomplet', faites: 2, total: 3, manquantes: 1, indexManquants: [1] });
    expect(texteManquantes(e.manquantes)).toBe('1 série manquante');
  });

  it('laisse apres une serie sur trois : 2 séries manquantes', () => {
    const e = etatExo({ sets: [s(true), s(false), s(false)], objectifSeries: 3 });
    expect(e.manquantes).toBe(2);
    expect(e.indexManquants).toEqual([1, 2]);
    expect(texteManquantes(2)).toBe('2 séries manquantes');
  });

  it('serie supprimee sous l objectif : toutes les lignes sont faites mais il en manque une', () => {
    const e = etatExo({ sets: [s(true), s(true)], objectifSeries: 3 });
    expect(e.etat).toBe('incomplet');
    expect(e.manquantes).toBe(1);
    expect(e.indexManquants).toEqual([]);
  });

  it('une serie vide prevue compte comme manquante tant que l objectif n est pas atteint', () => {
    expect(etatExo({ sets: [s(true), s(true), s(false, 0)], objectifSeries: 3 }).indexManquants).toEqual([2]);
  });

  it('plus de lignes prevues que l objectif : seules celles qui manquent pour l objectif sont reperees', () => {
    const e = etatExo({ sets: [s(true), s(false), s(false), s(false)], objectifSeries: 2 });
    expect(e.manquantes).toBe(1);
    expect(e.indexManquants).toEqual([1]);
  });
});

describe('exercice pas commence', () => {
  it('rien de fait : ni validé, ni avertissement', () => {
    expect(etatExo({ sets: [s(false), s(false)], objectifSeries: 2 }).etat).toBe('a_faire');
    expect(etatExo({ sets: [] }).etat).toBe('a_faire');
  });
});
