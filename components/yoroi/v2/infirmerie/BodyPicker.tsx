/**
 * Carte du corps de l'infirmerie : la silhouette v2 des blessures (nutrition/BodyMap),
 * avec les zones de l'ancienne carte (memes identifiants, donc memes donnees)
 * replacees sur la silhouette, les blessures en cours marquees par leur niveau,
 * et un appui n'importe ou qui choisit la zone la plus proche.
 */
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { BodyMap } from '@/components/yoroi/v2/nutrition/BodyMap';
import { INITIAL_DATA } from '@/components/BodyMap';
import type { BodyZone as OldZone } from '@/components/BodyMap';
import { intensite, niveauDouleur } from '@/lib/v2/intensite';
import { traduire } from '@/lib/i18n/tr';

// Vague 32 : douleur sur l'echelle d'intensite commune (or, orange, braise), le rouge reste aux records et erreurs
export const LEVEL_COLORS = { light: intensite(3).fill, moderate: intensite(4).fill, severe: intensite(5).fill } as const;

export function levelColor(eva: number): string {
  return intensite(niveauDouleur(eva)).fill;
}

/** couleur du texte pose sur levelColor (contraste AA) */
export function levelOnColor(eva: number): string {
  return intensite(niveauDouleur(eva)).onFill;
}

const Y = 1.6;

// Repere des bras de la silhouette (cote droit de l'image, x sur 100, y sur 100)
const ARM: Record<string, [number, number]> = {
  shoulder: [73, 21],
  shoulder_back: [73, 21],
  biceps: [81, 31],
  triceps: [81, 31],
  elbow: [85, 41],
  elbow_back: [85, 41],
  forearm: [87.5, 49],
  wrist: [90, 57],
  hand: [92, 62],
  thumb: [95, 64],
};

// Correspondance des hauteurs entre l'ancienne image et la silhouette
const Y_ANCHORS: [number, number][] = [
  [0, 0], [6, 6], [18, 15], [26, 24], [50, 53], [72, 78], [91, 92], [96, 97], [100, 100],
];

function mapY(y: number): number {
  for (let i = 1; i < Y_ANCHORS.length; i++) {
    const [a0, b0] = Y_ANCHORS[i - 1];
    const [a1, b1] = Y_ANCHORS[i];
    if (y <= a1) return b0 + ((y - a0) / (a1 - a0)) * (b1 - b0);
  }
  return y;
}

function xFactor(y: number): number {
  if (y < 54) return 1.4;
  if (y < 78) return 1.7 + ((y - 54) / 24) * 0.25;
  return 1.95 + Math.min(1, (y - 78) / 14) * 0.55;
}

export type PlacedZone = OldZone & { sx: number; sy: number };

function place(z: OldZone): PlacedZone {
  const stem = z.id.replace(/_(l|r)$/, '');
  const side = z.x >= 50 ? 1 : -1;
  const arm = ARM[stem];
  if (arm) return { ...z, sx: 50 + side * (arm[0] - 50), sy: arm[1] };
  const sy = mapY(z.y);
  return { ...z, sx: 50 + (z.x - 50) * xFactor(sy), sy };
}

export function BodyPicker({
  view,
  height = 420,
  injured,
  onPick,
}: {
  view: 'front' | 'back';
  height?: number;
  injured: { zone_id: string; zone_view: 'front' | 'back'; eva_score: number }[];
  /** zones candidates, de la plus proche a la plus lointaine */
  onPick: (zones: PlacedZone[]) => void;
}) {
  const drawH = height - 18;
  const width = drawH / Y;
  const zones = useMemo(() => (view === 'front' ? INITIAL_DATA.front : INITIAL_DATA.back).map(place), [view]);
  const marks = injured
    .filter((i) => i.zone_view === view)
    .map((i) => ({ i, z: zones.find((z) => z.id === i.zone_id) }))
    .filter((m): m is { i: typeof injured[number]; z: PlacedZone } => !!m.z);

  const onPress = (e: GestureResponderEvent) => {
    const ux = (e.nativeEvent.locationX / width) * 100;
    const uy = (e.nativeEvent.locationY / drawH) * 100;
    const ranked = zones
      .map((z) => ({ z, d: Math.hypot(z.sx - ux, (z.sy - uy) * Y) }))
      .sort((a, b) => a.d - b.d);
    if (!ranked.length || ranked[0].d > 14) return;
    const best = ranked[0].d;
    const close = ranked.filter((r) => r.d <= best + 3.5).slice(0, 4).map((r) => r.z);
    onPick(close);
  };

  return (
    <View style={{ width, height, alignSelf: 'center' }}>
      <BodyMap view={view} height={height} />
      <Svg width={width} height={drawH} viewBox="0 0 100 160" style={{ position: 'absolute', left: 0, top: 0 }} pointerEvents="none">
        {marks.map(({ i, z }) => {
          const col = levelColor(i.eva_score);
          return (
            <React.Fragment key={`${i.zone_id}-${i.zone_view}`}>
              <Circle cx={z.sx} cy={z.sy * Y} r={7.5} fill={col} fillOpacity={0.18} />
              <Circle cx={z.sx} cy={z.sy * Y} r={3.8} fill={col} stroke="#FFFFFF" strokeWidth={1.3} />
            </React.Fragment>
          );
        })}
      </Svg>
      <Pressable
        onPress={onPress}
        style={{ position: 'absolute', left: 0, top: 0, width, height: drawH }}
        accessibilityRole="button"
        accessibilityLabel={view === 'front' ? traduire('Carte du corps, vue de face. Touche la zone douloureuse.') : traduire('Carte du corps, vue de dos. Touche la zone douloureuse.')}
      />
    </View>
  );
}
