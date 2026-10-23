/**
 * « Tout effacer » du Studio : remet le telephone comme une installation neuve.
 * Vide toutes les tables SQLite (le schema reste), efface tout AsyncStorage (cles avec ou
 * sans @), puis les cles SecureStore connues de YOROI (jeton createur compris).
 * Refuse si une demo est chargee : la sauvegarde des vraies donnees serait perdue.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SQLite from 'expo-sqlite';
import secureStorage from '@/lib/security/secureStorage';
import { isDemoDataActive } from '@/lib/demoDataService';
import { CREATOR_SECURE_KEYS } from './creatorStore';

/** Cles SecureStore connues (relevees dans le code ; les cles AsyncStorage sont aussi tentees) */
export const YOROI_SECURE_KEYS = [
  'yoroi_premium_cache_v1',
  '@yoroi_backup_encryption_password',
  '@yoroi_body_composition',
  '@yoroi_current_weight',
  '@yoroi_fasting_active_mode',
  '@yoroi_fasting_custom',
  '@yoroi_fasting_history',
  '@yoroi_fasting_ramadan',
  '@yoroi_fasting_start_time',
  '@yoroi_health_last_weight',
  '@yoroi_hydration_settings',
  '@yoroi_injuries',
  '@yoroi_measurements',
  '@yoroi_mood_log',
  '@yoroi_photos',
  '@yoroi_sleep_entries',
  '@yoroi_target_weight',
  '@yoroi_user_body_status',
  '@yoroi_user_settings',
  '@yoroi_water_intake',
  ...CREATOR_SECURE_KEYS,
];

export class DemoActiveError extends Error {
  constructor() {
    super('Une démo est chargée : restaure d’abord tes vraies données.');
  }
}

export async function wipeEverything(): Promise<{ tables: number; asyncKeys: number }> {
  if (await isDemoDataActive()) throw new DemoActiveError();

  // 1. SQLite : toutes les tables vidées
  let tables = 0;
  const db = await SQLite.openDatabaseAsync('yoroi.db');
  const rows = await db.getAllAsync<{ name: string }>("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'");
  for (const r of rows) {
    if (!/^[A-Za-z0-9_]+$/.test(r.name)) continue;
    try {
      await db.execAsync(`DELETE FROM "${r.name}";`);
      tables += 1;
    } catch {
      // table illisible : on continue
    }
  }

  // 2. SecureStore : les cles connues, puis chaque cle AsyncStorage (secureStorage nettoie le nom)
  const asyncKeys = [...(await AsyncStorage.getAllKeys())];
  for (const k of new Set([...YOROI_SECURE_KEYS, ...asyncKeys])) {
    await secureStorage.removeItem(k).catch(() => false);
  }

  // 3. AsyncStorage : tout, y compris les cles sans prefixe @
  await AsyncStorage.clear();
  return { tables, asyncKeys: asyncKeys.length };
}
