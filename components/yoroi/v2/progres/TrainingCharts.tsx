/**
 * Graphiques de seances (vague 26) : nombre de seances et duree par semaine,
 * effort ressenti moyen, repartition par sport, sur les 12 dernieres semaines.
 * Barres bleues, la semaine en cours en indigo, moyenne des semaines passees en pointilles.
 * Un doigt pose sur une barre lit sa semaine. Donnees reelles uniquement (tes seances).
 */
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { InkBarChart } from './InkBarChart';
import type { Bar } from './InkBarChart';
import { Chevron, GUTTER, LegendMark, Pills, SectionHead, tapLight } from './ui';
import { CHART_COLORS, tint } from '../charts/core';
import type { Training } from '@/lib/database';
import { durationOf } from '@/lib/v2/trainingWeek';
import { hoursText, weekBuckets, weekLabels } from '@/lib/v2/progres/weekly';
import { sportLabel } from '@/lib/v2/seances/sessionData';
import { dayShort, isoOf, num } from '@/lib/v2/progres/format';
import { P } from '@/components/yoroi/livePalette';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

const WEEKS = 12;

function sportIds(t: Training): string[] {
  return String(t.sport ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

type WeekChartProps = {
  title: string;
  sub: string;
  bars: Bar[];
  weeks: string[];
  format: (v: number) => string;
  /** phrase de la semaine touchee */
  readOut: (v: number) => string;
  label: string;
  onMore?: { label: string; onPress: () => void };
};

function WeekChart({ title, sub, bars, weeks, format, readOut, label, onMore }: WeekChartProps) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [sel, setSel] = useState<number | null>(null);
  const done = bars.slice(0, -1).filter((b) => b.value > 0);
  const avg = done.length >= 2 ? done.reduce((s, b) => s + b.value, 0) / done.length : null;
  return (
    <View>
      <SectionHead title={title} aside={onMore?.label} onPress={onMore ? () => { tapLight(); onMore.onPress(); } : undefined} />
      <Ink size={14} color={sel !== null ? c.ink : c.textSecondary} weight={sel !== null ? 'bold' : 'medium'} style={{ marginTop: 2 }} numberOfLines={2}>
        {sel !== null ? traduire("Semaine du {0} : {1}", dayShort(weeks[sel]), readOut(bars[sel].value)) : avg !== null ? `${sub}, en moyenne ${format(avg)}` : sub}
      </Ink>
      <View style={{ marginTop: 10 }}>
        <InkBarChart bars={bars} highlight={bars.length - 1} average={avg} format={format} onSelect={setSel} label={label} sparseLabels height={160} />
      </View>
    </View>
  );
}

export function TrainingCharts({ trainings, compact, more, style }: { trainings: Training[]; compact?: boolean; /** lien a droite du premier graphique */ more?: { label: string; onPress: () => void }; style?: object }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const [sport, setSport] = useState<string>('all');

  // Sports pratiques sur la periode, du plus frequent au moins frequent
  const sports = useMemo(() => {
    const m = new Map<string, number>();
    const since = new Date();
    since.setDate(since.getDate() - WEEKS * 7);
    // 18 octobre (audit) : date locale (toISOString donnait la date UTC, un jour d'ecart la nuit)
    const cut = isoOf(since);
    trainings.forEach((t) => {
      if (!t?.date || t.date.slice(0, 10) < cut) return;
      sportIds(t).forEach((id) => m.set(id, (m.get(id) ?? 0) + 1));
    });
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]);
  }, [trainings]);

  const filtered = useMemo(() => (sport === 'all' ? trainings : trainings.filter((t) => sportIds(t).includes(sport))), [trainings, sport]);
  const buckets = useMemo(() => weekBuckets(filtered, WEEKS * 7, durationOf, (t) => (t.intensity && t.intensity > 0 ? t.intensity : null)), [filtered]);
  const weeks = buckets.map((b) => b.week);
  const labels = useMemo(() => weekLabels(weeks), [weeks.join('|')]);
  const total = buckets.reduce((s, b) => s + b.count, 0);
  const hasRpe = buckets.some((b) => b.rpeN > 0);

  if (!trainings.length) return null;

  const count: Bar[] = buckets.map((b, i) => ({ label: labels[i], value: b.count }));
  // 18 octobre (audit) : barres en minutes (avant, en dixiemes d'heure : 80 min s'affichaient « 1 h 18 »)
  const hours: Bar[] = buckets.map((b, i) => ({ label: labels[i], value: Math.round(b.minutes) }));
  const effort: Bar[] = buckets.map((b, i) => ({ label: labels[i], value: b.rpeN ? Math.round((b.rpeSum / b.rpeN) * 10) / 10 : 0 }));

  // Repartition par sport sur 12 semaines (seulement sans filtre et avec au moins deux sports)
  const bySport = sport === 'all' && sports.length >= 2
    ? sports.slice(0, 6).map(([id]) => {
        const list = trainings.filter((t) => sportIds(t).includes(id) && weeks.length && t.date.slice(0, 10) >= weeks[0]);
        return { id, label: sportLabel(id), count: list.length, minutes: list.reduce((s, t) => s + durationOf(t), 0) };
      })
    : [];
  const maxSport = Math.max(1, ...bySport.map((s) => s.minutes));

  return (
    <View style={[{ gap: 26 }, style]}>
      {sports.length >= 2 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER }} style={{ marginHorizontal: -GUTTER, marginBottom: -12 }}>
          <Pills scroll items={[{ value: 'all', label: traduire('Tous les sports') }, ...sports.slice(0, 6).map(([id]) => ({ value: id, label: sportLabel(id) }))]} value={sport} onChange={setSport} />
        </ScrollView>
      ) : null}

      <WeekChart
        title={traduire("Séances par semaine")}
        sub={total ? traduirePluriel(total, total > 1, "{0} séance en 12 semaines", "{0} séances en 12 semaines", total) : traduire('Aucune séance sur 12 semaines')}
        bars={count}
        weeks={weeks}
        format={(v) => num(v, v % 1 ? 1 : 0)}
        readOut={(v) => traduirePluriel(v, v > 1, "{0} séance", "{0} séances", v)}
        label={traduire("Nombre de séances par semaine sur 12 semaines, la semaine en cours en indigo")}
        onMore={more ?? { label: traduire('Ton activité'), onPress: () => router.push('/activity-detail' as any) }}
      />

      <WeekChart
        title={traduire("Durée par semaine")}
        sub={traduire("Temps d’entraînement")}
        bars={hours}
        weeks={weeks}
        format={(v) => hoursText(v)}
        readOut={(v) => hoursText(v)}
        label={traduire("Heures d’entraînement par semaine sur 12 semaines")}
      />

      {!compact && hasRpe ? (
        <WeekChart
          title="Effort ressenti"
          sub={traduire("Moyenne de la semaine, sur 10")}
          bars={effort}
          weeks={weeks}
          format={(v) => num(v, 1)}
          readOut={(v) => (v > 0 ? traduire("effort moyen {0} sur 10", num(v, 1)) : traduire('aucun effort noté'))}
          label={traduire("Effort ressenti moyen par semaine, sur 10")}
          onMore={{ label: traduire('Ta charge'), onPress: () => router.push('/charge' as any) }}
        />
      ) : null}

      {!compact && bySport.length ? (
        <View>
          <SectionHead title={traduire("Par sport")} aside={traduire("12 semaines")} />
          <View style={{ gap: 12, marginTop: 12 }}>
            {bySport.map((s) => (
              <Pressable key={s.id} onPress={() => { tapLight(); setSport(s.id); }} accessibilityRole="button" accessibilityLabel={traduire("{0}, {1} séances, {2}, voir ses courbes", s.label, s.count, hoursText(s.minutes))} style={{ gap: 5 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                  <Ink size={14} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>{s.label}</Ink>
                  <Ink size={13} weight="bold" color={c.textSecondary}>{traduirePluriel(s.count, s.count > 1, "{0} séance, {1}", "{0} séances, {1}", s.count, hoursText(s.minutes))}</Ink>
                </View>
                <View style={{ height: 8, borderRadius: 4, backgroundColor: c.fillSoft }}>
                  <View style={{ width: `${Math.max(2, (s.minutes / maxSport) * 100)}%`, height: 8, borderRadius: 4, backgroundColor: CHART_COLORS.blue }} />
                </View>
              </Pressable>
            ))}
          </View>
          <Ink size={12} color={c.textSecondary} style={{ marginTop: 10 }}>{traduire("Barres à la durée. Touche un sport pour ne voir que ses semaines.")}</Ink>
        </View>
      ) : null}

      <View style={{ flexDirection: 'row', gap: 14, flexWrap: 'wrap', marginTop: -12 }}>
        <LegendMark kind="square" color={tint(CHART_COLORS.blue, 0.58)} label={traduire("semaines passées")} />
        <LegendMark kind="square" color={c.accent} label={traduire("cette semaine")} />
        <LegendMark kind="dash" color={c.textSecondary} label="moyenne" />
      </View>
    </View>
  );
}

