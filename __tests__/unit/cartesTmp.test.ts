/**
 * 2 novembre 2026 : copies temporaires des cartes (lib/v2/cartes/tmp.ts).
 * Systeme de fichiers simule : on prouve que seul cacheDirectory/cartes_tmp/ est vide,
 * et que rien d'autre (photothèque, photos gardees dans l'app, reste du cache) n'est jamais touche.
 */

const mockCACHE = 'file:///var/mobile/Containers/Data/Application/APP/Library/Caches/';
const mockDOCS = 'file:///var/mobile/Containers/Data/Application/APP/Documents/';
const TMP = `${mockCACHE}cartes_tmp/`;

type Entree = { dossier: boolean; mtime: number };
const mockFs = new Map<string, Entree>();
const mockAppels = { delete: [] as string[], move: [] as { from: string; to: string }[] };
const mockPlateforme = { OS: 'ios' as 'ios' | 'android' };

function mockSansSlash(p: string) {
  return p.endsWith('/') ? p.slice(0, -1) : p;
}
function mockEnfants(dossier: string): string[] {
  const d = `${mockSansSlash(dossier)}/`;
  const noms = new Set<string>();
  for (const k of mockFs.keys()) if (k.startsWith(d) && k.length > d.length) noms.add(k.slice(d.length).split('/')[0]);
  return [...noms];
}

jest.mock('react-native', () => ({ Platform: mockPlateforme }));
jest.mock('react-native-view-shot', () => ({ releaseCapture: jest.fn() }));
jest.mock('expo-file-system/legacy', () => ({
  cacheDirectory: mockCACHE,
  documentDirectory: mockDOCS,
  getInfoAsync: jest.fn(async (p: string) => {
    const e = mockFs.get(mockSansSlash(p));
    return e ? { exists: true, isDirectory: e.dossier, modificationTime: e.mtime / 1000, uri: p } : { exists: false, isDirectory: false, uri: p };
  }),
  makeDirectoryAsync: jest.fn(async (p: string) => {
    mockFs.set(mockSansSlash(p), { dossier: true, mtime: Date.now() });
  }),
  readDirectoryAsync: jest.fn(async (p: string) => mockEnfants(p)),
  moveAsync: jest.fn(async ({ from, to }: { from: string; to: string }) => {
    mockAppels.move.push({ from, to });
    const e = mockFs.get(mockSansSlash(from));
    if (!e) throw new Error('absent');
    mockFs.delete(mockSansSlash(from));
    mockFs.set(mockSansSlash(to), e);
  }),
  deleteAsync: jest.fn(async (p: string) => {
    mockAppels.delete.push(p);
    const base = mockSansSlash(p);
    for (const k of [...mockFs.keys()]) if (k === base || k.startsWith(`${base}/`)) mockFs.delete(k);
  }),
}));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const tmp = require('@/lib/v2/cartes/tmp') as typeof import('@/lib/v2/cartes/tmp');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { releaseCapture } = require('react-native-view-shot') as { releaseCapture: jest.Mock };

const HORS_TMP = [
  `${mockDOCS}photos/progression_2026-10-01.jpg`,
  `${mockDOCS}photos/avant.jpg`,
  `${mockDOCS}profil/photo.jpg`,
  `${mockCACHE}ImageManipulator/autre.jpg`,
  `${mockCACHE}cartes_tmp_autre/x.png`,
  `${mockCACHE}cartes_tmpx.png`,
];

function fichier(p: string, mtime: number) {
  mockFs.set(mockSansSlash(p), { dossier: false, mtime });
}

beforeEach(() => {
  mockFs.clear();
  mockAppels.delete = [];
  mockAppels.move = [];
  mockPlateforme.OS = 'ios';
  releaseCapture.mockClear();
  tmp.__reinitialiserNettoyage();
  jest.useRealTimers();
});

describe('estDansCartesTmp : seul le dossier dedie est reconnu', () => {
  it.each([
    [`${TMP}photo_1.jpg`, true],
    [`${TMP}masques/m.png`, true],
    ['file:///private/var/mobile/Containers/Data/Application/APP/Library/Caches/cartes_tmp/p.jpg', true],
    ['/var/mobile/Containers/Data/Application/APP/Library/Caches/cartes_tmp/p.jpg', true],
    [`${TMP}photo.jpg?v=2`, true],
    [TMP, false],
    [`${TMP}../Documents/photo.jpg`, false],
    [`${TMP}./x.jpg`, false],
    [`${mockCACHE}ImagePicker/x.jpg`, false],
    [`${mockDOCS}photos/p.jpg`, false],
    ['ph://ED7AC36B-A150/L0/001', false],
    ['content://media/external/images/media/12', false],
    ['assets-library://asset/asset.JPG?id=1', false],
    [`${mockCACHE}cartes_tmpx.png`, false],
    ['', false],
    [null, false],
  ])('%s -> %s', (uri, attendu) => {
    expect(tmp.estDansCartesTmp(uri as string | null)).toBe(attendu);
  });
});

