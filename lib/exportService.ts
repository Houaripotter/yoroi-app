import { track } from '@/utils/telemetry';
import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { getDocumentAsync } from 'expo-document-picker';
import { captureRef } from 'react-native-view-shot';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureStorage from './security/secureStorage';
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { isBackupEncryptionEnabled, getStoredEncryptionPassword, encryptBackup, isEncryptedBackup, decryptBackup, DecryptionError } from './backupEncryption';
import { requestPassword } from './passwordPromptController';
import { entreesDeSauvegarde, reprendrePeseesDuCoffre } from './databaseReprisePesees';
import {
  getAllMeasurements,
  getUserSettings,
  getPhotosFromStorage,
  getHomeLayout,
  getSelectedLogo,
  getAllHydrationEntries,
  getHydrationSettings,
  saveUserSettings,
  saveHomeLayout,
  saveSelectedLogo,
  saveHydrationSettings,
  getMoods,
  saveMood,
  getPhotosStrict,
} from './storage';
import { getSleepEntries, getSleepGoal } from './sleepService';
import { getWeights, getTrainings, getProfile, addWeight, addTraining, getClubs, addClub, addMeasurementRecord, saveProfile, getInjuries, addInjury, getCompetitions, addCompetition, getWeeklyPlan, addWeeklyPlanItem, openDatabase, getMeasurements as getSqlMeasurements, WEIGHT_SCALE_COLUMNS, updateWeightScaleJson } from './database';
import { getAllBodyCompositions, addBodyComposition } from './bodyComposition';
import { getUnlockedBadges, unlockBadge } from './badges';
import { getAllGoals, setGoal } from './trainingGoalsService';
import logger from '@/lib/security/logger';
import { validate, VALIDATION_RULES } from './validation';
import { migrateBackup, validateBackup, CURRENT_VERSION as CURRENT_BACKUP_VERSION } from './backupMigrationService';
import {
  collectAllStorage, collectAllTables, collectSecure, isNewerBackupVersion, mergeStoredValue,
  restoreAllStorage, restoreSecure, restoreTables,
} from '@/lib/v2/sauvegarde/fusion';
import type { IdMaps } from '@/lib/v2/sauvegarde/fusion';
import { rebaseLocalUri } from '@/lib/v2/sauvegarde/chemins';
import { isFreshPhone } from '@/lib/v2/sauvegarde/telephoneNeuf';
import { isSafetyFile, restoreSafetyFile, safetyReportText } from '@/lib/v2/sauvegarde/copiesSecurite';
import { ARMURE_STORAGE_KEYS, requestArmureCatchup, restoreArmureFromStorage } from '@/lib/v2/armure';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { illustrer } from '@/components/yoroi/v2/messages/illustrer';
import { traduire, traduirePluriel, LOCALE } from '@/lib/i18n/tr';

/**
 * Restauration : remet la date d'enregistrement d'origine sur la ligne insérée (même principe
 * que importData dans lib/database.native.ts). Sans elle, tout l'historique restauré passe
 * pour antidaté et ne rapporte plus rien dans le Dojo.
 */
const keepCreatedAt = async (table: 'weights' | 'trainings' | 'measurements', id: number, createdAt: unknown): Promise<void> => {
  if (!id || typeof createdAt !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(createdAt)) return;
  try {
    const database: any = await openDatabase();
    if (!database) return;
    await database.runAsync(`UPDATE ${table} SET created_at = ? WHERE id = ?`, [createdAt.replace('T', ' ').slice(0, 19), id]);
  } catch {
    // non bloquant : la reprise de l'armure rattrape les lignes anciennes
  }
};

// ============================================
// HELPERS IMPORT SÉCURISÉ
// ============================================

/**
 * Sanitise un objet avant insertion en base :
 * - Champs numériques hors plage → null (on ne perd pas le record, on neutralise le champ)
 * - Champs texte trop longs → tronqués
 * - Types incorrects → null
 */
function sanitizeImportRecord<T extends Record<string, any>>(record: T): T {
  const sanitized: any = {};
  for (const [key, value] of Object.entries(record)) {
    const rule = VALIDATION_RULES[key];
    if (!rule) {
      // Champ inconnu : tronquer si string très longue, sinon passer tel quel
      // Les champs *_json (tracé GPS, FC...) ne sont jamais tronqués : un JSON coupé est inutilisable
      if (typeof value === 'string' && value.length > 2000 && !key.endsWith('_json')) {
        sanitized[key] = value.slice(0, 2000);
      } else {
        sanitized[key] = value;
      }
      continue;
    }
    const result = validate(key, value);
    // Si valide → valeur nettoyée ; si invalide → null (champ facultatif neutralisé)
    // Notes trop longues : on tronque plutôt que de tout effacer
    if (!result.valid && typeof value === 'string' && (key === 'notes' || key === 'note')) {
      sanitized[key] = value.slice(0, 1000);
    } else if (!result.valid && typeof value === 'number' && Number.isFinite(value) && value >= 0) {
      // Restauration : un nombre que l'app avait enregistre n'est jamais jete (ex : tour d'epaules de 120 cm,
      // refuse a tort par une ancienne limite a 100). On garde la valeur telle quelle.
      sanitized[key] = value;
    } else {
      sanitized[key] = result.valid ? result.value : null;
    }
  }
  return sanitized as T;
}

// ============================================
// CONFIGURATION
// ============================================

const EXPORT_VERSION = '6.0'; // v6.0 : sauvegarde complète (toutes les tables, toutes les clés de l'app, coffre) ; v5.5 : Training Journal, Carnet, débriefs séance, records, training loads

// ============================================
// UTILITAIRES IMAGES
// ============================================

/**
 * Convertit une image URI en base64
 */
const imageToBase64 = async (input: string | undefined | null): Promise<string | null> => {
  if (!input) return null;
  // Ancien chemin d'iPhone (dossier de l'app change a la mise a jour) : recolle sur le dossier actuel
  const uri = rebaseLocalUri(input);
  try {
    // Vérifier si le fichier existe
    const fileInfo = await FileSystem.getInfoAsync(uri);
    if (!fileInfo.exists) return null;

    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return base64;
  } catch (error) {
    logger.warn('Impossible de convertir image en base64:', uri);
    return null;
  }
};

/**
 * Sauvegarde une image base64 en fichier local
 */
