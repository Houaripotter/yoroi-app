import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, AppState, AppStateStatus, LogBox } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { BadgeProvider } from '@/lib/BadgeContext';
import { I18nProvider } from '@/lib/I18nContext';
import { DevModeProvider } from '@/lib/DevModeContext';
import { WatchConnectivityProvider } from '@/lib/WatchConnectivityProvider';
import DevCodeModal from '@/components/DevCodeModal';
import { initDatabase } from '@/lib/database';
import { applyDataRetention } from '@/lib/storage';
import { autoImportCompetitionsOnFirstLaunch } from '@/lib/importCompetitionsService';
import { forceReimportEvents } from '@/lib/eventsService';
import { notificationService } from '@/lib/notificationService';
import { migrateAvatarSystem } from '@/lib/avatarMigration';
import { initCitationNotifications } from '@/lib/citationNotificationService';
import { setupNotificationHandler } from '@/lib/eveningHealthTipsService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/security/logger';
import { appleWatchService } from '@/lib/appleWatchService';

// ============================================
// PRODUCTION: Désactiver tous les console.log
// ============================================
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
  console.info = () => {};
}

// ============================================
// Ignorer certains warnings en développement
// ============================================
LogBox.ignoreLogs([
  'Non-serializable values were found in the navigation state',
  'Sending `onAnimatedValueUpdate` with no listeners registered',
]);

// Couleurs pour le loading screen (avant que ThemeProvider soit monte)
const LOADING_COLORS = {
  background: '#0D0D0F',
  gold: '#D4AF37',
  textSecondary: '#8E8E93',
};

