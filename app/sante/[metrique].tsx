/**
 * Detail d'une mesure de sante (refonte v2) : grosse valeur, courbe ou barres au doigt,
 * periodes jour, semaine, mois, an, moyenne, minimum, maximum,
 * explication simple et repere seulement quand il est source.
 */
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Press } from '@/components/yoroi/v2/accueil/kit';
import { DetailScreen, EmptyState } from '@/components/yoroi/v2/ornements/screens';
import { InkLineChart } from '@/components/yoroi/v2/progres/InkLineChart';
import { InkBarChart } from '@/components/yoroi/v2/progres/InkBarChart';
import { HrChart } from '@/components/yoroi/v2/seances/HrChart';
import { DualLine, Legend, SLEEP_COLORS, SLEEP_LABELS, SleepBars, TENSION_COLORS } from '@/components/yoroi/v2/sante/Charts';
import { IconDot, METRIC_ICON, SanteIcon } from '@/components/yoroi/v2/sante/SanteIcon';
import { GlassBox, InfoBlock, PeriodSegments, S, SourceCard } from '@/components/yoroi/v2/sante/ui';
import { headlineText } from '@/components/yoroi/v2/sante/MetricCard';
import { FAMILY, METRIC, isMetricKey } from '@/lib/v2/sante/metrics';
import type { MetricDef } from '@/lib/v2/sante/metrics';
import { getSanteSource, loadEvents, loadSeries, loadSources, loadTodayHeartRate } from '@/lib/v2/sante/data';
import type { HealthEvent, HrSample, SanteSource } from '@/lib/v2/sante/data';
import { EventList, countLabel, eventDay } from '@/components/yoroi/v2/sante/EventList';
import { fillDays, formatValue, headline, hoursMinutes, lastDays, mean, periodStats, unitFor, weeklyBuckets, whenLabel } from '@/lib/v2/sante/stats';
import type { DayPoint, Period } from '@/lib/v2/sante/stats';
import { dateOf, dayLong, dayShort, todayIso } from '@/lib/v2/progres/format';
import { usePremium } from '@/context/PremiumContext';
import { watchesFor } from '@/lib/v2/sante/watches';
import { BrandMark } from '@/components/yoroi/v2/sante/ui';
import { ExamplePreview } from '@/components/yoroi/v2/progres/ExamplePreview';
import { ChargementPetit } from '@/components/yoroi/v2/chargement/Chargement';
import { P } from '@/components/yoroi/livePalette';
import { ouvrirPaywall } from '@/lib/v2/premium/sources';
import { traduire } from '@/lib/i18n/tr';

const SOURCE_NAMES: Record<string, string> = {
  apple_health: 'Apple Santé',
  apple_watch: 'Apple Watch',
  iphone: 'iPhone',
  health_connect: 'Health Connect',
  withings: 'Withings',
  garmin: 'Garmin',
  polar: 'Polar',
  whoop: 'WHOOP',
  samsung: 'Samsung Health',
  fitbit: 'Fitbit',
  xiaomi: 'Xiaomi',
  renpho: 'Renpho',
  eufy: 'Eufy',
  omron: 'Omron',
  suunto: 'Suunto',
  oura: 'Oura',
  coros: 'COROS',
  google_health: 'Google Health',
  amazfit: 'Amazfit',
  huawei: 'Huawei',
  wahoo: 'Wahoo',
  strava: 'Strava',
  manual: traduire('Saisie dans YOROI'),
};

const DAY_LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const LOAD_DAYS: Record<Period, number> = { jour: 14, semaine: 14, mois: 30, an: 365 };

/** Valeurs d'exemple, seulement pour l'apercu voile marque « Exemple » */
const SAMPLE_BASE: Partial<Record<string, number>> = {
  pas: 8000, distance: 6, etages: 10, exercice: 40, debout: 10, 'energie-active': 500, 'energie-repos': 1700,
  'frequence-cardiaque': 72, 'fc-repos': 58, 'fc-marche': 95, vfc: 55, oxygene: 97, respiration: 15, vo2max: 45,
  sommeil: 450, temperature: 36.6, poids: 80, 'masse-grasse': 18, 'masse-maigre': 62, imc: 24,
};

