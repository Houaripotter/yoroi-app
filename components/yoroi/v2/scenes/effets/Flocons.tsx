/**
 * Neige qui tombe en flottant (balancement de cote), ou braises qui montent du feu et s'eteignent.
 */
import React, { useMemo } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { hasard } from '@/lib/v2/scenes/animations';
import type { EffetFlocons } from '@/lib/v2/scenes/animations';
import { CalqueZone, entre, frac, zonePx } from './commun';
import type { ProprietesEffet } from './commun';

type Flocon = { x0: number; phase: number; duree: number; taille: number; opacite: number; w: number; ph: number; amp: number };

function UnFlocon({ f, temps, hauteur, monte, couleur }: { f: Flocon; temps: SharedValue<number>; hauteur: number; monte: boolean; couleur: string }) {
  const style = useAnimatedStyle(() => {
    const t = temps.value;
    const p = frac(t / f.duree + f.phase);
    const y = monte ? hauteur - p * (hauteur + f.taille) : -f.taille + p * (hauteur + 2 * f.taille);
    const x = f.x0 + f.amp * Math.sin(t * f.w + f.ph);
    // les braises s'allument puis s'eteignent en montant
    const o = monte ? f.opacite * Math.min(1, p * 6) * (1 - p) : f.opacite;
    return { opacity: o, transform: [{ translateX: x }, { translateY: y }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: f.taille, height: f.taille, borderRadius: f.taille / 2, backgroundColor: couleur }, style]} />;
}

export function Flocons({ effet, temps, cadre, graine }: ProprietesEffet<EffetFlocons>) {
  const z = zonePx(effet.zone, cadre);
  const monte = effet.type === 'braises';
  const flocons = useMemo<Flocon[]>(() => {
    const r = hasard(`${graine}-${effet.type}`);
    const [tMin, tMax] = effet.taille;
    return Array.from({ length: effet.nombre }, () => {
      const k = r();
      return {
        x0: r() * z.w,
        phase: r(),
        // les gros flocons, plus proches, tombent un peu plus vite
        duree: effet.duree * entre(k, 1.25, 0.8) * entre(r(), 0.9, 1.1),
        taille: entre(k, tMin, tMax),
        opacite: effet.opacite * entre(r(), 0.5, 1),
        w: entre(r(), 0.5, 1.3) * (monte ? 2.2 : 1),
        ph: r() * Math.PI * 2,
        amp: (effet.derive / 100) * z.w * entre(r(), 0.4, 1),
      };
    });
  }, [graine, effet.type, effet.nombre, effet.duree, effet.taille, effet.derive, effet.opacite, z.w, monte]);
  return (
    <CalqueZone zone={z} coupe={false}>
      {flocons.map((f, i) => (
        <UnFlocon key={i} f={f} temps={temps} hauteur={z.h} monte={monte} couleur={effet.couleur} />
      ))}
    </CalqueZone>
  );
}
