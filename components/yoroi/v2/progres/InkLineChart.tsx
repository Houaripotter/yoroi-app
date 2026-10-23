/**
 * Courbe au pinceau generique (refonte v2) : une seule echelle, lavis sous la courbe,
 * trophees dores sur les records (16 octobre, avant : tampons rouges), curseur au doigt avec retour haptique.
 * Mode compact pour les petits graphiques en ligne (composition).
 * S'appuie sur le noyau commun des graphiques (charts/core).
 *
 * 16 octobre 2026 (Houari : « dans Carnet, regarde les graphiques, je veux qu'ils soient toujours comme l'accueil, en
 * fonction de comment il choisit ses graphiques dans les réglages ») : avec `suitStyle`, la courbe prend le style
 * choisi dans Reglages, Tes courbes (lib/v2/courbes/prefs.ts), le meme que la carte Poids de l'accueil :
 *  1 le grand chiffre suit ton doigt (la valeur touchee en grand au-dessus de la courbe, ou dans l'ecran qui l'affiche) ;
 *  2 une bulle au-dessus du doigt, le passe reste en couleur, la suite s'efface ;
 *  3 une barre par valeur (une par semaine, en moyenne, au-dela de 100 jours) ;
 *  4 la courbe et, s'il y a un objectif, le chemin en pointilles jusqu'a lui.
 * Avec `domaine`, le trait prend la couleur du domaine (accueil) ou la couleur choisie (Indigo, Encre).
 * Lisibilite : les reperes de l'axe encadrent toute la courbe, le tampon de record ne touche plus le point final.
 */
import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Circle, ClipPath, Defs, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { Ink } from '../Ink';
import { daysDiff, dayShort, monthShort, num } from '@/lib/v2/progres/format';
import { areaOf, AxisLabel, barPath, brushPath, CHART, ChartCursor, ChartGrid, ChartTooltip, displayPoints, EndDot, nearestIndex, mix, RefLine, reperesCourts, Reveal, SealMark, SeriesLine, useChartInk, useChartScrub, useRecordGold, BadgeRecord } from '../charts/core';
import { usePrefsCourbes } from '@/lib/v2/courbes/prefs';
import type { StyleCourbe } from '@/lib/v2/courbes/prefs';
import type { Domaine } from '../accueil/domaines';
import { couleurTraitDomaine } from '../charts/couleurDomaine';
import { placeTampon, pointsDesBarres, reperesCouvrants } from '@/lib/v2/courbes/graphes';
import { traduire } from '@/lib/i18n/tr';

export type ChartPoint = { date: string; value: number; record?: boolean; week?: boolean };

type Props = {
  points: ChartPoint[];
  color?: string;
  height?: number;
  compact?: boolean;
  /** nombre de decimales des etiquettes */
  digits?: number;
  /** ligne de repere horizontale (objectif) */
  target?: { value: number; label: string } | null;
  /** prolongement en pointilles jusqu'a cette valeur et cette date */
  projection?: { date: string; value: number; label?: string } | null;
  /** si absent, la valeur touchee s'affiche dans une bulle au-dessus du curseur */
  onScrub?: (p: ChartPoint | null, index: number | null) => void;
  label: string;
  strokeWidth?: number;
  minSpan?: number;
  /** format de la valeur dans la bulle (par defaut : nombre avec virgule) */
  format?: (v: number) => string;
  /** appui court sur la courbe : ouvre le detail (le glisse du doigt garde le curseur) */
  onPress?: () => void;
  /** vague 45 : axe inverse (temps de course : plus haut = plus rapide, le plus petit temps en haut) */
  invert?: boolean;
  /** format des reperes de l'axe (par defaut : nombre avec virgule) */
  tickFormat?: (v: number) => string;
  /** reperes sur mesure (temps : des minutes rondes) */
  ticksFor?: (min: number, max: number) => number[];
  /** 16 octobre : suit le style choisi dans Reglages, Tes courbes (comme la carte Poids de l'accueil) */
  suitStyle?: boolean;
  /** 16 octobre : couleur du domaine (accueil) ou couleur de courbe choisie ; remplace `color` */
  domaine?: Domaine;
};

/** Hauteur de la ligne du grand chiffre (style 1, quand l'ecran n'affiche pas la valeur ailleurs) */
const TETE = 30;
let idSeq = 0;

