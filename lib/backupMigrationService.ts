// ============================================================
// YOROI : Service de migration de backup
// ============================================================
// Branché dans importDataFromJSON() de exportService.ts.
// Prend n'importe quelle version de backup (v1.0, v2.0, ..., v5.3)
// et la migre vers la version actuelle avant restauration.
//
// Pour ajouter une future version :
//   1. Créer une fonction migrate_X_to_Y(backup)
//   2. L'ajouter dans la chaîne MIGRATIONS
//   3. Bumper CURRENT_VERSION
// ============================================================

import logger from '@/lib/security/logger';

export const CURRENT_VERSION = '6.0';

// ─────────────────────────────────────────────
// UTILITAIRES
// ─────────────────────────────────────────────

function parseVersion(v: string | undefined | null): [number, number] {
  if (!v) return [0, 0];
  const parts = String(v).split('.').map(Number);
  return [parts[0] || 0, parts[1] || 0];
}

function versionLt(a: string | undefined | null, b: string): boolean {
  const [amaj, amin] = parseVersion(a);
  const [bmaj, bmin] = parseVersion(b);
  if (amaj !== bmaj) return amaj < bmaj;
  return amin < bmin;
}

function versionLte(a: string | undefined | null, b: string): boolean {
  return a === b || versionLt(a, b);
}

/** Fusionne un objet avec ses valeurs par défaut (ne remplace pas les valeurs existantes) */
function withDefaults<T extends Record<string, any>>(obj: T | null | undefined, defaults: T): T {
  const result: any = { ...defaults };
  if (obj && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if ((obj as any)[key] !== undefined && (obj as any)[key] !== null) {
        result[key] = (obj as any)[key];
      }
    }
  }
  return result as T;
}

/** Transforme null/undefined/string-JSON en tableau propre */
function safeParse(val: any): any[] {
  if (Array.isArray(val)) return val;
  if (val === null || val === undefined) return [];
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return []; }
  }
  return [];
}

// ─────────────────────────────────────────────
// VALEURS PAR DÉFAUT
// ─────────────────────────────────────────────

const DEFAULT_USER_SETTINGS = {
  weight_unit: 'kg',
  measurement_unit: 'cm',
  theme: 'classic',
  username: '',
  gender: 'male',
  onboardingCompleted: false,
  goal: 'lose',
  height: null,
  targetWeight: null,
  heartRateZones: {
    z1min: 0, z1max: 119,
    z2min: 120, z2max: 135,
    z3min: 136, z3max: 150,
    z4min: 151, z4max: 169,
    z5min: 170,
  },
};

const DEFAULT_APPEARANCE = {
  themeColor: null,
  themeMode: null,
  language: 'fr',
  tabOrder: null,
  avatarSelection: null,
  userGear: null,
  fighterModeSport: null,
  fighterModeCategory: null,
  fighterModeBelt: null,
};

const DEFAULT_COMBAT_LAB = {
  sparringPartners: null,
  playbookCustom: {
    gamePlan: null,
    whatWorked: null,
    whatDidntWork: null,
    counteredBy: null,
    improvement: null,
  },
  gameplanChecked: null,
  drillTracker: null,
  sparringWeeklyGoal: null,
  bjjFavSubmissions: null,
  toolFavorites: null,
};

// ─────────────────────────────────────────────
// ÉTAPES DE MIGRATION
// ─────────────────────────────────────────────

/**
 * v1.0 → v2.0
 * Première version : seulement profil + pesées.
 * Ajoute : séances, clubs, réglages, apparence.
 */
function migrate_1_to_2(backup: any): any {
  logger.info('[Migration] v1.0 → v2.0');
  return {
    ...backup,
    version: '2.0',
    appName: backup.appName || 'Yoroi',
    trainings:    backup.trainings    || [],
    clubs:        backup.clubs        || [],
    userSettings: withDefaults(backup.userSettings, DEFAULT_USER_SETTINGS),
    appearance:   withDefaults(backup.appearance,   DEFAULT_APPEARANCE),
    homeLayout:   backup.homeLayout   || [],
    selectedLogo: backup.selectedLogo || 'default',
  };
}

/**
 * v2.0 → v3.0
 * Ajout : sommeil, humeur, hydratation.
 */
