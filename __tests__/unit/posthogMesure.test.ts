/**
 * PostHog dans la mesure de YOROI (21 novembre 2026, build 3.0.4).
 * Verifie : la table de correspondance des noms, app = "yoroi", la liste blanche (aucune valeur de sante ne passe),
 * le consentement coupe, le simulateur et l'absence de cle (rien ne part, rien ne plante).
 * Un faux PostHog est injecte : aucun appel reseau.
 */
import {
  CORRESPONDANCE_POSTHOG,
  LISTE_BLANCHE,
  NOMS_POSTHOG,
  ORDRE_ONBOARDING,
  POSTHOG_HOTE,
  creerEnvoiPostHog,
  filtreAvantEnvoi,
  traduirePourPostHog,
  type ClientPostHog,
  type ConfigPostHog,
} from '../../utils/telemetryPostHog';

type Appel = { nom: string; props?: Record<string, unknown> };

function fauxPostHog() {
  const captures: Appel[] = [];
  const registres: Record<string, string>[] = [];
  const etat = { optIn: 0, optOut: 0, creations: 0, options: null as Record<string, unknown> | null, cle: '' };
  const client: ClientPostHog & Record<string, unknown> = {
    capture: (nom, props) => {
      captures.push({ nom, props });
    },
    register: (p) => {
      registres.push(p);
    },
    optIn: () => {
      etat.optIn += 1;
    },
    optOut: () => {
      etat.optOut += 1;
    },
    identify: jest.fn(),
    setPersonProperties: jest.fn(),
    screen: jest.fn(),
  };
  const creer = (cle: string, options: Record<string, unknown>) => {
    etat.creations += 1;
    etat.options = options;
    etat.cle = cle;
    return client;
  };
  return { client, captures, registres, etat, creer };
}

function config(f: ReturnType<typeof fauxPostHog>, extra: Partial<ConfigPostHog> = {}): ConfigPostHog {
  return { cle: 'phc_test', horsProduction: false, env: 'production', plateforme: 'ios', creer: f.creer, ...extra };
}

