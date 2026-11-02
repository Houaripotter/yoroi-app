/**
 * Bloc deplacable et bande collee en bas (2 novembre 2026), Houari :
 * 1. « je veux glisser moi-meme les chiffres, pour qu'ils ne cachent ni mes abdos, ni mes pecs, ni mon visage » :
 *    les bornes du deplacement (zone sure), l'aimantage, la position relative identique en story et en 4:5, l'export a
 *    la bonne place, « Replacer les chiffres » et « Recadrer automatiquement » qui rendent la place automatique,
 *    les places Haut, Milieu, Bas pour qui ne peut pas glisser, la memoire (jamais la photo) ;
 * 2. « le logo et les badges VRAIMENT tout en bas, et plus fins » : la nouvelle grille de la bande, sans chevauchement.
 */
/* eslint-disable @typescript-eslint/no-require-imports, import/first */
import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Text as SvgText } from 'react-native-svg';

jest.mock('@/components/yoroi/v2/espace/reglages/prefs', () => ({ useUnitePoids: () => 'kg' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }), SafeAreaProvider: ({ children }: { children: unknown }) => children }));
jest.mock('@/lib/v2/cartes/moteur/analysePhoto', () => ({ ...jest.requireActual('@/lib/v2/cartes/moteur/analysePhoto'), taillePhoto: async () => ({ w: 1080, h: 1935 }) }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(async () => undefined), notificationAsync: jest.fn(async () => undefined), selectionAsync: jest.fn(async () => undefined), ImpactFeedbackStyle: { Light: 'l', Medium: 'm', Heavy: 'h' }, NotificationFeedbackType: { Success: 's' } }));
jest.mock('@react-native-async-storage/async-storage', () => {
  const m = new Map<string, string>();
  return { __esModule: true, default: { getItem: jest.fn(async (k: string) => m.get(k) ?? null), setItem: jest.fn(async (k: string, v: string) => void m.set(k, v)), removeItem: jest.fn(async (k: string) => void m.delete(k)) } };
});
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const id = (t: number) => t;
  const Easing = { bezier: () => id, linear: id, quad: id, cubic: id, out: () => id, in: () => id, inOut: () => id, ease: id };
  const base: Record<string, unknown> = {
    __esModule: true, default: { View, ScrollView: require('react-native').ScrollView, createAnimatedComponent: (c: unknown) => c }, View, Easing,
    useSharedValue: (v: unknown) => ({ value: v }), useAnimatedStyle: (f: () => unknown) => f(), runOnJS: (f: unknown) => f,
    withTiming: (v: unknown) => v, withSpring: (v: unknown) => v, withDelay: (_: number, v: unknown) => v, withSequence: (...a: unknown[]) => a[a.length - 1], withRepeat: (v: unknown) => v,
    interpolate: () => 0, Extrapolation: { CLAMP: 'clamp' }, useReducedMotion: () => true, useAnimatedScrollHandler: () => () => undefined, cancelAnimation: () => undefined,
    useDerivedValue: (f: () => unknown) => ({ value: f() }), useAnimatedProps: (f: () => unknown) => f(), createAnimatedComponent: (c: unknown) => c,
  };
  return new Proxy(base, { get: (o, k: string) => (k in o ? o[k] : () => ({})) });
});
jest.mock('react-native-gesture-handler', () => {
  const React2 = require('react');
  const chaine: unknown = new Proxy({}, { get: () => () => chaine });
  return {
    Gesture: { Pinch: () => chaine, Pan: () => chaine, Tap: () => chaine, Exclusive: () => chaine, Simultaneous: () => chaine },
    GestureDetector: ({ children }: { children: React.ReactNode }) => React2.createElement(React2.Fragment, null, children),
  };
});

