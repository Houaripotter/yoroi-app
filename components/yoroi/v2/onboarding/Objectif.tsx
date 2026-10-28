/**
 * Ecran 4 : tes objectifs (vague 29 : choix multiples). Quatre grandes cartes, chacune avec son tampon ancien
 * dans sa propre encre (sarcelle, or, vermillon doux, indigo). Compatibilites (lib/v2/onboarding/objectifs.ts) :
 * Perdre du poids et Me maintenir s'excluent, un choix incompatible decoche l'autre avec une courte phrase douce ;
 * Prendre du muscle va avec Perdre (recomposition) ou Me maintenir ; Performer en combat va avec tout.
 */
import React, { useState } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import type { Goal } from '@/lib/v2/onboarding/draft';
import { phraseCombinaison, toggleObjectif } from '@/lib/v2/onboarding/objectifs';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import type { TamponId } from '@/components/yoroi/v2/tampons/table';
import { ENCRES_THEME as ENCRES } from './couleurs';
import type { Encre } from './couleurs';
import { ChoiceCard, MainButton, Shell, useColors } from './ui';
import type { Nav } from './types';
import { traduire } from '@/lib/i18n/tr';

export const GOALS: { id: Goal; label: string; line: string; tampon: TamponId; encre: Encre }[] = [
  { id: 'lose', label: traduire('Perdre du poids'), line: traduire('Suivre ta perte semaine après semaine.'), tampon: 'objectif_perdre', encre: ENCRES.sarcelle },
  { id: 'gain', label: traduire('Prendre du muscle'), line: traduire('Voir ton poids et tes charges monter.'), tampon: 'objectif_muscle', encre: ENCRES.or },
  { id: 'combat', label: traduire('Performer en combat'), line: traduire('Ta catégorie, tes rounds, tes compétitions.'), tampon: 'objectif_combat', encre: ENCRES.vermillon },
  { id: 'maintain', label: 'Me maintenir', line: traduire('Garder ton poids et ta régularité.'), tampon: 'objectif_maintien', encre: ENCRES.indigo },
];

export function Objectif({ nav, name = '', goals, onChange, onNext }: { nav: Nav; name?: string; goals: Goal[]; onChange: (list: Goal[]) => void; onNext: () => void }) {
  const c = useColors();
  const [note, setNote] = useState<string | null>(null);
  const phrase = note ?? phraseCombinaison(goals);
  const petit = useWindowDimensions().height < 720;
  return (
    <Shell {...nav} title={name.trim() ? traduire("Qu’est ce que tu **vises**, {0} ?", name.trim()) : traduire('Qu’est ce que tu **vises** ?')} sub={traduire("Ce que tu viens chercher dans YOROI. Un choix ou plusieurs.")} gap={petit ? 8 : 12} footer={<MainButton label={traduire("Continuer")} onPress={onNext} disabled={!goals.length} />}>
      {GOALS.map((g) => {
        const on = goals.includes(g.id);
        return (
          <ChoiceCard
            key={g.id}
            selected={on}
            tint={g.encre}
            onPress={() => {
              const r = toggleObjectif(goals, g.id);
              setNote(r.note);
              onChange(r.list);
            }}
            label={traduire(g.label)}
          >
            <View style={{ minHeight: petit ? 72 : 84, flexDirection: 'row', alignItems: 'center', gap: 14, paddingLeft: 12, paddingRight: 14, paddingVertical: petit ? 6 : 10 }}>
              <Tampon name={g.tampon} size={petit ? 52 : 62} rotate={-5} ink={g.encre.ink} accessibilityLabel={null} />
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={17} weight="black" tight color={on ? g.encre.ink : c.ink}>{traduire(g.label)}</Ink>
                <Ink size={13} color={c.textSecondary} style={{ lineHeight: 18 }}>{g.line}</Ink>
              </View>
              <View style={{ width: 30, alignItems: 'center' }}>
                {on ? (
                  <Animated.View entering={ZoomIn.duration(220)} style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: g.encre.ink, alignItems: 'center', justifyContent: 'center' }}>
                    <Icon name="check" size={15} color={c.onAccent} stroke={3} />
                  </Animated.View>
                ) : (
                  <View style={{ width: 28, height: 28, borderRadius: 9, borderWidth: 2, borderColor: c.border }} />
                )}
              </View>
            </View>
          </ChoiceCard>
        );
      })}
      {phrase ? (
        <Animated.View key={phrase} entering={FadeIn.duration(220)} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderRadius: 16, backgroundColor: note ? ENCRES.or.fond : c.fillSoft, paddingHorizontal: 14, paddingVertical: 12 }} accessibilityLiveRegion="polite">
          <Icon name={note ? 'info' : 'check'} size={16} color={note ? ENCRES.or.ink : c.textSecondary} stroke={2.4} />
          <Ink size={14} weight="bold" color={c.ink} style={{ flex: 1, lineHeight: 20 }}>{phrase}</Ink>
        </Animated.View>
      ) : null}
    </Shell>
  );
}

export default Objectif;
