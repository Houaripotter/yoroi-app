import { MesureApp } from '@/components/MesureApp';
import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, AppState, AppStateStatus, LogBox, Platform, DeviceEventEmitter } from 'react-native';
import Celebration from '@/components/Celebration';
import BiometricLockOverlay from '@/components/BiometricLockOverlay';
import { SamuraiSplash } from '@/components/SamuraiLoader';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { vitrineActive } from '@/lib/v2/visite/vitrine';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { ThemeProvider } from '@/lib/ThemeContext';
import { useFonts } from 'expo-font';
import { YoroiThemeProvider, useYoroiTheme, yoroiFonts } from '@/components/yoroi';
import { BadgeProvider } from '@/lib/BadgeContext';
import { I18nProvider } from '@/lib/I18nContext';
import { DevModeProvider } from '@/lib/DevModeContext';
import { PremiumProvider } from '@/context/PremiumContext';
import { ScreenshotModeProvider } from '@/lib/ScreenshotModeContext';
import { SportPackProvider } from '@/lib/SportPackContext';
import FakeStatusBar from '@/components/FakeStatusBar';
import { SynchroMontre } from '@/lib/v2/montre/SynchroMontre';
// 30 octobre 2026 : synchro automatique entre tes appareils appaires, app au premier plan (lib/v2/synchro/auto.ts)
import { SynchroAuto } from '@/components/yoroi/v2/synchro/SynchroAuto';
import { LiensWidgets } from '@/lib/v2/widgets/LiensWidgets';
import { AnnulerSuppression } from '@/components/yoroi/v2/seances/AnnulerSuppression';
import { AvatarProvider } from '@/lib/AvatarContext';
import { CreatorGuard } from '@/components/yoroi/v2/studio/CreatorGuard';
import { FinPremiumGuard } from '@/components/yoroi/v2/premium/FinPremiumGuard';
import { initDatabase } from '@/lib/database';
import { runDedupeMigrationOnce } from '@/lib/v2/seances/dedupeMigration';
import { applyDataRetention, getSelectedLogo, nativeIconNameFor } from '@/lib/storage';
import { importEventsFromJSON } from '@/lib/eventsService';
import { notificationService } from '@/lib/notificationService';
import { saveNotification } from '@/lib/notificationHistoryService';
import { migrateAvatarSystem } from '@/lib/avatarMigration';
import { initCitationNotifications } from '@/lib/citationNotificationService';
import { setupNotificationHandler } from '@/lib/eveningHealthTipsService';
import { stopPeerSync } from '@/lib/peerSyncService';
import { scheduleAutoBackupOnStartup } from '@/lib/autoBackupService';
import { scheduleCloudSyncCheckOnStartup } from '@/lib/multiDeviceSyncService';
import { initAutoWatchSync, syncAllWatchesEnriched } from '@/lib/unifiedWatchSyncService';
import { GlobalPasswordPromptMount } from '@/components/GlobalPasswordPromptMount';
import { FenetreHost } from '@/components/yoroi/v2/fenetre/FenetreHost';
import { ToastActualiser } from '@/components/yoroi/v2/actualiser/ToastActualiser';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { logger } from '@/lib/security/logger';
import { healthConnect } from '@/lib/healthConnect';
import * as Notifications from 'expo-notifications';
import { cibleDeNotification, cleReponse, deposerCible } from '@/lib/v2/notifications/toucher';
import { OuvertureNotifications } from '@/lib/v2/notifications/OuvertureNotifications';
import { lancerImportDiscret } from '@/lib/v2/sante/importDiscret';
import { traduire } from '@/lib/i18n/tr';

// ============================================
// SECURITY: Notification Data Validation
// ============================================
// Seuls ces ecrans recoivent un parametre id depuis une notification (toujours un nombre)
const SCREENS_WITH_ID = new Set(['competition-detail']);
const COMPETITION_NOTIF_ID = /^yoroi-competition-(\d{1,12})-/;

