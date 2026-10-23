/**
 * Nuages ou brume qui defilent lentement : de grandes nappes douces (degrade radial) qui glissent,
 * apparaissent et s'effacent en fondu, sans bord coupe.
 */
import React, { useMemo } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import { hasard } from '@/lib/v2/scenes/animations';
import type { EffetBrume } from '@/lib/v2/scenes/animations';
import { CalqueZone, entre, frac, zonePx } from './commun';
import type { ProprietesEffet } from './commun';

type Nappe = { id: string; w: number; h: number; y: number; phase: number; duree: number; ph: number };

function UneNappe({ n, temps, largeur, sens, opacite, couleur }: { n: Nappe; temps: SharedValue<number>; largeur: number; sens: 1 | -1; opacite: number; couleur: string }) {
  const style = useAnimatedStyle(() => {
    const t = temps.value;
    const p = frac(t / n.duree + n.phase);
    const course = largeur;
    const x = sens === 1 ? -n.w / 2 + p * course : largeur - n.w / 2 - p * course;
    const y = n.y + n.h * 0.04 * Math.sin(t * 0.21 + n.ph);
    return { opacity: Math.sin(Math.PI * p), transform: [{ translateX: x }, { translateY: y }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: n.w, height: n.h }, style]}>
      <Svg width={n.w} height={n.h}>
        <Defs>
          <RadialGradient id={n.id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={couleur} stopOpacity={opacite} />
            <Stop offset="0.55" stopColor={couleur} stopOpacity={opacite * 0.5} />
            <Stop offset="1" stopColor={couleur} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx={n.w / 2} cy={n.h / 2} rx={n.w / 2} ry={n.h / 2} fill={`url(#${n.id})`} />
      </Svg>
    </Animated.View>
  );
}

export function Brume({ effet, temps, cadre, graine }: ProprietesEffet<EffetBrume>) {
  const z = zonePx(effet.zone, cadre);
  const nappes = useMemo<Nappe[]>(() => {
    const r = hasard(`${graine}-brume-${effet.zone.x}-${effet.zone.y}`);
    return Array.from({ length: effet.nappes }, (_, i) => {
      const w = z.w * entre(r(), 0.6, 0.95);
      const h = z.h * entre(r(), 0.55, 1);
      return {
        id: `brume-${graine}-${effet.zone.x}-${effet.zone.y}-${i}`.replace(/[^a-zA-Z0-9_-]/g, ''),
        w,
        h,
        y: r() * (z.h - h),
        // nappes reparties sur le cycle : jamais toutes effacees en meme temps
        phase: i / effet.nappes + entre(r(), -0.08, 0.08),
        duree: effet.duree * entre(r(), 0.85, 1.15),
        ph: r() * Math.PI * 2,
      };
    });
  }, [graine, effet.zone.x, effet.zone.y, effet.nappes, effet.duree, z.w, z.h]);
  return (
    <CalqueZone zone={z} coupe={false}>
      {nappes.map((n) => (
        <UneNappe key={n.id} n={n} temps={temps} largeur={z.w} sens={effet.sens} opacite={effet.opacite} couleur={effet.couleur} />
      ))}
    </CalqueZone>
  );
}
