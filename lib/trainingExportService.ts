// ============================================
// SERVICE D'EXPORT CARNET D'ENTRAÎNEMENT
// Export en CSV, JSON et génération de rapports
// ============================================

import { track } from '@/utils/telemetry';
import { getProgressionItems, getPracticeLogsByItemId, PracticeLog, ProgressionItem } from './trainingJournalService';
import * as FS from 'expo-file-system/legacy';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import logger from '@/lib/security/logger';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire, LOCALE } from '@/lib/i18n/tr';

// Type assertion pour expo-file-system
const FileSystem = FS as typeof FS & {
  documentDirectory: string;
  writeAsStringAsync: (path: string, content: string, options?: any) => Promise<void>;
  readAsStringAsync: (path: string, options?: any) => Promise<string>;
};

export interface ExportData {
  exercises: ProgressionItem[];
  logs: Record<number, PracticeLog[]>;
  exportDate: string;
}

// ============================================
// EXPORT JSON
// ============================================

export const exportTrainingToJSON = async (): Promise<string | null> => {
  try {
    const items = getProgressionItems();
    const logs: Record<number, PracticeLog[]> = {};

    items.forEach((item) => {
      logs[item.id] = getPracticeLogsByItemId(item.id);
    });

    const exportData: ExportData = {
      exercises: items,
      logs,
      exportDate: new Date().toISOString(),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    const fileName = `yoroi_training_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, jsonString);

    if (await isAvailableAsync()) {
      track('sauvegarde_exportee', { type: 'json' });
      await shareAsync(fileUri);
      return fileUri;
    } else {
      appAlert('Partage indisponible', traduire('Le partage de fichiers n’est pas disponible sur ce téléphone.'));
      return null;
    }
  } catch (error) {
    logger.error('Erreur export JSON:', error);
    appAlert('Oups', traduire('L’export n’a pas abouti. Réessaie.'));
    return null;
  }
};

// ============================================
// EXPORT CSV
// ============================================

export const exportTrainingToCSV = async (sport?: string): Promise<string | null> => {
  try {
    let items = getProgressionItems();

    if (sport) {
      items = items.filter((item) => item.sport === sport);
    }

    // Header CSV
    let csvContent = traduire('Date,Exercice,Sport,Type,Sets,Reps,Poids (kg),Distance (km),Temps (min),Qualité (1-5)\n');

    items.forEach((item) => {
      const logs = getPracticeLogsByItemId(item.id);

      logs.forEach((log) => {
        const date = new Date(log.date).toLocaleDateString(LOCALE);
        const exerciseName = item.name.replace(/,/g, ' ');
        const sets = log.sets || '';
        const reps = log.reps || '';
        const weight = log.weight || '';
        const distance = log.distance || '';
        const time = log.time ? (log.time / 60).toFixed(2) : '';
        const quality = log.quality_rating || '';

        csvContent += `${date},"${exerciseName}",${item.sport},${item.type},${sets},${reps},${weight},${distance},${time},${quality}\n`;
      });
    });

    const fileName = `yoroi_training_${sport || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csvContent);

    if (await isAvailableAsync()) {
      track('sauvegarde_exportee', { type: 'csv' });
      await shareAsync(fileUri);
      return fileUri;
    } else {
      appAlert('Partage indisponible', traduire('Le partage de fichiers n’est pas disponible sur ce téléphone.'));
      return null;
    }
  } catch (error) {
    logger.error('Erreur export CSV:', error);
    appAlert('Oups', traduire('L’export n’a pas abouti. Réessaie.'));
    return null;
  }
};

// ============================================
// GÉNÉRATION DE RAPPORT TEXTUEL
// ============================================

export const generateTrainingTextReport = async (): Promise<string | null> => {
  try {
    const items = getProgressionItems();

    let report = '========================================\n';
    report += traduire('YOROI - RAPPORT D\'ENTRAÎNEMENT\n');
    report += '========================================\n\n';
    report += traduire("Date du rapport : {0}\n\n", new Date().toLocaleDateString(LOCALE));

    // Stats générales
    const stats = {
      total: items.length,
      todo: items.filter((i) => i.status === 'todo').length,
      in_progress: items.filter((i) => i.status === 'in_progress').length,
      mastered: items.filter((i) => i.status === 'mastered').length,
    };

    report += traduire('STATISTIQUES GLOBALES\n');
    report += '----------------------------------------\n';
    report += traduire("Total d'objectifs : {0}\n", stats.total);
    report += traduire("À faire : {0}\n", stats.todo);
    report += `En cours : ${stats.in_progress}\n`;
    report += traduire("Maîtrisés : {0}\n\n", stats.mastered);

    // Par sport
    const sportStats: Record<string, number> = {};
    items.forEach((item) => {
      sportStats[item.sport] = (sportStats[item.sport] || 0) + 1;
    });

    report += traduire('RÉPARTITION PAR SPORT\n');
    report += '----------------------------------------\n';
    Object.entries(sportStats).forEach(([sport, count]) => {
      report += traduire("{0} : {1} objectifs\n", sport, count);
    });
    report += '\n';

    // Objectifs en cours
    const inProgress = items.filter((i) => i.status === 'in_progress');
    if (inProgress.length > 0) {
      report += traduire('OBJECTIFS EN COURS\n');
      report += '----------------------------------------\n';
      inProgress.forEach((item) => {
        report += `- ${item.name} (${item.sport})\n`;
        if (item.practice_count > 0) {
          report += traduire("  Pratiqué {0} fois\n", item.practice_count);
        }
        if (item.progress_percent > 0) {
          report += `  Progression : ${item.progress_percent}%\n`;
        }
      });
      report += '\n';
    }

    // Objectifs maîtrisés
    const mastered = items.filter((i) => i.status === 'mastered');
    if (mastered.length > 0) {
      report += traduire('OBJECTIFS MAÎTRISÉS\n');
      report += '----------------------------------------\n';
      mastered.forEach((item) => {
        report += `- ${item.name} (${item.sport})\n`;
        if (item.mastered_date) {
          const masteredDate = new Date(item.mastered_date).toLocaleDateString(LOCALE);
          report += traduire("  Maîtrisé le : {0}\n", masteredDate);
        }
      });
    }

    report += '\n========================================\n';
    report += traduire('Généré avec Yoroi\n');
    report += '========================================\n';

    const fileName = `yoroi_rapport_${new Date().toISOString().split('T')[0]}.txt`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, report);

    if (await isAvailableAsync()) {
      track('sauvegarde_exportee', { type: 'csv' });
      await shareAsync(fileUri);
      return fileUri;
    } else {
      appAlert('Partage indisponible', traduire('Le partage de fichiers n’est pas disponible sur ce téléphone.'));
      return null;
    }
  } catch (error) {
    logger.error('Erreur génération rapport:', error);
    appAlert('Oups', traduire('Le rapport n’a pas pu être créé.'));
    return null;
  }
};

