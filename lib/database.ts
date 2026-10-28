import * as SQLite from 'expo-sqlite';
import { lireCorbeilleCorps, restaurerCorps, supprimerAvecCorbeille } from '@/lib/corbeilleCorps';
import type { ElementCorbeilleCorps } from '@/lib/corbeilleCorps';
import { vitrineDb } from '@/lib/v2/visite/vitrine';
import { initTrainingJournalDB } from './trainingJournalService';
import { logger } from '@/lib/security/logger';
import { getDismissedImportIds } from '@/lib/v2/seances/dismissedImports';
import { reprendrePeseesDuCoffre } from './databaseReprisePesees';
import { traduire } from '@/lib/i18n/tr';
import { groupesDoublonsPesees, requeteMiseAJourPesee, requetePeseeExistante } from '@/lib/v2/pesee/miseAJourPesee';
import { joursDeSuitePesee, poidsDuJour, poidsDuJourDabord } from '@/lib/v2/pesee/poidsDuJour';
import type { LignePesee, ModifPesee } from '@/lib/v2/pesee/miseAJourPesee';
import { snapshotBeforeImport } from '@/lib/v2/sauvegarde/avantMiseAJour';

/** 28 octobre 2026 : copie de securite locale avant une suppression groupee. Jamais bloquante. */
const copieAvantSuppression = async (database: SQLite.SQLiteDatabase, raison: string): Promise<void> => {
  try {
    await snapshotBeforeImport(database, raison);
  } catch {
    // la suppression continue, elle a ete confirmee par l'utilisateur
  }
};

// ============================================
// YOROI DATABASE - STOCKAGE LOCAL SQLite
// ============================================

/** Returns true if the error is a benign "duplicate column" from ALTER TABLE ADD COLUMN */
const _isDuplicateColumnError = (e: unknown): boolean => {
  const msg = String((e as any)?.message ?? e).toLowerCase();
  return msg.includes('duplicate column') || msg.includes('already exists');
};

/** Log unexpected migration errors (not duplicate-column) */
const _logUnexpectedMigrationError = (e: unknown, context?: string): void => {
  if (!_isDuplicateColumnError(e)) {
    logger.warn(`DB migration error${context ? ` (${context})` : ''}:`, e);
  }
};

/**
 * Cache des colonnes existantes par table (rempli paresseusement à la première
 * lecture). Évite des PRAGMA table_info répétés.
 */
const _columnsCache = new Map<string, Set<string>>();

const _getTableColumns = async (database: SQLite.SQLiteDatabase, table: string): Promise<Set<string>> => {
  const cached = _columnsCache.get(table);
  if (cached) return cached;
  const rows = await database.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  const cols = new Set(rows.map(r => r.name));
  _columnsCache.set(table, cols);
  return cols;
};

/**
 * ALTER TABLE ADD COLUMN sécurisé : ne tente la migration que si la colonne
 * n'existe pas déjà. Évite les ~10 erreurs SQLite loggées au démarrage par le
 * module natif iOS (qui les print AVANT d'arriver à notre try/catch JS).
 *
 * Usage : await safeAddColumn(database, 'profile', 'current_weight', 'REAL');
 */
