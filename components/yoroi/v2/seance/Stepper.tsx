/**
 * Reglage d'une valeur : boutons - et + (appui long pour defiler vite) et saisie directe en touchant le chiffre.
 * 16 octobre : `fine` ajoute deux petits boutons de reglage fin sous les gros (les kilos : pas de 2, et 0,5).
 */
import React, { useEffect, useRef, useState } from 'react';
import { Pressable, TextInput, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fontStyle } from '@/components/yoroi/fonts';
import { fmtNum, parseNum } from '@/lib/v2/seance/format';
import { Icon } from './Icon';
import { traduire } from '@/lib/i18n/tr';

type Props = {
  value: number;
  step: number;
  min?: number;
  max?: number;
  onChange: (v: number) => void;
  /** nom lu par le lecteur d'ecran ("kilos", "repetitions") */
  unit: string;
  size?: number;
  decimals?: boolean;
  format?: (v: number) => string;
  hint?: string;
  dark?: boolean;
  /** taille des boutons, 34 pour la version compacte */
  button?: number;
  /** 'stack' : gros chiffre au-dessus, deux larges boutons dessous (saisie en salle, mains moites) */
  layout?: 'row' | 'stack';
  /** pas fin, en deux petits boutons sous les gros (0,5 pour les kilos) */
  fine?: number;
};

