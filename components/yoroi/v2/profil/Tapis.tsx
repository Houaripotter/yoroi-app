/**
 * Sur le tapis (vague 18) : l'illustration de ton sport de combat dans un cadre,
 * ta ceinture dessinee et nouee, puis le choix de la ceinture.
 */
import React from 'react';
import { Image, Pressable, View } from 'react-native';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card } from '@/components/yoroi/v2/espace/ui';
import { sportImage } from '@/lib/v2/seance/sportVisuals';
import { Ceinture } from './Ceinture';
import { traduire } from '@/lib/i18n/tr';

export const BELTS: { id: string; label: string; color: string }[] = [
  { id: 'blanche', label: traduire('Blanche'), color: '#FFFFFF' },
  { id: 'bleue', label: traduire('Bleue'), color: '#2C4A84' },
  { id: 'violette', label: traduire('Violette'), color: '#6A3E8E' },
  { id: 'marron', label: traduire('Marron'), color: '#6B4428' },
  { id: 'noire', label: traduire('Noire'), color: '#1D2029' },
];

export function TapisCard({ sport, femme, belt, onBelt }: { sport?: string; femme: boolean; belt: string | null; onBelt: (id: string) => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const current = BELTS.find((b) => b.id === belt) ?? null;
  // l'illustration suit ton sport de combat ; les ceintures de l'app sont celles du jiu-jitsu bresilien
  const illu = sportImage(sport ?? 'jjb', femme);
  const bar = !sport || sport === 'jjb';

  return (
    <Card style={{ padding: 14, gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <View style={{ width: 104, height: 132, borderRadius: 18, backgroundColor: c.goldTint, borderWidth: 1, borderColor: c.border, overflow: 'hidden', alignItems: 'center', justifyContent: 'flex-end' }}>
          {illu ? <Image source={illu} style={{ width: 112, height: 150, marginBottom: -6 }} resizeMode="contain" accessibilityLabel={traduire("Illustration de ton sport")} /> : null}
        </View>
        <View style={{ flex: 1, gap: 6, alignItems: 'center' }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Ta ceinture")}</Ink>
          <Ink size={20} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>{current ? current.label : traduire('À choisir')}</Ink>
          <Ceinture color={current?.color ?? '#FFFFFF'} empty={!current} bar={bar} width={150} />
        </View>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {BELTS.map((b) => {
          const on = belt === b.id;
          return (
            <Pressable
              key={b.id}
              onPress={() => { selectionAsync().catch(() => {}); onBelt(b.id); }}
              accessibilityRole="button"
              accessibilityState={{ selected: on }}
              accessibilityLabel={traduire("Ceinture {0}", b.label)}
              style={{ minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.border, backgroundColor: on ? c.fillSoft : c.surface }}
            >
              <View style={{ width: 26, height: 10, borderRadius: 3, backgroundColor: b.color, borderWidth: 1, borderColor: b.id === 'blanche' ? '#C9C4B8' : c.border }}>
                {bar ? <View style={{ position: 'absolute', right: 3, top: 0, bottom: 0, width: 5, backgroundColor: b.id === 'noire' ? '#B0282E' : '#1D2029' }} /> : null}
              </View>
              <Ink size={14} weight={on ? 'extraBold' : 'bold'}>{b.label}</Ink>
            </Pressable>
          );
        })}
      </View>
    </Card>
  );
}
