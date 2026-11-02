/**
 * Phase native : l'analyse de la photo d'une carte ne tourne qu'avec le moteur « Nouveau »
 * (lib/v2/cartes/moteur/analyseCarte.ts, utilise par useCarte, et analysePhoto.ts).
 * Faux module natif, AsyncStorage et systeme de fichiers simules :
 *   * « Ancien » : choix d'une photo, aucun appel au natif ;
 *   * passage a « Ancien » pendant une analyse : resultat ignore, masque efface ;
 *   * MODULE_PHOTO_ACTIF a faux : aucun appel au natif, meme avec « Nouveau » ;
 *   * masques effaces au changement de photo, apres un export ou un partage, a la sortie, au passage a « Ancien »,
 *     et au demarrage suivant (viderCartesTmp).
 */
/* eslint-disable @typescript-eslint/no-require-imports */

const mockCACHE = 'file:///var/mobile/Containers/Data/Application/APP/Library/Caches/';
const MASQUES = `${mockCACHE}cartes_tmp/masques/`;

type Fs = Map<string, { dossier: boolean; mtime: number }>;
type Monde = {
  fs: Fs;
  efface: string[];
  stockage: Map<string, string>;
  natif: { analyserPhoto: jest.Mock; capacites: jest.Mock } | null;
};

function sansSlash(p: string) {
  return p.endsWith('/') ? p.slice(0, -1) : p;
}

function reponse(uriMasque: string) {
  const w = 10;
  const h = 10;
  return {
    visages: [{ x: 0.3, y: 0.2, w: 0.3, h: 0.2, confiance: 0.9, lacet: 0 }],
    masque: { uri: uriMasque, largeur: w, hauteur: h, personnes: 1, pixels: Buffer.from(new Uint8Array(w * h).fill(255)).toString('base64') },
    lumiere: 0.4,
    plateforme: 'ios',
    moteur: 'apple-vision',
    versionModele: 'test',
    largeur: 10,
    hauteur: 10,
    largeurPhoto: 1080,
    hauteurPhoto: 1080,
    detourageDisponible: true,
    erreurs: [],
  };
}

type Charge = {
  carte: typeof import('@/lib/v2/cartes/moteur/analyseCarte');
  analyse: typeof import('@/lib/v2/cartes/moteur/analysePhoto');
  store: typeof import('@/lib/v2/cartes/store');
  tmp: typeof import('@/lib/v2/cartes/tmp');
};

function charger(monde: Monde, options: { moduleActif?: boolean } = {}): Charge {
  const out: { v: Charge | null } = { v: null };
  jest.isolateModules(() => {
    jest.doMock('expo-modules-core', () => ({ requireOptionalNativeModule: () => monde.natif }));
    jest.doMock('react-native', () => ({
      Platform: { OS: 'ios', select: (o: Record<string, unknown>) => o.ios },
      Image: { getSize: jest.fn() },
      DeviceEventEmitter: { emit: jest.fn(), addListener: jest.fn(() => ({ remove: jest.fn() })) },
    }));
    jest.doMock('react-native-view-shot', () => ({ releaseCapture: jest.fn() }));
    jest.doMock('@react-native-async-storage/async-storage', () => ({
      __esModule: true,
      default: {
        getItem: jest.fn(async (k: string) => monde.stockage.get(k) ?? null),
        setItem: jest.fn(async (k: string, v: string) => {
          monde.stockage.set(k, v);
        }),
        removeItem: jest.fn(async (k: string) => {
          monde.stockage.delete(k);
        }),
      },
    }));
    jest.doMock('expo-file-system/legacy', () => ({
      cacheDirectory: mockCACHE,
      documentDirectory: 'file:///var/mobile/Containers/Data/Application/APP/Documents/',
      getInfoAsync: jest.fn(async (p: string) => {
        const e = monde.fs.get(sansSlash(p));
        return e ? { exists: true, isDirectory: e.dossier, modificationTime: e.mtime / 1000, uri: p } : { exists: false, isDirectory: false, uri: p };
      }),
      readDirectoryAsync: jest.fn(async (p: string) => {
        const d = `${sansSlash(p)}/`;
        const noms = new Set<string>();
        for (const k of monde.fs.keys()) if (k.startsWith(d) && k.length > d.length) noms.add(k.slice(d.length).split('/')[0]);
        return [...noms];
      }),
      makeDirectoryAsync: jest.fn(async (p: string) => {
        monde.fs.set(sansSlash(p), { dossier: true, mtime: Date.now() });
      }),
      deleteAsync: jest.fn(async (p: string) => {
        monde.efface.push(p);
        const k = sansSlash(p);
        for (const cle of [...monde.fs.keys()]) if (cle === k || cle.startsWith(`${k}/`)) monde.fs.delete(cle);
      }),
      moveAsync: jest.fn(),
      copyAsync: jest.fn(),
    }));
    // un doMock reste d'un test a l'autre : on le retire quand il ne sert pas
    if (options.moduleActif === false) jest.doMock('@/lib/v2/cartes/moteur/reglagesPhoto', () => ({ MODULE_PHOTO_ACTIF: false }));
    else jest.dontMock('@/lib/v2/cartes/moteur/reglagesPhoto');
    out.v = {
      carte: require('@/lib/v2/cartes/moteur/analyseCarte'),
      analyse: require('@/lib/v2/cartes/moteur/analysePhoto'),
      store: require('@/lib/v2/cartes/store'),
      tmp: require('@/lib/v2/cartes/tmp'),
    };
  });
  return out.v as Charge;
}

