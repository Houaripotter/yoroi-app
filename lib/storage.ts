import { track } from '@/utils/telemetry';
import type { ZonesMeta } from './v2/seances/appleZonesSync';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { shareAsync, isAvailableAsync } from 'expo-sharing';
import { getDocumentAsync } from 'expo-document-picker';
import { DeviceEventEmitter, Platform } from 'react-native';
import logger from './security/logger';
import secureStorage from './security/secureStorage';
import { rebaseLocalUri } from './v2/sauvegarde/chemins';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { traduire } from '@/lib/i18n/tr';
// ThemeName supprimé - utilise maintenant string pour compatibilité avec le nouveau système de thèmes

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
    return null;
  }
  
  // Attendre que FileSystem soit prêt
  const docDir = FileSystem.documentDirectory;
  if (!docDir) {
    logger.warn('documentDirectory non disponible');
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
    logger.warn('cacheDirectory non disponible');
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
  USER_SETTINGS: '@yoroi_user_settings',
  USER_BADGES: '@yoroi_user_badges',
  USER_CLUBS: '@yoroi_user_clubs',
  USER_GEAR: '@yoroi_user_gear',
  USER_BODY_STATUS: '@yoroi_user_body_status',
  HYDRATION_LOG: '@yoroi_hydration_log',
  HYDRATION_SETTINGS: '@yoroi_hydration_settings',
  MOOD_LOG: '@yoroi_mood_log',
  HOME_LAYOUT: '@yoroi_home_layout',
  SELECTED_LOGO: '@yoroi_selected_logo',
} as const;

// ============================================
// LOGOS PREMIUM - Personnalisation
// ============================================

export type LogoVariant = 'default' | 'bleu_nuit' | 'indigo' | 'papier' | 'ardoise' | 'foret' | 'bordeaux' | 'crepuscule';

export interface LogoOption {
  id: LogoVariant;
  name: string;
  description: string;
  isPremium: boolean;
  image: any; // require() pour l'image
  /** couleur du fond de l'icone, pour la pastille de l'ecran de choix */
  color: string;
  /** nom de l'icone native (appiconset iOS, activity-alias Android), null pour l'icone par defaut */
  nativeName: string | null;
}

// Le logo v7 n.8 decline sur plusieurs fonds (16 octobre 2026). Les anciens choix
// (logo_new, logo1 a logo6) n'existent plus : getSelectedLogo les ramene a 'default'.
export const LOGO_OPTIONS: LogoOption[] = [
  { id: 'default', name: 'Noir', description: 'Logo officiel', isPremium: false, color: '#17151A', nativeName: null, image: require('@/assets/images/logos_couleurs/logo_default.png') },
  { id: 'bleu_nuit', name: 'Bleu nuit', description: traduire('Fond bleu nuit'), isPremium: false, color: '#1D2340', nativeName: 'BleuNuit', image: require('@/assets/images/logos_couleurs/logo_bleu_nuit.png') },
  { id: 'indigo', name: 'Indigo', description: 'Fond indigo', isPremium: false, color: '#2C4A84', nativeName: 'Indigo', image: require('@/assets/images/logos_couleurs/logo_indigo.png') },
  { id: 'papier', name: 'Papier', description: 'Fond clair', isPremium: false, color: '#F2F1EC', nativeName: 'Papier', image: require('@/assets/images/logos_couleurs/logo_papier.png') },
  { id: 'ardoise', name: 'Ardoise', description: 'Fond ardoise', isPremium: true, color: '#3A3F4A', nativeName: 'Ardoise', image: require('@/assets/images/logos_couleurs/logo_ardoise.png') },
  { id: 'foret', name: traduire('Forêt'), description: traduire('Fond vert forêt'), isPremium: true, color: '#1F3A2E', nativeName: 'Foret', image: require('@/assets/images/logos_couleurs/logo_foret.png') },
  { id: 'bordeaux', name: 'Bordeaux', description: 'Fond bordeaux', isPremium: true, color: '#4A1E2A', nativeName: 'Bordeaux', image: require('@/assets/images/logos_couleurs/logo_bordeaux.png') },
  { id: 'crepuscule', name: 'Crépuscule', description: traduire('Dégradé indigo vers nuit'), isPremium: true, color: '#2C4A84', nativeName: 'Crepuscule', image: require('@/assets/images/logos_couleurs/logo_crepuscule.png') },
];

/** ramene toute valeur inconnue (anciens logos, valeur corrompue) au logo par defaut */
export const normalizeLogoVariant = (value: string | null | undefined): LogoVariant =>
  LOGO_OPTIONS.some((o) => o.id === value) ? (value as LogoVariant) : 'default';

/** nom de l'icone native a appliquer pour un choix, null pour l'icone par defaut */
export const nativeIconNameFor = (value: string | null | undefined): string | null =>
  LOGO_OPTIONS.find((o) => o.id === normalizeLogoVariant(value))?.nativeName ?? null;

export const getSelectedLogo = async (): Promise<LogoVariant> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SELECTED_LOGO);
    return normalizeLogoVariant(data);
  } catch (error) {
    logger.error('Erreur chargement logo:', error);
    return 'default';
  }
};

export const saveSelectedLogo = async (logoId: LogoVariant): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.SELECTED_LOGO, logoId);
  } catch (error) {
    logger.error('Erreur sauvegarde logo:', error);
  }
};

// Alias pour compatibilité
export const setSelectedLogo = saveSelectedLogo;

// ============================================
// HOME LAYOUT - Ordre des sections accueil
// ============================================

export type HomeSectionId =
  | 'hero'
  | 'composition'
  | 'prediction'
  | 'shortcuts'
  | 'score_streak'
  | 'quests'
  | 'hydration'
  | 'activity_chart'
  | 'composition_chart'
  | 'quote';

export interface HomeSection {
  id: HomeSectionId;
  label: string;
  visible: boolean;
}

export const DEFAULT_HOME_SECTIONS: HomeSection[] = [
  { id: 'hero', label: 'Poids actuel', visible: true },
  { id: 'composition', label: 'Composition corporelle', visible: true },
  { id: 'prediction', label: 'Prédiction', visible: true },
  { id: 'shortcuts', label: 'Accès rapide', visible: true },
  { id: 'score_streak', label: 'Mon parcours', visible: true },
  { id: 'quests', label: 'Quêtes du jour', visible: true },
  { id: 'hydration', label: 'Hydratation', visible: true },
  { id: 'activity_chart', label: 'Activité semaine', visible: true },
  { id: 'composition_chart', label: 'Graphique composition', visible: true },
  { id: 'quote', label: 'Citation', visible: true },
];

export const getHomeLayout = async (): Promise<HomeSection[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HOME_LAYOUT);
    if (data) {
      let saved: HomeSection[] = [];
      try {
        saved = JSON.parse(data) as HomeSection[];
      } catch (parseError) {
        logger.error('JSON parse error in getHomeLayout:', parseError);
        return DEFAULT_HOME_SECTIONS;
      }
      // Merge avec les sections par défaut pour ajouter les nouvelles sections
      const merged = DEFAULT_HOME_SECTIONS.map(def => {
        const found = saved.find(s => s.id === def.id);
        return found || def;
      });
      // Réordonner selon l'ordre sauvegardé
      const orderedIds = saved.map(s => s.id);
      merged.sort((a, b) => {
        const aIdx = orderedIds.indexOf(a.id);
        const bIdx = orderedIds.indexOf(b.id);
        if (aIdx === -1) return 1;
        if (bIdx === -1) return -1;
        return aIdx - bIdx;
      });
      return merged;
    }
    return DEFAULT_HOME_SECTIONS;
  } catch (error) {
    logger.error('Erreur chargement home layout:', error);
    return DEFAULT_HOME_SECTIONS;
  }
};

