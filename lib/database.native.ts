import * as SQLite from 'expo-sqlite';
import { initTrainingJournalDB } from './trainingJournalService';
import logger from '@/lib/security/logger';

// ============================================
// YOROI DATABASE - STOCKAGE LOCAL SQLite
// ============================================

let db: SQLite.SQLiteDatabase | null = null;
let _initPromise: Promise<void> | null = null;

// Ouverture interne (sans attendre l'init - utilisé par initDatabase)
const _openDB = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('yoroi.db');
  return db;
};

// Ouvrir la base de donnees (attend que l'init soit terminée)
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
  const database = await _openDB();

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
      weight_goal TEXT DEFAULT 'lose',
      age INTEGER,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations: ajouter les colonnes manquantes si la table existe déjà
  const profileMigrations = [
    'ALTER TABLE profile ADD COLUMN profile_photo TEXT;',
    'ALTER TABLE profile ADD COLUMN birth_date TEXT;',
    "ALTER TABLE profile ADD COLUMN weight_goal TEXT DEFAULT 'lose';",
    'ALTER TABLE profile ADD COLUMN age INTEGER;',
  ];
  for (const migration of profileMigrations) {
    try {
      await database.execAsync(migration);
    } catch (_e) { /* colonne existe déjà */ }
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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Table Entrainements
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
  try {
    await database.execAsync(`ALTER TABLE trainings ADD COLUMN start_time TEXT;`);
  } catch (e) { /* colonne existe déjà */ }

  try {
    await database.execAsync(`ALTER TABLE trainings ADD COLUMN session_type TEXT;`);
  } catch (e) { /* colonne existe déjà */ }

  try {
    await database.execAsync(`ALTER TABLE trainings ADD COLUMN exercises TEXT;`);
  } catch (e) { /* colonne existe déjà */ }

  try {
    await database.execAsync(`ALTER TABLE profile ADD COLUMN profile_photo TEXT;`);
  } catch (e) { /* colonne existe déjà */ }

  try {
    await database.execAsync(`ALTER TABLE trainings ADD COLUMN technique_rating INTEGER DEFAULT NULL;`);
  } catch (e) { /* colonne existe déjà */ }

  try {
    await database.execAsync(`ALTER TABLE trainings ADD COLUMN session_types TEXT;`);
  } catch (e) { /* colonne existe déjà */ }

  try {
    await database.execAsync(`ALTER TABLE trainings ADD COLUMN technical_theme TEXT;`);
  } catch (e) { /* colonne existe déjà */ }

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
      session_type TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (club_id) REFERENCES clubs (id)
    );
  `);

  // Migration: Ajouter session_type si la table existe déjà
  try {
    await database.execAsync(`ALTER TABLE weekly_plan ADD COLUMN session_type TEXT;`);
  } catch (e) { /* colonne existe déjà */ }

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
    try {
      await database.execAsync(`ALTER TABLE competitions ADD COLUMN ${column};`);
    } catch (e) { /* colonne existe déjà */ }
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

  // Table Training Goals
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

  // Table Objectives (objectifs polyvalents avec countdown)
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      target_date TEXT NOT NULL,
      created_date TEXT NOT NULL,
      sport_id TEXT,
      target_weight REAL,
      location TEXT,
      color TEXT,
      status TEXT DEFAULT 'active',
      completed_at TEXT,
      is_pinned INTEGER DEFAULT 0,
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

  // Initialiser le carnet d'entraînement
  await initTrainingJournalDB();

  logger.info('Database initialized successfully');
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
  profile_photo?: string | null;
  birth_date?: string;
  weight_goal?: string;
  age?: number;
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
  source?: 'manual' | 'body_composition' | 'apple';
  date: string;
  created_at?: string;
  // Body measurements (optional, can be saved with weight)
  waist?: number;
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
  hips?: number;
  left_arm?: number;
  right_arm?: number;
  left_thigh?: number;
  right_thigh?: number;
  left_calf?: number;
  right_calf?: number;
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
  created_at?: string;
}

export interface Exercise {
  name: string;
  sets: number;
  reps: number;
  weight: number; // en kg
  muscle_group?: string;
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
  exercises?: Exercise[]; // For musculation workouts
  technique_rating?: number | null; // 1-5 stars rating
  created_at?: string;
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
  created_at?: string;
  // Joined fields
  club_name?: string;
  club_logo?: string;
  club_color?: string;
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

export interface Objective {
  id?: number;
  type: 'competition' | 'weight' | 'exam' | 'travel' | 'custom';
  title: string;
  description?: string;
  target_date: string;       // YYYY-MM-DD
  created_date: string;      // YYYY-MM-DD pour calculer le ratio sable
  sport_id?: string;
  target_weight?: number;
  location?: string;
  color?: string;
  status: 'active' | 'completed' | 'expired';
  completed_at?: string;
  is_pinned: boolean;
  created_at?: string;
  updated_at?: string;
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

  if (existing) {
    await database.runAsync(
      `UPDATE profile SET name = ?, height_cm = ?, target_weight = ?, start_weight = ?,
       start_date = ?, avatar_gender = ?, profile_photo = ?, birth_date = ?, weight_goal = ?, age = ? WHERE id = ?`,
      [profile.name, profile.height_cm || null, profile.target_weight || null,
       profile.start_weight || null, profile.start_date || null,
       profile.avatar_gender || 'homme', profile.profile_photo || null,
       profile.birth_date || null, profile.weight_goal || 'lose', profile.age || null,
       existing.id!]
    );
  } else {
    await database.runAsync(
      `INSERT INTO profile (name, height_cm, target_weight, start_weight, start_date, avatar_gender, profile_photo, birth_date, weight_goal, age)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [profile.name, profile.height_cm || null, profile.target_weight || null,
       profile.start_weight || null, profile.start_date || null, profile.avatar_gender || 'homme',
       profile.profile_photo || null, profile.birth_date || null, profile.weight_goal || 'lose',
       profile.age || null]
    );
  }
};

