/**
 * Les modules d'un programme en grandes cases à cocher (26 octobre 2026), partagés par le questionnaire
 * (Questionnaire.tsx) et le départ avec ton coach (app/coach-depart.tsx). Les textes viennent de modules.ts.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import type { ModuleId, ModuleInfo } from '@/lib/v2/programmes/modules';
import { traduire } from '@/lib/i18n/tr';

export function GrilleModules({ possibles, modules, onBasculer }: { possibles: readonly ModuleInfo[]; modules: readonly ModuleId[]; onBasculer: (m: ModuleId) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {possibles.map((m) => {
        const on = modules.includes(m.id);
        return (
          <Pressable
            key={m.id}
            onPress={() => onBasculer(m.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={traduire(m.label)}
            style={({ pressed }) => ({ width: '47%', flexGrow: 1, minHeight: 92, borderRadius: 20, padding: 14, gap: 6, backgroundColor: on ? c.accent : pressed ? c.fillSubtle : c.surface, borderWidth: 1.5, borderColor: on ? c.accent : c.divider })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Icon name={m.icone} size={20} color={on ? '#FFFFFF' : c.accent} />
              {on ? <Icon name="check" size={18} color="#FFFFFF" strokeWidth={2.6} /> : null}
            </View>
            <Ink size={15} weight="black" tight color={on ? '#FFFFFF' : c.ink}>{traduire(m.label)}</Ink>
            <Ink size={12} color={on ? 'rgba(255,255,255,0.85)' : c.textSecondary} numberOfLines={1}>{traduire(m.sous)}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}