import { basDesBadges, GRILLE, hauteurBloc, hauteurPhoto, MARGE_SURE_BAS } from '@/lib/v2/cartes/moteur/grille';
import type { FormatMoteur } from '@/lib/v2/cartes/moteur/grille';
import { AIR_PASTILLE, bornerEtAimanter, cleBloc, nomPosition, POSITIONS_BLOC, positionsValides, sansPosition, SEUIL_AIMANT, toucheLeBloc, versPixels, versRelatif } from '@/lib/v2/cartes/moteur/deplacement';
import type { PositionBloc } from '@/lib/v2/cartes/moteur/deplacement';
import { mettreEnPage, rectsDuPlan } from '@/lib/v2/cartes/moteur/miseEnPage';
import type { Plan } from '@/lib/v2/cartes/moteur/miseEnPage';
import { blocRespecteZone } from '@/lib/v2/cartes/moteur/protection';
import { contenuDe } from '@/lib/v2/cartes/moteur/familles';
import { ecrireStyle, lireStyle, migrerStyle, STYLE_DEFAUT } from '@/lib/v2/cartes/store';
import { DEMO_PESEE, DEMO_SEANCE_COURSE, DEMO_SEANCE_MUSCU } from '@/lib/v2/cartes/demo';
import type { OptionsCarte } from '@/lib/v2/cartes/types';
import { CARTE_W, CarteRendu, HAUTEURS, planNouveauMoteur } from '@/components/yoroi/v2/cartes/CarteRendu';
import { StudioMoteur } from '@/components/yoroi/v2/cartes/moteur/StudioMoteur';

const FORMATS: FormatMoteur[] = ['story', 'post'];
const PHOTO = { w: 1080, h: 1935, visages: [[467, 521, 191, 232]] as [number, number, number, number][], corps: [168, 470, 946, 1935] as [number, number, number, number], frontal: true };
const PH = 'file:///cache/cartes_tmp/photo_1.jpg';

const planPhoto = (format: FormatMoteur, positionBloc?: PositionBloc | null): Plan =>
  mettreEnPage({ contenu: contenuDe(DEMO_SEANCE_MUSCU, 'muscu')!, compo: 'A', format, photo: PHOTO, positionBloc });
const planAuto = (format: FormatMoteur, positionBloc?: PositionBloc | null): Plan =>
  mettreEnPage({ contenu: contenuDe(DEMO_SEANCE_MUSCU, 'muscu')!, compo: 'autocollant', format, positionBloc });

/** Le bloc reste dans la zone sure : dans les marges, sous la pastille, au-dessus de la bande avec son air */
function dansLaZoneSure(f: FormatMoteur, r: { x: number; y: number; w: number; h: number }) {
  const G = GRILLE[f];
  expect(r.x).toBeGreaterThanOrEqual(G.M - 0.01);
  expect(r.x + r.w).toBeLessThanOrEqual(G.W - G.M + 0.01);
  expect(r.y).toBeGreaterThanOrEqual(G.HAUT + G.PASTILLE + AIR_PASTILLE - 0.01);
  expect(r.y + r.h).toBeLessThanOrEqual(hauteurPhoto(f) - G.AIR_BANDE + 0.01);
}

describe('les bornes du deplacement', () => {
  for (const f of FORMATS) {
    test(`${f} : ta photo et l autocollant ne sortent jamais de la zone sure, ou que tu glisses`, () => {
      for (const p of [planPhoto(f), planAuto(f)]) {
        const d = p.deplacement!;
        expect(d).toBeTruthy();
        // tres loin en haut a gauche, tres loin en bas a droite, et partout entre les deux
        for (const [x, y] of [[-5000, -5000], [5000, 5000], [-5000, 5000], [5000, -5000], [0, 0], [300, 900], [d.x + 7, d.y - 13]]) {
          const a = bornerEtAimanter(x, y, d.bornes, d.w, d.h, GRILLE[f].W);
          dansLaZoneSure(f, { x: a.x, y: a.y, w: d.w, h: d.h });
          // jamais sur la pastille du sport ni sur la bande du bas
          expect(a.y).toBeGreaterThan(GRILLE[f].HAUT + GRILLE[f].PASTILLE);
          expect(a.y + d.h).toBeLessThan(p.bande.y);
        }
      }
    });
    test(`${f} : une position memorisee hors de 0 a 1 reste bornee`, () => {
      const p = planPhoto(f, { x: 7, y: -3 });
      dansLaZoneSure(f, p.bloc!);
      const q = planPhoto(f, { x: -1, y: 9 });
      dansLaZoneSure(f, q.bloc!);
    });
  }
  test('Ta photo : le bloc prend toute la largeur, il ne bouge que de haut en bas', () => {
    const d = planPhoto('story').deplacement!;
    expect(d.bornes.xMin).toBe(d.bornes.xMax);
    expect(bornerEtAimanter(d.x + 200, d.y, d.bornes, d.w, d.h, 1080).x).toBe(d.x);
    expect(versRelatif(d.x, d.y, d.bornes).x).toBe(0.5);
  });
  test('le doigt pose sur le bloc le deplace, ailleurs il recadre la photo', () => {
    const d = planPhoto('story').deplacement!;
    expect(toucheLeBloc(d.x + d.w / 2, d.y + d.h / 2, d)).toBe(true);
    expect(toucheLeBloc(d.x + 10, d.y - 10, d)).toBe(true);
    // sur le visage, tout en haut : la photo
    expect(toucheLeBloc(540, 300, d)).toBe(false);
  });
});