describe('rangerDansCartesTmp', () => {
  it('deplace la copie du selecteur (cache) dans cartes_tmp', async () => {
    fichier(`${mockCACHE}ImagePicker/abc.jpeg`, 1);
    const r = await tmp.rangerDansCartesTmp(`${mockCACHE}ImagePicker/abc.jpeg`, 'photo');
    expect(r.startsWith(TMP)).toBe(true);
    expect(r.endsWith('.jpeg')).toBe(true);
    expect(mockFs.has(mockSansSlash(`${mockCACHE}ImagePicker/abc.jpeg`))).toBe(false);
    expect(mockFs.has(mockSansSlash(r))).toBe(true);
  });

  it.each(['ph://ED7AC36B/L0/001', 'content://media/external/images/media/12', `${mockDOCS}photos/progression.jpg`, 'file:///var/mobile/Media/DCIM/100APPLE/IMG_0001.HEIC'])(
    'ne deplace jamais un original ni une photo gardee : %s',
    async (uri) => {
      const r = await tmp.rangerDansCartesTmp(uri);
      expect(r).toBe(uri);
      expect(mockAppels.move).toHaveLength(0);
    },
  );

  it("rend le chemin d'origine si le deplacement echoue", async () => {
    const r = await tmp.rangerDansCartesTmp(`${mockCACHE}ImagePicker/absent.jpg`);
    expect(r).toBe(`${mockCACHE}ImagePicker/absent.jpg`);
  });
});

describe('effacement apres usage', () => {
  it('efface une copie de cartes_tmp', async () => {
    fichier(`${TMP}photo_1.jpg`, 1);
    expect(await tmp.effacerCopieCarte(`${TMP}photo_1.jpg`)).toBe(true);
    expect(mockFs.has(mockSansSlash(`${TMP}photo_1.jpg`))).toBe(false);
  });

  it.each(HORS_TMP)('ne touche jamais un fichier hors de cartes_tmp : %s', async (uri) => {
    fichier(uri, 1);
    expect(await tmp.effacerCopieCarte(uri)).toBe(false);
    expect(mockFs.has(mockSansSlash(uri))).toBe(true);
    expect(mockAppels.delete).toHaveLength(0);
  });

  it('refuse un chemin qui remonte hors du dossier', async () => {
    fichier(`${mockDOCS}photos/avant.jpg`, 1);
    expect(await tmp.effacerCopieCarte(`${TMP}../../Documents/photos/avant.jpg`)).toBe(false);
    expect(mockAppels.delete).toHaveLength(0);
  });

  it("libere la capture de view-shot restee dans son dossier (iPhone : chemin brut sans file://)", async () => {
    await tmp.effacerExport('/private/var/mobile/Containers/Data/Application/APP/tmp/ReactNative/A.png');
    expect(releaseCapture).toHaveBeenCalledWith('/private/var/mobile/Containers/Data/Application/APP/tmp/ReactNative/A.png');
    expect(mockAppels.delete).toHaveLength(0);
  });

  it("n'appelle pas view-shot pour une adresse de la photothèque", async () => {
    await tmp.effacerExport('ph://ED7AC36B/L0/001');
    await tmp.effacerExport('content://media/external/images/media/12');
    expect(releaseCapture).not.toHaveBeenCalled();
    expect(mockAppels.delete).toHaveLength(0);
  });

  it('iPhone : apres un partage, effacement immediat', async () => {
    fichier(`${TMP}export_1.png`, 1);
    tmp.effacerApresPartage(`${TMP}export_1.png`);
    await Promise.resolve();
    await Promise.resolve();
    expect(mockFs.has(mockSansSlash(`${TMP}export_1.png`))).toBe(false);
  });

  it("Android : apres un partage, effacement differe (l'app choisie lit encore le fichier)", async () => {
    jest.useFakeTimers();
    mockPlateforme.OS = 'android';
    fichier(`${TMP}export_2.png`, 1);
    tmp.effacerApresPartage(`${TMP}export_2.png`);
    await Promise.resolve();
    expect(mockFs.has(mockSansSlash(`${TMP}export_2.png`))).toBe(true);
    jest.advanceTimersByTime(tmp.DELAI_EFFACEMENT_ANDROID_MS);
    jest.useRealTimers();
    await new Promise((r) => setTimeout(r, 0));
    expect(mockFs.has(mockSansSlash(`${TMP}export_2.png`))).toBe(false);
  });
});

