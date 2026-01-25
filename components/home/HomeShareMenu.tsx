import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Platform,
} from 'react-native';
import {
  Share2,
  X,
  Calendar,
  Target,
  Trophy,
  Instagram,
  BarChart2,
} from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { router, useFocusEffect } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SHARE_BUTTON_KEY = '@yoroi_stats_share_button_hidden';

interface ShareOption {
  id: string;
  icon: any;
  label: string;
  route: string;
  colors: [string, string];
}

export const HomeShareMenu: React.FC = () => {
  const { colors, isDark } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const animation = useRef(new Animated.Value(0)).current;

  // Vérifier si le bouton doit être affiché
  // MASQUÉ PAR DÉFAUT - Ce bouton n'est plus utilisé (remplacé par ShareFloatingButton)
  useFocusEffect(
    React.useCallback(() => {
      const checkVisibility = async () => {
        try {
          const hidden = await AsyncStorage.getItem(SHARE_BUTTON_KEY);
          // Pour afficher ce bouton, il faut explicitement mettre 'show' dans AsyncStorage
          setIsVisible(hidden === 'show');
        } catch (error) {
          console.error('Error checking share button visibility:', error);
        }
      };
      checkVisibility();
    }, [])
  );

  const toggleMenu = () => {
    const toValue = isOpen ? 0 : 1;
    
    if (!isOpen) {
      impactAsync(ImpactFeedbackStyle.Medium);
    } else {
      impactAsync(ImpactFeedbackStyle.Light);
    }

    Animated.spring(animation, {
      toValue,
      friction: 7,
      tension: 40,
      useNativeDriver: true,
    }).start();

    setIsOpen(!isOpen);
  };

  const navigateToShare = (route: any) => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    toggleMenu();
    router.push(route);
  };

  const shareOptions: ShareOption[] = [
    {
      id: 'annuel',
      icon: Trophy,
      label: 'Annuel',
      route: '/social-share/year-counter-v2',
      colors: ['#FFD700', '#FFA500'], // Gold
    },
    {
      id: 'mensuel',
      icon: Calendar,
      label: 'Mensuel',
      route: '/social-share/monthly-recap-v2',
      colors: ['#00D4FF', '#0072FF'], // Blue
    },
    {
      id: 'hebdo',
      icon: BarChart2,
      label: 'Hebdo',
      route: '/social-share/weekly-recap-v2',
      colors: ['#10B981', '#059669'], // Green
    },
  ];

  // Ne pas afficher si désactivé dans les réglages
  if (!isVisible) return null;

  return (
    <View style={styles.container}>
      {/* Options verticales (déployées vers le haut) */}
      <View style={styles.optionsContainer}>
        {shareOptions.map((option, index) => {
          const translateY = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0, -(index + 1) * 75], // Décalage vers le haut
          });

          const opacity = animation.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: [0, 0, 1],
          });

          const scale = animation.interpolate({
            inputRange: [0, 1],
            outputRange: [0.5, 1],
          });

          return (
            <Animated.View
              key={option.id}
              style={[
                styles.optionWrapper,
                {
                  transform: [{ translateY }, { scale }],
                  opacity,
                },
              ]}
            >
              <TouchableOpacity
                onPress={() => navigateToShare(option.route)}
                activeOpacity={0.8}
                style={styles.optionButton}
              >
                <View style={[styles.labelWrapper, { backgroundColor: colors.accent }]}>
                  <Text style={[styles.optionLabel, { color: isDark ? '#000000' : '#FFFFFF' }]}>
                    {option.label}
                  </Text>
                </View>
                <LinearGradient
                  colors={option.colors}
                  style={styles.optionGradient}
                >
                  <option.icon size={20} color="#FFFFFF" strokeWidth={2.5} />
                </LinearGradient>
              </TouchableOpacity>
            </Animated.View>
          );
        })}
      </View>

      {/* Bouton principal */}
      <TouchableOpacity
        onPress={toggleMenu}
        activeOpacity={0.9}
        style={styles.mainButtonWrapper}
      >
        <LinearGradient
          colors={[colors.accent, colors.accentDark || colors.accent]}
          style={[styles.mainButton, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
        >
          {isOpen ? (
            <X size={24} color={isDark ? '#000000' : '#FFFFFF'} strokeWidth={3} />
          ) : (
            <Share2 size={24} color={colors.textOnAccent} strokeWidth={2.5} />
          )}
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 115 : 95, 
    right: 20, // Distance fixe du bord droit
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    width: 54, // Largeur identique au bouton pour l'alignement
  },
  optionsContainer: {
    position: 'absolute',
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    width: 54,
  },
  optionWrapper: {
    position: 'absolute',
    bottom: 0,
    right: 0, // Aligné sur le bord droit du container
    width: 200, // Largeur suffisante pour le label à gauche
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  labelWrapper: {
    backgroundColor: 'rgba(0,0,0,0.6)', // Fond plus sombre pour lisibilité sur tous fonds
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  optionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF', // Texte toujours blanc sur fond sombre pour le label
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionGradient: {
    width: 46,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  mainButtonWrapper: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  mainButton: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
