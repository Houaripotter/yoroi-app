/**
 * Synchro entre deux versions de l'app (2 novembre 2026, cartes v7, etape 1).
 *
 * La migration ajoute 3 colonnes a `trainings` (calories_source, calories_appareil, calories_mesurees).
 * Avant le correctif, l'empreinte d'une ligne comptait chaque colonne, meme vide : au scan qui suivait la
 * migration, TOUTES les seances passaient pour modifiees « maintenant » et pouvaient ecraser une modification
 * plus ancienne faite sur l'autre appareil.
 *
 * L'ancienne version tourne vraiment ici : copie du lib/peerSyncService.ts d'avant le correctif
 * (__tests__/fixtures/synchro_v1/peerSyncService_v1.ts, tiree de git), avec l'ancien schema.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
jest.mock('@/lib/security/logger', () => {
  const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn(), success: jest.fn() };
  return { __esModule: true, default: l, logger: l };
});
jest.mock('@react-native-async-storage/async-storage', () => {
  const t = () => (global as any).__app;
  const api = {
    getItem: async (k: string) => (t().async.has(k) ? t().async.get(k) : null),
    setItem: async (k: string, v: string) => { t().async.set(k, String(v)); },
    removeItem: async (k: string) => { t().async.delete(k); },
    getAllKeys: async () => [...t().async.keys()],
    multiRemove: async (ks: string[]) => { for (const k of ks) t().async.delete(k); },
  };
  return { __esModule: true, default: api, ...api };
});
jest.mock('expo-secure-store', () => {
  const t = () => (global as any).__app;
  return {
    __esModule: true,
    AFTER_FIRST_UNLOCK: 'AFTER_FIRST_UNLOCK',
    getItemAsync: async (k: string) => (t().secure.has(k) ? t().secure.get(k) : null),
    setItemAsync: async (k: string, v: string) => { t().secure.set(k, String(v)); },
    deleteItemAsync: async (k: string) => { t().secure.delete(k); },
  };
});
jest.mock('expo-crypto', () => ({ getRandomBytes: (n: number) => new Uint8Array(require('crypto').randomBytes(n)) }));
jest.mock('@/lib/database', () => ({ openDatabase: async () => (global as any).__app.db }));
jest.mock('@/lib/multipeerBridge', () => {
  const t = () => (global as any).__app;
  const api = {
    isAvailable: true,
    getDeviceName: async () => t().nom,
    startDiscovery: async () => true,
    stopDiscovery: async () => undefined,
    getConnectedPeers: async () => ['autre'],
    sendData: async (env: unknown) => { (global as any).__boite.push(env); return true; },
    onPeerChanged: () => ({ remove: () => undefined }),
    onDataReceived: (cb: (e: unknown) => Promise<void>) => { t().recevoir = cb; return { remove: () => undefined }; },
  };
  return { __esModule: true, default: api, MultipeerBridge: api };
});

import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

type Version = 'ancienne' | 'nouvelle';
type App = {
  nom: string; id: string; async: Map<string, string>; secure: Map<string, string>; db: any;
  recevoir?: (e: unknown) => Promise<void>; mod: any; version: Version;
};

const MODULE: Record<Version, string> = {
  ancienne: '../fixtures/synchro_v1/peerSyncService_v1',
  nouvelle: '@/lib/peerSyncService',
};

// Schema de l'ancienne version : des colonnes deja vides (notes, rpe...) pour que l'ancienne formule les compte
const SCHEMA = `
  CREATE TABLE clubs (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, sport TEXT, created_at TEXT);
  CREATE TABLE trainings (id INTEGER PRIMARY KEY AUTOINCREMENT, club_id INTEGER, weekly_plan_id INTEGER, sport TEXT NOT NULL,
    date TEXT NOT NULL, duration_minutes INTEGER, notes TEXT, calories INTEGER, rpe INTEGER, source TEXT,
    healthkit_uuid TEXT, created_at TEXT);
`;
const MIGRATION = [
  'ALTER TABLE trainings ADD COLUMN calories_source TEXT',
  'ALTER TABLE trainings ADD COLUMN calories_appareil TEXT',
  'ALTER TABLE trainings ADD COLUMN calories_mesurees INTEGER',
];

let horloge = Date.UTC(2026, 10, 2, 9, 0, 0);
const avancer = (ms = 60_000) => { horloge += ms; };
(global as any).__boite = [] as any[];
const boite = () => (global as any).__boite as any[];

let A: App;
let B: App;
const sur = (a: App) => { (global as any).__app = a; };

function charger(app: App, version: Version) {
  app.version = version;
  jest.isolateModules(() => { app.mod = require(MODULE[version]); });
}

async function creerApp(nom: string, id: string, autreId: string, autreNom: string, cle: string, version: Version, migree: boolean): Promise<App> {
  const sqlite = require('../helpers/expoSqliteNode.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `yoroi-colonnes-${id}-`));
  const db = await sqlite.openDatabaseAsync('yoroi.db', {}, dir);
  await db.execAsync(SCHEMA);
  if (migree) for (const q of MIGRATION) await db.execAsync(q);
  const app: App = { nom, id, async: new Map(), secure: new Map(), db, mod: null, version };
  app.async.set('@yoroi_peer_device_id', id);
  app.secure.set('yoroi_peer_pairs_v1', JSON.stringify({ [autreId]: { nom: autreNom, cle } }));
  sur(app);
  charger(app, version);
  await app.mod.initPeerSync();
  return app;
}

/** Mise a jour de l'app sur `a` : arret de l'ancienne version, migration du schema, demarrage de la nouvelle */
async function mettreAJour(a: App, version: Version = 'nouvelle') {
  sur(a);
  await a.mod.stopPeerSync();
  for (const q of MIGRATION) await a.db.execAsync(q);
  charger(a, version);
  await a.mod.initPeerSync();
}

