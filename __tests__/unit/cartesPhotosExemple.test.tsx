/**
 * Photos d'exemple des cartes (3 novembre 2026), Houari : « que les gens se projettent ».
 * 1. le choix de l'exemple par famille et par sport (musculation homme et femme en alternance) ;
 * 2. JAMAIS d'exemple dans un export : la capture part toujours sans la photo d'exemple ;
 * 3. la pastille « Exemple » sur la vignette, le bandeau « Exemple, ajoute ta photo » dans le studio ;
 * 4. le chiffre d'exemple seulement sur l'avant apres d'exemple, quand tu n'as pas tes deux photos ;
 * 5. la protection du visage s'applique aux exemples : le bloc des chiffres ne touche aucun visage.
 */
/* eslint-disable @typescript-eslint/no-require-imports, import/first */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

jest.mock('@/components/yoroi/v2/espace/reglages/prefs', () => ({ useUnitePoids: () => 'kg' }));
jest.mock('react-native-safe-area-context', () => ({ useSafeAreaInsets: () => ({ top: 59, bottom: 34, left: 0, right: 0 }), SafeAreaProvider: ({ children }: { children: unknown }) => children }));
jest.mock('@/lib/v2/cartes/moteur/analysePhoto', () => ({ ...jest.requireActual('@/lib/v2/cartes/moteur/analysePhoto'), taillePhoto: async () => ({ w: 1080, h: 1935 }) }));
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

import { analyseExemple, avantApresOuExemple, carteAvantApresExemple, estExempleId, EXEMPLES, exemplePourCarte, rangDe, rangStudio, TAILLES_EXEMPLE, VISAGES_EXEMPLE, visuelsAvecExemple, visuelsSansExemple } from '@/lib/v2/cartes/exemples';
import type { ExempleId } from '@/lib/v2/cartes/exemples';
import { lignesPoids } from '@/lib/v2/cartes/avantApres';
import { compositionEffective, contenuDe, famillesPour } from '@/lib/v2/cartes/moteur/familles';
import { mettreEnPage } from '@/lib/v2/cartes/moteur/miseEnPage';
import { photoMesuree } from '@/lib/v2/cartes/moteur/analysePhoto';
import { DEMO_COMPTEURS, DEMO_EXPLOITS, DEMO_MOIS, DEMO_PESEE, DEMO_SEANCE_COMBAT, DEMO_SEANCE_COURSE, DEMO_SEANCE_MUSCU, DEMO_SEMAINE, demoAvantApres } from '@/lib/v2/cartes/demo';
import type { CarteData, FamilleMoteur, OptionsCarte } from '@/lib/v2/cartes/types';
import { Bibliotheque, exemplesDeRubrique, resumeCarte, type RubriqueBiblio } from '@/components/yoroi/v2/cartes/Bibliotheque';
import { StudioMoteur } from '@/components/yoroi/v2/cartes/moteur/StudioMoteur';
import { avantApresExemple, uriExemple } from '@/components/yoroi/v2/cartes/exemples';

const racine = path.join(__dirname, '..', '..');

const MARCHE: CarteData = { ...DEMO_SEANCE_COURSE, titre: 'Marche', sport: 'marche', cle: 't:marche' };
const MUSCU_2: CarteData = { ...DEMO_SEANCE_MUSCU, cle: 'seance:202', sousTitre: 'Jeudi 15 octobre' };
const MUSCU_3: CarteData = { ...DEMO_SEANCE_MUSCU, cle: 'seance:203', sousTitre: 'Samedi 17 octobre' };
const RECORD = DEMO_EXPLOITS.find((d) => d.exploit?.type === 'record_charge')!;
const sansPhoto = () => ({ photo: null });

