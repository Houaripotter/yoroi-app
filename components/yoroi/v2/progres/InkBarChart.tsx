/**
 * Barres verticales (refonte v2) : une echelle, moyenne en pointilles,
 * barre courante en indigo (couleur d'action), doigt qui glisse pour lire chaque barre.
 * S'appuie sur le noyau commun des graphiques (charts/core).
 */
import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';
import { useYoroiTheme } from '../../YoroiThemeProvider';
import { AxisLabel, barPath, CHART, CHART_COLORS, RefLine, Reveal, tint, useChartInk, useChartScrub } from '../charts/core';
import { traduire } from '@/lib/i18n/tr';

export type Bar = { label: string; value: number };

type Props = {
  bars: Bar[];
  height?: number;
  color?: string;
  highlight?: number | null;
  average?: number | null;
  format: (v: number) => string;
  /** etiquettes affichees au-dessus des barres sans doigt */
  showValues?: 'all' | 'highlight' | 'none';
  onSelect?: (i: number | null) => void;
  label: string;
  /** les etiquettes vides sont voulues : afficher toutes celles qui sont remplies */
  sparseLabels?: boolean;
};

export function InkBarChart({ bars, height = 180, color, highlight = null, average = null, format, showValues = 'highlight', onSelect, label, sparseLabels }: Props) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const fill = color ?? CHART_COLORS.blue;
  const k = useChartInk();
  // la barre mise en valeur (semaine ou jour en cours) en couleur pleine, les autres en teinte claire de la meme couleur
  const soft = tint(fill, 0.58);
  const PAD_T = CHART.padTop;
  const PAD_B = 24;

  const slotRef = useRef(0);
  const { viewRef, width, onLayout, panHandlers, active } = useChartScrub({
    indexAt: (x) => (slotRef.current > 0 && bars.length ? Math.max(0, Math.min(bars.length - 1, Math.floor(x / slotRef.current))) : null),
    onChange: (i) => onSelect?.(i),
    startOnTouch: true,
    holdMs: onSelect ? 0 : 1400,
  });

  const geo = useMemo(() => {
    if (!width || bars.length === 0) return null;
    const max = Math.max(...bars.map((b) => b.value), average ?? 0, 1) * 1.08;
    const slot = width / bars.length;
    const bw = Math.max(4, Math.min(CHART.barMax, slot * 0.5));
    const plotH = height - PAD_T - PAD_B;
    const y = (v: number) => PAD_T + plotH - (v / max) * plotH;
    // une etiquette sur deux (ou sur trois) quand la place manque
    // vague 33 : mois moins serres (un libelle de 4 lettres demande environ 34 points)
    const every = slot >= 34 ? 1 : slot >= 17 ? 2 : 3;
    return { slot, bw, y, base: PAD_T + plotH, every };
  }, [width, bars, height, average, PAD_T]);
  slotRef.current = geo?.slot ?? 0;

  const act = active !== null && active < bars.length ? active : null;

  return (
    <View ref={viewRef} onLayout={onLayout} style={{ height }} {...panHandlers} accessibilityLabel={label}>
      {geo ? (
        <Svg width={width} height={height}>
          <Line x1={0} x2={width} y1={geo.base + 0.5} y2={geo.base + 0.5} stroke={k.baseline} strokeWidth={1} />
          <Reveal width={width} height={height} dir="up" replayKey={`${bars.length}|${bars[0]?.label}|${width}`} duration={620}>
            {bars.map((b, i) => {
              const cx = geo.slot * i + geo.slot / 2;
              const top = geo.y(b.value);
              const h = Math.max(geo.base - top, b.value > 0 ? 3 : 0);
              const isHi = i === highlight;
              const isActive = i === act;
              const x0 = cx - geo.bw / 2;
              const d = barPath(x0, geo.base, geo.bw, h, Math.min(CHART.barRadius, geo.bw / 2));
              // si la barre du jour est vide, rien n'est mis en avant : toutes les barres gardent leur couleur
              const dimOthers = highlight !== null && (bars[highlight]?.value ?? 0) > 0;
              // barre mise en avant : indigo d'action par defaut, ou la couleur pleine de la serie quand elle en a une
              const col = isHi ? (color ? fill : c.accent) : !dimOthers || isActive ? fill : soft;
              return d ? <Path key={`b${b.label}${i}`} d={d} fill={col} opacity={act !== null && !isActive ? 0.5 : 1} /> : null;
            })}
          </Reveal>
          {average !== null && average > 0 ? <RefLine y={geo.y(average)} x1={0} x2={width} /> : null}
          {bars.map((b, i) => {
            const cx = geo.slot * i + geo.slot / 2;
            const top = geo.y(b.value);
            const h = Math.max(geo.base - top, b.value > 0 ? 3 : 0);
            const isHi = i === highlight;
            const isActive = i === act;
            const show = isActive || (act === null && (showValues === 'all' || (showValues === 'highlight' && isHi)));
            const yTop = geo.base - h;
            const showLabel = sparseLabels ? !!b.label || isActive : isActive || isHi || (i % geo.every === (bars.length - 1) % geo.every && (geo.every === 1 || ((highlight == null || Math.abs(i - highlight) > 1) && (act === null || Math.abs(i - act) > 1))));
            return (
              <G key={b.label + i}>
                {show && b.value > 0 ? (
                  <SvgText x={Math.min(Math.max(cx, 24), width - 24)} y={Math.max(yTop - 7, 12)} textAnchor="middle" fontSize={CHART.labelSize} fontFamily={CHART.labelFamily} fill={c.ink}>
                    {format(b.value)}
                  </SvgText>
                ) : null}
                {showLabel ? <AxisLabel x={cx} y={height - 5} text={traduire(b.label)} strong={isActive || isHi} /> : null}
              </G>
            );
          })}
        </Svg>
      ) : null}
    </View>
  );
}
