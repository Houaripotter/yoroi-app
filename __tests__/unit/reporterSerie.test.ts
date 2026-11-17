/**
 * 17 novembre 2026, retour de Houari : « a la poulie je note 20 a la premiere serie, et a la deuxieme ca me met
 * direct 40 ». La serie suivante reprend la serie validee, telle quelle (lib/v2/seances/seriesSaisie.ts).
 */
import { reporterSerie } from '../../lib/v2/seances/seriesSaisie';
import { appliquerActionsIle } from '../../lib/v2/seance/actionsIle';
import type { MuscuDraft } from '../../lib/v2/seance/model';

type S = { id: string; weight: number; reps: number; done: boolean; prevWeight?: number; prevReps?: number; type?: 'normal' | 'warmup' | 'dropset' | 'superset'; plaques?: number };

describe('reporterSerie', () => {
  it('son cas : serie 1 a 20 kg x 12, la serie 2 est pre-remplie a 20 kg x 12, pas 40', () => {
    // la derniere fois : 40 kg x 8 en serie 2 (pre-remplissage du lancement)
    const sets: S[] = [
      { id: 'a', weight: 20, reps: 12, done: true, prevWeight: 20, prevReps: 12 },
      { id: 'b', weight: 40, reps: 8, done: false, prevWeight: 40, prevReps: 8 },
      { id: 'c', weight: 40, reps: 8, done: false, prevWeight: 40, prevReps: 8 },
    ];
    const out = reporterSerie(sets, 0);
    expect(out[1]).toMatchObject({ weight: 20, reps: 12, done: false });
    expect(out[2]).toMatchObject({ weight: 20, reps: 12, done: false });
    // l'aide « la derniere fois » reste
    expect(out[1].prevWeight).toBe(40);
    expect(out[1].prevReps).toBe(8);
  });

  it('jamais d addition ni de doublement, sans derniere fois non plus', () => {
    const sets: S[] = [
      { id: 'a', weight: 20, reps: 12, done: true },
      { id: 'b', weight: 20, reps: 12, done: false },
    ];
    expect(reporterSerie(sets, 0)[1]).toMatchObject({ weight: 20, reps: 12 });
    expect(reporterSerie(reporterSerie(sets, 0), 0)[1]).toMatchObject({ weight: 20, reps: 12 });
  });

  it('les series deja faites ne bougent pas, et la recopie s arrete a la premiere faite', () => {
    const sets: S[] = [
      { id: 'a', weight: 30, reps: 10, done: true },
      { id: 'b', weight: 25, reps: 10, done: false },
      { id: 'c', weight: 50, reps: 5, done: true },
      { id: 'd', weight: 50, reps: 5, done: false },
    ];
    const out = reporterSerie(sets, 0);
    expect(out[1]).toMatchObject({ weight: 30, reps: 10 });
    expect(out[2]).toMatchObject({ weight: 50, reps: 5, done: true });
    expect(out[3]).toMatchObject({ weight: 50, reps: 5 });
  });

  it('echauffement ou drop set : pas de recopie', () => {
    const chauffe: S[] = [
      { id: 'a', weight: 10, reps: 15, done: true, type: 'warmup' },
      { id: 'b', weight: 40, reps: 8, done: false },
    ];
    expect(reporterSerie(chauffe, 0)[1]).toMatchObject({ weight: 40, reps: 8 });
    const drop: S[] = [
      { id: 'a', weight: 40, reps: 8, done: true },
      { id: 'b', weight: 32.5, reps: 8, done: false, type: 'dropset' },
      { id: 'c', weight: 40, reps: 8, done: false },
    ];
    const out = reporterSerie(drop, 0);
    expect(out[1]).toMatchObject({ weight: 32.5, type: 'dropset' });
    expect(out[2]).toMatchObject({ weight: 40, reps: 8 });
  });

  it('en plaques : les plaques suivent', () => {
    const sets: S[] = [
      { id: 'a', weight: 0, reps: 12, done: true, plaques: 6 },
      { id: 'b', weight: 0, reps: 10, done: false, plaques: 8 },
    ];
    expect(reporterSerie(sets, 0)[1]).toMatchObject({ plaques: 6, reps: 12 });
  });

  it('index hors liste : rien ne change', () => {
    const sets: S[] = [{ id: 'a', weight: 20, reps: 12, done: false }];
    expect(reporterSerie(sets, 3)).toEqual(sets);
  });
});

describe('Dynamic Island : meme regle', () => {
  it('serie faite depuis l ile a 20 kg x 12 : la suivante passe a 20 kg x 12', () => {
    const d = {
      kind: 'muscu', sport: 'musculation', startedAt: 1, notes: '', restSec: 90, restEndsAt: null, restTotal: 0, currentId: 'e1',
      exercises: [{ id: 'e1', name: 'Tirage Poulie', sets: [
        { id: 'a', weight: 20, reps: 12, done: false, prevWeight: 20, prevReps: 12 },
        { id: 'b', weight: 40, reps: 8, done: false, prevWeight: 40, prevReps: 8 },
      ] }],
    } as unknown as MuscuDraft;
    const r = appliquerActionsIle(d, [{ id: 'x1', type: 'serie', exo: 'e1', at: 1000 }] as never);
    expect(r.exercises[0].sets[1]).toMatchObject({ weight: 20, reps: 12, done: false });
  });
});
