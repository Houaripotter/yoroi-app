import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import { Platform, Alert } from 'react-native';
import { getAllMeasurements, getUserSettings } from './storage';

// ============================================
// 📤 EXPORT & PARTAGE
// ============================================

/**
 * Exporte toutes les données utilisateur en JSON
 */
export const exportDataToJSON = async (): Promise<boolean> => {
  try {
    // Récupérer toutes les données
    const measurements = await getAllMeasurements();
    const userSettings = await getUserSettings();

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      userSettings,
      measurements,
    };

    // Créer le fichier JSON
    const fileName = `yoroi_export_${new Date().getTime()}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(exportData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    // Partager le fichier
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Exporter mes données Yoroi',
        UTI: 'public.json',
      });
    } else {
      Alert.alert('Succès', `Données exportées vers ${fileUri}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur export JSON:', error);
    Alert.alert('Erreur', 'Impossible d\'exporter les données');
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
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Partager ma progression Yoroi',
      });
      return true;
    } else {
      Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur partage image:', error);
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
      return '🥋 Je commence mon parcours de guerrier avec Yoroi ! #Yoroi #Fitness';
    }

    const latest = measurements[0];
    const oldest = measurements[measurements.length - 1];
    const weightDiff = oldest.weight - latest.weight;

    let text = `🥋 Mon parcours Yoroi\n\n`;

    if (weightDiff > 0) {
      text += `✨ ${weightDiff.toFixed(1)}kg perdus !\n`;
    } else if (weightDiff < 0) {
      text += `💪 ${Math.abs(weightDiff).toFixed(1)}kg gagnés !\n`;
    }

    text += `📊 ${measurements.length} mesures enregistrées\n`;
    text += `🎯 Poids actuel: ${latest.weight}kg\n\n`;
    text += `#Yoroi #Fitness #Transformation`;

    return text;
  } catch (error) {
    console.error('❌ Erreur génération texte partage:', error);
    return '🥋 Mon parcours Yoroi #Yoroi #Fitness';
  }
};

/**
 * Partage la progression sous forme de texte
 */
export const shareProgress = async (): Promise<boolean> => {
  try {
    const text = await generateShareText();

    const canShare = await Sharing.isAvailableAsync();
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
    console.error('❌ Erreur partage progression:', error);
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
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Partager sur les réseaux sociaux',
      });
      return true;
    } else {
      Alert.alert('Erreur', 'Le partage n\'est pas disponible sur cet appareil');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur partage story:', error);
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
      Alert.alert('Permission requise', 'Veuillez autoriser l\'accès à la galerie pour sauvegarder l\'image');
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
    Alert.alert('Succès', 'Image sauvegardée dans votre galerie');
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde galerie:', error);
    Alert.alert('Erreur', 'Impossible de sauvegarder l\'image');
    return false;
  }
};

/**
 * Exporte les données au format CSV
 */
export const exportDataToCSV = async (): Promise<boolean> => {
  try {
    const measurements = await getAllMeasurements();

    if (measurements.length === 0) {
      Alert.alert('Aucune donnée', 'Vous n\'avez pas encore de mesures à exporter');
      return false;
    }

    // Créer le CSV
    let csv = 'Date,Poids (kg),Masse grasse (%),Muscle (kg),Eau (%),IMC\n';

    measurements.reverse().forEach((m: { date: string; weight: number; body_fat?: number; muscle_mass?: number; water?: number; bmi?: number }) => {
      csv += `${m.date},${m.weight},${m.body_fat || ''},${m.muscle_mass || ''},${m.water || ''},${m.bmi || ''}\n`;
    });

    // Créer le fichier CSV
    const fileName = `yoroi_data_${new Date().getTime()}.csv`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(fileUri, csv, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Partager le fichier
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'text/csv',
        dialogTitle: 'Exporter mes données Yoroi (CSV)',
      });
    } else {
      Alert.alert('Succès', `Données exportées vers ${fileUri}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Erreur export CSV:', error);
    Alert.alert('Erreur', 'Impossible d\'exporter les données');
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

    const result = await DocumentPicker.getDocumentAsync({
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
    Alert.alert('✅ Importé', 'Tes données ont été restaurées avec succès !');
    return true;
  } catch (error) {
    console.error('❌ Erreur import:', error);
    Alert.alert('Erreur', "Impossible d'importer les données. Vérifie le format du fichier.");
    return false;
  }
};
