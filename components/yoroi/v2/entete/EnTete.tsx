/**
 * En-tete compact commun des ecrans pousses et des feuilles (16 octobre 2026).
 * Une seule barre : retour rond de 40 a gauche (zone de toucher de 44), titre de taille moyenne
 * sur la meme ligne, sous-titre petit juste dessous, actions a droite.
 * Fige en haut de l'ecran : quand le contenu defile dessous, un filet apparait en fondu court.
 * La zone sure du haut est lue par la vue native (SafeAreaView) : sur une feuille modale
 * de l'iPhone elle vaut zero, ce qui supprime le grand vide sous la poignee.
 * Les grands titres restent reserves aux onglets principaux.
 */
import React, { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import Animated, { useAnimatedStyle, useSharedValue, withTiming, Easing } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

/** Hauteur de la ligne de l'en-tete, hors zone sure */
export const ENTETE_HAUTEUR = 56;

const RAPIDE = Easing.bezier(0.4, 0, 0.2, 1);

/** Bouton retour compact : cercle de 40, zone de toucher de 44, libelle VoiceOver « Retour » */
export function RetourCompact({ onPress, label = traduire('Retour'), repli = '/(tabs)' }: { onPress?: () => void; label?: string; repli?: string }) {
  const router = useRouter();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
        if (onPress) onPress();
        else if (router.canGoBack()) router.back();
        else router.replace(repli as never);
      }}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
    >
      {({ pressed }) => (
        <View
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: pressed ? c.fillSoft : P.carte,
            borderWidth: 1,
            borderColor: c.divider,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          }}
        >
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 5l-7 7 7 7" stroke={c.ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </View>
      )}
    </Pressable>
  );
}

export type EnTeteProps = {
  titre: string;
  sousTitre?: string;
  /** actions a droite (boutons ronds) */
  droite?: React.ReactNode;
  onRetour?: () => void;
  /** route de repli quand il n'y a rien derriere */
  repli?: string;
  labelRetour?: string;
  /**
   * true : l'en-tete est pose tout en haut de l'ecran, hors defilement, et lit la zone sure
   * par la vue native (juste aussi sur une feuille modale).
   * 'insets' : l'en-tete est le premier element d'une liste qui defile, la zone sure vient du haut de l'ecran.
   */
  zoneSure?: boolean | 'insets';
  /** true : le contenu defile sous l'en-tete, le filet du bas apparait */
  defile?: boolean;
  /** couleur de fond de l'ecran, pour que la barre se fonde dedans */
  fond?: string;
  style?: StyleProp<ViewStyle>;
};

export function EnTete({ titre, sousTitre, droite, onRetour, repli, labelRetour, zoneSure, defile = false, fond, style }: EnTeteProps) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const bg = fond ?? c.background;
  const insets = useSafeAreaInsets();
  const filet = useSharedValue(defile ? 1 : 0);
  useEffect(() => {
    filet.value = withTiming(defile ? 1 : 0, { duration: 160, easing: RAPIDE });
  }, [defile, filet]);
  const filetStyle = useAnimatedStyle(() => ({ opacity: filet.value }));

  const ligne = (
    <View style={{ minHeight: ENTETE_HAUTEUR, flexDirection: 'row', alignItems: 'center', paddingLeft: 10, paddingRight: 14, gap: 6 }}>
      <RetourCompact onPress={onRetour} repli={repli} label={labelRetour} />
      <View style={{ flex: 1, minWidth: 0, paddingVertical: 6 }}>
        <Ink size={20} weight="black" numberOfLines={2} accessibilityRole="header" style={{ letterSpacing: -0.4 }}>
          {titre}
        </Ink>
        {sousTitre ? (
          <Ink size={13} weight="medium" color={c.textSecondary} numberOfLines={2} style={{ marginTop: -1 }}>
            {sousTitre}
          </Ink>
        ) : null}
      </View>
      {droite ? <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>{droite}</View> : null}
    </View>
  );

  const filetVue = <Animated.View pointerEvents="none" style={[{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 1, backgroundColor: c.divider }, filetStyle]} />;

  if (zoneSure === 'insets') {
    return <View style={[{ paddingTop: insets.top + 4 }, style]}>{ligne}</View>;
  }
  if (zoneSure) {
    return (
      <View style={[{ backgroundColor: bg, zIndex: 2 }, style]}>
        <SafeAreaView edges={['top']} style={{ backgroundColor: bg }}>
          <View style={{ paddingTop: 4 }}>{ligne}</View>
        </SafeAreaView>
        {filetVue}
      </View>
    );
  }
  return <View style={[{ paddingTop: 4 }, style]}>{ligne}</View>;
}
