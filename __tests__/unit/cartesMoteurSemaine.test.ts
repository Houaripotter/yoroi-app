/**
 * Cartes v10 (2 novembre 2026) : la semaine sait, pour chaque jour, ses minutes et son statut
 * (lib/v2/cartes/charger.ts, chargerSemaine). La somme des minutes fait le temps total, et un jour sans seance
 * est « repos » s'il est connu, « inconnu » s'il est futur ou avant le debut des donnees.
 */
jest.mock('@/lib/database', () => ({
  getTrainingById: jest.fn(async () => null),
  getTrainings: jest.fn(async () => []),
  getClubs: jest.fn(async () => []),
  getProfile: jest.fn(async () => null),
  getWeights: jest.fn(async () => []),
  getLatestHealthData: jest.fn(async () => null),
}));
jest.mock('@/lib/v2/armure', () => ({ getArmureState: jest.fn(async () => ({ weekStreak: 0 })) }));
jest.mock('@/lib/v2/seance/save', () => ({ getSeanceResult: jest.fn(async () => null) }));
jest.mock('@/lib/v2/espace', () => ({ getEspace: jest.fn(async () => null), objectifVise: () => 4 }));
jest.mock('@/lib/v2/bilan/charger', () => ({ carteBilan: jest.fn(async () => null) }));

import type { Training } from '@/lib/database';
import { chargerSemaine, statutDuJour } from '@/lib/v2/cartes/charger';
import { contenuDe } from '@/lib/v2/cartes/moteur/familles';

const ctx = { pesees: [] } as never;
const t = (id: number, date: string, duration_minutes: number | null, sport = 'musculation'): Training => ({ id, date, sport, duration_minutes } as unknown as Training);

test('semaine finie : la somme des minutes de chaque jour fait le temps total (395 min = 6h35)', async () => {
  const list = [t(1, '2026-10-26', 75), t(2, '2026-10-27', 52, 'running'), t(3, '2026-10-29', 72), t(4, '2026-10-30', 60, 'jjb'), t(5, '2026-10-30', 30, 'jjb'), t(6, '2026-10-31', 106)];
  const c = (await chargerSemaine('2026-10-26', { trainings: list, ctx, serie: 0, installation: '2026-01-01', aujourdhui: '2026-11-02' }))!;
  const w = c.semaine!;
  expect(w.minutes).toBe(395);
  expect(w.parJour!.map((j) => j.minutes)).toEqual([75, 52, 0, 72, 90, 106, 0]);
  expect(w.parJour!.reduce((a, j) => a + (j.minutes ?? 0), 0)).toBe(w.minutes);
  expect(w.parJour!.map((j) => j.statut)).toEqual(['seance', 'seance', 'repos', 'seance', 'seance', 'seance', 'repos']);
  // la carte du nouveau moteur affiche le meme total
  const contenu = contenuDe(c, 'semaine')!;
  expect(contenu.stats[0]).toMatchObject({ v: '6h35', l: 'Temps total' });
  expect(contenu.jours!.map((j) => j.statut)).toEqual(['seance', 'seance', 'repos', 'seance', 'seance', 'seance', 'repos']);
});

test('semaine vue le vendredi, app installee le mardi : lundi et le week-end inconnus, mercredi repos', async () => {
  const list = [t(1, '2026-10-27', 52, 'running'), t(2, '2026-10-29', 72), t(3, '2026-10-30T19:00:00', 90, 'jjb')];
  const c = (await chargerSemaine('2026-10-26', { trainings: list, ctx, serie: 0, installation: '2026-10-27', aujourdhui: '2026-10-30' }))!;
  const w = c.semaine!;
  expect(w.minutes).toBe(214);
  expect(w.parJour!.map((j) => j.minutes)).toEqual([0, 52, 0, 72, 90, 0, 0]);
  expect(w.parJour!.map((j) => j.statut)).toEqual(['inconnu', 'seance', 'repos', 'seance', 'seance', 'inconnu', 'inconnu']);
});

test('une seance sans duree compte en seance avec 0 min', async () => {
  const c = (await chargerSemaine('2026-10-26', { trainings: [t(1, '2026-10-28', null)], ctx, serie: 0, installation: '2026-01-01', aujourdhui: '2026-11-02' }))!;
  expect(c.semaine!.parJour![2]).toMatchObject({ minutes: 0, statut: 'seance' });
  expect(c.semaine!.minutes).toBe(0);
});

test('une seance importee d avant l installation rend ses jours connus', async () => {
  // installee le jeudi, mais une seance du lundi a ete importee : le debut des donnees est le lundi
  const c = (await chargerSemaine('2026-10-26', { trainings: [t(1, '2026-10-26', 40)], ctx, serie: 0, installation: '2026-10-29', aujourdhui: '2026-11-02' }))!;
  expect(c.semaine!.parJour!.map((j) => j.statut)).toEqual(['seance', 'repos', 'repos', 'repos', 'repos', 'repos', 'repos']);
});

test('sans date d installation connue : le debut est la premiere seance', () => {
  expect(statutDuJour('2026-10-25', false, '2026-11-02', '2026-10-26')).toBe('inconnu');
  expect(statutDuJour('2026-10-27', false, '2026-11-02', '2026-10-26')).toBe('repos');
  expect(statutDuJour('2026-11-03', false, '2026-11-02', '2026-10-26')).toBe('inconnu');
  expect(statutDuJour('2026-11-02', false, '2026-11-02', null)).toBe('repos');
  expect(statutDuJour('2026-11-02', true, '2026-11-02', null)).toBe('seance');
});
