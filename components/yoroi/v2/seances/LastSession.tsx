/**
 * Carte « Ta derniere seance » : sport illustre, duree, series, tonnage, records et « Refaire ».
 */
import React from 'react';
import { Image, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Hanko } from './ui';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

export type LastSessionVM = {
  title: string;
  when: string;
  tint: string;
  art: ImageSourcePropType | null;
  facts: { label: string; value: string; unit?: string }[];
  exercises: { name: string; best: string }[];
  stamps: number;
};

export function LastSessionCard({ vm, onRepeat, onOpen }: { vm: LastSessionVM; onRepeat?: () => void; onOpen?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ borderRadius: 24, backgroundColor: P.white, overflow: 'hidden' }}>
      <View style={{ height: 116, backgroundColor: vm.tint, overflow: 'hidden', padding: 16, justifyContent: 'flex-end' }}>
        {vm.art ? <Image source={vm.art} style={{ position: 'absolute', right: 0, top: 8, width: 118, height: 158 }} resizeMode="contain" /> : null}
        <View style={{ maxWidth: '68%', gap: 2 }}>
          <Ink size={12} weight="bold" color={c.textSecondary}>{vm.when}</Ink>
          <Ink size={21} weight="black" tight numberOfLines={2}>{traduire(vm.title)}</Ink>
        </View>
      </View>

      <View style={{ padding: 16, gap: 14 }}>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {vm.facts.map((f) => (
            <View key={f.label} style={{ flex: 1, gap: 1 }}>
              <Ink size={20} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {f.value}
                {f.unit ? <Ink size={12} weight="bold" color={c.textSecondary}>{` ${f.unit}`}</Ink> : null}
              </Ink>
              <Ink size={12} weight="bold" color={c.textMuted}>{traduire(f.label)}</Ink>
            </View>
          ))}
          {vm.stamps > 0 ? (
            <View style={{ flex: 1, gap: 1, alignItems: 'flex-start' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, height: 26 }}>
                <Ink size={20} weight="black" tight>{String(vm.stamps)}</Ink>
                <Hanko size={16} />
              </View>
              <Ink size={12} weight="bold" color={c.textMuted}>{vm.stamps > 1 ? 'records' : 'record'}</Ink>
            </View>
          ) : null}
        </View>

        {vm.exercises.length > 0 ? (
          <View style={{ borderRadius: 16, backgroundColor: c.fillSoft, paddingHorizontal: 12 }}>
            {vm.exercises.map((e, i) => (
              <View key={`${e.name}${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.border }}>
                <Ink size={14} weight="bold" style={{ flex: 1 }} numberOfLines={2}>{traduire(e.name)}</Ink>
                {e.best ? <Ink size={14} weight="extraBold">{e.best}</Ink> : null}
              </View>
            ))}
          </View>
        ) : null}

        {onRepeat || onOpen ? (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {onRepeat ? <BigButton label={traduire("Refaire")} icon="repeat" tone="accent" onPress={onRepeat} style={{ flex: 1 }} /> : null}
            {onOpen ? <BigButton label={traduire("Détails")} tone="soft" onPress={onOpen} style={{ flex: 1 }} /> : null}
          </View>
        ) : null}
      </View>
    </View>
  );
}
