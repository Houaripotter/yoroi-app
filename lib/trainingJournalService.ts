// ============================================
// 📖 YOROI - SERVICE CARNET D'ENTRAÎNEMENT
// ============================================

import { Platform } from 'react-native';

// 🔒 Platform-specific: SQLite only available on native
const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
let SQLite: any = null;
let db: any = null;

if (isNativePlatform) {
  SQLite = require('expo-sqlite');
  db = SQLite.openDatabaseSync('yoroi.db');
}

// ============================================
// TYPES
// ============================================

export type ProgressionItemType = 'technique' | 'exercise' | 'performance';
export type ProgressionStatus = 'todo' | 'in_progress' | 'mastered';
export type Sport = 'jjb' | 'mma' | 'boxe' | 'muay_thai' | 'judo' | 'karate' | 'musculation' | 'crossfit' | 'running' | 'trail' | 'autre';

export interface ProgressionItem {
  id: number;
  type: ProgressionItemType;
  sport: Sport;
  name: string;
  status: ProgressionStatus;
  target?: string;
  current_value?: string;
  progress_percent: number;
  practice_count: number;
  priority: number;
  category?: string;
  notes?: string;
  last_practiced?: string;
  mastered_date?: string;
  created_at: string;

  // Champs spécifiques Musculation/CrossFit
  current_weight?: number; // Poids actuel (kg)
  target_weight?: number;  // Poids objectif (kg)

  // Champs spécifiques Running/Trail
  distance_km?: number;     // Distance (km)
  current_time?: number;    // Temps actuel (minutes)
  target_time?: number;     // Temps objectif (minutes)

  // Champs spécifiques Arts Martiaux
  success_rate?: number;    // Taux de réussite en sparring (%)
  competition_ready?: boolean; // Prêt pour compétition
}

export interface PracticeLog {
  id: number;
  item_id: number;
  date: string;
  sets?: number;
  reps?: number;
  weight?: number;
  distance?: number;
  time?: number;
  quality_rating?: number; // 1-5
  notes?: string;
  created_at: string;
}

// ============================================
// INITIALISATION BASE DE DONNÉES
// ============================================

export const initTrainingJournalDB = () => {
  try {
    // Table progression_items
    db.execSync(`
      CREATE TABLE IF NOT EXISTS progression_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT NOT NULL,
        sport TEXT NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'todo',
        target TEXT,
        current_value TEXT,
        progress_percent INTEGER DEFAULT 0,
        practice_count INTEGER DEFAULT 0,
        priority INTEGER DEFAULT 3,
        category TEXT,
        notes TEXT,
        last_practiced TEXT,
        mastered_date TEXT,
        current_weight REAL,
        target_weight REAL,
        distance_km REAL,
        current_time INTEGER,
        target_time INTEGER,
        success_rate INTEGER,
        competition_ready INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration : Ajouter les colonnes manquantes si elles n'existent pas
    try {
      // Vérifier si les colonnes existent, sinon les ajouter
      const columns = ['current_weight', 'target_weight', 'distance_km', 'current_time', 'target_time', 'success_rate', 'competition_ready'];

      for (const column of columns) {
        try {
          db.execSync(`ALTER TABLE progression_items ADD COLUMN ${column} ${
            column === 'current_weight' || column === 'target_weight' || column === 'distance_km' ? 'REAL' :
            column === 'competition_ready' ? 'INTEGER DEFAULT 0' :
            'INTEGER'
          }`);
          console.log(`[TRAINING_JOURNAL] Colonne ${column} ajoutée`);
        } catch (e: any) {
          // La colonne existe déjà, ignorer l'erreur
          if (!e.message?.includes('duplicate column')) {
            console.log(`[TRAINING_JOURNAL] Colonne ${column} existe déjà`);
          }
        }
      }
    } catch (migrationError) {
      console.log('[TRAINING_JOURNAL] Migration des colonnes effectuée');
    }

    // Table practice_logs
    db.execSync(`
      CREATE TABLE IF NOT EXISTS practice_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        date TEXT NOT NULL,
        sets INTEGER,
        reps INTEGER,
        weight REAL,
        distance REAL,
        time INTEGER,
        quality_rating INTEGER,
        notes TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES progression_items(id) ON DELETE CASCADE
      );
    `);

    console.log('[TRAINING_JOURNAL] Base de données initialisée');
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur init DB:', error);
  }
};

// ============================================
// PROGRESSION ITEMS - CRUD
// ============================================

export const createProgressionItem = (item: Omit<ProgressionItem, 'id' | 'created_at' | 'practice_count' | 'progress_percent' | 'last_practiced' | 'mastered_date'>): number => {
  try {
    // Calculer la progression automatiquement si possible
    let initialProgress = 0;
    if (item.current_weight && item.target_weight) {
      initialProgress = Math.round((item.current_weight / item.target_weight) * 100);
    } else if (item.current_time && item.target_time) {
      // Pour le temps, c'est inversé (moins = mieux)
      initialProgress = Math.round((item.target_time / item.current_time) * 100);
    }

    const result = db.runSync(
      `INSERT INTO progression_items (
        type, sport, name, status, target, current_value, priority, category, notes,
        current_weight, target_weight, distance_km, current_time, target_time,
        success_rate, competition_ready, progress_percent
      )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        item.type,
        item.sport,
        item.name,
        item.status,
        item.target || null,
        item.current_value || null,
        item.priority,
        item.category || null,
        item.notes || null,
        item.current_weight || null,
        item.target_weight || null,
        item.distance_km || null,
        item.current_time || null,
        item.target_time || null,
        item.success_rate || null,
        item.competition_ready ? 1 : 0,
        initialProgress,
      ]
    );
    console.log('[TRAINING_JOURNAL] Item créé:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur création item:', error);
    throw error;
  }
};

