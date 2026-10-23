/**
 * Grille de mini courbes (vague 26) : le retour de l'ancien onglet Stats, Resume.
 * Deux cartes par rangee, groupees par theme (Corps, Composition, Mensurations).
 * Chaque carte : la mesure, sa derniere valeur, l'ecart sur la periode avec une fleche,
 * une petite courbe fine (2 points d'epaisseur, une seule echelle, couleur fixe par mesure).
 * Un appui ouvre le detail existant, un glisse du doigt sur la courbe revoit chaque mesure.
 * Une mesure sans aucune donnee ne s'affiche pas ; un groupe vide montre une invitation utile.
 */
import React, { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { InkLineChart } from './InkLineChart';
import type { ChartPoint } from './InkLineChart';
import { Chevron, GUTTER, SectionHead, tapLight } from './ui';
import { PlusHint } from '../PlusHint';
import { barPath, CHART_COLORS, CHART_MOSS, Reveal, Sparkline as CoreSparkline, tint } from '../charts/core';
import { CORPS } from '@/lib/v2/progres/couleursCorps';
import { WEIGHT_COLOR } from './WeightTrendChart';
import { COMPO_METRICS } from '@/lib/v2/progres/composition';
import type { CompoPoint } from '@/lib/v2/progres/composition';
import { bioSeries } from '@/lib/v2/progres/biomarkers';
import type { BioKey, BodyContext } from '@/lib/v2/progres/biomarkers';
import { VIEW_FIELDS, viewSeries } from '@/lib/v2/progres/measures';
import type { MeasurePoint, ViewKey } from '@/lib/v2/progres/measures';
import type { DayWeight } from '@/lib/v2/weightStats';
import { daysDiff, dayShort, num, thousands } from '@/lib/v2/progres/format';
import { P } from '@/components/yoroi/livePalette';
import { traduire } from '@/lib/i18n/tr';

export type MiniCurve = {
  key: string;
  label: string;
  /** kg, %, cm, kcal, ans, ou vide pour un indice (IMC, graisse viscerale) */
  unit: string;
  digits: number;
  good: 'up' | 'down' | 'none';
  color: string;
  /** toute la serie, de la plus ancienne a la plus recente */
  all: { date: string; value: number }[];
  /** valeur affichee a la place du dernier point de la courbe (la derniere pesee, quand la courbe est la tendance) */
  latest?: { date: string; value: number } | null;
  onPress: () => void;
};

export type MiniGroup = {
  key: string;
  title: string;
  curves: MiniCurve[];
  aside?: { label: string; onPress: () => void };
  /** invitation quand le groupe n'a aucune mesure */
  empty: { title: string; text: string; plusHint: string };
};

function fmtValue(v: number, unit: string, digits: number): string {
  if (unit === 'kcal') return thousands(v);
  // 13 octobre : sans unite aussi (graisse viscerale 7,5 mais 8 et non 8,0)
  return num(v, digits, unit === 'kg' || unit === '%' || unit === '');
}

function deltaUnit(unit: string, abs: number): string {
  if (unit === '%' || unit === '') return abs >= 2 ? traduire('points') : traduire('point');
  if (unit === 'ans') return abs >= 2 ? traduire('ans') : traduire('an');
  return unit;
}

function Arrow({ dir, color }: { dir: 'up' | 'down' | 'flat'; color: string }) {
  const d = dir === 'up' ? 'M12 19V5M6 11l6-6 6 6' : dir === 'down' ? 'M12 5v14M6 13l6 6 6-6' : 'M5 12h14M13 6l6 6-6 6';
  return (
    <Svg width={13} height={13} viewBox="0 0 24 24" fill="none">
      <Path d={d} stroke={color} strokeWidth={2.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Carte d'une mesure */
function MiniCurveCard({ curve, period, today }: { curve: MiniCurve; period: number; today: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [scrub, setScrub] = useState<ChartPoint | null>(null);
  const inside = useMemo(() => (period ? curve.all.filter((p) => daysDiff(p.date, today) < period) : curve.all), [curve.all, period, today]);
  // Une seule mesure sur la periode (mensurations prises une fois par mois) : on la compare a la precedente
  const anchor = inside.length === 1 && period ? [...curve.all].reverse().find((p) => daysDiff(p.date, today) >= period) ?? null : null;
  const shown = useMemo(() => (anchor ? [anchor, ...inside] : inside), [anchor, inside]);
  const lastAll = curve.all[curve.all.length - 1];
  const inPeriod = inside.length > 0;
  const first = shown[0];
  const last = shown[shown.length - 1];
  const diff = shown.length >= 2 ? last.value - first.value : null;
  const eps = Math.pow(10, -curve.digits) / 2;
  const flat = diff === null || Math.abs(diff) < Math.max(eps, curve.unit === 'kcal' ? 5 : 0.05);
  const dir: 'up' | 'down' | 'flat' = flat ? 'flat' : (diff as number) > 0 ? 'up' : 'down';
  const goodWay = !flat && curve.good !== 'none' && ((curve.good === 'up' && dir === 'up') || (curve.good === 'down' && dir === 'down'));
  const tone = goodWay ? c.successText : c.textSecondary;
  const head = scrub ?? (curve.latest && inPeriod ? curve.latest : null) ?? lastAll;
  const abs = diff === null ? 0 : Math.abs(diff);
  const deltaText = flat ? traduire('stable') : `${fmtValue(abs, curve.unit, curve.digits)} ${deltaUnit(curve.unit, abs)}`;
  const since = anchor ? traduire("depuis le {0}", dayShort(anchor.date)) : traduire('sur la période');
  const deltaLong = flat ? traduire("stable {0}", since) : dir === 'down' ? traduire("{0} de moins {1}", deltaText, since) : traduire("{0} de plus {1}", deltaText, since);
  const valueText = `${fmtValue(head.value, curve.unit, curve.digits)}${curve.unit ? ` ${curve.unit === 'ans' ? traduire('ans') : curve.unit}` : ''}`;
  const open = () => {
    tapLight();
    curve.onPress();
  };

  return (
    <View style={{ flex: 1, minWidth: 0, borderRadius: 20, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, overflow: 'hidden' }}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={traduire("{0}, {1}, {2}, voir le détail", curve.label, valueText, inPeriod ? (diff === null ? traduire('une seule mesure sur la période') : deltaLong) : traduire("dernière mesure le {0}", dayShort(lastAll.date)))}
        style={({ pressed }) => ({ paddingHorizontal: 12, paddingTop: 11, gap: 1, backgroundColor: pressed ? c.fillSoft : 'transparent' })}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 18 }}>
          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: curve.color }} />
          <Ink size={curve.label.length > 13 ? 12 : 13} weight="bold" color={c.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
            {traduire(curve.label)}
          </Ink>
          <Chevron color={c.textMuted} size={11} />
        </View>
        <Ink size={23} weight="black" tight numberOfLines={1} style={{ marginTop: 3 }}>
          {fmtValue(head.value, curve.unit, curve.digits)}
          {curve.unit ? (
            <Ink size={13} weight="bold" color={c.textSecondary}>
              {` ${curve.unit}`}
            </Ink>
          ) : null}
        </Ink>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: 18 }}>
          {scrub ? (
            <Ink size={12} weight="bold" color={c.ink} numberOfLines={1}>
              {dayShort(scrub.date)}
            </Ink>
          ) : !inPeriod ? (
            <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>
              {traduire("le {0}", dayShort(lastAll.date, lastAll.date.slice(0, 4) !== today.slice(0, 4)))}
            </Ink>
          ) : diff === null ? (
            <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>
              {traduire("une seule mesure")}</Ink>
          ) : (
            <>
              <Arrow dir={dir} color={tone} />
              <Ink size={12} weight="extraBold" color={tone} numberOfLines={1} style={{ flexShrink: 1 }}>
                {deltaText}
              </Ink>
            </>
          )}
        </View>
        {anchor && !scrub ? (
          <Ink size={11} weight="bold" color={c.textMuted} numberOfLines={1}>
            {traduire("depuis le {0}", dayShort(anchor.date))}
          </Ink>
        ) : null}
      </Pressable>
      {shown.length >= 2 ? (
        <View style={{ paddingHorizontal: 4, paddingBottom: 4 }}>
          <InkLineChart points={shown} color={curve.color} suitStyle height={56} compact strokeWidth={2} digits={curve.digits} minSpan={curve.unit === 'kcal' ? 20 : curve.digits === 0 ? 2 : 0.6} onScrub={(p) => setScrub(p)} onPress={curve.onPress} label={`${curve.label}, ${deltaLong}`} />
        </View>
      ) : (
        <Pressable onPress={open} style={{ height: 60, paddingHorizontal: 12, justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no">
          <Ink size={11} color={c.textMuted} numberOfLines={2}>
            {inPeriod ? traduire('La courbe se dessine dès la deuxième mesure.') : traduire('Aucune mesure sur cette période.')}
          </Ink>
        </Pressable>
      )}
    </View>
  );
}

/** Invitation compacte d'un groupe sans mesure */
function GroupEmpty({ empty }: { empty: MiniGroup['empty'] }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ marginTop: 10, padding: 16, gap: 6, borderRadius: 20, backgroundColor: P.carte, borderWidth: 1, borderColor: c.divider, borderStyle: 'dashed' }}>
      <Ink size={16} weight="extraBold">{traduire(empty.title)}</Ink>
      <Ink size={13} color={c.textSecondary}>{traduire(empty.text)}</Ink>
      <PlusHint text={empty.plusHint} style={{ marginTop: 6 }} />
    </View>
  );
}