export const saveHomeLayout = async (sections: HomeSection[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.HOME_LAYOUT, JSON.stringify(sections));
  } catch (error) {
    logger.error('Erreur sauvegarde home layout:', error);
  }
};

// ============================================
// TYPES
// ============================================

export interface Measurement {
  id: string;
  date: string;
  weight: number;
  // Niveau d'énergie (1-5)
  energyLevel?: number;
  // Composition en % (les deux formats pour compatibilite)
  body_fat?: number;
  bodyFat?: number;
  body_fat_kg?: number;
  muscle_mass?: number;
  muscle?: number;
  muscle_kg?: number;
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
  club_id?: string; // Lien avec un club spécifique (optionnel)
  created_at: string;
}

export interface Photo {
  id: string;
  date: string;
  file_uri: string;
  weight?: number;
  notes?: string;
  /** pose de la photo (vague 39) : face, profil ou dos */
  pose?: 'face' | 'profil' | 'dos';
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
  // Système de thèmes
  theme?: string;
  username?: string;
  reminder_enabled?: boolean;
  reminder_time?: string;
  reminder_days?: number[];
  routine_image_uri?: string | null;
  custom_club_logos?: { [key: string]: string };
  weekly_routine?: { [key: string]: { time: string; activity: string }[] };
  /** 28 octobre 2026 : 'neutral', reperes neutres (moyenne homme et femme, lib/genreCalcul.ts) */
  gender?: 'male' | 'female' | 'neutral';
  /** 26 octobre 2026 : « autre » declare a l'onboarding ; gender garde alors le repere des calculs (masse grasse, metabolisme) */
  genreDeclare?: 'autre' | null;
  /** 26 octobre 2026 : tranche d'age declaree (lib/v2/onboarding/trancheAge.ts), jamais l'age exact */
  trancheAge?: string;
  userClan?: 'GB' | 'MFC' | 'Ronin';
  userClubs?: UserClub[];
  goal?: 'lose_weight' | 'gain_muscle' | 'maintain' | 'improve_health' | 'lose' | 'gain';
  targetWeight?: number;
  onboardingCompleted?: boolean;
  // Personnalisation citations
  citationStyle?: 'motivation' | 'discipline' | 'mental' | 'warrior' | 'perseverance' | 'all';
  // Avatar utilisateur
  avatarUri?: string;
  // Zones cardiaques personnelles (seuils en BPM)
  heartRateZones?: {
    z1min?: number;
    z1max: number; // seuil Z1/Z2
    z2min?: number;
    z2max: number; // seuil Z2/Z3
    z3min?: number;
    z3max: number; // seuil Z3/Z4
    z4min?: number;
    z4max: number; // seuil Z4/Z5
    z5min?: number;
  };
  // 14 octobre 2026 (ios27) : d'ou viennent tes zones (Apple Sante, saisie a la main, estimation), quand
  // elles ont ete ecrites, derniere lecture d'Apple, message « Tes zones viennent d'Apple Santé » deja vu
  heartRateZonesMeta?: ZonesMeta;
}

export interface UserBadge {
  badge_id: string;
  unlocked_at: string;
}

export interface MoodEntry {
  id?: string;
  date: string;
  mood: string;
  energy: number;
  timestamp: string;
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
    logger.error('Erreur création dossier photos:', error);
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
    if (!data) return [];
    const parsed = JSON.parse(data);
    // Garantir qu'on retourne toujours un tableau
    if (!Array.isArray(parsed)) {
      logger.warn(`getData(${key}): valeur non-tableau détectée, reset à []`);
      return [];
    }
    return parsed;
  } catch (error) {
    // Erreur critique - logging multiple pour visibilité
    logger.warn(`ERREUR CRITIQUE - Lecture stockage ${key}:`, error);
    logger.error(`Erreur AsyncStorage.getItem (${key}):`, error);

    // L'app continue avec données vides, mais l'erreur est tracée
    return [];
  }
};

const saveData = async <T>(key: string, data: T[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(data));
    return true;
  } catch (error) {
    // Erreur critique - logging multiple pour visibilité
    logger.warn(`ERREUR CRITIQUE - Sauvegarde ${key}:`, error);
    logger.error(`Erreur AsyncStorage.setItem (${key}):`, error);

    // Détection erreur de quota (stockage plein)
    if (error instanceof Error && (
      error.message.includes('QuotaExceededError') ||
      error.message.includes('quota') ||
      error.message.includes('storage')
    )) {
      logger.warn('STOCKAGE PLEIN - Les données ne peuvent pas être sauvegardées');
    }

    return false;
  }
};

// ============================================
// SECURE STORAGE HELPERS FOR HEALTH DATA
// ============================================

let measurementsMigrationDone = false;
let photosMigrationDone = false;

/**
 * Migre les mesures de AsyncStorage vers SecureStorage (une seule fois)
 * Avec rétrocompatibilité: lit d'abord SecureStorage, puis AsyncStorage
 */
const migrateMeasurementsToSecureStorage = async (): Promise<void> => {
  if (measurementsMigrationDone) return;

  try {
    // Vérifier si des données existent déjà dans SecureStorage
    const secureData = await secureStorage.getItem(STORAGE_KEYS.MEASUREMENTS);
    if (secureData && Array.isArray(secureData) && secureData.length > 0) {
      measurementsMigrationDone = true;
      return;
    }

    // Essayer de récupérer les anciennes données depuis AsyncStorage
    const oldData = await AsyncStorage.getItem(STORAGE_KEYS.MEASUREMENTS);
    if (oldData) {
      const parsed = JSON.parse(oldData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Migrer vers SecureStorage
        // Ne supprimer l'ancienne copie que si l'écriture chiffrée a réussi (sinon perte de données)
        if (await secureStorage.setItem(STORAGE_KEYS.MEASUREMENTS, parsed)) {
          await AsyncStorage.removeItem(STORAGE_KEYS.MEASUREMENTS);
        }
        logger.info('[Storage] Migration mesures vers SecureStorage réussie');
      }
    }
  } catch (error) {
    logger.error('[Storage] Erreur migration mesures:', error);
  }

  measurementsMigrationDone = true;
};

/**
 * Récupère les données de mesures depuis SecureStorage
 */
const getSecureMeasurements = async (): Promise<Measurement[]> => {
  try {
    // Assurer la migration au premier accès
    await migrateMeasurementsToSecureStorage();

    const data = await secureStorage.getItem(STORAGE_KEYS.MEASUREMENTS);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.warn(`ERREUR CRITIQUE - Lecture stockage sécurisé mesures:`, error);
    logger.error(`Erreur secureStorage.getItem (measurements):`, error);
    return [];
  }
};

/**
 * Lecture STRICTE avant une écriture : si la lecture échoue, on lance une erreur
 * au lieu de renvoyer [] (sinon on réécrivait [nouvelle mesure] par-dessus tout l'historique).
 */
const getSecureMeasurementsForWrite = async (): Promise<Measurement[]> => {
  await migrateMeasurementsToSecureStorage();
  const data = await secureStorage.getItemStrict(STORAGE_KEYS.MEASUREMENTS);
  return Array.isArray(data) ? data : [];
};

