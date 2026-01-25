// ============================================
// SHARE FLOATING BUTTON - Bouton partage stats SIMPLE
// Bouton rond NOIR simple qui va vers /share-hub
// PAS D'ANIMATION, PAS DE CROIX, SIMPLE ET FIXE
// Connecté au toggle Menu → Apparence → Bouton Partage Stats
// ============================================

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { Share2 } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Même clé que dans Menu → Apparence
const SHARE_BUTTON_KEY = '@yoroi_stats_share_button_hidden';

/**
 * Bouton simple rond NOIR qui navigue vers /share-hub
 * PAS d'animation, PAS de menu déroulant, PAS de croix
 * Connecté au toggle dans Menu → Apparence → Bouton Partage Stats
 */
export const ShareFloatingButton: React.FC = () => {
  const [isVisible, setIsVisible] = useState(true);

  // Vérifier si le bouton doit être affiché (connecté au toggle Menu → Apparence)
  useFocusEffect(
    useCallback(() => {
      const checkVisibility = async () => {
        try {
          const hidden = await AsyncStorage.getItem(SHARE_BUTTON_KEY);
          // Si 'true' → masqué, sinon → visible
          setIsVisible(hidden !== 'true');
        } catch (error) {
          console.error('Error checking share button visibility:', error);
          setIsVisible(true); // Par défaut visible
        }
      };
      checkVisibility();
    }, [])
  );

  const handlePress = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    router.push('/share-hub');
  };

  // Ne rien afficher si désactivé dans les réglages
  if (!isVisible) return null;

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
