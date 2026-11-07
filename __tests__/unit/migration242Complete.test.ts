/**
 * Verification complete du 19 octobre 2026 : un utilisateur de la 2.4.2 ne perd rien en passant a la 3.0.0.
 *
 * Les telephones de depart sont FABRIQUES PAR LE CODE PUBLIE DE LA 2.4.2, execute en test (voir
 * __tests__/fixtures/v2_4_2_genere/generateur_2_4_2.ts.txt) :
 *  - build23 : git 96cd0ea9 (commit « version 2.4.2 », build iOS 23, versionCode 51)
 *  - build24 : git aa308da4 (dernier etat 2.4.2, build iOS 24 : photos rangees dans AsyncStorage)
 * Base SQLite (schema exact + une ligne au moins dans CHAQUE table, toutes colonnes remplies),
 * AsyncStorage, trousseau, photos sur le disque, et les deux sauvegardes (claire et chiffree) faites
 * par la vraie fonction d'export de la 2.4.2.
 *
 * Ici tourne le VRAI code de la 3.0.0 sur une vraie base SQLite (node:sqlite), puis tout est relu.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { ANCIEN_DOSSIER, nouveauTelephone, utiliser, type Telephone } from '../helpers/telephone';

jest.mock('expo-sqlite', () => require('../helpers/expoSqliteNode.js'));
jest.mock('@/lib/security/logger', () => {
  const l = { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() };
  return { __esModule: true, default: l, logger: l, getRecentLogs: () => [], clearRecentLogs: () => undefined };
});
jest.mock('@react-native-async-storage/async-storage', () => require('../helpers/telephone').mockAsyncStorage());
jest.mock('expo-secure-store', () => require('../helpers/telephone').mockSecureStore());
jest.mock('expo-file-system/legacy', () => require('../helpers/telephone').mockFileSystem());
jest.mock('expo-file-system', () => require('../helpers/telephone').mockFileSystem());
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '3.0.0', ios: { buildNumber: '38' } } }, ExecutionEnvironment: {} }));
jest.mock('expo-crypto', () => {
  const c = require('crypto');
  return {
    CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
    digestStringAsync: async (_a: string, s: string) => c.createHash('sha256').update(s).digest('hex'),
    getRandomBytes: (n: number) => c.randomBytes(n),
    getRandomBytesAsync: async (n: number) => c.randomBytes(n),
    randomUUID: () => c.randomUUID(),
  };
});
jest.mock('expo-sharing', () => ({ isAvailableAsync: async () => false, shareAsync: async () => undefined }));
jest.mock('expo-document-picker', () => ({ getDocumentAsync: async () => ({ canceled: true }) }));
jest.mock('react-native-view-shot', () => ({ captureRef: async () => '' }));
jest.mock('@/utils/telemetry', () => ({ track: () => undefined }));
jest.mock('@/lib/passwordPromptController', () => ({ requestPassword: async () => (global as any).__motDePasse ?? null }));
// Fenetres de l'app : on appuie sur le bouton qui confirme (pas « Annuler ») et on garde les titres
jest.mock('@/components/yoroi/v2/fenetre/api', () => ({
  appAlert: (titre: string, _msg?: string, boutons?: { text: string; style?: string; onPress?: () => void }[]) => {
    ((global as any).__fenetres ??= []).push(titre);
    const ok = (boutons ?? []).find((x) => x.style !== 'cancel');
    if (ok?.onPress) setTimeout(ok.onPress, 0);
  },
}));

const FIX = path.join(__dirname, '..', 'fixtures', 'v2_4_2_genere');
const lire = (build: string, f: string) => fs.readFileSync(path.join(FIX, build, f), 'utf8');
const sub = (s: string) => s.split('__DOC__').join(ANCIEN_DOSSIER);
const sqlite = () => require('../helpers/expoSqliteNode.js');
const raw = () => sqlite().rawDatabase('yoroi.db');
const nodeSqlite = () => ((process as any).getBuiltinModule ? (process as any).getBuiltinModule('node:sqlite') : require('node:sqlite'));

/** Telephone d'un utilisateur 2.4.2, avec le dossier de l'app qui a change (comme a chaque mise a jour sur iPhone) */
function telephone(build: string, nom: string): Telephone {
  const t = nouveauTelephone(`${build}-${nom}`);
  const { DatabaseSync } = nodeSqlite();
  const db = new DatabaseSync(t.dbFile, { enableForeignKeyConstraints: false });
  db.exec(sub(lire(build, 'yoroi.sql')));
  db.close();
  for (const [k, v] of Object.entries(JSON.parse(sub(lire(build, 'asyncstorage.json'))))) t.async.set(k, String(v));
  for (const [k, v] of Object.entries(JSON.parse(sub(lire(build, 'securestore.json'))))) t.secure.set(k, String(v));
  for (const rel of JSON.parse(lire(build, 'documents.json')) as string[]) {
    fs.mkdirSync(path.dirname(path.join(t.docDir, rel)), { recursive: true });
    fs.writeFileSync(path.join(t.docDir, rel), Buffer.from(`IMG:${rel}`));
  }
  return t;
}