const safeAddColumn = async (
  database: SQLite.SQLiteDatabase,
  table: string,
  column: string,
  type: string,
): Promise<void> => {
  try {
    const cols = await _getTableColumns(database, table);
    if (cols.has(column)) return; // déjà là, on skip
    await database.execAsync(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`);
    cols.add(column); // mise à jour cache
  } catch (e) {
    _logUnexpectedMigrationError(e, `${table}.${column}`);
  }
};

/** Invalide le cache des colonnes pour une table (utile après schema reset) */
const _invalidateColumnsCache = (table?: string): void => {
  if (table) _columnsCache.delete(table);
  else _columnsCache.clear();
};

let db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<void> | null = null;

// Ouverture interne (sans attendre l'init - utilisé par initDatabase)
const _openReal = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('yoroi.db');
  return db;
};

// 18 octobre 2026 : pendant la visite guidee avec l'exemple, toute l'app lit et ecrit dans la base de la vitrine
// (en memoire, lib/v2/visite/vitrine.ts), jamais dans yoroi.db. Hors visite : la vraie base, comme avant.
const _openDB = async (): Promise<SQLite.SQLiteDatabase> => {
  const vitrine = vitrineDb();
  if (vitrine) return vitrine;
  return _openReal();
};

/** La vraie base, jamais la vitrine (la visite y lit seulement le schema) */
export const openRealDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  await initDatabase();
  return _openReal();
};

/** Visite guidee : cree les tables dans la base de la vitrine (memes migrations, aucune donnee, aucune copie de securite) */
export const prepareVitrineDatabase = async (vitrine: SQLite.SQLiteDatabase): Promise<void> => {
  // ici les migrations sont dans _performInit : le schema de la vitrine est recopie de la vraie base (lib/v2/visite/demoVisite.ts)
  _invalidateColumnsCache();
  void vitrine;
};

// Ouvrir la base de données (attend que l'init soit terminée)
export const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (_initPromise) await _initPromise;
  return _openDB();
};

// ============================================
// INITIALISATION DES TABLES
// ============================================

export const initDatabase = async () => {
  // Idempotent : si déjà en cours ou terminé, retourner la même promise
  if (_initPromise) return _initPromise;
  _initPromise = _performInit();
  return _initPromise;
};

const _performInit = async () => {
  const database = await _openReal();

  // Table Profil Utilisateur
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      height_cm INTEGER,
      target_weight REAL,
      start_weight REAL,
      start_date TEXT,
      avatar_gender TEXT DEFAULT 'homme',
      profile_photo TEXT,
      birth_date TEXT,
      weight_goal TEXT DEFAULT 'maintain',
      age INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations: ajouter les colonnes manquantes si la table existe déjà
  const profileMigrations = [
    'ALTER TABLE profile ADD COLUMN profile_photo TEXT;',
    'ALTER TABLE profile ADD COLUMN birth_date TEXT;',
    "ALTER TABLE profile ADD COLUMN weight_goal TEXT DEFAULT 'maintain';",
    'ALTER TABLE profile ADD COLUMN age INTEGER;',
  ];
  for (const migration of profileMigrations) {
    try {
      await database.execAsync(migration);
    } catch (e) { _logUnexpectedMigrationError(e, 'profile migration'); }
  }

  // Table Pesees (poids + composition)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS weights (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weight REAL NOT NULL,
      fat_percent REAL,
      muscle_percent REAL,
      water_percent REAL,
      bone_mass REAL,
      visceral_fat INTEGER,
      metabolic_age INTEGER,
      bmr INTEGER,
      note TEXT,
      source TEXT DEFAULT 'manual',
      date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table Mensurations
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS measurements (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chest REAL,
      waist REAL,
      hips REAL,
      left_arm REAL,
      right_arm REAL,
      left_thigh REAL,
      right_thigh REAL,
      left_calf REAL,
      right_calf REAL,
      left_forearm REAL,
      right_forearm REAL,
      shoulders REAL,
      neck REAL,
      date TEXT NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table Clubs/Salles
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS clubs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      sport TEXT NOT NULL,
      logo_uri TEXT,
      color TEXT,
      sessions_per_week INTEGER DEFAULT 3,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table Entraînements
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS trainings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      club_id INTEGER,
      sport TEXT NOT NULL,
      session_type TEXT,
      date TEXT NOT NULL,
      start_time TEXT,
      duration_minutes INTEGER,
      notes TEXT,
      muscles TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (club_id) REFERENCES clubs (id)
    );
  `);

  // Migration: ajouter les colonnes si elles n'existent pas
  await safeAddColumn(database, 'trainings', 'start_time', 'TEXT');

  await safeAddColumn(database, 'trainings', 'session_type', 'TEXT');

  await safeAddColumn(database, 'trainings', 'exercises', 'TEXT');

  await safeAddColumn(database, 'profile', 'profile_photo', 'TEXT');

  await safeAddColumn(database, 'trainings', 'technique_rating', 'INTEGER DEFAULT NULL');

  await safeAddColumn(database, 'trainings', 'session_types', 'TEXT');

  await safeAddColumn(database, 'trainings', 'technical_theme', 'TEXT');

  await safeAddColumn(database, 'trainings', 'distance', 'REAL');

  await safeAddColumn(database, 'trainings', 'calories', 'INTEGER');

  await safeAddColumn(database, 'trainings', 'intensity', 'INTEGER');

  await safeAddColumn(database, 'trainings', 'rounds', 'INTEGER');

  await safeAddColumn(database, 'trainings', 'round_duration', 'INTEGER');

  await safeAddColumn(database, 'trainings', 'is_outdoor', 'INTEGER DEFAULT 0');

  // 17 octobre 2026 : score des sports de match et cadre de la seance (salle, exterieur, maison)
  await safeAddColumn(database, 'trainings', 'score_for', 'INTEGER');
  await safeAddColumn(database, 'trainings', 'score_against', 'INTEGER');
  await safeAddColumn(database, 'trainings', 'lieu_type', 'TEXT');

  await safeAddColumn(database, 'trainings', 'pente', 'REAL');

  await safeAddColumn(database, 'trainings', 'speed', 'REAL');

  await safeAddColumn(database, 'trainings', 'resistance', 'INTEGER');

  await safeAddColumn(database, 'trainings', 'watts', 'INTEGER');

  await safeAddColumn(database, 'trainings', 'cadence', 'INTEGER');

  // Colonnes pour les details enrichis Apple Health (route GPS, météo, FC, splits)
  await safeAddColumn(database, 'trainings', 'healthkit_uuid', 'TEXT');

  await safeAddColumn(database, 'trainings', 'workout_details_json', 'TEXT');

  await safeAddColumn(database, 'trainings', 'heart_rate', 'INTEGER');

  await safeAddColumn(database, 'trainings', 'max_heart_rate', 'INTEGER');

  await safeAddColumn(database, 'trainings', 'min_heart_rate', 'INTEGER');

  await safeAddColumn(database, 'trainings', 'source', 'TEXT');

  await safeAddColumn(database, 'trainings', 'location_lat', 'REAL');

  await safeAddColumn(database, 'trainings', 'location_lon', 'REAL');

  await safeAddColumn(database, 'trainings', 'location_name', 'TEXT');

  await safeAddColumn(database, 'trainings', 'game_plan', 'TEXT');

  await safeAddColumn(database, 'trainings', 'what_worked', 'TEXT');

  await safeAddColumn(database, 'trainings', 'what_didnt_work', 'TEXT');

  await safeAddColumn(database, 'trainings', 'session_rating', 'INTEGER');

  await safeAddColumn(database, 'trainings', 'session_mood', 'TEXT');

  await safeAddColumn(database, 'weekly_plan', 'session_type', 'TEXT');

  await safeAddColumn(database, 'measurements', 'navel', 'REAL');

  // 26 octobre 2026 : tour d'avant-bras gauche et droit
  await safeAddColumn(database, 'measurements', 'left_forearm', 'REAL');
  await safeAddColumn(database, 'measurements', 'right_forearm', 'REAL');

  // Table Corbeille (trash) pour les séances supprimees
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS trash_trainings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      original_id INTEGER,
      club_id INTEGER,
      sport TEXT,
      session_type TEXT,
      date TEXT,
      start_time TEXT,
      duration_minutes INTEGER,
      notes TEXT,
      muscles TEXT,
      exercises TEXT,
      technique_rating INTEGER,
      session_types TEXT,
      technical_theme TEXT,
      distance REAL,
      calories INTEGER,
      intensity INTEGER,
      rounds INTEGER,
      round_duration INTEGER,
      is_outdoor INTEGER DEFAULT 0,
      pente REAL,
      speed REAL,
      resistance INTEGER,
      watts INTEGER,
      cadence INTEGER,
      created_at TEXT,
      deleted_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations trash_trainings (colonnes ajoutées après la création initiale)
  const trashMigrations = [
    `ALTER TABLE trash_trainings ADD COLUMN heart_rate INTEGER`,
    `ALTER TABLE trash_trainings ADD COLUMN max_heart_rate INTEGER`,
    `ALTER TABLE trash_trainings ADD COLUMN location_lat REAL`,
    `ALTER TABLE trash_trainings ADD COLUMN location_lon REAL`,
    `ALTER TABLE trash_trainings ADD COLUMN location_name TEXT`,
    `ALTER TABLE trash_trainings ADD COLUMN combat_rounds TEXT`,
  ];
  for (const sql of trashMigrations) {
    try { await database.execAsync(sql); } catch (e) { _logUnexpectedMigrationError(e); }
  }

  // Auto-clean trash older than 30 days
  try {
    await database.execAsync(
      `DELETE FROM trash_trainings WHERE deleted_at < datetime('now', '-30 days')`
    );
  } catch (e) { logger.warn('DB: auto-clean trash error:', e); }

  // Table Planning Semaine Type
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS weekly_plan (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL,
      club_id INTEGER,
      sport TEXT NOT NULL,
      time TEXT,
      duration_minutes INTEGER,
      muscles TEXT,
      is_rest_day INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (club_id) REFERENCES clubs (id)
    );
  `);

  // Table Photos
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uri TEXT NOT NULL,
      weight REAL,
      fat_percent REAL,
      muscle_percent REAL,
      date TEXT NOT NULL,
      is_blurred INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table Badges Debloques
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      unlocked_at TEXT NOT NULL
    );
  `);

  // ============================================
  // TABLES YOROI MEDIC - SUIVI BLESSURES
  // ============================================

  // Table Blessures
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS injuries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id TEXT NOT NULL,
      zone_view TEXT NOT NULL,
      pain_type TEXT NOT NULL,
      cause TEXT NOT NULL,
      eva_score INTEGER NOT NULL,
      notes TEXT,
      date TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      fit_for_duty TEXT DEFAULT 'operational',
      healed_at TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table Historique EVA
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS injury_eva_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      injury_id INTEGER NOT NULL,
      eva_score INTEGER NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (injury_id) REFERENCES injuries (id) ON DELETE CASCADE
    );
  `);

  // Table Traitements
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS injury_treatments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      injury_id INTEGER NOT NULL,
      treatment_type TEXT NOT NULL,
      custom_description TEXT,
      date TEXT NOT NULL,
      completed INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (injury_id) REFERENCES injuries (id) ON DELETE CASCADE
    );
  `);

  // Table Rappels de Traitement
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS treatment_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      injury_id INTEGER NOT NULL,
      treatment_type TEXT NOT NULL,
      frequency TEXT NOT NULL,
      time TEXT,
      next_reminder_date TEXT NOT NULL,
      enabled INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (injury_id) REFERENCES injuries (id) ON DELETE CASCADE
    );
  `);

  // ============================================
  // TABLES MODE FIGHTER / COMPETITEUR
  // ============================================

  // Table Competitions
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS competitions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      date TEXT NOT NULL,
      lieu TEXT,
      type_evenement TEXT,
      sport TEXT NOT NULL,
      categorie_poids TEXT,
      poids_max REAL,
      statut TEXT DEFAULT 'a_venir',
      lien_inscription TEXT,
      rappels_actifs INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations: Ajouter les colonnes manquantes pour les bases existantes
  const competitionsColumnsToAdd = [
    'type_evenement TEXT',
    'lien_inscription TEXT',
    'resultat TEXT',
    'placement TEXT',
    'adversaires INTEGER',
    'victoires INTEGER',
    'defaites INTEGER',
    'notes TEXT',
    'temps_total TEXT',
  ];
  for (const column of competitionsColumnsToAdd) {
    // Format: 'colName TYPE' → split sur le premier espace
    const spaceIdx = column.indexOf(' ');
    const colName = spaceIdx > 0 ? column.slice(0, spaceIdx) : column;
    const colType = spaceIdx > 0 ? column.slice(spaceIdx + 1) : 'TEXT';
    await safeAddColumn(database, 'competitions', colName, colType);
  }

  // Table Combats
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS combats (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER,
      date TEXT NOT NULL,
      resultat TEXT NOT NULL,
      methode TEXT,
      technique TEXT,
      round INTEGER,
      temps TEXT,
      adversaire_nom TEXT,
      adversaire_club TEXT,
      poids_pesee REAL,
      poids_jour_j REAL,
      notes TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competition_id) REFERENCES competitions(id)
    );
  `);

  // Table Hydratation
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS hydratation (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      heure TEXT NOT NULL,
      quantite_ml INTEGER NOT NULL,
      type TEXT DEFAULT 'eau',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table Objectifs Poids
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS objectifs_poids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competition_id INTEGER,
      poids_depart REAL NOT NULL,
      poids_cible REAL NOT NULL,
      date_pesee TEXT NOT NULL,
      statut TEXT DEFAULT 'en_cours',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (competition_id) REFERENCES competitions(id)
    );
  `);

  // Table des objectifs d'entraînement
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS training_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sport_id TEXT NOT NULL UNIQUE,
      weekly_target INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table Events Catalog (Catalogue d'événements sportifs)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS events_catalog (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      date_start TEXT NOT NULL,
      city TEXT,
      country TEXT,
      full_address TEXT,
      category TEXT NOT NULL,
      sport_tag TEXT NOT NULL,
      registration_link TEXT,
      federation TEXT,
      image_logo_url TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Index pour améliorer les performances de recherche
  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_date ON events_catalog(date_start);`);
  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_category ON events_catalog(category);`);
  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_sport ON events_catalog(sport_tag);`);
  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_country ON events_catalog(country);`);

  // Table Données de santé (pas, calories, FC, sommeil, etc.)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS health_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      type TEXT NOT NULL,
      value REAL,
      value2 REAL,
      value3 REAL,
      value4 REAL,
      unit TEXT,
      source TEXT DEFAULT 'apple_health',
      metadata TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(date, type, source)
    );
  `);

  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_health_date ON health_data(date);`);
  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_health_type ON health_data(type);`);

  // Index sur trainings pour améliorer les performances des requêtes fréquentes
  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_trainings_date ON trainings(date);`);
  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_trainings_sport ON trainings(sport);`);
  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_trainings_club_id ON trainings(club_id);`);

  // Index essentiels pour les écrans Stats (filtres par date fréquents).
  // Sans ces index, chaque SELECT ... WHERE date >= ? faisait un full-scan.
  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_weights_date ON weights(date);`);
  // BALANCE_PHOTO : tout ce que donne une balance a impedance (Tanita BC-545N : segments, morphologie, muscle en kg)
  for (const col of WEIGHT_SCALE_COLUMNS) await safeAddColumn(database, 'weights', col, 'REAL');
  // BALANCE 2 : toutes les autres mesures de la balance, en JSON (migration sure, ADD COLUMN seulement)
  await safeAddColumn(database, 'weights', 'scale_extras', 'TEXT');
  await database.execAsync(`CREATE INDEX IF NOT EXISTS idx_measurements_date ON measurements(date);`);

  // Migration: Ajouter label sur weekly_plan
  await safeAddColumn(database, 'weekly_plan', 'label', 'TEXT');

  // Migration: Ajouter session_type sur weekly_plan (web)
  await safeAddColumn(database, 'weekly_plan', 'session_type', 'TEXT');

  // Migration: Ajouter weekly_plan_id sur trainings
  await safeAddColumn(database, 'trainings', 'weekly_plan_id', 'INTEGER');

  // Table Slot Occurrences - suivi hebdomadaire des créneaux
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS slot_occurrences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekly_plan_id INTEGER NOT NULL,
      week_start TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      training_id INTEGER,
      cancel_reason TEXT,
      injury_id INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (weekly_plan_id) REFERENCES weekly_plan(id) ON DELETE CASCADE,
      FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE SET NULL,
      FOREIGN KEY (injury_id) REFERENCES injuries(id) ON DELETE SET NULL,
      UNIQUE(weekly_plan_id, week_start)
    );
  `);

  // Initialiser le carnet d'entraînement
  await initTrainingJournalDB();

  // 19 octobre 2026 : pesees de l'ancien ecran (coffre seulement dans la 2.4.2) reprises dans la table, une fois
  await reprendrePeseesDuCoffre(database).catch(() => 0);
};

// ============================================
// TYPES
// ============================================

export interface Profile {
  id?: number;
  name: string;
  height_cm?: number;
  target_weight?: number;
  start_weight?: number;
  start_date?: string;
  avatar_gender?: 'homme' | 'femme';
  profile_photo?: string | null; // URI de la photo custom, null = utiliser avatar
  birth_date?: string; // Date de naissance au format YYYY-MM-DD
  weight_goal?: 'lose' | 'maintain' | 'gain'; // Objectif poids
  age?: number; // Âge calculé ou saisi manuellement
  created_at?: string;
}

export interface Weight {
  id?: number;
  weight: number;
  fat_percent?: number;
  muscle_percent?: number;
  water_percent?: number;
  bone_mass?: number;
  visceral_fat?: number;
  metabolic_age?: number;
  bmr?: number;
  note?: string;
  source?: string;  // 'manual', 'body_composition', 'withings', 'garmin', etc.
  date: string;
  // BALANCE_PHOTO : composition detaillee d'une balance (import photo), colonnes optionnelles
  muscle_kg?: number;
  fat_kg?: number;
  bmi_scale?: number;
  physique_rating?: number;
  fat_arm_right?: number;
  fat_arm_left?: number;
  fat_trunk?: number;
  fat_leg_right?: number;
  fat_leg_left?: number;
  muscle_arm_right?: number;
  muscle_arm_left?: number;
  muscle_trunk?: number;
  muscle_leg_right?: number;
  muscle_leg_left?: number;
  /** BALANCE 2 : autres mesures de la balance, JSON (lib/v2/balance/format.ts, ScaleJson) */
  scale_extras?: string | null;
  created_at?: string;
  // Body measurements (optional, can be saved with weight)
  waist?: number;
  navel?: number;
  chest?: number;
  arm?: number;
  thigh?: number;
  hips?: number;
  neck?: number;
  calf?: number;
}

export interface Measurement {
  id?: number;
  chest?: number;
  waist?: number;
  navel?: number;
  hips?: number;
  left_arm?: number;
  right_arm?: number;
  left_thigh?: number;
  right_thigh?: number;
  left_calf?: number;
  right_calf?: number;
  left_forearm?: number;
  right_forearm?: number;
  shoulders?: number;
  neck?: number;
  date: string;
  created_at?: string;
  // Alias properties for compatibility (uses left values if available)
  arms?: number;
  thighs?: number;
}

export interface Club {
  id?: number;
  name: string;
  sport: string;
  logo_uri?: string;
  color?: string;
  bio?: string;
  address?: string;
  links?: string; // JSON string of PartnerLink[]
  sessions_per_week?: number; // Nouveau: objectif hebdo
  created_at?: string;
}

export interface ExerciseSet {
  weight: number;
  reps: number;
  type?: 'normal' | 'warmup' | 'dropset' | 'superset';
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight: number; // en kg
  muscle_group?: string;
  distance?: number;
  duration?: number;
  calories?: number;
  pace?: string;
  stairs?: number;
  setsData?: ExerciseSet[]; // Séries détaillées (poids/reps par série)
  notes?: string;           // Notes libres pour cet exercice
}

export interface CombatRound {
  number: number;
  partner?: string;
  partnerRating?: number; // Note de l'adversaire/partenaire (1-10)
  result?: 'win' | 'loss' | 'draw';
  method?: string;
  methodsGiven?: string[];   // Finitions / soumissions données (liste)
  methodsTaken?: string[];   // Finitions / soumissions reçues (liste)
  submissionsGiven?: number;
  submissionsTaken?: number;
  pointsFor?: number;        // Points marqués dans ce round
  pointsAgainst?: number;    // Points concédés dans ce round
  roundIntensity?: 'guerre' | 'technique' | 'detendu'; // Intensité perçue par round
  usedTechniques?: { label: string; pts: number; count: number }[]; // Techniques utilisées
  notes?: string;
  // Analyse de round (suivi sparring)
  gamePlan?: string;       // Stratégie / game plan prévu
  whatWorked?: string;     // Ce qui a marché
  whatDidntWork?: string;  // Ce qui n'a pas marché
  counteredBy?: string;    // Par quoi l'adversaire t'a contré
  improvement?: string;    // Piste d'amélioration pour la prochaine fois
  // Nouveaux champs premium (Hedi n'a pas pensé mais les users kifferont)
  selfRating?: number;     // Auto-évaluation du round (1-10)
  mood?: string;           // Mood / ressenti (chaîne : fire, strong, tired, focus, gassed, confused)
  energyLevel?: number;    // Niveau d'énergie dans ce round (1-10)
}

export interface Training {
  id?: number;
  club_id?: number;
  sport: string;
  session_type?: string;
  session_types?: string; // JSON array of session types (cours, sparring, drilling, etc.)
  date: string;
  start_time?: string;
  duration_minutes?: number;
  duration?: number; // Alias for duration_minutes (compatibility)
  intensity?: number; // RPE 1-10 (compatibility)
  category?: string; // Alias for session_type (compatibility)
  notes?: string;
  muscles?: string; // JSON array of muscle groups
  technical_theme?: string; // Technical theme for combat sports (e.g., "Passage de garde", "Triangle")
  distance?: number; // Distance en km
  calories?: number; // Calories brûlées
  heart_rate?: number; // Rythme cardiaque moyen
  min_heart_rate?: number; // Rythme cardiaque min
  max_heart_rate?: number; // Rythme cardiaque max
  source?: string; // Source (apple_watch, garmin, samsung, manual, etc.)
  rounds?: number; // Nombre de rounds
  round_duration?: number; // Durée d'un round en minutes
  pente?: number; // Inclinaison
  speed?: number; // Vitesse (km/h)
  resistance?: number; // Niveau de résistance
  watts?: number; // Puissance
  cadence?: number; // RPM
  exercises?: Exercise[]; // For musculation workouts
  technique_rating?: number | null; // 1-5 stars rating
  is_outdoor?: boolean; // true si entraînement en extérieur
  score_for?: number | null; // score des sports de match, pour toi
  score_against?: number | null; // score en face
  lieu_type?: 'salle' | 'exterieur' | 'maison' | null; // cadre choisi a la saisie
  created_at?: string;
  combat_rounds?: CombatRound[];
  // Apple Health enriched data
  healthkit_uuid?: string;           // UUID HealthKit pour lazy-load des details
  workout_details_json?: string;     // JSON complet (route GPS, FC, splits, météo)
  weekly_plan_id?: number;
  // Lieu d'entraînement (GPS capture manuelle)
  location_lat?: number;
  location_lon?: number;
  location_name?: string;
  // Game Plan & Bilan (combat sports)
  game_plan?: string;
  what_worked?: string;
  what_didnt_work?: string;
  session_rating?: number | null;
  session_mood?: string;
  // Joined fields
  club_name?: string;
  club_logo?: string;
  club_color?: string;
}

export interface WeeklyPlan {
  id?: number;
  day_of_week: number; // 0-6 (Lundi-Dimanche)
  club_id?: number;
  sport: string;
  time?: string;
  duration_minutes?: number;
  muscles?: string;
  is_rest_day?: boolean;
  session_type?: string;
  label?: string;
  created_at?: string;
  // Joined fields
  club_name?: string;
  club_logo?: string;
  club_color?: string;
}

export interface SlotOccurrence {
  id?: number;
  weekly_plan_id: number;
  week_start: string;
  status: 'pending' | 'validated' | 'cancelled' | 'skipped';
  training_id?: number;
  cancel_reason?: string;
  injury_id?: number;
  created_at?: string;
}

export interface Photo {
  id?: number;
  uri: string;
  weight?: number;
  fat_percent?: number;
  muscle_percent?: number;
  date: string;
  is_blurred?: boolean;
  created_at?: string;
}

// ============================================
// TYPES YOROI MEDIC - SUIVI BLESSURES
// ============================================

export interface Injury {
  id?: number;
  zone_id: string;
  zone_view: 'front' | 'back';
  pain_type: string;
  cause: string;
  eva_score: number; // 0-10
  notes?: string;
  date: string;
  status: 'active' | 'healing' | 'healed';
  fit_for_duty: 'operational' | 'restricted' | 'unfit';
  healed_at?: string;
  created_at?: string;
  estimated_recovery_days?: number;
  // Joined fields
  zone_name?: string;
}

export interface InjuryEvaHistory {
  id?: number;
  injury_id: number;
  eva_score: number; // 0-10
  date: string;
  notes?: string;
  created_at?: string;
}

export interface InjuryTreatment {
  id?: number;
  injury_id: number;
  treatment_type: string;
  custom_description?: string;
  date: string;
  completed: boolean;
  notes?: string;
  created_at?: string;
}

export interface TreatmentReminder {
  id?: number;
  injury_id: number;
  treatment_type: string;
  frequency: 'daily' | 'twice_daily' | 'three_times_daily' | 'weekly' | 'as_needed';
  time?: string;
  next_reminder_date: string;
  enabled: boolean;
  created_at?: string;
}

export interface Competition {
  id?: number;
  nom: string;
  date: string;
  lieu?: string;
  sport: string;
  type_evenement?: string; // "Combat", "Match", "Course", "Compétition", etc.
  categorie_poids?: string;
  poids_max?: number;
  statut?: 'a_venir' | 'en_cours' | 'termine';
  lien_inscription?: string;
  rappels_actifs?: boolean;
  created_at?: string;
}

// ============================================
// FONCTIONS CRUD - PROFIL
// ============================================

export const getProfile = async (): Promise<Profile | null> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<Profile>('SELECT * FROM profile LIMIT 1');
  return result || null;
};

export const saveProfile = async (profile: Profile): Promise<void> => {
  const database = await openDatabase();
  const existing = await getProfile();

  // Vérification et fallback pour le nom
  const safeName = profile.name?.trim() || 'Champion';

  // Migration: ajouter les colonnes si elles n'existent pas
  try {
    await database.runAsync(`ALTER TABLE profile ADD COLUMN birth_date TEXT`);
  } catch (e) {
    _logUnexpectedMigrationError(e, 'saveProfile birth_date');
  }
  try {
    await database.runAsync(`ALTER TABLE profile ADD COLUMN weight_goal TEXT`);
  } catch (e) {
    _logUnexpectedMigrationError(e, 'saveProfile weight_goal');
  }
  try {
    await database.runAsync(`ALTER TABLE profile ADD COLUMN age INTEGER`);
  } catch (e) {
    _logUnexpectedMigrationError(e, 'saveProfile age');
  }

  if (existing) {
    await database.runAsync(
      `UPDATE profile SET name = ?, height_cm = ?, target_weight = ?, start_weight = ?,
       start_date = ?, avatar_gender = ?, profile_photo = ?, birth_date = ?, weight_goal = ?, age = ? WHERE id = ?`,
      [safeName, profile.height_cm || null, profile.target_weight || null,
       profile.start_weight || null, profile.start_date || null,
       profile.avatar_gender || 'homme', profile.profile_photo || null,
       profile.birth_date || null, profile.weight_goal || null, profile.age || null, existing.id!]
    );
  } else {
    await database.runAsync(
      `INSERT INTO profile (name, height_cm, target_weight, start_weight, start_date, avatar_gender, profile_photo, birth_date, weight_goal, age)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [safeName, profile.height_cm || null, profile.target_weight || null,
       profile.start_weight || null, profile.start_date || null, profile.avatar_gender || 'homme',
       profile.profile_photo || null, profile.birth_date || null, profile.weight_goal || null, profile.age || null]
    );
  }
};

