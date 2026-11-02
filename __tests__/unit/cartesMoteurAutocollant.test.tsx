/**
 * Cartes v10 (2 novembre 2026), nouveau moteur : la composition Autocollant (proposition A de
 * _propositions/autocollant_2026-11-02, agrandie de 30 % sur la story). Les lignes de chaque sport viennent des vraies
 * donnees, une donnee absente fait disparaitre sa ligne, jamais de kcal ; l'export ne prend que l'autocollant,
 * environ 700 px de large, en PNG, sans aucun fond.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { PixelRatio, StyleSheet } from 'react-native';
import type { View } from 'react-native';

jest.mock('react-native-view-shot', () => ({ captureRef: jest.fn(async () => 'file:///cache/ReactNative/capture.png'), releaseCapture: jest.fn() }));
jest.mock('expo-clipboard', () => ({ setImageAsync: jest.fn(async () => undefined) }));
jest.mock('expo-sharing', () => ({ isAvailableAsync: jest.fn(async () => true), shareAsync: jest.fn(async () => undefined) }));
jest.mock('expo-media-library', () => ({ requestPermissionsAsync: jest.fn(async () => ({ status: 'granted' })), saveToLibraryAsync: jest.fn(async () => undefined) }));
jest.mock('expo-haptics', () => ({ impactAsync: jest.fn(async () => undefined), notificationAsync: jest.fn(async () => undefined), ImpactFeedbackStyle: { Medium: 'm' }, NotificationFeedbackType: { Success: 's' } }));
jest.mock('@/components/yoroi/v2/fenetre/api', () => ({ appAlert: jest.fn() }));
jest.mock('@/lib/v2/partage/mesure', () => ({ noterPartage: jest.fn() }));
jest.mock('@/lib/v2/cartes/tmp', () => ({
  rangerDansCartesTmp: jest.fn(async (u: string) => u.replace('ReactNative', 'cartes_tmp')),
  effacerExport: jest.fn(async () => undefined),
  effacerApresPartage: jest.fn(),
}));

import { captureRef } from 'react-native-view-shot';
import { setImageAsync } from 'expo-clipboard';
import { saveToLibraryAsync } from 'expo-media-library';
import { effacerExport, rangerDansCartesTmp } from '@/lib/v2/cartes/tmp';
import { copierAutocollant, enregistrerAutocollant } from '@/lib/v2/cartes/export';
import { AVEC_AUTOCOLLANT, compositionEffective, compositionsPour, contenuDe, lignesAutocollant } from '@/lib/v2/cartes/moteur/familles';
import type { FamilleMoteur } from '@/lib/v2/cartes/moteur/familles';
import { GRILLE, hauteurPhoto } from '@/lib/v2/cartes/moteur/grille';
import { autocollant, ECHELLE_AUTOCOLLANT, EXPORT_AUTOCOLLANT, mettreEnPage, rectsDuPlan } from '@/lib/v2/cartes/moteur/miseEnPage';
import { CarteMoteur } from '@/components/yoroi/v2/cartes/moteur/CarteMoteur';
import type { CarteData } from '@/lib/v2/cartes/types';
import { DIX_FAMILLES, FAM_COURSE, FAM_JJB, FAM_MARCHE, FAM_MUSCU, FAM_RECORD } from '../fixtures/cartesMoteurDonnees';

const MUSCU_RECORDS: CarteData = { ...FAM_MUSCU, seance: { ...FAM_MUSCU.seance!, records: [{ nom: 'Développé couché', texte: '100 kg' }, { nom: 'Squat', texte: '140 kg' }] } };
const SPORTS: { nom: string; d: CarteData; famille: FamilleMoteur; libelles: string[]; valeurs: string[] }[] = [
  { nom: 'musculation', d: MUSCU_RECORDS, famille: 'muscu', libelles: ['Durée', 'Kilos soulevés', 'Records'], valeurs: ['1h12', '12,5', '2'] },
  { nom: 'course', d: FAM_COURSE, famille: 'course', libelles: ['Distance', 'Allure', 'Durée'], valeurs: ['10,4', "5'00", '52'] },
  { nom: 'JJB', d: FAM_JJB, famille: 'jjb', libelles: ['Sur le tatami', 'Rounds', 'Ceinture, 2 degrés'], valeurs: ['1h30', '8', 'Bleue'] },
  { nom: 'marche', d: FAM_MARCHE, famille: 'marche', libelles: ['Durée', 'Pente', 'Vitesse'], valeurs: ['30', '10', '5,5'] },
  { nom: 'record', d: FAM_RECORD, famille: 'record', libelles: ['Développé couché', 'Ancien record', 'Gagné'], valeurs: ['100', '95', '+5'] },
];

const planDe = (d: CarteData, famille: FamilleMoteur, format: 'story' | 'post' = 'story') => mettreEnPage({ contenu: contenuDe(d, famille)!, compo: 'autocollant', format });

describe('la mise en page de l autocollant, pour chaque sport', () => {
  for (const x of SPORTS) {
    for (const format of ['story', 'post'] as const) {
      test(`${x.nom}, ${format}`, () => {
        const l = lignesAutocollant(x.d, x.famille);
        expect(l.map((y) => y.l)).toEqual(x.libelles);
        expect(l.map((y) => y.v)).toEqual(x.valeurs);
        const p = planDe(x.d, x.famille, format);
        expect(p.type).toBe('autocollant');
        expect(p.bloc).toBeNull();
        const a = p.autocollant!;
        expect(a.lignes).toHaveLength(3);
        // centre, dans les marges, au-dessus de la bande
        const G = GRILLE[format];
        expect(Math.abs(a.x + a.w / 2 - G.W / 2)).toBeLessThanOrEqual(1);
        expect(a.x).toBeGreaterThanOrEqual(G.M);
        expect(a.y).toBeGreaterThanOrEqual(G.HAUT);
        expect(a.y + a.h).toBeLessThanOrEqual(hauteurPhoto(format) - G.AIR_BANDE);
        // les lignes de haut en bas, sans se toucher, puis le trait et le logo
        let bas = 0;
        for (const y of a.lignes) {
          expect(y.yV).toBeGreaterThanOrEqual(bas);
          expect(y.wV).toBeLessThanOrEqual(a.w);
          expect(y.wL).toBeLessThanOrEqual(a.w);
          bas = y.yL + y.l.length * a.hL;
        }
        expect(a.trait.y).toBeGreaterThan(bas);
        expect(a.logo.y).toBeGreaterThan(a.trait.y);
        expect(a.logo.y + a.logo.h).toBeLessThan(a.h);
        expect(a.mot.x).toBeGreaterThan(a.logo.x + a.logo.w);
        // la ceinture du JJB a sa barre et ses deux degres
        if (x.famille === 'jjb') expect(a.lignes[2].ceinture).toEqual(expect.objectContaining({ couleur: '#2563EB', degres: 2 }));
        else expect(a.lignes.every((y) => !y.ceinture)).toBe(true);
      });
    }
  }

  test('agrandi d environ 30 % par rapport a la maquette (chiffres 96 px, libelles 29 px, logo 66 px)', () => {
    const l = lignesAutocollant(MUSCU_RECORDS, 'muscu');
    const maquette = autocollant(l, 1e9, 1);
    const a = planDe(MUSCU_RECORDS, 'muscu').autocollant!;
    expect(ECHELLE_AUTOCOLLANT).toBe(1.3);
    expect(a.lignes[0].sV).toBeCloseTo(96 * 1.3, 5);
    expect(a.sL).toBeCloseTo(29 * 1.3, 5);
    expect(a.logo.h).toBeCloseTo(66 * 1.3, 5);
    expect(a.w / maquette.w).toBeGreaterThan(1.27);
    expect(a.w / maquette.w).toBeLessThan(1.33);
    expect(a.h / maquette.h).toBeGreaterThan(1.27);
    expect(a.h / maquette.h).toBeLessThan(1.33);
  });

  test('proposee pour la seance, le record, la course, le JJB et la marche, jamais pour les autres familles', () => {
    // 2 novembre 2026 (studio unique) : et les familles ajoutees (pesee, mois, objectif, exploit, autre sport)
    expect(AVEC_AUTOCOLLANT).toEqual(['muscu', 'record', 'course', 'jjb', 'marche', 'pesee', 'mois', 'objectif', 'exploit', 'sport']);
    for (const x of DIX_FAMILLES) {
      const l = compositionsPour(x.d, x.famille as FamilleMoteur);
      if (AVEC_AUTOCOLLANT.includes(x.famille as FamilleMoteur)) expect(l).toContain('autocollant');
      else expect(l).not.toContain('autocollant');
    }
    expect(compositionEffective(FAM_COURSE, 'course', 'autocollant', false)).toBe('autocollant');
    expect(compositionEffective(FAM_COURSE, 'course', 'autocollant', true)).toBe('autocollant');
    // une famille sans autocollant retombe sur le dessin
    expect(compositionEffective(DIX_FAMILLES[7].d, 'semaine', 'autocollant', false)).toBe('B');
  });
});

describe('les lignes absentes quand une donnee manque', () => {
  const sans = (d: CarteData, s: Partial<NonNullable<CarteData['seance']>>, extra: Partial<CarteData> = {}): CarteData => ({ ...d, ...extra, seance: { ...d.seance!, ...s } });

  test('musculation : sans records, sans kilos', () => {
    expect(lignesAutocollant(FAM_MUSCU, 'muscu').map((x) => x.l)).toEqual(['Durée', 'Kilos soulevés']);
    expect(lignesAutocollant(sans(FAM_MUSCU, { tonnage: 0 }), 'muscu').map((x) => x.l)).toEqual(['Durée']);
    const un = sans(MUSCU_RECORDS, { records: [MUSCU_RECORDS.seance!.records[0]], tonnage: 0, dureeMin: 0 });
    expect(lignesAutocollant(un, 'muscu')).toEqual([{ ic: 'record', v: '1', l: 'Record' }]);
  });
  test('course : sans distance, ni distance ni allure', () => {
    expect(lignesAutocollant(sans(FAM_COURSE, { distanceKm: 0 }), 'course').map((x) => x.l)).toEqual(['Durée']);
    expect(lignesAutocollant(sans(FAM_COURSE, { dureeMin: 0 }), 'course').map((x) => x.l)).toEqual(['Distance']);
  });
  test('JJB : sans rounds ni ceinture ; la boxe n a jamais de ceinture', () => {
    expect(lignesAutocollant(sans(FAM_JJB, { rounds: 0 }, { ceintureJjb: null }), 'jjb').map((x) => x.l)).toEqual(['Sur le tatami']);
    const boxe = { ...FAM_JJB, sport: 'Boxe anglaise', titre: 'Boxe anglaise' };
    expect(lignesAutocollant(boxe, 'jjb').map((x) => x.l)).toEqual(['Durée', 'Rounds']);
  });
  test('marche : sans pente, la vitesse vient de la distance sur la duree', () => {
    expect(lignesAutocollant(sans(FAM_MARCHE, { penteCardio: 0, vitesseCardio: 0 }), 'marche').map((x) => `${x.l} ${x.v}`)).toEqual(['Durée 30', 'Vitesse 5,5']);
    expect(lignesAutocollant(sans(FAM_MARCHE, { penteCardio: 0, vitesseCardio: 0, distanceKm: 0 }), 'marche').map((x) => x.l)).toEqual(['Durée']);
  });
  test('record : sans ancien record, le nouveau seul', () => {
    const seul = { ...FAM_RECORD, exploit: { ...FAM_RECORD.exploit!, avant: undefined } };
    expect(lignesAutocollant(seul, 'record').map((x) => x.l)).toEqual(['Développé couché']);
  });
  test('une seule ligne : l autocollant reste propre (centre, trait et logo dessous, plus etroit et plus court)', () => {
    const un = sans(FAM_COURSE, { distanceKm: 0 });
    const a = planDe(un, 'course').autocollant!;
    const trois = planDe(FAM_COURSE, 'course').autocollant!;
    expect(a.lignes).toHaveLength(1);
    expect(a.h).toBeLessThan(trois.h / 2);
    expect(a.trait.y).toBeGreaterThan(a.lignes[0].yL + a.hL);
    expect(a.logo.y + a.logo.h).toBeLessThan(a.h);
    // la largeur ne descend pas sous celle du logo et du mot YOROI
    expect(a.w).toBeGreaterThanOrEqual(a.logo.w + (a.mot.x - a.logo.x - a.logo.w));
    for (const r of rectsDuPlan(planDe(un, 'course'))) expect(r.x).toBeGreaterThanOrEqual(0);
  });
  test('aucune ligne : l autocollant n est pas propose', () => {
    const vide = sans(FAM_COURSE, { distanceKm: 0, dureeMin: 0 });
    expect(lignesAutocollant(vide, 'course')).toEqual([]);
    expect(compositionsPour(vide, 'course')).not.toContain('autocollant');
  });
});

describe('aucune kcal, aucun pseudo, aucun caractere japonais', () => {
  test('meme avec des kcal mesurees sur la seance', () => {
    for (const x of SPORTS) {
      const d = x.d.seance ? { ...x.d, seance: { ...x.d.seance, calories: 640 } } : x.d;
      const l = lignesAutocollant(d, x.famille);
      expect(l.some((y) => y.ic === 'kcal' || y.u === 'kcal' || /kcal/i.test(y.l))).toBe(false);
      const texte = JSON.stringify(planDe(d, x.famille).autocollant);
      expect(texte).not.toMatch(/kcal|640/i);
      expect(texte).not.toMatch(/[぀-ヿ㐀-鿿]/);
    }
  });
  test('le dessin : seulement les chiffres, les libelles et YOROI', () => {
    const d = { ...FAM_COURSE, seance: { ...FAM_COURSE.seance!, calories: 640 } };
    const r = render(<CarteMoteur plan={planDe(d, 'course')} largeur={360} />);
    const t = JSON.stringify(r.toJSON());
    expect(t).toContain('YOROI');
    expect(t).toContain('Distance');
    expect(t).not.toMatch(/kcal|鎧/i);
    // 640 kcal : aucun texte « 640 » (la hauteur de la carte, 640 points, n est pas un texte)
    expect(t).not.toContain('"640"');
  });
});

describe('l export : l autocollant seul, recadre, environ 700 px, fond transparent', () => {
  beforeEach(() => jest.clearAllMocks());

  test('la taille de l export garde les proportions de l autocollant', () => {
    for (const x of SPORTS) {
      const a = planDe(x.d, x.famille).autocollant!;
      expect(a.export.w).toBe(EXPORT_AUTOCOLLANT);
      expect(EXPORT_AUTOCOLLANT).toBe(700);
      expect(a.export.h).toBe(Math.round((700 * a.h) / a.w));
      // bien plus petit que la story entiere
      expect(a.export.w * a.export.h).toBeLessThan(0.75 * 1080 * 1920);
    }
  });

  test('la vue capturee : a la taille de l export sur l appareil, sans aucun fond, ni elle ni ses parents', () => {
    const ref = React.createRef<View>();
    const plan = planDe(MUSCU_RECORDS, 'muscu');
    const r = render(<CarteMoteur plan={plan} largeur={360} refAutocollant={ref} />);
    const vue = r.getByTestId('autocollant-capture');
    const st = StyleSheet.flatten(vue.props.style) as { width: number; height: number; backgroundColor?: string };
    expect(st.width * PixelRatio.get()).toBeCloseTo(700, 3);
    expect(st.height * PixelRatio.get()).toBeCloseTo(plan.autocollant!.export.h, 0);
    expect(st.backgroundColor).toBeUndefined();
    type Noeud = { props: { style?: object }; parent: Noeud | null };
    for (let n: Noeud | null = vue as unknown as Noeud; n; n = n.parent) {
      const s = StyleSheet.flatten(n.props?.style) as { backgroundColor?: string } | undefined;
      expect(s?.backgroundColor ?? 'transparent').toBe('transparent');
    }
    expect(ref.current).toBeTruthy();
  });

  test('Copier l autocollant (nouveau moteur) : PNG en base64, la vue seule a sa taille, sans fichier', async () => {
    const ref = { current: {} as View };
    (captureRef as jest.Mock).mockResolvedValueOnce('iVBORw0KGgo=');
    await expect(copierAutocollant(ref, 'story', 'seance', undefined, true)).resolves.toBe(true);
    expect(captureRef).toHaveBeenCalledWith(ref.current, { format: 'png', quality: 1, result: 'base64' });
    expect(setImageAsync).toHaveBeenCalledWith('iVBORw0KGgo=');
  });

  test('l ancien moteur ne change pas : toute la carte, au format de la carte', async () => {
    const ref = { current: {} as View };
    (captureRef as jest.Mock).mockResolvedValueOnce('iVBORw0KGgo=');
    await copierAutocollant(ref, 'story', 'seance');
    const o = (captureRef as jest.Mock).mock.calls[0][1];
    expect(o).toEqual(expect.objectContaining({ format: 'png', result: 'base64' }));
    expect(o.width * PixelRatio.get()).toBeCloseTo(1080, 0);
    expect(o.height * PixelRatio.get()).toBeCloseTo(1920, 0);
  });

  test('Enregistrer : PNG range dans cartes_tmp, mis dans la pellicule, puis efface', async () => {
    const ref = { current: {} as View };
    await expect(enregistrerAutocollant(ref)).resolves.toBe(true);
    expect(captureRef).toHaveBeenCalledWith(ref.current, { format: 'png', quality: 1, result: 'tmpfile' });
    expect(rangerDansCartesTmp).toHaveBeenCalledWith('file:///cache/ReactNative/capture.png', 'autocollant');
    expect(saveToLibraryAsync).toHaveBeenCalledWith('file:///cache/cartes_tmp/capture.png');
    expect(effacerExport).toHaveBeenCalledWith('file:///cache/cartes_tmp/capture.png');
  });

  test('Enregistrer sans vue : rien n est capture, rien n est laisse', async () => {
    await expect(enregistrerAutocollant({ current: null }, () => undefined)).resolves.toBe(false);
    expect(saveToLibraryAsync).not.toHaveBeenCalled();
  });
});
