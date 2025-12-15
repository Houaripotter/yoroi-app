import { Platform, View } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Home, BarChart2, Plus, Calendar, Menu } from 'lucide-react-native';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// TAB LAYOUT GUERRIER - 5 ONGLETS UNIQUEMENT
// ============================================
// 1. Accueil - Dashboard principal
// 2. Stats - Graphiques et evolution
// 3. + Ajouter - Nouvelle mesure (bouton central OR)
// 4. Planning - Ma semaine type
// 5. Plus - Menu avec autres ecrans

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

export default function TabLayout() {
  const { colors, isDark } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.gold,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderRadius: 28,
          marginHorizontal: 16,
          marginBottom: 16,
          paddingBottom: 0,
          paddingTop: 10,
          height: 70,
          position: 'absolute',
          borderTopWidth: 0,
          shadowColor: isDark ? '#000' : 'rgba(0,0,0,0.1)',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: isDark ? 0.2 : 0.1,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
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
          title: 'Accueil',
          tabBarIcon: ({ color }) => (
            <Home size={24} color={color} strokeWidth={2} />
          ),
        }}
      />

      {/* 2. STATS */}
      <Tabs.Screen
        name="stats"
        options={{
          title: 'Stats',
          tabBarIcon: ({ color }) => (
            <BarChart2 size={24} color={color} strokeWidth={2} />
          ),
        }}
      />

      {/* 3. AJOUTER - Bouton central OR */}
      <Tabs.Screen
        name="add"
        options={{
          title: '',
          tabBarIcon: () => (
            <View style={{
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: colors.gold,
              justifyContent: 'center',
              alignItems: 'center',
              marginBottom: 20,
              shadowColor: colors.gold,
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.4,
              shadowRadius: 8,
              elevation: 8,
            }}>
              <Plus size={28} color={colors.background} strokeWidth={2.5} />
            </View>
          ),
        }}
      />

      {/* 4. PLANNING */}
      <Tabs.Screen
        name="planning"
        options={{
          title: 'Planning',
          tabBarIcon: ({ color }) => (
            <Calendar size={24} color={color} strokeWidth={2} />
          ),
        }}
      />

      {/* 5. PLUS */}
      <Tabs.Screen
        name="more"
        options={{
          title: 'Plus',
          tabBarIcon: ({ color }) => (
            <Menu size={24} color={color} strokeWidth={2} />
          ),
        }}
      />
    </Tabs>
  );
}
