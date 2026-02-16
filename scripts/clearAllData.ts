// Script pour effacer toutes les données de test
import { resetDatabase } from '../lib/database';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllData = async () => {
  try {
    console.log('🗑️  Effacement de toutes les données...');
    
    // 1. Effacer toute la base de données SQLite
    await resetDatabase();
    console.log('✅ Base de données effacée');
    
    // 2. Effacer TOUT AsyncStorage (VRAIMENT TOUT)
    await AsyncStorage.clear();
    console.log('✅ AsyncStorage complètement vidé');
    
    console.log('✅ Toutes les données ont été effacées!');
    console.log('📱 Ferme et réouvre l\'app pour appliquer les changements');
    
    return { success: true };
  } catch (error) {
    console.error('❌ Erreur lors de l\'effacement:', error);
    return { success: false, error };
  }
};
