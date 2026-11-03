/**
 * 3 novembre 2026 : claquettes de bois à 10 s de la fin (lib/v2/carnet/claquettes.ts).
 * Rounds, repos avant le round suivant, Tabata, phases de 10 s ou moins, réglage coupé.
 */
import { act, renderHook } from '@testing-library/react-native';

jest.mock('react-native-reanimated', () => ({
  // valeur stable d'un rendu à l'autre, comme la vraie (sinon le minuteur du moteur est annulé à chaque rendu)
  useSharedValue: (v: number) => require('react').useRef({ value: v }).current,
  cancelAnimation: () => {},
  withSequence: (...a: unknown[]) => a[a.length - 1],
  withTiming: (v: number) => v,
  Easing: { linear: (t: number) => t },
}));
import { useChronoEngine, type ChronoEvent, type ChronoPhase } from '@/lib/v2/carnet/useChronoEngine';
import { musculationPhases, roundPhases, tabataPhases, emomPhases, amrapPhases, forTimePhases } from '@/lib/v2/carnet/chrono';
import { CLAQUETTES_ECART_MS, claquettesAuPassage, claquettesPrevues, sonDixSecondes, tapsClaquettes } from '@/lib/v2/carnet/claquettes';
import { versPhasesChrono } from '@/lib/v2/intervalles/textes';

/** Fait tourner le moteur sur toutes les phases ; rend chaque évènement avec la seconde restante où il tombe */
function joue(phases: ChronoPhase[]) {
  const evs: { e: ChronoEvent; t: number }[] = [];
  const t0 = Date.now();
  const { result } = renderHook(() => useChronoEngine((e) => evs.push({ e, t: Date.now() - t0 })));
  act(() => result.current.start(phases));
  const total = phases.reduce((s, p) => s + p.duration, 0);
  for (let ms = 0; ms < total * 1000 + 2000; ms += 100) act(() => { jest.advanceTimersByTime(100); });
  act(() => result.current.stop());
  // debut de chaque phase, en ms depuis le lancement
  const debuts: number[] = [];
  phases.reduce((acc, p) => { debuts.push(acc); return acc + p.duration * 1000; }, 0);
  return evs.map(({ e, t }) => ({ type: e.type, index: e.index, resteS: Math.round((debuts[e.index] + phases[e.index].duration * 1000 - t) / 1000), n: (e as { n?: number }).n }));
}

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

describe('claquettes dans le moteur', () => {
  it('round de combat : une fois à 10 s, sans 3 2 1 ; repos : à 10 s du round suivant, 3 2 1 gardé', () => {
    const phases = roundPhases({ rounds: 2, round: 30, rest: 20, prepa: 0, clap: true });
    const evs = joue(phases);
    const claps = evs.filter((x) => x.type === 'clap');
    expect(claps.map((x) => [x.index, x.resteS])).toEqual([[0, 10], [1, 10], [2, 10]]);
    // pas de décompte dans les rounds, décompte gardé dans le repos
    expect(evs.filter((x) => x.type === 'countdown' && x.index !== 1)).toEqual([]);
    expect(evs.filter((x) => x.type === 'countdown' && x.index === 1).map((x) => x.n)).toEqual([3, 2, 1]);
    // le bip des 10 s ne double jamais les claquettes
    expect(evs.filter((x) => x.type === 'warn')).toEqual([]);
  });

  it('Tabata 20/10 : à 10 s de la fin de chaque effort, jamais dans le repos de 10 s', () => {
    const phases = tabataPhases({ rounds: 3, work: 20, rest: 10, sets: 1, setRest: 0, prepa: 10 });
    const evs = joue(phases);
    const claps = evs.filter((x) => x.type === 'clap');
    const efforts = phases.map((p, i) => (p.kind === 'effort' ? i : -1)).filter((i) => i >= 0);
    expect(claps.map((x) => x.index)).toEqual(efforts);
    expect(claps.every((x) => x.resteS === 10)).toBe(true);
    // préparation et repos de 10 s : aucune claquette, le 3 2 1 reste
    const repos = phases.findIndex((p) => p.kind === 'repos');
    expect(evs.filter((x) => x.type === 'countdown' && x.index === repos).map((x) => x.n)).toEqual([3, 2, 1]);
  });

  it('Tabata 10/20 : effort de 10 s sans claquettes, repos de 20 s avec', () => {
    const phases = tabataPhases({ rounds: 2, work: 10, rest: 20, sets: 1, setRest: 0, prepa: 0 });
    const evs = joue(phases);
    expect(evs.filter((x) => x.type === 'clap').map((x) => phases[x.index].kind)).toEqual(['repos']);
  });

  it('phase de 10 s ou moins : jamais ; 11 s : oui', () => {
    expect(joue([{ kind: 'effort', duration: 10, title: 'a', short: 'a', clap: true }]).some((x) => x.type === 'clap')).toBe(false);
    expect(joue([{ kind: 'repos', duration: 8, title: 'a', short: 'a', clapEtDecompte: true }]).some((x) => x.type === 'clap')).toBe(false);
    expect(joue([{ kind: 'repos', duration: 11, title: 'a', short: 'a', clapEtDecompte: true }]).filter((x) => x.type === 'clap').length).toBe(1);
  });

  it('repos de muscu de 90 s : claquettes à la place du bip des 10 s', () => {
    const evs = joue(musculationPhases(90, 1));
    expect(evs.filter((x) => x.type === 'clap').map((x) => x.resteS)).toEqual([10]);
    expect(evs.filter((x) => x.type === 'warn')).toEqual([]);
    expect(evs.filter((x) => x.type === 'countdown').map((x) => x.n)).toEqual([3, 2, 1]);
  });

  it('phase sans claquettes : le bip des 10 s comme avant', () => {
    const evs = joue([{ kind: 'effort', duration: 40, title: 'a', short: 'a' }]);
    expect(evs.some((x) => x.type === 'clap')).toBe(false);
    expect(evs.filter((x) => x.type === 'warn').length).toBe(1);
  });
});

