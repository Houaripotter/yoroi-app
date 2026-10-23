/**
 * Outils communs des effets de scene (18 octobre 2026).
 * Une seule horloge par scene (temps, en secondes, sur le fil d'affichage) : chaque particule calcule
 * sa position a partir de ce temps. Quand l'horloge s'arrete, tout se fige sans rien recalculer.
 */
import React from 'react';
import { View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import type { Zone } from '@/lib/v2/scenes/animations';

export type Cadre = { w: number; h: number };

export type ProprietesEffet<E> = {
  effet: E;
  temps: SharedValue<number>;
  cadre: Cadre;
  /** graine du tirage des positions : meme scene, memes positions */
  graine: string;
};

export type ZonePx = { x: number; y: number; w: number; h: number };

export function zonePx(z: Zone, c: Cadre): ZonePx {
  return { x: (z.x / 100) * c.w, y: (z.y / 100) * c.h, w: (z.l / 100) * c.w, h: (z.h / 100) * c.h };
}

/** Partie decimale */
export function frac(x: number): number {
  'worklet';
  return x - Math.floor(x);
}

/** Nombre pseudo aleatoire entre 0 et 1 tire d'un entier, calculable sur le fil d'affichage */
export function bruit(n: number): number {
  'worklet';
  const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
  return s - Math.floor(s);
}

/** Entre a et b */
export function entre(r: number, a: number, b: number): number {
  return a + r * (b - a);
}

/** Calque pose sur une zone du cadre, rien ne depasse si coupe */
export function CalqueZone({ zone, coupe = true, children }: { zone: ZonePx; coupe?: boolean; children: React.ReactNode }) {
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: zone.x, top: zone.y, width: zone.w, height: zone.h, overflow: coupe ? 'hidden' : 'visible' }}>
      {children}
    </View>
  );
}
