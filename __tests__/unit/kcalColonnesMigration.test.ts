/**
 * Cartes v7, etape 2 (2 novembre 2026) : migration des 3 colonnes de la source des kcal, avec le vrai code
 * et une vraie base SQLite (telephone d'un utilisateur de la 2.4.2, mis a jour).
 * - une base existante s'ouvre, les colonnes apparaissent, les seances sont identiques octet pour octet ;
 * - la copie de securite se fait aussi sans changement de numero de version (numero de schema monte) ;
 * - sauvegarde puis restauration : les 3 valeurs reviennent ;
 * - corbeille puis restauration : les 3 valeurs reviennent.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import * as fs from 'fs';
import * as path from 'path';
import { nouveauTelephone, telephone242, utiliser } from '../helpers/telephone';

jest.mock('expo-sqlite', () => require('../helpers/expoSqliteNode.js'));
jest.mock('@/lib/security/logger', () => {
  const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: l, logger: l, getRecentLogs: () => [], clearRecentLogs: () => undefined };
});
jest.mock('@react-native-async-storage/async-storage', () => require('../helpers/telephone').mockAsyncStorage());
jest.mock('expo-secure-store', () => require('../helpers/telephone').mockSecureStore());
jest.mock('expo-file-system/legacy', () => require('../helpers/telephone').mockFileSystem());
jest.mock('expo-file-system', () => require('../helpers/telephone').mockFileSystem());
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '3.0.2', ios: { buildNumber: '40' } } }, ExecutionEnvironment: {} }));
jest.mock('expo-crypto', () => {
  const crypto = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_a: string, s: string) => crypto.createHash('sha256').update(s).digest('hex'),
    getRandomBytes: (n: number) => crypto.randomBytes(n),
    getRandomBytesAsync: async (n: number) => crypto.randomBytes(n),
    randomUUID: () => crypto.randomUUID(),
  };
});
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => false, shareAsync: async () => undefined }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true }) }));
jest.mock('react-native-view-shot', () => ({ captureRef: async () => '' }));
jest.mock('@/utils/telemetry', () => ({ track: () => undefined }));
jest.mock('@/lib/v2/armure', () => ({ ARMURE_STORAGE_KEYS: [], requestArmureCatchup: async () => undefined, restoreArmureFromStorage: async () => false }));

const NOUVELLES = ['calories_source', 'calories_appareil', 'calories_mesurees'];
const raw = () => require('../helpers/expoSqliteNode.js').rawDatabase('yoroi.db');
const colonnes = (tb: string): string[] => raw().prepare(`pragma table_info(${tb})`).all().map((c: any) => c.name);
/** Chaque valeur de chaque seance, en representation SQL exacte (quote : type et octets compris) */
const octets = (cols: string[]) => raw().prepare(`select ${cols.map((c) => `quote(${c}) as ${c}`).join(', ')} from trainings order by rowid`).all();
const copies = (t: { docDir: string }) => {
  const root = path.join(t.docDir, 'yoroi_securite');
  return fs.existsSync(root) ? fs.readdirSync(root).filter((n) => /^\d{4}-/.test(n)).sort() : [];
};

async function demarrer() {
  const db = require('@/lib/database');
  await db.initDatabase();
  return { db, exp: require('@/lib/exportService') };
}

/** Telephone en 3.0.2 schema 30 : base deja migree par la version d'avant, sans les 3 colonnes */
async function telephone302(nom: string) {
  const t = telephone242(nom);
  utiliser(t);
  await demarrer();
  for (const c of NOUVELLES) raw().exec(`alter table trainings drop column ${c}`);
  raw().exec('pragma user_version = 30');
  // dernier lancement : meme numero de version que celui qu'on installe (build de test)
  expect(t.async.get('@yoroi_data_version')).toBe('3.0.2 (40)');
  for (const d of copies(t)) fs.rmSync(path.join(t.docDir, 'yoroi_securite', d), { recursive: true, force: true });
  t.async.delete('@yoroi_safety_snapshot_last');
  return t;
}

