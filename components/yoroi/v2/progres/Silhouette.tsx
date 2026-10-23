/**
 * Silhouette pleine avec les mensurations posees autour (refonte v2).
 * Chaque mesure a son anneau en pointilles sur le corps et une etiquette sobre :
 * le nom, la valeur et l'ecart avec la fois d'avant. En saisie, toucher une etiquette la selectionne.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import type { ViewKey } from '@/lib/v2/progres/measures';
import { traduire, DECIMAL } from '@/lib/i18n/tr';

type Zone = { d: string; left: [number, number]; right: [number, number]; side: 'left' | 'right' };

// Coordonnees dans le repere 110 x 290 du dessin
const ZONES: Record<ViewKey, Zone> = {
  neck: { d: 'M48 44 Q55 47 62 44', left: [48, 44], right: [62, 44], side: 'right' },
  shoulders: { d: 'M14 62 Q55 55 96 62', left: [14, 62], right: [96, 62], side: 'left' },
  chest: { d: 'M24 84 Q55 92 86 84', left: [24, 84], right: [86, 84], side: 'left' },
  arm: { d: 'M89 98 Q95 100 101 98', left: [89, 98], right: [101, 98], side: 'right' },
  waist: { d: 'M29 124 Q55 131 81 124', left: [29, 124], right: [81, 124], side: 'left' },
  navel: { d: 'M28 142 Q55 149 83 142', left: [28, 142], right: [83, 142], side: 'right' },
  hips: { d: 'M24 164 Q55 172 86 164', left: [24, 164], right: [86, 164], side: 'left' },
  thigh: { d: 'M57 204 Q70 208 84 204', left: [57, 204], right: [84, 204], side: 'right' },
  calf: { d: 'M30 250 Q40 253 50 250', left: [30, 250], right: [50, 250], side: 'left' },
};

// Demi-contour (cote droit de l'image), du cou jusqu'a l'entrejambe
const HALF: [number, number][] = [
  [61, 37], [62, 47], [72, 51], [86, 55], [95, 63], [99, 76], [101, 97], [103, 122], [105, 146], [107, 158], [104, 166], [99, 163],
  [97, 148], [94, 124], [91, 100], [87, 82], [84, 96], [82, 110], [81, 124], [83, 142], [86, 160], [86, 178], [84, 204], [80, 232],
  [81, 252], [77, 274], [80, 283], [73, 287], [62, 286], [61, 274], [61, 252], [60, 232], [58, 205], [56, 189],
];

/** Contour lisse ferme a travers les points (Catmull-Rom vers Bezier) */
function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  const at = (i: number) => pts[(i + n) % n];
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2[0]} ${p2[1]}`;
  }
  return `${d} Z`;
}

const BODY_PATH = (() => {
  const right = HALF;
  const left = [...HALF].reverse().map(([x, y]) => [110 - x, y] as [number, number]);
  return smoothClosed([...right, [55, 188], ...left]);
})();

export type SilhouetteItem = {
  key: ViewKey;
  label: string;
  value: string;
  /** ecart avec la mesure d'avant, en centimetres (affiche en discret) */
  delta?: number | null;
  /** ancien champ, plus affiche */
  note?: string;
};

type Props = {
  items: SilhouetteItem[];
  height?: number;
  active?: ViewKey | null;
  onPressItem?: (key: ViewKey) => void;
};

const CALLOUT_H = 42;

function spread(ys: number[], min: number, max: number, gap: number): number[] {
  const out = [...ys];
  for (let i = 1; i < out.length; i++) if (out[i] - out[i - 1] < gap) out[i] = out[i - 1] + gap;
  const overflow = out.length ? out[out.length - 1] - max : 0;
  if (overflow > 0) {
    out[out.length - 1] -= overflow;
    for (let i = out.length - 2; i >= 0; i--) if (out[i + 1] - out[i] < gap) out[i] = out[i + 1] - gap;
  }
  return out.map((y) => Math.max(min, y));
}

function deltaText(d: number | null | undefined): string {
  if (d === null || d === undefined) return '';
  if (Math.abs(d) < 0.25) return '=';
  return `${d < 0 ? '−' : '+'}${Math.abs(d).toFixed(1).replace('.', DECIMAL).replace(',0', '')}`;
}

export function Silhouette({ items, height = 310, active = null, onPressItem }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [width, setWidth] = useState(0);
  const s = (height - 10) / 290;
  const bodyW = 110 * s;
  const bodyX = (width - bodyW) / 2;
  const colW = Math.max(bodyX - 12, 64);

  const placed = useMemo(() => {
    const out: { item: SilhouetteItem; side: 'left' | 'right'; top: number; anchor: [number, number] }[] = [];
    (['left', 'right'] as const).forEach((side) => {
      const list = items
        .filter((it) => ZONES[it.key].side === side)
        .map((it) => {
          const z = ZONES[it.key];
          const p = side === 'left' ? z.left : z.right;
          return { item: it, anchor: [bodyX + p[0] * s, 5 + p[1] * s] as [number, number] };
        })
        .sort((a, b) => a.anchor[1] - b.anchor[1]);
      const tops = spread(
        list.map((l) => l.anchor[1] - CALLOUT_H / 2),
        0,
        height - CALLOUT_H,
        CALLOUT_H + 6,
      );
      list.forEach((l, i) => out.push({ ...l, side, top: tops[i] }));
    });
    return out;
  }, [items, bodyX, s, height]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <>
          <Svg width={width} height={height} style={{ position: 'absolute' }}>
            {placed.map((p) => {
              const ly = p.top + CALLOUT_H / 2;
              const lx = p.side === 'left' ? colW + 4 : width - colW - 4;
              const on = p.item.key === active;
              return <Path key={`lead${p.item.key}`} d={`M${lx} ${ly} L${(lx + p.anchor[0]) / 2} ${ly} L${p.anchor[0]} ${p.anchor[1]}`} stroke={on ? c.accent : '#CFCBC2'} strokeWidth={on ? 1.6 : 1} fill="none" />;
            })}
            <G transform={`translate(${bodyX} 5) scale(${s})`}>
              <Path d={BODY_PATH} fill="#E6E3DC" stroke="#C9C5BB" strokeWidth={1.4} strokeLinejoin="round" />
              <Ellipse cx={55} cy={21} rx={13.5} ry={16} fill="#E6E3DC" stroke="#C9C5BB" strokeWidth={1.4} />
              {(Object.keys(ZONES) as ViewKey[]).map((k) => {
                const has = items.some((it) => it.key === k);
                if (!has) return null;
                const on = k === active;
                return <Path key={k} d={ZONES[k].d} stroke={on ? c.accent : '#3D5D9E'} strokeWidth={on ? 3.6 : 2.4} fill="none" strokeDasharray={on ? undefined : '3 3'} strokeLinecap="round" />;
              })}
            </G>
            {placed.map((p) => (
              <Circle key={`dot${p.item.key}`} cx={p.anchor[0]} cy={p.anchor[1]} r={p.item.key === active ? 3.6 : 2.6} fill={p.item.key === active ? c.accent : '#3D5D9E'} />
            ))}
          </Svg>
          {placed.map((p) => {
            const on = p.item.key === active;
            const dt = deltaText(p.item.delta);
            const body = (
              <View style={{ alignItems: p.side === 'left' ? 'flex-end' : 'flex-start' }}>
                <Ink size={12} weight="bold" color={on ? c.accent : c.textSecondary} numberOfLines={1}>
                  {p.item.label}
                </Ink>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 5 }}>
                  <Ink size={17} weight="black" tight numberOfLines={1}>
                    {p.item.value}
                  </Ink>
                  {dt ? (
                    <Ink size={12} weight="bold" color={c.textMuted} numberOfLines={1}>
                      {dt}
                    </Ink>
                  ) : null}
                </View>
              </View>
            );
            const pos = { position: 'absolute' as const, top: p.top, width: colW, height: CALLOUT_H, justifyContent: 'center' as const, [p.side === 'left' ? 'left' : 'right']: 0 };
            if (!onPressItem) return <View key={p.item.key} style={pos}>{body}</View>;
            return (
              <Pressable key={p.item.key} onPress={() => onPressItem(p.item.key)} accessibilityRole="button" accessibilityLabel={`${p.item.label}, ${p.item.value}${dt && dt !== '=' ? traduire(", {0} centimètre", dt) : ''}`} accessibilityState={{ selected: on }} hitSlop={4} style={pos}>
                {body}
              </Pressable>
            );
          })}
        </>
      ) : null}
    </View>
  );
}
