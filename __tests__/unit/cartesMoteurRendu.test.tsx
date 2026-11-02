/**
 * Cartes v10 (2 novembre 2026) : CarteRendu bascule entre les deux moteurs. Les 10 familles se dessinent avec le
 * nouveau moteur en story et en 4:5 ; l'ancien moteur reste celui par defaut ; une carte que le nouveau ne connait
 * pas (pesee) reste sur l'ancien ; le carre s'ouvre en 4:5.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';

jest.mock('@/components/yoroi/v2/espace/reglages/prefs', () => ({ useUnitePoids: () => 'kg' }));
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return { Image: View };
});

import { CarteRendu, formatDessine, HAUTEURS } from '@/components/yoroi/v2/cartes/CarteRendu';
import { STYLE_DEFAUT } from '@/lib/v2/cartes/store';
import { DEMO_PESEE } from '@/lib/v2/cartes/demo';
import type { FamilleMoteur, OptionsCarte } from '@/lib/v2/cartes/types';
import { DIX_FAMILLES } from '../fixtures/cartesMoteurDonnees';

const opts = (format: OptionsCarte['format'], familleMoteur?: FamilleMoteur): OptionsCarte => ({ ...STYLE_DEFAUT, format, chiffres: [], familleMoteur });
const hauteurDe = (r: ReturnType<typeof render>) => StyleSheet.flatten(r.toJSON() && !Array.isArray(r.toJSON()) ? (r.toJSON() as { props: { style: object } }).props.style : {}) as { height?: number };

describe('les 10 familles avec le nouveau moteur', () => {
  for (const x of DIX_FAMILLES) {
    for (const f of ['story', 'post'] as const) {
      test(`${x.nom}, ${f}`, () => {
        const r = render(<CarteRendu data={x.d} options={opts(f, x.famille as FamilleMoteur)} visuels={{}} moteur="nouveau" />);
        expect(hauteurDe(r).height).toBe(HAUTEURS[f]);
        // le texte de la pastille et le mot YOROI sont dessines
        expect(r.toJSON()).toBeTruthy();
        expect(JSON.stringify(r.toJSON())).toContain('YOROI');
        r.unmount();
      });
    }
  }
});

test('le carre s ouvre en 4:5 avec le nouveau moteur, reste carre avec l ancien', () => {
  const d = DIX_FAMILLES[0].d;
  expect(formatDessine(d, opts('carre'), 'nouveau')).toBe('post');
  expect(formatDessine(d, opts('carre'), 'ancien')).toBe('carre');
  const r = render(<CarteRendu data={d} options={opts('carre')} visuels={{}} moteur="nouveau" />);
  expect(hauteurDe(r).height).toBe(HAUTEURS.post);
});

test('une pesee reste sur l ancien moteur, meme interrupteur sur nouveau', () => {
  expect(formatDessine(DEMO_PESEE, opts('carre'), 'nouveau')).toBe('carre');
});

test('sans interrupteur : l ancien moteur par defaut (aucune pastille du nouveau)', () => {
  const r = render(<CarteRendu data={DIX_FAMILLES[7].d} options={opts('story')} visuels={{}} />);
  expect(JSON.stringify(r.toJSON())).not.toContain('MA SEMAINE');
  const n = render(<CarteRendu data={DIX_FAMILLES[7].d} options={opts('story')} visuels={{}} moteur="nouveau" />);
  expect(JSON.stringify(n.toJSON())).toContain('MA SEMAINE');
});
