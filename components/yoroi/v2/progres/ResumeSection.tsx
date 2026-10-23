/**
 * Progres, onglet Resume (vague 26) : le retour de l'ancien onglet Stats.
 * Une seule periode pour toutes les cartes, la grille de mini courbes Corps, Composition,
 * Mensurations, puis les seances par semaine. Chaque carte ouvre son detail.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { GUTTER } from './ui';
import { bodyGroup, compositionGroup, measuresGroup, MiniCurveGrid } from './MiniCurveGrid';
import { TrainingCharts } from './TrainingCharts';
import { PeriodSwitch, SHORT_PERIODS } from '../charts/PeriodSwitch';
import { useWeightData } from '@/lib/v2/useWeightData';
import { useMeasuresData, useTrainingsData } from '@/lib/v2/progres/useProgresData';
import { useBiomarkers } from '@/lib/v2/progres/biomarkers';
import { todayIso } from '@/lib/v2/progres/format';

export function ResumeSection({ onOpenForce }: { onOpenForce?: () => void }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [period, setPeriod] = useState<number>(30);
  const weights = useWeightData();
  const bio = useBiomarkers();
  const measures = useMeasuresData();
  const { trainings } = useTrainingsData();
  const today = todayIso();
  const nav = (href: any) => router.push(href);

  const groups = useMemo(
    () => [bodyGroup(weights.series, bio.points, bio.ctx, nav, c.ink), compositionGroup(bio.points, bio.ctx, nav), measuresGroup(measures.points, nav)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weights.series, bio.points, bio.ctx, measures.points, c.ink],
  );
  const loading = weights.loading || bio.loading || measures.loading;

  return (
    <View style={{ paddingTop: 16 }}>
      <View style={{ paddingHorizontal: GUTTER, gap: 6 }}>
        <PeriodSwitch value={period} onChange={setPeriod} options={SHORT_PERIODS} />
        <Ink size={12} color={c.textSecondary}>
          La même période pour toutes tes courbes. Touche une carte pour son détail.
        </Ink>
      </View>
      {loading ? <View style={{ height: 420 }} /> : <MiniCurveGrid groups={groups} period={period} today={today} style={{ marginTop: 18 }} />}
      {trainings.length ? (
        <View style={{ paddingHorizontal: GUTTER, marginTop: 30 }}>
          <TrainingCharts trainings={trainings} compact more={onOpenForce ? { label: 'Tout voir', onPress: onOpenForce } : undefined} />
        </View>
      ) : null}
    </View>
  );
}
