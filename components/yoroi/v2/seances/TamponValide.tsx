/**
 * 31 octobre 2026 (Houari : « quand la séance du jour a été faite, pose un sticker validé bien visible sur ce jour,
 * pour que je voie d'un coup d'oeil ce qui est fait ») : le tampon « validé » des jours faits, posé en biais sur le
 * coin de la case, qui arrive avec un petit rebond. Sticker existant : objectif_semaine (rosette verte et coche
 * blanche) ; aucun sticker « tampon validé » dédié n'existe dans components/yoroi/v2/stickers.ts.
 * Mêmes règles partout : Ta semaine (onglet Séances), le planning (DayDot) et Je construis le mien.
 * Le rebond suit le réglage du système (mouvement réduit : le tampon apparaît sans bouger).
 */
import React from 'react';
import { Image, View } from 'react-native';
import Animated, { ReduceMotion, ZoomIn } from 'react-native-reanimated';
import { STICKERS } from '@/components/yoroi/v2/stickers';
import { traduire } from '@/lib/i18n/tr';

/** Le sticker utilisé pour un jour validé */
export const STICKER_VALIDE = 'objectif_semaine' as const;

/**
 * Le tampon, à poser dans une case en position absolue (coin haut droit par défaut).
 * delai : pour que les jours d'une semaine se posent l'un après l'autre.
 */
export function TamponValide({ taille = 22, delai = 0, style, angle = -12 }: { taille?: number; delai?: number; style?: object; angle?: number }) {
  return (
    <Animated.View
      entering={ZoomIn.springify().damping(11).stiffness(180).delay(delai).reduceMotion(ReduceMotion.System)}
      pointerEvents="none"
      accessible
      accessibilityLabel={traduire('Validé')}
      style={[{ position: 'absolute', right: -taille * 0.3, top: -taille * 0.32, width: taille, height: taille, zIndex: 2 }, style]}
    >
      <View style={{ transform: [{ rotate: `${angle}deg` }], shadowColor: '#1C6B45', shadowOpacity: 0.22, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
        <Image source={STICKERS[STICKER_VALIDE]} style={{ width: taille, height: taille }} resizeMode="contain" accessibilityIgnoresInvertColors />
      </View>
    </Animated.View>
  );
}
