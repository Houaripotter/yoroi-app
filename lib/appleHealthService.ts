import { Platform, Alert } from 'react-native';
import AppleHealthKit, {
  HealthValue,
  HealthKitPermissions,
  HealthInputOptions,
  HealthUnit,
} from 'react-native-health';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

const APPLE_HEALTH_ENABLED_KEY = '@yoroi_apple_health_enabled';
const LAST_SYNC_KEY = '@yoroi_last_health_sync';

// Permissions nécessaires
const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.BodyMassIndex,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
      AppleHealthKit.Constants.Permissions.LeanBodyMass,
    ],
    write: [
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.BodyMassIndex,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
    ],
  },
};

// Vérifier si Apple Health est disponible
export const isAppleHealthAvailable = (): boolean => {
  return Platform.OS === 'ios';
};

// Initialiser Apple Health et demander les permissions
export const initializeAppleHealth = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (!isAppleHealthAvailable()) {
      console.log('ℹ️  Apple Health non disponible sur cette plateforme');
      resolve(false);
      return;
    }

    AppleHealthKit.initHealthKit(permissions, (error) => {
      if (error) {
        console.error('❌ Erreur lors de l\'initialisation Apple Health:', error);
        resolve(false);
        return;
      }

      console.log('✅ Apple Health initialisé avec succès');
      resolve(true);
    });
  });
};

// Vérifier si l'utilisateur a accordé les permissions
export const checkHealthPermissions = async (): Promise<boolean> => {
  if (!isAppleHealthAvailable()) return false;

  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((error, available) => {
      if (error || !available) {
        resolve(false);
        return;
      }

      // Vérifier les permissions de lecture pour le poids
      AppleHealthKit.getAuthStatus(permissions, (authError, results) => {
        if (authError) {
          resolve(false);
          return;
        }

        const hasPermission = results?.permissions?.read?.includes(
          AppleHealthKit.Constants.Permissions.Weight
        );

        resolve(!!hasPermission);
      });
    });
  });
};

// Récupérer l'historique de poids depuis Apple Health
export const importWeightFromAppleHealth = async (): Promise<number> => {
  if (!isAppleHealthAvailable()) {
    Alert.alert('Erreur', 'Apple Health n\'est disponible que sur iOS');
    return 0;
  }

  try {
    // Initialiser si nécessaire
    const initialized = await initializeAppleHealth();
    if (!initialized) {
      Alert.alert('Erreur', 'Impossible d\'accéder à Apple Health. Vérifiez les permissions dans Réglages > Confidentialité > Santé');
      return 0;
    }

    // Récupérer les données de poids des 365 derniers jours
    const options: HealthInputOptions = {
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: new Date().toISOString(),
      ascending: true,
    };

    return new Promise((resolve) => {
      AppleHealthKit.getWeightSamples(options, async (error, results) => {
        if (error) {
          console.error('❌ Erreur lors de la récupération des poids:', error);
          Alert.alert('Erreur', 'Impossible de récupérer les données de poids');
          resolve(0);
          return;
        }

        if (!results || results.length === 0) {
          Alert.alert('Information', 'Aucune donnée de poids trouvée dans Apple Health');
          resolve(0);
          return;
        }

        console.log(`📊 ${results.length} mesures de poids trouvées dans Apple Health`);

        // Récupérer l'utilisateur
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          Alert.alert('Erreur', 'Vous devez être connecté pour importer des données');
          resolve(0);
          return;
        }

        // Récupérer les dates existantes pour éviter les doublons
        const { data: existingEntries } = await supabase
          .from('measurements')
          .select('created_at')
          .eq('user_id', user.id);

        const existingDates = new Set(
          existingEntries?.map(e => new Date(e.created_at).toISOString().split('T')[0]) || []
        );

        // Filtrer et préparer les nouvelles entrées
        const newEntries = results
          .filter(sample => {
            const date = new Date(sample.startDate).toISOString().split('T')[0];
            return !existingDates.has(date);
          })
          .map(sample => ({
            user_id: user.id,
            weight: sample.value,
            created_at: sample.startDate,
          }));

        if (newEntries.length === 0) {
          Alert.alert('Information', 'Toutes les données sont déjà importées');
          resolve(0);
          return;
        }

        // Insérer les nouvelles entrées
        const { error: insertError } = await supabase
          .from('measurements')
          .insert(newEntries);

        if (insertError) {
          console.error('❌ Erreur lors de l\'insertion:', insertError);
          Alert.alert('Erreur', 'Impossible d\'importer les données');
          resolve(0);
          return;
        }

        console.log(`✅ ${newEntries.length} nouvelles mesures importées`);
        Alert.alert('Succès', `${newEntries.length} mesure(s) importée(s) depuis Apple Health`);
        resolve(newEntries.length);
      });
    });
  } catch (error) {
    console.error('❌ Exception lors de l\'import:', error);
    Alert.alert('Erreur', 'Une erreur est survenue lors de l\'import');
    return 0;
  }
};

