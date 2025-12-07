import { Platform } from 'react-native';
import { Tabs } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Home, PlusCircle, Settings, TrendingUp, Dumbbell } from 'lucide-react-native';
import { AnimatedTabBarIcon } from '@/components/AnimatedTabBarIcon';
import { theme } from '@/lib/theme';

const triggerHaptic = () => {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        animation: 'shift',
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopWidth: 0,
          elevation: 0,
          ...theme.shadow.lg,
          height: 88,
          paddingBottom: 24,
          paddingTop: 12,
        },
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarLabelStyle: {
          fontSize: theme.fontSize.xs,
          fontWeight: theme.fontWeight.semibold,
          letterSpacing: 0.3,
        },
      }}
      screenListeners={{
        tabPress: () => {
          triggerHaptic();
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Mesures',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabBarIcon focused={focused}>
              <Home size={size} color={color} />
            </AnimatedTabBarIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="entry"
        options={{
          title: 'Saisie',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabBarIcon focused={focused}>
              <PlusCircle size={size} color={color} />
            </AnimatedTabBarIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'Historique',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabBarIcon focused={focused}>
              <TrendingUp size={size} color={color} />
            </AnimatedTabBarIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="sport"
        options={{
          title: 'Entraînements',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabBarIcon focused={focused}>
              <Dumbbell size={size} color={color} />
            </AnimatedTabBarIcon>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Réglages',
          tabBarIcon: ({ size, color, focused }) => (
            <AnimatedTabBarIcon focused={focused}>
              <Settings size={size} color={color} />
            </AnimatedTabBarIcon>
          ),
        }}
      />
    </Tabs>
  );
}
