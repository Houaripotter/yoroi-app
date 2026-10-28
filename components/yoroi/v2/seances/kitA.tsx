/**
 * Briques de l'onglet Séances, maquette A « Aujourd'hui d'abord » (28 octobre 2026) : petites capitales colorées,
 * teintes pastel (et leur version sombre), carré pastel avec son sticker (selon le réglage Illustrations),
 * pastille de texte et carte blanche. Maquette : scratchpad/refonte/project/Seances3-A-Haut.dc.html et A-Bas.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { tap } from './ui';

export type TeinteA = 'creme' | 'bleu' | 'lilas' | 'menthe' | 'peche';

/** fond pastel, ecriture lisible dessus ; en sombre, un aplat nuit teinte */
const TEINTES: Record<TeinteA, { clair: [string, string]; sombre: [string, string] }> = {
  creme: { clair: ['#F6EEDD', '#8A6514'], sombre: ['#2F2A1C', '#E3C47B'] },
  bleu: { clair: ['#E6ECF8', '#3557D9'], sombre: ['#212B42', '#9DB1FF'] },
  lilas: { clair: ['#EFE6F3', '#8A3F78'], sombre: ['#2C2333', '#D7A8CB'] },
  menthe: { clair: ['#E3F2EA', '#1C6B45'], sombre: ['#1F2B24', '#93C9A8'] },
  peche: { clair: ['#FFE1D6', '#B4471E'], sombre: ['#3A2622', '#F0A58C'] },
};

export function useTeinte(t: TeinteA): { fond: string; texte: string } {
  const { theme } = useYoroiTheme();
  const [fond, texte] = TEINTES[t][theme.isDark ? 'sombre' : 'clair'];
  return { fond, texte };
}

/** Petites capitales colorées (« CETTE SEMAINE »), avec une action à droite si besoin */
export function Petites({ texte, teinte = 'bleu', action, onAction, style }: { texte: string; teinte?: TeinteA; action?: string; onAction?: () => void; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const t = useTeinte(teinte);
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingHorizontal: 2 }, style]}>
      <Ink size={11} weight="extraBold" color={t.texte} style={{ letterSpacing: 1.4, flexShrink: 1 }} accessibilityRole="header">
        {texte.toLocaleUpperCase()}
      </Ink>
      {action && onAction ? (
        <Pressable onPress={() => { tap(); onAction(); }} accessibilityRole="button" hitSlop={10} style={{ minHeight: 36, justifyContent: 'center', paddingLeft: 8 }}>
          <Ink size={13} weight="extraBold" color={theme.colors.accentText}>{action}</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Carré pastel arrondi avec un sticker au centre */
export function CarreSticker({ nom, teinte, taille = 44, rayon }: { nom: NomSticker; teinte: TeinteA; taille?: number; rayon?: number }) {
  const t = useTeinte(teinte);
  const illus = useIllustrations();
  return (
    <View style={{ width: taille, height: taille, borderRadius: rayon ?? Math.round(taille * 0.34), backgroundColor: t.fond, alignItems: 'center', justifyContent: 'center' }}>
      <Image source={illus.img(nom)} style={{ width: taille * 0.64, height: taille * 0.64 }} resizeMode="contain" accessibilityIgnoresInvertColors />
    </View>
  );
}

/** Pastille de texte (« 6 exercices ») */
export function Pastille({ texte, fond, couleur, icone }: { texte: string; fond: string; couleur: string; icone?: React.ReactNode }) {
  return (
    <View style={{ minHeight: 26, borderRadius: 13, backgroundColor: fond, paddingHorizontal: 10, paddingVertical: 3, flexDirection: 'row', alignItems: 'center', gap: 5, maxWidth: '100%' }}>
      {icone}
      <Ink size={12} weight="extraBold" color={couleur} style={{ flexShrink: 1 }}>{texte}</Ink>
    </View>
  );
}

/** La carte blanche de la maquette : rayon 24, ombre très douce */
export function useCarteA(): ViewStyle {
  const { theme } = useYoroiTheme();
  return {
    borderRadius: 24,
    backgroundColor: theme.colors.surface,
    padding: 14,
    shadowColor: '#1D2033',
    shadowOpacity: theme.isDark ? 0 : 0.05,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    borderWidth: theme.isDark ? 1 : 0,
    borderColor: theme.colors.divider,
  };
}
