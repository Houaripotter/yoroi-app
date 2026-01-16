// ============================================
// 🥋 YOROI - SERVICE IMPORT COMPÉTITIONS
// ============================================
// Import automatique des compétitions IBJJF et CFJJB

import AsyncStorage from '@react-native-async-storage/async-storage';
import { addCompetition, getCompetitions } from './fighterModeService';
import { ALL_IBJJF_COMPETITIONS } from './competitions-ibjjf-2025';
import { ALL_CFJJB_COMPETITIONS } from './competitions-cfjjb-2026';
import logger from '@/lib/security/logger';

const COMPETITIONS_IMPORTED_KEY = '@yoroi_competitions_auto_imported';

/**
 * Importe toutes les compétitions IBJJF dans la base de données
 */
export const importIBJJFCompetitions = async (): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  errors: number;
}> => {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Récupérer les compétitions existantes
    const existing = await getCompetitions();
    const existingNames = new Set(existing.map(c => c.nom));

    for (const competition of ALL_IBJJF_COMPETITIONS) {
      try {
        // Vérifier si la compétition existe déjà
        if (existingNames.has(competition.nom)) {
          skipped++;
          continue;
        }

        // Ajouter la compétition
        await addCompetition(competition);
        imported++;
      } catch (error) {
        logger.error(`Erreur import ${competition.nom}:`, error);
        errors++;
      }
    }

    return {
      success: errors === 0,
      imported,
      skipped,
      errors,
    };
  } catch (error) {
    logger.error('Erreur import IBJJF:', error);
    return {
      success: false,
      imported,
      skipped,
      errors: errors + 1,
    };
  }
};

/**
 * Importe toutes les compétitions CFJJB dans la base de données
 */
export const importCFJJBCompetitions = async (): Promise<{
  success: boolean;
  imported: number;
  skipped: number;
  errors: number;
}> => {
  let imported = 0;
  let skipped = 0;
  let errors = 0;

  try {
    // Récupérer les compétitions existantes
    const existing = await getCompetitions();
    const existingNames = new Set(existing.map(c => c.nom));

    for (const competition of ALL_CFJJB_COMPETITIONS) {
      try {
        // Vérifier si la compétition existe déjà
        if (existingNames.has(competition.nom)) {
          skipped++;
          continue;
        }

        // Ajouter la compétition
        await addCompetition(competition);
        imported++;
      } catch (error) {
        logger.error(`Erreur import ${competition.nom}:`, error);
        errors++;
      }
    }

    return {
      success: errors === 0,
      imported,
      skipped,
      errors,
    };
  } catch (error) {
    logger.error('Erreur import CFJJB:', error);
    return {
      success: false,
      imported,
      skipped,
      errors: errors + 1,
    };
  }
};

/**
 * Importe TOUTES les compétitions (IBJJF + CFJJB)
 */
export const importAllCompetitions = async (): Promise<{
  success: boolean;
  total: number;
  ibjjf: { imported: number; skipped: number; errors: number };
  cfjjb: { imported: number; skipped: number; errors: number };
}> => {
  try {
    const [ibjjfResult, cfjjbResult] = await Promise.all([
      importIBJJFCompetitions(),
      importCFJJBCompetitions(),
    ]);

    const total = ibjjfResult.imported + cfjjbResult.imported;

    return {
      success: ibjjfResult.success && cfjjbResult.success,
      total,
      ibjjf: {
        imported: ibjjfResult.imported,
        skipped: ibjjfResult.skipped,
        errors: ibjjfResult.errors,
      },
      cfjjb: {
        imported: cfjjbResult.imported,
        skipped: cfjjbResult.skipped,
        errors: cfjjbResult.errors,
      },
    };
  } catch (error) {
    logger.error('Erreur import global:', error);
    throw error;
  }
};

/**
 * Compte le nombre de compétitions disponibles
 */
export const getAvailableCompetitionsCount = (): {
  ibjjf: number;
  cfjjb: number;
  total: number;
} => {
  return {
    ibjjf: ALL_IBJJF_COMPETITIONS.length,
    cfjjb: ALL_CFJJB_COMPETITIONS.length,
    total: ALL_IBJJF_COMPETITIONS.length + ALL_CFJJB_COMPETITIONS.length,
  };
};

/**
 * Import automatique au premier lancement
 * Cette fonction importe automatiquement toutes les compétitions IBJJF et CFJJB
 * si elles n'ont pas déjà été importées.
 */
export const autoImportCompetitionsOnFirstLaunch = async (): Promise<boolean> => {
  try {
    // Vérifier si l'import a déjà été fait
    const alreadyImported = await AsyncStorage.getItem(COMPETITIONS_IMPORTED_KEY);

    if (alreadyImported === 'true') {
      logger.info('Compétitions déjà importées, skip auto-import');
      return false;
    }

    logger.info('Premier lancement - Import automatique des compétitions...');

    // Importer toutes les compétitions
    const result = await importAllCompetitions();

    // Marquer comme importé
    await AsyncStorage.setItem(COMPETITIONS_IMPORTED_KEY, 'true');

    logger.info(`✅ Auto-import terminé: ${result.total} compétitions importées`);
    logger.info(`   IBJJF: ${result.ibjjf.imported} importées, ${result.ibjjf.skipped} déjà présentes`);
    logger.info(`   CFJJB: ${result.cfjjb.imported} importées, ${result.cfjjb.skipped} déjà présentes`);

    return true;
  } catch (error) {
    logger.error('Erreur auto-import compétitions:', error);
    return false;
  }
};

/**
 * Réinitialise le flag d'import (pour tester l'auto-import)
 */
export const resetAutoImportFlag = async (): Promise<void> => {
  await AsyncStorage.removeItem(COMPETITIONS_IMPORTED_KEY);
  logger.info('Flag auto-import réinitialisé');
};