describe('le choix de l’exemple, par famille et par sport', () => {
  test('musculation, course, JJB, marche, record', () => {
    expect(exemplePourCarte(DEMO_SEANCE_MUSCU, 0)).toBe('muscu_homme');
    expect(exemplePourCarte(DEMO_SEANCE_MUSCU, 1)).toBe('muscu_femme');
    expect(exemplePourCarte(DEMO_SEANCE_COURSE)).toBe('course');
    expect(exemplePourCarte(DEMO_SEANCE_COMBAT)).toBe('jjb');
    expect(famillesPour(MARCHE)).toEqual(['marche']);
    expect(exemplePourCarte(MARCHE)).toBe('marche');
    expect(famillesPour(RECORD)).toEqual(['record']);
    expect(exemplePourCarte(RECORD)).toBe('record');
  });
  test('un record de course ou de combat garde le visuel de son sport', () => {
    const dist = DEMO_EXPLOITS.find((d) => d.exploit?.type === 'record_distance')!;
    const rounds = DEMO_EXPLOITS.find((d) => d.exploit?.type === 'record_rounds')!;
    expect(exemplePourCarte({ ...dist, famille: 'course' })).toBe('course');
    expect(exemplePourCarte({ ...rounds, famille: 'combat' })).toBe('jjb');
    expect(exemplePourCarte({ ...RECORD, famille: 'muscu' })).toBe('record');
  });
  test('un exploit prend le visuel de son sport ; sans sport, pas d’exemple', () => {
    const jjb = DEMO_EXPLOITS.find((d) => d.exploit?.type === 'techniques')!;
    expect(exemplePourCarte({ ...jjb, famille: 'combat' })).toBe('jjb');
    expect(exemplePourCarte({ ...jjb, famille: undefined })).toBeNull();
  });
  test('musculation : homme et femme en alternance dans la rubrique', () => {
    const r = exemplesDeRubrique([DEMO_SEANCE_MUSCU, DEMO_SEANCE_COMBAT, MUSCU_2, MUSCU_3], sansPhoto);
    expect(r.map((x) => x.ex)).toEqual(['muscu_homme', 'jjb', 'muscu_femme', 'muscu_homme']);
  });
  test('pas d’exemple pour la pesee, le mois, la semaine, ni quand ta photo est la', () => {
    for (const d of [DEMO_PESEE, DEMO_MOIS, DEMO_SEMAINE]) expect(exemplePourCarte(d)).toBeNull();
    expect(exemplePourCarte(DEMO_SEANCE_MUSCU, 0, true)).toBeNull();
    expect(exemplesDeRubrique([DEMO_SEANCE_MUSCU], () => ({ photo: 'file:///ma_photo.jpg' }))[0].ex).toBeNull();
  });
  test('une famille sans composition Ta photo n’a pas d’exemple (tes muscles travailles)', () => {
    const d: CarteData = { ...DEMO_SEANCE_MUSCU, seance: { ...DEMO_SEANCE_MUSCU.seance!, muscles: { zones: ['pectoraux'], groupes: [{ nom: 'Pectoraux', series: 8 }] } } as CarteData['seance'] };
    expect(famillesPour(d)).toContain('muscles');
    expect(exemplePourCarte(d, 0, false, 'muscles')).toBeNull();
    expect(exemplePourCarte(d, 0, false, 'muscu')).toBe('muscu_homme');
  });
  test('le studio montre la photo de la vignette touchee, sinon un rang stable', () => {
    expect(rangDe('seance:12')).toBe(rangDe('seance:12'));
    expect(exemplePourCarte(DEMO_SEANCE_MUSCU, rangStudio('x', 'muscu_femme'))).toBe('muscu_femme');
    expect(exemplePourCarte(DEMO_SEANCE_MUSCU, rangStudio('x', 'muscu_homme'))).toBe('muscu_homme');
    expect(rangStudio('seance:12', null)).toBe(rangDe('seance:12'));
    expect(estExempleId('course')).toBe(true);
    expect(estExempleId('autre')).toBe(false);
  });
  test('chaque image existe, en webp, a moins de 300 Ko, avec sa licence', () => {
    const dossier = path.join(racine, 'assets/images/cartes_exemple');
    for (const id of EXEMPLES) {
      const f = path.join(dossier, `exemple_${id}.webp`);
      expect(fs.existsSync(f)).toBe(true);
      expect(fs.statSync(f).size).toBeLessThan(300 * 1024);
    }
    expect(fs.readFileSync(path.join(dossier, 'LICENCE.txt'), 'utf8')).toContain('Personnes fictives');
  });
});

