/**
 * Cartes v7, etape 3 (2 novembre 2026) : source des kcal, partie JS.
 * - classement a l'import Apple Sante (les 7 cas du DETAIL_VALIDATION) et Health Connect ;
 * - Apple Watch par Sante donne 'appareil', chemin de secours natif 'sante' sans appareil ;
 * - montre YOROI : 'appareil', « Montre YOROI » ;
 * - saisie et modification a la main : 'saisie', les kcal disparaissent de la carte ; kcal effacees : tout efface ;
 * - kcalPourCarte : seulement appareil ou sante, kcal egales a celles mesurees, superieures a 0.
 * Bout en bout avec le vrai code d'import iPhone et Android, la vraie base SQLite et le vrai saveSeance.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { nouveauTelephone, utiliser } from '../helpers/telephone';
import {
  champsKcalImport, classerKcalHealthConnect, classerKcalSanteIOS, colonnesSourceKcal, kcalMesureesIntactes, sourceApresSaisieKcal,
} from '@/lib/v2/seance/sourceKcal';

jest.mock('expo-sqlite', () => require('../helpers/expoSqliteNode.js'));
jest.mock('@/lib/security/logger', () => {
  const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), success: jest.fn() };
  return { __esModule: true, default: l, logger: l, getRecentLogs: () => [], clearRecentLogs: () => undefined };
});
jest.mock('@react-native-async-storage/async-storage', () => require('../helpers/telephone').mockAsyncStorage());
jest.mock('expo-secure-store', () => require('../helpers/telephone').mockSecureStore());
jest.mock('expo-file-system/legacy', () => require('../helpers/telephone').mockFileSystem());
jest.mock('expo-file-system', () => require('../helpers/telephone').mockFileSystem());
jest.mock('expo-constants', () => ({ __esModule: true, default: { appOwnership: 'standalone', expoConfig: { version: '3.0.2', ios: { buildNumber: '40' } } }, ExecutionEnvironment: {} }));
jest.mock('@/utils/telemetry', () => ({ track: () => undefined, familleDeSport: () => 'autre', trancheUsage: () => '1' }));
jest.mock('@/lib/v2/armure', () => ({ ARMURE_CHANGED_EVENT: 'x', ARMURE_STORAGE_KEYS: [], getArmureState: async () => null, requestArmureCatchup: async () => undefined }));
jest.mock('@/lib/healthKit.wrapper', () => ({
  __esModule: true,
  default: {
    queryWorkoutSamples: async () => (global as any).__hk ?? [],
    queryWorkoutSamplesWithAnchor: async () => ({ workouts: [] }),
  },
  isHealthKitAvailable: () => true,
  isRunningInExpoGo: () => false,
  isMockMode: () => false,
  healthKitDiagnostic: async () => ({}),
}));
jest.mock('@/lib/yoroiHealthKit', () => ({ getNativeWorkouts: async () => (global as any).__natifs ?? [] }));
jest.mock('react-native-health-connect', () => ({
  initialize: async () => true,
  readRecords: async (type: string) => ({ records: ((global as any).__hc ?? {})[type] ?? [] }),
}));

// Les imports Sante posent des minuteurs de 5 minutes (withTimeout) : ils ne doivent pas retenir Jest a la fin
const vraiSetTimeout = global.setTimeout;
global.setTimeout = ((fn: (...a: unknown[]) => void, ms?: number, ...a: unknown[]) => {
  const t = vraiSetTimeout(fn, ms, ...a) as unknown as { unref?: () => void };
  if ((ms ?? 0) >= 10_000) t?.unref?.();
  return t;
}) as unknown as typeof setTimeout;

// ============================================================
// Classement, fonctions pures
// ============================================================

describe('classement Apple Sante : les 7 cas', () => {
  const montre = { productType: 'Watch6,2', source: { name: 'Apple Watch de Houari', bundleIdentifier: 'com.apple.health.1234' } };
  test('1. Apple Watch par productType', () => {
    expect(classerKcalSanteIOS({ sourceRevision: montre })).toEqual({ source: 'appareil', appareil: 'Apple Watch' });
  });
  test('2. Apple Watch par device.model (productType vide sur un vieil echantillon)', () => {
    expect(classerKcalSanteIOS({ sourceRevision: { source: { name: 'Sante' } }, device: { name: 'Apple Watch', model: 'Watch', manufacturer: 'Apple Inc.' } }))
      .toEqual({ source: 'appareil', appareil: 'Apple Watch' });
  });
  test('3. Garmin (par l appareil, puis par le nom de la source seul)', () => {
    expect(classerKcalSanteIOS({ sourceRevision: { source: { name: 'Connect' } }, device: { manufacturer: 'Garmin', model: 'Forerunner 255' } }))
      .toEqual({ source: 'appareil', appareil: 'Garmin' });
    expect(classerKcalSanteIOS({ sourceRevision: { source: { name: 'Garmin Connect', bundleIdentifier: 'com.garmin.connect.mobile' } } }))
      .toEqual({ source: 'appareil', appareil: 'Garmin' });
  });
  test('4. iPhone seul : sante', () => {
    expect(classerKcalSanteIOS({ sourceRevision: { productType: 'iPhone15,2', source: { name: 'iPhone de Houari' } }, device: { name: 'iPhone', model: 'iPhone', manufacturer: 'Apple Inc.' } }))
      .toEqual({ source: 'sante', appareil: null });
  });
  test('5. Strava : sante', () => {
    expect(classerKcalSanteIOS({ sourceRevision: { source: { name: 'Strava', bundleIdentifier: 'com.strava.stravaride' } } })).toEqual({ source: 'sante', appareil: null });
  });
  test('6. saisie dans Sante : saisie, meme depuis une montre', () => {
    expect(classerKcalSanteIOS({ metadataWasUserEntered: true, sourceRevision: montre })).toEqual({ source: 'saisie', appareil: null });
    expect(classerKcalSanteIOS({ metadata: { HKWasUserEntered: true }, sourceRevision: { source: { name: 'Sante' } } })).toEqual({ source: 'saisie', appareil: null });
  });
  test('7. aucun champ : sante', () => {
    expect(classerKcalSanteIOS({})).toEqual({ source: 'sante', appareil: null });
    expect(classerKcalSanteIOS(null)).toEqual({ source: 'sante', appareil: null });
  });
  test('chemin de secours natif : sante, appareil vide, meme avec un nom de montre', () => {
    expect(classerKcalSanteIOS({ secoursNatif: true, sourceRevision: { source: { name: 'Apple Watch de Houari' } } })).toEqual({ source: 'sante', appareil: null });
  });
  test('le nom personnel de l appareil n est jamais garde', () => {
    expect(classerKcalSanteIOS({ device: { name: 'Montre de Houari', manufacturer: 'Polar', model: 'Vantage V3' } }).appareil).toBe('Polar');
  });
});

describe('classement Health Connect', () => {
  const montreSamsung = { dataOrigin: 'com.sec.android.app.shealth', device: { manufacturer: 'Samsung', model: 'SM-R960', type: 1 }, recordingMethod: 1 };
  test('montre (type 1, absent de l enumeration de la librairie)', () => {
    expect(classerKcalHealthConnect([montreSamsung])).toEqual({ source: 'appareil', appareil: 'Samsung SM-R960' });
  });
  test('bracelet, bague, ceinture cardio', () => {
    for (const type of [4, 6, 7]) expect(classerKcalHealthConnect([{ dataOrigin: 'x.y', device: { model: 'Capteur', type } }]).source).toBe('appareil');
  });
  test('saisie a la main', () => {
    expect(classerKcalHealthConnect([{ ...montreSamsung, recordingMethod: 3 }])).toEqual({ source: 'saisie', appareil: null });
  });
  test('origines melangees : sante', () => {
    expect(classerKcalHealthConnect([montreSamsung, { dataOrigin: 'com.google.android.apps.fitness', device: { type: 2 } }])).toEqual({ source: 'sante', appareil: null });
  });
  test('paquet Samsung Health sans appareil : appareil, Samsung', () => {
    expect(classerKcalHealthConnect([{ dataOrigin: 'com.sec.android.app.shealth', recordingMethod: 1 }])).toEqual({ source: 'appareil', appareil: 'Samsung' });
  });
  test('enregistrement automatique : appareil', () => {
    expect(classerKcalHealthConnect([{ dataOrigin: 'com.example.app', recordingMethod: 2 }]).source).toBe('appareil');
  });
  test('telephone, application inconnue, rien : sante', () => {
    expect(classerKcalHealthConnect([{ dataOrigin: 'com.google.android.apps.fitness', device: { type: 2 }, recordingMethod: 1 }])).toEqual({ source: 'sante', appareil: null });
    expect(classerKcalHealthConnect([])).toEqual({ source: 'sante', appareil: null });
  });
});

describe('regles des colonnes et garde-fou des cartes', () => {
  test('champsKcalImport : kcal mesurees remplies, sans kcal tout vide', () => {
    expect(champsKcalImport(512, { source: 'appareil', appareil: 'Apple Watch' })).toEqual({ calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 512 });
    expect(champsKcalImport(undefined, { source: 'appareil', appareil: 'Apple Watch' })).toEqual({ calories_source: null, calories_appareil: null, calories_mesurees: null });
    expect(champsKcalImport(300, { source: 'saisie', appareil: null })).toEqual({ calories_source: 'saisie', calories_appareil: null, calories_mesurees: null });
  });
  test('colonnesSourceKcal : rien fourni = on ne touche a rien ; kcal effacees = tout efface', () => {
    expect(colonnesSourceKcal({ notes: 'x' })).toBeNull();
    expect(colonnesSourceKcal({ calories: 400 })).toBeNull();
    expect(colonnesSourceKcal({ calories: null, calories_source: 'appareil' })).toEqual({ calories_source: null, calories_appareil: null, calories_mesurees: null });
    expect(colonnesSourceKcal({ calories: 0 })).toEqual({ calories_source: null, calories_appareil: null, calories_mesurees: null });
    expect(colonnesSourceKcal({ calories: 400, calories_source: 'montre_inconnue' })).toEqual({ calories_source: null, calories_appareil: null, calories_mesurees: null });
  });
  test('sourceApresSaisieKcal : inchangees, changees, effacees', () => {
    expect(sourceApresSaisieKcal({ calories: 512 }, 512)).toBeUndefined();
    expect(sourceApresSaisieKcal({ calories: 512 }, 520)).toEqual({ calories_source: 'saisie', calories_appareil: null, calories_mesurees: null });
    expect(sourceApresSaisieKcal({ calories: 512 }, undefined)).toEqual({ calories_source: null, calories_appareil: null, calories_mesurees: null });
    expect(sourceApresSaisieKcal({ calories: null }, 200)).toEqual({ calories_source: 'saisie', calories_appareil: null, calories_mesurees: null });
  });
  test('kcalPourCarte : seulement appareil ou sante, egales aux kcal mesurees, superieures a 0', () => {
    const { kcalPourCarte } = require('@/lib/v2/cartes/donneesEnPlus');
    expect(kcalPourCarte({ calories: 512, calories_source: 'appareil', calories_mesurees: 512 })).toBe(512);
    expect(kcalPourCarte({ calories: 300, calories_source: 'sante', calories_mesurees: 300 })).toBe(300);
    expect(kcalPourCarte({ calories: 520, calories_source: 'appareil', calories_mesurees: 512 })).toBeUndefined(); // retouchees
    expect(kcalPourCarte({ calories: 300, calories_source: 'saisie', calories_mesurees: 300 })).toBeUndefined();
    expect(kcalPourCarte({ calories: 300, calories_source: 'inconnue', calories_mesurees: 300 })).toBeUndefined();
    expect(kcalPourCarte({ calories: 450, source: 'apple_health', healthkit_uuid: 'X' })).toBeUndefined(); // ancienne seance
    expect(kcalPourCarte({ calories: 0, calories_source: 'appareil', calories_mesurees: 0 })).toBeUndefined();
    expect(kcalPourCarte({ calories: null, calories_source: 'appareil', calories_mesurees: 512 })).toBeUndefined();
    expect(kcalMesureesIntactes(null)).toBeUndefined();
  });
});

// ============================================================
// Bout en bout : import, base, saveSeance, carte
// ============================================================

const raw = () => require('../helpers/expoSqliteNode.js').rawDatabase('yoroi.db');
const ligne = (id: number) => raw().prepare('select calories, calories_source, calories_appareil, calories_mesurees from trainings where id = ?').get(id);

async function demarrer(os: 'ios' | 'android') {
  utiliser(nouveauTelephone(`kcal-${os}`));
  require('react-native').Platform.OS = os;
  const db = require('@/lib/database');
  await db.initDatabase();
  return {
    db,
    save: require('@/lib/v2/seance/save') as typeof import('@/lib/v2/seance/save'),
    carte: (id: number) => db.getTrainingById(id).then((t: any) => require('@/lib/v2/cartes/donneesEnPlus').kcalPourCarte(t)),
  };
}

const debut = new Date('2026-11-01T18:00:00Z');
const fin = new Date('2026-11-01T18:45:00Z');
const seanceHK = (o: Record<string, unknown>) => ({
  uuid: `HK-${Math.random().toString(36).slice(2)}`, startDate: debut, endDate: fin, workoutActivityType: 37,
  totalEnergyBurned: { quantity: 512.4, unit: 'kcal' }, ...o,
});

describe('iPhone : import Apple Sante, puis modification a la main', () => {
  afterEach(() => { (global as any).__hk = undefined; (global as any).__natifs = undefined; });

  test('Apple Watch par Sante : appareil, kcal sur la carte ; modifiees a la main : saisie, plus de kcal sur la carte', async () => {
    const { db, save, carte } = await demarrer('ios');
    (global as any).__hk = [seanceHK({ sourceRevision: { productType: 'Watch7,1', source: { name: 'Apple Watch de Houari', bundleIdentifier: 'com.apple.health.X' } } })];
    const hc = require('@/lib/healthConnect.ios').default;
    const lues = await hc.lireSeancesPourImport(30);
    expect(lues).toHaveLength(1);
    const id = await db.addTraining(lues[0].training);
    expect(ligne(id)).toEqual({ calories: 512, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 512 });
    expect(await carte(id)).toBe(512);

    // modification d'autre chose (la note) : la source reste, les kcal restent sur la carte
    await save.saveSeance({ sport: 'running', date: '2026-11-01', notes: 'bonne seance' } as any, { editId: id, title: 'Course' });
    expect(ligne(id).calories_source).toBe('appareil');
    expect(await carte(id)).toBe(512);

    // l'ecran cardio change les kcal : saisie, plus de kcal sur la carte (elles restent dans la seance)
    await save.saveSeance({ sport: 'running', date: '2026-11-01', calories: 600 } as any, { editId: id, title: 'Course' });
    expect(ligne(id)).toEqual({ calories: 600, calories_source: 'saisie', calories_appareil: null, calories_mesurees: null });
    expect(await carte(id)).toBeUndefined();

    // kcal effacees : la source et la valeur mesuree aussi
    await save.saveSeance({ sport: 'running', date: '2026-11-01', calories: undefined } as any, { editId: id, title: 'Course' });
    expect(ligne(id)).toEqual({ calories: null, calories_source: null, calories_appareil: null, calories_mesurees: null });
  });

  test('kcal changees en douce (updateTraining direct, sans la source) : le garde-fou les coupe de la carte', async () => {
    const { db, carte } = await demarrer('ios');
    (global as any).__hk = [seanceHK({ device: { name: 'Apple Watch', model: 'Watch', manufacturer: 'Apple Inc.' }, sourceRevision: { source: { name: 'Sante' } } })];
    const lues = await require('@/lib/healthConnect.ios').default.lireSeancesPourImport(30);
    const id = await db.addTraining(lues[0].training);
    expect(await carte(id)).toBe(512);
    const t = await db.getTrainingById(id);
    await db.updateTraining(id, { ...t, calories: 700 });
    expect(ligne(id).calories_source).toBe('appareil');
    expect(await carte(id)).toBeUndefined();
    // une mise a jour sans les colonnes (ni kcal changees) ne les efface pas
    await db.updateTraining(id, { ...t, calories_source: undefined, calories_appareil: undefined, calories_mesurees: undefined, notes: 'x' });
    expect(ligne(id)).toEqual({ calories: 512, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 512 });
  });

  test('iPhone seul et saisie dans Sante', async () => {
    const { db, carte } = await demarrer('ios');
    (global as any).__hk = [
      seanceHK({ sourceRevision: { productType: 'iPhone15,2', source: { name: 'iPhone' } } }),
      seanceHK({ startDate: new Date('2026-11-02T08:00:00Z'), endDate: new Date('2026-11-02T08:30:00Z'), metadataWasUserEntered: true, sourceRevision: { productType: 'Watch7,1', source: { name: 'Sante' } } }),
    ];
    const lues = await require('@/lib/healthConnect.ios').default.lireSeancesPourImport(30);
    const ids = [];
    for (const l of lues) ids.push(await db.addTraining(l.training));
    const lignes = ids.map(ligne).sort((a: any, b: any) => String(a.calories_source).localeCompare(String(b.calories_source)));
    expect(lignes).toEqual([
      { calories: 512, calories_source: 'saisie', calories_appareil: null, calories_mesurees: null },
      { calories: 512, calories_source: 'sante', calories_appareil: null, calories_mesurees: 512 },
    ]);
    const cartes = await Promise.all(ids.map(carte));
    expect(cartes.sort()).toEqual([512, undefined]);
  });

  test('chemin de secours natif : sante, appareil vide', async () => {
    const { db } = await demarrer('ios');
    (global as any).__hk = [];
    (global as any).__natifs = [{ uuid: 'N1', startDate: debut.getTime(), endDate: fin.getTime(), workoutActivityType: 37, totalDistance: 0, totalEnergyBurned: 480, sourceName: 'Apple Watch de Houari' }];
    const lues = await require('@/lib/healthConnect.ios').default.lireSeancesPourImport(30);
    expect(lues).toHaveLength(1);
    const id = await db.addTraining(lues[0].training);
    expect(ligne(id)).toEqual({ calories: 480, calories_source: 'sante', calories_appareil: null, calories_mesurees: 480 });
  });

  test('seance deja importee sans kcal, completee ensuite : la source suit ; deja avec kcal : rien ne change', async () => {
    const { db } = await demarrer('ios');
    const id = await db.addTraining({ sport: 'running', date: '2026-11-01', healthkit_uuid: 'HK-D' });
    await db.addTraining({ sport: 'running', date: '2026-11-01', healthkit_uuid: 'HK-D', calories: 300, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 300 });
    expect(ligne(id)).toEqual({ calories: 300, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 300 });
    await db.addTraining({ sport: 'running', date: '2026-11-01', healthkit_uuid: 'HK-D', calories: 999, calories_source: 'sante', calories_mesurees: 999 });
    expect(ligne(id)).toEqual({ calories: 300, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 300 });
  });
});

describe('nouvelles seances : montre YOROI, saisie', () => {
  test('montre YOROI : appareil, Montre YOROI, kcal sur la carte', async () => {
    const { save, carte } = await demarrer('ios');
    const r = await save.saveSeance({ sport: 'jjb', date: '2026-11-02', duration_minutes: 60, calories: 420, source: 'yoroi_montre' } as any, { title: 'JJB', skipHealth: true });
    expect(ligne(r.id)).toEqual({ calories: 420, calories_source: 'appareil', calories_appareil: 'Montre YOROI', calories_mesurees: 420 });
    expect(await carte(r.id)).toBe(420);
  });

  test('seance tapee a la main avec des kcal : saisie, pas de kcal sur la carte ; sans kcal : rien', async () => {
    const { save, carte } = await demarrer('ios');
    const r = await save.saveSeance({ sport: 'boxe', date: '2026-11-02', duration_minutes: 45, calories: 350, source: 'manual' } as any, { title: 'Boxe', skipHealth: true });
    expect(ligne(r.id)).toEqual({ calories: 350, calories_source: 'saisie', calories_appareil: null, calories_mesurees: null });
    expect(await carte(r.id)).toBeUndefined();
    const r2 = await save.saveSeance({ sport: 'boxe', date: '2026-11-02', duration_minutes: 45, source: 'manual' } as any, { title: 'Boxe', skipHealth: true });
    expect(ligne(r2.id)).toEqual({ calories: null, calories_source: null, calories_appareil: null, calories_mesurees: null });
  });
});

describe('Android : import Health Connect', () => {
  afterEach(() => { (global as any).__hc = undefined; });
  const session = (o: Record<string, unknown>) => ({
    startTime: debut.toISOString(), endTime: fin.toISOString(), exerciseType: 56,
    metadata: { id: `HC-${Math.random().toString(36).slice(2)}`, dataOrigin: 'com.sec.android.app.shealth', device: { manufacturer: 'Samsung', model: 'SM-R960', type: 1 }, recordingMethod: 1 },
    ...o,
  });

  test('kcal de la seance, montre Samsung : appareil, kcal sur la carte', async () => {
    const { db, carte } = await demarrer('android');
    (global as any).__hc = { ExerciseSession: [session({ segments: [{ totalCalories: { inKilocalories: 433.6 } }] })] };
    const lues = await require('@/lib/healthConnect.android').default.lireSeancesPourImport(30);
    expect(lues).toHaveLength(1);
    const id = await db.addTraining(lues[0].training);
    expect(ligne(id)).toEqual({ calories: 434, calories_source: 'appareil', calories_appareil: 'Samsung SM-R960', calories_mesurees: 434 });
    expect(await carte(id)).toBe(434);
  });

  test('kcal additionnees de plusieurs apps : sante ; une saisie a la main parmi elles : saisie', async () => {
    const { db } = await demarrer('android');
    const cal = (kcal: number, meta: Record<string, unknown>) => ({ energy: { inKilocalories: kcal }, metadata: meta });
    (global as any).__hc = {
      ExerciseSession: [session({})],
      TotalCaloriesBurned: [cal(200, { dataOrigin: 'com.sec.android.app.shealth', device: { type: 1 } }), cal(150, { dataOrigin: 'com.google.android.apps.fitness', device: { type: 2 } })],
    };
    let lues = await require('@/lib/healthConnect.android').default.lireSeancesPourImport(30);
    let id = await db.addTraining(lues[0].training);
    expect(ligne(id)).toEqual({ calories: 350, calories_source: 'sante', calories_appareil: null, calories_mesurees: 350 });

    (global as any).__hc.TotalCaloriesBurned = [cal(200, { dataOrigin: 'com.sec.android.app.shealth', recordingMethod: 3 })];
    (global as any).__hc.ExerciseSession = [session({ startTime: '2026-11-02T08:00:00Z', endTime: '2026-11-02T08:40:00Z' })];
    lues = await require('@/lib/healthConnect.android').default.lireSeancesPourImport(30);
    id = await db.addTraining(lues[0].training);
    expect(ligne(id)).toEqual({ calories: 200, calories_source: 'saisie', calories_appareil: null, calories_mesurees: null });
  });
});
