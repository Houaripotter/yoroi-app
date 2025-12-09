/**
 * 🛡️ YOROI - GESTIONNAIRE DE STOCKAGE LOCAL
 *
 * Philosophie : CONFIDENTIALITÉ TOTALE
 * Toutes les données restent physiquement sur l'appareil de l'utilisateur.
 * Aucune donnée n'est envoyée vers un serveur externe.
 *
 * Fonctionne à 100% en mode avion ✈️
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { documentDirectory, cacheDirectory } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native'; // Ajouté pour les Alertes

// ============================================
// CLÉS DE STOCKAGE
// ============================================

const STORAGE_KEYS = {
  MEASUREMENTS: '@yoroi_measurements',
  WORKOUTS: '@yoroi_workouts',
  PHOTOS: '@yoroi_photos',
  USER_SETTINGS: '@yoroi_user_settings',
  USER_BADGES: '@yoroi_user_badges',
} as const;

// ============================================
// TYPES
// ============================================

export interface Measurement {
  id: string;
  date: string; // Format: YYYY-MM-DD
  weight: number;
  body_fat?: number;
  body_fat_kg?: number;
  muscle_mass?: number;
  water?: number;
  water_kg?: number;
  visceral_fat?: number;
  metabolic_age?: number;
  bone_mass?: number;
  bmr?: number;
  bmi?: number;
  measurements?: {
    chest?: number;
    waist?: number;
    navel?: number;
    hips?: number;
    left_arm?: number;
    right_arm?: number;
    left_thigh?: number;
    right_thigh?: number;
    shoulder?: number; // Ajouté pour la consistance avec les champs de EntryScreen
  };
  notes?: string;
  created_at: string; // ISO timestamp
}

export interface Workout {
  id: string;
  date: string; // Format: YYYY-MM-DD
  type: 'cardio' | 'musculation' | 'sport' | 'autre';
  created_at: string; // ISO timestamp
}

export interface Photo {
  id: string;
  date: string; // Format: YYYY-MM-DD
  file_uri: string; // Chemin local du fichier
  thumbnail_uri?: string; // Chemin local de la miniature (si générée)
  weight?: number;
  notes?: string;
  created_at: string; // ISO timestamp
}

const PHOTOS_DIRECTORY = `${documentDirectory}photos/`;

// Assurez-vous que le répertoire des photos existe
const ensurePhotosDirectoryExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIRECTORY);
  if (!dirInfo.exists) {
    console.log('📂 Création du répertoire photos:', PHOTOS_DIRECTORY);
    await FileSystem.makeDirectoryAsync(PHOTOS_DIRECTORY, { intermediates: true });
  }
};

export interface UserSettings {
  height?: number;
  weight_goal?: number;
  target_date?: string;
  weight_unit: 'kg' | 'lbs';
  measurement_unit: 'cm' | 'in';
  theme: 'light' | 'dark';
  username?: string;
}

export interface UserBadge {
  badge_id: string;
  unlocked_at: string;
}

// ============================================
// UTILITAIRES
// ============================================

/**
 * Génère un ID unique basé sur timestamp + random
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Récupère et parse des données depuis AsyncStorage
 */
const getData = async <T>(key: string): Promise<T[]> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`❌ Erreur lecture ${key}:`, error);
    return [];
  }
};

/**
 * Sauvegarde des données dans AsyncStorage
 */
const saveData = async <T>(key: string, data: T[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error(`❌ Erreur sauvegarde ${key}:`, error);
    return false;
  }
};

// ============================================
// GESTION DES MESURES DE POIDS
// ============================================

/**
 * Récupère toutes les mesures de poids
 */