/**
 * Sauvegarde les données de mesures dans SecureStorage
 */
const saveSecureMeasurements = async (data: Measurement[]): Promise<boolean> => {
  try {
    return await secureStorage.setItem(STORAGE_KEYS.MEASUREMENTS, data);
  } catch (error) {
    logger.warn(`ERREUR CRITIQUE - Sauvegarde stockage sécurisé mesures:`, error);
    logger.error(`Erreur secureStorage.setItem (measurements):`, error);
    return false;
  }
};

// ============================================
// STORAGE HELPERS FOR PHOTOS
// ============================================

// Clé AsyncStorage v2 (sans limite de taille, contrairement à SecureStore 2KB)
const PHOTOS_ASYNC_KEY = '@yoroi_photos_v2';

// Les anciennes listes (coffre SecureStore de la 2.x, puis ancienne cle AsyncStorage) sont reprises une fois
// pour toutes dans la cle v2, en AJOUTANT ce qui manque (jamais en remplacant). Le drapeau n'est pose
// qu'apres une lecture reussie du coffre : un coffre verrouille (reveil en arriere-plan) ne fait rien perdre,
// la reprise est simplement retentee au prochain acces. Les anciennes copies ne sont pas effacees.
const PHOTOS_LEGACY_DONE_KEY = '@yoroi_photos_v2_legacy_done';

const parsePhotoList = (raw: unknown): Photo[] => {
  if (Array.isArray(raw)) return raw as Photo[];
  if (typeof raw === 'string') {
    try {
      const p = JSON.parse(raw);
      return Array.isArray(p) ? p : [];
    } catch {
      return [];
    }
  }
  return [];
};

const stripBase64 = (list: Photo[]): Photo[] => list.map(({ base64, ...rest }: Photo & { base64?: string }) => rest);

/** Reprend les photos des anciennes versions dans la liste v2. Renvoie la liste a jour. */
const mergeLegacyPhotos = async (current: Photo[]): Promise<Photo[]> => {
  // Le drapeau est relu a chaque fois (une lecture rapide) : il fait foi, pas la memoire du lancement
  if ((await AsyncStorage.getItem(PHOTOS_LEGACY_DONE_KEY)) === '1') {
    photosMigrationDone = true;
    return current;
  }
  // Lecture stricte : si le coffre ne repond pas, on n'efface rien et on ne pose pas le drapeau
  const fromSecure = parsePhotoList(await secureStorage.getItemStrict(STORAGE_KEYS.PHOTOS));
  const fromOldAsync = parsePhotoList(await AsyncStorage.getItem(STORAGE_KEYS.PHOTOS));
  const keyOf = (p: Photo) => String(p.id || p.file_uri || '');
  const ids = new Set(current.map(keyOf));
  const extra = stripBase64([...fromSecure, ...fromOldAsync]).filter((p) => {
    if (!p || typeof p !== 'object') return false;
    const k = keyOf(p);
    if (!k || ids.has(k)) return false;
    ids.add(k);
    return true;
  });
  const merged = extra.length ? [...current, ...extra] : current;
  if (extra.length) {
    await AsyncStorage.setItem(PHOTOS_ASYNC_KEY, JSON.stringify(merged));
    // Verification : la liste relue doit contenir toutes les photos reprises
    const check = parsePhotoList(await AsyncStorage.getItem(PHOTOS_ASYNC_KEY));
    if (check.length < merged.length) throw new Error('verification des photos reprises echouee');
    logger.info(`[Storage] ${extra.length} photo(s) des anciennes versions reprise(s)`);
  }
  await AsyncStorage.setItem(PHOTOS_LEGACY_DONE_KEY, '1');
  photosMigrationDone = true;
  return merged;
};

/**
 * Récupère les photos : liste v2 (AsyncStorage, sans limite de taille) + reprise unique des anciennes listes.
 * Les chemins sont recollés sur le dossier actuel de l'app (il peut changer à la mise à jour sur iPhone).
 */
const readPhotosRaw = async (): Promise<Photo[]> => {
  const v2 = parsePhotoList(await AsyncStorage.getItem(PHOTOS_ASYNC_KEY));
  try {
    return await mergeLegacyPhotos(v2);
  } catch (error) {
    logger.warn('[Storage] Reprise des anciennes photos remise a plus tard:', error);
    return v2;
  }
};

/** Lecture STRICTE avant une écriture : une lecture ratée lance une erreur au lieu de renvoyer [] (sinon on écrasait la liste) */
const getSecurePhotosForWrite = async (): Promise<Photo[]> =>
  (await readPhotosRaw()).map((p) => (p && p.file_uri ? { ...p, file_uri: rebaseLocalUri(p.file_uri) } : p));

const getSecurePhotos = async (): Promise<Photo[]> => {
  try {
    const list = await readPhotosRaw();
    return list.map((p) => (p && p.file_uri ? { ...p, file_uri: rebaseLocalUri(p.file_uri) } : p));
  } catch (error) {
    logger.error('Erreur lecture photos:', error);
    return [];
  }
};

const saveSecurePhotos = async (data: Photo[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(PHOTOS_ASYNC_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    logger.error('Erreur sauvegarde photos:', error);
    return false;
  }
};

// ============================================
// GESTION DES MESURES
// ============================================

export const getAllMeasurements = async (): Promise<Measurement[]> => {
  const measurements = await getSecureMeasurements();
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
  const measurements = await getSecureMeasurementsForWrite();

  const newMeasurement: Measurement = {
    ...measurement,
    id: generateId(),
    created_at: new Date().toISOString(),
  };

  measurements.push(newMeasurement);
  await saveSecureMeasurements(measurements);

  return newMeasurement;
};

export const updateMeasurement = async (id: string, updates: Partial<Measurement>): Promise<boolean> => {
  const measurements = await getSecureMeasurementsForWrite();
  const index = measurements.findIndex(m => m.id === id);

  if (index === -1) return false;

  measurements[index] = { ...measurements[index], ...updates };
  return await saveSecureMeasurements(measurements);
};

export const deleteMeasurement = async (id: string): Promise<boolean> => {
  const measurements = await getSecureMeasurementsForWrite();
  const filtered = measurements.filter(m => m.id !== id);
  return await saveSecureMeasurements(filtered);
};

export const deleteAllMeasurements = async (): Promise<boolean> => {
  return await saveSecureMeasurements([]);
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
 * Sauvegarde une photo - stocke uniquement le file_uri (protégé par iOS sandbox)
 * SECURITE: Pas de stockage base64 - les photos restent dans le système de fichiers sécurisé
 */
export const savePhotoToStorage = async (
  sourceUri: string,
  date: string,
  weight?: number,
  notes?: string,
  pose?: Photo['pose']
): Promise<Photo | null> => {
  try {
    const id = generateId();
    const photosDir = await ensurePhotosDirectoryExists();

    let finalUri = sourceUri;

    // Si FileSystem disponible (mobile natif), copier le fichier dans le dossier sécurisé
    if (photosDir && Platform.OS !== 'web') {
      try {
        const filename = `photo_${id}.jpg`;
        const destinationUri = `${photosDir}${filename}`;
        await FileSystem.copyAsync({ from: sourceUri, to: destinationUri });
        finalUri = destinationUri;
      } catch (copyError) {
        logger.warn('Impossible de copier, utilisation de l\'URI original:', copyError);
        // Fallback : utiliser l'URI d'origine (toujours dans le sandbox iOS)
      }
    }

    const newPhoto: Photo = {
      id,
      date,
      file_uri: finalUri,
      weight,
      notes,
      ...(pose ? { pose } : {}),
      created_at: new Date().toISOString(),
    };

    const photos = await getSecurePhotosForWrite();
    photos.push(newPhoto);
    await saveSecurePhotos(photos);

    return newPhoto;
  } catch (error: unknown) {
    logger.error('Erreur sauvegarde photo:', error);
    appAlert('Oups', traduire('La photo n’a pas pu être enregistrée. Réessaie.'));
    return null;
  }
};

/** Lecture stricte des photos (avant de réécrire la liste, ex : restauration d'une sauvegarde) */
export const getPhotosStrict = async (): Promise<Photo[]> => getSecurePhotosForWrite();

export const getPhotosFromStorage = async (): Promise<Photo[]> => {
  const photos = await getSecurePhotos();
  return photos.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
};

/** Met a jour une photo du coffre (pose, poids, note) sans toucher au fichier */
export const updatePhotoInStorage = async (id: string, updates: Partial<Pick<Photo, 'pose' | 'weight' | 'notes'>>): Promise<boolean> => {
  const photos = await getSecurePhotosForWrite();
  const i = photos.findIndex(p => p.id === id);
  if (i === -1) return false;
  photos[i] = { ...photos[i], ...updates };
  await saveSecurePhotos(photos);
  return true;
};

export const deletePhotoFromStorage = async (id: string): Promise<boolean> => {
  const photos = await getSecurePhotosForWrite();
  const photoToDelete = photos.find(p => p.id === id);

  if (!photoToDelete) {
    return false;
  }

  // Supprimer le fichier physique si possible
  if (Platform.OS !== 'web' && photoToDelete.file_uri && !photoToDelete.file_uri.startsWith('data:')) {
    try {
      const fileInfo = await FileSystem.getInfoAsync(photoToDelete.file_uri);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(photoToDelete.file_uri);
      }
    } catch (error) {
      logger.warn('Erreur suppression fichier photo:', error);
    }
  }

  const filteredPhotos = photos.filter(p => p.id !== id);
  await saveSecurePhotos(filteredPhotos);
  return true;
};

export const deleteAllPhotos = async (): Promise<boolean> => {
  const photos = await getSecurePhotosForWrite();

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
        logger.warn('Erreur suppression fichier:', error);
      }
    }
  }

  return await saveSecurePhotos([]);
};