// ============================================
// FONCTIONS CRUD - POIDS
// ============================================

// BALANCE_PHOTO : colonnes ajoutees a weights (migration sure, ALTER TABLE ADD COLUMN seulement)
export const WEIGHT_SCALE_COLUMNS = [
  'muscle_kg', 'fat_kg', 'bmi_scale', 'physique_rating',
  'fat_arm_right', 'fat_arm_left', 'fat_trunk', 'fat_leg_right', 'fat_leg_left',
  'muscle_arm_right', 'muscle_arm_left', 'muscle_trunk', 'muscle_leg_right', 'muscle_leg_left',
] as const;
export type WeightScaleExtras = Partial<Record<(typeof WEIGHT_SCALE_COLUMNS)[number], number>>;

const hasScaleExtras = (data: WeightScaleExtras): boolean =>
  WEIGHT_SCALE_COLUMNS.some((k) => typeof data[k] === 'number' && Number.isFinite(data[k] as number) && (data[k] as number) > 0);

/** Ecrit les mesures detaillees d'une pesee (seulement celles fournies, les autres restent) */
export const updateWeightScaleExtras = async (id: number, data: WeightScaleExtras): Promise<void> => {
  const sets: string[] = [];
  const values: (number | string)[] = [];
  for (const k of WEIGHT_SCALE_COLUMNS) {
    const v = data[k];
    if (typeof v === 'number' && Number.isFinite(v) && v > 0) {
      sets.push(`${k} = ?`);
      values.push(v);
    }
  }
  if (!sets.length) return;
  const database = await openDatabase();
  values.push(id);
  await database.runAsync(`UPDATE weights SET ${sets.join(', ')} WHERE id = ?`, values);
};

/** BALANCE 2 : ecrit la colonne JSON scale_extras d'une pesee (texte deja fusionne avec l'ancien) */
export const updateWeightScaleJson = async (id: number, json: string | null): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('UPDATE weights SET scale_extras = ? WHERE id = ?', [json, id]);
};

