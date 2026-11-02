/**
 * Tests du module photo cote JavaScript (modules/yoroi-photo/index.ts) et de l'analysePhoto.ts proposee,
 * avec un faux module natif : reponse vide sans module, retour a A, delai, erreurs, Vision sans detourage, ML Kit.
 */
/* eslint-disable @typescript-eslint/no-require-imports */

type Natif = { analyserPhoto: jest.Mock; capacites: jest.Mock } | null;

type Charge = { photo: typeof import('@/modules/yoroi-photo'); analyse: typeof import('@/lib/v2/cartes/moteur/analysePhoto') };

function charger(natif: Natif): Charge {
  const mod: { v: Charge | null } = { v: null };
  jest.isolateModules(() => {
    jest.doMock('expo-modules-core', () => ({ requireOptionalNativeModule: () => natif }));
    mod.v = { photo: require('@/modules/yoroi-photo'), analyse: require('@/lib/v2/cartes/moteur/analysePhoto') };
  });
  return mod.v as Charge;
}

/**
 * Une silhouette propre (comme critereAplus.test.ts), a la taille du module : 737 x 1024.
 * Bord doux (4 x 4 sous-pixels), comme les vrais masques de Vision et de ML Kit : un bord en escalier ferait echouer
 * le controle strict du contour de la tete une fois le masque ramene a 1080 px (voir PHASE_NATIVE.md, risques).
 */
function silhouette(w = 737, h = 1024) {
  const d = new Uint8Array(w * h);
  const sx = w / 1080;
  const sy = h / 1500;
  const rx = 200;
  const ry = 250;
  const cx = 540;
  const cy = 550;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let dedans = 0;
      for (let a = 0; a < 4; a++) {
        for (let b = 0; b < 4; b++) {
          const X = (x + (a + 0.5) / 4) / sx - 0.5;
          const Y = (y + (b + 0.5) / 4) / sy - 0.5;
          const tete = ((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2 <= 1;
          const torse = X >= cx - rx - 40 && X <= cx + rx + 40 && Y >= cy + ry - 60;
          if (tete || torse) dedans++;
        }
      }
      d[y * w + x] = Math.round((dedans / 16) * 255);
    }
  }
  const fw = Math.trunc(1.3 * rx);
  const fh = Math.trunc(1.25 * ry);
  const visage = { x: (cx - Math.floor(fw / 2)) / 1080, y: (cy - Math.trunc(0.45 * ry)) / 1500, w: fw / 1080, h: fh / 1500 };
  return { pixels: Buffer.from(d).toString('base64'), w, h, visage };
}

function reponse(extra: Record<string, unknown> = {}) {
  const s = silhouette();
  return {
    visages: [{ ...s.visage, confiance: 0.92, lacet: 4 }],
    masque: { uri: 'file:///cache/cartes_tmp/masques/masque_1.png', largeur: s.w, hauteur: s.h, personnes: 1, pixels: s.pixels },
    lumiere: 0.41,
    plateforme: 'ios',
    moteur: 'apple-vision',
    versionModele: 'VNDetectFaceRectanglesRequestRevision3+VNGeneratePersonInstanceMaskRequestRevision1',
    largeur: s.w,
    hauteur: s.h,
    largeurPhoto: 1080,
    hauteurPhoto: 1500,
    detourageDisponible: true,
    erreurs: [],
    ...extra,
  };
}

describe('sans module natif (Expo Go, tests, build sans le module)', () => {
  it('analysePhoto rend toujours la reponse vide de secours, comme aujourd hui', async () => {
    const { analyse, photo } = charger(null);
    expect(photo.moduleDisponible()).toBe(false);
    await expect(analyse.analyserPhoto('file:///photo.jpg')).resolves.toEqual(analyse.ANALYSE_VIDE);
    await expect(analyse.analyserPhoto(null)).resolves.toEqual(analyse.ANALYSE_VIDE);
    expect(analyse.APLUS_ACTIF).toBe(false);
    expect(photo.capacites().detourage).toBe(false);
  });
});

