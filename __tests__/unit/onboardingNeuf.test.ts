/**
 * Nouvel onboarding et paywall en 3 temps (21 novembre 2026, sur le modele d'INRO) : la logique sans ecran.
 * Deroule selon les reponses, barre de progression, reprise d'un brouillon, regle d'affichage de l'offre de
 * rattrapage, prix de l'offre lus dans le store, mesure de chaque ecran (sans valeur de sante), reponses reprises
 * par l'ecran de chargement, interrupteur et branchements.
 */
import fs from 'fs';
import path from 'path';

jest.mock('@/utils/telemetry', () => ({
  track: jest.fn(),
  setProprietes: jest.fn(),
  familleDeSport: () => 'muscu',
  trancheNombre: () => '1',
}));

// les ecrans de l'app ne sont pas rendus ici : le theme, le texte et les icones sont remplaces
jest.mock('@/components/yoroi', () => ({ useYoroiTheme: () => ({ theme: { colors: {}, name: 'dojo', isDark: false } }) }));
jest.mock('react-native-svg', () => ({ __esModule: true, default: () => null, Path: () => null, Circle: () => null, G: () => null, Rect: () => null }));
jest.mock('@/components/yoroi/v2/onboarding/ui', () => {
  const { DECIMAL } = jest.requireActual('@/lib/i18n/tr');
  return {
    kg: (v: number, digits = 1) => {
      const r = Math.round(v * 10 ** digits) / 10 ** digits;
      return (Number.isInteger(r) ? String(r) : r.toFixed(digits)).replace('.', DECIMAL);
    },
  };
});
jest.mock('expo-router', () => ({ useRouter: () => ({}), router: {} }));

import { track } from '@/utils/telemetry';
import { setApercuOnboarding } from '@/lib/v2/onboarding/events';
import {
  DEPART_BARRE,
  ETAPE_MESURE,
  ETAT_DEPART,
  ORDRE,
  ORDRE_MESURE_NEUF,
  etapeDeReprise,
  parcours,
  position,
  questions,
  rattrapageVisible,
  suivante,
  trancheTemps,
  type EtatParcours,
} from '@/components/yoroi/v2/onboarding-neuf/parcours';
import { creerMesure } from '@/components/yoroi/v2/onboarding-neuf/mesure';
import { etapesChargement, joursCourts, reponsesChargement } from '@/components/yoroi/v2/onboarding-neuf/reponses';
import { gouttes, nombreStickers } from '@/components/yoroi/v2/onboarding-neuf/FiltrePluie';
import { CODE_OFFRE_IOS, OFFRE_ANDROID, RATTRAPAGE_IOS_CODE_CREE, RATTRAPAGE_POURCENT, lienCodeOffre, optionRattrapage, prixRattrapage } from '@/lib/v2/premium/rattrapage';
import { AVIS_STORES, NOTES_STORES, RELEVE_LE } from '@/lib/v2/premium/preuveSociale';
import { AVIS } from '@/lib/v2/premium/avis';
import { REAL_STORE_RATING, storeRating } from '@/lib/v2/premium/offer';
import { ONBOARDING_NEUF_ACTIF } from '@/lib/v2/onboarding/interrupteur';

const lire = (rel: string) => fs.readFileSync(path.join(__dirname, '..', '..', rel), 'utf8');
const etat = (p: Partial<EtatParcours> = {}): EtatParcours => ({ ...ETAT_DEPART, ...p });