describe('l aimantage sur les guides', () => {
  const f: FormatMoteur = 'story';
  test('l autocollant s accroche au centre, a la marge gauche et a la marge droite', () => {
    const d = planAuto(f).deplacement!;
    const W = GRILLE[f].W;
    const centre = W / 2 - d.w / 2;
    const c = bornerEtAimanter(centre + SEUIL_AIMANT - 3, d.bornes.yMin + 200, d.bornes, d.w, d.h, W);
    expect(c.x).toBeCloseTo(centre, 5);
    expect(c.guideX).toBe(W / 2);
    const g = bornerEtAimanter(d.bornes.xMin + 10, d.bornes.yMin + 200, d.bornes, d.w, d.h, W);
    expect(g.x).toBe(d.bornes.xMin);
    expect(g.guideX).toBe(GRILLE[f].M);
    const r = bornerEtAimanter(d.bornes.xMax - 12, d.bornes.yMin + 200, d.bornes, d.w, d.h, W);
    expect(r.x).toBe(d.bornes.xMax);
    expect(r.guideX).toBe(W - GRILLE[f].M);
  });
  test('en haut, au milieu et en bas de la zone ; loin des guides, rien ne bouge et aucune ligne', () => {
    const d = planPhoto(f).deplacement!;
    const b = d.bornes;
    const milieu = (b.yMin + b.yMax) / 2;
    expect(bornerEtAimanter(d.x, b.yMin + 20, b, d.w, d.h, 1080)).toEqual(expect.objectContaining({ y: b.yMin, guideY: b.yMin }));
    expect(bornerEtAimanter(d.x, milieu - 15, b, d.w, d.h, 1080)).toEqual(expect.objectContaining({ y: milieu, guideY: milieu + d.h / 2 }));
    expect(bornerEtAimanter(d.x, b.yMax - 27, b, d.w, d.h, 1080)).toEqual(expect.objectContaining({ y: b.yMax, guideY: b.yMax + d.h }));
    const libre = b.yMin + (milieu - b.yMin) / 2;
    const l = bornerEtAimanter(d.x, libre, b, d.w, d.h, 1080);
    expect(l.y).toBe(libre);
    expect(l.guideY).toBe(-1);
    expect(l.guideX).toBe(-1);
  });
});

