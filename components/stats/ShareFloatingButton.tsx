// ============================================
// SHARE FLOATING BUTTON - Bouton partage stats SIMPLE
// Bouton rond NOIR simple qui va vers /share-hub
// PAS D'ANIMATION, PAS DE CROIX, SIMPLE ET FIXE
// ============================================

import React from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Share2 } from 'lucide-react-native';
import { router } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';

/**
 * Bouton simple rond NOIR qui navigue vers /share-hub
 * PAS d'animation, PAS de menu déroulant, PAS de croix
 * Comme demandé par l'utilisateur
 */
export const ShareFloatingButton: React.FC = () => {
  const handlePress = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    router.push('/share-hub');
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
      style={styles.button}
    >
      <Share2 size={24} color="#FFFFFF" strokeWidth={2.5} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 115 : 95,
    right: 20,
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#000000', // NOIR SIMPLE
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 9999,
  },
});