// ============================================
// EXPORT PAR EXERCICE SPÉCIFIQUE
// ============================================

export const exportExerciseHistory = async (exerciseId: number, exerciseName: string): Promise<string | null> => {
  try {
    const logs = getPracticeLogsByItemId(exerciseId);

    let content = traduire("HISTORIQUE : {0}\n", exerciseName);
    content += '========================================\n\n';

    logs.forEach((log) => {
      const date = new Date(log.date).toLocaleDateString(LOCALE);
      content += `Date : ${date}\n`;

      if (log.sets) content += `Séries : ${log.sets}\n`;
      if (log.reps) content += `Reps : ${log.reps}\n`;
      if (log.weight) content += `Poids : ${log.weight}kg\n`;
      if (log.distance) content += `Distance : ${log.distance}km\n`;
      if (log.time) content += `Temps : ${Math.floor(log.time / 60)}min ${log.time % 60}s\n`;
      if (log.quality_rating) content += traduire("Qualité : {0}/5\n", log.quality_rating);
      if (log.notes) content += `Notes : ${log.notes}\n`;

      content += '\n';
    });

    const fileName = `${exerciseName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.txt`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, content);

    if (await isAvailableAsync()) {
      track('sauvegarde_exportee', { type: 'csv' });
      await shareAsync(fileUri);
      return fileUri;
    } else {
      appAlert('Partage indisponible', traduire('Le partage de fichiers n’est pas disponible sur ce téléphone.'));
      return null;
    }
  } catch (error) {
    logger.error('Erreur export exercice:', error);
    appAlert('Oups', traduire('L’historique n’a pas pu être exporté.'));
    return null;
  }
};

export default {
  exportTrainingToJSON,
  exportTrainingToCSV,
  generateTrainingTextReport,
  exportExerciseHistory,
};
