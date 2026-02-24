import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions, DeviceEventEmitter } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Home, BarChart2, Plus, Calendar, Wrench, User, Settings, BookOpen } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState, useEffect } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getTabOrder, getLeftTabs, getRightTabs, TAB_ORDER_CHANGED_EVENT } from '@/lib/tabOrderService';
import type { TabItem } from '@/lib/tabOrderService';

// ============================================
// TAB LAYOUT - FLOATING PILL TAB BAR
// 3 gauche | + | 4 droite - equilibre et propre
// ============================================

const { width: SCREEN_W } = Dimensions.get('window');

const ICON_SIZE = 20;
const ICON_SIZE_ACTIVE = 22;
const PILL_H = 62;
const PILL_BOTTOM = 20;
const PILL_R = 20;
const PILL_MARGIN = 10;
const PLUS_SIZE = 48;
const PLUS_SPACER = 54;

const isColorDark = (hex: string): boolean => {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) < 128;
};

// Icones par route
const ROUTE_ICONS: Record<string, any> = {
  index: Home,
  stats: BarChart2,
  carnet: BookOpen,
  planning: Calendar,
  more: Wrench,
  profile: User,
  settings: Settings,
};

// Labels par route
const ROUTE_LABELS: Record<string, string> = {
  index: 'Accueil',
  stats: 'Stats',
  carnet: 'Carnet',
  planning: 'Planning',
  more: 'Outils',
  profile: 'Profil',
  settings: 'Reglages',
};

// ============================================
// CUSTOM FLOATING PILL TAB BAR
// ============================================
function FloatingPillTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const plusScale = useRef(new Animated.Value(1)).current;
  const [tabOrder, setTabOrder] = useState<TabItem[] | null>(null);

  useEffect(() => {
    getTabOrder().then(setTabOrder);
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(TAB_ORDER_CHANGED_EVENT, () => {
      getTabOrder().then(setTabOrder);
    });
    return () => sub.remove();
  }, []);

  const pillBg = isDark ? '#1A1A1E' : colors.accent;
  const activeColor = isDark
    ? (isColorDark(colors.accent) ? '#FFFFFF' : colors.accent)
    : '#FFFFFF';
  const inactiveColor = isDark ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.5)';
  const dotColor = activeColor;

  // Bouton +
  const light = !isDark;
  const plusBg = light ? '#FFFFFF' : colors.accent;
  const plusBgDark = light ? '#F0F0F0' : colors.accentDark;
  const plusIcon = light ? colors.accent : colors.textOnAccent;

  // Contour pilule
  const pillBorder = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.35)';

  const handlePlusPress = () => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    Animated.sequence([
      Animated.spring(plusScale, { toValue: 0.85, useNativeDriver: true, speed: 50 }),
      Animated.spring(plusScale, { toValue: 1, useNativeDriver: true, speed: 20, bounciness: 10 }),
    ]).start();
    router.push('/add');
  };

  // Ordre: 3 gauche | + | 3 droite (equilibre)
  const leftNames = tabOrder ? getLeftTabs(tabOrder).map(t => t.id).filter(id => id !== 'profile') : ['index', 'stats', 'carnet'];
  const rightNames = tabOrder ? getRightTabs(tabOrder).map(t => t.id).filter(id => id !== 'profile') : ['planning', 'more', 'settings'];

  const leftRoutes = leftNames
    .map(name => state.routes.find(r => r.name === name))
    .filter(Boolean) as typeof state.routes;
  const rightRoutes = rightNames
    .map(name => state.routes.find(r => r.name === name))
    .filter(Boolean) as typeof state.routes;

  const renderTab = (route: typeof state.routes[0]) => {
    const routeIndex = state.routes.indexOf(route);
    const isFocused = state.index === routeIndex;
    const IconComp = ROUTE_ICONS[route.name];
    const label = ROUTE_LABELS[route.name] || route.name;
    if (!IconComp) return null;

    const onPress = () => {
      impactAsync(ImpactFeedbackStyle.Light);
      if (!isFocused) {
        navigation.navigate(route.name);
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        activeOpacity={0.7}
        style={styles.tabBtn}
      >
        <IconComp
          size={isFocused ? ICON_SIZE_ACTIVE : ICON_SIZE}
          color={isFocused ? activeColor : inactiveColor}
          strokeWidth={isFocused ? 2.5 : 1.8}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? activeColor : inactiveColor },
            isFocused && styles.tabLabelActive,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {/* Point indicateur actif */}
        {isFocused && (
          <View style={[styles.activeDot, { backgroundColor: dotColor }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.pillOuter} pointerEvents="box-none">
      {/* Bouton + flottant - integre dans la pilule */}
      <Animated.View style={[styles.plusBtn, { transform: [{ scale: plusScale }] }]}>
        <TouchableOpacity activeOpacity={0.85} onPress={handlePlusPress} style={styles.plusTouch}>
          <LinearGradient
            colors={[plusBg, plusBgDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[
              styles.plusGrad,
              {
                borderWidth: 2.5,
                borderColor: light ? colors.accent + '25' : 'rgba(255,255,255,0.15)',
              },
            ]}
          >
            <Plus size={22} color={plusIcon} strokeWidth={2.8} />
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>

      {/* Pilule - 3 | + | 4 */}
      <View style={[
        styles.pill,
        {
          backgroundColor: pillBg,
          borderColor: pillBorder,
          shadowColor: isDark ? '#000' : colors.accentDark,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: isDark ? 0.4 : 0.25,
          shadowRadius: 16,
        },
      ]}>
        {/* 3 onglets a gauche */}
        <View style={styles.tabGroup}>
          {leftRoutes.map(renderTab)}
        </View>

        {/* Espace pour le bouton + */}
        <View style={styles.plusSpacer} />

        {/* 4 onglets a droite */}
        <View style={styles.tabGroup}>
          {rightRoutes.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      tabBar={(props) => <FloatingPillTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tabs.Screen name="index" options={{ title: '' }} />
      <Tabs.Screen name="stats" options={{ title: '' }} />
      <Tabs.Screen name="carnet" options={{ title: '' }} />
      <Tabs.Screen name="planning" options={{ title: '' }} />
      <Tabs.Screen name="add" options={{ title: '' }} />
      <Tabs.Screen name="more" options={{ title: '' }} />
      <Tabs.Screen name="profile" options={{ title: '' }} />
      <Tabs.Screen name="settings" options={{ title: '' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  pillOuter: {
    position: 'absolute',
    bottom: PILL_BOTTOM,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  pill: {
    width: SCREEN_W - (PILL_MARGIN * 2),
    height: PILL_H,
    borderRadius: PILL_R,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 12,
    paddingHorizontal: 4,
  },

  // Groupe de tabs (gauche ou droite)
  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },

  // Chaque onglet
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    paddingHorizontal: 2,
    minWidth: 40,
  },

  // Label sous l'icone
  tabLabel: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: 3,
  },
  tabLabelActive: {
    fontWeight: '800',
  },

  // Point sous l'onglet actif
  activeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 3,
  },

  plusSpacer: {
    width: PLUS_SPACER,
  },

  plusBtn: {
    position: 'absolute',
    top: -20,
    zIndex: 10,
    width: PLUS_SIZE,
    height: PLUS_SIZE,
    borderRadius: PLUS_SIZE / 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 15,
  },
  plusTouch: {
    width: '100%',
    height: '100%',
    borderRadius: PLUS_SIZE / 2,
    overflow: 'hidden',
  },
  plusGrad: {
    width: '100%',
    height: '100%',
    borderRadius: PLUS_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.25)',
  },
});
