/**
 * Portes du Dojo : tuiles illustrees qui menent aux sous-ecrans (chemin de l'armure,
 * journal, personnages et scenes). Chaque tuile montre une vraie valeur, pas un lien nu.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Hanko } from '@/components/yoroi/v2/dojo/Hanko';
import { tap } from '@/components/yoroi/v2/dojo/parts';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';

export type Gate = {
  key: string;
  title: string;
  value: string;
  onPress: () => void;
  /** fond pastel de l'illustration */
  fond: string;
  image?: ImageSourcePropType;
  /** a defaut d'image : un tampon */
  kanji?: string;
  kanjiColor?: string;
  /** vague 47 : le tampon dessine (sinon le torii) */
  tampon?: TamponId;
};

function GateTile({ g, width }: { g: Gate; width: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const s = useSharedValue(1);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return (
    <Pressable
      onPress={() => {
        tap();
        g.onPress();
      }}
      onPressIn={() => {
        s.value = withTiming(0.97, { duration: 90 });
      }}
      onPressOut={() => {
        s.value = withTiming(1, { duration: 140 });
      }}
      accessibilityRole="button"
      accessibilityLabel={`${g.title}, ${g.value}`}
      style={{ width }}
    >
      <Animated.View style={[{ backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 22, padding: 8, paddingBottom: 12, gap: 10 }, anim]}>
        <View style={{ height: 104, borderRadius: 16, backgroundColor: g.fond, overflow: 'hidden', alignItems: 'center', justifyContent: g.image ? 'flex-end' : 'center' }}>
          {g.image ? (
            <Image source={g.image} style={{ width: '100%', height: 116, marginBottom: -12 }} resizeMode="contain" />
          ) : (
            <Hanko size={64} color={g.kanjiColor ?? c.accent} tampon={g.tampon ?? 'frein_programme'} />
          )}
        </View>
        <View style={{ paddingHorizontal: 6, gap: 2 }}>
          <Ink size={15} weight="extraBold" numberOfLines={2}>
            {g.title}
          </Ink>
          <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={2}>
            {g.value}
          </Ink>
        </View>
      </Animated.View>
    </Pressable>
  );
}

export function Gates({ gates, width }: { gates: Gate[]; width: number }) {
  const col = Math.floor((width - 10) / 2);
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {gates.map((g, i) => (
        // Nombre impair : la derniere porte prend toute la largeur, pas de trou dans la grille
        <GateTile key={g.key} g={g} width={gates.length % 2 === 1 && i === gates.length - 1 ? width : col} />
      ))}
    </View>
  );
}