/** Toutes les lignes de toutes les tables, par rowid */
function photographier(db: any): Record<string, Record<string, Record<string, unknown>>> {
  const out: Record<string, Record<string, Record<string, unknown>>> = {};
  for (const { name } of db.prepare("select name from sqlite_master where type='table' and name not like 'sqlite_%'").all() as any[]) {
    out[name] = {};
    for (const r of db.prepare(`select rowid as __rowid, * from "${name}"`).all() as any[]) {
      const { __rowid, ...rest } = r;
      out[name][String(__rowid)] = { ...rest };
    }
  }
  return out;
}

async function demarrer30() {
  const db = require('@/lib/database');
  await db.initDatabase();
  // ce que fait app/_layout.tsx juste apres l'ouverture de la base
  await require('@/lib/v2/seances/dedupeMigration').runDedupeMigrationOnce();
  await require('@/lib/demoDataService').trimDemoFuture();
  require('@/lib/trainingJournalService').initTrainingJournalDB();
  await require('@/lib/trainingGoalsService').initTrainingGoalsDB();
  return { db, exp: require('@/lib/exportService'), st: require('@/lib/storage') };
}

/** Empreinte recalculee comme la 2.4.2 (pour un fichier modifie a la main dans les tests) */
function resigner(b: any) {
  const { integrity, ...rest } = b;
  const json = JSON.stringify(rest);
  return { ...rest, integrity: { ...(integrity ?? {}), algorithm: 'SHA-256', checksum: crypto.createHash('sha256').update(json).digest('hex'), byteLength: json.length } };
}

const sansCle = (o: any, cles: string[]) => Object.fromEntries(Object.entries(o).filter(([k]) => !cles.includes(k)));

