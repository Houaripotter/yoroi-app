/**
 * 3 novembre 2026 (demande de Houari) : la charge en plaques de la pile, sur les machines sans poids ecrit
 * (lib/v2/seances/plaquesSerie.ts, lib/v2/seances/plaques.ts).
 * Les plaques ne comptent jamais comme des kilos, les records en plaques se comparent en plaques, et le choix
 * kilos ou plaques est garde par exercice (et part vers tes autres appareils).
 */
const mockTels: Record<string, Record<string, string>> = { A: {}, B: {} };
let mockIci = 'A';
jest.mock('@react-native-async-storage/async-storage', () => {
  const m = () => mockTels[mockIci];
  return {
    __esModule: true,
    default: {
      getItem: jest.fn((k: string) => Promise.resolve(k in m() ? m()[k] : null)),
      setItem: jest.fn((k: string, v: string) => { m()[k] = v; return Promise.resolve(); }),
      removeItem: jest.fn((k: string) => { delete m()[k]; return Promise.resolve(); }),
      multiRemove: jest.fn((ks: string[]) => { for (const k of ks) delete m()[k]; return Promise.resolve(); }),
      getAllKeys: jest.fn(() => Promise.resolve(Object.keys(m()))),
    },
  };
});
jest.mock('@/lib/database', () => ({ openDatabase: jest.fn(async () => ({ getAllAsync: jest.fn(async () => []) })) }));
jest.mock('@/lib/multipeerBridge', () => ({ __esModule: true, default: { isAvailable: false } }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => null), setItemAsync: jest.fn(async () => undefined), deleteItemAsync: jest.fn(async () => undefined) }));
jest.mock('expo-crypto', () => ({ getRandomBytes: jest.fn((n: number) => new Uint8Array(n)) }));

import type { Training } from '@/lib/database';
import { tonnage, setsCount } from '@/lib/v2/trainingWeek';
import { computeRecords } from '@/lib/v2/seances/records';
import { indexReperes, recordPlaquesBattuEnSeance, reperesDe } from '@/lib/v2/seances/reperesExo';
import { buildExerciseHistory, setLabel } from '@/lib/v2/seance/history';
import {
  avecChoix, chargerUnites, choixDe, enregistrerUnite, exerciceEnPlaques, kgDePlaques, maxPlaques, modeOuverture,
  recordPlaquesBattu, serieEnMode, CLE_UNITE_CHARGE,
} from '@/lib/v2/seances/plaques';

/* eslint-disable @typescript-eslint/no-require-imports */
const elements = require('@/lib/v2/synchro/elements') as typeof import('@/lib/v2/synchro/elements');
/* eslint-enable @typescript-eslint/no-require-imports */

const PEC = 'Pec deck';
type S = { weight: number; reps: number; plaques?: number; type?: 'warmup' };
const seance = (id: number, date: string, exos: { name: string; sets: S[]; unite_charge?: 'plaques'; kg_par_plaque?: number }[]): Training =>
  ({ id, sport: 'musculation', date, start_time: '18:00', exercises: exos.map((e) => ({ name: e.name, sets: e.sets.length, reps: 0, weight: 0, setsData: e.sets, ...(e.unite_charge ? { unite_charge: e.unite_charge } : {}), ...(e.kg_par_plaque ? { kg_par_plaque: e.kg_par_plaque } : {}) })) } as unknown as Training);

beforeEach(() => {
  mockTels.A = {};
  mockTels.B = {};
  mockIci = 'A';
});