describe('Nouvel onboarding : le deroule', () => {
  it('un nouvel utilisateur qui veut perdre du poids : toutes les questions, une par ecran, puis la fin comme INRO', () => {
    expect(parcours(etat({ sens: 'baisse' }))).toEqual([
      'entree', 'prenom', 'genre', 'age', 'source', 'interlude',
      'objectif', 'sport', 'poids', 'taille', 'cap', 'jours', 'univers', 'rappels',
      'filtre', 'demo', 'preuve', 'chargement', 'paywall1', 'paywall',
    ]);
  });

  it('pas de question « Ce qui te freine » ; la taille reste', () => {
    expect(ORDRE).not.toContain('frein' as never);
    expect(parcours(etat())).toContain('taille');
  });

  it('le cap seulement pour perdre ou prendre (et la recomposition)', () => {
    expect(parcours(etat({ sens: 'baisse' }))).toContain('cap');
    expect(parcours(etat({ sens: 'hausse' }))).toContain('cap');
    expect(parcours(etat({ sens: 'recompo' }))).toContain('cap');
    expect(parcours(etat({ sens: 'stable' }))).not.toContain('cap');
    expect(parcours(etat({ sens: 'categorie' }))).not.toContain('cap');
    expect(parcours(etat({ sens: 'aucun' }))).not.toContain('cap');
  });

  it('rappels refuses : « Sans rappels, tu rates ça » juste apres ; Sante seulement si elle existe et n est pas reliee', () => {
    const p = parcours(etat({ rappelsRefus: true, santeOff: true }));
    expect(p.indexOf('rappelsRefus')).toBe(p.indexOf('rappels') + 1);
    expect(p.indexOf('sante')).toBe(p.indexOf('rappelsRefus') + 1);
    expect(parcours(etat())).not.toContain('sante');
    expect(parcours(etat())).not.toContain('rappelsRefus');
  });

  it('le rappel de fin d essai (ecran 2 du paywall) seulement si le store annonce un essai', () => {
    expect(parcours(etat({ essai: true })).slice(-3)).toEqual(['paywall1', 'paywall2', 'paywall']);
    expect(parcours(etat({ essai: false })).slice(-2)).toEqual(['paywall1', 'paywall']);
  });

  it('venu d une autre app (reprise) : prenom, poids, chargement, paywall', () => {
    expect(parcours(etat({ viaReprise: true }))).toEqual(['entree', 'prenom', 'poids', 'chargement', 'paywall1', 'paywall']);
  });

  it('suivante() avance dans le parcours, reprend apres un ecran hors parcours, et reste au dernier', () => {
    expect(suivante('entree', etat())).toBe('prenom');
    expect(suivante('taille', etat({ sens: 'stable' }))).toBe('jours');
    expect(suivante('taille', etat({ sens: 'baisse' }))).toBe('cap');
    expect(suivante('rappels', etat({ rappelsRefus: true }))).toBe('rappelsRefus');
    expect(suivante('cap', etat({ sens: 'stable' }))).toBe('jours');
    expect(suivante('paywall', etat())).toBe('paywall');
  });
});

describe('Nouvel onboarding : la barre de progression (INRO)', () => {
  it('premiere question 12 %, des la deuxieme 50 %, puis de plus en plus petits pas jusqu a 100 %', () => {
    const s = etat({ sens: 'baisse' });
    const q = questions(s);
    const valeurs = q.map((e) => position(e, s).progres as number);
    expect(valeurs[0]).toBeCloseTo(DEPART_BARRE);
    expect(valeurs[1]).toBeCloseTo(0.5);
    expect(valeurs[valeurs.length - 1]).toBeCloseTo(1);
    for (let i = 1; i < valeurs.length; i++) expect(valeurs[i]).toBeGreaterThan(valeurs[i - 1]);
    const pas = valeurs.slice(1).map((v, i) => v - valeurs[i]).slice(1);
    for (let i = 1; i < pas.length; i++) expect(pas[i]).toBeLessThanOrEqual(pas[i - 1] + 1e-9);
  });

  it('une seule suite pour les deux blocs ; l ecran des rappels refuses partage le segment des rappels', () => {
    const s = etat({ rappelsRefus: true });
    expect(position('rappelsRefus', s)).toEqual(position('rappels', s));
    expect(position('objectif', s).etape).toBe(position('source', s).etape + 1);
  });

  it('hors des questions : pas de barre', () => {
    for (const e of ['entree', 'interlude', 'filtre', 'demo', 'preuve', 'chargement', 'paywall1', 'paywall'] as const) {
      expect(position(e, etat()).total).toBe(0);
    }
  });
});