describe('où les claquettes sont prévues', () => {
  it('chaque chrono qui descend, jamais la préparation ni le contre la montre', () => {
    const r = roundPhases({ rounds: 2, round: 180, rest: 60, prepa: 10, clap: true });
    expect(r.map(claquettesPrevues)).toEqual([false, true, true, true]);
    expect(emomPhases({ minutes: 2, exercises: [], prepa: 0 }).every(claquettesPrevues)).toBe(true);
    expect(amrapPhases({ duration: 600, prepa: 10 }).map(claquettesPrevues)).toEqual([false, true]);
    expect(forTimePhases({ cap: 600, prepa: 0 }).some(claquettesPrevues)).toBe(false);
    const t = tabataPhases({ rounds: 2, work: 20, rest: 10, sets: 2, setRest: 60, prepa: 0 });
    expect(t.filter(claquettesPrevues).map((p) => `${p.kind}${p.duration}`)).toEqual(['effort20', 'effort20', 'repos60', 'effort20', 'effort20']);
  });

  it('sprints guidés : sprints et récups de plus de 10 s', () => {
    const ph = versPhasesChrono([
      { type: 'echauffement', duree: 300 } as any,
      { type: 'sprint', duree: 30, numero: 1, total: 2 } as any,
      { type: 'recup', duree: 90, numero: 1, total: 2 } as any,
      { type: 'sprint', duree: 10, numero: 2, total: 2 } as any,
      { type: 'retour_calme', duree: 300 } as any,
    ]);
    expect(ph.map(claquettesPrevues)).toEqual([false, true, true, false, false]);
  });
});

describe('réglage coupé', () => {
  it('round : rien ; repos ou effort de plus de 30 s : le bip des 10 s d’avant ; effort court : rien', () => {
    expect(sonDixSecondes({ duration: 180, clap: true }, false)).toBeNull();
    expect(sonDixSecondes({ duration: 60 }, false)).toBe('bip');
    expect(sonDixSecondes({ duration: 20 }, false)).toBeNull();
    expect(sonDixSecondes({ duration: 20 }, true)).toBe('clap');
    expect(sonDixSecondes({ duration: 180, clap: true }, true)).toBe('clap');
  });
});

describe('minuteurs hors moteur et vibrations', () => {
  it('le passage des 10 s, vu à temps seulement', () => {
    expect(claquettesAuPassage(90, 10_000)).toBe(true);
    expect(claquettesAuPassage(90, 9_200)).toBe(true);
    expect(claquettesAuPassage(90, 8_000)).toBe(false);
    expect(claquettesAuPassage(90, 10_500)).toBe(false);
    expect(claquettesAuPassage(10, 10_000)).toBe(false);
  });

  it('trois petites vibrations calées sur les coups, annulables', () => {
    const tap = jest.fn();
    tapsClaquettes(tap);
    expect(tap).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(CLAQUETTES_ECART_MS);
    expect(tap).toHaveBeenCalledTimes(2);
    jest.advanceTimersByTime(CLAQUETTES_ECART_MS);
    expect(tap).toHaveBeenCalledTimes(3);
    const tap2 = jest.fn();
    const annuler = tapsClaquettes(tap2);
    annuler();
    jest.advanceTimersByTime(1000);
    expect(tap2).toHaveBeenCalledTimes(1);
  });
});
