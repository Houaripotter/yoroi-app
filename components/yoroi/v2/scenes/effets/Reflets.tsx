/**
 * Reflets d'eau qui ondulent (mer turquoise, Seine, flaques) : de petits traits de lumiere
 * horizontaux qui s'allument, glissent un peu et s'eteignent, plus larges vers le bas (perspective).
 */
import React, { useMemo } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { hasard } from '@/lib/v2/scenes/animations';
import type { EffetReflets } from '@/lib/v2/scenes/animations';
import { CalqueZone, entre, zonePx } from './commun';
import type { ProprietesEffet } from './commun';

type Reflet = { x: number; y: number; w: number; h: number; vit: number; ph: number; amp: number };

function UnReflet({ r, temps, opacite, couleur }: { r: Reflet; temps: SharedValue<number>; opacite: number; couleur: string }) {
  const style = useAnimatedStyle(() => {
    const t = temps.value;
    const s = Math.sin(t * r.vit + r.ph);
    const o = s > 0 ? s * s : 0;
    return { opacity: opacite * o, transform: [{ translateX: r.amp * Math.sin(t * 0.6 + r.ph) }, { scaleX: 0.75 + 0.35 * o }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: r.x, top: r.y, width: r.w, height: r.h, borderRadius: r.h, backgroundColor: couleur }, style]} />;
}

export function Reflets({ effet, temps, cadre, graine }: ProprietesEffet<EffetReflets>) {
  const z = zonePx(effet.zone, cadre);
  const echelle = cadre.w / 360;
  const reflets = useMemo<Reflet[]>(() => {
    const r = hasard(`${graine}-reflets-${effet.zone.y}`);
    return Array.from({ length: effet.nombre }, () => {
      const ry = r();
      const w = entre(r(), 8, 26) * echelle * (0.6 + 0.8 * ry);
      return { x: r() * Math.max(0, z.w - w), y: ry * z.h, w, h: entre(r(), 1.4, 2.4), vit: entre(r(), 0.8, 1.9), ph: r() * Math.PI * 2, amp: entre(r(), 2, 6) * echelle };
    });
  }, [graine, effet.zone.y, effet.nombre, z.w, z.h, echelle]);
  return (
    <CalqueZone zone={z}>
      {reflets.map((x, i) => (
        <UnReflet key={i} r={x} temps={temps} opacite={effet.opacite} couleur={effet.couleur} />
      ))}
    </CalqueZone>
  );
}
