/**
 * Onglet Allures (pack endurance) : meilleurs temps sur 5 km, 10 km, semi et marathon,
 * allure moyenne des 6 derniers mois (barre haute = plus rapide).
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import { Ink } from '@/components/yoroi/v2/Ink';
import { sportsInPack } from '@/lib/sportPacks';
import { lastMonths, monthLabel, pace, shortDate } from '@/lib/v2/carnet/format';
import { kmOf, useTrainings } from '@/lib/v2/carnet/useCarnetData';
import { P, Sheet2, Columns, Hanko, BlockTitle } from '../ui';
import { TabEmpty, TabLoading } from './common';
import { blancA } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

const ENDURANCE = new Set(sportsInPack('endurance'));
const DISTANCES = [
  { label: traduire('5 km'), km: 5, tolerance: 0.5 },
  { label: '10 km', km: 10, tolerance: 1 },
  { label: 'Semi marathon', km: 21.1, tolerance: 2 },
  { label: 'Marathon', km: 42.195, tolerance: 3 },
];

function timeText(min: number): string {
  const total = Math.round(min * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0 ? `${h} h ${String(m).padStart(2, '0')} min ${String(s).padStart(2, '0')}` : `${m} min ${String(s).padStart(2, '0')}`;
}

export function AlluresView({ refreshKey, hideEmpty }: { refreshKey: number; hideEmpty?: boolean }) {
  const { trainings, loading } = useTrainings((t) => ENDURANCE.has(t.sport), refreshKey);

  const prs = useMemo(
    () =>
      DISTANCES.map((d) => {
        const cands = trainings.filter((t) => {
          const k = kmOf(t);
          return k >= d.km - d.tolerance && k <= d.km + d.tolerance && (t.duration_minutes || 0) > 0;
        });
        let best: { pace: number; date: string; min: number } | null = null;
        for (const t of cands) {
          const k = kmOf(t);
          const m = t.duration_minutes || 0;
          const p = (m * 60) / k;
          if (!best || p < best.pace) best = { pace: p, date: t.date, min: m };
        }
        return { ...d, best, count: cands.length };
      }),
    [trainings],
  );

  const evo = useMemo(() => {
    const byMonth: Record<string, { km: number; min: number }> = {};
    for (const t of trainings) {
      const k = kmOf(t);
      const m = t.duration_minutes || 0;
      if (k < 1 || m < 5) continue;
      const key = t.date.slice(0, 7);
      if (!byMonth[key]) byMonth[key] = { km: 0, min: 0 };
      byMonth[key].km += k;
      byMonth[key].min += m;
    }
    const series = lastMonths(6).map((key) => {
      const d = byMonth[key];
      return { key, label: monthLabel(key), pace: d && d.km > 0 ? (d.min * 60) / d.km : 0 };
    });
    const paces = series.filter((s) => s.pace > 0).map((s) => s.pace);
    const slow = paces.length ? Math.max(...paces) : 0;
    return { series, slow };
  }, [trainings]);

  if (loading) return <TabLoading />;
  if (trainings.length === 0) {
    return hideEmpty ? null : <TabEmpty title={traduire("Aucune allure enregistrée")} text={traduire("Cours au moins 5 km avec ton temps pour débloquer tes records par distance.")} action={traduire("Ajouter une sortie")} href="/seance/deja-faite?sport=running" />;
  }

  return (
    <View style={{ gap: 14 }}>
      <BlockTitle title={traduire("Tes meilleurs temps")} aside={traduire("Par distance, à quelques centaines de mètres près")} />
      {prs.map((p) => (
        <View key={p.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 22, backgroundColor: p.best ? P.white : blancA(0.55), borderWidth: 1, borderColor: P.line2 }}>
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={14} weight="bold" color={p.best ? P.indigo : P.muted}>{traduire(p.label)}</Ink>
            {p.best ? <Ink size={24} weight="black" tight>{timeText(p.best.min)}</Ink> : <Ink size={14} weight="medium" color={P.muted}>{traduire("Pas encore de sortie à cette distance")}</Ink>}
            {p.count > 0 ? <Ink size={12} weight="bold" color={P.muted}>{`${p.count} sortie${p.count > 1 ? 's' : ''}`}</Ink> : null}
          </View>
          {p.best ? (
            <View style={{ alignItems: 'flex-end', gap: 4 }}>
              <Hanko size={30} tampon="record_endurance" />
              <Ink size={16} weight="black" color={P.accent}>{`${pace(p.best.pace)} /km`}</Ink>
              <Ink size={11} weight="bold" color={P.muted}>{shortDate(p.best.date)}</Ink>
            </View>
          ) : null}
        </View>
      ))}
      {evo.series.some((s) => s.pace > 0) ? (
        <Sheet2>
          <Ink size={18} weight="black" tight>{traduire("Allure moyenne, 6 mois")}</Ink>
          <Columns items={evo.series.map((s) => ({ label: s.label, value: s.pace > 0 ? evo.slow * 1.15 - s.pace : 0, display: s.pace > 0 ? pace(s.pace) : '' }))} color={P.indigo} />
          <Ink size={12} weight="medium" color={P.muted}>{traduire("Plus la colonne est haute, plus tu as couru vite ce mois.")}</Ink>
        </Sheet2>
      ) : null}
    </View>
  );
}