const base64ToImage = async (base64: string, fileName: string): Promise<string | null> => {
  if (!base64) return null;
  try {
    const uri = `${FileSystem.documentDirectory}${fileName}`;
    await FileSystem.writeAsStringAsync(uri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return uri;
  } catch (error) {
    logger.warn('Impossible de sauvegarder image depuis base64:', fileName);
    return null;
  }
};

// ============================================
// EXPORT & PARTAGE
// ============================================

/**
 * Exporte toutes les données utilisateur en JSON (avec images en base64)
 */
/**
 * Exporte toutes les données en JSON.
 * @param options.silent Si true, pas de modal de partage ni d'Alert (pour les backups auto).
 * @param options.includePhotos Si false, les photos sont exclues (backup léger, 10-50x plus petit).
 *                              Utile pour : envoi par email, stockage limité, backup rapide sans média.
 */
export const exportDataToJSON = async (options?: { silent?: boolean; includePhotos?: boolean }): Promise<boolean> => {
  const silent = options?.silent === true;
  const includePhotos = options?.includePhotos !== false; // par défaut : inclure les photos
  if (!silent) track('sauvegarde_exportee', { type: 'json' });
  try {
    // ─── Check espace disque libre avant de commencer ─────────────────
    // Un backup complet avec photos peut faire 50-100 MB. On vérifie qu'on a
    // au moins 100 MB libre pour éviter de corrompre le backup ou de créer
    // un fichier partiel.
    try {
      const freeDiskBytes = await FileSystem.getFreeDiskStorageAsync();
      const minRequired = includePhotos ? 100 * 1024 * 1024 : 5 * 1024 * 1024; // 100 MB ou 5 MB
      if (freeDiskBytes < minRequired) {
        logger.warn(`[Backup] Espace disque insuffisant : ${Math.round(freeDiskBytes / 1024 / 1024)} MB libre`);
        if (!silent) {
          appAlert(
            traduire('Plus assez de place'),
            traduire("Il te reste {0} Mo sur ce téléphone. Une sauvegarde {1} a besoin d’au moins {2} Mo.\n\nLibère de l'espace (supprime des apps ou photos) puis réessaie.", Math.round(freeDiskBytes / 1024 / 1024), includePhotos ? 'complète' : 'légère', Math.round(minRequired / 1024 / 1024))
          );
        }
        return false;
      }
    } catch (e) {
      // Si on ne peut pas récupérer l'espace libre, on continue quand même
      logger.warn('[Backup] Check espace disque échoué, on continue:', e);
    }

    logger.info(`Début export JSON ${silent ? '(silent)' : ''} ${includePhotos ? 'avec' : 'SANS'} images...`);

    // Récupérer toutes les données depuis la base SQLite et AsyncStorage
    const [
      profile,
      weights,
      trainings,
      bodyCompositions,
      clubs,
      measurements,
      userSettings,
      unlockedBadges,
      photos,
      homeLayout,
      selectedLogo,
      hydrationEntries,
      hydrationSettings,
      sleepEntries,
      sleepGoal,
      moodEntries,
      injuries,
      competitions,
      weeklyPlan,
      trainingGoals,
      // Paramètres de personnalisation (AsyncStorage)
      themeColor,
      themeMode,
      language,
      tabOrder,
      avatarSelection,
      userGear,
      fighterModeSport,
      fighterModeCategory,
      fighterModeBelt,
    ] = await Promise.all([
      getProfile(),
      getWeights(),
      getTrainings(),
      getAllBodyCompositions(),
      getClubs(),
      getAllMeasurements(),
      getUserSettings(),
      getUnlockedBadges(),
      getPhotosFromStorage(),
      getHomeLayout(),
      getSelectedLogo(),
      getAllHydrationEntries(),
      getHydrationSettings(),
      getSleepEntries(),
      getSleepGoal(),
      getMoods(),
      getInjuries().catch(() => []),
      getCompetitions().catch(() => []),
      getWeeklyPlan().catch(() => []),
      getAllGoals().catch(() => []),
      AsyncStorage.getItem('yoroi_theme_color_v5').catch(() => null),
      AsyncStorage.getItem('yoroi_theme_mode_v5').catch(() => null),
      AsyncStorage.getItem('@yoroi_language').catch(() => null),
      AsyncStorage.getItem('@yoroi_tab_order').catch(() => null),
      AsyncStorage.getItem('@yoroi_avatar_config').catch(() => null),
      AsyncStorage.getItem('@yoroi_user_gear').catch(() => null),
      AsyncStorage.getItem('@yoroi_user_mode').catch(() => null),
      AsyncStorage.getItem('@yoroi_weight_category').catch(() => null),
      AsyncStorage.getItem('@yoroi_belt').catch(() => null),
    ]);

    // ─── v5.3 : Combat Lab : sparring, game plan, drills ────────────────────
    // ─── v5.4 : Photo history (frames) ───────────────────────────────────
    const [
      sparringPartners,
      playbookGamePlan,
      playbookWorked,
      playbookDidntWork,
      playbookCountered,
      playbookImprovement,
      gameplanChecked,
      drillTracker,
      sparringWeeklyGoal,
      bjjFavSubmissions,
      sparringTool_favorites,
      photoHistoryRaw,
    ] = await Promise.all([
      AsyncStorage.getItem('@yoroi_sparring_partners').catch(() => null),
      AsyncStorage.getItem('@yoroi_playbook_custom_gamePlan').catch(() => null),
      AsyncStorage.getItem('@yoroi_playbook_custom_whatWorked').catch(() => null),
      AsyncStorage.getItem('@yoroi_playbook_custom_whatDidntWork').catch(() => null),
      AsyncStorage.getItem('@yoroi_playbook_custom_counteredBy').catch(() => null),
      AsyncStorage.getItem('@yoroi_playbook_custom_improvement').catch(() => null),
      AsyncStorage.getItem('@yoroi_gameplan_checked').catch(() => null),
      AsyncStorage.getItem('@yoroi_drill_tracker').catch(() => null),
      AsyncStorage.getItem('@sparring_weekly_goal').catch(() => null),
      AsyncStorage.getItem('bjj_fav_submissions_v2').catch(() => null),
      AsyncStorage.getItem('@yoroi_tool_favorites').catch(() => null),
      AsyncStorage.getItem('@yoroi_photo_history').catch(() => null),
    ]);

    // ─── v5.5 : Training Journal (SQLite) + Carnet + Records + Loads ────────
    let progressionItems: any[] = [];
    let practiceLogs: any[] = [];
    try {
      const db = await openDatabase();
      progressionItems = await db.getAllAsync<any>('SELECT * FROM progression_items').catch(() => []);
      practiceLogs = await db.getAllAsync<any>('SELECT * FROM practice_logs').catch(() => []);
    } catch { /* tables peut-être pas encore créées, OK */ }

    const [
      benchmarksRaw,
      skillsRaw,
      trashBenchmarksRaw,
      trashSkillsRaw,
      personalRecordsRaw,
      trainingLoadsRaw,
      healthBonusHistoryRaw,
      sourceFreshnessRaw,
    ] = await Promise.all([
      // Le carnet est range sous 'yoroi_benchmarks_v2' (sans @) : l'ancienne lecture avec @ ne trouvait rien,
      // le carnet n'etait donc jamais dans les sauvegardes
      AsyncStorage.getItem('yoroi_benchmarks_v2').then((v) => v ?? AsyncStorage.getItem('@yoroi_benchmarks_v2')).catch(() => null),
      AsyncStorage.getItem('yoroi_skills_v2').then((v) => v ?? AsyncStorage.getItem('@yoroi_skills_v2')).catch(() => null),
      AsyncStorage.getItem('yoroi_trash_benchmarks_v2').then((v) => v ?? AsyncStorage.getItem('@yoroi_trash_benchmarks_v2')).catch(() => null),
      AsyncStorage.getItem('yoroi_trash_skills_v2').then((v) => v ?? AsyncStorage.getItem('@yoroi_trash_skills_v2')).catch(() => null),
      AsyncStorage.getItem('@yoroi_personal_records').catch(() => null),
      AsyncStorage.getItem('@yoroi_training_loads').catch(() => null),
      AsyncStorage.getItem('@yoroi_health_bonus_history').catch(() => null),
      AsyncStorage.getItem('@yoroi_source_freshness').catch(() => null),
    ]);

    // ─── v6.0 : TOUT le reste (Dojo, scènes, personnage, style, minuteurs, objectifs, combats, eau...) ─
    let allTables: Record<string, Record<string, unknown>[]> = {};
    let allStorage: Record<string, string> = {};
    let allSecure: Record<string, string> = {};
    try {
      const db = await openDatabase();
      if (db) allTables = await collectAllTables(db, ['profile', 'weights', 'trainings', 'clubs', 'measurements', 'competitions', 'weekly_plan', 'injuries', 'progression_items', 'practice_logs', 'training_goals']);
    } catch (e) { logger.warn('[Backup] Tables complémentaires non lues:', e); }
    try { allStorage = await collectAllStorage(); } catch (e) { logger.warn('[Backup] Clés de l’app non lues:', e); }
    try { allSecure = await collectSecure(); } catch (e) { logger.warn('[Backup] Coffre non lu:', e); }

    // Une sauvegarde automatique VIDE ne remplace jamais une bonne : si la précédente avait des pesées
    // ou des séances et que celle-ci n'en a aucune (lecture ratée, base pas prête), on n'écrit rien.
    const counts = { weights: (weights || []).length, trainings: (trainings || []).length, photos: (photos || []).length };
    if (silent) {
      try {
        const prev = JSON.parse((await AsyncStorage.getItem('@yoroi_backup_last_counts')) ?? 'null');
        const prevTotal = Number(prev?.weights ?? 0) + Number(prev?.trainings ?? 0);
        if (prevTotal > 0 && counts.weights + counts.trainings === 0) {
          logger.warn('[Backup] Sauvegarde automatique vide refusée (la précédente contenait des données)');
          return false;
        }
      } catch { /* pas de compte précédent */ }
    }

    // === CONVERTIR LES IMAGES EN BASE64 (sauf si includePhotos=false) ===

    // 1. Photo de profil
    let profilePhotoBase64: string | null = null;
    if (includePhotos && profile?.profile_photo) {
      profilePhotoBase64 = await imageToBase64(profile.profile_photo);
      logger.info('Photo de profil convertie en base64');
    }

    // 2. Logos des clubs
    const clubsWithLogos = await Promise.all(
      (clubs || []).map(async (club: any) => {
        let logoBase64: string | null = null;
        if (includePhotos && club.logo_uri && !club.logo_uri.startsWith('builtin:')) {
          logoBase64 = await imageToBase64(club.logo_uri);
        }
        return {
          ...club,
          logo_base64: logoBase64, // Image en base64 pour le backup
        };
      })
    );
    if (includePhotos) logger.info(`${clubsWithLogos.filter((c: any) => c.logo_base64).length} logos de clubs convertis`);

    // 3. Photos de transformation (si URI locales)
    //    Le champ officiel est `file_uri` (cf. lib/storage.ts Photo interface).
    //    On garde `photo.uri` en fallback pour compatibilité avec d'anciens backups.
    const photosWithBase64 = await Promise.all(
      (photos || []).map(async (photo: any) => {
        let imageBase64: string | null = null;
        const sourceUri: string | undefined = photo.file_uri || photo.uri;
        if (includePhotos && sourceUri && !sourceUri.startsWith('http') && !sourceUri.startsWith('data:')) {
          imageBase64 = await imageToBase64(sourceUri);
        }
        return {
          ...photo,
          image_base64: imageBase64,
        };
      })
    );
    if (includePhotos) logger.info(`${photosWithBase64.filter((p: any) => p.image_base64).length} photos converties`);

    // 4. Photos des partenaires sparring (URI file:// locaux → base64)
    let sparringPartnersWithPhotos = sparringPartners;
    if (sparringPartners) {
      try {
        const parsedPartners: any[] = JSON.parse(sparringPartners);
        const converted = await Promise.all(
          parsedPartners.map(async (partner: any) => {
            if (includePhotos && partner.photoUri && !partner.photoUri.startsWith('http') && !partner.photoUri.startsWith('data:')) {
              const b64 = await imageToBase64(partner.photoUri);
              if (b64) {
                return { ...partner, photoBase64: b64, photoUri: partner.photoUri };
              }
            }
            return partner;
          })
        );
        sparringPartnersWithPhotos = JSON.stringify(converted);
        const count = converted.filter((p: any) => p.photoBase64).length;
        logger.info(`${count} photos de partenaires sparring converties en base64`);
      } catch {
        logger.warn('Impossible de convertir les photos des partenaires sparring');
      }
    }

    // 5. Historique photo (frames), array d'URIs stocké dans @yoroi_photo_history
    let photoHistoryWithBase64: Array<{ uri: string; base64: string | null }> = [];
    if (includePhotos && photoHistoryRaw) {
      try {
        const uris: string[] = JSON.parse(photoHistoryRaw);
        photoHistoryWithBase64 = await Promise.all(
          (Array.isArray(uris) ? uris : []).map(async (u: string) => {
            if (u && !u.startsWith('http') && !u.startsWith('data:')) {
              const b64 = await imageToBase64(u);
              return { uri: u, base64: b64 };
            }
            return { uri: u, base64: null };
          })
        );
        const count = photoHistoryWithBase64.filter((p) => p.base64).length;
        logger.info(`${count} photos d'historique frames converties en base64`);
      } catch {
        logger.warn('Impossible de convertir photoHistory');
      }
    }

    // 6. Avatar custom (userSettings.avatarUri)
    let avatarBase64: string | null = null;
    const avatarUri = (userSettings as any)?.avatarUri as string | undefined;
    if (includePhotos && avatarUri && !avatarUri.startsWith('http') && !avatarUri.startsWith('data:')) {
      avatarBase64 = await imageToBase64(avatarUri);
      if (avatarBase64) logger.info('Avatar custom converti en base64');
    }

    // 7. Routine image (userSettings.routine_image_uri)
    let routineImageBase64: string | null = null;
    const routineImageUri = (userSettings as any)?.routine_image_uri as string | undefined;
    if (includePhotos && routineImageUri && !routineImageUri.startsWith('http') && !routineImageUri.startsWith('data:')) {
      routineImageBase64 = await imageToBase64(routineImageUri);
      if (routineImageBase64) logger.info('Image de routine convertie en base64');
    }

    // 8. Logos custom des clubs (userSettings.custom_club_logos)
    const customClubLogosBase64: { [key: string]: string } = {};
    const customClubLogos = (userSettings as any)?.custom_club_logos as { [k: string]: string } | undefined;
    if (includePhotos && customClubLogos && typeof customClubLogos === 'object') {
      for (const [name, uri] of Object.entries(customClubLogos)) {
        if (uri && !uri.startsWith('http') && !uri.startsWith('data:') && !uri.startsWith('builtin:')) {
          const b64 = await imageToBase64(uri);
          if (b64) customClubLogosBase64[name] = b64;
        }
      }
      const count = Object.keys(customClubLogosBase64).length;
      if (count > 0) logger.info(`${count} logos de clubs custom convertis en base64`);
    }

    const exportData = {
      version: EXPORT_VERSION,
      exportDate: new Date().toISOString(),
      appName: 'Yoroi',
      // Profil avec photo
      profile: {
        ...profile,
        profile_photo_base64: profilePhotoBase64,
      },
      weights,
      trainings,
      bodyCompositions,
      clubs: clubsWithLogos,
      // Mensurations : liste historique + table SQLite (saisies via l'onglet +, body-history),
      // qui n'étaient jusqu'ici jamais sauvegardées
      measurements: [...(measurements || []), ...(await getSqlMeasurements().catch(() => []))],
      userSettings,
      unlockedBadges,
      photos: photosWithBase64,
      homeLayout,
      selectedLogo,
      hydrationEntries,
      hydrationSettings,
      sleepEntries,
      sleepGoal,
      moodEntries,
      // v5.2 : données manquantes
      injuries,
      competitions,
      weeklyPlan,
      trainingGoals,
      appearance: {
        themeColor,
        themeMode,
        language,
        tabOrder,
        avatarSelection,
        userGear,
        fighterModeSport,
        fighterModeCategory,
        fighterModeBelt,
      },
      // v5.3 : Combat Lab (sparring, game plan, drills, favoris)
      combatLab: {
        sparringPartners: sparringPartnersWithPhotos,  // Fiche tactique complète (photos en base64, forces, faiblesses, notes, objectifs)
        playbookCustom: {        // Templates perso de la bibliothèque de game plans
          gamePlan: playbookGamePlan,
          whatWorked: playbookWorked,
          whatDidntWork: playbookDidntWork,
          counteredBy: playbookCountered,
          improvement: playbookImprovement,
        },
        gameplanChecked,         // Checklist cochée dans Mon Game Plan
        drillTracker,            // Compteurs drill par technique
        sparringWeeklyGoal,      // Objectif hebdo rounds
        bjjFavSubmissions,       // Favoris soumissions BJJ BodyMap
        toolFavorites: sparringTool_favorites, // Outils favoris (more tab)
      },
      // v5.4 : Toutes les photos/médias complémentaires
      mediaAssets: {
        photoHistory: photoHistoryWithBase64,     // Historique des photos avec frames (5 dernières)
        avatarBase64,                              // Avatar custom (image perso)
        routineImageBase64,                        // Image de routine hebdomadaire
        customClubLogosBase64,                     // Logos custom des clubs (map nom → base64)
      },
      // v5.5 : Training Journal (objectifs + logs de pratique) et Carnet (benchmarks + skills)
      trainingJournal: {
        items: progressionItems,                   // Objectifs d'entraînement détaillés
        logs: practiceLogs,                        // Logs de pratiques / sessions
      },
      carnet: {
        benchmarks: benchmarksRaw,                 // Référentiels perso de performance
        skills: skillsRaw,                         // Techniques/skills perso
        trashBenchmarks: trashBenchmarksRaw,       // Corbeille benchmarks
        trashSkills: trashSkillsRaw,               // Corbeille skills
      },
      records: {
        personalRecords: personalRecordsRaw,       // Records personnels
      },
      loads: {
        trainingLoads: trainingLoadsRaw,           // Charge d'entraînement
        healthBonusHistory: healthBonusHistoryRaw, // Historique bonus santé (gamification)
        sourceFreshness: sourceFreshnessRaw,       // Fraîcheur des sources
      },
      // v6.0 : tout le reste, pour qu'une restauration ne perde rien
      allTables,
      allStorage,
      allSecure,
    };

    // Créer le fichier JSON avec date ET heure pour éviter les écrasements
    const now = new Date();
    // Date LOCALE (comme l'heure) : mélanger date UTC et heure locale faussait l'ordre des backups
    // et la rotation supprimait les plus récents
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`; // 2026-04-18
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const fileName = `yoroi_backup_${dateStr}_${hours}h${minutes}.json`; // yoroi_backup_2026-04-18_14h30.json
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // ─── Checksum d'intégrité (SHA-256) ──────────────────────────────────
    // Permet de détecter un backup corrompu avant restauration (ex : tronqué
    // pendant un transfert cloud). Calculé sur le JSON SANS le champ integrity.
    const dataJson = JSON.stringify(exportData);
    const checksum = await digestStringAsync(CryptoDigestAlgorithm.SHA256, dataJson).catch(() => '');
    (exportData as any).integrity = {
      algorithm: 'SHA-256',
      checksum,
      byteLength: dataJson.length,
      generatedAt: new Date().toISOString(),
    };

    // ─── Chiffrement optionnel (AES-256) ─────────────────────────────────
    // Si l'user a activé le chiffrement + défini un mot de passe, on chiffre
    // l'ensemble du backup avant de l'écrire. Sinon on écrit en clair.
    let finalPayload: object = exportData;
    try {
      const encryptionEnabled = await isBackupEncryptionEnabled();
      if (encryptionEnabled) {
        const password = await getStoredEncryptionPassword();
        if (password) {
          finalPayload = encryptBackup(exportData, password);
          logger.info('[Backup] Chiffrement AES-256 appliqué');
        } else {
          logger.warn('[Backup] Chiffrement activé mais aucun mot de passe stocké, backup non chiffré');
        }
      }
    } catch (encErr) {
      logger.error('[Backup] Erreur chiffrement (backup écrit en clair):', encErr);
    }

    // ─── Écriture ATOMIQUE ────────────────────────────────────────
    // On écrit d'abord dans un fichier .tmp, puis on rename vers le nom final.
    // Si l'app crash pendant l'écriture, seul le .tmp reste (ignoré par le cleanup).
    // Ça garantit qu'un fichier `yoroi_backup_*.json` est TOUJOURS complet.
    const tmpUri = `${fileUri}.tmp`;
    await FileSystem.writeAsStringAsync(
      tmpUri,
      JSON.stringify(finalPayload, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );
    // Move atomique tmp → final (supprimer un éventuel fichier du même nom : sur iOS, move échoue sinon)
    await FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => {});
    await FileSystem.moveAsync({ from: tmpUri, to: fileUri });

    logger.info('Fichier JSON créé (atomique):', fileName);
    await AsyncStorage.setItem('@yoroi_backup_last_counts', JSON.stringify(counts)).catch(() => undefined);

    // Auto-nettoyage : conserver seulement les 10 dernières sauvegardes locales
    try {
      const allFiles = await FileSystem.readDirectoryAsync(FileSystem.documentDirectory!);

      // Nettoyage des .tmp orphelins (backups interrompus par un crash)
      const tmpFiles = allFiles.filter(f => f.startsWith('yoroi_backup_') && f.endsWith('.json.tmp'));
      for (const name of tmpFiles) {
        try {
          await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${name}`, { idempotent: true });
          logger.info(`[Backup] Fichier .tmp orphelin supprimé: ${name}`);
        } catch { /* silent */ }
      }

      // Auto-cleanup : conserver uniquement les 10 backups COMPLETS (.json, pas .tmp)
      const backupFiles = allFiles
        .filter(f => f.startsWith('yoroi_backup_') && f.endsWith('.json') && !f.endsWith('.json.tmp'))
        .sort() // tri alphabétique = tri chronologique (AAAA-MM-JJ_HHhMM)
        .reverse(); // plus récents en premier

      if (backupFiles.length > 10) {
        const toDelete = backupFiles.slice(10);
        for (const name of toDelete) {
          await FileSystem.deleteAsync(`${FileSystem.documentDirectory}${name}`, { idempotent: true });
          logger.info(`[Backup] Ancien backup supprimé automatiquement: ${name}`);
        }
        logger.info(`[Backup] Auto-nettoyage: ${toDelete.length} ancien(s) backup(s) supprimé(s), 10 conservés.`);
      }
    } catch (cleanupError) {
      logger.warn('[Backup] Erreur auto-nettoyage (non bloquant):', cleanupError);
    }

    // Sync automatique vers le dossier cloud connecté (bloquant mais avec timeout, pour
    // savoir si le push cloud a réellement réussi, important pour les banners UI).
    try {
      const { getSavedCloudFolder, copyToCloudFolder } = await import('@/lib/cloudFolderService');
      const cloudFolder = await getSavedCloudFolder();
      if (cloudFolder) {
        // 18 octobre 2026 : la copie automatique du jour tourne sur 3 noms fixes (yoroi_backup_auto_1 a 3),
        // ecrases a tour de role : le dossier cloud garde les 3 derniers jours au lieu d'une copie de plus
        // chaque jour (avec les photos, des centaines de Mo par mois finissaient par remplir iCloud Drive).
        // Les copies faites a la main gardent leur nom date.
        let source = fileUri;
        let temporaire: string | null = null;
        if (silent && FileSystem.cacheDirectory) {
          const n = (Math.floor(Date.now() / 86400000) % 3) + 1;
          temporaire = `${FileSystem.cacheDirectory}yoroi_backup_auto_${n}.json`;
          await FileSystem.deleteAsync(temporaire, { idempotent: true }).catch(() => {});
          await FileSystem.copyAsync({ from: fileUri, to: temporaire });
          source = temporaire;
        }
        const cleanPath = source.startsWith('file://') ? decodeURIComponent(source.slice(7)) : source;
        const cloudOk = await Promise.race<boolean>([
          copyToCloudFolder(cleanPath),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 60000)),
        ]);
        if (temporaire) await FileSystem.deleteAsync(temporaire, { idempotent: true }).catch(() => {});
        if (cloudOk) {
          // Track le succès réel du push cloud, lu par BackupStatusHeader et multi-device sync
          await AsyncStorage.setItem('@yoroi_last_cloud_sync_success', new Date().toISOString());
          logger.info('[Backup] ✅ Push cloud réussi:', cloudFolder.displayName);
        } else {
          // Marquer l'échec pour que l'UI puisse avertir l'user
          await AsyncStorage.setItem('@yoroi_last_cloud_sync_failure', new Date().toISOString());
          logger.warn('[Backup] ⚠️ Push cloud échoué ou timeout, backup local seulement');
        }
      }
    } catch (cloudError) {
      await AsyncStorage.setItem('@yoroi_last_cloud_sync_failure', new Date().toISOString()).catch(() => {});
      logger.warn('[Backup] Erreur sync cloud:', cloudError);
    }

    // 18 octobre 2026 : iPhone, la copie automatique du jour part aussi dans le coffre iCloud de l'app
    // (dossier « YOROI » du iCloud Drive, sans rien choisir ; lib/v2/sauvegarde/coffreICloud.ts),
    // 3 fichiers a tour de role. Rien si l'utilisateur n'est pas connecte a iCloud.
    if (silent && Platform.OS === 'ios' && FileSystem.cacheDirectory) {
      try {
        const icloud = await import('@/lib/v2/sauvegarde/coffreICloud');
        if (await icloud.icloudDisponible()) {
          const copie = `${FileSystem.cacheDirectory}${icloud.nomCopieICloud()}`;
          await FileSystem.deleteAsync(copie, { idempotent: true }).catch(() => {});
          await FileSystem.copyAsync({ from: fileUri, to: copie });
          const ok = await Promise.race<boolean>([
            icloud.copierDansICloud(copie),
            new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 60000)),
          ]);
          await FileSystem.deleteAsync(copie, { idempotent: true }).catch(() => {});
          logger.info(ok ? '[Backup] Copie iCloud faite' : '[Backup] Copie iCloud non faite');
        }
      } catch (icloudError) {
        logger.warn('[Backup] Copie iCloud impossible:', icloudError);
      }
    }

    // Partager le fichier JSON (sauf en mode silent pour backups auto)
    if (!silent) {
      const canShare = await isAvailableAsync();
      if (canShare) {
        await shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: traduire('Sauvegarder dans ton Cloud'),
          UTI: 'public.json',
        });
        // Copie proposee hors du telephone (Fichiers, iCloud Drive, Google Drive...). Le systeme ne dit pas
        // ou elle a ete rangee : c'est la date de la derniere copie PROPOSEE, affichee dans les Reglages.
        await AsyncStorage.setItem('@yoroi_last_manual_export', new Date().toISOString()).catch(() => undefined);
      } else {
        appAlert(traduire('Export terminé'), traduire('Tes données sont exportées.'));
      }
    }

    return true;
  } catch (error) {
    logger.error('Erreur export JSON:', error);
    if (!silent) {
      appAlert('Oups', traduire('L’export n’a pas abouti. Réessaie.'));
    }
    return false;
  }
};

