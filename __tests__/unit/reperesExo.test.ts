/**
 * 2 novembre 2026 : reperes en haut de l'exercice en seance en direct (lib/v2/seances/reperesExo.ts).
 * Record de tous les temps (identique a la carte de record), max de la derniere fois, cran de la machine.
 */
import type { Training } from '@/lib/database';
import { computeRecords } from '@/lib/v2/seances/records';
import { cranAffiche, cranAvant, indexReperes, libelleCharge, recordBattu, reperesDe, serieDerniereFois, serieMax } from '@/lib/v2/seances/reperesExo';

const BIBLIO = 'Chest Press (Machine)';
const FR = 'Développé assis machine (chest press)';

type S = { weight: number; reps: number; type?: 'normal' | 'warmup' };
const seance = (id: number, date: string, exos: { name: string; sets: S[] }[], start_time = '18:00'): Training =>
  ({ id, sport: 'musculation', date, start_time, exercises: exos.map((e) => ({ name: e.name, setsData: e.sets })) } as unknown as Training);

describe('serieMax', () => {
  it('prend la charge la plus lourde, puis le plus de repetitions', () => {
    expect(serieMax([{ weight: 60, reps: 6 }, { weight: 60, reps: 8 }, { weight: 50, reps: 12 }])).toEqual({ weight: 60, reps: 8 });
  });
  it('au poids du corps, le plus de repetitions', () => {
    expect(serieMax([{ weight: 0, reps: 10 }, { weight: 0, reps: 14 }])).toEqual({ weight: 0, reps: 14 });
  });
  it('rien a montrer : null', () => {
    expect(serieMax([])).toBeNull();
    expect(serieMax([{ weight: 80, reps: 0 }])).toBeNull();
  });
});

describe('indexReperes', () => {
  const trainings = [
    seance(1, '2026-10-20', [{ name: BIBLIO, sets: [{ weight: 81, reps: 5 }, { weight: 70, reps: 8 }] }]),
    // derniere fois : echauffement lourd ecrit en premier, il ne compte ni pour le max ni pour le record
    seance(2, '2026-10-30', [{ name: FR, sets: [{ weight: 90, reps: 1, type: 'warmup' }, { weight: 30, reps: 10, type: 'warmup' }, { weight: 60, reps: 8 }, { weight: 60, reps: 7 }] }]),
  ];
  const index = indexReperes(trainings);

  it('le record est celui de la carte de record, echauffement exclu', () => {
    const r = reperesDe(index, BIBLIO);
    expect(r.record).toEqual({ weight: 81, reps: 5 });
    const carte = computeRecords(trainings).lines.find((l) => l.kind === 'force');
    expect(carte?.maxLoad?.weight).toBe(r.record?.weight);
  });

  it('le max de la derniere fois exclut l echauffement', () => {
    expect(reperesDe(index, BIBLIO).derniere).toEqual({ date: '2026-10-30', max: { weight: 60, reps: 8 } });
  });

  it('nom francais et nom de bibliotheque donnent les memes reperes', () => {
    expect(reperesDe(index, FR)).toEqual(reperesDe(index, BIBLIO));
    expect(reperesDe(index, FR.toUpperCase()).record).toEqual({ weight: 81, reps: 5 });
  });

  it('sans historique : ni record ni derniere fois', () => {
    expect(reperesDe(index, 'Curl marteau')).toEqual({ record: null, derniere: null });
    expect(reperesDe(indexReperes([]), BIBLIO)).toEqual({ record: null, derniere: null });
  });

  it('une seance faite uniquement d echauffement ne devient pas la derniere fois', () => {
    const t = [...trainings, seance(3, '2026-11-01', [{ name: BIBLIO, sets: [{ weight: 40, reps: 10, type: 'warmup' }] }])];
    expect(reperesDe(indexReperes(t), BIBLIO).derniere?.date).toBe('2026-10-30');
  });

  it('au poids du corps : record en repetitions', () => {
    const t = [seance(4, '2026-10-01', [{ name: 'Tractions', sets: [{ weight: 0, reps: 9 }, { weight: 0, reps: 12 }] }])];
    const r = reperesDe(indexReperes(t), 'Tractions');
    expect(r.record).toEqual({ weight: 0, reps: 12 });
    expect(r.derniere?.max).toEqual({ weight: 0, reps: 12 });
  });

  it('les seances sont lues dans l ordre, meme donnees en vrac', () => {
    const r = reperesDe(indexReperes([...trainings].reverse()), BIBLIO);
    expect(r.derniere?.date).toBe('2026-10-30');
  });
});

