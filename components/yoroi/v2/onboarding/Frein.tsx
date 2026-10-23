/**
 * Ecran 5 (vague 27) : « Qu'est-ce qui t'a freine jusqu'ici ? ». Choix multiples en grosses cartes
 * illustrees, chacune dans sa couleur d'encre (vague 29), « Rien de tout ca » est exclusif. La reponse choisit l'ecran suivant et les conseils du jour.
 */
import React from 'react';
import { View, useWindowDimensions } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { Frein as FreinId } from '@/lib/v2/onboarding/draft';
import { FREINS } from '@/lib/v2/onboarding/freins';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import { ENCRES_THEME as ENCRES } from './couleurs';
import type { Encre } from './couleurs';
import { ChoiceCard, MainButton, Shell, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

/** Un tampon ancien par frein */
export const TAMPON_FREIN: Record<FreinId, TamponId> = {
  regularite: 'frein_regularite',
  progres: 'frein_progres',
  motivation: 'frein_motivation',
  blessures: 'frein_blessures',
  programme: 'frein_programme',
  rien: 'frein_rien',
};

/** Vague 29 : chaque frein a sa couleur d'encre (tampon, carte choisie, affirmation qui suit) */
export const ENCRE_FREIN: Record<FreinId, Encre> = {
  regularite: ENCRES.mousse,
  progres: ENCRES.indigo,
  motivation: ENCRES.or,
  blessures: ENCRES.sarcelle,
  programme: ENCRES.vermillon,
  rien: ENCRES.prune,
};

export function Frein({ nav, value, onToggle, onNext }: { nav: Nav; value: FreinId[]; onToggle: (id: FreinId) => void; onNext: () => void }) {
  const c = useColors();
  const petit = useWindowDimensions().width < 380;
  return (
    <Shell {...nav} title={traduire("Qu’est-ce qui t’a **freiné** jusqu’ici ?")} sub={traduire("Choisis tout ce qui te parle, la suite s’adapte à ta réponse.")} gap={10} footer={<MainButton label={traduire("Continuer")} onPress={onNext} disabled={value.length === 0} />}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 }}>
        {FREINS.map((f) => {
          const on = value.includes(f.id);
          const e = ENCRE_FREIN[f.id] ?? ENCRES.indigo;
          return (
            <ChoiceCard key={f.id} selected={on} tint={e} onPress={() => onToggle(f.id)} label={traduire(f.label)} height={132} style={{ width: '48.4%' }}>
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10, gap: 8 }}>
                <Tampon name={TAMPON_FREIN[f.id] ?? 'frein_rien'} size={petit ? 50 : 60} rotate={-5} ink={e.ink} accessibilityLabel={null} />
                <Ink size={14} weight="extraBold" color={on ? e.ink : c.ink} style={{ textAlign: 'center', lineHeight: 18 }} numberOfLines={2}>{traduire(f.label)}</Ink>
              </View>
              {on ? (
                <View style={{ position: 'absolute', top: 8, right: 8, width: 24, height: 24, borderRadius: 12, backgroundColor: e.ink, alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={13} color={c.onAccent} stroke={3} />
                </View>
              ) : null}
            </ChoiceCard>
          );
        })}
      </View>
    </Shell>
  );
}

export default Frein;
