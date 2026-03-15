import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, AppState, AppStateStatus, LogBox, Platform } from 'react-native';
import { SamuraiSplash } from '@/components/SamuraiLoader';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider, useTheme } from '@/lib/ThemeContext';
import { BadgeProvider } from '@/lib/BadgeContext';
import { I18nProvider } from '@/lib/I18nContext';
import { DevModeProvider } from '@/lib/DevModeContext';
import { WatchConnectivityProvider } from '@/lib/WatchConnectivityProvider';
import { AvatarProvider } from '@/lib/AvatarContext';
import DevCodeModal from '@/components/DevCodeModal';
import { initDatabase } from '@/lib/database';
import { applyDataRetention, getSelectedLogo } from '@/lib/storage';
import { autoImportCompetitionsOnFirstLaunch } from '@/lib/importCompetitionsService';
import { notificationService } from '@/lib/notificationService';
import { saveNotification } from '@/lib/notificationHistoryService';
import { migrateAvatarSystem } from '@/lib/avatarMigration';
import { initCitationNotifications } from '@/lib/citationNotificationService';
import { setupNotificationHandler } from '@/lib/eveningHealthTipsService';
import { initPeerSync, stopPeerSync } from '@/lib/peerSyncService';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/security/logger';
import { appleWatchService } from '@/lib/appleWatchService';
import { healthConnect } from '@/lib/healthConnect';
import * as Notifications from 'expo-notifications';

// Restaurer l'icône native sélectionnée (expo-alternate-app-icons)
let _setAlternateAppIcon: ((name: string) => Promise<void>) | null = null;
let _resetAppIcon: (() => Promise<void>) | null = null;
let _supportsAlternateIcons = false;
const ICON_NAME_MAP: Record<string, string | null> = {
  default: null,
  logo_new: 'Logo1',
  logo1: 'Yoroi1',
  logo2: 'Yoroi2',
  logo3: 'Yoroi3',
  logo4: 'Yoroi4',
  logo5: 'Yoroi5',
  logo6: 'Yoroi6',
};
try {
  const mod = require('expo-alternate-app-icons');
  _setAlternateAppIcon = mod.setAlternateAppIcon;
  _resetAppIcon = mod.resetAppIcon;
  _supportsAlternateIcons = mod.supportsAlternateIcons ?? false;
} catch {
  // Module natif indisponible (Expo Go)
}