/** Lien compact vers les analyses (Charge, Performance, Activite) : trois tuiles en haut de Force */
export function AnalysesRow({ style }: { style?: object }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const items = [
    { label: traduire('Charge'), sub: traduire('fatigue et forme'), href: '/charge' },
    { label: traduire('Profil'), sub: traduire('ton radar de performance'), href: '/radar-performance' },
    { label: traduire('Activité'), sub: traduire('semaine par semaine'), href: '/activity-detail' },
  ];
  return (
    <View style={[{ flexDirection: 'row', gap: 8 }, style]}>
      {items.map((it) => (
        <Pressable
          key={it.href}
          onPress={() => {
            tapLight();
            router.push(it.href as any);
          }}
          accessibilityRole="button"
          accessibilityLabel={`${it.label}, ${it.sub}`}
          style={({ pressed }) => ({ flex: 1, minWidth: 0, minHeight: 70, padding: 11, borderRadius: 18, backgroundColor: pressed ? c.fillSoft : P.carte, borderWidth: 1, borderColor: c.divider, gap: 2, justifyContent: 'space-between' })}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ink size={14} weight="extraBold" numberOfLines={1} style={{ flexShrink: 1 }}>{it.label}</Ink>
            <Chevron color={c.accent} size={11} />
          </View>
          <Ink size={11} color={c.textSecondary} numberOfLines={2}>{it.sub}</Ink>
        </Pressable>
      ))}
    </View>
  );
}
