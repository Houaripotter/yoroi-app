// ============================================
// SCRIPT DE NETTOYAGE - CARNET D'ENTRAINEMENT
// Supprime toutes les données du carnet (benchmarks/skills)
// À EXÉCUTER UNE SEULE FOIS pour nettoyer l'app
// ============================================

import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS_TO_DELETE = [
  'yoroi_benchmarks_v2',
  'yoroi_skills_v2',
  'yoroi_carnet_initialized_v2',
];

export const clearAllCarnetData = async (): Promise<void> => {
  try {
    console.log('🧹 Nettoyage du carnet d\'entraînement...');

    // Supprimer toutes les clés du carnet
    await AsyncStorage.multiRemove(KEYS_TO_DELETE);

    console.log('✅ Carnet nettoyé avec succès !');
    console.log('📊 Records: 0');
    console.log('📚 Techniques: 0');
    console.log('🎯 Maîtrisées: 0');
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  }
};

// Fonction à appeler depuis l'app ou un écran de debug
export default clearAllCarnetData;
