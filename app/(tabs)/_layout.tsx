import { Platform, View, StyleSheet } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Home, BarChart2, Plus, Calendar, Menu } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';
import { RADIUS, SHADOWS } from '@/constants/appTheme';

// FAB size - plus petit pour être aligné avec les autres onglets
const FAB_SIZE = 48;
const FAB_BORDER_RADIUS = 16;

// ============================================
// TAB LAYOUT - DYNAMIC THEME SUPPORT
// ============================================
// Tab bar with dynamic colors from ThemeContext
// FAB central with accent color glow
// ============================================

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

export default function TabLayout() {
  const { colors } = useTheme();

  // Tab bar TOUJOURS noire (mode clair et sombre)
  const tabBarBg = '#0D0D0F';
  const tabBarInactiveColor = 'rgba(255,255,255,0.45)';
  const tabBarBorderColor = 'rgba(255,255,255,0.08)';

  // Bouton FAB Central avec glow accent
  const FABButton = () => (
    <View style={styles.fabContainer}>
      <View style={[
        styles.fab,
        {
          backgroundColor: colors.accent,
          shadowColor: colors.accent,
        }
      ]}>
        <Plus size={24} color="#FFFFFF" strokeWidth={2.5} />
      </View>
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: tabBarInactiveColor,
        tabBarStyle: [
          styles.tabBar,
          {
            backgroundColor: tabBarBg,
            borderTopColor: tabBarBorderColor,
            // Glow effect subtil avec couleur accent
            shadowColor: colors.accent,
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.25,
            shadowRadius: 12,
          }
        ],
        tabBarLabelStyle: styles.tabBarLabel,
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
          title: 'ACCUEIL',
          tabBarIcon: ({ focused }) => (
            <View style={focused ? [styles.iconActiveContainer, { shadowColor: colors.accent }] : undefined}>
              <Home
                size={22}
                color={focused ? colors.accent : tabBarInactiveColor}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />

      {/* 2. STATS */}
      <Tabs.Screen
        name="stats"
        options={{
          title: 'STATS',
          tabBarIcon: ({ focused }) => (
            <View style={focused ? [styles.iconActiveContainer, { shadowColor: colors.accent }] : undefined}>
              <BarChart2
                size={22}
                color={focused ? colors.accent : tabBarInactiveColor}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />

      {/* 3. AJOUTER - FAB central flottant */}
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: () => <FABButton />,
        }}
      />

      {/* 4. PLANNING */}
      <Tabs.Screen
        name="planning"
        options={{
          title: 'PLANNING',
          tabBarIcon: ({ focused }) => (
            <View style={focused ? [styles.iconActiveContainer, { shadowColor: colors.accent }] : undefined}>
              <Calendar
                size={22}
                color={focused ? colors.accent : tabBarInactiveColor}
                strokeWidth={focused ? 2.5 : 2}
              />
            </View>
          ),
        }}
      />

      {/* 5. MENU */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'MENU',
          tabBarIcon: ({ focused }) => (
            <View style={focused ? [styles.iconActiveContainer, { shadowColor: colors.accent }] : undefined}>
              <Menu
                size={22}
                color={focused ? colors.accent : tabBarInactiveColor}
                strokeWidth={focused ? 2.5 : 2}
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
  iconActiveContainer: {
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  fabContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fab: {
    width: FAB_SIZE,
    height: FAB_SIZE,
    borderRadius: FAB_BORDER_RADIUS,
    justifyContent: 'center',
    alignItems: 'center',
    // Glow effect
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
});
