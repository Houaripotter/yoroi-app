/**
 * Pose un dessin d'INRO a sa taille d'origine (w x h) et le met a l'echelle k, dans une boite de w.k x h.k.
 * Les pivots des bras, des jambes et des queues restent ainsi exactement ceux d'INRO.
 */
import React from 'react';
import { View } from 'react-native';

export function Echelle({ w, h, k, children }: { w: number; h: number; k: number; children: React.ReactNode }) {
  return (
    <View style={{ width: w * k, height: h * k }}>
      <View style={{ position: 'absolute', left: (w * k - w) / 2, top: (h * k - h) / 2, width: w, height: h, transform: [{ scale: k }] }}>
        {children}
      </View>
    </View>
  );
}