describe('avec le module natif', () => {
  it('Vision : silhouette propre, A+ mesure, mais A affiche tant que A+ est eteint', async () => {
    const natif = { analyserPhoto: jest.fn().mockResolvedValue(reponse()), capacites: jest.fn() };
    const { analyse } = charger(natif);
    const a = await analyse.analyserPhoto('file:///cache/cartes_tmp/photo_1.jpg');
    // la carte analyse toujours a la taille par defaut (1024 px, en attendant le verdict du banc)
    expect(natif.analyserPhoto).toHaveBeenCalledWith('file:///cache/cartes_tmp/photo_1.jpg', 1024);
    expect(a.raisons).toEqual([]);
    expect(a.niveau).toBe('A+');
    expect(analyse.niveauAffiche(a)).toBe('A');
    expect(a.visages).toHaveLength(1);
    expect(a.frontal).toBe(true);
    expect(a.corps).not.toBeNull();
    expect(a.masque?.uri).toContain('cartes_tmp/masques/');
    expect(a.lumiere).toBeCloseTo(0.41);
    expect(a.source?.moteur).toBe('apple-vision');
  });

  it('masque non ecrit sur le disque : retour a A', async () => {
    const r = reponse();
    const natif = { analyserPhoto: jest.fn().mockResolvedValue({ ...r, masque: { ...r.masque, uri: '' } }), capacites: jest.fn() };
    const a = await charger(natif).analyse.analyserPhoto('file:///p.jpg');
    expect(a.niveau).toBe('A');
    expect(a.masque).toBeNull();
    expect(a.raisons).toContain('masque non enregistré');
  });

  it('avant iOS 17 ou macOS 14 : visages seuls, niveau A', async () => {
    const natif = { analyserPhoto: jest.fn().mockResolvedValue(reponse({ masque: undefined, detourageDisponible: false })), capacites: jest.fn() };
    const a = await charger(natif).analyse.analyserPhoto('file:///p.jpg');
    expect(a.niveau).toBe('A');
    expect(a.masque).toBeNull();
    expect(a.corps).toBeNull();
    expect(a.visages).toHaveLength(1);
  });

  it('aucun visage : Secours, la zone sure prend le relais', async () => {
    const natif = { analyserPhoto: jest.fn().mockResolvedValue(reponse({ visages: [] })), capacites: jest.fn() };
    const { analyse } = charger(natif);
    const a = await analyse.analyserPhoto('file:///p.jpg');
    expect(a.niveau).toBe('Secours');
    expect(analyse.niveauAffiche(a)).toBe('Secours');
    expect(a.corps).not.toBeNull();
  });

  it('ML Kit : pas de score de visage, reperes du visage, personnes inconnues', async () => {
    const r = reponse();
    const v = r.visages[0];
    const mlkit = {
      ...r,
      plateforme: 'android',
      moteur: 'google-mlkit',
      visages: [{ x: v.x, y: v.y, w: v.w, h: v.h, confiance: null, reperes: { oeilGauche: { x: v.x + 0.3 * v.w, y: v.y + 0.4 * v.h }, oeilDroit: { x: v.x + 0.7 * v.w, y: v.y + 0.4 * v.h }, nez: { x: v.x + 0.5 * v.w, y: v.y + 0.6 * v.h }, boucheBas: { x: v.x + 0.5 * v.w, y: v.y + 0.8 * v.h } } }],
      masque: { ...r.masque, personnes: null },
    };
    const natif = { analyserPhoto: jest.fn().mockResolvedValue(mlkit), capacites: jest.fn() };
    const a = await charger(natif).analyse.analyserPhoto('file:///p.jpg');
    expect(a.niveau).toBe('A+');
    expect(a.frontal).toBe(true);
    expect(a.masque?.personnes).toBeNull();
  });

  it('une tete de profil (lacet 80 degres) n est pas de face', async () => {
    const r = reponse();
    const natif = { analyserPhoto: jest.fn().mockResolvedValue({ ...r, visages: [{ ...r.visages[0], lacet: 80 }] }), capacites: jest.fn() };
    expect((await charger(natif).analyse.analyserPhoto('file:///p.jpg')).frontal).toBe(false);
  });

  it('le natif plante : reponse vide, jamais d erreur', async () => {
    const natif = { analyserPhoto: jest.fn().mockRejectedValue(new Error('Vision')), capacites: jest.fn() };
    const { analyse } = charger(natif);
    await expect(analyse.analyserPhoto('file:///p.jpg')).resolves.toEqual(analyse.ANALYSE_VIDE);
  });

  it('le natif ne repond pas : reponse vide apres le delai', async () => {
    jest.useFakeTimers();
    try {
      const natif = { analyserPhoto: jest.fn().mockReturnValue(new Promise(() => undefined)), capacites: jest.fn() };
      const { analyse, photo } = charger(natif);
      const p = analyse.analyserPhoto('file:///p.jpg');
      jest.advanceTimersByTime(photo.DELAI_ANALYSE_MS + 10);
      await expect(p).resolves.toEqual(analyse.ANALYSE_VIDE);
    } finally {
      jest.useRealTimers();
    }
  });

  it('une reponse abimee est nettoyee champ par champ', () => {
    const { photo } = charger(null);
    const n = photo.normaliserReponse({ visages: [null, { x: 'a' }, { x: 0.1, y: 0.1, w: 0.2, h: 0.2 }], lumiere: 7, plateforme: 'windows', masque: { pixels: '' } } as never);
    expect(n.visages).toHaveLength(1);
    expect(n.visages[0].confiance).toBeNull();
    expect(n.lumiere).toBe(1);
    expect(n.plateforme).toBeNull();
    expect(n.masque).toBeNull();
    expect(photo.normaliserReponse(null).visages).toEqual([]);
  });

  it('pixels du masque : base64 decode sans Buffer, taille verifiee', () => {
    const { photo } = charger(null);
    const brut = new Uint8Array(1000).map((_, i) => (i * 37) & 255);
    expect(Array.from(photo.base64VersOctets(Buffer.from(brut).toString('base64')))).toEqual(Array.from(brut));
    const m = { uri: '', largeur: 10, hauteur: 10, personnes: 1, pixels: Buffer.from(brut).toString('base64') };
    expect(photo.decoderPixels(m)).toBeNull();
    expect(photo.decoderPixels({ ...m, hauteur: 100 })?.length).toBe(1000);
  });
});

