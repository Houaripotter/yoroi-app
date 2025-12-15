import * as SQLite from 'expo-sqlite';

// ============================================
// YOROI DATABASE - STOCKAGE LOCAL SQLite
// ============================================

let db: SQLite.SQLiteDatabase | null = null;

// Ouvrir la base de donnees
export const openDatabase = async (): Promise<SQLite.SQLiteDatabase> => {
  if (db) return db;
  db = await SQLite.openDatabaseAsync('yoroi.db');
  return db;
};

// ============================================
// INITIALISATION DES TABLES
// ============================================

export const initDatabase = async () => {
  const database = await openDatabase();

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
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

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
      date TEXT NOT NULL,
      duration_minutes INTEGER,
      notes TEXT,
      muscles TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (club_id) REFERENCES clubs (id)
    );
  `);

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

  console.log('Database initialized successfully');
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
  source?: 'manual' | 'tanita' | 'apple';
  date: string;
  created_at?: string;
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
}

export interface Club {
  id?: number;
  name: string;
  sport: string;
  logo_uri?: string;
  color?: string;
  created_at?: string;
}

export interface Training {
  id?: number;
  club_id?: number;
  sport: string;
  date: string;
  start_time?: string;
  duration_minutes?: number;
  notes?: string;
  muscles?: string;
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
       start_date = ?, avatar_gender = ? WHERE id = ?`,
      [profile.name, profile.height_cm || null, profile.target_weight || null,
       profile.start_weight || null, profile.start_date || null,
       profile.avatar_gender || 'homme', existing.id!]
    );
  } else {
    await database.runAsync(
      `INSERT INTO profile (name, height_cm, target_weight, start_weight, start_date, avatar_gender)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [profile.name, profile.height_cm || null, profile.target_weight || null,
       profile.start_weight || null, profile.start_date || null, profile.avatar_gender || 'homme']
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
  const query = days
    ? `SELECT * FROM weights WHERE date >= date('now', '-${days} days') ORDER BY date DESC`
    : `SELECT * FROM weights ORDER BY date DESC`;

  return await database.getAllAsync<Weight>(query);
};

export const getLatestWeight = async (): Promise<Weight | null> => {
  const database = await openDatabase();
  const result = await database.getFirstAsync<Weight>(
    'SELECT * FROM weights ORDER BY date DESC LIMIT 1'
  );
  return result || null;
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
  const result = await database.runAsync(
    `INSERT INTO trainings (club_id, sport, date, duration_minutes, notes, muscles)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [data.club_id || null, data.sport, data.date, data.duration_minutes || null,
     data.notes || null, data.muscles || null]
  );
  return result.lastInsertRowId;
};

export const getTrainings = async (days?: number): Promise<Training[]> => {
  const database = await openDatabase();
  const query = days
    ? `SELECT t.*, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
       FROM trainings t
       LEFT JOIN clubs c ON t.club_id = c.id
       WHERE t.date >= date('now', '-${days} days')
       ORDER BY t.date DESC`
    : `SELECT t.*, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
       FROM trainings t
       LEFT JOIN clubs c ON t.club_id = c.id
       ORDER BY t.date DESC`;

  return await database.getAllAsync<Training>(query);
};

export const getTrainingsByMonth = async (year: number, month: number): Promise<Training[]> => {
  const database = await openDatabase();
  return await database.getAllAsync<Training>(
    `SELECT t.*, c.name as club_name, c.logo_uri as club_logo, c.color as club_color
     FROM trainings t
     LEFT JOIN clubs c ON t.club_id = c.id
     WHERE strftime('%Y', t.date) = ? AND strftime('%m', t.date) = ?
     ORDER BY t.date ASC`,
    [year.toString(), month.toString().padStart(2, '0')]
  );
};

export const getTrainingStats = async (): Promise<{ sport: string; count: number; club_name?: string; club_color?: string }[]> => {
  const database = await openDatabase();
  return await database.getAllAsync(
    `SELECT
       t.sport,
       c.name as club_name,
       c.color as club_color,
       COUNT(t.id) as count
     FROM trainings t
     LEFT JOIN clubs c ON t.club_id = c.id
     GROUP BY t.sport
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
  const query = days
    ? `SELECT * FROM measurements WHERE date >= date('now', '-${days} days') ORDER BY date DESC`
    : `SELECT * FROM measurements ORDER BY date DESC`;

  return await database.getAllAsync<Measurement>(query);
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

  return {
    version: '1.0',
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
    }
  };
};

export const importData = async (jsonString: string): Promise<void> => {
  const database = await openDatabase();
  const data = JSON.parse(jsonString);

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
};

export default {
  initDatabase,
  openDatabase,
};