async function livrer() {
  for (let i = 0; i < 500; i++) {
    const env = boite().shift();
    if (!env) return;
    const dest = env.to === A.id ? A : B;
    sur(dest);
    await dest.recevoir!({ peer: 'autre', data: JSON.stringify(env) });
    await dest.mod.__test__.attendre();
  }
  throw new Error('trop de messages');
}

async function synchro(a: App) {
  avancer(5_000);
  sur(a);
  await a.mod.__test__.sendHandshake(true);
  await livrer();
  avancer(5_000);
}

async function noterChangement(a: App) {
  sur(a);
  await a.mod.__test__.scanAll(a.db);
}

const sql = (a: App, q: string, ...p: unknown[]) => a.db.runAsync(q, ...p);
const lignes = (a: App, q: string) => a.db.getAllAsync(q) as Promise<any[]>;
const seances = (a: App) => lignes(a, 'SELECT date, sport, duration_minutes, notes, calories FROM trainings ORDER BY date');
const etats = async (a: App) => {
  const r = await lignes(a, "SELECT uid, hash, updated_at, changed_at FROM sync_state WHERE tbl = 'trainings' ORDER BY uid");
  return new Map(r.map((x) => [x.uid, x]));
};

/** 6 seances de l'historique, dont 2 importees de Sante, avec des colonnes vides */
async function historique(a: App) {
  for (let j = 1; j <= 6; j++) {
    const hk = j <= 2 ? `'HK-${j}'` : 'NULL';
    const src = j <= 2 ? `'apple_health'` : 'NULL';
    await sql(a, `INSERT INTO trainings (sport, date, duration_minutes, notes, calories, source, healthkit_uuid, created_at)
      VALUES ('jjb', '2026-10-2${j}', ${45 + j}, NULL, ${j <= 2 ? 400 + j : 'NULL'}, ${src}, ${hk}, '2026-10-2${j} 20:00:00')`);
  }
}

async function demarrer(versionA: Version, versionB: Version, migreeA: boolean, migreeB: boolean) {
  jest.spyOn(Date, 'now').mockImplementation(() => horloge);
  boite().length = 0;
  const cle = require('crypto').randomBytes(32).toString('hex');
  A = await creerApp('iPhone', 'idA', 'idB', 'iPad', cle, versionA, migreeA);
  B = await creerApp('iPad', 'idB', 'idA', 'iPhone', cle, versionB, migreeB);
}

afterEach(async () => {
  for (const a of [A, B]) { if (a) { sur(a); await a.mod.stopPeerSync(); } }
  jest.restoreAllMocks();
});

