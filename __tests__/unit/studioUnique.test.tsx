/**
 * Studio unique (2 novembre 2026), Houari : « je veux UN SEUL studio, le nouveau, partout, pour tout le monde ».
 * 1. toutes les cartes de l'app sont dessinees par le nouveau moteur (familles ajoutees : pesee, mois, objectif,
 *    exploit, autre sport), sans donnee inventee et sans kcal ;
 * 2. la grille : la bande du bas plus basse et plus fine, sa marge de securite, rien ne se chevauche ;
 * 3. le studio : les sections dans l'ordre, et les boutons de ta photo (ajouter, changer, prendre, enlever) la dans
 *    chaque composition ;
 * 4. toutes les entrees ouvrent le nouveau studio, et l'ancien atelier n'est plus accessible nulle part.
 */
/* eslint-disable @typescript-eslint/no-require-imports */
import React from 'react';
import fs from 'fs';
import path from 'path';
import { act, fireEvent, render } from '@testing-library/react-native';

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

import { compositionEffective, compositionsPour, contenuDe, famillesPour, FAMILLES_AJOUTEES } from '@/lib/v2/cartes/moteur/familles';
import { mettreEnPage, rectsDuPlan } from '@/lib/v2/cartes/moteur/miseEnPage';
import { AIR_VISAGE, basDesBadges, GRILLE, hauteurPhoto, MARGE_SURE_BAS } from '@/lib/v2/cartes/moteur/grille';
import { blocRespecteZone, placer } from '@/lib/v2/cartes/moteur/protection';
import { chiffresDisponibles, duree } from '@/lib/v2/cartes/chiffres';
import { CLE_MOTEUR, moteurCourant, MOTEUR_DEFAUT } from '@/lib/v2/cartes/store';
import { derniereSeance, lienNouveauStudio } from '@/lib/v2/cartes/redirections';
import type { AncienneRoute } from '@/lib/v2/cartes/redirections';
import { DEMO_ANNEE, DEMO_COMPTEURS, DEMO_EXPLOITS, DEMO_MOIS, DEMO_MOIS_SEPT, DEMO_OBJECTIFS, DEMO_PESEE, DEMO_SEANCE_COMBAT, DEMO_SEANCE_COURSE, DEMO_SEANCE_MUSCU, DEMO_SEMAINE, demoAvantApres } from '@/lib/v2/cartes/demo';
import type { CarteData, CompositionId, FamilleMoteur, OptionsCarte } from '@/lib/v2/cartes/types';
import { nouveauMoteurPour, sansChiffresCaches } from '@/components/yoroi/v2/cartes/CarteRendu';
import { lienEditeur } from '@/components/yoroi/v2/cartes/FeuilleCarte';
import { sectionsDuStudio, StudioMoteur } from '@/components/yoroi/v2/cartes/moteur/StudioMoteur';

const racine = path.join(__dirname, '..', '..');
const lire = (f: string) => fs.readFileSync(path.join(racine, f), 'utf8');

const s0 = { dureeMin: 0, rounds: 0, series: 0, tonnage: 0, distanceKm: 0, fcMoy: 0, fcMax: 0, calories: 0, records: [] };
const VELO: CarteData = { moment: 'seance', titre: 'Vélo', sousTitre: 'Dimanche 1er novembre', sport: 'Vélo', famille: 'autre', cle: 't:velo', seance: { ...s0, dureeMin: 95, distanceKm: 42.3, fcMoy: 138, calories: 900 } };

