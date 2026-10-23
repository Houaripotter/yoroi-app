/**
 * Graphiques de l'espace Sante qui manquaient aux briques v2 :
 * barres empilees des phases de sommeil et double courbe de tension (une seule echelle, legende).
 * Doigt qui glisse pour lire chaque jour, retour haptique.
 */
import React, { useMemo, useRef, useState } from 'react';
import { PanResponder, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { Ink } from '@/components/yoroi/v2/Ink';
import { fontFamilies } from '@/components/yoroi/fonts';
import type { DayPoint } from '@/lib/v2/sante/stats';
import { barPath, brushPath, CHART, Reveal } from '@/components/yoroi/v2/charts/core';
import { traduire } from '@/lib/i18n/tr';

export const SLEEP_COLORS = { deep: '#1F3566', core: '#4F6AA3', rem: '#93A6CF', awake: '#E3C47B' };
/** Tension : chiffre haut en prune (famille coeur), chiffre bas en bleu clair ; paire validee (daltonisme et vision normale) */
export const TENSION_COLORS: [string, string] = ['#7B3B63', '#5577B8'];
export const SLEEP_LABELS = { deep: 'Profond', core: traduire('Léger'), rem: 'Paradoxal', awake: traduire('Éveillé') };

export function Legend({ items }: { items: { color: string; label: string; kind?: 'square' | 'line' }[] }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, paddingHorizontal: 2 }}>
      {items.map((it) => (
        <View key={it.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {it.kind === 'line' ? (
            <View style={{ width: 18, height: 3, borderRadius: 1.5, backgroundColor: it.color }} />
          ) : (
            <View style={{ width: 11, height: 11, borderRadius: 3, backgroundColor: it.color }} />
          )}
          <Ink size={12} weight="bold" color="#4A4E5A">
            {traduire(it.label)}
          </Ink>
        </View>
      ))}
    </View>
  );
}

function useScrub(count: number, onSelect?: (i: number | null) => void) {
  const [width, setWidth] = useState(0);
  const [active, setActive] = useState<number | null>(null);
  const viewRef = useRef<View>(null);
  const originX = useRef(0);
  const last = useRef<number | null>(null);
  const pick = (lx: number) => {
    if (!width || count === 0) return;
    const i = Math.max(0, Math.min(count - 1, Math.floor((lx / width) * count)));
    if (i !== last.current) {
      last.current = i;
      selectionAsync().catch(() => {});
      setActive(i);
      onSelect?.(i);
    }
  };
  const end = () => {
    last.current = null;
    setActive(null);
    onSelect?.(null);
  };
  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 4 && Math.abs(g.dx) > Math.abs(g.dy),
        onPanResponderTerminationRequest: () => true,
        onPanResponderGrant: (e) => pick(e.nativeEvent.pageX - originX.current),
        onPanResponderMove: (e) => pick(e.nativeEvent.pageX - originX.current),
        onPanResponderRelease: end,
        onPanResponderTerminate: end,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, count],
  );
  const onLayout = (e: LayoutChangeEvent) => {
    setWidth(Math.round(e.nativeEvent.layout.width));
    viewRef.current?.measureInWindow((x) => {
      originX.current = x;
    });
  };
  return { width, active, viewRef, responder, onLayout };
}

