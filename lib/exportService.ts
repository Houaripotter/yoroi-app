import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { getDocumentAsync } from 'expo-document-picker';
import { captureRef } from 'react-native-view-shot';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import secureStorage from './security/secureStorage';
import { digestStringAsync, CryptoDigestAlgorithm } from 'expo-crypto';
import { isBackupEncryptionEnabled, getStoredEncryptionPassword, encryptBackup, isEncryptedBackup, decryptBackup, DecryptionError } from './backupEncryption';
import { requestPassword } from './passwordPromptController';
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
} from './storage';
import { getSleepEntries, getSleepGoal } from './sleepService';
import { getWeights, getTrainings, getProfile, addWeight, addTraining, getClubs, addClub, addMeasurementRecord, saveProfile, getInjuries, addInjury, getCompetitions, addCompetition, getWeeklyPlan, addWeeklyPlanItem, openDatabase, getMeasurements as getSqlMeasurements } from './database';
import { getAllBodyCompositions, addBodyComposition } from './bodyComposition';
import { getUnlockedBadges, unlockBadge } from './badges';
import { getAllGoals, setGoal } from './trainingGoalsService';
import logger from '@/lib/security/logger';
import { validate, VALIDATION_RULES } from './validation';
import { migrateBackup, validateBackup } from './backupMigrationService';

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
    } else {
      sanitized[key] = result.valid ? result.value : null;
    }
  }
  return sanitized as T;
}

// ============================================
// CONFIGURATION
// ============================================

const EXPORT_VERSION = '5.5'; // v5.5 : Training Journal, Carnet, débriefs séance, records, training loads

// ============================================
// UTILITAIRES IMAGES
// ============================================

/**
 * Convertit une image URI en base64
 */
const imageToBase64 = async (uri: string | undefined | null): Promise<string | null> => {
  if (!uri) return null;
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
          Alert.alert(
            '💾 Espace disque insuffisant',
            `Il te reste ${Math.round(freeDiskBytes / 1024 / 1024)} MB sur cet appareil. Un backup ${includePhotos ? 'complet' : 'léger'} a besoin d'au moins ${Math.round(minRequired / 1024 / 1024)} MB.\n\nLibère de l'espace (supprime des apps ou photos) puis réessaie.`
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

    // ─── v5.3 — Combat Lab : sparring, game plan, drills ────────────────────
    // ─── v5.4 — Photo history (frames) ───────────────────────────────────
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

    // ─── v5.5 — Training Journal (SQLite) + Carnet + Records + Loads ────────
    let progressionItems: any[] = [];
    let practiceLogs: any[] = [];
    try {
      const db = await openDatabase();
      progressionItems = await db.getAllAsync<any>('SELECT * FROM progression_items').catch(() => []);
      practiceLogs = await db.getAllAsync<any>('SELECT * FROM practice_logs').catch(() => []);
    } catch { /* tables peut-être pas encore créées — OK */ }

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
      AsyncStorage.getItem('@yoroi_benchmarks_v2').catch(() => null),
      AsyncStorage.getItem('@yoroi_skills_v2').catch(() => null),
      AsyncStorage.getItem('@yoroi_trash_benchmarks_v2').catch(() => null),
      AsyncStorage.getItem('@yoroi_trash_skills_v2').catch(() => null),
      AsyncStorage.getItem('@yoroi_personal_records').catch(() => null),
      AsyncStorage.getItem('@yoroi_training_loads').catch(() => null),
      AsyncStorage.getItem('@yoroi_health_bonus_history').catch(() => null),
      AsyncStorage.getItem('@yoroi_source_freshness').catch(() => null),
    ]);

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

    // 5. Historique photo (frames) — array d'URIs stocké dans @yoroi_photo_history
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
      // v5.2 — données manquantes
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
      // v5.3 — Combat Lab (sparring, game plan, drills, favoris)
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
      // v5.4 — Toutes les photos/médias complémentaires
      mediaAssets: {
        photoHistory: photoHistoryWithBase64,     // Historique des photos avec frames (5 dernières)
        avatarBase64,                              // Avatar custom (image perso)
        routineImageBase64,                        // Image de routine hebdomadaire
        customClubLogosBase64,                     // Logos custom des clubs (map nom → base64)
      },
      // v5.5 — Training Journal (objectifs + logs de pratique) et Carnet (benchmarks + skills)
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
          logger.warn('[Backup] Chiffrement activé mais aucun mot de passe stocké — backup non chiffré');
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
    // savoir si le push cloud a réellement réussi — important pour les banners UI).
    try {
      const { getSavedCloudFolder, copyToCloudFolder } = await import('@/lib/cloudFolderService');
      const cloudFolder = await getSavedCloudFolder();
      if (cloudFolder) {
        const cleanPath = fileUri.startsWith('file://') ? decodeURIComponent(fileUri.slice(7)) : fileUri;
        const cloudOk = await Promise.race<boolean>([
          copyToCloudFolder(cleanPath),
          new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 15000)),
        ]);
        if (cloudOk) {
          // Track le succès réel du push cloud — lu par BackupStatusHeader et multi-device sync
          await AsyncStorage.setItem('@yoroi_last_cloud_sync_success', new Date().toISOString());
          logger.info('[Backup] ✅ Push cloud réussi:', cloudFolder.displayName);
        } else {
          // Marquer l'échec pour que l'UI puisse avertir l'user
          await AsyncStorage.setItem('@yoroi_last_cloud_sync_failure', new Date().toISOString());
          logger.warn('[Backup] ⚠️ Push cloud échoué ou timeout — backup local seulement');
        }
      }
    } catch (cloudError) {
      await AsyncStorage.setItem('@yoroi_last_cloud_sync_failure', new Date().toISOString()).catch(() => {});
      logger.warn('[Backup] Erreur sync cloud:', cloudError);
    }

    // Partager le fichier JSON (sauf en mode silent pour backups auto)
    if (!silent) {
      const canShare = await isAvailableAsync();
      if (canShare) {
        await shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Sauvegarder dans ton Cloud',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('Succès', `Données exportées vers ${fileUri}`);
      }
    }

    return true;
  } catch (error) {
    logger.error('Erreur export JSON:', error);
    if (!silent) {
      Alert.alert('Erreur', 'Impossible d\'exporter les données');
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
      Alert.alert('Info', 'Aucune donnée à exporter');
      return false;
    }

    // Créer le CSV avec toutes les colonnes
    let csv = 'Date,Poids (kg),Graisse (%),Muscle (%),Eau (%),Masse osseuse (kg),Graisse viscérale,Âge métabolique,BMR\n';

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
        dialogTitle: 'Exporter vers Excel/Numbers',
        UTI: 'public.comma-separated-values-text',
      });
    } else {
      Alert.alert('Succès', `Données exportées vers ${fileUri}`);
    }

    return true;
  } catch (error) {
    logger.error('Erreur export CSV:', error);
    Alert.alert('Erreur', 'Impossible d\'exporter les données');
    return false;
  }
};

/**
 * Importe les données depuis un fichier JSON (avec restauration des images)
 */