/**
 * Exporte les données en format CSV (Excel/Numbers)
 */
export const exportDataToCSV = async (): Promise<boolean> => {
  try {
    const weights = await getWeights();

    if (weights.length === 0) {
      appAlert(traduire('Rien à exporter'), traduire('Tu n’as pas encore de données à exporter.'));
      return false;
    }

    // Créer le CSV avec toutes les colonnes
    let csv = traduire('Date,Poids (kg),Graisse (%),Muscle (%),Eau (%),Masse osseuse (kg),Graisse viscérale,Âge métabolique,BMR\n');

    weights.forEach(w => {
      csv += `${w.date},${w.weight},`;
      csv += `${w.fat_percent || ''},${w.muscle_percent || ''},${w.water_percent || ''},`;
      csv += `${w.bone_mass || ''},${w.visceral_fat || ''},${w.metabolic_age || ''},${w.bmr || ''}\n`;
    });

    // Créer le fichier CSV
    const fileName = `yoroi_export_${new Date().getTime()}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Partager le fichier CSV
    const canShare = await isAvailableAsync();
    if (canShare) {
      await shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: traduire('Exporter vers Excel/Numbers'),
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      appAlert(traduire('Export terminé'), traduire('Tes données sont exportées.'));
    }

    return true;
  } catch (error) {
    logger.error('Erreur export CSV:', error);
    appAlert('Oups', traduire('L’export n’a pas abouti. Réessaie.'));
    return false;
  }
};

/**
 * Importe les données depuis un fichier JSON (avec restauration des images)
 */
export const importDataFromJSON = async (fichierDonne?: string): Promise<boolean> => {
  try {
    // 18 octobre 2026 : un fichier deja choisi (la sauvegarde trouvee dans le coffre iCloud), sinon le selecteur
    let uri = fichierDonne ?? null;
    if (!uri) {
      const result = await getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });

      if (result.canceled) {
        return false;
      }
      uri = result.assets[0].uri;
    }

    // Lire le fichier
    const fileContent = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    let importedData: any;
    try {
      importedData = JSON.parse(fileContent);
    } catch (parseError) {
      appAlert('Fichier illisible', traduire('Ce fichier est abîmé ou n’est pas une sauvegarde YOROI.'));
      return false;
    }

    // ─── Détection & déchiffrement si backup chiffré ──────────────────
    if (isEncryptedBackup(importedData)) {
      // Saisie du mot de passe : fenetre maison YOROI
      const password = await requestPassword({
        title: traduire('Sauvegarde protégée'),
        message: traduire('Cette sauvegarde est protégée par un mot de passe. Tape-le pour continuer.'),
        confirmLabel: 'Ouvrir',
      });
      if (!password) return false;

      try {
        importedData = decryptBackup(importedData, password);
        logger.info('[Import] Backup déchiffré avec succès');
      } catch (e) {
        // Messages d'erreur différenciés selon la cause réelle
        let title = traduire('Erreur');
        let msg = traduire("Impossible de déchiffrer la sauvegarde.");
        if (e instanceof DecryptionError) {
          switch (e.code) {
            case 'WRONG_PASSWORD':
              title = traduire('Mot de passe incorrect');
              msg = "Vérifie ton mot de passe. Si le fichier a été modifié pendant le transfert, il peut aussi être corrompu.";
              break;
            case 'TAMPERED':
              title = traduire('Fichier altéré');
              msg = "Le fichier a été modifié après chiffrement. La restauration est refusée pour protéger tes données.";
              break;
            case 'JSON_INVALID':
              title = 'Données corrompues';
              msg = "Le déchiffrement a réussi mais les données internes sont corrompues.";
              break;
            case 'INVALID_FORMAT':
              title = 'Format invalide';
              msg = "Ce fichier n’est pas une sauvegarde YOROI protégée valide.";
              break;
          }
        }
        appAlert(title, msg);
        return false;
      }
    }

    // Copie de securite automatique partagee depuis les Reglages : remise par fusion, comme une sauvegarde
    if (isSafetyFile(importedData)) {
      const when = typeof importedData.journal?.at === 'string' ? new Date(importedData.journal.at).toLocaleDateString(LOCALE) : null;
      const goOn = await new Promise<boolean>((resolve) => {
        appAlert(
          traduire('Remettre cette copie ?'),
          traduire("C’est une copie de sécurité automatique{0}. Ce qui manque sur ce téléphone est ajouté. Rien n’est effacé, rien n’est remplacé, et ce qui est déjà là n’est pas recopié deux fois.", when ? ` du ${when}` : ''),
          [
            { text: traduire('Annuler'), style: 'cancel', onPress: () => resolve(false) },
            { text: 'Remettre', onPress: () => resolve(true) },
          ]
        );
      });
      if (!goOn) return false;
      const rep = await restoreSafetyFile(importedData);
      if (!rep) {
        appAlert('Oups', traduire('La copie n’a pas pu être remise. Rien n’a été effacé sur ce téléphone.'));
        return false;
      }
      const illustration = await illustrer('copieFaite');
      appAlert('Copie remise', safetyReportText(rep), undefined, illustration ? { illustration } : undefined);
      return true;
    }

    // Valider que c'est bien un fichier Yoroi
    const validation = validateBackup(importedData);
    if (!validation.valid) {
      appAlert('Fichier invalide', validation.errors.join('\n'));
      return false;
    }

    // ─── Vérification du checksum d'intégrité (v5.5+) ──────────────────
    // Si le backup contient un bloc `integrity`, on recalcule le hash et on
    // vérifie qu'il correspond, détecte les fichiers corrompus/tronqués.
    if (importedData.integrity?.checksum && importedData.integrity.algorithm === 'SHA-256') {
      try {
        // On recalcule sur les mêmes données (sans le bloc integrity lui-même)
        const { integrity, ...dataWithoutIntegrity } = importedData;
        const recomputed = await digestStringAsync(
          CryptoDigestAlgorithm.SHA256,
          JSON.stringify(dataWithoutIntegrity)
        );
        if (recomputed !== integrity.checksum) {
          const confirmed = await new Promise<boolean>((resolve) => {
            appAlert(
              traduire('Fichier peut-être abîmé'),
              traduire('Ce fichier a peut-être été modifié ou coupé pendant un transfert.\n\nTu veux quand même essayer de le restaurer ? Certaines données pourraient manquer.'),
              [
                { text: traduire('Annuler'), style: 'cancel', onPress: () => resolve(false) },
                { text: traduire('Tenter quand même'), style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          });
          if (!confirmed) return false;
        } else {
          logger.info('[Import] Checksum vérifié, fichier intègre');
        }
      } catch (e) {
        // Si la vérification échoue pour une raison technique, on continue
        logger.warn('[Import] Vérification checksum impossible, on continue:', e);
      }
    }

    // Migrer automatiquement vers la version actuelle (v1.0, v2.0, v5.0... → v5.3)
    try {
      importedData = migrateBackup(importedData);
      logger.info(`[Import] Backup migré vers v${importedData.version}`);
    } catch (migrationError) {
      logger.error('[Import] Erreur lors de la migration du backup:', migrationError);
      appAlert('Fichier illisible', traduire('Ce fichier de sauvegarde ne peut pas être lu.'));
      return false;
    }

    // Sauvegarde d'une version plus récente de YOROI : on prévient, on importe ce que cette version connaît
    if (isNewerBackupVersion(importedData.version, CURRENT_BACKUP_VERSION)) {
      const goOn = await new Promise<boolean>((resolve) => {
        appAlert(
          traduire('Sauvegarde plus récente'),
          traduire('Cette sauvegarde vient d’une version plus récente de YOROI. Ce que cette version connaît sera ajouté, le reste sera ignoré. Mets l’app à jour pour tout récupérer.'),
          [
            { text: traduire('Annuler'), style: 'cancel', onPress: () => resolve(false) },
            { text: traduire('Importer quand même'), onPress: () => resolve(true) },
          ]
        );
      });
      if (!goOn) return false;
    }

    // Compter les images à restaurer
    const clubsWithLogos = (importedData.clubs || []).filter((c: any) => c.logo_base64);
    const hasProfilePhoto = importedData.profile?.profile_photo_base64;
    const photosWithImages = (importedData.photos || []).filter((p: any) => p.image_base64);

    // Demander confirmation
    const confirmed = await new Promise<boolean>((resolve) => {
      const summary = [
        `• ${importedData.weights?.length || 0} pesées`,
        `• ${importedData.trainings?.length || 0} séances`,
        `• ${importedData.measurements?.length || 0} mensurations`,
        `• ${importedData.photos?.length || 0} photos${photosWithImages.length > 0 ? ` (${photosWithImages.length} images)` : ''}`,
        importedData.clubs?.length ? `• ${importedData.clubs.length} clubs${clubsWithLogos.length > 0 ? ` (${clubsWithLogos.length} logos)` : ''}` : null,
        importedData.competitions?.length ? `• ${importedData.competitions.length} compétitions` : null,
        importedData.sleepEntries?.length > 0 ? `• ${importedData.sleepEntries.length} nuits de sommeil` : null,
        importedData.hydrationEntries?.length > 0 ? `• ${importedData.hydrationEntries.length} prises d’eau` : null,
        hasProfilePhoto ? '• Photo de profil' : null,
        importedData.allStorage ? '• Dojo, carnet, réglages et le reste de l’app' : null,
      ].filter(Boolean).join('\n');

      appAlert(
        traduire('Importer cette sauvegarde ?'),
        traduire("Elle contient :\n{0}\n\nTout est ajouté à ce qui est déjà sur ce téléphone. Rien n’est effacé, rien n’est remplacé, et ce qui est déjà là n’est pas recopié deux fois.", summary),
        [
          { text: traduire('Annuler'), style: 'cancel', onPress: () => resolve(false) },
          { text: traduire('Importer'), onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirmed) {
      return false;
    }

    // ─── SAFETY BACKUP avant restauration ─────────────────────────
    // On sauvegarde l'état ACTUEL avant d'importer le backup : si l'import foire en cours,
    // on peut revenir en arrière.
    try {
      const { runSafetyBackup } = await import('./safetyBackupService');
      await runSafetyBackup('pre-restore');
    } catch { /* non bloquant */ }

    logger.info('Début import données...');
    const done = await importDataFromBackupObject(importedData, { alreadyChecked: true });
    const rep = getLastImportReport();
    if (!done || !rep) {
      appAlert('Oups', traduire('L’import n’a pas abouti. Rien n’a été effacé sur ce téléphone. Réessaie.'));
      return false;
    }
    const lines = [
      rep.imported > 0 ? `${rep.imported} élément(s) ajouté(s).` : 'Rien de nouveau : tout était déjà sur ce téléphone.',
      rep.skippedDuplicates > 0 ? `${rep.skippedDuplicates} déjà présent(s), pas recopié(s).` : null,
      rep.kept > 0 ? `${rep.kept} réglage(s) différent(s) gardé(s) tel(s) que sur ce téléphone.` : null,
      rep.images > 0 ? `${rep.images} image(s) remise(s).` : null,
      rep.failed > 0 ? `${rep.failed} élément(s) n’ont pas pu être lus.` : null,
    ].filter(Boolean).join('\n');
    appAlert(traduire('Import terminé'), lines);

    return true;
  } catch (error) {
    logger.error('Erreur import JSON:', error);
    appAlert('Oups', traduire('L’import n’a pas abouti. Réessaie.'));
    return false;
  }
};

/**
 * Partage une image (Fight Card, graphique, etc.)
 */
export const shareImage = async (viewRef: any, fileName: string = 'yoroi_card'): Promise<boolean> => {
  try {
    // Capturer la vue en image
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    // Partager l'image
    const canShare = await isAvailableAsync();
    if (canShare) {
      await shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: traduire('Partager ma progression Yoroi'),
      });
      return true;
    } else {
      appAlert('Partage indisponible', traduire('Le partage n’est pas disponible sur ce téléphone.'));
      return false;
    }
  } catch (error) {
    logger.error('Erreur partage image:', error);
    appAlert('Oups', traduire('L’image n’a pas pu être partagée.'));
    return false;
  }
};

/**
 * Génère un résumé texte pour partage sur réseaux sociaux
 */
export const generateShareText = async (): Promise<string> => {
  try {
    const measurements = await getAllMeasurements();
    const userSettings = await getUserSettings();

    if (measurements.length === 0) {
      return traduire('Je commence mon parcours de champion avec Yoroi ! #Yoroi #Fitness');
    }

    const latest = measurements[0];
    const oldest = measurements[measurements.length - 1];
    const weightDiff = oldest.weight - latest.weight;

    let text = traduire(`Mon parcours Yoroi\n\n`);

    if (weightDiff > 0) {
      text += `${weightDiff.toFixed(1)}kg perdus !\n`;
    } else if (weightDiff < 0) {
      text += traduire("{0}kg gagnés !\n", Math.abs(weightDiff).toFixed(1));
    }

    text += traduire("{0} mesures enregistrées\n", measurements.length);
    text += traduire("Poids actuel: {0}kg\n\n", latest.weight);
    text += `#Yoroi #Fitness #Transformation`;

    return text;
  } catch (error) {
    logger.error('Erreur génération texte partage:', error);
    return traduire('Mon parcours Yoroi #Yoroi #Fitness');
  }
};

