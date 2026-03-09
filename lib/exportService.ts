import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { getDocumentAsync } from 'expo-document-picker';
import { captureRef } from 'react-native-view-shot';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
import { getWeights, getTrainings, getProfile, addWeight, addTraining, getClubs, addClub, addMeasurementRecord, saveProfile } from './database';
import { getAllBodyCompositions, addBodyComposition } from './bodyComposition';
import { getUnlockedBadges, unlockBadge } from './badges';
import logger from '@/lib/security/logger';

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
export const exportDataToJSON = async (): Promise<boolean> => {
  try {
    logger.info('Début export JSON complet avec images...');

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
    ] = await Promise.all([
      getProfile(),
      getWeights(), // Toutes les pesées (backup complet)
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
    ]);

    // === CONVERTIR LES IMAGES EN BASE64 ===

    // 1. Photo de profil
    let profilePhotoBase64: string | null = null;
    if (profile?.profile_photo) {
      profilePhotoBase64 = await imageToBase64(profile.profile_photo);
      logger.info('Photo de profil convertie en base64');
    }

    // 2. Logos des clubs
    const clubsWithLogos = await Promise.all(
      (clubs || []).map(async (club: any) => {
        let logoBase64: string | null = null;
        if (club.logo_uri && !club.logo_uri.startsWith('builtin:')) {
          logoBase64 = await imageToBase64(club.logo_uri);
        }
        return {
          ...club,
          logo_base64: logoBase64, // Image en base64 pour le backup
        };
      })
    );
    logger.info(`${clubsWithLogos.filter((c: any) => c.logo_base64).length} logos de clubs convertis`);

    // 3. Photos de transformation (si URI locales)
    const photosWithBase64 = await Promise.all(
      (photos || []).map(async (photo: any) => {
        let imageBase64: string | null = null;
        if (photo.uri && photo.uri.startsWith('file://')) {
          imageBase64 = await imageToBase64(photo.uri);
        }
        return {
          ...photo,
          image_base64: imageBase64,
        };
      })
    );
    logger.info(`${photosWithBase64.filter((p: any) => p.image_base64).length} photos converties`);

    const exportData = {
      version: '5.0', // Version 5.0 avec sommeil + humeur
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
      clubs: clubsWithLogos, // Clubs avec logos en base64
      measurements,
      userSettings,
      unlockedBadges,
      photos: photosWithBase64, // Photos avec images en base64
      homeLayout,
      selectedLogo,
      hydrationEntries,
      hydrationSettings,
      sleepEntries,
      sleepGoal,
      moodEntries,
    };

    // Créer le fichier JSON
    const fileName = `yoroi_backup_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = `${FileSystem.documentDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(
      fileUri,
      JSON.stringify(exportData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    logger.info('Fichier JSON créé:', fileName);

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
    logger.error('Erreur export JSON:', error);
    Alert.alert('Erreur', 'Impossible d\'exporter les données');
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

    // Vérifier la version
    if (!importedData || !importedData.version || !importedData.appName || importedData.appName !== 'Yoroi') {
      Alert.alert('Erreur', 'Ce fichier n\'est pas un export Yoroi valide');
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

    // Importer les entraînements (COMPLET avec tous les champs)
    if (importedData.trainings && Array.isArray(importedData.trainings)) {
      for (const training of importedData.trainings) {
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
      for (const measurement of importedData.measurements) {
        try {
          await addMeasurementRecord({
            chest: measurement.chest,
            waist: measurement.waist,
            navel: measurement.navel,
            hips: measurement.hips,
            left_arm: measurement.left_arm,
            right_arm: measurement.right_arm,
            left_thigh: measurement.left_thigh,
            right_thigh: measurement.right_thigh,
            left_calf: measurement.left_calf,
            right_calf: measurement.right_calf,
            shoulders: measurement.shoulders,
            neck: measurement.neck,
            date: measurement.date,
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
        const existingRaw = await AsyncStorage.getItem('@yoroi_sleep_entries');
        const existingEntries: any[] = existingRaw ? JSON.parse(existingRaw) : [];
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
            const ext = (photo.uri || 'photo.jpg').split('.').pop() || 'jpg';
            const photoUri = await base64ToImage(
              photo.image_base64,
              `photo_${photo.id || Date.now()}.${ext}`
            );
            if (photoUri) {
              photoData.uri = photoUri;
              imagesRestored++;
            }
          }

          restoredPhotos.push(photoData);
        }

        await AsyncStorage.setItem('@yoroi_photos', JSON.stringify(restoredPhotos));
        importedCount++;
      } catch (error) {
        logger.error('Erreur import photos:', error);
      }
    }

    const imageMsg = imagesRestored > 0 ? `\n\n${imagesRestored} image(s) restaurée(s) (photo de profil, logos de clubs, photos de transformation)` : '';

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