/** Un monde ou le natif ecrit un vrai fichier de masque dans cartes_tmp/masques/ a chaque analyse */
function monde(moteur: 'ancien' | 'nouveau' | null): Monde {
  const m: Monde = { fs: new Map(), efface: [], stockage: new Map(), natif: null };
  if (moteur) m.stockage.set('yoroi_cartes_moteur_v1', moteur);
  let n = 0;
  m.natif = {
    analyserPhoto: jest.fn(async () => {
      const uri = `${MASQUES}masque_${++n}.png`;
      m.fs.set(sansSlash(MASQUES), { dossier: true, mtime: Date.now() });
      m.fs.set(uri, { dossier: false, mtime: Date.now() });
      return reponse(uri);
    }),
    capacites: jest.fn(),
  };
  return m;
}

const masquesPresents = (m: Monde) => [...m.fs.keys()].filter((k) => k.startsWith(MASQUES) && !m.fs.get(k)?.dossier);

describe('moteur « Ancien » : ni Vision ni ML Kit', () => {
  it('choix d une photo avec « Ancien » : aucun appel au natif, aucune analyse', async () => {
    const w = monde('ancien');
    const { carte } = charger(w);
    const definir = jest.fn();
    const c = carte.creerAnalyseCarte(definir);
    c.ouvrir();
    await c.changerPhoto(`${mockCACHE}cartes_tmp/photo_1.jpg`);
    expect(w.natif?.analyserPhoto).not.toHaveBeenCalled();
    expect(definir).not.toHaveBeenCalledWith(expect.objectContaining({ moteur: expect.anything() }));
    expect(definir.mock.calls.every(([a]) => a === null)).toBe(true);
  });

  it('reglage jamais choisi (premier lancement) : « Ancien » par defaut, aucun appel au natif', async () => {
    const w = monde(null);
    const { analyse } = charger(w);
    await expect(analyse.analyserPhoto('file:///p.jpg')).resolves.toEqual(analyse.ANALYSE_VIDE);
    expect(w.natif?.analyserPhoto).not.toHaveBeenCalled();
  });

  it('« Nouveau » : une analyse, le resultat arrive a la carte', async () => {
    const w = monde('nouveau');
    const { carte } = charger(w);
    const definir = jest.fn();
    const c = carte.creerAnalyseCarte(definir);
    c.ouvrir();
    await c.changerPhoto(`${mockCACHE}cartes_tmp/photo_1.jpg`);
    expect(w.natif?.analyserPhoto).toHaveBeenCalledTimes(1);
    const derniere = definir.mock.calls[definir.mock.calls.length - 1][0];
    expect(derniere.visages).toHaveLength(1);
    expect(derniere.masque.uri).toContain('cartes_tmp/masques/');
  });

  it('passage a « Ancien » pendant l analyse : resultat ignore, masque efface', async () => {
    const w = monde('nouveau');
    let finir: () => void = () => undefined;
    const natif = w.natif!;
    natif.analyserPhoto.mockImplementationOnce(
      () =>
        new Promise((ok) => {
          finir = () => {
            const uri = `${MASQUES}masque_lent.png`;
            w.fs.set(uri, { dossier: false, mtime: Date.now() });
            ok(reponse(uri));
          };
        }),
    );
    const { carte, store } = charger(w);
    const definir = jest.fn();
    const c = carte.creerAnalyseCarte(definir);
    c.ouvrir();
    const p = c.changerPhoto(`${mockCACHE}cartes_tmp/photo_1.jpg`);
    for (let k = 0; k < 20 && natif.analyserPhoto.mock.calls.length === 0; k++) await Promise.resolve();
    expect(natif.analyserPhoto).toHaveBeenCalledTimes(1);
    await store.ecrireMoteur('ancien');
    await c.moteurChange('ancien');
    finir();
    await p;
    expect(definir.mock.calls.every(([a]) => a === null)).toBe(true);
    expect(masquesPresents(w)).toEqual([]);
    expect(w.efface).toContain(`${MASQUES}masque_lent.png`);
  });
});

