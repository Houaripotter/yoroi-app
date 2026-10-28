/**
 * Pastille « Bêta » des cartes outils de l'accueil.
 * 27 octobre 2026 (Houari : l'ancienne, sous le titre, etait « moche et mal ecrite ») : une pastille pastel a droite du titre.
 * 28 octobre 2026 (Houari : « bleu sur bleu, on ne la voit pas ») : elle quitte la ligne du titre et se pose a cheval
 * sur le bord haut de la carte, en haut a droite, a moitie dehors, legerement inclinee (4 degres), avec une
 * petite ombre. Or #E9B44C et texte bleu nuit #1B2559 : contraste de 7,6 a 1 (AA large et normal), alors que le corail
 * #FF7A59 avec du blanc ne fait que 2,6 a 1. L'or ressort sur toutes les teintes des cartes (bleu, creme, lilas, menthe,
 * blanc) comme sur le fond de la page, en clair comme en sombre.
 * Anciennes versions : _archive_ancien_design_2026-10-09/accueil_clics_2026-10-27/Raccourcis.tsx,
 * _archive_ancien_design_2026-10-09/accueil_compact_2026-10-28/PastilleBeta.tsx.
 */
import React from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { traduire } from '@/lib/i18n/tr';

export const PASTILLE_BETA = { hauteur: 20, rayon: 10, padding: 8, fond: '#E9B44C', encre: '#1B2559', taille: 10, droite: 10, depasse: 12, inclinaison: '-4deg' } as const;

/**
 * Posee en position absolue sur le bord haut de la carte : 12 de ses 20 points depassent au dessus (un peu plus que la
 * moitie, pour laisser respirer le sticker en haut a droite), inclinee vers le haut a droite.
 */
export function PastilleBeta() {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: -PASTILLE_BETA.depasse,
        right: PASTILLE_BETA.droite,
        height: PASTILLE_BETA.hauteur,
        paddingHorizontal: PASTILLE_BETA.padding,
        borderRadius: PASTILLE_BETA.rayon,
        backgroundColor: PASTILLE_BETA.fond,
        justifyContent: 'center',
        alignItems: 'center',
        transform: [{ rotate: PASTILLE_BETA.inclinaison }],
        shadowColor: '#1D2033',
        shadowOpacity: 0.22,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 4,
        zIndex: 2,
      }}
    >
      <Ink size={PASTILLE_BETA.taille} weight="black" color={PASTILLE_BETA.encre} numberOfLines={1} allowFontScaling={false} style={{ letterSpacing: 0.6, lineHeight: 12, includeFontPadding: false }}>
        {traduire('Bêta').toUpperCase()}
      </Ink>
    </View>
  );
}
