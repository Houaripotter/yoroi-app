// ============================================
// CRASH REPORTER
// Wrapper neutre pour reporter les crashs/erreurs critiques.
//
// Actuellement : no-op en prod, log en dev. Prêt à recevoir Sentry/Bugsnag.
//
// Pour activer Sentry :
//   npm install @sentry/react-native
//   Puis décommenter les blocs Sentry ci-dessous et ajouter DSN dans .env :
//   EXPO_PUBLIC_SENTRY_DSN=https://xxx@sentry.io/yyy
// ============================================

import Constants from 'expo-constants';
import { Platform } from 'react-native';
import logger from './security/logger';

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN;
const IS_DEV = __DEV__;

interface CrashContext {
  user?: { id?: string; anonId?: string };
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

let initialized = false;

/**
 * Init crash reporter au démarrage de l'app.
 * No-op si SENTRY_DSN vide ou si @sentry/react-native pas installé.
 */
export const initCrashReporter = (): void => {
  if (initialized) return;
  initialized = true;

  if (!SENTRY_DSN) {
    logger.info('[CrashReporter] Aucun DSN Sentry configuré, mode dev only');
    return;
  }

  // TODO: décommenter quand @sentry/react-native sera installé
  // try {
  //   const Sentry = require('@sentry/react-native');
  //   Sentry.init({
  //     dsn: SENTRY_DSN,
  //     environment: IS_DEV ? 'development' : 'production',
  //     release: Constants.expoConfig?.version,
  //     enableAutoSessionTracking: true,
  //     sessionTrackingIntervalMillis: 30000,
  //     tracesSampleRate: IS_DEV ? 1.0 : 0.1,
  //     // Ne PAS envoyer d'info perso (hydration, poids, etc.)
  //     beforeSend: (event) => {
  //       if (event.user) delete event.user.email;
  //       return event;
  //     },
  //   });
  //   logger.info('[CrashReporter] Sentry initialisé');
  // } catch (e) {
  //   logger.warn('[CrashReporter] Sentry indisponible:', e);
  // }
};

/**
 * Signale une exception non-fatale (erreur rattrapée) au crash reporter.
 */
export const captureException = (error: unknown, context?: CrashContext): void => {
  if (IS_DEV) {
    logger.error('[Exception]', error, context);
  }
  // TODO: Sentry.captureException(error, { tags: context?.tags, extra: context?.extra });
};

/**
 * Signale un message d'erreur custom.
 */
export const captureMessage = (message: string, level: 'info' | 'warning' | 'error' = 'info'): void => {
  if (IS_DEV) {
    if (level === 'error') logger.error('[Message]', message);
    else if (level === 'warning') logger.warn('[Message]', message);
    else logger.info('[Message]', message);
  }
  // TODO: Sentry.captureMessage(message, level);
};

/**
 * Associe l'user anonyme (UUID local) aux events futurs.
 */
export const setUser = (userId: string | undefined): void => {
  // TODO: Sentry.setUser(userId ? { id: userId } : null);
};

/**
 * Ajoute un breadcrumb (fil d'Ariane) pour contextualiser les crashs futurs.
 * Ex: "User ouvre Stats", "User ajoute séance", etc.
 */
export const addBreadcrumb = (message: string, category: string = 'app'): void => {
  // TODO: Sentry.addBreadcrumb({ message, category, level: 'info' });
};
