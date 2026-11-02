/**
 * Phase native : avec le moteur « Ancien », choisir une photo dans une carte (useCarte) n'appelle jamais le module
 * photo natif. Avec « Nouveau », une seule analyse. Faux module natif ; selecteur, identite et espace simules.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import { renderHook, act } from '@testing-library/react-native';

const mockNatif = { analyserPhoto: jest.fn(), capacites: jest.fn() };
const mockStockage = new Map<string, string>();

jest.mock('expo-modules-core', () => {
  const vrai = jest.requireActual('expo-modules-core');
  return { ...vrai, requireOptionalNativeModule: (nom: string) => (nom === 'YoroiPhoto' ? mockNatif : vrai.requireOptionalNativeModule(nom)) };
});
jest.mock('@/lib/v2/partage/capture', () => ({
  pickCardPhoto: jest.fn(async () => ({ uri: 'file:///var/mobile/Containers/Data/Application/APP/Library/Caches/cartes_tmp/photo_1.jpg' })),
}));
jest.mock('@/lib/v2/partage/identity', () => ({
  useCardIdentity: () => ({ ready: true, personnage: null, rankIndex: 0, genre: null }),
}));
jest.mock('@/lib/v2/espace', () => ({ getEspace: jest.fn(async () => ({})) }));
jest.mock('expo-clipboard', () => ({ setImageAsync: jest.fn(), setStringAsync: jest.fn() }));
jest.mock('@/lib/v2/cartes/export', () => ({ copierAutocollant: jest.fn(), enregistrerCarte: jest.fn(), partagerCarte: jest.fn(), partagerStory: jest.fn() }));
jest.mock('react-native-view-shot', () => ({ releaseCapture: jest.fn(), captureRef: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockStockage.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => {
      mockStockage.set(k, v);
    }),
    removeItem: jest.fn(async () => undefined),
  },
}));

const { useCarte } = require('@/components/yoroi/v2/cartes/useCarte');

async function laisserFiler() {
  for (let k = 0; k < 30; k++) await Promise.resolve();
}

describe('useCarte et le module photo', () => {
  beforeEach(() => {
    mockNatif.analyserPhoto.mockReset();
    mockNatif.analyserPhoto.mockResolvedValue({ visages: [], moteur: 'apple-vision', erreurs: [], largeur: 0, hauteur: 0, largeurPhoto: 0, hauteurPhoto: 0 });
    mockStockage.clear();
  });

  it('« Ancien » actif : choix d une photo, aucun appel au natif', async () => {
    mockStockage.set('yoroi_cartes_moteur_v1', 'ancien');
    const { result, unmount } = renderHook(() => useCarte(null));
    await act(async () => {
      await result.current.choisirPhoto('gallery');
      await laisserFiler();
    });
    expect(result.current.photo).toContain('cartes_tmp/photo_1.jpg');
    expect(mockNatif.analyserPhoto).not.toHaveBeenCalled();
    expect(result.current.analyse).toBeNull();
    unmount();
  });

  it('« Nouveau » actif : choix d une photo, une analyse', async () => {
    mockStockage.set('yoroi_cartes_moteur_v1', 'nouveau');
    const { result, unmount } = renderHook(() => useCarte(null));
    await act(async () => {
      await laisserFiler();
      await result.current.choisirPhoto('gallery');
      await laisserFiler();
    });
    expect(mockNatif.analyserPhoto).toHaveBeenCalledTimes(1);
    unmount();
  });
});
