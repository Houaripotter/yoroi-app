/**
 * Stepper de charge, 17 novembre 2026 (Houari : « que ca monte par 10 seulement apres 10 clics rapides, ou 15 ») :
 * 10 pas normaux, puis 5 kg jusqu'au 15e, puis 10 kg (lib/v2/seances/pasRapide.ts).
 */
import React, { useState } from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Stepper } from '@/components/yoroi/v2/seance/Stepper';

const renderWithProviders = render;
jest.mock('@/components/yoroi', () => ({
  useYoroiTheme: () => ({ theme: { colors: new Proxy({}, { get: () => '#000000' }) } }),
}));
jest.mock('@/components/yoroi/v2/Ink', () => {
  const { Text } = require('react-native');
  return { Ink: ({ children }: any) => <Text>{children}</Text> };
});
jest.mock('@/components/yoroi/v2/seance/Icon', () => ({ Icon: () => null }));
jest.mock('@/components/yoroi/fonts', () => ({ fontStyle: () => ({}) }));

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

let valeurs: number[] = [];
function Charge({ depart = 60 }: { depart?: number }) {
  const [v, setV] = useState(depart);
  return <Stepper layout="stack" value={v} step={1} fine={0.5} saut={10} max={500} decimals unit="kilos" onChange={(n) => { valeurs.push(n); setV(n); }} />;
}


beforeEach(() => {
  valeurs = [];
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-01T10:00:00Z'));
});
const avancer = (ms: number) => act(() => {
  jest.advanceTimersByTime(ms);
});

afterEach(() => {
  jest.useRealTimers();
});

// appuis dont le doigt est pose aux instants donnes (horodatage natif)
const taper = (el: any, temps: number[]) => temps.forEach((t) => {
  fireEvent(el, 'pressIn', { nativeEvent: { timestamp: 100000 + t } });
  fireEvent.press(el);
  fireEvent(el, 'pressOut');
});

const rapides = (n: number, ecart = 150) => Array.from({ length: n }, (_, i) => i * ecart);

describe('Stepper : appuis rapides', () => {
  it('3 appuis rapides : +1, +1, +1 (plus de saut a 10 des le 3e)', () => {
    const r = renderWithProviders(<Charge depart={81} />);
    taper(r.getByLabelText(/^Plus 1 kilos$/), [0, 150, 300]);
    expect(valeurs).toEqual([82, 83, 84]);
  });

  it('17 appuis rapides : 10 fois +1, puis +5 jusqu au 15e, puis +10', () => {
    const r = renderWithProviders(<Charge depart={81} />);
    taper(r.getByLabelText(/^Plus 1 kilos$/), rapides(17));
    expect(valeurs).toEqual([82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 95, 100, 105, 110, 115, 120, 130]);
  });

  it('5 appuis a 330 ms : pas normal', () => {
    const r = renderWithProviders(<Charge depart={81} />);
    taper(r.getByLabelText(/^Plus 1 kilos$/), [0, 330, 660, 990, 1320]);
    expect(valeurs).toEqual([82, 83, 84, 85, 86]);
  });

  it('rafale, pause de 400 ms, appui : retour au pas normal', () => {
    const r = renderWithProviders(<Charge depart={81} />);
    taper(r.getByLabelText(/^Plus 1 kilos$/), [...rapides(12), 11 * 150 + 400]);
    expect(valeurs).toEqual([82, 83, 84, 85, 86, 87, 88, 89, 90, 91, 95, 100, 101]);
  });

  it('le moins suit la meme logique', () => {
    const r = renderWithProviders(<Charge depart={63} />);
    taper(r.getByLabelText(/^Moins 1 kilos$/), rapides(12, 100));
    expect(valeurs).toEqual([62, 61, 60, 59, 58, 57, 56, 55, 54, 53, 50, 45]);
  });

  it('les boutons 0,5 n accelerent jamais', () => {
    const r = renderWithProviders(<Charge />);
    taper(r.getByLabelText(/^Plus 0[.,]5 kilos$/), rapides(14, 50));
    valeurs.forEach((v, i) => expect(v - (i ? valeurs[i - 1] : 60)).toBe(0.5));
  });
});

describe('Stepper : appui maintenu', () => {
  it('10 pas de 1, puis des pas de 5, puis de 10 ; relache : retour au pas normal', () => {
    const r = renderWithProviders(<Charge depart={81} />);
    const plus = r.getByLabelText(/^Plus 1 kilos$/);
    fireEvent(plus, 'pressIn', { nativeEvent: {} });
    avancer(280);
    fireEvent(plus, 'longPress');
    avancer(3200);
    fireEvent(plus, 'pressOut');
    const fin = valeurs[valeurs.length - 1];
    expect(valeurs.slice(0, 10)).toEqual([82, 83, 84, 85, 86, 87, 88, 89, 90, 91]);
    expect(valeurs.slice(10, 15)).toEqual([95, 100, 105, 110, 115]);
    expect(valeurs.some((v, i) => i > 0 && v - valeurs[i - 1] === 10)).toBe(true);
    expect(fin % 10).toBe(0);
    const n = valeurs.length;
    avancer(1000);
    expect(valeurs.length).toBe(n);
    taper(plus, [5000]);
    expect(valeurs[valeurs.length - 1]).toBe(fin + 1);
  });

  it('boutons 0,5 maintenus : jamais de gros pas', () => {
    const r = renderWithProviders(<Charge />);
    const fin = r.getByLabelText(/^Plus 0[.,]5 kilos$/);
    fireEvent(fin, 'pressIn', { nativeEvent: {} });
    fireEvent(fin, 'longPress');
    avancer(3000);
    fireEvent(fin, 'pressOut');
    valeurs.forEach((v, i) => expect(v - (i ? valeurs[i - 1] : 60)).toBe(0.5));
  });

  it('repetitions maintenues (sans saut) : toujours +1, cadence douce', () => {
    let reps: number[] = [];
    function Reps() {
      const [v, setV] = useState(10);
      return <Stepper layout="stack" value={v} step={1} max={200} unit="répétitions" onChange={(n) => { reps.push(n); setV(n); }} />;
    }
    const r = renderWithProviders(<Reps />);
    const plus = r.getByLabelText(/^Plus 1 répétitions$/);
    fireEvent(plus, 'pressIn', { nativeEvent: {} });
    fireEvent(plus, 'longPress');
    // 10 pas a 150 ms : 1,5 s pour les 10 premiers
    avancer(1400);
    expect(reps.length).toBe(10);
    fireEvent(plus, 'pressOut');
    reps.forEach((v, i) => expect(v - (i ? reps[i - 1] : 10)).toBe(1));
    reps = [];
  });
});
