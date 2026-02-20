// ============================================
// YOROI - SERVICE MODE FIGHTER
// ============================================

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import logger from '@/lib/security/logger';
import {
  UserMode,
  Sport,
  Competition,
  Combat,
  Hydratation,
  ObjectifPoids,
  UserProfile,
} from './fighterMode';

const STORAGE_KEY_MODE = '@yoroi_user_mode';
const STORAGE_KEY_SPORT = '@yoroi_user_sport';
const STORAGE_KEY_CATEGORY = '@yoroi_weight_category';
const STORAGE_KEY_BELT = '@yoroi_belt';

// 🔒 Platform-specific: SQLite only available on native
const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';
let SQLite: any = null;
let db: any = null;
let tablesInitialized = false;

if (isNativePlatform) {
  SQLite = require('expo-sqlite');
  db = SQLite.openDatabaseSync('yoroi.db');
}

// ✅ FIX: S'assurer que la table competitions existe
const ensureCompetitionsTable = () => {
  if (!isNativePlatform || !db || tablesInitialized) return;

  try {
    db.runSync(`
      CREATE TABLE IF NOT EXISTS competitions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nom TEXT NOT NULL,
        date TEXT NOT NULL,
        lieu TEXT,
        sport TEXT NOT NULL,
        categorie_poids TEXT,
        poids_max REAL,
        statut TEXT DEFAULT 'a_venir',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    tablesInitialized = true;
    logger.info('[FighterMode] Table competitions initialisée');
  } catch (error) {
    logger.error('[FighterMode] Erreur création table competitions:', error);
  }
};

// ============================================
// USER PROFILE & MODE
// ============================================

export const getUserMode = async (): Promise<UserMode> => {
  try {
    const mode = await AsyncStorage.getItem(STORAGE_KEY_MODE);
    return (mode as UserMode) || 'loisir';
  } catch (error) {
    logger.error('Error getting user mode:', error);
    return 'loisir';
  }
};

export const setUserMode = async (mode: UserMode): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_MODE, mode);
  } catch (error) {
    logger.error('Error setting user mode:', error);
    throw error;
  }
};

export const getUserSport = async (): Promise<Sport | null> => {
  try {
    const sport = await AsyncStorage.getItem(STORAGE_KEY_SPORT);
    return sport as Sport | null;
  } catch (error) {
    logger.error('Error getting user sport:', error);
    return null;
  }
};

export const setUserSport = async (sport: Sport): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_SPORT, sport);
  } catch (error) {
    logger.error('Error setting user sport:', error);
    throw error;
  }
};

export const getUserWeightCategory = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_CATEGORY);
  } catch (error) {
    logger.error('Error getting weight category:', error);
    return null;
  }
};

export const setUserWeightCategory = async (category: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_CATEGORY, category);
  } catch (error) {
    logger.error('Error setting weight category:', error);
    throw error;
  }
};

export const getUserBelt = async (): Promise<string | null> => {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY_BELT);
  } catch (error) {
    logger.error('Error getting belt:', error);
    return null;
  }
};

export const setUserBelt = async (belt: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEY_BELT, belt);
  } catch (error) {
    logger.error('Error setting belt:', error);
    throw error;
  }
};

export const getUserProfile = async (): Promise<UserProfile> => {
  const [mode, sport, categorie_poids, ceinture] = await Promise.all([
    getUserMode(),
    getUserSport(),
    getUserWeightCategory(),
    getUserBelt(),
  ]);

  return {
    mode,
    sport: sport || undefined,
    categorie_poids: categorie_poids || undefined,
    ceinture: ceinture || undefined,
  };
};

// ============================================
// COMPETITIONS
// ============================================

export const getCompetitions = async (): Promise<Competition[]> => {
  try {
    ensureCompetitionsTable(); // ✅ FIX: S'assurer que la table existe
    const result = db.getAllSync(
      'SELECT * FROM competitions ORDER BY date ASC'
    );
    return result;
  } catch (error) {
    logger.error('Error getting competitions:', error);
    return [];
  }
};

export const getUpcomingCompetitions = async (): Promise<Competition[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = db.getAllSync(
      'SELECT * FROM competitions WHERE date >= ? AND statut = ? ORDER BY date ASC',
      [today, 'a_venir']
    );
    return result;
  } catch (error) {
    logger.error('Error getting upcoming competitions:', error);
    return [];
  }
};

export const getNextCompetition = async (): Promise<Competition | null> => {
  try {
    const upcoming = await getUpcomingCompetitions();
    return upcoming[0] || null;
  } catch (error) {
    logger.error('Error getting next competition:', error);
    return null;
  }
};

/**
 * Formate le nom de la compétition selon le sport
 * Ex: "IBJJF" pour JJB, "UFC" pour MMA, etc.
 */
const formatCompetitionName = (name: string, sport?: Sport): string => {
  if (!sport) return name;
  
  // Raccourcir les noms connus selon le sport
  const nameUpper = name.toUpperCase();
  
  // JJB / BJJ
  if (sport === 'jjb') {
    if (nameUpper.includes('IBJJF')) return 'IBJJF';
    if (nameUpper.includes('CFJJB')) return 'CFJJB';
    if (nameUpper.includes('ADCC')) return 'ADCC';
    if (nameUpper.includes('WORLDS')) return 'Worlds';
    if (nameUpper.includes('PAN')) return 'Pans';
    if (nameUpper.includes('EUROPEAN')) return 'European';
  }
  
  // MMA
  if (sport === 'mma') {
    if (nameUpper.includes('UFC')) return 'UFC';
    if (nameUpper.includes('KSW')) return 'KSW';
    if (nameUpper.includes('BELLATOR')) return 'Bellator';
    if (nameUpper.includes('ONE')) return 'ONE';
  }
  
  // Boxe
  if (sport === 'boxe') {
    if (nameUpper.includes('WBC')) return 'WBC';
    if (nameUpper.includes('WBA')) return 'WBA';
    if (nameUpper.includes('IBF')) return 'IBF';
    if (nameUpper.includes('WBO')) return 'WBO';
  }
  
  // Si le nom est trop long, le raccourcir
  if (name.length > 12) {
    return name.substring(0, 10) + '...';
  }
  
  return name;
};

/**
 * Récupère le prochain événement (compétition ou combat) à venir
 * Retourne l'événement le plus proche avec le nombre de jours restants
 */
export const getNextEvent = async (): Promise<{
  type: 'competition' | 'combat' | null;
  name: string;
  daysLeft: number;
  date: string;
  sport?: Sport;
} | null> => {
  try {
    const nextCompetition = await getNextCompetition();
    
    if (nextCompetition) {
      const eventDate = new Date(nextCompetition.date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      eventDate.setHours(0, 0, 0, 0);
      
      const daysLeft = Math.ceil((eventDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysLeft >= 0) {
        return {
          type: 'competition',
          name: formatCompetitionName(nextCompetition.nom, nextCompetition.sport),
          daysLeft,
          date: nextCompetition.date,
          sport: nextCompetition.sport,
        };
      }
    }
    
    return null;
  } catch (error) {
    logger.error('Error getting next event:', error);
    return null;
  }
};

export const getCompetitionById = async (id: number): Promise<Competition | null> => {
  try {
    const result = db.getFirstSync(
      'SELECT * FROM competitions WHERE id = ?',
      [id]
    );
    return result || null;
  } catch (error) {
    logger.error('Error getting competition by id:', error);
    return null;
  }
};

export const addCompetition = async (competition: Omit<Competition, 'id' | 'created_at'>): Promise<number> => {
  try {
    ensureCompetitionsTable(); // ✅ FIX: S'assurer que la table existe
    const result = db.runSync(
      `INSERT INTO competitions (nom, date, lieu, sport, categorie_poids, poids_max, statut)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        competition.nom,
        competition.date,
        competition.lieu || null,
        competition.sport,
        competition.categorie_poids || null,
        competition.poids_max || null,
        competition.statut,
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    logger.error('Error adding competition:', error);
    throw error;
  }
};

export const updateCompetition = async (id: number, updates: Partial<Competition>): Promise<void> => {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE competitions SET ${fields.join(', ')} WHERE id = ?`;
    db.runSync(sql, values);
  } catch (error) {
    logger.error('Error updating competition:', error);
    throw error;
  }
};

export const deleteCompetition = async (id: number): Promise<void> => {
  try {
    db.runSync('DELETE FROM competitions WHERE id = ?', [id]);
  } catch (error) {
    logger.error('Error deleting competition:', error);
    throw error;
  }
};

// ============================================
// COMBATS
// ============================================

export const getCombats = async (): Promise<Combat[]> => {
  try {
    const result = db.getAllSync(
      'SELECT * FROM combats ORDER BY date DESC'
    );
    return result;
  } catch (error) {
    logger.error('Error getting combats:', error);
    return [];
  }
};

export const getCombatsByCompetition = async (competitionId: number): Promise<Combat[]> => {
  try {
    const result = db.getAllSync(
      'SELECT * FROM combats WHERE competition_id = ? ORDER BY date DESC',
      [competitionId]
    );
    return result;
  } catch (error) {
    logger.error('Error getting combats by competition:', error);
    return [];
  }
};

export const getCombatById = async (id: number): Promise<Combat | null> => {
  try {
    const result = db.getFirstSync(
      'SELECT * FROM combats WHERE id = ?',
      [id]
    );
    return result || null;
  } catch (error) {
    logger.error('Error getting combat by id:', error);
    return null;
  }
};

export const addCombat = async (combat: Omit<Combat, 'id' | 'created_at'>): Promise<number> => {
  try {
    const result = db.runSync(
      `INSERT INTO combats
       (competition_id, date, resultat, methode, technique, round, temps,
        adversaire_nom, adversaire_club, poids_pesee, poids_jour_j, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        combat.competition_id || null,
        combat.date,
        combat.resultat,
        combat.methode || null,
        combat.technique || null,
        combat.round || null,
        combat.temps || null,
        combat.adversaire_nom || null,
        combat.adversaire_club || null,
        combat.poids_pesee || null,
        combat.poids_jour_j || null,
        combat.notes || null,
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    logger.error('Error adding combat:', error);
    throw error;
  }
};

export const updateCombat = async (id: number, updates: Partial<Combat>): Promise<void> => {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE combats SET ${fields.join(', ')} WHERE id = ?`;
    db.runSync(sql, values);
  } catch (error) {
    logger.error('Error updating combat:', error);
    throw error;
  }
};

export const deleteCombat = async (id: number): Promise<void> => {
  try {
    db.runSync('DELETE FROM combats WHERE id = ?', [id]);
  } catch (error) {
    logger.error('Error deleting combat:', error);
    throw error;
  }
};

// ============================================
// HYDRATATION
// ============================================

export const getHydratationToday = async (): Promise<Hydratation[]> => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const result = db.getAllSync(
      'SELECT * FROM hydratation WHERE date = ? ORDER BY heure DESC',
      [today]
    );
    return result;
  } catch (error) {
    logger.error('Error getting hydratation:', error);
    return [];
  }
};

export const getTotalHydratationToday = async (): Promise<number> => {
  try {
    const hydrations = await getHydratationToday();
    return hydrations.reduce((sum, h) => sum + h.quantite_ml, 0);
  } catch (error) {
    logger.error('Error calculating total hydratation:', error);
    return 0;
  }
};

export const addHydratation = async (quantite_ml: number, type: Hydratation['type'] = 'eau'): Promise<number> => {
  try {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    const heure = now.toTimeString().split(' ')[0].substring(0, 5);

    const result = db.runSync(
      'INSERT INTO hydratation (date, heure, quantite_ml, type) VALUES (?, ?, ?, ?)',
      [date, heure, quantite_ml, type]
    );
    return result.lastInsertRowId;
  } catch (error) {
    logger.error('Error adding hydratation:', error);
    throw error;
  }
};

export const deleteHydratation = async (id: number): Promise<void> => {
  try {
    db.runSync('DELETE FROM hydratation WHERE id = ?', [id]);
  } catch (error) {
    logger.error('Error deleting hydratation:', error);
    throw error;
  }
};

// ============================================
// OBJECTIFS POIDS
// ============================================

export const getObjectifsPoids = async (): Promise<ObjectifPoids[]> => {
  try {
    const result = db.getAllSync(
      'SELECT * FROM objectifs_poids ORDER BY date_pesee ASC'
    );
    return result;
  } catch (error) {
    logger.error('Error getting objectifs poids:', error);
    return [];
  }
};

export const getCurrentObjectifPoids = async (): Promise<ObjectifPoids | null> => {
  try {
    const objectifs = await getObjectifsPoids();
    return objectifs.find(o => o.statut === 'en_cours') || null;
  } catch (error) {
    logger.error('Error getting current objectif poids:', error);
    return null;
  }
};

export const addObjectifPoids = async (objectif: Omit<ObjectifPoids, 'id' | 'created_at'>): Promise<number> => {
  try {
    const result = db.runSync(
      `INSERT INTO objectifs_poids (competition_id, poids_depart, poids_cible, date_pesee, statut)
       VALUES (?, ?, ?, ?, ?)`,
      [
        objectif.competition_id || null,
        objectif.poids_depart,
        objectif.poids_cible,
        objectif.date_pesee,
        objectif.statut,
      ]
    );
    return result.lastInsertRowId;
  } catch (error) {
    logger.error('Error adding objectif poids:', error);
    throw error;
  }
};

export const updateObjectifPoids = async (id: number, updates: Partial<ObjectifPoids>): Promise<void> => {
  try {
    const fields: string[] = [];
    const values: any[] = [];

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'created_at' && value !== undefined) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    });

    if (fields.length === 0) return;

    values.push(id);
    const sql = `UPDATE objectifs_poids SET ${fields.join(', ')} WHERE id = ?`;
    db.runSync(sql, values);
  } catch (error) {
    logger.error('Error updating objectif poids:', error);
    throw error;
  }
};

export default {
  getUserMode,
  setUserMode,
  getUserSport,
  setUserSport,
  getUserWeightCategory,
  setUserWeightCategory,
  getUserBelt,
  setUserBelt,
  getUserProfile,
  getCompetitions,
  getUpcomingCompetitions,
  getNextCompetition,
  getCompetitionById,
  addCompetition,
  updateCompetition,
  deleteCompetition,
  getCombats,
  getCombatsByCompetition,
  getCombatById,
  addCombat,
  updateCombat,
  deleteCombat,
  getHydratationToday,
  getTotalHydratationToday,
  addHydratation,
  deleteHydratation,
  getObjectifsPoids,
  getCurrentObjectifPoids,
  addObjectifPoids,
  updateObjectifPoids,
  getNextEvent,
};
