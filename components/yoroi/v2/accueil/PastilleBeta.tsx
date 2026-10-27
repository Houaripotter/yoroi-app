/**
 * Pastille « Bêta » des cartes outils de l'accueil (27 octobre 2026, Houari : l'ancienne, sous le titre, etait
 * « moche et mal ecrite »). Petite pastille pastel posee sur la meme ligne que le titre de rubrique, a sa droite,
 * centree verticalement : petites capitales serrees, poids fort, fond #DCE3FF, texte #23358F, hauteur 18, rayon 9.
 * Ancienne version : _archive_ancien_design_2026-10-09/accueil_clics_2026-10-27/Raccourcis.tsx.
 */
import React from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { traduire } from '@/lib/i18n/tr';

export const PASTILLE_BETA = { hauteur: 18, rayon: 9, padding: 7, fond: '#DCE3FF', encre: '#23358F', taille: 10 } as const;

/** marginVertical -2 : la pastille de 18 se centre sur la ligne de titre de 14 sans la pousser vers le bas */
export function PastilleBeta() {
  return (
    <View
      pointerEvents="none"
      style={{ height: PASTILLE_BETA.hauteur, paddingHorizontal: PASTILLE_BETA.padding, borderRadius: PASTILLE_BETA.rayon, backgroundColor: PASTILLE_BETA.fond, justifyContent: 'center', alignItems: 'center', flexShrink: 0, marginVertical: -2 }}
    >
      <Ink size={PASTILLE_BETA.taille} weight="black" color={PASTILLE_BETA.encre} numberOfLines={1} allowFontScaling={false} style={{ letterSpacing: 0.3, lineHeight: 12, includeFontPadding: false }}>
        {traduire('Bêta').toUpperCase()}
      </Ink>
    </View>
  );
}
