/**
 * PostHog, hebergement Europe (21 novembre 2026, build 3.0.4), sur le modele d'INRO (utils/analytics.ts).
 *
 * Branche dans utils/telemetryTransport.ts : il n'y a toujours qu'un point d'entree, track() de utils/telemetry.ts.
 * Chaque track() part vers Firebase avec son nom francais, et AUSSI vers PostHog, mais seulement s'il figure
 * dans CORRESPONDANCE_POSTHOG ci-dessous, sous son nom anglais. Tout autre evenement ne part pas vers PostHog.
 *
 * Donnees de sante : RIEN ne part. Ni poids, ni mensuration, ni frequence cardiaque, ni sommeil, ni aucune valeur.
 *  1. La table ne recopie que des identifiants de listes fermees (origine, etape, statut, source, formule, famille).
 *  2. LISTE_BLANCHE : par evenement, les seules proprietes autorisees et leurs valeurs possibles. Toute autre
 *     propriete est retiree avant l'envoi, meme si un appel futur en ajoutait une.
 *  3. filtreAvantEnvoi (option before_send du SDK) : dernier filet. Il jette tout evenement hors de la liste
 *     (ecrans, exceptions, identify...) et retire les proprietes de personne ($set, $set_once).
 * Pas d'identify, pas de propriete de personne : PostHog garde son identifiant anonyme d'installation.
 *
 * Reglages du SDK : defaultOptIn false (rien ne part avant la lecture de l'interrupteur), puis optIn ou optOut
 * selon le consentement ; pas d'evenements de cycle de vie automatiques, pas d'enregistrement de session (session
 * replay), pas de prechargement des feature flags, pas de capture automatique (elle ne passe que par
 * PostHogProvider, que YOROI n'utilise pas), pas de capture automatique des erreurs (Sentry s'en charge).
 *
 * Silence : sur simulateur, en developpement, sans cle EXPO_PUBLIC_POSTHOG_KEY ou sans le paquet, aucun client
 * n'est cree. L'app demarre normalement et rien ne part.
 *
 * Testable : creerEnvoiPostHog recoit sa configuration et sa fabrique de client, les tests injectent un faux PostHog.
 */
import type { NomEvenement } from './telemetry';
import { ONBOARDING_NEUF_ACTIF, ORDRE_MESURE_NEUF, TRANCHES_TEMPS } from '@/lib/v2/onboarding/interrupteur';

export const POSTHOG_HOTE = 'https://eu.i.posthog.com';

export type NomPostHog =
  | 'app_opened'
  | 'onboarding_step'
  | 'onboarding_completed'
  // 21 novembre 2026 : le nouvel onboarding et son paywall en 3 temps (components/yoroi/v2/onboarding-neuf/mesure.ts)
  | 'onboarding_answer'
  | 'notifications_answered'
  | 'paywall_step_viewed'
  | 'winback_shown'
  | 'winback_tapped'
  | 'winback_purchased'
  | 'winback_dismissed'
  // 22 novembre 2026 : la reprise depuis une autre app, ouverte depuis la question de l'ancienne app du nouvel onboarding, puis reussie
  | 'import_opened'
  | 'import_completed'
  | 'paywall_shown'
  | 'trial_started'
  | 'purchase_completed'
  | 'purchase_cancelled'
  | 'weigh_in_logged'
  | 'measurement_logged'
  | 'workout_completed'
  | 'coach_program_started'
  | 'rating_prompt_shown';

export type ProprietesPostHog = Record<string, string | number>;
export type Traduction = { nom: NomPostHog; props: ProprietesPostHog } | null;
type Params = Record<string, string>;

/**
 * Ordre d'affichage des ecrans de l'onboarding mesures (app/onboarding.tsx, ordreDe) : sert au numero d'etape.
 * La source (ou tu as entendu parler de YOROI) se place apres le resultat, juste avant Premium.
 * Un ecran saute garde son numero : le numero dit ou l'on est dans le parcours, pas combien d'ecrans on a vus.
 */
export const ORDRE_ONBOARDING_ANCIEN = [
  'accroche', 'prenom', 'toi', 'age', 'univers', 'objectif', 'frein', 'affirmation', 'sport', 'poids',
  'taille', 'cap', 'rythme', 'moment', 'demo', 'comparaison', 'forge', 'resultat', 'source', 'premium',
] as const;

