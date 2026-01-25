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
import { autoImportCompetitionsOnFirstLaunch } from '@/lib/importCompetitionsService';
import { importEventsFromJSON } from '@/lib/eventsService';
import { notificationService } from '@/lib/notificationService';
import { migrateAvatarSystem } from '@/lib/avatarMigration';
import { initCitationNotifications } from '@/lib/citationNotificationService';
import { initHealthTipNotifications, setupNotificationHandler } from '@/lib/eveningHealthTipsService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';

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
        <Stack.Screen name="radar-performance" options={{ presentation: 'card' }} />
        <Stack.Screen name="customize-home" options={{ presentation: 'card' }} />
        <Stack.Screen name="competition-sports-selection" options={{ presentation: 'card' }} />
        <Stack.Screen name="competitor-profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="gamification" options={{ presentation: 'card' }} />
        <Stack.Screen name="sleep" options={{ presentation: 'card' }} />
        <Stack.Screen name="hydration" options={{ presentation: 'card' }} />
        <Stack.Screen name="charge" options={{ presentation: 'card' }} />
        <Stack.Screen name="avatar-selection" options={{ presentation: 'card' }} />
        <Stack.Screen name="screenshot-mode" options={{ presentation: 'card' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <DevCodeModal />
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // 🚀 AFFICHAGE IMMÉDIAT - 0 seconde d'écran noir
    setIsReady(true);

    // ⏳ TOUTES les initialisations en arrière-plan
    const init = async () => {
      try {
        logger.info('Yoroi - Initialisation en arrière-plan...');

        // ✅ Initialiser la base de donnees SQLite
        await initDatabase();
        logger.info('Base de donnees initialisee');

        // ✅ Vérifier et créer la table events_catalog si elle n'existe pas
        try {
          const { openDatabase } = await import('@/lib/database');
          const db = await openDatabase();

          // Vérifier si la table existe
          const tableCheck = await db.getFirstAsync<{ count: number }>(
            `SELECT count(*) as count FROM sqlite_master WHERE type='table' AND name='events_catalog'`
          );

          if (!tableCheck || tableCheck.count === 0) {
            logger.info('Création de la table events_catalog...');
            await db.execAsync(`
              CREATE TABLE IF NOT EXISTS events_catalog (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                date_start TEXT NOT NULL,
                city TEXT,
                country TEXT,
                full_address TEXT,
                category TEXT NOT NULL,
                sport_tag TEXT NOT NULL,
                registration_link TEXT,
                federation TEXT,
                image_logo_url TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
              );
            `);
            await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_date ON events_catalog(date_start);`);
            await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_category ON events_catalog(category);`);
            await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_sport ON events_catalog(sport_tag);`);
            await db.execAsync(`CREATE INDEX IF NOT EXISTS idx_events_country ON events_catalog(country);`);
            logger.info('✅ Table events_catalog créée');
          }
        } catch (err) {
          logger.error('Erreur création table events_catalog:', err);
        }

        // Migrer le système d'avatars V2
        await migrateAvatarSystem();
        logger.info('Migration avatars effectuee');

        // Auto-import des compétitions IBJJF et CFJJB au premier lancement
        await autoImportCompetitionsOnFirstLaunch();
        logger.info('✅ Initialisations critiques terminées');

        // Import événements (peut prendre du temps)
        importEventsFromJSON()
          .then(() => logger.info('✅ Catalogue événements importé'))
          .catch(err => logger.error('❌ Erreur import événements:', err));

        // Notifications
        notificationService.initialize()
          .then(success => {
            if (success) {
              logger.info('✅ Service notifications initialisé');
              return Promise.all([
                initCitationNotifications(),
                initHealthTipNotifications()
              ]);
            }
          })
          .then(() => logger.info('✅ Notifications initialisées'))
          .catch(err => logger.error('❌ Erreur notifications:', err));

      } catch (error) {
        logger.error('❌ Erreur initialisation critique', error);
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