const validateNotificationData = (data: any, identifier?: string): { workoutId?: string; screen?: string; id?: string } => {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const result: { workoutId?: string; screen?: string; id?: string } = {};

  // Validate workoutId: must be a non-empty string, alphanumeric with hyphens/underscores
  if (typeof data.workoutId === 'string' && /^[a-zA-Z0-9_-]+$/.test(data.workoutId) && data.workoutId.length > 0) {
    result.workoutId = data.workoutId;
  }

  // Validate screen: must be a non-empty string, alphanumeric with hyphens/slashes
  if (typeof data.screen === 'string' && /^[a-zA-Z0-9_/\-]+$/.test(data.screen) && data.screen.length > 0 && data.screen.length < 100) {
    result.screen = data.screen;
  }

  // autoShare est ignore volontairement : un partage ne part jamais sans geste de la personne.
  // Les anciennes notifications qui portent encore autoShare ouvrent simplement l'ecran.

  // Rappel de competition : ouvre le detail de cette competition.
  // Les rappels programmes avant la vague 19 n'ont pas d'id dans data : on le lit dans leur identifiant fixe.
  if (data.type === 'competition') {
    const fromData = typeof data.id === 'string' || typeof data.id === 'number' ? String(data.id) : '';
    const fromIdentifier = typeof identifier === 'string' ? COMPETITION_NOTIF_ID.exec(identifier)?.[1] ?? '' : '';
    const compId = /^\d{1,12}$/.test(fromData) ? fromData : fromIdentifier;
    if (compId) {
      result.screen = 'competition-detail';
      result.id = compId;
    }
  }

  // Le parametre id n'est accepte que pour les ecrans prevus, et seulement en chiffres
  if (result.id && (!result.screen || !SCREENS_WITH_ID.has(result.screen) || !/^\d{1,12}$/.test(result.id))) {
    delete result.id;
  }

  return result;
};

// Restaurer l'icône native sélectionnée (expo-alternate-app-icons)
// Les anciens choix (Logo1, Yoroi1 a Yoroi6) n'existent plus : nativeIconNameFor les ramene a l'icone par defaut.
let _setAlternateAppIcon: ((name: string | null) => Promise<string | null>) | null = null;
let _getAppIconName: (() => string | null) | null = null;
let _supportsAlternateIcons = false;
try {
  const mod = require('expo-alternate-app-icons');
  _setAlternateAppIcon = mod.setAlternateAppIcon;
  _getAppIconName = mod.getAppIconName ?? null;
  _supportsAlternateIcons = mod.supportsAlternateIcons ?? false;
} catch {
  // Module natif indisponible (Expo Go)
}

async function restoreAppIcon() {
  if (!_supportsAlternateIcons || !_setAlternateAppIcon) return;
  try {
    const target = nativeIconNameFor(await getSelectedLogo());
    let current: string | null | undefined;
    try {
      current = _getAppIconName ? _getAppIconName() : undefined;
    } catch {
      current = undefined;
    }
    // iOS affiche une alerte a chaque changement : on ne touche a rien si l'icone est deja la bonne
    if (current !== undefined && (current ?? null) === target) return;
    await _setAlternateAppIcon(target);
  } catch (err) {
    logger.error('[Layout] Erreur restauration icône:', err);
  }
}

// ============================================
// PRODUCTION: Désactiver console.log/warn seulement
// Keep console.error active for production debugging
// ============================================
if (!__DEV__) {
  console.log = () => {};
  console.warn = () => {};
  console.debug = () => {};
  console.info = () => {};
  // console.error intentionally kept active for production error tracking
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
  background: '#F2F1EC',
  gold: '#D4AF37',
  textSecondary: '#8E8E93',
};