describe('jamais d’exemple dans un export', () => {
  test('visuelsSansExemple retire la photo d’exemple, garde la tienne', () => {
    const v = visuelsAvecExemple({ photo: null }, 'course', 'exemple:course');
    expect(v.exemple).toBe(true);
    expect(v.photo).toBe('exemple:course');
    const e = visuelsSansExemple(v);
    expect(e.photo).toBeNull();
    expect(e.exemple).toBe(false);
    const tienne = { photo: 'file:///ma_photo.jpg' };
    expect(visuelsSansExemple(tienne)).toBe(tienne);
  });
  test('sans ta photo, Ta photo exportee devient le dessin', () => {
    expect(compositionEffective(DEMO_SEANCE_MUSCU, 'muscu', 'A', false)).toBe('B');
  });

  /** Un faux useCarte : chaque export note si l'exemple etait dessine au moment de la capture */
  function fauxK(o: Partial<OptionsCarte> & { photo?: string | null }, vu: { exemple: boolean[] }, r: () => ReturnType<typeof render> | null) {
    const options = { modele: 'net', format: 'story', fond: o.photo ? 'photo' : 'couleur', sombre: true, personnage: false, masque: 'aucun', slogan: 0, chiffres: [], ...o } as OptionsCarte;
    const noter = jest.fn(async () => {
      vu.exemple.push(!!r()?.queryByTestId('carte-avec-exemple'));
      return true;
    });
    return {
      ref: { current: null }, refAutocollant: { current: null }, options, visuels: { photo: o.photo ?? null }, photo: o.photo ?? null, photoEnCours: false,
      busy: null, saved: false, copie: false, recadrage: null,
      setStyle: jest.fn(), choisirPhoto: jest.fn(async () => true), enleverPhoto: jest.fn(), setRecadrage: jest.fn(), recadrerAuto: jest.fn(),
      partager: noter, partagerEnStory: noter, enregistrer: noter, copierAutocollantSeul: noter, enregistrerAutocollantSeul: noter,
    };
  }

  test('Partager en story, Enregistrer, Partager : la capture ne voit jamais l’exemple, qui revient ensuite', async () => {
    const vu = { exemple: [] as boolean[] };
    let r: ReturnType<typeof render> | null = null;
    const k = fauxK({ compo: 'A' }, vu, () => r);
    r = render(<StudioMoteur data={DEMO_SEANCE_MUSCU} k={k as never} onRetour={() => undefined} />);
    // avant : l'apercu montre l'exemple et son bandeau
    expect(r.getByTestId('carte-avec-exemple')).toBeTruthy();
    expect(r.getByTestId('bandeau-exemple')).toBeTruthy();
    for (const lib of ['Partager en story', 'Enregistrer dans la pellicule', 'Partager la carte']) {
      await act(async () => {
        fireEvent.press(r!.getByLabelText(lib));
      });
      await waitFor(() => expect(r!.queryByTestId('carte-avec-exemple')).toBeTruthy());
    }
    expect(k.partagerEnStory).toHaveBeenCalled();
    expect(vu.exemple).toEqual([false, false, false]);
    r.unmount();
  });

  test('avec ta photo : ni exemple ni bandeau', () => {
    const vu = { exemple: [] as boolean[] };
    const k = fauxK({ compo: 'A', photo: 'file:///cache/cartes_tmp/photo_1.jpg' }, vu, () => null);
    const r = render(<StudioMoteur data={DEMO_SEANCE_MUSCU} k={k as never} onRetour={() => undefined} />);
    expect(r.queryByTestId('carte-avec-exemple')).toBeNull();
    expect(r.queryByTestId('bandeau-exemple')).toBeNull();
    r.unmount();
  });

  test('les ecrans qui capturent passent par visuelsSansExemple ou n’ont pas d’exemple', () => {
    const studio = fs.readFileSync(path.join(racine, 'components/yoroi/v2/cartes/moteur/StudioMoteur.tsx'), 'utf8');
    // chaque export du studio passe par sansExemple
    for (const f of ['partagerEnStory', 'enregistrer', 'partager', 'copierAutocollantSeul', 'enregistrerAutocollantSeul']) {
      expect(studio).toMatch(new RegExp(`sansExemple\\(\\(\\) => k\\.${f}\\(\\)\\)`));
      expect(studio).not.toMatch(new RegExp(`void k\\.${f}\\(\\)`));
    }
    // seuls la bibliotheque et le studio connaissent les exemples ; useCarte (les exports) jamais
    const useCarte = fs.readFileSync(path.join(racine, 'components/yoroi/v2/cartes/useCarte.ts'), 'utf8');
    expect(useCarte).not.toMatch(/exemple/i);
  });
});