async function restoreAppIcon() {
  if (!_supportsAlternateIcons || !_setAlternateAppIcon || !_resetAppIcon) return;
  try {
    const logoId = await getSelectedLogo();
    const iconName = ICON_NAME_MAP[logoId];
    if (iconName === null || iconName === undefined) {
      await _resetAppIcon();
    } else {
      await _setAlternateAppIcon(iconName);
    }
  } catch (err) {
    logger.error('[Layout] Erreur restauration icône:', err);
  }
}

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
  const router = useRouter();

  // Sauvegarde automatique quand l'app passe en background
  useEffect(() => {
    // Handler pour les clics sur notifications
    const notifSubscription = setupNotificationHandler();

    // Capturer toutes les notifications reçues en foreground → cloche
    const foregroundNotifSubscription = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body, data } = notification.request.content;
      if (title) {
        const type = (data?.type as string) ?? 'general';
        saveNotification(title, body ?? '', type, data as Record<string, any> | undefined).catch(() => {});
      }
    });

    // Deep link: quand l'utilisateur tape sur une notification (background/killed)
    const workoutNotifSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const { title, body, data } = response.notification.request.content;

      // Sauvegarder dans la cloche (notifications reçues en background puis tapées)
      if (title) {
        const type = (data?.type as string) ?? 'general';
        saveNotification(title, body ?? '', type, data as Record<string, any> | undefined).catch(() => {});
      }

      // Navigation universelle : workoutId en priorité, sinon screen générique
      if (data?.workoutId) {
        setTimeout(() => router.push(`/social-share/last-session?workoutId=${data.workoutId}` as any), 500);
      } else if (data?.screen) {
        setTimeout(() => router.push(`/${data.screen}` as any), 500);
      }
    });

    let previousAppState = AppState.currentState;
    const appStateSubscription = AppState.addEventListener('change', async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        try {
          await AsyncStorage.flushGetRequests();
        } catch (error) {
          logger.error('Auto-save failed', error);
        }
      }

      // Retour au foreground: checker les nouveaux workouts immediatement
      // Detecte les séances terminees sur Garmin, Fitbit, Polar, Suunto, COROS, Withings, Apple Watch, Samsung, etc.
      if (nextAppState === 'active' && previousAppState !== 'active') {
        try {
          if (typeof healthConnect.checkNewWorkoutsNow === 'function') {
            healthConnect.checkNewWorkoutsNow().catch(() => {});
          }
        } catch {}
      }
      previousAppState = nextAppState;
    });

    return () => {
      notifSubscription?.remove?.();
      foregroundNotifSubscription?.remove?.();
      workoutNotifSubscription?.remove?.();
      appStateSubscription?.remove?.();
      appleWatchService.cleanup();
      stopPeerSync().catch(() => {});
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

        {/* Écrans standard */}
        <Stack.Screen name="profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="photos" options={{ presentation: 'card' }} />
        <Stack.Screen name="timer" options={{ presentation: 'card' }} />
        <Stack.Screen name="calculators" options={{ presentation: 'card' }} />
        <Stack.Screen name="fasting" options={{ presentation: 'card' }} />
        <Stack.Screen name="training-journal" options={{ presentation: 'card' }} />
        <Stack.Screen name="nutrition-plan" options={{ presentation: 'card' }} />
        <Stack.Screen name="share-hub" options={{ presentation: 'card' }} />
        <Stack.Screen name="partners" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-measurement" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="entry" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="savoir" options={{ presentation: 'card' }} />
        <Stack.Screen name="sport" options={{ presentation: 'card' }} />
        <Stack.Screen name="history" options={{ presentation: 'card' }} />
        <Stack.Screen name="body-status" options={{ presentation: 'card' }} />
        <Stack.Screen name="body-composition" options={{ presentation: 'card' }} />

        <Stack.Screen name="badges" options={{ presentation: 'card' }} />
        <Stack.Screen name="records" options={{ presentation: 'card' }} />
        <Stack.Screen name="infirmary" options={{ presentation: 'card' }} />
        <Stack.Screen name="injury-detail" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="competitions" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-competition" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="competition-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-combat" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="combat-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="palmares" options={{ presentation: 'card' }} />
        <Stack.Screen name="radar-performance" options={{ presentation: 'card' }} />


        <Stack.Screen name="competitor-profile" options={{ presentation: 'card' }} />
        <Stack.Screen name="gamification" options={{ presentation: 'card' }} />
        <Stack.Screen name="sleep" options={{ presentation: 'card' }} />
        <Stack.Screen name="hydration" options={{ presentation: 'card' }} />
        <Stack.Screen name="charge" options={{ presentation: 'card' }} />
        <Stack.Screen name="avatar-selection" options={{ presentation: 'card' }} />

        {/* Écrans détails & suivi */}
        <Stack.Screen name="activity-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="activity-history" options={{ presentation: 'card' }} />
        <Stack.Screen name="composition-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="measurements" options={{ presentation: 'card' }} />
        <Stack.Screen name="measurements-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="performance-detail" options={{ presentation: 'card' }} />

        <Stack.Screen name="health-metrics" options={{ presentation: 'card' }} />
        <Stack.Screen name="health-connect" options={{ presentation: 'card' }} />
        <Stack.Screen name="health-professionals" options={{ presentation: 'card' }} />
        <Stack.Screen name="sleep-input" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="training-goals" options={{ presentation: 'card' }} />
        <Stack.Screen name="transformation" options={{ presentation: 'card' }} />

        <Stack.Screen name="energy" options={{ presentation: 'card' }} />
        <Stack.Screen name="challenges" options={{ presentation: 'card' }} />
        {/* Écrans outils */}
        <Stack.Screen name="add-training" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="add-club" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />


        <Stack.Screen name="quick-nutrition" options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="import-workouts" options={{ presentation: 'card' }} />
        <Stack.Screen name="import-csv" options={{ presentation: 'card' }} />
        <Stack.Screen name="customize-tabs" options={{ presentation: 'card' }} />
        <Stack.Screen name="frame-selection" options={{ presentation: 'card' }} />
        {/* Écrans paramètres & données */}
        <Stack.Screen name="privacy-data" options={{ presentation: 'card' }} />
        <Stack.Screen name="notifications" options={{ presentation: 'card' }} />
        <Stack.Screen name="notification-center" options={{ presentation: 'card' }} />
        <Stack.Screen name="connected-devices" options={{ presentation: 'card' }} />

        <Stack.Screen name="themes" options={{ presentation: 'card' }} />
        <Stack.Screen name="logo-selection" options={{ presentation: 'card' }} />
        <Stack.Screen name="export-data" options={{ presentation: 'card' }} />
        <Stack.Screen name="companion" options={{ presentation: 'card' }} />
        <Stack.Screen name="ideas" options={{ presentation: 'card' }} />
        <Stack.Screen name="citations" options={{ presentation: 'card' }} />
        <Stack.Screen name="heart-zones" options={{ presentation: 'card' }} />
        <Stack.Screen name="mat-time" options={{ presentation: 'card' }} />
        <Stack.Screen name="sleep-history" options={{ presentation: 'card' }} />
        <Stack.Screen name="injury-evaluation" options={{ presentation: 'card' }} />
        <Stack.Screen name="scientific-sources" options={{ presentation: 'card' }} />
        {/* Écrans compétition & social */}
        <Stack.Screen name="competitor-space" options={{ presentation: 'card' }} />
        <Stack.Screen name="cut-mode" options={{ presentation: 'card' }} />
        <Stack.Screen name="weight-cut" options={{ presentation: 'card' }} />
        <Stack.Screen name="fighter-card" options={{ presentation: 'card' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      <DevCodeModal />
    </View>
  );
}

export default function RootLayout() {
  useFrameworkReady();
  const [isReady, setIsReady] = useState(true); // Affichage immédiat

  useEffect(() => {
    // ⏳ TOUTES les initialisations en arrière-plan (sans bloquer l'affichage)
    const init = async () => {
      try {
        logger.info('Yoroi - Initialisation en arrière-plan...');

        // DB FIRST: Toutes les opérations DB-dépendantes APRÈS initDatabase
        try {
          await initDatabase();
          logger.info('Base de données initialisee');
          // Rafraîchir les widgets avec les données actuelles
          import('@/lib/widgetData').then(({ refreshWidgetsFromDB }) => refreshWidgetsFromDB()).catch(() => {});
        } catch (err) {
          logger.error('Erreur init database ou import événements:', err);
        }

        // Restaurer l'icône native (doit correspondre au logo sélectionné par l'utilisateur)
        restoreAppIcon().catch(err => logger.error('Erreur restauration icone:', err));

        // Services indépendants en parallèle (DB déjà prête)
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

          initPeerSync()
            .then(() => logger.info('PeerSync iPhone<->iPad démarré'))
            .catch(err => logger.error('Erreur PeerSync:', err)),
        ]);

        // HealthKit: connexion et import (iOS uniquement)
        // NOTE: la DEMANDE de permissions est gérée par l'onboarding (renderPageHealth).
        // Ici on se reconnecte seulement si l'onboarding est déjà terminé.
        if (Platform.OS === 'ios') {
          try {
            const hasAsked = await AsyncStorage.getItem('@yoroi_healthkit_asked');
            if (hasAsked) {
              // Onboarding déjà complété : se reconnecter et reprendre l'observer
              await healthConnect.initialize();
              const connected = await healthConnect.connect();
              if (connected) {
                await healthConnect.setupWorkoutObserver();
                // Toujours relancer l'import en arrière-plan au démarrage.
                // La déduplication par UUID dans importFullHistory empêche les doublons.
                // Pas de flag de version : si DB vide ou pas, l'import tourne et synchronise.
                healthConnect.importFullHistory().catch(err => logger.error('Erreur import historique:', err));
              }
            }
            // Si hasAsked est null = premier lancement, l'onboarding gère la demande
          } catch (err) {
            logger.error('Erreur init HealthKit:', err);
          }
        }

        // Android: Health Connect - demarrer l'observer workout
        if (Platform.OS === 'android') {
          try {
            await healthConnect.initialize();
            const connected = await healthConnect.connect();
            if (connected) {
              await healthConnect.setupWorkoutObserver();
              logger.info('[HealthConnect] Observer workout Android actif');
              // Toujours relancer l'import (déduplication UUID empêche les doublons)
              healthConnect.importFullHistory().catch(err => logger.error('Erreur import historique Android:', err));
            }
          } catch (err) {
            logger.error('Erreur init Health Connect:', err);
          }
        }

      } catch (error) {
        logger.error('Erreur initialisation critique', error);
      }
    };

    init();
  }, []);

  if (!isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: LOADING_COLORS.background }}>
        <SamuraiSplash isDark={true} message="Chargement de Yoroi..." size={260} />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <I18nProvider>
          <ThemeProvider>
            <DevModeProvider>
              <AvatarProvider>
                <BadgeProvider>
                  <WatchConnectivityProvider>
                    <RootLayoutContent />
                  </WatchConnectivityProvider>
                </BadgeProvider>
              </AvatarProvider>
            </DevModeProvider>
          </ThemeProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
