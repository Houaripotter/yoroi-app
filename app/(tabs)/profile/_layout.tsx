import { Stack } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';

// ============================================
// PROFILE TAB LAYOUT - Navigation imbriquee
// ============================================

export default function ProfileLayout() {
  const { colors, screenBackground } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: screenBackground },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="badges" />
      <Stack.Screen name="gamification" />
      <Stack.Screen name="avatar-selection" />
      <Stack.Screen name="photos" />
    </Stack>
  );
}
