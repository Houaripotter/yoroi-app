/**
 * Onglet Seances (pack musculation) : volume, duree moyenne, rythme par semaine,
 * repartition par split (push, pull, legs...) et dernieres seances.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { humanMinutes } from '@/lib/v2/carnet/format';
import { useTrainings } from '@/lib/v2/carnet/useCarnetData';
import { P, Sheet2, BigStats, RankRow, BlockTitle } from '../ui';
import { SessionLine, TabEmpty, TabLoading } from './common';

const SPLITS: Record<string, { label: string; kw: string[] }> = {
  push: { label: 'Push', kw: ['push', 'pecs', 'épaules', 'triceps', 'dc', 'dm', 'développé couché', 'développé militaire'] },
  pull: { label: 'Pull', kw: ['pull', 'dos', 'biceps', 'rowing', 'traction', 'tirage', 'sdt', 'soulevé'] },
  legs: { label: 'Jambes', kw: ['legs', 'jambes', 'quadri', 'ischio', 'squat', 'fente', 'mollet'] },
  upper: { label: 'Haut du corps', kw: ['upper', 'haut du corps'] },
  lower: { label: 'Bas du corps', kw: ['lower', 'bas du corps'] },
  full: { label: 'Corps entier', kw: ['full', 'full body', 'circuit'] },
  abs: { label: 'Abdos', kw: ['abdos', 'core', 'gainage', 'abs'] },
};

export function detectSplit(theme: string): { key: string; label: string } | null {
  const l = theme.toLowerCase();
  for (const [key, m] of Object.entries(SPLITS)) if (m.kw.some((k) => l.includes(k))) return { key, label: m.label };
  return null;
}

const TONES = ['#6E8C3A', '#3D5D9E', '#A8832F'];

export function SeancesMuscuView({ refreshKey, hideEmpty }: { refreshKey: number; hideEmpty?: boolean }) {
  const { trainings, loading } = useTrainings((t) => ['musculation', 'bodybuilding', 'fitness'].includes(t.sport), refreshKey);

  const st = useMemo(() => {
    const n = trainings.length;
    const min = trainings.reduce((s, t) => s + (t.duration_minutes || 0), 0);
    const splits: Record<string, number> = {};
    for (const t of trainings) {
      const sp = detectSplit(t.technical_theme || '');
      if (sp) splits[sp.key] = (splits[sp.key] || 0) + 1;
    }
    const dist = Object.entries(splits).map(([key, count]) => ({ key, count, label: SPLITS[key].label })).sort((a, b) => b.count - a.count);
    const weeks = new Set<string>();
    for (const t of trainings) {
      const d = new Date(t.date);
      const y = d.getFullYear();
      weeks.add(`${y}-${Math.ceil((d.getTime() - new Date(y, 0, 1).getTime()) / (7 * 86400000))}`);
    }
    const perWeek = weeks.size > 0 ? (n / weeks.size).toFixed(1).replace('.', ',') : '0';
    return { n, min, avg: n > 0 ? Math.round(min / n) : 0, dist, perWeek };
  }, [trainings]);

  const recent = useMemo(() => [...trainings].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 12), [trainings]);

  if (loading) return <TabLoading />;
  if (trainings.length === 0) {
    return hideEmpty ? null : <TabEmpty title="Aucune séance de musculation" text="Lance ta première séance : tes séries, tes charges et ton split apparaîtront ici." action="Commencer une séance" href="/seance/muscu" />;
  }

  return (
    <View style={{ gap: 14 }}>
      <Sheet2>
        <BigStats
          items={[
            { value: String(st.n), label: 'séances', color: P.accent },
            { value: humanMinutes(st.min), label: 'au total' },
            { value: `${st.avg}`, unit: 'min', label: 'par séance' },
            { value: st.perWeek, label: 'par semaine', color: P.indigo },
          ]}
        />
      </Sheet2>
      {st.dist.length > 0 ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>Ton split</Ink>
          {st.dist.map((d, i) => (
            <RankRow key={d.key} title={d.label} value={`${d.count} séance${d.count > 1 ? 's' : ''}`} ratio={d.count / st.dist[0].count} color={TONES[i % TONES.length]} />
          ))}
        </Sheet2>
      ) : null}
      <BlockTitle title="Dernières séances" />
      {recent.map((t) => {
        const sp = detectSplit(t.technical_theme || '');
        const chips: string[] = [];
        if (sp) chips.push(sp.label);
        if (t.duration_minutes) chips.push(humanMinutes(t.duration_minutes));
        if (t.calories) chips.push(`${t.calories} kcal`);
        return <SessionLine key={t.id ?? t.date} t={t} title={t.technical_theme || 'Musculation'} chips={chips} tone={P.accent} />;
      })}
    </View>
  );
}
