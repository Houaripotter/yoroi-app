/**
 * Cartes a partager, donnees en plus (2 novembre 2026) : chargerSeance et chargerSemaine remplissent les champs
 * seulement quand la donnee existe.
 */
const seances: Record<number, unknown> = {};
jest.mock('@/lib/database', () => ({
  getTrainingById: jest.fn(async (id: number) => seances[id] ?? null),
  getTrainings: jest.fn(async () => Object.values(seances)),
  getClubs: jest.fn(async () => []),
  getProfile: jest.fn(async () => null),
  getWeights: jest.fn(async () => []),
  getLatestHealthData: jest.fn(async () => null),
}));
const mockMemoire = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockMemoire.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void mockMemoire.set(k, v)),
    removeItem: jest.fn(async (k: string) => void mockMemoire.delete(k)),
    clear: jest.fn(async () => mockMemoire.clear()),
    multiGet: jest.fn(async (ks: string[]) => ks.map((k) => [k, mockMemoire.get(k) ?? null])),
  },
}));
jest.mock('@/lib/v2/armure', () => ({
  getArmureState: jest.fn(async () => ({ weekStreak: 2, bestStreak: 6, serie: { jours: 3, record: 12, aSauver: false, semaine: [] } })),
}));
jest.mock('@/lib/v2/seance/save', () => ({ getSeanceResult: jest.fn(async () => null) }));
jest.mock('@/lib/v2/espace', () => ({ getEspace: jest.fn(async () => null), objectifVise: () => 0 }));
jest.mock('@/lib/v2/bilan/charger', () => ({ carteBilan: jest.fn(async () => null) }));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { chargerSeance, chargerSemaine } from '@/lib/v2/cartes/charger';

beforeEach(async () => {
  await AsyncStorage.clear();
  for (const k of Object.keys(seances)) delete seances[Number(k)];
});

test('seance de muscu avec cardio : vitesse, zone 2, muscles, ceinture, serie ; GPS d une saisie retire', async () => {
  await AsyncStorage.setItem('@yoroi_pratiques', JSON.stringify({ v: 1, pratiques: [{ id: 'p1', sport: 'jjb', ceinture: 'violette', degres: 1, principale: true }], ignores: [] }));
  seances[1] = {
    id: 1, sport: 'musculation', date: '2026-10-30', source: 'manual',
    workout_details_json: JSON.stringify({ elevationAscended: 50 }),
    exercises: [
      { name: 'Développé couché', muscle_group: 'pectoraux', setsData: [{ weight: 80, reps: 8 }, { weight: 80, reps: 8 }] },
      { name: 'Marche inclinée', distance: 2.7, cardio: { type: 'marche_inclinee', penteMoy: 10, vitesseMoy: 5.5, fcMoy: 125, zone2: { min: 117, max: 131 } } },
    ],
  };
  const c = (await chargerSeance(1))!;
  expect(c.seance!.vitesseCardio).toBe(5.5);
  expect(c.seance!.enZone2).toBe(true);
  expect(c.seance!.muscles!.groupes).toEqual([{ nom: 'Pectoraux', series: 2 }]);
  expect(c.seance!.deniveleM).toBe(0);
  expect(c.ceintureJjb).toEqual({ ceinture: 'violette', degres: 1 });
  expect(c.serie).toEqual({ jours: 3, recordJours: 12, recordSemaines: 6 });
});

test('seance sans cardio, sans ceinture : champs absents', async () => {
  seances[2] = { id: 2, sport: 'jjb', date: '2026-10-30', source: 'manual', calories: 800 };
  const c = (await chargerSeance(2))!;
  expect(c.seance!.vitesseCardio).toBeUndefined();
  expect(c.seance!.enZone2).toBeUndefined();
  expect(c.seance!.muscles).toBeUndefined();
  expect(c.ceintureJjb).toBeUndefined();
  expect(c.seance!.calories).toBe(0);
});

test('seance importee de Sante : denivele garde', async () => {
  seances[3] = { id: 3, sport: 'running', date: '2026-10-30', healthkit_uuid: 'X', source: 'apple_health', calories: 600, workout_details_json: JSON.stringify({ elevationAscended: 50 }) };
  const c = (await chargerSeance(3))!;
  expect(c.seance!.deniveleM).toBe(50);
  // kcal coupees sur les cartes, meme importees de Sante
  expect(c.seance!.calories).toBe(0);
});

test('semaine : kilos souleves, absents sans charge', async () => {
  seances[4] = { id: 4, sport: 'musculation', date: '2026-10-27', exercises: [{ name: 'Squat', setsData: [{ weight: 100, reps: 5 }] }] };
  seances[5] = { id: 5, sport: 'jjb', date: '2026-11-03' };
  expect((await chargerSemaine('2026-10-27'))!.semaine!.kilos).toBe(500);
  expect((await chargerSemaine('2026-11-02'))!.semaine!.kilos).toBeUndefined();
});
