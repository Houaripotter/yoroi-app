/**
 * Calques mobiles des scenes (19 octobre 2026) : un objet detoure (bateau, passant, balancoire, flamme,
 * bande de nuages) pose sur l'image et anime en code sur l'horloge de la scene
 * (lib/v2/scenes/animations.ts, CalqueMobile). Une seule vue bouge par calque, tout est calcule sur le
 * fil d'affichage : quand l'horloge s'arrete, tout se fige.
 */
import React from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { avanceeTraversee, echelleTraversee } from '@/lib/v2/scenes/animations';
import type { CalqueMobile } from '@/lib/v2/scenes/animations';
import type { Cadre } from './effets';

function frac(x: number): number {
  'worklet';
  return x - Math.floor(x);
}

export function CalqueMobileVue({ calque, source, temps, cadre }: { calque: CalqueMobile; source: ImageSourcePropType; temps: SharedValue<number>; cadre: Cadre }) {
  const z = calque.zone;
  const w = (z.l / 100) * cadre.w;
  const h = (z.h / 100) * cadre.h;
  const x = (z.x / 100) * cadre.w;
  const y = (z.y / 100) * cadre.h;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const pivot = calque.pivot ?? { x: 50, y: 50 };
  // decalage du pivot par rapport au centre du calque, pour tourner autour du bon point
  const px = ((pivot.x - 50) / 100) * w;
  const py = ((pivot.y - 50) / 100) * h;
  const m = calque.mouvement;
  const CW = cadre.w;
  const CH = cadre.h;

  const style = useAnimatedStyle(() => {
    const t = temps.value;
    switch (m.type) {
      case 'traversee': {
        const c = frac((t + m.intervalle - (m.depart ?? 1)) / m.intervalle) * m.intervalle;
        if (c > m.duree) return { opacity: 0, transform: [{ translateX: 0 }, { translateY: 0 }, { scale: 1 }] };
        const p = c / m.duree;
        const s = echelleTraversee(m.echelle, p);
        const q = avanceeTraversee(m.echelle, p);
        const dx = ((m.de.x + (m.vers.x - m.de.x) * q) / 100) * CW - cx;
        const rebond = m.pas ? -Math.abs(Math.sin(t * Math.PI * 1.9)) * (m.pas / 100) * h * s : 0;
        const dy = ((m.de.y + (m.vers.y - m.de.y) * q) / 100) * CH - cy + rebond;
        // entree et sortie en fondu court : le calque ne surgit pas d'un coup
        const o = Math.min(1, p * 10, (1 - p) * 10);
        return { opacity: o, transform: [{ translateX: dx }, { translateY: dy }, { scale: s }] };
      }
      case 'balancier':
      case 'roulis': {
        const a = Math.sin((t / m.periode) * Math.PI * 2) * m.amplitude;
        return { opacity: 1, transform: [{ translateX: px }, { translateY: py }, { rotate: `${a}deg` }, { translateX: -px }, { translateY: -py }] };
      }
      case 'flamme': {
        // trois sinus de periodes differentes : un mouvement qui ne se repete pas
        const k = (t / m.periode) * Math.PI * 2;
        const e = Math.sin(k) * 0.6 + Math.sin(k * 1.73 + 1.1) * 0.3 + Math.sin(k * 2.9 + 2.3) * 0.25;
        const sy = 1 + e * m.amplitude;
        const sx = 1 - e * m.amplitude * 0.45;
        const penche = (Math.sin(k * 0.71 + 0.4) * 0.7 + Math.sin(k * 1.37) * 0.3) * m.amplitude * 40;
        return { opacity: 1, transform: [{ translateX: px }, { translateY: py }, { skewX: `${penche}deg` }, { scaleX: sx }, { scaleY: sy }, { translateX: -px }, { translateY: -py }] };
      }
      case 'clignote': {
        const c = frac(t / m.periode + (m.decalage ?? 0));
        let v = m.repos;
        if (m.forme === 'carre') v = c < 0.5 ? m.repos : m.eclat;
        else if (m.forme === 'eclats') v = c < 0.025 || (c > 0.05 && c < 0.07) || (c > 0.1 && c < 0.115) ? m.eclat : m.repos;
        else v = m.repos + (m.eclat - m.repos) * (0.5 - 0.5 * Math.cos(c * Math.PI * 2));
        return { opacity: v, transform: [{ translateX: 0 }] };
      }
      case 'defile': {
        const per = (m.periode / 100) * CW;
        const c = frac(t / m.duree);
        return { opacity: 1, transform: [{ translateX: m.sens === -1 ? -c * per : -per + c * per }] };
      }
      default:
        return { opacity: 1, transform: [{ translateX: 0 }] };
    }
  });

  if (m.type === 'fixe') {
    return <Image source={source} style={{ position: 'absolute', left: x, top: y, width: w, height: h }} resizeMode="stretch" />;
  }

  if (m.type === 'defile') {
    const largeur = (m.largeur / 100) * CW;
    return (
      <View pointerEvents="none" style={{ position: 'absolute', left: x, top: y, width: w, height: h, overflow: 'hidden' }}>
        <Animated.View style={[{ position: 'absolute', left: 0, top: 0, width: largeur, height: h }, style]}>
          <Image source={source} style={{ width: largeur, height: h }} resizeMode="stretch" />
        </Animated.View>
      </View>
    );
  }

  const vue = (
    <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: x, top: y, width: w, height: h }, style]}>
      <Image source={source} style={{ width: w, height: h }} resizeMode="stretch" />
    </Animated.View>
  );
  if (!calque.coupe) return vue;
  // rectangle de coupe : le calque n'est visible que dedans (coordonnees remises dans la coupe)
  const k = calque.coupe;
  const kx = (k.x / 100) * CW;
  const ky = (k.y / 100) * CH;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: kx, top: ky, width: (k.l / 100) * CW, height: (k.h / 100) * CH, overflow: 'hidden' }}>
      <View style={{ position: 'absolute', left: -kx, top: -ky, width: CW, height: CH }}>{vue}</View>
    </View>
  );
}