describe('Nouvel onboarding : reprise du brouillon (plan E9)', () => {
  it('un brouillon de l ancien onboarding repart a Prenom, avec ses reponses (meme Draft)', () => {
    expect(etapeDeReprise({ page: 7 })).toBe('prenom');
    expect(etapeDeReprise({ page: 0 })).toBe('entree');
    expect(etapeDeReprise(null)).toBe('entree');
  });

  it('un brouillon du nouvel onboarding reprend a son ecran ; apres le filtre, au filtre ; le paywall refait le chargement', () => {
    expect(etapeDeReprise({ page: 0, etapeNeuf: 'jours' })).toBe('jours');
    expect(etapeDeReprise({ etapeNeuf: 'demo' })).toBe('filtre');
    expect(etapeDeReprise({ etapeNeuf: 'preuve' })).toBe('filtre');
    expect(etapeDeReprise({ etapeNeuf: 'paywall' })).toBe('chargement');
    expect(etapeDeReprise({ etapeNeuf: 'rattrapage' })).toBe('chargement');
    expect(etapeDeReprise({ etapeNeuf: 'nimporte', page: 3 })).toBe('prenom');
  });
});

describe('Offre de rattrapage : la regle d affichage', () => {
  const base = { dejaVue: false, storePret: true, plateforme: 'android', optionAndroid: true, codeIos: true, apercu: false };
  it('Android : seulement si l option rattrapage30 existe dans le paquet annuel', () => {
    expect(rattrapageVisible(base)).toBe(true);
    expect(rattrapageVisible({ ...base, optionAndroid: false })).toBe(false);
  });
  it('iPhone : seulement une fois le code d offre cree', () => {
    expect(rattrapageVisible({ ...base, plateforme: 'ios' })).toBe(true);
    expect(rattrapageVisible({ ...base, plateforme: 'ios', codeIos: false })).toBe(false);
  });
  it('une seule fois par appareil, jamais si la lecture est inconnue, jamais sans boutique', () => {
    expect(rattrapageVisible({ ...base, dejaVue: true })).toBe(false);
    expect(rattrapageVisible({ ...base, dejaVue: null })).toBe(false);
    expect(rattrapageVisible({ ...base, storePret: false })).toBe(false);
    expect(rattrapageVisible({ ...base, plateforme: 'web' })).toBe(false);
  });
  it('en apercu du Studio, elle se montre pour etre vue', () => {
    expect(rattrapageVisible({ ...base, apercu: true, storePret: false, dejaVue: true })).toBe(true);
  });
  it('30 %, codes YOROI30 et rattrapage30, et l iPhone attend que le code soit cree', () => {
    expect(RATTRAPAGE_POURCENT).toBe(30);
    expect(CODE_OFFRE_IOS).toBe('YOROI30');
    expect(OFFRE_ANDROID).toBe('rattrapage30');
    expect(RATTRAPAGE_IOS_CODE_CREE).toBe(false);
    expect(lienCodeOffre()).toBe('https://apps.apple.com/redeem?ctx=offercodes&id=6757306612&code=YOROI30');
  });
});

