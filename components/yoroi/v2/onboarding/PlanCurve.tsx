/**
 * Courbe projetee de l'onboarding (vague 27) : de ton poids d'aujourd'hui a ton cap,
 * au rythme sain retenu (lib/v2/onboarding/plan.ts). Elle se trace au pinceau, avec les deux reperes
 * et la date d'arrivee indicative. Pour te maintenir : une ligne calme autour de ton poids.
 */
import React, { useRef } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient as SvgGradient, Line, Path, Stop } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { EndDot, Reveal, SeriesLine } from '@/components/yoroi/v2/charts/core';
import { kg, useColors } from './ui';
import { traduire } from '@/lib/i18n/tr';

let planSeq = 0;

export function PlanCurve({ start, target, width, height = 150, startLabel = traduire('Aujourd’hui'), endLabel }: {
  start: number;
  target: number | null;
  width: number;
  height?: number;
  startLabel?: string;
  /** « 3 février » */
  endLabel?: string | null;
}) {
  const c = useColors();
  const gid = useRef(`planStroke${++planSeq}`).current;
  const flat = target == null || Math.abs(target - start) < 0.1;
  const padX = 14;
  const top = 26;
  const bottom = height - 30;
  const x0 = padX;
  const x1 = width - padX;
  const down = !flat && (target as number) < start;
  const y0 = flat ? (top + bottom) / 2 : down ? top : bottom;
  const y1 = flat ? (top + bottom) / 2 : down ? bottom : top;
  // un depart franc puis une arrivee plus douce, comme une vraie courbe de tendance (sans depasser le cap)
  const d = flat
    ? `M${x0} ${y0} C ${x0 + (x1 - x0) * 0.3} ${y0 - 6}, ${x0 + (x1 - x0) * 0.6} ${y0 + 6}, ${x1} ${y1}`
    : `M${x0} ${y0} C ${x0 + (x1 - x0) * 0.35} ${y0 + (y1 - y0) * 0.75}, ${x0 + (x1 - x0) * 0.62} ${y1}, ${x1} ${y1}`;
  const area = `${d} L${x1} ${bottom + 10} L${x0} ${bottom + 10} Z`;
  const weeks = 4;
  return (
    <View style={{ width, height }} accessible accessibilityLabel={flat ? traduire("Garder {0} kilos", kg(start)) : endLabel ? traduire("De {0} kilos aujourd’hui à {1} kilos vers le {2}", kg(start), kg(target as number), endLabel) : traduire("De {0} kilos aujourd’hui à {1} kilos", kg(start), kg(target as number))}>
      <Svg width={width} height={height}>
        <Defs>
          {/* le trait s'eclaircit vers l'arrivee : c'est une estimation, pas une promesse */}
          <SvgGradient id={gid} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c.accent} stopOpacity={1} />
            <Stop offset="1" stopColor={c.accent} stopOpacity={0.62} />
          </SvgGradient>
        </Defs>
        {Array.from({ length: weeks + 1 }).map((_, i) => {
          const x = Math.round(x0 + ((x1 - x0) * i) / weeks) + 0.5;
          return <Line key={i} x1={x} x2={x} y1={top - 6} y2={bottom + 10} stroke={c.border} strokeOpacity={0.6} strokeWidth={1} />;
        })}
        {!flat ? <Line x1={x0} x2={x1} y1={y1} y2={y1} stroke={c.accent} strokeOpacity={0.5} strokeWidth={1.6} strokeDasharray="0.1 5" strokeLinecap="round" /> : null}
        <Reveal width={width} height={height} replayKey={`${start}|${target}|${width}`} duration={950}>
          <SeriesLine line={d} area={area} color={c.accent} width={0} wash={0.18} />
          <Path d={d} stroke={`url(#${gid})`} strokeWidth={3} strokeLinecap="round" fill="none" />
          <EndDot cx={x1} cy={y1} color={c.accent} />
        </Reveal>
        <Circle cx={x0} cy={y0} r={4.5} fill={c.ink} stroke="#FFFFFF" strokeWidth={2} />
      </Svg>
      <View style={{ position: 'absolute', left: 0, top: y0 - 26 }}>
        <Ink size={12} weight="black" color={c.ink}>{`${kg(start)} kg`}</Ink>
      </View>
      {!flat ? (
        <View style={{ position: 'absolute', right: 0, top: down ? y1 - 28 : y1 + 12, alignItems: 'flex-end' }}>
          <Ink size={12} weight="black" color={c.accent}>{`${kg(target as number)} kg`}</Ink>
        </View>
      ) : null}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Ink size={12} weight="bold" color={c.textMuted}>{startLabel}</Ink>
        {endLabel ? <Ink size={12} weight="bold" color={c.textMuted}>{endLabel}</Ink> : null}
      </View>
    </View>
  );
}

export default PlanCurve;
