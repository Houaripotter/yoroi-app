/**
 * Resume sportif en haut de Progres : poids et tendance, seances du mois,
 * volume du mois, records du mois. N'apparait que s'il y a de vraies donnees.
 */
import React, { useMemo } from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { Hanko, tapLight } from './ui';
import type { Training } from '@/lib/database';
import type { DayWeight } from '@/lib/v2/weightStats';
import { formatKg, weeklyRate } from '@/lib/v2/weightStats';
import { sessionTonnage } from '@/lib/v2/progres/strength';
import { computeRecords } from '@/lib/v2/seances/records';
import { durationOf, formatDuration, formatTonnage } from '@/lib/v2/trainingWeek';
import { monthLong, num, thousands, todayIso } from '@/lib/v2/progres/format';
import { P } from '@/components/yoroi/livePalette';

export type SummaryTarget = 'poids' | 'seances' | 'volume' | 'records';

/** Format unique du tonnage (lib/v2/trainingWeek) */
function volumeText(kg: number): string {
  return formatTonnage(kg);
}

function Tile({ label, value, unit, sub, onPress, accessory, border }: { label: string; value: string; unit?: string; sub: string; onPress: () => void; accessory?: React.ReactNode; border?: 'left' | 'top' | 'both' }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <Pressable
      onPress={() => {
        tapLight();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${value}${unit ? ` ${unit}` : ''}, ${sub}`}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 96,
        padding: 14,
        gap: 2,
        borderLeftWidth: border === 'left' || border === 'both' ? 1.5 : 0,
        borderTopWidth: border === 'top' || border === 'both' ? 1.5 : 0,
        borderColor: c.border,
        backgroundColor: pressed ? c.fillSoft : 'transparent',
      })}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
        <Ink size={13} weight="bold" color={c.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
          {label}
        </Ink>
        {accessory}
      </View>
      <Ink size={28} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.75}>
        {value}
        {unit ? (
          <Ink size={15} weight="black" color={c.textSecondary}>
            {` ${unit}`}
          </Ink>
        ) : null}
      </Ink>
      <Ink size={12} color={c.textSecondary} numberOfLines={2}>
        {sub}
      </Ink>
    </Pressable>
  );
}

export function ProgresSummary({ series, trainings, onOpen, style }: { series: DayWeight[]; trainings: Training[]; onOpen: (t: SummaryTarget) => void; style?: StyleProp<ViewStyle> }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const today = todayIso();
  const month = today.slice(0, 7);

  const data = useMemo(() => {
    const inMonth = trainings.filter((t) => (t.date || '').slice(0, 7) === month);
    const tonnage = inMonth.reduce((s, t) => s + sessionTonnage(t), 0);
    const minutes = inMonth.reduce((s, t) => s + durationOf(t), 0);
    // meme calcul que l'onglet Seances (lib/v2/seances/records.ts) : tous les records battus, dont ceux du mois
    const rec = computeRecords(trainings);
    const recordsMonth = rec.recent.filter((r) => r.point.date.slice(0, 7) === month).length;
    return { sessions: inMonth.length, tonnage, minutes, records: rec.totalStamps, recordsMonth };
  }, [trainings, month]);

  const last = series[series.length - 1];
  const rate = weeklyRate(series);
  const monthName = monthLong(today);

  let weightSub = 'ta tendance, dès 4 pesées';
  if (rate !== null) {
    const g = Math.round(Math.abs(rate) * 1000 / 10) * 10;
    const amount = g >= 1000 ? `${formatKg(g / 1000)} kg` : `${g} g`;
    weightSub = g < 30 ? 'stable' : `${amount} de ${rate < 0 ? 'moins' : 'plus'} par semaine`;
  }

  return (
    <View style={[{ borderRadius: 22, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }, style]}>
      <View style={{ flexDirection: 'row' }}>
        {last ? (
          <Tile label="Dernière pesée" value={formatKg(last.value)} unit="kg" sub={rate === null ? weightSub : `tendance ${formatKg(last.trend)} kg, ${weightSub}`} onPress={() => onOpen('poids')} />
        ) : (
          <Tile label="Poids" value="À noter" sub="ta première pesée" onPress={() => onOpen('poids')} />
        )}
        <Tile label="Séances" value={String(data.sessions)} sub={`en ${monthName}`} onPress={() => onOpen('seances')} border="left" />
      </View>
      <View style={{ flexDirection: 'row' }}>
        {data.tonnage > 0 ? (
          <Tile label="Volume" value={volumeText(data.tonnage)} sub={`${data.tonnage >= 1000 ? 'soulevées' : 'soulevés'} en ${monthName}`} onPress={() => onOpen('volume')} border="top" />
        ) : (
          <Tile label="Volume" value={data.minutes > 0 ? formatDuration(data.minutes) : '0 h'} sub={`d’entraînement en ${monthName}`} onPress={() => onOpen('volume')} border="top" />
        )}
        <Tile
          label="Records"
          value={String(data.records)}
          sub={data.recordsMonth > 0 ? `dont ${data.recordsMonth} en ${monthName}` : data.records > 0 ? 'battus depuis le début' : 'le prochain t’attend'}
          onPress={() => onOpen('records')}
          border="both"
          accessory={data.recordsMonth > 0 ? <Hanko size={18} /> : undefined}
        />
      </View>
    </View>
  );
}
