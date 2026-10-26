/**
 * Les modules d'un programme en grandes tuiles à cocher (26 octobre 2026), partagés par le questionnaire
 * (Questionnaire.tsx) et le départ avec ton coach (app/coach-depart.tsx). Les textes viennent de modules.ts.
 * Deux par ligne, carré d'icône coloré (indigo, orange, vert en boucle) ; cochée : indigo plein, texte blanc, coche.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/seances/Icon';
import { teinteExo, usePaletteProgramme } from '@/components/yoroi/v2/programmes/Habillage';
import type { ModuleId, ModuleInfo } from '@/lib/v2/programmes/modules';
import { traduire } from '@/lib/i18n/tr';

export function GrilleModules({ possibles, modules, onBasculer }: { possibles: readonly ModuleInfo[]; modules: readonly ModuleId[]; onBasculer: (m: ModuleId) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const pal = usePaletteProgramme();
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {possibles.map((m, k) => {
        const on = modules.includes(m.id);
        const t = teinteExo(pal, k);
        return (
          <Pressable
            key={m.id}
            onPress={() => onBasculer(m.id)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            accessibilityLabel={`${traduire(m.label)}, ${traduire(m.sous)}`}
            style={({ pressed }) => ({
              width: '47%',
              flexGrow: 1,
              minHeight: 124,
              borderRadius: 22,
              padding: 14,
              gap: 8,
              backgroundColor: on ? pal.indigo : pal.carte,
              borderWidth: 2,
              borderColor: on ? pal.accent : 'transparent',
              transform: [{ scale: pressed ? 0.97 : 1 }],
            })}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ width: 44, height: 44, borderRadius: 15, backgroundColor: on ? 'rgba(255,255,255,0.18)' : t.fond, alignItems: 'center', justifyContent: 'center' }}>
                <Icon name={m.icone} size={22} color={on ? '#FFFFFF' : t.encre} />
              </View>
              {on ? (
                <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon name="check" size={16} color="#FFFFFF" strokeWidth={3} />
                </View>
              ) : (
                <View style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: pal.anneau }} />
              )}
            </View>
            <Ink size={15} weight="black" tight color={on ? c.onDark : pal.texte} numberOfLines={2}>{traduire(m.label)}</Ink>
            <Ink size={12} weight="bold" color={on ? c.onDarkSecondary : pal.texte2} numberOfLines={2}>{traduire(m.sous)}</Ink>
          </Pressable>
        );
      })}
    </View>
  );
}
