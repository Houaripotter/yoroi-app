import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

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
  // Métriques Tanita
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
  // Mensurations
  measurements?: {
    chest?: number;
    waist?: number;
    navel?: number;
    hips?: number;
    shoulder?: number;
    left_arm?: number;
    right_arm?: number;
    left_thigh?: number;
    right_thigh?: number;
  };
  notes?: string;
  created_at: string; // ISO timestamp
}

export interface Workout {
  id: string;
  date: string; // Format: YYYY-MM-DD
  type: 'musculation' | 'jjb' | 'running' | 'autre';
  created_at: string; // ISO timestamp
}

export interface Photo {
  id: string;
  date: string; // Format: YYYY-MM-DD
  file_uri: string; // Chemin local du fichier
  weight?: number;
  notes?: string;
  created_at: string; // ISO timestamp
}

export interface UserSettings {
  height?: number;
  weight_goal?: number;
  target_date?: string;
  weight_unit: 'kg' | 'lbs';
  measurement_unit: 'cm' | 'in';
  theme: 'light' | 'dark' | 'system';
  username?: string;
  // Rappel settings
  reminder_enabled?: boolean;
  reminder_time?: string;
  reminder_days?: number[];
}

export interface UserBadge {
  badge_id: string;
  unlocked_at: string;
}

// ============================================
// GESTION DES CHEMINS & FICHIERS
// ============================================

const ensurePhotosDirectoryExists = async (): Promise<string> => {
  if (!FileSystem.documentDirectory) {
    throw new Error('documentDirectory est indisponible (FileSystem.documentDirectory undefined)');
  }

  const photosDirectory = `${FileSystem.documentDirectory}photos/`;
  const dirInfo = await FileSystem.getInfoAsync(photosDirectory);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(photosDirectory, { intermediates: true });
  }

  return photosDirectory;
};

// ============================================
// UTILITAIRES
// ============================================

const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const getData = async <T>(key: string): Promise<T[]> => {
  try {
    const data = await AsyncStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error(`❌ Erreur lecture ${key}:`, error);
    return [];
  }
};

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
// SAUVEGARDE GÉNÉRIQUE (API)
// ============================================

// ... (Ajoute ici les fonctions manquantes pour les mesures, workouts, photos, et settings)