const TOUTES: { nom: string; d: CarteData }[] = [
  { nom: 'seance muscu', d: DEMO_SEANCE_MUSCU },
  { nom: 'seance combat', d: DEMO_SEANCE_COMBAT },
  { nom: 'seance course', d: DEMO_SEANCE_COURSE },
  { nom: 'seance velo', d: VELO },
  { nom: 'pesee', d: DEMO_PESEE },
  { nom: 'semaine', d: DEMO_SEMAINE },
  { nom: 'mois', d: DEMO_MOIS },
  { nom: 'mois combat', d: DEMO_MOIS_SEPT },
  { nom: 'annee', d: DEMO_ANNEE },
  { nom: 'avant apres', d: demoAvantApres(['a.jpg', 'b.jpg']) },
  ...DEMO_EXPLOITS.map((d) => ({ nom: `exploit ${d.exploit?.type}`, d })),
  ...DEMO_OBJECTIFS.map((d) => ({ nom: `objectif ${d.exploit?.type}`, d })),
  ...DEMO_COMPTEURS.map((d) => ({ nom: `compteur ${d.exploit?.type}`, d })),
];

const PHOTO = { w: 1080, h: 1935, visages: [[467, 521, 191, 232]] as [number, number, number, number][], corps: [168, 470, 946, 1935] as [number, number, number, number], frontal: true };

describe('toutes les cartes passent par le nouveau moteur', () => {
  for (const x of TOUTES) {
    test(`${x.nom} : une famille, un contenu, aucune kcal, rien ne se chevauche`, () => {
      const fams = famillesPour(x.d);
      expect(fams.length).toBeGreaterThan(0);
      expect(nouveauMoteurPour(x.d, 'nouveau')).toBe(true);
      for (const f of fams) {
        const c = contenuDe(x.d, f);
        expect(c).not.toBeNull();
        expect(JSON.stringify(c!.stats)).not.toMatch(/kcal/i);
        expect(JSON.stringify(c!.lignesAuto ?? [])).not.toMatch(/kcal/i);
        for (const compo of compositionsPour(x.d, f)) {
          for (const format of ['story', 'post'] as const) {
            const p = mettreEnPage({ contenu: c!, compo, format, photo: compo === 'A' && f !== 'transfo' ? PHOTO : null });
            const G = GRILLE[format];
            const RH = hauteurPhoto(format);
            // la bande est sous la zone photo, et tout ce qui est pose reste au-dessus d'elle
            expect(p.bande.y).toBe(RH);
            for (const r of rectsDuPlan(p)) expect(r.y + r.h).toBeLessThanOrEqual(RH - G.AIR_BANDE + 0.5);
            // la pastille ne touche ni le dessin ni le bloc
            if (p.bloc) expect(p.bloc.y).toBeGreaterThanOrEqual(p.pastille.y + p.pastille.h);
            if (p.visuel && p.bloc && (p.type === 'dessin' || p.type === 'duo')) expect(p.visuel.y + p.visuel.h).toBeLessThanOrEqual(p.bloc.y);
            // avec ta photo : ton visage garde ses 48 px d'air
            if (p.photo) expect(blocRespecteZone(p.photo.placement, format)).toBe(true);
          }
        }
      }
    });
  }

  test('les familles ajoutees', () => {
    expect(FAMILLES_AJOUTEES).toEqual(['pesee', 'mois', 'objectif', 'exploit', 'sport']);
    expect(famillesPour(DEMO_PESEE)).toEqual(['pesee']);
    expect(famillesPour(DEMO_MOIS)).toEqual(['mois']);
    expect(famillesPour(VELO)).toEqual(['sport']);
    const types = (t: string) => famillesPour(DEMO_EXPLOITS.find((d) => d.exploit?.type === t) ?? DEMO_OBJECTIFS.find((d) => d.exploit?.type === t)!);
    expect(types('annee_progression')).toEqual(['objectif']);
    expect(types('palier_total')).toEqual(['exploit']);
    expect(types('techniques')).toEqual(['exploit']);
    expect(types('bilan_mois')).toEqual(['mois']);
    expect(types('poids_perdu')).toEqual(['pesee']);
    expect(types('chemin_poids')).toEqual(['pesee']);
    expect(types('record_charge')).toEqual(['record']);
  });
});

