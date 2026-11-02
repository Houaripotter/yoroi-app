/**
 * Cartes v10 (2 novembre 2026) : l'interrupteur du nouveau moteur (lib/v2/cartes/store.ts).
 * Ancien par defaut, bascule tout de suite, reglage de ce telephone seulement : jamais dans les cles synchronisees.
 */
const mockMemoire = new Map<string, string>();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => mockMemoire.get(k) ?? null),
    setItem: jest.fn(async (k: string, v: string) => void mockMemoire.set(k, v)),
    removeItem: jest.fn(async (k: string) => void mockMemoire.delete(k)),
    clear: jest.fn(async () => mockMemoire.clear()),
    getAllKeys: jest.fn(async () => [...mockMemoire.keys()]),
    multiGet: jest.fn(async (ks: string[]) => ks.map((k) => [k, mockMemoire.get(k) ?? null])),
  },
}));

import { DeviceEventEmitter } from 'react-native';
import { CARTES_REGLAGE_EVENT, CLE_MOTEUR, ecrireMoteur, formatDuMoteur, lireMoteur, MOTEUR_DEFAUT, moteurCourant, moteurValide } from '@/lib/v2/cartes/store';
import { CLES_ELEMENTS, CLES_ANCIENNES_PAR_ELEMENT, SPEC_PAR_CLE } from '@/lib/v2/synchro/cles';
import { readFileSync } from 'fs';
import { join } from 'path';

beforeEach(() => mockMemoire.clear());

test('ancien par defaut, sans rien de range', async () => {
  expect(MOTEUR_DEFAUT).toBe('ancien');
  expect(CLE_MOTEUR).toBe('yoroi_cartes_moteur_v1');
  expect(await lireMoteur()).toBe('ancien');
  expect(moteurCourant()).toBe('ancien');
});

test('une valeur inconnue retombe sur l ancien', async () => {
  mockMemoire.set(CLE_MOTEUR, 'nimporte');
  expect(await lireMoteur()).toBe('ancien');
  expect(moteurValide(null)).toBe('ancien');
});

test('nouveau puis retour a l ancien : instantane, prevenu par l evenement, range', async () => {
  const vus: unknown[] = [];
  const sub = DeviceEventEmitter.addListener(CARTES_REGLAGE_EVENT, (e) => vus.push(e));
  await ecrireMoteur('nouveau');
  expect(moteurCourant()).toBe('nouveau');
  expect(mockMemoire.get(CLE_MOTEUR)).toBe('nouveau');
  await ecrireMoteur('ancien');
  expect(moteurCourant()).toBe('ancien');
  expect(vus).toEqual([{ moteur: 'nouveau' }, { moteur: 'ancien' }]);
  sub.remove();
});

test('la cle n est pas synchronisee entre les appareils', () => {
  expect(CLES_ELEMENTS.some((s) => s.cle === CLE_MOTEUR)).toBe(false);
  expect(SPEC_PAR_CLE.has(CLE_MOTEUR)).toBe(false);
  expect(CLES_ANCIENNES_PAR_ELEMENT.has(CLE_MOTEUR)).toBe(false);
  // ni ecrite en dur dans les fichiers de la synchro
  const racine = join(__dirname, '..', '..');
  for (const f of ['lib/v2/synchro/cles.ts', 'lib/peerSyncService.ts']) expect(readFileSync(join(racine, f), 'utf8')).not.toContain(CLE_MOTEUR);
});

test('le carre s ouvre en 4:5 avec le nouveau moteur seulement', () => {
  expect(formatDuMoteur('carre', true)).toBe('post');
  expect(formatDuMoteur('carre', false)).toBe('carre');
  expect(formatDuMoteur('story', true)).toBe('story');
});

test('l interrupteur ne se regle que dans le Studio createur', () => {
  const racine = join(__dirname, '..', '..');
  const diag = readFileSync(join(racine, 'components/yoroi/v2/studio/Diagnostic.tsx'), 'utf8');
  expect(diag).toContain('ecrireMoteur');
  // le Studio est monte derriere sa garde (mode createur actif, jeton reverifie)
  const studio = readFileSync(join(racine, 'app/creator-mode.tsx'), 'utf8');
  expect(studio).toMatch(/<StudioGate>/);
  expect(studio).toContain("from '@/components/yoroi/v2/studio/Diagnostic'");
});
