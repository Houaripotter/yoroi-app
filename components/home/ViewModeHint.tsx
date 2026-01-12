// ============================================
// YOROI - HINT MODE D'AFFICHAGE
// Tooltip pour informer de la possibilité de changer de mode
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';

const VIEW_MODE_HINT_SHOWN_KEY = '@yoroi_view_mode_hint_shown';
const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface ViewModeHintProps {
  onDismiss?: () => void;
}

export const ViewModeHint: React.FC<ViewModeHintProps> = ({ onDismiss }) => {
  const { colors } = useTheme();
  const [shouldShow, setShouldShow] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  const checkIfShouldShow = async () => {
    try {
      const hasShown = await AsyncStorage.getItem(VIEW_MODE_HINT_SHOWN_KEY);
      if (!hasShown) {
        setShouldShow(true);
        // Délai avant d'afficher le hint pour laisser le temps à l'UI de se charger
        setTimeout(() => {
          showHint();
        }, 1500);
      }
    } catch (error) {
      // En cas d'erreur, ne pas afficher le hint
    }
  };

  const showHint = () => {
    // Animation d'entrée
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Animation de pulsation continue
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseLoop.start();

    // Ne plus auto-dismiss - l'utilisateur doit cliquer pour fermer
  };

  const dismissHint = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    // Animation de sortie
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -20,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      setShouldShow(false);
      try {
        await AsyncStorage.setItem(VIEW_MODE_HINT_SHOWN_KEY, 'true');
      } catch (error) {
        // Ignorer l'erreur
      }
      onDismiss?.();
    });
  };

  if (!shouldShow) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: slideAnim },
            { scale: pulseAnim },
          ],
        },
      ]}
    >
      <TouchableOpacity
        style={[styles.hintBox, { backgroundColor: colors.accent }]}
        onPress={dismissHint}
        activeOpacity={0.9}
      >
        {/* Flèche vers le haut */}
        <View style={[styles.arrow, { borderBottomColor: colors.accent }]} />

        <View style={styles.content}>
          <View style={styles.mainContent}>
            <View style={styles.iconHeader}>
              <Ionicons name="swap-horizontal" size={24} color="#FFFFFF" />
              <Text style={styles.mainTitle}>Personnalise ton Accueil</Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>2 modes d'affichage</Text>
              <Text style={styles.sectionText}>
                • Mode Complet : Toutes tes stats et outils{'\n'}
                • Mode Light : Vue simplifiée, essentiel seulement
              </Text>
              <Text style={styles.switchText}>
                ↻ Change avec le bouton en haut à droite
              </Text>
            </View>

            <View style={styles.infoSection}>
              <Text style={styles.sectionTitle}>Personnalisation avancée</Text>
              <Text style={styles.sectionText}>
                En bas de l'écran d'accueil, tu peux :{'\n'}
                • Réorganiser l'ordre des sections{'\n'}
                • Masquer/afficher les cartes{'\n'}
                • Créer ton dashboard sur mesure
              </Text>
            </View>

            <TouchableOpacity onPress={dismissHint} style={styles.dismissBtn}>
              <Text style={styles.dismissText}>J'ai compris</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 75,
    right: 20,
    left: 20,
    zIndex: 1000,
  },
  hintBox: {
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  arrow: {
    position: 'absolute',
    top: -8,
    right: 16,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  content: {
    width: '100%',
  },
  mainContent: {
    gap: 16,
  },
  iconHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  mainTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  infoSection: {
    gap: 6,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  sectionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    lineHeight: 20,
  },
  switchText: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  dismissBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  dismissText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  // Anciens styles pour compatibilité
  textContainer: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 2,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    lineHeight: 16,
  },
});

export default ViewModeHint;