/** Nuits empilees par phase ; une nuit sans phases reste une barre pleine indigo */
export function SleepBars({ points, labels, height = 210, onSelect, label }: { points: DayPoint[]; labels: string[]; height?: number; onSelect?: (i: number | null) => void; label: string }) {
  const s = useScrub(points.length, onSelect);
  const PAD_T = 18;
  const PAD_B = 24;
  const PAD_L = 30;
  const plotW = Math.max(0, s.width - PAD_L);
  const max = Math.max(...points.map((p) => p.value), 60);
  const topH = Math.ceil(max / 120) * 120;
  const plotH = height - PAD_T - PAD_B;
  const y = (min: number) => PAD_T + plotH - (min / topH) * plotH;
  const slot = points.length ? plotW / points.length : 0;
  const bw = Math.min(CHART.barMax, slot * 0.54);
  const ticks: number[] = [];
  for (let t = 0; t <= topH; t += topH > 600 ? 240 : 120) ticks.push(t);
  return (
    <View ref={s.viewRef} onLayout={s.onLayout} style={{ height }} {...s.responder.panHandlers} accessibilityLabel={label}>
      {s.width ? (
        <Svg width={s.width} height={height}>
          {ticks.map((t) => (
            <G key={t}>
              <Line x1={PAD_L} x2={s.width} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
              <SvgText x={0} y={y(t) + 4} fontSize={11} fontFamily={CHART.axisFamily} fill={CHART.axisInk}>
                {`${Math.round(t / 60)} h`}
              </SvgText>
            </G>
          ))}
          <Reveal width={s.width} height={height} dir="up" replayKey={points.length}>
          {points.map((p, i) => {
            const x = PAD_L + slot * i + (slot - bw) / 2;
            const dim = s.active !== null && s.active !== i ? 0.4 : 1;
            const segs: { v: number; c: string }[] = p.phases
              ? [
                  { v: p.phases.deep, c: SLEEP_COLORS.deep },
                  { v: p.phases.core, c: SLEEP_COLORS.core },
                  { v: p.phases.rem, c: SLEEP_COLORS.rem },
                  { v: p.phases.awake, c: SLEEP_COLORS.awake },
                ]
              : [{ v: p.value, c: '#2C4A84' }];
            let acc = 0;
            const shown = segs.filter((sg) => sg.v > 0);
            return (
              <G key={p.date + i} opacity={dim}>
                {shown.map((sg, k) => {
                  const y1 = y(acc + sg.v);
                  const y0 = y(acc);
                  acc += sg.v;
                  // un filet de 2 points couleur papier separe les phases ; seul le haut de la pile est arrondi
                  const gap = k > 0 ? 2 : 0;
                  const hh = Math.max(1, y0 - y1 - gap);
                  return k === shown.length - 1 ? (
                    <Path key={k} d={barPath(x, y0 - gap, bw, hh, Math.min(6, bw / 2))} fill={sg.c} />
                  ) : (
                    <Rect key={k} x={x} y={y0 - gap - hh} width={bw} height={hh} fill={sg.c} />
                  );
                })}
                {labels[i] ? (
                  <SvgText x={x + bw / 2} y={height - 5} textAnchor="middle" fontSize={11} fontFamily={s.active === i ? fontFamilies.bold : CHART.axisFamily} fill={s.active === i ? '#1D2029' : CHART.axisInk}>
                    {labels[i]}
                  </SvgText>
                ) : null}
              </G>
            );
          })}
          </Reveal>
          <Line x1={PAD_L} x2={s.width} y1={y(0) + 0.5} y2={y(0) + 0.5} stroke={CHART.baseline} strokeWidth={1} />
        </Svg>
      ) : null}
    </View>
  );
}

/** Tension : chiffre haut et chiffre bas sur la meme echelle en mmHg */
export function DualLine({ points, height = 220, onSelect, label, colors = TENSION_COLORS }: { points: DayPoint[]; height?: number; onSelect?: (i: number | null) => void; label: string; colors?: [string, string] }) {
  const s = useScrub(points.length, onSelect);
  const PAD_T = 16;
  const PAD_B = 16;
  const PAD_L = 32;
  const PAD_R = 12;
  const vals = points.flatMap((p) => [p.value, p.v2 ?? p.value]);
  const min = Math.floor((Math.min(...vals, 60) - 5) / 10) * 10;
  const max = Math.ceil((Math.max(...vals, 130) + 5) / 10) * 10;
  const plotW = Math.max(0, s.width - PAD_L - PAD_R);
  const plotH = height - PAD_T - PAD_B;
  const x = (i: number) => PAD_L + (points.length <= 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const y = (v: number) => PAD_T + ((max - v) / (max - min || 1)) * plotH;
  const path = (get: (p: DayPoint) => number) => brushPath(points.map((p, i) => ({ x: x(i), y: y(get(p)) })));
  const ticks: number[] = [];
  const step = max - min > 80 ? 20 : 10;
  for (let t = min; t <= max; t += step) ticks.push(t);
  return (
    <View ref={s.viewRef} onLayout={s.onLayout} style={{ height }} {...s.responder.panHandlers} accessibilityLabel={label}>
      {s.width && points.length ? (
        <Svg width={s.width} height={height}>
          {ticks.map((t) => (
            <G key={t}>
              <Line x1={PAD_L} x2={s.width} y1={y(t)} y2={y(t)} stroke={CHART.grid} strokeWidth={1} />
              <SvgText x={0} y={y(t) + 4} fontSize={11} fontFamily={CHART.axisFamily} fill={CHART.axisInk}>
                {String(t)}
              </SvgText>
            </G>
          ))}
          {points.length > 1 ? (
            <>
              <Path d={path((p) => p.value)} stroke={colors[0]} strokeWidth={CHART.stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              <Path d={path((p) => p.v2 ?? p.value)} stroke={colors[1]} strokeWidth={CHART.stroke} fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </>
          ) : null}
          {points.map((p, i) => (
            <G key={p.date + i} opacity={s.active !== null && s.active !== i ? 0.35 : 1}>
              <Circle cx={x(i)} cy={y(p.value)} r={3.4} fill="#FFFFFF" stroke={colors[0]} strokeWidth={1.8} />
              {p.v2 ? <Circle cx={x(i)} cy={y(p.v2)} r={3.4} fill="#FFFFFF" stroke={colors[1]} strokeWidth={1.8} /> : null}
            </G>
          ))}
          {s.active !== null ? <Line x1={x(s.active)} x2={x(s.active)} y1={PAD_T - 8} y2={height - PAD_B} stroke="#1D2029" strokeOpacity={0.35} strokeWidth={1} /> : null}
        </Svg>
      ) : null}
    </View>
  );
}