/**
 * Migration: Supprime les données base64 des photos existantes
 * SECURITE: Les photos ne doivent être stockées que comme file_uri (protégées par iOS sandbox)
 * Cette fonction nettoie les anciennes données base64 qui auraient pu être stockées
 */
export const migratePhotosRemoveBase64 = async (): Promise<void> => {
  try {
    const photos = await getSecurePhotosForWrite();
    if (photos.length > 0) {
      // Supprimer le champ base64 de chaque photo
      const cleanedPhotos = photos.map(({ base64, ...rest }: Photo & { base64?: string }) => rest);
      await saveSecurePhotos(cleanedPhotos);
      logger.info(`Migration: base64 supprimé de ${photos.length} photos`);
    }
  } catch (error) {
    logger.error('Migration error (remove base64):', error);
  }
};

// ============================================
// GESTION DES PARAMÈTRES UTILISATEUR
// ============================================

export const getUserSettings = async (): Promise<UserSettings> => {
  try {
    const data = await secureStorage.getItem(STORAGE_KEYS.USER_SETTINGS);
    return data || {
      weight_unit: 'kg',
      measurement_unit: 'cm',
      theme: 'classic',
    };
  } catch (error) {
    logger.error('Erreur lecture paramètres:', error);
    return {
      weight_unit: 'kg',
      measurement_unit: 'cm',
      theme: 'classic',
    };
  }
};

/**
 * Version stricte de getUserSettings : LANCE une erreur si la lecture échoue
 * (trousseau verrouillé, etc.) au lieu de renvoyer des réglages par défaut.
 * Utilisée uniquement pour décider s'il faut afficher l'onboarding.
 */
export const getUserSettingsStrict = async (): Promise<UserSettings> => {
  const data = await secureStorage.getItemStrict(STORAGE_KEYS.USER_SETTINGS);
  return data || {
    weight_unit: 'kg',
    measurement_unit: 'cm',
    theme: 'classic',
  };
};

export const saveUserSettings = async (settings: Partial<UserSettings>): Promise<boolean> => {
  try {
    const currentSettings = await getUserSettings();
    const newSettings = { ...currentSettings, ...settings };
    return await secureStorage.setItem(STORAGE_KEYS.USER_SETTINGS, newSettings);
  } catch (error) {
    logger.error('Erreur sauvegarde paramètres:', error);
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
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
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
    logger.error('Erreur lecture clubs:', error);
    return [];
  }
};

export const saveUserClubs = async (clubs: UserClub[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_CLUBS, JSON.stringify(clubs));
    return true;
  } catch (error) {
    logger.error('Erreur sauvegarde clubs:', error);
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
      try {
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
      } catch (parseError) {
        logger.error('JSON parse error in getUserGear:', parseError);
        return [];
      }
    }
    // Initialiser avec 3 équipements par défaut si vide
    const defaultGear: UserGear[] = [
      {
        id: generateId(),
        name: 'Kimono Blanc',
        brand: 'Mon kimono',
        type: 'kimono',
        photoUri: null,
        created_at: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Chaussures Running',
        brand: 'Mes chaussures',
        type: 'chaussure',
        photoUri: null,
        created_at: new Date().toISOString(),
      },
      {
        id: generateId(),
        name: 'Gants de Boxe',
        brand: 'Mes gants',
        type: 'gants',
        photoUri: null,
        created_at: new Date().toISOString(),
      },
    ];
    await saveUserGear(defaultGear);
    return defaultGear;
  } catch (error) {
    logger.error('Erreur lecture équipements:', error);
    return [];
  }
};

