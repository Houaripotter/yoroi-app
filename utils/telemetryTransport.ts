/**
 * Transport REEL de la mesure : Firebase Analytics et Sentry (13 octobre 2026).
 *
 * A copier sur utils/telemetryTransport.ts SEULEMENT apres l'installation des paquets :
 *   @react-native-firebase/app, @react-native-firebase/analytics, @sentry/react-native
 * (voir le document de projet « mesure, installation »).
 *
 * Chargement defensif : si le module natif manque (Expo Go, build ancien), tout devient une coquille et l'app
 * demarre normalement. Pas d'initialisation Sentry en developpement.
 *
 * Donnees de sante : beforeBreadcrumb ne garde que trois categories sures (mesure, navigation sans parametres,
 * cycle de vie de l'app) ; beforeSend masque tous les nombres des messages et exceptions, retire utilisateur,
 * requete, nom d'appareil, et jette les evenements du simulateur.
 *
 * Module natif absent (16 octobre 2026) : on verifie TurboModuleRegistry et NativeModules AVANT tout require.
 * Si Firebase n'est pas dans le binaire, la mesure passe en mode silencieux (compteur local seulement).
 *
 * Simulateur et developpement (16 octobre 2026) : RIEN ne part, ni vers Firebase ni vers Sentry.
 * Lecon d'INRO : les tests sur simulateur polluaient les chiffres. La collecte Firebase est coupee
 * nativement et aucun evenement n'est envoye quand l'app tourne sur un simulateur ou en mode dev.
 */
import type { Transport } from './telemetryTransport.types';

let actifCourant = true;

/* eslint-disable @typescript-eslint/no-require-imports */
function estSimulateur(): boolean {
  try {
    // Lecture du module natif ExpoDevice sans charger le paquet JS : rien ne peut lever d'ecran rouge.
    const core = require('expo-modules-core');
    const D = typeof core?.requireOptionalNativeModule === 'function' ? core.requireOptionalNativeModule('ExpoDevice') : null;
    return D?.isDevice === false;
  } catch {
    return false;
  }
}

/**
 * Le module natif est il vraiment dans le binaire ? (16 octobre 2026)
 * Lecon de l'ecran rouge « NativeRNFBTurboApp is not registered » : un try autour de require ne suffit pas.
 * En developpement, Metro attrape l'erreur levee pendant le chargement du paquet et l'affiche en ecran rouge
 * avant que notre catch ne la voie. Il faut donc regarder AVANT de charger le paquet JS.
 * Nouvelle architecture : TurboModuleRegistry. Ancienne : NativeModules.
 */
export function moduleNatifPresent(...noms: string[]): boolean {
  try {
    const RN = require('react-native');
    if (RN?.Platform?.OS === 'web') return false;
    for (const nom of noms) {
      try {
        if (RN?.TurboModuleRegistry?.get?.(nom)) return true;
      } catch {
        // registre indisponible : on regarde l'ancienne architecture
      }
      if (RN?.NativeModules?.[nom]) return true;
    }
  } catch {
    // react-native absent (tests node) : pas de module natif
  }
  return false;
}
/* eslint-enable @typescript-eslint/no-require-imports */

/** Vrai sur simulateur ou en developpement : la mesure reste muette, quoi qu'il arrive. */
export const HORS_PRODUCTION: boolean = __DEV__ || estSimulateur();
let sentryPret = false;

/* eslint-disable @typescript-eslint/no-require-imports */
// undefined : pas encore regarde ; null : absent pour toute la session (mode silencieux)
let firebaseCache: { m: any; a: any } | null | undefined;

function firebase(): any | null {
  if (firebaseCache !== undefined) return firebaseCache;
  firebaseCache = null;
  // Les deux modules natifs doivent etre dans le binaire, sinon on ne touche JAMAIS au paquet JS.
  if (!moduleNatifPresent('NativeRNFBTurboApp', 'RNFBAppModule')) return null;
  if (!moduleNatifPresent('NativeRNFBTurboAnalytics', 'RNFBAnalyticsModule')) return null;
  try {
    const m = require('@react-native-firebase/analytics');
    if (!m || typeof m.getAnalytics !== 'function') return null;
    const a = m.getAnalytics();
    firebaseCache = { m, a };
  } catch {
    firebaseCache = null;
  }
  return firebaseCache;
}

let sentryCache: any | null | undefined;

function sentry(): any | null {
  if (sentryCache !== undefined) return sentryCache;
  sentryCache = null;
  if (!moduleNatifPresent('RNSentry')) return null;
  try {
    sentryCache = require('@sentry/react-native') ?? null;
  } catch {
    sentryCache = null;
  }
  return sentryCache;
}

