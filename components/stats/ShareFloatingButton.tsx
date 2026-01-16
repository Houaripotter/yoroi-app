/**
 * ShareFloatingButton.tsx
 * Bouton flottant pour partager les statistiques sur les réseaux sociaux
 * Peut être fermé définitivement par l'utilisateur
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Share2, X } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

const STORAGE_KEY = '@yoroi_stats_share_button_hidden';

export const ShareFloatingButton: React.FC = () => {
  // DÉSACTIVÉ - Bouton retiré car jugé moche
  return null;

  const { colors, isDark } = useTheme();
  const [isHidden, setIsHidden] = useState(true);
  const [isExpanded, setIsExpanded] = useState(true);
  const slideAnim = useState(new Animated.Value(0))[0];
  const scaleAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    checkVisibility();
  }, []);

  const checkVisibility = async () => {
    try {
      const hidden = await AsyncStorage.getItem(STORAGE_KEY);
      if (!hidden) {
        setIsHidden(false);
        // Animation d'entrée
        Animated.spring(slideAnim, {
          toValue: 1,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }).start();
      }
    } catch (error) {
      console.error('Error checking button visibility:', error);
    }
  };

  const handleClose = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Animation de sortie
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start(async () => {
        await AsyncStorage.setItem(STORAGE_KEY, 'true');
        setIsHidden(true);
      });
    } catch (error) {
      console.error('Error hiding button:', error);
    }
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animation du bouton
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    router.push('/share-hub');
  };

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(!isExpanded);
  };

  if (isHidden) return null;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            {
              translateX: slideAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [-200, 0],
              }),
            },
            { scale: scaleAnim },
          ],
          opacity: slideAnim,
        },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.button,
          {
            backgroundColor: isDark
              ? 'rgba(212, 175, 55, 0.15)'
              : 'rgba(212, 175, 55, 0.1)',
            borderColor: colors.gold + '40',
          },
        ]}
        onPress={handlePress}
        onLongPress={toggleExpanded}
        activeOpacity={0.8}
      >
        {/* Icône */}
        <View
          style={[
            styles.iconContainer,
            { backgroundColor: colors.gold + '20' },
          ]}
        >
          <Share2 size={18} color={colors.gold} strokeWidth={2.5} />
        </View>

        {/* Texte (si expanded) */}
        {isExpanded && (
          <View style={styles.textContainer}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              Partager
            </Text>
            <Text style={[styles.subtitle, { color: colors.textMuted }]}>
              Tes stats
            </Text>
          </View>
        )}

        {/* Bouton fermer */}
        <TouchableOpacity
          style={[
            styles.closeButton,
            { backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' },
          ]}
          onPress={handleClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <X size={14} color={colors.textMuted} strokeWidth={2.5} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 180,
    left: 16,
    zIndex: 99,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 24,
    borderWidth: 1.5,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: 160,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: -2,
  },
  closeButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