describe('la position relative, identique en story et en 4:5', () => {
  for (const pos of [{ x: 0.5, y: 0 }, { x: 0.5, y: 0.37 }, { x: 0.5, y: 0.5 }, { x: 0.5, y: 1 }]) {
    test(`y = ${pos.y}`, () => {
      const parts = FORMATS.map((f) => {
        const p = planPhoto(f, pos);
        const d = p.deplacement!;
        expect(d.choisi).toBe(true);
        expect(p.bloc!.y).toBeCloseTo(versPixels(pos, d.bornes).y, 6);
        return versRelatif(p.bloc!.x, p.bloc!.y, d.bornes);
      });
      expect(parts[0].y).toBeCloseTo(pos.y, 6);
      expect(parts[1].y).toBeCloseTo(pos.y, 6);
      // et l'autocollant
      const auto = FORMATS.map((f) => {
        const p = planAuto(f, { x: 0.2, y: pos.y });
        return versRelatif(p.autocollant!.x, p.autocollant!.y, p.deplacement!.bornes);
      });
      expect(auto[0].x).toBeCloseTo(0.2, 6);
      expect(auto[1].x).toBeCloseTo(0.2, 6);
      expect(auto[0].y).toBeCloseTo(auto[1].y, 6);
    });
  }
  test('la place est gardee par carte et par format : la story ne bouge pas la 4:5', () => {
    const o = { ...STYLE_DEFAUT, compo: 'A', fond: 'photo', chiffres: [], positionsBloc: { [cleBloc('muscu', 'A', 'story')]: POSITIONS_BLOC.haut } } as OptionsCarte;
    const story = planNouveauMoteur(DEMO_SEANCE_MUSCU, { ...o, format: 'story' }, { photo: PH }, 'kg', { w: 1080, h: 1935 })!.plan;
    const post = planNouveauMoteur(DEMO_SEANCE_MUSCU, { ...o, format: 'post' }, { photo: PH }, 'kg', { w: 1080, h: 1935 })!.plan;
    expect(story.deplacement!.choisi).toBe(true);
    expect(story.bloc!.y).toBe(story.deplacement!.bornes.yMin);
    expect(post.deplacement!.choisi).toBe(false);
    // une autre carte (la course) garde sa place automatique
    const course = planNouveauMoteur(DEMO_SEANCE_COURSE, { ...o, format: 'story' }, { photo: PH }, 'kg', { w: 1080, h: 1935 })!.plan;
    expect(course.deplacement?.choisi).toBe(false);
  });
  test('le degrade suit le bloc : fonce en haut quand tu montes tes chiffres', () => {
    const haut = planPhoto('story', POSITIONS_BLOC.haut);
    expect(haut.photo!.placement.mode).toBe('haut');
    expect(haut.photo!.placement.etapes).toContain('deplace_au_doigt');
    expect(haut.photo!.arrets[0].a).toBeGreaterThan(0.5);
    expect(planPhoto('story', POSITIONS_BLOC.bas).photo!.placement.mode).toBe('bas');
  });
});

describe('l export a la place choisie', () => {
  /** Le libelle du bloc (premier texte du calque du bloc), en pixels de la carte (le viewBox fait 1080 de large) */
  const libelleY = (r: ReturnType<typeof render>) => {
    const calque = r.getByTestId('carte-bloc');
    expect(calque.props.viewBox).toMatch(/^0 0 1080 (1920|1350)$/);
    expect(calque.props.width).toBe(CARTE_W);
    const t = calque.findAll((n: { type: unknown }) => n.type === SvgText)[0];
    return Number(t.props.y);
  };
  for (const f of FORMATS) {
    test(`${f} : le bloc dessine dans la vue capturee est la ou le plan le pose`, async () => {
      const ys: number[] = [];
      const plans: Plan[] = [];
      for (const pos of [POSITIONS_BLOC.haut, POSITIONS_BLOC.milieu, POSITIONS_BLOC.bas]) {
        const o = { ...STYLE_DEFAUT, format: f, compo: 'A', fond: 'photo', chiffres: [], positionsBloc: { [cleBloc('muscu', 'A', f)]: pos } } as OptionsCarte;
        const r = render(<CarteRendu data={DEMO_SEANCE_MUSCU} options={o} visuels={{ photo: PH }} moteur="nouveau" />);
        await act(async () => undefined);
        ys.push(libelleY(r));
        plans.push(planNouveauMoteur(DEMO_SEANCE_MUSCU, o, { photo: PH }, 'kg', { w: 1080, h: 1935 })!.plan);
        r.unmount();
      }
      const b = plans[0].deplacement!.bornes;
      // l'ecart entre le libelle du haut et celui du bas est exactement la hauteur de la zone sure, en pixels d'export
      expect(ys[2] - ys[0]).toBeCloseTo(b.yMax - b.yMin, 3);
      expect(ys[1] - ys[0]).toBeCloseTo((b.yMax - b.yMin) / 2, 3);
      for (let i = 0; i < 3; i++) expect(ys[i] - plans[i].bloc!.y).toBeCloseTo(ys[0] - plans[0].bloc!.y, 3);
      // la vue capturee fait CARTE_W points de large : a 1080 px, un point de la carte vaut exactement 3 px d'export
      expect((CARTE_W * 3) / GRILLE[f].W).toBe(1);
      expect(HAUTEURS[f] * 3).toBe(GRILLE[f].H);
    });
  }
});