function RootLayoutContent() {
  const { isDark, colors } = useTheme();

  // 🔒 SÉCURITÉ: Sauvegarde automatique quand l'app passe en background
  useEffect(() => {
    // Handler pour les clics sur notifications
    const notifSubscription = setupNotificationHandler();

    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        logger.info('📦 App going to background - auto-save triggered');
        try {
          // Les données sont déjà sauvegardées automatiquement dans AsyncStorage
          // Cette fonction est un placeholder pour futures optimisations
          await AsyncStorage.flushGetRequests();
        } catch (error) {
          logger.error('Auto-save failed', error);
        }
      }
    });

    return () => {
      notifSubscription.remove();
      appStateSubscription.remove();
    };
  }, []);

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
        <Stack.Screen name="weight-category-selection" options={{ gestureEnabled: false, animation: 'slide_from_right' }} />
        <Stack.Screen name="setup" options={{ gestureEnabled: false, animation: 'slide_from_right' }} />
        {/* Écrans standard */}
        <Stack.Screen name="profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="photos" options={{ presentation: 'card' }} />
        <Stack.Screen name="appearance" options={{ presentation: 'card' }} />
        <Stack.Screen name="timer" options={{ presentation: 'card' }} />
        <Stack.Screen name="calculators" options={{ presentation: 'card' }} />
        <Stack.Screen name="fasting" options={{ presentation: 'card' }} />
        <Stack.Screen name="training-journal" options={{ presentation: 'card' }} />
        <Stack.Screen name="nutrition-plan" options={{ presentation: 'card' }} />
        <Stack.Screen name="share-hub" options={{ presentation: 'card' }} />
        <Stack.Screen name="partners" options={{ presentation: 'card' }} />
        <Stack.Screen name="clubs" options={{ presentation: 'card' }} />
        <Stack.Screen name="help-tutorials" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-measurement" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="entry" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="savoir" options={{ presentation: 'card' }} />
        <Stack.Screen name="sport" options={{ presentation: 'card' }} />
        <Stack.Screen name="history" options={{ presentation: 'card' }} />
        <Stack.Screen name="body-status" options={{ presentation: 'card' }} />
        <Stack.Screen name="body-composition" options={{ presentation: 'card' }} />
        <Stack.Screen name="chrono" options={{ presentation: 'card' }} />
        <Stack.Screen name="calculator" options={{ presentation: 'card' }} />
        <Stack.Screen name="badges" options={{ presentation: 'card' }} />
        <Stack.Screen name="records" options={{ presentation: 'card' }} />
        <Stack.Screen name="infirmary" options={{ presentation: 'card' }} />
        <Stack.Screen name="injury-detail" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="social-card" options={{ presentation: 'modal', animation: 'fade' }} />
        <Stack.Screen name="competitions" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-competition" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="competition-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-combat" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="combat-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="palmares" options={{ presentation: 'card' }} />
        <Stack.Screen name="radar-performance" options={{ presentation: 'card' }} />
        <Stack.Screen name="customize-home" options={{ presentation: 'card' }} />
        <Stack.Screen name="competition-sports-selection" options={{ presentation: 'card' }} />
        <Stack.Screen name="competitor-profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="gamification" options={{ presentation: 'card' }} />
        <Stack.Screen name="sleep" options={{ presentation: 'card' }} />
        <Stack.Screen name="hydration" options={{ presentation: 'card' }} />
        <Stack.Screen name="charge" options={{ presentation: 'card' }} />
        <Stack.Screen name="avatar-selection" options={{ presentation: 'card' }} />
        <Stack.Screen name="avatar-customization" options={{ presentation: 'card' }} />
        <Stack.Screen name="screenshot-mode" options={{ presentation: 'card' }} />
        {/* Écrans détails & suivi */}
        <Stack.Screen name="activity-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="activity-history" options={{ presentation: 'card' }} />
        <Stack.Screen name="composition-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="measurements" options={{ presentation: 'card' }} />
        <Stack.Screen name="measurements-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="performance-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="vitality-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="health-metrics" options={{ presentation: 'card' }} />
        <Stack.Screen name="health-connect" options={{ presentation: 'card' }} />
        <Stack.Screen name="health-professionals" options={{ presentation: 'card' }} />
        <Stack.Screen name="sleep-input" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="training-goals" options={{ presentation: 'card' }} />
        <Stack.Screen name="transformation" options={{ presentation: 'card' }} />
        <Stack.Screen name="weekly-report" options={{ presentation: 'card' }} />
        <Stack.Screen name="energy" options={{ presentation: 'card' }} />
        <Stack.Screen name="challenges" options={{ presentation: 'card' }} />
        {/* Écrans outils */}
        <Stack.Screen name="add-training" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="add-club" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="quick-log" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="quick-log-combat" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="quick-log-muscu" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="quick-log-other" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="quick-log-running" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="quick-nutrition" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="import-workouts" options={{ presentation: 'card' }} />
        {/* Écrans paramètres & données */}
        <Stack.Screen name="privacy-data" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="connected-devices" options={{ presentation: 'card' }} />
        <Stack.Screen name="preferences" options={{ presentation: 'card' }} />
        <Stack.Screen name="themes" options={{ presentation: 'card' }} />
        <Stack.Screen name="logo-selection" options={{ presentation: 'card' }} />
        <Stack.Screen name="export-data" options={{ presentation: 'card' }} />
        <Stack.Screen name="legal" options={{ presentation: 'card' }} />
        <Stack.Screen name="ideas" options={{ presentation: 'card' }} />
        <Stack.Screen name="citations" options={{ presentation: 'card' }} />
        {/* Écrans compétition & social */}
        <Stack.Screen name="competitor-space" options={{ presentation: 'card' }} />
        <Stack.Screen name="cut-mode" options={{ presentation: 'card' }} />
        <Stack.Screen name="weight-cut" options={{ presentation: 'card' }} />
        <Stack.Screen name="leaderboard" options={{ presentation: 'card' }} />
        <Stack.Screen name="fighter-card" options={{ presentation: 'card' }} />
        <Stack.Screen name="share-card" options={{ presentation: 'modal', animation: 'fade' }} />
        <Stack.Screen name="event-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="events" options={{ presentation: 'card' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <DevCodeModal />
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const [isReady, setIsReady] = useState(true); // 🚀 AFFICHAGE IMMÉDIAT - démarrer à true

  useEffect(() => {
    // ⏳ TOUTES les initialisations en arrière-plan (sans bloquer l'affichage)
    const init = async () => {
      try {
        logger.info('Yoroi - Initialisation en arrière-plan...');

        // ✅ DB FIRST: Toutes les opérations DB-dépendantes APRÈS initDatabase
        try {
          await initDatabase();
          logger.info('Base de donnees initialisee');
          await forceReimportEvents();
          logger.info('Catalogue événements reimporté avec succès');
        } catch (err) {
          logger.error('Erreur init database ou import événements:', err);
        }

        // ✅ Services indépendants en parallèle (DB déjà prête)
        await Promise.allSettled([
          appleWatchService.init()
            .then(() => logger.info('Apple Watch Service initialisé'))
            .catch(err => logger.error('Erreur Apple Watch Service:', err)),

          migrateAvatarSystem()
            .then(() => logger.info('Migration avatars effectuee'))
            .catch(err => logger.error('Erreur migration avatars:', err)),

          autoImportCompetitionsOnFirstLaunch()
            .then(() => logger.info('Auto-import compétitions terminé'))
            .catch(err => logger.error('Erreur auto-import compétitions:', err)),

          notificationService.initialize()
            .then(success => {
              if (success) {
                logger.info('Service notifications initialisé');
                return initCitationNotifications();
              }
            })
            .then(() => logger.info('Citation du jour initialisée'))
            .catch(err => logger.error('Erreur notifications:', err)),

          applyDataRetention()
            .then(() => logger.info('Data retention policy applied'))
            .catch(err => logger.error('Erreur data retention:', err)),
        ]);

      } catch (error) {
        logger.error('Erreur initialisation critique', error);
      }
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
    <ErrorBoundary>
      <SafeAreaProvider>
        <I18nProvider>
          <ThemeProvider>
            <DevModeProvider>
              <BadgeProvider>
                <WatchConnectivityProvider>
                  <RootLayoutContent />
                </WatchConnectivityProvider>
              </BadgeProvider>
            </DevModeProvider>
          </ThemeProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