export const addWeight = async (data: Weight): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO weights (weight, fat_percent, muscle_percent, water_percent, bone_mass,
     visceral_fat, metabolic_age, bmr, note, source, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.weight, data.fat_percent || null, data.muscle_percent || null,
     data.water_percent || null, data.bone_mass || null, data.visceral_fat || null,
     data.metabolic_age || null, data.bmr || null, data.note || null,
     data.source || 'manual', data.date]
  );
  // BALANCE_PHOTO : segments et morphologie si la pesee les porte
  if (result?.lastInsertRowId && hasScaleExtras(data)) await updateWeightScaleExtras(result.lastInsertRowId, data);

  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert weight record');
  }

  // Sauvegarder les mensurations si présentes
  const hasMeasurements = data.waist || data.navel || data.chest || data.arm || data.thigh ||
                          data.hips || data.neck || data.calf;
  if (hasMeasurements) {
    await database.runAsync(
      `INSERT INTO measurements (chest, waist, navel, hips, left_arm, right_arm, left_thigh,
       right_thigh, left_calf, right_calf, neck, date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [data.chest || null, data.waist || null, data.navel || null, data.hips || null,
       data.arm || null, data.arm || null, data.thigh || null, data.thigh || null,
       data.calf || null, data.calf || null, data.neck || null, data.date]
    );
  }

  return result.lastInsertRowId;
};

/**
 * Insère ou met à jour une entrée de poids de manière idempotente.
 * Utilisé par l'import CSV pour éviter les doublons quand l'utilisateur
 * importe plusieurs fois le même fichier (ou un fichier avec des lignes dupliquées).
 * Une entrée existante est repérée par (date, source) pour les imports, et par (date, source, même poids)
 * pour une saisie à la main (deux pesées du jour restent deux pesées). Si trouvée, on met à jour
 * les colonnes non-nulles du nouveau enregistrement. Sinon, on insère.
 *
 * @returns { action: 'inserted' | 'updated', id: number }
 */
export const upsertWeight = async (
  data: Weight
): Promise<{ action: 'inserted' | 'updated'; id: number }> => {
  const database = await openDatabase();
  const source = data.source || 'manual';

  // 28 octobre 2026 : une pesee a la main n'est plus remplacee par la suivante du meme jour (requetePeseeExistante)
  const q = requetePeseeExistante({ date: data.date, source, weight: data.weight });
  const existing = await database.getFirstAsync<{ id: number }>(q.sql, q.values);

  if (existing?.id) {
    // UPDATE : ne remplace que les colonnes non-nulles du nouveau record
    const updates: string[] = [];
    const values: any[] = [];
    const cols: Array<[string, any]> = [
      ['weight', data.weight],
      ['fat_percent', data.fat_percent],
      ['muscle_percent', data.muscle_percent],
      ['water_percent', data.water_percent],
      ['bone_mass', data.bone_mass],
      ['visceral_fat', data.visceral_fat],
      ['metabolic_age', data.metabolic_age],
      ['bmr', data.bmr],
      ['note', data.note],
    ];
    for (const [col, val] of cols) {
      if (val != null && val !== '') {
        updates.push(`${col} = ?`);
        values.push(val);
      }
    }
    if (updates.length > 0) {
      values.push(existing.id);
      await database.runAsync(
        `UPDATE weights SET ${updates.join(', ')} WHERE id = ?`,
        values
      );
    }
    return { action: 'updated', id: existing.id };
  }

  // INSERT
  const id = await addWeight(data);
  return { action: 'inserted', id };
};

/**
 * Supprime les doublons dans la table `weights`.
 * Deux entrées sont considérées doublons si elles ont la même `date` ET la même `source`.
 * Stratégie : pour chaque groupe, on fusionne les valeurs (on garde la première valeur
 * non-null rencontrée pour chaque colonne) sur l'entrée avec l'id le plus bas,
 * puis on supprime les autres.
 *
 * @returns { removed: nombre d'entrées supprimées, kept: nombre d'entrées restantes }
 */
export const deduplicateWeights = async (): Promise<{ removed: number; kept: number }> => {
  const database = await openDatabase();
  const rows = await database.getAllAsync<LignePesee>('SELECT * FROM weights ORDER BY id ASC');
  // 28 octobre 2026 : seulement les VRAIS doublons (meme jour, meme source, meme poids), voir
  // lib/v2/pesee/miseAJourPesee.ts. Avant, la pesee du soir etait supprimee si celle du matin existait.
  const groupes = groupesDoublonsPesees(rows);
  if (!groupes.length) return { removed: 0, kept: rows.length };
  await copieAvantSuppression(database, traduire('Avant le nettoyage des doublons'));
  let removed = 0;
  await database.withTransactionAsync(async () => {
    for (const g of groupes) {
      const cols = Object.keys(g.fusion);
      if (cols.length) {
        await database.runAsync(
          `UPDATE weights SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`,
          [...cols.map((c) => g.fusion[c] as string | number), g.garder.id],
        );
      }
      const placeholders = g.supprimer.map(() => '?').join(',');
      await database.runAsync(`DELETE FROM weights WHERE id IN (${placeholders})`, g.supprimer);
      removed += g.supprimer.length;
    }
  });
  return { removed, kept: rows.length - removed };
};

/**
 * Compte les doublons sans les supprimer (utile pour prévisualiser le nettoyage).
 */
export const countWeightDuplicates = async (): Promise<number> => {
  const database = await openDatabase();
  const rows = await database.getAllAsync<LignePesee>('SELECT id, date, source, weight FROM weights');
  // 28 octobre 2026 : meme regle que deduplicateWeights (meme jour, meme source, meme poids)
  return groupesDoublonsPesees(rows).reduce((n, g) => n + g.supprimer.length, 0);
};

export const getWeights = async (days?: number, limit?: number): Promise<Weight[]> => {
  const database = await openDatabase();
  const limitClause = limit && limit > 0 ? ` LIMIT ${Math.floor(limit)}` : '';
  // 28 octobre 2026 : dans chaque jour, le poids du jour d'abord (lib/v2/pesee/poidsDuJour.ts)
  const query = days
    ? `SELECT * FROM weights WHERE date >= date('now', ?) ORDER BY substr(date, 1, 10) DESC, id DESC${limitClause}`
    : `SELECT * FROM weights ORDER BY substr(date, 1, 10) DESC, id DESC${limitClause}`;

  return poidsDuJourDabord(await database.getAllAsync<Weight>(query, days ? [`-${days} days`] : []));
};

/** Le poids du jour le plus recent : plusieurs pesees ce jour-la, la regle de lib/v2/pesee/poidsDuJour.ts */
export const getLatestWeight = async (): Promise<Weight | null> => {
  const database = await openDatabase();
  const rows = await database.getAllAsync<Weight>(
    `SELECT * FROM weights WHERE weight > 0 AND substr(date, 1, 10) = (SELECT substr(MAX(date), 1, 10) FROM weights WHERE weight > 0) ORDER BY id ASC`
  );
  return poidsDuJour(rows ?? []);
};

// Récupérer tous les poids
export const getAllWeights = async (): Promise<Weight[]> => {
  const database = await openDatabase();
  return poidsDuJourDabord(await database.getAllAsync<Weight>(
    'SELECT * FROM weights ORDER BY substr(date, 1, 10) DESC, id DESC'
  ));
};

// Récupérer l'historique de composition corporelle
export const getCompositionHistory = async (limit: number = 10): Promise<Weight[]> => {
  const database = await openDatabase();
  return await database.getAllAsync<Weight>(
    `SELECT * FROM weights
     WHERE fat_percent IS NOT NULL OR muscle_percent IS NOT NULL OR water_percent IS NOT NULL
     ORDER BY date DESC
     LIMIT ?`,
    [limit]
  );
};

/**
 * 28 octobre 2026 : la pesee part d'abord a la corbeille (lib/corbeilleCorps.ts), 30 jours, avec « Annuler ».
 * definitif : « Supprimer mes donnees » seulement. Renvoie l'id dans la corbeille.
 */
export const deleteWeight = async (id: number, options?: { definitif?: boolean }): Promise<number | null> => {
  const database = await openDatabase();
  return supprimerAvecCorbeille(database as any, 'weights', id, options?.definitif === true);
};

/**
 * 28 octobre 2026 : seules les colonnes PRESENTES dans data sont ecrites (lib/v2/pesee/miseAJourPesee.ts).
 * Avant, corriger une seule valeur (ex. la masse grasse) vidait toutes les autres colonnes de la pesee.
 */
export const updateWeight = async (id: number, data: Partial<Weight>): Promise<void> => {
  const q = requeteMiseAJourPesee(id, data as ModifPesee);
  if (!q) return;
  const database = await openDatabase();
  await database.runAsync(q.sql, q.values);
};

export const deleteWeightsBySource = async (source: string): Promise<number> => {
  const database = await openDatabase();
  // 28 octobre 2026 : copie de securite locale avant d'effacer plusieurs pesees d'un coup (non bloquante)
  await copieAvantSuppression(database, traduire('Avant la suppression des pesées {0}', source));
  const countResult = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM weights WHERE source = ?', [source]
  );
  await database.runAsync('DELETE FROM weights WHERE source = ?', [source]);
  return countResult?.count || 0;
};

// ============================================
// FONCTIONS CRUD - ENTRAÎNEMENTS
// ============================================

export const getTrainingById = async (id: number): Promise<Training | null> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<Training & { exercises?: string; is_outdoor?: number }>(
    `SELECT t.*, t.duration_minutes as duration, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
     FROM trainings t
     LEFT JOIN clubs c ON t.club_id = c.id
     WHERE t.id = ?`,
    [id]
  );
  if (!result) return null;
  let exercises;
  if (result.exercises) {
    try { exercises = JSON.parse(result.exercises as string); } catch { exercises = undefined; }
  }
  return { ...result, exercises, is_outdoor: result.is_outdoor === 1 };
};

// 14 octobre 2026 (ios27) : relie une seance de la montre YOROI a son entrainement Apple Sante (HKWorkout),
// pour lire ensuite sa courbe de FC et ses zones d'Apple. Ne remplace jamais un lien existant.
export const linkTrainingHealthKitUUID = async (id: number, uuid: string): Promise<boolean> => {
  const database = await openDatabase();
  const r = await database.runAsync(
    `UPDATE trainings SET healthkit_uuid = ? WHERE id = ? AND (healthkit_uuid IS NULL OR healthkit_uuid = '')`,
    [uuid, id]
  );
  return (r?.changes ?? 0) > 0;
};

/**
 * 17 octobre 2026 (audit des seances) : score des sports de match et cadre de la seance (salle, exterieur, maison),
 * dans leurs colonnes. Ecrits seulement s'ils sont fournis : une autre mise a jour ne les efface jamais.
 */
const writeScoreEtCadre = async (database: any, id: number, data: Partial<Training>): Promise<void> => {
  const sets: string[] = [];
  const vals: (number | string | null)[] = [];
  if ('score_for' in data) { sets.push('score_for = ?'); vals.push(data.score_for ?? null); }
  if ('score_against' in data) { sets.push('score_against = ?'); vals.push(data.score_against ?? null); }
  if ('lieu_type' in data) { sets.push('lieu_type = ?'); vals.push(data.lieu_type ?? null); }
  if (!sets.length || !id) return;
  await database.runAsync(`UPDATE trainings SET ${sets.join(', ')} WHERE id = ?`, [...vals, id]);
};

export const updateTrainingDetails = async (id: number, detailsJson: string): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync(
    `UPDATE trainings SET workout_details_json = ? WHERE id = ?`,
    [detailsJson, id]
  );
  // 17 octobre 2026 : une seance importee avec un trace GPS a eu lieu dehors
  try {
    const d = JSON.parse(detailsJson);
    if (Array.isArray(d?.routePoints) && d.routePoints.length > 1) {
      await database.runAsync(`UPDATE trainings SET is_outdoor = 1 WHERE id = ? AND healthkit_uuid IS NOT NULL AND (is_outdoor IS NULL OR is_outdoor = 0)`, [id]);
    }
  } catch {
    // details illisibles : rien a deduire
  }
};

export const updateTraining = async (id: number, data: Partial<Training>): Promise<void> => {
  const database = await openDatabase();
  const exercisesJson = data.exercises ? JSON.stringify(data.exercises) : null;
  const combatRoundsJson = data.combat_rounds ? JSON.stringify(data.combat_rounds) : null;
  await database.runAsync(
    `UPDATE trainings SET club_id = ?, sport = ?, session_type = ?, date = ?, start_time = ?, duration_minutes = ?, notes = ?, muscles = ?, exercises = ?, technique_rating = ?, is_outdoor = ?, distance = ?, calories = ?, intensity = ?, rounds = ?, round_duration = ?, pente = ?, speed = ?, resistance = ?, watts = ?, cadence = ?, heart_rate = ?, min_heart_rate = ?, max_heart_rate = ?, source = ?, combat_rounds = ?, location_lat = ?, location_lon = ?, location_name = ?, game_plan = ?, what_worked = ?, what_didnt_work = ?, session_rating = ?, session_mood = ?
     WHERE id = ?`,
    [data.club_id || null, data.sport || null, data.session_type || null, data.date || null,
     data.start_time || null, data.duration_minutes || null,
     data.notes || null, data.muscles || null, exercisesJson, data.technique_rating || null,
     data.is_outdoor ? 1 : 0, data.distance || null, data.calories || null,
     data.intensity || null, data.rounds || null, data.round_duration || null,
     data.pente || null, data.speed || null, data.resistance || null, data.watts || null, data.cadence || null,
     data.heart_rate || null, data.min_heart_rate || null, data.max_heart_rate || null, data.source || null, combatRoundsJson,
     data.location_lat || null, data.location_lon || null, data.location_name || null,
     data.game_plan || null, data.what_worked || null, data.what_didnt_work || null,
     data.session_rating ?? null, data.session_mood || null, id]
  );
  await writeScoreEtCadre(database, id, data);
  // Theme technique et types de seance : ecrits seulement s'ils sont fournis (pas d'effacement involontaire)
  if ('technical_theme' in data) {
    await database.runAsync('UPDATE trainings SET technical_theme = ? WHERE id = ?', [data.technical_theme || null, id]);
  }
  if ('session_types' in data) {
    await database.runAsync('UPDATE trainings SET session_types = ? WHERE id = ?', [toSessionTypesColumn(data.session_types), id]);
  }
};

/** Types de seance : stockes en texte JSON (accepte un tableau ou un texte deja serialise) */
const toSessionTypesColumn = (v: unknown): string | null => {
  if (v == null || v === '') return null;
  if (Array.isArray(v)) return v.length ? JSON.stringify(v) : null;
  return typeof v === 'string' ? v : null;
};

export const addTraining = async (data: Training): Promise<number> => {
  const database = await openDatabase();
  // Doublon d'une seance YOROI deja efface : la meme seance importee n'est pas remise en base
  if (data.healthkit_uuid && (await getDismissedImportIds().catch(() => new Set<string>())).has(data.healthkit_uuid)) {
    return 0;
  }
  const exercisesJson = data.exercises ? JSON.stringify(data.exercises) : null;
  const combatRoundsJson = data.combat_rounds ? JSON.stringify(data.combat_rounds) : null;
  const result = await database.runAsync(
    `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes, muscles, exercises, technique_rating, is_outdoor, distance, calories, intensity, rounds, round_duration, pente, speed, resistance, watts, cadence, healthkit_uuid, workout_details_json, heart_rate, min_heart_rate, max_heart_rate, source, combat_rounds, weekly_plan_id, location_lat, location_lon, location_name, game_plan, what_worked, what_didnt_work, session_rating, session_mood, technical_theme, session_types)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.club_id || null, data.sport, data.session_type || null, data.date,
     data.start_time || null, data.duration_minutes || null,
     data.notes || null, data.muscles || null, exercisesJson, data.technique_rating || null,
     data.is_outdoor ? 1 : 0, data.distance || null, data.calories || null,
     data.intensity || null, data.rounds || null, data.round_duration || null,
     data.pente || null, data.speed || null, data.resistance || null, data.watts || null, data.cadence || null,
     data.healthkit_uuid || null, data.workout_details_json || null, data.heart_rate || null,
     data.min_heart_rate || null, data.max_heart_rate || null, data.source || null, combatRoundsJson, data.weekly_plan_id || null,
     data.location_lat || null, data.location_lon || null, data.location_name || null,
     data.game_plan || null, data.what_worked || null, data.what_didnt_work || null,
     data.session_rating ?? null, data.session_mood || null,
     data.technical_theme || null, toSessionTypesColumn(data.session_types)]
  );
  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert training record');
  }
  await writeScoreEtCadre(database, result.lastInsertRowId, data);
  return result.lastInsertRowId;
};