// Envoyer une mesure de poids vers Apple Health
export const exportWeightToAppleHealth = async (
  weight: number,
  date: Date = new Date()
): Promise<boolean> => {
  if (!isAppleHealthAvailable()) {
    console.log('ℹ️  Apple Health non disponible');
    return false;
  }

  try {
    // Vérifier si l'export automatique est activé
    const autoExportEnabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    if (autoExportEnabled !== 'true') {
      console.log('ℹ️  Export vers Apple Health désactivé');
      return false;
    }

    const options = {
      value: weight,
      startDate: date.toISOString(),
      endDate: date.toISOString(),
    };

    return new Promise((resolve) => {
      AppleHealthKit.saveWeight(options, (error) => {
        if (error) {
          console.error('❌ Erreur lors de l\'export du poids:', error);
          resolve(false);
          return;
        }

        console.log(`✅ Poids exporté vers Apple Health: ${weight} kg`);
        resolve(true);
      });
    });
  } catch (error) {
    console.error('❌ Exception lors de l\'export:', error);
    return false;
  }
};

// Envoyer l'IMC vers Apple Health
export const exportBMIToAppleHealth = async (
  bmi: number,
  date: Date = new Date()
): Promise<boolean> => {
  if (!isAppleHealthAvailable()) return false;

  try {
    const autoExportEnabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    if (autoExportEnabled !== 'true') return false;

    const options = {
      value: bmi,
      startDate: date.toISOString(),
      endDate: date.toISOString(),
    };

    return new Promise((resolve) => {
      AppleHealthKit.saveBmi(options, (error) => {
        if (error) {
          console.error('❌ Erreur lors de l\'export de l\'IMC:', error);
          resolve(false);
          return;
        }

        console.log(`✅ IMC exporté vers Apple Health: ${bmi}`);
        resolve(true);
      });
    });
  } catch (error) {
    console.error('❌ Exception lors de l\'export de l\'IMC:', error);
    return false;
  }
};

// Envoyer le taux de masse grasse vers Apple Health
export const exportBodyFatToAppleHealth = async (
  bodyFatPercentage: number,
  date: Date = new Date()
): Promise<boolean> => {
  if (!isAppleHealthAvailable()) return false;

  try {
    const autoExportEnabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    if (autoExportEnabled !== 'true') return false;

    const options = {
      value: bodyFatPercentage,
      startDate: date.toISOString(),
      endDate: date.toISOString(),
    };

    return new Promise((resolve) => {
      AppleHealthKit.saveBodyFatPercentage(options, (error) => {
        if (error) {
          console.error('❌ Erreur lors de l\'export de la masse grasse:', error);
          resolve(false);
          return;
        }

        console.log(`✅ Masse grasse exportée vers Apple Health: ${bodyFatPercentage}%`);
        resolve(true);
      });
    });
  } catch (error) {
    console.error('❌ Exception lors de l\'export de la masse grasse:', error);
    return false;
  }
};

// Activer/désactiver l'export automatique
export const setAppleHealthAutoExport = async (enabled: boolean): Promise<void> => {
  try {
    await AsyncStorage.setItem(APPLE_HEALTH_ENABLED_KEY, enabled ? 'true' : 'false');
    console.log(`✅ Export automatique Apple Health ${enabled ? 'activé' : 'désactivé'}`);
  } catch (error) {
    console.error('❌ Erreur lors de la sauvegarde des préférences:', error);
  }
};

// Vérifier si l'export automatique est activé
export const isAppleHealthAutoExportEnabled = async (): Promise<boolean> => {
  try {
    const enabled = await AsyncStorage.getItem(APPLE_HEALTH_ENABLED_KEY);
    return enabled === 'true';
  } catch (error) {
    console.error('❌ Erreur lors de la récupération des préférences:', error);
    return false;
  }
};

// Synchroniser les nouvelles données depuis Apple Health
export const syncFromAppleHealth = async (): Promise<number> => {
  if (!isAppleHealthAvailable()) return 0;

  try {
    const lastSync = await AsyncStorage.getItem(LAST_SYNC_KEY);
    const startDate = lastSync
      ? new Date(lastSync)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 jours par défaut

    const options: HealthInputOptions = {
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      ascending: true,
    };

    return new Promise((resolve) => {
      AppleHealthKit.getWeightSamples(options, async (error, results) => {
        if (error || !results || results.length === 0) {
          resolve(0);
          return;
        }

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
          resolve(0);
          return;
        }

        const { data: existingEntries } = await supabase
          .from('measurements')
          .select('created_at')
          .eq('user_id', user.id);

        const existingDates = new Set(
          existingEntries?.map(e => new Date(e.created_at).toISOString().split('T')[0]) || []
        );

        const newEntries = results
          .filter(sample => {
            const date = new Date(sample.startDate).toISOString().split('T')[0];
            return !existingDates.has(date);
          })
          .map(sample => ({
            user_id: user.id,
            weight: sample.value,
            created_at: sample.startDate,
          }));

        if (newEntries.length > 0) {
          await supabase.from('measurements').insert(newEntries);
          console.log(`✅ ${newEntries.length} nouvelles mesures synchronisées`);
        }

        // Mettre à jour la dernière date de sync
        await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());

        resolve(newEntries.length);
      });
    });
  } catch (error) {
    console.error('❌ Exception lors de la synchronisation:', error);
    return 0;
  }
};
