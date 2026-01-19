import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Text, AppState, AppStateStatus, LogBox } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { BadgeProvider } from '@/lib/BadgeContext';
import { I18nProvider } from '@/lib/I18nContext';
import { DevModeProvider } from '@/lib/DevModeContext';
import { WatchConnectivityProvider } from '@/lib/WatchConnectivityProvider';
import DevCodeModal from '@/components/DevCodeModal';
import { NotificationApologyModal } from '@/components/NotificationApologyModal';
import { UpdateChangelogModal } from '@/components/UpdateChangelogModal';
import { initDatabase } from '@/lib/database';
import { autoImportCompetitionsOnFirstLaunch } from '@/lib/importCompetitionsService';
import { notificationService } from '@/lib/notificationService';
import { migrateAvatarSystem } from '@/lib/avatarMigration';
import { initCitationNotifications } from '@/lib/citationNotificationService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/logger';
import { shouldShowChangelog, markChangelogAsRead } from '@/lib/featureDiscoveryService';

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
  const [showChangelog, setShowChangelog] = useState(false);

  // Vérifier si on doit afficher le changelog
  useEffect(() => {
    const checkChangelog = async () => {
      const shouldShow = await shouldShowChangelog();
      if (shouldShow) {
        // Attendre 1 seconde après le chargement pour afficher
        setTimeout(() => setShowChangelog(true), 1000);
      }
    };
    checkChangelog();
  }, []);

  const handleCloseChangelog = async () => {
    await markChangelogAsRead();
    setShowChangelog(false);
  };

  // 🔒 SÉCURITÉ: Sauvegarde automatique quand l'app passe en background
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
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

    return () => subscription.remove();
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
        <Stack.Screen name="settings" options={{ presentation: 'card' }} />
        <Stack.Screen name="appearance" options={{ presentation: 'card' }} />
        <Stack.Screen name="timer" options={{ presentation: 'card' }} />
        <Stack.Screen name="calculators" options={{ presentation: 'card' }} />
        <Stack.Screen name="fasting" options={{ presentation: 'card' }} />
        <Stack.Screen name="training-journal" options={{ presentation: 'card' }} />
        <Stack.Screen name="nutrition-plan" options={{ presentation: 'card' }} />
        <Stack.Screen name="share-hub" options={{ presentation: 'card' }} />
        <Stack.Screen name="partners" options={{ presentation: 'card' }} />
        <Stack.Screen name="health-connect" options={{ presentation: 'card' }} />
        <Stack.Screen name="clubs" options={{ presentation: 'card' }} />
        <Stack.Screen name="help-tutorials" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-training" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
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
      <NotificationApologyModal />
      {showChangelog && (
        <UpdateChangelogModal visible={true} onClose={handleCloseChangelog} />
      )}
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        logger.info('Yoroi - Initialisation...');

        // Initialiser la base de donnees SQLite
        await initDatabase();
        logger.info('Base de donnees initialisee');

        // Migrer le système d'avatars V2
        await migrateAvatarSystem();
        logger.info('Migration avatars effectuee');

        // Auto-import des compétitions IBJJF et CFJJB au premier lancement
        await autoImportCompetitionsOnFirstLaunch();

        // Initialiser le service de notifications
        const notifInitialized = await notificationService.initialize();
        if (notifInitialized) {
          logger.info('Service de notifications initialisé');
        } else {
          logger.warn('Service de notifications non disponible (simulateur ou permissions refusées)');
        }

        // Initialiser les notifications de citations (replanifie si nécessaire)
        await initCitationNotifications();
        logger.info('Notifications citations initialisées');

      } catch (error) {
        logger.error('❌ Erreur initialisation', error);
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