/**
 * Partage la progression sous forme de texte
 */
export const shareProgress = async (): Promise<boolean> => {
  try {
    const text = await generateShareText();

    const canShare = await isAvailableAsync();
    if (canShare) {
      // Sur iOS/Android, utiliser le sharing natif
      if (Platform.OS === 'ios' || Platform.OS === 'android') {
        const { Share } = require('react-native');
        await Share.share({
          message: text,
          title: traduire('Ma progression Yoroi'),
        });
      }
      return true;
    } else {
      appAlert(traduire('Ma progression'), text);
      return false;
    }
  } catch (error) {
    logger.error('Erreur partage progression:', error);
    appAlert('Oups', traduire('Ta progression n’a pas pu être partagée.'));
    return false;
  }
};

/**
 * Partage une Story Card pour Instagram/Snapchat
 */
export const shareStoryCard = async (viewRef: any, platform: 'instagram' | 'snapchat' | 'general' = 'general'): Promise<boolean> => {
  try {
    // Capturer la vue en image haute qualité pour stories
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
      width: 1080, // Résolution optimale pour stories
      height: 1920,
    });

    // Partager l'image
    const canShare = await isAvailableAsync();
    if (canShare) {
      await shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: traduire('Partager sur les réseaux sociaux'),
      });
      return true;
    } else {
      appAlert('Partage indisponible', traduire('Le partage n’est pas disponible sur ce téléphone.'));
      return false;
    }
  } catch (error) {
    logger.error('Erreur partage story:', error);
    appAlert('Oups', traduire('La story n’a pas pu être partagée.'));
    return false;
  }
};

/**
 * Sauvegarde une Story Card dans la galerie
 */
export const saveStoryToGallery = async (viewRef: any): Promise<boolean> => {
  try {
    // On utilise expo-media-library pour sauvegarder
    const MediaLibrary = require('expo-media-library');

    // Demander la permission
    const { status } = await MediaLibrary.requestPermissionsAsync();
    if (status !== 'granted') {
      appAlert(traduire('Accès à la galerie'), traduire('Autorise l’accès à ta galerie pour enregistrer l’image.'));
      return false;
    }

    // Capturer la vue
    const uri = await captureRef(viewRef, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });

    // Sauvegarder dans la galerie
    await MediaLibrary.saveToLibraryAsync(uri);
    appAlert(traduire('Image enregistrée'), traduire('Elle est dans ta galerie.'));
    return true;
  } catch (error) {
    logger.error('Erreur sauvegarde galerie:', error);
    appAlert('Oups', traduire('L’image n’a pas pu être enregistrée.'));
    return false;
  }
};


// ============================================
// IMPORT INTERNE (depuis historique local)
// ============================================

/**
 * Importe les données depuis un objet backup déjà parsé et migré.
 * Appelé par l'écran "Mes sauvegardes" (backup-history.tsx) après
 * validation + migration côté appelant.
 *
 * Ne montre PAS de popup de confirmation (l'appelant s'en charge).
 * Ne fait PAS de sélection de fichier.
 */
/** Compte rendu de la derniere restauration (pour le message affiche et les tests) */
export type ImportReport = {
  imported: number;
  images: number;
  /** valeurs deja presentes et differentes, gardees telles quelles */
  kept: number;
  /** lignes deja presentes, pas recopiees */
  skippedDuplicates: number;
  failed: number;
  freshPhone: boolean;
};
let lastImportReport: ImportReport | null = null;
export const getLastImportReport = (): ImportReport | null => lastImportReport;

/** Cles ecrites par les etapes dediees ci-dessous (la reprise generique ne les touche pas) */
const HANDLED_STORAGE_KEYS = new Set<string>([
  '@yoroi_photos_v2', '@yoroi_photo_history', '@yoroi_sparring_partners', '@yoroi_sleep_entries', '@yoroi_sleep_goal',
  '@yoroi_hydration_log', 'yoroi_benchmarks_v2', 'yoroi_skills_v2', 'yoroi_trash_benchmarks_v2', 'yoroi_trash_skills_v2',
  '@yoroi_benchmarks_v2', '@yoroi_skills_v2', '@yoroi_trash_benchmarks_v2', '@yoroi_trash_skills_v2',
  '@yoroi_personal_records', '@yoroi_training_loads', '@yoroi_health_bonus_history', '@yoroi_source_freshness',
  '@yoroi_home_layout', '@yoroi_selected_logo',
]);
const HANDLED_SECURE_KEYS = new Set<string>([
  '@yoroi_user_settings', '@yoroi_measurements', '@yoroi_photos', '@yoroi_body_composition', '@yoroi_hydration_settings', '@yoroi_mood_log',
]);
/** Tables restaurees par les etapes dediees (la reprise generique ne les touche pas) */
const HANDLED_TABLES = ['profile', 'weights', 'trainings', 'clubs', 'measurements', 'competitions', 'weekly_plan', 'injuries', 'progression_items', 'practice_logs', 'training_goals'];

const isEmptyValue = (v: unknown) => v == null || v === '' || (Array.isArray(v) && v.length === 0);

/** Fusion d'une valeur texte de la sauvegarde dans une cle : ajoute ce qui manque, garde ce qui existe */
async function mergeKey(key: string, incoming: unknown, report: ImportReport, preferIncoming: boolean): Promise<void> {
  if (incoming == null) return;
  const raw = typeof incoming === 'string' ? incoming : JSON.stringify(incoming);
  const m = mergeStoredValue(await AsyncStorage.getItem(key), raw, preferIncoming);
  if (m.value != null) {
    await AsyncStorage.setItem(key, m.value);
    report.imported += m.added;
  }
  if (m.kept) report.kept++;
}

/**
 * Restaure une sauvegarde (objet deja lu) en FUSIONNANT avec ce qui est sur le telephone :
 * rien n'est efface, rien n'est remplace sans le dire, aucun doublon.
 * Sur un telephone neuf (aucune donnee de l'utilisateur, voir telephoneNeuf.ts), les reglages de la sauvegarde passent avant ceux par defaut.
 * @param opts.alreadyChecked l'appelant a deja verifie le fichier et fait la copie de securite
 */