describe('masques temporaires', () => {
  it('sont crees dans cartes_tmp/masques et effaces ensemble', async () => {
    const m = await tmp.cheminMasque();
    expect(m && m.startsWith(`${TMP}masques/`)).toBe(true);
    fichier(m!, 1);
    fichier(`${mockDOCS}photos/avant.jpg`, 1);
    await tmp.effacerMasques();
    expect(mockFs.has(mockSansSlash(m!))).toBe(false);
    expect(mockFs.has(mockSansSlash(`${mockDOCS}photos/avant.jpg`))).toBe(true);
  });
});

describe('nettoyage au demarrage', () => {
  it("vide cartes_tmp (sous-dossiers compris) et ne touche a rien d'autre", async () => {
    const vieux = Date.now() - 3_600_000;
    mockFs.set(mockSansSlash(TMP), { dossier: true, mtime: vieux });
    mockFs.set(mockSansSlash(`${TMP}masques/`), { dossier: true, mtime: vieux });
    fichier(`${TMP}photo_1.jpg`, vieux);
    fichier(`${TMP}export_1.png`, vieux);
    fichier(`${TMP}masques/m1.png`, vieux);
    for (const u of HORS_TMP) fichier(u, vieux);
    fichier(`${mockCACHE}ImagePicker/x.jpg`, vieux);

    const n = await tmp.viderCartesTmp(Date.now());
    expect(n).toBe(3);
    expect(mockEnfants(TMP).filter((k) => !mockFs.get(mockSansSlash(`${TMP}${k}`))?.dossier)).toHaveLength(0);
    for (const u of HORS_TMP) expect(mockFs.has(mockSansSlash(u))).toBe(true);
    expect(mockFs.has(mockSansSlash(`${mockCACHE}ImagePicker/x.jpg`))).toBe(true);
    for (const p of mockAppels.delete) expect(tmp.estDansCartesTmp(p)).toBe(true);
  });

  it('garde les fichiers crees pendant ce lancement (une carte deja ouverte)', async () => {
    const debut = Date.now();
    mockFs.set(mockSansSlash(TMP), { dossier: true, mtime: debut - 10_000 });
    fichier(`${TMP}ancien.jpg`, debut - 10_000);
    fichier(`${TMP}nouveau.jpg`, debut + 1_000);
    await tmp.viderCartesTmp(debut);
    expect(mockFs.has(mockSansSlash(`${TMP}ancien.jpg`))).toBe(false);
    expect(mockFs.has(mockSansSlash(`${TMP}nouveau.jpg`))).toBe(true);
  });

  it('dossier absent : ne fait rien et ne leve rien', async () => {
    await expect(tmp.viderCartesTmp()).resolves.toBe(0);
    expect(mockAppels.delete).toHaveLength(0);
  });

  it('erreur du systeme de fichiers : ne leve rien', async () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const FS = require('expo-file-system/legacy');
    FS.getInfoAsync.mockRejectedValueOnce(new Error('panne'));
    await expect(tmp.viderCartesTmp()).resolves.toBe(0);
  });

  it('lancerNettoyageDemarrage ne bloque pas : rien avant le delai, une seule fois', async () => {
    jest.useFakeTimers();
    const vieux = Date.now() - 60_000;
    mockFs.set(mockSansSlash(TMP), { dossier: true, mtime: vieux });
    fichier(`${TMP}photo.jpg`, vieux);
    expect(() => tmp.lancerNettoyageDemarrage(1000)).not.toThrow();
    tmp.lancerNettoyageDemarrage(1000);
    expect(mockFs.has(mockSansSlash(`${TMP}photo.jpg`))).toBe(true);
    jest.advanceTimersByTime(1000);
    jest.useRealTimers();
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockFs.has(mockSansSlash(`${TMP}photo.jpg`))).toBe(false);
    expect(mockAppels.delete.length).toBe(1);
  });
});
