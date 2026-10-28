/**
 * Carte « Ta derniere seance » : sport illustre, duree, series, tonnage, records et « Refaire ».
 * 28 octobre 2026 (maquette A de l'onglet Seances) : LastSessionBody, le contenu de la section repliable « Ta derniere
 * seance » : trois chiffres en pastel, les exercices, les records et le bouton Details.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import type { ImageSourcePropType } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { BigButton, Hanko, tap } from './ui';
import { useTeinte } from './kitA';
import type { TeinteA } from './kitA';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

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
          <Ink size={12} weight="bold" color={c.textSecondary}>{sansTiret(vm.when)}</Ink>
          <Ink size={21} weight="black" tight numberOfLines={2}>{sansTiret(traduire(vm.title))}</Ink>
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
                <Ink size={14} weight="bold" style={{ flex: 1 }} numberOfLines={2}>{sansTiret(traduire(e.name))}</Ink>
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

const TEINTES_FAITS: TeinteA[] = ['creme', 'lilas', 'peche'];

function Fait({ f, teinte }: { f: LastSessionVM['facts'][number]; teinte: TeinteA }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const t = useTeinte(teinte);
  return (
    <View style={{ flex: 1, minWidth: 0, borderRadius: 16, backgroundColor: t.fond, paddingVertical: 9, paddingHorizontal: 10 }}>
      <Ink size={18} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {f.value}
        {f.unit ? <Ink size={12} weight="bold" color={c.textSecondary}>{` ${f.unit}`}</Ink> : null}
      </Ink>
      <Ink size={11.5} weight="bold" color={c.textSecondary} numberOfLines={2}>{traduire(f.label)}</Ink>
    </View>
  );
}

export function LastSessionBody({ vm, onOpen }: { vm: LastSessionVM; onOpen?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ gap: 10 }}>
      {vm.facts.length ? (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {vm.facts.map((f, i) => <Fait key={f.label} f={f} teinte={TEINTES_FAITS[i % 3]} />)}
        </View>
      ) : null}
      {vm.exercises.length > 0 ? (
        <View style={{ borderRadius: 16, backgroundColor: c.background, paddingHorizontal: 12 }}>
          {vm.exercises.map((e, i) => (
            <View key={`${e.name}${i}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderTopWidth: i === 0 ? 0 : 1, borderColor: c.divider }}>
              <Ink size={13.5} weight="bold" style={{ flex: 1 }} numberOfLines={2}>{sansTiret(traduire(e.name))}</Ink>
              {e.best ? <Ink size={13.5} weight="extraBold">{e.best}</Ink> : null}
            </View>
          ))}
        </View>
      ) : null}
      {vm.stamps > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
          <Hanko size={18} />
          <Ink size={13} weight="extraBold">{vm.stamps > 1 ? traduire('{0} records battus', vm.stamps) : traduire('1 record battu')}</Ink>
        </View>
      ) : null}
      {onOpen ? (
        <Pressable
          onPress={() => { tap(); onOpen(); }}
          accessibilityRole="button"
          accessibilityLabel={traduire('Détails de ta dernière séance')}
          style={({ pressed }) => ({ minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? c.primaryPressed : c.primary })}
        >
          <Ink size={14.5} weight="extraBold" color={c.onPrimary}>{traduire('Détails')}</Ink>
        </Pressable>
      ) : null}
    </View>
  );
}
