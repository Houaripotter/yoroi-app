/**
 * Onglet Stations (pack force) : meilleurs temps sur les 8 stations Hyrox et maximums
 * des 4 mouvements de force, lus dans tes records du carnet.
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { shortDate } from '@/lib/v2/carnet/format';
import { useBenchmarks } from '@/lib/v2/carnet/useCarnetData';
import { P, Sheet2, Hanko, BlockTitle } from '../ui';
import { TabEmpty, TabLoading } from './common';
import { blancA, paletteSombre } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

const STATIONS = [
  { key: 'ski_erg', label: 'SkiErg', unit: 'sec', target: '1000 m', kw: ['ski erg', 'skierg', 'ski-erg'] },
  { key: 'sled_push', label: 'Sled push', unit: 'sec', target: '50 m', kw: ['sled push', 'sled-push', 'push sled', 'traîneau poussé'] },
  { key: 'sled_pull', label: 'Sled pull', unit: 'sec', target: '50 m', kw: ['sled pull', 'sled-pull', 'pull sled', 'traîneau tiré'] },
  { key: 'burpee_broad_jump', label: 'Burpee broad jump', unit: 'sec', target: '80 m', kw: ['burpee broad jump', 'burpee-broad', 'bbj', 'burpee jump'] },
  { key: 'rower', label: 'Rameur', unit: 'sec', target: '1000 m', kw: ['rower', 'rameur', 'rowing'] },
  { key: 'farmer_carry', label: 'Farmer carry', unit: 'sec', target: '200 m, 24 kg', kw: ['farmer carry', 'farmer', 'farmers walk', 'farmer walk'] },
  { key: 'sandbag_lunges', label: 'Sandbag lunges', unit: 'sec', target: '100 m, 20 kg', kw: ['sandbag lunges', 'sandbag', 'lunges sandbag'] },
  { key: 'wall_balls', label: 'Wall balls', unit: 'reps', target: '100, 6 kg', kw: ['wall ball', 'wall-ball', 'wall balls', 'wallball'] },
];

const FORCE_LIFTS = [
  { key: 'squat', label: 'Squat', kw: ['squat', 'back squat', 'front squat'] },
  { key: 'bench', label: traduire('Développé couché'), kw: ['développé couché', 'developpé couché', 'bench press', 'developpe couche', 'dc', 'bench'] },
  { key: 'deadlift', label: traduire('Soulevé de terre'), kw: ['soulevé de terre', 'souleve de terre', 'deadlift', 'sdt'] },
  { key: 'press', label: 'Développé militaire', kw: ['développé militaire', 'developpé militaire', 'ohp', 'overhead press', 'militaire'] },
];

const has = (name: string, kws: string[]) => kws.some((k) => name.toLowerCase().includes(k));

function sec(s: number): string {
  if (!isFinite(s) || s <= 0) return '--';
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `${r} s`;
}

export function StationsView({ refreshKey, hideEmpty }: { refreshKey: number; hideEmpty?: boolean }) {
  const { benchmarks, loading } = useBenchmarks(refreshKey);

  const stations = useMemo(
    () =>
      STATIONS.map((st) => {
        let best: { value: number; date: string } | null = null;
        let total = 0;
        for (const b of benchmarks.filter((x) => has(x.name, st.kw))) {
          for (const e of b.entries || []) {
            total++;
            const wall = st.key === 'wall_balls';
            if (!best || (wall ? e.value > best.value : e.value < best.value)) best = { value: e.value, date: e.date };
          }
        }
        return { ...st, best, total };
      }),
    [benchmarks],
  );

  const lifts = useMemo(
    () =>
      FORCE_LIFTS.map((l) => {
        let best: { value: number; date: string; reps?: number } | null = null;
        let total = 0;
        for (const b of benchmarks.filter((x) => has(x.name, l.kw))) {
          for (const e of b.entries || []) {
            total++;
            if (!best || e.value > best.value) best = { value: e.value, date: e.date, reps: e.reps };
          }
        }
        return { ...l, best, total };
      }),
    [benchmarks],
  );

  if (loading) return <TabLoading />;
  const any = stations.some((s) => s.best) || lifts.some((l) => l.best);
  if (!any) {
    return hideEmpty ? null : <TabEmpty title={traduire("Aucune station enregistrée")} text={traduire("Note tes temps sur les 8 stations Hyrox ou tes maximums en squat, développé couché et soulevé de terre dans l’onglet Records.")} />;
  }

  const squat = lifts.find((l) => l.key === 'squat')?.best?.value ?? 0;
  const bench = lifts.find((l) => l.key === 'bench')?.best?.value ?? 0;
  const dl = lifts.find((l) => l.key === 'deadlift')?.best?.value ?? 0;
  const total = squat + bench + dl;

  return (
    <View style={{ gap: 14 }}>
      <BlockTitle title={traduire("Les 8 stations Hyrox")} aside={traduire("Ton meilleur temps sur chaque station")} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {stations.map((s, i) => (
          <View key={s.key} style={{ flexBasis: '48%', flexGrow: 1, borderRadius: 20, padding: 14, gap: 4, backgroundColor: s.best ? P.white : blancA(0.55), borderWidth: 1, borderColor: P.line2 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <Ink size={12} weight="black" color={P.muted}>{String(i + 1)}</Ink>
              {s.best ? <Hanko size={22} tampon="record_technique" /> : null}
            </View>
            <Ink size={14} weight="extraBold" numberOfLines={1}>{traduire(s.label)}</Ink>
            <Ink size={24} weight="black" tight color={s.best ? P.accent : P.dashed}>{s.best ? (s.unit === 'sec' ? sec(s.best.value) : `${s.best.value} reps`) : '--'}</Ink>
            <Ink size={11} weight="bold" color={P.muted}>{s.best ? traduire("{0}, objectif {1}", shortDate(s.best.date), s.target) : traduire("Objectif {0}", s.target)}</Ink>
          </View>
        ))}
      </View>
      {lifts.some((l) => l.best) ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>Maximums en force</Ink>
          {lifts.filter((l) => l.best).map((l) => (
            <View key={l.key} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Ink size={15} weight="bold">{traduire(l.label)}</Ink>
                <Ink size={12} weight="bold" color={P.muted}>{`${l.total} perf${l.total > 1 ? 's' : ''}, ${shortDate(l.best!.date)}`}</Ink>
              </View>
              <Ink size={24} weight="black" tight color={P.accent}>
                {`${l.best!.value}`}
                <Ink size={13} weight="bold" color={P.muted}>{` kg${l.best!.reps && l.best!.reps > 1 ? ` x ${l.best!.reps}` : ''}`}</Ink>
              </Ink>
            </View>
          ))}
          {total > 0 ? (
            <View style={{ borderRadius: 18, backgroundColor: P.ink, padding: 16, gap: 2 }}>
              <Ink size={12} weight="bold" color={P.goldLight}>{traduire("Total des trois mouvements")}</Ink>
              <Ink size={32} weight="black" tight color={P.white}>{`${total} kg`}</Ink>
              <Ink size={12} weight="medium" color={paletteSombre() ? 'rgba(29,32,41,0.7)' : 'rgba(255,255,255,0.7)'}>{traduire("Squat {0}, développé couché {1}, soulevé de terre {2}", squat, bench, dl)}</Ink>
            </View>
          ) : null}
        </Sheet2>
      ) : null}
    </View>
  );
}
