/**
 * Progres, section Annee (maquette G4) : carte des jours (une case par jour, indigo selon la duree),
 * seances par mois, meilleure serie de semaines, totaux, bilan annuel.
 */
import React, { useMemo, useState } from 'react';
import { ImageBackground, Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { InkBarChart } from './InkBarChart';
import { KozaneLegend, KozaneYear } from './KozaneYear';
import { GUTTER, LegendMark, SectionHead, StatStrip, tapLight } from './ui';
import { ExamplePreview } from './ExamplePreview';
import { sampleYearGrid } from '@/lib/v2/progres/samples';
import { CHART_COLORS, tint } from '../charts/core';
import { useTrainingsData } from '@/lib/v2/progres/useProgresData';
import { monthlyCounts, weekStreaks, yearGrid, yearTotals } from '@/lib/v2/progres/year';
import type { DayCell } from '@/lib/v2/progres/year';
import { formatDuration } from '@/lib/v2/trainingWeek';
import { getSportName } from '@/lib/sports';
import { sportShortName } from '@/lib/v2/seance/sportVisuals';
import { dayLong, monthShortIdx, todayIso } from '@/lib/v2/progres/format';
import { P } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const SCENE = require('@/assets/avatars/app/themes/theme_nuit.webp');

export function AnneeSection() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const { trainings, loading } = useTrainingsData();
  const today = todayIso();
  const year = Number(today.slice(0, 4));
  const wrappedSeason = today.slice(5, 7) === '12';
  const [sel, setSel] = useState<DayCell | null>(null);
  const [monthSel, setMonthSel] = useState<number | null>(null);

  const grid = useMemo(() => yearGrid(trainings, today, 53), [trainings, today]);
  const months = useMemo(() => monthlyCounts(trainings, year), [trainings, year]);
  const streaks = useMemo(() => weekStreaks(trainings, today), [trainings, today]);
  const totals = useMemo(() => yearTotals(trainings, year), [trainings, year]);
  const currentMonth = Number(today.slice(5, 7)) - 1;
  const shownMonths = months.slice(0, currentMonth + 1);
  const firstActive = shownMonths.findIndex((v) => v > 0);
  const pastMonths = firstActive >= 0 && firstActive < currentMonth ? shownMonths.slice(firstActive, currentMonth) : [];
  const avg = pastMonths.length ? pastMonths.reduce((s, n) => s + n, 0) / pastMonths.length : null;
  const selSessions = sel ? trainings.filter((t) => t.date.slice(0, 10) === sel.date) : [];

  if (!loading && trainings.length === 0) {
    const ex = sampleYearGrid(today);
    return (
      <View style={{ paddingTop: 22 }}>
        <ExamplePreview
          title={traduire("Ton année se tisse ici")}
          text={traduire("Chaque séance remplit un jour de ton calendrier. Plus la séance est longue, plus la case est foncée.")}
          plusHint={traduire("Touche + pour noter ta séance")}
        >
          <KozaneYear weeks={ex.weeks} monthMarks={ex.monthMarks} selected={null} onSelect={() => {}} />
          <View style={{ marginTop: 10 }}>
            <KozaneLegend />
          </View>
        </ExamplePreview>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: 22 }}>
      <View style={{ paddingHorizontal: GUTTER, gap: 4 }}>
        <Ink size={52} weight="black" tight>
          {String(totals.sessions)} <Ink size={20} weight="black" color={c.textSecondary}>{traduirePluriel(totals.sessions, totals.sessions > 1, "séance en {0}", "séances en {0}", year)}</Ink>
        </Ink>
        <Ink size={14} weight="bold" color={c.textSecondary}>
          {streaks.best > 1 ? traduire("Ta meilleure série : {0} semaines d’affilée", streaks.best) : traduire('Enchaîne les semaines pour lancer ta série')}
          {streaks.current > 1 && streaks.current < streaks.best ? `, en cours ${streaks.current}` : streaks.current > 1 && streaks.current === streaks.best ? traduire(', et elle est en cours') : ''}
        </Ink>
      </View>

      <View style={{ paddingHorizontal: GUTTER - 4, marginTop: 20 }}>
        <KozaneYear weeks={grid.weeks} monthMarks={grid.monthMarks} selected={sel?.date ?? null} onSelect={setSel} />
      </View>
      <View style={{ paddingHorizontal: GUTTER, marginTop: 8, minHeight: 40, justifyContent: 'center' }}>
        {sel ? (
          <Ink size={14} weight="bold">
            {`${dayLong(sel.date).charAt(0).toUpperCase()}${dayLong(sel.date).slice(1)} : `}
            <Ink size={14} color={c.textSecondary}>
              {selSessions.length === 0
                ? 'repos'
                : selSessions.map((t) => `${getSportName(t.sport)}${t.duration_minutes || t.duration ? ` ${formatDuration(t.duration_minutes ?? t.duration ?? 0)}` : ''}`).join(', ')}
            </Ink>
          </Ink>
        ) : (
          <KozaneLegend />
        )}
      </View>

      <View style={{ paddingHorizontal: GUTTER, marginTop: 26 }}>
        <SectionHead title={traduire("Séances par mois")} aside={monthSel !== null ? `${monthShortIdx(monthSel)} : ${shownMonths[monthSel]}` : avg !== null ? `moyenne ${Math.round(avg)}` : undefined} />
        <View style={{ marginTop: 12 }}>
          <InkBarChart
            bars={shownMonths.map((n, i) => ({ label: monthShortIdx(i).replace('.', ''), value: n }))}
            highlight={currentMonth}
            average={avg}
            format={(v) => String(Math.round(v))}
            showValues="all"
            onSelect={setMonthSel}
            height={170}
            label={traduire("Séances par mois en {0}, le mois en cours en indigo", year)}
          />
        </View>
        <View style={{ flexDirection: 'row', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
          <LegendMark kind="square" color={tint(CHART_COLORS.blue, 0.58)} label={traduire("mois passés")} />
          <LegendMark kind="square" color={c.accent} label={traduire("ce mois-ci")} />
          {avg !== null ? <LegendMark kind="dash" color={c.textSecondary} label="moyenne" /> : null}
        </View>
      </View>

      <StatStrip
        style={{ marginHorizontal: GUTTER, marginTop: 26 }}
        items={[
          { value: formatDuration(totals.minutes) || '0 h', label: traduire("d’entraînement en {0}", year) },
          { value: String(totals.days), label: traduire('jours actifs') },
          { value: totals.topSport ? sportShortName(totals.topSport) : 'à venir', label: totals.topSport ? traduire("ton sport, {0} fois", totals.topCount) : traduire('ton sport favori') },
        ]}
      />

      {/* Le bilan de l'annee ne s'affiche qu'en decembre ; le reste de l'annee il reste dans Partager */}
      {wrappedSeason ? (
      <Pressable
        onPress={() => {
          tapLight();
          router.push('/wrapped' as any);
        }}
        accessibilityRole="button"
        accessibilityLabel={traduire("Ouvrir ton bilan {0}", year)}
        style={({ pressed }) => ({ marginHorizontal: GUTTER, marginTop: 26, borderRadius: 26, overflow: 'hidden', opacity: pressed ? 0.94 : 1 })}
      >
        <ImageBackground source={SCENE} resizeMode="cover" style={{ height: 190, justifyContent: 'flex-end' }}>
          <View style={{ margin: 12, borderRadius: 20, padding: 16, backgroundColor: P.carte, borderWidth: 1, borderColor: P.carte, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Ink size={18} weight="black" tight>{traduire("Ton bilan {0}", year)}</Ink>
              <Ink size={13} color={c.textSecondary}>
                {traduire("Ton année en quelques écrans, à garder ou à partager.")}</Ink>
            </View>
            <View style={{ height: 40, paddingHorizontal: 14, borderRadius: 14, backgroundColor: c.accent, alignItems: 'center', justifyContent: 'center' }}>
              <Ink size={14} weight="extraBold" color={c.onAccent}>
                {traduire("Voir")}</Ink>
            </View>
          </View>
        </ImageBackground>
      </Pressable>
      ) : null}

    </View>
  );
}
