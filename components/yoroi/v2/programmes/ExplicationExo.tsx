/**
 * L'explication courte d'un exercice (30 octobre 2026), sous son animation : « Position », « Mouvement »,
 * « À éviter », une ligne chacun (lib/v2/programmes/explications.ts). Carte blanche, titres indigo, aéré.
 * Rien ne s'affiche si l'exercice n'a pas d'explication.
 */
import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { carteBlanche, ton } from '@/components/yoroi/v2/seance/pastel';
import { explicationDe } from '@/lib/v2/programmes/explications';
import { traduire } from '@/lib/i18n/tr';

/** `fond` : la couleur de la carte (blanc du thème par défaut) ; `style` : marges de l'écran qui l'accueille */
export function ExplicationExo({ nom, fond, style }: { nom: string; fond?: string; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const x = explicationDe(nom);
  if (!x) return null;
  const indigo = ton('ciel').encre;
  const blocs: [string, string][] = [
    ['Position', x.position],
    ['Mouvement', x.mouvement],
    ['À éviter', x.eviter],
  ];
  return (
    <View style={[carteBlanche(fond ?? c.surface, c.divider), { paddingVertical: 14, paddingHorizontal: 16, gap: 12 }, style]}>
      {blocs.map(([titre, texte]) => (
        <View key={titre} style={{ gap: 3 }} accessible accessibilityLabel={`${traduire(titre)}. ${traduire(texte)}`}>
          <Ink size={11} weight="black" color={indigo} style={{ letterSpacing: 0.8 }}>{traduire(titre).toLocaleUpperCase()}</Ink>
          <Ink size={13} color={c.textSecondary} style={{ lineHeight: 19 }}>{traduire(texte)}</Ink>
        </View>
      ))}
    </View>
  );
}