describe('PostHog : correspondance des noms', () => {
  const cas: [string, Record<string, string>, string, Record<string, unknown>][] = [
    ['app_boot', { origine: 'icone' }, 'app_opened', { origine: 'icone' }],
    // 21 novembre 2026 : nouvel onboarding (interrupteur allume), le temps passe en tranche. 22 novembre 2026 : 25 ecrans,
    // la question de l'ancienne app en 2
    ['onboarding_etape', { etape: 'entree' }, 'onboarding_step', { step: 1, step_name: 'entree' }],
    ['onboarding_etape', { etape: 'ancienne_app' }, 'onboarding_step', { step: 2, step_name: 'ancienne_app' }],
    ['onboarding_etape', { etape: 'paywall_3', temps: '3_10' }, 'onboarding_step', { step: 24, step_name: 'paywall_3', time_bucket: '3_10' }],
    ['onboarding_choix', { etape: 'objectif', choix: 'perdre' }, 'onboarding_answer', { step_name: 'objectif', answer: 'perdre' }],
    ['onboarding_choix', { etape: 'sport', famille: 'combat' }, 'onboarding_answer', { step_name: 'sport', answer: 'combat' }],
    ['onboarding_rappels', { reponse: 'refuse' }, 'notifications_answered', { answer: 'refuse' }],
    ['paywall_ecran_vu', { ecran: '2' }, 'paywall_step_viewed', { screen: 2 }],
    ['rattrapage_vue', { source: 'onboarding' }, 'winback_shown', { source: 'onboarding' }],
    ['rattrapage_tap', { source: 'onboarding' }, 'winback_tapped', { source: 'onboarding' }],
    ['rattrapage_ok', { source: 'onboarding' }, 'winback_purchased', { source: 'onboarding' }],
    ['rattrapage_refus', { source: 'onboarding' }, 'winback_dismissed', { source: 'onboarding' }],
    // 22 novembre 2026 : « Tu utilises déjà une app pour tes séances ? », la reponse en liste fermee
    ['onboarding_choix', { etape: 'ancienne_app', choix: 'hevy' }, 'onboarding_answer', { step_name: 'ancienne_app', answer: 'hevy' }],
    ['onboarding_choix', { etape: 'ancienne_app', choix: 'aucune' }, 'onboarding_answer', { step_name: 'ancienne_app', answer: 'aucune' }],
    // 22 novembre 2026 : la reprise depuis une autre app (question de l'ancienne app du nouvel onboarding)
    ['reprise_ouverte', { source: 'onboarding' }, 'import_opened', { source: 'onboarding' }],
    ['reprise_reussie', { source: 'onboarding', app: 'strong' }, 'import_completed', { source: 'onboarding', app: 'strong' }],
    ['onboarding_termine', { statut: 'abonne' }, 'onboarding_completed', { status: 'abonne' }],
    ['paywall_view', { source: 'onboarding', statut: 'gratuit' }, 'paywall_shown', { source: 'onboarding' }],
    ['paywall_purchase_ok', { source: 'reglages', plan: 'annuel', essai: 'oui' }, 'trial_started', { source: 'reglages', plan: 'annuel' }],
    ['paywall_purchase_ok', { source: 'reglages', plan: 'mensuel', essai: 'non' }, 'purchase_completed', { source: 'reglages', plan: 'mensuel' }],
    ['paywall_purchase_cancel', { source: 'app', plan: 'annuel' }, 'purchase_cancelled', { source: 'app', plan: 'annuel' }],
    ['poids_saisi', { methode: 'manuel', tranche_pesees: '2_5' }, 'weigh_in_logged', {}],
    ['poids_saisi', { methode: 'balance' }, 'weigh_in_logged', {}],
    ['mensuration_ajoutee', {}, 'measurement_logged', {}],
    ['seance_enregistree', { famille: 'combat', methode: 'live', tranche_seances: '6_20' }, 'workout_completed', { sport_type: 'combat' }],
    ['programme_choisi', { type: 'force', famille: 'muscu' }, 'coach_program_started', { program_type: 'force' }],
    ['avis_demande', { moment: 'troisieme_seance' }, 'rating_prompt_shown', {}],
  ];

  it.each(cas)('%s part sous le bon nom', (nom, params, attendu, props) => {
    expect(traduirePourPostHog(nom, params)).toEqual({ nom: attendu, props });
  });

  it('chaque nom PostHog demande est couvert par la table', () => {
    const couverts = new Set(Object.keys(CORRESPONDANCE_POSTHOG).flatMap((k) => cas.filter((c) => c[0] === k).map((c) => c[2])));
    for (const n of NOMS_POSTHOG) expect(couverts.has(n)).toBe(true);
    expect(NOMS_POSTHOG.sort()).toEqual([
      'app_opened', 'coach_program_started', 'import_completed', 'import_opened', 'measurement_logged', 'notifications_answered', 'onboarding_answer', 'onboarding_completed',
      'onboarding_step', 'paywall_shown', 'paywall_step_viewed', 'purchase_cancelled', 'purchase_completed', 'rating_prompt_shown',
      'trial_started', 'weigh_in_logged', 'winback_dismissed', 'winback_purchased', 'winback_shown', 'winback_tapped', 'workout_completed',
    ]);
  });

  it('les etapes de l onboarding sont numerotees 1, 2, 3 dans l ordre', () => {
    ORDRE_ONBOARDING.forEach((etape, i) => {
      expect(traduirePourPostHog('onboarding_etape', { etape })?.props).toEqual({ step: i + 1, step_name: etape });
    });
    expect(traduirePourPostHog('onboarding_etape', { etape: 'inconnue' })).toBeNull();
  });

  it('nouvel onboarding : une duree exacte ou une reponse avec un chiffre ne passent pas', () => {
    // 22 novembre 2026 : la question de l'ancienne app passe en 2, le prenom en 3
    expect(traduirePourPostHog('onboarding_etape', { etape: 'prenom', temps: '7' })?.props).toEqual({ step: 3, step_name: 'prenom' });
    expect(traduirePourPostHog('onboarding_choix', { etape: 'poids', choix: '82' })?.props).toEqual({ step_name: 'poids' });
    expect(traduirePourPostHog('paywall_ecran_vu', { ecran: '4' })?.props).toEqual({});
  });

  it('aucun autre evenement ne part vers PostHog', () => {
    for (const nom of ['screen_view', 'app_first_open', 'sommeil_saisi', 'composition_ajoutee', 'tab_open', 'paywall_cta_tap', 'n_importe_quoi']) {
      expect(traduirePourPostHog(nom, { ecran: 'progres' })).toBeNull();
    }
  });

  it('le poids pose pendant l onboarding ne compte pas comme une pesee', () => {
    expect(traduirePourPostHog('poids_saisi', { methode: 'onboarding' })).toBeNull();
  });
});

