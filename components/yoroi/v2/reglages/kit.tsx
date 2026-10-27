/**
 * Vague 41 : briques communes de la nouvelle organisation des Reglages.
 * Couleurs des petites tuiles d'icone (palette de l'app, jamais le rouge reserve aux records et aux suppressions),
 * titre de groupe compact, carte d'apercu et petit interrupteur.
 */
import React from 'react';
import { View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/livePalette';

/** Tuiles d'icone : indigo, bleu, mousse, or, ardoise */
export const TUILE = {
  indigo: '#4C6EF5',
  bleu: '#3D5D9E',
  mousse: '#6E8C3A',
  or: '#A8832F',
  ardoise: '#5A6072',
} as const;

/** Titre de groupe : court, lisible, sans majuscules en sur-titre */
export function Groupe({ title, sub }: { title: string; sub?: string }) {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ paddingHorizontal: 4, paddingTop: 8, gap: 1 }}>
      <Ink size={17} weight="black" tight accessibilityRole="header">{title}</Ink>
      {sub ? <Ink size={13} color={theme.colors.textSecondary}>{sub}</Ink> : null}
    </View>
  );
}

/** Interrupteur de ligne (indigo quand il est actif) */
export function Interrupteur({ on }: { on: boolean }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: on ? c.detail : c.fillSubtle, padding: 3, alignItems: on ? 'flex-end' : 'flex-start' }}>
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: P.white }} />
    </View>
  );
}

/** Libelle de l'apercu, au-dessus d'une illustration */
export function Legende({ children }: { children: string }) {
  const { theme } = useYoroiTheme();
  return (
    <Ink size={12} weight="bold" color={theme.colors.textMuted} style={{ paddingHorizontal: 4 }}>
      {children}
    </Ink>
  );
}
