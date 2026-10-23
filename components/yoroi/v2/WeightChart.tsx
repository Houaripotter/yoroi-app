/**
 * Courbe du poids v2 : tendance au pinceau, pesees en points, zone objectif,
 * tampon sur le plus bas atteint, et curseur au doigt.
 * S'appuie sur le noyau commun des graphiques (charts/core).
 */
import React, { useMemo } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { useYoroiTheme } from '../YoroiThemeProvider';
import { daysBetween, formatKg, lowestPoint, shortMonth } from '@/lib/v2/weightStats';
import type { DayWeight } from '@/lib/v2/weightStats';
import { AxisLabel, brushPath, CHART, ChartCursor, ChartGrid, ChartTooltip, EndDot, nearestIndex, SealMark, useChartScrub } from './charts/core';

type Props = {
  points: DayWeight[];
  goal?: number | null;
  height?: number;
  onScrub?: (p: DayWeight | null) => void;
};

const PAD_L = CHART.padLeft;
const PAD_R = CHART.padRight;
const PAD_T = CHART.padTop;
const PAD_B = CHART.padBottom;

export function WeightChart({ points, goal, height = 300, onScrub }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;

  const geoRef = React.useRef<{ xs: number[] } | null>(null);
  const { viewRef, width, onLayout, panHandlers, active } = useChartScrub({
    indexAt: (x) => (geoRef.current ? nearestIndex(geoRef.current.xs, x) : null),
    onChange: (i) => onScrub?.(i === null ? null : points[i] ?? null),
    holdMs: onScrub ? 0 : 1400,
  });

  const geo = useMemo(() => {
    if (width === 0 || points.length === 0) return null;
    const vals = points.flatMap((p) => [p.value, p.trend]);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (goal && goal > 0 && goal >= min - 3 && goal <= max + 3) {
      min = Math.min(min, goal - 0.5);
      max = Math.max(max, goal + 0.5);
    }
    if (max - min < 2) {
      const mid = (max + min) / 2;
      min = mid - 1;
      max = mid + 1;
    }
    min = Math.floor(min - 0.3);
    max = Math.ceil(max + 0.3);
    const first = points[0].date;
    const span = Math.max(daysBetween(first, points[points.length - 1].date), 1);
    const plotW = width - PAD_L - PAD_R;
    const plotH = height - PAD_T - PAD_B;
    const x = (date: string) => PAD_L + (points.length === 1 ? plotW / 2 : (daysBetween(first, date) / span) * plotW);
    const y = (v: number) => PAD_T + ((max - v) / (max - min)) * plotH;
    const xs = points.map((p) => x(p.date));
    const trend = brushPath(points.map((p, i) => ({ x: xs[i], y: y(p.trend) })));
    const area = `${trend} L${xs[xs.length - 1].toFixed(1)} ${height - PAD_B} L${xs[0].toFixed(1)} ${height - PAD_B} Z`;
    const step = (max - min) / 3;
    const ticks = [0, 1, 2, 3].map((i) => Math.round((min + step * i) * 10) / 10);
    // Etiquettes de mois, sans chevauchement
    const labels: { x: number; text: string }[] = [];
    let lastMonth = '';
    points.forEach((p, i) => {
      const m = p.date.slice(0, 7);
      if (m !== lastMonth) {
        lastMonth = m;
        const lx = xs[i];
        if (labels.length === 0 || lx - labels[labels.length - 1].x > 54) labels.push({ x: lx, text: shortMonth(p.date) });
      }
    });
    if (span <= 10) {
      labels.length = 0;
      points.forEach((p, i) => {
        if (labels.length === 0 || xs[i] - labels[labels.length - 1].x > 26) labels.push({ x: xs[i], text: String(Number(p.date.slice(8, 10))) });
      });
    }
    return { x, y, xs, trend, area, ticks, labels, plotW };
  }, [width, points, goal, height]);
  geoRef.current = geo;

  const low = useMemo(() => lowestPoint(points), [points]);
  const dotR = points.length > 120 ? 1.6 : points.length > 45 ? 2.2 : 3;
  const act = active !== null && active < points.length ? active : null;

  return (
    <View ref={viewRef} onLayout={onLayout} style={{ height }} {...panHandlers} accessibilityLabel="Courbe du poids, glisse le doigt pour revoir chaque pesée">
      {geo ? (
        <Svg width={width} height={height}>
          <Defs>
            <LinearGradient id="weightWash" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={c.indigo} stopOpacity={CHART.wash} />
              <Stop offset="1" stopColor={c.indigo} stopOpacity={0} />
            </LinearGradient>
          </Defs>
          {goal && goal > 0 ? (
            <G>
              <Rect x={PAD_L} y={geo.y(goal + 0.5)} width={width - PAD_L} height={Math.max(geo.y(goal - 0.5) - geo.y(goal + 0.5), 4)} fill={c.success} opacity={0.1} />
              <SvgText x={width - PAD_R} y={geo.y(goal + 0.5) - 5} textAnchor="end" fontSize={CHART.labelSize} fontFamily={CHART.labelFamily} fill={c.ink}>
                {`objectif ${formatKg(goal)} kg`}
              </SvgText>
            </G>
          ) : null}
          <ChartGrid ticks={geo.ticks} y={geo.y} x1={PAD_L} x2={width} format={(t) => formatKg(t, t % 1 === 0 ? 0 : 1)} />
          <Path d={geo.area} fill="url(#weightWash)" />
          {points.map((p, i) => (
            <Circle key={p.date} cx={geo.xs[i]} cy={geo.y(p.value)} r={dotR} fill={c.ink} opacity={0.32} />
          ))}
          <Path d={geo.trend} stroke={c.ink} strokeWidth={CHART.stroke + CHART.haloExtra} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={CHART.haloOpacity} />
          <Path d={geo.trend} stroke={c.ink} strokeWidth={CHART.stroke + 1} fill="none" strokeLinecap="round" strokeLinejoin="round" opacity={0.92} />
          {low && points.length > 2 ? <SealMark x={geo.x(low.date)} y={Math.min(Math.max(geo.y(low.value) + 22, PAD_T + 14), height - PAD_B - 12)} /> : null}
          {act !== null ? (
            <ChartCursor x={geo.xs[act]} top={PAD_T - 8} bottom={height - PAD_B} cy={geo.y(points[act].value)} />
          ) : (
            <EndDot cx={geo.xs[geo.xs.length - 1]} cy={geo.y(points[points.length - 1].trend)} color={c.ink} />
          )}
          {geo.labels.map((l) => (
            <AxisLabel key={`${l.text}${l.x}`} x={Math.min(Math.max(l.x, PAD_L + 12), width - 20)} y={height - 6} text={l.text} />
          ))}
        </Svg>
      ) : null}
      {geo && act !== null && !onScrub ? <ChartTooltip x={geo.xs[act]} width={width} value={`${formatKg(points[act].value)} kg`} caption={`${Number(points[act].date.slice(8, 10))} ${shortMonth(points[act].date)}`} /> : null}
    </View>
  );
}
