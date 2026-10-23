/**
 * Graphiques au pinceau de l'espace Combat : colonnes, courbe 0 a 100,
 * colonnes empilees (deux series, une seule echelle) et radar de style.
 * Palette validee : #3D5D9E, #A8832F, mousse #6E8C3A.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Line, Path, Polygon, Text as SvgText } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/v2/accueil/kit';
import { fontFamilies } from '@/components/yoroi/fonts';
import { areaOf, barPath, brushPath, CHART, CHART_COLORS, EndDot, Reveal, SeriesLine, tint } from '@/components/yoroi/v2/charts/core';
import { traduire } from '@/lib/i18n/tr';

function useWidth(initial = 300): [number, (e: LayoutChangeEvent) => void] {
  const [w, setW] = useState(initial);
  return [w, (e) => setW(Math.max(120, Math.round(e.nativeEvent.layout.width)))];
}

export type Column = { label: string; value: number; color?: string; caption?: string };

/** Colonnes au pinceau, une seule echelle (0 a max) */
export function BrushColumns({ data, height = 150, max, color = P.water, highlightLast = true, format }: { data: Column[]; height?: number; max?: number; color?: string; highlightLast?: boolean; format?: (v: number) => string }) {
  const [w, onLayout] = useWidth();
  const top = 20;
  const bottom = 22;
  const inner = height - top - bottom;
  const m = Math.max(1, max ?? Math.max(...data.map((d) => d.value), 1));
  const slot = w / Math.max(1, data.length);
  const stroke = Math.max(8, Math.min(18, slot * 0.46));
  return (
    <View onLayout={onLayout} accessibilityRole="image" accessibilityLabel={data.map((d) => `${d.label} ${format ? format(d.value) : d.value}`).join(', ')}>
      <Svg width={w} height={height}>
        <Line x1={0} x2={w} y1={top + inner} y2={top + inner} stroke={P.line} strokeWidth={1} />
        {data.map((d, i) => {
          const x = slot * i + slot / 2;
          const hgt = d.value > 0 ? Math.max(stroke * 0.2, (d.value / m) * inner) : 0;
          const last = highlightLast && i === data.length - 1;
          // la colonne en cours en couleur pleine, les autres en teinte claire de la meme couleur
          const c = d.color ?? (last ? P.accent : highlightLast ? tint(color, 0.5) : color);
          return (
            <React.Fragment key={`${d.label}_${i}`}>
              <Line x1={x} x2={x} y1={top + inner} y2={top + inner} stroke={P.line2} strokeWidth={stroke} strokeLinecap="round" />
              {hgt > 0 ? <Line x1={x} x2={x} y1={top + inner - stroke / 2 + 0.5} y2={top + inner - hgt + stroke / 2} stroke={c} strokeWidth={stroke} strokeLinecap="round" /> : null}
              {d.value > 0 ? (
                <SvgText x={x} y={Math.max(12, top + inner - hgt - 6)} fontSize={11} fontFamily={fontFamilies.extraBold} fill={last ? P.accent : P.ink2} textAnchor="middle">
                  {format ? format(d.value) : String(d.value)}
                </SvgText>
              ) : null}
              <SvgText x={x} y={height - 6} fontSize={11} fontFamily={fontFamilies.bold} fill={last ? P.ink : P.muted} textAnchor="middle">
                {traduire(d.label)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

/** Courbe au pinceau sur une echelle de 0 a 100 (valeurs manquantes sautees) */
export function BrushTrend({ points, height = 160, color = CHART_COLORS.blue, guide = 50, unit = '%' }: { points: { label: string; value: number | null }[]; height?: number; color?: string; guide?: number | null; unit?: string }) {
  const [w, onLayout] = useWidth();
  const left = 30;
  const right = 10;
  const top = 14;
  const bottom = 24;
  const iw = w - left - right;
  const ih = height - top - bottom;
  const n = points.length;
  const x = (i: number) => left + (n <= 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v: number) => top + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;
  const pts = points.map((p, i) => (p.value == null ? null : { x: x(i), y: y(p.value), v: p.value })).filter((p): p is { x: number; y: number; v: number } => !!p);
  // lissage monotone : la courbe passe par chaque mesure sans escalier ni bosse inventee
  const d = pts.length > 1 ? brushPath(pts) : '';
  const area = areaOf(d, pts, top + ih);
  const last = pts[pts.length - 1];
  return (
    <View onLayout={onLayout} accessibilityRole="image" accessibilityLabel={points.filter((p) => p.value != null).map((p) => `${p.label} ${p.value}${unit}`).join(', ')}>
      <Svg width={w} height={height}>
        {[0, 50, 100].map((g) => (
          <React.Fragment key={g}>
            <Line x1={left} x2={w - right} y1={y(g)} y2={y(g)} stroke={g === guide ? P.line : CHART.grid} strokeWidth={1} />
            <SvgText x={left - 6} y={y(g) + 4} fontSize={10} fontFamily={CHART.axisFamily} fill={CHART.axisInk} textAnchor="end">
              {`${g}`}
            </SvgText>
          </React.Fragment>
        ))}
        <Reveal width={w} height={height} replayKey={pts.length}>
          {d ? <SeriesLine line={d} area={area} color={color} /> : null}
          {pts.map((p, i) => (p === last ? null : <Circle key={i} cx={p.x} cy={p.y} r={2.8} fill={P.white} stroke={color} strokeWidth={1.6} />))}
          {last ? <EndDot cx={last.x} cy={last.y} color={color} /> : null}
        </Reveal>
        {points.map((p, i) => (
          <SvgText key={`l${i}`} x={x(i)} y={height - 6} fontSize={10} fontFamily={fontFamilies.bold} fill={P.muted} textAnchor="middle">
            {traduire(p.label)}
          </SvgText>
        ))}
      </Svg>
    </View>
  );
}

/** Colonnes empilees a deux series sur la meme echelle (nombre de seances) */
export function StackColumns({ data, height = 140, colors = ['#3D5D9E', '#A8832F'] }: { data: { label: string; a: number; b: number }[]; height?: number; colors?: [string, string] }) {
  const [w, onLayout] = useWidth();
  const top = 16;
  const bottom = 22;
  const ih = height - top - bottom;
  const m = Math.max(1, ...data.map((d) => d.a + d.b));
  const slot = w / Math.max(1, data.length);
  const bw = Math.max(8, Math.min(CHART.barMax, slot * 0.5));
  return (
    <View onLayout={onLayout}>
      <Svg width={w} height={height}>
        <Line x1={0} x2={w} y1={top + ih} y2={top + ih} stroke={P.line} strokeWidth={1} />
        {data.map((d, i) => {
          const cx = slot * i + slot / 2;
          const ha = (d.a / m) * ih;
          const hb = (d.b / m) * ih;
          const r = bw / 2;
          const base = top + ih;
          return (
            <React.Fragment key={`${d.label}_${i}`}>
              {hb > 0 ? <Path d={roundedTopRect(cx - bw / 2, base - hb, bw, hb, ha > 0 ? 0 : Math.min(6, r))} fill={colors[1]} /> : null}
              {/* filet de 2 points couleur papier entre les deux series empilees */}
              {ha > 2 ? <Path d={roundedTopRect(cx - bw / 2, base - hb - ha, bw, hb > 0 ? ha - 2 : ha, Math.min(6, r))} fill={colors[0]} /> : null}
              {d.a + d.b > 0 ? (
                <SvgText x={cx} y={Math.max(11, base - ha - hb - 5)} fontSize={11} fontFamily={fontFamilies.extraBold} fill={P.ink2} textAnchor="middle">
                  {String(d.a + d.b)}
                </SvgText>
              ) : null}
              <SvgText x={cx} y={height - 6} fontSize={11} fontFamily={fontFamilies.bold} fill={P.muted} textAnchor="middle">
                {traduire(d.label)}
              </SvgText>
            </React.Fragment>
          );
        })}
      </Svg>
    </View>
  );
}

function roundedTopRect(x: number, y: number, w: number, h: number, r: number): string {
  const rr = Math.min(r, h, w / 2);
  return `M${x} ${y + h} V${y + rr} Q${x} ${y} ${x + rr} ${y} H${x + w - rr} Q${x + w} ${y} ${x + w} ${y + rr} V${y + h} Z`;
}

/** Radar de style (axes de 0 a 5) */
export function StyleRadar({ axes, values, color = P.accent, size = 240 }: { axes: string[]; values: number[]; color?: string; size?: number }) {
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 34;
  const n = axes.length;
  const pt = (i: number, v: number) => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    const r = R * (v / 5);
    return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
  };
  const poly = values.map((v, i) => pt(i, v)).map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  return (
    <Svg width={size} height={size}>
      {[1, 2, 3, 4, 5].map((l) => (
        <Polygon key={l} points={axes.map((_, i) => pt(i, l)).map((p) => `${p.x},${p.y}`).join(' ')} stroke={l === 5 ? P.line : P.line2} strokeWidth={l === 5 ? 1.5 : 1} fill={l === 5 ? 'rgba(255,255,255,0.6)' : 'none'} />
      ))}
      {axes.map((_, i) => {
        const e = pt(i, 5);
        return <Line key={i} x1={cx} y1={cy} x2={e.x} y2={e.y} stroke={P.line2} strokeWidth={1} />;
      })}
      <Polygon points={poly} fill={`${color}24`} stroke={color} strokeWidth={CHART.stroke} strokeLinejoin="round" />
      {values.map((v, i) => {
        const p = pt(i, v);
        return <Circle key={i} cx={p.x} cy={p.y} r={4} fill={color} stroke={P.white} strokeWidth={2} />;
      })}
      {axes.map((a, i) => {
        const p = pt(i, 6.3);
        return (
          <SvgText key={a} x={p.x} y={p.y + 4} fontSize={12} fontFamily={fontFamilies.extraBold} fill={P.ink} textAnchor="middle">
            {a}
          </SvgText>
        );
      })}
    </Svg>
  );
}

/** Legende simple */
export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: it.color }} />
          <Ink size={12} weight="bold" color={P.ink2}>
            {traduire(it.label)}
          </Ink>
        </View>
      ))}
    </View>
  );
}
