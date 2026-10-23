/**
 * Acces evidents de l'onglet Seances : planning, seances de la montre, seance oubliee, calendrier du mois.
 */
import React from 'react';
import { Pressable, View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import { tap } from './ui';
import { P } from '@/components/yoroi/livePalette';

export type QuickLink = { key: string; title: string; sub: string; icon: IconName; onPress: () => void; on?: boolean };

export function QuickLinks({ items }: { items: QuickLink[] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
      {items.map((it) => (
        <Pressable
          key={it.key}
          onPress={() => { tap(); it.onPress(); }}
          accessibilityRole="button"
          accessibilityLabel={`${it.title}, ${it.sub}`}
          accessibilityState={it.on != null ? { selected: it.on } : undefined}
          style={({ pressed }) => ({
            flexBasis: '47%',
            flexGrow: 1,
            minHeight: 64,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingHorizontal: 10,
            paddingVertical: 10,
            borderRadius: 18,
            backgroundColor: it.on ? c.ink : pressed ? P.white : P.carte,
            borderWidth: 1,
            borderColor: it.on ? c.ink : c.divider,
          })}
        >
          <View style={{ width: 34, height: 34, borderRadius: 11, backgroundColor: it.on ? 'rgba(242,241,236,0.16)' : c.fillSubtle, alignItems: 'center', justifyContent: 'center' }}>
            <Icon name={it.icon} size={18} color={it.on ? P.paper : c.indigo} />
          </View>
          <View style={{ flex: 1, gap: 1 }}>
            <Ink size={14} weight="extraBold" color={it.on ? P.paper : c.ink}>{it.title}</Ink>
            <Ink size={12} weight="bold" color={it.on ? c.onDarkSecondary : c.textMuted}>{it.sub}</Ink>
          </View>
        </Pressable>
      ))}
    </View>
  );
}
