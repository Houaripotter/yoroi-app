/**
 * Corps illustre avec les mensurations posees autour (30 octobre 2026, remplace l'ancien bonhomme gris).
 * Carte des muscles bleu ardoise (style des apps de musculation), sans visage, sans cheveux ni couleur de peau, pour que personne ne se sente exclu.
 * Il suit le genre du profil : homme, ou femme (assets/corps/mensurations, generes avec Gemini).
 * Chaque mesure a son trait en pointilles pose sur le corps et une etiquette sobre :
 * le nom, la valeur et l'ecart avec la fois d'avant. En saisie, toucher une etiquette la selectionne.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImageSourcePropType, LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, Ellipse, Path, RadialGradient, Stop } from 'react-native-svg';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import type { ViewKey } from '@/lib/v2/progres/measures';
import { traduire, traduireSens, DECIMAL } from '@/lib/i18n/tr';
import { getUserSettings } from '@/lib/storage';
import { genreDesReglages } from '@/lib/genreCalcul';

type Pt = [number, number];
/** l et r : les deux bouts du trait sur le corps ; creux : de combien le trait plonge au milieu (tour vu de face) */
type Zone = { l: Pt; r: Pt; creux: number; side: 'left' | 'right' };
type Corps = { src: ImageSourcePropType; w: number; h: number; zones: Record<ViewKey, Zone> };

// Coordonnees en pixels de l'illustration detouree (homme 1290 x 2407, femme 1292 x 2430),
// relevees sur le contour reel de la carte des muscles.
const HOMME: Corps = {
  src: require('@/assets/corps/mensurations/homme.webp'),
  w: 1290,
  h: 2407,
  zones: {
    neck: { l: [563, 345], r: [727, 345], creux: 14, side: 'right' },
    shoulders: { l: [294, 590], r: [996, 590], creux: -30, side: 'left' },
    chest: { l: [420, 680], r: [884, 680], creux: 30, side: 'left' },
    arm: { l: [895, 747], r: [1022, 743], creux: 12, side: 'right' },
    // Avant-bras : sous le coude, au plus large, sur le meme bras que le tour de bras, trait perpendiculaire au bras
    forearm: { l: [948, 965], r: [1090, 909], creux: 12, side: 'right' },
    waist: { l: [456, 895], r: [835, 895], creux: 26, side: 'left' },
    navel: { l: [446, 965], r: [845, 965], creux: 28, side: 'right' },
    hips: { l: [396, 1290], r: [894, 1290], creux: 34, side: 'left' },
    thigh: { l: [668, 1420], r: [901, 1420], creux: 16, side: 'right' },
    calf: { l: [397, 1900], r: [565, 1900], creux: 14, side: 'left' },
  },
};

const FEMME: Corps = {
  src: require('@/assets/corps/mensurations/femme.webp'),
  w: 1292,
  h: 2430,
  zones: {
    neck: { l: [567, 380], r: [726, 380], creux: 12, side: 'right' },
    shoulders: { l: [319, 600], r: [974, 600], creux: -30, side: 'left' },
    chest: { l: [438, 690], r: [860, 690], creux: 30, side: 'left' },
    arm: { l: [874, 762], r: [1006, 758], creux: 12, side: 'right' },
    forearm: { l: [948, 976], r: [1080, 924], creux: 12, side: 'right' },
    waist: { l: [477, 920], r: [816, 920], creux: 24, side: 'left' },
    navel: { l: [455, 990], r: [838, 990], creux: 28, side: 'right' },
    hips: { l: [386, 1290], r: [907, 1290], creux: 34, side: 'left' },
    thigh: { l: [670, 1420], r: [908, 1420], creux: 16, side: 'right' },
    calf: { l: [399, 1900], r: [561, 1900], creux: 14, side: 'left' },
  },
};

