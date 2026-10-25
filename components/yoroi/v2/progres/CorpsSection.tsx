/**
 * Progres, section Corps (maquette G2) : en haut la derniere mesure de composition
 * (tendance, barre muscle, graisse, os, liste des biomarqueurs), puis les petits graphiques separes,
 * silhouette avec les mensurations, photos recentes et transformation.
 * Sans donnees, chaque bloc montre un apercu d'exemple en filigrane.
 * Vague 40 : part='corps' (composition, courbes, mensurations, historique) ou part='photos'
 * (photos et transformation) pour les onglets Corps et Photos de Progres ; sans part, tout.
 */
import React, { useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, View } from 'react-native';
import { useRouter } from 'expo-router';
import Svg, { Circle, Path } from 'react-native-svg';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { InkLineChart } from './InkLineChart';
import type { ChartPoint } from './InkLineChart';
import { Silhouette } from './Silhouette';
import type { SilhouetteItem } from './Silhouette';
import { FeatureList } from '../FeatureList';
import { Chevron, EmptyInvite, GUTTER, SectionHead, tapLight } from './ui';
import { ExamplePreview } from './ExamplePreview';
import { SAMPLE_SILHOUETTE, sampleComposition } from '@/lib/v2/progres/samples';
import { PeriodSwitch, periodPhrase, SHORT_PERIODS } from '../charts/PeriodSwitch';
import { bodyGroup, compositionGroup, measuresGroup, MiniCurveGrid } from './MiniCurveGrid';
import { CHART_COLORS, CHART_MOSS, SERIES_ORDER } from '../charts/core';
import { CORPS } from '@/lib/v2/progres/couleursCorps';
import { useMeasuresData, usePhotosData, photosByDate } from '@/lib/v2/progres/useProgresData';
import { keyMasses, trendOf, useBiomarkers } from '@/lib/v2/progres/biomarkers';
import { CompositionCard, KeyMassCards } from './Biomarkers';
import type { CompoKey } from '@/lib/v2/progres/composition';
import { VIEW_FIELDS, viewSeries } from '@/lib/v2/progres/measures';
import { dayLong, dayShort, num, sinceText, todayIso } from '@/lib/v2/progres/format';
import { traduire, traduirePluriel } from '@/lib/i18n/tr';

export const SERIES_COLORS = [...SERIES_ORDER];

/** Une teinte par mesure du corps ; le rouge reste aux tampons de record */
// vague 45 : une seule source, lib/v2/progres/couleursCorps.ts (getters : suivent le mode sombre)
export const COMPO_COLORS: Partial<Record<CompoKey, string>> = {
  get fat() {
    return CORPS.graisse;
  },
  get muscle() {
    return CORPS.muscle;
  },
  get muscleKg() {
    return CORPS.muscle;
  },
  get water() {
    return CORPS.eau;
  },
};

const ROWS: { key: CompoKey; label: string; color: string; unitWord: string }[] = [
  { key: 'fat', label: 'Masse grasse', get color() { return CORPS.graisse; }, unitWord: 'point' },
  { key: 'muscle', label: 'Muscle', get color() { return CORPS.muscle; }, unitWord: 'point' },
  { key: 'water', label: 'Eau', get color() { return CORPS.eau; }, unitWord: 'point' },
];

export function deltaWords(diff: number, unitOne: string, unitMany: string, eps = 0.05): string {
  if (Math.abs(diff) < eps) return traduire('stable');
  const abs = Math.abs(diff);
  return diff < 0 ? traduire("{0} {1} de moins", num(abs, 1), abs >= 2 ? unitMany : unitOne) : traduire("{0} {1} de plus", num(abs, 1), abs >= 2 ? unitMany : unitOne);
}