export const importDataFromBackupObject = async (importedData: any, opts?: { alreadyChecked?: boolean }): Promise<boolean> => {
  const report: ImportReport = { imported: 0, images: 0, kept: 0, skippedDuplicates: 0, failed: 0, freshPhone: false };
  lastImportReport = report;
  try {
    logger.info('[importDataFromBackupObject] Début restauration depuis objet backup...');
    if (!importedData || typeof importedData !== 'object') return false;

    if (!opts?.alreadyChecked) {
      // ─── Vérification du checksum d'intégrité (v5.5+) ──────────────────
      // Appelée aussi par la synchro cloud : un fichier altéré n'est pas restauré.
      if (importedData.integrity?.checksum && importedData.integrity.algorithm === 'SHA-256') {
        try {
          const { integrity, ...dataWithoutIntegrity } = importedData;
          const recomputed = await digestStringAsync(CryptoDigestAlgorithm.SHA256, JSON.stringify(dataWithoutIntegrity));
          if (recomputed !== integrity.checksum) {
            logger.warn('[importDataFromBackupObject] Checksum invalide, restauration refusée');
            appAlert(traduire('Fichier abîmé'), traduire('Ce fichier a été modifié. La restauration est bloquée pour protéger tes données.'));
            return false;
          }
        } catch (e) {
          logger.warn('[importDataFromBackupObject] Vérif checksum impossible, on continue:', e);
        }
      }
      // ─── Copie de l'état actuel avant d'écrire ─────────────────────────
      try {
        const { runSafetyBackup } = await import('./safetyBackupService');
        await runSafetyBackup('pre-import-object');
      } catch { /* non bloquant */ }
    }

    // Format actuel (après la vérification de l'empreinte, qui porte sur le fichier d'origine)
    // Sauvegarde d'avant la 3.0 : pas de copie complete des tables (allTables arrive avec le format 6.0 de la 3.0).
    // importDataFromJSON a pu deja la passer au format 6.0 : la version seule ne suffit pas.
    const avant30 = !importedData.allTables;
    try {
      importedData = migrateBackup(importedData);
    } catch (e) {
      logger.error('[importDataFromBackupObject] Sauvegarde illisible:', e);
      return false;
    }

    const ok = (n = 1) => { report.imported += n; };
    const fail = (what: string, e: unknown) => { report.failed++; logger.error(`[Import] ${what}:`, e); };

    // Telephone neuf ? Seulement si AUCUNE donnee de l'utilisateur (pesees, seances, photos, sommeil, eau,
    // mensurations, carnet, records, objectifs, competitions, profil avec un nom). Sinon le profil et les
    // reglages deja la sont gardes, seules les cases vides sont remplies.
    const localWeights = await getWeights().catch(() => [] as any[]);
    const localTrainings = await getTrainings().catch(() => [] as any[]);
    const fresh = localWeights.length === 0 && localTrainings.length === 0
      && await isFreshPhone(await openDatabase().catch(() => null));
    report.freshPhone = fresh;

    const maps: IdMaps = { clubs: new Map(), trainings: new Map(), competitions: new Map(), weekly_plan: new Map(), injuries: new Map() };
    const remap = (table: string, v: unknown): number | null => {
      if (v == null || v === '') return null;
      const m = maps[table]?.get(Number(v));
      return m != null ? m : null;
    };

    // === PROFIL (photo comprise) : rempli seulement là où le téléphone n'a rien ===
    if (importedData.profile && typeof importedData.profile === 'object') {
      try {
        const local = await getProfile().catch(() => null);
        const profileData: any = { ...importedData.profile };
        if (profileData.profile_photo_base64 && (fresh || !local?.profile_photo)) {
          const photoUri = await base64ToImage(profileData.profile_photo_base64, `profile_photo_${Date.now()}.jpg`);
          if (photoUri) { profileData.profile_photo = photoUri; report.images++; }
        }
        delete profileData.profile_photo_base64;
        delete profileData.id;
        if (!local || fresh) {
          if (profileData.name) { await saveProfile({ ...(local ?? {}), ...profileData }); ok(); }
        } else {
          const merged: any = { ...local };
          let changed = false;
          for (const [k, v] of Object.entries(profileData)) {
            if (isEmptyValue((local as any)[k]) && !isEmptyValue(v)) { merged[k] = v; changed = true; }
            else if (!isEmptyValue(v) && (local as any)[k] !== v && k !== 'created_at' && k !== 'updated_at') report.kept++;
          }
          if (changed) { await saveProfile(merged); ok(); }
        }
      } catch (error) { fail('profil', error); }
    }

    // === CLUBS (avant les séances et le planning, pour garder les liens) ===
    if (Array.isArray(importedData.clubs)) {
      try {
        const existingClubs = await getClubs();
        const byKey = new Map(existingClubs.map((c: any) => [`${c.name}|${c.sport}`, Number(c.id)]));
        for (const club of importedData.clubs) {
          if (!club) continue;
          const key = `${club.name}|${club.sport}`;
          const found = byKey.get(key);
          if (found != null) { if (club.id != null) maps.clubs.set(Number(club.id), found); report.skippedDuplicates++; continue; }
          try {
            const clubData = { ...club };
            if (clubData.logo_base64) {
              const logoUri = await base64ToImage(clubData.logo_base64, `club_logo_${clubData.name?.replace(/[^a-zA-Z0-9_-]/g, '_') || Date.now()}.png`);
              if (logoUri) { clubData.logo_uri = logoUri; report.images++; }
            }
            delete clubData.logo_base64;
            const oldId = clubData.id;
            delete clubData.id;
            const newId = await addClub(clubData);
            byKey.set(key, newId);
            if (oldId != null) maps.clubs.set(Number(oldId), newId);
            ok();
          } catch (error) { fail('club', error); }
        }
      } catch (error) { fail('clubs', error); }
    }

    // === PESÉES (toutes les mesures, segments et autres mesures de la balance compris) ===
    if (Array.isArray(importedData.weights)) {
      const weightKey = (w: any) => `${String(w.date).slice(0, 10)}|${Number(w.weight).toFixed(2)}|${w.source || 'manual'}`;
      const seenWeights = new Set(localWeights.map(weightKey));
      for (const raw of importedData.weights) {
        if (!raw) continue;
        if (seenWeights.has(weightKey(raw))) { report.skippedDuplicates++; continue; }
        try {
          const weight = sanitizeImportRecord(raw);
          if (weight.weight == null || isNaN(Number(weight.weight))) continue;
          const scale: any = {};
          for (const col of WEIGHT_SCALE_COLUMNS) if (typeof raw[col] === 'number') scale[col] = raw[col];
          const newId = await addWeight({
            weight: weight.weight,
            date: weight.date,
            fat_percent: weight.fat_percent,
            muscle_percent: weight.muscle_percent,
            water_percent: weight.water_percent,
            bone_mass: weight.bone_mass,
            visceral_fat: weight.visceral_fat,
            metabolic_age: weight.metabolic_age,
            bmr: weight.bmr,
            note: weight.note ?? weight.notes,
            source: raw.source,
            ...scale,
          });
          if (newId && typeof raw.scale_extras === 'string' && raw.scale_extras) {
            await updateWeightScaleJson(newId, raw.scale_extras).catch(() => undefined);
          }
          await keepCreatedAt('weights', newId, raw?.created_at);
          seenWeights.add(weightKey(raw));
          ok();
        } catch (error) { fail(traduire('pesée'), error); }
      }
    }

    // === SÉANCES (débriefs, lieu, ressenti, types compris) ===
    if (Array.isArray(importedData.trainings)) {
      const trainingKey = (t: any) => t.healthkit_uuid
        ? `uuid|${t.healthkit_uuid}`
        : `${String(t.date).slice(0, 10)}|${t.start_time ?? ''}|${t.sport ?? t.discipline ?? ''}|${t.duration_minutes ?? ''}`;
      const seen = new Map(localTrainings.map((t: any) => [trainingKey(t), Number(t.id)]));
      for (const raw of importedData.trainings) {
        if (!raw) continue;
        const key = trainingKey(raw);
        const existing = seen.get(key);
        if (existing != null) { if (raw.id != null) maps.trainings.set(Number(raw.id), existing); report.skippedDuplicates++; continue; }
        const training = sanitizeImportRecord(raw);
        try {
          const clubId = training.club_id != null ? (remap('clubs', training.club_id) ?? (maps.clubs.size ? null : training.club_id)) : null;
          const newId = await addTraining({
            club_id: clubId ?? undefined,
            sport: training.sport || training.discipline || 'Sport',
            date: training.date,
            session_type: training.session_type || training.type,
            session_types: training.session_types,
            notes: training.notes,
            duration_minutes: training.duration_minutes,
            start_time: training.start_time,
            muscles: training.muscles,
            technical_theme: training.technical_theme,
            distance: training.distance,
            calories: training.calories,
            intensity: training.intensity,
            rounds: training.rounds,
            round_duration: training.round_duration,
            is_outdoor: training.is_outdoor,
            score_for: training.score_for,
            score_against: training.score_against,
            lieu_type: training.lieu_type,
            pente: training.pente,
            speed: training.speed,
            resistance: training.resistance,
            watts: training.watts,
            cadence: training.cadence,
            technique_rating: training.technique_rating,
            heart_rate: training.heart_rate,
            min_heart_rate: training.min_heart_rate,
            max_heart_rate: training.max_heart_rate,
            source: training.source,
            healthkit_uuid: training.healthkit_uuid,
            location_lat: training.location_lat,
            location_lon: training.location_lon,
            location_name: training.location_name,
            exercises: training.exercises,
            combat_rounds: training.combat_rounds,
            workout_details_json: training.workout_details_json,
            game_plan: training.game_plan,
            what_worked: training.what_worked,
            what_didnt_work: training.what_didnt_work,
            session_rating: training.session_rating,
            session_mood: training.session_mood,
          } as any);
          await keepCreatedAt('trainings', newId, raw?.created_at);
          if (newId) {
            seen.set(key, newId);
            if (raw.id != null) maps.trainings.set(Number(raw.id), newId);
            ok();
          }
        } catch (error) { fail(traduire('séance'), error); }
      }
    }

    // === COMPOSITIONS CORPORELLES (sans doublon) ===
    if (Array.isArray(importedData.bodyCompositions)) {
      try {
        const bcKey = (b: any) => `${String(b?.date).slice(0, 10)}|${b?.weight ?? ''}|${b?.bodyFat ?? ''}`;
        const seenBc = new Set((await getAllBodyCompositions().catch(() => [] as any[])).map(bcKey));
        for (const raw of importedData.bodyCompositions) {
          if (!raw) continue;
          if (seenBc.has(bcKey(raw))) { report.skippedDuplicates++; continue; }
          try { const { id, ...rest } = raw; await addBodyComposition(sanitizeImportRecord(rest)); seenBc.add(bcKey(raw)); ok(); } catch (error) { fail('composition', error); }
        }
      } catch (error) { fail('compositions', error); }
    }

    // === MENSURATIONS (sans doublon) ===
    if (Array.isArray(importedData.measurements)) {
      const MEAS_FIELDS = ['chest', 'waist', 'navel', 'hips', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'left_calf', 'right_calf', 'left_forearm', 'right_forearm', 'shoulders', 'neck'];
      const measKey = (m: any) => `${String(m?.date).slice(0, 10)}|${MEAS_FIELDS.map(f => (m?.[f] == null ? '' : Number(m[f]))).join('|')}`;
      const seenMeasurements = new Set((await getSqlMeasurements().catch(() => [])).map(measKey));
      // Ancienne liste (2.x) : elle reste aussi dans le coffre, reprise plus bas sans doublon
      for (const raw of importedData.measurements) {
        if (!raw || !MEAS_FIELDS.some((f) => raw[f] != null)) continue;
        // Identifiant texte = mesure rapide de la liste du coffre : remise dans sa liste plus bas, pas dans la table
        if (typeof raw.id === 'string') continue;
        if (seenMeasurements.has(measKey(raw))) { report.skippedDuplicates++; continue; }
        try {
          const m = sanitizeImportRecord(raw);
          const newId = await addMeasurementRecord({
            chest: m.chest, waist: m.waist, navel: m.navel, hips: m.hips,
            left_arm: m.left_arm, right_arm: m.right_arm,
            left_thigh: m.left_thigh, right_thigh: m.right_thigh,
            left_calf: m.left_calf, right_calf: m.right_calf,
            left_forearm: m.left_forearm, right_forearm: m.right_forearm,
            shoulders: m.shoulders, neck: m.neck, date: m.date,
          });
          await keepCreatedAt('measurements', newId, raw?.created_at);
          seenMeasurements.add(measKey(raw));
          ok();
        } catch (error) { fail('mensuration', error); }
      }
      // Liste historique (mesures rapides de la 2.x, dans le coffre) : ajoutées si absentes
      try {
        const listed = importedData.measurements.filter((x: any) => x && x.id != null && typeof x.id === 'string');
        if (listed.length) {
          const current = await secureStorage.getItemStrict('@yoroi_measurements').catch(() => undefined);
          if (current !== undefined) {
            const m = mergeStoredValue(current == null ? null : JSON.stringify(current), JSON.stringify(listed));
            if (m.value != null) { await secureStorage.setItem('@yoroi_measurements', JSON.parse(m.value)); ok(m.added); }
          }
        }
      } catch (error) { fail(traduire('mesures rapides'), error); }
    }

    // === BADGES ===
    if (Array.isArray(importedData.unlockedBadges)) {
      for (const badgeId of importedData.unlockedBadges) {
        // 19 octobre 2026 : un badge deja la n'est pas compte comme importe (le bilan d'import disait 2 au second import)
        try { if (await unlockBadge(badgeId)) ok(); else report.skippedDuplicates++; } catch { /* ignore */ }
      }
    }

    // === RÉGLAGES : téléphone neuf → ceux de la sauvegarde ; sinon seulement ce qui manque ===
    if (importedData.userSettings && typeof importedData.userSettings === 'object') {
      try {
        if (fresh) { await saveUserSettings(importedData.userSettings); ok(); }
        else {
          const local: any = await getUserSettings().catch(() => ({}));
          const add: any = {};
          for (const [k, v] of Object.entries(importedData.userSettings)) {
            if (isEmptyValue(local?.[k]) && !isEmptyValue(v)) add[k] = v;
            else if (!isEmptyValue(v) && JSON.stringify(local?.[k]) !== JSON.stringify(v)) report.kept++;
          }
          if (Object.keys(add).length) { await saveUserSettings(add); ok(); }
        }
      } catch (error) { fail(traduire('réglages'), error); }
    }
    if (Array.isArray(importedData.homeLayout)) {
      try { await mergeKey('@yoroi_home_layout', JSON.stringify(importedData.homeLayout), report, fresh); } catch { /* ignore */ }
    }
    if (importedData.selectedLogo && (fresh || !(await AsyncStorage.getItem('@yoroi_selected_logo')))) {
      try { await saveSelectedLogo(importedData.selectedLogo); ok(); } catch { /* ignore */ }
    }

    // === SOMMEIL, HUMEUR, EAU (fusion par identifiant ou par date) ===
    if (Array.isArray(importedData.sleepEntries)) {
      try {
        const _sleepRaw = await AsyncStorage.getItem('@yoroi_sleep_entries');
        const existingEntries: any[] = _sleepRaw ? JSON.parse(_sleepRaw) : [];
        const existingIds = new Set(existingEntries.map((e: any) => e.id));
        const newEntries = importedData.sleepEntries.filter((e: any) => e && !existingIds.has(e.id));
        if (newEntries.length > 0) { await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify([...existingEntries, ...newEntries])); ok(newEntries.length); }
      } catch (error) { fail('sommeil', error); }
    }
    if (typeof importedData.sleepGoal === 'number' && (fresh || !(await AsyncStorage.getItem('@yoroi_sleep_goal')))) {
      try { await AsyncStorage.setItem('@yoroi_sleep_goal', String(importedData.sleepGoal)); ok(); } catch { /* ignore */ }
    }
    if (Array.isArray(importedData.moodEntries)) {
      try {
        const existingDates = new Set((await getMoods()).map((m: any) => m.date));
        for (const mood of importedData.moodEntries.filter((m: any) => m && !existingDates.has(m.date))) { await saveMood(mood); ok(); }
      } catch (error) { fail('humeur', error); }
    }
    if (Array.isArray(importedData.hydrationEntries)) {
      try {
        const existingEntries = await getAllHydrationEntries();
        const existingIds = new Set(existingEntries.map((e: any) => e.id));
        const newEntries = importedData.hydrationEntries.filter((e: any) => e && !existingIds.has(e.id));
        if (newEntries.length > 0) { await AsyncStorage.setItem('@yoroi_hydration_log', JSON.stringify([...existingEntries, ...newEntries])); ok(newEntries.length); }
      } catch (error) { fail('eau', error); }
    }
    if (importedData.hydrationSettings && (fresh || (await secureStorage.getItemStrict('@yoroi_hydration_settings').catch(() => 'illisible')) == null)) {
      try { await saveHydrationSettings(importedData.hydrationSettings); ok(); } catch { /* ignore */ }
    }

    // === PHOTOS DE PROGRÈS (ajoutées, jamais remplacées) ===
    if (Array.isArray(importedData.photos)) {
      try {
        const existingPhotos = await getPhotosStrict();
        const existingIds = new Set(existingPhotos.map((p: any) => p.id));
        const restoredPhotos: any[] = [...existingPhotos];
        let added = 0;
        for (const photo of importedData.photos) {
          if (!photo || existingIds.has(photo.id)) { if (photo) report.skippedDuplicates++; continue; }
          const photoData = { ...photo };
          delete photoData.image_base64;
          if (photo.image_base64) {
            const originalUri: string = photo.file_uri || photo.uri || 'photo.jpg';
            const ext = (originalUri.split('.').pop() || 'jpg').replace(/[^a-zA-Z0-9]/g, '').slice(0, 5) || 'jpg';
            const newUri = await base64ToImage(photo.image_base64, `photo_${String(photo.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_')}.${ext}`);
            if (newUri) { photoData.file_uri = newUri; delete photoData.uri; report.images++; }
          }
          existingIds.add(photo.id);
          restoredPhotos.push(photoData);
          added++;
        }
        if (added) { await AsyncStorage.setItem('@yoroi_photos_v2', JSON.stringify(restoredPhotos)); ok(added); }
      } catch (error) { fail('photos', error); }
    }

    // === BLESSURES (sans doublon, les suivis suivent) ===
    if (Array.isArray(importedData.injuries)) {
      try {
        const injKey = (i: any) => `${String(i?.date).slice(0, 10)}|${i?.zone_id ?? ''}|${i?.pain_type ?? ''}|${i?.cause ?? ''}`;
        const byKey = new Map((await getInjuries().catch(() => [] as any[])).map((i: any) => [injKey(i), Number(i.id)]));
        for (const injury of importedData.injuries) {
          if (!injury) continue;
          const found = byKey.get(injKey(injury));
          if (found != null) { if (injury.id != null) maps.injuries.set(Number(injury.id), found); report.skippedDuplicates++; continue; }
          try {
            const { id, ...rest } = injury;
            const newId = await addInjury(sanitizeImportRecord(rest));
            byKey.set(injKey(injury), newId);
            if (id != null && newId) maps.injuries.set(Number(id), newId);
            ok();
          } catch (error) { fail('blessure', error); }
        }
      } catch (error) { fail('blessures', error); }
    }

    // === COMPÉTITIONS (sans doublon) ===
    if (Array.isArray(importedData.competitions)) {
      try {
        const compKey = (c: any) => `${c?.nom ?? c?.name ?? ''}|${String(c?.date ?? '').slice(0, 10)}`;
        const byKey = new Map((await getCompetitions().catch(() => [] as any[])).map((c: any) => [compKey(c), Number(c.id)]));
        for (const comp of importedData.competitions) {
          if (!comp) continue;
          const found = byKey.get(compKey(comp));
          if (found != null) { if (comp.id != null) maps.competitions.set(Number(comp.id), found); report.skippedDuplicates++; continue; }
          try {
            const { id, created_at, ...compData } = comp;
            const newId = await addCompetition(sanitizeImportRecord(compData));
            byKey.set(compKey(comp), newId);
            if (id != null && newId) maps.competitions.set(Number(id), newId);
            ok();
          } catch (error) { fail(traduire('compétition'), error); }
        }
      } catch (error) { fail(traduire('compétitions'), error); }
    }

    // === PLANNING DE LA SEMAINE (sans doublon) ===
    if (Array.isArray(importedData.weeklyPlan)) {
      try {
        const wpKey = (w: any) => `${w?.day_of_week}|${w?.time ?? ''}|${w?.sport ?? ''}|${w?.label ?? ''}|${w?.is_rest_day ? 1 : 0}`;
        const byKey = new Map((await getWeeklyPlan().catch(() => [] as any[])).map((w: any) => [wpKey(w), Number(w.id)]));
        for (const slot of importedData.weeklyPlan) {
          if (!slot) continue;
          const found = byKey.get(wpKey(slot));
          if (found != null) { if (slot.id != null) maps.weekly_plan.set(Number(slot.id), found); report.skippedDuplicates++; continue; }
          try {
            const { id, club_name, club_logo, club_color, ...slotData } = slot;
            if (slotData.club_id != null) slotData.club_id = remap('clubs', slotData.club_id) ?? (maps.clubs.size ? null : slotData.club_id);
            const newId = await addWeeklyPlanItem(sanitizeImportRecord(slotData));
            byKey.set(wpKey(slot), newId);
            if (id != null && newId) maps.weekly_plan.set(Number(id), newId);
            ok();
          } catch (error) { fail('planning', error); }
        }
      } catch (error) { fail('planning', error); }
    }

    // === OBJECTIFS PAR SPORT : seulement ceux qui n'existent pas ===
    if (Array.isArray(importedData.trainingGoals)) {
      try {
        const existing = new Set((await getAllGoals().catch(() => [] as any[])).map((g: any) => g.sport_id));
        for (const goal of importedData.trainingGoals) {
          if (goal?.sport_id && goal.weekly_target && !existing.has(goal.sport_id)) { await setGoal(goal.sport_id, goal.weekly_target); ok(); }
        }
      } catch (error) { fail(traduire('objectifs par sport'), error); }
    }

    // === APPARENCE : téléphone neuf → celle de la sauvegarde ; sinon seulement si absente ===
    if (importedData.appearance && typeof importedData.appearance === 'object') {
      const a = importedData.appearance;
      const pairs: [string, unknown][] = [
        ['yoroi_theme_color_v5', a.themeColor], ['yoroi_theme_mode_v5', a.themeMode], ['@yoroi_language', a.language],
        ['@yoroi_tab_order', a.tabOrder], ['@yoroi_avatar_config', a.avatarSelection], ['@yoroi_user_gear', a.userGear],
        ['@yoroi_user_mode', a.fighterModeSport], ['@yoroi_weight_category', a.fighterModeCategory], ['@yoroi_belt', a.fighterModeBelt],
      ];
      for (const [k, v] of pairs) {
        if (typeof v !== 'string' || !v) continue;
        try { await mergeKey(k, v, report, fresh); } catch { /* ignore */ }
      }
    }

    // === COMBAT : partenaires (photos comprises), plans de jeu, exercices ===
    if (importedData.combatLab && typeof importedData.combatLab === 'object') {
      const c = importedData.combatLab;
      try {
        if (c.sparringPartners) {
          let partners: any[] = [];
          try { partners = JSON.parse(c.sparringPartners); } catch { partners = []; }
          if (Array.isArray(partners) && partners.length) {
            const localRaw = await AsyncStorage.getItem('@yoroi_sparring_partners');
            let local: any[] = [];
            try { local = localRaw ? JSON.parse(localRaw) : []; } catch { local = []; }
            const ids = new Set(local.map((p: any) => String(p?.id)));
            const extra: any[] = [];
            for (const partner of partners) {
              if (!partner || ids.has(String(partner.id))) continue;
              let p = { ...partner };
              if (partner.photoBase64) {
                const newUri = await base64ToImage(partner.photoBase64, `sparring_partner_${String(partner.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_')}.jpg`);
                if (newUri) { p = { ...p, photoUri: newUri }; report.images++; }
              }
              delete p.photoBase64;
              extra.push(p);
            }
            if (extra.length) { await AsyncStorage.setItem('@yoroi_sparring_partners', JSON.stringify([...local, ...extra])); ok(extra.length); }
          }
        }
        if (c.playbookCustom) {
          const p = c.playbookCustom;
          await mergeKey('@yoroi_playbook_custom_gamePlan', p.gamePlan, report, fresh);
          await mergeKey('@yoroi_playbook_custom_whatWorked', p.whatWorked, report, fresh);
          await mergeKey('@yoroi_playbook_custom_whatDidntWork', p.whatDidntWork, report, fresh);
          await mergeKey('@yoroi_playbook_custom_counteredBy', p.counteredBy, report, fresh);
          await mergeKey('@yoroi_playbook_custom_improvement', p.improvement, report, fresh);
        }
        await mergeKey('@yoroi_gameplan_checked', c.gameplanChecked, report, fresh);
        await mergeKey('@yoroi_drill_tracker', c.drillTracker, report, fresh);
        await mergeKey('@sparring_weekly_goal', c.sparringWeeklyGoal, report, fresh);
        await mergeKey('bjj_fav_submissions_v2', c.bjjFavSubmissions, report, fresh);
        await mergeKey('@yoroi_tool_favorites', c.toolFavorites, report, fresh);
      } catch (error) { fail('combat', error); }
    }

    // === CARNET D'ENTRAÎNEMENT (SQLite, numéros gardés) ===
    if (importedData.trainingJournal) {
      try {
        const db = await openDatabase();
        for (const [table, list] of [['progression_items', importedData.trainingJournal.items], ['practice_logs', importedData.trainingJournal.logs]] as const) {
          for (const it of Array.isArray(list) ? list : []) {
            try {
              const exists = await db.getFirstAsync<{ id: number }>(`SELECT id FROM ${table} WHERE id = ?`, [it.id]).catch(() => null);
              if (exists) { report.skippedDuplicates++; continue; }
              const columns = Object.keys(it).filter(k => it[k] !== undefined && /^[a-z_0-9]+$/i.test(k));
              await db.runAsync(`INSERT INTO ${table} (${columns.join(',')}) VALUES (${columns.map(() => '?').join(',')})`, columns.map(k => it[k]));
              ok();
            } catch { /* ligne invalide ignorée */ }
          }
        }
      } catch (e) { fail('carnet SQLite', e); }
    }

    // === CARNET (records de force, techniques), RECORDS, CHARGES : fusion par identifiant ===
    if (importedData.carnet) {
      const c = importedData.carnet;
      try {
        await mergeKey('yoroi_benchmarks_v2', c.benchmarks, report, false);
        await mergeKey('yoroi_skills_v2', c.skills, report, false);
        await mergeKey('yoroi_trash_benchmarks_v2', c.trashBenchmarks, report, false);
        await mergeKey('yoroi_trash_skills_v2', c.trashSkills, report, false);
        if (c.benchmarks || c.skills) await AsyncStorage.setItem('yoroi_carnet_initialized_v2', 'true').catch(() => undefined);
      } catch (e) { fail('carnet', e); }
    }
    if (importedData.records?.personalRecords) {
      try { await mergeKey('@yoroi_personal_records', importedData.records.personalRecords, report, false); } catch (e) { fail('records', e); }
    }
    if (importedData.loads) {
      try {
        await mergeKey('@yoroi_training_loads', importedData.loads.trainingLoads, report, false);
        await mergeKey('@yoroi_health_bonus_history', importedData.loads.healthBonusHistory, report, false);
        await mergeKey('@yoroi_source_freshness', importedData.loads.sourceFreshness, report, fresh);
      } catch (e) { fail('charges', e); }
    }

    // === MÉDIAS COMPLÉMENTAIRES (cadres photo, avatar, image de routine, logos) : ajoutés si absents ===
    if (importedData.mediaAssets) {
      const m = importedData.mediaAssets;
      if (Array.isArray(m.photoHistory) && m.photoHistory.length > 0) {
        try {
          const restoredUris: string[] = [];
          for (const entry of m.photoHistory) {
            if (entry?.base64) {
              const ext = (entry.uri || 'photo.jpg').split('.').pop() || 'jpg';
              const newUri = await base64ToImage(entry.base64, `frame_${Date.now()}_${restoredUris.length}.${ext}`);
              if (newUri) { restoredUris.push(newUri); report.images++; }
            }
          }
          if (restoredUris.length > 0) await mergeKey('@yoroi_photo_history', JSON.stringify(restoredUris), report, false);
        } catch (e) { fail('cadres photo', e); }
      }
      const settings: any = await getUserSettings().catch(() => ({}));
      if (m.avatarBase64 && (fresh || !settings?.avatarUri)) {
        try {
          const newUri = await base64ToImage(m.avatarBase64, `avatar_custom_${Date.now()}.jpg`);
          if (newUri) { await saveUserSettings({ avatarUri: newUri } as any); report.images++; ok(); }
        } catch (e) { fail('avatar', e); }
      }
      if (m.routineImageBase64 && (fresh || !settings?.routine_image_uri)) {
        try {
          const newUri = await base64ToImage(m.routineImageBase64, `routine_${Date.now()}.jpg`);
          if (newUri) { await saveUserSettings({ routine_image_uri: newUri } as any); report.images++; ok(); }
        } catch (e) { fail(traduire('image de routine'), e); }
      }
      if (m.customClubLogosBase64 && typeof m.customClubLogosBase64 === 'object') {
        try {
          const current: Record<string, string> = { ...((settings?.custom_club_logos as Record<string, string>) ?? {}) };
          let added = 0;
          for (const [name, base64] of Object.entries(m.customClubLogosBase64)) {
            if (current[name] || typeof base64 !== 'string' || !base64.length) continue;
            const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
            const newUri = await base64ToImage(base64 as string, `club_custom_${safeName}_${Date.now()}.png`);
            if (newUri) { current[name] = newUri; added++; report.images++; }
          }
          if (added) { await saveUserSettings({ custom_club_logos: current } as any); ok(); }
        } catch (e) { fail(traduire('logos de clubs'), e); }
      }
    }

    // === TOUT LE RESTE (version 6.0 et suivantes) : tables, clés de l'app, coffre ===
    if (importedData.allTables) {
      try {
        const db = await openDatabase();
        const r = await restoreTables(db, importedData.allTables, maps, new Set(HANDLED_TABLES));
        report.imported += r.added; report.skippedDuplicates += r.same; report.failed += r.failed;
      } catch (e) { fail('tables', e); }
    }
    if (importedData.allSecure) {
      try {
        const r = await restoreSecure(importedData.allSecure, HANDLED_SECURE_KEYS, fresh);
        report.imported += r.added; report.kept += r.kept;
      } catch (e) { fail('coffre', e); }
    }
    if (importedData.allStorage) {
      try {
        // les cles du Dojo sont reprises plus bas, sans fusion (journal d'XP et date de depart)
        const r = await restoreAllStorage(importedData.allStorage, new Set([...HANDLED_STORAGE_KEYS, ...ARMURE_STORAGE_KEYS]), fresh);
        report.imported += r.added; report.kept += r.kept;
      } catch (e) { fail(traduire('réglages et données de l’app'), e); }
    }

    // 19 octobre 2026 : sauvegarde d'avant la 3.0 (formats 1.0 a 5.5) : ses pesees de l'ancien ecran et ses compositions,
    // rangees dans les listes du coffre, deviennent des pesees de la base (deja comptees plus haut dans leur liste)
    if (avant30) {
      try {
        await reprendrePeseesDuCoffre(await openDatabase(), { entrees: entreesDeSauvegarde(importedData) });
      } catch (e) { fail(traduire('pesées de l’ancien écran'), e); }
    }

    // Dojo (vague 46) : le journal de la sauvegarde est repris tel quel, rien n'est recredite.
    // Ancienne sauvegarde sans journal : l'historique restauré compte de nouveau (une seule fois
    // par jour, semaine ou record)
    const dojoRepris = await restoreArmureFromStorage(importedData.allStorage).catch(() => false);
    if (!dojoRepris) await requestArmureCatchup().catch(() => undefined);
    logger.info(`[importDataFromBackupObject] Terminé : ${report.imported} ajoutés, ${report.skippedDuplicates} déjà présents, ${report.kept} gardés, ${report.failed} échecs, ${report.images} image(s).`);
    return true;
  } catch (error) {
    logger.error('[importDataFromBackupObject] Erreur critique:', error);
    return false;
  }
};

