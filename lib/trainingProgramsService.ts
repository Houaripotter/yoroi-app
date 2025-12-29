// ============================================
// 📚 YOROI - SERVICE PROGRAMMES D'ENTRAÎNEMENT
// ============================================

import * as SQLite from 'expo-sqlite';
import { Sport } from './trainingJournalService';

const db = SQLite.openDatabaseSync('yoroi.db');

// ============================================
// TYPES
// ============================================

export interface TrainingProgram {
  id: number;
  name: string;
  description?: string;
  sport?: Sport;
  target_duration_weeks?: number;
  created_at: string;
  updated_at: string;
}

export interface ProgramItem {
  id: number;
  program_id: number;
  item_id: number;
  order_index: number;
  created_at: string;
}

export interface ProgramWithProgress extends TrainingProgram {
  total_items: number;
  mastered_items: number;
  in_progress_items: number;
  completion_rate: number;
}

// ============================================
// INITIALISATION BASE DE DONNÉES
// ============================================

export const initProgramsTables = () => {
  try {
    // Table des programmes
    db.execSync(`
      CREATE TABLE IF NOT EXISTS training_programs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        sport TEXT,
        target_duration_weeks INTEGER,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);

    // Table de liaison programme-objectifs
    db.execSync(`
      CREATE TABLE IF NOT EXISTS program_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        program_id INTEGER NOT NULL,
        item_id INTEGER NOT NULL,
        order_index INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (program_id) REFERENCES training_programs(id) ON DELETE CASCADE,
        FOREIGN KEY (item_id) REFERENCES progression_items(id) ON DELETE CASCADE,
        UNIQUE(program_id, item_id)
      );
    `);

    // Index pour améliorer les performances
    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_program_items_program_id
      ON program_items(program_id);
    `);

    db.execSync(`
      CREATE INDEX IF NOT EXISTS idx_program_items_item_id
      ON program_items(item_id);
    `);

    console.log('[PROGRAMS] Tables initialisées avec succès');
  } catch (error) {
    console.error('[PROGRAMS] Erreur initialisation tables:', error);
  }
};

// ============================================
// CRUD PROGRAMMES
// ============================================

