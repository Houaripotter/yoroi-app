/**
 * Ecran 4 (facultatif, 26 octobre 2026, demande de Houari) : ta tranche d'age, juste apres Toi.
 * Six cartes basses en deux colonnes, rien n'est choisi d'avance. Si le profil a deja une date de naissance
 * ou un age (reinstallation), la tranche est preremplie (lib/v2/onboarding/fusion.ts).
 * Seule la tranche est gardee et mesuree, jamais l'age exact (lib/v2/onboarding/trancheAge.ts).
 */
import React, { useState } from 'react';
import { Image, View } from 'react-native';
import { useIllustrations, type NomSticker } from '@/components/yoroi/v2/stickers';
import { Ink } from '@/components/yoroi/v2/Ink';
import { ChoiceCard, MainButton, Shell, useColors } from './ui';
import type { Nav } from './types';
import { TRANCHES_AGE, type TrancheAge } from '@/lib/v2/onboarding/trancheAge';
import { traduire } from '@/lib/i18n/tr';

export function libelleTrancheAge(t: TrancheAge): string {
  switch (t) {
    case 'moins_18':
      return traduire('Moins de 18');
    case '18_24':
      return traduire('18 à 24');
    case '25_34':
      return traduire('25 à 34');
    case '35_44':
      return traduire('35 à 44');
    case '45_54':
      return traduire('45 à 54');
    default:
      return traduire('55 et plus');
  }
}

/** 28 octobre 2026 : un sticker discret par tranche (encre japonaise en univers Japon) */
const STICKER_AGE: Record<TrancheAge, NomSticker> = {
  moins_18: 'debuter',
  '18_24': 'energie',
  '25_34': 'force_eclair',
  '35_44': 'montagne_drapeau',
  '45_54': 'bonsai',
  '55_plus': 'saule',
} as Record<TrancheAge, NomSticker>;

/**
 * 28 octobre 2026 (Houari : « tout est en haut avec un grand vide dessous ») : les six tuiles occupent l'ecran entre
 * le titre et le bouton, hauteur calculee sur la place libre (72 a 128 points), centrees, texte plus grand, sticker discret.
 */
export function Age({ nav, value, onPick, onNext }: { nav: Nav; value: TrancheAge | null; onPick: (t: TrancheAge) => void; onNext: () => void }) {
  const c = useColors();
  const illus = useIllustrations();
  const [place, setPlace] = useState(0);
  const lignes = [TRANCHES_AGE.slice(0, 2), TRANCHES_AGE.slice(2, 4), TRANCHES_AGE.slice(4, 6)];
  const GAP = 12;
  const h = place > 0 ? Math.max(72, Math.min(128, Math.floor((place - GAP * 2 - 8) / 3))) : 84;
  const st = Math.round(h * 0.42);
  return (
    <Shell
      {...nav}
      gap={14}
      scroll={false}
      title={traduire("Ta tranche **d’âge**")}
      sub={traduire("Pour mieux te connaître. Seule la tranche est gardée, jamais ton âge exact.")}
      footer={<MainButton label={traduire("Continuer")} onPress={onNext} disabled={!value} />}
    >
      <View style={{ flex: 1, justifyContent: 'center' }} onLayout={(e) => setPlace(Math.round(e.nativeEvent.layout.height))}>
        <View style={{ gap: GAP }}>
          {lignes.map((ligne, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: GAP }}>
              {ligne.map((t) => {
                const on = value === t;
                const label = libelleTrancheAge(t);
                const nom = STICKER_AGE[t];
                return (
                  <ChoiceCard key={t} selected={on} onPress={() => onPick(t)} label={label} height={h} style={{ flex: 1 }}>
                    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8, gap: h >= 96 ? 6 : 2 }}>
                      {nom && h >= 84 ? <Image source={illus.img(nom)} style={{ width: st, height: st, opacity: on ? 1 : 0.9 }} resizeMode="contain" accessibilityIgnoresInvertColors /> : null}
                      <Ink size={h >= 96 ? 20 : 18} weight="black" color={on ? c.accent : c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Ink>
                    </View>
                  </ChoiceCard>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </Shell>
  );
}

export default Age;