/**
 * Importe les données depuis un fichier JSON
 */
export const importAllData = async (
  importData: (data: any) => Promise<void>
): Promise<boolean> => {
  try {
    const DocumentPicker = require('expo-document-picker');

    const result = await getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return false;

    const fileUri = result.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(fileUri);
    let data: any;
    try {
      data = JSON.parse(content);
    } catch {
      appAlert('Fichier illisible', traduire('Ce fichier est abîmé ou n’est pas une sauvegarde YOROI.'));
      return false;
    }

    // Validation basique
    if (!data.version || !data.exportDate) {
      appAlert(traduire('Fichier non reconnu'), traduire('Choisis un fichier exporté depuis YOROI.'));
      return false;
    }

    await importData(data);
    const illustration = await illustrer('copieFaite');
    appAlert(traduire('Tout est revenu'), traduire('Tes séances, tes pesées et ton carnet sont de retour sur ce téléphone.'), undefined, illustration ? { illustration } : undefined);
    return true;
  } catch (error) {
    logger.error('Erreur import:', error);
    appAlert('Oups', traduire('L’import n’a pas abouti. Vérifie le fichier et réessaie.'));
    return false;
  }
};

/**
 * Convertit une chaîne en format CSV-safe
 * Échappe les guillemets et ajoute des guillemets si nécessaire
 */
