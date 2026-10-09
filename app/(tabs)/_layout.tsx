import { View, Text, StyleSheet, TouchableOpacity, Animated, DeviceEventEmitter, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatsHealthProvider } from '@/lib/StatsHealthContext';
import { Tabs, useRouter } from 'expo-router';
import { impactAsync, ImpactFeedbackStyle } from 'expo-haptics';
import { Home, BarChart2, Plus, Calendar, Wrench, Settings, BookOpen } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { useI18n } from '@/lib/I18nContext';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { getTabOrder, getLeftTabs, getRightTabs, TAB_ORDER_CHANGED_EVENT } from '@/lib/tabOrderService';
import type { TabItem } from '@/lib/tabOrderService';
import { useResponsive } from '@/constants/responsive';
import { usePremium } from '@/context/PremiumContext';
import { PremiumModal } from '@/components/premium/PremiumModal';
import { shouldShowPremiumOnce, markPremiumShown, GUARDED_TABS } from '@/lib/premiumTabGuard';
import { Crown, Zap } from 'lucide-react-native';
import { WhatsNewModal } from '@/components/WhatsNewModal';
import type { LucideIcon } from 'lucide-react-native';

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
  const { t } = useI18n();

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
        setCurrent(0); setStepLabel(t('import.starting')); setTotal(7);
        show();
      }),
      DeviceEventEmitter.addListener('YOROI_IMPORT_PROGRESS', (data: { step: string; current: number; total: number }) => {
        setStepLabel(data.step); setCurrent(data.current); setTotal(data.total);
      }),
      DeviceEventEmitter.addListener('YOROI_IMPORT_DONE', () => {
        setStepLabel(t('import.importDoneFull')); setCurrent(7);
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
            {t('tabLayout.importLabel').replace('{{step}}', stepLabel)}
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

// Labels par route - définis dynamiquement dans le composant via useI18n

// ─── Config des modals par onglet ───────────────────────────────────────────
type TabModalConfig = {
  Icon: LucideIcon;
  gradientColors: [string, string, string];
  title: string;
  description: string;
  features: string[];
};

const TAB_PREMIUM_CONFIG: Record<string, TabModalConfig> = {
  // ── Popup de lancement ────────────────────────────────────────────
  launch: {
    Icon: Crown,
    gradientColors: ['#0F0C29', '#302B63', '#24243E'],
    title: 'Passe au niveau supérieur',
    description: 'Débloques toutes les fonctionnalités Yoroi Premium',
    features: [
      'Stats avancées & courbe de poids illimitée',
      'Carnet de combat sans restriction',
      'Planning de saison & compétitions',
      'Tous les outils du combattant pro',
    ],
  },
  // ── Bouton + ─────────────────────────────────────────────────────
  plus: {
    Icon: Zap,
    gradientColors: ['#78350F', '#B45309', '#F59E0B'],
    title: 'Enregistre sans limites',
    description: 'Les utilisateurs gratuits ont des quotas d\'entrée',
    features: [
      'Poids & mensurations illimités',
      'Autant de séances que tu veux',
      'Suivi nutritionnel complet',
      'Toutes les données synchronisées',
    ],
  },
  // ── Onglets ───────────────────────────────────────────────────────
  stats: {
    Icon: BarChart2,
    gradientColors: ['#1E3A5F', '#1D4ED8', '#3B82F6'],
    title: 'Stats avancées',
    description: 'Analyse complète de tes performances',
    features: [
      'Courbe de poids illimitée',
      'Analyse détaillée de chaque entraînement',
      'Suivi du sommeil & de l\'énergie',
      'Rapports hebdomadaires complets',
    ],
  },
  carnet: {
    Icon: BookOpen,
    gradientColors: ['#064E3B', '#065F46', '#059669'],
    title: 'Carnet illimité',
    description: 'Ton journal de combat sans restriction',
    features: [
      'Séances illimitées enregistrées',
      'Bibliothèque vidéos & techniques',
      'Suivi de progression automatique',
      'Export PDF de tout ton historique',
    ],
  },
  planning: {
    Icon: Calendar,
    gradientColors: ['#4C1D95', '#6D28D9', '#7C3AED'],
    title: 'Planning premium',
    description: 'Organise ta saison comme un pro',
    features: [
      'Calendrier de compétitions complet',
      'Planification des camps d\'entraînement',
      'Rappels intelligents personnalisés',
      'Objectifs et jalons saisonniers',
    ],
  },
  more: {
    Icon: Wrench,
    gradientColors: ['#7C2D12', '#C2410C', '#EA580C'],
    title: 'Tous les outils',
    description: 'La boîte à outils du combattant',
    features: [
      'Simulateur weight cut',
      'Game plan & stratégie de combat',
      'Drill tracker & répétitions',
      'Suivi complet des blessures',
    ],
  },
};

// ============================================
// CUSTOM FLOATING PILL TAB BAR
// ============================================
function FloatingPillTabBar({ state, navigation }: BottomTabBarProps) {
  const { colors, themeColor } = useTheme();
  const { t } = useI18n();
  const router = useRouter();
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const [premiumModalVisible, setPremiumModalVisible] = useState(false);
  const [premiumModalTab, setPremiumModalTab] = useState<string | null>(null);
  const ROUTE_LABELS: Record<string, string> = {
    index: t('tabLayout.home'),
    stats: t('tabLayout.stats'),
    carnet: t('tabLayout.journal'),
    planning: t('tabLayout.planning'),
    more: t('tabLayout.tools'),
    settings: t('tabLayout.settings'),
  };
  const plusScale = useRef(new Animated.Value(1)).current;
  const plusRotate = useRef(new Animated.Value(0)).current;
  const [tabOrder, setTabOrder] = useState<TabItem[] | null>(null);
  const { pillWidth, s, fs, isIPad: pad, isSmallPhone, width: winW } = useResponsive();
  const insets = useSafeAreaInsets();

  // Structure de la tab bar : dimensions fixes (device-responsive uniquement).
  // Le texte des labels scale automatiquement via le patch jsx-runtime.
  // iPad : échelle bornée (×1.1) pour que 6 onglets + le bouton + tiennent dans la pilule
  const tablet = pad && winW >= 600;
  const tb = (n: number) => (tablet ? Math.round(n * 1.1) : s(n));
  const ICON_SIZE = tb(isSmallPhone ? 20 : 22);
  const ICON_SIZE_ACTIVE = tb(isSmallPhone ? 22 : 24);
  const PILL_H = tb(tablet ? 72 : 68);
  // Android edge-to-edge : remonter au-dessus de la barre de navigation système
  const PILL_BOTTOM = tb(tablet ? 28 : 22) + (Platform.OS === 'android' ? insets.bottom : 0);
  const PILL_R = 22;
  const PLUS_SIZE = tb(tablet ? 56 : isSmallPhone ? 46 : 50);

  useEffect(() => {
    getTabOrder().then(setTabOrder);
  }, []);

  // Popup premium au lancement de l'app — une fois par jour
  // Attendre que le statut Premium soit connu : sinon un abonné payant voit la popup
  useEffect(() => {
    if (isPremium || premiumLoading) return;
    let cancelled = false;
    shouldShowPremiumOnce('launch').then(should => {
      if (should && !cancelled) {
        markPremiumShown('launch');
        setPremiumModalTab('launch');
        setPremiumModalVisible(true);
      }
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [isPremium, premiumLoading]);

  // Si l'abonnement est confirmé après coup, on ferme la popup
  useEffect(() => {
    if (isPremium) setPremiumModalVisible(false);
  }, [isPremium]);

  useEffect(() => {
    const sub = DeviceEventEmitter.addListener(TAB_ORDER_CHANGED_EVENT, () => {
      getTabOrder().then(setTabOrder);
    });
    return () => sub.remove();
  }, []);

  // Fond = couleur du thème, texte adapté (blanc si accent foncé, noir si clair)
  // Blanc : pill blanche (fond blanc) avec icônes noires — accent sert aux icônes, pas à la pill
  const pillBg = themeColor === 'blanc' ? '#FFFFFF' : colors.accent;
  const pillIsDark = themeColor === 'blanc' ? false : isColorDark(pillBg);
  const activeColor = pillIsDark ? '#FFFFFF' : '#000000';
  const inactiveColor = pillIsDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.40)';

  // Bouton + : noir sur thème blanc, sinon contraste avec la pilule
  const plusBg = pillIsDark ? '#FFFFFF' : '#000000';
  const plusBgDark = pillIsDark ? '#F0F0F0' : '#1A1A1A';
  const plusIcon = pillIsDark ? '#000000' : '#FFFFFF';

  // Contour pilule — blanc : bordure gris clair pour la rendre visible
  const pillBorder = themeColor === 'blanc' ? 'rgba(0,0,0,0.10)' : (pillIsDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)');

  const handlePlusPress = async () => {
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
    // Modal premium sur le bouton + une fois par jour pour les utilisateurs gratuits
    if (!isPremium) {
      const should = await shouldShowPremiumOnce('plus');
      if (should) {
        await markPremiumShown('plus');
        setPremiumModalTab('plus');
        setPremiumModalVisible(true);
      }
    }
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

    const onPress = async () => {
      impactAsync(ImpactFeedbackStyle.Light);
      if (!isFocused) {
        navigation.navigate(route.name);
      }
      // Modal premium une fois par jour sur les onglets protégés
      if (!isPremium && GUARDED_TABS.includes(route.name)) {
        const should = await shouldShowPremiumOnce(route.name);
        if (should) {
          await markPremiumShown(route.name);
          setPremiumModalTab(route.name);
          setPremiumModalVisible(true);
        }
      }
    };

    return (
      <TouchableOpacity
        key={route.key}
        onPress={onPress}
        activeOpacity={0.7}
        style={[styles.tabBtn, { minWidth: tb(tablet ? 56 : isSmallPhone ? 40 : 46) }]}
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
          adjustsFontSizeToFit
          minimumFontScale={0.6}
        >
          {label}
        </Text>
        {isFocused && (
          <View style={[styles.activeDot, { backgroundColor: activeColor }]} />
        )}
      </TouchableOpacity>
    );
  };

  const activePremiumCfg = premiumModalTab ? TAB_PREMIUM_CONFIG[premiumModalTab] : null;

  return (
    <>
      {/* Modal premium onglets — s'affiche une fois par jour */}
      {activePremiumCfg && (
        <PremiumModal
          visible={premiumModalVisible}
          onClose={() => setPremiumModalVisible(false)}
          Icon={activePremiumCfg.Icon}
          gradientColors={activePremiumCfg.gradientColors}
          title={activePremiumCfg.title}
          description={activePremiumCfg.description}
          features={activePremiumCfg.features}
        />
      )}

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
    </>
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
    <StatsHealthProvider>
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
        {/* Popup "Nouveautés" — s'affiche automatiquement après chaque mise à jour */}
        <WhatsNewModal />
      </View>
    </StatsHealthProvider>
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
