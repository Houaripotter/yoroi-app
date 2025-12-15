import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert, Platform } from 'react-native';

// ============================================
// 🔧 GESTION CROSS-PLATFORM DES RÉPERTOIRES
// ============================================

/**
 * Vérifie si FileSystem est disponible (pas sur le web)
 */
const isFileSystemAvailable = (): boolean => {
  if (Platform.OS === 'web') {
    return false;
  }
  return !!(FileSystem.documentDirectory && FileSystem.cacheDirectory);
};

/**
 * Obtient le répertoire des documents de manière sécurisée
 */
const getDocumentDirectory = (): string | null => {
  if (Platform.OS === 'web') {
    console.log('ℹ️ FileSystem non disponible sur le web');
    return null;
  }
  
  // Attendre que FileSystem soit prêt
  const docDir = FileSystem.documentDirectory;
  if (!docDir) {
    console.warn('⚠️ documentDirectory non disponible');
    return null;
  }
  return docDir;
};

/**
 * Obtient le répertoire cache de manière sécurisée
 */
const getCacheDirectory = (): string | null => {
  if (Platform.OS === 'web') {
    return null;
  }
  
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    console.warn('⚠️ cacheDirectory non disponible');
    return null;
  }
  return cacheDir;
};

// ============================================
// CLÉS DE STOCKAGE
// ============================================

const STORAGE_KEYS = {
  MEASUREMENTS: '@yoroi_measurements',
  WORKOUTS: '@yoroi_workouts',
  PHOTOS: '@yoroi_photos',
  PHOTOS_DATA: '@yoroi_photos_data', // Stockage base64 pour fallback
  USER_SETTINGS: '@yoroi_user_settings',
  USER_BADGES: '@yoroi_user_badges',
  USER_CLUBS: '@yoroi_user_clubs',
  USER_GEAR: '@yoroi_user_gear',
  USER_BODY_STATUS: '@yoroi_user_body_status',
} as const;

// ============================================
// TYPES
// ============================================

export interface Measurement {
  id: string;
  date: string;
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
    shoulder?: number;
    left_arm?: number;
    right_arm?: number;
    left_thigh?: number;
    right_thigh?: number;
  };
  notes?: string;
  created_at: string;
}

export interface Workout {
  id: string;
  date: string;
  type: 'musculation' | 'jjb' | 'running' | 'autre' | 'basic_fit' | 'gracie_barra';
  created_at: string;
}

export interface Photo {
  id: string;
  date: string;
  file_uri: string;
  base64?: string; // Fallback pour web/simulateur
  weight?: number;
  notes?: string;
  created_at: string;
}

export interface UserClub {
  id: string;
  name: string;
  type: 'gracie_barra' | 'basic_fit' | 'running' | 'mma' | 'foot' | 'other';
  logoUri?: string | null;
  created_at: string;
}

export interface UserGear {
  id: string;
  name: string;
  brand: string;
  type: 'kimono' | 'chaussure' | 'gants' | 'protections' | 'autre';
  photoUri?: string | null;
  created_at: string;
}

export interface UserSettings {
  height?: number;
  weight_goal?: number;
  target_date?: string;
  weight_unit: 'kg' | 'lbs';
  measurement_unit: 'cm' | 'in';
  theme: 'light' | 'dark' | 'system';
  colorTheme?: 'gold' | 'blue' | 'sakura';
  username?: string;
  reminder_enabled?: boolean;
  reminder_time?: string;
  reminder_days?: number[];
  routine_image_uri?: string | null;
  custom_club_logos?: { [key: string]: string };
  weekly_routine?: { [key: string]: Array<{ time: string; activity: string }> };
  gender?: 'male' | 'female';
  userClan?: 'GB' | 'MFC' | 'Ronin';
  userClubs?: UserClub[];
  goal?: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health' | 'lose' | 'gain';
  targetWeight?: number;
  onboardingCompleted?: boolean;
}

export interface UserBadge {
  badge_id: string;
  unlocked_at: string;
}

export interface BackupData {
  version: number;
  date: string;
  stats: {
    measurements: number;
    workouts: number;
    photos: number;
  };
  measurements: Measurement[];
  workouts: Workout[];
  photos: Photo[];
  settings: UserSettings;
  badges: UserBadge[];
}

// ============================================
// GESTION DES CHEMINS & FICHIERS
// ============================================

