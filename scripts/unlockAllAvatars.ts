/**
 * Script pour débloquer tous les avatars
 * Active le Mode Créateur
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

async function unlockAllAvatars() {
  try {
    console.log('🔓 Activation du Mode Créateur...');
    
    // Activer le mode créateur (débloque tous les avatars)
    await AsyncStorage.setItem('@yoroi_creator_mode', 'true');
    
    console.log('✅ Mode Créateur activé !');
    console.log('✅ Tous les avatars sont maintenant débloqués !');
    console.log('');
    console.log('Redémarre l\'application pour voir les changements.');
  } catch (error) {
    console.error('❌ Erreur:', error);
  }
}

unlockAllAvatars();