describe.each(['build23', 'build24'])('2.4.2 %s : mise à jour sur place', (build) => {
  const meta = JSON.parse(lire(build, 'meta.json'));
  let t: Telephone;
  let avant: ReturnType<typeof photographier>;
  let asyncAvant: Map<string, string>;
  let secureAvant: Map<string, string>;
  let ctx: Awaited<ReturnType<typeof demarrer30>>;

  beforeAll(async () => {
    t = telephone(build, 'maj');
    const { DatabaseSync } = nodeSqlite();
    const d = new DatabaseSync(t.dbFile, { enableForeignKeyConstraints: false });
    avant = photographier(d);
    d.close();
    asyncAvant = new Map(t.async);
    secureAvant = new Map(t.secure);
    utiliser(t);
    ctx = await demarrer30();
  });

  test('la base de départ est complète : chaque table de la 2.4.2 a au moins une ligne', () => {
    expect(Object.keys(avant).length).toBeGreaterThanOrEqual(24);
    for (const [tb, rows] of Object.entries(avant)) expect({ tb, n: Object.keys(rows).length > 0 }).toEqual({ tb, n: true });
  });

  test('SQLite : aucune table, colonne ou ligne perdue, aucune valeur changée', () => {
    const apres = photographier(raw());
    const ecarts: string[] = [];
    for (const [tb, rows] of Object.entries(avant)) {
      if (!apres[tb]) { ecarts.push(`table ${tb} disparue`); continue; }
      for (const [rid, row] of Object.entries(rows)) {
        const neu = apres[tb][rid];
        if (!neu) { ecarts.push(`${tb} ligne ${rid} disparue`); continue; }
        for (const [col, v] of Object.entries(row)) {
          if (!(col in neu)) ecarts.push(`${tb}.${col} disparue`);
          else if (neu[col] !== v) ecarts.push(`${tb}.${col} ligne ${rid} : ${JSON.stringify(v)} -> ${JSON.stringify(neu[col])}`);
        }
      }
      // seule la table des pesees recoit des lignes : les pesees de l'ancien ecran, reprises du coffre (test plus bas)
      const ajout = tb === 'weights' ? 3 : 0;
      if (Object.keys(apres[tb]).length !== Object.keys(rows).length + ajout) ecarts.push(`${tb} : ${Object.keys(rows).length} -> ${Object.keys(apres[tb]).length} lignes`);
    }
    expect(ecarts).toEqual([]);
    expect(raw().prepare('pragma user_version').get().user_version).toBe(31);
  });

  test('SQLite : relu par les fonctions de la 3.0, même sens (unités, dates, identifiants)', async () => {
    const { db } = ctx;
    const p = await db.getProfile();
    expect(p).toMatchObject({ name: 'Karim', height_cm: 178, target_weight: 77.5, start_weight: 86.2, start_date: '2026-03-01', avatar_gender: 'homme', birth_date: '1992-10-20', weight_goal: 'lose', age: 33 });
    const w = await db.getWeights();
    expect(w).toHaveLength(7);
    expect(w.find((x: any) => x.date === '2026-05-10')).toMatchObject({ weight: 84.95, fat_percent: 19.4, water_percent: 55.2, bone_mass: 3.4, visceral_fat: 8, metabolic_age: 31, bmr: 1852, source: 'body_composition' });
    expect(w.find((x: any) => x.date === '2026-08-14')).toMatchObject({ weight: 82.4, fat_percent: 18.2, source: 'withings', note: 'à jeun' });
    expect(w.some((x: any) => x.date.startsWith('2026-07-01') && x.source === 'apple_health')).toBe(true);
    expect((await db.getLatestWeight()).weight).toBe(82.4);
    const m = await db.getMeasurements();
    expect(m).toHaveLength(2);
    expect(m.find((x: any) => x.date === '2026-05-10')).toMatchObject({ chest: 102.5, waist: 86, navel: 88, hips: 98, left_arm: 36, right_arm: 36.5, left_thigh: 58, right_thigh: 58.5, left_calf: 38, right_calf: 38.2, shoulders: 120, neck: 39 });
    const clubs = await db.getClubs();
    expect(clubs.map((c: any) => c.name).sort()).toEqual(['Basic Fit', 'Gracie Barra Marseille']);
    const tr = await db.getTrainings();
    expect(tr).toHaveLength(4);
    const jjb = tr.find((x: any) => x.sport === 'jjb');
    expect(jjb).toMatchObject({ date: '2026-08-11', start_time: '19:00', duration_minutes: 90, technique_rating: 4, intensity: 8, rounds: 6, round_duration: 5, club_name: 'Gracie Barra Marseille' });
    expect(jjb.combat_rounds[0]).toMatchObject({ partner: 'Alex', notes: 'garde haute' });
    const muscu = tr.find((x: any) => x.sport === 'musculation');
    expect(muscu.exercises).toEqual([{ name: 'Developpe couche', sets: 4, reps: 8, weight: 90 }, { name: 'Dips', sets: 3, reps: 12, weight: 0 }]);
    expect(muscu.club_name).toBe('Basic Fit');
    expect(tr.find((x: any) => x.sport === 'running')).toMatchObject({ distance: 8.4, calories: 610, heart_rate: 152, max_heart_rate: 181, healthkit_uuid: 'HK-UUID-0001' });
    expect(tr.find((x: any) => x.sport === 'velo')).toMatchObject({ pente: 2.5, speed: 28.4, resistance: 6, watts: 210, cadence: 88 });
    expect(await db.getTrashItems()).toHaveLength(1);
    const plan = await db.getWeeklyPlan();
    expect(plan).toHaveLength(2);
    expect(plan.find((x: any) => x.sport === 'jjb')).toMatchObject({ day_of_week: 0, time: '19:00', duration_minutes: 90, label: 'JJB du lundi' });
    const occ = await db.getSlotOccurrences('2026-08-10');
    expect(occ[0]).toMatchObject({ status: 'validated', training_id: jjb.id });
    expect(await db.getPhotos()).toHaveLength(1);
    expect((await db.getUnlockedAchievements()).sort()).toEqual(['first_weight', 'streak_7']);
    const inj = await db.getInjuries();
    expect(inj[0]).toMatchObject({ zone_id: 'knee_left', eva_score: 6, status: 'healing', fit_for_duty: 'restricted' });
    expect(await db.getEvaHistory(inj[0].id)).toHaveLength(1);
    expect(await db.getTreatments(inj[0].id)).toHaveLength(1);
    expect(await db.getReminders(inj[0].id)).toHaveLength(1);
    expect((await db.getCompetitions())[0]).toMatchObject({ nom: 'Open de Marseille', date: '2026-11-15', poids_max: 76 });
    const fighter = require('@/lib/fighterModeService');
    expect((await fighter.getCombats())[0]).toMatchObject({ resultat: 'victoire', technique: 'triangle', poids_pesee: 75.8 });
    expect((await fighter.getObjectifsPoids())[0]).toMatchObject({ poids_depart: 82.4, poids_cible: 76 });
    expect((await require('@/lib/trainingGoalsService').getAllGoals())[0]).toMatchObject({ sport_id: 'jjb', weekly_target: 3 });
    expect((await require('@/lib/objectivesService').getAllObjectives())[0]).toMatchObject({ title: 'Open de Marseille', target_weight: 76 });
    expect((await db.getHealthData('steps'))[0]).toMatchObject({ value: 10432, date: '2026-08-14' });
    const journal = require('@/lib/trainingJournalService');
    const items = journal.getProgressionItems();
    expect(items[0]).toMatchObject({ name: 'Triangle', sport: 'jjb', status: 'in_progress' });
    expect(journal.getPracticeLogsByItemId(items[0].id)).toHaveLength(1);
  });

  test('pesées et compositions de l’ancien écran (gardées dans le coffre) : visibles comme pesées dans la 3.0', async () => {
    // La 2.4.2 rangeait ces saisies dans le coffre seulement (app/entry.tsx, app/body-composition.tsx, import Sante
    // de lib/healthService.ts). La 3.0 ne lit ses pesees que dans la base : elles doivent y etre reprises, une fois.
    const w = await ctx.db.getWeights();
    const jour = (d: string) => w.filter((x: any) => String(x.date).slice(0, 10) === d);
    expect(jour('2026-04-01')).toEqual([expect.objectContaining({ weight: 85.5 })]);
    expect(jour('2026-06-01')).toEqual([expect.objectContaining({ weight: 84.1 })]);
    expect(jour('2026-06-15')).toEqual([expect.objectContaining({ weight: 83.7, fat_percent: 18.9, water_percent: 56.4, bone_mass: 3.3, visceral_fat: 7, metabolic_age: 30, bmr: 1830, muscle_kg: 64.2 })]);
    // meme jour, meme poids qu'une pesee de la base : pas de doublon
    expect(jour('2026-08-14')).toHaveLength(1);
    // le coffre n'est pas touche. 30 octobre 2026 (lib/v2/coffre/migrationCoffre.ts) : ces listes passent du coffre
    // a la base des donnees protegees ; la valeur relue est exactement celle de la 2.4.2, au caractere pres
    const coffre = require('@/lib/v2/coffre/migrationCoffre');
    const mesures = await coffre.lireCoffreBrut('@yoroi_measurements');
    const compo = await coffre.lireCoffreBrut('@yoroi_body_composition');
    expect(mesures).toBe(secureAvant.get('_yoroi_measurements'));
    expect(compo).toBe(secureAvant.get('_yoroi_body_composition'));
    expect(JSON.parse(mesures)).toHaveLength(3);
    expect(JSON.parse(compo)).toHaveLength(1);
  });

  test('AsyncStorage et trousseau : aucune clé effacée, aucune valeur réécrite', async () => {
    const perdues = [...asyncAvant.keys()].filter((k) => !t.async.has(k));
    const changees = [...asyncAvant.entries()].filter(([k, v]) => t.async.has(k) && t.async.get(k) !== v).map(([k]) => k);
    expect(perdues).toEqual([]);
    expect(changees).toEqual([]);
    // 30 octobre 2026 : une cle ne quitte le trousseau que si c'est une liste volumineuse rangee dans la base des
    // donnees protegees (etat « migre »), avec exactement la meme valeur ; toutes les autres restent, inchangees
    const coffre = require('@/lib/v2/coffre/migrationCoffre');
    const parties = [...secureAvant.keys()].filter((k) => !t.secure.has(k));
    for (const nom of parties) {
      const cle = (coffre.CLES_VOLUMINEUSES as readonly string[]).find((c) => coffre.nomCoffre(c) === nom);
      expect([nom, cle && coffre.estVolumineuse(cle)]).toEqual([nom, true]);
      const ligne = sqlite().rawDatabase(coffre.FICHIER_COFFRE).prepare('SELECT valeur, etat FROM donnees_protegees WHERE cle = ?').get(cle);
      expect(ligne).toEqual({ valeur: secureAvant.get(nom), etat: 'migre' });
    }
    const reecrites = [...secureAvant.entries()].filter(([k, v]) => t.secure.has(k) && t.secure.get(k) !== v).map(([k]) => k);
    expect(reecrites).toEqual([]);
  });

  test('réglages, photos, eau, humeur, sommeil, carnet, jeûne, mensurations rapides : relus par la 3.0', async () => {
    const { st } = ctx;
    expect(await st.getUserSettings()).toMatchObject({ username: 'Karim', gender: 'male', height: 178, targetWeight: 77.5, weight_unit: 'kg', measurement_unit: 'cm', onboardingCompleted: true });
    const photos = await st.getPhotosFromStorage();
    expect(photos).toHaveLength(2);
    expect(photos.map((p: any) => p.weight).sort()).toEqual([82.4, 84.9]);
    for (const p of photos) {
      expect(p.file_uri.startsWith(t.docUri)).toBe(true);
      expect(fs.existsSync(decodeURIComponent(p.file_uri.replace('file://', '')))).toBe(true);
    }
    expect((await ctx.db.getProfile()).profile_photo).toBe(`${t.docUri}profile/avatar.jpg`);
    expect(await st.getAllHydrationEntries()).toHaveLength(2);
    expect(await st.getHydrationSettings()).toMatchObject({ dailyGoal: 3200, reminderEnabled: true, reminderInterval: 90 });
    expect(await st.getMoods()).toHaveLength(1);
    expect((await require('@/lib/sleepService').getSleepEntries())[0]).toMatchObject({ bedTime: '23:30', wakeTime: '07:00', quality: 4 });
    const carnet = require('@/lib/carnetService');
    const bench = await carnet.getBenchmarks();
    expect(bench.find((b: any) => b.name === 'Developpe couche')?.entries).toHaveLength(1);
    expect((await carnet.getSkills()).find((s: any) => s.name === 'Triangle')).toBeTruthy();
    const fasting = require('@/lib/fasting');
    expect(await fasting.getFastingHistory()).toHaveLength(1);
    expect(await fasting.getCustomFastingSettings()).toMatchObject({ fastingHours: 16 });
    const mesures = await require('@/lib/v2/progres/measures').loadMeasures();
    expect(mesures.length).toBeGreaterThanOrEqual(3);
  });

  test('pas de nouvel onboarding : la 3.0 reconnaît l’utilisateur de la 2.4.2', async () => {
    const { etatUtilisateur } = require('@/lib/v2/onboarding/etatOuverture');
    const AS = require('@react-native-async-storage/async-storage').default;
    const st = require('@/lib/storage');
    const db = require('@/lib/database');
    const lecteurs = {
      getItem: (k: string) => AS.getItem(k), setItem: (k: string, v: string) => AS.setItem(k, v), removeItem: (k: string) => AS.removeItem(k),
      getSettings: () => st.getUserSettingsStrict(), saveSettings: (x: any) => st.saveUserSettings(x),
      getProfile: () => db.getProfile(), getTrainingsCount: () => db.getTrainingsCount(), getLatestWeight: () => db.getLatestWeight(),
      sleep: async () => undefined,
    };
    expect(await etatUtilisateur(lecteurs)).toMatchObject({ existant: true, raison: 'marqueur' });
    // utilisateur plus ancien, sans le marqueur : reconnu par sa base
    t.async.delete('yoroi_onboarding_done');
    expect(await etatUtilisateur(lecteurs)).toMatchObject({ existant: true, raison: 'profil_sqlite' });
    expect(t.async.get('yoroi_onboarding_done')).toBe('true');
  });

  test('Dojo : le rang de la 2.4.2 ne descend pas, les anciennes clés d’XP restent', async () => {
    const armure = require('@/lib/v2/armure');
    const ancienIdx = [0, 500, 2000, 5000, 10000].reduce((acc, s, i) => (meta.points >= s ? i : acc), 0);
    expect(ancienIdx).toBe(2); // Samouraï dans la 2.4.2 (3100 points)
    const snap = await armure.syncArmure(true);
    expect(snap.state.rank.index).toBeGreaterThanOrEqual(ancienIdx);
    for (const k of ['@yoroi_user_xp', '@yoroi_challenge_xp', '@yoroi_unified_total_points', '@yoroi_unlocked_badges']) expect(t.async.has(k)).toBe(true);
  });

  test('second lancement : rien ne bouge', async () => {
    const une = photographier(raw());
    utiliser(t);
    await demarrer30();
    const deux = photographier(raw());
    for (const tb of Object.keys(avant)) expect({ tb, rows: deux[tb] }).toEqual({ tb, rows: une[tb] });
  });
});

