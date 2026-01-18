import { Platform, View, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Home, BarChart2, Plus, Calendar, Menu } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { RADIUS, SHADOWS } from '@/constants/appTheme';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef } from 'react';

// ============================================
// TAB LAYOUT - DYNAMIC THEME SUPPORT
// ============================================
// Tab bar with dynamic colors from ThemeContext
// Tous les onglets uniformes et symétriques
// ============================================

const ICON_SIZE = 24; // Taille uniforme pour toutes les icônes
const ICON_SIZE_ACTIVE = 26; // Plus grand quand actif
const ICON_STROKE_WIDTH_ACTIVE = 3;
const ICON_STROKE_WIDTH_INACTIVE = 2;

// ============================================
// FONCTION POUR DÉTECTER SI UNE COULEUR EST SOMBRE
// Si l'accent est sombre sur fond noir -> utiliser blanc (effet projecteur)
// ============================================
const isColorDark = (hexColor: string): boolean => {
  // Enlever le # si présent
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Calcul de luminance (seuil: 128 sur 255)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
  return luminance < 128;
};

// Couleur active pour tab bar (fond noir = besoin de couleur claire)
const getTabBarActiveColor = (accentColor: string): string => {
  // Si l'accent est sombre, utiliser blanc pour être visible sur fond noir
  if (isColorDark(accentColor)) {
    return '#FFFFFF';
  }
  // Sinon garder la couleur accent
  return accentColor;
};

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