describe('la pastille « Exemple » et le bandeau du studio', () => {
  const base = { modele: 'net', format: 'story', fond: 'couleur', sombre: true, personnage: false, masque: 'aucun', slogan: 0, chiffres: [] } as OptionsCarte;
  const rub = (cartes: CarteData[]): RubriqueBiblio[] => [{ id: 'x', titre: 'X', sous: 'x', sticker: 'chrono', cartes, vide: 'vide' }];

  test('une pastille par vignette d’exemple, aucune sur les autres', () => {
    const r = render(<Bibliotheque rubriques={rub([DEMO_SEANCE_MUSCU, DEMO_PESEE, DEMO_SEANCE_COURSE])} base={base} visuelsPour={sansPhoto} onOuvrir={() => undefined} />);
    expect(r.getAllByTestId('pastille-exemple')).toHaveLength(2);
    expect(r.getAllByText('Exemple')).toHaveLength(2);
    expect(r.getAllByTestId('carte-avec-exemple')).toHaveLength(2);
    r.unmount();
  });
  test('avec ta photo : plus de pastille', () => {
    const r = render(<Bibliotheque rubriques={rub([DEMO_SEANCE_MUSCU])} base={base} visuelsPour={() => ({ photo: 'file:///ma_photo.jpg' })} onOuvrir={() => undefined} />);
    expect(r.queryByTestId('pastille-exemple')).toBeNull();
    r.unmount();
  });
  test('le studio : « Exemple, ajoute ta photo » et son bouton ouvre la galerie', async () => {
    const options = { ...base, compo: 'A' } as OptionsCarte;
    const k = { ref: { current: null }, refAutocollant: { current: null }, options, visuels: { photo: null }, photo: null, photoEnCours: false, busy: null, saved: false, copie: false, recadrage: null, setStyle: jest.fn(), choisirPhoto: jest.fn(async () => true), enleverPhoto: jest.fn(), setRecadrage: jest.fn(), recadrerAuto: jest.fn(), partager: jest.fn(), partagerEnStory: jest.fn(), enregistrer: jest.fn(), copierAutocollantSeul: jest.fn(), enregistrerAutocollantSeul: jest.fn() };
    const r = render(<StudioMoteur data={DEMO_SEANCE_COURSE} k={k as never} onRetour={() => undefined} />);
    expect(r.getByText('Exemple, ajoute ta photo')).toBeTruthy();
    // la pastille « Exemple » posee sur l'apercu
    expect(r.getByTestId('pastille-exemple-studio')).toBeTruthy();
    await act(async () => {
      fireEvent.press(r.getByTestId('exemple-ajouter'));
    });
    expect(k.choisirPhoto).toHaveBeenCalledWith('gallery');
    r.unmount();
  });
  test('en Dessin : pas d’exemple', () => {
    const options = { ...base, compo: 'B' } as OptionsCarte;
    const k = { ref: { current: null }, refAutocollant: { current: null }, options, visuels: { photo: null }, photo: null, photoEnCours: false, busy: null, saved: false, copie: false, recadrage: null, setStyle: jest.fn(), choisirPhoto: jest.fn(async () => true), enleverPhoto: jest.fn(), setRecadrage: jest.fn(), recadrerAuto: jest.fn(), partager: jest.fn(), partagerEnStory: jest.fn(), enregistrer: jest.fn(), copierAutocollantSeul: jest.fn(), enregistrerAutocollantSeul: jest.fn() };
    const r = render(<StudioMoteur data={DEMO_SEANCE_MUSCU} k={k as never} onRetour={() => undefined} />);
    expect(r.queryByTestId('bandeau-exemple')).toBeNull();
    expect(r.queryByTestId('pastille-exemple-studio')).toBeNull();
    expect(r.queryByTestId('carte-avec-exemple')).toBeNull();
    r.unmount();
  });
});

