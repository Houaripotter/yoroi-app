/**
 * Onglet WODs (pack force) : sessions Hyrox, CrossFit, powerlifting, strongman.
 * Volume des 6 derniers mois, repartition par discipline, session la plus longue, dernieres sessions.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { getSportName } from '@/lib/sports';
import { sportsInPack } from '@/lib/sportPacks';
import type { Training } from '@/lib/database';
import { compact, humanMinutes, lastMonths, monthLabel, shortDate } from '@/lib/v2/carnet/format';
import { useTrainings } from '@/lib/v2/carnet/useCarnetData';
import { P, Sheet2, BigStats, Columns, RankRow, RecordTile, BlockTitle } from '../ui';
import { SessionLine, TabEmpty, TabLoading } from './common';

const FORCE = new Set(sportsInPack('force'));

export function WodsView({ refreshKey, hideEmpty }: { refreshKey: number; hideEmpty?: boolean }) {
  const { trainings, loading } = useTrainings((t) => FORCE.has(t.sport), refreshKey);

  const st = useMemo(() => {
    const n = trainings.length;
    const min = trainings.reduce((s, t) => s + (t.duration_minutes || 0), 0);
    const kcal = trainings.reduce((s, t) => s + (t.calories || 0), 0);
    const withI = trainings.filter((t) => t.intensity);
    const avgI = withI.length > 0 ? Math.round((withI.reduce((s, t) => s + (t.intensity || 0), 0) / withI.length) * 10) / 10 : 0;
    const bySport: Record<string, number> = {};
    const byMonth: Record<string, number> = {};
    for (const t of trainings) {
      bySport[t.sport] = (bySport[t.sport] || 0) + 1;
      const k = t.date.slice(0, 7);
      byMonth[k] = (byMonth[k] || 0) + 1;
    }
    const dist = Object.entries(bySport).map(([sport, count]) => ({ sport, count })).sort((a, b) => b.count - a.count);
    const months = lastMonths(6).map((k) => ({ label: monthLabel(k), value: byMonth[k] || 0 }));
    const longest = trainings.reduce<Training | null>((m, t) => ((t.duration_minutes || 0) > (m?.duration_minutes || 0) ? t : m), null);
    return { n, min, kcal, avgI, dist, months, longest };
  }, [trainings]);

  const recent = useMemo(() => [...trainings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10), [trainings]);

  if (loading) return <TabLoading />;
  if (trainings.length === 0) {
    return hideEmpty ? null : <TabEmpty title="Aucun WOD enregistré" text="Hyrox, CrossFit, powerlifting : ajoute tes sessions pour suivre ton volume et ton intensité." action="Ajouter une séance" href="/seance/deja-faite?sport=crossfit" />;
  }

  return (
    <View style={{ gap: 14 }}>
      <Sheet2>
        <BigStats
          items={[
            { value: String(st.n), label: 'sessions', color: P.accent },
            { value: humanMinutes(st.min), label: 'au total' },
            { value: compact(st.kcal), label: 'kcal' },
            { value: st.avgI ? `${String(st.avgI).replace('.', ',')}` : '--', unit: 'sur 10', label: 'intensité moyenne', color: P.indigo },
          ]}
        />
      </Sheet2>
      <Sheet2>
        <Ink size={18} weight="black" tight>Sessions, 6 mois</Ink>
        <Columns items={st.months} color={P.ink} />
      </Sheet2>
      {st.dist.length > 1 ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>Par discipline</Ink>
          {st.dist.map((d) => (
            <RankRow key={d.sport} title={getSportName(d.sport)} value={`${d.count} sur ${st.n}`} sub={`soit ${Math.round((d.count / st.n) * 100)} % de tes sessions`} ratio={d.count / st.dist[0].count} color={P.accent} />
          ))}
        </Sheet2>
      ) : null}
      {st.longest ? <RecordTile label="Session la plus longue" value={humanMinutes(st.longest.duration_minutes || 0)} sub={`${getSportName(st.longest.sport)}, ${shortDate(st.longest.date)}`} tone="gold" /> : null}
      <BlockTitle title="Dernières sessions" />
      {recent.map((t) => {
        const chips: string[] = [];
        if (t.duration_minutes) chips.push(humanMinutes(t.duration_minutes));
        if (t.intensity) chips.push(`effort ${t.intensity} sur 10`);
        if (t.calories) chips.push(`${t.calories} kcal`);
        return <SessionLine key={t.id ?? t.date} t={t} title={`${getSportName(t.sport)}${t.technical_theme ? `, ${t.technical_theme}` : ''}`} chips={chips} tone={P.accent} />;
      })}
    </View>
  );
}
