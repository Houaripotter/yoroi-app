/**
 * Un seul gestionnaire de notifications au premier plan (30 octobre 2026).
 * expo-notifications ne garde que le dernier setNotificationHandler appele : chaque service qui en installe un
 * (citations, minuteurs, sparring, notificationService) passe par ici, donc la regle est la meme quel que soit l'ordre.
 *  - fin de repos (rest_finished) avec l'app ouverte : rien d'affiche ni de son, l'ecran bippe deja (lib/v2/seance/rappelRepos.ts) ;
 *  - sinon : banniere, liste, son et pastille ; fin de minuteur en priorite maximale sur Android.
 */
import * as Notifications from 'expo-notifications';
import { AppState } from 'react-native';

const SILENCE = { shouldShowAlert: false, shouldPlaySound: false, shouldSetBadge: false, shouldShowBanner: false, shouldShowList: false };
const TYPES_MINUTEUR = new Set(['timer_finished']);

/** Logique pure, testee (__tests__/unit/gestionnaireNotifications.test.ts) */
export function comportementNotification(type: unknown, etatApp: string | null | undefined): Notifications.NotificationBehavior {
  if (type === 'rest_finished' && etatApp === 'active') return { ...SILENCE } as Notifications.NotificationBehavior;
  return {
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
    ...(typeof type === 'string' && TYPES_MINUTEUR.has(type) ? { priority: Notifications.AndroidNotificationPriority?.MAX } : {}),
  } as Notifications.NotificationBehavior;
}

export function installerGestionnaireNotifications(): void {
  try {
    Notifications.setNotificationHandler({
      handleNotification: async (n) => comportementNotification((n?.request?.content?.data as Record<string, unknown> | undefined)?.type, AppState.currentState),
    });
  } catch {
    // module natif absent (web, tests) : rien a installer
  }
}