export const getAllMeasurements = async (): Promise<Measurement[]> => {
  const measurements = await getData<Measurement>(STORAGE_KEYS.MEASUREMENTS);
  // Trier par date décroissante (plus récent en premier)
  return measurements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

/**
 * Récupère la dernière mesure de poids
 */
export const getLatestMeasurement = async (): Promise<Measurement | null> => {
  const measurements = await getAllMeasurements();
  return measurements.length > 0 ? measurements[0] : null;
};

/**
 * Récupère les mesures pour une période donnée
 */
export const getMeasurementsByPeriod = async (days: number): Promise<Measurement[]> => {
  const allMeasurements = await getAllMeasurements();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return allMeasurements.filter(m => new Date(m.date) >= cutoffDate);
};

/**
 * Ajoute une nouvelle mesure
 */
export const addMeasurement = async (measurement: Omit<Measurement, 'id' | 'created_at'>): Promise<Measurement> => {
  const measurements = await getData<Measurement>(STORAGE_KEYS.MEASUREMENTS);

  const newMeasurement: Measurement = {
    ...measurement,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  measurements.push(newMeasurement);
  await saveData(STORAGE_KEYS.MEASUREMENTS, measurements);

  console.log('✅ Mesure ajoutée localement:', newMeasurement.id);
  return newMeasurement;
};

/**
 * Met à jour une mesure existante
 */
export const updateMeasurement = async (id: string, updates: Partial<Measurement>): Promise<boolean> => {
  const measurements = await getData<Measurement>(STORAGE_KEYS.MEASUREMENTS);
  const index = measurements.findIndex(m => m.id === id);

  if (index === -1) return false;

  measurements[index] = { ...measurements[index], ...updates };
  return await saveData(STORAGE_KEYS.MEASUREMENTS, measurements);
};

/**
 * Supprime une mesure
 */
export const deleteMeasurement = async (id: string): Promise<boolean> => {
  const measurements = await getData<Measurement>(STORAGE_KEYS.MEASUREMENTS);
  const filtered = measurements.filter(m => m.id !== id);
  return await saveData(STORAGE_KEYS.MEASUREMENTS, filtered);
};

/**
 * Supprime toutes les mesures
 */
export const deleteAllMeasurements = async (): Promise<boolean> => {
  return await saveData(STORAGE_KEYS.MEASUREMENTS, []);
};

// ============================================
// GESTION DES ENTRAÎNEMENTS
// ============================================

/**
 * Récupère tous les entraînements
 */
export const getAllWorkouts = async (): Promise<Workout[]> => {
  const workouts = await getData<Workout>(STORAGE_KEYS.WORKOUTS);
  return workouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

/**
 * Récupère les entraînements pour une période donnée
 */
export const getWorkoutsByPeriod = async (days: number): Promise<Workout[]> => {
  const allWorkouts = await getAllWorkouts();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return allWorkouts.filter(w => new Date(w.date) >= cutoffDate);
};

/**
 * Récupère les entraînements d'un mois spécifique
 */
export const getWorkoutsByMonth = async (year: number, month: number): Promise<Workout[]> => {
  const allWorkouts = await getAllWorkouts();

  return allWorkouts.filter(w => {
    const workoutDate = new Date(w.date);
    return workoutDate.getFullYear() === year && workoutDate.getMonth() === month;
  });
};

/**
 * Vérifie si un entraînement existe pour une date
 */
export const hasWorkoutOnDate = async (date: string): Promise<boolean> => {
  const workouts = await getData<Workout>(STORAGE_KEYS.WORKOUTS);
  return workouts.some(w => w.date === date);
};

/**
 * Ajoute un nouvel entraînement
 */
export const addWorkout = async (workout: Omit<Workout, 'id' | 'created_at'>): Promise<Workout> => {
  const workouts = await getData<Workout>(STORAGE_KEYS.WORKOUTS);

  const newWorkout: Workout = {
    ...workout,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  workouts.push(newWorkout);
  await saveData(STORAGE_KEYS.WORKOUTS, workouts);

  console.log('✅ Entraînement ajouté localement:', newWorkout.id);
  return newWorkout;
};

/**
 * Supprime un entraînement
 */
export const deleteWorkout = async (id: string): Promise<boolean> => {
  const workouts = await getData<Workout>(STORAGE_KEYS.WORKOUTS);
  const filtered = workouts.filter(w => w.id !== id);
  return await saveData(STORAGE_KEYS.WORKOUTS, filtered);
};

/**
 * Supprime tous les entraînements
 */
export const deleteAllWorkouts = async (): Promise<boolean> => {
  return await saveData(STORAGE_KEYS.WORKOUTS, []);
};

// ============================================
// GESTION DES PHOTOS
// ============================================

/**
 * Sauvegarde une photo sur le stockage local de l'appareil et ses métadonnées.
 * Copie le fichier depuis son URI source (ex: cache de la caméra) vers le répertoire de l'app.
 */
export const savePhotoToStorage = async (sourceUri: string, date: string, weight?: number, notes?: string): Promise<Photo | null> => {
  await ensurePhotosDirectoryExists();

  const id = generateId();
  const filename = `photo_${id}.jpg`;
  const destinationUri = `${PHOTOS_DIRECTORY}${filename}`;

  try {
    await FileSystem.copyAsync({
      from: sourceUri,
      to: destinationUri,
    });
    console.log('✅ Photo copiée vers:', destinationUri);

    const newPhoto: Photo = {
      id,
      date,
      file_uri: destinationUri,
      weight,
      notes,
      created_at: new Date().toISOString(),
    };

    const photos = await getData<Photo>(STORAGE_KEYS.PHOTOS);
    photos.push(newPhoto);
    await saveData(STORAGE_KEYS.PHOTOS, photos);

    console.log('✅ Métadonnées photo sauvegardées:', newPhoto.id);
    return newPhoto;
  } catch (error) {
    console.error('❌ Erreur sauvegarde photo:', error);
    return null;
  }
};

/**
 * Récupère toutes les métadonnées de photos depuis AsyncStorage.
 * Les photos sont triées par date de création décroissante.
 */
export const getPhotosFromStorage = async (): Promise<Photo[]> => {
  const photos = await getData<Photo>(STORAGE_KEYS.PHOTOS);
  return photos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

/**
 * Supprime une photo du stockage local (fichier physique et métadonnées).
 */
export const deletePhotoFromStorage = async (id: string): Promise<boolean> => {
  const photos = await getData<Photo>(STORAGE_KEYS.PHOTOS);
  const photoToDelete = photos.find(p => p.id === id);

  if (!photoToDelete) {
    console.log('ℹ️ Photo non trouvée pour suppression:', id);
    return false;
  }

  // Supprimer le fichier physique
  try {
    const fileInfo = await FileSystem.getInfoAsync(photoToDelete.file_uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(photoToDelete.file_uri);
      console.log('✅ Fichier photo supprimé du système de fichiers:', photoToDelete.file_uri);
    }
  } catch (error) {
    console.error('❌ Erreur suppression fichier photo physique:', error);
    // Continuer la suppression des métadonnées même si le fichier physique échoue
  }

  // Supprimer de AsyncStorage
  const filteredPhotos = photos.filter(p => p.id !== id);
  await saveData(STORAGE_KEYS.PHOTOS, filteredPhotos);
  console.log('✅ Métadonnées photo supprimées de AsyncStorage pour ID:', id);
  return true;
};

/**
 * Supprime toutes les photos
 */
export const deleteAllPhotos = async (): Promise<boolean> => {
  const photos = await getData<Photo>(STORAGE_KEYS.PHOTOS);

  // Supprimer tous les fichiers physiques
  for (const photo of photos) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(photo.file_uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(photo.file_uri);
      }
    } catch (error) {
      console.error('❌ Erreur suppression fichier:', error);
    }
  }

  return await saveData(STORAGE_KEYS.PHOTOS, []);
};

// ============================================
// GESTION DES PARAMÈTRES UTILISATEUR
// ============================================

/**
 * Récupère les paramètres utilisateur
 */
export const getUserSettings = async (): Promise<UserSettings> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    return data ? JSON.parse(data) : {
      weight_unit: 'kg',
      measurement_unit: 'cm',
      theme: 'light',
    };
  } catch (error) {
    console.error('❌ Erreur lecture paramètres:', error);
    return {
      weight_unit: 'kg',
      measurement_unit: 'cm',
      theme: 'light',
    };
  }
};

/**
 * Sauvegarde les paramètres utilisateur
 */
export const saveUserSettings = async (settings: Partial<UserSettings>): Promise<boolean> => {
  try {
    const currentSettings = await getUserSettings();
    const newSettings = { ...currentSettings, ...settings };
    await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(newSettings));
    console.log('✅ Paramètres sauvegardés');
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde paramètres:', error);
    return false;
  }
};

