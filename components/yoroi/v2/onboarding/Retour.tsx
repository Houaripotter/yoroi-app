/**
 * Onboarding « retour » de la 3.0 (28 octobre 2026) : le petit ecran d'accueil, en tete du parcours,
 * pour un utilisateur existant. Ses reponses sont deja preremplies ; « Plus tard » ramene a l'accueil sans rien ecrire.
 */
import React from 'react';
import { Image, View } from 'react-native';
import { sticker, type NomSticker } from '@/components/yoroi/v2/stickers';
import { BoutonPrincipal } from '@/components/yoroi/v2/ui/BoutonPrincipal';
import { Shell } from './ui';
import { traduire } from '@/lib/i18n/tr';

const STICKERS: NomSticker[] = ['torii', 'kabuto', 'lanterne'];

export function Retour({ name, onContinue, onPlusTard }: { name: string; onContinue: () => void; onPlusTard: () => void }) {
  const prenom = name.trim();
  return (
    <Shell
      onPlusTard={onPlusTard}
      title={traduire('YOROI fait **peau neuve**')}
      sub={prenom
        ? traduire('{0}, redécouvre l’app en deux minutes : tes réponses sont déjà remplies, tu changes seulement ce que tu veux.', prenom)
        : traduire('Redécouvre l’app en deux minutes : tes réponses sont déjà remplies, tu changes seulement ce que tu veux.')}
      footer={<BoutonPrincipal label={traduire('Continuer')} onPress={onContinue} />}
    >
      <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 12 }} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {STICKERS.map((n, i) => (
          <Image key={n} source={sticker(n)} style={{ width: 84, height: 84, transform: [{ rotate: `${[-7, 4, -5][i]}deg` }] }} resizeMode="contain" accessibilityIgnoresInvertColors />
        ))}
      </View>
    </Shell>
  );
}