export const getProgressionItems = (status?: ProgressionStatus): ProgressionItem[] => {
  try {
    let query = 'SELECT * FROM progression_items';
    const params: any[] = [];

    if (status) {
      query += ' WHERE status = ?';
      params.push(status);
    }

    query += ' ORDER BY priority DESC, created_at DESC';

    const items = db.getAllSync(query, params) as ProgressionItem[];
    console.log(`[TRAINING_JOURNAL] ${items.length} items récupérés (status: ${status || 'tous'})`);
    return items;
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur récupération items:', error);
    return [];
  }
};

export const getProgressionItemById = (id: number): ProgressionItem | null => {
  try {
    const item = db.getFirstSync('SELECT * FROM progression_items WHERE id = ?', [id]) as ProgressionItem | null;
    return item;
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur récupération item:', error);
    return null;
  }
};

export const updateProgressionItem = (id: number, updates: Partial<ProgressionItem>) => {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at') {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    const query = `UPDATE progression_items SET ${fields.join(', ')} WHERE id = ?`;

    db.runSync(query, values);
    console.log('[TRAINING_JOURNAL] Item mis à jour:', id);
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur mise à jour item:', error);
    throw error;
  }
};

export const deleteProgressionItem = (id: number) => {
  try {
    db.runSync('DELETE FROM progression_items WHERE id = ?', [id]);
    console.log('[TRAINING_JOURNAL] Item supprimé:', id);
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur suppression item:', error);
    throw error;
  }
};

export const updateItemStatus = (id: number, status: ProgressionStatus) => {
  try {
    const updates: Partial<ProgressionItem> = { status };

    // Si maîtrisé, ajouter la date
    if (status === 'mastered') {
      updates.mastered_date = new Date().toISOString();
      updates.progress_percent = 100;
    }

    updateProgressionItem(id, updates);
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur changement statut:', error);
    throw error;
  }
};

// ============================================
// PRACTICE LOGS - CRUD
// ============================================

