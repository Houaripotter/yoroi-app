/**
 * Etoiles qui scintillent (ou lumieres lointaines d'une ville) : des points fixes dont l'eclat respire,
 * chacun a son rythme.
 */
import React, { useMemo } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { hasard } from '@/lib/v2/scenes/animations';
import type { EffetEtoiles } from '@/lib/v2/scenes/animations';
import { CalqueZone, entre, zonePx } from './commun';
import type { ProprietesEffet } from './commun';

type Etoile = { x: number; y: number; taille: number; base: number; w: number; ph: number };

function UneEtoile({ e, temps, scintillement, couleur }: { e: Etoile; temps: SharedValue<number>; scintillement: number; couleur: string }) {
  const style = useAnimatedStyle(() => {
    const s = 0.5 * (1 + Math.sin(temps.value * e.w + e.ph));
    return { opacity: e.base * (1 - scintillement * 0.75 * s) };
  });
  return <Animated.View style={[{ position: 'absolute', left: e.x, top: e.y, width: e.taille, height: e.taille, borderRadius: e.taille / 2, backgroundColor: couleur }, style]} />;
}

export function Etoiles({ effet, temps, cadre, graine }: ProprietesEffet<EffetEtoiles>) {
  const z = zonePx(effet.zone, cadre);
  const etoiles = useMemo<Etoile[]>(() => {
    const r = hasard(`${graine}-etoiles-${effet.zone.x}-${effet.zone.y}`);
    const [tMin, tMax] = effet.taille;
    return Array.from({ length: effet.nombre }, () => {
      // beaucoup de petites etoiles, quelques grosses
      const k = Math.pow(r(), 2.2);
      return { x: r() * z.w, y: r() * z.h, taille: entre(k, tMin, tMax), base: entre(k, 0.55, 1), w: entre(r(), 0.7, 2.6), ph: r() * Math.PI * 2 };
    });
  }, [graine, effet.zone.x, effet.zone.y, effet.nombre, effet.taille, z.w, z.h]);
  return (
    <CalqueZone zone={z}>
      {etoiles.map((e, i) => (
        <UneEtoile key={i} e={e} temps={temps} scintillement={effet.scintillement} couleur={effet.couleur} />
      ))}
    </CalqueZone>
  );
}