const ensurePhotosDirectoryExists = async (): Promise<string | null> => {
  const docDir = getDocumentDirectory();
  
  if (!docDir) {
    console.log('ℹ️ Mode web/simulateur : photos stockées en base64');
    return null; // On utilisera le stockage base64
  }

  try {
    const photosDirectory = `${docDir}photos/`;
    const dirInfo = await FileSystem.getInfoAsync(photosDirectory);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(photosDirectory, { intermediates: true });
    }
    return photosDirectory;
  } catch (error) {
    console.error('❌ Erreur création dossier photos:', error);
    return null;
  }
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
// GESTION DES MESURES
// ============================================

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
// GESTION DES PHOTOS (CROSS-PLATFORM)
// ============================================

/**
 * Sauvegarde une photo - fonctionne sur toutes les plateformes
 */
export const savePhotoToStorage = async (
  sourceUri: string,
  date: string,
  weight?: number,
  notes?: string
): Promise<Photo | null> => {
  try {
    const id = generateId();
    const photosDir = await ensurePhotosDirectoryExists();
    
    let finalUri = sourceUri;
    let base64Data: string | undefined;
    
    // Si FileSystem disponible (mobile natif), copier le fichier
    if (photosDir && Platform.OS !== 'web') {
      try {
        const filename = `photo_${id}.jpg`;
        const destinationUri = `${photosDir}${filename}`;
        await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
        finalUri = destinationUri;
        console.log('✅ Photo copiée vers:', destinationUri);
      } catch (copyError) {
        console.warn('⚠️ Impossible de copier, utilisation de l\'URI original:', copyError);
        // Fallback : utiliser l'URI d'origine
      }
    } else {
      // Mode web/simulateur : essayer de lire en base64
      console.log('ℹ️ Mode sans FileSystem : stockage URI direct');
      if (Platform.OS !== 'web' && FileSystem.EncodingType) {
        try {
          base64Data = await FileSystem.readAsStringAsync(sourceUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          console.log('✅ Photo convertie en base64');
        } catch (b64Error) {
          console.log('ℹ️ Conversion base64 non disponible, utilisation URI direct');
        }
      }
    }

    const newPhoto: Photo = {
      id,
      date,
      file_uri: finalUri,
      base64: base64Data,
      weight,
      notes,
      created_at: new Date().toISOString(),
    };

    const photos = await getData<Photo>(STORAGE_KEYS.PHOTOS);
    photos.push(newPhoto);
    await saveData(STORAGE_KEYS.PHOTOS, photos);

    console.log('✅ Photo sauvegardée avec ID:', id);
    return newPhoto;
  } catch (error: any) {
    console.error('❌ Erreur sauvegarde photo:', error?.message || error);
    Alert.alert('Erreur', 'Impossible de sauvegarder la photo. Veuillez réessayer.');
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

  // Supprimer le fichier physique si possible
  if (Platform.OS !== 'web' && photoToDelete.file_uri && !photoToDelete.file_uri.startsWith('data:')) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(photoToDelete.file_uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(photoToDelete.file_uri);
        console.log('✅ Fichier photo supprimé:', photoToDelete.file_uri);
      }
    } catch (error) {
      console.warn('⚠️ Erreur suppression fichier photo:', error);
    }
  }

  const filteredPhotos = photos.filter(p => p.id !== id);
  await saveData(STORAGE_KEYS.PHOTOS, filteredPhotos);
  console.log('✅ Photo supprimée de AsyncStorage:', id);
  return true;
};

export const deleteAllPhotos = async (): Promise<boolean> => {
  const photos = await getData<Photo>(STORAGE_KEYS.PHOTOS);

  // Supprimer les fichiers physiques
  if (Platform.OS !== 'web') {
    for (const photo of photos) {
      try {
        if (photo.file_uri && !photo.file_uri.startsWith('data:')) {
          const fileInfo = await FileSystem.getInfoAsync(photo.file_uri);
          if (fileInfo.exists) {
            await FileSystem.deleteAsync(photo.file_uri);
          }
        }
      } catch (error) {
        console.warn('⚠️ Erreur suppression fichier:', error);
      }
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
      theme: 'dark',
      colorTheme: 'gold',
    };
  } catch (error) {
    console.error('❌ Erreur lecture paramètres:', error);
    return {
      weight_unit: 'kg',
      measurement_unit: 'cm',
      theme: 'dark',
      colorTheme: 'gold',
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
// GESTION DES CLUBS UTILISATEUR
// ============================================

export const getUserClubs = async (): Promise<UserClub[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_CLUBS);
    if (data) {
      return JSON.parse(data);
    }
    // Initialiser avec 3 clubs par défaut si vide
    const defaultClubs: UserClub[] = [
      {
        id: generateId(),
        name: 'Ma Salle',
        type: 'basic_fit',
        logoUri: null,
        created_at: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Mon Dojo',
        type: 'gracie_barra',
        logoUri: null,
        created_at: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Extérieur',
        type: 'running',
        logoUri: null,
        created_at: new Date().toISOString(),
      },
    ];
    await saveUserClubs(defaultClubs);
    return defaultClubs;
  } catch (error) {
    console.error('❌ Erreur lecture clubs:', error);
    return [];
  }
};

export const saveUserClubs = async (clubs: UserClub[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_CLUBS, JSON.stringify(clubs));
    console.log('✅ Clubs sauvegardés');
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde clubs:', error);
    return false;
  }
};