describe('Offre de rattrapage : les prix viennent du store', () => {
  const annuelAndroid = {
    product: {
      subscriptionOptions: [
        { id: 'annual', pricingPhases: [{ price: { formatted: '24,99 €', amountMicros: 24990000, currencyCode: 'EUR' }, billingPeriod: { iso8601: 'P1Y' } }] },
        {
          id: 'annual:rattrapage30',
          pricingPhases: [
            { price: { formatted: '17,49 €', amountMicros: 17490000, currencyCode: 'EUR' }, billingPeriod: { iso8601: 'P1Y' } },
            { price: { formatted: '24,99 €', amountMicros: 24990000, currencyCode: 'EUR' }, billingPeriod: { iso8601: 'P1Y' } },
          ],
        },
      ],
    },
  };
  it('Android : l option est trouvee et son prix reduit est celui de Google Play', () => {
    expect(optionRattrapage(annuelAndroid)?.id).toBe('annual:rattrapage30');
    expect(optionRattrapage({ product: { subscriptionOptions: [{ id: 'annual' }] } })).toBeNull();
    expect(optionRattrapage(null)).toBeNull();
    const p = prixRattrapage({ plateforme: 'android', rawAnnuel: annuelAndroid, prixAnnuel: 24.99, devise: 'EUR' });
    expect(p.premiereAnnee).toBe('17,49 €');
    expect(p.parSemaine).toMatch(/0,34/);
    expect(p.essaiJours).toBeNull();
  });
  it('Android : une phase gratuite donne les jours d essai', () => {
    const raw = { product: { subscriptionOptions: [{ id: 'annual:rattrapage30', freePhase: { billingPeriod: { iso8601: 'P7D' }, price: { amountMicros: 0 } }, introPhase: { price: { formatted: '17,49 €', amountMicros: 17490000, currencyCode: 'EUR' } } }] } };
    expect(prixRattrapage({ plateforme: 'android', rawAnnuel: raw, prixAnnuel: 24.99, devise: 'EUR' }).essaiJours).toBe(7);
  });
  it('iPhone : le prix annuel du store moins 30 %, dans la devise du store ; sans prix, rien', () => {
    const p = prixRattrapage({ plateforme: 'ios', rawAnnuel: null, prixAnnuel: 24.99, devise: 'EUR' });
    expect(p.premiereAnnee).toMatch(/17,49/);
    expect(prixRattrapage({ plateforme: 'ios', rawAnnuel: null, prixAnnuel: null, devise: null }).premiereAnnee).toBeNull();
  });
  it('aucun prix ecrit en dur dans le paywall ni dans l offre', () => {
    for (const f of ['PaywallOffre.tsx', 'Paywall3.tsx', 'Rattrapage.tsx', 'formules.ts', 'PaywallInterieur.tsx']) {
      const src = lire(`components/yoroi/v2/onboarding-neuf/${f}`);
      expect(src).not.toMatch(/\d+[,.]\d\d ?€/);
    }
  });
});

describe('Preuve sociale : un seul fichier, rien d invente', () => {
  it('49 notes, 8 avis, releve du 11 octobre 2026, et l ancien paywall lit la meme source', () => {
    expect(RELEVE_LE).toBe('2026-10-11');
    expect(NOTES_STORES.appStore).toEqual({ note: 5, notes: 43 });
    expect(NOTES_STORES.googlePlay).toEqual({ note: 5, notes: 6 });
    expect(AVIS_STORES).toHaveLength(8);
    expect(AVIS).toBe(AVIS_STORES);
    expect(REAL_STORE_RATING.appStore).toBe(NOTES_STORES.appStore);
    expect(storeRating()?.total).toBe(49);
  });
  it('les ecrans lisent la note et les avis, jamais un chiffre ecrit a la main', () => {
    for (const f of ['Preuve.tsx', 'Paywall3.tsx', 'PaywallOffre.tsx', 'Chargement.tsx']) {
      const src = lire(`components/yoroi/v2/onboarding-neuf/${f}`);
      expect(src).not.toMatch(/\b49\b|\b43\b/);
    }
  });
});

