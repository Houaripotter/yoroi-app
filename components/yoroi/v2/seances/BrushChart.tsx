/**
 * Courbe au pinceau (trait epais arrondi) avec trophees de record (16 octobre) et curseur au doigt.
 * Une seule echelle, jamais deux axes.
 * S'appuie sur le noyau commun des graphiques (charts/core).
 */
import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { MONTHS_SHORT, dateOf } from '@/lib/v2/seances/sessionData';
import { areaOf, AxisLabel, barPath, brushPath, CHART, CHART_COLORS, ChartCursor, ChartGrid, ChartTooltip, displayPoints, EndDot, nearestIndex, niceTicks, Reveal, SealMark, SeriesLine, tint, useChartInk, useChartScrub } from '../charts/core';
import { traduire } from '@/lib/i18n/tr';

export type BrushPoint = { date: string; value: number; seal?: boolean; label?: string };

type Props = {
  points: BrushPoint[];
  width: number;
  height?: number;
  color?: string;
  /** formatage des valeurs de l'axe et du curseur */
  format?: (v: number) => string;
  /** plus bas vaut mieux (allure) : l'axe est inverse pour que monter reste une progression */
  invert?: boolean;
  /** barres au lieu d'une courbe */
  bars?: boolean;
};

export function BrushChart({ points, width, height = 190, color = CHART_COLORS.blue, format = (v) => String(Math.round(v)), invert, bars }: Props) {
  const k = useChartInk();
  const padL = CHART.padLeft;
  const padR = CHART.padRight;
  const padT = CHART.padTop;
  const padB = CHART.padBottom;
  const plotW = Math.max(10, width - padL - padR);
  const plotH = Math.max(10, height - padT - padB);

  const geo = useMemo(() => {
    if (points.length === 0) return null;
    const vals = points.map((p) => p.value);
    let min = Math.min(...vals);
    let max = Math.max(...vals);
    if (bars) min = 0;
    if (max - min < 1e-6) {
      max += Math.max(1, Math.abs(max) * 0.05);
      if (!bars) min -= Math.max(1, Math.abs(min) * 0.05);
    }
    const span = max - min;
    min = bars ? 0 : min - span * 0.08;
    max = max + span * 0.12;
    const yOf = (v: number) => {
      const r = (v - min) / (max - min);
      return padT + (invert ? r : 1 - r) * plotH;
    };
    const n = points.length;
    const xOf = (i: number) => (n === 1 ? padL + plotW / 2 : padL + (i / (n - 1)) * plotW);
    const xy = points.map((p, i) => ({ x: xOf(i), y: yOf(p.value), p }));
    const drawPts = displayPoints(xy, 8);
    const d = bars ? '' : brushPath(drawPts);
    const area = bars || invert ? '' : areaOf(d, drawPts, padT + plotH);
    const ticks = niceTicks(min, max, 3);
    // reperes de mois sous l'axe
    const months: { x: number; label: string }[] = [];
    let lastKey = '';
    xy.forEach((q) => {
      const d0 = dateOf(q.p.date);
      const key = `${d0.getFullYear()}-${d0.getMonth()}`;
      if (key !== lastKey) {
        lastKey = key;
        if (months.length === 0 || q.x - months[months.length - 1].x > 46) months.push({ x: q.x, label: MONTHS_SHORT[d0.getMonth()] });
      }
    });
    return { xy, xs: xy.map((q) => q.x), d, area, ticks, months, yOf };
  }, [points, plotW, plotH, invert, bars, padL, padT]);

  const geoRef = useRef(geo);
  geoRef.current = geo;
  const { viewRef, onLayout, panHandlers, active } = useChartScrub({
    indexAt: (x) => (geoRef.current ? nearestIndex(geoRef.current.xs, x) : null),
    startOnTouch: !!bars,
    holdMs: 1400,
  });

  if (!geo) return null;
  const cur = active != null && active < geo.xy.length ? geo.xy[active] : null;
  const barW = Math.max(4, Math.min(CHART.barMax, (plotW / Math.max(1, geo.xy.length)) * 0.54));
  const base = padT + plotH;
  const last = geo.xy[geo.xy.length - 1];

  return (
    <View ref={viewRef} onLayout={onLayout} style={{ width, height }} {...panHandlers}>
      <Svg width={width} height={height}>
        <ChartGrid ticks={geo.ticks} y={geo.yOf} x1={padL} x2={width - padR} format={format} />
        <Reveal width={width} height={height} dir={bars ? 'up' : 'right'} replayKey={`${points.length}|${points[0]?.date}`}>
          {bars ? (
            geo.xy.map((q, i) => {
              const h = Math.max(2, base - q.y);
              const isLast = i === geo.xy.length - 1;
              return <Path key={i} d={barPath(q.x - barW / 2, base, barW, h, Math.min(CHART.barRadius, barW / 2))} fill={active === i || (active == null && isLast) ? color : tint(color, 0.58)} opacity={active != null && active !== i ? 0.5 : 1} />;
            })
          ) : (
            <>
              <SeriesLine line={geo.d} area={geo.area} color={color} />
              {geo.xy.length <= 16 ? geo.xy.slice(0, -1).map((q, i) => <Circle key={`p${i}`} cx={q.x} cy={q.y} r={2.8} fill={k.card} stroke={color} strokeWidth={1.6} />) : null}
              {!cur && last ? <EndDot cx={last.x} cy={last.y} color={color} /> : null}
            </>
          )}
        </Reveal>
        {geo.xy.filter((q) => q.p.seal).map((q, i) => (
          <SealMark key={`s${i}`} x={q.x} y={Math.min(Math.max(q.y - (invert ? -20 : 20), 12), height - padB - 12)} />
        ))}
        {geo.months.map((m, i) => (
          <AxisLabel key={`m${i}`} x={Math.min(width - padR - 14, Math.max(padL + 14, m.x))} y={height - 6} text={traduire(m.label)} />
        ))}
        {cur ? <ChartCursor x={cur.x} top={padT - 6} bottom={base} cy={bars ? null : cur.y} color={color} /> : null}
      </Svg>
      {cur ? (
        <ChartTooltip x={cur.x} width={width} value={cur.p.label ?? format(cur.p.value)} caption={`${dateOf(cur.p.date).getDate()} ${MONTHS_SHORT[dateOf(cur.p.date).getMonth()]}`} record={!!cur.p.seal} />
      ) : null}
    </View>
  );
}
