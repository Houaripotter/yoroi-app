// ============================================
// SHARE FLOATING BUTTON - Bouton partage avec menu popup
// Bouton rond NOIR avec 3 options qui montent au-dessus
// Connecté au toggle Menu → Apparence → Bouton Partage Stats
// ============================================

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Platform,
  View,
  Text,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Share2, Calendar, CalendarDays, CalendarRange, X } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@/lib/ThemeContext';

// Même clé que dans Menu → Apparence
const SHARE_BUTTON_KEY = '@yoroi_stats_share_button_hidden';

/**
 * Bouton rond NOIR avec menu popup
 * Affiche 3 options: Annuel, Mensuel, Hebdo
 * Connecté au toggle dans Menu → Apparence → Bouton Partage Stats
 */
export const ShareFloatingButton: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [isVisible, setIsVisible] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuAnim = useRef(new Animated.Value(0)).current;

  // Vérifier si le bouton doit être affiché (connecté au toggle Menu → Apparence)
  useFocusEffect(
    useCallback(() => {
      const checkVisibility = async () => {
        try {
          const hidden = await AsyncStorage.getItem(SHARE_BUTTON_KEY);
          setIsVisible(hidden !== 'true');
        } catch (error) {
          console.error('Error checking share button visibility:', error);
          setIsVisible(true);
        }
      };
      checkVisibility();
      // Fermer le menu quand on change d'écran
      setIsMenuOpen(false);
      menuAnim.setValue(0);
    }, [])
  );

  // Animation du menu
  useEffect(() => {
    Animated.spring(menuAnim, {
      toValue: isMenuOpen ? 1 : 0,
      damping: 15,
      stiffness: 150,
      useNativeDriver: true,
    }).start();
  }, [isMenuOpen]);

  const handleButtonPress = () => {
    impactAsync(ImpactFeedbackStyle.Medium);
    setIsMenuOpen(!isMenuOpen);
  };

  const handleOptionPress = (template: 'year-counter' | 'weekly-recap' | 'monthly-recap') => {
    impactAsync(ImpactFeedbackStyle.Light);
    setIsMenuOpen(false);
    // Navigation directe vers les cartes de partage existantes
    const routes: Record<string, string> = {
      'year-counter': '/social-share/year-counter-v2',
      'weekly-recap': '/social-share/weekly-recap-v2',
      'monthly-recap': '/social-share/monthly-recap-v2',
    };
    router.push(routes[template] as any);
  };

  // Ne rien afficher si désactivé dans les réglages
  if (!isVisible) return null;

  const menuOptions = [
    { id: 'year-counter', label: 'Annuel', icon: CalendarRange, color: '#8B5CF6' },
    { id: 'monthly-recap', label: 'Mensuel', icon: CalendarDays, color: '#10B981' },
    { id: 'weekly-recap', label: 'Hebdo', icon: Calendar, color: '#F59E0B' },
  ];

  return (
    <>
      {/* Overlay pour fermer le menu */}
      {isMenuOpen && (
        <TouchableWithoutFeedback onPress={() => setIsMenuOpen(false)}>
          <View style={styles.overlay} />
        </TouchableWithoutFeedback>
      )}

      <View style={styles.container}>
        {/* Menu popup avec 3 options */}
        <Animated.View
          style={[
            styles.menuContainer,
            {
              opacity: menuAnim,
              transform: [
                {
                  translateY: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
                {
                  scale: menuAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.8, 1],
                  }),
                },
              ],
            },
          ]}
          pointerEvents={isMenuOpen ? 'auto' : 'none'}
        >
          {menuOptions.map((option, index) => {
            const IconComponent = option.icon;
            return (
              <Animated.View
                key={option.id}
                style={{
                  transform: [
                    {
                      translateY: menuAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [10 * (index + 1), 0],
                      }),
                    },
                  ],
                }}
              >
                <TouchableOpacity
                  style={[
                    styles.menuOption,
                    { backgroundColor: isDark ? '#1E293B' : '#FFFFFF' },
                  ]}
                  onPress={() => handleOptionPress(option.id as any)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.menuOptionIcon, { backgroundColor: option.color + '20' }]}>
                    <IconComponent size={18} color={option.color} strokeWidth={2.5} />
                  </View>
                  <Text style={[styles.menuOptionText, { color: colors.textPrimary }]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </Animated.View>

        {/* Bouton principal - couleur du thème */}
        <TouchableOpacity
          onPress={handleButtonPress}
          activeOpacity={0.8}
          style={[
            styles.button,
            { backgroundColor: colors.accent },
            isMenuOpen && { backgroundColor: colors.accentDark || colors.accent },
          ]}
        >
          {isMenuOpen ? (
            <X size={24} color={colors.textOnAccent} strokeWidth={2.5} />
          ) : (
            <Share2 size={24} color={colors.textOnAccent} strokeWidth={2.5} />
          )}
        </TouchableOpacity>
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: -1000,
    left: -1000,
    right: -1000,
    bottom: -1000,
    backgroundColor: 'transparent',
    zIndex: 9998,
  },
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 115 : 95,
    right: 20,
    alignItems: 'center',
    zIndex: 9999,
  },
  menuContainer: {
    position: 'absolute',
    bottom: 64,
    right: 0,
    gap: 8,
    alignItems: 'flex-end',
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  menuOptionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuOptionText: {
    fontSize: 14,
    fontWeight: '700',
  },
  button: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  buttonActive: {
    backgroundColor: '#374151',
  },
});