// ============================================
// FONCTIONS CRUD - POIDS
// ============================================

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
  return result.lastInsertRowId;
};

export const getWeights = async (days?: number): Promise<Weight[]> => {
  const database = await openDatabase();
  if (days) {
    const safeDays = Math.max(1, Math.min(Math.floor(Number(days)), 3650));
    return await database.getAllAsync<Weight>(
      `SELECT * FROM weights WHERE date >= date('now', '-' || ? || ' days') ORDER BY date DESC`,
      [safeDays]
    );
  }
  return await database.getAllAsync<Weight>(`SELECT * FROM weights ORDER BY date DESC`);
};

// Alias pour getAllWeights (utilisé par certains composants)
export const getAllWeights = async (): Promise<Weight[]> => {
  return getWeights(); // Retourne tous les poids sans limite de jours
};

export const getLatestWeight = async (): Promise<Weight | null> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<Weight>(
    'SELECT * FROM weights ORDER BY date DESC LIMIT 1'
  );
  return result || null;
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

export const deleteWeight = async (id: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM weights WHERE id = ?', [id]);
};

// ============================================
// FONCTIONS CRUD - ENTRAINEMENTS
// ============================================

export const addTraining = async (data: Training): Promise<number> => {
  const database = await openDatabase();
  const exercisesJson = data.exercises ? JSON.stringify(data.exercises) : null;
  const result = await database.runAsync(
    `INSERT INTO trainings (club_id, sport, session_type, date, start_time, duration_minutes, notes, muscles, exercises, technique_rating)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.club_id || null, data.sport, data.session_type || null, data.date,
     data.start_time || null, data.duration_minutes || null,
     data.notes || null, data.muscles || null, exercisesJson, data.technique_rating || null]
  );
  return result.lastInsertRowId;
};

export const getTrainings = async (days?: number): Promise<Training[]> => {
  const database = await openDatabase();
  let results: (Training & { exercises?: string })[];
  if (days) {
    const safeDays = Math.max(1, Math.min(Math.floor(Number(days)), 3650));
    results = await database.getAllAsync<Training & { exercises?: string }>(
      `SELECT t.*, t.duration_minutes as duration, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
       FROM trainings t
       LEFT JOIN clubs c ON t.club_id = c.id
       WHERE t.date >= date('now', '-' || ? || ' days')
       ORDER BY t.date DESC, t.start_time ASC`,
      [safeDays]
    );
  } else {
    results = await database.getAllAsync<Training & { exercises?: string }>(
      `SELECT t.*, t.duration_minutes as duration, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
       FROM trainings t
       LEFT JOIN clubs c ON t.club_id = c.id
       ORDER BY t.date DESC, t.start_time ASC`
    );
  }

  return results.map(r => {
    let exercises;
    if (r.exercises) {
      try {
        exercises = JSON.parse(r.exercises as string);
      } catch {
        exercises = undefined;
      }
    }
    return { ...r, exercises };
  });
};

export const getTrainingsByMonth = async (year: number, month: number): Promise<Training[]> => {
  const database = await openDatabase();
  const results = await database.getAllAsync<Training & { exercises?: string }>(
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
    return { ...r, exercises };
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

export const deleteTraining = async (id: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM trainings WHERE id = ?', [id]);
};

// ============================================
// FONCTIONS CRUD - CLUBS
// ============================================

export const addClub = async (data: Club): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO clubs (name, sport, logo_uri, color) VALUES (?, ?, ?, ?)`,
    [data.name, data.sport, data.logo_uri || null, data.color || null]
  );
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
  await database.runAsync('DELETE FROM clubs WHERE id = ?', [id]);
};