describe('Replacer, Recadrer automatiquement, Haut Milieu Bas', () => {
  function fauxK(o: Partial<OptionsCarte>) {
    const options = { modele: 'net', format: 'story', fond: 'photo', sombre: true, personnage: false, masque: 'aucun', slogan: 0, chiffres: [], compo: 'A', ...o } as OptionsCarte;
    return {
      ref: { current: null }, refAutocollant: { current: null }, options, visuels: { photo: PH as string | null }, photo: PH as string | null, photoEnCours: false,
      busy: null, saved: false, copie: false, recadrage: null,
      setStyle: jest.fn(), choisirPhoto: jest.fn(async () => true), enleverPhoto: jest.fn(), setRecadrage: jest.fn(), recadrerAuto: jest.fn(),
      partager: jest.fn(), partagerEnStory: jest.fn(), enregistrer: jest.fn(), copierAutocollantSeul: jest.fn(), enregistrerAutocollantSeul: jest.fn(),
    };
  }
  const cle = cleBloc('muscu', 'A', 'story');
  const studio = async (k: ReturnType<typeof fauxK>) => {
    const r = render(<StudioMoteur data={DEMO_SEANCE_MUSCU} k={k as never} onRetour={() => undefined} />);
    await act(async () => undefined);
    return r;
  };

  test('Deplacer les chiffres propose Haut, Milieu et Bas', async () => {
    const k = fauxK({});
    const r = await studio(k);
    expect(r.queryByTestId('bloc-replacer')).toBeNull();
    expect(r.queryByTestId('bloc-haut')).toBeNull();
    fireEvent.press(r.getByTestId('bloc-deplacer'));
    for (const n of ['haut', 'milieu', 'bas'] as const) {
      fireEvent.press(r.getByTestId(`bloc-${n}`));
      expect(k.setStyle).toHaveBeenLastCalledWith({ positionsBloc: { [cle]: POSITIONS_BLOC[n] } });
    }
    // le calque du bloc est pose dans l'apercu, pour le geste
    expect(r.getByTestId('studio-bloc')).toBeTruthy();
    r.unmount();
  });
  test('Replacer les chiffres enleve ta place, et seulement celle de cette carte et de ce format', async () => {
    const autre = cleBloc('muscu', 'A', 'post');
    const k = fauxK({ positionsBloc: { [cle]: POSITIONS_BLOC.haut, [autre]: POSITIONS_BLOC.bas } });
    const r = await studio(k);
    fireEvent.press(r.getByTestId('bloc-replacer'));
    expect(k.setStyle).toHaveBeenLastCalledWith({ positionsBloc: { [autre]: POSITIONS_BLOC.bas } });
    r.unmount();
  });
  test('Recadrer automatiquement remet aussi le bloc a sa place par defaut', async () => {
    const k = fauxK({ positionsBloc: { [cle]: POSITIONS_BLOC.milieu } });
    const r = await studio(k);
    fireEvent.press(r.getByTestId('photo-auto'));
    expect(k.recadrerAuto).toHaveBeenCalledTimes(1);
    expect(k.setStyle).toHaveBeenLastCalledWith({ positionsBloc: {} });
    r.unmount();
  });
  test('la place par defaut redevient la zone protegee automatique', () => {
    expect(sansPosition({ [cle]: POSITIONS_BLOC.haut }, cle)).toEqual({});
    const p = planPhoto('story', null);
    expect(p.deplacement!.choisi).toBe(false);
    expect(blocRespecteZone(p.photo!.placement, 'story')).toBe(true);
    expect(nomPosition(POSITIONS_BLOC.milieu)).toBe('milieu');
    expect(nomPosition({ x: 0.5, y: 0.3 })).toBeNull();
  });
  test('sans photo (Dessin) : rien a deplacer', async () => {
    const k = { ...fauxK({ compo: 'B', fond: 'couleur' }), photo: null, visuels: { photo: null } };
    const r = await studio(k);
    expect(r.queryByTestId('bloc-deplacer')).toBeNull();
    expect(r.queryByTestId('studio-bloc')).toBeNull();
    r.unmount();
  });
});

