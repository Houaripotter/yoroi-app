import { View, Text, StyleSheet, TouchableOpacity, Animated, DeviceEventEmitter } from 'react-native';
import { Tabs, useRouter } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Home, BarChart2, Plus, Calendar, Wrench, Settings, BookOpen } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getTabOrder, getLeftTabs, getRightTabs, TAB_ORDER_CHANGED_EVENT } from '@/lib/tabOrderService';
import type { TabItem } from '@/lib/tabOrderService';
import { useResponsive } from '@/constants/responsive';

export const DEMO_CHANGED_EVENT = 'YOROI_DEMO_CHANGED';

// ============================================
// IMPORT PROGRESS BANNER
// ============================================
function ImportProgressBanner() {
  const [visible, setVisible] = useState(false);
  const [stepLabel, setStepLabel] = useState('');
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(7);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const { colors } = useTheme();

  const show = useCallback(() => {
    setVisible(true);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  }, [slideAnim]);

  const hide = useCallback(() => {
    Animated.timing(slideAnim, { toValue: -60, duration: 300, useNativeDriver: true }).start(() => {
      setVisible(false);
      setCurrent(0);
      setStepLabel('');
    });
  }, [slideAnim]);

  useEffect(() => {
    const subs = [
      DeviceEventEmitter.addListener('YOROI_IMPORT_START', () => {
        setCurrent(0); setStepLabel('Démarrage...'); setTotal(7);
        show();
      }),
      DeviceEventEmitter.addListener('YOROI_IMPORT_PROGRESS', (data: { step: string; current: number; total: number }) => {
        setStepLabel(data.step); setCurrent(data.current); setTotal(data.total);
      }),
      DeviceEventEmitter.addListener('YOROI_IMPORT_DONE', () => {
        setStepLabel('Import terminé !'); setCurrent(7);
        setTimeout(hide, 1800);
      }),
    ];
    return () => subs.forEach(s => s.remove());
  }, [show, hide]);

  if (!visible) return null;

  const progress = total > 0 ? current / total : 0;

  return (
    <Animated.View style={[bannerStyles.wrap, { transform: [{ translateY: slideAnim }] }]}>
      <View style={[bannerStyles.bar, { backgroundColor: colors.backgroundCard || '#1A1A2E' }]}>
        <View style={bannerStyles.row}>
          <View style={bannerStyles.dot} />
          <Text style={bannerStyles.label} numberOfLines={1}>
            Import santé — {stepLabel}
          </Text>
          <Text style={bannerStyles.counter}>{current}/{total}</Text>
        </View>
        <View style={bannerStyles.trackBg}>
          <Animated.View style={[bannerStyles.trackFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
      </View>
    </Animated.View>
  );
}

const bannerStyles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0, left: 0, right: 0,
    zIndex: 999,
    paddingHorizontal: 12,
    paddingTop: 52,
  },
  bar: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  dot: {
    width: 7, height: 7, borderRadius: 4,
    backgroundColor: '#3B82F6',
    marginRight: 8,
  },
  label: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#3B82F6',
  },
  counter: {
    fontSize: 12,
    fontWeight: '700',
    color: 'rgba(59,130,246,0.6)',
  },
  trackBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(59,130,246,0.15)',
    overflow: 'hidden',
  },
  trackFill: {
    height: 4,
    borderRadius: 2,
    backgroundColor: '#3B82F6',
  },
});

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
  settings: Settings,
};

// Labels par route
const ROUTE_LABELS: Record<string, string> = {
  index: 'Accueil',
  stats: 'Stats',
  carnet: 'Carnet',
  planning: 'Planning',
  more: 'Outils',
  settings: 'Reglages',
};