export const saveUserGear = async (gear: UserGear[]): Promise<boolean> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_GEAR, JSON.stringify(gear));
    return true;
  } catch (error) {
    logger.error('Erreur sauvegarde équipements:', error);
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

let bodyStatusMigrationDone = false;

const migrateBodyStatusToSecureStorage = async (): Promise<void> => {
  if (bodyStatusMigrationDone) return;
  try {
    const secureData = await secureStorage.getItem(STORAGE_KEYS.USER_BODY_STATUS);
    if (secureData && typeof secureData === 'object' && Object.keys(secureData).length > 0) {
      bodyStatusMigrationDone = true;
      return;
    }
    const oldData = await AsyncStorage.getItem(STORAGE_KEYS.USER_BODY_STATUS);
    if (oldData) {
      const parsed = JSON.parse(oldData);
      if (parsed && typeof parsed === 'object' && Object.keys(parsed).length > 0) {
        // Ne supprimer l'ancienne copie que si l'écriture chiffrée a réussi (sinon perte de données)
        if (await secureStorage.setItem(STORAGE_KEYS.USER_BODY_STATUS, parsed)) {
          await AsyncStorage.removeItem(STORAGE_KEYS.USER_BODY_STATUS);
        }
        logger.info('[Storage] Migration body status vers SecureStorage réussie');
      }
    }
  } catch (error) {
    logger.error('[Storage] Erreur migration body status:', error);
  }
  bodyStatusMigrationDone = true;
};

export const getUserBodyStatus = async (): Promise<BodyStatusData> => {
  try {
    await migrateBodyStatusToSecureStorage();
    const data = await secureStorage.getItem(STORAGE_KEYS.USER_BODY_STATUS);
    return (data && typeof data === 'object') ? data : {};
  } catch (error) {
    logger.error('Erreur lecture statut corporel:', error);
    return {};
  }
};

export const saveUserBodyStatus = async (status: BodyStatusData): Promise<boolean> => {
  try {
    return await secureStorage.setItem(STORAGE_KEYS.USER_BODY_STATUS, status);
  } catch (error) {
    logger.error('Erreur sauvegarde statut corporel:', error);
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

  return true;
};

// ============================================
// EXPORT / IMPORT (CROSS-PLATFORM)
// ============================================

export const exportData = async (): Promise<boolean> => {
  try {
    const measurements = await getSecureMeasurements();
    const stats = {
      measurements: measurements.length,
      workouts: (await getData(STORAGE_KEYS.WORKOUTS)).length,
      photos: (await getData(STORAGE_KEYS.PHOTOS)).length,
    };

    const backupData: BackupData = {
      version: 1,
      date: new Date().toISOString(),
      stats,
      measurements: measurements,
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
      appAlert(traduire('Sauvegarde prête'), traduire('Le fichier de sauvegarde est téléchargé.'));
      return true;
    }

    // Sur mobile, utiliser FileSystem
    const cacheDir = getCacheDirectory();
    const docDir = getDocumentDirectory();
    const baseDirectory = cacheDir || docDir;

    if (!baseDirectory) {
      // Fallback : copier dans le presse-papier ou afficher les données
      appAlert(
        'Export alternatif',
        traduire("Données exportées :\n- {0} mesures\n- {1} entraînements\n- {2} photos\n\nL’enregistrement de fichiers n’est pas disponible sur cet appareil.", stats.measurements, stats.workouts, stats.photos),
        [{ text: 'OK' }]
      );
      return true;
    }

    const fileUri = `${baseDirectory}${filename}`;

    const writeOptions = { encoding: FileSystem.EncodingType.UTF8 };
    
    await FileSystem.writeAsStringAsync(fileUri, jsonContent, writeOptions);
    
    // Partager le fichier
    const canShare = await isAvailableAsync();
    if (canShare) {
      await shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: traduire('Sauvegarder tes données Yoroi'),
      });
    } else {
      appAlert(traduire('Sauvegarde prête'), traduire("Fichier créé : {0}", filename));
    }
    
    return true;
  } catch (error: unknown) {
    logger.error('Erreur export:', error);
    appAlert('Oups', traduire('L’export n’a pas abouti. Réessaie.'));
    return false;
  }
};

export const importData = async (): Promise<boolean> => {
  try {
    const result = await getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled) {
      return false;
    }

    const uri = result.assets ? result.assets[0].uri : null;

    if (!uri) {
      appAlert(traduire('Aucun fichier'), traduire('Choisis un fichier de sauvegarde.'));
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

    let backup: BackupData;
    try {
      backup = JSON.parse(fileContent);
    } catch (parseError) {
      logger.error('JSON parse error in importData:', parseError);
      appAlert('Fichier illisible', traduire('Ce fichier de sauvegarde ne peut pas être lu.'));
      return false;
    }

    if (!backup || backup.version !== 1) {
      appAlert('Fichier illisible', traduire('Ce fichier de sauvegarde est abîmé ou incomplet.'));
      return false;
    }

    // Validate array contents
    if (!Array.isArray(backup.measurements) || !Array.isArray(backup.workouts) ||
        !Array.isArray(backup.photos) || !Array.isArray(backup.badges)) {
      appAlert('Fichier illisible', traduire('Ce fichier contient des données que YOROI ne reconnaît pas.'));
      return false;
    }

    const confirm = await new Promise<boolean>((resolve) => {
      appAlert(
        traduire('Remplacer tes données ?'),
        traduire("Toutes tes données actuelles seront remplacées.\n\nLe fichier contient :\n- {0} mesures\n- {1} entraînements\n- {2} photos\n\nContinuer ?", backup.stats.measurements, backup.stats.workouts, backup.stats.photos),
        [
          { text: traduire('Annuler'), style: 'cancel', onPress: () => resolve(false) },
          { text: 'Confirmer', style: 'destructive', onPress: () => resolve(true) },
        ]
      );
    });

    if (!confirm) {
      return false;
    }

    // Importer les données
    await saveSecureMeasurements(backup.measurements || []);
    await saveData(STORAGE_KEYS.WORKOUTS, backup.workouts || []);
    await saveData(STORAGE_KEYS.PHOTOS, backup.photos || []);
    await secureStorage.setItem(STORAGE_KEYS.USER_SETTINGS, backup.settings || {});
    await saveData(STORAGE_KEYS.USER_BADGES, backup.badges || []);

    appAlert(traduire('Restauration réussie'), traduire('Tes données sont revenues.'));
    return true;
  } catch (error: unknown) {
    logger.error('Erreur importation:', error);
    appAlert('Oups', traduire('L’import n’a pas abouti. Vérifie le fichier et réessaie.'));
    return false;
  }
};

// ============================================
// TOUT EFFACER (droit a l'effacement, RGPD)
// ============================================

export interface ResultatEffacement {
  /** true si chaque etape a abouti */
  ok: boolean;
  /** Etapes qui ont echoue (les autres ont quand meme ete faites) */
  echecs: string[];
}

/** Vide le contenu d'un dossier de l'app sans supprimer le dossier lui-meme */
const viderDossier = async (dir: string, filtre: (noms: string[]) => string[] = (n) => n): Promise<void> => {
  const noms = await FileSystem.readDirectoryAsync(dir);
  const aEffacer = filtre(noms);
  const erreurs: unknown[] = [];
  for (const nom of aEffacer) {
    try {
      await FileSystem.deleteAsync(`${dir}${nom}`, { idempotent: true });
    } catch (e) {
      erreurs.push(e);
    }
  }
  if (erreurs.length) throw new Error(`${erreurs.length} élément(s) non supprimé(s) dans ${dir}`);
};

