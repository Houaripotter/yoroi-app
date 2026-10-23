/**
 * Detail de la force v2, ouvert d'un appui sur la courbe de Force dans Progres :
 * maximum estime d'un exercice au doigt, tampons rouges sur les records, periode,
 * moyenne, plus bas, plus haut, evolution, explication et historique des seances.
 * Parametre optionnel : lift (cle de l'exercice).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { GlassCard, GhostButton, GUTTER, Hanko, LegendMark, Pills } from '@/components/yoroi/v2/progres/ui';
import { MetricDetail } from '@/components/yoroi/v2/progres/MetricDetail';
import type { DetailPoint } from '@/components/yoroi/v2/progres/MetricDetail';
import { FORCE_EXPLAIN } from '@/components/yoroi/v2/progres/explain';
import { RECORD_RED } from '@/components/yoroi/v2/charts/core';
import { couleurTraitDomaine } from '@/components/yoroi/v2/charts/couleurDomaine';
import { usePrefsCourbes } from '@/lib/v2/courbes/prefs';
import { useTrainingsData } from '@/lib/v2/progres/useProgresData';
import { computeLifts } from '@/lib/v2/progres/strength';
import { dayLong, num } from '@/lib/v2/progres/format';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { versUnitePoids } from '@/lib/v2/unitePoids';

function reps(n: number): string {
  return `${n} répétition${n > 1 ? 's' : ''}`;
}

export default function ForceDetailScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const params = useLocalSearchParams<{ lift?: string }>();
  const { trainings, loading } = useTrainingsData();
  const lifts = useMemo(() => computeLifts(trainings), [trainings]);
  const [key, setKey] = useState<string | null>(params.lift ?? null);

  useEffect(() => {
    if (params.lift) setKey(params.lift);
  }, [params.lift]);

  const lift = lifts.find((l) => l.key === key) ?? lifts[0];
  // 18 octobre 2026 : charges stockees en kilos, affichees dans l'unite du reglage (kilos ou livres)
  const unite = useUnitePoids();
  const cv = (kg: number) => versUnitePoids(kg, unite);
  const mot = unite === 'lb' ? 'livres' : 'kilos';
  const points: DetailPoint[] = useMemo(
    () => (lift ? lift.points.map((p) => ({ date: p.date, value: versUnitePoids(p.value, unite), record: p.record, caption: `${num(versUnitePoids(p.weight, unite), 1)} ${unite === 'lb' ? 'livres' : 'kilos'} pour ${reps(p.reps)}` })) : []),
    [lift, unite],
  );
  // 16 octobre : l'indigo des seances (accueil) ou la couleur choisie dans Reglages, Tes courbes
  const courbes = usePrefsCourbes();
  const trait = couleurTraitDomaine('seances', courbes.couleur);
  const lastRecord = lift ? [...lift.points].reverse().find((p) => p.record) ?? null : null;

  return (
    <MetricDetail
      key={`${lift?.key ?? 'vide'}-${unite}`}
      title={lift?.name ?? 'Ta force'}
      sub="Ton maximum estimé sur une répétition, séance après séance."
      picker={
        lifts.length > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 12 }}>
            <Pills scroll items={lifts.slice(0, 20).map((l) => ({ value: l.key, label: l.name }))} value={lift?.key ?? ''} onChange={(k) => setKey(k)} />
          </ScrollView>
        ) : null
      }
      spec={{ label: 'Maximum estimé', unit: unite === 'lb' ? 'lb' : 'kg', digits: 1, good: 'up', deltaOne: unite === 'lb' ? 'livre' : 'kilo', deltaMany: mot, eps: 0.5, minSpan: 4 }}
      points={points}
      color={trait}
      domaine="seances"
      explain={FORCE_EXPLAIN}
      loading={loading}
      defaultPeriod={180}
      scrubLine={(p) => p.caption ?? ' '}
      historyNoun={['séance', 'séances']}
      legend={
        <>
          <LegendMark kind="line" color={trait} label="maximum estimé" />
          <LegendMark kind="seal" color={RECORD_RED} label="record" />
        </>
      }
      after={
        <View style={{ paddingHorizontal: GUTTER, marginTop: 16, gap: 12 }}>
          {lastRecord ? (
            <GlassCard style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
              <Hanko size={30} tampon="record_force" />
              <View style={{ flex: 1, gap: 2 }}>
                <Ink size={15} weight="extraBold">{`Dernier record, ${dayLong(lastRecord.date)}`}</Ink>
                <Ink size={13} color={c.textSecondary}>{`${num(cv(lastRecord.weight), 1)} ${mot} pour ${reps(lastRecord.reps)}, soit ${num(cv(lastRecord.value), cv(lastRecord.value) >= 100 ? 0 : 1)} ${mot} estimé${unite === 'lb' ? 'e' : ''}s`}</Ink>
              </View>
            </GlassCard>
          ) : null}
          <GhostButton label="Tous tes records" onPress={() => router.push('/records' as any)} />
        </View>
      }
      empty={{
        title: 'Pas encore de courbe de force',
        text: 'Note tes séries avec la charge et les répétitions. YOROI estime ton maximum et marque chaque record.',
        plusHint: 'Note ta séance avec le bouton + de la barre d’onglets',
      }}
    />
  );
}