export const createProgram = (
  name: string,
  description?: string,
  sport?: Sport,
  targetDurationWeeks?: number
): number => {
  try {
    const now = new Date().toISOString();
    const result = db.runSync(
      `INSERT INTO training_programs (name, description, sport, target_duration_weeks, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [name, description || null, sport || null, targetDurationWeeks || null, now, now]
    );
    console.log('[PROGRAMS] Programme créé:', result.lastInsertRowId);
    return result.lastInsertRowId;
  } catch (error) {
    console.error('[PROGRAMS] Erreur création programme:', error);
    throw error;
  }
};

export const getAllPrograms = (): TrainingProgram[] => {
  try {
    const programs = db.getAllSync(
      'SELECT * FROM training_programs ORDER BY created_at DESC'
    ) as TrainingProgram[];
    return programs;
  } catch (error) {
    console.error('[PROGRAMS] Erreur récupération programmes:', error);
    return [];
  }
};

export const getProgramById = (id: number): TrainingProgram | null => {
  try {
    const program = db.getFirstSync(
      'SELECT * FROM training_programs WHERE id = ?',
      [id]
    ) as TrainingProgram | null;
    return program;
  } catch (error) {
    console.error('[PROGRAMS] Erreur récupération programme:', error);
    return null;
  }
};

export const updateProgram = (
  id: number,
  name: string,
  description?: string,
  sport?: Sport,
  targetDurationWeeks?: number
): void => {
  try {
    const now = new Date().toISOString();
    db.runSync(
      `UPDATE training_programs
       SET name = ?, description = ?, sport = ?, target_duration_weeks = ?, updated_at = ?
       WHERE id = ?`,
      [name, description || null, sport || null, targetDurationWeeks || null, now, id]
    );
    console.log('[PROGRAMS] Programme mis à jour:', id);
  } catch (error) {
    console.error('[PROGRAMS] Erreur mise à jour programme:', error);
    throw error;
  }
};

export const deleteProgram = (id: number): void => {
  try {
    // Les program_items seront supprimés automatiquement grâce à ON DELETE CASCADE
    db.runSync('DELETE FROM training_programs WHERE id = ?', [id]);
    console.log('[PROGRAMS] Programme supprimé:', id);
  } catch (error) {
    console.error('[PROGRAMS] Erreur suppression programme:', error);
    throw error;
  }
};

// ============================================
// GESTION DES OBJECTIFS DANS UN PROGRAMME
// ============================================

export const addItemToProgram = (programId: number, itemId: number): void => {
  try {
    // Obtenir le prochain order_index
    const maxOrder = db.getFirstSync(
      'SELECT MAX(order_index) as max_order FROM program_items WHERE program_id = ?',
      [programId]
    ) as { max_order: number | null } | null;

    const nextOrder = (maxOrder?.max_order || 0) + 1;
    const now = new Date().toISOString();

    db.runSync(
      'INSERT INTO program_items (program_id, item_id, order_index, created_at) VALUES (?, ?, ?, ?)',
      [programId, itemId, nextOrder, now]
    );

    console.log('[PROGRAMS] Objectif ajouté au programme:', { programId, itemId, nextOrder });
  } catch (error) {
    console.error('[PROGRAMS] Erreur ajout objectif au programme:', error);
    throw error;
  }
};

export const removeItemFromProgram = (programId: number, itemId: number): void => {
  try {
    db.runSync(
      'DELETE FROM program_items WHERE program_id = ? AND item_id = ?',
      [programId, itemId]
    );
    console.log('[PROGRAMS] Objectif retiré du programme:', { programId, itemId });
  } catch (error) {
    console.error('[PROGRAMS] Erreur retrait objectif du programme:', error);
    throw error;
  }
};

export const reorderProgramItems = (programId: number, itemOrders: { itemId: number; order: number }[]): void => {
  try {
    db.withTransactionSync(() => {
      itemOrders.forEach(({ itemId, order }) => {
        db.runSync(
          'UPDATE program_items SET order_index = ? WHERE program_id = ? AND item_id = ?',
          [order, programId, itemId]
        );
      });
    });
    console.log('[PROGRAMS] Ordre des objectifs mis à jour');
  } catch (error) {
    console.error('[PROGRAMS] Erreur réorganisation objectifs:', error);
    throw error;
  }
};

export const getProgramItems = (programId: number) => {
  try {
    const items = db.getAllSync(`
      SELECT
        pi.*,
        prog_item.id as progression_id,
        prog_item.name,
        prog_item.sport,
        prog_item.type,
        prog_item.status,
        prog_item.progress_percent,
        prog_item.practice_count,
        prog_item.priority,
        prog_item.notes
      FROM program_items pi
      INNER JOIN progression_items prog_item ON pi.item_id = prog_item.id
      WHERE pi.program_id = ?
      ORDER BY pi.order_index ASC
    `, [programId]);

    return items;
  } catch (error) {
    console.error('[PROGRAMS] Erreur récupération objectifs du programme:', error);
    return [];
  }
};

// ============================================
// STATISTIQUES DES PROGRAMMES
// ============================================

export const getProgramsWithProgress = (): ProgramWithProgress[] => {
  try {
    const programs = getAllPrograms();

    const programsWithProgress: ProgramWithProgress[] = programs.map(program => {
      const items = getProgramItems(program.id);
      const total = items.length;
      const mastered = items.filter((item: any) => item.status === 'mastered').length;
      const inProgress = items.filter((item: any) => item.status === 'in_progress').length;
      const completionRate = total > 0 ? Math.round((mastered / total) * 100) : 0;

      return {
        ...program,
        total_items: total,
        mastered_items: mastered,
        in_progress_items: inProgress,
        completion_rate: completionRate,
      };
    });

    return programsWithProgress;
  } catch (error) {
    console.error('[PROGRAMS] Erreur stats programmes:', error);
    return [];
  }
};

export const getProgramProgress = (programId: number) => {
  try {
    const items = getProgramItems(programId);
    const total = items.length;

    if (total === 0) {
      return {
        total: 0,
        todo: 0,
        in_progress: 0,
        mastered: 0,
        completion_rate: 0,
      };
    }

    const todo = items.filter((item: any) => item.status === 'todo').length;
    const inProgress = items.filter((item: any) => item.status === 'in_progress').length;
    const mastered = items.filter((item: any) => item.status === 'mastered').length;
    const completionRate = Math.round((mastered / total) * 100);

    return {
      total,
      todo,
      in_progress: inProgress,
      mastered,
      completion_rate: completionRate,
    };
  } catch (error) {
    console.error('[PROGRAMS] Erreur progression programme:', error);
    return {
      total: 0,
      todo: 0,
      in_progress: 0,
      mastered: 0,
      completion_rate: 0,
    };
  }
};

// Initialiser les tables au démarrage
initProgramsTables();

export default {
  createProgram,
  getAllPrograms,
  getProgramById,
  updateProgram,
  deleteProgram,
  addItemToProgram,
  removeItemFromProgram,
  reorderProgramItems,
  getProgramItems,
  getProgramsWithProgress,
  getProgramProgress,
};