export const importDataFromJSON = async (): Promise<boolean> => {
  try {
    // Sélectionner un fichier
    const result = await getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return false;
    }

    // Lire le fichier
    const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    let importedData: any;
    try {
      importedData = JSON.parse(fileContent);
    } catch (parseError) {
      Alert.alert('Erreur', 'Le fichier est corrompu ou invalide (JSON malformé)');
      return false;
    }

    // ─── Détection & déchiffrement si backup chiffré ──────────────────
    if (isEncryptedBackup(importedData)) {
      // Cross-platform : modal custom via controller global (plus de Alert.prompt iOS-only)
      const password = await requestPassword({
        title: '🔒 Sauvegarde chiffrée',
        message: 'Ce backup est protégé par un mot de passe. Entre-le pour continuer.',
        confirmLabel: 'Déchiffrer',
      });
      if (!password) return false;

      try {
        importedData = decryptBackup(importedData, password);
        logger.info('[Import] Backup déchiffré avec succès');
      } catch (e) {
        // Messages d'erreur différenciés selon la cause réelle
        let title = 'Erreur';
        let msg = "Impossible de déchiffrer la sauvegarde.";
        if (e instanceof DecryptionError) {
          switch (e.code) {
            case 'WRONG_PASSWORD':
              title = 'Mot de passe incorrect';
              msg = "Vérifie ton mot de passe. Si le fichier a été modifié pendant le transfert, il peut aussi être corrompu.";
              break;
            case 'TAMPERED':
              title = '⚠️ Fichier altéré';
              msg = "Le fichier a été modifié après chiffrement. La restauration est refusée pour protéger tes données.";
              break;
            case 'JSON_INVALID':
              title = '⚠️ Données corrompues';
              msg = "Le déchiffrement a réussi mais les données internes sont corrompues.";
              break;
            case 'INVALID_FORMAT':
              title = 'Format invalide';
              msg = "Ce fichier n'est pas un backup Yoroi chiffré valide.";
              break;
          }
        }
        Alert.alert(title, msg);
        return false;
      }
    }

    // Valider que c'est bien un fichier Yoroi
    const validation = validateBackup(importedData);
    if (!validation.valid) {
      Alert.alert('Fichier invalide', validation.errors.join('\n'));
      return false;
    }

    // ─── Vérification du checksum d'intégrité (v5.5+) ──────────────────
    // Si le backup contient un bloc `integrity`, on recalcule le hash et on
    // vérifie qu'il correspond — détecte les fichiers corrompus/tronqués.
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
            Alert.alert(
              '⚠️ Fichier possiblement corrompu',
              "Le checksum d'intégrité ne correspond pas. Le fichier a peut-être été modifié ou tronqué pendant un transfert.\n\nVeux-tu quand même tenter la restauration ? (risque de données incomplètes)",
              [
                { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
                { text: 'Tenter quand même', style: 'destructive', onPress: () => resolve(true) },
              ]
            );
          });
          if (!confirmed) return false;
        } else {
          logger.info('[Import] Checksum vérifié — fichier intègre');
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
      Alert.alert('Erreur', 'Impossible de lire ce fichier de sauvegarde.');
      return false;
    }

    // Compter les images à restaurer
    const clubsWithLogos = (importedData.clubs || []).filter((c: any) => c.logo_base64);
    const hasProfilePhoto = importedData.profile?.profile_photo_base64;
    const photosWithImages = (importedData.photos || []).filter((p: any) => p.image_base64);

    // Demander confirmation
    const confirmed = await new Promise<boolean>((resolve) => {
      const summary = [
        `• ${importedData.weights?.length || 0} mesures de poids`,
        `• ${importedData.trainings?.length || 0} entraînements`,
        `• ${importedData.bodyCompositions?.length || 0} compositions corporelles`,
        `• ${importedData.clubs?.length || 0} clubs${clubsWithLogos.length > 0 ? ` (${clubsWithLogos.length} logos)` : ''}`,
        `• ${importedData.measurements?.length || 0} mensurations`,
        `• ${importedData.unlockedBadges?.length || 0} badges débloqués`,
        `• ${importedData.photos?.length || 0} photos${photosWithImages.length > 0 ? ` (${photosWithImages.length} images)` : ''}`,
        importedData.sleepEntries?.length > 0 ? `• ${importedData.sleepEntries.length} nuits de sommeil` : null,
        importedData.moodEntries?.length > 0 ? `• ${importedData.moodEntries.length} entrées d'humeur` : null,
        importedData.hydrationEntries?.length > 0 ? `• ${importedData.hydrationEntries.length} entrées d'hydratation` : null,
        hasProfilePhoto ? '• Photo de profil' : null,
        importedData.userSettings ? '• Paramètres utilisateur' : null,
        importedData.homeLayout ? '• Layout de l\'accueil' : null,
      ].filter(Boolean).join('\n');

      Alert.alert(
        'Importer les données ?',
        `Tu vas importer :\n${summary}\n\nCela va AJOUTER ces données aux données existantes (pas de remplacement).`,
        [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Importer', onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirmed) {
      return false;
    }

    // ─── SAFETY BACKUP avant restauration ─────────────────────────
    // On sauvegarde l'état ACTUEL avant d'importer le backup — si l'user
    // regrette ou si l'import foire en cours, il pourra revenir en arrière.
    try {
      const { runSafetyBackup } = await import('./safetyBackupService');
      await runSafetyBackup('pre-restore');
    } catch { /* non bloquant */ }

    logger.info('Début import données...');
    let importedCount = 0;
    let imagesRestored = 0;

    // === RESTAURER LE PROFIL AVEC PHOTO ===
    if (importedData.profile) {
      try {
        const profileData = { ...importedData.profile };

        // Restaurer la photo de profil si présente
        if (profileData.profile_photo_base64) {
          const photoUri = await base64ToImage(
            profileData.profile_photo_base64,
            `profile_photo_${Date.now()}.jpg`
          );
          if (photoUri) {
            profileData.profile_photo = photoUri;
            imagesRestored++;
            logger.info('Photo de profil restaurée');
          }
        }
        delete profileData.profile_photo_base64;

        await saveProfile(profileData);
        importedCount++;
      } catch (error) {
        logger.error('Erreur import profil:', error);
      }
    }

    // Importer les poids
    if (importedData.weights && Array.isArray(importedData.weights)) {
      // Anti-doublon : une restauration (ou une synchro entre appareils) ne doit pas
      // dupliquer les pesées déjà présentes
      const weightKey = (w: any) => `${String(w.date).slice(0, 10)}|${Number(w.weight).toFixed(2)}|${w.source || 'manual'}`;
      const seenWeights = new Set((await getWeights().catch(() => [])).map(weightKey));
      for (const raw of importedData.weights) {
        if (raw && seenWeights.has(weightKey(raw))) continue;
        try {
          const weight = sanitizeImportRecord(raw);
          // weight.weight est requis — si null après sanitize, on saute le record
          if (weight.weight == null || isNaN(Number(weight.weight))) {
            logger.warn('Import poids ignoré (valeur invalide):', raw.weight);
            continue;
          }
          await addWeight({
            weight: weight.weight,
            date: weight.date,
            fat_percent: weight.fat_percent,
            muscle_percent: weight.muscle_percent,
            water_percent: weight.water_percent,
            bone_mass: weight.bone_mass,
            visceral_fat: weight.visceral_fat,
            metabolic_age: weight.metabolic_age,
            bmr: weight.bmr,
          });
          importedCount++;
        } catch (error) {
          logger.error('Erreur import poids:', error);
        }
      }
    }

    // Importer les entraînements (COMPLET avec tous les champs)
    if (importedData.trainings && Array.isArray(importedData.trainings)) {
      // Anti-doublon séances (l'identifiant Santé est aussi contrôlé dans addTraining)
      const trainingKey = (t: any) => t.healthkit_uuid
        ? `uuid|${t.healthkit_uuid}`
        : `${String(t.date).slice(0, 10)}|${t.start_time ?? ''}|${t.sport ?? t.discipline ?? ''}|${t.duration_minutes ?? ''}`;
      const seenTrainings = new Set((await getTrainings().catch(() => [])).map(trainingKey));
      for (const raw of importedData.trainings) {
        if (raw && seenTrainings.has(trainingKey(raw))) continue;
        const training = sanitizeImportRecord(raw);
        try {
          await addTraining({
            club_id: training.club_id,
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
            pente: training.pente,
            speed: training.speed,
            resistance: training.resistance,
            watts: training.watts,
            cadence: training.cadence,
            technique_rating: training.technique_rating,
            // Champs restaurés depuis v5.1+
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
          });
          importedCount++;
        } catch (error) {
          logger.error('Erreur import training:', error);
        }
      }
    }

    // Importer les compositions corporelles
    if (importedData.bodyCompositions && Array.isArray(importedData.bodyCompositions)) {
      for (const raw of importedData.bodyCompositions) {
        try {
          await addBodyComposition(sanitizeImportRecord(raw));
          importedCount++;
        } catch (error) {
          logger.error('Erreur import composition:', error);
        }
      }
    }

    // === IMPORTER LES CLUBS AVEC LOGOS ===
    if (importedData.clubs && Array.isArray(importedData.clubs)) {
      // Charger les clubs existants pour éviter les doublons (même nom + sport)
      const existingClubs = await getClubs();
      const existingClubKeys = new Set(
        existingClubs.map((c: any) => `${c.name}|${c.sport}`)
      );

      for (const club of importedData.clubs) {
        const key = `${club.name}|${club.sport}`;
        if (existingClubKeys.has(key)) continue; // doublon, on saute

        try {
          const clubData = { ...club };

          // Restaurer le logo si présent en base64
          if (clubData.logo_base64) {
            const logoUri = await base64ToImage(
              clubData.logo_base64,
              `club_logo_${clubData.name?.replace(/\s/g, '_') || Date.now()}.png`
            );
            if (logoUri) {
              clubData.logo_uri = logoUri;
              imagesRestored++;
              logger.info(`Logo restauré pour club: ${clubData.name}`);
            }
          }
          delete clubData.logo_base64;

          await addClub(clubData);
          existingClubKeys.add(key); // évite doublon si le même backup liste 2x le même club
          importedCount++;
        } catch (error) {
          logger.error('Erreur import club:', error);
        }
      }
    }

    // Importer les mensurations
    if (importedData.measurements && Array.isArray(importedData.measurements)) {
      // Anti-doublon : ne pas réinsérer une mensuration déjà présente en base
      const MEAS_FIELDS = ['chest', 'waist', 'navel', 'hips', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'left_calf', 'right_calf', 'shoulders', 'neck'];
      const measKey = (m: any) => `${String(m?.date).slice(0, 10)}|${MEAS_FIELDS.map(f => (m?.[f] == null ? '' : Number(m[f]))).join('|')}`;
      const seenMeasurements = new Set((await getSqlMeasurements().catch(() => [])).map(measKey));
      for (const raw of importedData.measurements) {
        if (raw && seenMeasurements.has(measKey(raw))) continue;
        try {
          const m = sanitizeImportRecord(raw);
          await addMeasurementRecord({
            chest: m.chest,
            waist: m.waist,
            navel: m.navel,
            hips: m.hips,
            left_arm: m.left_arm,
            right_arm: m.right_arm,
            left_thigh: m.left_thigh,
            right_thigh: m.right_thigh,
            left_calf: m.left_calf,
            right_calf: m.right_calf,
            shoulders: m.shoulders,
            neck: m.neck,
            date: m.date,
          });
          importedCount++;
        } catch (error) {
          logger.error('Erreur import measurement:', error);
        }
      }
    }

    // Importer les badges débloqués
    if (importedData.unlockedBadges && Array.isArray(importedData.unlockedBadges)) {
      for (const badgeId of importedData.unlockedBadges) {
        try {
          await unlockBadge(badgeId);
          importedCount++;
        } catch (error) {
          logger.error('Erreur import badge:', error);
        }
      }
    }

    // Importer les paramètres utilisateur
    if (importedData.userSettings) {
      try {
        await saveUserSettings(importedData.userSettings);
        importedCount++;
      } catch (error) {
        logger.error('Erreur import settings:', error);
      }
    }

    // Importer le layout home
    if (importedData.homeLayout && Array.isArray(importedData.homeLayout)) {
      try {
        await saveHomeLayout(importedData.homeLayout);
        importedCount++;
      } catch (error) {
        logger.error('Erreur import home layout:', error);
      }
    }

    // Importer le logo sélectionné
    if (importedData.selectedLogo) {
      try {
        await saveSelectedLogo(importedData.selectedLogo);
        importedCount++;
      } catch (error) {
        logger.error('Erreur import logo:', error);
      }
    }

    // Importer les entrées de sommeil
    if (importedData.sleepEntries && Array.isArray(importedData.sleepEntries)) {
      try {
        // Le sommeil est stocké dans AsyncStorage (SecureStore n'est plus lu après migration)
        const _sleepRaw = await AsyncStorage.getItem('@yoroi_sleep_entries');
        const existingEntries: any[] = _sleepRaw ? JSON.parse(_sleepRaw) : [];
        const existingIds = new Set(existingEntries.map((e: any) => e.id));
        const newEntries = importedData.sleepEntries.filter((e: any) => !existingIds.has(e.id));
        if (newEntries.length > 0) {
          const merged = [...existingEntries, ...newEntries];
          await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify(merged));
          importedCount += newEntries.length;
        }
      } catch (error) {
        logger.error('Erreur import sommeil:', error);
      }
    }

    // Importer l'objectif de sommeil
    if (importedData.sleepGoal && typeof importedData.sleepGoal === 'number') {
      try {
        await AsyncStorage.setItem('@yoroi_sleep_goal', String(importedData.sleepGoal));
        importedCount++;
      } catch (error) {
        logger.error('Erreur import objectif sommeil:', error);
      }
    }

    // Importer les entrées d'humeur
    if (importedData.moodEntries && Array.isArray(importedData.moodEntries)) {
      try {
        const existingMoods = await getMoods();
        const existingDates = new Set(existingMoods.map((m: any) => m.date));
        const newMoods = importedData.moodEntries.filter((m: any) => !existingDates.has(m.date));
        for (const mood of newMoods) {
          await saveMood(mood);
        }
        importedCount += newMoods.length;
      } catch (error) {
        logger.error('Erreur import humeur:', error);
      }
    }

    // Importer les entrées d'hydratation
    if (importedData.hydrationEntries && Array.isArray(importedData.hydrationEntries)) {
      try {
        const existingEntries = await getAllHydrationEntries();
        const existingIds = new Set(existingEntries.map((e: any) => e.id));
        const newEntries = importedData.hydrationEntries.filter((e: any) => !existingIds.has(e.id));
        if (newEntries.length > 0) {
          const merged = [...existingEntries, ...newEntries];
          await AsyncStorage.setItem('@yoroi_hydration_log', JSON.stringify(merged));
          importedCount += newEntries.length;
        }
      } catch (error) {
        logger.error('Erreur import hydratation:', error);
      }
    }

    // Importer les paramètres d'hydratation
    if (importedData.hydrationSettings) {
      try {
        await saveHydrationSettings(importedData.hydrationSettings);
        importedCount++;
      } catch (error) {
        logger.error('Erreur import paramètres hydratation:', error);
      }
    }

    // Importer les photos de transformation
    if (importedData.photos && Array.isArray(importedData.photos)) {
      try {
        const existingPhotos = await getPhotosFromStorage();
        const existingIds = new Set(existingPhotos.map((p: any) => p.id));
        const restoredPhotos: any[] = [...existingPhotos];

        for (const photo of importedData.photos) {
          if (existingIds.has(photo.id)) continue;

          const photoData = { ...photo };
          delete photoData.image_base64;

          // Restaurer l'image base64 vers un fichier local
          if (photo.image_base64) {
            const ext = (photo.file_uri || photo.uri || 'photo.jpg').split('.').pop() || 'jpg';
            const photoUri = await base64ToImage(
              photo.image_base64,
              `photo_${photo.id || Date.now()}.${ext}`
            );
            if (photoUri) {
              // Champ officiel : file_uri (cf. Photo dans lib/storage.ts)
              photoData.file_uri = photoUri;
              delete photoData.uri;
              imagesRestored++;
            }
          }

          restoredPhotos.push(photoData);
        }

        // La clé lue par l'app est @yoroi_photos_v2 (AsyncStorage) : SecureStore n'était plus lu
        await AsyncStorage.setItem('@yoroi_photos_v2', JSON.stringify(restoredPhotos));
        importedCount++;
      } catch (error) {
        logger.error('Erreur import photos:', error);
      }
    }

    // === IMPORTER LES BLESSURES (INFIRMERIE) ===
    if (importedData.injuries && Array.isArray(importedData.injuries)) {
      for (const injury of importedData.injuries) {
        try {
          await addInjury(sanitizeImportRecord(injury));
          importedCount++;
        } catch (error) {
          logger.error('Erreur import blessure:', error);
        }
      }
    }

    // === IMPORTER LES COMPÉTITIONS ===
    if (importedData.competitions && Array.isArray(importedData.competitions)) {
      const existingComps = await getCompetitions().catch(() => []);
      const existingKeys = new Set(existingComps.map((c: any) => `${c.name}|${c.date}`));
      for (const comp of importedData.competitions) {
        const key = `${comp.name}|${comp.date}`;
        if (existingKeys.has(key)) continue;
        try {
          const { id, created_at, ...compData } = comp;
          await addCompetition(sanitizeImportRecord(compData));
          existingKeys.add(key);
          importedCount++;
        } catch (error) {
          logger.error('Erreur import compétition:', error);
        }
      }
    }

    // === IMPORTER LE PLANNING HEBDOMADAIRE ===
    if (importedData.weeklyPlan && Array.isArray(importedData.weeklyPlan)) {
      for (const slot of importedData.weeklyPlan) {
        try {
          const { id, ...slotData } = slot;
          await addWeeklyPlanItem(sanitizeImportRecord(slotData));
          importedCount++;
        } catch (error) {
          logger.error('Erreur import planning:', error);
        }
      }
    }

    // === IMPORTER LES OBJECTIFS D'ENTRAÎNEMENT ===
    if (importedData.trainingGoals && Array.isArray(importedData.trainingGoals)) {
      for (const goal of importedData.trainingGoals) {
        try {
          if (goal.sport_id && goal.weekly_target) {
            await setGoal(goal.sport_id, goal.weekly_target);
            importedCount++;
          }
        } catch (error) {
          logger.error('Erreur import objectif:', error);
        }
      }
    }

    // === RESTAURER L'APPARENCE (THÈME, LANGUE, ONGLETS, AVATAR) ===
    if (importedData.appearance) {
      const a = importedData.appearance;
      try {
        const tasks: Promise<any>[] = [];
        if (a.themeColor)        tasks.push(AsyncStorage.setItem('yoroi_theme_color_v5', a.themeColor));
        if (a.themeMode)         tasks.push(AsyncStorage.setItem('yoroi_theme_mode_v5', a.themeMode));
        if (a.language)          tasks.push(AsyncStorage.setItem('@yoroi_language', a.language));
        if (a.tabOrder)          tasks.push(AsyncStorage.setItem('@yoroi_tab_order', a.tabOrder));
        if (a.avatarSelection)   tasks.push(AsyncStorage.setItem('@yoroi_avatar_config', a.avatarSelection));
        if (a.userGear)          tasks.push(AsyncStorage.setItem('@yoroi_user_gear', a.userGear));
        if (a.fighterModeSport)  tasks.push(AsyncStorage.setItem('@yoroi_user_mode', a.fighterModeSport));
        if (a.fighterModeCategory) tasks.push(AsyncStorage.setItem('@yoroi_weight_category', a.fighterModeCategory));
        if (a.fighterModeBelt)   tasks.push(AsyncStorage.setItem('@yoroi_belt', a.fighterModeBelt));
        await Promise.all(tasks);
        importedCount++;
      } catch (error) {
        logger.error('Erreur import apparence:', error);
      }
    }

    // === v5.3 — RESTAURER LE COMBAT LAB (sparring, playbook, drills) ===
    if (importedData.combatLab) {
      const c = importedData.combatLab;
      try {
        const tasks: Promise<any>[] = [];
        // Restaurer les photos des partenaires sparring (base64 → fichiers locaux)
        if (c.sparringPartners) {
          try {
            const partners: any[] = JSON.parse(c.sparringPartners);
            let sparringPhotosRestored = 0;
            const restoredPartners = await Promise.all(
              partners.map(async (partner: any) => {
                if (partner.photoBase64) {
                  const fileName = `sparring_partner_${partner.id || Date.now()}.jpg`;
                  const newUri = await base64ToImage(partner.photoBase64, fileName);
                  if (newUri) {
                    sparringPhotosRestored++;
                    return { ...partner, photoUri: newUri };
                  }
                }
                return partner;
              })
            );
            tasks.push(AsyncStorage.setItem('@yoroi_sparring_partners', JSON.stringify(restoredPartners)));
            imagesRestored += sparringPhotosRestored;
            if (sparringPhotosRestored > 0) logger.info(`${sparringPhotosRestored} photos de partenaires sparring restaurées`);
          } catch {
            // Fallback : sauvegarder tel quel si le parsing échoue
            tasks.push(AsyncStorage.setItem('@yoroi_sparring_partners', c.sparringPartners));
          }
        }
        if (c.playbookCustom) {
          const p = c.playbookCustom;
          if (p.gamePlan)         tasks.push(AsyncStorage.setItem('@yoroi_playbook_custom_gamePlan', p.gamePlan));
          if (p.whatWorked)       tasks.push(AsyncStorage.setItem('@yoroi_playbook_custom_whatWorked', p.whatWorked));
          if (p.whatDidntWork)    tasks.push(AsyncStorage.setItem('@yoroi_playbook_custom_whatDidntWork', p.whatDidntWork));
          if (p.counteredBy)      tasks.push(AsyncStorage.setItem('@yoroi_playbook_custom_counteredBy', p.counteredBy));
          if (p.improvement)      tasks.push(AsyncStorage.setItem('@yoroi_playbook_custom_improvement', p.improvement));
        }
        if (c.gameplanChecked)    tasks.push(AsyncStorage.setItem('@yoroi_gameplan_checked', c.gameplanChecked));
        if (c.drillTracker)       tasks.push(AsyncStorage.setItem('@yoroi_drill_tracker', c.drillTracker));
        if (c.sparringWeeklyGoal) tasks.push(AsyncStorage.setItem('@sparring_weekly_goal', c.sparringWeeklyGoal));
        if (c.bjjFavSubmissions)  tasks.push(AsyncStorage.setItem('bjj_fav_submissions_v2', c.bjjFavSubmissions));
        if (c.toolFavorites)      tasks.push(AsyncStorage.setItem('@yoroi_tool_favorites', typeof c.toolFavorites === 'string' ? c.toolFavorites : JSON.stringify(c.toolFavorites)));
        await Promise.all(tasks);
        importedCount++;
        logger.info('Combat Lab restauré : partenaires, playbook, drills, favoris');
      } catch (error) {
        logger.error('Erreur import Combat Lab:', error);
      }
    }

    const imageMsg = imagesRestored > 0 ? `\n\n${imagesRestored} image(s) restaurée(s) (photo de profil, logos de clubs, photos de transformation, photos de partenaires sparring)` : '';

    Alert.alert(
      'Import réussi !',
      `${importedCount} éléments ont été importés avec succès.${imageMsg}\n\nTes paramètres, clubs, badges et toutes tes données ont été restaurés !`
    );

    return true;
  } catch (error) {
    logger.error('Erreur import JSON:', error);
    Alert.alert('Erreur', 'Impossible d\'importer les données');
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
        dialogTitle: 'Partager ma progression Yoroi',
      });
      return true;
    } else {
      Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      return false;
    }
  } catch (error) {
    logger.error('Erreur partage image:', error);
    Alert.alert('Erreur', 'Impossible de partager l\'image');
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
      return 'Je commence mon parcours de champion avec Yoroi ! #Yoroi #Fitness';
    }

    const latest = measurements[0];
    const oldest = measurements[measurements.length - 1];
    const weightDiff = oldest.weight - latest.weight;

    let text = `Mon parcours Yoroi\n\n`;

    if (weightDiff > 0) {
      text += `${weightDiff.toFixed(1)}kg perdus !\n`;
    } else if (weightDiff < 0) {
      text += `${Math.abs(weightDiff).toFixed(1)}kg gagnés !\n`;
    }

    text += `${measurements.length} mesures enregistrées\n`;
    text += `Poids actuel: ${latest.weight}kg\n\n`;
    text += `#Yoroi #Fitness #Transformation`;

    return text;
  } catch (error) {
    logger.error('Erreur génération texte partage:', error);
    return 'Mon parcours Yoroi #Yoroi #Fitness';
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
          title: 'Ma progression Yoroi',
        });
      }
      return true;
    } else {
      Alert.alert('Ma progression', text);
      return false;
    }
  } catch (error) {
    logger.error('Erreur partage progression:', error);
    Alert.alert('Erreur', 'Impossible de partager la progression');
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
        dialogTitle: 'Partager sur les réseaux sociaux',
      });
      return true;
    } else {
      Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      return false;
    }
  } catch (error) {
    logger.error('Erreur partage story:', error);
    Alert.alert('Erreur', 'Impossible de partager la story');
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
      Alert.alert('Permission requise', 'Autorise l\'accès à la galerie pour sauvegarder l\'image');
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
    Alert.alert('Succès', 'Image sauvegardée dans ton galerie');
    return true;
  } catch (error) {
    logger.error('Erreur sauvegarde galerie:', error);
    Alert.alert('Erreur', 'Impossible de sauvegarder l\'image');
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
export const importDataFromBackupObject = async (importedData: any): Promise<boolean> => {
  try {
    logger.info('[importDataFromBackupObject] Début restauration depuis objet backup...');

    // ─── Vérification du checksum d'intégrité (v5.5+) ──────────────────
    // Appelée aussi par CloudSyncPrompt → on doit vérifier ici aussi, pas juste
    // dans importDataFromJSON. Refuse la restauration si le backup est altéré.
    if (importedData.integrity?.checksum && importedData.integrity.algorithm === 'SHA-256') {
      try {
        const { integrity, ...dataWithoutIntegrity } = importedData;
        const recomputed = await digestStringAsync(
          CryptoDigestAlgorithm.SHA256,
          JSON.stringify(dataWithoutIntegrity)
        );
        if (recomputed !== integrity.checksum) {
          logger.warn('[importDataFromBackupObject] Checksum invalide, restauration refusée');
          Alert.alert(
            '⚠️ Fichier altéré',
            "Le checksum d'intégrité ne correspond pas. La restauration est refusée pour protéger tes données."
          );
          return false;
        }
        logger.info('[importDataFromBackupObject] Checksum vérifié — OK');
      } catch (e) {
        logger.warn('[importDataFromBackupObject] Vérif checksum impossible, on continue:', e);
      }
    }

    // ─── SAFETY BACKUP avant restauration ─────────────────────────────
    // Cette fonction est aussi appelée par CloudSyncPrompt (sync multi-device)
    // et par d'autres flows. Dans tous les cas, on sauvegarde l'état actuel
    // avant d'écrire — l'user peut revenir en arrière en cas de problème.
    try {
      const { runSafetyBackup } = await import('./safetyBackupService');
      await runSafetyBackup('pre-import-object');
    } catch { /* non bloquant */ }

    let importedCount = 0;
    let imagesRestored = 0;

    // === RESTAURER LE PROFIL AVEC PHOTO ===
    if (importedData.profile) {
      try {
        const profileData = { ...importedData.profile };
        if (profileData.profile_photo_base64) {
          const photoUri = await base64ToImage(
            profileData.profile_photo_base64,
            `profile_photo_${Date.now()}.jpg`
          );
          if (photoUri) {
            profileData.profile_photo = photoUri;
            imagesRestored++;
          }
        }
        delete profileData.profile_photo_base64;
        await saveProfile(profileData);
        importedCount++;
      } catch (error) {
        logger.error('[importDataFromBackupObject] Erreur import profil:', error);
      }
    }

    // Importer les poids
    if (importedData.weights && Array.isArray(importedData.weights)) {
      // Anti-doublon : une restauration (ou une synchro entre appareils) ne doit pas
      // dupliquer les pesées déjà présentes
      const weightKey = (w: any) => `${String(w.date).slice(0, 10)}|${Number(w.weight).toFixed(2)}|${w.source || 'manual'}`;
      const seenWeights = new Set((await getWeights().catch(() => [])).map(weightKey));
      for (const raw of importedData.weights) {
        if (raw && seenWeights.has(weightKey(raw))) continue;
        try {
          const weight = sanitizeImportRecord(raw);
          if (weight.weight == null || isNaN(Number(weight.weight))) continue;
          await addWeight({
            weight: weight.weight,
            date: weight.date,
            fat_percent: weight.fat_percent,
            muscle_percent: weight.muscle_percent,
            water_percent: weight.water_percent,
            bone_mass: weight.bone_mass,
            visceral_fat: weight.visceral_fat,
            metabolic_age: weight.metabolic_age,
            bmr: weight.bmr,
          });
          importedCount++;
        } catch (error) {
          logger.error('[importDataFromBackupObject] Erreur import poids:', error);
        }
      }
    }

    // Importer les entraînements
    if (importedData.trainings && Array.isArray(importedData.trainings)) {
      // Anti-doublon séances (l'identifiant Santé est aussi contrôlé dans addTraining)
      const trainingKey = (t: any) => t.healthkit_uuid
        ? `uuid|${t.healthkit_uuid}`
        : `${String(t.date).slice(0, 10)}|${t.start_time ?? ''}|${t.sport ?? t.discipline ?? ''}|${t.duration_minutes ?? ''}`;
      const seenTrainings = new Set((await getTrainings().catch(() => [])).map(trainingKey));
      for (const raw of importedData.trainings) {
        if (raw && seenTrainings.has(trainingKey(raw))) continue;
        const training = sanitizeImportRecord(raw);
        try {
          await addTraining({
            club_id: training.club_id,
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
            // v5.5 — Débriefs de séance (au niveau séance, pas juste rounds)
            game_plan: training.game_plan,
            what_worked: training.what_worked,
            what_didnt_work: training.what_didnt_work,
            session_rating: training.session_rating,
            session_mood: training.session_mood,
          });
          importedCount++;
        } catch (error) {
          logger.error('[importDataFromBackupObject] Erreur import training:', error);
        }
      }
    }

    // Importer les compositions corporelles
    if (importedData.bodyCompositions && Array.isArray(importedData.bodyCompositions)) {
      for (const raw of importedData.bodyCompositions) {
        try {
          await addBodyComposition(sanitizeImportRecord(raw));
          importedCount++;
        } catch (error) {
          logger.error('[importDataFromBackupObject] Erreur import composition:', error);
        }
      }
    }

    // Importer les clubs avec logos
    if (importedData.clubs && Array.isArray(importedData.clubs)) {
      const existingClubs = await getClubs();
      const existingClubKeys = new Set(existingClubs.map((c: any) => `${c.name}|${c.sport}`));
      for (const club of importedData.clubs) {
        const key = `${club.name}|${club.sport}`;
        if (existingClubKeys.has(key)) continue;
        try {
          const clubData = { ...club };
          if (clubData.logo_base64) {
            const logoUri = await base64ToImage(
              clubData.logo_base64,
              `club_logo_${clubData.name?.replace(/\s/g, '_') || Date.now()}.png`
            );
            if (logoUri) {
              clubData.logo_uri = logoUri;
              imagesRestored++;
            }
          }
          delete clubData.logo_base64;
          await addClub(clubData);
          existingClubKeys.add(key);
          importedCount++;
        } catch (error) {
          logger.error('[importDataFromBackupObject] Erreur import club:', error);
        }
      }
    }

    // Importer les mensurations
    if (importedData.measurements && Array.isArray(importedData.measurements)) {
      // Anti-doublon : ne pas réinsérer une mensuration déjà présente en base
      const MEAS_FIELDS = ['chest', 'waist', 'navel', 'hips', 'left_arm', 'right_arm', 'left_thigh', 'right_thigh', 'left_calf', 'right_calf', 'shoulders', 'neck'];
      const measKey = (m: any) => `${String(m?.date).slice(0, 10)}|${MEAS_FIELDS.map(f => (m?.[f] == null ? '' : Number(m[f]))).join('|')}`;
      const seenMeasurements = new Set((await getSqlMeasurements().catch(() => [])).map(measKey));
      for (const raw of importedData.measurements) {
        if (raw && seenMeasurements.has(measKey(raw))) continue;
        try {
          const m = sanitizeImportRecord(raw);
          await addMeasurementRecord({
            chest: m.chest, waist: m.waist, navel: m.navel, hips: m.hips,
            left_arm: m.left_arm, right_arm: m.right_arm,
            left_thigh: m.left_thigh, right_thigh: m.right_thigh,
            left_calf: m.left_calf, right_calf: m.right_calf,
            shoulders: m.shoulders, neck: m.neck, date: m.date,
          });
          importedCount++;
        } catch (error) {
          logger.error('[importDataFromBackupObject] Erreur import mensuration:', error);
        }
      }
    }

    // Importer les badges
    if (importedData.unlockedBadges && Array.isArray(importedData.unlockedBadges)) {
      for (const badgeId of importedData.unlockedBadges) {
        try { await unlockBadge(badgeId); importedCount++; } catch { /* ignore */ }
      }
    }

    // Importer les paramètres utilisateur
    if (importedData.userSettings) {
      try { await saveUserSettings(importedData.userSettings); importedCount++; } catch { /* ignore */ }
    }

    if (importedData.homeLayout && Array.isArray(importedData.homeLayout)) {
      try { await saveHomeLayout(importedData.homeLayout); importedCount++; } catch { /* ignore */ }
    }

    if (importedData.selectedLogo) {
      try { await saveSelectedLogo(importedData.selectedLogo); importedCount++; } catch { /* ignore */ }
    }

    // Importer les entrées de sommeil
    if (importedData.sleepEntries && Array.isArray(importedData.sleepEntries)) {
      try {
        // Le sommeil est stocké dans AsyncStorage (SecureStore n'est plus lu après migration)
        const _sleepRaw = await AsyncStorage.getItem('@yoroi_sleep_entries');
        const existingEntries: any[] = _sleepRaw ? JSON.parse(_sleepRaw) : [];
        const existingIds = new Set(existingEntries.map((e: any) => e.id));
        const newEntries = importedData.sleepEntries.filter((e: any) => !existingIds.has(e.id));
        if (newEntries.length > 0) {
          await AsyncStorage.setItem('@yoroi_sleep_entries', JSON.stringify([...existingEntries, ...newEntries]));
          importedCount += newEntries.length;
        }
      } catch { /* ignore */ }
    }

    if (importedData.sleepGoal && typeof importedData.sleepGoal === 'number') {
      try { await AsyncStorage.setItem('@yoroi_sleep_goal', String(importedData.sleepGoal)); importedCount++; } catch { /* ignore */ }
    }

    // Importer les humeurs
    if (importedData.moodEntries && Array.isArray(importedData.moodEntries)) {
      try {
        const existingMoods = await getMoods();
        const existingDates = new Set(existingMoods.map((m: any) => m.date));
        for (const mood of importedData.moodEntries.filter((m: any) => !existingDates.has(m.date))) {
          await saveMood(mood);
        }
        importedCount++;
      } catch { /* ignore */ }
    }

    // Importer l'hydratation
    if (importedData.hydrationEntries && Array.isArray(importedData.hydrationEntries)) {
      try {
        const existingEntries = await getAllHydrationEntries();
        const existingIds = new Set(existingEntries.map((e: any) => e.id));
        const newEntries = importedData.hydrationEntries.filter((e: any) => !existingIds.has(e.id));
        if (newEntries.length > 0) {
          await AsyncStorage.setItem('@yoroi_hydration_log', JSON.stringify([...existingEntries, ...newEntries]));
          importedCount += newEntries.length;
        }
      } catch { /* ignore */ }
    }

    if (importedData.hydrationSettings) {
      try { await saveHydrationSettings(importedData.hydrationSettings); importedCount++; } catch { /* ignore */ }
    }

    // Importer les photos de transformation
    //    Le champ officiel est `file_uri` (cf. lib/storage.ts Photo interface).
    //    On écrit sur `file_uri` pour que l'app retrouve bien les photos restaurées.
    if (importedData.photos && Array.isArray(importedData.photos)) {
      try {
        const existingPhotos = await getPhotosFromStorage();
        const existingIds = new Set(existingPhotos.map((p: any) => p.id));
        const restoredPhotos: any[] = [...existingPhotos];
        for (const photo of importedData.photos) {
          if (existingIds.has(photo.id)) continue;
          const photoData = { ...photo };
          delete photoData.image_base64;
          if (photo.image_base64) {
            const originalUri: string = photo.file_uri || photo.uri || 'photo.jpg';
            const ext = originalUri.split('.').pop() || 'jpg';
            const newUri = await base64ToImage(photo.image_base64, `photo_${photo.id || Date.now()}.${ext}`);
            if (newUri) {
              photoData.file_uri = newUri;
              // Ne pas laisser l'ancien `uri` obsolète écraser la valeur
              delete photoData.uri;
              imagesRestored++;
            }
          }
          restoredPhotos.push(photoData);
        }
        // La clé lue par l'app est @yoroi_photos_v2 (AsyncStorage) : SecureStore n'était plus lu
        await AsyncStorage.setItem('@yoroi_photos_v2', JSON.stringify(restoredPhotos));
        importedCount++;
      } catch { /* ignore */ }
    }

    // Importer les blessures
    if (importedData.injuries && Array.isArray(importedData.injuries)) {
      for (const injury of importedData.injuries) {
        try { await addInjury(sanitizeImportRecord(injury)); importedCount++; } catch { /* ignore */ }
      }
    }

    // Importer les compétitions
    if (importedData.competitions && Array.isArray(importedData.competitions)) {
      const existingComps = await getCompetitions().catch(() => []);
      const existingKeys = new Set(existingComps.map((c: any) => `${c.name}|${c.date}`));
      for (const comp of importedData.competitions) {
        const key = `${comp.name}|${comp.date}`;
        if (existingKeys.has(key)) continue;
        try {
          const { id, created_at, ...compData } = comp;
          await addCompetition(sanitizeImportRecord(compData));
          existingKeys.add(key);
          importedCount++;
        } catch { /* ignore */ }
      }
    }

    // Importer le planning hebdomadaire
    if (importedData.weeklyPlan && Array.isArray(importedData.weeklyPlan)) {
      for (const slot of importedData.weeklyPlan) {
        try {
          const { id, ...slotData } = slot;
          await addWeeklyPlanItem(sanitizeImportRecord(slotData));
          importedCount++;
        } catch { /* ignore */ }
      }
    }

    // Importer les objectifs d'entraînement
    if (importedData.trainingGoals && Array.isArray(importedData.trainingGoals)) {
      for (const goal of importedData.trainingGoals) {
        try {
          if (goal.sport_id && goal.weekly_target) {
            await setGoal(goal.sport_id, goal.weekly_target);
            importedCount++;
          }
        } catch { /* ignore */ }
      }
    }

    // Restaurer l'apparence
    if (importedData.appearance) {
      const a = importedData.appearance;
      try {
        const tasks: Promise<any>[] = [];
        if (a.themeColor)          tasks.push(AsyncStorage.setItem('yoroi_theme_color_v5', a.themeColor));
        if (a.themeMode)           tasks.push(AsyncStorage.setItem('yoroi_theme_mode_v5', a.themeMode));
        if (a.language)            tasks.push(AsyncStorage.setItem('@yoroi_language', a.language));
        if (a.tabOrder)            tasks.push(AsyncStorage.setItem('@yoroi_tab_order', a.tabOrder));
        if (a.avatarSelection)     tasks.push(AsyncStorage.setItem('@yoroi_avatar_config', a.avatarSelection));
        if (a.userGear)            tasks.push(AsyncStorage.setItem('@yoroi_user_gear', a.userGear));
        if (a.fighterModeSport)    tasks.push(AsyncStorage.setItem('@yoroi_user_mode', a.fighterModeSport));
        if (a.fighterModeCategory) tasks.push(AsyncStorage.setItem('@yoroi_weight_category', a.fighterModeCategory));
        if (a.fighterModeBelt)     tasks.push(AsyncStorage.setItem('@yoroi_belt', a.fighterModeBelt));
        await Promise.all(tasks);
        importedCount++;
      } catch { /* ignore */ }
    }

    // Restaurer le Combat Lab
    if (importedData.combatLab) {
      const c = importedData.combatLab;
      try {
        const tasks: Promise<any>[] = [];
        if (c.sparringPartners) {
          try {
            const partners: any[] = JSON.parse(c.sparringPartners);
            const restoredPartners = await Promise.all(
              partners.map(async (partner: any) => {
                if (partner.photoBase64) {
                  const newUri = await base64ToImage(partner.photoBase64, `sparring_partner_${partner.id || Date.now()}.jpg`);
                  if (newUri) { imagesRestored++; return { ...partner, photoUri: newUri }; }
                }
                return partner;
              })
            );
            tasks.push(AsyncStorage.setItem('@yoroi_sparring_partners', JSON.stringify(restoredPartners)));
          } catch {
            tasks.push(AsyncStorage.setItem('@yoroi_sparring_partners', c.sparringPartners));
          }
        }
        if (c.playbookCustom) {
          const p = c.playbookCustom;
          if (p.gamePlan)      tasks.push(AsyncStorage.setItem('@yoroi_playbook_custom_gamePlan', p.gamePlan));
          if (p.whatWorked)    tasks.push(AsyncStorage.setItem('@yoroi_playbook_custom_whatWorked', p.whatWorked));
          if (p.whatDidntWork) tasks.push(AsyncStorage.setItem('@yoroi_playbook_custom_whatDidntWork', p.whatDidntWork));
          if (p.counteredBy)   tasks.push(AsyncStorage.setItem('@yoroi_playbook_custom_counteredBy', p.counteredBy));
          if (p.improvement)   tasks.push(AsyncStorage.setItem('@yoroi_playbook_custom_improvement', p.improvement));
        }
        if (c.gameplanChecked)    tasks.push(AsyncStorage.setItem('@yoroi_gameplan_checked', c.gameplanChecked));
        if (c.drillTracker)       tasks.push(AsyncStorage.setItem('@yoroi_drill_tracker', c.drillTracker));
        if (c.sparringWeeklyGoal) tasks.push(AsyncStorage.setItem('@sparring_weekly_goal', c.sparringWeeklyGoal));
        if (c.bjjFavSubmissions)  tasks.push(AsyncStorage.setItem('bjj_fav_submissions_v2', c.bjjFavSubmissions));
        if (c.toolFavorites)      tasks.push(AsyncStorage.setItem('@yoroi_tool_favorites', typeof c.toolFavorites === 'string' ? c.toolFavorites : JSON.stringify(c.toolFavorites)));
        await Promise.all(tasks);
        importedCount++;
      } catch { /* ignore */ }
    }

    // v5.5 — Restaurer Training Journal (SQLite)
    if (importedData.trainingJournal) {
      try {
        const db = await openDatabase();
        // Items : on skip les doublons via l'id original s'il existe
        const items = Array.isArray(importedData.trainingJournal.items) ? importedData.trainingJournal.items : [];
        for (const it of items) {
          try {
            const exists = await db.getFirstAsync<{ id: number }>(
              'SELECT id FROM progression_items WHERE id = ?',
              [it.id]
            ).catch(() => null);
            if (exists) continue;
            const columns = Object.keys(it).filter(k => it[k] !== undefined);
            const placeholders = columns.map(() => '?').join(',');
            const values = columns.map(k => it[k]);
            await db.runAsync(
              `INSERT INTO progression_items (${columns.join(',')}) VALUES (${placeholders})`,
              values
            );
            importedCount++;
          } catch (e) { /* skip item individuel invalide */ }
        }
        const logs = Array.isArray(importedData.trainingJournal.logs) ? importedData.trainingJournal.logs : [];
        for (const log of logs) {
          try {
            const exists = await db.getFirstAsync<{ id: number }>(
              'SELECT id FROM practice_logs WHERE id = ?',
              [log.id]
            ).catch(() => null);
            if (exists) continue;
            const columns = Object.keys(log).filter(k => log[k] !== undefined);
            const placeholders = columns.map(() => '?').join(',');
            const values = columns.map(k => log[k]);
            await db.runAsync(
              `INSERT INTO practice_logs (${columns.join(',')}) VALUES (${placeholders})`,
              values
            );
            importedCount++;
          } catch (e) { /* skip log individuel invalide */ }
        }
      } catch (e) {
        logger.warn('[importDataFromBackupObject] Erreur restauration Training Journal:', e);
      }
    }

    // v5.5 — Restaurer Carnet (benchmarks + skills)
    if (importedData.carnet) {
      try {
        const c = importedData.carnet;
        const tasks: Promise<any>[] = [];
        if (c.benchmarks)       tasks.push(AsyncStorage.setItem('@yoroi_benchmarks_v2', c.benchmarks));
        if (c.skills)           tasks.push(AsyncStorage.setItem('@yoroi_skills_v2', c.skills));
        if (c.trashBenchmarks)  tasks.push(AsyncStorage.setItem('@yoroi_trash_benchmarks_v2', c.trashBenchmarks));
        if (c.trashSkills)      tasks.push(AsyncStorage.setItem('@yoroi_trash_skills_v2', c.trashSkills));
        await Promise.all(tasks);
        if (tasks.length > 0) importedCount++;
      } catch (e) {
        logger.warn('[importDataFromBackupObject] Erreur restauration Carnet:', e);
      }
    }

    // v5.5 — Restaurer Records personnels
    if (importedData.records?.personalRecords) {
      try {
        await AsyncStorage.setItem('@yoroi_personal_records', importedData.records.personalRecords);
        importedCount++;
      } catch (e) { /* ignore */ }
    }

    // v5.5 — Restaurer Loads (training loads, health bonus history, source freshness)
    if (importedData.loads) {
      try {
        const l = importedData.loads;
        const tasks: Promise<any>[] = [];
        if (l.trainingLoads)       tasks.push(AsyncStorage.setItem('@yoroi_training_loads', l.trainingLoads));
        if (l.healthBonusHistory)  tasks.push(AsyncStorage.setItem('@yoroi_health_bonus_history', l.healthBonusHistory));
        if (l.sourceFreshness)     tasks.push(AsyncStorage.setItem('@yoroi_source_freshness', l.sourceFreshness));
        await Promise.all(tasks);
        if (tasks.length > 0) importedCount++;
      } catch (e) { /* ignore */ }
    }

    // v5.4 — Restaurer les médias complémentaires (photo history, avatar, routine, custom club logos)
    if (importedData.mediaAssets) {
      const m = importedData.mediaAssets;

      // 1. Photo history (frames)
      if (Array.isArray(m.photoHistory) && m.photoHistory.length > 0) {
        try {
          const restoredUris: string[] = [];
          for (const entry of m.photoHistory) {
            if (entry?.base64) {
              const ext = (entry.uri || 'photo.jpg').split('.').pop() || 'jpg';
              const newUri = await base64ToImage(entry.base64, `frame_${Date.now()}_${restoredUris.length}.${ext}`);
              if (newUri) {
                restoredUris.push(newUri);
                imagesRestored++;
              }
            }
          }
          if (restoredUris.length > 0) {
            await AsyncStorage.setItem('@yoroi_photo_history', JSON.stringify(restoredUris));
            importedCount++;
          }
        } catch (e) {
          logger.warn('[importDataFromBackupObject] Erreur restauration photoHistory:', e);
        }
      }

      // 2. Avatar custom
      if (m.avatarBase64) {
        try {
          const newUri = await base64ToImage(m.avatarBase64, `avatar_custom_${Date.now()}.jpg`);
          if (newUri) {
            await saveUserSettings({ avatarUri: newUri } as any);
            imagesRestored++;
            importedCount++;
          }
        } catch (e) {
          logger.warn('[importDataFromBackupObject] Erreur restauration avatar:', e);
        }
      }

      // 3. Routine image
      if (m.routineImageBase64) {
        try {
          const newUri = await base64ToImage(m.routineImageBase64, `routine_${Date.now()}.jpg`);
          if (newUri) {
            await saveUserSettings({ routine_image_uri: newUri } as any);
            imagesRestored++;
            importedCount++;
          }
        } catch (e) {
          logger.warn('[importDataFromBackupObject] Erreur restauration routine image:', e);
        }
      }

      // 4. Custom club logos
      if (m.customClubLogosBase64 && typeof m.customClubLogosBase64 === 'object') {
        try {
          const restoredLogos: { [key: string]: string } = {};
          for (const [name, base64] of Object.entries(m.customClubLogosBase64)) {
            if (typeof base64 === 'string' && base64.length > 0) {
              const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '_');
              const newUri = await base64ToImage(base64 as string, `club_custom_${safeName}_${Date.now()}.png`);
              if (newUri) {
                restoredLogos[name] = newUri;
                imagesRestored++;
              }
            }
          }
          if (Object.keys(restoredLogos).length > 0) {
            await saveUserSettings({ custom_club_logos: restoredLogos } as any);
            importedCount++;
          }
        } catch (e) {
          logger.warn('[importDataFromBackupObject] Erreur restauration custom club logos:', e);
        }
      }
    }

    logger.info(`[importDataFromBackupObject] ✅ Terminé : ${importedCount} éléments restaurés, ${imagesRestored} image(s).`);
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
      Alert.alert('Erreur', 'Le fichier est corrompu ou invalide (JSON malformé)');
      return false;
    }

    // Validation basique
    if (!data.version || !data.exportDate) {
      Alert.alert('Erreur', 'Format de fichier invalide. Utilise un export Yoroi.');
      return false;
    }

    await importData(data);
    Alert.alert('Importé', 'Tes données ont été restaurées avec succès !');
    return true;
  } catch (error) {
    logger.error('Erreur import:', error);
    Alert.alert('Erreur', "Impossible d'importer les données. Vérifie le format du fichier.");
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
      Alert.alert('Aucune donnée', 'Tu n\'as pas encore de séances à exporter');
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
      'Heure de début',
      'Durée (min)',
      'Types de séance',
      'Muscles travaillés',
      'Thème technique',
      'Notes'
    ].join(',');

    // Convertir les trainings en lignes CSV
    const rows = trainings.map((training: any) => {
      const club = training.club_id ? clubsMap.get(training.club_id) : null;
      const clubName = club?.name || 'Activité libre';

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
        dialogTitle: 'Exporter les séances Yoroi',
        UTI: 'public.comma-separated-values-text',
      });

      logger.info('Export séances CSV terminé avec succès');
      Alert.alert(
        'Export réussi',
        `${trainings.length} séance(s) exportée(s) en CSV`
      );
    } else {
      Alert.alert(
        'Export terminé',
        `Le fichier a été créé : ${fileName}\nEmplacement: ${fileUri}`
      );
    }

    return true;
  } catch (error) {
    logger.error('Erreur export séances CSV:', error);
    Alert.alert(
      'Erreur',
      "Impossible d'exporter les séances en CSV. Essaie à nouveau."
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
      Alert.alert('Aucune donnée', 'Tu n\'as pas encore de séances à exporter');
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
      'Heure de début',
      'Durée (min)',
      'Types de séance',
      'Muscles travaillés',
      'Thème technique',
      'Notes'
    ].join(';');

    const rows = trainings.map((training: any) => {
      const club = training.club_id ? clubsMap.get(training.club_id) : null;
      const clubName = club?.name || 'Activité libre';

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
        dialogTitle: 'Exporter les séances Yoroi (Excel)',
        UTI: 'public.comma-separated-values-text',
      });

      logger.info('Export Excel CSV terminé avec succès');
      Alert.alert(
        'Export réussi',
        `${trainings.length} séance(s) exportée(s) en format Excel`
      );
    } else {
      Alert.alert(
        'Export terminé',
        `Le fichier a été créé : ${fileName}\nEmplacement: ${fileUri}`
      );
    }

    return true;
  } catch (error) {
    logger.error('Erreur export Excel CSV:', error);
    Alert.alert(
      'Erreur',
      "Impossible d'exporter les séances en Excel CSV. Essaie à nouveau."
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
    measurementsCSV += 'date;poitrine;taille;hanches;bras_gauche;bras_droit;cuisse_gauche;cuisse_droit;mollet_gauche;mollet_droit;epaules;cou\n';

    (measurements || []).forEach((m: any) => {
      measurementsCSV += `${m.date};${m.chest || ''};${m.waist || ''};${m.hips || ''};`;
      measurementsCSV += `${m.left_arm || ''};${m.right_arm || ''};${m.left_thigh || ''};${m.right_thigh || ''};`;
      measurementsCSV += `${m.left_calf || ''};${m.right_calf || ''};${m.shoulders || ''};${m.neck || ''}\n`;
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
        fr: "Ce fichier contient tes données Yoroi au format éditable.",
        instructions: [
          "1. Ouvre ce fichier dans un éditeur de texte (VS Code, Notepad++, etc.)",
          "2. Modifie les données dans chaque section CSV",
          "3. Les lignes commençant par # sont des commentaires (ignorés)",
          "4. Sauvegarde le fichier et réimporte-le dans Yoroi",
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
        dialogTitle: 'Exporter données éditables Yoroi',
        UTI: 'public.json',
      });

      Alert.alert(
        'Export réussi',
        `Fichier éditable créé avec :\n• ${weights?.length || 0} pesées\n• ${trainings?.length || 0} séances\n• ${measurements?.length || 0} mensurations\n• ${clubs?.length || 0} clubs\n\nOuvre ce fichier sur ton ordinateur pour modifier tes données !`
      );
    }

    return true;
  } catch (error) {
    logger.error('Erreur export éditable:', error);
    Alert.alert('Erreur', "Impossible d'exporter les données éditables");
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
      Alert.alert('Erreur', 'Ce fichier n\'est pas un export éditable Yoroi valide');
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
            errors.push(`Pesée ${row[0]}: erreur`);
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
            errors.push(`Séance ${row[0]}: erreur`);
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
            });
            importedCount++;
          } catch (e) {
            errors.push(`Mensuration ${row[0]}: erreur`);
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
            errors.push(`Club ${row[0]}: erreur`);
          }
        }
      }
    }

    const errorMsg = errors.length > 0 ? `\n\n${errors.length} erreur(s) ignorée(s)` : '';

    Alert.alert(
      'Import réussi !',
      `${importedCount} éléments importés depuis le fichier éditable.${errorMsg}`
    );

    return true;
  } catch (error) {
    logger.error('Erreur import éditable:', error);
    Alert.alert('Erreur', "Impossible d'importer le fichier éditable");
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
        fr: "TEMPLATE VIDE - Remplis ce fichier avec tes données et importe-le dans Yoroi",
        instructions: [
          "1. Ouvre ce fichier dans un éditeur de texte",
          "2. Ajoute tes données dans chaque section CSV",
          "3. Respecte le format (une ligne = une entrée)",
          "4. Sauvegarde et importe dans Yoroi > Plus > Importer CSV",
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

      Alert.alert(
        'Template créé',
        'Ouvre ce fichier sur ton ordinateur, remplis-le avec tes données, puis réimporte-le dans Yoroi !'
      );
    }

    return true;
  } catch (error) {
    logger.error('Erreur création template:', error);
    Alert.alert('Erreur', "Impossible de créer le template");
    return false;
  }
};