export const addUserClub = async (club: Omit<UserClub, 'id' | 'created_at'>): Promise<UserClub> => {
  const clubs = await getUserClubs();
  const newClub: UserClub = {
    ...club,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  clubs.push(newClub);
  await saveUserClubs(clubs);
  return newClub;
};

export const updateUserClub = async (clubId: string, updates: Partial<UserClub>): Promise<boolean> => {
  const clubs = await getUserClubs();
  const index = clubs.findIndex(c => c.id === clubId);
  if (index === -1) return false;
  clubs[index] = { ...clubs[index], ...updates };
  await saveUserClubs(clubs);
  return true;
};

export const deleteUserClub = async (clubId: string): Promise<boolean> => {
  const clubs = await getUserClubs();
  const filtered = clubs.filter(c => c.id !== clubId);
  await saveUserClubs(filtered);
  return true;
};

// ============================================
// GESTION DES ÉQUIPEMENTS (GEAR)
// ============================================

export const getUserGear = async (): Promise<UserGear[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_GEAR);
    if (data) {
      return JSON.parse(data);
    }
    // Initialiser avec 3 équipements par défaut si vide
    const defaultGear: UserGear[] = [
      {
        id: generateId(),
        name: 'Kimono Blanc',
        brand: 'Gracie Barra',
        type: 'kimono',
        photoUri: null,
        created_at: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Chaussures Running',
        brand: 'Nike',
        type: 'chaussure',
        photoUri: null,
        created_at: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Gants de Boxe',
        brand: 'Everlast',
        type: 'gants',
        photoUri: null,
        created_at: new Date().toISOString(),
      },
    ];
    await saveUserGear(defaultGear);
    return defaultGear;
  } catch (error) {
    console.error('❌ Erreur lecture équipements:', error);
    return [];
  }
};

export const saveUserGear = async (gear: UserGear[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_GEAR, JSON.stringify(gear));
    console.log('✅ Équipements sauvegardés');
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde équipements:', error);
    return false;
  }
};

export const addUserGear = async (gear: Omit<UserGear, 'id' | 'created_at'>): Promise<UserGear> => {
  const gearList = await getUserGear();
  const newGear: UserGear = {
    ...gear,
    id: generateId(),
    created_at: new Date().toISOString(),
  };
  gearList.push(newGear);
  await saveUserGear(gearList);
  return newGear;
};

export const updateUserGear = async (gearId: string, updates: Partial<UserGear>): Promise<boolean> => {
  const gearList = await getUserGear();
  const index = gearList.findIndex(g => g.id === gearId);
  if (index === -1) return false;
  gearList[index] = { ...gearList[index], ...updates };
  await saveUserGear(gearList);
  return true;
};

export const deleteUserGear = async (gearId: string): Promise<boolean> => {
  const gearList = await getUserGear();
  const filtered = gearList.filter(g => g.id !== gearId);
  await saveUserGear(filtered);
  return true;
};

// ============================================
// GESTION DU STATUT CORPOREL (BODY STATUS)
// ============================================

export interface BodyZoneData {
  status: 'ok' | 'warning' | 'injury';
  pain?: number; // 1-10 pour "warning"
  note?: string; // Note médicale pour "injury"
}

export interface BodyStatusData {
  [key: string]: BodyZoneData;
}

export const getUserBodyStatus = async (): Promise<BodyStatusData> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_BODY_STATUS);
    if (data) {
      return JSON.parse(data);
    }
    return {};
  } catch (error) {
    console.error('❌ Erreur lecture statut corporel:', error);
    return {};
  }
};