describe('MODULE_PHOTO_ACTIF a faux', () => {
  it('aucun appel au natif, meme avec « Nouveau » : la reponse vide, la zone sure', async () => {
    const w = monde('nouveau');
    const { carte, analyse } = charger(w, { moduleActif: false });
    expect(analyse.MODULE_PHOTO_ACTIF).toBe(false);
    const definir = jest.fn();
    const c = carte.creerAnalyseCarte(definir);
    c.ouvrir();
    await c.changerPhoto(`${mockCACHE}cartes_tmp/photo_1.jpg`);
    await expect(analyse.analyserPhoto('file:///p.jpg')).resolves.toEqual(analyse.ANALYSE_VIDE);
    expect(w.natif?.analyserPhoto).not.toHaveBeenCalled();
  });

  it('vaut vrai dans l app : c est une constante du code, la changer demande une nouvelle version', () => {
    const { analyse } = charger(monde('nouveau'));
    expect(analyse.MODULE_PHOTO_ACTIF).toBe(true);
  });
});

describe('les masques temporaires sont effaces', () => {
  async function avecMasque() {
    const w = monde('nouveau');
    const ch = charger(w);
    const c = ch.carte.creerAnalyseCarte(jest.fn());
    c.ouvrir();
    await c.changerPhoto(`${mockCACHE}cartes_tmp/photo_1.jpg`);
    expect(masquesPresents(w)).toHaveLength(1);
    return { w, c, ...ch };
  }

  it('au changement de photo', async () => {
    const { w, c } = await avecMasque();
    const avant = masquesPresents(w)[0];
    await c.changerPhoto(null);
    expect(w.fs.has(avant)).toBe(false);
  });

  it('apres un export ou un partage, termine ou annule', async () => {
    const { w, c } = await avecMasque();
    await c.apresExport();
    expect(masquesPresents(w)).toEqual([]);
  });

  it('a la sortie de la carte', async () => {
    const { w, c } = await avecMasque();
    await c.fermer();
    expect(masquesPresents(w)).toEqual([]);
  });

  it('au passage a « Ancien »', async () => {
    const { w, c, store } = await avecMasque();
    await store.ecrireMoteur('ancien');
    await c.moteurChange('ancien');
    expect(masquesPresents(w)).toEqual([]);
  });

  it('au demarrage suivant, ceux d une session coupee (viderCartesTmp)', async () => {
    const w = monde('nouveau');
    const { tmp } = charger(w);
    const ancien = Date.now() - 60_000;
    w.fs.set(sansSlash(`${mockCACHE}cartes_tmp/`), { dossier: true, mtime: ancien });
    w.fs.set(sansSlash(MASQUES), { dossier: true, mtime: ancien });
    w.fs.set(`${MASQUES}masque_oublie.png`, { dossier: false, mtime: ancien });
    const effaces = await tmp.viderCartesTmp(Date.now());
    expect(effaces).toBe(1);
    expect(masquesPresents(w)).toEqual([]);
  });
});
