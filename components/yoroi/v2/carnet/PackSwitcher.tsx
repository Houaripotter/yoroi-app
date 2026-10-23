/**
 * Choix du pack sport du carnet v2 (combat, endurance, force, musculation, nature) :
 * chaque pack ouvre ses onglets. Le choix est memorise.
 */
import React from 'react';
import type { GlyphKind } from '@/components/yoroi/v2/ornements/Glyph';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { Pressable, ScrollView, View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { useSportPack } from '@/lib/SportPackContext';
import { PACK_META } from '@/lib/sportPacks';
import type { SportPack } from '@/lib/sportPacks';
import { P, tap } from './ui';
import { blancA } from '@/components/yoroi/livePalette';

const ORDER: SportPack[] = ['combat', 'endurance', 'force', 'musculation', 'nature'];
const PACK_GLYPH: Record<string, GlyphKind> = { combat: 'eventail', endurance: 'vague', force: 'etoile', musculation: 'etoile', nature: 'sakura', all: 'laurier' };

export function PackSwitcher() {
  const { activePack, setActivePack } = useSportPack();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingHorizontal: 22 }}>
      {ORDER.map((k) => {
        const on = activePack === k;
        const meta = PACK_META[k];
        return (
          <Pressable
            key={k}
            onPress={() => {
              tap();
              setActivePack(k);
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            accessibilityLabel={`Pack ${meta?.label ?? k}`}
            style={{ minHeight: 56, paddingLeft: 8, paddingRight: 14, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: on ? P.accent : blancA(0.85), borderWidth: 1, borderColor: on ? P.accent : P.line2 }}
          >
            <View style={{ width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? 'rgba(255,255,255,0.16)' : '#F1EFE9' }}>
              <Glyph kind={PACK_GLYPH[k] ?? 'sakura'} size={22} color={on ? P.white : P.ink2} />
            </View>
            <Ink size={14} weight="extraBold" color={on ? P.white : P.ink}>{meta?.label ?? k}</Ink>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export default PackSwitcher;
