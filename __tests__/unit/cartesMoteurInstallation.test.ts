/**
 * Cartes v10 (2 novembre 2026) : la vraie date d'installation (lib/v2/installation.ts).
 * Ecrite une seule fois, estimee pour un utilisateur existant, jamais synchronisee, sauvegardee, et a la restauration
 * on garde la plus ancienne des deux dates.
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
const mockBase = { trainings: [] as { date: string }[], weights: [] as { date: string }[], profile: null as null | { created_at?: string } };
jest.mock('@/lib/database', () => ({
  getTrainings: jest.fn(async () => mockBase.trainings),
  getWeights: jest.fn(async () => mockBase.weights),
  getProfile: jest.fn(async () => mockBase.profile),
}));

import { readFileSync } from 'fs';
import { join } from 'path';
import { CLE_DATE_INSTALLATION, debutDesDonnees, lireDateInstallation, plusAncienne, plusAncienneDonnee, poserDateInstallation, restaurerDateInstallation } from '@/lib/v2/installation';
import { CLES_ELEMENTS, SPEC_PAR_CLE } from '@/lib/v2/synchro/cles';
import { isStorageKeySkipped } from '@/lib/v2/sauvegarde/fusion';

beforeEach(() => {
  mockMemoire.clear();
  mockBase.trainings = [];
  mockBase.weights = [];
  mockBase.profile = null;
});

const MAINTENANT = new Date(2026, 10, 2, 10);

test('premiere installation : aujourd hui, reelle, ecrite une seule fois', async () => {
  const a = await poserDateInstallation({ maintenant: MAINTENANT });
  expect(a).toEqual({ date: '2026-11-02', statut: 'reelle' });
  // un autre lancement, plus tard, ne la change pas
  const b = await poserDateInstallation({ maintenant: new Date(2026, 11, 25, 10) });
  expect(b).toEqual({ date: '2026-11-02', statut: 'reelle' });
  expect(JSON.parse(mockMemoire.get(CLE_DATE_INSTALLATION)!)).toEqual({ date: '2026-11-02', statut: 'reelle' });
});

test('utilisateur existant : la plus ancienne donnee de l app, estimee', async () => {
  mockBase.trainings = [{ date: '2026-03-10T18:00:00' }, { date: '2026-02-14' }];
  mockBase.weights = [{ date: '2026-02-20' }];
  mockBase.profile = { created_at: '2026-02-16 09:00:00' };
  expect(await plusAncienneDonnee()).toBe('2026-02-14');
  expect(await poserDateInstallation({ maintenant: MAINTENANT })).toEqual({ date: '2026-02-14', statut: 'estimee' });
});

test('une pesee plus ancienne que la premiere seance compte aussi', async () => {
  mockBase.trainings = [{ date: '2026-05-01' }];
  mockBase.weights = [{ date: '2026-01-03' }];
  expect(await poserDateInstallation({ maintenant: MAINTENANT })).toEqual({ date: '2026-01-03', statut: 'estimee' });
});

test('restauration : on garde la plus ancienne des deux dates, jamais une plus recente', async () => {
  mockMemoire.set(CLE_DATE_INSTALLATION, JSON.stringify({ date: '2026-11-02', statut: 'reelle' }));
  // sauvegarde plus ancienne : elle gagne
  expect(await restaurerDateInstallation(JSON.stringify({ date: '2025-06-01', statut: 'estimee' }))).toEqual({ date: '2025-06-01', statut: 'estimee' });
  expect(await lireDateInstallation()).toEqual({ date: '2025-06-01', statut: 'estimee' });
  // sauvegarde plus recente : rien ne change
  expect(await restaurerDateInstallation({ date: '2026-10-01', statut: 'reelle' })).toEqual({ date: '2025-06-01', statut: 'estimee' });
  expect(await lireDateInstallation()).toEqual({ date: '2025-06-01', statut: 'estimee' });
  // valeur illisible : rien ne change
  await restaurerDateInstallation('pas une date');
  expect(await lireDateInstallation()).toEqual({ date: '2025-06-01', statut: 'estimee' });
});

test('restauration sur un telephone sans date : celle de la sauvegarde', async () => {
  expect(await restaurerDateInstallation({ date: '2026-01-05', statut: 'reelle' })).toEqual({ date: '2026-01-05', statut: 'reelle' });
});

test('a date egale, reelle l emporte', () => {
  expect(plusAncienne({ date: '2026-01-01', statut: 'estimee' }, { date: '2026-01-01', statut: 'reelle' })).toEqual({ date: '2026-01-01', statut: 'reelle' });
});

test('le debut des donnees : la plus ancienne entre installation et premiere seance', () => {
  expect(debutDesDonnees('2026-10-27', '2026-10-28')).toBe('2026-10-27');
  expect(debutDesDonnees('2026-10-27', '2026-09-01')).toBe('2026-09-01');
  expect(debutDesDonnees(null, null)).toBeNull();
});

test('jamais synchronisee entre les appareils, mais dans la sauvegarde', () => {
  expect(CLE_DATE_INSTALLATION).toBe('yoroi_date_installation');
  expect(CLES_ELEMENTS.some((s) => s.cle === CLE_DATE_INSTALLATION)).toBe(false);
  expect(SPEC_PAR_CLE.has(CLE_DATE_INSTALLATION)).toBe(false);
  const racine = join(__dirname, '..', '..');
  for (const f of ['lib/v2/synchro/cles.ts', 'lib/peerSyncService.ts']) expect(readFileSync(join(racine, f), 'utf8')).not.toContain(CLE_DATE_INSTALLATION);
  // la sauvegarde la prend (elle n'est pas ecartee), et la restauration passe par restaurerDateInstallation
  expect(isStorageKeySkipped(CLE_DATE_INSTALLATION)).toBe(false);
  const exp = readFileSync(join(racine, 'lib/exportService.ts'), 'utf8');
  expect(exp).toContain('dateInstallation: await AsyncStorage.getItem(CLE_DATE_INSTALLATION)');
  expect(exp).toContain('restaurerDateInstallation(recue)');
  // la reprise generique ne la touche pas (elle remplacerait une date plus ancienne)
  expect(exp).toMatch(/HANDLED_STORAGE_KEYS = new Set<string>\(\[[\s\S]*?CLE_DATE_INSTALLATION,[\s\S]*?\]\)/);
});

test('ecrite au premier lancement, apres l ouverture de la base', () => {
  const lay = readFileSync(join(__dirname, '..', '..', 'app/_layout.tsx'), 'utf8');
  expect(lay).toContain('poserDateInstallation()');
  expect(lay.indexOf('poserDateInstallation()')).toBeGreaterThan(lay.indexOf('await initDatabase()'));
});
