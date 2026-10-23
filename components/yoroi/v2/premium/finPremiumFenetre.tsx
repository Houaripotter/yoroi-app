/**
 * Vague 47 : la fenetre douce de la fin du Premium (la premiere fois seulement), aussi dans la galerie
 * des fenetres du Studio.
 */
import React from 'react';
import { Image, View } from 'react-native';
import { appAlert } from '@/components/yoroi/v2/fenetre/api';
import { THEME_IMAGES } from '@/lib/v2/dojo/personnages';

export const FIN_PREMIUM_TITRE = 'Ton Premium a pris fin';
export const FIN_PREMIUM_TEXTE = 'Tes scènes et personnages Premium t’attendent : ils reviennent dès que tu reprends Premium.';

export function fenetreFinPremium(onReprendre: () => void, onPlusTard?: () => void): void {
  appAlert(
    FIN_PREMIUM_TITRE,
    FIN_PREMIUM_TEXTE,
    [
      { text: 'Plus tard', style: 'cancel', onPress: onPlusTard },
      { text: 'Reprendre Premium', isPreferred: true, onPress: onReprendre },
    ],
    {
      illustration: (
        <View style={{ width: 72, height: 72, borderRadius: 22, overflow: 'hidden' }}>
          <Image source={THEME_IMAGES.sakura} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        </View>
      ),
    },
  );
}
