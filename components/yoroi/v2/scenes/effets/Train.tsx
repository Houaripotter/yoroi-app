/**
 * Train lumineux qui traverse de temps en temps : une bande de fenetres eclairees et sa trainee de
 * lumiere, qui passe sur le pont puis laisse la nuit tranquille jusqu'au passage suivant.
 * Une seule vue bouge (la bande entiere), les fenetres sont dessinees une fois.
 * pente : la voie inclinee (le pont du yatai monte vers la droite), la bande suit la voie.
 */
import React from 'react';
import { View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import type { EffetTrain } from '@/lib/v2/scenes/animations';
import { CalqueZone, frac, zonePx } from './commun';
import type { ProprietesEffet } from './commun';

/** Couleur #RRGGBB vers rgba */
function rgba(hex: string, a: number): string {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h.slice(0, 6), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function Train({ effet, temps, cadre }: ProprietesEffet<EffetTrain>) {
  const z = zonePx(effet.zone, cadre);
  const pente = effet.pente ?? 0;
  // voie inclinee : un peu plus longue que la zone, pour entrer et sortir hors du cadre
  const voie = pente ? z.w / Math.cos((pente * Math.PI) / 180) + 2 * z.h : z.w;
  const bw = Math.max(80, z.w * 0.8);
  const { intervalle, traversee, sens } = effet;
  const style = useAnimatedStyle(() => {
    // premier passage deux secondes apres l'ouverture
    const c = frac((temps.value + intervalle - 2) / intervalle) * intervalle;
    if (c > traversee) return { opacity: 0, transform: [{ translateX: -bw * 2 }] };
    const p = c / traversee;
    const x = sens === 1 ? -bw + p * (voie + bw) : voie - p * (voie + bw);
    return { opacity: 1, transform: [{ translateX: x }] };
  });
  const fenetre = bw / effet.fenetres;
  const trainee = sens === 1 ? [rgba(effet.couleur, 0), rgba(effet.couleur, 0.28), rgba(effet.couleur, 0.4)] : [rgba(effet.couleur, 0.4), rgba(effet.couleur, 0.28), rgba(effet.couleur, 0)];
  return (
    <CalqueZone zone={z} coupe={pente === 0}>
      <View style={{ position: 'absolute', left: (z.w - voie) / 2, top: 0, width: voie, height: z.h, overflow: 'hidden', transform: pente ? [{ rotate: `${pente}deg` }] : undefined }}>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: bw, height: z.h }, style]}>
        <LinearGradient colors={trainee as [string, string, string]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ position: 'absolute', left: 0, right: 0, top: z.h * 0.1, bottom: z.h * 0.1, borderRadius: z.h }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', height: z.h }}>
          {Array.from({ length: effet.fenetres }, (_, i) => (
            <View key={i} style={{ width: fenetre * 0.62, marginHorizontal: fenetre * 0.19, height: z.h * 0.5, borderRadius: 1.5, backgroundColor: effet.couleur, opacity: i % 5 === 3 ? 0.55 : 0.92 }} />
          ))}
        </View>
      </Animated.View>
      </View>
    </CalqueZone>
  );
}
