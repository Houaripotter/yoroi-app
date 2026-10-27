/**
 * Boutons moins et plus sous les regles de l'onboarding (vague 30, demande de Houari) :
 * un pas entier (1 kg, 1 cm, 5 cm) et un pas fin (0,1 kg), gros et lisibles.
 * Un appui change d'un pas ; un appui long repete, de plus en plus vite, avec une vibration legere a chaque pas.
 * La regle suit toute seule (sa valeur vient du parent).
 */
import React, { useEffect, useRef } from 'react';
import { Pressable, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { useColors } from './ui';
import { traduire } from '@/lib/i18n/tr';

export type PasDef = { delta: number; label: string; a11y: string };

/** Le jeu de boutons du poids : moins 1 kg, moins 0,1, plus 0,1, plus 1 kg */
export const PAS_KG: PasDef[] = [
  { delta: -1, label: traduire('1 kg'), a11y: traduire('Moins 1 kilo') },
  { delta: -0.1, label: '0,1', a11y: traduire('Moins 100 grammes') },
  { delta: 0.1, label: '0,1', a11y: traduire('Plus 100 grammes') },
  { delta: 1, label: traduire('1 kg'), a11y: traduire('Plus 1 kilo') },
];

/** Le jeu de boutons de la taille : moins 5, moins 1, plus 1, plus 5 cm */
export const PAS_CM: PasDef[] = [
  { delta: -5, label: traduire('5 cm'), a11y: traduire('Moins 5 centimètres') },
  { delta: -1, label: traduire('1 cm'), a11y: traduire('Moins 1 centimètre') },
  { delta: 1, label: traduire('1 cm'), a11y: traduire('Plus 1 centimètre') },
  { delta: 5, label: traduire('5 cm'), a11y: traduire('Plus 5 centimètres') },
];

function Bouton({ pas, fort, onStep }: { pas: PasDef; fort: boolean; onStep: (d: number) => void }) {
  const c = useColors();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const count = useRef(0);
  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    count.current = 0;
  };
  useEffect(() => stop, []);
  const step = () => {
    onStep(pas.delta);
    selectionAsync().catch(() => {});
  };
  // repetition : 140 ms au debut, puis 70 ms, puis 40 ms
  const repeat = () => {
    step();
    count.current += 1;
    const wait = count.current < 6 ? 140 : count.current < 20 ? 70 : 40;
    timer.current = setTimeout(repeat, wait);
  };
  const plus = pas.delta > 0;
  const ink = fort ? c.accent : c.ink;
  return (
    <Pressable
      onPress={step}
      onLongPress={repeat}
      delayLongPress={320}
      onPressOut={stop}
      accessibilityRole="button"
      accessibilityLabel={pas.a11y}
      accessibilityHint={traduire("Appui long pour aller plus vite")}
      style={{ flex: 1 }}
    >
      {({ pressed }) => (
        <View
          style={{
            height: 58,
            borderRadius: 18,
            backgroundColor: pressed ? (fort ? c.primary : c.fillSubtle) : fort ? c.accentTint : c.surface,
            borderWidth: fort ? 0 : 1,
            borderColor: c.border,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 4,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          }}
        >
          <Icon name={plus ? 'plus' : 'minus'} size={15} stroke={3} color={pressed && fort ? '#FFFFFF' : ink} />
          <Ink size={16} weight="black" color={pressed && fort ? '#FFFFFF' : ink} numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>{traduire(pas.label)}</Ink>
        </View>
      )}
    </Pressable>
  );
}

/**
 * Rangee de quatre boutons. value et onChange : la valeur est tenue a jour pendant la repetition
 * (ref), bornee par clamp, puis transmise au parent.
 */
export function Pas({ value, onChange, pas, clamp }: { value: number; onChange: (v: number) => void; pas: PasDef[]; clamp: (v: number) => number }) {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  }, [value]);
  const onStep = (d: number) => {
    const next = clamp(Math.round((ref.current + d) * 10) / 10);
    if (next === ref.current) return;
    ref.current = next;
    onChange(next);
  };
  return (
    <View style={{ flexDirection: 'row', gap: 8 }}>
      {pas.map((p, i) => (
        <Bouton key={i} pas={p} fort={i === 0 || i === pas.length - 1} onStep={onStep} />
      ))}
    </View>
  );
}

export default Pas;
