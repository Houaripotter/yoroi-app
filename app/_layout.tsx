import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { BadgeProvider } from '@/lib/BadgeContext';
import { I18nProvider } from '@/lib/I18nContext';
import { DevModeProvider } from '@/lib/DevModeContext';
import DevCodeModal from '@/components/DevCodeModal';
import { initDatabase } from '@/lib/database';

// Couleurs pour le loading screen (avant que ThemeProvider soit monte)
const LOADING_COLORS = {
  background: '#0D0D0F',
  gold: '#D4AF37',
  textSecondary: '#8E8E93',
};

function RootLayoutContent() {
  const { isDark, colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        const onboardingDone = await AsyncStorage.getItem('yoroi_onboarding_done');

        // Si l'onboarding n'est pas fait et qu'on n'est pas déjà sur onboarding/setup
        if (onboardingDone !== 'true') {
          const inOnboarding = segments[0] === 'onboarding' || segments[0] === 'setup';
          if (!inOnboarding) {
            router.replace('/onboarding');
          }
        }
      } catch (error) {
        console.error('Erreur vérification onboarding:', error);
      } finally {
        setIsCheckingOnboarding(false);
      }
    };

    checkOnboarding();
  }, []);

  if (isCheckingOnboarding) {
    return null;
  }

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
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        <Stack.Screen name="mode-selection" options={{ gestureEnabled: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="sport-selection" options={{ gestureEnabled: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="setup" options={{ gestureEnabled: false, animation: 'slide_from_right' }} />
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
        <Stack.Screen name="badges" options={{ presentation: 'card' }} />
        <Stack.Screen name="infirmary" options={{ presentation: 'card' }} />
        <Stack.Screen name="injury-detail" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="social-card" options={{ presentation: 'modal', animation: 'fade' }} />
        <Stack.Screen name="competitions" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-competition" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="competition-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-combat" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="combat-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="palmares" options={{ presentation: 'card' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />

      {/* Modal de saisie du code créateur */}
      <DevCodeModal />
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
    <I18nProvider>
      <ThemeProvider>
        <DevModeProvider>
          <BadgeProvider>
            <RootLayoutContent />
          </BadgeProvider>
        </DevModeProvider>
      </ThemeProvider>
    </I18nProvider>
  );
}
