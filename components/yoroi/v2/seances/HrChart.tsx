/**
 * Frequence cardiaque au pinceau, avec la moyenne en pointille et le curseur au doigt.
 * S'appuie sur le noyau commun des graphiques (charts/core).
 */
import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Line, Text as SvgText } from 'react-native-svg';
import { FAMILY } from '@/lib/v2/sante/metrics';
import { areaOf, AxisLabel, brushPath, CHART, ChartCursor, ChartGrid, ChartTooltip, nearestIndex, niceTicks, RefLine, Reveal, SeriesLine, useChartScrub } from '../charts/core';

/** Frequence cardiaque : couleur de la famille coeur, la meme que dans Sante */
const HEART_COLOR = FAMILY.coeur.color;

function hhmm(ms: number): string {
  const dd = new Date(ms);
  return `${String(dd.getHours()).padStart(2, '0')}:${String(dd.getMinutes()).padStart(2, '0')}`;
}

export function HrChart({ samples, width, height = 150, avg }: { samples: { timestamp: string; bpm: number }[]; width: number; height?: number; avg?: number }) {
  const padL = 30;
  const padR = 8;
  const padB = 22;
  // vague 33 : place en haut pour l'etiquette de la moyenne, qui ne chevauche plus jamais la courbe
  const padT = 28;
  const geo = useMemo(() => {
    const pts = samples.filter((s) => s && s.bpm > 0 && !isNaN(new Date(s.timestamp).getTime()));
    if (pts.length < 2) return null;
    const step = Math.max(1, Math.floor(pts.length / 120));
    const ds = pts.filter((_, i) => i % step === 0);
    const t0 = new Date(ds[0].timestamp).getTime();
    const t1 = new Date(ds[ds.length - 1].timestamp).getTime();
    const span = Math.max(1, t1 - t0);
    const vals = ds.map((s) => s.bpm);
    const min = Math.min(...vals) - 5;
    const max = Math.max(...vals) + 5;
    const w = width - padL - padR;
    const h = height - padT - padB;
    const x = (t: number) => padL + ((t - t0) / span) * w;
    const y = (v: number) => padT + (1 - (v - min) / (max - min)) * h;
    const xs: number[] = [];
    const xyPts = ds.map((s) => {
      const px = x(new Date(s.timestamp).getTime());
      xs.push(px);
      return { x: px, y: y(s.bpm) };
    });
    // courbe lissee monotone : elle passe par chaque mesure sans inventer de pic
    const d = brushPath(xyPts);
    const area = areaOf(d, xyPts, height - padB);
    const ticks = niceTicks(min, max, 3);
    const labels = [
      { x: padL, t: hhmm(t0), a: 'start' as const },
      { x: padL + w / 2, t: hhmm(t0 + span / 2), a: 'middle' as const },
      { x: padL + w, t: hhmm(t1), a: 'end' as const },
    ];
    return { d, area, y, xs, ds, ticks, labels };
  }, [samples, width, height]);

  const geoRef = useRef(geo);
  geoRef.current = geo;
  const { viewRef, onLayout, panHandlers, active } = useChartScrub({
    indexAt: (px) => (geoRef.current ? nearestIndex(geoRef.current.xs, px) : null),
    holdMs: 1400,
  });

  if (!geo) return null;
  const act = active != null && active < geo.ds.length ? active : null;
  return (
    <View ref={viewRef} onLayout={onLayout} style={{ width, height }} {...panHandlers} accessibilityLabel="Fréquence cardiaque pendant la séance, glisse le doigt pour lire chaque instant">
      <Svg width={width} height={height}>
        <ChartGrid ticks={geo.ticks} y={geo.y} x1={padL} x2={width} format={(v) => String(Math.round(v))} />
        {avg ? <RefLine y={geo.y(avg)} x1={padL} x2={width} /> : null}
        {avg ? (
          <>
            <Line x1={width - 128} x2={width - 112} y1={9} y2={9} stroke={CHART.axisInk} strokeWidth={1.6} strokeDasharray="0.1 5" strokeLinecap="round" />
            <SvgText x={width} y={13} textAnchor="end" fontSize={CHART.labelSize} fontFamily={CHART.labelFamily} fill={CHART.axisInk}>
              {`moyenne ${Math.round(avg)} par min`}
            </SvgText>
          </>
        ) : null}
        <Reveal width={width} height={height} replayKey={geo.ds.length}>
          <SeriesLine line={geo.d} area={geo.area} color={HEART_COLOR} width={CHART.strokeCompact} wash={0.16} />
        </Reveal>
        {geo.labels.map((l, i) => (
          <AxisLabel key={i} x={l.x} y={height - 5} text={l.t} anchor={l.a} />
        ))}
        {act !== null ? <ChartCursor x={geo.xs[act]} top={padT - 6} bottom={height - padB} cy={geo.y(geo.ds[act].bpm)} compact color={HEART_COLOR} /> : null}
      </Svg>
      {act !== null ? <ChartTooltip x={geo.xs[act]} width={width} value={`${Math.round(geo.ds[act].bpm)} par minute`} caption={`à ${hhmm(new Date(geo.ds[act].timestamp).getTime())}`} /> : null}
    </View>
  );
}