export const saveUserBodyStatus = async (status: BodyStatusData): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_BODY_STATUS, JSON.stringify(status));
    console.log('✅ Statut corporel sauvegardé');
    return true;
  } catch (error) {
    console.error('❌ Erreur sauvegarde statut corporel:', error);
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
// EXPORT / IMPORT (CROSS-PLATFORM)
// ============================================

export const exportData = async (): Promise<boolean> => {
  try {
    const stats = {
      measurements: (await getData(STORAGE_KEYS.MEASUREMENTS)).length,
      workouts: (await getData(STORAGE_KEYS.WORKOUTS)).length,
      photos: (await getData(STORAGE_KEYS.PHOTOS)).length,
    };

    const backupData: BackupData = {
      version: 1,
      date: new Date().toISOString(),
      stats,
      measurements: await getData(STORAGE_KEYS.MEASUREMENTS),
      workouts: await getData(STORAGE_KEYS.WORKOUTS),
      photos: await getData(STORAGE_KEYS.PHOTOS),
      settings: await getUserSettings(),
      badges: await getData(STORAGE_KEYS.USER_BADGES),
    };

    const jsonContent = JSON.stringify(backupData, null, 2);
    const filename = `yoroi_backup_${new Date().toISOString().split('T')[0]}.json`;

    // Sur le web, on ne peut pas utiliser FileSystem
    if (Platform.OS === 'web') {
      // Créer un lien de téléchargement
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      Alert.alert('Succès', 'Fichier de sauvegarde téléchargé !');
      return true;
    }

    // Sur mobile, utiliser FileSystem
    const cacheDir = getCacheDirectory();
    const docDir = getDocumentDirectory();
    const baseDirectory = cacheDir || docDir;

    if (!baseDirectory) {
      // Fallback : copier dans le presse-papier ou afficher les données
      Alert.alert(
        'Export alternatif',
        `Données exportées :\n- ${stats.measurements} mesures\n- ${stats.workouts} entraînements\n- ${stats.photos} photos\n\nLe système de fichiers n'est pas disponible sur ce simulateur.`,
        [{ text: 'OK' }]
      );
      console.log('📦 Données de backup:', jsonContent.substring(0, 500) + '...');
      return true;
    }

    const fileUri = `${baseDirectory}${filename}`;

    const writeOptions = { encoding: FileSystem.EncodingType.UTF8 };
    
    await FileSystem.writeAsStringAsync(fileUri, jsonContent, writeOptions);
    
    // Partager le fichier
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Sauvegarder vos données Yoroi',
      });
    } else {
      Alert.alert('Succès', `Fichier créé : ${filename}`);
    }
    
    return true;
  } catch (error: any) {
    console.error('❌ Erreur export:', error);
    Alert.alert('Erreur', `Impossible d'exporter : ${error?.message || 'Erreur inconnue'}`);
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

    let fileContent: string;
    
    if (Platform.OS === 'web') {
      // Sur le web, lire via fetch
      const response = await fetch(uri);
      fileContent = await response.text();
    } else {
      fileContent = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
    }
    
    const backup: BackupData = JSON.parse(fileContent);

    if (!backup || backup.version !== 1) {
      Alert.alert('Erreur', 'Le fichier de sauvegarde est invalide ou corrompu.');
      return false;
    }

    const confirm = await new Promise<boolean>((resolve) => {
      Alert.alert(
        'Attention',
        `Ceci va écraser TOUTES vos données actuelles.\n\nLe fichier contient :\n- ${backup.stats.measurements} mesures\n- ${backup.stats.workouts} entraînements\n- ${backup.stats.photos} photos\n\nContinuer ?`,
        [
          { text: 'Annuler', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirmer', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirm) {
      return false;
    }

    // Importer les données
    await saveData(STORAGE_KEYS.MEASUREMENTS, backup.measurements || []);
    await saveData(STORAGE_KEYS.WORKOUTS, backup.workouts || []);
    await saveData(STORAGE_KEYS.PHOTOS, backup.photos || []);
    await AsyncStorage.setItem(STORAGE_KEYS.USER_SETTINGS, JSON.stringify(backup.settings || {}));
    await saveData(STORAGE_KEYS.USER_BADGES, backup.badges || []);

    Alert.alert('Succès', 'Données restaurées avec succès !');
    console.log('📥 Données importées depuis le backup.');
    return true;
  } catch (error: any) {
    console.error('❌ Erreur importation:', error);
    Alert.alert('Erreur', `Impossible d'importer : ${error?.message || 'fichier invalide'}`);
    return false;
  }
};

export const resetAllData = async (): Promise<boolean> => {
  try {
    await deleteAllPhotos();
    await Promise.all([
      AsyncStorage.removeItem(STORAGE_KEYS.MEASUREMENTS),
      AsyncStorage.removeItem(STORAGE_KEYS.WORKOUTS),
      AsyncStorage.removeItem(STORAGE_KEYS.PHOTOS),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_SETTINGS),
      AsyncStorage.removeItem(STORAGE_KEYS.USER_BADGES),
    ]);
    console.log('🗑️ Toutes les données ont été réinitialisées.');
    return true;
  } catch (error) {
    console.error('❌ Erreur réinitialisation:', error);
    return false;
  }
};
