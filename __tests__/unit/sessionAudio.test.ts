/**
 * Session audio des sons de seance (lib/v2/sons/sessionAudio.ts), 17 novembre 2026, retour de Houari :
 * « les seances me coupent la musique ». La musique baisse le temps du son puis remonte, jamais coupee.
 */
const mockMode = jest.fn((_m: unknown) => Promise.resolve());
const ecouteurs: ((st: { didJustFinish?: boolean }) => void)[] = [];
const mockPause = jest.fn();
const mockPlay = jest.fn();
jest.mock('expo-audio', () => ({
  setAudioModeAsync: (m: unknown) => mockMode(m),
  createAudioPlayer: jest.fn(() => ({
    play: mockPlay,
    pause: mockPause,
    seekTo: jest.fn(() => Promise.resolve()),
    volume: 1,
    remove: jest.fn(),
    addListener: jest.fn((_e: string, f: (st: { didJustFinish?: boolean }) => void) => {
      ecouteurs.push(f);
      return { remove: jest.fn() };
    }),
  })),
}));
jest.mock('@/lib/v2/sons/reglage', () => ({ sonsActifs: () => true }));

import { DUREE_MAX_BAISSE_MS, MODE_SON_COURT, MODE_SON_LONG, modePourSon, rendreLaMainApres } from '@/lib/v2/sons/sessionAudio';
import { playClapSound, playGongSound, playWizzSound } from '@/lib/soundManager';

describe('modes', () => {
  it('sons courts : duckOthers, jamais doNotMix, tous les champs donnes', () => {
    expect(MODE_SON_COURT).toEqual({ playsInSilentMode: true, shouldPlayInBackground: true, allowsRecording: false, shouldRouteThroughEarpiece: false, interruptionMode: 'duckOthers' });
    expect(modePourSon('court').interruptionMode).toBe('duckOthers');
  });
  it('sons longs : mixWithOthers', () => {
    expect(MODE_SON_LONG.interruptionMode).toBe('mixWithOthers');
    expect(modePourSon('long')).toBe(MODE_SON_LONG);
  });
});

describe('rendre la main', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  it('a la fin du son, le lecteur passe en pause (session rendue, musique qui remonte)', () => {
    let f: ((st: { didJustFinish?: boolean }) => void) | null = null;
    const l = { pause: jest.fn(), addListener: jest.fn((_e: 'playbackStatusUpdate', g: (st: { didJustFinish?: boolean }) => void) => { f = g; return { remove: jest.fn() }; }) };
    rendreLaMainApres(l);
    f!({ didJustFinish: false });
    expect(l.pause).not.toHaveBeenCalled();
    f!({ didJustFinish: true });
    expect(l.pause).toHaveBeenCalledTimes(1);
    jest.advanceTimersByTime(DUREE_MAX_BAISSE_MS + 10);
    expect(l.pause).toHaveBeenCalledTimes(1);
  });
  it('sans fin annoncee : garde fou', () => {
    const l = { pause: jest.fn() };
    rendreLaMainApres(l, 1000);
    jest.advanceTimersByTime(999);
    expect(l.pause).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2);
    expect(l.pause).toHaveBeenCalledTimes(1);
  });
  it('le meme son relance : l ancienne lecture ne coupe pas la nouvelle', () => {
    const l = { pause: jest.fn() };
    rendreLaMainApres(l, 1000);
    jest.advanceTimersByTime(500);
    rendreLaMainApres(l, 1000);
    jest.advanceTimersByTime(600);
    expect(l.pause).not.toHaveBeenCalled();
    jest.advanceTimersByTime(500);
    expect(l.pause).toHaveBeenCalledTimes(1);
  });
});

describe('sons de la seance', () => {
  beforeEach(() => {
    mockMode.mockClear();
    mockPause.mockClear();
    mockPlay.mockClear();
    ecouteurs.length = 0;
  });
  it('claquettes et wizz : le mode est regle avant chaque son, en duckOthers, puis la main est rendue', async () => {
    await playClapSound();
    await playWizzSound();
    await playClapSound();
    expect(mockMode).toHaveBeenCalledTimes(3);
    for (const [m] of mockMode.mock.calls) expect((m as { interruptionMode: string }).interruptionMode).toBe('duckOthers');
    expect(mockPlay).toHaveBeenCalledTimes(3);
    ecouteurs.forEach((f) => f({ didJustFinish: true }));
    expect(mockPause).toHaveBeenCalled();
  });
  it('le gong (54 s) se melange sans baisser la musique', async () => {
    await playGongSound();
    expect((mockMode.mock.calls[0][0] as { interruptionMode: string }).interruptionMode).toBe('mixWithOthers');
  });
});
