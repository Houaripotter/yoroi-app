/**
 * Pluie fine en diagonale, et eclaboussures discretes au sol.
 * Chaque goutte est un trait fin qui traverse la zone puis repart d'en haut, a sa propre vitesse.
 */
import React, { useMemo } from 'react';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { hasard } from '@/lib/v2/scenes/animations';
import type { EffetEclaboussures, EffetPluie } from '@/lib/v2/scenes/animations';
import { CalqueZone, bruit, entre, frac, zonePx } from './commun';
import type { ProprietesEffet } from './commun';

type Goutte = { x0: number; phase: number; duree: number; longueur: number; opacite: number };

function UneGoutte({ g, temps, hauteur, tanA, angle, couleur }: { g: Goutte; temps: SharedValue<number>; hauteur: number; tanA: number; angle: number; couleur: string }) {
  const style = useAnimatedStyle(() => {
    const p = frac(temps.value / g.duree + g.phase);
    const y = -g.longueur + p * (hauteur + g.longueur);
    return { transform: [{ translateX: g.x0 + y * tanA }, { translateY: y }, { rotate: `${-angle}deg` }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 1.2, height: g.longueur, borderRadius: 1, backgroundColor: couleur, opacity: g.opacite }, style]} />;
}

export function Pluie({ effet, temps, cadre, graine }: ProprietesEffet<EffetPluie>) {
  const z = zonePx(effet.zone, cadre);
  const tanA = Math.tan((effet.angle * Math.PI) / 180);
  const gouttes = useMemo<Goutte[]>(() => {
    const r = hasard(`${graine}-pluie`);
    const L = (effet.longueur / 100) * cadre.h;
    return Array.from({ length: effet.nombre }, () => ({
      x0: entre(r(), -z.h * tanA, z.w),
      phase: r(),
      duree: effet.duree * entre(r(), 0.8, 1.25),
      longueur: L * entre(r(), 0.6, 1.2),
      opacite: effet.opacite * entre(r(), 0.45, 1),
    }));
  }, [graine, effet.nombre, effet.duree, effet.longueur, effet.opacite, cadre.h, z.w, z.h, tanA]);
  return (
    <CalqueZone zone={z}>
      {gouttes.map((g, i) => (
        <UneGoutte key={i} g={g} temps={temps} hauteur={z.h} tanA={tanA} angle={effet.angle} couleur={effet.couleur} />
      ))}
    </CalqueZone>
  );
}

type Eclat = { graine: number; phase: number; periode: number };

function UnEclat({ e, temps, w, h, opacite, couleur }: { e: Eclat; temps: SharedValue<number>; w: number; h: number; opacite: number; couleur: string }) {
  const style = useAnimatedStyle(() => {
    const c = temps.value / e.periode + e.phase;
    const n = Math.floor(c);
    const p = c - n;
    // un nouvel endroit a chaque cycle
    const x = bruit(n * 7.13 + e.graine) * w - 5;
    const y = bruit(n * 3.71 + e.graine * 1.3) * h;
    const k = p < 0.3 ? p / 0.3 : 1;
    const s = 0.3 + 1.1 * k;
    return { opacity: p < 0.3 ? (1 - k) * opacite : 0, transform: [{ translateX: x }, { translateY: y }, { scaleX: s }, { scaleY: s }] };
  });
  return <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: 10, height: 3, borderRadius: 5, borderWidth: 1, borderColor: couleur }, style]} />;
}

export function Eclaboussures({ effet, temps, cadre, graine }: ProprietesEffet<EffetEclaboussures>) {
  const z = zonePx(effet.zone, cadre);
  const eclats = useMemo<Eclat[]>(() => {
    const r = hasard(`${graine}-eclats`);
    return Array.from({ length: effet.nombre }, () => ({ graine: entre(r(), 1, 100), phase: r(), periode: entre(r(), 0.9, 1.7) }));
  }, [graine, effet.nombre]);
  return (
    <CalqueZone zone={z}>
      {eclats.map((e, i) => (
        <UnEclat key={i} e={e} temps={temps} w={z.w} h={z.h} opacite={effet.opacite} couleur={effet.couleur} />
      ))}
    </CalqueZone>
  );
}