export const getTrainings = async (days?: number, limit?: number): Promise<Training[]> => {
  const database = await openDatabase();
  const limitClause = limit && limit > 0 ? ` LIMIT ${Math.floor(limit)}` : '';
  const query = days
    ? `SELECT t.*, t.duration_minutes as duration, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
       FROM trainings t
       LEFT JOIN clubs c ON t.club_id = c.id
       WHERE t.date >= date('now', ?)
       ORDER BY t.date DESC, t.start_time ASC${limitClause}`
    : `SELECT t.*, t.duration_minutes as duration, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
       FROM trainings t
       LEFT JOIN clubs c ON t.club_id = c.id
       ORDER BY t.date DESC, t.start_time ASC${limitClause}`;

  const results = await database.getAllAsync<Training & { exercises?: string; combat_rounds?: string; is_outdoor?: number }>(query, days ? [`-${days} days`] : []);
  return results.map(r => {
    let exercises;
    if (r.exercises) {
      try {
        exercises = JSON.parse(r.exercises as string);
      } catch {
        exercises = undefined;
      }
    }
    let combat_rounds;
    if (r.combat_rounds) {
      try {
        combat_rounds = JSON.parse(r.combat_rounds as string);
      } catch {
        combat_rounds = undefined;
      }
    }
    return {
      ...r,
      exercises,
      combat_rounds,
      is_outdoor: r.is_outdoor === 1,
      pente: r.pente,
      speed: r.speed,
      resistance: r.resistance,
      watts: r.watts,
      cadence: r.cadence
    };
  });
};

export const getTrainingsCount = async (): Promise<{ total: number; fromHealthkit: number; manual: number }> => {
  const database = await openDatabase();
  const row = await database.getFirstAsync<{ total: number; fromHealthkit: number }>(
    `SELECT COUNT(*) as total, SUM(CASE WHEN healthkit_uuid IS NOT NULL THEN 1 ELSE 0 END) as fromHealthkit FROM trainings`
  );
  const total = row?.total ?? 0;
  const fromHealthkit = row?.fromHealthkit ?? 0;
  return { total, fromHealthkit, manual: total - fromHealthkit };
};

export const getExistingHealthkitUUIDs = async (): Promise<Set<string>> => {
  const database = await openDatabase();
  const rows = await database.getAllAsync<{ healthkit_uuid: string }>(
    `SELECT healthkit_uuid FROM trainings WHERE healthkit_uuid IS NOT NULL`
  );
  // Plus les doublons deja effaces (voir lib/v2/seances/dedupeMigration.ts) : ils ne reviennent pas
  const dismissed = await getDismissedImportIds().catch(() => new Set<string>());
  return new Set([...rows.map(r => r.healthkit_uuid), ...dismissed]);
};

/**
 * Supprime les séances en double importées depuis Apple Santé.
 * Stratégie :
 *   1. Doublons par healthkit_uuid identique → garder celui qui a le plus de données (workout_details_json, calories…)
 *   2. Doublons par empreinte date+heure+durée+sport (même séance sans UUID) → garder le plus ancien id
 * Retourne le nombre de lignes supprimées.
 */
export const deduplicateTrainings = async (): Promise<number> => {
  const database = await openDatabase();
  let deleted = 0;

  // ── 1. Doublons par UUID HealthKit ──────────────────────────────────────
  // Pour chaque UUID, garder l'id avec workout_details_json non null (le plus enrichi),
  // sinon garder le MIN(id) (le plus ancien).
  const uuidDuplicates = await database.getAllAsync<{ keep_id: number; remove_ids: string }>(
    `SELECT
       COALESCE(
         MIN(CASE WHEN workout_details_json IS NOT NULL THEN id END),
         MIN(id)
       ) AS keep_id,
       GROUP_CONCAT(id) AS all_ids
     FROM trainings
     WHERE healthkit_uuid IS NOT NULL
     GROUP BY healthkit_uuid
     HAVING COUNT(*) > 1`
  );

  for (const row of uuidDuplicates) {
    const allIds: number[] = (row as any).all_ids.split(',').map(Number);
    const toDelete = allIds.filter(id => id !== row.keep_id);
    for (const id of toDelete) {
      await database.runAsync(`DELETE FROM trainings WHERE id = ?`, [id]);
      deleted++;
    }
  }

  // ── 2. Doublons par empreinte (date + start_time + duration + sport) ────
  // Seulement pour les séances Apple Health (source contient 'apple' ou 'health' ou 'watch')
  // qui n'ont pas de UUID (sinon déjà traités ci-dessus).
  const fingerprintDuplicates = await database.getAllAsync<{ keep_id: number; all_ids: string }>(
    `SELECT
       MIN(id) AS keep_id,
       GROUP_CONCAT(id) AS all_ids
     FROM trainings
     WHERE healthkit_uuid IS NULL
       AND (
         LOWER(source) LIKE '%apple%' OR
         LOWER(source) LIKE '%health%' OR
         LOWER(source) LIKE '%watch%'
       )
     GROUP BY date, COALESCE(start_time,''), CAST(ROUND(duration_minutes) AS INTEGER), sport
     HAVING COUNT(*) > 1`
  );

  for (const row of fingerprintDuplicates) {
    const allIds: number[] = row.all_ids.split(',').map(Number);
    const toDelete = allIds.filter(id => id !== row.keep_id);
    for (const id of toDelete) {
      await database.runAsync(`DELETE FROM trainings WHERE id = ?`, [id]);
      deleted++;
    }
  }

  return deleted;
};

export const getTrainingsByMonth = async (year: number, month: number): Promise<Training[]> => {
  const database = await openDatabase();
  const results = await database.getAllAsync<Training & { exercises?: string; combat_rounds?: string; is_outdoor?: number }>(
    `SELECT t.*, t.duration_minutes as duration, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
     FROM trainings t
     LEFT JOIN clubs c ON t.club_id = c.id
     WHERE strftime('%Y', t.date) = ? AND strftime('%m', t.date) = ?
     ORDER BY t.date ASC`,
    [year.toString(), month.toString().padStart(2, '0')]
  );
  return results.map(r => {
    let exercises;
    if (r.exercises) {
      try {
        exercises = JSON.parse(r.exercises as string);
      } catch {
        exercises = undefined;
      }
    }
    let combat_rounds;
    if (r.combat_rounds) {
      try {
        combat_rounds = JSON.parse(r.combat_rounds as string);
      } catch {
        combat_rounds = undefined;
      }
    }
    return {
      ...r,
      exercises,
      combat_rounds,
      is_outdoor: r.is_outdoor === 1,
      pente: r.pente,
      speed: r.speed,
      resistance: r.resistance,
      watts: r.watts,
      cadence: r.cadence
    };
  });
};

export const getTrainingStats = async (): Promise<{ sport: string; count: number; club_name?: string; club_color?: string; club_logo?: string; club_id?: number }[]> => {
  const database = await openDatabase();
  // On groupe par nom de club OU sport (pas par club_id pour éviter les doublons)
  // Si club_name existe, on l'utilise comme identifiant unique, sinon on utilise le sport
  return await database.getAllAsync(
    `SELECT
       t.sport,
       MAX(t.club_id) as club_id,
       COALESCE(c.name, t.sport) as club_name,
       MAX(c.color) as club_color,
       MAX(c.logo_uri) as club_logo,
       SUM(cnt) as count
     FROM (
       SELECT
         sport,
         club_id,
         COUNT(id) as cnt
       FROM trainings
       GROUP BY sport, club_id
     ) t
     LEFT JOIN clubs c ON t.club_id = c.id
     GROUP BY COALESCE(c.name, t.sport)
     ORDER BY count DESC`
  );
};

const TRASH_TABLE_SQL = `CREATE TABLE IF NOT EXISTS trash_trainings (id INTEGER PRIMARY KEY AUTOINCREMENT, original_id INTEGER, club_id INTEGER, sport TEXT, session_type TEXT, date TEXT, start_time TEXT, duration_minutes INTEGER, notes TEXT, muscles TEXT, exercises TEXT, technique_rating INTEGER, is_outdoor INTEGER DEFAULT 0, pente REAL, speed REAL, resistance INTEGER, watts INTEGER, cadence INTEGER, distance REAL, calories INTEGER, intensity INTEGER, rounds INTEGER, round_duration INTEGER, heart_rate INTEGER, max_heart_rate INTEGER, location_lat REAL, location_lon REAL, location_name TEXT, combat_rounds TEXT, created_at TEXT, deleted_at TEXT DEFAULT CURRENT_TIMESTAMP)`;

let _trashTableReady = false;
const ensureTrashTable = async (database: SQLite.SQLiteDatabase) => {
  if (_trashTableReady) return;
  await database.execAsync(TRASH_TABLE_SQL);
  _trashTableReady = true;
};

export const deleteTraining = async (id: number): Promise<number | null> => {
  const database = await openDatabase();
  let trashId: number | null = null;

  // D'abord lire la séance
  const row = await database.getFirstAsync<any>(
    'SELECT * FROM trainings WHERE id = ?', [id]
  );

  // Sauvegarder dans la corbeille AVANT de supprimer (évite la perte de données)
  if (row) {
    try {
      await ensureTrashTable(database);
      const r = await database.runAsync(
        `INSERT INTO trash_trainings (original_id, club_id, sport, session_type, date, start_time, duration_minutes, notes, muscles, exercises, technique_rating, is_outdoor, distance, calories, intensity, rounds, round_duration, pente, speed, resistance, watts, cadence, heart_rate, max_heart_rate, location_lat, location_lon, location_name, combat_rounds, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [row.id, row.club_id || null, row.sport || null, row.session_type || null, row.date, row.start_time || null, row.duration_minutes || null, row.notes || null, row.muscles || null, row.exercises || null, row.technique_rating || null, row.is_outdoor || 0, row.distance || null, row.calories || null, row.intensity || null, row.rounds || null, row.round_duration || null, row.pente || null, row.speed || null, row.resistance || null, row.watts || null, row.cadence || null, row.heart_rate || null, row.max_heart_rate || null, row.location_lat || null, row.location_lon || null, row.location_name || null, row.combat_rounds || null, row.created_at || null]
      );
      trashId = r?.lastInsertRowId ?? null;
    } catch (e) {
      logger.error('Erreur mise en corbeille:', e);
      // Ne pas bloquer la suppression si la mise en corbeille échoue
    }
  }

  // Supprimer de trainings (après la mise en corbeille)
  await database.runAsync('DELETE FROM trainings WHERE id = ?', [id]);

  // Audit du 18/10/2026 : le créneau du planning validé par cette séance redevient à faire
  // (sans clés étrangères actives, il restait « validé » sans séance derrière)
  try {
    await database.runAsync("UPDATE slot_occurrences SET status = 'pending', training_id = NULL WHERE training_id = ? AND status = 'validated'", [id]);
  } catch (e) {
    logger.warn('Créneau non remis à faire après suppression', e);
  }
  // 28 octobre 2026 : meme contrat que lib/database.native.ts (id dans la corbeille, pour « Annuler »)
  return trashId;
};

// ============================================
// CORBEILLE (TRASH)
// ============================================

export interface TrashItem {
  id: number;
  original_id: number;
  club_id?: number;
  sport: string;
  session_type?: string;
  date: string;
  start_time?: string;
  duration_minutes?: number;
  notes?: string;
  muscles?: string;
  exercises?: string;
  is_outdoor?: boolean;
  deleted_at: string;
  // Joined
  club_name?: string;
  club_logo?: string;
  club_color?: string;
}

export const getTrashItems = async (): Promise<TrashItem[]> => {
  const database = await openDatabase();
  try {
    await ensureTrashTable(database);
    const results = await database.getAllAsync<TrashItem & { is_outdoor?: number }>(
      `SELECT t.id, t.original_id, t.club_id, t.sport, t.session_type, t.date, t.start_time, t.duration_minutes, t.notes, t.is_outdoor, t.deleted_at, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
       FROM trash_trainings t
       LEFT JOIN clubs c ON t.club_id = c.id
       ORDER BY t.deleted_at DESC`
    );
    return results.map(r => ({ ...r, is_outdoor: r.is_outdoor === 1 }));
  } catch (e) {
    logger.error('Erreur lecture corbeille:', e);
    return [];
  }
};

export const restoreFromTrash = async (trashId: number): Promise<void> => {
  const database = await openDatabase();
  const item = await database.getFirstAsync<any>(
    'SELECT * FROM trash_trainings WHERE id = ?', [trashId]
  );
  if (!item) return;

  await database.runAsync(
    `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes, muscles, exercises, technique_rating, distance, calories, intensity, rounds, round_duration, is_outdoor, pente, speed, resistance, watts, cadence, heart_rate, max_heart_rate, location_lat, location_lon, location_name, combat_rounds, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [item.club_id, item.sport, item.session_type, item.date, item.start_time,
     item.duration_minutes, item.notes, item.muscles, item.exercises,
     item.technique_rating, item.distance, item.calories, item.intensity,
     item.rounds, item.round_duration, item.is_outdoor || 0,
     item.pente, item.speed, item.resistance, item.watts, item.cadence,
     item.heart_rate || null, item.max_heart_rate || null,
     item.location_lat || null, item.location_lon || null, item.location_name || null,
     item.combat_rounds || null, item.created_at]
  );
  await database.runAsync('DELETE FROM trash_trainings WHERE id = ?', [trashId]);
};

export const permanentlyDeleteFromTrash = async (trashId: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM trash_trainings WHERE id = ?', [trashId]);
};

export const emptyTrash = async (): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM trash_trainings');
};

export const getTrashCount = async (): Promise<number> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM trash_trainings'
  );
  return result?.count || 0;
};

