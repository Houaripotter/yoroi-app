/**
 * Telephone neuf ? (13 octobre 2026, soir)
 *
 * A l'import d'une sauvegarde, un telephone neuf laisse le fichier remplacer le profil et les reglages
 * poses par defaut a l'installation. Avant, la decision se prenait sur zero pesee et zero seance seulement :
 * quelqu'un qui n'avait que des photos, du sommeil ou des mensurations voyait son profil remplace.
 * Maintenant : neuf seulement si AUCUNE donnee de l'utilisateur. Au moindre doute de lecture, pas neuf
 * (on garde ce qui est la et on remplit seulement les cases vides).
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { lireCoffreBrut } from '@/lib/v2/coffre/migrationCoffre';
import type { SQLiteDatabase } from 'expo-sqlite';

/** Tables qui contiennent ce que l'utilisateur a note (hors donnees relues depuis Sante) */
export const USER_DATA_TABLES = [
  'weights', 'trainings', 'measurements', 'photos', 'competitions', 'combats', 'objectifs_poids', 'objectives',
  'hydratation', 'injuries', 'clubs', 'weekly_plan', 'progression_items', 'practice_logs', 'training_goals',
];

/** Cles de l'app qui contiennent ce que l'utilisateur a note */
export const USER_DATA_KEYS = [
  '@yoroi_photos_v2', '@yoroi_photo_history', '@yoroi_sleep_entries', '@yoroi_hydration_log', '@yoroi_hydration_history',
  '@yoroi_personal_records', '@yoroi_records_history', 'yoroi_benchmarks_v2', 'yoroi_skills_v2', '@yoroi_benchmarks_v2', '@yoroi_skills_v2',
  '@yoroi_sparring_partners', '@yoroi_user_goals', '@yoroi_yearly_objective', '@yoroi_weightcut_goal', '@yoroi_competition_extras_v1',
  '@yoroi_v2_competition_camp', '@yoroi_drill_tracker', '@yoroi_training_loads',
];

/** Donnees du coffre qui contiennent ce que l'utilisateur a note */
export const USER_DATA_SECURE_KEYS = [
  '@yoroi_measurements', '@yoroi_photos', '@yoroi_sleep_entries', '@yoroi_body_composition', '@yoroi_mood_log',
  '@yoroi_injuries', '@yoroi_fasting_history',
];


/** Une valeur stockee contient-elle quelque chose ? (liste ou objet non vide, texte non vide) */
export function hasContent(raw: string | null | undefined): boolean {
  if (raw == null) return false;
  const t = raw.trim();
  if (!t || t === 'null' || t === '[]' || t === '{}' || t === '""' || t === '0') return false;
  try {
    const v = JSON.parse(t);
    if (v == null || v === '' || v === 0 || v === false) return false;
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === 'object') return Object.keys(v).length > 0;
    return true;
  } catch {
    return true;
  }
}

/**
 * true seulement si le telephone n'a aucune donnee de l'utilisateur.
 * Une lecture qui echoue compte comme « il y a des donnees ».
 */
export async function isFreshPhone(db: SQLiteDatabase | null): Promise<boolean> {
  try {
    if (db) {
      const existing = new Set(((await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table'")) ?? []).map((t) => t.name));
      for (const t of USER_DATA_TABLES) {
        if (!existing.has(t)) continue;
        const row = await db.getFirstAsync<{ n: number }>(`SELECT COUNT(*) AS n FROM (SELECT 1 FROM "${t}" LIMIT 1)`);
        if (Number(row?.n ?? 0) > 0) return false;
      }
      if (existing.has('profile')) {
        const p = await db.getFirstAsync<{ name: string | null }>('SELECT name FROM profile LIMIT 1');
        if (p?.name && String(p.name).trim()) return false;
      }
    }
    const pairs = (await AsyncStorage.multiGet(USER_DATA_KEYS)) ?? [];
    if (pairs.some(([, v]) => hasContent(v))) return false;
    for (const k of USER_DATA_SECURE_KEYS) {
      // 28 octobre 2026 : coffre ou base a part (lib/v2/coffre/migrationCoffre.ts)
      if (hasContent(await lireCoffreBrut(k))) return false;
    }
    return true;
  } catch {
    return false;
  }
}