export const getAllMeasurements = async (): Promise<Measurement[]> => {
  const measurements = await getData<Measurement>(STORAGE_KEYS.MEASUREMENTS);
  return measurements.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getLatestMeasurement = async (): Promise<Measurement | null> => {
  const measurements = await getAllMeasurements();
  return measurements.length > 0 ? measurements[0] : null;
};

export const getMeasurementsByPeriod = async (days: number): Promise<Measurement[]> => {
  const allMeasurements = await getAllMeasurements();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return allMeasurements.filter(m => new Date(m.date) >= cutoffDate);
};

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

export const updateMeasurement = async (id: string, updates: Partial<Measurement>): Promise<boolean> => {
  const measurements = await getData<Measurement>(STORAGE_KEYS.MEASUREMENTS);
  const index = measurements.findIndex(m => m.id === id);

  if (index === -1) return false;

  measurements[index] = { ...measurements[index], ...updates };
  return await saveData(STORAGE_KEYS.MEASUREMENTS, measurements);
};

export const deleteMeasurement = async (id: string): Promise<boolean> => {
  const measurements = await getData<Measurement>(STORAGE_KEYS.MEASUREMENTS);
  const filtered = measurements.filter(m => m.id !== id);
  return await saveData(STORAGE_KEYS.MEASUREMENTS, filtered);
};

export const deleteAllMeasurements = async (): Promise<boolean> => {
  return await saveData(STORAGE_KEYS.MEASUREMENTS, []);
};


// ============================================
// GESTION DES ENTRAÎNEMENTS
// ============================================

export const getAllWorkouts = async (): Promise<Workout[]> => {
  const workouts = await getData<Workout>(STORAGE_KEYS.WORKOUTS);
  return workouts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

export const getWorkoutsByPeriod = async (days: number): Promise<Workout[]> => {
  const allWorkouts = await getAllWorkouts();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  return allWorkouts.filter(w => new Date(w.date) >= cutoffDate);
};

export const getWorkoutsByMonth = async (year: number, month: number): Promise<Workout[]> => {
  const allWorkouts = await getAllWorkouts();

  return allWorkouts.filter(w => {
    const workoutDate = new Date(w.date);
    return workoutDate.getFullYear() === year && workoutDate.getMonth() === month;
  });
};

export const hasWorkoutOnDate = async (date: string): Promise<boolean> => {
  const workouts = await getData<Workout>(STORAGE_KEYS.WORKOUTS);
  return workouts.some(w => w.date === date);
};

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

export const deleteWorkout = async (id: string): Promise<boolean> => {
  const workouts = await getData<Workout>(STORAGE_KEYS.WORKOUTS);
  const filtered = workouts.filter(w => w.id !== id);
  return await saveData(STORAGE_KEYS.WORKOUTS, filtered);
};

export const deleteAllWorkouts = async (): Promise<boolean> => {
  return await saveData(STORAGE_KEYS.WORKOUTS, []);
};


// ============================================
// GESTION DES PHOTOS
// ============================================

export const savePhotoToStorage = async (
  sourceUri: string,
  date: string,
  weight?: number,
  notes?: string
): Promise<Photo | null> => {
  try {
    const photosDir = await ensurePhotosDirectoryExists();

    const id = generateId();
    const filename = `photo_${id}.jpg`;
    const destinationUri = `${photosDir}${filename}`;

    await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });

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

    console.log('✅ Photo copiée et sauvegardée:', { destinationUri, id });
    return newPhoto;
  } catch (error: any) {
    console.error('❌ Erreur sauvegarde photo:', error?.message || error);
    return null;
  }
};

