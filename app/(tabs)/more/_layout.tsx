import { Stack } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// MORE TAB LAYOUT - Navigation imbriquée
// Permet de garder la tab bar visible
// ============================================

export default function MoreLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="photos" />
      <Stack.Screen name="settings" />
      <Stack.Screen name="appearance" />
      <Stack.Screen name="timer" />
      <Stack.Screen name="calculators" />
      <Stack.Screen name="fasting" />
      <Stack.Screen name="training-journal" />
      <Stack.Screen name="nutrition-plan" />
      <Stack.Screen name="share-hub" />
      <Stack.Screen name="partners" />
      <Stack.Screen name="health-connect" />
      <Stack.Screen name="savoir" />
      <Stack.Screen name="badges" />
      <Stack.Screen name="gamification" />
      <Stack.Screen name="avatar-selection" />
      <Stack.Screen name="screenshot-mode" />
    </Stack>
  );
}