// ============================================
// BOUTON BUZZER CENTRAL - DESIGN BRILLANT
// ============================================
function CentralBuzzerButton() {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Couleurs du bouton selon le mode
  // Mode clair: bouton BLANC avec + NOIR
  // Mode sombre: bouton coloré (accent) avec + blanc
  const isLightMode = !isDark;
  const buttonBgColor = isLightMode ? '#FFFFFF' : colors.accent;
  const buttonBgColorDark = isLightMode ? '#F0F0F0' : (colors.accent + 'DD');
  const plusIconColor = isLightMode ? '#1A1A1A' : colors.textOnAccent;
  const pulseColor = isLightMode ? 'rgba(0,0,0,0.08)' : `${colors.accent}20`;
  const pulseBorderColor = isLightMode ? 'rgba(0,0,0,0.15)' : `${colors.accent}40`;

  // Animation pulse continue pour l'anneau externe
  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.3,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Démarrer l'animation au montage
  React.useEffect(() => {
    startPulse();
  }, []);

  const handlePress = () => {
    // Haptic feedback fort
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    // Animation de pression
    Animated.sequence([
      Animated.spring(scaleAnim, {
        toValue: 0.85,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }),
    ]).start();

    // Navigation vers l'écran d'ajout complet (poids, mensurations, etc.)
    router.push('/add');
  };

  return (
    <View style={styles.buzzerContainer}>
      {/* Anneau externe pulsant */}
      <Animated.View
        style={[
          styles.pulseRing,
          {
            transform: [{ scale: pulseAnim }],
            backgroundColor: pulseColor,
            borderColor: pulseBorderColor,
          },
        ]}
      />

      {/* Bouton principal */}
      <Animated.View
        style={[
          styles.buzzerButton,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={handlePress}
          style={styles.buzzerTouchable}
        >
          <LinearGradient
            colors={[buttonBgColor, buttonBgColorDark, buttonBgColor]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.buzzerGradient,
              isLightMode && {
                shadowColor: '#000000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 8,
                borderWidth: 2,
                borderColor: 'rgba(0,0,0,0.1)',
              }
            ]}
          >
            {/* Effet de brillance en haut */}
            <View style={[styles.shineEffect, isLightMode && { backgroundColor: 'rgba(255,255,255,0.6)' }]} />

            {/* Icône + */}
            <Plus
              size={28}
              color={plusIconColor}
              strokeWidth={3.5}
            />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

export default function TabLayout() {
  const { colors } = useTheme();
  const { t } = useI18n();

  // Tab bar TOUJOURS noire (mode clair et sombre)
  const tabBarBg = '#0D0D0F';
  const tabBarInactiveColor = 'rgba(255,255,255,0.45)';
  const tabBarBorderColor = 'rgba(255,255,255,0.08)';

  // Couleur active: si accent sombre -> blanc (effet projecteur)
  const tabBarActiveColor = getTabBarActiveColor(colors.accent);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: tabBarActiveColor,
        tabBarInactiveTintColor: tabBarInactiveColor,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: tabBarBg,
            borderTopColor: tabBarBorderColor,
            // Glow effect FORT avec couleur active
            shadowColor: tabBarActiveColor,
            shadowOffset: { width: 0, height: -6 },
            shadowOpacity: 0.5,
            shadowRadius: 20,
          }
        ],
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '800',
          marginTop: 4,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          textShadowColor: tabBarActiveColor,
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: 8,
        },
        tabBarItemStyle: styles.tabBarItem,
      }}
      screenListeners={{
        tabPress: () => {
          triggerHaptic();
        },
      }}
    >
      {/* 1. ACCUEIL */}
      <Tabs.Screen
        name="index"
        options={{
          title: t('tabs.home'),
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.iconContainer,
              focused && {
                shadowColor: tabBarActiveColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 12,
                elevation: 10,
              }
            ]}>
              <Home
                size={focused ? ICON_SIZE_ACTIVE : ICON_SIZE}
                color={focused ? tabBarActiveColor : tabBarInactiveColor}
                strokeWidth={focused ? ICON_STROKE_WIDTH_ACTIVE : ICON_STROKE_WIDTH_INACTIVE}
              />
            </View>
          ),
        }}
      />

      {/* 2. STATS */}
      <Tabs.Screen
        name="stats"
        options={{
          title: t('tabs.stats'),
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.iconContainer,
              focused && {
                shadowColor: tabBarActiveColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 12,
                elevation: 10,
              }
            ]}>
              <BarChart2
                size={focused ? ICON_SIZE_ACTIVE : ICON_SIZE}
                color={focused ? tabBarActiveColor : tabBarInactiveColor}
                strokeWidth={focused ? ICON_STROKE_WIDTH_ACTIVE : ICON_STROKE_WIDTH_INACTIVE}
              />
            </View>
          ),
        }}
      />

      {/* 3. AJOUTER - BOUTON BUZZER CENTRAL */}
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarButton: () => <CentralBuzzerButton />,
        }}
      />

      {/* 4. PLANNING */}
      <Tabs.Screen
        name="planning"
        options={{
          title: t('tabs.planning'),
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.iconContainer,
              focused && {
                shadowColor: tabBarActiveColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 12,
                elevation: 10,
              }
            ]}>
              <Calendar
                size={focused ? ICON_SIZE_ACTIVE : ICON_SIZE}
                color={focused ? tabBarActiveColor : tabBarInactiveColor}
                strokeWidth={focused ? ICON_STROKE_WIDTH_ACTIVE : ICON_STROKE_WIDTH_INACTIVE}
              />
            </View>
          ),
        }}
      />

      {/* 5. MENU */}
      <Tabs.Screen
        name="more"
        options={{
          title: t('tabs.menu'),
          tabBarIcon: ({ focused }) => (
            <View style={[
              styles.iconContainer,
              focused && {
                shadowColor: tabBarActiveColor,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 12,
                elevation: 10,
              }
            ]}>
              <Menu
                size={focused ? ICON_SIZE_ACTIVE : ICON_SIZE}
                color={focused ? tabBarActiveColor : tabBarInactiveColor}
                strokeWidth={focused ? ICON_STROKE_WIDTH_ACTIVE : ICON_STROKE_WIDTH_INACTIVE}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 85,
    paddingBottom: 25,
    paddingTop: 12,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    elevation: 0,
  },
  tabBarLabel: {
    fontSize: 9,
    fontWeight: '700',
    marginTop: 4,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  tabBarItem: {
    paddingTop: 4,
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: ICON_SIZE,
    width: ICON_SIZE,
  },

  // ============================================
  // STYLES BOUTON BUZZER CENTRAL
  // ============================================
  buzzerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: -4, // Ajuster la position verticale
  },
  pulseRing: {
    position: 'absolute',
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    opacity: 0.4,
  },
  buzzerButton: {
    width: 52,
    height: 52,
    borderRadius: 26,
    // Ombres multiples pour effet 3D profond
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 10,
  },
  buzzerTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    overflow: 'hidden',
  },
  buzzerGradient: {
    width: '100%',
    height: '100%',
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    // Bordure brillante
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  shineEffect: {
    position: 'absolute',
    top: 6,
    left: 10,
    right: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.4)',
    opacity: 0.6,
  },
});