export const getPhotosFromStorage = async (): Promise<Photo[]> => {
  const photos = await getData<Photo>(STORAGE_KEYS.PHOTOS);
  return photos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

export const deletePhotoFromStorage = async (id: string): Promise<boolean> => {
  const photos = await getData<Photo>(STORAGE_KEYS.PHOTOS);
  const photoToDelete = photos.find(p => p.id === id);

  if (!photoToDelete) {
    console.log('ℹ️ Photo non trouvée pour suppression:', id);
    return false;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(photoToDelete.file_uri);
    if (fileInfo.exists) {
      await FileSystem.deleteAsync(photoToDelete.file_uri);
      console.log('✅ Fichier photo supprimé du système de fichiers:', photoToDelete.file_uri);
    }
  } catch (error) {
    console.error('❌ Erreur suppression fichier photo physique:', error);
  }

  const filteredPhotos = photos.filter(p => p.id !== id);
  await saveData(STORAGE_KEYS.PHOTOS, filteredPhotos);
  console.log('✅ Métadonnées photo supprimées de AsyncStorage pour ID:', id);
  return true;
};

export const deleteAllPhotos = async (): Promise<boolean> => {
  const photos = await getData<Photo>(STORAGE_KEYS.PHOTOS);

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

export const getUnlockedBadges = async (): Promise<UserBadge[]> => {
  return await getData<UserBadge>(STORAGE_KEYS.USER_BADGES);
};

export const isBadgeUnlocked = async (badgeId: string): Promise<boolean> => {
  const badges = await getUnlockedBadges();
  return badges.some(b => b.badge_id === badgeId);
};

export const unlockBadge = async (badgeId: string): Promise<boolean> => {
  const badges = await getData<UserBadge>(STORAGE_KEYS.USER_BADGES);

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
// EXPORT / IMPORT
// ============================================

export const exportData = async () => {
  // Simuler l'export
  const stats = {
    measurements: (await getData(STORAGE_KEYS.MEASUREMENTS)).length,
    workouts: (await getData(STORAGE_KEYS.WORKOUTS)).length,
    photos: (await getData(STORAGE_KEYS.PHOTOS)).length,
  };

  const backupData = {
    version: 1,
    date: new Date().toISOString(),
    stats,
    measurements: await getData(STORAGE_KEYS.MEASUREMENTS),
    workouts: await getData(STORAGE_KEYS.WORKOUTS),
    photos: await getData(STORAGE_KEYS.PHOTOS),
    settings: await getData(STORAGE_KEYS.USER_SETTINGS),
    badges: await getData(STORAGE_KEYS.USER_BADGES),
  };

  const filename = `yoroi_backup_${new Date().toISOString().split('T')[0]}.json`;
  const baseDirectory = ExpoFileSystem.cacheDirectory || ExpoFileSystem.documentDirectory; // Utilise documentDirectory comme solution de repli

  if (!baseDirectory) {
    Alert.alert('Erreur', 'Impossible de déterminer le répertoire de stockage pour l\'exportation.');
    console.error('❌ cacheDirectory et documentDirectory sont tous deux indéfinis (ou non disponibles au moment de l\'exportation).');
    return false;
  }
  const fileUri = `${baseDirectory}${filename}`;

  try {
    // Écrire le fichier temporaire
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backupData, null, 2), { encoding: FileSystem.EncodingType.UTF8 });
    
    // Partager le fichier via le dialogue natif
    await Sharing.shareAsync(fileUri);
    return true;
  } catch (error) {
    console.error('❌ Erreur lors de l\'exportation:', error);
    Alert.alert('Erreur', 'Impossible d\'exporter les données.');
    return false;
  }
};


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

    if (!backup || backup.version !== 1 || !backup.measurements || !backup.workouts || !backup.photos || !backup.settings || !backup.badges) {
      Alert.alert('Erreur', 'Le fichier de sauvegarde est invalide ou corrompu.');
      return false;
    }

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

    await resetAllData(); 
    await importAllData(backup);

    Alert.alert('Succès', 'Données restaurées avec succès !');
    return true;
  } catch (error: any) {
    console.error('❌ Erreur lors de l\'importation des données:', error);
    Alert.alert('Erreur', `Impossible d\'importer les données: ${error.message || 'fichier invalide'}`);
    return false;
  }
};

export const resetAllData = async (): Promise<void> => {
  await Promise.all([
    AsyncStorage.removeItem(STORAGE_KEYS.MEASUREMENTS),
    AsyncStorage.removeItem(STORAGE_KEYS.WORKOUTS),
    AsyncStorage.removeItem(STORAGE_KEYS.PHOTOS),
    AsyncStorage.removeItem(STORAGE_KEYS.USER_SETTINGS),
    AsyncStorage.removeItem(STORAGE_KEYS.USER_BADGES),
  ]);
  await deleteAllPhotos(); // Supprimer les fichiers physiques des photos
  console.log('🗑️ Toutes les données ont été réinitialisées.');
};

export const importAllData = async (backup: BackupData): Promise<void> => {
  await saveData(STORAGE_KEYS.MEASUREMENTS, backup.measurements);
  await saveData(STORAGE_KEYS.WORKOUTS, backup.workouts);
  await saveData(STORAGE_KEYS.PHOTOS, backup.photos);
  await saveData(STORAGE_KEYS.USER_SETTINGS, [backup.settings]); // Settings est un objet unique
  await saveData(STORAGE_KEYS.USER_BADGES, backup.badges);

  // Gérer l'importation des fichiers physiques de photos si le backup les contenait
  // Ce cas est plus complexe et nécessiterait une logique d'encodage/décodage des images dans le JSON
  // Pour l'instant, on se contente des métadonnées et on suppose que les fichiers seraient à importer manuellement
  console.log('📥 Données importées depuis le backup.');
};