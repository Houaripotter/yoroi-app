/**
 * Anneaux d'activite du jour : bouger, exercice, debout (quand la montre le mesure).
 * Trait au pinceau, remplissage anime, legende a cote de chaque anneau.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { thousands } from '@/lib/v2/progres/format';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

const ACircle = Animated.createAnimatedComponent(Circle);

/**
 * Bouger en indigo, exercice en or, debout en mousse : le rouge reste aux records.
 * Trio verifie (clarte, saturation, daltonisme, ecart de teinte) avec le validateur de palette.
 */
export const RING_COLORS = { move: '#4A68A8', exercise: '#C59D45', stand: '#4F7A2A' };
const TRACKS = { move: '#DDE3EF', exercise: '#F1E7CF', stand: '#E4EADB' };

function Ring({ r, stroke, value, color, track, cx, delay }: { r: number; stroke: number; value: number; color: string; track: string; cx: number; delay: number }) {
  const c = 2 * Math.PI * r;
  const p = useSharedValue(0);
  useEffect(() => {
    p.value = withDelay(delay, withTiming(Math.max(0, Math.min(1, value)), { duration: 1100, easing: Easing.out(Easing.cubic) }));
  }, [value, delay, p]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: c * (1 - p.value) }));
  return (
    <G>
      <Circle cx={cx} cy={cx} r={r} stroke={track} strokeWidth={stroke} fill="none" />
      <ACircle
        cx={cx}
        cy={cx}
        r={r}
        stroke={color}
        strokeWidth={stroke}
        fill="none"
        strokeDasharray={`${c} ${c}`}
        animatedProps={props}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cx})`}
      />
    </G>
  );
}

export type RingItem = { key: 'move' | 'exercise' | 'stand'; label: string; value: number | null; goal: number; unit: string };

export function ActivityRings({ items, size = 168 }: { items: RingItem[]; size?: number }) {
  const stroke = Math.round(size * 0.105);
  const gap = Math.round(stroke * 0.28);
  const cx = size / 2;
  return (
    <Svg width={size} height={size}>
      {items.map((it, i) => {
        const r = cx - stroke / 2 - i * (stroke + gap);
        return <Ring key={it.key} r={r} stroke={stroke} cx={cx} value={it.goal > 0 ? (it.value ?? 0) / it.goal : 0} color={RING_COLORS[it.key]} track={TRACKS[it.key]} delay={i * 140} />;
      })}
    </Svg>
  );
}

/** Legende : une ligne par anneau, texte a l'encre, pastille de couleur */
export function RingLegend({ items }: { items: RingItem[] }) {
  return (
    <View style={{ flex: 1, gap: 12 }}>
      {items.map((it) => {
        const pct = it.goal > 0 && it.value !== null ? Math.round((it.value / it.goal) * 100) : null;
        return (
          <View key={it.key} style={{ gap: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: RING_COLORS[it.key] }} />
              <Ink size={13} weight="bold" color={P.ink2}>
                {it.label}
              </Ink>
            </View>
            {it.value === null ? (
              <Ink size={15} weight="extraBold" color={P.muted}>
                En attente
              </Ink>
            ) : (
              <Ink size={21} weight="black" tight numberOfLines={1}>
                {thousands(it.value)}
                <Ink size={13} weight="bold" color={P.muted}>
                  {` / ${thousands(it.goal)} ${it.unit}`}
                </Ink>
              </Ink>
            )}
            {pct !== null && pct >= 100 ? (
              <Ink size={12} weight="extraBold" color="#4F6B28">
                {traduire("Objectif atteint")}</Ink>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/** Petits anneaux de la semaine */
export function MiniRings({ move, exercise, stand, hasStand, size = 34 }: { move: number; exercise: number; stand: number; hasStand: boolean; size?: number }) {
  const vals = hasStand ? [move, exercise, stand] : [move, exercise];
  const keys: ('move' | 'exercise' | 'stand')[] = hasStand ? ['move', 'exercise', 'stand'] : ['move', 'exercise'];
  const stroke = size * 0.13;
  const gap = stroke * 0.3;
  const cx = size / 2;
  return (
    <Svg width={size} height={size}>
      {vals.map((v, i) => {
        const r = cx - stroke / 2 - i * (stroke + gap);
        const c = 2 * Math.PI * r;
        const k = keys[i];
        return (
          <G key={k}>
            <Circle cx={cx} cy={cx} r={r} stroke={TRACKS[k]} strokeWidth={stroke} fill="none" />
            {v > 0 ? (
              <Circle cx={cx} cy={cx} r={r} stroke={RING_COLORS[k]} strokeWidth={stroke} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - Math.min(1, v))} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`} />
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}