describe('le mois : les vraies donnees de DonneesPeriode', () => {
  test('seances en grand, puis temps d entrainement, semaines a l objectif, distance ou kilos', () => {
    const c = contenuDe(DEMO_MOIS, 'mois')!;
    const p = DEMO_MOIS.periode!;
    expect(c.hero.v).toBe(String(p.seances));
    const t = duree(p.minutes);
    expect(c.stats[0]).toMatchObject({ v: t.value });
    expect(c.stats[1]).toMatchObject({ v: String(p.semainesTenues), u: `/${p.semainesComptees}` });
    expect(c.mois).toEqual({ nom: 'Octobre', tenues: p.semainesTenues, comptees: p.semainesComptees });
    // chaque chiffre vient de chiffresDisponibles (rien d'invente)
    const dispo = chiffresDisponibles(DEMO_MOIS).map((x) => x.value);
    for (const s of c.stats) expect(dispo).toContain(s.v);
  });
  test('sans objectif choisi : pas de semaines a l objectif, pas de pastilles', () => {
    const d = { ...DEMO_MOIS, periode: { ...DEMO_MOIS.periode!, parSemaine: 0 } };
    const c = contenuDe(d, 'mois')!;
    expect(c.stats.some((s) => /objectif/i.test(s.l))).toBe(false);
    expect(c.mois?.comptees).toBe(0);
  });
  test('une course mensuelle : la distance', () => {
    const d = { ...DEMO_MOIS, famille: 'course' as const };
    expect(contenuDe(d, 'mois')!.stats.map((s) => s.u)).toContain('km');
  });
});

describe('la pesee : le masquage du poids ne laisse aucun poids absolu', () => {
  test('montre : ton poids', () => {
    expect(contenuDe(DEMO_PESEE, 'pesee')!.hero).toEqual({ v: '84,6', u: 'kg' });
  });
  for (const m of ['ecart', 'pourcentage'] as const) {
    test(`masque ${m}`, () => {
      const c = contenuDe(DEMO_PESEE, 'pesee', 'kg', m)!;
      const tout = JSON.stringify([c.hero, c.stats, c.lignesAuto]);
      for (const kg of ['84,6', '85,3', '91,2', '"80"']) expect(tout).not.toContain(kg);
    });
  }
  test('exploit de poids masque en pourcentage', () => {
    const d = DEMO_EXPLOITS.find((x) => x.exploit?.type === 'poids_perdu')!;
    const c = contenuDe(d, 'pesee', 'kg', 'pourcentage')!;
    expect(c.hero.u).toBe('%');
    expect(JSON.stringify(c.stats)).not.toContain('84,6');
  });
});

describe('la grille : la bande du bas descend et prend moins de place', () => {
  test('plus fine qu avant, la photo plus grande', () => {
    expect(GRILLE.story.BANDE).toBeLessThan(300);
    expect(GRILLE.post.BANDE).toBeLessThan(152);
    expect(GRILLE.story.BADGE).toBeLessThan(88);
    expect(hauteurPhoto('story')).toBeGreaterThan(1920 - 300);
    expect(hauteurPhoto('post')).toBeGreaterThan(1350 - 152);
  });
  test('la marge de securite du bas reste : les badges ne passent jamais sous la barre de reponse', () => {
    for (const f of ['story', 'post'] as const) {
      expect(basDesBadges(f)).toBeLessThanOrEqual(GRILLE[f].H - MARGE_SURE_BAS[f]);
      // les badges restent dans la bande
      expect(GRILLE[f].BANDE_RANG + GRILLE[f].BADGE).toBeLessThanOrEqual(GRILLE[f].BANDE);
    }
    expect(MARGE_SURE_BAS.story).toBeGreaterThanOrEqual(120);
  });
  test('ton visage reste protege, en story et en 4:5', () => {
    for (const f of ['story', 'post'] as const) {
      const p = placer(PHOTO, f, { regle: 'A' });
      expect(blocRespecteZone(p, f)).toBe(true);
      expect(p.zone.y1 + AIR_VISAGE).toBeLessThanOrEqual(p.top + 0.5);
    }
  });
});