function escapeCSV(value: string | null | undefined): string {
  if (!value) return '';

  // Remplacer les guillemets doubles par deux guillemets doubles
  const escaped = value.replace(/"/g, '""');

  // Ajouter des guillemets si la valeur contient une virgule, un guillemet ou un retour à la ligne
  if (escaped.includes(',') || escaped.includes('"') || escaped.includes('\n')) {
    return `"${escaped}"`;
  }

  return escaped;
}

/**
 * Exporte toutes les séances d'entraînement au format CSV
 */
export const exportTrainingsToCSV = async (): Promise<boolean> => {
  try {
    logger.info('Début export séances CSV...');

    // Importer les fonctions de base de données
    // Récupérer toutes les données
    const trainings = await getTrainings();
    const clubs = await getClubs();

    if (trainings.length === 0) {
      appAlert(traduire('Aucune séance'), traduire('Tu n’as pas encore de séance à exporter.'));
      return false;
    }

    // Créer un map des clubs par ID
    const clubsMap = new Map();
    clubs.forEach((club: any) => {
      clubsMap.set(club.id, club);
    });

    // Header CSV
    const header = [
      'Date',
      'Club',
      'Sport',
      traduire('Heure de début'),
      traduire('Durée (min)'),
      traduire('Types de séance'),
      traduire('Muscles travaillés'),
      traduire('Thème technique'),
      'Notes'
    ].join(',');

    // Convertir les trainings en lignes CSV
    const rows = trainings.map((training: any) => {
      const club = training.club_id ? clubsMap.get(training.club_id) : null;
      const clubName = club?.name || traduire('Activité libre');

      // Parser les JSON
      let sessionTypes = '';
      try {
        if (training.session_types) {
          const types = JSON.parse(training.session_types);
          sessionTypes = Array.isArray(types) ? types.join('; ') : '';
        }
      } catch (e) {
        logger.error('Erreur parsing session_types:', e);
      }

      let muscles = '';
      try {
        if (training.muscles) {
          const musclesList = JSON.parse(training.muscles);
          muscles = Array.isArray(musclesList) ? musclesList.join('; ') : '';
        }
      } catch (e) {
        logger.error('Erreur parsing muscles:', e);
      }

      // Créer la ligne
      return [
        escapeCSV(training.date),
        escapeCSV(clubName),
        escapeCSV(training.sport),
        escapeCSV(training.start_time),
        training.duration_minutes.toString(),
        escapeCSV(sessionTypes),
        escapeCSV(muscles),
        escapeCSV(training.technical_theme || ''),
        escapeCSV(training.notes || '')
      ].join(',');
    });

    // Combiner header et lignes
    const csvContent = [header, ...rows].join('\n');

    // Créer le nom du fichier avec la date
    const date = new Date().toISOString().split('T')[0];
    const fileName = `yoroi_seances_${date}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    // Écrire le fichier
    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    logger.info('Fichier CSV créé:', fileUri);

    // Vérifier si le partage est disponible
    const isSharingAvailable = await isAvailableAsync();

    if (isSharingAvailable) {
      // Partager le fichier
      await shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: traduire('Exporter les séances Yoroi'),
        UTI: 'public.comma-separated-values-text',
      });

      logger.info('Export séances CSV terminé avec succès');
      appAlert(
        traduire('Export réussi'),
        traduirePluriel(trainings.length, trainings.length > 1, "{0} séance exportée.", "{0} séances exportées.", trainings.length)
      );
    } else {
      appAlert(
        traduire('Export terminé'),
        traduire("Le fichier {0} est prêt.", fileName)
      );
    }

    return true;
  } catch (error) {
    logger.error('Erreur export séances CSV:', error);
    appAlert(
      'Oups',
      traduire('L’export des séances n’a pas abouti. Réessaie.')
    );
    return false;
  }
};

/**
 * Exporte toutes les séances au format Excel-compatible CSV
 * (avec séparateur point-virgule pour Excel français)
 */
export const exportTrainingsToExcelCSV = async (): Promise<boolean> => {
  try {
    logger.info('Début export Excel CSV...');

    // Importer les fonctions de base de données
    // Récupérer toutes les données
    const trainings = await getTrainings();
    const clubs = await getClubs();

    if (trainings.length === 0) {
      appAlert(traduire('Aucune séance'), traduire('Tu n’as pas encore de séance à exporter.'));
      return false;
    }

    const clubsMap = new Map();
    clubs.forEach((club: any) => {
      clubsMap.set(club.id, club);
    });

    // Header CSV avec point-virgule (format Excel français)
    const header = [
      'Date',
      'Club',
      'Sport',
      traduire('Heure de début'),
      traduire('Durée (min)'),
      traduire('Types de séance'),
      traduire('Muscles travaillés'),
      traduire('Thème technique'),
      'Notes'
    ].join(';');

    const rows = trainings.map((training: any) => {
      const club = training.club_id ? clubsMap.get(training.club_id) : null;
      const clubName = club?.name || traduire('Activité libre');

      let sessionTypes = '';
      try {
        if (training.session_types) {
          const types = JSON.parse(training.session_types);
          sessionTypes = Array.isArray(types) ? types.join(', ') : '';
        }
      } catch (e) {}

      let muscles = '';
      try {
        if (training.muscles) {
          const musclesList = JSON.parse(training.muscles);
          muscles = Array.isArray(musclesList) ? musclesList.join(', ') : '';
        }
      } catch (e) {}

      return [
        escapeCSV(training.date),
        escapeCSV(clubName),
        escapeCSV(training.sport),
        escapeCSV(training.start_time),
        training.duration_minutes.toString(),
        escapeCSV(sessionTypes),
        escapeCSV(muscles),
        escapeCSV(training.technical_theme || ''),
        escapeCSV(training.notes || '')
      ].join(';');
    });

    const csvContent = [header, ...rows].join('\n');

    const date = new Date().toISOString().split('T')[0];
    const fileName = `yoroi_seances_excel_${date}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    logger.info('Fichier Excel CSV créé:', fileUri);

    const isSharingAvailable = await isAvailableAsync();

    if (isSharingAvailable) {
      await shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: traduire('Exporter les séances Yoroi (Excel)'),
        UTI: 'public.comma-separated-values-text',
      });

      logger.info('Export Excel CSV terminé avec succès');
      appAlert(
        traduire('Export réussi'),
        traduirePluriel(trainings.length, trainings.length > 1, "{0} séance exportée pour Excel.", "{0} séances exportées pour Excel.", trainings.length)
      );
    } else {
      appAlert(
        traduire('Export terminé'),
        traduire("Le fichier {0} est prêt.", fileName)
      );
    }

    return true;
  } catch (error) {
    logger.error('Erreur export Excel CSV:', error);
    appAlert(
      'Oups',
      traduire('L’export pour Excel n’a pas abouti. Réessaie.')
    );
    return false;
  }
};

// ============================================
// EXPORT/IMPORT ÉDITABLE (CSV & JSON)
// ============================================

/**
 * Exporte TOUTES les données en CSV éditable (pour modification sur ordinateur)
 * Crée plusieurs fichiers CSV : pesées, séances, mensurations, clubs
 */