describe('empreinte d une ligne', () => {
  it('une colonne vide ajoutee ne change pas l empreinte, une valeur la change', async () => {
    await demarrer('nouvelle', 'nouvelle', true, true);
    const { hashLocalRow, hashLocalRowV1 } = A.mod.__test__;
    const base = { __rowid: 1, id: 1, sync_uid: 'u', sport: 'jjb', date: '2026-10-21', notes: null, calories: 401, created_at: 'x' };
    const avecColonnes = { ...base, calories_source: null, calories_appareil: null, calories_mesurees: null };
    expect(hashLocalRow('trainings', avecColonnes)).toBe(hashLocalRow('trainings', base));
    expect(hashLocalRowV1('trainings', avecColonnes)).toBe(hashLocalRowV1('trainings', base));
    expect(hashLocalRow('trainings', { ...avecColonnes, calories_source: 'sante' })).not.toBe(hashLocalRow('trainings', base));
    expect(hashLocalRowV1('trainings', { ...avecColonnes, calories_source: 'sante' })).not.toBe(hashLocalRowV1('trainings', base));
    // vraies modifications : vide -> valeur, valeur -> vide, valeur -> autre
    expect(hashLocalRow('trainings', { ...base, notes: 'x' })).not.toBe(hashLocalRow('trainings', base));
    expect(hashLocalRow('trainings', { ...base, calories: null })).not.toBe(hashLocalRow('trainings', base));
    expect(hashLocalRow('trainings', { ...base, calories: 402 })).not.toBe(hashLocalRow('trainings', base));
  });
});

describe('mise a jour d un appareil : ancienne version -> nouvelle version avec les 3 colonnes', () => {
  it('aucune seance n est vue comme modifiee, et la modification faite sur l iPad juste avant n est pas ecrasee', async () => {
    await demarrer('ancienne', 'ancienne', false, false);
    await historique(A);
    await synchro(A);
    expect((await seances(B)).length).toBe(6);
    const avant = await etats(A);

    // l'iPad (pas encore a jour) corrige une seance
    avancer();
    await sql(B, "UPDATE trainings SET notes = 'corrigee sur iPad' WHERE date = '2026-10-23'");
    await noterChangement(B);

    // ensuite seulement l'iPhone se met a jour et fait son premier scan
    avancer();
    await mettreAJour(A);
    const colonnes = (await lignes(A, 'PRAGMA table_info(trainings)')).map((c) => c.name);
    expect(colonnes).toEqual(expect.arrayContaining(['calories_source', 'calories_appareil', 'calories_mesurees']));
    await noterChangement(A);

    const apres = await etats(A);
    expect(apres.size).toBe(avant.size);
    for (const [uid, e] of avant) {
      // dates de modification et d'envoi inchangees : aucune seance ne passe pour modifiee
      expect(apres.get(uid)!.updated_at).toBe(e.updated_at);
      expect(apres.get(uid)!.changed_at).toBe(e.changed_at);
    }

    await synchro(A);
    await synchro(B);
    for (const a of [A, B]) {
      const s = await seances(a);
      expect(s.length).toBe(6);
      expect(s.find((x) => x.date === '2026-10-23')!.notes).toBe('corrigee sur iPad');
    }
  });

  it('temoin : avec l ancienne empreinte, la meme mise a jour ecrase la modification de l iPad', async () => {
    await demarrer('ancienne', 'ancienne', false, false);
    await historique(A);
    await synchro(A);
    avancer();
    await sql(B, "UPDATE trainings SET notes = 'corrigee sur iPad' WHERE date = '2026-10-23'");
    await noterChangement(B);
    avancer();
    await mettreAJour(A, 'ancienne'); // colonnes ajoutees, mais sans le correctif
    await noterChangement(A);
    await synchro(A);
    await synchro(B);
    const s = await seances(B);
    expect(s.find((x) => x.date === '2026-10-23')!.notes).toBeNull(); // le defaut que le correctif supprime
  });

  it('une modification faite sur l iPhone apres la mise a jour part bien', async () => {
    await demarrer('ancienne', 'ancienne', false, false);
    await historique(A);
    await synchro(A);
    avancer();
    await mettreAJour(A);
    await noterChangement(A);
    avancer();
    await sql(A, "UPDATE trainings SET duration_minutes = 90 WHERE date = '2026-10-25'");
    await noterChangement(A);
    await synchro(A);
    expect((await seances(B)).find((x) => x.date === '2026-10-25')!.duration_minutes).toBe(90);
  });
});