// ============================================
// FONCTIONS CRUD - MENSURATIONS
// ============================================

export const addMeasurementRecord = async (data: Measurement): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO measurements (chest, waist, hips, left_arm, right_arm, left_thigh,
     right_thigh, left_calf, right_calf, shoulders, neck, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [data.chest || null, data.waist || null, data.hips || null, data.left_arm || null,
     data.right_arm || null, data.left_thigh || null, data.right_thigh || null,
     data.left_calf || null, data.right_calf || null, data.shoulders || null,
     data.neck || null, data.date]
  );
  return result.lastInsertRowId;
};

export const getMeasurements = async (days?: number): Promise<Measurement[]> => {
  const database = await openDatabase();
  if (days) {
    const safeDays = Math.max(1, Math.min(Math.floor(Number(days)), 3650));
    return await database.getAllAsync<Measurement>(
      `SELECT * FROM measurements WHERE date >= date('now', '-' || ? || ' days') ORDER BY date DESC`,
      [safeDays]
    );
  }
  return await database.getAllAsync<Measurement>(`SELECT * FROM measurements ORDER BY date DESC`);
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
    `INSERT INTO weekly_plan (day_of_week, club_id, sport, time, duration_minutes, muscles, is_rest_day)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [data.day_of_week, data.club_id || null, data.sport, data.time || null,
     data.duration_minutes || null, data.muscles || null, data.is_rest_day ? 1 : 0]
  );
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

  if (updates.length > 0) {
    values.push(id);
    await database.runAsync(`UPDATE weekly_plan SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deleteWeeklyPlanItem = async (id: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM weekly_plan WHERE id = ?', [id]);
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
  const weights = await getWeights();
  if (weights.length === 0) return 0;

  let streak = 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Trier par date decroissante
  const sorted = [...weights].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  for (let i = 0; i < sorted.length; i++) {
    const measureDate = new Date(sorted[i].date);
    measureDate.setHours(0, 0, 0, 0);

    const expectedDate = new Date(today);
    expectedDate.setDate(today.getDate() - i);

    if (measureDate.getTime() === expectedDate.getTime()) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
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

  // Importer les entrainements
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
// RESET COMPLET DE LA BASE DE DONNEES
// ============================================

export const resetDatabase = async (): Promise<void> => {
  try {
    const database = await openDatabase();

    // Supprimer toutes les données de chaque table
    // Tables principales
    try { await database.execAsync('DELETE FROM weights;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM trainings;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM measurements;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM photos;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM achievements;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM weekly_plan;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM clubs;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM profile;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM competitions;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM objectives;'); } catch (e) { /* table peut ne pas exister */ }

    // Tables YOROI MEDIC
    try { await database.execAsync('DELETE FROM treatment_reminders;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM injury_treatments;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM injury_eva_history;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM injuries;'); } catch (e) { /* table peut ne pas exister */ }

    // Tables Carnet d'Entraînement
    try { await database.execAsync('DELETE FROM benchmark_entries;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM benchmarks;'); } catch (e) { /* table peut ne pas exister */ }
    try { await database.execAsync('DELETE FROM skills;'); } catch (e) { /* table peut ne pas exister */ }

    logger.info('Base de données SQLite réinitialisée (toutes les tables)');
  } catch (error) {
    logger.error('❌ Erreur reset database:', error);
    throw error;
  }
};

export default {
  initDatabase,
  openDatabase,
  resetDatabase,
};
