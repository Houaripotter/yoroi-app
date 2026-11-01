/**
 * Ordre des visuels d'un exercice (lib/v2/programmes/visuelExo.ts), 1er novembre 2026.
 * Mode créateur : Gym visual, maison, Everkinetic, machine, sticker. Hors mode créateur : la même suite sans Gym
 * visual. Les sources sont simulées : chaque exercice de test n'existe que dans les sources qu'on lui donne.
 */
import { demoSlug } from '@/lib/v2/programmes/demos';

const mockGV: Record<string, string> = { tout: 'gv', sans_maison: 'gv' };
const mockMaison = new Set(['tout', 'maison_ek_machine']);
const mockEK = new Set(['tout', 'sans_maison', 'maison_ek_machine', 'ek_machine', 'planche_sans_gif']);
const mockMachine = new Set(['tout', 'maison_ek_machine', 'ek_machine', 'machine_seule']);

jest.mock('@/lib/v2/programmes/demosTest', () => ({
  demoEnLigne: (cle: string) => (mockGV[cle] ? [{ uri: `gif/${cle}` }] : null),
  sourceDemosActive: () => 'aucune',
}));
jest.mock('@/lib/v2/programmes/demosMaison', () => ({
  demoMaisonDe: (nom: string) => (mockMaison.has(require('@/lib/v2/programmes/demos').demoSlug(nom)) ? ['maisonA', 'maisonB'] : null),
}));
jest.mock('@/lib/v2/programmes/everkinetic', () => ({
  EVERKINETIC_ACTIF: true,
  demoEverkineticDe: (nom: string) => (mockEK.has(require('@/lib/v2/programmes/demos').demoSlug(nom)) ? ['ekA', 'ekB'] : null),
}));
jest.mock('@/lib/v2/seance/machinesArt', () => ({
  machineArt: (cle: string) => (mockMachine.has(cle) ? 'machine' : null),
}));
jest.mock('@/lib/v2/seance/machines', () => ({ MACHINES: [] }));

import { ordreVisuels, visuelExo, type VisuelExo } from '@/lib/v2/programmes/visuelExo';

const quoi = (v: VisuelExo): string => {
  if (v.type === 'animation') {
    if (v.source === 'everkinetic') return 'everkinetic';
    return (v.images[0] as { uri?: string })?.uri ? 'gymvisual' : 'maison';
  }
  return v.type;
};

describe('ordreVisuels', () => {
  it('mode créateur : Gym visual, maison, Everkinetic, machine, sticker', () => {
    expect(ordreVisuels(true)).toEqual(['gymvisual', 'maison', 'everkinetic', 'machine', 'sticker']);
  });
  it('hors mode créateur : maison, Everkinetic, machine, sticker, jamais Gym visual', () => {
    expect(ordreVisuels(false)).toEqual(['maison', 'everkinetic', 'machine', 'sticker']);
  });
});

describe('visuelExo en mode créateur', () => {
  const v = (nom: string) => quoi(visuelExo(nom, 'ABDOS', false, true));
  it('Gym visual reste la priorité quand il existe', () => {
    expect(v('tout')).toBe('gymvisual');
    expect(v('sans_maison')).toBe('gymvisual');
  });
  it('sans GIF, la source suivante prend le relais au lieu du sticker', () => {
    expect(v('maison_ek_machine')).toBe('maison');
    expect(v('ek_machine')).toBe('everkinetic');
    expect(v('planche_sans_gif')).toBe('everkinetic');
    expect(v('machine_seule')).toBe('machine');
  });
  it('le sticker seulement quand rien d’autre n’existe', () => {
    expect(v('rien_du_tout')).toBe('sticker');
  });
  it('Everkinetic garde sa source, pour le crédit de la fiche', () => {
    const r = visuelExo('ek_machine', 'ABDOS', false, true);
    expect(r.type === 'animation' && r.source).toBe('everkinetic');
  });
});

describe('visuelExo hors mode créateur', () => {
  const v = (nom: string) => quoi(visuelExo(nom, 'ABDOS', false, false));
  it('jamais de GIF Gym visual', () => {
    expect(v('tout')).toBe('maison');
    expect(v('sans_maison')).toBe('everkinetic');
  });
  it('maison, puis Everkinetic, puis machine, puis sticker', () => {
    expect(v('maison_ek_machine')).toBe('maison');
    expect(v('ek_machine')).toBe('everkinetic');
    expect(v('machine_seule')).toBe('machine');
    expect(v('rien_du_tout')).toBe('sticker');
  });
});

describe('cardio', () => {
  it('toujours le sticker course, dans les deux modes', () => {
    for (const mode of [true, false]) {
      const r = visuelExo('tout', 'CARDIO', true, mode);
      expect(r).toEqual({ type: 'sticker', sticker: 'course', teinte: 'peche' });
    }
  });
});

it('les clés de test sont bien des slugs', () => {
  expect(demoSlug('ek_machine')).toBe('ek_machine');
});
