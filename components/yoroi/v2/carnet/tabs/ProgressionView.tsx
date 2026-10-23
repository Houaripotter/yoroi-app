/**
 * Onglet Progression (pack musculation, Premium) : maximum, premiere perf, gain et tendance
 * sur les gros mouvements, total des trois mouvements de force.
 */
import React, { useMemo } from 'react';
import { Glyph } from '@/components/yoroi/v2/ornements/Glyph';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { View, useWindowDimensions } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { InkLineChart } from '@/components/yoroi/v2/progres/InkLineChart';
import { shortDate } from '@/lib/v2/carnet/format';
import { useBenchmarks } from '@/lib/v2/carnet/useCarnetData';
import { P, Sheet2, CIcon, Hanko } from '../ui';
import { TabEmpty, TabLoading } from './common';

const LIFTS = [
  { key: 'squat', label: 'Squat', kw: ['squat', 'back squat', 'front squat'] },
  { key: 'bench', label: 'Développé couché', kw: ['développé couché', 'developpé couché', 'bench press', 'dc', 'bench'] },
  { key: 'deadlift', label: 'Soulevé de terre', kw: ['soulevé de terre', 'souleve de terre', 'deadlift', 'sdt'] },
  { key: 'ohp', label: 'Développé militaire', kw: ['développé militaire', 'developpé militaire', 'ohp', 'overhead press', 'dm'] },
  { key: 'row', label: 'Rowing barre', kw: ['rowing', 'barbell row', 'pendlay'] },
  { key: 'dips', label: 'Dips lestés', kw: ['dips'] },
  { key: 'pullup', label: 'Tractions lestées', kw: ['traction', 'tractions', 'pull-up', 'pullup', 'weighted pullup'] },
];

export function ProgressionView({ refreshKey, hideEmpty }: { refreshKey: number; hideEmpty?: boolean }) {
  const { benchmarks, loading } = useBenchmarks(refreshKey);
  const { width } = useWindowDimensions();

  const lifts = useMemo(
    () =>
      LIFTS.map((l) => {
        const entries: { value: number; date: string; reps?: number }[] = [];
        for (const b of benchmarks.filter((x) => l.kw.some((k) => x.name.toLowerCase().includes(k)))) {
          for (const e of b.entries || []) entries.push({ value: e.value, date: e.date, reps: e.reps });
        }
        entries.sort((a, b) => a.date.localeCompare(b.date));
        const best = entries.reduce<{ value: number; date: string; reps?: number } | null>((m, e) => (!m || e.value > m.value ? e : m), null);
        const first = entries[0] ?? null;
        const gain = first && best ? Math.round((best.value - first.value) * 10) / 10 : 0;
        const gainPct = first && best && first.value > 0 ? Math.round(((best.value - first.value) / first.value) * 100) : 0;
        const last3 = entries.slice(-3);
        const prev3 = entries.slice(-6, -3);
        const avg = (a: { value: number }[]) => (a.length ? a.reduce((s, e) => s + e.value, 0) / a.length : 0);
        const trend: 'up' | 'stable' | 'down' | null = !prev3.length ? null : avg(last3) > avg(prev3) + 1 ? 'up' : avg(last3) < avg(prev3) - 1 ? 'down' : 'stable';
        return { ...l, entries, best, first, gain, gainPct, trend };
      }).filter((l) => l.best),
    [benchmarks],
  );

  if (loading) return <TabLoading />;
  if (lifts.length === 0) {
    return hideEmpty ? null : <TabEmpty title="Aucune progression pour l’instant" text="Note tes perfs en squat, développé couché, soulevé de terre et autres gros mouvements dans l’onglet Records." />;
  }

  const squat = lifts.find((l) => l.key === 'squat')?.best?.value ?? 0;
  const bench = lifts.find((l) => l.key === 'bench')?.best?.value ?? 0;
  const dl = lifts.find((l) => l.key === 'deadlift')?.best?.value ?? 0;
  const total = Math.round((squat + bench + dl) * 10) / 10;

  return (
    <View style={{ gap: 14 }}>
      {total > 0 ? (
        <View style={{ borderRadius: 28, backgroundColor: P.ink, padding: 20, gap: 4, overflow: 'hidden' }}>
          <View pointerEvents="none" style={{ position: 'absolute', right: -6, top: -24 }}>
            <Glyph kind="sakura" size={140} color="rgba(255,255,255,0.05)" />
          </View>
          <Ink size={13} weight="bold" color={P.goldLight}>Total des trois mouvements</Ink>
          <Ink size={44} weight="black" tight color={P.white}>{`${String(total).replace('.', ',')} kg`}</Ink>
          <Ink size={13} weight="medium" color={paletteSombre() ? 'rgba(29,32,41,0.7)' : 'rgba(255,255,255,0.7)'}>{`Squat ${squat}, développé couché ${bench}, soulevé de terre ${dl}`}</Ink>
        </View>
      ) : null}
      {lifts.map((l) => (
        <Sheet2 key={l.key}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Ink size={17} weight="black" tight>{l.label}</Ink>
              <Ink size={12} weight="bold" color={P.muted}>{`${l.entries.length} perf${l.entries.length > 1 ? 's' : ''}${l.best ? `, record le ${shortDate(l.best.date)}` : ''}`}</Ink>
            </View>
            {l.trend ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, height: 30, borderRadius: 15, backgroundColor: l.trend === 'up' ? P.mossSoft : l.trend === 'down' ? P.dangerSoft : P.goldSoft }}>
                {l.trend !== 'stable' ? <CIcon name={l.trend} size={14} color={l.trend === 'up' ? P.mossText : P.danger} width={2.6} /> : null}
                <Ink size={12} weight="extraBold" color={l.trend === 'up' ? P.mossText : l.trend === 'down' ? P.danger : P.goldDark}>{l.trend === 'up' ? 'En progrès' : l.trend === 'down' ? 'En baisse' : 'Stable'}</Ink>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 14 }}>
            <View>
              <Ink size={12} weight="bold" color={P.ink2}>Record</Ink>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ink size={30} weight="black" tight color={P.accent}>{`${String(l.best!.value).replace('.', ',')} kg`}</Ink>
                <Hanko size={26} />
              </View>
              {l.best!.reps && l.best!.reps > 1 ? <Ink size={12} weight="bold" color={P.muted}>{`x ${l.best!.reps} répétitions`}</Ink> : null}
            </View>
            {l.first && l.entries.length > 1 ? (
              <View>
                <Ink size={12} weight="bold" color={P.ink2}>Depuis le début</Ink>
                <Ink size={22} weight="black" tight color={l.gain >= 0 ? P.mossText : P.danger}>{`${l.gain >= 0 ? '+' : ''}${String(l.gain).replace('.', ',')} kg`}</Ink>
                <Ink size={12} weight="bold" color={P.muted}>{`${l.gainPct >= 0 ? '+' : ''}${String(l.gainPct).replace('.', ',')} %, départ ${String(l.first.value).replace('.', ',')} kg`}</Ink>
              </View>
            ) : null}
          </View>
          {/* vague 45 : la courbe de poids pour modele (trait, halo, point final, reperes a droite, mois, le doigt lit chaque perf) */}
          {l.entries.length > 1 ? (
            <InkLineChart
              points={l.entries.map((e) => ({ date: e.date, value: e.value, record: e === l.best }))}
              domaine="seances"
              height={174}
              digits={1}
              format={(v) => `${String(Math.round(v * 10) / 10).replace('.', ',')} kg`}
              label={`Ta progression en ${l.label}`}
            />
          ) : null}
        </Sheet2>
      ))}
    </View>
  );
}