describe('PostHog : liste blanche, aucune donnee de sante', () => {
  it('un track avec un poids ou une valeur ne laisse passer que les proprietes autorisees', () => {
    const pesee = traduirePourPostHog('poids_saisi', { methode: 'manuel', poids: '82.5', poids_kg: '82,5', valeur: '82.5', masse_grasse: '18', tranche_pesees: '2_5' });
    expect(pesee).toEqual({ nom: 'weigh_in_logged', props: {} });

    const seance = traduirePourPostHog('seance_enregistree', { famille: 'muscu', frequence_cardiaque: '142', duree: '3600', charge: '120', sommeil: '7.5', methode: 'live' });
    expect(seance).toEqual({ nom: 'workout_completed', props: { sport_type: 'muscu' } });

    const mens = traduirePourPostHog('mensuration_ajoutee', { tour_de_taille: '84', valeur: '84' } as Record<string, string>);
    expect(mens).toEqual({ nom: 'measurement_logged', props: {} });
  });

  it('une valeur hors liste fermee est retiree, meme sur une propriete autorisee', () => {
    expect(traduirePourPostHog('seance_enregistree', { famille: 'jjb texte libre' })?.props).toEqual({});
    expect(traduirePourPostHog('app_boot', { origine: '82.5' })?.props).toEqual({});
    expect(traduirePourPostHog('paywall_view', { source: 'poids_82' })?.props).toEqual({});
    expect(traduirePourPostHog('paywall_purchase_ok', { source: 'app', plan: '9.99', essai: 'non' })?.props).toEqual({ source: 'app' });
  });

  it('aucune propriete autorisee ne porte de nom de sante', () => {
    const interdits = /poids|weight|mensur|tour|taille|cardi|heart|bpm|sommeil|sleep|kcal|calor|graisse|fat|valeur|value|duree|charge/i;
    for (const regles of Object.values(LISTE_BLANCHE)) for (const k of Object.keys(regles)) expect(k).not.toMatch(interdits);
  });

  it('le filet before_send jette les autres evenements et les proprietes de personne', () => {
    expect(filtreAvantEnvoi({ event: '$screen', properties: {} })).toBeNull();
    expect(filtreAvantEnvoi({ event: '$identify', properties: {} })).toBeNull();
    expect(filtreAvantEnvoi({ event: '$exception', properties: {} })).toBeNull();
    expect(filtreAvantEnvoi({ event: 'Application Opened', properties: {} })).toBeNull();
    const e = filtreAvantEnvoi({
      event: 'weigh_in_logged',
      properties: { poids: 82.5, $set: { email: 'a@b.c' }, app: 'yoroi', env: 'production', platform: 'ios', $os_name: 'iOS' },
      $set: { nom: 'x' },
      $set_once: { y: 1 },
    });
    expect(e).toEqual({ event: 'weigh_in_logged', properties: { app: 'yoroi', env: 'production', platform: 'ios', $os_name: 'iOS' } });
  });
});