describe.each(['build23', 'build24'])('2.4.2 %s : import d’une sauvegarde', (build) => {
  const b242 = JSON.parse(lire(build, 'backup_2_4_2_complet.json'));
  const etat = async () => {
    const db = require('@/lib/database');
    const st = require('@/lib/storage');
    return {
      pesees: (await db.getWeights()).length, seances: (await db.getTrainings()).length, clubs: (await db.getClubs()).length,
      photos: (await st.getPhotosFromStorage()).length, eau: (await st.getAllHydrationEntries()).length,
      sommeil: (await require('@/lib/sleepService').getSleepEntries()).length, humeur: (await st.getMoods()).length,
      blessures: (await db.getInjuries()).length, competitions: (await db.getCompetitions()).length,
      planning: (await db.getWeeklyPlan()).length, objectifs: (await require('@/lib/trainingGoalsService').getAllGoals()).length,
      progression: require('@/lib/trainingJournalService').getProgressionItems().length,
      benchmarks: (await require('@/lib/carnetService').getBenchmarks()).length, skills: (await require('@/lib/carnetService').getSkills()).length,
    };
  };
  // 4 pesees de la base + 3 des listes du coffre (2026-04-01, 2026-06-01, 2026-06-15 ; le doublon du 2026-08-14 n'est pas recopie)
  const attendu = { pesees: 7, seances: 4, clubs: 2, photos: 2, eau: 2, sommeil: 1, humeur: 1, blessures: 1, competitions: 1, planning: 2, objectifs: 1, progression: 1, benchmarks: 0, skills: 0 };

  test('le fichier vient bien de l’export 2.4.2 (format 5.5, empreinte SHA-256)', () => {
    expect(b242.version).toBe('5.5');
    // Limites de l'export 2.4.2 (rien a recuperer : ces donnees ne sont pas dans le fichier) :
    // le carnet est lu sous '@yoroi_benchmarks_v2' alors qu'il vit sous 'yoroi_benchmarks_v2', il sort vide ;
    // build 23 : les mensurations de la base (table measurements) ne sont pas exportees, seule la liste rapide
    // du coffre l'est. Le build 24 exporte les deux.
    expect(b242.carnet).toEqual({ benchmarks: null, skills: null, trashBenchmarks: null, trashSkills: null });
    const tableMesures = b242.measurements.filter((m: any) => typeof m.id === 'number').length;
    expect(tableMesures).toBe(build === 'build23' ? 0 : 2);
    expect(b242.integrity.algorithm).toBe('SHA-256');
    expect(b242.photos.every((p: any) => typeof p.image_base64 === 'string')).toBe(true);
  });

  test('téléphone neuf : tout est importé, champ par champ, puis aucun doublon au second import', async () => {
    const t = nouveauTelephone(`${build}-imp`);
    utiliser(t);
    const { db, exp, st } = await demarrer30();
    expect(await exp.importDataFromBackupObject(b242)).toBe(true);
    expect(exp.getLastImportReport().failed).toBe(0);
    const apres = await etat();
    expect(apres).toEqual(attendu);
    // champ par champ
    const w = await db.getWeights();
    for (const src of b242.weights) {
      const neu = w.find((x: any) => x.date === src.date && x.weight === src.weight);
      expect(neu).toBeTruthy();
      for (const k of ['fat_percent', 'muscle_mass', 'water_percent', 'bone_mass', 'visceral_fat', 'metabolic_age', 'bmr', 'note', 'source']) {
        expect({ k, v: neu[k] ?? null }).toEqual({ k, v: src[k] ?? null });
      }
    }
    const tr = await db.getTrainings();
    for (const src of b242.trainings) {
      const neu = tr.find((x: any) => x.date === src.date && x.sport === src.sport);
      expect(neu).toBeTruthy();
      for (const k of ['duration_minutes', 'start_time', 'notes', 'muscles', 'distance', 'calories', 'heart_rate', 'healthkit_uuid', 'session_type', 'technique_rating', 'intensity', 'rounds', 'pente', 'watts', 'club_name']) {
        expect({ k, v: neu[k] ?? null }).toEqual({ k, v: src[k] ?? null });
      }
      expect(neu.exercises ?? null).toEqual(src.exercises ?? null);
      expect(neu.combat_rounds ?? null).toEqual(src.combat_rounds ?? null);
    }
    expect(await db.getProfile()).toMatchObject(sansCle(b242.profile, ['id', 'created_at', 'profile_photo', 'profile_photo_base64']));
    expect(await st.getUserSettings()).toMatchObject(sansCle(b242.userSettings, []));
    for (const p of await st.getPhotosFromStorage()) expect(fs.existsSync(decodeURIComponent(p.file_uri.replace('file://', '')))).toBe(true);
    expect(t.async.get('yoroi_theme_mode_v5')).toBe('light');
    expect(t.async.get('yoroi_theme_color_v5')).toBe('sakura');
    expect(t.async.get('@yoroi_language')).toBe('fr');
    expect(JSON.parse(t.async.get('@yoroi_sparring_partners')!)[0].name).toBe('Alex');
    expect(JSON.parse(t.async.get('@yoroi_personal_records')!)[0].value).toBe(140);
    // la 2.4.2 mettait les mensurations rapides (liste du coffre) dans « measurements »
    expect((await st.getAllMeasurements()).some((m: any) => m.waist === 88 && m.date === '2026-04-01')).toBe(true);
    if (build === 'build24') {
      const mes = await db.getMeasurements();
      expect(mes).toHaveLength(2);
      expect(mes.find((x: any) => x.date === '2026-05-10')).toMatchObject({ chest: 102.5, navel: 88, left_calf: 38, neck: 39 });
    }
    expect(JSON.parse(t.async.get('@yoroi_unlocked_badges')!)).toEqual(['first_step', 'week_streak']);
    const pp = (await db.getProfile()).profile_photo;
    expect(fs.existsSync(decodeURIComponent(String(pp).replace('file://', '')))).toBe(true);
    // second import
    await exp.importDataFromBackupObject(b242);
    expect(exp.getLastImportReport().imported).toBe(0);
    expect(await etat()).toEqual(attendu);
  });

  // Le chiffrement (lib/backupEncryption.ts) est identique dans les builds 23, 24 et la 3.0 : teste une fois (30 s)
  (build === 'build23' ? test : test.skip)('sauvegarde chiffrée de la 2.4.2 : bon mot de passe = tout revient, mauvais = rien n’est touché', async () => {
    const t = nouveauTelephone(`${build}-chiffre`);
    utiliser(t);
    const { exp } = await demarrer30();
    const uri = `${t.docUri}sauvegarde_chiffree.json`;
    fs.writeFileSync(decodeURIComponent(uri.replace('file://', '')), lire(build, 'backup_2_4_2_chiffre.json'));
    (global as any).__fenetres = [];
    (global as any).__motDePasse = 'mauvais';
    expect(await exp.importDataFromJSON(uri)).toBe(false);
    expect((global as any).__fenetres).toContain('Mot de passe incorrect');
    expect((await etat()).pesees).toBe(0);
    (global as any).__motDePasse = 'Kabuto2026!';
    expect(await exp.importDataFromJSON(uri)).toBe(true);
    expect((global as any).__fenetres).toContain('Import terminé');
    expect(await etat()).toEqual(attendu);
    (global as any).__motDePasse = undefined;
  }, 180000);

  test('champs inconnus (version plus récente) : importé sans erreur, champs inconnus ignorés', async () => {
    utiliser(nouveauTelephone(`${build}-inconnu`));
    const { exp, db } = await demarrer30();
    const b = JSON.parse(JSON.stringify(b242));
    b.champVenuDuFutur = { a: 1 };
    b.weights[0].champInconnu = 'x';
    b.trainings[0].autreChamp = 42;
    expect(await exp.importDataFromBackupObject(resigner(b))).toBe(true);
    expect(exp.getLastImportReport().failed).toBe(0);
    expect(await etat()).toEqual(attendu);
    expect((await db.getWeights()).some((w: any) => 'champInconnu' in w)).toBe(false);
  });

  test('champs ou rubriques manquants : le reste est importé', async () => {
    utiliser(nouveauTelephone(`${build}-manque`));
    const { exp, db } = await demarrer30();
    const b = JSON.parse(JSON.stringify(b242));
    delete b.photos; delete b.clubs; delete b.carnet; delete b.trainingJournal; delete b.profile;
    for (const w of b.weights) { delete w.source; delete w.note; delete w.id; delete w.created_at; }
    b.trainings[0] = { sport: b.trainings[0].sport, date: b.trainings[0].date };
    expect(await exp.importDataFromBackupObject(resigner(b))).toBe(true);
    expect(exp.getLastImportReport().failed).toBe(0);
    const e = await etat();
    expect(e).toMatchObject({ pesees: 7, seances: 4, clubs: 0, photos: 0, eau: 2, sommeil: 1 });
    expect((await db.getWeights()).every((w: any) => typeof w.weight === 'number')).toBe(true);
  });

  test('sans empreinte (fichier retouché à la main) : importé quand même', async () => {
    utiliser(nouveauTelephone(`${build}-sansempreinte`));
    const { exp } = await demarrer30();
    const { integrity, ...b } = b242;
    expect(integrity).toBeTruthy();
    expect(await exp.importDataFromBackupObject(b)).toBe(true);
    expect(await etat()).toEqual(attendu);
  });
});

