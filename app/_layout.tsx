import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { initDatabase } from '@/lib/database';

// Couleurs pour le loading screen (avant que ThemeProvider soit monte)
const LOADING_COLORS = {
  background: '#0D0D0F',
  gold: '#D4AF37',
  textSecondary: '#8E8E93',
};

function RootLayoutContent() {
  const { isDark, colors } = useTheme();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        <Stack.Screen name="profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="clubs" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-training" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="add-measurement" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="entry" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="photos" options={{ presentation: 'card' }} />
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="savoir" options={{ presentation: 'card' }} />
        <Stack.Screen name="sport" options={{ presentation: 'card' }} />
        <Stack.Screen name="history" options={{ presentation: 'card' }} />
        <Stack.Screen name="body-status" options={{ presentation: 'card' }} />
        <Stack.Screen name="chrono" options={{ presentation: 'card' }} />
        <Stack.Screen name="calculator" options={{ presentation: 'card' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('⚔️ Yoroi - Initialisation...');
        // Initialiser la base de donnees SQLite
        await initDatabase();
        console.log('✅ Base de donnees initialisee');
      } catch (error) {
        console.error('❌ Erreur initialisation:', error);
      }
      setIsReady(true);
    };

    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: LOADING_COLORS.background,
      }}>
        <ActivityIndicator size="large" color={LOADING_COLORS.gold} />
        <Text style={{
          marginTop: 16,
          fontSize: 16,
          color: LOADING_COLORS.textSecondary,
          fontWeight: '600',
        }}>
          Chargement de Yoroi...
        </Text>
      </View>
    );
  }

  return (
    <ThemeProvider>
      <RootLayoutContent />
    </ThemeProvider>
  );
}