// ============================================
// FONCTIONS CRUD - CLUBS
// ============================================

export const addClub = async (data: Club): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color, sessions_per_week) VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.sport, data.logo_uri || null, data.color || null, data.sessions_per_week || 3]
  );
  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert club record');
  }
  return result.lastInsertRowId;
};

export const getClubs = async (): Promise<Club[]> => {
  const database = await openDatabase();
  return await database.getAllAsync<Club>('SELECT * FROM clubs ORDER BY name ASC');
};

export const updateClub = async (id: number, data: Partial<Club>): Promise<void> => {
  const database = await openDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { updates.push('name = ?'); values.push(data.name); }
  if (data.sport !== undefined) { updates.push('sport = ?'); values.push(data.sport); }
  if (data.logo_uri !== undefined) { updates.push('logo_uri = ?'); values.push(data.logo_uri); }
  if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color); }

  if (updates.length > 0) {
    values.push(id);
    await database.runAsync(`UPDATE clubs SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deleteClub = async (id: number): Promise<void> => {
  const database = await openDatabase();
  // Audit du 18/10/2026 : aucune séance n'est supprimée ; celles du club gardent son nom comme lieu (en salle),
  // et séances comme créneaux ne pointent plus vers un club qui n'existe plus
  try {
    const club = await database.getFirstAsync<{ name?: string | null }>('SELECT name FROM clubs WHERE id = ?', [id]);
    const nom = (club?.name ?? '').trim();
    if (nom) {
      await database.runAsync(
        "UPDATE trainings SET location_name = ?, lieu_type = COALESCE(lieu_type, 'salle') WHERE club_id = ? AND (location_name IS NULL OR trim(location_name) = '') AND (is_outdoor IS NULL OR is_outdoor = 0)",
        [nom, id]
      );
    }
  } catch (e) {
    logger.warn('Lieu des séances du club non repris', e);
  }
  await database.runAsync('DELETE FROM clubs WHERE id = ?', [id]);
  await nettoyerClubsOrphelins();
};

/** Séances et créneaux rattachés à un club supprimé : le lien mort est retiré (rien n'est supprimé) */
export const nettoyerClubsOrphelins = async (): Promise<void> => {
  try {
    const database = await openDatabase();
    await database.runAsync('UPDATE trainings SET club_id = NULL WHERE club_id IS NOT NULL AND club_id NOT IN (SELECT id FROM clubs)');
    await database.runAsync('UPDATE weekly_plan SET club_id = NULL WHERE club_id IS NOT NULL AND club_id NOT IN (SELECT id FROM clubs)');
  } catch (e) {
    logger.warn('Nettoyage des clubs supprimés impossible', e);
  }
};

// ============================================
// FONCTIONS CRUD - MENSURATIONS
// ============================================

export const addMeasurementRecord = async (data: Measurement): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO measurements (chest, waist, navel, hips, left_arm, right_arm, left_thigh,
     right_thigh, left_calf, right_calf, left_forearm, right_forearm, shoulders, neck, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.chest || null, data.waist || null, data.navel || null, data.hips || null, data.left_arm || null,
     data.right_arm || null, data.left_thigh || null, data.right_thigh || null,
     data.left_calf || null, data.right_calf || null,
     data.left_forearm || null, data.right_forearm || null, data.shoulders || null,
     data.neck || null, data.date]
  );
  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert measurement record');
  }
  return result.lastInsertRowId;
};

export const getMeasurements = async (days?: number, limit?: number): Promise<Measurement[]> => {
  const database = await openDatabase();
  const limitClause = limit && limit > 0 ? ` LIMIT ${Math.floor(limit)}` : '';
  const query = days
    ? `SELECT * FROM measurements WHERE date >= date('now', ?) ORDER BY date DESC${limitClause}`
    : `SELECT * FROM measurements ORDER BY date DESC${limitClause}`;

  return await database.getAllAsync<Measurement>(query, days ? [`-${days} days`] : []);
};

export const getLatestMeasurement = async (): Promise<Measurement | null> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<Measurement>(
    'SELECT * FROM measurements ORDER BY date DESC LIMIT 1'
  );
  return result || null;
};

export const getFirstMeasurement = async (): Promise<Measurement | null> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<Measurement>(
    'SELECT * FROM measurements ORDER BY date ASC LIMIT 1'
  );
  return result || null;
};

/** 28 octobre 2026 : comme deleteWeight, la mensuration part d'abord a la corbeille */
export const deleteMeasurementRecord = async (id: number, options?: { definitif?: boolean }): Promise<number | null> => {
  const database = await openDatabase();
  return supprimerAvecCorbeille(database as any, 'measurements', id, options?.definitif === true);
};

/** Corbeille des pesees et mensurations (30 jours) */
export const getTrashCorps = async (): Promise<ElementCorbeilleCorps[]> => lireCorbeilleCorps((await openDatabase()) as any);

/** Remet une pesee ou une mensuration ; false si elle est deja remise */
export const restoreCorpsFromTrash = async (trashId: number): Promise<boolean> => restaurerCorps((await openDatabase()) as any, trashId);

/** « Supprimer mes donnees » : la corbeille des pesees et mensurations est videe aussi */
export const emptyTrashCorps = async (): Promise<void> => {
  const database = await openDatabase();
  try {
    await database.execAsync('DELETE FROM trash_corps;');
  } catch {
    // table absente : rien a vider
  }
};

export const updateMeasurementRecord = async (id: number, data: Partial<Measurement>): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync(
    `UPDATE measurements SET
      chest = COALESCE(?, chest),
      waist = COALESCE(?, waist),
      navel = COALESCE(?, navel),
      hips = COALESCE(?, hips),
      left_arm = COALESCE(?, left_arm),
      right_arm = COALESCE(?, right_arm),
      left_thigh = COALESCE(?, left_thigh),
      right_thigh = COALESCE(?, right_thigh),
      left_calf = COALESCE(?, left_calf),
      right_calf = COALESCE(?, right_calf),
      left_forearm = COALESCE(?, left_forearm),
      right_forearm = COALESCE(?, right_forearm),
      shoulders = COALESCE(?, shoulders),
      neck = COALESCE(?, neck),
      date = COALESCE(?, date)
    WHERE id = ?`,
    [
      data.chest ?? null, data.waist ?? null, data.navel ?? null,
      data.hips ?? null, data.left_arm ?? null, data.right_arm ?? null,
      data.left_thigh ?? null, data.right_thigh ?? null,
      data.left_calf ?? null, data.right_calf ?? null,
      data.left_forearm ?? null, data.right_forearm ?? null,
      data.shoulders ?? null, data.neck ?? null,
      data.date ?? null, id,
    ]
  );
};

// ============================================
// FONCTIONS CRUD - PLANNING HEBDOMADAIRE
// ============================================

export const getWeeklyPlan = async (): Promise<WeeklyPlan[]> => {
  const database = await openDatabase();
  return await database.getAllAsync<WeeklyPlan>(
    `SELECT wp.*, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
     FROM weekly_plan wp
     LEFT JOIN clubs c ON wp.club_id = c.id
     ORDER BY wp.day_of_week ASC, wp.time ASC`
  );
};

export const addWeeklyPlanItem = async (data: WeeklyPlan): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO weekly_plan (day_of_week, club_id, sport, time, duration_minutes, muscles, is_rest_day, session_type, label)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.day_of_week, data.club_id || null, data.sport, data.time || null,
     data.duration_minutes || null, data.muscles || null, data.is_rest_day ? 1 : 0,
     data.session_type || null, data.label || null]
  );
  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert weekly plan item');
  }
  return result.lastInsertRowId;
};

export const updateWeeklyPlanItem = async (id: number, data: Partial<WeeklyPlan>): Promise<void> => {
  const database = await openDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.day_of_week !== undefined) { updates.push('day_of_week = ?'); values.push(data.day_of_week); }
  if (data.club_id !== undefined) { updates.push('club_id = ?'); values.push(data.club_id); }
  if (data.sport !== undefined) { updates.push('sport = ?'); values.push(data.sport); }
  if (data.time !== undefined) { updates.push('time = ?'); values.push(data.time); }
  if (data.duration_minutes !== undefined) { updates.push('duration_minutes = ?'); values.push(data.duration_minutes); }
  if (data.muscles !== undefined) { updates.push('muscles = ?'); values.push(data.muscles); }
  if (data.is_rest_day !== undefined) { updates.push('is_rest_day = ?'); values.push(data.is_rest_day ? 1 : 0); }
  if (data.session_type !== undefined) { updates.push('session_type = ?'); values.push(data.session_type); }
  if (data.label !== undefined) { updates.push('label = ?'); values.push(data.label); }

  if (updates.length > 0) {
    values.push(id);
    await database.runAsync(`UPDATE weekly_plan SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deleteWeeklyPlanItem = async (id: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM weekly_plan WHERE id = ?', [id]);
};

export const getWeeklyPlanById = async (id: number): Promise<WeeklyPlan | null> => {
  const database = await openDatabase();
  return await database.getFirstAsync<WeeklyPlan>(
    `SELECT wp.*, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
     FROM weekly_plan wp
     LEFT JOIN clubs c ON wp.club_id = c.id
     WHERE wp.id = ?`,
    [id]
  );
};

// ============================================
// FONCTIONS CRUD - SLOT OCCURRENCES
// ============================================

export const getSlotOccurrences = async (weekStart: string): Promise<SlotOccurrence[]> => {
  const database = await openDatabase();
  return await database.getAllAsync<SlotOccurrence>(
    `SELECT * FROM slot_occurrences WHERE week_start = ? ORDER BY weekly_plan_id ASC`,
    [weekStart]
  );
};

export const upsertSlotOccurrence = async (data: SlotOccurrence): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO slot_occurrences (weekly_plan_id, week_start, status, training_id, cancel_reason, injury_id)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(weekly_plan_id, week_start) DO UPDATE SET
       status = excluded.status,
       training_id = excluded.training_id,
       cancel_reason = excluded.cancel_reason,
       injury_id = excluded.injury_id`,
    [data.weekly_plan_id, data.week_start, data.status,
     data.training_id || null, data.cancel_reason || null, data.injury_id || null]
  );
  return result.lastInsertRowId;
};

export const validateSlot = async (weeklyPlanId: number, weekStart: string, trainingId: number): Promise<void> => {
  await upsertSlotOccurrence({
    weekly_plan_id: weeklyPlanId,
    week_start: weekStart,
    status: 'validated',
    training_id: trainingId,
  });
};

export const cancelSlot = async (weeklyPlanId: number, weekStart: string, reason?: string, injuryId?: number): Promise<void> => {
  await upsertSlotOccurrence({
    weekly_plan_id: weeklyPlanId,
    week_start: weekStart,
    status: 'cancelled',
    cancel_reason: reason,
    injury_id: injuryId,
  });
};

export const getSlotAttendanceRate = async (weeklyPlanId: number, weeks: number = 4): Promise<{ rate: number; validated: number; total: number }> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<{ validated: number; total: number }>(
    `SELECT
       COUNT(CASE WHEN status = 'validated' THEN 1 END) as validated,
       COUNT(*) as total
     FROM slot_occurrences
     WHERE weekly_plan_id = ?
       AND week_start >= date('now', '-' || ? || ' days', 'weekday 1', '-7 days')`,
    [weeklyPlanId, weeks * 7]
  );
  const validated = result?.validated || 0;
  const total = result?.total || 0;
  return { rate: total > 0 ? validated / total : 0, validated, total };
};

export const ensureCurrentWeekOccurrences = async (): Promise<void> => {
  const database = await openDatabase();
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const pad2 = (n: number) => String(n).padStart(2, '0');
  const weekStart = `${monday.getFullYear()}-${pad2(monday.getMonth() + 1)}-${pad2(monday.getDate())}`;

  const slots = await database.getAllAsync<WeeklyPlan>(
    `SELECT * FROM weekly_plan WHERE is_rest_day = 0`
  );

  for (const slot of slots) {
    await database.runAsync(
      `INSERT OR IGNORE INTO slot_occurrences (weekly_plan_id, week_start, status)
       VALUES (?, ?, 'pending')`,
      [slot.id!, weekStart]
    );
  }
};

// ============================================
// FONCTIONS CRUD - PHOTOS
// ============================================

export const addPhoto = async (data: Photo): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO photos (uri, weight, fat_percent, muscle_percent, date, is_blurred)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.uri, data.weight || null, data.fat_percent || null,
     data.muscle_percent || null, data.date, data.is_blurred ? 1 : 0]
  );
  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert photo record');
  }
  return result.lastInsertRowId;
};

export const getPhotos = async (): Promise<Photo[]> => {
  const database = await openDatabase();
  const results = await database.getAllAsync<any>('SELECT * FROM photos ORDER BY date DESC');
  return results.map(p => ({ ...p, is_blurred: p.is_blurred === 1 }));
};

export const deletePhoto = async (id: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM photos WHERE id = ?', [id]);
};

// ============================================
// FONCTIONS CRUD - ACHIEVEMENTS
// ============================================

export const unlockAchievement = async (id: string): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync(
    `INSERT OR IGNORE INTO achievements (id, unlocked_at) VALUES (?, ?)`,
    [id, new Date().toISOString()]
  );
};

export const getUnlockedAchievements = async (): Promise<string[]> => {
  const database = await openDatabase();
  const results = await database.getAllAsync<{ id: string }>('SELECT id FROM achievements');
  return results.map(r => r.id);
};

export const isAchievementUnlocked = async (id: string): Promise<boolean> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<{ id: string }>(
    'SELECT id FROM achievements WHERE id = ?', [id]
  );
  return !!result;
};

// ============================================
// FONCTIONS CRUD - YOROI MEDIC SUIVI BLESSURES
// ============================================

// ---------- BLESSURES ----------

export const addInjury = async (data: Injury): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO injuries (zone_id, zone_view, pain_type, cause, eva_score, notes, date, status, fit_for_duty)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.zone_id, data.zone_view, data.pain_type, data.cause, data.eva_score,
     data.notes || null, data.date, data.status, data.fit_for_duty]
  );
  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert injury record');
  }
  return result.lastInsertRowId;
};

export const getInjuries = async (status?: 'active' | 'healing' | 'healed'): Promise<Injury[]> => {
  const database = await openDatabase();
  const query = status
    ? `SELECT * FROM injuries WHERE status = ? ORDER BY date DESC`
    : `SELECT * FROM injuries ORDER BY date DESC`;

  const params = status ? [status] : [];
  return await database.getAllAsync<Injury>(query, params);
};

export const getActiveInjuries = async (): Promise<Injury[]> => {
  const database = await openDatabase();
  return await database.getAllAsync<Injury>(
    `SELECT * FROM injuries WHERE status IN ('active', 'healing') ORDER BY date DESC`
  );
};

export const getInjuryById = async (id: number): Promise<Injury | null> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<Injury>(
    'SELECT * FROM injuries WHERE id = ?', [id]
  );
  return result || null;
};

export const updateInjury = async (id: number, data: Partial<Injury>): Promise<void> => {
  const database = await openDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.eva_score !== undefined) { updates.push('eva_score = ?'); values.push(data.eva_score); }
  if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
  if (data.fit_for_duty !== undefined) { updates.push('fit_for_duty = ?'); values.push(data.fit_for_duty); }
  if (data.healed_at !== undefined) { updates.push('healed_at = ?'); values.push(data.healed_at); }
  if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes); }

  if (updates.length > 0) {
    values.push(id);
    await database.runAsync(`UPDATE injuries SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deleteInjury = async (id: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM injuries WHERE id = ?', [id]);
};

// ---------- HISTORIQUE EVA ----------

export const addEvaHistory = async (data: InjuryEvaHistory): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO injury_eva_history (injury_id, eva_score, date, notes)
     VALUES (?, ?, ?, ?)`,
    [data.injury_id, data.eva_score, data.date, data.notes || null]
  );
  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert EVA history record');
  }
  return result.lastInsertRowId;
};

export const getEvaHistory = async (injuryId: number): Promise<InjuryEvaHistory[]> => {
  const database = await openDatabase();
  return await database.getAllAsync<InjuryEvaHistory>(
    `SELECT * FROM injury_eva_history WHERE injury_id = ? ORDER BY date ASC`,
    [injuryId]
  );
};

export const getLatestEva = async (injuryId: number): Promise<InjuryEvaHistory | null> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<InjuryEvaHistory>(
    `SELECT * FROM injury_eva_history WHERE injury_id = ? ORDER BY date DESC LIMIT 1`,
    [injuryId]
  );
  return result || null;
};

// ---------- TRAITEMENTS ----------

export const addTreatment = async (data: InjuryTreatment): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO injury_treatments (injury_id, treatment_type, custom_description, date, completed, notes)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.injury_id, data.treatment_type, data.custom_description || null,
     data.date, data.completed ? 1 : 0, data.notes || null]
  );
  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert treatment record');
  }
  return result.lastInsertRowId;
};

export const getTreatments = async (injuryId: number): Promise<InjuryTreatment[]> => {
  const database = await openDatabase();
  const results = await database.getAllAsync<any>(
    `SELECT * FROM injury_treatments WHERE injury_id = ? ORDER BY date DESC`,
    [injuryId]
  );
  return results.map(t => ({ ...t, completed: t.completed === 1 }));
};

export const updateTreatment = async (id: number, data: Partial<InjuryTreatment>): Promise<void> => {
  const database = await openDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.completed !== undefined) { updates.push('completed = ?'); values.push(data.completed ? 1 : 0); }
  if (data.notes !== undefined) { updates.push('notes = ?'); values.push(data.notes); }

  if (updates.length > 0) {
    values.push(id);
    await database.runAsync(`UPDATE injury_treatments SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

// ---------- RAPPELS DE TRAITEMENT ----------

export const addReminder = async (data: TreatmentReminder): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO treatment_reminders (injury_id, treatment_type, frequency, time, next_reminder_date, enabled)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.injury_id, data.treatment_type, data.frequency, data.time || null,
     data.next_reminder_date, data.enabled ? 1 : 0]
  );
  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert reminder record');
  }
  return result.lastInsertRowId;
};

