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

    // Auto-dismiss après 8 secondes
    setTimeout(() => {
      dismissHint();
    }, 8000);
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
          <Ionicons name="swap-horizontal" size={20} color="#FFFFFF" />
          <View style={styles.textContainer}>
            <Text style={styles.title}>Change de vue</Text>
            <Text style={styles.subtitle}>
              Appuie sur le bouton pour basculer{'\n'}entre mode Complet et Essentiel
            </Text>
          </View>
          <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.7)" />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 75,
    right: 60,
    zIndex: 1000,
    maxWidth: SCREEN_WIDTH - 80,
  },
  hintBox: {
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
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