/**
 * 21 novembre 2026 : l'ordre du parcours en service. Nouvel onboarding (interrupteur allume) : ses 25 ecrans dans
 * l'ordre (lib/v2/onboarding/interrupteur.ts) ; sinon l'ancien.
 */
export const ORDRE_ONBOARDING: readonly string[] = ONBOARDING_NEUF_ACTIF ? ORDRE_MESURE_NEUF : ORDRE_ONBOARDING_ANCIEN;

/**
 * Correspondance des evenements existants (noms francais, Firebase) vers les noms PostHog.
 * Absent de cette table : ne part pas vers PostHog.
 */
export const CORRESPONDANCE_POSTHOG: { readonly [K in NomEvenement]?: (p: Params) => Traduction } = {
  // a chaque ouverture, meme origine que trackBoot (icone, notification, widget, lien)
  app_boot: (p) => ({ nom: 'app_opened', props: { origine: p.origine } }),
  // lib/v2/onboarding/events.ts
  onboarding_etape: (p) => {
    const i = ORDRE_ONBOARDING.indexOf(p.etape);
    if (i < 0) return null;
    // nouvel onboarding : la tranche du temps passe sur l'ecran (jamais la duree exacte)
    const props: ProprietesPostHog = { step: i + 1, step_name: p.etape };
    if (p.temps) props.time_bucket = p.temps;
    return { nom: 'onboarding_step', props };
  },
  onboarding_termine: (p) => ({ nom: 'onboarding_completed', props: { status: p.statut } }),
  // 21 novembre 2026 : nouvel onboarding. Le choix (liste fermee) ou la famille de sport, jamais une valeur.
  onboarding_choix: (p) => ({ nom: 'onboarding_answer', props: { step_name: p.etape, answer: p.choix ?? p.famille } }),
  onboarding_rappels: (p) => ({ nom: 'notifications_answered', props: { answer: p.reponse } }),
  paywall_ecran_vu: (p) => ({ nom: 'paywall_step_viewed', props: { screen: Number(p.ecran) } }),
  rattrapage_vue: (p) => ({ nom: 'winback_shown', props: { source: p.source } }),
  rattrapage_tap: (p) => ({ nom: 'winback_tapped', props: { source: p.source } }),
  rattrapage_ok: (p) => ({ nom: 'winback_purchased', props: { source: p.source } }),
  rattrapage_refus: (p) => ({ nom: 'winback_dismissed', props: { source: p.source } }),
  // 22 novembre 2026 : l'app d'origine seulement (liste fermee), jamais un nombre de seances ni un nom d'exercice
  reprise_ouverte: (p) => ({ nom: 'import_opened', props: { source: p.source } }),
  reprise_reussie: (p) => ({ nom: 'import_completed', props: { source: p.source, app: p.app } }),
  // lib/v2/premium/events.ts (appele par le paywall, PremiumContext n'est pas touche)
  paywall_view: (p) => ({ nom: 'paywall_shown', props: { source: p.source } }),
  paywall_purchase_ok: (p) => ({ nom: p.essai === 'oui' ? 'trial_started' : 'purchase_completed', props: { source: p.source, plan: p.plan } }),
  paywall_purchase_cancel: (p) => ({ nom: 'purchase_cancelled', props: { source: p.source, plan: p.plan } }),
  // usage : le fait seulement, jamais la valeur. Le poids pose pendant l'onboarding n'est pas une pesee de suivi.
  poids_saisi: (p) => (p.methode === 'onboarding' ? null : { nom: 'weigh_in_logged', props: {} }),
  mensuration_ajoutee: () => ({ nom: 'measurement_logged', props: {} }),
  seance_enregistree: (p) => ({ nom: 'workout_completed', props: { sport_type: p.famille } }),
  // lib/v2/programmes/suivi.ts, demarrerProgramme : depart du coach, fiche programme, questionnaire
  programme_choisi: (p) => ({ nom: 'coach_program_started', props: { program_type: p.type } }),
  // lib/v2/notifications/mesure.ts
  avis_demande: () => ({ nom: 'rating_prompt_shown', props: {} }),
};