describe('Nouvel onboarding : la mesure de chaque ecran', () => {
  beforeEach(() => {
    (track as jest.Mock).mockClear();
    setApercuOnboarding(false);
  });
  afterAll(() => setApercuOnboarding(false));

  it('l ecran part en le quittant, avec la tranche de son temps (jamais la duree exacte)', () => {
    let t = 1000;
    const m = creerMesure(() => t);
    m.ecran('prenom');
    t += 4500;
    m.ecran('genre');
    expect(track).toHaveBeenCalledWith('onboarding_etape', { etape: 'prenom', temps: '3_10' });
    t += 1000;
    m.vider();
    expect(track).toHaveBeenLastCalledWith('onboarding_etape', { etape: 'toi', temps: '0_3' });
  });

  it('le meme ecran deux fois ne compte qu une fois', () => {
    const m = creerMesure(() => 0);
    m.ecran('jours');
    m.ecran('jours');
    m.vider();
    expect(track).toHaveBeenCalledTimes(1);
  });

  it('rappels, paywall, rattrapage et fin', () => {
    const m = creerMesure(() => 0);
    m.rappels(true);
    m.rappels(false);
    m.paywall(2);
    m.rattrapage('vue');
    m.rattrapage('refus');
    m.termine('essai');
    expect(track).toHaveBeenCalledWith('onboarding_rappels', { reponse: 'accepte' });
    expect(track).toHaveBeenCalledWith('onboarding_rappels', { reponse: 'refuse' });
    expect(track).toHaveBeenCalledWith('paywall_ecran_vu', { ecran: '2' });
    expect(track).toHaveBeenCalledWith('rattrapage_vue', { source: 'onboarding' });
    expect(track).toHaveBeenCalledWith('rattrapage_refus', { source: 'onboarding' });
    expect(track).toHaveBeenCalledWith('onboarding_termine', { statut: 'essai' });
  });

  it('en apercu du Studio ou en mode createur : rien ne part', () => {
    setApercuOnboarding(true);
    const m = creerMesure(() => 0);
    m.ecran('prenom');
    m.ecran('genre');
    m.rappels(true);
    m.paywall(1);
    m.rattrapage('tap');
    m.termine('gratuit');
    expect(track).not.toHaveBeenCalled();
  });

  it('les tranches de temps', () => {
    expect(trancheTemps(500)).toBe('0_3');
    expect(trancheTemps(3000)).toBe('3_10');
    expect(trancheTemps(12000)).toBe('10_30');
    expect(trancheTemps(31000)).toBe('30_plus');
  });

  it('chaque ecran a son nom de mesure, dans l ordre de la mesure PostHog', () => {
    const noms = ORDRE.map((e) => ETAPE_MESURE[e]);
    expect(noms).toEqual([...ORDRE_MESURE_NEUF]);
  });
});

describe('Le chargement reprend tes reponses', () => {
  it('objectifs, sports, jours, univers et tranche d age, en clair, sans doublon ni valeur de sante', () => {
    const r = reponsesChargement({ name: 'Houari', goals: ['lose', 'combat'], sports: ['jjb', 'musculation', 'running'], jours: [4, 0, 2], univers: 'japon', trancheAge: '25_34' });
    expect(r).toEqual(['Perdre du poids', 'Performer en combat', 'Jiu jitsu brésilien', 'Musculation', 'Lun., Mer., Ven.', 'Japon', '25 à 34 ans']);
    expect(r.join(' ')).not.toMatch(/kg|Houari/);
  });

  it('sans reponse : rien d invente', () => {
    expect(reponsesChargement({ name: '', goals: [], sports: [], jours: [], univers: 'aucun', trancheAge: null })).toEqual(['Sans personnage']);
    expect(joursCourts([])).toBe('');
  });

  it('les trois etapes disent le vrai nombre de jours et le vrai cap, sinon la phrase generale', () => {
    expect(etapesChargement(3, 77)).toEqual(['On récupère tes réponses...', 'On prépare ta semaine de 3 séances...', 'On trace ton chemin vers 77 kg...']);
    expect(etapesChargement(1, 76.5)[1]).toBe('On prépare ta semaine de 1 séance...');
    expect(etapesChargement(1, 76.5)[2]).toBe('On trace ton chemin vers 76,5 kg...');
    expect(etapesChargement(0, null)).toEqual(['On récupère tes réponses...', 'On prépare ta semaine...', 'On prépare ton suivi de poids...']);
  });
});