// ============================================
// GESTION DES BADGES
// ============================================

/**
 * Récupère tous les badges débloqués
 */
export const getUnlockedBadges = async (): Promise<UserBadge[]> => {
  return await getData<UserBadge>(STORAGE_KEYS.USER_BADGES);
};

/**
 * Vérifie si un badge est débloqué
 */
export const isBadgeUnlocked = async (badgeId: string): Promise<boolean> => {
  const badges = await getUnlockedBadges();
  return badges.some(b => b.badge_id === badgeId);
};

/**
 * Débloque un badge
 */
export const unlockBadge = async (badgeId: string): Promise<boolean> => {
  const badges = await getData<UserBadge>(STORAGE_KEYS.USER_BADGES);

  // Vérifier si déjà débloqué
  if (badges.some(b => b.badge_id === badgeId)) {
    return false;
  }

  const newBadge: UserBadge = {
    badge_id: badgeId,
    unlocked_at: new Date().toISOString(),
  };

  badges.push(newBadge);
  await saveData(STORAGE_KEYS.USER_BADGES, badges);

  console.log('🏆 Badge débloqué:', badgeId);
  return true;
};

// ============================================
// IMPORT / EXPORT DE BACKUP
// ============================================

export interface BackupData {
  version: string;
  exported_at: string;
  measurements: Measurement[];
  workouts: Workout[];
  photos: Photo[];
  settings: UserSettings;
  badges: UserBadge[];
}