export const getReminders = async (injuryId?: number): Promise<TreatmentReminder[]> => {
  const database = await openDatabase();
  const query = injuryId
    ? `SELECT * FROM treatment_reminders WHERE injury_id = ? ORDER BY next_reminder_date ASC`
    : `SELECT * FROM treatment_reminders ORDER BY next_reminder_date ASC`;

  const params = injuryId ? [injuryId] : [];
  const results = await database.getAllAsync<any>(query, params);
  return results.map(r => ({ ...r, enabled: r.enabled === 1 }));
};

export const getActiveReminders = async (): Promise<TreatmentReminder[]> => {
  const database = await openDatabase();
  const results = await database.getAllAsync<any>(
    `SELECT * FROM treatment_reminders WHERE enabled = 1 AND next_reminder_date <= date('now') ORDER BY next_reminder_date ASC`
  );
  return results.map(r => ({ ...r, enabled: r.enabled === 1 }));
};

export const updateReminder = async (id: number, data: Partial<TreatmentReminder>): Promise<void> => {
  const database = await openDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.next_reminder_date !== undefined) { updates.push('next_reminder_date = ?'); values.push(data.next_reminder_date); }
  if (data.enabled !== undefined) { updates.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }

  if (updates.length > 0) {
    values.push(id);
    await database.runAsync(`UPDATE treatment_reminders SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deleteReminder = async (id: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM treatment_reminders WHERE id = ?', [id]);
};

// ---------- STATISTIQUES BLESSURES ----------

export const getInjuryStats = async (): Promise<{
  totalInjuries: number;
  activeInjuries: number;
  healedInjuries: number;
  mostAffectedZone: string | null;
  averageRecoveryDays: number;
}> => {
  const database = await openDatabase();

  const total = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM injuries'
  );

  const active = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM injuries WHERE status IN ('active', 'healing')`
  );

  const healed = await database.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM injuries WHERE status = 'healed'`
  );

  const mostAffected = await database.getFirstAsync<{ zone_id: string; count: number }>(
    `SELECT zone_id, COUNT(*) as count FROM injuries GROUP BY zone_id ORDER BY count DESC LIMIT 1`
  );

  const recoveryAvg = await database.getFirstAsync<{ avg_days: number }>(
    `SELECT AVG(julianday(healed_at) - julianday(date)) as avg_days
     FROM injuries WHERE status = 'healed' AND healed_at IS NOT NULL`
  );

  return {
    totalInjuries: total?.count || 0,
    activeInjuries: active?.count || 0,
    healedInjuries: healed?.count || 0,
    mostAffectedZone: mostAffected?.zone_id || null,
    averageRecoveryDays: Math.round(recoveryAvg?.avg_days || 0),
  };
};

// ============================================
// STATISTIQUES & CALCULS
// ============================================

export const calculateStreak = async (): Promise<number> => {
  // 28 octobre 2026 : jours de suite avec une pesee, deux pesees le meme jour comptent pour un jour
  // (avant, la deuxieme pesee du jour cassait la serie). lib/v2/pesee/poidsDuJour.ts
  const weights = await getWeights();
  return joursDeSuitePesee(weights ?? []);
};

export const getWeightProgress = async (): Promise<{
  current: number | null;
  start: number | null;
  target: number | null;
  lost: number;
  remaining: number;
  progress: number;
}> => {
  const profile = await getProfile();
  const latest = await getLatestWeight();

  const current = latest?.weight || null;
  const start = profile?.start_weight || null;
  const target = profile?.target_weight || null;

  const lost = start && current ? start - current : 0;
  const remaining = current && target ? current - target : 0;
  const totalToLose = start && target ? start - target : 0;
  const progress = totalToLose > 0 ? Math.min(100, Math.max(0, (lost / totalToLose) * 100)) : 0;

  return { current, start, target, lost, remaining, progress };
};

// ============================================
// EXPORT / IMPORT
// ============================================

export const exportAllData = async () => {
  const database = await openDatabase();

  const profile = await getProfile();
  const weights = await getWeights();
  const trainings = await getTrainings();
  const clubs = await getClubs();
  const measurements = await getMeasurements();
  const weeklyPlan = await getWeeklyPlan();
  const photos = await getPhotos();
  const achievements = await getUnlockedAchievements();

  // YOROI MEDIC data
  const injuries = await getInjuries();
  const injuryEvaHistory: InjuryEvaHistory[] = [];
  const injuryTreatments: InjuryTreatment[] = [];
  const treatmentReminders: TreatmentReminder[] = [];

  // Get EVA history, treatments, and reminders for each injury
  for (const injury of injuries) {
    if (injury.id) {
      const eva = await getEvaHistory(injury.id);
      const treatments = await getTreatments(injury.id);
      const reminders = await getReminders(injury.id);
      injuryEvaHistory.push(...eva);
      injuryTreatments.push(...treatments);
      treatmentReminders.push(...reminders);
    }
  }

  return {
    version: '2.0', // Updated version for YOROI MEDIC
    exported_at: new Date().toISOString(),
    data: {
      profile,
      weights,
      trainings,
      clubs,
      measurements,
      weeklyPlan,
      photos,
      achievements,
      // YOROI MEDIC
      injuries,
      injuryEvaHistory,
      injuryTreatments,
      treatmentReminders,
    }
  };
};

export const importData = async (jsonString: string): Promise<void> => {
  const database = await openDatabase();

  let data;
  try {
    data = JSON.parse(jsonString);
  } catch {
    throw new Error('Format JSON invalide');
  }

  if (!data.version || !data.data) {
    throw new Error('Format de fichier invalide');
  }

  // Importer le profil
  if (data.data.profile) {
    await saveProfile(data.data.profile);
  }

  // Importer les clubs
  if (data.data.clubs) {
    for (const club of data.data.clubs) {
      await addClub(club);
    }
  }

  // Importer les poids
  if (data.data.weights) {
    for (const weight of data.data.weights) {
      await addWeight(weight);
    }
  }

  // Importer les entraînements
  if (data.data.trainings) {
    for (const training of data.data.trainings) {
      await addTraining(training);
    }
  }

  // Importer les mensurations
  if (data.data.measurements) {
    for (const measurement of data.data.measurements) {
      await addMeasurementRecord(measurement);
    }
  }

  // Importer le planning
  if (data.data.weeklyPlan) {
    for (const item of data.data.weeklyPlan) {
      await addWeeklyPlanItem(item);
    }
  }

  // Importer les achievements
  if (data.data.achievements) {
    for (const id of data.data.achievements) {
      await unlockAchievement(id);
    }
  }

  // Importer les données YOROI MEDIC (version 2.0+)
  if (parseFloat(data.version) >= 2.0) {
    // Créer une map pour mapper les anciens IDs aux nouveaux
    const injuryIdMap = new Map<number, number>();

    // Importer les blessures
    if (data.data.injuries) {
      for (const injury of data.data.injuries) {
        const oldId = injury.id;
        delete injury.id; // Remove old ID
        const newId = await addInjury(injury);
        if (oldId) injuryIdMap.set(oldId, newId);
      }
    }

    // Importer l'historique EVA
    if (data.data.injuryEvaHistory) {
      for (const eva of data.data.injuryEvaHistory) {
        delete eva.id;
        const newInjuryId = injuryIdMap.get(eva.injury_id);
        if (newInjuryId) {
          eva.injury_id = newInjuryId;
          await addEvaHistory(eva);
        }
      }
    }

    // Importer les traitements
    if (data.data.injuryTreatments) {
      for (const treatment of data.data.injuryTreatments) {
        delete treatment.id;
        const newInjuryId = injuryIdMap.get(treatment.injury_id);
        if (newInjuryId) {
          treatment.injury_id = newInjuryId;
          await addTreatment(treatment);
        }
      }
    }

    // Importer les rappels
    if (data.data.treatmentReminders) {
      for (const reminder of data.data.treatmentReminders) {
        delete reminder.id;
        const newInjuryId = injuryIdMap.get(reminder.injury_id);
        if (newInjuryId) {
          reminder.injury_id = newInjuryId;
          await addReminder(reminder);
        }
      }
    }
  }
};

// ============================================
// COMPETITIONS CRUD
// ============================================

export const getCompetitions = async (): Promise<Competition[]> => {
  const database = await openDatabase();
  const results = await database.getAllAsync<Competition>(
    'SELECT * FROM competitions ORDER BY date ASC'
  );
  return results;
};

export const addCompetition = async (competition: Omit<Competition, 'id' | 'created_at'>): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO competitions (nom, date, lieu, sport, categorie_poids, poids_max, statut, lien_inscription)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      competition.nom,
      competition.date,
      competition.lieu || null,
      competition.sport,
      competition.categorie_poids || null,
      competition.poids_max || null,
      competition.statut || 'a_venir',
      competition.lien_inscription || null,
    ]
  );
  if (!result?.lastInsertRowId) {
    throw new Error('Failed to insert competition record');
  }
  return result.lastInsertRowId;
};

export const updateCompetition = async (id: number, competition: Partial<Competition>): Promise<void> => {
  const database = await openDatabase();
  const fields: string[] = [];
  const values: any[] = [];

  if (competition.nom !== undefined) { fields.push('nom = ?'); values.push(competition.nom); }
  if (competition.date !== undefined) { fields.push('date = ?'); values.push(competition.date); }
  if (competition.lieu !== undefined) { fields.push('lieu = ?'); values.push(competition.lieu); }
  if (competition.sport !== undefined) { fields.push('sport = ?'); values.push(competition.sport); }
  if (competition.categorie_poids !== undefined) { fields.push('categorie_poids = ?'); values.push(competition.categorie_poids); }
  if (competition.poids_max !== undefined) { fields.push('poids_max = ?'); values.push(competition.poids_max); }
  if (competition.statut !== undefined) { fields.push('statut = ?'); values.push(competition.statut); }
  if (competition.lien_inscription !== undefined) { fields.push('lien_inscription = ?'); values.push(competition.lien_inscription); }

  if (fields.length > 0) {
    values.push(id);
    await database.runAsync(`UPDATE competitions SET ${fields.join(', ')} WHERE id = ?`, values);
  }
};

export const deleteCompetition = async (id: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM competitions WHERE id = ?', [id]);
};

export const getNextCompetition = async (): Promise<Competition | null> => {
  const database = await openDatabase();
  const today = new Date().toISOString().split('T')[0];
  const result = await database.getFirstAsync<Competition>(
    `SELECT * FROM competitions WHERE date >= ? AND statut = 'a_venir' ORDER BY date ASC LIMIT 1`,
    [today]
  );
  return result || null;
};

// ============================================
// RESET COMPLET DE LA BASE DE DONNÉES
// ============================================

/**
 * Vide une liste fixe de tables. Sert seulement au retour d'une ancienne demo (lib/demoDataService.ts).
 * Ce n'est PAS « Tout effacer » : pour effacer vraiment tout, utiliser effacerToutesMesDonnees() de lib/storage.ts.
 */
export const resetDatabase = async (): Promise<void> => {
  try {
    const database = await openDatabase();

    // Supprimer toutes les données de chaque table
    // Tables principales
    try { await database.execAsync('DELETE FROM weights;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM trainings;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM measurements;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM trash_corps;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM photos;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM achievements;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM weekly_plan;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM clubs;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM profile;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM competitions;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }

    // Tables YOROI MEDIC
    try { await database.execAsync('DELETE FROM treatment_reminders;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM injury_treatments;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM injury_eva_history;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM injuries;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }

    // Tables Carnet d'Entraînement
    try { await database.execAsync('DELETE FROM benchmark_entries;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM benchmarks;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }
    try { await database.execAsync('DELETE FROM skills;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }

    // Table Données de santé
    try { await database.execAsync('DELETE FROM health_data;'); } catch (e) { if (!String((e as any)?.message ?? e).includes('no such table')) logger.warn('DB reset error:', e); }

  } catch (error) {
    logger.error('Erreur reset database:', error);
    throw error;
  }
};


// ============================================
// FONCTIONS CRUD - DONNÉES DE SANTÉ
// ============================================

export interface HealthDataRecord {
  id?: number;
  date: string;
  type: 'steps' | 'calories_active' | 'calories_basal' | 'heart_rate' | 'heart_rate_resting' | 'hrv' | 'sleep' | 'distance' | 'vo2max' | 'spo2' | 'respiratory_rate' | 'body_temp' | 'body_fat' | 'lean_mass' | 'blood_pressure_systolic' | 'blood_glucose' | 'height' | 'floors_climbed' | 'mindful_minutes';
  value: number;
  value2?: number;
  value3?: number;
  value4?: number;
  unit?: string;
  source?: string;
  metadata?: string;
  created_at?: string;
}

export const saveHealthData = async (record: HealthDataRecord): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync(
    `INSERT OR REPLACE INTO health_data (date, type, value, value2, value3, value4, unit, source, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [record.date, record.type, record.value,
     record.value2 || null, record.value3 || null, record.value4 || null,
     record.unit || null, record.source || 'apple_health', record.metadata || null]
  );
};

