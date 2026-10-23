/**
 * Lumiere douce : une lanterne ou un lampadaire qui vacille, un soleil qui respire, un feu qui clignote.
 * Un halo en degrade radial pose sur la source de lumiere de l'image ; seule son opacite bouge.
 */
import React from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import type { EffetLueur, PointLueur } from '@/lib/v2/scenes/animations';
import type { ProprietesEffet } from './commun';

function UnHalo({ p, index, total, effet, temps, largeurCadre, hauteurCadre, id }: { p: PointLueur; index: number; total: number; effet: EffetLueur; temps: SharedValue<number>; largeurCadre: number; hauteurCadre: number; id: string }) {
  const R = Math.max(4, (p.r / 100) * largeurCadre);
  const ph = index * 1.7;
  const decalage = p.decalage ?? index / Math.max(1, total);
  const { mode, periode, intensite } = effet;
  const style = useAnimatedStyle(() => {
    const t = temps.value;
    let f = 1;
    let s = 1;
    if (mode === 'vacille') {
      f = 0.78 + 0.12 * Math.sin(t * 6.1 + ph) + 0.07 * Math.sin(t * 13.7 + ph * 1.7) + 0.03 * Math.sin(t * 29.3 + ph * 0.5);
      s = 0.97 + 0.03 * Math.sin(t * 4.3 + ph);
    } else if (mode === 'respire') {
      f = 0.7 + 0.3 * Math.sin((2 * Math.PI * t) / periode + ph);
    } else {
      // clignote : chaque point a son decalage dans le cycle (0,5 : allume quand l'autre est eteint)
      const c = t / periode + decalage;
      const v = Math.sin(2 * Math.PI * (c - Math.floor(c)));
      f = 0.06 + 0.94 * Math.min(1, Math.max(0, v * 3));
    }
    return { opacity: intensite * f, transform: [{ scale: s }] };
  });
  return (
    <Animated.View style={[{ position: 'absolute', left: (p.x / 100) * largeurCadre - R, top: (p.y / 100) * hauteurCadre - R, width: 2 * R, height: 2 * R }, style]}>
      <Svg width={2 * R} height={2 * R}>
        <Defs>
          <RadialGradient id={id} cx="50%" cy="50%" rx="50%" ry="50%">
            <Stop offset="0" stopColor={effet.couleur} stopOpacity={0.95} />
            <Stop offset="0.3" stopColor={effet.couleur} stopOpacity={0.45} />
            <Stop offset="1" stopColor={effet.couleur} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={R} cy={R} r={R} fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

export function Lueur({ effet, temps, cadre, graine }: ProprietesEffet<EffetLueur>) {
  return (
    <>
      {effet.points.map((p, i) => (
        <UnHalo key={i} p={p} index={i} total={effet.points.length} effet={effet} temps={temps} largeurCadre={cadre.w} hauteurCadre={cadre.h} id={`lueur-${graine}-${Math.round(p.x)}-${Math.round(p.y)}-${i}`.replace(/[^a-zA-Z0-9_-]/g, '')} />
      ))}
    </>
  );
}
