/**
 * Progres, section Force (maquette G3) : maximum estime par exercice au pinceau
 * avec tampons sur les records, series par muscle sur la semaine, tonnage par semaine.
 * Vague 40 : part='force' (maximum, muscles, tonnage) et part='cardio' (analyses, seances et duree
 * par semaine, effort, par sport) pour les onglets Force et Cardio de Progres ; sans part, tout.
 * La carte des muscles travailles (venue de Seances) accompagne les series par muscle.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { InkLineChart } from './InkLineChart';
import type { ChartPoint } from './InkLineChart';
import { InkBarChart } from './InkBarChart';
import { DetailCue, GlassCard, GUTTER, Hanko, LegendMark, Pills, SectionHead, tapLight } from './ui';
import { ExamplePreview } from './ExamplePreview';
import { AnalysesRow, TrainingCharts } from './TrainingCharts';
import { MuscleMap, MuscleScale } from '../seances/MuscleMap';
import { weekMuscles } from '@/lib/v2/seances/weekSummary';
import { sampleLift } from '@/lib/v2/progres/samples';
import { PeriodSwitch } from '../charts/PeriodSwitch';
import { BadgeRecord, CHART_COLORS, RECORD_RED, tint } from '../charts/core';
import { couleurTraitDomaine } from '../charts/couleurDomaine';
import { useTrainingsData } from '@/lib/v2/progres/useProgresData';
import { computeLifts, hasStrengthData, MUSCLE_ORDER, setsByMuscle, weeklyTonnage } from '@/lib/v2/progres/strength';
import type { LiftPoint } from '@/lib/v2/progres/strength';
import { accordSouleve, formatTonnage, mondayOf } from '@/lib/v2/trainingWeek';
import { useUnitePoids } from '@/components/yoroi/v2/espace/reglages/prefs';
import { versUnitePoids, type UnitePoids } from '@/lib/v2/unitePoids';
import { dayLong, dayShort, daysDiff, monthLong, num, shiftDays, thousands, todayIso } from '@/lib/v2/progres/format';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

function kilos(v: number): string {
  return `${num(v, v >= 100 ? 0 : 1)}`;
}

/** Format unique du tonnage (lib/v2/trainingWeek) */
export function tonnageText(kg: number, unite: UnitePoids = 'kg'): string {
  return formatTonnage(kg, unite);
}

