/**
 * Ecran 4 (facultatif, 26 octobre 2026, demande de Houari) : ta tranche d'age, juste apres Toi.
 * Six cartes basses en deux colonnes, rien n'est choisi d'avance. Si le profil a deja une date de naissance
 * ou un age (reinstallation), la tranche est preremplie (lib/v2/onboarding/fusion.ts).
 * Seule la tranche est gardee et mesuree, jamais l'age exact (lib/v2/onboarding/trancheAge.ts).
 */
import React from 'react';
import { View } from 'react-native';
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

export function Age({ nav, value, onPick, onNext }: { nav: Nav; value: TrancheAge | null; onPick: (t: TrancheAge) => void; onNext: () => void }) {
  const c = useColors();
  const lignes = [TRANCHES_AGE.slice(0, 2), TRANCHES_AGE.slice(2, 4), TRANCHES_AGE.slice(4, 6)];
  return (
    <Shell
      {...nav}
      gap={14}
      title={traduire("Ta tranche **d’âge**")}
      sub={traduire("Pour mieux te connaître. Seule la tranche est gardée, jamais ton âge exact.")}
      footer={<MainButton label={traduire("Continuer")} onPress={onNext} disabled={!value} />}
    >
      <View style={{ gap: 12, paddingTop: 4 }}>
        {lignes.map((ligne, i) => (
          <View key={i} style={{ flexDirection: 'row', gap: 12 }}>
            {ligne.map((t) => {
              const on = value === t;
              const label = libelleTrancheAge(t);
              return (
                <ChoiceCard key={t} selected={on} onPress={() => onPick(t)} label={label} height={64} style={{ flex: 1 }}>
                  <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 }}>
                    <Ink size={17} weight="extraBold" color={on ? c.accent : c.ink} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{label}</Ink>
                  </View>
                </ChoiceCard>
              );
            })}
          </View>
        ))}
      </View>
    </Shell>
  );
}

export default Age;