/**
 * Efface TOUT ce que YOROI garde sur ce telephone, l'app repart comme neuve (onboarding compris).
 * Utilise par « Tout effacer », « Tout supprimer » et « Désinstallation propre ».
 *
 * Efface :
 * 1. les notifications programmees et affichees, la pastille et l'historique des notifications ;
 * 2. les appareils appaires pour la synchro ;
 * 3. toutes les tables SQLite (sauf le catalogue public des competitions, voir lib/effacementPlan.ts),
 *    les copies du mode demo (demo_bak_*), puis compacte la base pour ne rien laisser dans le fichier ;
 * 4. tous les fichiers de l'app dans Documents (photos, videos, sauvegardes JSON, exports PDF et CSV)
 *    et tout le cache ;
 * 5. les cles du trousseau (SecureStore), sauf le cache d'abonnement et le jeton du mode createur ;
 * 6. toutes les cles AsyncStorage, sans exception ;
 * 7. remet a zero les widgets, l'activite en direct et la montre.
 *
 * Ne peut pas effacer (et n'y touche pas) : ce qui a ete ecrit dans Apple Sante ou Health Connect,
 * les sauvegardes copiees dans le dossier cloud choisi, les images enregistrees dans la galerie.
 *
 * Chaque etape est tentee meme si une precedente echoue.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
// require plutot que import() : Jest ne sait pas executer import() ici, et Metro resout les deux pareil
export const effacerToutesMesDonnees = async (): Promise<ResultatEffacement> => {
  // mesure : envoye AVANT l'effacement (apres, le choix de consentement est lui aussi efface)
  track('donnees_effacees');
  const echecs: string[] = [];
  const etape = async (nom: string, fn: () => Promise<unknown>): Promise<void> => {
    try {
      await fn();
    } catch (e) {
      echecs.push(nom);
      logger.error(`[Effacement] ${nom}`, e);
    }
  };
  const plan = (require('./effacementPlan') as typeof import('./effacementPlan'));

  // 1. Notifications : plus rien ne doit se declencher apres l'effacement
  if (Platform.OS !== 'web') {
    await etape('notifications', async () => {
      const Notifications = (require('expo-notifications') as typeof import('expo-notifications'));
      await Notifications.cancelAllScheduledNotificationsAsync();
      await Notifications.dismissAllNotificationsAsync();
      await Notifications.setBadgeCountAsync(0).catch(() => false);
    });
  }
  await etape('historique des notifications', async () => {
    const { clearAll } = (require('./notificationHistoryService') as typeof import('./notificationHistoryService'));
    await clearAll();
  });

  // 2. Appareils appaires (cle de chiffrement de la synchro comprise)
  if (Platform.OS !== 'web') {
    await etape('appareils appairés', async () => {
      const { oublierTousLesAppareils } = (require('./peerSyncService') as typeof import('./peerSyncService'));
      await oublierTousLesAppareils();
    });
  }

  // 3. Base SQLite
  await etape('base de données', async () => {
    const { openDatabase } = (require('./database') as typeof import('./database'));
    const db = await openDatabase();
    if (!db) return; // web : pas de SQLite
    const lignes = await db.getAllAsync<{ name: string }>(
      'SELECT name FROM sqlite_master WHERE type = ?',
      ['table'],
    );
    const { aVider, aSupprimer } = plan.planDesTables(lignes.map((l) => l.name));
    // Les cles etrangeres sont coupees le temps de vider (l'ordre des tables n'importe plus),
    // ce reglage ne peut pas changer a l'interieur d'une transaction
    const fk = await db.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
    const fkActives = Number(fk?.foreign_keys ?? 0) === 1;
    if (fkActives) await db.execAsync('PRAGMA foreign_keys = OFF;');
    try {
      await db.withTransactionAsync(async () => {
        // Un nom de table ne peut pas etre passe en parametre « ? » : chaque nom vient de
        // sqlite_master et a ete valide par nomDeTableSur (lettres, chiffres, _ seulement)
        for (const t of aSupprimer) await db.execAsync(`DROP TABLE IF EXISTS "${t}";`);
        for (const t of aVider) await db.execAsync(`DELETE FROM "${t}";`);
        // Compteurs d'identifiants remis a zero (la table n'existe que si AUTOINCREMENT est utilise)
        const seq = await db.getFirstAsync<{ name: string }>(
          'SELECT name FROM sqlite_master WHERE type = ? AND name = ?',
          ['table', 'sqlite_sequence'],
        );
        if (seq) await db.execAsync('DELETE FROM sqlite_sequence;');
      });
    } finally {
      if (fkActives) await db.execAsync('PRAGMA foreign_keys = ON;');
    }
    // Les lignes effacees restent lisibles dans les pages libres du fichier tant qu'elles ne sont
    // pas reecrites : VACUUM reecrit le fichier, le checkpoint vide le journal WAL
    try {
      await db.execAsync('VACUUM;');
      await db.execAsync('PRAGMA wal_checkpoint(TRUNCATE);');
    } catch (e) {
      logger.warn('[Effacement] compactage de la base non fait', e);
    }
    logger.info(`[Effacement] ${aVider.length} tables vidées, ${aSupprimer.length} copies de démo supprimées`);
  });

  // 4. Fichiers : Documents (sauf le dossier de la base ouverte) et cache
  if (isFileSystemAvailable()) {
    const docs = getDocumentDirectory();
    const cache = getCacheDirectory();
    if (docs) await etape('fichiers', () => viderDossier(docs, plan.fichiersDocumentsAEffacer));
    if (cache) await etape('cache', () => viderDossier(cache));
  }

  // 5 et 6. Trousseau puis AsyncStorage (la liste des cles AsyncStorage sert aussi au trousseau)
  let clesAsync: string[] = [];
  try {
    clesAsync = [...(await AsyncStorage.getAllKeys())];
  } catch (e) {
    logger.warn('[Effacement] liste des clés AsyncStorage illisible', e);
  }
  await etape('trousseau', async () => {
    let cleCreateur: readonly string[] = [];
    try {
      cleCreateur = (require('./v2/creator/creatorStore') as typeof import('./v2/creator/creatorStore')).CREATOR_SECURE_KEYS;
    } catch {
      // Valeurs de lib/v2/creator/creatorStore.ts si le module ne se charge pas
      cleCreateur = ['yoroi_creator_token_v1', 'yoroi_creator_attempts_v1'];
    }
    const cles = plan.clesSecureAEffacer(clesAsync, cleCreateur);
    const resultats = await Promise.all(cles.map((k) => secureStorage.removeItem(k).catch(() => false)));
    const ratees = resultats.filter((r) => !r).length;
    if (ratees) throw new Error(`${ratees} clé(s) du trousseau non effacée(s)`);
  });
  await etape('réglages', async () => {
    await AsyncStorage.clear();
  });

  // 7. Widgets, activite en direct et montre : reecrits avec une app vide
  if (Platform.OS !== 'web') {
    await etape('widgets', async () => {
      const natif = (require('./v2/widgets/natif') as typeof import('./v2/widgets/natif'));
      try { natif.arreterActiviteNatif(); } catch { /* aucune activite en cours */ }
      const { ecrireWidgets } = (require('./v2/widgets/synchro') as typeof import('./v2/widgets/synchro'));
      await ecrireWidgets(true);
      const { syncWidget } = (require('./widgetSync') as typeof import('./widgetSync'));
      await syncWidget();
    });
    await etape('montre', async () => {
      const { envoyerContexteMontre } = (require('./v2/montre/synchro') as typeof import('./v2/montre/synchro'));
      await envoyerContexteMontre(true);
    });
  }

  // Les ecrans ouverts rechargent leurs listes (vides)
  for (const ev of ['YOROI_DATA_CHANGED', 'YOROI_PROFILE_CHANGED', 'YOROI_CLUBS_CHANGED', 'YOROI_PARTNERS_CHANGED']) {
    DeviceEventEmitter.emit(ev);
  }

  if (echecs.length) logger.warn(`[Effacement] terminé avec ${echecs.length} échec(s) : ${echecs.join(', ')}`);
  else logger.info('[Effacement] tout est effacé');
  return { ok: echecs.length === 0, echecs };
};
/* eslint-enable @typescript-eslint/no-require-imports */

// ============================================
// NETTOYAGE PAR RÉTENTION DE DONNÉES (RGPD)
// ============================================

const DATA_RETENTION_KEY = '@yoroi_data_retention';

const RETAINABLE_KEYS = [
  '@yoroi_workouts',
  '@yoroi_hydration_log',
];

// Clés hébergées dans SecureStore soumises à la même politique de rétention
const RETAINABLE_SECURE_KEYS = [
  '@yoroi_measurements',
  '@yoroi_sleep_entries',
  '@yoroi_mood_log',
  '@yoroi_injuries',
];

/**
 * Applique la politique de rétention des données.
 * Supprime les entrées plus anciennes que la durée configurée.
 * Appelé au démarrage de l'app.
 */