export function ForceSection({ part }: { part?: 'force' | 'cardio' } = {}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { trainings, loading } = useTrainingsData();
  // 18 octobre 2026 : charges stockees en kilos, affichees dans l'unite du reglage (kilos ou livres)
  const unite = useUnitePoids();
  const cv = (kg: number) => versUnitePoids(kg, unite);
  const mot = unite === 'lb' ? 'livres' : 'kilos';
  const mot1 = unite === 'lb' ? 'livre' : 'kilo';
  const lifts = useMemo(() => computeLifts(trainings), [trainings]);
  const [liftKey, setLiftKey] = useState<string | null>(null);
  const [period, setPeriod] = useState(180);
  const [scrub, setScrub] = useState<ChartPoint | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);
  const [tonSel, setTonSel] = useState<number | null>(null);
  const today = todayIso();

  useEffect(() => {
    if (lifts.length && (!liftKey || !lifts.some((l) => l.key === liftKey))) setLiftKey(lifts[0].key);
  }, [lifts, liftKey]);

  const lift = lifts.find((l) => l.key === liftKey) ?? lifts[0];
  const shown: LiftPoint[] = useMemo(() => {
    if (!lift) return [];
    return period ? lift.points.filter((p) => daysDiff(p.date, today) <= period) : lift.points;
  }, [lift, period, today]);

  const weekStart = shiftDays(mondayOf(today), -7 * weekOffset);
  const muscles = useMemo(() => setsByMuscle(trainings, weekStart, shiftDays(weekStart, 6)), [trainings, weekStart]);
  const maxSets = Math.max(20, ...MUSCLE_ORDER.map((m) => muscles[m]));
  const tonnage = useMemo(() => weeklyTonnage(trainings, today, 10), [trainings, today]);
  const muscleLoads = useMemo(() => weekMuscles(trainings, today), [trainings, today]);
  const showCardio = part !== 'force';
  const showForce = part !== 'cardio';
  const tonAvg = useMemo(() => {
    const done = tonnage.slice(0, -1).filter((b) => b.value > 0);
    return done.length ? done.reduce((s, b) => s + b.value, 0) / done.length : null;
  }, [tonnage]);

  if (part === 'cardio') {
    return (
      <View style={{ paddingTop: 10 }}>
        <AnalysesRow style={{ marginHorizontal: GUTTER }} />
        {trainings.length ? <TrainingCharts trainings={trainings} style={{ marginHorizontal: GUTTER, marginTop: 26 }} /> : null}
      </View>
    );
  }

  if (!loading && !hasStrengthData(trainings)) {
    const ex = sampleLift(today);
    return (
      <View style={{ paddingTop: showCardio ? 18 : 6, gap: 26 }}>
        {showCardio ? <AnalysesRow style={{ marginHorizontal: GUTTER }} /> : null}
        {showCardio && trainings.length ? <TrainingCharts trainings={trainings} style={{ marginHorizontal: GUTTER }} /> : null}
        {showCardio ? <SectionHead title={traduire("Ta force")} style={{ marginHorizontal: GUTTER, marginBottom: -14 }} /> : null}
        <ExamplePreview
          title={traduire("Tes courbes de force naissent ici")}
          text={traduire("Note tes séries avec la charge et les répétitions. YOROI estime ton maximum sur une répétition et marque chaque record.")}
          plusHint={traduire("Touche + pour noter ta séance")}
        >
          <Ink size={14} weight="bold" color={c.textSecondary}>
            {traduire("{0}, maximum estimé", ex.name)}
          </Ink>
          <View style={{ marginTop: 8, marginHorizontal: -14 }}>
            <InkLineChart points={ex.points} domaine="seances" height={190} digits={0} minSpan={4} label={traduire("Exemple de courbe de force")} />
          </View>
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
            <LegendMark kind="line" color={couleurTraitDomaine('seances')} label={traduire("maximum estimé")} />
            <LegendMark kind="seal" color={RECORD_RED} label="record" />
          </View>
        </ExamplePreview>
      </View>
    );
  }
  if (!lift) return <View style={{ height: 300 }} />;

  const last = shown[shown.length - 1] ?? lift.points[lift.points.length - 1];
  const first = shown[0] ?? last;
  const gain = cv(last.value) - cv(first.value);
  const shownU = unite === 'kg' ? shown : shown.map((p) => ({ ...p, value: cv(p.value) }));
  const head = scrub ? shown.find((p) => p.date === scrub.date) ?? null : null;
  const lastRecord = [...lift.points].reverse().find((p) => p.record) ?? null;
  const openDetail = () => router.push({ pathname: '/force-detail', params: { lift: lift.key } } as any);

  return (
    <View style={{ paddingTop: showCardio ? 18 : 6 }}>
      {/* Vague 26 : les analyses en haut, puis tes seances semaine par semaine, puis ta force */}
      {showCardio ? <AnalysesRow style={{ marginHorizontal: GUTTER }} /> : null}
      {showCardio ? <TrainingCharts trainings={trainings} style={{ marginHorizontal: GUTTER, marginTop: 26 }} /> : null}
      {showCardio ? <SectionHead title={traduire("Ta force")} style={{ marginHorizontal: GUTTER, marginTop: 34, marginBottom: 12 }} /> : <View style={{ height: 6 }} />}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER }}>
        <Pills
          scroll
          items={lifts.slice(0, 14).map((l) => ({ value: l.key, label: l.name }))}
          value={lift.key}
          onChange={(k) => {
            setLiftKey(k);
            setScrub(null);
          }}
        />
      </ScrollView>

      <View style={{ paddingHorizontal: GUTTER, marginTop: 18, minHeight: 104, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, minHeight: 28 }}>
          <Ink size={14} weight="bold" color={c.textSecondary} style={{ flex: 1 }} numberOfLines={2}>
            {head ? dayLong(head.date) : traduire('Ton maximum estimé sur une répétition')}
          </Ink>
          <DetailCue onPress={openDetail} label={traduire("Détail")} style={{ marginVertical: -8 }} />
        </View>
        <Ink size={52} weight="black" tight>
          {kilos(cv(head ? head.value : last.value))} <Ink size={20} weight="black" color={c.textSecondary}>{mot}</Ink>
        </Ink>
        {/* 16 octobre : un record au toucher se dit avec le trophee dore, comme sur la courbe */}
        {head?.record ? <BadgeRecord size={13} /> : null}
        <Ink size={14} weight="bold" color={c.ink}>
          {head
            ? traduirePluriel(head.reps, head.reps > 1, "{0} {1} pour {2} répétition", "{0} {1} pour {2} répétitions", num(cv(head.weight), 1), mot, head.reps)
            : shown.length < 2
              ? traduire('Encore une séance pour voir ta courbe')
              : Math.abs(gain) < 0.5
                ? traduire("stable depuis {0}", monthLong(first.date))
                : traduirePluriel(Math.abs(gain), Math.abs(gain) >= 2, "{0} {1} de {2} depuis {3}", "{0} {1}s de {2} depuis {3}", kilos(Math.abs(gain)), mot1, gain > 0 ? 'plus' : 'moins', monthLong(first.date))}
        </Ink>
      </View>

      <View style={{ marginTop: 10, paddingHorizontal: 8 }}>
        {shown.length >= 1 ? (
          <InkLineChart
            points={shownU}
            domaine="seances"
            height={210}
            digits={0}
            minSpan={4}
            onScrub={(p) => setScrub(p)}
            onPress={openDetail}
            label={traduire("Maximum estimé, {0}, de {1} à {2} {3}", lift.name, kilos(cv(first.value)), kilos(cv(last.value)), mot)}
          />
        ) : (
          <View style={{ height: 120, justifyContent: 'center', paddingHorizontal: 14 }}>
            <Ink size={14} color={c.textSecondary}>
              {traduire("Aucune séance sur cette période pour cet exercice. Élargis la période.")}</Ink>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 14, paddingHorizontal: GUTTER, marginTop: 8, flexWrap: 'wrap' }}>
        <LegendMark kind="line" color={couleurTraitDomaine('seances')} label={traduire("maximum estimé")} />
        <LegendMark kind="seal" color={RECORD_RED} label="record" />
      </View>
      <PeriodSwitch value={period} onChange={setPeriod} style={{ marginHorizontal: GUTTER, marginTop: 14 }} />
      <Ink size={12} color={c.textSecondary} style={{ paddingHorizontal: GUTTER, marginTop: 10 }}>
        {traduire("Estimation par la formule d’Epley à partir de ta meilleure série du jour. Touche la courbe pour son détail, glisse ton doigt pour revoir chaque séance.")}</Ink>

      {lastRecord ? (
        <GlassCard style={{ marginHorizontal: GUTTER, marginTop: 18, flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12 }}>
          <Hanko size={30} tampon="record_force" />
          <View style={{ flex: 1, gap: 2 }}>
            <Ink size={15} weight="extraBold">{`Dernier record, ${dayLong(lastRecord.date)}`}</Ink>
            <Ink size={13} color={c.textSecondary}>{traduirePluriel(lastRecord.reps, lastRecord.reps > 1, "{0} {1} pour {2} répétition, soit {3} {4} estimé{5}s", "{0} {1} pour {2} répétitions, soit {3} {4} estimé{5}s", num(cv(lastRecord.weight), 1), mot, lastRecord.reps, kilos(cv(lastRecord.value)), mot, unite === 'lb' ? 'e' : '')}</Ink>
          </View>
        </GlassCard>
      ) : null}

      <View style={{ paddingHorizontal: GUTTER, marginTop: 30 }}>
        <SectionHead title={traduire("Séries par muscle")} aside={weekOffset === 0 ? traduire('cette semaine') : traduire("semaine du {0}", dayShort(weekStart))} />
        <Pills
          items={[
            { value: 0, label: traduire('Cette semaine') },
            { value: 1, label: traduire('La précédente') },
          ]}
          value={weekOffset}
          onChange={setWeekOffset}
          style={{ marginTop: 10, marginBottom: 14 }}
        />
        {weekOffset === 0 && muscleLoads.some((m) => m.level > 0) ? (
          <View style={{ gap: 10, marginBottom: 16 }}>
            <MuscleMap loads={muscleLoads} height={150} />
            <MuscleScale />
          </View>
        ) : null}
        <View style={{ gap: 10 }}>
          {MUSCLE_ORDER.map((m) => {
            const n = muscles[m];
            return (
              <View key={m} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }} accessibilityLabel={traduire("{0}, {1} séries", m, n)}>
                <Ink size={14} weight="bold" color={c.textSecondary} style={{ width: 84 }}>
                  {m}
                </Ink>
                <View style={{ flex: 1, height: 14, justifyContent: 'center' }}>
                  <View style={{ position: 'absolute', left: 0, right: 0, height: 14, borderRadius: 4, backgroundColor: c.fillSoft }} />
                  <View style={{ position: 'absolute', left: 0, width: `${Math.min(100, (n / maxSets) * 100)}%`, height: 14, borderTopRightRadius: 4, borderBottomRightRadius: 4, backgroundColor: CHART_COLORS.blue, opacity: n >= 10 ? 1 : 0.55 }} />
                  <View style={{ position: 'absolute', left: `${(10 / maxSets) * 100}%`, top: -4, bottom: -4, borderLeftWidth: 1.5, borderColor: c.textMuted, borderStyle: 'dashed' }} />
                </View>
                <Ink size={14} weight="black" style={{ width: 28, textAlign: 'right' }}>
                  {String(n)}
                </Ink>
              </View>
            );
          })}
        </View>
        <Ink size={12} color={c.textSecondary} style={{ marginTop: 10 }}>
          {traduire("Le trait pointillé marque 10 séries dans la semaine, un bon repère pour progresser.")}</Ink>
      </View>

      <View style={{ paddingHorizontal: GUTTER, marginTop: 30 }}>
        <SectionHead
          title={traduire("Tonnage par semaine")}
          aside={tonSel !== null ? traduire("semaine du {0}", dayShort(tonnage[tonSel].monday)) : tonAvg ? `moyenne ${tonnageText(tonAvg, unite)}` : undefined}
        />
        <Ink size={14} color={c.textSecondary} style={{ marginTop: 2 }}>
          {tonSel !== null ? `${tonnageText(tonnage[tonSel].value, unite)} ${accordSouleve(tonnage[tonSel].value, unite)}` : traduire('Charge multipliée par les répétitions, toutes séries confondues')}
        </Ink>
        <View style={{ marginTop: 12 }}>
          <InkBarChart
            bars={tonnage.map((b) => ({ label: dayShort(b.monday).split(' ')[0], value: b.value }))}
            highlight={tonnage.length - 1}
            average={tonAvg}
            format={(v: number) => tonnageText(v, unite)}
            onSelect={setTonSel}
            label={traduire("Tonnage des dix dernières semaines, la semaine en cours en indigo")}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
          <LegendMark kind="square" color={tint(CHART_COLORS.blue, 0.58)} label={traduire("semaines passées")} />
          <LegendMark kind="square" color={c.accent} label={traduire("cette semaine")} />
          {tonAvg ? <LegendMark kind="dash" color={c.textSecondary} label="moyenne" /> : null}
        </View>
      </View>

    </View>
  );
}