describe('Anciennes sauvegardes (formats 1.0 et 3.0, construits selon le code de l’époque)', () => {
  test('format 1.0 (git 924f85d2) : réglages et pesées des mensurations repris, sans doublon', async () => {
    const t = nouveauTelephone('v10');
    utiliser(t);
    const { exp, db, st } = await demarrer30();
    const v10 = {
      version: '1.0', exportDate: '2025-12-15T10:00:00.000Z',
      userSettings: { weight_unit: 'kg', measurement_unit: 'cm', theme: 'classic', username: 'Ancien', gender: 'male', height: 180, targetWeight: 80 },
      measurements: [
        { id: 'm1', date: '2025-12-01', weight: 88.2, body_fat: 21.5, muscle_mass: 35, water: 54, visceral_fat: 9, metabolic_age: 34, bone_mass: 3.3, bmr: 1900, measurements: { waist: 92, chest: 104, left_arm: 37 }, notes: 'début', created_at: '2025-12-01T07:00:00.000Z' },
        { id: 'm2', date: '2025-12-08', weight: 87.4, created_at: '2025-12-08T07:00:00.000Z' },
      ],
    };
    expect(await exp.importDataFromBackupObject(v10)).toBe(true);
    expect(exp.getLastImportReport().failed).toBe(0);
    expect((await st.getUserSettings()).username).toBe('Ancien');
    const w = await db.getWeights();
    // les pesees du format 1.0 sont des pesees de la 3.0 (courbe, historique), composition comprise
    expect(w.map((x: any) => `${x.date.slice(0, 10)}:${x.weight}`).sort()).toEqual(['2025-12-01:88.2', '2025-12-08:87.4']);
    expect(w.find((x: any) => x.weight === 88.2)).toMatchObject({ fat_percent: 21.5, water_percent: 54, bone_mass: 3.3, visceral_fat: 9, metabolic_age: 34, bmr: 1900, muscle_kg: 35, note: 'début' });
    expect((await st.getAllMeasurements()).length).toBe(2);
    const n = (await db.getWeights()).length;
    await exp.importDataFromBackupObject(v10);
    expect((await db.getWeights()).length).toBe(n);
  });
});

