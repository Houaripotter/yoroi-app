import { Stack } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';

export default function SettingsLayout() {
  const { screenBackground } = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: screenBackground },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
