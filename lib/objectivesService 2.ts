// ============================================
// YOROI - SERVICE DE GESTION DES OBJECTIFS POLYVALENTS
// ============================================
// Competition, Poids, Examen, Voyage, Custom
// Avec countdown et ratio sable pour le sablier

import { openDatabase, Objective } from './database.native';

// ============================================
// TYPES
// ============================================

export type ObjectiveType = 'competition' | 'weight' | 'exam' | 'travel' | 'custom';

export interface ObjectiveTypeConfig {
  type: ObjectiveType;
  label: string;
  icon: string; // Lucide icon name
  defaultColor: string;
  emoji: string;
}

export const OBJECTIVE_TYPES: ObjectiveTypeConfig[] = [
  { type: 'competition', label: 'Competition', icon: 'Swords', defaultColor: '#EF4444', emoji: '' },
  { type: 'weight', label: 'Objectif Poids', icon: 'Scale', defaultColor: '#3B82F6', emoji: '' },
  { type: 'exam', label: 'Examen', icon: 'GraduationCap', defaultColor: '#EAB308', emoji: '' },
  { type: 'travel', label: 'Voyage / Stage', icon: 'Plane', defaultColor: '#22C55E', emoji: '' },
  { type: 'custom', label: 'Personnalise', icon: 'Target', defaultColor: '#A855F7', emoji: '' },
];

export const getTypeConfig = (type: ObjectiveType): ObjectiveTypeConfig => {
  return OBJECTIVE_TYPES.find(t => t.type === type) || OBJECTIVE_TYPES[4];
};

export interface CountdownInfo {
  totalDays: number;        // Jours total depuis creation
  daysRemaining: number;    // Jours restants
  daysElapsed: number;      // Jours ecoules
  progress: number;         // 0-1 ratio pour le sablier (0 = debut, 1 = temps ecoule)
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  formattedCountdown: string; // "12j 05h 30m"
}

// ============================================
// FONCTIONS CRUD
// ============================================

export const addObjective = async (data: Omit<Objective, 'id' | 'status' | 'is_pinned' | 'created_at' | 'updated_at'>): Promise<number> => {
  const database = await openDatabase();
  const result = await database.runAsync(
    `INSERT INTO objectives (type, title, description, target_date, created_date, sport_id, target_weight, location, color, status, is_pinned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', 0)`,
    [
      data.type,
      data.title,
      data.description || null,
      data.target_date,
      data.created_date,
      data.sport_id || null,
      data.target_weight || null,
      data.location || null,
      data.color || getTypeConfig(data.type).defaultColor,
    ]
  );
  return result.lastInsertRowId;
};

export const getActiveObjectives = async (): Promise<Objective[]> => {
  const database = await openDatabase();
  const results = await database.getAllAsync<any>(
    `SELECT * FROM objectives WHERE status = 'active' ORDER BY is_pinned DESC, target_date ASC`
  );
  return results.map(r => ({ ...r, is_pinned: r.is_pinned === 1 }));
};

export const getAllObjectives = async (): Promise<Objective[]> => {
  const database = await openDatabase();
  const results = await database.getAllAsync<any>(
    `SELECT * FROM objectives ORDER BY
      CASE status WHEN 'active' THEN 0 WHEN 'completed' THEN 1 WHEN 'expired' THEN 2 END,
      is_pinned DESC, target_date ASC`
  );
  return results.map(r => ({ ...r, is_pinned: r.is_pinned === 1 }));
};

export const getCompletedObjectives = async (): Promise<Objective[]> => {
  const database = await openDatabase();
  const results = await database.getAllAsync<any>(
    `SELECT * FROM objectives WHERE status IN ('completed', 'expired') ORDER BY updated_at DESC`
  );
  return results.map(r => ({ ...r, is_pinned: r.is_pinned === 1 }));
};

export const updateObjective = async (id: number, data: Partial<Objective>): Promise<void> => {
  const database = await openDatabase();
  const updates: string[] = [];
  const values: any[] = [];

  if (data.title !== undefined) { updates.push('title = ?'); values.push(data.title); }
  if (data.description !== undefined) { updates.push('description = ?'); values.push(data.description); }
  if (data.target_date !== undefined) { updates.push('target_date = ?'); values.push(data.target_date); }
  if (data.sport_id !== undefined) { updates.push('sport_id = ?'); values.push(data.sport_id); }
  if (data.target_weight !== undefined) { updates.push('target_weight = ?'); values.push(data.target_weight); }
  if (data.location !== undefined) { updates.push('location = ?'); values.push(data.location); }
  if (data.color !== undefined) { updates.push('color = ?'); values.push(data.color); }
  if (data.status !== undefined) { updates.push('status = ?'); values.push(data.status); }
  if (data.completed_at !== undefined) { updates.push('completed_at = ?'); values.push(data.completed_at); }
  if (data.is_pinned !== undefined) { updates.push('is_pinned = ?'); values.push(data.is_pinned ? 1 : 0); }

  if (updates.length > 0) {
    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id);
    await database.runAsync(`UPDATE objectives SET ${updates.join(', ')} WHERE id = ?`, values);
  }
};

export const deleteObjective = async (id: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync('DELETE FROM objectives WHERE id = ?', [id]);
};

export const completeObjective = async (id: number): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync(
    `UPDATE objectives SET status = 'completed', completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [new Date().toISOString(), id]
  );
};

export const togglePinObjective = async (id: number, isPinned: boolean): Promise<void> => {
  const database = await openDatabase();
  await database.runAsync(
    `UPDATE objectives SET is_pinned = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [isPinned ? 1 : 0, id]
  );
};

export const checkExpiredObjectives = async (): Promise<void> => {
  const database = await openDatabase();
  const today = new Date().toISOString().split('T')[0];
  await database.runAsync(
    `UPDATE objectives SET status = 'expired', updated_at = CURRENT_TIMESTAMP WHERE status = 'active' AND target_date < ?`,
    [today]
  );
};

// ============================================
// CALCUL COUNTDOWN (pure function)
// ============================================

export const getCountdownInfo = (obj: Objective): CountdownInfo => {
  const now = new Date();
  const target = new Date(obj.target_date + 'T23:59:59');
  const created = new Date(obj.created_date + 'T00:00:00');

  const totalMs = target.getTime() - created.getTime();
  const remainingMs = Math.max(0, target.getTime() - now.getTime());
  const elapsedMs = now.getTime() - created.getTime();

  const totalDays = Math.max(1, Math.ceil(totalMs / (1000 * 60 * 60 * 24)));
  const daysRemaining = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const daysElapsed = Math.max(0, Math.floor(elapsedMs / (1000 * 60 * 60 * 24)));

  // progress: 0 = debut (sable en haut), 1 = termine (sable en bas)
  const progress = totalMs > 0 ? Math.min(1, Math.max(0, elapsedMs / totalMs)) : 1;

  const hours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);

  const isExpired = remainingMs <= 0;

  let formattedCountdown: string;
  if (isExpired) {
    formattedCountdown = 'Termine';
  } else if (daysRemaining > 0) {
    formattedCountdown = `${daysRemaining}j ${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m`;
  } else {
    formattedCountdown = `${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
  }

  return {
    totalDays,
    daysRemaining,
    daysElapsed,
    progress,
    hours,
    minutes,
    seconds,
    isExpired,
    formattedCountdown,
  };
};