/**
 * 18 octobre 2026 (3.0.0) : purge en pause. Le reglage Conservation est masque (app/privacy-data.tsx),
 * on ne peut donc plus le changer ni le couper : une duree choisie avant continuerait d'effacer l'eau,
 * le sommeil et les blessures a chaque lancement sans que tu le voies. Rien n'est efface tant que c'est false.
 */
const RETENTION_ACTIVE = false;

export const applyDataRetention = async (): Promise<void> => {
  if (!RETENTION_ACTIVE) return;
  try {
    const retentionStr = await AsyncStorage.getItem(DATA_RETENTION_KEY);
    const retentionDays = retentionStr ? parseInt(retentionStr, 10) : 0;

    // 0 = conserver tout
    if (!retentionDays || retentionDays <= 0) return;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffISO = cutoffDate.toISOString();

    for (const key of RETAINABLE_KEYS) {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;

        const data = JSON.parse(raw);
        if (!Array.isArray(data)) continue;

        const filtered = data.filter((entry: any) => {
          const entryDate = entry.date || entry.timestamp || entry.createdAt;
          if (!entryDate) return true;
          return entryDate >= cutoffISO.slice(0, 10);
        });

        if (filtered.length < data.length) {
          await AsyncStorage.setItem(key, JSON.stringify(filtered));
          logger.info(`Data retention: cleaned ${data.length - filtered.length} old entries from ${key}`);
        }
      } catch (e) {
        logger.warn(`Data retention: failed to clean ${key}`, e);
      }
    }

    for (const key of RETAINABLE_SECURE_KEYS) {
      try {
        const data: any[] | null = await secureStorage.getItem(key);
        if (!Array.isArray(data)) continue;

        const filtered = data.filter((entry: any) => {
          const entryDate = entry.date || entry.timestamp || entry.createdAt;
          if (!entryDate) return true;
          return entryDate >= cutoffISO.slice(0, 10);
        });

        if (filtered.length < data.length) {
          await secureStorage.setItem(key, filtered);
          logger.info(`Data retention: cleaned ${data.length - filtered.length} old entries from ${key} (secure)`);
        }
      } catch (e) {
        logger.warn(`Data retention: failed to clean ${key} (secure)`, e);
      }
    }
  } catch (error) {
    logger.error('Data retention error:', error);
  }
};

// Fonction de debug pour voir toutes les données restantes
export const debugShowAllData = async (): Promise<void> => {
  // Fonction désactivée en production pour des raisons de sécurité
  if (!__DEV__) return;

  try {
    const allKeys = await AsyncStorage.getAllKeys();

    for (const key of allKeys) {
      const value = await AsyncStorage.getItem(key);
    }
  } catch (error) {
    logger.error('Erreur debug:', error);
  }
};

// ============================================
// GESTION DE L'HYDRATATION
// ============================================

export interface HydrationEntry {
  id: string;
  date: string; // Format YYYY-MM-DD
  amount: number; // en ml
  timestamp: string; // ISO timestamp
}

export interface HydrationSettings {
  dailyGoal: number; // en litres (par défaut calculé: poids × 0.033)
  customGoal?: number; // objectif personnalisé si défini
  reminderEnabled: boolean;
  reminderInterval: number; // en minutes (par défaut 120)
  trainingDayBonus: number; // en litres (par défaut 0.5)
}

export interface HydrationDayData {
  date: string;
  totalAmount: number; // en ml
  goal: number; // en ml
  entries: HydrationEntry[];
  isTrainingDay: boolean;
}

/**
 * Calcule l'objectif d'hydratation recommandé basé sur le poids
 * Formule: poids × 0.033 = litres recommandés
 */
export const calculateRecommendedHydration = (weightKg: number): number => {
  const liters = weightKg * 0.033;
  // Arrondir à 0.5L près
  return Math.round(liters * 2) / 2;
};

/**
 * Obtient les paramètres d'hydratation
 */
let hydrationSettingsMigrationDone = false;

const migrateHydrationSettingsToSecureStorage = async (): Promise<void> => {
  if (hydrationSettingsMigrationDone) return;
  try {
    const secureData = await secureStorage.getItem(STORAGE_KEYS.HYDRATION_SETTINGS);
    if (secureData && typeof secureData === 'object') {
      hydrationSettingsMigrationDone = true;
      return;
    }
    const oldData = await AsyncStorage.getItem(STORAGE_KEYS.HYDRATION_SETTINGS);
    if (oldData) {
      const parsed = JSON.parse(oldData);
      if (parsed) {
        // Ne supprimer l'ancienne copie que si l'écriture chiffrée a réussi (sinon perte de données)
        if (await secureStorage.setItem(STORAGE_KEYS.HYDRATION_SETTINGS, parsed)) {
          await AsyncStorage.removeItem(STORAGE_KEYS.HYDRATION_SETTINGS);
        }
        logger.info('[Storage] Migration paramètres hydratation vers SecureStorage réussie');
      }
    }
  } catch (error) {
    logger.error('[Storage] Erreur migration paramètres hydratation:', error);
  }
  hydrationSettingsMigrationDone = true;
};

export const getHydrationSettings = async (): Promise<HydrationSettings> => {
  const defaultSettings: HydrationSettings = {
    dailyGoal: 2.5,
    reminderEnabled: false,
    reminderInterval: 120,
    trainingDayBonus: 0.5,
  };
  try {
    await migrateHydrationSettingsToSecureStorage();
    const data = await secureStorage.getItem(STORAGE_KEYS.HYDRATION_SETTINGS);
    return (data && typeof data === 'object') ? data : defaultSettings;
  } catch (error) {
    logger.error('Erreur lecture paramètres hydratation:', error);
    return defaultSettings;
  }
};

export const saveHydrationSettings = async (settings: Partial<HydrationSettings>): Promise<boolean> => {
  try {
    const currentSettings = await getHydrationSettings();
    const newSettings = { ...currentSettings, ...settings };
    return await secureStorage.setItem(STORAGE_KEYS.HYDRATION_SETTINGS, newSettings);
  } catch (error) {
    logger.error('Erreur sauvegarde paramètres hydratation:', error);
    return false;
  }
};

/**
 * Obtient toutes les entrées d'hydratation
 */
export const getAllHydrationEntries = async (): Promise<HydrationEntry[]> => {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.HYDRATION_LOG);
    if (data) {
      const parsed = JSON.parse(data);
      return Array.isArray(parsed) ? parsed : [];
    }
    return [];
  } catch (error) {
    logger.error('Erreur lecture hydratation:', error);
    return [];
  }
};

/**
 * Obtient les entrées d'hydratation pour une date donnée
 */
export const getHydrationByDate = async (date: string): Promise<HydrationEntry[]> => {
  const allEntries = await getAllHydrationEntries();
  return allEntries.filter(e => e.date === date);
};

/**
 * Obtient le total d'hydratation pour une date donnée (en ml)
 */
export const getTodayHydration = async (): Promise<number> => {
  const today = new Date().toISOString().split('T')[0];
  const entries = await getHydrationByDate(today);
  return entries.reduce((sum, e) => sum + e.amount, 0);
};

/**
 * Ajoute une entrée d'hydratation
 */
export const addHydrationEntry = async (amount: number, date?: string): Promise<HydrationEntry> => {
  const entries = await getAllHydrationEntries();
  const now = new Date();

  const newEntry: HydrationEntry = {
    id: generateId(),
    date: date || now.toISOString().split('T')[0],
    amount,
    timestamp: now.toISOString(),
  };

  entries.push(newEntry);
  await AsyncStorage.setItem(STORAGE_KEYS.HYDRATION_LOG, JSON.stringify(entries));
  return newEntry;
};