function RootLayoutContent() {
  // vague 35 : la barre d'etat et le fond suivent le mode clair, sombre ou auto de YOROI
  const { theme: yoroiTheme, isDark } = useYoroiTheme();
  const colors = yoroiTheme.colors;
  const router = useRouter();

  // Celebration globale : badge debloque / challenge complete / milestone
  const [celebration, setCelebration] = useState<{
    type: 'badge_unlocked' | 'challenge_complete' | 'milestone';
    title: string;
    subtitle?: string;
    xpGained?: number;
  } | null>(null);

  useEffect(() => {
    const badgeSub = DeviceEventEmitter.addListener('YOROI_BADGE_UNLOCKED', (payload: { name?: string; description?: string; xpReward?: number }) => {
      setCelebration({
        type: 'badge_unlocked',
        title: traduire('BADGE DÉBLOQUÉ'),
        subtitle: payload?.name ? `${traduire(payload.name)}${payload.description ? `, ${traduire(payload.description)}` : ''}` : undefined,
        xpGained: payload?.xpReward,
      });
    });
    const challengeSub = DeviceEventEmitter.addListener('YOROI_CHALLENGE_COMPLETE', (payload: { name?: string; xpReward?: number }) => {
      setCelebration({
        type: 'challenge_complete',
        title: traduire('DÉFI RELEVÉ'),
        subtitle: payload?.name,
        xpGained: payload?.xpReward,
      });
    });
    const milestoneSub = DeviceEventEmitter.addListener('YOROI_MILESTONE', (payload: { name?: string; subtitle?: string; xpReward?: number }) => {
      setCelebration({
        type: 'milestone',
        title: payload?.name || traduire('ÉTAPE FRANCHIE'),
        subtitle: payload?.subtitle,
        xpGained: payload?.xpReward,
      });
    });
    return () => {
      badgeSub.remove();
      challengeSub.remove();
      milestoneSub.remove();
    };
  }, []);

  // Sync widget iOS au démarrage + à chaque changement de données.
  // No-op silencieux sur Android ou si le widget n'est pas linké en Xcode.
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    let cancelled = false;
    import('@/lib/widgetSync').then(({ syncWidget }) => {
      if (cancelled) return;
      syncWidget(); // initial sync
      sub = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () => syncWidget());
    }).catch(() => {});
    return () => { cancelled = true; sub?.remove(); };
  }, []);

  // Notification hebdo récap (dimanche 19h) : s'assure qu'elle est planifiée
  useEffect(() => {
    import('@/lib/weeklyRecapNotification')
      .then(({ ensureWeeklyRecapScheduled }) => ensureWeeklyRecapScheduled())
      .catch(() => {});
  }, []);

  // Streak at risk : vérifie au lancement + à chaque foreground
  // Envoie une notif si user a streak ≥ 3j, pas de séance aujourd'hui, et il est entre 19h-22h
  useEffect(() => {
    import('@/lib/streakAtRiskNotification')
      .then(({ checkAndNotifyStreakAtRisk }) => checkAndNotifyStreakAtRisk())
      .catch(() => {});

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        import('@/lib/streakAtRiskNotification')
          .then(({ checkAndNotifyStreakAtRisk }) => checkAndNotifyStreakAtRisk())
          .catch(() => {});
      }
    });
    return () => sub.remove();
  }, []);

  // Vague 27 : rappel doux de la pesee habituelle (jamais de demande d'autorisation ici),
  // reprogramme au lancement, au retour dans l'app et apres chaque pesee
  useEffect(() => {
    const replan = () => {
      // 18 octobre 2026 : pas pendant la visite guidee avec l'exemple (les rappels suivent tes donnees, refaits a la fin)
      if (vitrineActive()) return;
      import('@/lib/v2/pesee/rappelHabitude')
        .then(({ planifierRappelPesee }) => planifierRappelPesee())
        .catch(() => {});
      // 14 octobre 2026 : rappels de seance dates, sans les jours deja faits (lib/v2/notifications/discipline.ts)
      import('@/lib/notificationService')
        .then(({ notificationService }) => notificationService.replanifierSeances())
        .catch(() => {});
    };
    replan();
    const app = AppState.addEventListener('change', (state) => {
      if (state === 'active') replan();
    });
    let timer: ReturnType<typeof setTimeout> | null = null;
    const data = DeviceEventEmitter.addListener('YOROI_DATA_CHANGED', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(replan, 1500);
    });
    // 24 octobre 2026 : programme demarre, arrete ou jour change, le texte des rappels de seance suit
    const programme = DeviceEventEmitter.addListener('YOROI_PROGRAMME_CHANGED', () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(replan, 1500);
    });
    return () => {
      app.remove();
      data.remove();
      programme.remove();
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Init crash reporter (no-op tant que Sentry n'est pas installé + DSN configuré)
  useEffect(() => {
    import('@/lib/crashReporter')
      .then(({ initCrashReporter }) => initCrashReporter())
      .catch(() => {});
  }, []);

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

    // Handler commun : sauvegarde dans la cloche + navigation deep link
    const handleNotificationTap = (response: Notifications.NotificationResponse) => {
      const { title, body, data } = response.notification.request.content;
      const validatedData = validateNotificationData(data, response.notification.request.identifier);

      if (title) {
        const type = (data?.type as string) ?? 'general';
        saveNotification(title, body ?? '', type, data as Record<string, any> | undefined).catch(() => {});
      }

      // 18 octobre 2026 : la cible attend que la navigation soit prete (demarrage a froid compris) et
      // une seance ouvre sa carte de partage (lib/v2/notifications/toucher.ts, OuvertureNotifications.tsx)
      deposerCible(cibleDeNotification(data as Record<string, unknown> | undefined, validatedData), cleReponse(response));
    };

    // Deep link: quand l'utilisateur tape sur une notification (app ouvert/background)
    const workoutNotifSubscription = Notifications.addNotificationResponseReceivedListener(handleNotificationTap);

    // COLD START: si l'app est lancée depuis un tap de notif (app killed), le listener ci-dessus
    // ne se déclenche pas. On doit vérifier manuellement la dernière réponse au montage.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        handleNotificationTap(response);
      }
    }).catch(() => {});

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

        // Sync cloche: récupère toutes les notifs présentées (reçues en background, non lues)
        // pour garantir qu'elles apparaissent dans la cloche in-app.
        // Déduplication: on ne re-save que les notifs dont l'identifier n'est pas déjà dans l'historique.
        Notifications.getPresentedNotificationsAsync().then(async (presented) => {
          if (presented.length === 0) return;
          try {
            const { getNotifications } = await import('@/lib/notificationHistoryService');
            const existing = await getNotifications();
            const existingIds = new Set(
              existing.map((n) => (n.data as any)?.__nativeId).filter(Boolean)
            );
            for (const notif of presented) {
              const nativeId = notif.request.identifier;
              if (existingIds.has(nativeId)) continue;
              const { title, body, data } = notif.request.content;
              if (!title) continue;
              const type = (data?.type as string) ?? 'general';
              const enrichedData = { ...(data as any), __nativeId: nativeId };
              saveNotification(title, body ?? '', type, enrichedData).catch(() => {});
            }
          } catch {}
        }).catch(() => {});
      }
      previousAppState = nextAppState;
    });

    return () => {
      notifSubscription?.remove?.();
      foregroundNotifSubscription?.remove?.();
      workoutNotifSubscription?.remove?.();
      appStateSubscription?.remove?.();
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
          // vague 21 : fondu court entre les pages, plus de glissement depuis la droite
          animation: 'fade',
          animationDuration: 180,
        }}
      >
        <Stack.Screen name="(tabs)" options={{ gestureEnabled: false }} />
        <Stack.Screen name="ajouter" options={{ presentation: 'transparentModal', animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="pesee" options={{ presentation: 'modal', animation: 'default' }} />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false, animation: 'fade' }} />
        {/* 14 octobre 2026 : mini onboarding de la 3.0 (mise a jour) et « Revoir la presentation » */}
        <Stack.Screen name="nouveautes" options={{ gestureEnabled: false, animation: 'fade' }} />

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
        <Stack.Screen name="add-measurement" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="entry" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="savoir" options={{ presentation: 'card' }} />
        <Stack.Screen name="sport" options={{ presentation: 'card' }} />
        <Stack.Screen name="history" options={{ presentation: 'card' }} />
        <Stack.Screen name="body-status" options={{ presentation: 'card' }} />
        <Stack.Screen name="body-composition" options={{ presentation: 'card' }} />
        <Stack.Screen name="balance-photo" options={{ presentation: 'card' }} />
        <Stack.Screen name="weight-manager" options={{ presentation: 'card' }} />
        <Stack.Screen name="body-history" options={{ presentation: 'card' }} />

        <Stack.Screen name="badges" options={{ presentation: 'card' }} />
        <Stack.Screen name="records" options={{ presentation: 'card' }} />
        <Stack.Screen name="infirmary" options={{ presentation: 'card' }} />
        <Stack.Screen name="injury-detail" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="competitions" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-competition" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="competition-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="event-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="creator-mode" options={{ presentation: 'card' }} />
        <Stack.Screen name="marketing-kit" options={{ presentation: 'card' }} />
        <Stack.Screen name="add-combat" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
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
        <Stack.Screen name="poids-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="force-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="measurements" options={{ presentation: 'card' }} />
        <Stack.Screen name="measurements-detail" options={{ presentation: 'card' }} />
        <Stack.Screen name="performance-detail" options={{ presentation: 'card' }} />

        <Stack.Screen name="health-metrics" options={{ presentation: 'card' }} />
        <Stack.Screen name="health-connect" options={{ presentation: 'card' }} />
        <Stack.Screen name="health-professionals" options={{ presentation: 'card' }} />
        <Stack.Screen name="sleep-input" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="training-goals" options={{ presentation: 'card' }} />
        <Stack.Screen name="transformation" options={{ presentation: 'card' }} />

        <Stack.Screen name="energy" options={{ presentation: 'card' }} />
        <Stack.Screen name="challenges" options={{ presentation: 'card' }} />
        {/* Écrans outils */}
        <Stack.Screen name="add-training" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="add-combat-session" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="add-club" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />


        <Stack.Screen name="quick-nutrition" options={{ presentation: 'modal', animation: 'slide_from_bottom', gestureEnabled: false }} />
        <Stack.Screen name="import-workouts" options={{ presentation: 'card' }} />
        <Stack.Screen name="importer-carnet" options={{ presentation: 'card' }} />
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
        <Stack.Screen name="wrapped" options={{ presentation: 'fullScreenModal', animation: 'fade', gestureEnabled: false }} />
        <Stack.Screen name="competition-countdown" options={{ presentation: 'card' }} />
        <Stack.Screen name="matchup-matrix" options={{ presentation: 'card' }} />
        <Stack.Screen name="partners-tier-list" options={{ presentation: 'card' }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} backgroundColor={colors.background} />
      {/* Liens des widgets et du Centre de controle : ouvre l'ecran vise une fois l'app prete */}
      <LiensWidgets />
      {/* 28 octobre 2026 : « Séance supprimée, Annuler », sur tous les ecrans */}
      <AnnulerSuppression />
      {/* Notification touchee : ouvre son ecran (carte de la seance...) une fois l'app prete */}
      <OuvertureNotifications />
      {/* Studio : coupe les modes de test quand le mode createur n'est pas actif */}
      <CreatorGuard />
      {/* Vague 47 : sans Premium, les scenes et personnages Premium sont mis de cote, puis reviennent avec Premium */}
      <FinPremiumGuard />
      <MesureApp />
      {/* Ancien hote du mot de passe (les demandes passent desormais par la fenetre maison) */}
      <GlobalPasswordPromptMount />
      {/* 28 octobre 2026 : message discret apres un tirer pour actualiser (« À jour » ou la raison d'un echec) */}
      <ToastActualiser />
      {/* Fenetre maison unique (appAlert, appChoices, appPrompt), au-dessus de tout, y compris des ecrans modaux */}
      <FenetreHost />
      {/* Biometric lock (FaceID / TouchID), tout en haut pour masquer l'UI */}
      <BiometricLockOverlay />
      {/* Celebration globale (badge / challenge / milestone) */}
      {celebration && (
        <Celebration
          visible={!!celebration}
          type={celebration.type}
          title={traduire(celebration.title)}
          subtitle={traduire(celebration.subtitle)}
          xpGained={celebration.xpGained}
          autoClose
          autoCloseDelay={3500}
          onClose={() => setCelebration(null)}
        />
      )}
      {/* Fake status bar 09:41 (mode créateur / screenshot) */}
      <FakeStatusBar />
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
          // Nettoyage unique des seances importees en double (avant la synchro entre appareils)
          await runDedupeMigrationOnce().catch(err => logger.error('Erreur nettoyage des doublons:', err));
          // Vague 45 : une demo (Heny) chargee par une ancienne version ne garde rien apres aujourd'hui (vraies donnees jamais touchees)
          import('@/lib/demoDataService').then((m) => m.trimDemoFuture()).catch(err => logger.error('Erreur nettoyage de la démo:', err));
          // Importer les événements sportifs en arrière-plan (ne bloque pas le reste)
          importEventsFromJSON().catch(err => logger.error('Erreur import événements:', err));
          // Rafraîchir les widgets avec les données actuelles
          import('@/lib/widgetData').then(({ refreshWidgetsFromDB }) => refreshWidgetsFromDB()).catch(() => {});
        } catch (err) {
          logger.error('Erreur init database ou import événements:', err);
          // Message honnete : rien n'est efface, une copie de securite a ete faite juste avant
          import('@/lib/v2/sauvegarde/echec').then((m) => m.annoncerEchecMiseAJour(err)).catch(() => {});
        }

        // Restaurer l'icône native (doit correspondre au logo sélectionné par l'utilisateur)
        restoreAppIcon().catch(err => logger.error('Erreur restauration icone:', err));

        // Services indépendants en parallèle (DB déjà prête)
        await Promise.allSettled([
          migrateAvatarSystem()
            .then(() => logger.info('Migration avatars effectuee'))
            .catch(err => logger.error('Erreur migration avatars:', err)),

          // Aucune demande d'autorisation au demarrage : on ne programme que si elle est deja accordee
          Notifications.getPermissionsAsync()
            .then(({ status }) => {
              if (status !== 'granted') {
                logger.info('Notifications non autorisées : programmation en attente');
                return;
              }
              return notificationService.initialize()
                .then(success => {
                  if (success) {
                    logger.info('Service notifications initialisé');
                    return initCitationNotifications()
                      .then(() => logger.info('Citation du jour initialisée'))
                      // 23 octobre 2026 : rappels refaits dans la nouvelle langue quand elle a changé
                      .then(() => import('@/lib/i18n/notifsLangue').then(({ replanifierSiLangueChangee }) => replanifierSiLangueChangee()));
                  }
                });
            })
            .catch(err => logger.error('Erreur notifications:', err)),

          applyDataRetention()
            .then(() => logger.info('Data retention policy applied'))
            .catch(err => logger.error('Erreur data retention:', err)),

          // Synchro iPhone et iPad : ne demarre plus au lancement (13 octobre 2026).
          // Elle demarre seulement depuis l'ecran de synchro, avec un appareil appaire par code.
        ]);

        // Auto-backup silent quotidien (ne ralentit pas le démarrage, delay 8s)
        scheduleAutoBackupOnStartup();
        // Multi-device sync : check si un backup cloud plus récent existe (delay 12s)
        scheduleCloudSyncCheckOnStartup();
        // Wear OS (Android) : sync enrichie, débounced 3s après chaque modif. L'Apple Watch passe par <SynchroMontre />.
        initAutoWatchSync();
        // Première sync au démarrage (delay 10s)
        setTimeout(() => syncAllWatchesEnriched().catch(() => {}), 10000);

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
                // Throttle : ne relancer l'import complet qu'une fois toutes les 24h.
                // Sinon, à chaque démarrage, ça déclenche le banner "Import santé"
                // qui clignote pendant que 6000+ entrées sont reparcourues.
                // L'observer workout (setupWorkoutObserver) capte déjà les nouvelles
                // séances en temps réel, donc le full import est juste un filet de sécurité.
                const LAST_IMPORT_KEY = '@yoroi_last_full_import_ts';
                const lastStr = await AsyncStorage.getItem(LAST_IMPORT_KEY);
                const last = lastStr ? parseInt(lastStr, 10) : 0;
                const now = Date.now();
                if (!last || now - last > 24 * 3600 * 1000) {
                  // 16 octobre 2026 : filet de securite en discret, sans l'ancien bandeau « Import santé » (lib/v2/sante/importDiscret.ts)
                  lancerImportDiscret(() => healthConnect.importFullHistory())
                    .then(() => AsyncStorage.setItem(LAST_IMPORT_KEY, String(now)))
                    .catch(err => logger.error('Erreur import historique:', err));
                } else {
                  logger.info(`[HealthKit] Import full skip (dernier il y a ${Math.round((now - last) / 3600000)}h)`);
                }
              }
            }
            // Si hasAsked est null = premier lancement, l'onboarding gère la demande
          } catch (err) {
            logger.error('Erreur init HealthKit:', err);
          }
        }

        // Android: Health Connect - demarrer l'observer workout
        // NOTE: on vérifie @yoroi_healthkit_asked (même clé qu'iOS) pour ne se connecter
        // qu'après l'onboarding. Sans ce check, connect() demande les permissions Health
        // Connect dès le premier lancement, ce qui cause un crash sur Android.
        if (Platform.OS === 'android') {
          try {
            // IMPORTANT : on utilise '@yoroi_healthconnect_connected' (mis à 'true' UNIQUEMENT
            // si l'utilisateur a réussi à connecter Health Connect dans l'onboarding ou les réglages).
            // NE PAS utiliser '@yoroi_healthkit_asked' ici : ce flag est mis à 'true' même si
            // l'utilisateur a sauté la page Health, ce qui déclencherait connect() → requestPermission()
            // au démarrage → crash sur certains Android.
            const wasConnected = await AsyncStorage.getItem('@yoroi_healthconnect_connected');
            if (wasConnected === 'true') {
              await healthConnect.initialize();
              // Reconnexion silencieuse : pas de fenêtre de permission ni de sync lourde à chaque lancement
              const connected = await (healthConnect as any).connect({ silent: true });
              if (connected) {
                await healthConnect.setupWorkoutObserver();
                logger.info('[HealthConnect] Observer workout Android actif');
                // Throttle : import complet max 1x par 24h (même raison que iOS ci-dessus)
                const LAST_IMPORT_KEY_ANDROID = '@yoroi_last_full_import_ts_android';
                const lastStrA = await AsyncStorage.getItem(LAST_IMPORT_KEY_ANDROID);
                const lastA = lastStrA ? parseInt(lastStrA, 10) : 0;
                const nowA = Date.now();
                if (!lastA || nowA - lastA > 24 * 3600 * 1000) {
                  // 16 octobre 2026 : en discret, sans bandeau (meme raison que iOS)
                  lancerImportDiscret(() => healthConnect.importFullHistory())
                    .then(() => AsyncStorage.setItem(LAST_IMPORT_KEY_ANDROID, String(nowA)))
                    .catch(err => logger.error('Erreur import historique Android:', err));
                }
              }
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

  const [yoroiFontsLoaded, yoroiFontsError] = useFonts(yoroiFonts);

  if (!isReady || (!yoroiFontsLoaded && !yoroiFontsError)) {
    return (
      <View style={{ flex: 1, backgroundColor: LOADING_COLORS.background }}>
        {/* meme fond et meme embleme que le splash natif : le passage se fait sans saut */}
        <SamuraiSplash />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <ErrorBoundary>
      <SafeAreaProvider>
        <I18nProvider>
          <ThemeProvider>
            <YoroiThemeProvider initialTheme="dojo" locked>
            <DevModeProvider>
              <PremiumProvider>
              <ScreenshotModeProvider>
                <SportPackProvider>
                  <AvatarProvider>
                    <BadgeProvider>
                      <SynchroMontre />
                      <SynchroAuto />
                      <RootLayoutContent />
                    </BadgeProvider>
                  </AvatarProvider>
                </SportPackProvider>
              </ScreenshotModeProvider>
              </PremiumProvider>
            </DevModeProvider>
            </YoroiThemeProvider>
          </ThemeProvider>
        </I18nProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
    </GestureHandlerRootView>
  );
}