export const saveHealthDataBatch = async (records: HealthDataRecord[]): Promise<number> => {
  if (records.length === 0) return 0;
  const database = await openDatabase();
  let saved = 0;
  await database.execAsync('BEGIN TRANSACTION;');
  try {
    for (const record of records) {
      await database.runAsync(
        `INSERT OR REPLACE INTO health_data (date, type, value, value2, value3, value4, unit, source, metadata)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [record.date, record.type, record.value,
         record.value2 || null, record.value3 || null, record.value4 || null,
         record.unit || null, record.source || 'apple_health', record.metadata || null]
      );
      saved++;
    }
    await database.execAsync('COMMIT;');
  } catch (error) {
    await database.execAsync('ROLLBACK;');
    throw error;
  }
  return saved;
};

export const getHealthData = async (type: string, days?: number): Promise<HealthDataRecord[]> => {
  const database = await openDatabase();
  if (days) {
    const safeDays = Math.max(1, Math.min(Math.floor(Number(days)), 365));
    return await database.getAllAsync<HealthDataRecord>(
      `SELECT * FROM health_data WHERE type = ? AND date >= date('now', '-' || ? || ' days') ORDER BY date DESC`,
      [type, safeDays]
    );
  }
  return await database.getAllAsync<HealthDataRecord>(
    `SELECT * FROM health_data WHERE type = ? ORDER BY date DESC`,
    [type]
  );
};

export const getLatestHealthData = async (type: string): Promise<HealthDataRecord | null> => {
  const database = await openDatabase();
  return await database.getFirstAsync<HealthDataRecord>(
    `SELECT * FROM health_data WHERE type = ? ORDER BY date DESC LIMIT 1`,
    [type]
  ) || null;
};

export const getHealthDataByDate = async (date: string): Promise<HealthDataRecord[]> => {
  const database = await openDatabase();
  return await database.getAllAsync<HealthDataRecord>(
    `SELECT * FROM health_data WHERE date = ? ORDER BY type`,
    [date]
  );
};

// ============================================
// DETECTED SOURCES
// ============================================

export interface DetectedSource {
  source: string;
  last_date: string;
  last_type: string;
  record_count: number;
}

export const getDetectedSources = async (days: number = 30): Promise<DetectedSource[]> => {
  const database = await openDatabase();
  const safeDays = Math.max(1, Math.min(Math.floor(Number(days)), 365));
  return await database.getAllAsync<DetectedSource>(
    `SELECT source,
            MAX(date) as last_date,
            (SELECT type FROM health_data h2 WHERE h2.source = health_data.source ORDER BY date DESC LIMIT 1) as last_type,
            COUNT(*) as record_count
     FROM health_data
     WHERE date >= date('now', '-' || ? || ' days')
       AND source IS NOT NULL
       AND source != ''
     GROUP BY source
     ORDER BY MAX(date) DESC`,
    [safeDays]
  );
};

export const getDetectedWeightSources = async (days: number = 30): Promise<DetectedSource[]> => {
  const database = await openDatabase();
  const safeDays = Math.max(1, Math.min(Math.floor(Number(days)), 365));
  return await database.getAllAsync<DetectedSource>(
    `SELECT source,
            MAX(date) as last_date,
            'weight' as last_type,
            COUNT(*) as record_count
     FROM weights
     WHERE date >= date('now', '-' || ? || ' days')
       AND source IS NOT NULL
       AND source != ''
       AND source != 'manual'
     GROUP BY source
     ORDER BY MAX(date) DESC`,
    [safeDays]
  );
};

export const deleteAllTrainings = async (): Promise<number> => {
  const database = await openDatabase();
  const countResult = await database.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM trainings');
  await database.runAsync('DELETE FROM trainings');
  return countResult?.count || 0;
};

// Retourne toutes les séances qui contiennent au moins un round avec ce partenaire (recherche insensible à la casse)
export const getTrainingsByPartnerName = async (partnerName: string): Promise<Training[]> => {
  const database = await openDatabase();
  const rows = await database.getAllAsync<any>(
    `SELECT * FROM trainings WHERE combat_rounds IS NOT NULL AND combat_rounds != '[]' ORDER BY date DESC`
  );
  const nameLower = partnerName.toLowerCase().trim();
  const matched: Training[] = [];
  for (const r of rows) {
    try {
      const rounds: CombatRound[] = JSON.parse(r.combat_rounds || '[]');
      const hasPartner = rounds.some(rd => rd.partner && rd.partner.toLowerCase().includes(nameLower));
      if (!hasPartner) continue;
      let exercises;
      if (r.exercises) { try { exercises = JSON.parse(r.exercises); } catch { exercises = undefined; } }
      let combat_rounds: CombatRound[] | undefined;
      try { combat_rounds = JSON.parse(r.combat_rounds); } catch { combat_rounds = undefined; }
      matched.push({
        ...r,
        exercises,
        combat_rounds,
        is_outdoor: !!r.is_outdoor,
      });
    } catch { /* skip malformed */ }
  }
  return matched;
};

export default {
  initDatabase,
  openDatabase,
  resetDatabase,
};
