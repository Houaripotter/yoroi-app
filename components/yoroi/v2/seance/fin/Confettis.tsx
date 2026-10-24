/**
 * Petite gerbe de confettis qui part du sceau de validation (24 octobre 2026).
 * Dessinee avec des vues animees (reanimated), une seule avancee partagee, aucune image.
 * Purement decorative : cachee aux lecteurs d'ecran, jamais rendue si les animations sont reduites.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';

const N = 26;

/** Pseudo hasard stable : le meme dessin a chaque rendu */
function h(i: number, k: number): number {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

type Part = { a: number; d: number; w: number; ht: number; rond: boolean; tour: number; couleur: string; chute: number };

function Particule({ p, t }: { p: Part; t: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const v = t.value;
    const e = 1 - Math.pow(1 - v, 3);
    const x = Math.cos(p.a) * p.d * e;
    const y = Math.sin(p.a) * p.d * e + p.chute * v * v;
    const o = v < 0.05 ? v * 20 : v > 0.7 ? Math.max(0, 1 - (v - 0.7) / 0.3) : 1;
    return {
      opacity: o,
      transform: [{ translateX: x }, { translateY: y }, { rotate: `${p.tour * v}deg` }, { scale: v < 0.12 ? 0.4 + v * 5 : 1 }],
    };
  });
  return (
    <Animated.View
      style={[
        { position: 'absolute', left: -p.w / 2, top: -p.ht / 2, width: p.w, height: p.ht, borderRadius: p.rond ? p.w / 2 : 2, backgroundColor: p.couleur },
        style,
      ]}
    />
  );
}

export function Confettis({ x, y, couleurs, delai = 120 }: { x: number; y: number; couleurs: string[]; delai?: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.value = withDelay(delai, withTiming(1, { duration: 1400, easing: Easing.linear }));
  }, [t, delai]);
  const parts: Part[] = Array.from({ length: N }, (_, i) => {
    const rond = h(i, 3) > 0.62;
    const w = rond ? 7 + h(i, 4) * 3 : 5 + h(i, 4) * 3;
    return {
      a: (i / N) * Math.PI * 2 + (h(i, 1) - 0.5) * 0.5,
      d: 70 + h(i, 2) * 110,
      w,
      ht: rond ? w : w * 1.9,
      rond,
      tour: (h(i, 5) - 0.5) * 720,
      couleur: couleurs[i % couleurs.length],
      chute: 40 + h(i, 6) * 50,
    };
  });
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: x, top: y, width: 0, height: 0 }}>
      {parts.map((p, i) => (
        <Particule key={i} p={p} t={t} />
      ))}
    </View>
  );
}
