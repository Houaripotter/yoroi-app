/**
 * Demande d'avis native (lib/reviewPromptService.ts, service unique), 21 novembre 2026 :
 * juste après une séance terminée et enregistrée, au moins 3 jours après l'installation et 3 séances,
 * pas pour une séance de moins de 5 minutes, au plus une fois tous les 120 jours et une fois par version,
 * jamais après « Noter » ni après un refus récent dans la feuille YOROI, jamais par-dessus une autre fenêtre.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const mockStore = {
  isAvailableAsync: jest.fn(async () => true),
  hasAction: jest.fn(async () => true),
  requestReview: jest.fn(async () => undefined),
};
// lu au moment de l'appel : jest.mock est remonté avant la déclaration de mockStore
jest.mock('expo-store-review', () => ({
  isAvailableAsync: () => mockStore.isAvailableAsync(),
  hasAction: () => mockStore.hasAction(),
  requestReview: () => mockStore.requestReview(),
}));

const mockVersion = { valeur: '3.2.0' };
jest.mock('@/components/yoroi/v2/espace/reglages/version', () => ({
  appVersion: () => mockVersion.valeur,
}));

const mockNoter = jest.fn();
jest.mock('@/lib/v2/notifications/mesure', () => ({
  noter: (...a: unknown[]) => mockNoter(...a),
}));

import {
  CLE_DERNIERE_DEMANDE,
  CLE_VERSION_DEMANDEE,
  compterSeanceAvis,
  decisionAvis,
  demanderAvisApresSeance,
  DUREE_MIN_SEANCE_MIN,
  JOURS_APRES_INSTALLATION,
  JOURS_ENTRE_DEMANDES,
  joursDepuis,
  SEANCES_AVANT_AVIS,
} from '@/lib/reviewPromptService';
import type { EntreeDecisionAvis } from '@/lib/reviewPromptService';
import { CLE_AVIS_MAISON } from '@/lib/v2/bilan/avis';
import { CLE_DATE_INSTALLATION, jourLocal } from '@/lib/v2/installation';

const JOUR = 86400000;
const T0 = new Date(2026, 10, 21, 18, 0, 0).getTime();

const base: EntreeDecisionAvis = {
  seances: 3,
  version: '3.2.0',
  versionDemandee: null,
  autreFenetre: false,
  disponible: true,
  joursDepuisInstallation: 10,
  dureeMin: 45,
  derniereDemande: null,
  dejaNote: false,
  derniereFeuille: null,
  refus: 0,
  maintenant: T0,
};

describe('decisionAvis', () => {
  it('les seuils', () => {
    expect(SEANCES_AVANT_AVIS).toBe(3);
    expect(JOURS_APRES_INSTALLATION).toBe(3);
    expect(JOURS_ENTRE_DEMANDES).toBe(120);
    expect(DUREE_MIN_SEANCE_MIN).toBe(5);
  });

  it('demande quand tout est réuni', () => {
    expect(decisionAvis(base)).toBe(true);
  });

  it('ne demande pas avant la troisième séance', () => {
    expect(decisionAvis({ ...base, seances: 0 })).toBe(false);
    expect(decisionAvis({ ...base, seances: 2 })).toBe(false);
  });

  it('jamais les premiers jours : au moins 3 jours depuis l’installation', () => {
    expect(decisionAvis({ ...base, joursDepuisInstallation: 0 })).toBe(false);
    expect(decisionAvis({ ...base, joursDepuisInstallation: 2 })).toBe(false);
    expect(decisionAvis({ ...base, joursDepuisInstallation: 3 })).toBe(true);
  });

  it('jamais sans date d’installation connue', () => {
    expect(decisionAvis({ ...base, joursDepuisInstallation: null })).toBe(false);
  });

  it('pas pour une séance de moins de 5 minutes', () => {
    expect(decisionAvis({ ...base, dureeMin: 0 })).toBe(false);
    expect(decisionAvis({ ...base, dureeMin: 4 })).toBe(false);
    expect(decisionAvis({ ...base, dureeMin: Number.NaN })).toBe(false);
    expect(decisionAvis({ ...base, dureeMin: 5 })).toBe(true);
  });

  it('au plus une fois tous les 120 jours', () => {
    expect(decisionAvis({ ...base, versionDemandee: '3.1.0', derniereDemande: T0 - 30 * JOUR })).toBe(false);
    expect(decisionAvis({ ...base, versionDemandee: '3.1.0', derniereDemande: T0 - 119 * JOUR })).toBe(false);
    expect(decisionAvis({ ...base, versionDemandee: '3.1.0', derniereDemande: T0 - 120 * JOUR })).toBe(true);
  });

  it('une seule fois par version', () => {
    expect(decisionAvis({ ...base, seances: 8, versionDemandee: '3.2.0' })).toBe(false);
    expect(decisionAvis({ ...base, seances: 8, versionDemandee: '3.1.0' })).toBe(true);
  });

  it('jamais après « Noter » dans la feuille YOROI', () => {
    expect(decisionAvis({ ...base, dejaNote: true, derniereFeuille: T0 - 400 * JOUR })).toBe(false);
  });

  it('pas après un refus récent dans la feuille YOROI, ni après 3 refus', () => {
    expect(decisionAvis({ ...base, refus: 1, derniereFeuille: T0 - 10 * JOUR })).toBe(false);
    expect(decisionAvis({ ...base, refus: 1, derniereFeuille: T0 - 121 * JOUR })).toBe(true);
    expect(decisionAvis({ ...base, refus: 3, derniereFeuille: T0 - 400 * JOUR })).toBe(false);
  });

  it('demande à la séance suivante si la troisième a été prise par une autre fenêtre', () => {
    expect(decisionAvis({ ...base, seances: 3, autreFenetre: true })).toBe(false);
    expect(decisionAvis({ ...base, seances: 4 })).toBe(true);
  });

  it('jamais sans version connue ni sans le module du store', () => {
    expect(decisionAvis({ ...base, version: '' })).toBe(false);
    expect(decisionAvis({ ...base, disponible: false })).toBe(false);
  });
});

describe('joursDepuis', () => {
  it('compte en jours du calendrier local', () => {
    expect(joursDepuis(jourLocal(new Date(T0)), T0)).toBe(0);
    expect(joursDepuis(jourLocal(new Date(T0 - 3 * JOUR)), T0)).toBe(3);
    expect(joursDepuis('2026-11-18', new Date(2026, 10, 21, 0, 5).getTime())).toBe(3);
  });

  it('null si la date est absente ou illisible', () => {
    expect(joursDepuis(null, T0)).toBeNull();
    expect(joursDepuis('', T0)).toBeNull();
    expect(joursDepuis('hier', T0)).toBeNull();
  });
});

describe('demanderAvisApresSeance', () => {
  // AsyncStorage en mémoire pour ces tests (le mock global ne garde rien)
  let memoire: Record<string, string> = {};

  const installe = (joursAvant: number) => {
    memoire[CLE_DATE_INSTALLATION] = JSON.stringify({ date: jourLocal(new Date(T0 - joursAvant * JOUR)), statut: 'reelle' });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    memoire = {};
    (AsyncStorage.getItem as jest.Mock).mockImplementation((k: string) => Promise.resolve(memoire[k] ?? null));
    (AsyncStorage.setItem as jest.Mock).mockImplementation((k: string, v: string) => {
      memoire[k] = v;
      return Promise.resolve();
    });
    mockVersion.valeur = '3.2.0';
    mockStore.isAvailableAsync.mockResolvedValue(true);
    mockStore.hasAction.mockResolvedValue(true);
    installe(10);
  });

  const seances = async (n: number) => {
    for (let i = 0; i < n; i++) await compterSeanceAvis();
  };
  const apres = (dureeMin = 45, maintenant = T0, autreFenetre = false) => demanderAvisApresSeance({ autreFenetre, dureeMin, maintenant });

  it('rien après deux séances', async () => {
    await seances(2);
    expect(await apres()).toBe(false);
    expect(mockStore.requestReview).not.toHaveBeenCalled();
  });

  it('demande après la troisième séance, envoie avis_demande, puis rien dans les 120 jours', async () => {
    await seances(3);
    expect(await apres()).toBe(true);
    expect(mockStore.requestReview).toHaveBeenCalledTimes(1);
    expect(mockNoter).toHaveBeenCalledWith('avis_demande', { moment: 'troisieme_seance' });
    expect(memoire[CLE_DERNIERE_DEMANDE]).toBe(String(T0));
    expect(memoire[CLE_VERSION_DEMANDEE]).toBe('3.2.0');
    mockVersion.valeur = '3.3.0';
    await seances(1);
    expect(await apres(45, T0 + 60 * JOUR)).toBe(false);
    expect(mockStore.requestReview).toHaveBeenCalledTimes(1);
  });

  it('redemande 120 jours plus tard, dans une nouvelle version', async () => {
    await seances(3);
    await apres();
    mockVersion.valeur = '3.3.0';
    await seances(1);
    expect(await apres(45, T0 + 121 * JOUR)).toBe(true);
    expect(mockStore.requestReview).toHaveBeenCalledTimes(2);
  });

  it('pas les premiers jours après l’installation, ni sans date d’installation', async () => {
    await seances(5);
    installe(1);
    expect(await apres()).toBe(false);
    delete memoire[CLE_DATE_INSTALLATION];
    expect(await apres()).toBe(false);
    installe(3);
    expect(await apres()).toBe(true);
  });

  it('pas pour une séance de moins de 5 minutes', async () => {
    await seances(3);
    expect(await apres(3)).toBe(false);
    expect(mockStore.requestReview).not.toHaveBeenCalled();
  });

  it('jamais après « Noter » dans la feuille YOROI, ni juste après un « Plus tard »', async () => {
    await seances(3);
    memoire[CLE_AVIS_MAISON] = JSON.stringify({ derniere: T0 - 300 * JOUR, refus: 0, note: true });
    expect(await apres()).toBe(false);
    memoire[CLE_AVIS_MAISON] = JSON.stringify({ derniere: T0 - 5 * JOUR, refus: 1, note: false });
    expect(await apres()).toBe(false);
    expect(mockStore.requestReview).not.toHaveBeenCalled();
  });

  it('attend si la proposition de notifications ou le passage de rang est à l’écran', async () => {
    await seances(3);
    expect(await apres(45, T0, true)).toBe(false);
    expect(mockStore.requestReview).not.toHaveBeenCalled();
  });

  it('vérifie isAvailableAsync et hasAction', async () => {
    await seances(3);
    mockStore.hasAction.mockResolvedValue(false);
    expect(await apres()).toBe(false);
    mockStore.hasAction.mockResolvedValue(true);
    mockStore.isAvailableAsync.mockResolvedValue(false);
    expect(await apres()).toBe(false);
    expect(mockStore.requestReview).not.toHaveBeenCalled();
    expect(mockNoter).not.toHaveBeenCalled();
  });
});

describe('branchement sur l’écran de fin de séance', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const src: string = require('fs').readFileSync(require('path').join(__dirname, '../../app/seance/fin.tsx'), 'utf8');
  const close = src.slice(src.indexOf('const close = () => {'), src.indexOf('const closeRef'));

  it('« Terminer » (et le retour Android) demande la fenêtre native avec la durée de la séance', () => {
    expect(close).toContain('demanderAvisApresSeance({');
    expect(close).toContain('dureeMin');
    expect(close).toContain("AppState.currentState !== 'active'");
    expect(close).toContain('avisLance.current = true');
  });

  it('attend la proposition de rappels et ne passe jamais par-dessus une fenêtre ou le passage de rang', () => {
    expect(close).toContain('suite.current');
    expect(close).toMatch(/montres \|\| pendantRang \|\| !!_fenetreCurrent\(\) \|\| propositionEnCours\(\)/);
  });

  it('plus de feuille YOROI après une séance : un seul système de demande', () => {
    expect(src).not.toContain('programmerAvis');
  });
});