const dans = (liste: readonly string[]) => (v: unknown) => typeof v === 'string' && liste.includes(v);
/** Identifiant de liste fermee : minuscules et tirets bas, aucun chiffre, donc aucune valeur mesuree */
const identifiant = (v: unknown) => typeof v === 'string' && /^[a-z_]{1,40}$/.test(v);
const SOURCE = identifiant;
const PLAN = dans(['mensuel', 'annuel']);

/** Liste blanche stricte : par evenement, les proprietes autorisees et le controle de leur valeur */
export const LISTE_BLANCHE: { readonly [N in NomPostHog]: Readonly<Record<string, (v: unknown) => boolean>> } = {
  app_opened: { origine: dans(['icone', 'notification', 'widget', 'lien']) },
  onboarding_step: {
    step: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= ORDRE_ONBOARDING.length,
    step_name: dans(ORDRE_ONBOARDING),
    time_bucket: dans(TRANCHES_TEMPS),
  },
  onboarding_completed: { status: dans(['gratuit', 'essai', 'abonne']) },
  onboarding_answer: { step_name: dans(ORDRE_ONBOARDING), answer: identifiant },
  notifications_answered: { answer: dans(['accepte', 'refuse']) },
  paywall_step_viewed: { screen: (v) => typeof v === 'number' && Number.isInteger(v) && v >= 1 && v <= 3 },
  winback_shown: { source: SOURCE },
  winback_tapped: { source: SOURCE },
  winback_purchased: { source: SOURCE },
  winback_dismissed: { source: SOURCE },
  import_opened: { source: SOURCE },
  import_completed: { source: SOURCE, app: dans(['hevy', 'strong', 'fitnotes', 'autre']) },
  paywall_shown: { source: SOURCE },
  trial_started: { source: SOURCE, plan: PLAN },
  purchase_completed: { source: SOURCE, plan: PLAN },
  purchase_cancelled: { source: SOURCE, plan: PLAN },
  weigh_in_logged: {},
  measurement_logged: {},
  workout_completed: { sport_type: dans(['muscu', 'combat', 'cardio', 'autre']) },
  coach_program_started: { program_type: dans(['muscle', 'force', 'forme', 'combat', 'course', 'perso']) },
  rating_prompt_shown: {},
};

export const NOMS_POSTHOG = Object.keys(LISTE_BLANCHE) as NomPostHog[];

/** Proprietes posees par register sur chaque evenement */
const PROPRIETES_COMMUNES = ['app', 'env', 'platform'];

/** Garde seulement les proprietes de la liste blanche de cet evenement, avec une valeur valide */
export function filtrerProprietes(nom: NomPostHog, props: Record<string, unknown> | undefined): ProprietesPostHog {
  const regles = LISTE_BLANCHE[nom];
  const propres: ProprietesPostHog = {};
  if (!regles || !props) return propres;
  for (const [k, v] of Object.entries(props)) {
    if (Object.prototype.hasOwnProperty.call(regles, k) && regles[k](v)) propres[k] = v as string | number;
  }
  return propres;
}

/** Traduit un evenement de la mesure en evenement PostHog, ou null s'il ne doit pas partir vers PostHog */
export function traduirePourPostHog(nom: string, params?: Params): Traduction {
  const f = (CORRESPONDANCE_POSTHOG as Record<string, ((p: Params) => Traduction) | undefined>)[nom];
  if (!f) return null;
  let t: Traduction;
  try {
    t = f(params ?? {});
  } catch {
    return null;
  }
  if (!t || !(t.nom in LISTE_BLANCHE)) return null;
  return { nom: t.nom, props: filtrerProprietes(t.nom, t.props) };
}

/** Dernier filet, passe au SDK en before_send : seuls nos evenements, sans propriete de personne */
export function filtreAvantEnvoi<E extends { event: string; properties?: Record<string, any>; $set?: unknown; $set_once?: unknown }>(e: E): E | null {
  if (!e || !(NOMS_POSTHOG as string[]).includes(e.event)) return null;
  delete e.$set;
  delete e.$set_once;
  if (e.properties) {
    const regles = LISTE_BLANCHE[e.event as NomPostHog];
    for (const k of Object.keys(e.properties)) {
      if (k === '$set' || k === '$set_once') delete e.properties[k];
      else if (k.startsWith('$')) continue; // proprietes techniques du SDK (systeme, version de l'app, session)
      else if (PROPRIETES_COMMUNES.includes(k)) continue;
      else if (!Object.prototype.hasOwnProperty.call(regles, k) || !regles[k](e.properties[k])) delete e.properties[k];
    }
  }
  return e;
}

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

