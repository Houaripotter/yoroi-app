/**
 * Ornement discret entre deux sections du profil (vague 18) : un filet d'or, une petite
 * illustration japonaise (sakura, eventail, lanterne...), un filet d'or. Aucun kanji.
 */
import React from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useYoroiTheme } from '@/components/yoroi';

export const ORNEMENTS = {
  sakura: require('@/assets/avatars/app/ornements/sakura.webp') as ImageSourcePropType,
  eventail: require('@/assets/avatars/app/ornements/eventail.webp') as ImageSourcePropType,
  katanas: require('@/assets/avatars/app/ornements/katanas.webp') as ImageSourcePropType,
  lanterne: require('@/assets/avatars/app/ornements/lanterne.webp') as ImageSourcePropType,
  torii: require('@/assets/avatars/app/ornements/torii.webp') as ImageSourcePropType,
  fuji: require('@/assets/avatars/app/ornements/fuji.webp') as ImageSourcePropType,
  kabuto: require('@/assets/avatars/app/ornements/kabuto.webp') as ImageSourcePropType,
};

export type OrnementId = keyof typeof ORNEMENTS;

export function Ornement({ id, size = 30 }: { id: OrnementId; size?: number }) {
  const { theme } = useYoroiTheme();
  const gold = theme.colors.gold;
  return (
    <View accessible={false} importantForAccessibility="no-hide-descendants" style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 18, marginTop: 4 }}>
      <LinearGradient colors={[`${gold}00`, `${gold}99`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, height: 1.5, borderRadius: 1 }} />
      <Image source={ORNEMENTS[id]} style={{ width: size, height: size }} resizeMode="contain" />
      <LinearGradient colors={[`${gold}99`, `${gold}00`]} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={{ flex: 1, height: 1.5, borderRadius: 1 }} />
    </View>
  );
}
