/**
 * Apercu « exemple » des etats vides : ce que l'utilisateur verra apres sa premiere seance,
 * en filigrane et clairement marque comme un exemple.
 */
import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { traduire } from '@/lib/i18n/tr';

export function ExampleBadge() {
  const { theme } = useYoroiTheme();
  return (
    <View style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 9, backgroundColor: theme.colors.ink }}>
      <Ink size={11} weight="extraBold" color={theme.colors.background}>exemple</Ink>
    </View>
  );
}

export function ExampleFrame({ children, caption, style }: { children: React.ReactNode; caption?: string; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={style} accessibilityLabel={caption ? `Exemple. ${caption}` : traduire('Exemple')}>
      <View style={{ opacity: 0.42 }} pointerEvents="none">
        {children}
      </View>
      <View style={{ position: 'absolute', top: 12, right: 12 }} pointerEvents="none">
        <ExampleBadge />
      </View>
      {caption ? (
        <Ink size={13} weight="bold" color={c.textSecondary} style={{ marginTop: 8, paddingHorizontal: 4 }}>{caption}</Ink>
      ) : null}
    </View>
  );
}
