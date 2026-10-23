/**
 * Carte du corps (face ou dos) au trait de pinceau, avec la zone blessee marquee d'un sceau rouge,
 * et echelle de douleur de 0 a 10 a toucher.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BODY_ZONES_BACK, BODY_ZONES_FRONT } from '@/constants/bodyZones';
import type { BodyZone } from '@/constants/bodyZones';
import { painColor, painWord } from '@/lib/v2/nutrition/formulas';
import { P, tap } from './ui';
import { traduire, LOCALE } from '@/lib/i18n/tr';

export function findZone(zoneId: string, view: 'front' | 'back'): BodyZone | null {
  const list = view === 'back' ? BODY_ZONES_BACK : BODY_ZONES_FRONT;
  const all = [...list, ...(view === 'back' ? BODY_ZONES_FRONT : BODY_ZONES_BACK)];
  const exact = all.find((z) => z.id === zoneId);
  if (exact) return exact;
  const stripped = zoneId.replace(/_\d+$/, '');
  const parts = stripped.split('_');
  const plural = parts.length >= 2 ? `${parts[0]}s_${parts.slice(1).join('_')}` : stripped;
  return all.find((z) => z.id === stripped || z.id === plural) ?? null;
}

const Y = 1.6;

/** « Poignet Droit » devient « Poignet droit » (casse de phrase) */
export function sentenceCase(name: string): string {
  if (!name) return name;
  const lower = name.toLocaleLowerCase(LOCALE);
  return lower.charAt(0).toLocaleUpperCase(LOCALE) + lower.slice(1);
}

// Demi-contour (cote droit de l'image) dans le repere 100 x 160, cale sur les zones de constants/bodyZones
// (y des zones multiplie par 1,6) : poignets en x 10 et 90, chevilles en 35 et 65.
const HALF: [number, number][] = [
  [54, 16.5], [55, 24], [63, 27.5], [72, 30], [77.5, 34], [81, 42], [85, 55], [87, 67], [89.5, 79], [92, 90], [94, 97], [93.5, 104],
  [90.5, 105.5], [88.5, 99], [87.5, 91], [84.5, 79], [80.5, 67], [77, 56], [72.5, 46], [70.5, 56], [68.5, 66], [69, 76], [70.5, 87],
  [69, 100], [67.5, 114], [66, 125], [67, 136], [67.5, 146], [70.5, 152], [71, 157], [61, 157.5], [61.5, 150], [61.5, 145], [60.5, 135],
  [59.5, 125], [58, 112], [55.5, 97], [51.5, 90],
];

function smoothClosed(pts: [number, number][]): string {
  const n = pts.length;
  const at = (i: number) => pts[(i + n) % n];
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(2)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(2)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(2)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(2)} ${p2[0]} ${p2[1]}`;
  }
  return `${d} Z`;
}

const BODY = (() => {
  const left = [...HALF].reverse().map(([x, y]) => [100 - x, y] as [number, number]);
  return smoothClosed([...HALF, [50, 89.5], ...left]);
})();

export function BodyMap({ zoneId, view, color = P.accent, height = 300 }: { zoneId?: string; view: 'front' | 'back'; color?: string; height?: number }) {
  const zone = zoneId ? findZone(zoneId, view) : null;
  const drawH = height - 18;
  const width = drawH / Y;
  const fill = '#E6E3DC';
  const edge = '#CBC7BD';
  return (
    <View style={{ width, height }} accessible accessibilityLabel={zone ? traduire("Zone touchée : {0}, vue {1}", sentenceCase(zone.name), view === 'back' ? 'de dos' : 'de face') : traduire('Carte du corps')}>
      <Svg width={width} height={drawH} viewBox="0 0 100 160">
        <Path d={BODY} fill={fill} stroke={edge} strokeWidth={0.9} strokeLinejoin="round" />
        <Ellipse cx={50} cy={9.4} rx={6.6} ry={7.8} fill={fill} stroke={edge} strokeWidth={0.9} />
        {view === 'back' ? (
          <Path d="M50 30 L50 80" stroke={edge} strokeWidth={0.9} strokeDasharray="2.5 2.5" />
        ) : (
          <G stroke={edge} strokeWidth={0.8} fill="none" strokeLinecap="round">
            <Path d="M41 44 Q45 47 49 45 M51 45 Q55 47 59 44" />
            <Circle cx={50} cy={64} r={0.9} fill={edge} />
          </G>
        )}
        {zone ? (
          <>
            <Circle cx={zone.x} cy={zone.y * Y} r={Math.max(6, zone.size * 0.8)} fill={color} fillOpacity={0.16} />
            <Circle cx={zone.x} cy={zone.y * Y} r={Math.max(3.4, zone.size * 0.38)} fill={color} stroke={P.white} strokeWidth={1.4} />
          </>
        ) : null}
      </Svg>
      <View style={{ height: 18, alignItems: 'center', justifyContent: 'flex-end' }}>
        <Ink size={11} weight="extraBold" color={P.ink2}>
          {view === 'back' ? traduire('Vue de dos') : traduire('Vue de face')}
        </Ink>
      </View>
    </View>
  );
}

/** Echelle de douleur EVA : 11 colonnes de 0 a 10 */
export function PainScale({ value, onChange }: { value: number | null; onChange: (v: number) => void }) {
  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', height: 96 }}>
        {Array.from({ length: 11 }).map((_, v) => {
          const on = value !== null && v <= value;
          const sel = value === v;
          return (
            <Pressable
              key={v}
              onPress={() => {
                tap();
                onChange(v);
              }}
              accessibilityRole="button"
              accessibilityLabel={traduire("Douleur {0} sur 10, {1}", v, painWord(v).toLowerCase())}
              accessibilityState={{ selected: sel }}
              hitSlop={{ top: 10, bottom: 10, left: 1, right: 1 }}
              style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end', height: 96 }}
            >
              <View style={{ width: '78%', height: 22 + v * 6.4, borderRadius: 8, backgroundColor: on ? painColor(v) : P.line, borderWidth: sel ? 3 : 0, borderColor: P.ink }} />
            </Pressable>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        {Array.from({ length: 11 }).map((_, v) => (
          <View key={v} style={{ flex: 1, alignItems: 'center' }}>
            <Ink size={12} weight={value === v ? 'black' : 'bold'} color={value === v ? P.ink : P.ink2}>
              {String(v)}
            </Ink>
          </View>
        ))}
      </View>
    </View>
  );
}