/**
 * Exporte toutes les données en JSON
 */
export const exportAllData = async (): Promise<BackupData> => {
  const [measurements, workouts, photos, settings, badges] = await Promise.all([
    getAllMeasurements(),
    getAllWorkouts(),
    getPhotosFromStorage(), // Utilisation de la nouvelle fonction
    getUserSettings(),
    getUnlockedBadges(),
  ]);

  const backup: BackupData = {
    version: '1.0.0',
    exported_at: new Date().toISOString(),
    measurements,
    workouts,
    photos,
    settings,
    badges,
  };

  console.log('📦 Données exportées:', {
    measurements: measurements.length,
    workouts: workouts.length,
    photos: photos.length,
  });

  return backup;
};

/**
 * Importe des données depuis un backup
 */
export const importAllData = async (backup: BackupData): Promise<boolean> => {
  try {
    // Sauvegarder toutes les données
    await Promise.all([
      saveData(STORAGE_KEYS.MEASUREMENTS, backup.measurements),
      saveData(STORAGE_KEYS.WORKOUTS, backup.workouts),
      saveData(STORAGE_KEYS.PHOTOS, backup.photos),
      AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(backup.settings)),
      saveData(STORAGE_KEYS.USER_BADGES, backup.badges),
    ]);

    console.log('✅ Données importées avec succès');
    return true;
  } catch (error) {
    console.error('❌ Erreur import données:', error);
    return false;
  }
};

/**
 * Réinitialise toutes les données (DANGER)
 */
export const resetAllData = async (): Promise<boolean> => {
  try {
    // Supprimer les photos physiques
    await deleteAllPhotos(); // Utilisation de la nouvelle fonction

    // Supprimer toutes les autres données
    await Promise.all([
      deleteAllMeasurements(),
      deleteAllWorkouts(),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_SETTINGS),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_BADGES),
    ]);

    console.log('🗑️ Toutes les données ont été supprimées');
    return true;
  } catch (error) {
    console.error('❌ Erreur réinitialisation:', error);
    return false;
  }
};

// ============================================
// STATISTIQUES
// ============================================

/**
 * Récupère des statistiques globales
 */