describe('Reprise des pesées du coffre : prudente', () => {
  test('coffre illisible au lancement (iPhone verrouillé) : rien de marqué, reprise au lancement suivant', async () => {
    const t = telephone('build23', 'verrou');
    utiliser(t);
    const SecureStore = require('expo-secure-store');
    const vrai = SecureStore.getItemAsync;
    SecureStore.getItemAsync = async () => { throw new Error('User interaction is not allowed'); };
    const db = require('@/lib/database');
    await db.initDatabase();
    expect(await db.getWeights()).toHaveLength(4);
    expect(t.async.has('@yoroi_reprise_pesees_v1')).toBe(false);
    SecureStore.getItemAsync = vrai;
    utiliser(t);
    const db2 = require('@/lib/database');
    await db2.initDatabase();
    expect(await db2.getWeights()).toHaveLength(7);
  });

  test('données d’exemple du mode démo dans le coffre : jamais reprises comme pesées', async () => {
    const t = telephone('build23', 'demo');
    const liste = JSON.parse(t.secure.get('_yoroi_measurements')!);
    liste.push({ id: 'demo-1772410438493-w8gddw1s8', date: '2026-12-30', weight: 81.1, created_at: '2026-12-30T00:00:00.000Z' });
    t.secure.set('_yoroi_measurements', JSON.stringify(liste));
    utiliser(t);
    const db = require('@/lib/database');
    await db.initDatabase();
    expect((await db.getWeights()).some((w: any) => w.weight === 81.1)).toBe(false);
    expect(await db.getWeights()).toHaveLength(7);
  });

  test('reprise une seule fois : une copie écrite ensuite par la 3.0 dans le coffre ne recrée jamais une pesée supprimée', async () => {
    const t = telephone('build23', 'unefois');
    utiliser(t);
    const db = require('@/lib/database');
    await db.initDatabase();
    expect(t.async.has('@yoroi_reprise_pesees_v1_faite')).toBe(true);
    // la 3.0 range une copie de composition dans le coffre (lib/v2/pesee/save.ts), puis la pesee est supprimee
    // 30 octobre 2026 : le coffre de ces listes est la base des donnees protegees (lib/v2/coffre/migrationCoffre.ts)
    const coffre = require('@/lib/v2/coffre/migrationCoffre');
    const bc = JSON.parse((await coffre.lireCoffreBrut('@yoroi_body_composition'))!);
    expect(bc.length).toBeGreaterThan(0);
    bc.unshift({ id: 'bc_1800000000000', date: '2026-10-01', weight: 80.2, bodyFatPercent: 17, muscleMass: 0, boneMass: 0, waterPercent: 0, visceralFat: 0, source: 'manual' });
    await coffre.ecrireCoffreBrut('@yoroi_body_composition', JSON.stringify(bc));
    utiliser(t);
    const db2 = require('@/lib/database');
    await db2.initDatabase();
    expect((await db2.getWeights()).some((w: any) => w.weight === 80.2)).toBe(false);
  });

  test('une pesée reprise puis supprimée ne revient pas', async () => {
    const t = telephone('build23', 'supprimee');
    utiliser(t);
    const db = require('@/lib/database');
    await db.initDatabase();
    const w = (await db.getWeights()).find((x: any) => String(x.date).startsWith('2026-06-01'));
    await db.deleteWeight(w.id);
    utiliser(t);
    const db2 = require('@/lib/database');
    await db2.initDatabase();
    expect((await db2.getWeights()).some((x: any) => String(x.date).startsWith('2026-06-01'))).toBe(false);
    expect(await db2.getWeights()).toHaveLength(6);
  });
});