describe('cran', () => {
  it('retrouve le cran sous l autre nom du meme exercice', () => {
    expect(cranAvant({ [FR.toLowerCase()]: 17 }, BIBLIO)).toBe(17);
    expect(cranAvant({ [BIBLIO.toLowerCase()]: 12 }, FR)).toBe(12);
    expect(cranAvant({}, BIBLIO)).toBeNull();
  });
  it('le cran de la seance prime, rien quand il n y en a pas', () => {
    expect(cranAffiche(undefined, 17)).toBe(17);
    expect(cranAffiche(19, 17)).toBe(19);
    expect(cranAffiche(null, 17)).toBeNull();
    expect(cranAffiche(undefined, null)).toBeNull();
    expect(cranAffiche(0, 17)).toBeNull();
  });
});

describe('recordBattu', () => {
  const rec = { weight: 81, reps: 5 };
  it('une serie faite plus lourde bat le record', () => {
    expect(recordBattu(rec, [{ weight: 82.5, reps: 3, done: true }])).toBe(true);
  });
  it('ni l echauffement, ni une serie pas faite, ni la meme charge', () => {
    expect(recordBattu(rec, [{ weight: 90, reps: 3, done: true, type: 'warmup' }])).toBe(false);
    expect(recordBattu(rec, [{ weight: 90, reps: 3, done: false }])).toBe(false);
    expect(recordBattu(rec, [{ weight: 81, reps: 6, done: true }])).toBe(false);
  });
  it('sans record (premiere fois) : jamais de nouveau record', () => {
    expect(recordBattu(null, [{ weight: 100, reps: 5, done: true }])).toBe(false);
  });
  it('au poids du corps : plus de repetitions sans charge', () => {
    expect(recordBattu({ weight: 0, reps: 12 }, [{ weight: 0, reps: 13, done: true }])).toBe(true);
    expect(recordBattu({ weight: 0, reps: 12 }, [{ weight: 0, reps: 12, done: true }])).toBe(false);
  });
});

describe('serieDerniereFois', () => {
  const h = { lastSets: [{ weight: 30, reps: 1 }, { weight: 60, reps: 8 }, { weight: 60, reps: 7 }], travail: [{ weight: 60, reps: 8 }, { weight: 60, reps: 7 }] };
  it('la serie 1 de la derniere fois n est plus l echauffement', () => {
    expect(serieDerniereFois(h, 0)).toEqual({ weight: 60, reps: 8 });
    expect(serieDerniereFois(h, 5)).toEqual({ weight: 60, reps: 7 });
  });
  it('meme repli qu avant sans series de travail', () => {
    expect(serieDerniereFois({ lastSets: h.lastSets }, 0)).toEqual({ weight: 30, reps: 1 });
    expect(serieDerniereFois({ lastSets: h.lastSets, travail: [] }, 9)).toEqual({ weight: 60, reps: 7 });
    expect(serieDerniereFois(undefined, 0)).toBeUndefined();
  });
});

describe('libelleCharge', () => {
  it('kilos et livres', () => {
    expect(libelleCharge(81, 'kg')).toBe('81 kg');
    expect(libelleCharge(72.5, 'kg')).toMatch(/^72[,.]5 kg$/);
    expect(libelleCharge(100, 'lb')).toMatch(/ lb$/);
  });
});
