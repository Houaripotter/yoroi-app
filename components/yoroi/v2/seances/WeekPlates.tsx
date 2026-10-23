/**
 * La semaine en un indicateur sportif simple : une pastille par jour
 * (faite, prevue, manquee, repos). Les plaques kozane restent reservees au dojo.
 */
import React from 'react';
import { View } from 'react-native';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import type { SlotOccurrence, Training, WeeklyPlan } from '@/lib/database';
import { PLAN_DAYS_SHORT, addDaysISO, isoOf } from '@/lib/v2/seances/sessionData';
import { mondayOf } from '@/lib/v2/trainingWeek';
import Svg, { Path } from 'react-native-svg';
import type { PlateState } from './ui';
import { P } from '@/components/yoroi/livePalette';

export type DayPlate = { iso: string; state: PlateState; count: number; isToday: boolean };

/**
 * typeDays (vague 28) : jours choisis a l'onboarding ou dans les Reglages (0 = lundi), utilises seulement
 * quand le planning n'a aucun creneau d'entrainement : un planning existant n'est jamais remplace.
 * Un jour choisi passe sans seance reste simplement libre (pas « manque ») : ce n'est pas un rendez-vous.
 */
export function computeWeekPlates(trainings: Training[], plan: WeeklyPlan[], occurrences: SlotOccurrence[], todayIso: string = isoOf(new Date()), typeDays: number[] = []): DayPlate[] {
  const monday = mondayOf(todayIso);
  const sansPlanning = !plan.some((p) => !p.is_rest_day);
  const out: DayPlate[] = [];
  for (let i = 0; i < 7; i++) {
    const iso = addDaysISO(monday, i);
    const count = trainings.filter((t) => t.date.slice(0, 10) === iso).length;
    const slots = plan.filter((p) => p.day_of_week === i);
    const work = slots.filter((s) => !s.is_rest_day);
    const rest = slots.some((s) => s.is_rest_day);
    let state: PlateState = 'empty';
    if (count > 0) state = 'done';
    else if (work.length > 0) {
      const allCancelled = work.every((s) => occurrences.find((o) => o.weekly_plan_id === s.id)?.status === 'cancelled');
      state = iso < todayIso || allCancelled ? 'missed' : 'planned';
    } else if (rest) state = 'rest';
    else if (sansPlanning && typeDays.includes(i) && iso >= todayIso) state = 'planned';
    out.push({ iso, state, count, isToday: iso === todayIso });
  }
  return out;
}

/** Pastille d'un jour : pleine si seance faite, pointillee si prevue */
export function DayDot({ state, count, size }: { state: PlateState; count: number; size: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const r = size / 2;
  const base = { width: size, height: size, borderRadius: r, alignItems: 'center' as const, justifyContent: 'center' as const };
  if (state === 'done') {
    return (
      <View style={[base, { backgroundColor: c.ink }]}>
        {count > 1 ? (
          <Ink size={12} weight="black" color={c.background}>{String(count)}</Ink>
        ) : (
          <Svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24">
            <Path d="M5 12.5l4.5 4.5L19 7.5" stroke={c.background} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        )}
      </View>
    );
  }
  if (state === 'planned') return <View style={[base, { borderWidth: 2, borderStyle: 'dashed', borderColor: c.ink, backgroundColor: P.carte }]} />;
  if (state === 'missed') return <View style={[base, { borderWidth: 2, borderColor: c.border, backgroundColor: c.fillSubtle }]} />;
  if (state === 'rest') {
    return (
      <View style={[base, { backgroundColor: c.fillSoft }]}>
        <Svg width={size * 0.45} height={size * 0.45} viewBox="0 0 24 24">
          <Path d="M17 14a6 6 0 1 1-6-7 4.6 4.6 0 0 0 6 7z" fill={c.textMuted} />
        </Svg>
      </View>
    );
  }
  return <View style={[base, { backgroundColor: c.fillSubtle }]} />;
}

export function WeekPlates({ plates, size = 1 }: { plates: DayPlate[]; size?: number }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
      {plates.map((p, i) => (
        <View key={p.iso} style={{ alignItems: 'center', gap: 6 }} accessibilityLabel={`${PLAN_DAYS_SHORT[i]} ${p.state === 'done' ? 'fait' : p.state === 'planned' ? 'prévu' : p.state === 'missed' ? 'manqué' : p.state === 'rest' ? 'repos' : 'libre'}`}>
          <DayDot state={p.state} count={p.count} size={32 * size} />
          <Ink size={12} weight={p.isToday ? 'black' : 'bold'} color={p.isToday ? c.accent : c.textMuted}>{PLAN_DAYS_SHORT[i]}</Ink>
        </View>
      ))}
    </View>
  );
}