export function Stepper({ value, step, min = 0, max = 9999, onChange, unit, size = 26, decimals = false, format, hint, dark = false, button = 38, layout = 'row', fine }: Props) {
  const stack = layout === 'stack';
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const valueRef = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const repeats = useRef(0);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => () => stop(), []);

  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v * 100) / 100));

  const bump = (dir: 1 | -1, amount: number = step) => {
    const next = clamp(valueRef.current + dir * amount);
    if (next === valueRef.current) return false;
    valueRef.current = next;
    onChange(next);
    selectionAsync().catch(() => {});
    return true;
  };

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    repeats.current = 0;
  }

  const startRepeat = (dir: 1 | -1, amount: number = step) => {
    stop();
    const tick = () => {
      if (!bump(dir, amount)) return stop();
      repeats.current += 1;
      const delay = repeats.current > 12 ? 45 : repeats.current > 5 ? 80 : 130;
      timer.current = setTimeout(tick, delay);
    };
    tick();
  };

  const commit = () => {
    const n = parseNum(text);
    if (n !== null) onChange(clamp(decimals ? n : Math.round(n)));
    setEditing(false);
  };

  const btnBg = dark ? 'rgba(255,255,255,0.12)' : c.fillSoft;
  const ink = dark ? c.onDark : c.ink;
  const shown = format ? format(value) : fmtNum(value);

  const renderBtn = (dir: 1 | -1) => (
    <Pressable
      key={dir}
      onPress={() => bump(dir)}
      onLongPress={() => startRepeat(dir)}
      onPressOut={stop}
      delayLongPress={280}
      hitSlop={button < 44 ? (44 - button) / 2 : 0}
      accessibilityRole="button"
      accessibilityLabel={`${dir > 0 ? 'Plus' : traduire('Moins')} ${fmtNum(step)} ${unit}`}
      style={({ pressed }) => ({ width: stack ? undefined : button, flex: stack ? 1 : undefined, height: button, borderRadius: stack ? 14 : button * 0.32, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.border : btnBg })}
    >
      <Icon name={dir > 0 ? 'plus' : 'minus'} size={stack ? 22 : 18} color={ink} strokeWidth={2.8} />
    </Pressable>
  );

  // petits boutons de reglage fin : discrets, mais 44 points de zone de toucher
  const renderFine = (dir: 1 | -1) => (
    <Pressable
      key={`fin${dir}`}
      onPress={() => bump(dir, fine)}
      onLongPress={() => startRepeat(dir, fine)}
      onPressOut={stop}
      delayLongPress={280}
      hitSlop={{ top: 6, bottom: 6 }}
      accessibilityRole="button"
      accessibilityLabel={`${dir > 0 ? 'Plus' : traduire('Moins')} ${fmtNum(fine ?? 0)} ${unit}`}
      style={({ pressed }) => ({ flex: stack ? 1 : undefined, minWidth: stack ? undefined : 52, height: 32, paddingHorizontal: 8, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: dark ? 'rgba(255,255,255,0.18)' : c.border, backgroundColor: pressed ? (dark ? 'rgba(255,255,255,0.12)' : c.fillSoft) : 'transparent' })}
    >
      <Ink size={13} weight="bold" color={dark ? c.onDarkSecondary : c.textSecondary} style={{ fontVariant: ['tabular-nums'] }}>{`${dir > 0 ? '+' : '\u2212'}${fmtNum(fine ?? 0)}`}</Ink>
    </Pressable>
  );
  const fineRow = fine ? (
    <View style={{ flexDirection: 'row', alignSelf: stack ? 'stretch' : 'center', gap: 6, marginTop: 2 }}>
      {renderFine(-1)}
      {renderFine(1)}
    </View>
  ) : null;

  const field = editing ? (
    <TextInput
      value={text}
      onChangeText={setText}
      autoFocus
      selectTextOnFocus
      keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
      returnKeyType="done"
      onSubmitEditing={commit}
      onBlur={commit}
      accessibilityLabel={unit}
      style={[fontStyle('black'), { minWidth: 80, textAlign: 'center', fontSize: size, color: ink, paddingVertical: 0, borderBottomWidth: 2, borderColor: c.accent }]}
    />
  ) : (
    <Pressable
      onPress={() => {
        setText(fmtNum(value));
        setEditing(true);
      }}
      accessibilityRole="button"
      accessibilityLabel={traduire("{0} {1}, toucher pour saisir", shown, unit)}
      style={{ alignSelf: 'stretch', minHeight: 48, alignItems: 'center', justifyContent: 'center' }}
    >
      <Ink size={size} weight="black" tight color={ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7} style={{ fontVariant: ['tabular-nums'] }}>{shown}</Ink>
    </Pressable>
  );

  if (stack) {
    return (
      <View style={{ alignSelf: 'stretch', alignItems: 'center', gap: 4 }}>
        {field}
        {hint ? <Ink size={11} color={dark ? c.onDarkSecondary : c.textMuted} numberOfLines={1}>{hint}</Ink> : null}
        <View style={{ flexDirection: 'row', alignSelf: 'stretch', gap: 6, marginTop: 2 }}>
          {renderBtn(-1)}
          {renderBtn(1)}
        </View>
        {fineRow}
      </View>
    );
  }

  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {renderBtn(-1)}
        {editing ? (
          <TextInput
            value={text}
            onChangeText={setText}
            autoFocus
            selectTextOnFocus
            keyboardType={decimals ? 'decimal-pad' : 'number-pad'}
            returnKeyType="done"
            onSubmitEditing={commit}
            onBlur={commit}
            accessibilityLabel={unit}
            style={[fontStyle('black'), { minWidth: button + 12, textAlign: 'center', fontSize: size, color: ink, paddingVertical: 0, borderBottomWidth: 2, borderColor: c.accent }]}
          />
        ) : (
          <Pressable
            onPress={() => {
              setText(fmtNum(value));
              setEditing(true);
            }}
            accessibilityRole="button"
            accessibilityLabel={traduire("{0} {1}, toucher pour saisir", shown, unit)}
            style={{ minWidth: button + 12, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}
          >
            <Ink size={size} weight="black" tight color={ink} style={{ fontVariant: ['tabular-nums'] }}>{shown}</Ink>
          </Pressable>
        )}
        {renderBtn(1)}
      </View>
      {hint ? <Ink size={11} color={dark ? c.onDarkSecondary : c.textMuted} numberOfLines={1}>{hint}</Ink> : null}
      {fineRow}
    </View>
  );
}