describe('La pluie de stickers (INRO)', () => {
  it('13 a 20 stickers selon la hauteur de l ecran', () => {
    expect(nombreStickers(932)).toBe(20);
    expect(nombreStickers(844)).toBe(18);
    expect(nombreStickers(700)).toBe(16);
    expect(nombreStickers(667 - 1)).toBe(13);
  });
  it('graine fixe : toujours la meme pluie, qui se remplit par le bas', () => {
    const a = gouttes(18, 20260905);
    expect(gouttes(18, 20260905)).toEqual(a);
    expect(a).toHaveLength(18);
    // la rangee du bas (y le plus grand) part la premiere
    const bas = a.filter((g) => g.y > 0.9);
    const haut = a.filter((g) => g.y < 0.1);
    expect(Math.max(...bas.map((g) => g.delay))).toBeLessThan(Math.min(...haut.map((g) => g.delay)));
  });
});

describe('Branchements et interrupteur', () => {
  it('le nouvel onboarding est allume ; l ancien reste dans le code', () => {
    expect(ONBOARDING_NEUF_ACTIF).toBe(true);
    const src = lire('app/onboarding.tsx');
    expect(src).toContain("if (ONBOARDING_NEUF_ACTIF && params.mode !== 'retour') return <OnboardingNeufEcran />;");
    expect(src).toContain('function AncienOnboarding()');
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'components/yoroi/v2/onboarding/Forge.tsx'))).toBe(true);
    expect(fs.existsSync(path.join(__dirname, '..', '..', 'components/yoroi/v2/premium/Paywall.tsx'))).toBe(true);
  });

  it('plus de « YOROI fait peau neuve » pour les utilisateurs existants quand le nouvel onboarding est allume', () => {
    expect(lire('app/index.tsx')).toContain("if (!ONBOARDING_NEUF_ACTIF && dest !== 'onboarding' && doitRevoirOnboarding(");
  });

  it('PremiumContext et le schema de la base ne sont pas touches par le nouvel onboarding', () => {
    const dossier = path.join(__dirname, '..', '..', 'components/yoroi/v2/onboarding-neuf');
    for (const f of fs.readdirSync(dossier)) {
      const src = fs.readFileSync(path.join(dossier, f), 'utf8');
      expect(src).not.toMatch(/from '@\/lib\/database\.native'|CREATE TABLE|ALTER TABLE/);
    }
  });

  it('aucun tiret long ni emoji dans les textes du nouvel onboarding, aucun nom d app concurrente', () => {
    const dossier = path.join(__dirname, '..', '..', 'components/yoroi/v2/onboarding-neuf');
    for (const f of fs.readdirSync(dossier)) {
      const src = fs.readFileSync(path.join(dossier, f), 'utf8');
      expect(src).not.toContain('\u2014');
      expect(src).not.toMatch(/\p{Extended_Pictographic}/u);
      expect(src).not.toMatch(/\bHevy\b|Strava|MyFitnessPal/);
    }
  });

  it('les pop ups sont centres et sans rebond (pas de spring)', () => {
    const dossier = path.join(__dirname, '..', '..', 'components/yoroi/v2/onboarding-neuf');
    for (const f of fs.readdirSync(dossier)) {
      const src = fs.readFileSync(path.join(dossier, f), 'utf8');
      expect(src).not.toMatch(/Animated\.spring|withSpring|Easing\.(bounce|elastic|back)/);
    }
  });
});

describe('Paywall de l app (22 novembre 2026) : le design du nouvel onboarding', () => {
  it('app/paywall.tsx ouvre le nouveau paywall quand l interrupteur est allume, l ancien sinon', () => {
    const src = lire('app/paywall.tsx');
    expect(src).toContain('if (ONBOARDING_NEUF_ACTIF) return <PaywallInterieurEcran');
    expect(src).toContain('<Paywall source="app"');
  });

  it('meme logique d achat : purchase, restore, bienvenue, rappel de fin d essai, mentions et liens legaux', () => {
    const src = lire('components/yoroi/v2/onboarding-neuf/PaywallInterieur.tsx');
    for (const x of ['premium.purchase(', 'premium.restore()', '<Welcome', 'scheduleTrialReminder(', 'needsRestore', "'/terms'", "'/privacy-policy'", 'APPLE_EULA_URL', 'rattrapageVisible(', 'PREMIUM_ROWS']) {
      expect(src).toContain(x);
    }
  });
});
