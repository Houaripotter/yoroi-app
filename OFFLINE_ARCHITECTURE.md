import AsyncStorage from '@react-native-async-storage/async-storage';
import { documentDirectory, cacheDirectory } from 'expo-file-system';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { Alert } from 'react-native';

const STORAGE_KEYS = {
  MEASUREMENTS: '@yoroi_measurements',
  WORKOUTS: '@yoroi_workouts',
  PHOTOS: '@yoroi_photos',
  USER_SETTINGS: '@yoroi_user_settings',
  USER_BADGES: '@yoroi_user_badges',
};

// --- GESTION DES CHEMINS ---
export const PHOTOS_DIRECTORY = `${documentDirectory}photos/`;
export const BACKUP_DIR = `${cacheDirectory}backups/`;

// Initialisation dossiers
const ensurePhotosDirectoryExists = async () => {
  const dirInfo = await FileSystem.getInfoAsync(PHOTOS_DIRECTORY);
  if (!dirInfo.exists) {
    await FileSystem.makeDirectoryAsync(PHOTOS_DIRECTORY, { intermediates: true });
  }
};

// --- CRUD GENERIQUE ---
const getData = async (key: string) => {
  try {
    const json = await AsyncStorage.getItem(key);
    return json ? JSON.parse(json) : [];
  } catch (e) { return []; }
};

const saveData = async (key: string, data: any[]) => {
  await AsyncStorage.setItem(key, JSON.stringify(data));
};

// --- FONCTIONS EXPORTÉES ---

// 1. MESURES
export const getMeasurements = () => getData(STORAGE_KEYS.MEASUREMENTS);
export const saveMeasurement = async (data: any) => {
  const list = await getMeasurements();
  const newItem = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() };
  await saveData(STORAGE_KEYS.MEASUREMENTS, [newItem, ...list]);
  return newItem;
};

// 2. WORKOUTS
export const getWorkouts = () => getData(STORAGE_KEYS.WORKOUTS);
export const saveWorkout = async (data: any) => {
  const list = await getWorkouts();
  const newItem = { ...data, id: Date.now().toString(), created_at: new Date().toISOString() };
  await saveData(STORAGE_KEYS.WORKOUTS, [newItem, ...list]);
  return newItem;
};
export const getWorkoutsForDate = async (date: string) => {
  const list = await getWorkouts();
  // @ts-ignore
  return list.filter(w => w.date === date);
};

// 3. PHOTOS (OFFLINE)
export const getPhotosFromStorage = () => getData(STORAGE_KEYS.PHOTOS);

export const savePhotoToStorage = async (uri: string, weight?: number) => {
  await ensurePhotosDirectoryExists();
  const filename = uri.split('/').pop() || `photo_${Date.now()}.jpg`;
  const newPath = PHOTOS_DIRECTORY + filename;
  
  await FileSystem.copyAsync({ from: uri, to: newPath });
  
  const newItem = { 
    id: Date.now().toString(), 
    uri: newPath, 
    date: new Date().toISOString(), 
    weight: weight || 0 
  };
  
  const list = await getPhotosFromStorage();
  await saveData(STORAGE_KEYS.PHOTOS, [newItem, ...list]);
  return newItem;
};

// 4. SETTINGS & EXPORT
export const getUserSettings = async () => {
  const list = await getData(STORAGE_KEYS.USER_SETTINGS);
  return list[0] || {};
};
export const saveUserSettings = async (settings: any) => {
  await saveData(STORAGE_KEYS.USER_SETTINGS, [settings]);
};

export const exportData = async () => {
  try {
    const data = {
      measurements: await getMeasurements(),
      workouts: await getWorkouts(),
      photos: await getPhotosFromStorage(),
      settings: await getUserSettings(),
    };
    const fileUri = `${documentDirectory}yoroi_backup.json`;
    await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(data), { encoding: FileSystem.EncodingType.UTF8 });
    await Sharing.shareAsync(fileUri);
    return true;
  } catch (e) {
    console.error(e);
    return false;
  }
};

export const importData = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({ type: 'application/json' });
    if (result.canceled) return false;
    
    const fileUri = result.assets[0].uri;
    const content = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
    const data = JSON.parse(content);
    
    if (data.measurements) await saveData(STORAGE_KEYS.MEASUREMENTS, data.measurements);
    if (data.workouts) await saveData(STORAGE_KEYS.WORKOUTS, data.workouts);
    if (data.photos) await saveData(STORAGE_KEYS.PHOTOS, data.photos);
    if (data.settings) await saveData(STORAGE_KEYS.USER_SETTINGS, [data.settings]);
    
    return true;
  } catch (e) {
    Alert.alert("Erreur", "Fichier invalide");
    return false;
  }
};

export const resetAllData = async () => AsyncStorage.clear();