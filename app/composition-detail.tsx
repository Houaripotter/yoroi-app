/**
 * Composition detaillee v2, deux modes :
 * - Mesure : une pesee a la fois avec sa date, des fleches precedente et suivante,
 *   la tendance, la barre muscle, graisse, os et tous les biomarqueurs.
 * - Courbe : une donnee a la fois, grand graphique au doigt, periode, moyenne,
 *   plus bas, plus haut, evolution, explication et historique.
 * Parametres optionnels : metric (fat, muscle, bmi, lean...), mode (mesure, courbe), date (AAAA-MM-JJ).
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';

// vague 48 : le coffre sante de l'appareil (Apple Sante sur iPhone, Health Connect sur Android)
const SANTE = Platform.OS === 'android' ? 'Health Connect' : 'Apple Santé';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { DetailHeader, EmptyInvite, GUTTER, Pills, SectionHead } from '@/components/yoroi/v2/progres/ui';
import { MetricDetail } from '@/components/yoroi/v2/progres/MetricDetail';
import type { DetailPoint, MetricSpec } from '@/components/yoroi/v2/progres/MetricDetail';
import { COMPO_EXPLAIN } from '@/components/yoroi/v2/progres/explain';
import { COMPO_COLORS } from '@/components/yoroi/v2/progres/CorpsSection';
import { BioListCard, CompositionCard, KeyMassCards, MeasureNav } from '@/components/yoroi/v2/progres/Biomarkers';
import { ExtrasCard, SegmentsCard } from '@/components/yoroi/v2/progres/Segments';
import { CHART_COLORS } from '@/components/yoroi/v2/charts/core';
import { couleurMesureCorps } from '@/lib/v2/progres/couleursCorps';
import { COMPO_METRICS, LEGACY_METRIC_IDS } from '@/lib/v2/progres/composition';
import type { CompoKey } from '@/lib/v2/progres/composition';
import { BIO_EXPLAIN, bioSeries, bmiSeries, buildBiomarkers, keyMasses, trendOf, useBiomarkers } from '@/lib/v2/progres/biomarkers';
import type { BioKey } from '@/lib/v2/progres/biomarkers';
import { num } from '@/lib/v2/progres/format';

const SOURCES: Record<string, string> = { manual: 'saisie à la main', withings: 'balance Withings', garmin: 'Garmin', apple_health: 'Apple Santé', healthkit: 'Apple Santé', health_connect: 'Health Connect', xiaomi: 'balance Xiaomi', body_composition: 'saisie à la main', balance_photo: 'Balance (photo)' };

type DetailMetric = { key: BioKey; label: string; short: string; unit: string; digits: number; good: 'up' | 'down' | 'none' };

const compo = (k: CompoKey): DetailMetric => COMPO_METRICS.find((m) => m.key === k) as DetailMetric;

/** Ordre des pastilles : les donnees de la balance, puis celles que YOROI calcule */
const METRICS: DetailMetric[] = ([
  compo('fat'),
  compo('muscle'),
  compo('muscleKg'),
  { key: 'lean', label: 'Masse maigre', short: 'Maigre', unit: '%', digits: 1, good: 'none' },
  compo('water'),
  { key: 'bmi', label: 'IMC', short: 'IMC', unit: '', digits: 1, good: 'none' },
  compo('weight'),
  compo('bone'),
  compo('visceral'),
  compo('metabolicAge'),
  compo('bmr'),
] as (DetailMetric | undefined)[]).filter((m): m is DetailMetric => !!m);

// vague 45 : composition dans lib/v2/progres/couleursCorps.ts (lue au rendu : suit le mode sombre)
const bioColor = (k: BioKey): string | undefined => couleurMesureCorps(k) ?? (k === 'bmi' ? CHART_COLORS.blue : COMPO_COLORS[k as keyof typeof COMPO_COLORS]);

function specOf(m: DetailMetric): MetricSpec {
  return {
    label: m.label,
    unit: m.unit,
    digits: m.digits,
    good: m.good,
    deltaOne: m.unit === '%' || m.unit === '' ? 'point' : m.unit,
    deltaMany: m.unit === '%' || m.unit === '' ? 'points' : m.unit,
    minSpan: m.unit === 'kcal' ? 40 : m.digits === 0 ? 2 : 1,
  };
}