describe('deux versions en meme temps : iPhone a jour (colonnes), iPad ancien (sans colonnes)', () => {
  beforeEach(async () => {
    await demarrer('nouvelle', 'ancienne', true, false);
  });

  it('iPhone -> iPad : les seances arrivent, l iPad ignore les colonnes sans erreur', async () => {
    await historique(A);
    await sql(A, "UPDATE trainings SET calories_source = 'appareil', calories_appareil = 'Apple Watch', calories_mesurees = calories WHERE healthkit_uuid IS NOT NULL");
    await synchro(A);
    expect(await seances(B)).toEqual(await seances(A));
  });

  it('iPad -> iPhone : les seances arrivent, colonnes vides, puis rien ne repart comme modifie', async () => {
    await historique(B);
    await synchro(B);
    expect(await seances(A)).toEqual(await seances(B));
    expect(await lignes(A, 'SELECT COUNT(*) AS n FROM trainings WHERE calories_source IS NOT NULL')).toEqual([{ n: 0 }]);
    const e1 = await etats(A);
    await noterChangement(A);
    const e2 = await etats(A);
    for (const [uid, e] of e1) expect(e2.get(uid)!.updated_at).toBe(e.updated_at);
    // plusieurs synchros dans les deux sens : toujours 6 seances, identiques
    await synchro(A); await synchro(B); await synchro(A);
    expect((await seances(A)).length).toBe(6);
    expect(await seances(B)).toEqual(await seances(A));
  });

  it('une seance modifiee sur l iPad garde sur l iPhone sa source des kcal', async () => {
    await historique(A);
    await sql(A, "UPDATE trainings SET calories_source = 'appareil', calories_appareil = 'Apple Watch', calories_mesurees = calories WHERE healthkit_uuid = 'HK-1'");
    await noterChangement(A);
    await synchro(A);
    avancer();
    await sql(B, "UPDATE trainings SET notes = 'vue sur iPad' WHERE healthkit_uuid = 'HK-1'");
    await noterChangement(B);
    await synchro(B);
    const r = await lignes(A, "SELECT notes, calories, calories_source, calories_appareil, calories_mesurees FROM trainings WHERE healthkit_uuid = 'HK-1'");
    expect(r).toEqual([{ notes: 'vue sur iPad', calories: 401, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 401 }]);
  });

  it('modifications croisees : la plus recente gagne des deux cotes, rien n est perdu', async () => {
    await historique(A);
    await synchro(A);
    avancer();
    await sql(A, "UPDATE trainings SET notes = 'iPhone' WHERE date = '2026-10-24'");
    await noterChangement(A);
    avancer();
    await sql(B, "UPDATE trainings SET notes = 'iPad' WHERE date = '2026-10-24'");
    await sql(B, "UPDATE trainings SET duration_minutes = 120 WHERE date = '2026-10-26'");
    await noterChangement(B);
    await synchro(A);
    await synchro(B);
    for (const a of [A, B]) {
      const s = await seances(a);
      expect(s.find((x) => x.date === '2026-10-24')!.notes).toBe('iPad');
      expect(s.find((x) => x.date === '2026-10-26')!.duration_minutes).toBe(120);
      expect(s.length).toBe(6);
    }
  });

  it('une seance tapee a la main sur les deux appareils (meme contenu) recoit le meme identifiant', async () => {
    await sql(A, "INSERT INTO trainings (sport, date, duration_minutes, created_at) VALUES ('boxe', '2026-10-30', 60, '2026-10-30 18:00:00')");
    await sql(B, "INSERT INTO trainings (sport, date, duration_minutes, created_at) VALUES ('boxe', '2026-10-30', 60, '2026-10-30 18:00:00')");
    await noterChangement(A);
    await noterChangement(B);
    const uA = await lignes(A, 'SELECT sync_uid FROM trainings');
    const uB = await lignes(B, 'SELECT sync_uid FROM trainings');
    expect(uA).toEqual(uB);
    await synchro(A);
    expect((await seances(A)).length).toBe(1);
    expect((await seances(B)).length).toBe(1);
  });
});

describe('deux appareils a jour : les nouvelles colonnes passent', () => {
  beforeEach(async () => {
    await demarrer('nouvelle', 'nouvelle', true, true);
  });

  it('dans les deux sens, et une modification de la source part comme une modification', async () => {
    await historique(A);
    await sql(A, "UPDATE trainings SET calories_source = 'appareil', calories_appareil = 'Apple Watch', calories_mesurees = calories WHERE healthkit_uuid = 'HK-1'");
    await synchro(A);
    const col = "SELECT healthkit_uuid, calories, calories_source, calories_appareil, calories_mesurees FROM trainings WHERE healthkit_uuid IS NOT NULL ORDER BY healthkit_uuid";
    expect(await lignes(B, col)).toEqual(await lignes(A, col));
    expect((await lignes(B, col))[0]).toEqual({ healthkit_uuid: 'HK-1', calories: 401, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 401 });

    avancer();
    await sql(B, "UPDATE trainings SET calories = 500, calories_source = 'saisie', calories_appareil = NULL, calories_mesurees = NULL WHERE healthkit_uuid = 'HK-1'");
    await noterChangement(B);
    await synchro(B);
    expect((await lignes(A, col))[0]).toEqual({ healthkit_uuid: 'HK-1', calories: 500, calories_source: 'saisie', calories_appareil: null, calories_mesurees: null });
  });
});
