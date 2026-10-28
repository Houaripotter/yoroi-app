/**
 * Silhouette des muscles travailles (avant et arriere), coloree par intensite
 * sur une seule echelle d'indigo (palette graphique validee).
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { MuscleLoad, MuscleName } from '@/lib/v2/seances/weekSummary';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';
import { sansTiret } from '@/lib/v2/texte/sansTiret';

export const MUSCLE_LEVEL_COLORS = ['#DEDAD1', '#C5CEE0', '#8197C2', '#3D5D9E'] as const;
const NEUTRAL = '#ECE9E2';

type Shape = { d: string; m: MuscleName | null };

const FRONT: Shape[] = [
  { d: 'M45 24h10v8h-10z', m: null },
  { d: 'M37 33Q44 31 49 32L49 52Q41 55 33 52Q30 47 30 42Q31 36 37 33Z', m: 'Pectoraux' },
  { d: 'M36 32Q26 31 22 38Q20 44 21 50L28 49Q29 41 36 37Z', m: 'Épaules' },
  { d: 'M21 52L28 51Q29 60 27 68L20 69Q19 60 21 52Z', m: 'Bras' },
  { d: 'M20 71L27 70Q27 80 25 92L20 92Q18 80 20 71Z', m: 'Bras' },
  { d: 'M19.5 94h6v6q-3 2.5-6 0z', m: null },
  { d: 'M36 55Q42 57 49 56L49 92Q42 94 38 90Q36 72 36 55Z', m: 'Abdos' },
  { d: 'M37 93Q43 96 49 96L49 104L36 104Z', m: null },
  { d: 'M36 105L49 105L48 113Q47 130 46 146L39 146Q34 126 36 105Z', m: 'Jambes' },
  { d: 'M39 148h7v5h-7z', m: null },
  { d: 'M39 155L46 155Q47 170 45 186L41 186Q37 170 39 155Z', m: 'Jambes' },
  { d: 'M40 188h6l1.5 6h-9z', m: null },
];

const BACK: Shape[] = [
  { d: 'M45 24h10v6h-10z', m: null },
  { d: 'M41 26Q46 29 49 29L49 40Q42 37 34 33Q38 29 41 26Z', m: 'Dos' },
  { d: 'M33 38Q41 41 49 42L49 78Q43 80 39 74Q33 58 30 46Q30 41 33 38Z', m: 'Dos' },
  { d: 'M36 32Q26 31 22 38Q20 44 21 50L28 49Q29 41 33 37Z', m: 'Épaules' },
  { d: 'M21 52L28 51Q29 60 27 68L20 69Q19 60 21 52Z', m: 'Bras' },
  { d: 'M20 71L27 70Q27 80 25 92L20 92Q18 80 20 71Z', m: 'Bras' },
  { d: 'M19.5 94h6v6q-3 2.5-6 0z', m: null },
  { d: 'M39 79Q44 83 49 83L49 95L37 95Q37 86 39 79Z', m: 'Dos' },
  { d: 'M36 97L49 97L49 116Q41 119 35 113Q34 104 36 97Z', m: 'Jambes' },
  { d: 'M35 118Q42 122 48 119L46 146L39 146Q35 132 35 118Z', m: 'Jambes' },
  { d: 'M39 148h7v5h-7z', m: null },
  { d: 'M38 155L47 155Q49 166 46 186L41 186Q36 168 38 155Z', m: 'Jambes' },
  { d: 'M40 188h6l1.5 6h-9z', m: null },
];

function Figure({ shapes, levels, height, abs }: { shapes: Shape[]; levels: Record<string, number>; height: number; abs?: boolean }) {
  const width = (height * 100) / 200;
  const fill = (m: MuscleName | null) => (m ? MUSCLE_LEVEL_COLORS[levels[m] ?? 0] : NEUTRAL);
  const half = (
    <>
      {shapes.map((s, i) => (
        <Path key={i} d={s.d} fill={fill(s.m)} stroke="#FFFFFF" strokeWidth={1.2} strokeLinejoin="round" />
      ))}
    </>
  );
  return (
    <Svg width={width} height={height} viewBox="0 0 100 200">
      <Circle cx={50} cy={14} r={10} fill={NEUTRAL} />
      <G>{half}</G>
      <G transform="translate(100,0) scale(-1,1)">{half}</G>
      {abs ? (
        <G stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round">
          <Path d="M50 57V93" />
          <Path d="M38.5 66H61.5" />
          <Path d="M38.5 75H61.5" />
          <Path d="M39 84H61" />
        </G>
      ) : (
        <Path d="M50 30V95" stroke="#FFFFFF" strokeWidth={1.2} strokeLinecap="round" />
      )}
    </Svg>
  );
}

/** Silhouettes avant et arriere seules, niveaux 0 a 3 par zone */
export function MuscleFigures({ levels, height = 150 }: { levels: Record<string, number>; height?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', gap: 2 }}>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Figure shapes={FRONT} levels={levels} height={height} abs />
        <Ink size={11} weight="bold" color={c.textMuted}>{traduire("Avant")}</Ink>
      </View>
      <View style={{ alignItems: 'center', gap: 4 }}>
        <Figure shapes={BACK} levels={levels} height={height} />
        <Ink size={11} weight="bold" color={c.textMuted}>{traduire("Arrière")}</Ink>
      </View>
    </View>
  );
}

export function MuscleMap({ loads, height = 176 }: { loads: MuscleLoad[]; height?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const levels: Record<string, number> = {};
  loads.forEach((l) => (levels[l.name] = l.level));
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <View style={{ flexDirection: 'row', gap: 2 }}>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Figure shapes={FRONT} levels={levels} height={height} abs />
          <Ink size={11} weight="bold" color={c.textMuted}>{traduire("Avant")}</Ink>
        </View>
        <View style={{ alignItems: 'center', gap: 4 }}>
          <Figure shapes={BACK} levels={levels} height={height} />
          <Ink size={11} weight="bold" color={c.textMuted}>{traduire("Arrière")}</Ink>
        </View>
      </View>
      {/* (vague 26, qualite) le nom et l'etat l'un sous l'autre : rien de coupe a 375 points */}
      <View style={{ flex: 1, gap: 6, minWidth: 0 }}>
        {loads.map((l) => (
          <View key={l.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <View style={{ width: 12, height: 12, borderRadius: 4, backgroundColor: MUSCLE_LEVEL_COLORS[l.level] }} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <Ink size={13} weight="bold" numberOfLines={1}>{sansTiret(traduire(l.name))}</Ink>
              <Ink size={11} weight={l.sets ? 'extraBold' : 'medium'} color={l.sets ? c.ink : c.textMuted} numberOfLines={1}>
                {l.sets ? traduirePluriel(l.sets, l.sets > 1, "{0} série", "{0} séries", l.sets) : l.engaged ? traduire('sollicité') : traduire('au repos')}
              </Ink>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

/** Echelle de couleur sous la silhouette */
export function MuscleScale() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <Ink size={11} weight="bold" color={c.textMuted}>{traduire("Léger")}</Ink>
      {MUSCLE_LEVEL_COLORS.slice(1).map((col) => (
        <View key={col} style={{ width: 22, height: 8, borderRadius: 4, backgroundColor: col }} />
      ))}
      <Ink size={11} weight="bold" color={c.textMuted}>{traduire("10 séries et plus")}</Ink>
    </View>
  );
}