describe('les plaques ne sont jamais des kilos', () => {
  const t = seance(1, '2026-11-02', [
    { name: 'Développé couché', sets: [{ weight: 60, reps: 8 }, { weight: 60, reps: 8 }] },
    { name: PEC, unite_charge: 'plaques', sets: [{ weight: 0, reps: 10, plaques: 7 }, { weight: 0, reps: 10, plaques: 9 }] },
  ]);

  it('le tonnage (kilos soulevés) ignore les series en plaques', () => {
    expect(tonnage(t)).toBe(60 * 8 * 2);
    // les series comptent quand meme comme des series
    expect(setsCount(t)).toBe(4);
  });

  it('aucun record en kilos ni au poids du corps pour un exercice en plaques', () => {
    const lignes = computeRecords([t]).lines.filter((l) => l.key.endsWith(PEC.toLowerCase()));
    expect(lignes).toEqual([]);
  });

  it('jamais de conversion inventee : sans poids de plaque, 0 kg', () => {
    expect(kgDePlaques(7, null)).toBe(0);
    expect(kgDePlaques(7, undefined)).toBe(0);
    expect(kgDePlaques(7, 5)).toBe(35);
  });

  it('avec « 1 plaque = 5 kg » donne par toi, les series comptent en kilos', () => {
    const conv = seance(2, '2026-11-03', [{ name: PEC, unite_charge: 'plaques', kg_par_plaque: 5, sets: [{ weight: kgDePlaques(8, 5), reps: 10, plaques: 8 }] }]);
    expect(tonnage(conv)).toBe(400);
  });

  it('l affichage dit « 7 plaques × 10 », pas des kilos', () => {
    expect(setLabel({ weight: 0, reps: 10, plaques: 7 })).toBe('7 plaques × 10');
    expect(setLabel({ weight: 35, reps: 10, plaques: 7 })).toBe('7 plaques × 10');
    expect(setLabel({ weight: 0, reps: 10, plaques: 1 })).toBe('1 plaque × 10');
    expect(setLabel({ weight: 60, reps: 8 })).toBe('60 kg × 8');
  });

  it('l historique garde les plaques de la derniere fois', () => {
    const h = buildExerciseHistory([t]).map.get(PEC);
    expect(h?.lastSets).toEqual([{ weight: 0, reps: 10, plaques: 7 }, { weight: 0, reps: 10, plaques: 9 }]);
    expect(exerciceEnPlaques(t.exercises![1])).toBe(true);
    expect(exerciceEnPlaques(t.exercises![0])).toBe(false);
  });
});

describe('les records en plaques comparent des plaques', () => {
  const trainings = [
    seance(1, '2026-10-27', [{ name: PEC, unite_charge: 'plaques', sets: [{ weight: 0, reps: 8, plaques: 9 }, { weight: 0, reps: 10, plaques: 8 }] }]),
    seance(2, '2026-11-02', [{ name: PEC, unite_charge: 'plaques', sets: [{ weight: 0, reps: 12, plaques: 12, type: 'warmup' }, { weight: 0, reps: 10, plaques: 7 }] }]),
  ];
  const r = reperesDe(indexReperes(trainings), PEC);

  it('Record : 9 plaques (echauffement exclu), Dernière fois : 7 plaques', () => {
    expect(r.recordPlaques).toEqual({ plaques: 9, reps: 8 });
    expect(r.dernierePlaques).toEqual({ date: '2026-11-02', max: { plaques: 7, reps: 10 } });
    // pas de faux record ni de « dernière fois » en kilos
    expect(r.record).toBeNull();
    expect(r.derniere).toBeNull();
  });

  it('une seance en plaques n efface pas la derniere fois en kilos', () => {
    const mixte = [seance(1, '2026-10-20', [{ name: PEC, sets: [{ weight: 45, reps: 10 }] }]), ...trainings];
    const m = reperesDe(indexReperes(mixte), PEC);
    expect(m.derniere).toEqual({ date: '2026-10-20', max: { weight: 45, reps: 10 } });
    expect(m.record).toEqual({ weight: 45, reps: 10 });
    expect(m.recordPlaques).toEqual({ plaques: 9, reps: 8 });
  });

  it('battre le record : plus de plaques, ou autant avec plus de repetitions', () => {
    const rec = { plaques: 9, reps: 8 };
    expect(recordPlaquesBattu(rec, [], { plaques: 10, reps: 5 })).toBe(true);
    expect(recordPlaquesBattu(rec, [], { plaques: 9, reps: 9 })).toBe(true);
    expect(recordPlaquesBattu(rec, [], { plaques: 9, reps: 8 })).toBe(false);
    expect(recordPlaquesBattu(rec, [], { plaques: 8, reps: 20 })).toBe(false);
    // une serie deja faite aujourd'hui a 10 plaques : 10 plaques x 5 ne bat plus rien
    expect(recordPlaquesBattu(rec, [{ plaques: 10, reps: 6 }], { plaques: 10, reps: 5 })).toBe(false);
    // premiere fois en plaques : pas de record
    expect(recordPlaquesBattu(null, [], { plaques: 10, reps: 5 })).toBe(false);
    // une serie en kilos ne compte pas comme des plaques
    expect(recordPlaquesBattu(rec, [], { weight: 100, reps: 5 })).toBe(false);
  });

  it('en seance : seules les series faites hors echauffement battent le record', () => {
    expect(recordPlaquesBattuEnSeance({ plaques: 9, reps: 8 }, [{ plaques: 11, reps: 5, done: false }, { plaques: 11, reps: 5, done: true, type: 'warmup' }])).toBe(false);
    expect(recordPlaquesBattuEnSeance({ plaques: 9, reps: 8 }, [{ plaques: 10, reps: 5, done: true }])).toBe(true);
  });

  it('maxPlaques ignore les series en kilos', () => {
    expect(maxPlaques([{ weight: 80, reps: 5 }, { plaques: 6, reps: 12 }, { plaques: 6, reps: 10 }])).toEqual({ plaques: 6, reps: 12 });
    expect(maxPlaques([{ weight: 80, reps: 5 }])).toBeNull();
  });
});

