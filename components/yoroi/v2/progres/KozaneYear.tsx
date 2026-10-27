/**
 * Carte de l'annee (refonte v2) : un petit rond par jour.
 * Vague 45 : pastilles de séance à la place des plaques kozane. Jour avec seance = rond indigo plein,
 * jour sans seance = rond vide clair. Un anneau d'or marque la reprise apres une pause.
 * Toucher un rond affiche le jour.
 */
import React, { useRef } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import type { DayCell } from '@/lib/v2/progres/year';
import { monthShortIdx } from '@/lib/v2/progres/format';
import { traduire } from '@/lib/i18n/tr';

/** Ancienne rampe des plaques, gardee pour compatibilite (plus utilisee par la grille) */
export const KOZANE_RAMP = ['#E4E7F1', '#AFC0DE', '#6A86BE', '#2C4A84', '#172A52'];

const CW = 12;
const CH = 14;
const GAP_X = 3;
const GAP_Y = 3;

type Props = {
  weeks: DayCell[][];
  monthMarks: { col: number; month: number }[];
  selected: string | null;
  onSelect: (cell: DayCell | null) => void;
};

export function KozaneYear({ weeks, monthMarks, selected, onSelect }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const scrollRef = useRef<ScrollView>(null);
  const w = weeks.length * (CW + GAP_X);
  const h = 7 * (CH + GAP_Y);

  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      <View style={{ width: 16, height: h, justifyContent: 'space-between', paddingVertical: 1 }}>
        {/* vague 33 : les 7 jours, pas seulement L, M, V, D */}
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <Ink key={i} size={10} weight="bold" color={c.textSecondary} style={{ height: CH, lineHeight: CH }}>
            {d}
          </Ink>
        ))}
      </View>
      <ScrollView ref={scrollRef} horizontal showsHorizontalScrollIndicator={false} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })} style={{ flex: 1 }}>
        <View>
          <View style={{ width: w, height: h }}>
            <Svg width={w} height={h} style={{ position: 'absolute' }}>
              {weeks.map((col, x) =>
                col.map((cell, y) =>
                  cell.future ? null : (
                    <Circle
                      key={cell.date}
                      cx={x * (CW + GAP_X) + CW / 2}
                      cy={y * (CH + GAP_Y) + CH / 2}
                      r={cell.level > 0 ? CW / 2 - 0.75 : CW / 2 - 1.25}
                      fill={cell.level > 0 ? c.detail : 'none'}
                      stroke={cell.date === selected ? c.ink : cell.afterPause ? c.gold : cell.level > 0 ? 'none' : c.border}
                      strokeWidth={cell.date === selected ? 2 : cell.afterPause ? 1.6 : cell.level > 0 ? 0 : 1.2}
                    />
                  ),
                ),
              )}
            </Svg>
            <Pressable
              style={{ position: 'absolute', left: 0, top: 0, width: w, height: h }}
              accessibilityLabel={traduire("Carte des jours, touche un jour pour voir la séance")}
              onPress={(e) => {
                const x = Math.floor(e.nativeEvent.locationX / (CW + GAP_X));
                const y = Math.floor(e.nativeEvent.locationY / (CH + GAP_Y));
                const cell = weeks[x]?.[y];
                if (!cell || cell.future) return;
                selectionAsync().catch(() => {});
                onSelect(cell.date === selected ? null : cell);
              }}
            />
          </View>
          <View style={{ width: w, height: 18, marginTop: 4 }}>
            {monthMarks.map((m) => (
              <Ink key={`${m.col}-${m.month}`} size={11} weight="bold" color={c.textSecondary} style={{ position: 'absolute', left: m.col * (CW + GAP_X) }}>
                {monthShortIdx(m.month)}
              </Ink>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/** Vague 45 : legende des pastilles de l'annee (rien, seance, reprise) */
export function KozaneLegend() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, flexWrap: 'wrap' }}>
      <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 1.2, borderColor: c.border }} />
      <Ink size={12} weight="bold" color={c.textSecondary}>
        rien
      </Ink>
      <View style={{ width: 11, height: 11, borderRadius: 6, backgroundColor: c.detail, marginLeft: 10 }} />
      <Ink size={12} weight="bold" color={c.textSecondary}>
        {traduire("séance")}</Ink>
      <View style={{ width: 11, height: 11, borderRadius: 6, borderWidth: 1.6, borderColor: c.gold, marginLeft: 10 }} />
      <Ink size={12} weight="bold" color={c.textSecondary}>
        reprise
      </Ink>
    </View>
  );
}