/** Ce que YOROI utilise du client PostHog : rien d'autre (pas d'identify, pas de screen, pas de propriete de personne) */
export interface ClientPostHog {
  capture(evenement: string, proprietes?: ProprietesPostHog): unknown;
  register(proprietes: Record<string, string>): unknown;
  optIn(): unknown;
  optOut(): unknown;
}

export interface ConfigPostHog {
  /** EXPO_PUBLIC_POSTHOG_KEY ; vide : PostHog reste muet */
  cle: string;
  /** simulateur ou developpement : PostHog reste muet */
  horsProduction: boolean;
  env: 'development' | 'production';
  plateforme: string;
  /** Fabrique du client ; null si le paquet manque */
  creer: (cle: string, options: Record<string, unknown>) => ClientPostHog | null;
  /** Stockage du SDK (AsyncStorage dans l'app), comme INRO */
  stockage?: unknown;
}

export function optionsPostHog(stockage?: unknown): Record<string, unknown> {
  return {
    host: POSTHOG_HOTE,
    ...(stockage ? { customStorage: stockage } : {}),
    persistence: 'file',
    defaultOptIn: false,
    captureAppLifecycleEvents: false,
    enableSessionReplay: false,
    preloadFeatureFlags: false,
    errorTracking: { autocapture: { uncaughtExceptions: false, unhandledRejections: false, console: false, nativeCrashes: false } },
    before_send: filtreAvantEnvoi,
  };
}

export function creerEnvoiPostHog(config: ConfigPostHog) {
  let client: ClientPostHog | null = null;
  let essaye = false;
  let actif = false;

  const peutExister = () => !config.horsProduction && !!config.cle;

  function obtenir(): ClientPostHog | null {
    if (client || essaye || !peutExister()) return client;
    essaye = true;
    try {
      client = config.creer(config.cle, optionsPostHog(config.stockage));
      if (client) void Promise.resolve(client.register({ app: 'yoroi', env: config.env, platform: config.plateforme })).catch(() => {});
    } catch {
      client = null;
    }
    return client;
  }

  function appliquer(): void {
    const c = obtenir();
    if (!c) return;
    try {
      void Promise.resolve(actif ? c.optIn() : c.optOut()).catch(() => {});
    } catch {
      // rien
    }
  }

  return {
    /** Au demarrage, avec le consentement lu dans les Reglages */
    init(consentement: boolean): void {
      actif = consentement && peutExister();
      appliquer();
    },
    /** Interrupteur des Reglages, Confidentialite : coupe PostHog comme Firebase et Sentry */
    setActif(consentement: boolean): void {
      actif = consentement && peutExister();
      appliquer();
    },
    /** Vrai si l'evenement est parti vers PostHog */
    envoyer(nom: string, params?: Params): boolean {
      if (!actif) return false;
      const c = obtenir();
      if (!c) return false;
      const t = traduirePourPostHog(nom, params);
      if (!t) return false;
      try {
        c.capture(t.nom, t.props);
        return true;
      } catch {
        return false;
      }
    },
  };
}

export type EnvoiPostHog = ReturnType<typeof creerEnvoiPostHog>;

/* eslint-disable @typescript-eslint/no-require-imports */
/** Configuration reelle de l'app. Le paquet n'est charge qu'au besoin : jamais en developpement ni sans cle. */
export function configPostHogReelle(horsProduction: boolean): ConfigPostHog {
  let plateforme = 'inconnue';
  try {
    plateforme = require('react-native')?.Platform?.OS ?? 'inconnue';
  } catch {
    // tests node
  }
  return {
    cle: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
    horsProduction,
    env: __DEV__ ? 'development' : 'production',
    plateforme,
    creer: (cle, options) => {
      try {
        const m = require('posthog-react-native');
        const Classe = m?.PostHog ?? m?.default;
        if (typeof Classe !== 'function') return null;
        let stockage: unknown;
        try {
          stockage = require('@react-native-async-storage/async-storage')?.default;
        } catch {
          stockage = undefined;
        }
        return new Classe(cle, stockage ? { ...options, customStorage: stockage } : options) as ClientPostHog;
      } catch {
        return null;
      }
    },
  };
}
/* eslint-enable @typescript-eslint/no-require-imports */