export function cmDelta(diff: number): string {
  const abs = Math.abs(diff);
  if (abs < 0.25) return traduire('stable');
  if (abs < 1) return diff < 0 ? traduire("{0} mm de moins", Math.round(abs * 10)) : traduire("{0} mm de plus", Math.round(abs * 10));
  return diff < 0 ? traduire("{0} cm de moins", num(abs, 1)) : traduire("{0} cm de plus", num(abs, 1));
}

/**
 * Petite courbe d'une mesure : le nom et le chiffre au-dessus, la courbe sur toute la largeur.
 * Un appui court ouvre le detail, un glisse du doigt revoit chaque mesure.
 */
export function MiniMetricRow({
  label,
  color,
  points,
  valueText,
  deltaText,
  onPress,
  first,
}: {
  label: string;
  color: string;
  points: ChartPoint[];
  valueText: (v: number) => string;
  deltaText: (diff: number) => string;
  onPress?: () => void;
  first?: boolean;
}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [scrub, setScrub] = useState<ChartPoint | null>(null);
  const last = points[points.length - 1];
  const firstP = points[0];
  const shown = scrub ?? last;
  const diff = last.value - firstP.value;
  const open = onPress
    ? () => {
        tapLight();
        onPress();
      }
    : undefined;
  const head = (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28 }}>
      <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: color }} />
      <Ink size={15} weight="extraBold" style={{ flex: 1 }} numberOfLines={1}>
        {label}
      </Ink>
      {open ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
          <Ink size={13} weight="extraBold" color={c.accent}>
            {traduire("Détail")}</Ink>
          <Chevron color={c.accent} size={12} />
        </View>
      ) : null}
    </View>
  );
  return (
    <View style={{ paddingVertical: 14, borderTopWidth: first ? 0 : 1.5, borderColor: c.border, gap: 6 }}>
      {open ? (
        <Pressable onPress={open} accessibilityRole="button" accessibilityLabel={traduire("{0}, {1}, voir le détail", label, valueText(last.value))} hitSlop={6} style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}>
          {head}
        </Pressable>
      ) : (
        head
      )}
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <Ink size={28} weight="black" tight>
          {valueText(shown.value)}
        </Ink>
        <Ink size={14} weight="bold" color={scrub ? c.ink : c.textSecondary} style={{ flexShrink: 1 }}>
          {scrub ? dayShort(scrub.date) : points.length < 2 ? traduire('une seule mesure') : deltaText(diff)}
        </Ink>
      </View>
      {points.length >= 2 ? (
        <InkLineChart points={points} color={color} suitStyle height={76} compact digits={1} minSpan={1} onScrub={(p) => setScrub(p)} onPress={onPress} label={`${label}, ${deltaText(diff)}`} />
      ) : (
        <Pressable onPress={open} disabled={!open} style={{ height: 44, justifyContent: 'center' }}>
          <Ink size={13} color={c.textSecondary}>
            {traduire("La courbe se dessine dès la deuxième mesure.")}</Ink>
        </Pressable>
      )}
    </View>
  );
}

function CompoRow({ label, color, points, unitWord, onPress, first }: { label: string; color: string; points: ChartPoint[]; unitWord: string; onPress?: () => void; first?: boolean }) {
  return (
    <MiniMetricRow
      label={label}
      color={color}
      points={points}
      first={first}
      onPress={onPress}
      valueText={(v) => `${num(v, 1, false)} %`}
      deltaText={(d) => deltaWords(d, traduire(unitWord), traduire(`${unitWord}s`))}
    />
  );
}

function EyeIcon({ color, off }: { color: string; off?: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" stroke={color} strokeWidth={2} strokeLinejoin="round" />
      <Circle cx={12} cy={12} r={3} stroke={color} strokeWidth={2} />
      {off ? <Path d="M4 4l16 16" stroke={color} strokeWidth={2} strokeLinecap="round" /> : null}
    </Svg>
  );
}

