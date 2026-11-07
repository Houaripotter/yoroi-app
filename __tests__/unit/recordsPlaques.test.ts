/**
 * 7 novembre 2026 (demande de Houari) : les records en plaques de la pile apparaissent dans Records, Progres et
 * le detail de seance (lib/v2/seances/records.ts). « 9 plaques », compares en plaques, jamais ranges avec les kilos.
 */
import type { Training } from '@/lib/database';
import { computeRecords, formatRecordPlaques, plaquesMieux, recordsOfTraining, recordsPlaquesOfTraining } from '@/lib/v2/seances/records';
import { indexReperes, reperesDe } from '@/lib/v2/seances/reperesExo';

const PEC = 'Pec deck';
type S = { weight: number; reps: number; plaques?: number; type?: 'warmup' };
const seance = (id: number, date: string, exos: { name: string; sets: S[]; unite_charge?: 'plaques'; kg_par_plaque?: number }[]): Training =>
  ({ id, sport: 'musculation', date, start_time: '18:00', exercises: exos.map((e) => ({ name: e.name, sets: e.sets.length, reps: 0, weight: 0, setsData: e.sets, ...(e.unite_charge ? { unite_charge: e.unite_charge } : {}), ...(e.kg_par_plaque ? { kg_par_plaque: e.kg_par_plaque } : {}) })) } as unknown as Training);
const pl = (plaques: number, reps: number, type?: 'warmup'): S => ({ weight: 0, reps, plaques, ...(type ? { type } : {}) });

describe('un record en plaques se lit en plaques', () => {
  const trainings = [
    seance(1, '2026-10-20', [{ name: PEC, unite_charge: 'plaques', sets: [pl(7, 10), pl(8, 8)] }]),
    seance(2, '2026-10-27', [{ name: PEC, unite_charge: 'plaques', sets: [pl(12, 12, 'warmup'), pl(9, 8)] }]),
    seance(3, '2026-11-02', [{ name: PEC, unite_charge: 'plaques', sets: [pl(9, 6), pl(8, 12)] }]),
  ];
  const res = computeRecords(trainings);

  it('« 9 plaques » : echauffement exclu, la serie la plus lourde en plaques', () => {
    expect(res.plaques).toHaveLength(1);
    const l = res.plaques[0];
    expect(l.key).toBe('plaques:pec deck');
    expect(l.best).toEqual({ plaques: 9, reps: 8 });
    expect(l.date).toBe('2026-10-27');
    expect(l.trainingId).toBe(2);
    expect(formatRecordPlaques(l.best)).toEqual({ main: '9 plaques', sub: 'pour 8 répétitions' });
  });

  it('la premiere fois sert de depart, sans tampon ; une seance moins bonne ne tamponne pas', () => {
    const l = res.plaques[0];
    expect(l.history.map((p) => p.isRecord)).toEqual([false, true, false]);
    expect(l.stamps).toBe(1);
    expect(res.recentPlaques.map((r) => r.point.trainingId)).toEqual([2]);
  });

  it('le tampon du detail de seance : seulement la seance qui a battu le record', () => {
    expect(recordsPlaquesOfTraining(res, 2).map((r) => formatRecordPlaques(r.point).main)).toEqual(['9 plaques']);
    expect(recordsPlaquesOfTraining(res, 1)).toEqual([]);
    expect(recordsPlaquesOfTraining(res, 3)).toEqual([]);
    expect(recordsPlaquesOfTraining(res, undefined)).toEqual([]);
  });

  it('meme record que la pastille en seance (« Record : 9 plaques »)', () => {
    expect(reperesDe(indexReperes(trainings), PEC).recordPlaques).toEqual(res.plaques[0].best);
  });

  it('autant de plaques avec plus de repetitions bat le record ; moins de plaques jamais', () => {
    const plus = computeRecords([...trainings, seance(4, '2026-11-05', [{ name: PEC, unite_charge: 'plaques', sets: [pl(9, 9)] }])]);
    expect(plus.plaques[0].best).toEqual({ plaques: 9, reps: 9 });
    expect(recordsPlaquesOfTraining(plus, 4)).toHaveLength(1);
    const moins = computeRecords([...trainings, seance(4, '2026-11-05', [{ name: PEC, unite_charge: 'plaques', sets: [pl(8, 30)] }])]);
    expect(moins.plaques[0].best).toEqual({ plaques: 9, reps: 8 });
    expect(recordsPlaquesOfTraining(moins, 4)).toEqual([]);
    expect(plaquesMieux({ plaques: 10, reps: 1 }, { plaques: 9, reps: 20 })).toBe(true);
    expect(plaquesMieux({ plaques: 9, reps: 8 }, { plaques: 9, reps: 8 })).toBe(false);
  });

  it('1 plaque au singulier', () => {
    expect(formatRecordPlaques({ plaques: 1, reps: 1 })).toEqual({ main: '1 plaque', sub: 'pour 1 répétition' });
  });
});

describe('jamais melange au classement en kilos', () => {
  const trainings = [
    seance(1, '2026-10-20', [
      { name: 'Développé couché', sets: [{ weight: 60, reps: 8 }] },
      { name: PEC, unite_charge: 'plaques', sets: [pl(7, 10)] },
    ]),
    seance(2, '2026-10-27', [
      { name: 'Développé couché', sets: [{ weight: 62.5, reps: 8 }] },
      { name: PEC, unite_charge: 'plaques', sets: [pl(9, 10)] },
    ]),
  ];
  const res = computeRecords(trainings);

  it('les kilos gardent leurs lignes, leurs tampons et leur classement, sans plaques', () => {
    expect(res.lines.map((l) => l.key).filter((k) => k.includes('pec'))).toEqual([]);
    expect(res.highlights.every((l) => l.kind !== 'force' || !l.key.includes('pec'))).toBe(true);
    expect(res.recent.map((r) => r.line.key)).toEqual(['force:développé couché']);
    expect(res.totalStamps).toBe(1);
    expect(res.stampedTrainings.get(2)).toBe(1);
    expect(recordsOfTraining(res, 2).map((r) => r.line.kind)).toEqual(['force']);
    expect(recordsPlaquesOfTraining(res, 2).map((r) => r.line.key)).toEqual(['plaques:pec deck']);
  });

  it('un exercice en kilos n a pas de record en plaques', () => {
    expect(res.plaques.map((l) => l.key)).toEqual(['plaques:pec deck']);
  });

  it('avec « 1 plaque = 5 kg » donne : le record en plaques reste en plaques, les kilos restent a part', () => {
    const avecKg = computeRecords([
      seance(1, '2026-10-20', [{ name: PEC, unite_charge: 'plaques', kg_par_plaque: 5, sets: [{ weight: 35, reps: 10, plaques: 7 }] }]),
      seance(2, '2026-10-27', [{ name: PEC, unite_charge: 'plaques', kg_par_plaque: 5, sets: [{ weight: 45, reps: 10, plaques: 9 }] }]),
    ]);
    expect(avecKg.plaques[0].best).toEqual({ plaques: 9, reps: 10 });
    const force = avecKg.lines.find((l) => l.key === 'force:pec deck');
    expect(force?.maxLoad).toEqual({ weight: 45, reps: 10 });
  });

  it('un historique sans plaques donne des listes vides', () => {
    const r = computeRecords([seance(1, '2026-10-20', [{ name: 'Squat', sets: [{ weight: 100, reps: 5 }] }])]);
    expect(r.plaques).toEqual([]);
    expect(r.recentPlaques).toEqual([]);
  });
});
