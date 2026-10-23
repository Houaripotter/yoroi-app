/**
 * Onglet Sorties (pack endurance) : kilometres, temps, allure moyenne, volume des 6 derniers mois,
 * records (plus longue sortie, meilleure allure) et dernieres sorties.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { getSportName } from '@/lib/sports';
import { sportsInPack } from '@/lib/sportPacks';
import { humanMinutes, lastMonths, monthLabel, pace, shortDate } from '@/lib/v2/carnet/format';
import { kmOf, useTrainings } from '@/lib/v2/carnet/useCarnetData';
import { P, Sheet2, BigStats, Columns, RecordTile, BlockTitle } from '../ui';
import { Ink } from '@/components/yoroi/v2/Ink';
import { SessionLine, TabEmpty, TabLoading } from './common';

const ENDURANCE = new Set(sportsInPack('endurance'));

export function SortiesView({ refreshKey, hideEmpty }: { refreshKey: number; hideEmpty?: boolean }) {
  const { trainings, loading } = useTrainings((t) => ENDURANCE.has(t.sport), refreshKey);

  const st = useMemo(() => {
    let km = 0;
    let min = 0;
    let longest = 0;
    let longestDate = '';
    let fastest = Infinity;
    let fastestDate = '';
    const byMonth: Record<string, number> = {};
    for (const t of trainings) {
      const k = kmOf(t);
      const m = t.duration_minutes || 0;
      km += k;
      min += m;
      if (k > longest) {
        longest = k;
        longestDate = t.date;
      }
      if (k >= 1 && m >= 5) {
        const p = (m * 60) / k;
        if (p < fastest) {
          fastest = p;
          fastestDate = t.date;
        }
      }
      const key = t.date.slice(0, 7);
      byMonth[key] = (byMonth[key] || 0) + k;
    }
    const months = lastMonths(6).map((key) => ({ label: monthLabel(key), value: byMonth[key] || 0, display: String(Math.round(byMonth[key] || 0)) }));
    return { km: Math.round(km * 10) / 10, min, avg: km > 0 ? (min * 60) / km : 0, longest: Math.round(longest * 10) / 10, longestDate, fastest, fastestDate, months };
  }, [trainings]);

  const recent = useMemo(() => [...trainings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10), [trainings]);

  if (loading) return <TabLoading />;
  if (trainings.length === 0) {
    return hideEmpty ? null : <TabEmpty title="Aucune sortie pour l’instant" text="Course, trail, vélo, natation : ajoute tes sorties pour voir tes kilomètres, ton allure et tes records." action="Ajouter une sortie" href="/seance/deja-faite?sport=running" />;
  }

  return (
    <View style={{ gap: 14 }}>
      <Sheet2>
        <BigStats
          items={[
            { value: String(st.km).replace('.', ','), unit: 'km', label: 'au total', color: P.indigo },
            { value: String(trainings.length), label: 'sorties' },
            { value: humanMinutes(st.min), label: 'de course' },
            { value: pace(st.avg), unit: '/km', label: 'allure moyenne', color: P.accent },
          ]}
        />
      </Sheet2>
      <Sheet2>
        <Ink size={18} weight="black" tight>Kilomètres, 6 mois</Ink>
        <Columns items={st.months} color={P.indigo} />
      </Sheet2>
      {st.longest > 0 || isFinite(st.fastest) ? (
        <View style={{ flexDirection: 'row', gap: 10 }}>
          {st.longest > 0 ? <RecordTile label="Plus longue" value={`${String(st.longest).replace('.', ',')} km`} sub={shortDate(st.longestDate)} tone="indigo" /> : null}
          {isFinite(st.fastest) ? <RecordTile label="Meilleure allure" value={`${pace(st.fastest)} /km`} sub={shortDate(st.fastestDate)} tone="red" /> : null}
        </View>
      ) : null}
      <BlockTitle title="Dernières sorties" />
      {recent.map((t) => {
        const k = kmOf(t);
        const m = t.duration_minutes || 0;
        const chips: string[] = [];
        if (k > 0) chips.push(`${k} km`);
        if (m > 0) chips.push(humanMinutes(m));
        if (k >= 1 && m >= 5) chips.push(`${pace((m * 60) / k)} /km`);
        if (t.calories) chips.push(`${t.calories} kcal`);
        return <SessionLine key={t.id ?? t.date} t={t} title={getSportName(t.sport)} chips={chips} tone={P.indigo} />;
      })}
    </View>
  );
}