function keyOf(raw?: string): BioKey | undefined {
  if (!raw) return undefined;
  if (LEGACY_METRIC_IDS[raw]) return LEGACY_METRIC_IDS[raw];
  return METRICS.some((m) => m.key === raw) ? (raw as BioKey) : undefined;
}

type Mode = 'mesure' | 'courbe';

export default function CompositionDetailScreen() {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ metric?: string; mode?: string; date?: string }>();
  const { points, ctx, weights, loading } = useBiomarkers();
  const initial: BioKey = keyOf(params.metric) ?? 'fat';
  const [key, setKey] = useState<BioKey>(initial);
  const [mode, setMode] = useState<Mode>(params.mode === 'mesure' ? 'mesure' : 'courbe');
  const [selDate, setSelDate] = useState<string | null>(params.date ? String(params.date).slice(0, 10) : null);

  useEffect(() => {
    if (params.metric) {
      setKey(initial);
      if (params.mode !== 'mesure') setMode('courbe');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.metric]);

  useEffect(() => {
    if (params.mode === 'mesure' || params.mode === 'courbe') setMode(params.mode);
  }, [params.mode]);

  const seriesFor = useMemo(() => {
    return (k: BioKey) => (k === 'bmi' ? bmiSeries(weights, ctx) : bioSeries(points, k, ctx));
  }, [points, weights, ctx]);

  const available = useMemo(() => METRICS.filter((m) => seriesFor(m.key).length > 0), [seriesFor]);
  const bmiMissing = key === 'bmi' && !ctx.heightCm && !loading;
  const metric = (bmiMissing ? METRICS.find((m) => m.key === 'bmi') : undefined) ?? available.find((m) => m.key === key) ?? available[0] ?? METRICS.find((m) => m.key === key) ?? METRICS[0];
  const sourceByDate = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of points) if (p.source) map.set(p.date, p.source);
    return map;
  }, [points]);
  const series: DetailPoint[] = useMemo(() => {
    return seriesFor(metric.key).map((p) => {
      const src = sourceByDate.get(p.date);
      return { ...p, caption: src ? SOURCES[src] ?? undefined : undefined };
    });
  }, [seriesFor, metric.key, sourceByDate]);

  // Mode mesure : la pesee choisie, la plus recente par defaut
  const idx = useMemo(() => {
    if (!points.length) return -1;
    if (selDate) {
      const i = points.findIndex((p) => p.date === selDate);
      if (i >= 0) return i;
    }
    return points.length - 1;
  }, [points, selDate]);
  const point = idx >= 0 ? points[idx] : null;
  const list = useMemo(() => buildBiomarkers(points, idx, ctx), [points, idx, ctx]);
  const trend = useMemo(() => (idx >= 0 ? trendOf(points, idx) : null), [points, idx]);
  const masses = useMemo(() => keyMasses(points, idx, ctx), [points, idx, ctx]);

  // consultation seulement : ajouter une composition passe par le bouton + (vague 13)
  const ADD_HINT = 'Ajoute ta composition avec le bouton + de la barre d’onglets';
  const modeSwitch = points.length ? (
    <Pills
      items={[
        { value: 'mesure' as Mode, label: 'Mesure' },
        { value: 'courbe' as Mode, label: 'Courbe' },
      ]}
      value={mode}
      onChange={(m) => setMode(m)}
      style={{ paddingHorizontal: GUTTER, paddingTop: 12 }}
    />
  ) : null;

  if (mode === 'mesure') {
    return (
      <View style={{ flex: 1, backgroundColor: c.background }}>
        <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 40 }} showsVerticalScrollIndicator={false}>
          <DetailHeader title="Composition" sub="Chaque pesée avec tous tes biomarqueurs." />
          {modeSwitch}
          {point ? (
            <View style={{ paddingHorizontal: GUTTER, marginTop: 18 }}>
              <MeasureNav
                date={point.date}
                index={idx}
                total={points.length}
                caption={point.source ? SOURCES[point.source] : undefined}
                onPrev={() => idx > 0 && setSelDate(points[idx - 1].date)}
                onNext={() => idx < points.length - 1 && setSelDate(points[idx + 1].date)}
              />
              <CompositionCard point={point} trend={trend} showDate={false} style={{ marginTop: 16 }} />
              <KeyMassCards
                masses={masses}
                style={{ marginTop: 10 }}
                onPress={(k) => {
                  setKey(k === 'fatKg' ? 'fat' : 'muscleKg');
                  setMode('courbe');
                }}
              />
              {/* BALANCE_PHOTO : segments et morphologie, seulement si la balance les a donnes */}
              <SegmentsCard point={point} style={{ marginTop: 10 }} />
              {/* BALANCE 2 : les autres mesures de la balance, seulement si elles existent */}
              <ExtrasCard point={point} style={{ marginTop: 10 }} />
              <View style={{ marginTop: 24 }}>
                <SectionHead title="Biomarqueurs" />
                <Ink size={13} color={c.textSecondary} style={{ marginTop: 2, marginBottom: 10 }}>
                  {point.weight ? `Pesée à ${num(point.weight, 1)} kg. ` : ''}
                  {idx > 0 ? 'Écart avec la mesure précédente. Touche une ligne pour sa courbe.' : 'Touche une ligne pour sa courbe.'}
                </Ink>
                <BioListCard
                  list={list}
                  onPressRow={(k) => {
                    setKey(k);
                    setMode('courbe');
                  }}
                  onAddHeight={() => router.push('/profile' as any)}
                />
              </View>
            </View>
          ) : !loading ? (
            <EmptyInvite
              style={{ margin: GUTTER }}
              title="Pas encore de composition"
              text={`Si ta balance donne la masse grasse, le muscle ou l’eau, note-les avec ta pesée, ou relie ${SANTE}. Chaque mesure apparaîtra ici.`}
              plusHint={ADD_HINT}
              plusArrow={false}
            />
          ) : null}
        </ScrollView>
      </View>
    );
  }

  const explain = metric.key === 'bmi' || metric.key === 'lean' ? BIO_EXPLAIN[metric.key] : COMPO_EXPLAIN[metric.key];

  return (
    <MetricDetail
      key={metric.key}
      title={metric.label}
      sub={metric.key === 'bmi' ? 'Calculé avec ta taille et chacune de tes pesées.' : metric.key === 'lean' ? 'Calculée à partir de ta masse grasse.' : 'Mesurée par ta balance, sur sa propre échelle.'}
      picker={
        <>
          {modeSwitch}
          {available.length > 1 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, paddingTop: 10 }}>
              <Pills scroll items={available.map((m) => ({ value: m.key, label: m.short }))} value={metric.key} onChange={(k) => setKey(k)} />
            </ScrollView>
          ) : null}
        </>
      }
      spec={specOf(metric)}
      points={series}
      color={bioColor(metric.key) ?? c.ink}
      explain={explain}
      loading={loading}
      target={metric.key === 'visceral' ? { value: 12, label: 'sain jusqu’à 12' } : metric.key === 'bmi' ? { value: 25, label: 'seuil OMS 25' } : null}
      markBest={metric.good !== 'none'}
      scrubLine={(p) => p.caption ?? metric.label}
      empty={{
        title: metric.key === 'bmi' && !ctx.heightCm ? 'Ajoute ta taille' : 'Pas encore de composition',
        text:
          metric.key === 'bmi' && !ctx.heightCm
            ? 'Ton IMC se calcule avec ta taille et ton poids. Renseigne ta taille dans ton profil.'
            : `Si ta balance donne la masse grasse, le muscle ou l’eau, note-les avec ta pesée, ou relie ${SANTE}. Tes courbes apparaîtront ici.`,
        cta: metric.key === 'bmi' && !ctx.heightCm ? 'Renseigner ma taille' : undefined,
        onPress: metric.key === 'bmi' && !ctx.heightCm ? () => router.push('/profile' as any) : undefined,
        plusHint: metric.key === 'bmi' && !ctx.heightCm ? undefined : ADD_HINT,
      }}
    />
  );
}