function migrate_2_to_3(backup: any): any {
  logger.info('[Migration] v2.0 → v3.0');
  return {
    ...backup,
    version: '3.0',
    sleepEntries:      backup.sleepEntries      || [],
    sleepGoal:         backup.sleepGoal         ?? 480,
    moodEntries:       backup.moodEntries       || [],
    hydrationEntries:  backup.hydrationEntries  || [],
    hydrationSettings: backup.hydrationSettings || { reminderEnabled: false, reminderInterval: 120 },
  };
}

/**
 * v3.0 → v4.0
 * Ajout : compétitions, blessures, badges, photos.
 */
function migrate_3_to_4(backup: any): any {
  logger.info('[Migration] v3.0 → v4.0');
  return {
    ...backup,
    version: '4.0',
    competitions:   backup.competitions   || [],
    injuries:       backup.injuries       || [],
    unlockedBadges: backup.unlockedBadges || [],
    photos:         backup.photos         || [],
  };
}

/**
 * v4.0 → v5.0
 * Ajout : Combat Lab minimal, objectifs d'entraînement, plan hebdomadaire,
 * mensurations corporelles, compositions.
 */
function migrate_4_to_5(backup: any): any {
  logger.info('[Migration] v4.0 → v5.0');
  return {
    ...backup,
    version: '5.0',
    combatLab:        backup.combatLab        || DEFAULT_COMBAT_LAB,
    trainingGoals:    backup.trainingGoals    || [],
    weeklyPlan:       backup.weeklyPlan       || [],
    measurements:     backup.measurements     || [],
    bodyCompositions: backup.bodyCompositions || [],
  };
}

/**
 * v5.0 → v5.2
 * Ajout du flag isDemo sur chaque séance.
 * Ajout des champs cardio dans les séances.
 */
function migrate_5_to_52(backup: any): any {
  logger.info('[Migration] v5.0 → v5.2');

  const trainings = (backup.trainings || []).map((t: any) =>
    'isDemo' in t ? t : { ...t, isDemo: false }
  );

  return {
    ...backup,
    version: '5.2',
    trainings,
  };
}

/**
 * v5.2 → v5.3
 * Correction des nulls dans combatLab.
 * toolFavorites : string JSON encodée → vraie liste.
 * Ajout de sparringSessionHistory et techniqueFavorites.
 */
function migrate_52_to_53(backup: any): any {
  logger.info('[Migration] v5.2 → v5.3');

  const cl = backup.combatLab || {};

  // toolFavorites peut être une string JSON (bug original)
  let toolFavorites = cl.toolFavorites;
  if (typeof toolFavorites === 'string') {
    try { toolFavorites = JSON.parse(toolFavorites); } catch { toolFavorites = []; }
  }
  if (!Array.isArray(toolFavorites)) toolFavorites = [];

  const combatLab = {
    sparringPartners:       cl.sparringPartners       ?? null,
    playbookCustom:         cl.playbookCustom         || DEFAULT_COMBAT_LAB.playbookCustom,
    gameplanChecked:        cl.gameplanChecked        ?? null,
    drillTracker:           cl.drillTracker           ?? null,
    sparringWeeklyGoal:     cl.sparringWeeklyGoal     ?? null,
    bjjFavSubmissions:      cl.bjjFavSubmissions      ?? null,
    toolFavorites,
  };

  return {
    ...backup,
    version: '5.3',
    combatLab,
  };
}

// ─────────────────────────────────────────────
// CHAÎNE DE MIGRATION
// ─────────────────────────────────────────────

interface MigrationStep {
  from: string;
  fn: (backup: any) => any;
}

/**
 * v5.3 → v5.4
 * Ajoute mediaAssets (photo history, avatar custom, routine image, custom club logos).
 * Initialisation à vide si le backup ne contient pas ces nouveaux champs.
 */
function migrate_53_to_54(backup: any): any {
  logger.info('[Migration] v5.3 → v5.4');
  return {
    ...backup,
    version: '5.4',
    mediaAssets: backup.mediaAssets || {
      photoHistory: [],
      avatarBase64: null,
      routineImageBase64: null,
      customClubLogosBase64: {},
    },
  };
}

/**
 * v5.4 → v5.5
 * Ajoute trainingJournal (items + logs), carnet (benchmarks/skills),
 * records (personalRecords), loads (trainingLoads, healthBonusHistory, sourceFreshness).
 * Initialisation à vide si le backup ne contient pas ces nouveaux champs.
 */