describe('la memoire : ta place avec le reste du style, jamais ta photo', () => {
  test('migrerStyle garde les places valides et jette le reste', () => {
    const s = migrerStyle({ ...STYLE_DEFAUT, positionsBloc: { a: { x: 0.5, y: 0.25 }, b: { x: 'n', y: 2 } as never, c: { x: 3, y: -1 } } });
    expect(s.positionsBloc).toEqual({ a: { x: 0.5, y: 0.25 }, c: { x: 1, y: 0 } });
    expect(migrerStyle({ ...STYLE_DEFAUT, positionsBloc: 'x' as never }).positionsBloc).toBeUndefined();
    expect(positionsValides(null)).toBeUndefined();
  });
  test('ecrireStyle puis lireStyle : la place revient, la photo non', async () => {
    await ecrireStyle({ ...STYLE_DEFAUT, fond: 'photo', positionsBloc: { [cleBloc('muscu', 'A', 'story')]: { x: 0.5, y: 0.8 } } });
    const s = await lireStyle();
    expect(s.positionsBloc).toEqual({ 'muscu:A:story': { x: 0.5, y: 0.8 } });
    expect(s.fond).toBe('couleur');
  });
});

describe('la bande du bas : collee en bas, plus fine', () => {
  test('story : 48 px sous les badges (au lieu de 120), la photo prend le reste', () => {
    expect(MARGE_SURE_BAS.story).toBe(48);
    expect(basDesBadges('story')).toBe(1920 - 48);
    expect(GRILLE.story.BANDE).toBe(136);
    expect(GRILLE.story.BADGE).toBe(60);
    expect(hauteurPhoto('story')).toBe(1920 - 136);
  });
  test('4:5 : le meme principe, 24 px sous les badges', () => {
    expect(basDesBadges('post')).toBe(1350 - 24);
    expect(GRILLE.post.BANDE).toBe(104);
    expect(GRILLE.post.BADGE).toBeLessThan(72);
    expect(hauteurPhoto('post')).toBe(1350 - 104);
  });
  test('les badges tiennent dans la bande, et aucun texte ni chiffre ne passe dessous', () => {
    for (const f of FORMATS) {
      const G = GRILLE[f];
      expect(G.BANDE_RANG).toBeGreaterThan(0);
      expect(G.BANDE_RANG + G.BADGE).toBeLessThanOrEqual(G.BANDE);
      for (const p of [planPhoto(f), planPhoto(f, POSITIONS_BLOC.bas), planAuto(f, POSITIONS_BLOC.bas)]) {
        expect(p.bande.y).toBe(hauteurPhoto(f));
        expect(p.bande.y + p.bande.h).toBe(G.H);
        for (const r of rectsDuPlan(p)) expect(r.y + r.h).toBeLessThanOrEqual(p.bande.y - G.AIR_BANDE + 0.5);
      }
      // ton visage reste protege a la place automatique
      const p = planPhoto(f);
      expect(blocRespecteZone(p.photo!.placement, f)).toBe(true);
      expect(p.bloc!.y + hauteurBloc(f, p.bloc!.compact)).toBeLessThanOrEqual(hauteurPhoto(f) - G.AIR_BANDE + 0.5);
    }
  });
  test('la pesee (famille ajoutee) avec ta photo se deplace aussi', () => {
    const p = mettreEnPage({ contenu: contenuDe(DEMO_PESEE, 'pesee')!, compo: 'A', format: 'story', photo: PHOTO, positionBloc: POSITIONS_BLOC.haut });
    expect(p.type).toBe('photo');
    expect(p.bloc!.y).toBe(p.deplacement!.bornes.yMin);
  });
});
