/**
 * Le rond « lecture » (27 octobre 2026). Houari, sur le triangle dans un carré pâle : « moche ». Un rond plein pastel
 * (#DCE3FF, le bouton principal), le triangle bleu nuit plein, centré à l'œil : décalé de 1,5 vers la droite (un
 * triangle centré sur sa boîte paraît trop à gauche), une ombre très douce.
 * LectureRonde est le dessin seul (dans une carte de réponse), BoutonLecture le bouton qui lance la séance.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { tap } from '@/components/yoroi/v2/seances/ui';
import { ombrePastel, usePastel } from '@/components/yoroi/v2/programmes/Habillage';

export function LectureRonde({ taille = 40 }: { taille?: number }) {
  const pa = usePastel();
  const t = Math.round(taille * 0.4);
  return (
    <View style={[{ width: taille, height: taille, borderRadius: taille / 2, backgroundColor: pa.bouton, alignItems: 'center', justifyContent: 'center' }, ombrePastel(pa.ombre)]} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Svg width={t} height={t} viewBox="0 0 16 16" style={{ marginLeft: taille * 0.04 }}>
        <Path d="M4.6 2.6C4.6 1.9 5.4 1.4 6 1.8L13.4 6.9C13.9 7.3 13.9 8.1 13.4 8.5L6 13.6C5.4 14 4.6 13.5 4.6 12.8Z" fill={pa.surBouton} />
      </Svg>
    </View>
  );
}

export function BoutonLecture({ onPress, label, taille = 40 }: { onPress: () => void; label: string; taille?: number }) {
  return (
    <Pressable onPress={() => { tap(); onPress(); }} accessibilityRole="button" accessibilityLabel={label} hitSlop={8} style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}>
      <LectureRonde taille={taille} />
    </Pressable>
  );
}