export function CorpsSection({ part }: { part?: 'corps' | 'photos' } = {}) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const router = useRouter();
  const bio = useBiomarkers();
  const compo = { points: bio.points, loading: bio.loading };
  const lastIdx = bio.points.length - 1;
  const lastPoint = lastIdx >= 0 ? bio.points[lastIdx] : null;
  const trend = useMemo(() => (lastIdx >= 0 ? trendOf(bio.points, lastIdx) : null), [bio.points, lastIdx]);
  const masses = useMemo(() => keyMasses(bio.points, lastIdx, bio.ctx), [bio.points, lastIdx, bio.ctx]);

  const measures = useMeasuresData();
  const photos = usePhotosData();
  const [period, setPeriod] = useState(90);
  const [veiled, setVeiled] = useState(true);

  const today = todayIso();
  const sample = useMemo(() => sampleComposition(today), [today]);
  const hasCompo = compo.points.length > 0;
  const nav = (href: any) => router.push(href);
  const compoGroups = useMemo(() => {
    const body = bodyGroup([], bio.points, bio.ctx, nav, c.ink);
    const more = compositionGroup(bio.points, bio.ctx, nav);
    return [{ ...body, title: 'Masse grasse, muscle, eau', aside: undefined }, { ...more, title: 'Tes biomarqueurs' }].filter((g) => g.curves.length > 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bio.points, bio.ctx, c.ink]);

  const silhouette = useMemo(() => {
    const items: SilhouetteItem[] = [];
    let since: string | null = null;
    for (const f of VIEW_FIELDS) {
      const s = viewSeries(measures.points, f.key);
      if (s.length === 0) continue;
      const last = s[s.length - 1];
      const first = s[0];
      if (!since || first.date < since) since = first.date;
      items.push({ key: f.key, label: f.label, value: `${num(last.value, 1)} cm`, delta: s.length > 1 ? last.value - first.value : null });
    }
    return { items, since };
  }, [measures.points]);

  // Chaque mensuration en mini courbe, depuis la premiere prise (une prise par mois en general)
  const measureGroups = useMemo(() => [{ ...measuresGroup(measures.points, (href: any) => router.push(href)), title: '', aside: undefined }], [measures.points, router]);

  const sortedPhotos = useMemo(() => photosByDate(photos.photos), [photos.photos]);
  const recent = sortedPhotos.slice(-8).reverse();
  const firstPhoto = sortedPhotos[0];
  const lastPhoto = sortedPhotos[sortedPhotos.length - 1];
  const showCorps = part !== 'photos';
  const showPhotos = part !== 'corps';

  return (
    <View style={{ paddingTop: part ? 12 : 22, gap: 30 }}>
      {/* Derniere mesure : tendance, barre de composition, biomarqueurs */}
      {showCorps && lastPoint ? (
        <View style={{ paddingHorizontal: GUTTER }}>
          <SectionHead title={traduire("Ta composition")} aside={traduire("Chaque mesure")} onPress={() => router.push({ pathname: '/composition-detail', params: { mode: 'mesure' } } as any)} />
          <CompositionCard point={lastPoint} trend={trend} style={{ marginTop: 10 }} onPress={() => router.push({ pathname: '/composition-detail', params: { mode: 'mesure' } } as any)} />
          <KeyMassCards masses={masses} style={{ marginTop: 10 }} onPress={(k) => router.push({ pathname: '/composition-detail', params: { metric: k === 'fatKg' ? 'fat' : 'muscleKg' } } as any)} />
        </View>
      ) : null}

      {/* Composition en grille de mini courbes (vague 26), deux par rangee */}
      {!showCorps ? null : !compo.loading && !hasCompo ? (
        <View style={{ paddingHorizontal: GUTTER }}>
          <SectionHead title={traduire("Composition")} />
          <ExamplePreview
            flush
            style={{ marginTop: 12 }}
            title={traduire("Ta composition, courbe par courbe")}
            text={traduire("Masse grasse, muscle, eau : si ta balance les donne, note-les avec ta pesée. Chaque courbe a sa propre échelle pour bien voir ce qui bouge.")}
            plusHint={traduire("Touche + pour ta composition")}
          >
            {ROWS.map((r, i) => (
              <CompoRow key={r.key} first={i === 0} label={traduire(r.label)} color={r.color} points={sample[r.key as 'fat' | 'muscle' | 'water']} unitWord={r.unitWord} />
            ))}
          </ExamplePreview>
        </View>
      ) : hasCompo ? (
        <View>
          <View style={{ paddingHorizontal: GUTTER, gap: 6 }}>
            <SectionHead title={traduire("Tes courbes")} aside={traduire("Le détail")} onPress={() => router.push('/composition-detail' as any)} />
            <Ink size={14} color={c.textSecondary} style={{ marginTop: -4 }}>
              {traduire("Mesurées par ta balance, {0}. Touche une carte pour son détail.", periodPhrase(period))}
            </Ink>
            <PeriodSwitch value={period} onChange={setPeriod} options={SHORT_PERIODS} style={{ marginTop: 6 }} />
          </View>
          <MiniCurveGrid groups={compoGroups} period={period} today={today} style={{ marginTop: 16 }} />
        </View>
      ) : null}

      {/* Mensurations */}
      {showCorps ? (
      <View style={{ paddingHorizontal: GUTTER }}>
        <SectionHead title={traduire("Mensurations")} aside={silhouette.items.length ? traduire('L’évolution') : undefined} onPress={silhouette.items.length ? () => router.push('/measurements-detail' as any) : undefined} />
        {!measures.loading && silhouette.items.length === 0 ? (
          <ExamplePreview
            flush
            style={{ marginTop: 12 }}
            title={traduire("Prends tes mesures une fois par mois")}
            text={traduire("Tour de taille, bras, cuisses : le mètre ruban voit ce que la balance ne voit pas, surtout quand tu prends du muscle.")}
            plusHint={traduire("Touche + pour tes mensurations")}
          >
            <Silhouette items={SAMPLE_SILHOUETTE} height={280} />
          </ExamplePreview>
        ) : silhouette.items.length ? (
          <>
            {silhouette.since ? (
              <Ink size={14} color={c.textSecondary} style={{ marginTop: 2 }}>
                {`${sinceText(silhouette.since).charAt(0).toUpperCase()}${sinceText(silhouette.since).slice(1)}`}
              </Ink>
            ) : null}
            <View style={{ marginTop: 16 }}>
              <Silhouette items={silhouette.items} onPressItem={(k) => router.push({ pathname: '/measurements-detail', params: { field: k } } as any)} />
            </View>
            {measureGroups[0].curves.length ? (
              <MiniCurveGrid groups={measureGroups} period={0} today={today} style={{ marginTop: 18, paddingHorizontal: 0 }} />
            ) : null}
          </>
        ) : null}
      </View>
      ) : null}

      {/* Photos */}
      {showPhotos ? (
      <View>
        <View style={{ paddingHorizontal: GUTTER, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* vague 40 : dans l'onglet Photos, le titre de l'onglet suffit */}
          {part === 'photos' ? <View style={{ flex: 1 }} /> : <SectionHead title="Photos" style={{ flex: 1 }} />}
          {recent.length ? (
            <Pressable
              onPress={() => {
                tapLight();
                setVeiled((v) => !v);
              }}
              accessibilityRole="button"
              accessibilityLabel={veiled ? traduire('Afficher les photos') : traduire('Flouter les photos')}
              style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}
            >
              <EyeIcon color={c.textSecondary} off={!veiled} />
            </Pressable>
          ) : null}
          {recent.length ? (
            <Pressable onPress={() => router.push('/photos' as any)} accessibilityRole="button" accessibilityLabel={traduire("Toutes tes photos")} hitSlop={8} style={{ minHeight: 44, justifyContent: 'center', paddingLeft: 6 }}>
              <Ink size={13} weight="bold" color={c.accent}>
                {traduire("Toutes")}</Ink>
            </Pressable>
          ) : null}
        </View>
        {!photos.loading && recent.length === 0 ? (
          <EmptyInvite
            style={{ marginHorizontal: GUTTER, marginTop: 12 }}
            title={traduire("Une photo par mois, même cadrage")}
            text={traduire("Tes photos restent sur ton téléphone. Dans quelques semaines, tu verras ta transformation côte à côte.")}
            plusHint={traduire("Touche + pour ta première photo")}
          />
        ) : (
          <>
            <Ink size={14} color={c.textSecondary} style={{ paddingHorizontal: GUTTER, marginTop: 2 }}>
              {veiled ? traduire('Floutées ici, touche l’œil pour les voir') : traduirePluriel(sortedPhotos.length, sortedPhotos.length > 1, "{0} photo dans ton coffre", "{0} photos dans ton coffre", sortedPhotos.length)}
            </Ink>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: GUTTER, gap: 10, paddingTop: 14 }}>
              {recent.map((p) => (
                <Pressable key={p.id} onPress={() => router.push('/photos' as any)} accessibilityRole="button" accessibilityLabel={traduire("Photo du {0}", dayLong(p.date.slice(0, 10)))} style={{ width: 96, gap: 6 }}>
                  <Image source={{ uri: p.file_uri }} blurRadius={veiled ? 22 : 0} style={{ width: 96, height: 128, borderRadius: 18, backgroundColor: c.fillSubtle }} resizeMode="cover" />
                  <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>
                    {dayShort(p.date.slice(0, 10))}
                    {p.weight ? `, ${num(p.weight, 1)} kg` : ''}
                  </Ink>
                </Pressable>
              ))}
            </ScrollView>
            {firstPhoto && lastPhoto && firstPhoto.id !== lastPhoto.id ? (
              <Pressable
                onPress={() => {
                  tapLight();
                  router.push('/transformation' as any);
                }}
                accessibilityRole="button"
                accessibilityLabel={traduire("Voir ta transformation, avant et après")}
                style={({ pressed }) => ({ marginHorizontal: GUTTER, marginTop: 16, borderRadius: 24, overflow: 'hidden', backgroundColor: c.darkCard, opacity: pressed ? 0.92 : 1 })}
              >
                <View style={{ flexDirection: 'row', height: 150 }}>
                  <Image source={{ uri: firstPhoto.file_uri }} blurRadius={veiled ? 22 : 0} style={{ flex: 1 }} resizeMode="cover" />
                  <View style={{ width: 3, backgroundColor: '#FFFFFF' }} />
                  <Image source={{ uri: lastPhoto.file_uri }} blurRadius={veiled ? 22 : 0} style={{ flex: 1 }} resizeMode="cover" />
                </View>
                <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Ink size={17} weight="extraBold" color={c.onAccent}>
                      {traduire("Ta transformation")}</Ink>
                    <Ink size={13} color={c.onDarkSecondary}>
                      {traduire("{0} et {1}, côte à côte", dayShort(firstPhoto.date.slice(0, 10), true), dayShort(lastPhoto.date.slice(0, 10), true))}
                    </Ink>
                  </View>
                  <View style={{ height: 40, paddingHorizontal: 14, borderRadius: 14, backgroundColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center' }}>
                    <Ink size={14} weight="extraBold" color={c.accent}>
                      {traduire("Comparer")}</Ink>
                  </View>
                </View>
              </Pressable>
            ) : null}
          </>
        )}
      </View>
      ) : null}

      {/* Historique corporel : chaque mesure, une par une */}
      {showCorps ? (
        <View style={{ paddingHorizontal: GUTTER - 4 }}>
          <FeatureList title={traduire("Ton historique")} items={[{ label: traduire('Ton corps, mesure par mesure'), sub: traduire('poids, graisse, muscle, eau, mensurations'), href: '/body-history' }]} />
        </View>
      ) : null}
    </View>
  );
}
