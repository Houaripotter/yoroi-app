/**
 * Petites briques des ecrans du corps ajoutes le 1er novembre 2026 (demandes AT et AU) : ecran avec en-tete,
 * carte blanche, sticker rond, pastille a choisir, champ nombre, mini courbe (des 3 points), aide en petit.
 * Stickers (components/yoroi/v2/stickers.ts), jamais d'icones dessinees.
 */
import React from 'react';
import { Image, Pressable, ScrollView, TextInput, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EnTete } from '@/components/yoroi/v2/entete/EnTete';
import { InkLineChart } from '@/components/yoroi/v2/progres/InkLineChart';
import { carteBlanche } from '@/components/yoroi/v2/seance/pastel';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { fontStyle } from '@/components/yoroi/fonts';
import { num } from '@/lib/v2/progres/format';

export const MARGE = 16;

export function EcranCorps({ titre, sousTitre, repli = '/(tabs)/progres', children, pied }: { titre: string; sousTitre?: string; repli?: string; children: React.ReactNode; pied?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <EnTete titre={titre} sousTitre={sousTitre} repli={repli} zoneSure />
      <ScrollView contentContainerStyle={{ paddingHorizontal: MARGE, paddingTop: 8, paddingBottom: insets.bottom + (pied ? 110 : 40), gap: 14 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
      {pied ? <View style={{ position: 'absolute', left: MARGE, right: MARGE, bottom: insets.bottom + 16 }}>{pied}</View> : null}
    </View>
  );
}

export function Carte({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  return <View style={[carteBlanche(theme.colors.surface, theme.colors.border), { padding: 16, gap: 10 }, style]}>{children}</View>;
}

export function Sticker({ nom, taille = 36, style }: { nom: NomSticker; taille?: number; style?: StyleProp<ViewStyle> }) {
  const illus = useIllustrations();
  return (
    <View style={[{ width: taille, height: taille }, style]}>
      <Image source={illus.img(nom)} style={{ width: taille, height: taille }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

/** Titre de carte avec son sticker */
export function TitreCarte({ sticker, titre, sous, droite }: { sticker?: NomSticker; titre: string; sous?: string | null; droite?: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {sticker ? <Sticker nom={sticker} taille={34} /> : null}
      <View style={{ flex: 1, gap: 1 }}>
        <Ink size={16} weight="extraBold" numberOfLines={2}>{titre}</Ink>
        {sous ? <Ink size={12.5} color={theme.colors.textSecondary} numberOfLines={3}>{sous}</Ink> : null}
      </View>
      {droite}
    </View>
  );
}

export function Puce({ label, on, onPress, sticker, a11y }: { label: string; on: boolean; onPress: () => void; sticker?: NomSticker; a11y?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      accessibilityLabel={a11y ?? label}
      style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 12, borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: on ? c.ink : pressed ? c.fillSoft : c.fillSubtle })}
    >
      {sticker ? <Sticker nom={sticker} taille={22} /> : null}
      <Ink size={13.5} weight="extraBold" color={on ? c.background : c.ink} numberOfLines={1}>{label}</Ink>
    </Pressable>
  );
}

export function ChampNombre({ valeur, onChange, placeholder, unite, a11y, largeur = 96, texte }: { valeur: string; onChange: (s: string) => void; placeholder?: string; unite?: string; a11y: string; largeur?: number; texte?: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <TextInput
        value={valeur}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.textMuted}
        keyboardType={texte ? 'default' : 'decimal-pad'}
        accessibilityLabel={a11y}
        style={[fontStyle('extraBold'), { width: largeur, minHeight: 44, borderRadius: 12, paddingHorizontal: 10, fontSize: 17, color: c.ink, backgroundColor: c.fillSubtle, textAlign: texte ? 'left' : 'right' }]}
      />
      {unite ? <Ink size={13} weight="bold" color={c.textSecondary}>{unite}</Ink> : null}
    </View>
  );
}

/** Courbe compacte, seulement a partir de 3 points ; null sinon */
export function MiniCourbe({ points, couleur, label, digits = 1 }: { points: { date: string; value: number }[]; couleur?: string; label: string; digits?: number }) {
  if (points.length < 3) return null;
  return <InkLineChart points={points} color={couleur} height={76} compact digits={digits} minSpan={0.5} label={label} suitStyle />;
}

export function Aide({ children }: { children: React.ReactNode }) {
  const { theme } = useYoroiTheme();
  return <Ink size={12} color={theme.colors.textSecondary} style={{ lineHeight: 17 }}>{children}</Ink>;
}

/** Bouton secondaire en toutes lettres */
export function Lien({ label, onPress, a11y }: { label: string; onPress: () => void; a11y?: string }) {
  const { theme } = useYoroiTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={a11y ?? label} hitSlop={6} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
      <Ink size={14} weight="extraBold" color={theme.colors.accent}>{label}</Ink>
    </Pressable>
  );
}

/** Chiffre avec le separateur de ta langue, d chiffres */
export function nb(v: number, d = 1): string {
  return num(v, d, false);
}