/** Pour les tests seulement : oublie ce qui a ete detecte. */
export function __reinitialiserDetection(): void {
  firebaseCache = undefined;
  sentryCache = undefined;
}
/* eslint-enable @typescript-eslint/no-require-imports */

const masquerNombres = (s: unknown) => (typeof s === 'string' ? s.replace(/\d+(?:[.,]\d+)?/g, '#') : s);

const CATEGORIES_SURES = new Set(['mesure', 'navigation', 'app.lifecycle']);

function filtrerFilAriane(b: any): any | null {
  if (!actifCourant) return null;
  if (!b || !CATEGORIES_SURES.has(b.category)) return null;
  if (b.category === 'navigation' && b.data) {
    for (const k of ['from', 'to']) if (typeof b.data[k] === 'string') b.data[k] = b.data[k].replace(/\?.*$/, '');
  }
  if (b.message) b.message = masquerNombres(b.message);
  return b;
}

function filtrerEvenement(e: any): any | null {
  if (!actifCourant) return null;
  if (e?.contexts?.device?.simulator === true) return null;
  delete e.user;
  delete e.request;
  delete e.server_name;
  if (e.contexts?.device) delete e.contexts.device.name;
  if (e.message) e.message = masquerNombres(e.message);
  for (const ex of e.exception?.values ?? []) ex.value = masquerNombres(ex.value);
  e.breadcrumbs = (e.breadcrumbs ?? []).map(filtrerFilAriane).filter(Boolean);
  delete e.extra;
  return e;
}

function demarrerSentry(): void {
  if (__DEV__ || sentryPret) return;
  const S = sentry();
  const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;
  if (!S || !dsn) return;
  try {
    S.init({
      dsn,
      environment: 'production',
      sendDefaultPii: false,
      attachScreenshot: false,
      attachViewHierarchy: false,
      maxBreadcrumbs: 50,
      beforeBreadcrumb: filtrerFilAriane,
      beforeSend: filtrerEvenement,
      beforeSendTransaction: () => null,
      tracesSampleRate: 0,
    });
    sentryPret = true;
  } catch {
    // Sentry indisponible : l'app continue
  }
}

async function arreterSentry(): Promise<void> {
  const S = sentry();
  if (!S || !sentryPret) return;
  try {
    await S.close();
  } catch {
    // rien
  }
  sentryPret = false;
}

async function collecte(actif: boolean): Promise<void> {
  const f = firebase();
  if (!f) return;
  try {
    await f.m.setConsent(f.a, {
      analytics_storage: actif,
      ad_storage: false,
      ad_user_data: false,
      ad_personalization: false,
    });
  } catch {
    // ancienne version sans setConsent
  }
  try {
    await f.m.setAnalyticsCollectionEnabled(f.a, actif);
  } catch {
    // module natif absent
  }
}

export const transport: Transport = {
  get disponible() {
    return firebase() !== null;
  },
  async init(actif) {
    actifCourant = actif && !HORS_PRODUCTION;
    await collecte(actifCourant);
    if (actifCourant) demarrerSentry();
  },
  async setActif(actif) {
    actifCourant = actif && !HORS_PRODUCTION;
    await collecte(actifCourant);
    if (actifCourant) demarrerSentry();
    else await arreterSentry();
  },
  async evenement(nom, params) {
    if (!actifCourant) return false;
    const f = firebase();
    if (!f) return false;
    try {
      if (nom === 'screen_view') {
        const ecran = params?.ecran ?? 'inconnu';
        await f.m.logEvent(f.a, 'screen_view', { screen_name: ecran, screen_class: ecran });
      } else {
        await f.m.logEvent(f.a, nom, params ?? {});
      }
      return true;
    } catch {
      return false;
    }
  },
  filAriane(nom, params) {
    if (!actifCourant || !sentryPret) return;
    try {
      sentry()?.addBreadcrumb({ category: 'mesure', message: nom, data: params, level: 'info' });
    } catch {
      // rien
    }
  },
  proprietes(p) {
    if (!actifCourant) return;
    const f = firebase();
    if (!f) return;
    const propres: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(p)) if (typeof v === 'string') propres[k] = v;
    f.m.setUserProperties(f.a, propres).catch(() => {});
  },
  async idInstance() {
    if (HORS_PRODUCTION) return null;
    const f = firebase();
    if (!f) return null;
    try {
      return (await f.m.getAppInstanceId(f.a)) ?? null;
    } catch {
      return null;
    }
  },
};