export const exportEditableCSV = async (): Promise<boolean> => {
  try {
    logger.info('Début export CSV éditable...');

    const [weights, trainings, measurements, clubs] = await Promise.all([
      getWeights(), // Toutes les pesées
      getTrainings(),
      getAllMeasurements(),
      getClubs(),
    ]);

    const date = new Date().toISOString().split('T')[0];

    // === 1. CSV PESÉES ===
    let weightsCSV = '# YOROI - PESÉES (éditable)\n';
    weightsCSV += '# Modifie ce fichier puis réimporte-le dans Yoroi\n';
    weightsCSV += '# Format date: AAAA-MM-JJ\n';
    weightsCSV += '#\n';
    weightsCSV += 'date;poids_kg;graisse_pct;muscle_pct;eau_pct;masse_osseuse_kg;graisse_viscerale;age_metabolique;bmr\n';

    (weights || []).forEach((w: any) => {
      weightsCSV += `${w.date};${w.weight};`;
      weightsCSV += `${w.fat_percent || ''};${w.muscle_percent || ''};${w.water_percent || ''};`;
      weightsCSV += `${w.bone_mass || ''};${w.visceral_fat || ''};${w.metabolic_age || ''};${w.bmr || ''}\n`;
    });

    // === 2. CSV SÉANCES ===
    let trainingsCSV = '# YOROI - SÉANCES (éditable)\n';
    trainingsCSV += '# Modifie ce fichier puis réimporte-le dans Yoroi\n';
    trainingsCSV += '# Format date: AAAA-MM-JJ | Heure: HH:MM | Durée en minutes\n';
    trainingsCSV += '# Sports disponibles: musculation, jjb, mma, boxe, running, natation, velo, fitness, yoga, autre\n';
    trainingsCSV += '#\n';
    trainingsCSV += 'date;sport;club;heure_debut;duree_min;type_seance;muscles;theme_technique;notes\n';

    const clubsMap = new Map((clubs || []).map((c: any) => [c.id, c.name]));

    (trainings || []).forEach((t: any) => {
      const clubName = t.club_id ? clubsMap.get(t.club_id) || '' : '';
      trainingsCSV += `${t.date};${t.sport};${escapeCSV(clubName)};${t.start_time || ''};${t.duration_minutes || ''};`;
      trainingsCSV += `${escapeCSV(t.session_type || '')};${escapeCSV(t.muscles || '')};`;
      trainingsCSV += `${escapeCSV(t.technical_theme || '')};${escapeCSV(t.notes || '')}\n`;
    });

    // === 3. CSV MENSURATIONS ===
    let measurementsCSV = '# YOROI - MENSURATIONS (éditable)\n';
    measurementsCSV += '# Toutes les valeurs en cm\n';
    measurementsCSV += '#\n';
    measurementsCSV += 'date;poitrine;taille;hanches;bras_gauche;bras_droit;cuisse_gauche;cuisse_droit;mollet_gauche;mollet_droit;epaules;cou;avant_bras_gauche;avant_bras_droit\n';

    (measurements || []).forEach((m: any) => {
      measurementsCSV += `${m.date};${m.chest || ''};${m.waist || ''};${m.hips || ''};`;
      measurementsCSV += `${m.left_arm || ''};${m.right_arm || ''};${m.left_thigh || ''};${m.right_thigh || ''};`;
      measurementsCSV += `${m.left_calf || ''};${m.right_calf || ''};${m.shoulders || ''};${m.neck || ''};`;
      measurementsCSV += `${m.left_forearm || ''};${m.right_forearm || ''}\n`;
    });

    // === 4. CSV CLUBS ===
    let clubsCSV = '# YOROI - CLUBS (éditable)\n';
    clubsCSV += '# Sports disponibles: musculation, jjb, mma, boxe, running, natation, velo, fitness, yoga, autre\n';
    clubsCSV += '# Couleur en format hex: #FF0000 (rouge), #00FF00 (vert), #0000FF (bleu)\n';
    clubsCSV += '#\n';
    clubsCSV += 'nom;sport;couleur;adresse\n';

    (clubs || []).forEach((c: any) => {
      clubsCSV += `${escapeCSV(c.name)};${c.sport};${c.color || ''};${escapeCSV(c.address || '')}\n`;
    });

    // === CRÉER UN ZIP OU PLUSIEURS FICHIERS ===
    // On crée un fichier JSON avec tous les CSV dedans pour simplifier
    const editableData = {
      _documentation: {
        fr: traduire("Ce fichier contient tes données Yoroi au format éditable."),
        instructions: [
          traduire("1. Ouvre ce fichier dans un éditeur de texte (VS Code, Notepad++, etc.)"),
          traduire("2. Modifie les données dans chaque section CSV"),
          traduire("3. Les lignes commençant par # sont des commentaires (ignorés)"),
          traduire("4. Sauvegarde le fichier et réimporte-le dans Yoroi"),
        ],
        format_date: "AAAA-MM-JJ (ex: 2024-01-15)",
        format_heure: "HH:MM (ex: 18:30)",
        separateur: "point-virgule (;)",
      },
      pesees_csv: weightsCSV,
      seances_csv: trainingsCSV,
      mensurations_csv: measurementsCSV,
      clubs_csv: clubsCSV,
      metadata: {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appName: 'Yoroi',
        counts: {
          pesees: weights?.length || 0,
          séances: trainings?.length || 0,
          mensurations: measurements?.length || 0,
          clubs: clubs?.length || 0,
        },
      },
    };

    const fileName = `yoroi_editable_${date}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(editableData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    logger.info('Fichier éditable créé:', fileName);

    const canShare = await isAvailableAsync();
    if (canShare) {
      await shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: traduire('Exporter données éditables Yoroi'),
        UTI: 'public.json',
      });

      appAlert(
        traduire('Export réussi'),
        traduire("Fichier éditable créé avec :\n• {0} pesées\n• {1} séances\n• {2} mensurations\n• {3} clubs\n\nOuvre ce fichier sur ton ordinateur pour modifier tes données.", weights?.length || 0, trainings?.length || 0, measurements?.length || 0, clubs?.length || 0)
      );
    }

    return true;
  } catch (error) {
    logger.error('Erreur export éditable:', error);
    appAlert('Oups', traduire('Le fichier modifiable n’a pas pu être créé.'));
    return false;
  }
};

/**
 * Parse une ligne CSV (gère les guillemets et échappements)
 */
const parseCSVLine = (line: string, separator: string = ';'): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++; // Skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === separator && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
};

/**
 * Parse un CSV complet (ignore les commentaires #)
 */
const parseCSV = (csvContent: string, separator: string = ';'): { headers: string[]; rows: string[][] } => {
  const lines = csvContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));

  if (lines.length === 0) return { headers: [], rows: [] };

  const headers = parseCSVLine(lines[0], separator);
  const rows = lines.slice(1).map(line => parseCSVLine(line, separator));

  return { headers, rows };
};

/**
 * Importe un fichier éditable (CSV dans JSON)
 */
export const importEditableCSV = async (): Promise<boolean> => {
  try {
    const result = await getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) return false;

    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const data = JSON.parse(fileContent);

    // Vérifier que c'est un fichier éditable Yoroi
    if (!data.metadata?.appName || data.metadata.appName !== 'Yoroi') {
      appAlert(traduire('Fichier non reconnu'), traduire('Ce fichier n’est pas un export modifiable de YOROI.'));
      return false;
    }

    let importedCount = 0;
    const errors: string[] = [];

    // === IMPORT PESÉES ===
    if (data.pesees_csv) {
      const { rows } = parseCSV(data.pesees_csv);
      for (const row of rows) {
        if (row.length >= 2 && row[0] && row[1]) {
          try {
            await addWeight({
              date: row[0],
              weight: parseFloat(row[1]),
              fat_percent: row[2] ? parseFloat(row[2]) : undefined,
              muscle_percent: row[3] ? parseFloat(row[3]) : undefined,
              water_percent: row[4] ? parseFloat(row[4]) : undefined,
              bone_mass: row[5] ? parseFloat(row[5]) : undefined,
              visceral_fat: row[6] ? parseInt(row[6]) : undefined,
              metabolic_age: row[7] ? parseInt(row[7]) : undefined,
              bmr: row[8] ? parseInt(row[8]) : undefined,
            });
            importedCount++;
          } catch (e) {
            errors.push(traduire("Pesée {0}: erreur", row[0]));
          }
        }
      }
    }

    // === IMPORT SÉANCES ===
    if (data.seances_csv) {
      const { rows } = parseCSV(data.seances_csv);
      for (const row of rows) {
        if (row.length >= 2 && row[0] && row[1]) {
          try {
            await addTraining({
              date: row[0],
              sport: row[1],
              start_time: row[3] || undefined,
              duration_minutes: row[4] ? parseInt(row[4]) : 60,
              session_type: row[5] || undefined,
              muscles: row[6] || undefined,
              technical_theme: row[7] || undefined,
              notes: row[8] || undefined,
            });
            importedCount++;
          } catch (e) {
            errors.push(traduire("Séance {0}: erreur", row[0]));
          }
        }
      }
    }

    // === IMPORT MENSURATIONS ===
    if (data.mensurations_csv) {
      const { rows } = parseCSV(data.mensurations_csv);
      for (const row of rows) {
        if (row.length >= 2 && row[0]) {
          try {
            await addMeasurementRecord({
              date: row[0],
              chest: row[1] ? parseFloat(row[1]) : undefined,
              waist: row[2] ? parseFloat(row[2]) : undefined,
              hips: row[3] ? parseFloat(row[3]) : undefined,
              left_arm: row[4] ? parseFloat(row[4]) : undefined,
              right_arm: row[5] ? parseFloat(row[5]) : undefined,
              left_thigh: row[6] ? parseFloat(row[6]) : undefined,
              right_thigh: row[7] ? parseFloat(row[7]) : undefined,
              left_calf: row[8] ? parseFloat(row[8]) : undefined,
              right_calf: row[9] ? parseFloat(row[9]) : undefined,
              shoulders: row[10] ? parseFloat(row[10]) : undefined,
              neck: row[11] ? parseFloat(row[11]) : undefined,
              left_forearm: row[12] ? parseFloat(row[12]) : undefined,
              right_forearm: row[13] ? parseFloat(row[13]) : undefined,
            });
            importedCount++;
          } catch (e) {
            errors.push(traduire("Mensuration {0}: erreur", row[0]));
          }
        }
      }
    }

    // === IMPORT CLUBS ===
    if (data.clubs_csv) {
      const { rows } = parseCSV(data.clubs_csv);
      for (const row of rows) {
        if (row.length >= 2 && row[0] && row[1]) {
          try {
            await addClub({
              name: row[0],
              sport: row[1],
              color: row[2] || undefined,
              address: row[3] || undefined,
            });
            importedCount++;
          } catch (e) {
            errors.push(traduire("Club {0}: erreur", row[0]));
          }
        }
      }
    }

    const errorMsg = errors.length > 0 ? traduire("\n\n{0} erreur(s) ignorée(s)", errors.length) : '';

    appAlert(
      traduire('Import réussi'),
      traduire("{0} éléments importés.{1}", importedCount, errorMsg)
    );

    return true;
  } catch (error) {
    logger.error('Erreur import éditable:', error);
    appAlert('Oups', traduire('Ce fichier n’a pas pu être importé.'));
    return false;
  }
};

/**
 * Génère un template vide pour l'utilisateur (à remplir sur ordinateur)
 */
export const exportEmptyTemplate = async (): Promise<boolean> => {
  try {
    const template = {
      _documentation: {
        fr: traduire("TEMPLATE VIDE - Remplis ce fichier avec tes données et importe-le dans Yoroi"),
        instructions: [
          traduire("1. Ouvre ce fichier dans un éditeur de texte"),
          traduire("2. Ajoute tes données dans chaque section CSV"),
          traduire("3. Respecte le format (une ligne = une entrée)"),
          traduire("4. Sauvegarde et importe dans Yoroi > Plus > Importer CSV"),
        ],
        exemples: {
          date: "2024-01-15",
          heure: "18:30",
          poids: "75.5",
          couleur: "#FF0000",
        },
      },
      pesees_csv: `# YOROI - PESÉES (template)
# date;poids_kg;graisse_pct;muscle_pct;eau_pct;masse_osseuse_kg;graisse_viscerale;age_metabolique;bmr
# EXEMPLE:
# 2024-01-15;75.5;18.5;42.0;55.0;3.2;8;28;1650
#
date;poids_kg;graisse_pct;muscle_pct;eau_pct;masse_osseuse_kg;graisse_viscerale;age_metabolique;bmr
`,
      seances_csv: `# YOROI - SÉANCES (template)
# date;sport;club;heure_debut;duree_min;type_seance;muscles;theme_technique;notes
# Sports: musculation, jjb, mma, boxe, running, natation, velo, fitness, yoga, autre
# EXEMPLE:
# 2024-01-15;musculation;Basic Fit;18:30;60;Push;pectoraux,triceps;;Super séance !
#
date;sport;club;heure_debut;duree_min;type_seance;muscles;theme_technique;notes
`,
      mensurations_csv: `# YOROI - MENSURATIONS (template)
# Toutes les valeurs en cm
# date;poitrine;taille;hanches;bras_gauche;bras_droit;cuisse_gauche;cuisse_droit;mollet_gauche;mollet_droit;epaules;cou
# EXEMPLE:
# 2024-01-15;105;85;100;35;35;55;55;38;38;120;40
#
date;poitrine;taille;hanches;bras_gauche;bras_droit;cuisse_gauche;cuisse_droit;mollet_gauche;mollet_droit;epaules;cou
`,
      clubs_csv: `# YOROI - CLUBS (template)
# nom;sport;couleur;adresse
# EXEMPLE:
# Basic Fit Marseille;musculation;#FF6B00;123 rue du Sport, Marseille
#
nom;sport;couleur;adresse
`,
      metadata: {
        version: '1.0',
        exportDate: new Date().toISOString(),
        appName: 'Yoroi',
        type: 'template',
      },
    };

    const fileName = `yoroi_template_vide.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(template, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    const canShare = await isAvailableAsync();
    if (canShare) {
      await shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Template Yoroi',
        UTI: 'public.json',
      });

      appAlert(
        traduire('Modèle créé'),
        traduire('Ouvre ce fichier sur ton ordinateur, remplis-le, puis importe-le dans YOROI.')
      );
    }

    return true;
  } catch (error) {
    logger.error('Erreur création template:', error);
    appAlert('Oups', traduire('Le modèle n’a pas pu être créé.'));
    return false;
  }
};