describe('Export 3.0 puis réimport 3.0 : sans perte', () => {
  test.each(['build23', 'build24'])('%s mis à jour, exporté, remis sur un téléphone neuf ligne pour ligne', async (build) => {
    const t = telephone(build, 'export30');
    utiliser(t);
    await demarrer30();
    const exp = require('@/lib/exportService');
    // 7 novembre 2026 : une sauvegarde silencieuse se fait sans les photos par defaut ; ce test verifie l'export complet
    expect(await exp.exportDataToJSON({ silent: true, includePhotos: true })).toBe(true);
    const file = fs.readdirSync(t.docDir).filter((f) => /^yoroi_backup_.*\.json$/.test(f)).sort().pop()!;
    const b30 = JSON.parse(fs.readFileSync(path.join(t.docDir, file), 'utf8'));
    expect(b30.version).toBe('6.0');
    const source = photographier(raw());
    const asyncSource = new Map(t.async);

    const neuf = nouveauTelephone(`${build}-neuf30`);
    utiliser(neuf);
    const n = await demarrer30();
    expect(await n.exp.importDataFromBackupObject(b30)).toBe(true);
    expect(n.exp.getLastImportReport().failed).toBe(0);
    const cible = photographier(raw());
    // contenu de chaque table, sans les identifiants internes ni les dates d'enregistrement
    // chemins de fichiers : recrees ailleurs sur le telephone neuf (verifies a part, plus bas)
    const IGN = new Set(['id', 'created_at', 'updated_at', 'sync_uid', 'unlocked_at', 'profile_photo', 'logo_uri']);
    const ID_LIES = new Set(['club_id', 'training_id', 'weekly_plan_id', 'injury_id', 'competition_id', 'item_id', 'treatment_id', 'original_id', 'deleted_at']);
    const norm = (rows: Record<string, Record<string, unknown>>) =>
      Object.values(rows).map((r) => JSON.stringify(Object.keys(r).sort().filter((k) => !IGN.has(k) && !ID_LIES.has(k)).map((k) => [k, r[k]]))).sort();
    const ecarts: string[] = [];
    for (const tb of Object.keys(source)) {
      if (['sync_state', 'sync_tombstones', 'app_metadata', 'events_catalog'].includes(tb)) continue;
      const a = norm(source[tb]);
      const b = norm(cible[tb] ?? {});
      if (JSON.stringify(a) !== JSON.stringify(b)) ecarts.push(`${tb}: ${a.length} -> ${b.length}\n  manque: ${a.filter((x) => !b.includes(x)).join('\n  ')}`);
    }
    expect(ecarts).toEqual([]);
    for (const k of ['@yoroi_sparring_partners', '@yoroi_personal_records', 'yoroi_theme_mode_v5', '@yoroi_language', '@yoroi_notification_settings', '@yoroi_smart_reminders_settings', '@yoroi_user_goals', '@yoroi_belt']) {
      expect({ k, v: neuf.async.get(k) }).toEqual({ k, v: asyncSource.get(k) });
    }
    expect((await n.st.getPhotosFromStorage()).length).toBe(2);
    const existe = (u: unknown) => typeof u === 'string' && fs.existsSync(decodeURIComponent(u.replace('file://', '')));
    expect(existe((await n.db.getProfile()).profile_photo)).toBe(true);
    expect(existe((await n.db.getClubs()).find((c: any) => c.name === 'Gracie Barra Marseille')?.logo_uri)).toBe(true);
    // second import : aucun doublon
    await n.exp.importDataFromBackupObject(b30);
    expect(n.exp.getLastImportReport().imported).toBe(0);
    const encore = photographier(raw());
    for (const tb of Object.keys(cible)) expect({ tb, n: Object.keys(encore[tb]).length }).toEqual({ tb, n: Object.keys(cible[tb]).length });
  });
});