describe('le chiffre d’exemple : seulement sur l’avant apres sans tes photos', () => {
  test('l’avant apres d’exemple : −8,4 kg, marque Exemple', () => {
    const d = carteAvantApresExemple({ avant: 'a', apres: 'b' });
    expect(d.exemple).toBe(true);
    expect(d.sousTitre).toContain('Exemple');
    expect(lignesPoids(d).ecart).toBe('−8,4 kg');
    expect(avantApresExemple().avantApres?.avant.uri).toBe(uriExemple('avant'));
  });
  test('avec tes deux photos, ton avant apres, jamais l’exemple', () => {
    const tien = demoAvantApres(['file:///a.jpg', 'file:///b.jpg']);
    const ex = avantApresExemple();
    expect(avantApresOuExemple(tien, ex)).toBe(tien);
    expect(avantApresOuExemple(null, ex)).toBe(ex);
    expect(tien.exemple).toBeUndefined();
  });
  test('les autres vignettes d’exemple gardent TES chiffres (la carte n’est pas changee)', () => {
    const cartes = [DEMO_SEANCE_MUSCU, DEMO_SEANCE_COURSE, RECORD, ...DEMO_COMPTEURS];
    const r = exemplesDeRubrique(cartes, sansPhoto);
    r.forEach((x, i) => {
      expect(x.d).toBe(cartes[i]);
      expect(x.d.exemple).toBeUndefined();
    });
    const base = { modele: 'net', format: 'story', fond: 'couleur', sombre: true, personnage: false, masque: 'aucun', slogan: 0, chiffres: [] } as OptionsCarte;
    const v = render(<Bibliotheque rubriques={[{ id: 'x', titre: 'X', sous: 'x', sticker: 'chrono', cartes: [RECORD], vide: 'vide' }]} base={base} visuelsPour={sansPhoto} onOuvrir={() => undefined} />);
    expect(v.getByText(resumeCarte(RECORD))).toBeTruthy();
    v.unmount();
  });
});

describe('la protection du visage s’applique aux exemples', () => {
  const cas: { id: ExempleId; d: CarteData; f: FamilleMoteur }[] = [
    { id: 'muscu_homme', d: DEMO_SEANCE_MUSCU, f: 'muscu' },
    { id: 'muscu_femme', d: DEMO_SEANCE_MUSCU, f: 'muscu' },
    { id: 'course', d: DEMO_SEANCE_COURSE, f: 'course' },
    { id: 'jjb', d: DEMO_SEANCE_COMBAT, f: 'jjb' },
    { id: 'marche', d: MARCHE, f: 'marche' },
    { id: 'record', d: RECORD, f: 'record' },
  ];
  test('chaque exemple a son visage dans le tiers superieur', () => {
    for (const id of EXEMPLES) {
      const v = VISAGES_EXEMPLE[id];
      expect(v.y + v.h / 2).toBeLessThan(0.4);
      expect(analyseExemple(id).visages).toHaveLength(1);
    }
  });
  for (const c of cas) {
    for (const format of ['story', 'post'] as const) {
      test(`${c.id}, ${format} : le bloc des chiffres ne touche pas le visage`, () => {
        const t = TAILLES_EXEMPLE[c.id];
        const contenu = contenuDe(c.d, c.f, 'kg')!;
        const p = mettreEnPage({ contenu, compo: 'A', format, photo: photoMesuree(analyseExemple(c.id), t.w, t.h) });
        expect(p.type).toBe('photo');
        const pl = p.photo!.placement;
        const v = VISAGES_EXEMPLE[c.id];
        const visage = { x0: pl.ox + v.x * t.w * pl.s, y0: pl.oy + v.y * t.h * pl.s, x1: pl.ox + (v.x + v.l) * t.w * pl.s, y1: pl.oy + (v.y + v.h) * t.h * pl.s };
        const b = p.bloc!;
        const touche = b.x < visage.x1 && b.x + b.w > visage.x0 && b.y < visage.y1 && b.y + b.h > visage.y0;
        expect(touche).toBe(false);
        expect(pl.source).toBe('visage');
      });
    }
  }
});