describe('migration : une base existante', () => {
  test('s ouvre, les 3 colonnes apparaissent, les seances sont identiques octet pour octet', async () => {
    const t = await telephone302('migration');
    const anciennes = colonnes('trainings');
    expect(anciennes).not.toEqual(expect.arrayContaining(['calories_source']));
    const avant = octets(anciennes);
    expect(avant.length).toBeGreaterThan(10);

    utiliser(t);
    await demarrer();
    expect(colonnes('trainings')).toEqual([...anciennes, ...NOUVELLES]);
    expect(octets(anciennes)).toEqual(avant);
    // les anciennes seances gardent les colonnes vides
    expect(raw().prepare('select count(*) n from trainings where calories_source is not null or calories_appareil is not null or calories_mesurees is not null').get().n).toBe(0);
    expect(raw().prepare('pragma user_version').get().user_version).toBe(31);
  });

  test('copie de securite faite sans changement de numero de version, une seule fois', async () => {
    const t = await telephone302('copie');
    expect(copies(t)).toEqual([]);
    utiliser(t);
    await demarrer();
    const liste = copies(t);
    expect(liste).toHaveLength(1);
    const journal = JSON.parse(fs.readFileSync(path.join(t.docDir, 'yoroi_securite', liste[0], 'journal.json'), 'utf8'));
    expect(journal).toMatchObject({ db: 'ok', migrations: 'ok', schema: 31, to: '3.0.2 (40)', from: '3.0.2 (40) schema 30' });
    // la copie contient la base d'AVANT : sans les colonnes
    const { DatabaseSync } = require('node:sqlite');
    const copie = new DatabaseSync(path.join(t.docDir, 'yoroi_securite', liste[0], 'yoroi.db'));
    const cols = copie.prepare('pragma table_info(trainings)').all().map((c: any) => c.name);
    copie.close();
    expect(cols).not.toContain('calories_source');
    // relance : plus rien a copier
    utiliser(t);
    await demarrer();
    expect(copies(t)).toHaveLength(1);
  });

  test('l ancien declenchement par numero de version reste en place', async () => {
    const t = await telephone302('version');
    t.async.set('@yoroi_data_version', '3.0.1 (39)');
    raw().exec('pragma user_version = 31'); // schema deja a jour : seule la version declenche
    utiliser(t);
    await demarrer();
    expect(copies(t)).toHaveLength(1);
    expect(copies(t)[0]).toContain('_3.0.1-39_vers_3.0.2-40');
  });
});

describe('sauvegarde, restauration et corbeille', () => {
  const MONTRE = { calories: 512, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 512 };
  const lire = (db: any, id: number) => db.getTrainingById(id).then((r: any) => ({
    calories: r.calories, calories_source: r.calories_source, calories_appareil: r.calories_appareil, calories_mesurees: r.calories_mesurees,
  }));

  test('sauvegarde puis restauration sur un telephone neuf : les 3 valeurs reviennent', async () => {
    const t = nouveauTelephone('sauvegarde');
    utiliser(t);
    const { db, exp } = await demarrer();
    await db.addTraining({ sport: 'running', date: '2026-11-01', duration_minutes: 40, healthkit_uuid: 'HK-A', ...MONTRE });
    await db.addTraining({ sport: 'jjb', date: '2026-11-02', duration_minutes: 60, calories: 300, calories_source: 'saisie' });
    await db.addTraining({ sport: 'boxe', date: '2026-10-30', duration_minutes: 50, calories: 410 }); // ancienne facon : sans source
    expect(await exp.exportDataToJSON({ silent: true })).toBe(true);
    const file = fs.readdirSync(t.docDir).filter((f) => /^yoroi_backup_.*\.json$/.test(f)).sort().pop()!;
    const sauvegarde = JSON.parse(fs.readFileSync(`${t.docDir}/${file}`, 'utf8'));
    expect(sauvegarde.trainings.find((x: any) => x.healthkit_uuid === 'HK-A')).toMatchObject(MONTRE);

    utiliser(nouveauTelephone('restauration'));
    const r = await demarrer();
    expect(await r.exp.importDataFromBackupObject(sauvegarde)).toBe(true);
    const seances = raw().prepare('select sport, calories, calories_source, calories_appareil, calories_mesurees from trainings order by date').all();
    expect(seances).toEqual([
      { sport: 'boxe', calories: 410, calories_source: null, calories_appareil: null, calories_mesurees: null },
      { sport: 'running', calories: 512, calories_source: 'appareil', calories_appareil: 'Apple Watch', calories_mesurees: 512 },
      { sport: 'jjb', calories: 300, calories_source: 'saisie', calories_appareil: null, calories_mesurees: null },
    ]);
  });

  test('une sauvegarde d une version precedente (sans les champs) se restaure, colonnes vides', async () => {
    utiliser(nouveauTelephone('ancienne-sauvegarde'));
    const { exp } = await demarrer();
    const vieille = { version: '6.0', appName: 'Yoroi', trainings: [{ id: 1, sport: 'running', date: '2026-09-01', duration_minutes: 30, calories: 250, healthkit_uuid: 'HK-V' }] };
    expect(await exp.importDataFromBackupObject(vieille)).toBe(true);
    expect(raw().prepare('select calories, calories_source, calories_appareil, calories_mesurees from trainings').all())
      .toEqual([{ calories: 250, calories_source: null, calories_appareil: null, calories_mesurees: null }]);
  });

  test('corbeille puis restauration : les 3 valeurs reviennent', async () => {
    utiliser(nouveauTelephone('corbeille'));
    const { db } = await demarrer();
    const id = await db.addTraining({ sport: 'running', date: '2026-11-01', duration_minutes: 40, healthkit_uuid: 'HK-C', ...MONTRE });
    expect(await lire(db, id)).toEqual(MONTRE);
    const trashId = await db.deleteTraining(id);
    expect(trashId).toBeTruthy();
    expect(raw().prepare('select count(*) n from trainings').get().n).toBe(0);
    await db.restoreFromTrash(trashId);
    const r = raw().prepare('select id from trainings').all();
    expect(r).toHaveLength(1);
    expect(await lire(db, r[0].id)).toEqual(MONTRE);
  });
});