/** Le dessin du profil : femme si le profil le dit, homme sinon (aussi en neutre, comme les autres ecrans) */
function useCorps(): Corps {
  const [femme, setFemme] = useState(false);
  useEffect(() => {
    let vivant = true;
    getUserSettings()
      .then((s) => {
        if (vivant) setFemme(genreDesReglages(s) === 'female');
      })
      .catch(() => {});
    return () => {
      vivant = false;
    };
  }, []);
  return femme ? FEMME : HOMME;
}

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
/** largeur minimale d'une colonne d'etiquettes */
const COL_MIN = 92;
const BLEU = '#3D5D9E';

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
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const corps = useCorps();
  const [width, setWidth] = useState(0);
  // Le corps retrecit un peu sur petit ecran pour laisser la place aux etiquettes (« à mesurer » en entier)
  const imgH = Math.min(height - 10, (Math.max(0, width - 2 * COL_MIN - 16) * corps.h) / corps.w);
  const top0 = (height - imgH) / 2;
  const s = imgH / corps.h;
  const bodyW = corps.w * s;
  const bodyX = (width - bodyW) / 2;
  const colW = Math.max(bodyX - 8, 64);
  const at = (p: Pt): Pt => [bodyX + p[0] * s, top0 + p[1] * s];

  const placed = useMemo(() => {
    const out: { item: SilhouetteItem; side: 'left' | 'right'; top: number; anchor: Pt }[] = [];
    (['left', 'right'] as const).forEach((side) => {
      const list = items
        .filter((it) => corps.zones[it.key].side === side)
        .map((it) => {
          const z = corps.zones[it.key];
          const p = side === 'left' ? z.l : z.r;
          return { item: it, anchor: at(p) };
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
  }, [items, bodyX, s, top0, height, corps]);

  const onLayout = (e: LayoutChangeEvent) => setWidth(Math.round(e.nativeEvent.layout.width));

  const trait = (k: ViewKey) => {
    const z = corps.zones[k];
    const a = at(z.l);
    const b = at(z.r);
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2 + z.creux * s * 2;
    return `M${a[0].toFixed(1)} ${a[1].toFixed(1)} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`;
  };

  return (
    <View onLayout={onLayout} style={{ height }}>
      {width > 0 ? (
        <>
          {isDark ? (
            // En sombre, un halo doux derriere le corps pour que le contour bleu nuit se detache
            <Svg width={width} height={height} style={{ position: 'absolute' }} pointerEvents="none">
              <Defs>
                <RadialGradient id="haloCorps" cx="50%" cy="50%" r="50%">
                  <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.16} />
                  <Stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
                </RadialGradient>
              </Defs>
              <Ellipse cx={width / 2} cy={height / 2} rx={bodyW * 0.85} ry={height * 0.52} fill="url(#haloCorps)" />
            </Svg>
          ) : null}
          <Image
            source={corps.src}
            style={{ position: 'absolute', left: bodyX, top: top0, width: bodyW, height: imgH }}
            resizeMode="contain"
            accessibilityIgnoresInvertColors
            accessible={false}
          />
          <Svg width={width} height={height} style={{ position: 'absolute' }} pointerEvents="none">
            {placed.map((p) => {
              const ly = p.top + CALLOUT_H / 2;
              const lx = p.side === 'left' ? colW + 4 : width - colW - 4;
              const on = p.item.key === active;
              return <Path key={`lead${p.item.key}`} d={`M${lx} ${ly} L${(lx + p.anchor[0]) / 2} ${ly} L${p.anchor[0]} ${p.anchor[1]}`} stroke={on ? c.accent : isDark ? '#6B6F7A' : '#CFCBC2'} strokeWidth={on ? 1.6 : 1} fill="none" />;
            })}
            {(Object.keys(corps.zones) as ViewKey[]).map((k) => {
              if (!items.some((it) => it.key === k)) return null;
              const on = k === active;
              const d = trait(k);
              return (
                <React.Fragment key={k}>
                  <Path d={d} stroke="#FFFFFF" strokeOpacity={0.85} strokeWidth={on ? 5.4 : 4.2} fill="none" strokeLinecap="round" />
                  <Path d={d} stroke={on ? c.accent : BLEU} strokeWidth={on ? 3 : 2.2} fill="none" strokeDasharray={on ? undefined : '4 3'} strokeLinecap="round" />
                </React.Fragment>
              );
            })}
            {placed.map((p) => {
              const on = p.item.key === active;
              return <Circle key={`dot${p.item.key}`} cx={p.anchor[0]} cy={p.anchor[1]} r={on ? 4 : 3} fill={on ? c.accent : BLEU} stroke="#FFFFFF" strokeWidth={1.4} />;
            })}
          </Svg>
          {placed.map((p) => {
            const on = p.item.key === active;
            const dt = deltaText(p.item.delta);
            const body = (
              <View style={{ alignItems: p.side === 'left' ? 'flex-end' : 'flex-start' }}>
                <Ink size={12} weight="bold" color={on ? c.accent : c.textSecondary} numberOfLines={1}>
                  {traduireSens('tour', p.item.label)}
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
              <Pressable key={p.item.key} onPress={() => onPressItem(p.item.key)} accessibilityRole="button" accessibilityLabel={`${traduireSens('tour', p.item.label)}, ${p.item.value}${dt && dt !== '=' ? traduire(", {0} centimètre", dt) : ''}`} accessibilityState={{ selected: on }} hitSlop={4} style={pos}>
                {body}
              </Pressable>
            );
          })}
        </>
      ) : null}
    </View>
  );
}
