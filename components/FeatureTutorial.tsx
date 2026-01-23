// ============================================
// YOROI - TUTORIEL DE FONCTIONNALITÉ
// Présentation des fonctionnalités avec OK/Plus tard
// ============================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { useTheme } from '@/lib/ThemeContext';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface FeatureTutorialProps {
  /** Identifiant unique de la fonctionnalité (ex: "charge", "planning", "infirmary") */
  featureId: string;
  /** Titre de la fonctionnalité */
  title: string;
  /** Description de la fonctionnalité */
  description: string;
  /** Liste de points clés à expliquer */
  keyPoints?: string[];
  /** Icône Ionicons à afficher */
  icon?: keyof typeof Ionicons.glyphMap;
  /** Callback quand l'utilisateur clique sur "OK, j'ai compris" */
  onDismiss?: () => void;
  /** Callback quand l'utilisateur clique sur "Plus tard" */
  onLater?: () => void;
}

export const FeatureTutorial: React.FC<FeatureTutorialProps> = ({
  featureId,
  title,
  description,
  keyPoints = [],
  icon = 'sparkles',
  onDismiss,
  onLater,
}) => {
  const { colors, isDark } = useTheme();
  const [visible, setVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    checkIfShouldShow();
  }, []);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const checkIfShouldShow = async () => {
    try {
      const key = `@yoroi_tutorial_${featureId}`;
      const hasShown = await AsyncStorage.getItem(key);
      if (!hasShown) {
        // Délai avant d'afficher le tutoriel
        setTimeout(() => {
          setVisible(true);
        }, 800);
      }
    } catch (error) {
      // En cas d'erreur, ne pas afficher
    }
  };

  const handleDismiss = async () => {
    impactAsync(ImpactFeedbackStyle.Medium);

    // Animation de sortie
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(async () => {
      setVisible(false);
      try {
        const key = `@yoroi_tutorial_${featureId}`;
        await AsyncStorage.setItem(key, 'true');
      } catch (error) {
        // Ignorer
      }
      onDismiss?.();
    });
  };

  const handleLater = async () => {
    impactAsync(ImpactFeedbackStyle.Light);

    // Animation de sortie
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setVisible(false);
      onLater?.();
    });
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        {/* Blur background */}
        <BlurView
          intensity={isDark ? 80 : 60}
          tint={isDark ? 'dark' : 'light'}
          style={StyleSheet.absoluteFill}
        />

        {/* Contenu */}
        <Animated.View
          style={[
            styles.container,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          <View style={[styles.card, { backgroundColor: colors.backgroundCard }]}>
            {/* Icône */}
            <View style={[styles.iconContainer, { backgroundColor: colors.accent + '20' }]}>
              <Ionicons name={icon} size={40} color={colors.accentText} />
            </View>

            {/* Titre */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {title}
            </Text>

            {/* Description */}
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {description}
            </Text>

            {/* Points clés */}
            {keyPoints.length > 0 && (
              <View style={styles.keyPointsContainer}>
                {keyPoints.map((point, index) => (
                  <View key={index} style={styles.keyPointRow}>
                    <View style={[styles.bullet, { backgroundColor: colors.accent }]} />
                    <Text style={[styles.keyPoint, { color: colors.textSecondary }]}>
                      {point}
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Boutons */}
            <View style={styles.buttonsContainer}>
              <TouchableOpacity
                style={[styles.laterButton, { backgroundColor: colors.border }]}
                onPress={handleLater}
                activeOpacity={0.7}
              >
                <Text style={[styles.laterButtonText, { color: colors.textMuted }]}>
                  Plus tard
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.okButton, { backgroundColor: colors.accent }]}
                onPress={handleDismiss}
                activeOpacity={0.8}
              >
                <Text style={styles.okButtonText}>
                  OK, j'ai compris
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    width: '100%',
    maxWidth: 400,
  },
  card: {
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 15,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 12,
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
  },
  keyPointsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 24,
  },
  keyPointRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  bullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 7,
  },
  keyPoint: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  buttonsContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  laterButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  laterButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  okButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  okButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default FeatureTutorial;
