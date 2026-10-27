/**
 * Vague 40 : l'armure qui se construit (remplace les plaques kozane).
 * La piece du palier suivant, en ombre douce, se devoile en couleurs de bas en haut a mesure que l'XP monte :
 * un tiers du chemin par etape. Un eclat dore passe quand une etape vient d'etre gagnee.
 */
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Image, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import type { PieceArmure } from '@/lib/v2/dojo/pieces';
import { traduire } from '@/lib/i18n/tr';

export type ArmureEnConstructionProps = {
  piece: PieceArmure;
  /** part devoilee, 0 a 1 */
  progres: number;
  /** hauteur de la piece en points */
  taille?: number;
  /** 'sombre' sur un fond de nuit (celebration) */
  ton?: 'auto' | 'sombre';
  /** joue l'eclat dore une fois a l'affichage */
  eclat?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

export function ArmureEnConstruction({ piece, progres, taille = 96, ton = 'auto', eclat = false, style, accessibilityLabel }: ArmureEnConstructionProps) {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const nuit = ton === 'sombre' || !!isDark;
  const h = Math.round(taille);
  const w = Math.round(h * piece.ratio);
  const p = Math.max(0, Math.min(1, progres));
  // la piece se devoile doucement jusqu'a sa part gagnee
  const reveal = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(reveal, { toValue: p, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start();
  }, [p, reveal]);
  useEffect(() => {
    if (!eclat) return;
    halo.setValue(0);
    Animated.sequence([
      Animated.timing(halo, { toValue: 1, duration: 420, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.timing(halo, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
    ]).start();
  }, [eclat, halo]);
  const hauteur = reveal.interpolate({ inputRange: [0, 1], outputRange: [0, h] });
  const ombre = nuit ? '#F5F6FB' : '#1D2029';
  const box = Math.round(Math.max(w, h) * 1.18);
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? traduire("{0}, {1} pour cent construit", piece.nom, Math.round(p * 100))}
      style={[{ width: box, height: h + 8, alignItems: 'center', justifyContent: 'flex-end' }, style]}
    >
      {/* ombre posee au sol, fine */}
      <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, width: Math.round(w * 0.9), height: 8, borderRadius: 4, backgroundColor: nuit ? 'rgba(0,0,0,0.35)' : 'rgba(29,32,41,0.08)' }} />
      <Animated.View
        pointerEvents="none"
        style={{ position: 'absolute', top: (h + 8 - box) / 2, width: box, height: box, borderRadius: box / 2, backgroundColor: 'rgba(227,196,123,0.38)', opacity: halo, transform: [{ scale: halo.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1.05] }) }] }}
      />
      <View style={{ width: w, height: h }}>
        {/* ce qui reste a gagner : la silhouette en encre tres claire */}
        <Image source={piece.image} style={{ position: 'absolute', left: 0, bottom: 0, width: w, height: h, tintColor: ombre, opacity: nuit ? 0.16 : 0.1 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        {/* ce qui est gagne : en couleurs, devoile de bas en haut */}
        <Animated.View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: hauteur, overflow: 'hidden' }}>
          <Image source={piece.image} style={{ position: 'absolute', left: 0, bottom: 0, width: w, height: h }} resizeMode="contain" accessibilityIgnoresInvertColors />
        </Animated.View>
      </View>
    </View>
  );
}

/** Les 3 etapes en petits points sous la piece : faites en or, en cours cerclee, a venir en creux */
export function EtapesPiece({ faites, total = 3, ton = 'auto' }: { faites: number; total?: number; ton?: 'auto' | 'sombre' }) {
  const { theme, isDark } = useYoroiTheme();
  const c = theme.colors;
  const nuit = ton === 'sombre' || !!isDark;
  return (
    <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: total }).map((_, i) => {
        const fait = i < faites;
        const encours = i === faites;
        return (
          <View
            key={i}
            style={{
              width: encours ? 22 : 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: fait ? c.gold : encours ? (nuit ? 'rgba(216,181,98,0.45)' : 'rgba(197,157,69,0.35)') : nuit ? 'rgba(242,241,236,0.18)' : c.divider,
            }}
          />
        );
      })}
    </View>
  );
}

export default ArmureEnConstruction;