function sampleSeries(m: MetricDef, n: number): DayPoint[] {
  const base = SAMPLE_BASE[m.key] ?? (m.kind === 'sum' ? 30 : 50);
  const amp = m.key === 'poids' ? 0.012 : m.key === 'temperature' || m.key === 'oxygene' ? 0.006 : 0.14;
  const out: DayPoint[] = [];
  const d = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setDate(d.getDate() - i);
    const iso = `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const k = n - i;
    const v = base * (1 + amp * (Math.sin(k * 1.3) * 0.7 + Math.cos(k * 0.6) * 0.3));
    out.push({ date: iso, value: Math.round(v * 10) / 10 });
  }
  return out;
}

function capitalize(t: string): string {
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : t;
}

function fmt(m: MetricDef, v: number | null | undefined): string {
  if (v === null || v === undefined) return '';
  return formatValue(m, v);
}

function withUnit(m: MetricDef, v: number | null | undefined): string {
  if (v === null || v === undefined) return traduire('Pas de donnée');
  const u = unitFor(m);
  return u ? `${fmt(m, v)} ${u}` : fmt(m, v);
}

export default function MetriqueScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ metrique: string }>();
  const key = isMetricKey(params.metrique) ? params.metrique : null;
  const m = key ? METRIC[key] : null;
  const { isPremium } = usePremium();
  // le poids et la masse grasse viennent aussi des pesees de l'app : toute la periode reste ouverte
  const appData = key === 'poids' || key === 'masse-grasse';
  // un événement (chute, alerte, ECG) est rare : on ouvre sur le mois
  const isEvent = !!m?.event;
  const withList = !!m?.event || !!m?.list;
  const [period, setPeriod] = useState<Period>(appData || isEvent ? 'mois' : 'semaine');
  const [eventsCache, setEventsCache] = useState<Partial<Record<number, HealthEvent[]>>>({});
  const [source, setSource] = useState<SanteSource | null>(null);
  const [cache, setCache] = useState<Partial<Record<number, DayPoint[]>>>({});
  const [hr, setHr] = useState<HrSample[]>([]);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sel, setSel] = useState<number | null>(null);
  const [chartW, setChartW] = useState(0);

  const days = LOAD_DAYS[period];

  const load = useCallback(
    async (n: number) => {
      if (!key) return;
      setLoading(true);
      const src = source ?? (await getSanteSource());
      if (!source) setSource(src);
      const isLive = src.mode === 'live';
      const pts = await loadSeries(key, n, isLive);
      setCache((c) => ({ ...c, [n]: pts }));
      if (withList) {
        const evs = await loadEvents(key, n, isLive);
        setEventsCache((c) => ({ ...c, [n]: evs }));
      }
      if (key === 'frequence-cardiaque' && n === LOAD_DAYS.jour) setHr(await loadTodayHeartRate(isLive));
      setLoading(false);
    },
    [key, source, withList],
  );

  useEffect(() => {
    if (!key) return;
    loadSources(key).then(setSources).catch(() => setSources([]));
  }, [key]);

  useEffect(() => {
    setSel(null);
    if (cache[days] === undefined) load(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, key]);

  const all = cache[days] ?? [];

  const view = useMemo(() => {
    if (!m) return null;
    const n = period === 'jour' ? 1 : period === 'semaine' ? 7 : period === 'mois' ? 30 : 365;
    const pts = lastDays(all, n);
    const stats = periodStats(pts, m.kind);
    return { pts, stats };
  }, [all, period, m]);

  if (!m || !key) {
    return (
      <DetailScreen title={traduire("Mesure introuvable")}>
        <EmptyState title={traduire("Cette mesure n'existe pas")} text={traduire("Reviens à ton tableau de bord santé.")} action={traduire("Ta santé")} onAction={() => router.replace('/sante' as any)} />
      </DetailScreen>
    );
  }

  const fam = FAMILY[m.family];
  const color = fam.color;
  const head = headline(all, m);
  const notOnAndroid = !!m.iosOnly && Platform.OS === 'android';
  const notOnIos = !!m.androidOnly && Platform.OS !== 'android';
  const notHere = notOnAndroid || notOnIos;
  const senders = watchesFor(m.key, Platform.OS === 'android');

  const choosePeriod = (p: Period) => {
    // Gratuit jusqu'au mois, l'annee passe par Premium
    if (p === 'an' && !isPremium && !appData) {
      ouvrirPaywall('sante_annee');
      return;
    }
    setPeriod(p);
  };

  // Barres pour un cumul sur semaine et mois, courbe sinon
  const pts = view?.pts ?? [];
  const stats = view?.stats ?? { avg: null, min: null, max: null, total: null, count: 0 };
  const isSum = m.kind === 'sum';
  const nDays = period === 'semaine' ? 7 : 30;
  const filled = period === 'semaine' || period === 'mois' ? fillDays(pts, nDays) : [];
  const barLabels = filled.map((p, i) => (period === 'semaine' ? DAY_LETTERS[dateOf(p.date).getDay()] : i % 5 === 4 || i === filled.length - 1 ? String(dateOf(p.date).getDate()) : ''));
  const yearPts = period === 'an' ? weeklyBuckets(pts) : [];
  const linePts = period === 'an' ? yearPts : pts.filter((p) => p.value > 0);
  const hasPhases = pts.some((p) => !!p.phases);

  // Lecture au doigt
  let readTitle = '';
  let readValue = '';
  if (sel !== null) {
    if ((period === 'semaine' || period === 'mois') && (isSum || key === 'sommeil') && filled[sel]) {
      const p = filled[sel];
      readTitle = dayLong(p.date);
      readValue = p.value > 0 ? withUnit(m, p.value) : traduire('Pas de mesure');
      if (key === 'sommeil' && p.phases) readValue += `, profond ${hoursMinutes(p.phases.deep)}`;
    } else if (key === 'tension' && linePts[sel]) {
      const p = linePts[sel];
      readTitle = dayLong(p.date);
      readValue = `${Math.round(p.value)}/${Math.round(p.v2 ?? 0)} mmHg`;
    } else if (linePts[sel]) {
      const p = linePts[sel];
      readTitle = period === 'an' ? traduire("Semaine du {0}", dayShort(p.date)) : dayLong(p.date);
      readValue = withUnit(m, p.value);
    }
  } else if (stats.avg !== null) {
    readTitle = period === 'jour' ? traduire("Aujourd'hui") : isSum ? traduire('Moyenne par jour') : traduire('Moyenne');
    readValue = key === 'tension' ? `${Math.round(stats.avg)}/${Math.round(mean(pts.map((p) => p.v2 ?? 0).filter((v) => v > 0)) ?? 0)} mmHg` : withUnit(m, stats.avg);
  }

  const periodDays = period === 'jour' ? 1 : period === 'semaine' ? 7 : period === 'mois' ? 30 : 365;
  const periodFrom = (() => {
    const d = new Date();
    d.setDate(d.getDate() - (periodDays - 1));
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();
  const periodEvents = (eventsCache[days] ?? []).filter((e) => eventDay(e.date) >= periodFrom);
  const eventCount = isEvent ? periodEvents.reduce((s2, e) => s2 + (key === 'chutes' ? e.value ?? 1 : 1), 0) : 0;
  const PERIOD_WORD: Record<Period, string> = { jour: "aujourd'hui", semaine: traduire('sur 7 jours'), mois: traduire('sur 30 jours'), an: traduire('sur un an') };
  if (isEvent && sel === null) {
    readTitle = traduire("Total {0}", PERIOD_WORD[period]);
    readValue = countLabel(eventCount, m.unit);
  }

  const avg7 = mean(lastDays(all, 8).filter((p) => p.date !== todayIso() && p.value > 0).map((p) => p.value));
  const avg7Dia = mean(lastDays(all, 8).filter((p) => p.date !== todayIso() && p.value > 0 && (p.v2 ?? 0) > 0).map((p) => p.v2 as number));
  const todayPt = all.find((p) => p.date === todayIso()) ?? null;

  const onChartLayout = (e: LayoutChangeEvent) => setChartW(Math.round(e.nativeEvent.layout.width));

  const chart = () => {
    if (loading && all.length === 0) {
      return (
        <View style={{ height: 220, alignItems: 'center', justifyContent: 'center' }}>
          <ChargementPetit color={color} />
        </View>
      );
    }
    if (isEvent) {
      return (
        <EventList
          def={m}
          events={periodEvents}
          color={color}
          tint={fam.tint}
          emptyText={notHere ? traduire(`Cette mesure n'arrive pas sur ce téléphone.`) : `Rien ${PERIOD_WORD[period]}. ${source?.mode === 'live' ? traduire('Tout ce que ta montre enregistre apparaîtra ici, avec la date et l’heure.') : traduire('Connecte ta montre pour voir ici chaque événement daté.')}`}
        />
      );
    }
    if (period === 'jour') {
      if (key === 'frequence-cardiaque' && hr.length > 1) {
        const a = mean(hr.map((h) => h.bpm));
        return (
          <View onLayout={onChartLayout} style={{ gap: 8 }}>
            {chartW > 0 ? <HrChart samples={hr} width={chartW} height={200} avg={a ?? undefined} /> : <View style={{ height: 200 }} />}
            <Legend items={[{ color: S.heart, label: traduire('Battements du jour'), kind: 'line' }, { color: S.ink, label: traduire('Moyenne'), kind: 'line' }]} />
          </View>
        );
      }
      const tv = todayPt?.value ?? head?.value ?? 0;
      const max = Math.max(tv, avg7 ?? 0, 1);
      return (
        <View style={{ gap: 14, paddingVertical: 6 }}>
          {[
            { label: todayPt ? traduire("Aujourd'hui") : head ? traduire("Dernière mesure, {0}", whenLabel(head.date)) : traduire("Aujourd'hui"), v: tv, c: color, tension: `${headlineText(m, todayPt ?? head)} mmHg` },
            // audit 18 octobre : la tension de la moyenne est la moyenne des 7 jours, plus la derniere mesure
            { label: traduire('Moyenne des 7 jours précédents'), v: avg7 ?? 0, c: '#C9C6BE', tension: avg7 !== null && avg7Dia !== null ? `${Math.round(avg7)}/${Math.round(avg7Dia)} mmHg` : withUnit(m, avg7) },
          ].map((row) => (
            <View key={row.label} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Ink size={13} weight="bold" color={S.ink2}>
                  {traduire(row.label)}
                </Ink>
                <Ink size={13} weight="extraBold">
                  {row.v > 0 ? (key === 'tension' ? row.tension : withUnit(m, row.v)) : traduire('Pas de donnée')}
                </Ink>
              </View>
              <View style={{ height: 14, borderRadius: 7, backgroundColor: S.line2, overflow: 'hidden' }}>
                <View style={{ width: `${Math.max(0, Math.min(100, (row.v / max) * 100))}%`, height: '100%', borderRadius: 7, backgroundColor: row.c }} />
              </View>
            </View>
          ))}
          {key === 'frequence-cardiaque' && source?.mode === 'live' && Platform.OS === 'ios' && hr.length === 0 && !todayPt ? (
            <Ink size={12} weight="bold" color={S.muted}>
              {traduire("Pas encore de battement enregistré aujourd'hui.")}</Ink>
          ) : null}
        </View>
      );
    }
    if (pts.filter((p) => p.value > 0).length === 0) {
      const sample = sampleSeries(m, period === 'an' ? 52 : nDays);
      const scaleS = key === 'sommeil' ? 1 / 60 : 1;
      return (
        <ExamplePreview
          flush
          dim={0.4}
          title={appData ? traduire('Rien sur cette période') : traduire('Aucune mesure sur cette période')}
          text={appData ? traduire('Pèse-toi le matin, à jeun : chaque pesée s’ajoute ici.') : traduire('Voici ce que tu verras quand ta montre ou ta balance enverra cette mesure.')}
          cta={appData ? traduire('Me peser') : traduire('Relier ma montre')}
          onPress={() => router.push((appData ? '/pesee' : '/sante/montre') as any)}
        >
          {isSum && period !== 'an' ? (
            <InkBarChart bars={sample.map((p, i) => ({ label: period === 'semaine' ? DAY_LETTERS[dateOf(p.date).getDay()] : i % 5 === 4 ? String(dateOf(p.date).getDate()) : '', value: p.value }))} color={color} format={(v) => fmt(m, v)} showValues="none" height={180} label={traduire("Exemple")} />
          ) : (
            <InkLineChart points={sample.map((p) => ({ date: p.date, value: p.value * scaleS }))} color={color} height={180} digits={key === 'sommeil' ? 1 : m.digits} minSpan={Math.max(1, (SAMPLE_BASE[m.key] ?? 50) * scaleS * 0.08)} label={traduire("Exemple")} />
          )}
        </ExamplePreview>
      );
    }
    if (key === 'sommeil' && period !== 'an') {
      return (
        <View style={{ gap: 10 }}>
          <SleepBars points={filled} labels={barLabels} onSelect={setSel} label={traduire("Sommeil, {0}", period)} />
          {hasPhases ? (
            <Legend
              items={[
                { color: SLEEP_COLORS.deep, label: SLEEP_LABELS.deep },
                { color: SLEEP_COLORS.core, label: SLEEP_LABELS.core },
                { color: SLEEP_COLORS.rem, label: SLEEP_LABELS.rem },
                { color: SLEEP_COLORS.awake, label: SLEEP_LABELS.awake },
              ]}
            />
          ) : null}
        </View>
      );
    }
    if (key === 'tension') {
      return (
        <View style={{ gap: 10 }}>
          <DualLine points={linePts} onSelect={setSel} label={traduire("Tension artérielle")} />
          <Legend items={[{ color: TENSION_COLORS[0], label: traduire('Chiffre haut'), kind: 'line' }, { color: TENSION_COLORS[1], label: traduire('Chiffre bas'), kind: 'line' }]} />
        </View>
      );
    }
    if (isSum && period !== 'an') {
      return (
        <InkBarChart
          bars={filled.map((p, i) => ({ label: barLabels[i], value: p.value }))}
          color={color}
          highlight={filled.length - 1}
          average={stats.avg}
          format={(v) => fmt(m, v)}
          showValues={period === 'semaine' ? 'highlight' : 'none'}
          onSelect={setSel}
          height={210}
          label={`${m.label}, ${period}`}
        />
      );
    }
    // le sommeil se lit en heures sur la courbe de l'annee
    const scale = key === 'sommeil' ? 1 / 60 : 1;
    const spanBase = (mean(linePts.map((p) => p.value)) ?? 1) * scale;
    return (
      <InkLineChart
        points={linePts.map((p) => ({ date: p.date, value: p.value * scale }))}
        color={color}
        height={220}
        digits={key === 'sommeil' ? 1 : m.digits}
        minSpan={Math.max(1, spanBase * 0.08)}
        onScrub={(_p, i) => setSel(i)}
        label={`${m.label}, ${period}`}
      />
    );
  };

  // vague 31 : valeur et unite separees (unite plus petite dessous), rien de coupe a 375 points
  const statItems: { label: string; value: string; unit: string }[] = [];
  if (stats.avg !== null && !isEvent) {
    const u = unitFor(m) ?? '';
    const val = (v: number | null | undefined) => (v === null || v === undefined ? traduire('Pas de donnée') : fmt(m, v));
    if (key === 'tension') {
      // tension : les deux chiffres de la vraie mesure (haut/bas)
      const measured = pts.filter((p) => p.value > 0);
      const pair = (p: { value: number; v2?: number } | undefined) => (p ? `${Math.round(p.value)}/${Math.round(p.v2 ?? 0)}` : traduire('Pas de donnée'));
      const lowAvg = mean(measured.map((p) => p.v2 ?? 0).filter((v) => v > 0));
      const minP = measured.reduce<(typeof measured)[number] | undefined>((a, p) => (!a || p.value < a.value ? p : a), undefined);
      const maxP = measured.reduce<(typeof measured)[number] | undefined>((a, p) => (!a || p.value > a.value ? p : a), undefined);
      statItems.push({ label: traduire('Moyenne'), value: `${Math.round(stats.avg)}/${Math.round(lowAvg ?? 0)}`, unit: traduire('mmHg') });
      statItems.push({ label: traduire('La plus basse'), value: pair(minP), unit: traduire('mmHg') });
      statItems.push({ label: traduire('La plus haute'), value: pair(maxP), unit: traduire('mmHg') });
    } else {
      statItems.push({ label: isSum ? traduire('Moyenne / jour') : traduire('Moyenne'), value: val(stats.avg), unit: stats.avg !== null ? u : '' });
      statItems.push({ label: traduire('Minimum'), value: val(stats.min), unit: stats.min !== null ? u : '' });
      statItems.push({ label: 'Maximum', value: val(stats.max), unit: stats.max !== null ? u : '' });
      if (isSum && key !== 'sommeil' && stats.total !== null && period !== 'jour') statItems.push({ label: traduire('Total'), value: val(stats.total), unit: u });
    }
  }
  // quatre tuiles : deux rangees de deux, pour que les grands nombres tiennent
  const statSize = 18;

  const sleepShares = (() => {
    if (key !== 'sommeil') return null;
    const ph = pts.filter((p) => p.phases);
    if (ph.length === 0) return null;
    const sum = { deep: 0, core: 0, rem: 0, awake: 0 };
    ph.forEach((p) => {
      sum.deep += p.phases!.deep;
      sum.core += p.phases!.core;
      sum.rem += p.phases!.rem;
      sum.awake += p.phases!.awake;
    });
    const n = ph.length;
    return (['deep', 'core', 'rem', 'awake'] as const).map((k) => ({ k, label: SLEEP_LABELS[k], color: SLEEP_COLORS[k], v: sum[k] / n }));
  })();

  const sourceNames = sources.map((s) => SOURCE_NAMES[s] ?? s);

  return (
    <DetailScreen title={traduire(m.label)} subtitle={traduire(fam.label)}>
      {source && source.mode !== 'live' ? <SourceCard source={source} onConnect={() => router.push('/health-connect' as any)} /> : null}

      <GlassBox style={{ gap: 14 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <IconDot name={METRIC_ICON[key] ?? 'pulse'} color={color} tint={fam.tint} size={46} />
          <View style={{ flex: 1 }}>
            {isEvent ? (
              <Ink size={34} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {head ? capitalize(whenLabel(head.date)) : traduire('Rien pour l’instant')}
              </Ink>
            ) : !head ? (
              <Ink size={22} weight="black" tight numberOfLines={2}>
                {traduire("Pas encore de mesure")}</Ink>
            ) : (
            <Ink size={42} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {headlineText(m, head)}
              {head && unitFor(m) ? (
                <Ink size={15} weight="bold" color={S.muted}>
                  {` ${unitFor(m)}`}
                </Ink>
              ) : null}
            </Ink>
            )}
            <Ink size={13} weight="bold" color={S.ink2}>
              {isEvent ? (head ? traduire("Dernière fois, {0}", countLabel(head.value, m.unit)) : traduire('Rien d’enregistré ces dernières semaines')) : head ? (m.kind === 'sum' ? traduire("Total {0}", whenLabel(head.date)) : traduire("Mesuré {0}", whenLabel(head.date))) : notHere ? (notOnAndroid ? traduire('Non transmis par Health Connect') : traduire('Non transmis par Apple Santé')) : traduire('En attente de ta montre ou de ta balance')}
            </Ink>
          </View>
        </View>

        <PeriodSegments
          items={[
            { key: 'jour' as Period, label: traduire('Jour') },
            { key: 'semaine' as Period, label: traduire('Semaine') },
            { key: 'mois' as Period, label: traduire('Mois') },
            { key: 'an' as Period, label: traduire('An'), locked: !isPremium && !appData },
          ]}
          value={period}
          onChange={choosePeriod}
          accent={color === '#1D2029' ? S.ink : color}
        />

        <View style={{ minHeight: 40 }}>
          <Ink size={12} weight="bold" color={S.muted}>
            {readTitle || ' '}
          </Ink>
          <Ink size={20} weight="black" tight>
            {readValue || ' '}
          </Ink>
        </View>

        {chart()}

        {period === 'an' && pts.length > 0 && !isEvent ? (
          <Ink size={12} weight="bold" color={S.muted}>
            {isSum ? traduire('Chaque point : la moyenne par jour de la semaine.') : traduire('Chaque point : la moyenne de la semaine.')}
          </Ink>
        ) : null}
        {(period === 'semaine' || period === 'mois') && isSum && !isEvent && key !== 'sommeil' && stats.avg ? (
          <Ink size={12} weight="bold" color={S.muted}>
            {traduire("Pointillés : ta moyenne sur la période. Glisse le doigt sur le graphique pour lire chaque jour.")}</Ink>
        ) : null}
      </GlassBox>

      {m.list && !isEvent ? (
        <View style={{ borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, paddingHorizontal: 16, paddingVertical: 8, gap: 4 }}>
          <Ink size={16} weight="black" tight style={{ paddingTop: 8 }}>
            {traduire("Tes saisies")}</Ink>
          <EventList def={m} events={periodEvents} color={color} tint={fam.tint} emptyText={traduire("Rien {0}. Note ton humeur dans l'app Santé ou sur ta montre.", PERIOD_WORD[period])} />
        </View>
      ) : null}

      {statItems.length > 0 ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
          {statItems.map((it) => (
            <View key={it.label} style={{ flexGrow: 1, flexBasis: statItems.length > 3 ? '40%' : 0, borderRadius: 20, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, paddingVertical: 12, paddingHorizontal: 10, gap: 2 }}>
              <Ink size={statSize} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
                {it.value}
              </Ink>
              {it.unit ? (
                <Ink size={11} weight="bold" color={S.muted} numberOfLines={1}>
                  {it.unit}
                </Ink>
              ) : null}
              <Ink size={11} weight="bold" color={S.ink2} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
                {traduire(it.label)}
              </Ink>
            </View>
          ))}
        </View>
      ) : null}

      {sleepShares ? (
        <View style={{ borderRadius: 24, backgroundColor: P.white, borderWidth: 1, borderColor: S.line2, padding: 16, gap: 12 }}>
          <Ink size={16} weight="black" tight>
            {traduire("Tes phases, nuit moyenne")}</Ink>
          <View style={{ flexDirection: 'row', height: 16, borderRadius: 8, overflow: 'hidden', gap: 2 }}>
            {sleepShares.map((s) => (s.v > 0 ? <View key={s.k} style={{ flex: s.v, backgroundColor: s.color }} /> : null))}
          </View>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 10 }}>
            {sleepShares.map((s) => (
              <View key={s.k} style={{ width: '50%', flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: s.color }} />
                <Ink size={13} weight="bold" color={S.ink2}>
                  {traduire(s.label)}
                </Ink>
                <Ink size={13} weight="extraBold">
                  {hoursMinutes(s.v)}
                </Ink>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <InfoBlock icon="info" title={traduire("Ce que ça mesure")} color={color} tint={fam.tint}>
        {m.what}
      </InfoBlock>

      {m.norm ? (
        <InfoBlock icon="check" title={traduire("Repère")} color={S.mossText} tint={S.mossSoft} footnote={traduire("Source : {0}. Repère général, il ne remplace pas l'avis d'un médecin.", m.norm.source)}>
          {traduire(m.norm.text)}
        </InfoBlock>
      ) : m.howToRead ? (
        <InfoBlock icon="spark" title={traduire("Comment la lire")} color={S.gold} tint={S.goldSoft}>
          {m.howToRead}
        </InfoBlock>
      ) : null}
      {m.norm && m.howToRead ? (
        <InfoBlock icon="spark" title={traduire("Comment la lire")} color={S.gold} tint={S.goldSoft}>
          {m.howToRead}
        </InfoBlock>
      ) : null}

      <InfoBlock icon="watch" title={traduire("D'où viennent ces données")} color={S.indigo} tint={S.indigoSoft}>
        <Ink size={14} weight="medium" color={S.ink2}>
          {notOnAndroid
            ? traduire("Sur Android, Health Connect n'a pas cette mesure. Elle est lue sur iPhone depuis Apple Santé.")
            : notOnIos
              ? traduire("Sur iPhone, l’app Santé de ton téléphone n'a pas cette mesure. Elle est lue sur Android depuis Health Connect.")
              : traduire("YOROI la lit dans {0}. Ton appareil doit y partager ses données.", Platform.OS === 'android' ? 'Health Connect' : traduire('l’app Santé de ton téléphone'))}
        </Ink>
        {senders.length > 0 && !notHere ? (
          <View style={{ gap: 8, marginTop: 4 }}>
            <Ink size={12} weight="extraBold" color={S.ink2}>
              {traduire("Montres qui l'envoient, selon les marques")}</Ink>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {senders.map((w) => (
                <Press key={w.key} onPress={() => router.push(`/sante/montre?marque=${w.key}` as any)} accessibilityRole="button" accessibilityLabel={`${w.name}, guide`}>
                  <View style={{ minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 6, paddingLeft: 4, paddingRight: 10, borderRadius: 20, backgroundColor: S.paper, borderWidth: 1, borderColor: S.line2 }}>
                    <BrandMark text={w.mark} kind={w.kind} size={28} />
                    <Ink size={12} weight="extraBold">
                      {w.name.split(',')[0]}
                    </Ink>
                  </View>
                </Press>
              ))}
            </View>
          </View>
        ) : !notHere ? (
          <Ink size={12} weight="bold" color={S.muted}>
            {`Appareils courants : ${m.devices}.`}
          </Ink>
        ) : null}
        {sourceNames.length > 0 ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
            {sourceNames.map((n) => (
              <View key={n} style={{ paddingHorizontal: 10, height: 28, borderRadius: 14, backgroundColor: S.indigoSoft, justifyContent: 'center' }}>
                <Ink size={12} weight="extraBold" color={S.indigo}>
                  {traduire("Reçu de {0}", n)}
                </Ink>
              </View>
            ))}
          </View>
        ) : null}
      </InfoBlock>

      {m.more ? (
        <Press onPress={() => router.push(m.more!.href as any)} accessibilityRole="button" accessibilityLabel={traduire(m.more.label)}>
          <View style={{ minHeight: 56, borderRadius: 18, backgroundColor: P.primary, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <Ink size={15} weight="extraBold" color={P.onPrimary}>
              {traduire(m.more.label)}
            </Ink>
            <SanteIcon name="chevron" size={16} color={P.onPrimary} />
          </View>
        </Press>
      ) : null}
      <Press onPress={() => router.push('/sante/montre' as any)} accessibilityRole="button" accessibilityLabel={traduire("Configurer ma montre")}>
        <View style={{ minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <SanteIcon name="link" size={15} color={S.accent} />
          <Ink size={13} weight="extraBold" color={S.accent}>
            {traduire("Configurer ma montre")}</Ink>
        </View>
      </Press>
    </DetailScreen>
  );
}