describe('les sections du studio, dans l ordre', () => {
  const base = { compos: ['A', 'B', 'C', 'autocollant'] as CompositionId[], famille: 'muscu' as FamilleMoteur, nbChiffres: 2, poids: false, gold: false };
  test('apercu, composition, photo, style, format, chiffres, boutons', () => {
    expect(sectionsDuStudio({ ...base, compo: 'A', aPhoto: true })).toEqual(['apercu', 'composition', 'photo', 'style', 'format', 'chiffres', 'boutons']);
  });
  test('avec une photo, la section Ta photo est la dans chaque composition', () => {
    for (const compo of base.compos) expect(sectionsDuStudio({ ...base, compo, aPhoto: true })).toContain('photo');
  });
  test('sans photo : la section photo avec Ta photo et Autocollant seulement', () => {
    expect(sectionsDuStudio({ ...base, compo: 'B', aPhoto: false })).not.toContain('photo');
    expect(sectionsDuStudio({ ...base, compo: 'autocollant', aPhoto: false })).toContain('photo');
    expect(sectionsDuStudio({ ...base, compo: 'autocollant', aPhoto: false })).not.toContain('format');
  });
  test('le record (or) n a pas de style ; Avant apres n a pas la section Ta photo', () => {
    expect(sectionsDuStudio({ ...base, compo: 'A', aPhoto: true, gold: true })).not.toContain('style');
    expect(sectionsDuStudio({ ...base, famille: 'transfo', compo: 'A', aPhoto: true })).not.toContain('photo');
  });
  test('les chiffres caches : il en reste toujours un', () => {
    const c = contenuDe(DEMO_SEANCE_MUSCU, 'muscu')!;
    const tous = c.stats.map((s) => s.l);
    expect(sansChiffresCaches(c, tous).stats).toHaveLength(1);
    expect(sansChiffresCaches(c, [tous[0]]).stats.map((s) => s.l)).not.toContain(tous[0]);
  });
});

/** Un faux useCarte : l'etat de la carte, et des fonctions espionnees */
function fauxK(o: Partial<OptionsCarte> & { photo?: string | null }) {
  const options = { modele: 'net', format: 'story', fond: o.photo ? 'photo' : 'couleur', sombre: true, personnage: false, masque: 'aucun', slogan: 0, chiffres: [], ...o } as OptionsCarte;
  return {
    ref: { current: null }, refAutocollant: { current: null }, options, visuels: { photo: o.photo ?? null }, photo: o.photo ?? null, photoEnCours: false,
    busy: null, saved: false, copie: false, recadrage: null,
    setStyle: jest.fn(), choisirPhoto: jest.fn(async () => true), enleverPhoto: jest.fn(), setRecadrage: jest.fn(), recadrerAuto: jest.fn(),
    partager: jest.fn(), partagerEnStory: jest.fn(), enregistrer: jest.fn(), copierAutocollantSeul: jest.fn(), enregistrerAutocollantSeul: jest.fn(),
  };
}
type K = ReturnType<typeof fauxK>;
const studio = (d: CarteData, k: K) => render(<StudioMoteur data={d} k={k as never} onRetour={() => undefined} />);

