/**
 * Ligne d'adresse discrete ecrite sur toutes les cartes partagees en image.
 * Tant que le site n'existe pas (SITE_URL vide), la carte dit ou trouver l'app sans URL longue.
 * Le jour ou SITE_URL est rempli, toutes les cartes affichent l'adresse courte du site d'un coup.
 */
import React from 'react';
import type { StyleProp, TextStyle } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { SITE_URL, signatureImage } from '@/constants/partage';
import { traduire } from '@/lib/i18n/tr';

/** Texte de la ligne de signature des cartes */
export function texteSignatureCarte(): string {
  return SITE_URL ? signatureImage() : traduire('YOROI, sur l’App Store et Google Play');
}

export function SignatureCarte({
  color,
  size = 10,
  align,
  style,
}: {
  color: string;
  size?: number;
  align?: 'left' | 'center' | 'right';
  style?: StyleProp<TextStyle>;
}) {
  return (
    <Ink
      size={size}
      weight="medium"
      color={color}
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.8}
      allowFontScaling={false}
      style={[align ? { textAlign: align } : null, style]}
    >
      {texteSignatureCarte()}
    </Ink>
  );
}

export default SignatureCarte;