describe('taille de la copie analysee (banc 1024 contre 1440)', () => {
  it('1024 par defaut, le banc compare 1024 et 1440', () => {
    const { photo } = charger(null);
    expect(photo.TAILLE_ANALYSE_DEFAUT).toBe(1024);
    expect([...photo.TAILLES_BANC]).toEqual([1024, 1440]);
    expect(photo.tailleAnalyse()).toBe(1024);
    expect(photo.tailleAnalyse(null)).toBe(1024);
    expect(photo.tailleAnalyse(Number.NaN)).toBe(1024);
  });

  it('une taille demandee est bornee entre 512 et 2048 px, en entier', () => {
    const { photo } = charger(null);
    expect(photo.tailleAnalyse(1440)).toBe(1440);
    expect(photo.tailleAnalyse(1439.6)).toBe(1440);
    expect(photo.tailleAnalyse(10)).toBe(photo.TAILLE_ANALYSE_MIN);
    expect(photo.tailleAnalyse(10_000)).toBe(photo.TAILLE_ANALYSE_MAX);
  });

  it('le banc passe la taille au natif, et la reponse garde taille, temps et memoire', async () => {
    const natif = {
      analyserPhoto: jest.fn().mockResolvedValue({ ...reponse(), tailleMax: 1440, memoireAvantMo: 180, memoireApresMo: 190, memoirePicMo: 240 }),
      capacites: jest.fn(),
    };
    const { photo } = charger(natif);
    const r = await photo.analyserPhoto('file:///p.jpg', { tailleMax: 1440 });
    expect(natif.analyserPhoto).toHaveBeenCalledWith('file:///p.jpg', 1440);
    expect(r.tailleMax).toBe(1440);
    expect(r.memoireAvantMo).toBe(180);
    expect(r.memoireApresMo).toBe(190);
    expect(r.memoirePicMo).toBe(240);
  });

  it('sans module, meme avec une taille, la reponse vide', async () => {
    const { photo } = charger(null);
    await expect(photo.analyserPhoto('file:///p.jpg', { tailleMax: 1440 })).resolves.toEqual(photo.REPONSE_VIDE);
  });
});
