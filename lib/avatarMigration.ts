/**
 * avatarMigration.ts
 * Migration one-shot de l'ancien système d'avatars vers le nouveau
 *
 * Ancien système :
 * - 17+ packs avec emojis
 * - Système complexe avec états dynamiques
 * - Multiples clés AsyncStorage
 *
 * Nouveau système :
 * - 2 packs (Samurai, Ninja)
 * - 1 seule image par niveau
 * - Progression basée sur les rangs du Dojo
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { calculateStreak } from './database';
import { getCurrentRank } from './ranks';
import { rankToLevel, setAvatarConfig, type AvatarPack } from './avatarSystem';
import logger from '@/lib/security/logger';

// ============================================================================
// CONSTANTES
// ============================================================================

const MIGRATION_FLAG_KEY = '@yoroi_avatar_migration_v2_done';

// Anciennes clés à supprimer
const OLD_KEYS_TO_REMOVE = [
  '@yoroi/avatar/selected_pack',
  '@yoroi_equipped_avatar',
  '@yoroi_unlocked_avatars',
  '@yoroi_purchased_packs',
  '@yoroi_purchased_avatars',
];

// ============================================================================
// MIGRATION PRINCIPALE
// ============================================================================

/**
 * Migre l'ancien système d'avatars vers le nouveau
 * Cette fonction est idempotente (peut être appelée plusieurs fois sans effet)
 */
export async function migrateAvatarSystem(): Promise<void> {
  try {
    // Étape 1 : Vérifier si la migration a déjà été effectuée
    const migrationDone = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
    if (migrationDone === 'true') {
      logger.info('[AvatarMigration] Migration déjà effectuée, skip');
      return;
    }

    logger.info('[AvatarMigration] Début de la migration...');

    // Étape 2 : Lire l'ancien pack sélectionné
    const oldPackId = await AsyncStorage.getItem('@yoroi/avatar/selected_pack');
    logger.info(`[AvatarMigration] Ancien pack: ${oldPackId || 'aucun'}`);

    // Étape 3 : Mapper vers le nouveau système
    const newPack: AvatarPack = mapOldPackToNew(oldPackId);
    const newGender: 'male' | 'female' = 'male'; // Défaut: homme

    logger.info(`[AvatarMigration] Nouveau pack: ${newPack} ${newGender}`);

    // Étape 4 : Calculer le niveau actuel basé sur le rang
    const streak = await calculateStreak();
    const currentRank = getCurrentRank(streak);
    const currentLevel = rankToLevel(currentRank);

    logger.info(
      `[AvatarMigration] Streak: ${streak} jours → Rang: ${currentRank.name} → Niveau: ${currentLevel}`
    );

    // Étape 5 : Sauvegarder la nouvelle configuration
    const success = await setAvatarConfig(newPack, newGender);
    if (!success) {
      throw new Error('Échec de la sauvegarde de la nouvelle configuration');
    }

    logger.info(`[AvatarMigration] Configuration sauvegardée: ${newPack} ${newGender} niveau ${currentLevel}`);

    // Étape 6 : Nettoyer les anciennes clés AsyncStorage
    await cleanupOldKeys();

    // Étape 7 : Marquer la migration comme terminée
    await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');

    logger.info('[AvatarMigration] ✅ Migration terminée avec succès');
  } catch (error) {
    logger.error('[AvatarMigration] ❌ Erreur pendant la migration:', error);

    // En cas d'erreur, on initialise avec la config par défaut
    try {
      logger.info('[AvatarMigration] Initialisation avec config par défaut...');
      await setAvatarConfig('samurai', 'male');
      await AsyncStorage.setItem(MIGRATION_FLAG_KEY, 'true');
      logger.info('[AvatarMigration] Config par défaut sauvegardée');
    } catch (fallbackError) {
      logger.error('[AvatarMigration] ❌ Erreur fallback:', fallbackError);
    }
  }
}

// ============================================================================
// FONCTIONS HELPERS
// ============================================================================

/**
 * Mappe un ancien pack ID vers un nouveau pack
 */
function mapOldPackToNew(oldPackId: string | null): AvatarPack {
  if (!oldPackId) {
    return 'samurai'; // Défaut
  }

  // Si c'était déjà "ninja", on garde ninja
  if (oldPackId === 'ninja') {
    return 'ninja';
  }

  // Tous les autres packs → samurai
  return 'samurai';
}

/**
 * Nettoie les anciennes clés AsyncStorage
 */
async function cleanupOldKeys(): Promise<void> {
  try {
    logger.info(`[AvatarMigration] Nettoyage de ${OLD_KEYS_TO_REMOVE.length} anciennes clés...`);

    await Promise.all(
      OLD_KEYS_TO_REMOVE.map((key) =>
        AsyncStorage.removeItem(key).catch((error) => {
          logger.warn(`[AvatarMigration] Erreur suppression clé ${key}:`, error);
        })
      )
    );

    logger.info('[AvatarMigration] Nettoyage terminé');
  } catch (error) {
    logger.error('[AvatarMigration] Erreur pendant le nettoyage:', error);
  }
}

/**
 * Réinitialise le flag de migration (pour tests uniquement)
 * ⚠️ NE PAS UTILISER EN PRODUCTION
 */
export async function resetMigrationFlag(): Promise<void> {
  await AsyncStorage.removeItem(MIGRATION_FLAG_KEY);
  logger.info('[AvatarMigration] Flag de migration réinitialisé');
}

/**
 * Vérifie si la migration a été effectuée
 */
export async function isMigrationDone(): Promise<boolean> {
  const flag = await AsyncStorage.getItem(MIGRATION_FLAG_KEY);
  return flag === 'true';
}

/**
 * Affiche l'état de la migration (pour debug)
 */
export async function logMigrationStatus(): Promise<void> {
  const migrationDone = await isMigrationDone();

  logger.info('=== ÉTAT DE LA MIGRATION ===');
  logger.info(`Migration effectuée: ${migrationDone}`);

  // Vérifier si des anciennes clés existent encore
  for (const key of OLD_KEYS_TO_REMOVE) {
    const value = await AsyncStorage.getItem(key);
    if (value) {
      logger.info(`⚠️  Ancienne clé trouvée: ${key} = ${value}`);
    }
  }

  logger.info('============================');
}
