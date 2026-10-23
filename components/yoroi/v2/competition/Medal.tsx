/**
 * Medaille dessinee (or, argent, bronze) et choix du resultat d'une competition.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P, Press } from '@/components/yoroi/v2/accueil/kit';
import { MEDAILLES } from '@/lib/v2/competition/extras';
import type { Medaille } from '@/lib/v2/competition/extras';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import { tamponMedaille } from '@/components/yoroi/v2/tampons/table';

export function MedalIcon({ kind, size = 44 }: { kind: Medaille; size?: number }) {
  const m = MEDAILLES.find((x) => x.key === kind) ?? MEDAILLES[3];
  if (kind === 'aucune') {
    return (
      <Svg width={size} height={size} viewBox="0 0 48 48">
        <Circle cx={24} cy={28} r={14} fill={m.color} stroke={m.edge} strokeWidth={2.5} strokeDasharray="4 4" />
      </Svg>
    );
  }
  const t = tamponMedaille(kind);
  if (t) return <Tampon name={t} size={size} rotate={-6} accessibilityLabel={m.label} />;
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48">
      <Path d="M14 2h8l6 14h-8z" fill={P.accent} />
      <Path d="M34 2h-8l-6 14h8z" fill="#3D5D9E" />
      <Circle cx={24} cy={30} r={14} fill={m.color} stroke={m.edge} strokeWidth={2.5} />
      <Circle cx={24} cy={30} r={9} fill="none" stroke={m.edge} strokeWidth={1.5} opacity={0.7} />
      <Path d="M24 24.5l1.8 3.6 4 .6-2.9 2.8.7 4-3.6-1.9-3.6 1.9.7-4-2.9-2.8 4-.6z" fill={m.edge} />
    </Svg>
  );
}

export function MedalPicker({ value, onChange }: { value?: Medaille; onChange: (m: Medaille) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 8 }}>
      {MEDAILLES.map((m) => {
        const on = value === m.key;
        return (
          <Press key={m.key} onPress={() => onChange(m.key)} accessibilityRole="button" accessibilityLabel={m.label} accessibilityState={{ selected: on }} style={{ width: '48.5%' }}>
            <View style={{ minHeight: 64, borderRadius: 18, borderWidth: on ? 2 : 1, borderColor: on ? P.accent : P.line2, backgroundColor: on ? P.accentSoft : P.white, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12 }}>
              <MedalIcon kind={m.key} size={38} />
              <Ink size={15} weight="extraBold" color={on ? P.accent : P.ink} style={{ flex: 1 }} numberOfLines={2}>
                {m.label}
              </Ink>
            </View>
          </Press>
        );
      })}
    </View>
  );
}