export function InkLineChart({ points: pointsIn, color, height = 220, compact, digits = 0, target, projection, onScrub, label, strokeWidth, minSpan = 1, format, onPress, invert = false, tickFormat, ticksFor, suitStyle = false, domaine }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const prefs = usePrefsCourbes();
  const style: StyleCourbe = suitStyle || domaine ? prefs.style : 2;
  const stroke = domaine ? couleurTraitDomaine(domaine, prefs.couleur, theme.isDark) : color ?? c.ink;
  const k = useChartInk();

  // style 1 sans ecran qui affiche la valeur : le grand chiffre au-dessus de la courbe
  const tete = (suitStyle || !!domaine) && style === 1 && !onScrub && !compact;
  // styles 2, 3, 4 : la bulle suit le doigt, l'ecran garde sa valeur du jour (comme la carte Poids de l'accueil)
  const bulle = !compact && !tete && (!onScrub || ((suitStyle || !!domaine) && style !== 1));
  const barres = (suitStyle || !!domaine) && style === 3;
  const efface = (suitStyle || !!domaine) && style === 2;
  const chemin = (suitStyle || !!domaine) && style === 4;
  const points = useMemo(() => (barres ? pointsDesBarres(pointsIn) : pointsIn), [pointsIn, barres]);
  const H = tete ? height - TETE : height;

  // vague 45 : le langage de la courbe de poids, reperes ronds a droite dans une gouttiere
  const PAD_L = compact ? 6 : 8;
  const PAD_R = compact ? 10 : 42;
  const PAD_T = compact ? 9 : CHART.padTop;
  const PAD_B = compact ? 9 : CHART.padBottom;

  const geoRef = useRef<{ xs: number[] } | null>(null);
  const { viewRef, width, onLayout, panHandlers, active, pressed } = useChartScrub({
    indexAt: (x) => (geoRef.current ? nearestIndex(geoRef.current.xs, x) : null),
    onChange: (i) => onScrub?.(i === null || (bulle && !!onScrub) ? null : points[i] ?? null, i),
    holdMs: onScrub || tete ? 0 : 1400,
    onTap: onPress,
  });

  const geo = useMemo(() => {
    if (width === 0 || points.length === 0) return null;
    const vals = points.map((p) => p.value);
    const lo = Math.min(...vals);
    const hi = Math.max(...vals);
    if (target) vals.push(target.value);
    if (projection) vals.push(projection.value);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (max - min < minSpan) {
      const mid = (max + min) / 2;
      min = mid - minSpan / 2;
      max = mid + minSpan / 2;
    }
    const padV = (max - min) * 0.12;
    min -= padV;
    max += padV;
    const first = points[0].date;
    const lastDate = projection ? projection.date : points[points.length - 1].date;
    const span = Math.max(daysDiff(first, lastDate), 1);
    const plotW = width - PAD_L - PAD_R;
    const plotH = H - PAD_T - PAD_B;
    // barres : une demi-barre de marge de chaque cote, pour que la premiere et la derniere tiennent en entier
    const n = points.length;
    const slot0 = n > 1 ? plotW / (n - 1) : plotW;
    let bw = barres ? Math.max(1.5, Math.min(CHART.barMax, slot0 * (n > 40 ? 0.62 : 0.7))) : 0;
    // deux valeurs proches dans le temps : les barres s'affinent pour ne jamais se chevaucher
    if (barres && n > 1) {
      let gapMin = Infinity;
      for (let i = 1; i < n; i++) {
        const g = (daysDiff(points[i - 1].date, points[i].date) / span) * (plotW - bw);
        if (g > 0) gapMin = Math.min(gapMin, g);
      }
      bw = Math.max(1.5, Math.min(bw, gapMin - 2));
    }
    const x0 = PAD_L + bw / 2;
    const w0 = plotW - bw;
    const x = (date: string) => x0 + (points.length === 1 && !projection ? w0 / 2 : (daysDiff(first, date) / span) * w0);
    const y = (v: number) => PAD_T + ((invert ? v - min : max - v) / (max - min)) * plotH;
    const xs = points.map((p) => x(p.date));
    // trace lisse et juste : moyenne des voisines seulement quand les mesures se serrent a l'ecran
    const drawPts = displayPoints(points.map((p, i) => ({ x: xs[i], y: y(p.value) })), compact ? 10 : 8);
    const line = brushPath(drawPts);
    const base = H - (compact ? 0 : PAD_B);
    const area = points.length > 1 ? areaOf(line, drawPts, base) : '';
    const proposes = ticksFor ? ticksFor(min, max) : reperesCourts(min, max);
    // 16 octobre : les reperes encadrent toute la courbe (avant : 80 et 90 alors qu'elle montait a 95)
    const ticks = ticksFor ? proposes : reperesCouvrants(min, max, lo, hi, proposes);
    const bars = barres
      ? points.map((p) => {
          const xc = x(p.date);
          const top = y(p.value);
          return { x: xc, d: barPath(xc - bw / 2, base, bw, Math.max(2, base - top), Math.min(bw / 2, CHART.barRadius)) };
        })
      : [];
    const labels: { x: number; text: string }[] = [];
    const realSpan = Math.max(daysDiff(first, points[points.length - 1].date), 1);
    if (realSpan <= 10) {
      // une semaine : la lettre du jour sous chaque point
      const LETTERS = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
      points.forEach((p, i) => {
        const d = new Date(`${p.date.slice(0, 10)}T12:00:00`);
        if (labels.length === 0 || xs[i] - labels[labels.length - 1].x > 22) labels.push({ x: xs[i], text: LETTERS[d.getDay()] });
      });
    } else if (realSpan <= 45) {
      // un mois : le numero du jour, une semaine sur deux environ
      points.forEach((p, i) => {
        if (labels.length === 0 || xs[i] - labels[labels.length - 1].x > 58) labels.push({ x: xs[i], text: dayShort(p.date) });
      });
    } else {
      let lastMonth = '';
      points.forEach((p, i) => {
        const m = p.date.slice(0, 7);
        if (m !== lastMonth) {
          lastMonth = m;
          if (labels.length === 0 || xs[i] - labels[labels.length - 1].x > 56) labels.push({ x: xs[i], text: monthShort(p.date) });
        }
      });
    }
    const avoid = points.map((p, i) => ({ x: xs[i], y: y(p.value) }));
    // Tampons de record : les plus recents d'abord, jamais deux tampons qui se touchent, 4 au plus.
    // 16 octobre : chacun se pose la ou il ne touche ni la courbe, ni le point final, ni un autre tampon.
    const SEAL = 24;
    const lastIdx = points.length - 1;
    const obstacles = [{ x: xs[lastIdx], y: y(points[lastIdx].value), r: 12 }];
    const courbe = barres ? [] : drawPts;
    const seals: { i: number; x: number; y: number }[] = [];
    for (let i = points.length - 1; i >= 0 && seals.length < 4; i--) {
      if (!points[i].record) continue;
      const sx0 = Math.min(Math.max(xs[i], PAD_L + 12), width - PAD_R - 12);
      if (seals.some((q) => Math.abs(q.x - sx0) < 34)) continue;
      const py = y(points[i].value);
      const pos = placeTampon(xs[i], py, SEAL, { left: PAD_L + 2, right: width - PAD_R - 2, top: Math.max(2, PAD_T - 14), bottom: base - 2 }, [...obstacles, ...seals.map((q) => ({ x: q.x, y: q.y, r: SEAL * 0.75 }))], courbe);
      seals.push({ i, x: pos.x, y: pos.y });
    }
    seals.forEach((q) => avoid.push({ x: q.x, y: q.y }));
    return { x, y, xs, line, area, ticks, labels, plotW, avoid, seals, bars, base };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [width, points, H, target, projection, compact, minSpan, invert, barres]);
  geoRef.current = geo;

  const or = useRecordGold();
  const sw = strokeWidth ?? (compact ? CHART.strokeCompact : CHART.stroke);
  const lastI = points.length - 1;
  const act = active !== null && active < points.length ? active : null;
  const fmt = format ?? ((v: number) => num(v, digits));
  const quand = (p: ChartPoint) => (p.week ? traduire("semaine du {0}, moyenne", dayShort(p.date)) : dayShort(p.date));
  const ids = useRef(`yilc${++idSeq}`).current;
  const fondTrait = theme.isDark ? '#3A3F4E' : '#DAD7E6';
  const shown = act ?? lastI;
  // style 4 : le chemin de ta derniere valeur jusqu'a l'objectif (seulement s'il y en a un et sans projection)
  const cheminCible = chemin && target && !projection && geo && lastI >= 0 ? { x1: geo.xs[lastI], y1: geo.y(points[lastI].value), x2: width - PAD_R, y2: geo.y(target.value) } : null;

  return (
    <View
      ref={viewRef}
      onLayout={onLayout}
      style={{ height, opacity: pressed ? 0.6 : 1 }}
      {...panHandlers}
      accessible={!!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? traduire("{0}, touche pour voir le détail", label) : label}
      onAccessibilityTap={onPress}
    >
      {tete ? (
        <View style={{ height: TETE, flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingHorizontal: PAD_L + 2 }} pointerEvents="none">
          {lastI >= 0 ? (
            <>
              <Ink size={20} weight="black" tight numberOfLines={1} style={{ fontVariant: ['tabular-nums'] }}>
                {fmt(points[shown].value)}
              </Ink>
              <Ink size={12.5} weight="bold" color={c.textSecondary} numberOfLines={1} style={{ flexShrink: 1 }}>
                {act === null ? traduire("{0}, la plus récente", quand(points[shown])) : quand(points[shown])}
              </Ink>
              {act !== null && points[shown].record ? <BadgeRecord size={12.5} /> : null}
            </>
          ) : null}
        </View>
      ) : null}
      {geo ? (
        <Svg width={width} height={H}>
          {!compact ? <ChartGrid ticks={geo.ticks} y={geo.y} x1={0} x2={width - PAD_R + 6} right={width} format={tickFormat ?? ((t) => num(t, digits))} /> : null}
          {target ? <RefLine y={geo.y(target.value)} x1={PAD_L} x2={width - PAD_R} label={traduire(target.label)} color={c.successText} avoid={geo.avoid} top={PAD_T - 14} bottom={H - PAD_B} /> : null}
          {efface ? (
            <Defs>
              <ClipPath id={`${ids}c`}>
                <Rect x={-4} y={-30} width={act !== null ? geo.xs[act] + 4 : width + 8} height={H + 60} />
              </ClipPath>
            </Defs>
          ) : null}
          <Reveal width={width} height={H} replayKey={`${points.length}|${points[0]?.date}|${width}|${style}`}>
            {barres ? (
              geo.bars.map((b, i) => <Path key={`b${i}`} d={b.d} fill={i === shown ? stroke : mix(stroke, k.card, act !== null ? 0.74 : theme.isDark ? 0.45 : 0.55)} />)
            ) : points.length > 1 ? (
              <G>
                {efface ? <Path d={geo.line} fill="none" stroke={fondTrait} strokeWidth={sw + 0.5} strokeLinecap="round" strokeLinejoin="round" /> : null}
                <G clipPath={efface ? `url(#${ids}c)` : undefined}>
                  <SeriesLine line={geo.line} area={geo.area} color={stroke} width={sw} wash={compact ? CHART.washCompact : CHART.wash} />
                </G>
              </G>
            ) : null}
            {projection && points.length > 0 ? (
              <G>
                <Path
                  d={`M${geo.xs[lastI].toFixed(1)} ${geo.y(points[lastI].value).toFixed(1)} L${geo.x(projection.date).toFixed(1)} ${geo.y(projection.value).toFixed(1)}`}
                  stroke={stroke}
                  strokeOpacity={0.55}
                  strokeWidth={2.4}
                  strokeDasharray="0.1 6"
                  strokeLinecap="round"
                />
                <Circle cx={geo.x(projection.date)} cy={geo.y(projection.value)} r={4} fill={k.card} stroke={stroke} strokeOpacity={0.7} strokeWidth={1.8} />
                {projection.label ? (
                  <SvgText x={Math.min(geo.x(projection.date), width - 4)} y={geo.y(projection.value) - 12} textAnchor="end" fontSize={CHART.labelSize} fontFamily={CHART.labelFamily} fill={c.ink}>
                    {traduire(projection.label)}
                  </SvgText>
                ) : null}
              </G>
            ) : null}
            {cheminCible ? <Path d={`M${cheminCible.x1.toFixed(1)} ${cheminCible.y1.toFixed(1)} L${cheminCible.x2.toFixed(1)} ${cheminCible.y2.toFixed(1)}`} stroke={stroke} strokeOpacity={0.6} strokeWidth={2.4} strokeDasharray="0.1 6" strokeLinecap="round" /> : null}
            {/* le point final d'abord : un record juste avant lui reste visible par-dessus son halo */}
            {act === null && !barres ? <EndDot cx={geo.xs[lastI]} cy={geo.y(points[lastI].value)} color={stroke} compact={compact} /> : null}
            {/* peu de mesures : chaque mesure en petit anneau ; les records en or, comme leur trophee (16 octobre) */}
            {!compact && !barres
              ? points.map((p, i) =>
                  p.record ? (
                    <Circle key={p.date + i} cx={geo.xs[i]} cy={geo.y(p.value)} r={3.6} fill={or.fond} stroke={k.card} strokeWidth={1.5} />
                  ) : points.length <= 16 && i !== lastI ? (
                    <Circle key={p.date + i} cx={geo.xs[i]} cy={geo.y(p.value)} r={2.8} fill={k.card} stroke={efface && act !== null && i > act ? fondTrait : stroke} strokeWidth={1.6} />
                  ) : null,
                )
              : null}
          </Reveal>
          {!compact ? geo.seals.map((q) => <SealMark key={`seal${q.i}`} x={q.x} y={q.y} size={24} />) : null}
          {act !== null ? <ChartCursor x={geo.xs[act]} top={compact ? 0 : PAD_T - 10} bottom={H - (compact ? 0 : PAD_B)} cy={barres ? null : geo.y(points[act].value)} compact={compact} color={stroke} /> : null}
          {!compact ? geo.labels.map((l) => <AxisLabel key={`${l.text}${l.x}`} x={Math.min(Math.max(l.x, PAD_L + 14), width - PAD_R - 8)} y={H - 6} text={traduire(l.text)} />) : null}
        </Svg>
      ) : null}
      {geo && act !== null && bulle ? <ChartTooltip x={geo.xs[act]} width={width} value={fmt(points[act].value)} caption={quand(points[act])} record={!!points[act].record} /> : null}
    </View>
  );
}