describe('PostHog : client', () => {
  it('pose app = "yoroi", env et platform une fois, avec les options d INRO', () => {
    const f = fauxPostHog();
    const ph = creerEnvoiPostHog(config(f));
    ph.init(true);
    expect(f.etat.creations).toBe(1);
    expect(f.etat.cle).toBe('phc_test');
    expect(f.registres).toEqual([{ app: 'yoroi', env: 'production', platform: 'ios' }]);
    expect(f.etat.options).toMatchObject({
      host: POSTHOG_HOTE,
      persistence: 'file',
      defaultOptIn: false,
      captureAppLifecycleEvents: false,
      enableSessionReplay: false,
      preloadFeatureFlags: false,
    });
    expect(POSTHOG_HOTE).toBe('https://eu.i.posthog.com');
    expect(f.etat.optIn).toBe(1);
    expect(ph.envoyer('seance_enregistree', { famille: 'cardio', methode: 'live', tranche_seances: '1' })).toBe(true);
    expect(f.captures).toEqual([{ nom: 'workout_completed', props: { sport_type: 'cardio' } }]);
    ph.setActif(true);
    expect(f.etat.creations).toBe(1);
    expect(f.registres).toHaveLength(1);
  });

  it('jamais d identify, de propriete de personne ni d ecran', () => {
    const f = fauxPostHog();
    const ph = creerEnvoiPostHog(config(f));
    ph.init(true);
    for (const n of Object.keys(CORRESPONDANCE_POSTHOG)) ph.envoyer(n, {});
    ph.envoyer('screen_view', { ecran: 'progres' });
    expect(f.client.identify).not.toHaveBeenCalled();
    expect(f.client.setPersonProperties).not.toHaveBeenCalled();
    expect(f.client.screen).not.toHaveBeenCalled();
  });

  it('consentement coupe : rien ne part, et optOut est appele', () => {
    const f = fauxPostHog();
    const ph = creerEnvoiPostHog(config(f));
    ph.init(false);
    expect(f.etat.optOut).toBe(1);
    expect(f.etat.optIn).toBe(0);
    expect(ph.envoyer('app_boot', { origine: 'icone' })).toBe(false);
    expect(f.captures).toHaveLength(0);
  });

  it('l interrupteur des Reglages coupe puis rallume PostHog', () => {
    const f = fauxPostHog();
    const ph = creerEnvoiPostHog(config(f));
    ph.init(true);
    ph.setActif(false);
    expect(f.etat.optOut).toBe(1);
    expect(ph.envoyer('avis_demande', { moment: 'troisieme_seance' })).toBe(false);
    ph.setActif(true);
    expect(f.etat.optIn).toBe(2);
    expect(ph.envoyer('avis_demande', { moment: 'troisieme_seance' })).toBe(true);
    expect(f.captures).toEqual([{ nom: 'rating_prompt_shown', props: {} }]);
  });

  it('simulateur ou developpement : aucun client, rien ne part', () => {
    const f = fauxPostHog();
    const ph = creerEnvoiPostHog(config(f, { horsProduction: true }));
    ph.init(true);
    ph.setActif(true);
    expect(ph.envoyer('app_boot', { origine: 'icone' })).toBe(false);
    expect(f.etat.creations).toBe(0);
    expect(f.captures).toHaveLength(0);
  });

  it('sans cle : aucun client, rien ne part, rien ne plante', () => {
    const f = fauxPostHog();
    const ph = creerEnvoiPostHog(config(f, { cle: '' }));
    expect(() => ph.init(true)).not.toThrow();
    expect(() => ph.setActif(false)).not.toThrow();
    expect(ph.envoyer('app_boot', { origine: 'icone' })).toBe(false);
    expect(f.etat.creations).toBe(0);
  });

  it('sans le paquet (fabrique nulle ou qui leve) : rien ne part, rien ne plante', () => {
    const nul = creerEnvoiPostHog({ cle: 'phc_test', horsProduction: false, env: 'production', plateforme: 'ios', creer: () => null });
    expect(() => nul.init(true)).not.toThrow();
    expect(nul.envoyer('app_boot', { origine: 'icone' })).toBe(false);
    const leve = creerEnvoiPostHog({
      cle: 'phc_test', horsProduction: false, env: 'production', plateforme: 'ios',
      creer: () => {
        throw new Error('module absent');
      },
    });
    expect(() => leve.init(true)).not.toThrow();
    expect(leve.envoyer('app_boot', { origine: 'icone' })).toBe(false);
  });

  it('un client qui leve ne casse pas la mesure', () => {
    const ph = creerEnvoiPostHog({
      cle: 'phc_test', horsProduction: false, env: 'production', plateforme: 'ios',
      creer: () => ({
        capture: () => {
          throw new Error('x');
        },
        register: () => Promise.reject(new Error('x')),
        optIn: () => Promise.reject(new Error('x')),
        optOut: () => {
          throw new Error('x');
        },
      }),
    });
    expect(() => ph.init(true)).not.toThrow();
    expect(ph.envoyer('app_boot', { origine: 'icone' })).toBe(false);
    expect(() => ph.setActif(false)).not.toThrow();
  });
});

/**
 * De bout en bout : track() de utils/telemetry.ts, transport reel, faux paquet posthog-react-native.
 * Un seul point d'entree : chaque track() de la table part aussi vers PostHog.
 */
