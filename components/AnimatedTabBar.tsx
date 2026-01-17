import React, { useEffect, useRef } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Platform,
} from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { Home, BarChart2, Plus, Calendar, Menu } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// ANIMATED TAB BAR - FLOATING + WITH NOTCH
// Effet creux qui suit l'onglet actif
// Inspiré de l'app Wish List
// ============================================

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HEIGHT = 70;
const NOTCH_WIDTH = 72;
const NOTCH_HEIGHT = 38;
const BUTTON_SIZE = 56;

// Calcul des positions des onglets (sans compter le bouton central)
// On a 5 onglets: index(0), stats(1), add(2), planning(3), more(4)
// Le bouton + est en position 2, les autres sont répartis autour

const getTabXPosition = (index: number, tabCount: number): number => {
  const tabWidth = SCREEN_WIDTH / tabCount;
  return tabWidth * index + tabWidth / 2;
};

// Créer le path SVG avec le creux
const createTabBarPath = (notchX: number): string => {
  const width = SCREEN_WIDTH;
  const height = TAB_BAR_HEIGHT;
  const notchRadius = NOTCH_WIDTH / 2;
  const curveDepth = NOTCH_HEIGHT;

  // Points de contrôle pour la courbe du creux
  const leftCurveStart = notchX - notchRadius - 15;
  const rightCurveEnd = notchX + notchRadius + 15;

  return `
    M 0 ${curveDepth}
    L ${leftCurveStart} ${curveDepth}
    C ${leftCurveStart + 20} ${curveDepth} ${notchX - notchRadius} 0 ${notchX} 0
    C ${notchX + notchRadius} 0 ${rightCurveEnd - 20} ${curveDepth} ${rightCurveEnd} ${curveDepth}
    L ${width} ${curveDepth}
    L ${width} ${height}
    L 0 ${height}
    Z
  `;
};

// Composant SVG animé
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface TabBarProps extends BottomTabBarProps {}