function migrate_54_to_55(backup: any): any {
  logger.info('[Migration] v5.4 → v5.5');
  return {
    ...backup,
    version: '5.5',
    trainingJournal: backup.trainingJournal || { items: [], logs: [] },
    carnet: backup.carnet || { benchmarks: null, skills: null, trashBenchmarks: null, trashSkills: null },
    records: backup.records || { personalRecords: null },
    loads: backup.loads || { trainingLoads: null, healthBonusHistory: null, sourceFreshness: null },
  };
}

/**
 * v5.5 → v6.0
 * La 6.0 ajoute allTables, allStorage et allSecure (sauvegarde complète). Une sauvegarde plus ancienne
 * ne les a pas : rien à inventer, la restauration utilise les sections classiques.
 */
function migrate_55_to_60(backup: any): any {
  logger.info('[Migration] v5.5 → v6.0');
  return { ...backup, version: '6.0' };
}

const MIGRATIONS: MigrationStep[] = [
  { from: '1.0', fn: migrate_1_to_2 },
  { from: '2.0', fn: migrate_2_to_3 },
  { from: '3.0', fn: migrate_3_to_4 },
  { from: '4.0', fn: migrate_4_to_5 },
  { from: '5.0', fn: migrate_5_to_52 },
  { from: '5.2', fn: migrate_52_to_53 },
  { from: '5.3', fn: migrate_53_to_54 },
  { from: '5.4', fn: migrate_54_to_55 },
  { from: '5.5', fn: migrate_55_to_60 },
  // Prochaine version → ajouter ici :
  // { from: '6.0', fn: migrate_60_to_61 },
];

// ─────────────────────────────────────────────
// VALIDATION
// ─────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  version: string;
  userName: string;
  weightsCount: number;
  trainingsCount: number;
}

/**
 * Vérifie qu'un backup est un fichier Yoroi valide avant migration.
 * Appelle ça AVANT migrateBackup() pour donner un message d'erreur clair.
 */
export function validateBackup(backup: any): ValidationResult {
  const errors: string[] = [];

  if (!backup || typeof backup !== 'object') {
    return {
      valid: false,
      errors: ['Fichier invalide ou vide.'],
      version: 'inconnue',
      userName: 'inconnu',
      weightsCount: 0,
      trainingsCount: 0,
    };
  }

  if (!backup.appName || backup.appName !== 'Yoroi') {
    errors.push('Ce fichier ne semble pas être une sauvegarde YOROI.');
  }

  if (!backup.version) {
    errors.push('Version manquante dans le fichier.');
  }

  if (!backup.profile) {
    errors.push('Ton profil manque dans ce fichier.');
  }

  // weights peut être absent sur très vieilles versions, on ne bloque pas
  if (backup.weights !== undefined && !Array.isArray(backup.weights)) {
    errors.push('Les pesées de ce fichier sont abîmées.');
  }

  return {
    valid: errors.length === 0,
    errors,
    version: backup.version || 'inconnue',
    userName: backup.profile?.name || 'inconnu',
    weightsCount: Array.isArray(backup.weights) ? backup.weights.length : 0,
    trainingsCount: Array.isArray(backup.trainings) ? backup.trainings.length : 0,
  };
}

// ─────────────────────────────────────────────
// FONCTION PRINCIPALE
// ─────────────────────────────────────────────

/**
 * Migre un backup depuis n'importe quelle version vers la version actuelle.
 *
 * @example
 * // Dans importDataFromJSON() de exportService.ts :
 * const migrated = migrateBackup(importedData);
 * // Ensuite utiliser migrated au lieu de importedData
 */
export function migrateBackup(backup: any): any {
  if (!backup || typeof backup !== 'object') {
    throw new Error('Backup invalide.');
  }

  const originalVersion: string = backup.version || '1.0';

  if (originalVersion === CURRENT_VERSION) {
    logger.info(`[Migration] Backup déjà en v${CURRENT_VERSION}, aucune migration nécessaire.`);
    return backup;
  }

  logger.info(`[Migration] Début migration v${originalVersion} → v${CURRENT_VERSION}`);

  let b = { ...backup };
  const stepsApplied: string[] = [];

  for (const step of MIGRATIONS) {
    // Applique l'étape si la version du backup est ≤ from
    if (versionLte(b.version, step.from)) {
      b = step.fn(b);
      stepsApplied.push(`v${step.from} → v${b.version}`);
    }
  }

  // Journaliser les étapes appliquées
  if (stepsApplied.length > 0) {
    logger.info(`[Migration] Étapes appliquées : ${stepsApplied.join(', ')}`);
  }

  logger.info(`[Migration] ✅ Migration terminée : v${originalVersion} → v${b.version}`);
  return b;
}