describe('PostHog : branche sur track()', () => {
  const avantDev = (global as any).__DEV__;
  const avantCle = process.env.EXPO_PUBLIC_POSTHOG_KEY;

  afterEach(() => {
    (global as any).__DEV__ = avantDev;
    if (avantCle === undefined) delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    else process.env.EXPO_PUBLIC_POSTHOG_KEY = avantCle;
    jest.resetModules();
    jest.dontMock('react-native');
    jest.dontMock('expo-modules-core');
    jest.dontMock('posthog-react-native');
  });

  function charger(opts: { appareil: boolean; cle: string }) {
    (global as any).__DEV__ = false;
    if (opts.cle) process.env.EXPO_PUBLIC_POSTHOG_KEY = opts.cle;
    else delete process.env.EXPO_PUBLIC_POSTHOG_KEY;
    const captures: Appel[] = [];
    const etat = { creations: 0, registres: [] as unknown[], optIn: 0, optOut: 0 };
    let tel: any;
    jest.isolateModules(() => {
      jest.doMock('react-native', () => ({ Platform: { OS: 'ios' }, TurboModuleRegistry: { get: () => null }, NativeModules: {} }));
      jest.doMock('expo-modules-core', () => ({ requireOptionalNativeModule: (n: string) => (n === 'ExpoDevice' ? { isDevice: opts.appareil } : null) }));
      jest.doMock('posthog-react-native', () => ({
        PostHog: class {
          constructor() {
            etat.creations += 1;
          }
          capture(nom: string, props?: Record<string, unknown>) {
            captures.push({ nom, props });
          }
          register(p: unknown) {
            etat.registres.push(p);
            return Promise.resolve();
          }
          optIn() {
            etat.optIn += 1;
            return Promise.resolve();
          }
          optOut() {
            etat.optOut += 1;
            return Promise.resolve();
          }
        },
      }));
      tel = require('../../utils/telemetry');
    });
    return { tel, captures, etat };
  }

  const attendre = () => new Promise((r) => setTimeout(r, 0));

  it('chaque track() de la table part vers PostHog, les autres non, sans valeur', async () => {
    const { tel, captures, etat } = charger({ appareil: true, cle: 'phc_test' });
    await tel.initTelemetry();
    tel.trackBoot('notification');
    tel.track('poids_saisi', { methode: 'manuel', tranche_pesees: '2_5' });
    tel.track('screen_view', { ecran: 'progres' });
    tel.track('sommeil_saisi');
    tel.track('seance_enregistree', { famille: 'combat', methode: 'live', tranche_seances: '6_20' });
    await attendre();
    await attendre();
    expect(etat.creations).toBe(1);
    expect(etat.registres).toEqual([{ app: 'yoroi', env: 'production', platform: 'ios' }]);
    expect(captures).toEqual([
      { nom: 'app_opened', props: { origine: 'notification' } },
      { nom: 'weigh_in_logged', props: {} },
      { nom: 'workout_completed', props: { sport_type: 'combat' } },
    ]);
  });

  it('l interrupteur des Reglages coupe PostHog comme Firebase et Sentry', async () => {
    const { tel, captures, etat } = charger({ appareil: true, cle: 'phc_test' });
    await tel.initTelemetry();
    await tel.setConsentement(false);
    expect(etat.optOut).toBe(1);
    tel.track('avis_demande', { moment: 'troisieme_seance' });
    await attendre();
    expect(captures).toHaveLength(0);
  });

  it('simulateur : rien ne part, le paquet n est meme pas charge', async () => {
    const { tel, captures, etat } = charger({ appareil: false, cle: 'phc_test' });
    await tel.initTelemetry();
    tel.trackBoot('icone');
    await attendre();
    expect(etat.creations).toBe(0);
    expect(captures).toHaveLength(0);
  });

  it('sans cle : l app demarre, rien ne part, rien ne plante', async () => {
    const { tel, captures, etat } = charger({ appareil: true, cle: '' });
    await expect(tel.initTelemetry()).resolves.toBeUndefined();
    expect(() => tel.trackBoot('icone')).not.toThrow();
    await attendre();
    expect(etat.creations).toBe(0);
    expect(captures).toHaveLength(0);
  });
});