describe('les chemins de ta photo dans le studio', () => {
  const PH = 'file:///cache/cartes_tmp/photo_1.jpg';
  for (const compo of ['A', 'B', 'C', 'autocollant'] as const) {
    test(`avec une photo, composition ${compo} : Changer, Prendre, Enlever toujours la`, async () => {
      const k = fauxK({ compo, photo: PH });
      const r = studio(DEMO_SEANCE_MUSCU, k);
      expect(compositionEffective(DEMO_SEANCE_MUSCU, 'muscu', compo, true)).toBe(compo);
      await act(async () => {
        fireEvent.press(r.getByTestId('photo-changer'));
      });
      expect(k.choisirPhoto).toHaveBeenLastCalledWith('gallery');
      await act(async () => {
        fireEvent.press(r.getByTestId('photo-prendre'));
      });
      expect(k.choisirPhoto).toHaveBeenLastCalledWith('camera');
      fireEvent.press(r.getByTestId('photo-enlever'));
      expect(k.enleverPhoto).toHaveBeenCalledTimes(1);
      // une nouvelle photo choisie depuis Dessin ou Donnees passe en composition Ta photo
      if (compo === 'B' || compo === 'C') expect(k.setStyle).toHaveBeenCalledWith(expect.objectContaining({ compo: 'A', fond: 'photo' }));
      r.unmount();
    });
  }
  test('sans photo, Dessin : pas de section photo ; toucher Ta photo ouvre la galerie', async () => {
    const k = fauxK({ compo: 'B' });
    const r = studio(DEMO_SEANCE_MUSCU, k);
    expect(r.queryByTestId('photo-enlever')).toBeNull();
    expect(r.queryByTestId('studio-photo')).toBeNull();
    await act(async () => {
      fireEvent.press(r.getByTestId('compo-A'));
    });
    expect(k.setStyle).toHaveBeenCalledWith({ compo: 'A' });
    expect(k.choisirPhoto).toHaveBeenCalledWith('gallery');
    r.unmount();
  });
  test('sans photo, Autocollant : Galerie et Prendre une photo', async () => {
    const k = fauxK({ compo: 'autocollant' });
    const r = studio(DEMO_SEANCE_MUSCU, k);
    await act(async () => {
      fireEvent.press(r.getByTestId('photo-galerie'));
    });
    expect(k.choisirPhoto).toHaveBeenCalledWith('gallery');
    expect(r.queryByTestId('photo-enlever')).toBeNull();
    r.unmount();
  });
  test('les familles ajoutees ont aussi les boutons de la photo (pesee, mois)', () => {
    for (const d of [DEMO_PESEE, DEMO_MOIS]) {
      const r = studio(d, fauxK({ compo: 'A', photo: PH }));
      expect(r.getByTestId('photo-changer')).toBeTruthy();
      expect(r.getByTestId('photo-enlever')).toBeTruthy();
      expect(r.getByTestId('studio-style')).toBeTruthy();
      r.unmount();
    }
  });
  test('la pesee propose de masquer ton poids', () => {
    const k = fauxK({ compo: 'B' });
    const r = studio(DEMO_PESEE, k);
    fireEvent.press(r.getByTestId('masque-pourcentage'));
    expect(k.setStyle).toHaveBeenCalledWith({ masque: 'pourcentage' });
    r.unmount();
  });
  test('aucun emoji ni caractere japonais dans le studio', () => {
    const t = lire('components/yoroi/v2/cartes/moteur/StudioMoteur.tsx');
    expect(t).not.toMatch(/[぀-ヿ一-鿿]/);
    expect(t).not.toMatch(/\p{Extended_Pictographic}/u);
  });
});

