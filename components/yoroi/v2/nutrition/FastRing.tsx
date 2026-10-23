/**
 * Anneau de jeune au pinceau : progression, reperes des phases et chrono au centre.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from './ui';
import { traduire } from '@/lib/i18n/tr';

type Props = {
  progress: number; // 0 a 1
  totalHours: number | null;
  markers: { hour: number; label: string }[];
  color: string;
  center: React.ReactNode;
  size?: number;
};

export function FastRing({ progress, totalHours, markers, color, center, size = 268 }: Props) {
  const stroke = 22;
  const r = (size - stroke - 16) / 2;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, progress));
  const ticks = totalHours ? markers.filter((m) => m.hour > 0 && m.hour < totalHours) : [];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={traduire("Progression du jeûne : {0} pour cent", Math.round(v * 100))}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={cx} cy={cx} r={r} stroke={P.line} strokeWidth={stroke} fill="none" />
        <G transform={`rotate(-90 ${cx} ${cx})`}>
          {/* halo du pinceau */}
          <Circle cx={cx} cy={cx} r={r} stroke={color} strokeOpacity={0.16} strokeWidth={stroke + 10} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v)} strokeLinecap="round" />
          <Circle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v)} strokeLinecap="round" />
          <Circle cx={cx} cy={cx} r={r - stroke / 2 + 3} stroke="#FFFFFF" strokeOpacity={0.35} strokeWidth={3} fill="none" strokeDasharray={`${c} ${c}`} strokeDashoffset={c * (1 - v)} strokeLinecap="round" />
        </G>
        {ticks.map((m) => {
          const a = (m.hour / (totalHours as number)) * 2 * Math.PI - Math.PI / 2;
          const x = cx + r * Math.cos(a);
          const y = cx + r * Math.sin(a);
          const passed = m.hour / (totalHours as number) <= v;
          return <Circle key={m.hour} cx={x} cy={y} r={6} fill={passed ? P.white : P.paper} stroke={passed ? color : P.dashed} strokeWidth={3} />;
        })}
      </Svg>
      <View style={{ alignItems: 'center', paddingHorizontal: 40 }}>{center}</View>
    </View>
  );
}

/** Liste des phases avec la phase actuelle en avant */
export function FastPhases({ elapsedHours, markers, color }: { elapsedHours: number; markers: { hour: number; label: string; text: string }[]; color: string }) {
  let current = 0;
  markers.forEach((m, i) => {
    if (elapsedHours >= m.hour) current = i;
  });
  return (
    <View style={{ gap: 0 }}>
      {markers.map((m, i) => {
        const on = i === current;
        const done = i < current;
        return (
          <View key={m.hour} style={{ flexDirection: 'row', gap: 12, alignItems: 'stretch' }}>
            <View style={{ width: 22, alignItems: 'center' }}>
              <View style={{ width: on ? 18 : 12, height: on ? 18 : 12, borderRadius: 9, marginTop: on ? 3 : 6, backgroundColor: on || done ? color : P.white, borderWidth: 2, borderColor: on || done ? color : P.dashed }} />
              {i < markers.length - 1 ? <View style={{ flex: 1, width: 3, borderRadius: 2, backgroundColor: done ? color : P.line, marginVertical: 2 }} /> : null}
            </View>
            <View style={{ flex: 1, paddingBottom: 14, gap: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                <Ink size={15} weight={on ? 'black' : 'extraBold'} color={on ? P.ink : done ? P.ink2 : P.muted}>
                  {traduire(m.label)}
                </Ink>
                <Ink size={12} weight="bold" color={P.ink2}>
                  {m.hour === 0 ? traduire('dès le début') : `vers ${m.hour} h`}
                </Ink>
              </View>
              {on ? (
                <Ink size={13} weight="medium" color={P.ink2}>
                  {traduire(m.text)}
                </Ink>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