export function AnimatedTabBar({ state, descriptors, navigation }: TabBarProps) {
  const { colors, themeColor, isDark } = useTheme();

  // Pour le thème classic en mode light, on inverse les couleurs du bouton +
  // L'utilisateur veut un bouton blanc avec "+" noir (pas noir avec "+" blanc)
  const isClassicLight = themeColor === 'classic' && !isDark;
  const plusButtonBgColor = isClassicLight ? '#FFFFFF' : colors.accent;
  const plusButtonBgColorDark = isClassicLight ? '#F5F5F5' : (colors.accentDark || colors.accent);
  const plusIconColor = isClassicLight ? '#000000' : colors.textOnAccent;

  // Position animée du creux
  const notchPosition = useRef(new Animated.Value(SCREEN_WIDTH / 2)).current;

  // Scale du bouton +
  const buttonScale = useRef(new Animated.Value(1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Animation pulse continue
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
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
  }, []);

  // Mettre à jour la position du creux quand l'onglet change
  useEffect(() => {
    // Le creux suit les onglets index (0), stats (1), planning (3)
    // Il reste centré pour "add" (2) et "more" (4)
    const activeIndex = state.index;
    let targetX: number;

    // Mapper les positions: on veut que le creux suive Home, Stats, Planning
    if (activeIndex === 0) {
      // Home - position 1 sur 5
      targetX = getTabXPosition(0, 5);
    } else if (activeIndex === 1) {
      // Stats - position 2 sur 5
      targetX = getTabXPosition(1, 5);
    } else if (activeIndex === 3) {
      // Planning - position 4 sur 5
      targetX = getTabXPosition(3, 5);
    } else {
      // Add ou More - centré
      targetX = SCREEN_WIDTH / 2;
    }

    Animated.spring(notchPosition, {
      toValue: targetX,
      useNativeDriver: false,
      tension: 60,
      friction: 10,
    }).start();
  }, [state.index]);

  // Couleurs
  const tabBarBg = '#0D0D0F';
  const tabBarInactiveColor = 'rgba(255,255,255,0.45)';
  const tabBarActiveColor = colors.accent;

  // Icônes par route
  const getIcon = (routeName: string, isFocused: boolean) => {
    const color = isFocused ? tabBarActiveColor : tabBarInactiveColor;
    const size = isFocused ? 26 : 24;
    const strokeWidth = isFocused ? 3 : 2;

    switch (routeName) {
      case 'index':
        return <Home size={size} color={color} strokeWidth={strokeWidth} />;
      case 'stats':
        return <BarChart2 size={size} color={color} strokeWidth={strokeWidth} />;
      case 'planning':
        return <Calendar size={size} color={color} strokeWidth={strokeWidth} />;
      case 'more':
        return <Menu size={size} color={color} strokeWidth={strokeWidth} />;
      default:
        return null;
    }
  };

  // Labels par route
  const getLabel = (routeName: string): string => {
    switch (routeName) {
      case 'index': return 'HOME';
      case 'stats': return 'STATS';
      case 'planning': return 'PLANNING';
      case 'more': return 'MENU';
      default: return '';
    }
  };

  const handlePressAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Animated.sequence([
      Animated.spring(buttonScale, {
        toValue: 0.85,
        useNativeDriver: true,
        speed: 50,
      }),
      Animated.spring(buttonScale, {
        toValue: 1,
        useNativeDriver: true,
        speed: 20,
        bounciness: 10,
      }),
    ]).start();

    navigation.navigate('add');
  };

  const handleTabPress = (routeName: string, isFocused: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!isFocused) {
      navigation.navigate(routeName);
    }
  };

  // Calculer le path actuel avec interpolation
  const [currentPath, setCurrentPath] = React.useState(createTabBarPath(SCREEN_WIDTH / 2));

  useEffect(() => {
    const listenerId = notchPosition.addListener(({ value }) => {
      setCurrentPath(createTabBarPath(value));
    });

    return () => notchPosition.removeListener(listenerId);
  }, []);

  return (
    <View style={styles.container}>
      {/* Bouton + flottant */}
      <Animated.View
        style={[
          styles.floatingButtonContainer,
          {
            left: notchPosition.interpolate({
              inputRange: [0, SCREEN_WIDTH],
              outputRange: [-BUTTON_SIZE / 2, SCREEN_WIDTH - BUTTON_SIZE / 2],
            }),
          },
        ]}
      >
        {/* Anneau pulse */}
        <Animated.View
          style={[
            styles.pulseRing,
            {
              transform: [{ scale: pulseAnim }],
              backgroundColor: isClassicLight ? 'rgba(0,0,0,0.08)' : `${colors.accent}15`,
              borderColor: isClassicLight ? 'rgba(0,0,0,0.15)' : `${colors.accent}30`,
            },
          ]}
        />

        {/* Bouton */}
        <Animated.View
          style={[
            styles.floatingButton,
            {
              transform: [{ scale: buttonScale }],
            },
          ]}
        >
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={handlePressAdd}
            style={styles.buttonTouchable}
            accessibilityLabel="Ajouter une entrée"
            accessibilityRole="button"
            accessibilityHint="Ouvre le menu d'ajout rapide"
          >
            <LinearGradient
              colors={[plusButtonBgColor, plusButtonBgColorDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.buttonGradient}
            >
              <View style={styles.shineEffect} />
              <Plus size={28} color={plusIconColor} strokeWidth={3.5} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>

      {/* Tab bar avec creux SVG */}
      <View style={styles.tabBarWrapper}>
        <Svg
          width={SCREEN_WIDTH}
          height={TAB_BAR_HEIGHT + NOTCH_HEIGHT}
          style={styles.svgContainer}
        >
          <Path
            d={currentPath}
            fill={tabBarBg}
          />
        </Svg>

        {/* Onglets */}
        <View style={styles.tabsContainer}>
          {state.routes.map((route, index) => {
            const isFocused = state.index === index;

            // Skip le bouton add (il est géré séparément)
            if (route.name === 'add') {
              return <View key={route.key} style={styles.tabItem} />;
            }

            const tabLabel = getLabel(route.name);
            return (
              <TouchableOpacity
                key={route.key}
                style={styles.tabItem}
                onPress={() => handleTabPress(route.name, isFocused)}
                activeOpacity={0.7}
                accessibilityLabel={`Onglet ${tabLabel}`}
                accessibilityRole="tab"
                accessibilityState={{ selected: isFocused }}
              >
                <View style={[
                  styles.iconWrapper,
                  isFocused && {
                    shadowColor: tabBarActiveColor,
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 1,
                    shadowRadius: 12,
                    elevation: 10,
                  }
                ]}>
                  {getIcon(route.name, isFocused)}
                </View>
                <Animated.Text
                  style={[
                    styles.tabLabel,
                    {
                      color: isFocused ? tabBarActiveColor : tabBarInactiveColor,
                      textShadowColor: isFocused ? tabBarActiveColor : 'transparent',
                      textShadowRadius: isFocused ? 8 : 0,
                    },
                  ]}
                >
                  {tabLabel}
                </Animated.Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  tabBarWrapper: {
    height: TAB_BAR_HEIGHT + NOTCH_HEIGHT + 25, // +25 pour padding bottom safe area
    paddingBottom: 25,
  },
  svgContainer: {
    position: 'absolute',
    bottom: 25,
  },
  tabsContainer: {
    flexDirection: 'row',
    height: TAB_BAR_HEIGHT,
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    paddingTop: NOTCH_HEIGHT,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Bouton flottant
  floatingButtonContainer: {
    position: 'absolute',
    bottom: TAB_BAR_HEIGHT + 25 - 10, // Positionné au-dessus du creux
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  pulseRing: {
    position: 'absolute',
    width: BUTTON_SIZE + 8,
    height: BUTTON_SIZE + 8,
    borderRadius: (BUTTON_SIZE + 8) / 2,
    borderWidth: 2,
  },
  floatingButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    borderRadius: BUTTON_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 15,
  },
  buttonTouchable: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    overflow: 'hidden',
  },
  buttonGradient: {
    width: '100%',
    height: '100%',
    borderRadius: BUTTON_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  shineEffect: {
    position: 'absolute',
    top: 8,
    left: 12,
    right: 12,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
});

export default AnimatedTabBar;
