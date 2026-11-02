/**
 * Cartes a partager, donnees en plus (2 novembre 2026) : ceinture de JJB, serie, zone 2, vitesse du tapis,
 * muscles travailles, kilos de la semaine, records de l'annee, GPS seulement d'un appareil.
 */
import type { Training } from '@/lib/database';
import { ceintureJjbDe, enZone2De, gpsSiAppareil, kilosDe, musclesDeSeance, serieDe, vientDUnAppareil } from '@/lib/v2/cartes/donneesEnPlus';
import { donneesPeriode, recordsAnnee } from '@/lib/v2/cartes/periode';
import { trier } from '@/lib/v2/cartes/exploits';
import { chiffresCardio } from '@/lib/v2/seances/exerciceEnregistre';
import type { Pratique } from '@/lib/v2/profil/pratiques';

const muscu = (id: number, date: string, exos: unknown[], extra: Partial<Training> = {}): Training =>
  ({ id, sport: 'musculation', date, exercises: exos as Training['exercises'], ...extra }) as Training;

describe('ceinture de JJB', () => {
  test('lue dans la pratique de JJB qui a une ceinture', () => {
    const p: Pratique[] = [
      { id: 'a', sport: 'musculation', ceinture: null, degres: 0, principale: true },
      { id: 'b', sport: 'jjb', ceinture: 'bleue', degres: 2, principale: false },
    ];
    expect(ceintureJjbDe(p)).toEqual({ ceinture: 'bleue', degres: 2 });
  });
  test('absente sans JJB ou sans ceinture', () => {
    expect(ceintureJjbDe([])).toBeNull();
    expect(ceintureJjbDe(null)).toBeNull();
    expect(ceintureJjbDe([{ id: 'b', sport: 'jjb', ceinture: null, degres: 0 }])).toBeNull();
    expect(ceintureJjbDe([{ id: 'j', sport: 'judo', ceinture: 'noire', degres: 2 }])).toBeNull();
  });
});

describe('serie', () => {
  test('jours en cours, record de jours, record de semaines', () => {
    expect(serieDe({ bestStreak: 9, serie: { jours: 4, record: 21 } })).toEqual({ jours: 4, recordJours: 21, recordSemaines: 9 });
  });
  test('chaque chiffre seulement s il est connu, rien invente', () => {
    expect(serieDe({})).toBeNull();
    expect(serieDe(null)).toBeNull();
    expect(serieDe({ bestStreak: 3 })).toEqual({ recordSemaines: 3 });
  });
});

describe('cardio : vitesse du tapis et zone 2', () => {
  const exo = (cardio: Record<string, unknown>, distance?: number) => ({ name: 'Marche inclinée', distance, cardio: { type: 'marche_inclinee', ...cardio } });
  test('vitesse moyenne transmise, zone 2 gardee avec la FC', () => {
    expect(chiffresCardio([exo({ penteMoy: 10, vitesseMoy: 5.5, fcMoy: 125, zone2: { min: 117, max: 131 } }, 2.7)])).toEqual({ distanceKm: 2.7, penteMoy: 10, vitesseMoy: 5.5, fcMoy: 125, zone2: { min: 117, max: 131 } });
  });
  test('sans vitesse enregistree : pas de vitesse', () => {
    expect(chiffresCardio([exo({ penteMoy: 10 })]).vitesseMoy).toBeUndefined();
  });
  test('enZone2 : vrai dedans, faux dehors, absent sans FC ou sans zone', () => {
    expect(enZone2De(125, { min: 117, max: 131 })).toBe(true);
    expect(enZone2De(140, { min: 117, max: 131 })).toBe(false);
    expect(enZone2De(undefined, { min: 117, max: 131 })).toBeUndefined();
    expect(enZone2De(125, null)).toBeUndefined();
    expect(enZone2De(0, { min: 117, max: 131 })).toBeUndefined();
  });
});

