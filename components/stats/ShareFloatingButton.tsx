/**
 * ShareFloatingButton.tsx
 * Bouton flottant pour partager les statistiques sur les réseaux sociaux
 * - Animation pulsation comme un cœur
 * - Se cache au scroll vers le bas, réapparaît au scroll vers le haut
 * - Bouton croix bien visible pour fermer
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
} from 'react-native';
import { Share2, X, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useI18n } from '@/lib/I18nContext';
import { useScrollContext } from '@/lib/ScrollContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const STORAGE_KEY = '@yoroi_stats_share_button_hidden';

export const ShareFloatingButton: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useI18n();
  const { scrollY, isScrollingDown } = useScrollContext();
  const [isHidden, setIsHidden] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  // Animations
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  const lastScrollYRef = useRef(0);
  const wasScrollingDown = useRef(false);

  // Animation pulsation cœur continue
  useEffect(() => {
    const heartbeatAnimation = Animated.loop(
      Animated.sequence([
        // Premier battement (fort)
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true,
        }),
        // Deuxième battement (léger)
        Animated.timing(pulseAnim, {
          toValue: 1.08,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
        // Pause entre les battements
        Animated.delay(800),
      ])
    );

    heartbeatAnimation.start();

    return () => heartbeatAnimation.stop();
  }, []);

  // Animation glow pulsante
  useEffect(() => {
    const glowAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    glowAnimation.start();

    return () => glowAnimation.stop();
  }, []);

  // Gérer le scroll pour cacher/montrer le bouton
  useEffect(() => {
    const listenerId = scrollY.addListener(({ value }) => {
      const diff = value - lastScrollYRef.current;

      // Scroll vers le bas - cacher le bouton (avec seuil)
      if (diff > 8 && !wasScrollingDown.current) {
        wasScrollingDown.current = true;
        Animated.spring(translateYAnim, {
          toValue: 200, // Déplacer vers le bas (hors écran)
          useNativeDriver: true,
          tension: 40,
          friction: 10,
        }).start();
      }
      // Scroll vers le haut - montrer le bouton
      else if (diff < -8 && wasScrollingDown.current) {
        wasScrollingDown.current = false;
        Animated.spring(translateYAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      }

      lastScrollYRef.current = value;
    });

    return () => scrollY.removeListener(listenerId);
  }, [scrollY]);

  // Vérifier si le bouton doit être affiché
  useEffect(() => {
    checkVisibility();
  }, []);

  const checkVisibility = async () => {
    try {
      const hidden = await AsyncStorage.getItem(STORAGE_KEY);
      // MASQUÉ PAR DÉFAUT - User trouve le bouton pulsant dérangeant
      // Pour l'afficher, il faut explicitement mettre 'false' dans AsyncStorage
      if (hidden === 'false') {
        setIsHidden(false);
        // Animation d'entrée
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 40,
          friction: 8,
        }).start();
      }
    } catch (error) {
      console.error('Error checking button visibility:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = async () => {
    try {
      impactAsync(ImpactFeedbackStyle.Medium);

      // Animation de sortie
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        await AsyncStorage.setItem(STORAGE_KEY, 'true');
        setIsHidden(true);
      });
    } catch (error) {
      console.error('Error hiding button:', error);
    }
  };

  const handlePress = () => {
    impactAsync(ImpactFeedbackStyle.Heavy);

    // Animation du bouton
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();

    router.push('/share-hub');
  };

  if (isLoading || isHidden) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateY: Animated.add(
                slideAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [100, 0],
                }),
                translateYAnim
              ),
            },
            { scale: Animated.multiply(scaleAnim, pulseAnim) },
          ],
          opacity: slideAnim,
        },
      ]}
    >
      {/* Glow effect derrière */}
      <Animated.View
        style={[
          styles.glowEffect,
          {
            backgroundColor: colors.accent,
            opacity: glowAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [0.3, 0.6],
            }),
            transform: [
              {
                scale: glowAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [1, 1.3],
                }),
              },
            ],
          },
        ]}
      />

      {/* Bouton principal */}
      <TouchableOpacity
        style={styles.mainButton}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <LinearGradient
          colors={[colors.accent, colors.accentDark || colors.accent]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradientButton}
        >
          {/* Effet brillant */}
          <View style={styles.shineEffect} />

          {/* Icône et texte */}
          <View style={styles.contentRow}>
            <View style={styles.iconWrapper}>
              <Share2 size={22} color={colors.textOnAccent} strokeWidth={2.5} />
              <Animated.View
                style={[
                  styles.sparkle,
                  {
                    opacity: glowAnim,
                    transform: [{ rotate: '15deg' }],
                  },
                ]}
              >
                <Sparkles size={12} color={colors.textOnAccent} />
              </Animated.View>
            </View>
            <View style={styles.textWrapper}>
              <Text style={[styles.buttonTitle, { color: colors.textOnAccent }]}>
                {t('share.shareButton') || 'Partager'}
              </Text>
              <Text style={[styles.buttonSubtitle, { color: colors.textOnAccent + 'CC' }]}>
                {t('share.yourStats') || 'Tes stats'}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>

      {/* Bouton fermer - bien visible en rouge */}
      <TouchableOpacity
        style={[
          styles.closeButton,
          {
            backgroundColor: '#EF4444',
            borderColor: '#F87171',
          },
        ]}
        onPress={handleClose}
        hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
      >
        <X size={20} color="#FFFFFF" strokeWidth={3} />
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 140,
    right: 16,
    zIndex: 999,
    alignItems: 'flex-end',
  },
  glowEffect: {
    position: 'absolute',
    width: 140,
    height: 56,
    borderRadius: 28,
    top: 4,
    right: 4,
  },
  mainButton: {
    borderRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  gradientButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 28,
    minWidth: 140,
    position: 'relative',
    overflow: 'hidden',
  },
  shineEffect: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: '50%',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconWrapper: {
    position: 'relative',
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sparkle: {
    position: 'absolute',
    top: -4,
    right: -4,
  },
  textWrapper: {
    justifyContent: 'center',
  },
  buttonTitle: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  buttonSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: -2,
  },
  closeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
});