export const getStats = async () => {
  const [measurements, workouts, photos, badges] = await Promise.all([
    getAllMeasurements(),
    getAllWorkouts(),
    getPhotosFromStorage(), // Utilisation de la nouvelle fonction
    getUserSettings(),
    getUnlockedBadges(),
  ]);

  return {
    total_measurements: measurements.length,
    total_workouts: workouts.length,
    total_photos: photos.length,
    total_badges: badges.length,
    first_measurement_date: measurements.length > 0
      ? measurements[measurements.length - 1].date
      : null,
  };
};

/**
 * Calcule le streak (série de jours consécutifs avec pesée)
 */
export const calculateWeightStreak = async (): Promise<number> => {
  const measurements = await getAllMeasurements();

  if (measurements.length === 0) return 0;

  // Trier par date croissante
  const sorted = [...measurements].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let streak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);

    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      streak = Math.max(streak, currentStreak);
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  return streak;
};

/**
 * Calcule le streak d'entraînements
 */
export const calculateWorkoutStreak = async (): Promise<number> => {
  const workouts = await getAllWorkouts();

  if (workouts.length === 0) return 0;

  // Trier par date croissante
  const sorted = [...workouts].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  let streak = 1;
  let currentStreak = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prevDate = new Date(sorted[i - 1].date);
    const currDate = new Date(sorted[i].date);

    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      currentStreak++;
      streak = Math.max(streak, currentStreak);
    } else if (diffDays > 1) {
      currentStreak = 1;
    }
  }

  return streak;
};

// ============================================
// SAUVEGARDE ET RESTAURATION (BACKUP/RESTORE)
// ============================================

/**
 * Exporte toutes les données de l'application dans un fichier JSON.
 */
export const exportData = async (): Promise<boolean> => {
  try {
    const backupData = await exportAllData(); // Utilise la fonction exportAllData existante
    const filename = `yoroi_backup_${new Date().toISOString().split('T')[0]}.json`;
    const fileUri = `${cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
    console.log('📦 Fichier de sauvegarde créé:', fileUri);

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'Sauvegarder les données Yoroi',
      });
      console.log('✅ Données partagées avec succès.');
      return true;
    } else {
      Alert.alert('Erreur', 'Le partage de fichiers n\'est pas disponible sur cet appareil.');
      return false;
    }
  } catch (error) {
    console.error('❌ Erreur lors de l\'exportation des données:', error);
    Alert.alert('Erreur', 'Impossible d\'exporter les données.');
    return false;
  }
};

/**
 * Importe les données depuis un fichier JSON sélectionné par l'utilisateur.
 * Écrase toutes les données existantes après confirmation.
 */
export const importData = async (): Promise<boolean> => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      console.log('Importation annulée par l\'utilisateur.');
      return false;
    }

    const uri = result.assets ? result.assets[0].uri : null;

    if (!uri) {
      Alert.alert('Erreur', 'Aucun fichier sélectionné.');
      return false;
    }

    const fileContent = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    const backup: BackupData = JSON.parse(fileContent);

    // Valider la structure de la sauvegarde
    if (!backup || backup.version !== '1.0.0' || !backup.measurements || !backup.workouts || !backup.photos || !backup.settings || !backup.badges) {
      Alert.alert('Erreur', 'Le fichier de sauvegarde est invalide ou corrompu.');
      return false;
    }

    // Confirmation avant écrasement
    const confirm = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Attention',
        'Ceci va écraser TOUTES vos données actuelles. Êtes-vous sûr de vouloir continuer ?',
        [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirmer', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirm) {
      console.log('Importation annulée par l\'utilisateur après confirmation.');
      return false;
    }

    // Réinitialiser toutes les données actuelles
    await resetAllData(); 
    
    // Importer les nouvelles données
    await importAllData(backup);

    Alert.alert('Succès', 'Données restaurées avec succès !');
    return true;
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'importation des données:', error);
    Alert.alert('Erreur', `Impossible d\'importer les données: ${error.message || 'fichier invalide'}`);
    return false;
  }
};