describe('muscles travailles', () => {
  test('series de travail par groupe, echauffements exclus', () => {
    const t = muscu(1, '2026-10-30', [
      { name: 'Développé couché', muscle_group: 'pectoraux', setsData: [{ weight: 40, reps: 10, type: 'warmup' }, { weight: 80, reps: 8 }, { weight: 80, reps: 8 }, { weight: 80, reps: 6 }] },
      { name: 'Squat', muscle_group: 'jambes', setsData: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] },
    ]);
    const m = musclesDeSeance(t)!;
    expect(m).not.toBeNull();
    const parNom = Object.fromEntries(m.groupes.map((g) => [g.nom, g.series]));
    expect(parNom.Pectoraux).toBe(3);
    expect(parNom.Jambes).toBe(2);
    expect(m.zones).toEqual(expect.arrayContaining(['pectoraux', 'quadriceps']));
  });
  test('absents sans exercice', () => {
    expect(musclesDeSeance(muscu(2, '2026-10-30', []))).toBeNull();
    expect(musclesDeSeance({ id: 3, sport: 'jjb', date: '2026-10-30' } as Training)).toBeNull();
  });
});

describe('kilos de la semaine', () => {
  test('charge x repetitions des series de travail', () => {
    const a = muscu(1, '2026-10-27', [{ name: 'Squat', setsData: [{ weight: 100, reps: 5 }, { weight: 100, reps: 5 }] }]);
    const b = muscu(2, '2026-10-29', [{ name: 'Tractions', setsData: [{ weight: 0, reps: 10 }] }, { name: 'Curl', setsData: [{ weight: 20, reps: 10 }] }]);
    expect(kilosDe([a, b])).toBe(1200);
    expect(kilosDe([])).toBe(0);
  });
});

describe('records de l annee', () => {
  const t1 = muscu(1, '2025-12-10', [{ name: 'Squat', setsData: [{ weight: 100, reps: 5 }] }]);
  const t2 = muscu(2, '2026-02-10', [{ name: 'Squat', setsData: [{ weight: 105, reps: 5 }] }]);
  const t3 = muscu(3, '2026-03-10', [{ name: 'Squat', setsData: [{ weight: 102, reps: 5 }] }]);
  const t4 = muscu(4, '2026-04-10', [{ name: 'Squat', setsData: [{ weight: 110, reps: 3 }] }, { name: 'Curl', setsData: [{ weight: 20, reps: 8 }] }]);
  test('chaque seance comparee a celles d avant, il faut un ancien record', () => {
    const tries = trier([t1, t2, t3, t4]);
    expect(recordsAnnee(tries, tries.filter((t) => t.date.startsWith('2026')))).toBe(2);
  });
  test('dans les donnees de l annee, absent a 0, jamais sur un mois', () => {
    const an = donneesPeriode([t1, t2, t3, t4], 'annee', '2026', { parSemaine: 0, aujourdhui: '2026-11-02' })!;
    expect(an.records).toBe(2);
    const mois = donneesPeriode([t1, t2, t3, t4], 'mois', '2026-02', { parSemaine: 0, aujourdhui: '2026-11-02' })!;
    expect(mois.records).toBeUndefined();
    const premiere = donneesPeriode([t1], 'annee', '2025', { parSemaine: 0, aujourdhui: '2026-11-02' })!;
    expect(premiere.records).toBeUndefined();
  });
});

describe('GPS et denivele seulement d une montre ou de Sante', () => {
  const v = { trace: { points: [[0, 0], [1, 1]] as [number, number][], ratio: 1 }, splits: [{ km: 1, secondes: 300 }], deniveleM: 40, repetitions: 0 };
  test('seance importee de Sante ou de la montre : gardes', () => {
    expect(vientDUnAppareil({ healthkit_uuid: 'ABC', source: 'manual' })).toBe(true);
    expect(vientDUnAppareil({ source: 'apple_watch' })).toBe(true);
    expect(vientDUnAppareil({ source: 'yoroi_montre' })).toBe(true);
    expect(gpsSiAppareil(v, { healthkit_uuid: 'ABC' })).toEqual(v);
  });
  test('seance saisie a la main : retires', () => {
    expect(vientDUnAppareil({ source: 'manual' })).toBe(false);
    expect(vientDUnAppareil({})).toBe(false);
    expect(gpsSiAppareil(v, { source: 'manual' })).toEqual({ ...v, trace: null, splits: null, deniveleM: 0 });
  });
});

describe('kcal coupees sur les cartes', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { kcalPourCarte } = require('@/lib/v2/cartes/donneesEnPlus') as typeof import('@/lib/v2/cartes/donneesEnPlus');
  test('aucune kcal tant que leur source n est pas enregistree, meme importee de Sante', () => {
    expect(kcalPourCarte({ calories: 450, source: 'manual' })).toBeUndefined();
    expect(kcalPourCarte({ calories: 450, source: 'apple_health', healthkit_uuid: 'X' })).toBeUndefined();
  });
});
