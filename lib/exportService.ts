import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync } from 'expo-sharing';
import { getDocumentAsync } from 'expo-document-picker';
import { captureRef } from 'react-native-view-shot';
import { Platform, Alert } from 'react-native';
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
} from './storage';
import { getWeights, getTrainings, getProfile, addWeight, addTraining, getClubs, addClub } from './database';
import { getAllBodyCompositions, addBodyComposition } from './bodyComposition';
import { getUnlockedBadges, unlockBadge } from './badges';
import logger from '@/lib/security/logger';

// ============================================
// 📤 EXPORT & PARTAGE
// ============================================

/**
 * Exporte toutes les données utilisateur en JSON
 */
export const exportDataToJSON = async (): Promise<boolean> => {
  try {
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
    ] = await Promise.all([
      getProfile(),
      getWeights(1000), // Récupérer les 1000 dernières mesures
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
    ]);

    const exportData = {
      version: '3.0', // Version augmentée car on ajoute plus de données
      exportDate: new Date().toISOString(),
      appName: 'Yoroi',
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
    };

    // Créer le fichier JSON
    const fileName = `yoroi_export_${new Date().getTime()}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(exportData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    // Partager le fichier JSON
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

    return true;
  } catch (error) {
    logger.error('❌ Erreur export JSON:', error);
    Alert.alert('Erreur', 'Impossible d\'exporter les données');
    return false;
  }
};

/**
 * Exporte les données en format CSV (Excel/Numbers)
 */
export const exportDataToCSV = async (): Promise<boolean> => {
  try {
    const weights = await getWeights(1000);

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
    logger.error('❌ Erreur export CSV:', error);
    Alert.alert('Erreur', 'Impossible d\'exporter les données');
    return false;
  }
};

/**
 * Importe les données depuis un fichier JSON
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

    const importedData = JSON.parse(fileContent);

    // Vérifier la version
    if (!importedData.version || !importedData.appName || importedData.appName !== 'Yoroi') {
      Alert.alert('Erreur', 'Ce fichier n\'est pas un export Yoroi valide');
      return false;
    }

    // Demander confirmation
    const confirmed = await new Promise<boolean>((resolve) => {
      const summary = [
        `• ${importedData.weights?.length || 0} mesures de poids`,
        `• ${importedData.trainings?.length || 0} entraînements`,
        `• ${importedData.bodyCompositions?.length || 0} compositions corporelles`,
        `• ${importedData.clubs?.length || 0} clubs`,
        `• ${importedData.measurements?.length || 0} mensurations`,
        `• ${importedData.unlockedBadges?.length || 0} badges débloqués`,
        `• ${importedData.photos?.length || 0} photos`,
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

    // Importer les données
    let importedCount = 0;

    // Importer les poids
    if (importedData.weights && Array.isArray(importedData.weights)) {
      for (const weight of importedData.weights) {
        try {
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

    // Importer les entraînements
    if (importedData.trainings && Array.isArray(importedData.trainings)) {
      for (const training of importedData.trainings) {
        try {
          await addTraining({
            sport: training.sport || training.discipline || 'Sport',
            date: training.date,
            session_type: training.session_type || training.type,
            notes: training.notes,
            duration_minutes: training.duration_minutes,
            start_time: training.start_time,
          });
          importedCount++;
        } catch (error) {
          logger.error('Erreur import training:', error);
        }
      }
    }

    // Importer les compositions corporelles
    if (importedData.bodyCompositions && Array.isArray(importedData.bodyCompositions)) {
      for (const comp of importedData.bodyCompositions) {
        try {
          await addBodyComposition(comp);
          importedCount++;
        } catch (error) {
          logger.error('Erreur import composition:', error);
        }
      }
    }

    // Importer les clubs
    if (importedData.clubs && Array.isArray(importedData.clubs)) {
      for (const club of importedData.clubs) {
        try {
          await addClub(club);
          importedCount++;
        } catch (error) {
          logger.error('Erreur import club:', error);
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

    Alert.alert(
      'Import réussi !',
      `${importedCount} éléments ont été importés avec succès.\n\nTes paramètres, clubs, badges et toutes tes données ont été restaurés !`
    );

    return true;
  } catch (error) {
    logger.error('❌ Erreur import JSON:', error);
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
    logger.error('❌ Erreur partage image:', error);
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
    logger.error('❌ Erreur génération texte partage:', error);
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
    logger.error('❌ Erreur partage progression:', error);
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
    logger.error('❌ Erreur partage story:', error);
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
    logger.error('❌ Erreur sauvegarde galerie:', error);
    Alert.alert('Erreur', 'Impossible de sauvegarder l\'image');
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
    const data = JSON.parse(content);

    // Validation basique
    if (!data.version || !data.exportDate) {
      Alert.alert('Erreur', 'Format de fichier invalide. Utilise un export Yoroi.');
      return false;
    }

    await importData(data);
    Alert.alert('Importé', 'Tes données ont été restaurées avec succès !');
    return true;
  } catch (error) {
    logger.error('❌ Erreur import:', error);
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
    const { getAllTrainings, getAllClubs } = require('./database');

    // Récupérer toutes les données
    const trainings = await getAllTrainings();
    const clubs = await getAllClubs();

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
    logger.error('❌ Erreur export séances CSV:', error);
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
    const { getAllTrainings, getAllClubs } = require('./database');

    // Récupérer toutes les données
    const trainings = await getAllTrainings();
    const clubs = await getAllClubs();

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
    logger.error('❌ Erreur export Excel CSV:', error);
    Alert.alert(
      'Erreur',
      "Impossible d'exporter les séances en Excel CSV. Essaie à nouveau."
    );
    return false;
  }
};