export const createPracticeLog = (log: Omit<PracticeLog, 'id' | 'created_at'>): number => {
  try {
    const result = db.runSync(
      `INSERT INTO practice_logs (item_id, date, sets, reps, weight, distance, time, quality_rating, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        log.item_id,
        log.date,
        log.sets || null,
        log.reps || null,
        log.weight || null,
        log.distance || null,
        log.time || null,
        log.quality_rating || null,
        log.notes || null,
      ]
    );

    // Récupérer l'item pour calculer la progression
    const item = getProgressionItemById(log.item_id);

    // Mettre à jour current_weight si on a logué un poids (musculation)
    if (log.weight && item?.target_weight) {
      const newProgress = Math.min(100, Math.round((log.weight / item.target_weight) * 100));
      db.runSync(
        `UPDATE progression_items
         SET current_weight = ?,
             progress_percent = ?
         WHERE id = ?`,
        [log.weight, newProgress, log.item_id]
      );

      // Si on a atteint l'objectif, passer en mastered
      if (log.weight >= item.target_weight) {
        updateItemStatus(log.item_id, 'mastered');
      }
    }

    // Mettre à jour current_time si on a logué un temps (running)
    if (log.time && item?.target_time) {
      const newProgress = Math.min(100, Math.round((item.target_time / log.time) * 100));
      db.runSync(
        `UPDATE progression_items
         SET current_time = ?,
             progress_percent = ?
         WHERE id = ?`,
        [log.time, newProgress, log.item_id]
      );

      // Si on a battu l'objectif, passer en mastered
      if (log.time <= item.target_time) {
        updateItemStatus(log.item_id, 'mastered');
      }
    }

    // Mettre à jour le compteur de pratiques et la dernière date
    db.runSync(
      `UPDATE progression_items
       SET practice_count = practice_count + 1,
           last_practiced = ?
       WHERE id = ?`,
      [log.date, log.item_id]
    );

    // Si en todo, passer automatiquement en in_progress
    if (item?.status === 'todo') {
      updateItemStatus(log.item_id, 'in_progress');
    }

    console.log('[TRAINING_JOURNAL] Log créé:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur création log:', error);
    throw error;
  }
};

export const getPracticeLogsByItemId = (itemId: number): PracticeLog[] => {
  try {
    const logs = db.getAllSync(
      'SELECT * FROM practice_logs WHERE item_id = ? ORDER BY date DESC',
      [itemId]
    ) as PracticeLog[];
    return logs;
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur récupération logs:', error);
    return [];
  }
};

export const getLastPracticeLog = (itemId: number): PracticeLog | null => {
  try {
    const log = db.getFirstSync(
      'SELECT * FROM practice_logs WHERE item_id = ? ORDER BY date DESC LIMIT 1',
      [itemId]
    ) as PracticeLog | null;
    return log;
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur récupération dernier log:', error);
    return null;
  }
};

export const deletePracticeLog = (id: number) => {
  try {
    // Récupérer le item_id avant de supprimer
    const log = db.getFirstSync('SELECT item_id FROM practice_logs WHERE id = ?', [id]) as { item_id: number } | null;

    db.runSync('DELETE FROM practice_logs WHERE id = ?', [id]);

    // Décrémenter le compteur
    if (log) {
      db.runSync(
        'UPDATE progression_items SET practice_count = practice_count - 1 WHERE id = ?',
        [log.item_id]
      );
    }

    console.log('[TRAINING_JOURNAL] Log supprimé:', id);
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur suppression log:', error);
    throw error;
  }
};

// ============================================
// STATISTIQUES
// ============================================

export const getJournalStats = () => {
  try {
    const stats = {
      total: 0,
      todo: 0,
      in_progress: 0,
      mastered: 0,
      mastered_this_week: 0,
      total_practices: 0,
    };

    // Compter par statut
    const counts = db.getAllSync(
      'SELECT status, COUNT(*) as count FROM progression_items GROUP BY status'
    ) as { status: ProgressionStatus; count: number }[];

    counts.forEach(row => {
      stats[row.status] = row.count;
      stats.total += row.count;
    });

    // Maîtrisés cette semaine
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const masteredWeek = db.getFirstSync(
      'SELECT COUNT(*) as count FROM progression_items WHERE status = ? AND mastered_date >= ?',
      ['mastered', weekAgo.toISOString()]
    ) as { count: number };
    stats.mastered_this_week = masteredWeek?.count || 0;

    // Total pratiques
    const practices = db.getFirstSync(
      'SELECT SUM(practice_count) as total FROM progression_items'
    ) as { total: number };
    stats.total_practices = practices?.total || 0;

    return stats;
  } catch (error) {
    console.error('[TRAINING_JOURNAL] Erreur stats:', error);
    return {
      total: 0,
      todo: 0,
      in_progress: 0,
      mastered: 0,
      mastered_this_week: 0,
      total_practices: 0,
    };
  }
};

// ============================================
// LABELS
// ============================================

export const SPORT_LABELS: Record<Sport, string> = {
  jjb: 'Jiu-Jitsu Brésilien',
  mma: 'MMA',
  boxe: 'Boxe',
  muay_thai: 'Muay Thaï',
  judo: 'Judo',
  karate: 'Karaté',
  musculation: 'Musculation',
  crossfit: 'CrossFit',
  running: 'Running',
  trail: 'Trail',
  autre: 'Autre',
};

export const TYPE_LABELS: Record<ProgressionItemType, string> = {
  technique: 'Technique',
  exercise: 'Exercice',
  performance: 'Performance',
};

export const STATUS_LABELS: Record<ProgressionStatus, string> = {
  todo: 'À Faire',
  in_progress: 'En Cours',
  mastered: 'Maîtrisé',
};

export default {
  initTrainingJournalDB,
  createProgressionItem,
  getProgressionItems,
  getProgressionItemById,
  updateProgressionItem,
  deleteProgressionItem,
  updateItemStatus,
  createPracticeLog,
  getPracticeLogsByItemId,
  getLastPracticeLog,
  deletePracticeLog,
  getJournalStats,
  SPORT_LABELS,
  TYPE_LABELS,
  STATUS_LABELS,
};