// ============================================
// CUSTOM FLOATING PILL TAB BAR
// ============================================
function FloatingPillTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors } = useTheme();
  const router = useRouter();
  const plusScale = useRef(new Animated.Value(1)).current;
  const plusRotate = useRef(new Animated.Value(0)).current;
  const [tabOrder, setTabOrder] = useState<TabItem[] | null>(null);
  const { pillWidth, s, fs, isIPad: pad, isSmallPhone } = useResponsive();

  const ICON_SIZE = s(isSmallPhone ? 20 : 22);
  const ICON_SIZE_ACTIVE = s(isSmallPhone ? 22 : 24);
  const PILL_H = s(pad ? 72 : 68);
  const PILL_BOTTOM = s(pad ? 28 : 22);
  const PILL_R = 22;
  const PLUS_SIZE = s(pad ? 56 : isSmallPhone ? 46 : 50);

  useEffect(() => {
    getTabOrder().then(setTabOrder);
  }, []);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(TAB_ORDER_CHANGED_EVENT, () => {
      getTabOrder().then(setTabOrder);
    });
    return () => sub.remove();
  }, []);

  // Fond = couleur du thème, texte adapté (blanc si accent foncé, noir si clair)
  const pillBg = colors.accent;
  const pillIsDark = isColorDark(pillBg);
  const activeColor = pillIsDark ? '#FFFFFF' : '#000000';
  const inactiveColor = pillIsDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';

  // Bouton + : contraste avec la pilule
  const plusBg = pillIsDark ? '#FFFFFF' : '#000000';
  const plusBgDark = pillIsDark ? '#F0F0F0' : '#1A1A1A';
  const plusIcon = pillIsDark ? '#000000' : '#FFFFFF';

  // Contour pilule
  const pillBorder = pillIsDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)';

  const handlePlusPress = () => {
    impactAsync(ImpactFeedbackStyle.Heavy);
    Animated.parallel([
      Animated.sequence([
        Animated.spring(plusScale, { toValue: 0.82, useNativeDriver: true, speed: 50 }),
        Animated.spring(plusScale, { toValue: 1, useNativeDriver: true, speed: 18, bounciness: 12 }),
      ]),
      Animated.sequence([
        Animated.timing(plusRotate, { toValue: 1, duration: 150, useNativeDriver: true }),
        Animated.timing(plusRotate, { toValue: 0, duration: 150, useNativeDriver: true }),
      ]),
    ]).start();
    router.push('/add');
  };

  const plusRotateInterpolate = plusRotate.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '90deg'],
  });

  // Ordre: 3 gauche | + | 3 droite (equilibre)
  const leftNames = tabOrder ? getLeftTabs(tabOrder).map(t => t.id) : ['index', 'stats', 'carnet'];
  const rightNames = tabOrder ? getRightTabs(tabOrder).map(t => t.id) : ['planning', 'more', 'settings'];

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
        style={[styles.tabBtn, { minWidth: s(pad ? 56 : isSmallPhone ? 40 : 46) }]}
      >
        {isFocused && (
          <View style={[
            styles.activeBackground,
            { backgroundColor: pillIsDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)' },
          ]} />
        )}
        <IconComp
          size={isFocused ? ICON_SIZE_ACTIVE : ICON_SIZE}
          color={isFocused ? activeColor : inactiveColor}
          strokeWidth={isFocused ? 2.4 : 1.7}
        />
        <Text
          style={[
            styles.tabLabel,
            { color: isFocused ? activeColor : inactiveColor, fontSize: fs(isSmallPhone ? 9 : 10) },
            isFocused && styles.tabLabelActive,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
        {isFocused && (
          <View style={[styles.activeDot, { backgroundColor: activeColor }]} />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.pillOuter, { bottom: PILL_BOTTOM }]} pointerEvents="box-none">
      <View style={[
        styles.pill,
        {
          width: pillWidth,
          height: PILL_H,
          borderRadius: PILL_R,
          backgroundColor: pillBg,
          borderColor: pillBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 16,
        },
      ]}>
        {/* Onglets a gauche */}
        <View style={styles.tabGroup}>
          {leftRoutes.map(renderTab)}
        </View>

        {/* Bouton + integre au centre */}
        <Animated.View style={[
          styles.plusContainer,
          { width: PLUS_SIZE, height: PLUS_SIZE },
          { transform: [{ scale: plusScale }, { rotate: plusRotateInterpolate }] },
        ]}>
          <TouchableOpacity activeOpacity={0.85} onPress={handlePlusPress} style={styles.plusTouch}>
            <LinearGradient
              colors={[plusBg, plusBgDark]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.plusGrad,
                {
                  borderColor: 'rgba(0,0,0,0.10)',
                  shadowColor: '#000',
                },
              ]}
            >
              <Plus size={24} color={plusIcon} strokeWidth={2.8} />
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Onglets a droite */}
        <View style={styles.tabGroup}>
          {rightRoutes.map(renderTab)}
        </View>
      </View>
    </View>
  );
}

export default function TabLayout() {
  const [tabsKey, setTabsKey] = useState(0);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(DEMO_CHANGED_EVENT, () => {
      setTabsKey(k => k + 1);
    });
    return () => sub.remove();
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        key={tabsKey}
        tabBar={(props) => <FloatingPillTabBar {...props} />}
        screenOptions={{ headerShown: false }}
      >
        <Tabs.Screen name="index" options={{ title: '' }} />
        <Tabs.Screen name="stats" options={{ title: '' }} />
        <Tabs.Screen name="carnet" options={{ title: '' }} />
        <Tabs.Screen name="planning" options={{ title: '' }} />
        <Tabs.Screen name="add" options={{ title: '' }} />
        <Tabs.Screen name="more" options={{ title: '' }} />
        <Tabs.Screen name="settings" options={{ title: '' }} />
      </Tabs>
      <ImportProgressBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  pillOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  pill: {
    // width, height, borderRadius fournis dynamiquement
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 16,
    paddingHorizontal: 6,
  },

  tabGroup: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
  },

  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    position: 'relative',
  },

  activeBackground: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    left: 0,
    right: 0,
    borderRadius: 14,
  },

  tabLabel: {
    fontWeight: '600',
    marginTop: 4,
    letterSpacing: 0.1,
  },
  tabLabelActive: {
    fontWeight: '800',
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
  },

  plusContainer: {
    // width et height fournis dynamiquement
    marginHorizontal: 4,
  },
  plusTouch: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    overflow: 'hidden',
  },
  plusGrad: {
    width: '100%',
    height: '100%',
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
});
