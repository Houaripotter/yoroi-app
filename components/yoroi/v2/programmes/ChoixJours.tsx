/**
 * Tes jours d'entraînement (25 octobre 2026) : tu choisis les jours où tu t'entraînes, le coach du programme
 * suit (lib/v2/programmes/coach.ts) et ton planning aussi. Les séances s'enchaînent dans l'ordre du programme.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Glass, tap } from '@/components/yoroi/v2/seances/ui';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { conseilJours } from '@/lib/v2/programmes/coach';
import { traduire } from '@/lib/i18n/tr';

const COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const LONGS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];

export function ChoixJours({ jours, prevus, onChange }: { jours: number[]; prevus: number; onChange: (jours: number[]) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const basculer = (d: number) => {
    tap();
    const suite = jours.includes(d) ? jours.filter((x) => x !== d) : [...jours, d].sort((a, b) => a - b);
    // au moins un jour : on ne retire pas le dernier
    if (suite.length) onChange(suite);
  };
  return (
    <Glass style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 40, height: 40, borderRadius: 13, backgroundColor: c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="calendar" size={20} color={c.ink} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Ink size={15} weight="black" tight>{traduire('Tes jours d’entraînement')}</Ink>
          <Ink size={12} color={c.textSecondary}>{traduire('Choisis tes jours : chaque jour, YOROI te dit quoi faire.')}</Ink>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 6 }}>
        {COURTS.map((j, d) => {
          const on = jours.includes(d);
          return (
            <Pressable
              key={j}
              onPress={() => basculer(d)}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              accessibilityLabel={traduire(LONGS[d])}
              style={({ pressed }) => ({
                flex: 1,
                minHeight: 46,
                borderRadius: 14,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: on ? c.accent : c.fillSoft,
                opacity: pressed ? 0.8 : 1,
              })}
            >
              <Ink size={13} weight="black" color={on ? c.onAccent : c.textSecondary}>{traduire(j)}</Ink>
            </Pressable>
          );
        })}
      </View>
      <Ink size={12} color={c.textSecondary} style={{ lineHeight: 17 }}>{conseilJours(prevus, jours.length)}</Ink>
    </Glass>
  );
}