describe('toutes les entrees ouvrent le nouveau studio', () => {
  test('le nouveau moteur pour tout le monde, sans interrupteur', () => {
    expect(MOTEUR_DEFAUT).toBe('nouveau');
    expect(moteurCourant()).toBe('nouveau');
    expect(CLE_MOTEUR).not.toBe('yoroi_cartes_moteur_v1');
    expect(lire('components/yoroi/v2/studio/Diagnostic.tsx')).not.toContain('ecrireMoteur');
  });
  test('Mes cartes, la feuille de partage, la fin de seance, la carte du jour, les records : /carte', () => {
    for (const x of TOUTES) if (x.d.moment !== 'avant_apres' || x.d.avantApres) expect(lienEditeur(x.d)).toMatch(/^\/carte\?/);
    expect(lire('app/seance/fin.tsx')).toContain('/carte?moment=seance&id=');
    expect(lire('components/yoroi/v2/seances/CarteDuJour.tsx')).toContain('/carte?moment=seance&id=');
    expect(lire('app/workout-detail.tsx')).toContain('/carte?moment=seance&id=');
    expect(lire('app/pesee.tsx')).toContain('/carte?moment=pesee');
    expect(lire('app/mes-cartes.tsx')).toContain('lienEditeur(d)');
  });
  test('app/carte.tsx n ouvre que le studio du nouveau moteur', () => {
    const t = lire('app/carte.tsx');
    expect(t).toContain('<StudioMoteur');
    for (const x of ["id: 'modele'", "id: 'fond'", 'function Onglets', 'modelesPour', 'Directions']) expect(t).not.toContain(x);
    expect(t).toContain("nouveauMoteurPour(data, 'nouveau')");
    // la reouverture de la derniere page reste
    expect(t).toContain('noterDetailsPage');
    expect(t).toContain('BandeauPhoto');
  });
  const ROUTES: [string, AncienneRoute][] = [
    ['app/social-share/last-session.tsx', 'last-session'],
    ['app/social-share/weekly-recap-v2.tsx', 'weekly-recap-v2'],
    ['app/social-share/monthly-recap-v2.tsx', 'monthly-recap-v2'],
    ['app/social-share/year-counter-v2.tsx', 'year-counter-v2'],
    ['app/social-share/duel-card.tsx', 'duel-card'],
    ['app/wrapped.tsx', 'wrapped'],
    ['app/fighter-card.tsx', 'fighter-card'],
  ];
  for (const [f, r] of ROUTES) {
    test(`${f} redirige vers le nouveau studio`, () => {
      const t = lire(f);
      expect(t).toContain(`<RedirectionCarte route="${r}" />`);
      expect(t).not.toMatch(/useStudio|ShareStudio|cardKit/);
    });
  }
  test('les liens des anciennes routes', () => {
    const now = new Date(2026, 10, 2, 21, 0);
    expect(lienNouveauStudio('last-session', now, 42)).toBe('/carte?moment=seance&id=42');
    expect(lienNouveauStudio('last-session', now, null)).toBe('/mes-cartes');
    expect(lienNouveauStudio('weekly-recap-v2', now)).toBe('/carte?moment=semaine&debut=2026-11-02');
    expect(lienNouveauStudio('monthly-recap-v2', now)).toBe('/carte?moment=mois&ref=2026-11');
    expect(lienNouveauStudio('year-counter-v2', now)).toBe('/carte?moment=annee&ref=2026');
    expect(lienNouveauStudio('wrapped', now)).toBe('/carte?moment=annee&ref=2026');
    expect(lienNouveauStudio('fighter-card', now)).toBe('/carte?moment=annee&ref=2026');
    expect(lienNouveauStudio('duel-card', now)).toBe('/mes-cartes');
    expect(derniereSeance([{ id: 1, date: '2026-11-01' }, { id: 3, date: '2026-11-02' }, { id: 2, date: '2026-11-02' }] as never)).toBe(3);
  });
  test('plus aucun ecran de l app n ouvre l ancien atelier', () => {
    const ecrans: string[] = [];
    const marcher = (d: string) => {
      for (const n of fs.readdirSync(path.join(racine, d))) {
        const p = path.join(d, n);
        if (fs.statSync(path.join(racine, p)).isDirectory()) marcher(p);
        else if (/\.tsx?$/.test(n)) ecrans.push(p);
      }
    };
    marcher('app');
    for (const e of ecrans) {
      const t = lire(e);
      // seul le Studio createur garde sa galerie de controle des anciennes cartes (app/studio/partage.tsx)
      expect(t).not.toMatch(/from '@\/lib\/v2\/partage\/useStudio'|partage\/ShareStudio|components\/social-cards\//);
    }
    expect(fs.existsSync(path.join(racine, 'components/yoroi/v2/partage/ShareStudio.tsx'))).toBe(false);
  });
});
