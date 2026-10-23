/**
 * Carte d'une mesure : valeur du jour ou derniere mesure, mini graphique sur 7 jours,
 * tendance comparee a la semaine d'avant. Appui vers le detail.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { barPath, Reveal, Sparkline, tint } from '@/components/yoroi/v2/charts/core';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Press, shadow } from '@/components/yoroi/v2/accueil/kit';
import { FAMILY } from '@/lib/v2/sante/metrics';
import type { MetricDef } from '@/lib/v2/sante/metrics';
import { formatValue, headline, sevenDays, trendText, unitFor, weekTrend, whenLabel } from '@/lib/v2/sante/stats';
import type { DayPoint } from '@/lib/v2/sante/stats';
import { IconDot, METRIC_ICON, SanteIcon } from './SanteIcon';
import { P, blancA } from '@/components/yoroi/livePalette';

/** Mini graphique : barres arrondies pour un cumul (le jour en cours en couleur pleine), mini courbe fine pour une moyenne */
export function Spark({ points, kind, color, width, height = 46 }: { points: DayPoint[]; kind: 'bars' | 'line'; color: string; width: number; height?: number }) {
  if (width <= 0) return <View style={{ height }} />;
  if (kind === 'bars') {
    const days = sevenDays(points);
    const max = Math.max(...days.map((d) => d.value), 1);
    const slot = width / 7;
    const bw = Math.min(12, slot * 0.5);
    const soft = tint(color, 0.6);
    return (
      <Svg width={width} height={height}>
        <Reveal width={width} height={height} dir="up" replayKey={days.length}>
          {days.map((d, i) => {
            const h = d.value > 0 ? Math.max(4, (d.value / max) * (height - 4)) : 3;
            const x = slot * i + (slot - bw) / 2;
            return <Path key={d.date} d={barPath(x, height, bw, h, bw / 2)} fill={d.value > 0 ? (i === 6 ? color : soft) : P.line} />;
          })}
        </Reveal>
      </Svg>
    );
  }
  const pts = points.filter((p) => p.value > 0).slice(-7);
  if (pts.length === 0) return <View style={{ height }} />;
  if (pts.length === 1) {
    return (
      <Svg width={width} height={height}>
        <Circle cx={width / 2} cy={height / 2} r={4} fill={color} />
      </Svg>
    );
  }
  return <Sparkline values={pts.map((p) => p.value)} color={color} width={width} height={height} />;
}

export function headlineText(m: MetricDef, p: DayPoint | null): string {
  if (!p) return 'Pas de donnée';
  if (m.key === 'tension' && p.v2) return `${Math.round(p.value)}/${Math.round(p.v2)}`;
  return formatValue(m, p.value);
}

export function MetricCard({ def, points, onPress, wide }: { def: MetricDef; points: DayPoint[]; onPress: () => void; wide?: boolean }) {
  const [w, setW] = useState(0);
  const fam = FAMILY[def.family];
  const h = headline(points, def);
  // un événement (alerte, chute) n'a pas de tendance en pourcentage
  const trend = def.event ? null : trendText(weekTrend(points));
  const t = weekTrend(points);
  const arrowUp = t !== null && Math.round(t) > 0;
  const arrowDown = t !== null && Math.round(t) < 0;
  const value = headlineText(def, h);
  const unit = h ? (def.event && h.value < 2 ? unitFor(def).replace(/s$/, '') : unitFor(def)) : '';
  const onLayout = (e: LayoutChangeEvent) => setW(Math.round(e.nativeEvent.layout.width));
  return (
    <View style={{ flex: 1 }}>
    <Press onPress={onPress} accessibilityRole="button" accessibilityLabel={`${def.label}, ${value} ${unit}`}>
      <View style={[{ borderRadius: 24, backgroundColor: blancA(0.9), borderWidth: 1, borderColor: P.white, padding: 14, gap: 8, minHeight: wide ? 0 : 188 }, shadow]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <IconDot name={METRIC_ICON[def.key] ?? 'pulse'} color={fam.color} tint={fam.tint} size={32} />
          <Ink size={12} weight="extraBold" color={P.ink2} numberOfLines={2} style={{ flex: 1 }}>
            {def.label}
          </Ink>
          <SanteIcon name="chevron" size={14} color={P.muted} />
        </View>
        <View>
          <Ink size={wide ? 30 : 26} weight="black" tight numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
            {value}
            {unit ? (
              <Ink size={13} weight="bold" color={P.muted}>
                {` ${unit}`}
              </Ink>
            ) : null}
          </Ink>
          <Ink size={12} weight="bold" color={P.muted}>
            {h ? whenLabel(h.date) : def.event ? 'aucun pour l’instant' : 'en attente de ta montre'}
          </Ink>
        </View>
        <View onLayout={onLayout} style={{ justifyContent: 'flex-end' }}>
          <Spark points={points} kind={def.kind === 'sum' ? 'bars' : 'line'} color={fam.color} width={w} height={wide ? 54 : 42} />
        </View>
        {trend ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            {arrowUp || arrowDown ? <SanteIcon name={arrowUp ? 'up' : 'down'} size={13} color={fam.color} width={2.6} /> : null}
            <Ink size={12} weight="bold" color={P.ink2}>
              {trend}
            </Ink>
          </View>
        ) : null}
      </View>
    </Press>
    </View>
  );
}