/** La grille : un titre par groupe, puis les cartes deux par deux */
export function MiniCurveGrid({ groups, period, today, style }: { groups: MiniGroup[]; period: number; today: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ paddingHorizontal: GUTTER, gap: 22 }, style]}>
      {groups.map((g) => {
        const rows: MiniCurve[][] = [];
        g.curves.forEach((cv, i) => {
          if (i % 2 === 0) rows.push([]);
          rows[rows.length - 1].push(cv);
        });
        return (
          <View key={g.key}>
            {g.title ? <SectionHead title={traduire(g.title)} aside={g.curves.length ? g.aside?.label : undefined} onPress={g.curves.length ? g.aside?.onPress : undefined} /> : null}
            {g.curves.length === 0 ? (
              <GroupEmpty empty={g.empty} />
            ) : (
              <View style={{ gap: 10, marginTop: g.title ? 8 : 0 }}>
                {rows.map((r, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 10 }}>
                    {r.map((cv) => (
                      <MiniCurveCard key={cv.key} curve={cv} period={period} today={today} />
                    ))}
                    {r.length === 1 ? <View style={{ flex: 1 }} /> : null}
                  </View>
                ))}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

/** Petite courbe (cartes Sante) : la mini courbe commune du noyau, trait fin, lavis, point final avec halo */
export function Sparkline({ values, color, width = 120, height = 34 }: { values: number[]; color: string; width?: number; height?: number }) {
  return <CoreSparkline values={values} color={color} width={width} height={height} />;
}

/** Petites barres (pas des 7 derniers jours) : arrondies, espacees, le jour en cours en couleur pleine */
export function SparkBars({ values, color, width = 120, height = 34 }: { values: number[]; color: string; width?: number; height?: number }) {
  if (values.length === 0 || values.every((v) => v <= 0)) return null;
  const max = Math.max(...values, 1);
  const slot = width / values.length;
  const bw = Math.min(9, slot * 0.56);
  const soft = tint(color, 0.6);
  return (
    <Svg width={width} height={height}>
      <Reveal width={width} height={height} dir="up" replayKey={values.length}>
        {values.map((v, i) => {
          const h = v > 0 ? Math.max(3, (v / max) * (height - 2)) : 0;
          const x = slot * i + (slot - bw) / 2;
          return h > 0 ? <Path key={i} d={barPath(x, height, bw, h, bw / 2)} fill={i === values.length - 1 ? color : soft} /> : null;
        })}
      </Reveal>
    </Svg>
  );
}

// ---------- groupes de mesures ----------

const compoMeta = (k: string) => COMPO_METRICS.find((m) => m.key === k);

type Nav = (href: any) => void;

/** Couleur fixe de chaque mesure (vague 45 : composition dans lib/v2/progres/couleursCorps.ts, ambre graisse, violet muscle, gris sable os, cyan eau ; bleu et mousse pour le reste) */
const COMPO_SPEC: { key: BioKey; label: string; unit: string; digits: number; good: 'up' | 'down' | 'none'; color: string }[] = [
  { key: 'visceral', label: traduire('Gras viscéral'), unit: '', digits: 1, good: 'down', get color() { return CORPS.graisse; } },
  { key: 'bone', label: traduire('Masse osseuse'), unit: 'kg', digits: 1, good: 'none', get color() { return CORPS.os; } },
  { key: 'bmr', label: traduire('Métabolisme'), unit: 'kcal', digits: 0, good: 'none', color: CHART_MOSS },
  { key: 'metabolicAge', label: traduire('Âge métabolique'), unit: 'ans', digits: 0, good: 'down', color: CHART_COLORS.blue },
  { key: 'muscleKg', label: traduire('Muscle en kg'), unit: 'kg', digits: 1, good: 'up', get color() { return CORPS.muscle; } },
  { key: 'lean', label: traduire('Masse maigre'), unit: '%', digits: 1, good: 'none', get color() { return CORPS.muscle; } },
  { key: 'bmi', label: traduire('IMC'), unit: '', digits: 1, good: 'none', color: CHART_COLORS.blue },
];

const BODY_SPEC: { key: BioKey; label: string; unit: string; digits: number; good: 'up' | 'down' | 'none'; color: string }[] = [
  { key: 'muscle', label: traduire('Muscle'), unit: '%', digits: 1, good: 'up', get color() { return CORPS.muscle; } },
  { key: 'fat', label: traduire('Masse grasse'), unit: '%', digits: 1, good: 'down', get color() { return CORPS.graisse; } },
  { key: 'water', label: traduire('Eau'), unit: '%', digits: 1, good: 'none', get color() { return CORPS.eau; } },
];

/** Ordre des mensurations : taille et hanches d'abord, comme on les prend */
const MEASURE_ORDER: ViewKey[] = ['waist', 'hips', 'chest', 'arm', 'thigh', 'shoulders', 'navel', 'calf', 'neck'];

export function bodyGroup(weights: DayWeight[], compo: CompoPoint[], ctx: BodyContext, nav: Nav, _inkColor?: string): MiniGroup {
  const curves: MiniCurve[] = [];
  if (weights.length) {
    const lastW = weights[weights.length - 1];
    curves.push({
      key: 'weight',
      label: traduire('Poids'),
      unit: 'kg',
      digits: 1,
      good: 'none',
      // vague 33 : le violet de la courbe de poids, partout ou le poids apparait
      color: WEIGHT_COLOR,
      all: weights.map((p) => ({ date: p.date, value: p.trend })),
      latest: { date: lastW.date, value: lastW.value },
      onPress: () => nav('/poids-detail'),
    });
  }
  BODY_SPEC.forEach((s) => {
    const all = bioSeries(compo, s.key, ctx);
    if (all.length) curves.push({ ...s, key: s.key, label: s.label, all, onPress: () => nav({ pathname: '/composition-detail', params: { metric: s.key } }) });
  });
  return {
    key: 'corps',
    title: 'Corps',
    curves,
    aside: { label: traduire('Tes pesées'), onPress: () => nav('/pesees') },
    empty: { title: traduire('Ta première pesée'), text: traduire('Pèse-toi le matin, à jeun. Ton poids, ton muscle, ta masse grasse et ton eau auront chacun leur courbe ici.'), plusHint: traduire('Touche + pour te peser') },
  };
}

export function compositionGroup(compo: CompoPoint[], ctx: BodyContext, nav: Nav): MiniGroup {
  const curves: MiniCurve[] = [];
  COMPO_SPEC.forEach((s) => {
    const all = bioSeries(compo, s.key, ctx);
    if (!all.length) return;
    // IMC et masse maigre se calculent depuis le poids : on ne les montre que si la balance donne aussi une composition
    if ((s.key === 'bmi' || s.key === 'lean') && !compo.some((p) => p.fat || p.muscle || p.visceral || p.bmr)) return;
    const meta = compoMeta(s.key);
    curves.push({ ...s, label: s.label || meta?.label || s.key, all, onPress: () => nav({ pathname: '/composition-detail', params: { metric: s.key } }) });
  });
  return {
    key: 'composition',
    title: traduire('Composition'),
    curves,
    aside: { label: traduire('Chaque mesure'), onPress: () => nav({ pathname: '/composition-detail', params: { mode: 'mesure' } }) },
    empty: { title: traduire('Ta composition en détail'), text: traduire('Graisse viscérale, os, métabolisme de base, âge métabolique : si ta balance les donne, note-les avec ta pesée.'), plusHint: traduire('Touche + pour ta composition') },
  };
}

export function measuresGroup(measures: MeasurePoint[], nav: Nav): MiniGroup {
  const curves: MiniCurve[] = [];
  MEASURE_ORDER.forEach((k) => {
    const f = VIEW_FIELDS.find((x) => x.key === k);
    if (!f) return;
    const all = viewSeries(measures, k);
    if (!all.length) return;
    curves.push({ key: k, label: f.label === 'Taille' ? traduire('Tour de taille') : f.label, unit: 'cm', digits: 1, good: f.good, color: CHART_COLORS.blue, all, onPress: () => nav({ pathname: '/measurements-detail', params: { field: k } }) });
  });
  return {
    key: 'mensurations',
    title: traduire('Mensurations'),
    curves,
    aside: { label: traduire('L’évolution'), onPress: () => nav('/measurements-detail') },
    empty: { title: traduire('Prends tes mesures une fois par mois'), text: traduire('Tour de taille, hanches, bras, cuisses : le mètre ruban voit ce que la balance ne voit pas, surtout quand tu prends du muscle.'), plusHint: traduire('Touche + pour tes mensurations') },
  };
}