/**
 * Supprime une entrée d'hydratation
 */
export const deleteHydrationEntry = async (id: string): Promise<boolean> => {
  try {
    const entries = await getAllHydrationEntries();
    const filtered = entries.filter(e => e.id !== id);
    await AsyncStorage.setItem(STORAGE_KEYS.HYDRATION_LOG, JSON.stringify(filtered));
    return true;
  } catch (error) {
    logger.error('Erreur suppression hydratation:', error);
    return false;
  }
};

/**
 * Obtient les données d'hydratation sur une période (en jours)
 */
export const getHydrationHistory = async (days: number): Promise<HydrationDayData[]> => {
  const allEntries = await getAllHydrationEntries();
  const settings = await getHydrationSettings();
  const workouts = await getAllWorkouts();

  const result: HydrationDayData[] = [];
  const today = new Date();

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];

    const dayEntries = allEntries.filter(e => e.date === dateStr);
    const isTrainingDay = workouts.some(w => w.date === dateStr);

    // Objectif ajusté si jour d'entraînement
    const baseGoal = (settings.customGoal || settings.dailyGoal) * 1000; // Convertir en ml
    const goal = isTrainingDay ? baseGoal + (settings.trainingDayBonus * 1000) : baseGoal;

    result.push({
      date: dateStr,
      totalAmount: dayEntries.reduce((sum, e) => sum + e.amount, 0),
      goal,
      entries: dayEntries,
      isTrainingDay,
    });
  }

  return result;
};

/**
 * Calcule la moyenne d'hydratation sur N jours
 */
export const getAverageHydration = async (days: number): Promise<number> => {
  const history = await getHydrationHistory(days);
  if (history.length === 0) return 0;

  const total = history.reduce((sum, day) => sum + day.totalAmount, 0);
  return total / history.length;
};

/**
 * Analyse la corrélation hydratation/poids (calcul local)
 * Retourne l'impact moyen sur le poids les jours de bonne hydratation
 */
export const analyzeHydrationWeightCorrelation = async (): Promise<{
  avgWeightLossHighHydration: number;
  avgWeightLossLowHydration: number;
  recommendation: string;
} | null> => {
  try {
    const hydrationHistory = await getHydrationHistory(30);
    const measurements = await getAllMeasurements();

    if (measurements.length < 7 || hydrationHistory.length < 7) {
      return null;
    }

    const settings = await getHydrationSettings();
    const goalMl = (settings.customGoal || settings.dailyGoal) * 1000;

    // Jours avec bonne hydratation (>= 80% objectif)
    const highHydrationDays = hydrationHistory.filter(d => d.totalAmount >= goalMl * 0.8);
    // Jours avec faible hydratation (< 80% objectif)
    const lowHydrationDays = hydrationHistory.filter(d => d.totalAmount < goalMl * 0.8 && d.totalAmount > 0);

    if (highHydrationDays.length < 3 || lowHydrationDays.length < 3) {
      return null;
    }

    // Calculer la variation de poids moyenne
    const sortedMeasurements = [...measurements].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    let weightChangeHigh = 0;
    let countHigh = 0;
    let weightChangeLow = 0;
    let countLow = 0;

    for (let i = 1; i < sortedMeasurements.length; i++) {
      const date = sortedMeasurements[i].date;
      const weightChange = sortedMeasurements[i].weight - sortedMeasurements[i - 1].weight;

      const hydrationDay = hydrationHistory.find(h => h.date === date);
      if (hydrationDay) {
        if (hydrationDay.totalAmount >= goalMl * 0.8) {
          weightChangeHigh += weightChange;
          countHigh++;
        } else if (hydrationDay.totalAmount > 0) {
          weightChangeLow += weightChange;
          countLow++;
        }
      }
    }

    const avgHigh = countHigh > 0 ? weightChangeHigh / countHigh : 0;
    const avgLow = countLow > 0 ? weightChangeLow / countLow : 0;

    let recommendation = '';
    if (avgHigh < avgLow) {
      const diff = Math.abs(avgLow - avgHigh).toFixed(2);
      recommendation = traduire("Les jours où tu bois plus de {0}L, tu perds en moyenne {1} kg de plus !", (goalMl * 0.8 / 1000).toFixed(1), diff);
    } else {
      recommendation = traduire('Continue à bien t\'hydrater pour optimiser ta perte de poids.');
    }

    return {
      avgWeightLossHighHydration: avgHigh,
      avgWeightLossLowHydration: avgLow,
      recommendation,
    };
  } catch (error) {
    logger.error('Erreur analyse corrélation:', error);
    return null;
  }
};


// ============================================
// GESTION DES RESSENTIS (MOOD)
// ============================================

let moodMigrationDone = false;

const migrateMoodToSecureStorage = async (): Promise<void> => {
  if (moodMigrationDone) return;
  try {
    const secureData = await secureStorage.getItem(STORAGE_KEYS.MOOD_LOG);
    if (secureData && Array.isArray(secureData) && secureData.length > 0) {
      moodMigrationDone = true;
      return;
    }
    const oldData = await AsyncStorage.getItem(STORAGE_KEYS.MOOD_LOG);
    if (oldData) {
      const parsed = JSON.parse(oldData);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Ne supprimer l'ancienne copie que si l'écriture chiffrée a réussi (sinon perte de données)
        if (await secureStorage.setItem(STORAGE_KEYS.MOOD_LOG, parsed)) {
          await AsyncStorage.removeItem(STORAGE_KEYS.MOOD_LOG);
        }
        logger.info('[Storage] Migration mood vers SecureStorage réussie');
      }
    }
  } catch (error) {
    logger.error('[Storage] Erreur migration mood:', error);
  }
  moodMigrationDone = true;
};

const getSecureMoods = async (): Promise<MoodEntry[]> => {
  try {
    await migrateMoodToSecureStorage();
    const data = await secureStorage.getItem(STORAGE_KEYS.MOOD_LOG);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    logger.error('Erreur lecture moods sécurisé:', error);
    return [];
  }
};

const saveSecureMoods = async (moods: MoodEntry[]): Promise<boolean> => {
  try {
    return await secureStorage.setItem(STORAGE_KEYS.MOOD_LOG, moods);
  } catch (error) {
    logger.error('Erreur sauvegarde moods sécurisé:', error);
    return false;
  }
};

export const saveMood = async (moodData: MoodEntry): Promise<boolean> => {
  try {
    const moods = await getSecureMoods();
    const newMood: MoodEntry = {
      ...moodData,
      id: generateId(),
    };
    moods.push(newMood);
    return await saveSecureMoods(moods);
  } catch (error) {
    logger.error('Erreur sauvegarde mood:', error);
    return false;
  }
};

export const getMoods = async (days?: number): Promise<MoodEntry[]> => {
  try {
    const moods = await getSecureMoods();
    if (!days) return moods;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return moods.filter(m => new Date(m.date) >= cutoffDate);
  } catch (error) {
    logger.error('Erreur récupération moods:', error);
    return [];
  }
};

export const getTodayMood = async (): Promise<MoodEntry | null> => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const moods = await getSecureMoods();
    return moods.find(m => m.date === today) || null;
  } catch (error) {
    logger.error('Erreur récupération mood du jour:', error);
    return null;
  }
};

