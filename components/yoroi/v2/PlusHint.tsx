/**
 * Repere vers le bouton + de la barre d'onglets, pour les etats vides.
 * Le + est la seule zone pour ajouter ou enregistrer : ici, une phrase et une petite fleche, jamais un bouton concurrent.
 * Exemple : <PlusHint text="Touche + pour ta première pesée" />
 */
import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '../YoroiThemeProvider';
import { Ink } from './Ink';
import { traduire } from '@/lib/i18n/tr';

/** arrow : petite fleche vers le bas, a retirer sur un ecran secondaire ou la barre d'onglets n'est pas visible */
export function PlusHint({ text, align = 'left', color, arrow = true, style }: { text: string; align?: 'left' | 'center'; color?: string; arrow?: boolean; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const textColor = color ?? c.textSecondary;
  return (
    <View
      accessible
      accessibilityRole="text"
      accessibilityLabel={traduire("{0}. Le bouton plus est au centre de la barre d’onglets.", text)}
      style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, alignSelf: align === 'center' ? 'center' : 'flex-start' }, style]}
    >
      <View style={{ width: 28, height: 28, borderRadius: 10, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={14} height={14} viewBox="0 0 24 24">
          <Path d="M12 4v16M4 12h16" stroke={c.onAccent ?? '#FFFFFF'} strokeWidth={3.4} strokeLinecap="round" />
        </Svg>
      </View>
      <Ink size={14} weight="bold" color={textColor} style={{ flexShrink: 1, textAlign: align === 'center' ? 'center' : 'left' }}>
        {text}
      </Ink>
      {arrow ? (
        <Svg width={14} height={18} viewBox="0 0 14 18">
          <Path d="M7 2v13M2.5 10.5L7 15l4.5-4.5" stroke={c.accent} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      ) : null}
    </View>
  );
}