describe('le choix kilos ou plaques est garde par exercice', () => {
  it('passer en plaques une fois : la machine s ouvre en plaques la fois suivante', async () => {
    await enregistrerUnite('Pec deck (prise neutre)', { kgParPlaque: null });
    const u = await chargerUnites();
    expect(choixDe(u, 'Pec deck')).toEqual({ u: 'plaques' });
    expect(modeOuverture(u, 'Pec deck', false)).toEqual({ kgParPlaque: null });
    // un autre exercice reste en kilos
    expect(modeOuverture(u, 'Développé couché', false)).toBeNull();
  });

  it('le poids d une plaque est garde avec le choix', async () => {
    await enregistrerUnite(PEC, { kgParPlaque: 5 });
    expect(modeOuverture(await chargerUnites(), PEC, false)).toEqual({ kgParPlaque: 5 });
  });

  it('revenir aux kilos est garde aussi (choix explicite), meme si la derniere fois etait en plaques', async () => {
    await enregistrerUnite(PEC, { kgParPlaque: null });
    await enregistrerUnite(PEC, null);
    const u = await chargerUnites();
    expect(choixDe(u, PEC)).toEqual({ u: 'kg' });
    expect(modeOuverture(u, PEC, true)).toBeNull();
  });

  it('sans choix garde : en plaques si ta derniere fois l etait', () => {
    expect(modeOuverture({}, PEC, true)).toEqual({ kgParPlaque: null });
    expect(modeOuverture({}, PEC, false)).toBeNull();
  });

  it('une valeur abimee est ignoree', async () => {
    mockTels.A[CLE_UNITE_CHARGE] = '{pas du json';
    expect(await chargerUnites()).toEqual({});
    expect(avecChoix({ x: { u: 'kg' } }, PEC, { kgParPlaque: 999 })).toEqual({ x: { u: 'kg' }, [PEC.toLowerCase()]: { u: 'plaques' } });
  });

  it('les series a faire passent en plaques, et reviennent en kilos sans conversion inventee', () => {
    const s = { weight: 45, reps: 10, prevWeight: 45 };
    const p = serieEnMode(s, { kgParPlaque: null });
    expect(p).toEqual({ weight: 0, reps: 10, prevWeight: 45, plaques: 0 });
    expect(serieEnMode({ ...p, plaques: 7 }, null)).toEqual({ weight: 45, reps: 10, prevWeight: 45 });
    expect(serieEnMode({ weight: 0, reps: 10, prevPlaques: 7, prevWeight: 0 }, { kgParPlaque: 5 })).toEqual({ weight: 35, reps: 10, prevPlaques: 7, prevWeight: 0, plaques: 7 });
  });
});

describe('synchro : le choix par exercice passe entre tes appareils', () => {
  const T0 = Date.UTC(2026, 10, 3, 10, 0, 0);
  const sur = (t: string) => {
    mockIci = t;
    elements.__test__.oublierHorloge();
    jest.spyOn(Date, 'now').mockImplementation(() => T0);
  };
  afterEach(() => jest.restoreAllMocks());

  it('plaques sur l iPhone, kilos d un autre exercice sur l iPad : les deux arrivent partout', async () => {
    sur('A'); mockTels.A[CLE_UNITE_CHARGE] = JSON.stringify({ 'pec deck': { u: 'plaques', kg: 5 } });
    sur('B'); mockTels.B[CLE_UNITE_CHARGE] = JSON.stringify({ 'leg extension': { u: 'plaques' } });
    for (const [de, vers] of [['A', 'B'], ['B', 'A']]) {
      sur(de);
      const c = await elements.collecter(0, vers);
      sur(vers);
      await elements.appliquer(JSON.parse(JSON.stringify(c.etats)), de);
    }
    for (const t of ['A', 'B']) {
      expect(JSON.parse(mockTels[t][CLE_UNITE_CHARGE])).toEqual({ 'pec deck': { u: 'plaques', kg: 5 }, 'leg extension': { u: 'plaques' } });
    }
  });
});
