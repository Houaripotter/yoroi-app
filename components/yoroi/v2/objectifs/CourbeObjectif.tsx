/**
 * Petite courbe de « Quand vais-je y arriver ? » (26 octobre 2026) : tes seances en points relies au pinceau,
 * puis la suite probable en pointilles (meme forme que ta courbe, lib/v2/objectifs/estimation.ts),
 * et ton objectif en trait horizontal dore.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { fontFamilies } from '../../fonts';
import { brushPath, CHART_COLORS, useChartInk } from '../charts/core';
import { dateOf, monthShort } from '@/lib/v2/progres/format';
import { traduire } from '@/lib/i18n/tr';

type Pt = { date: string; valeur: number };

export function CourbeObjectif({ passe, projection, cible, couleur, format, height = 200 }: { passe: Pt[]; projection: Pt[]; cible: number | null; couleur: string; format: (v: number) => string; height?: number }) {
  const [width, setWidth] = useState(0);
  const ink = useChartInk();
  const g = useMemo(() => {
    if (width <= 0 || passe.length === 0) return null;
    const left = 8;
    const right = width - 44;
    const top = 18;
    const base = height - 24;
    const tous = [...passe, ...projection];
    const t0 = dateOf(tous[0].date).getTime();
    const tE = Math.max(t0 + 86400000, ...tous.map((p) => dateOf(p.date).getTime()));
    const X = (iso: string) => left + ((dateOf(iso).getTime() - t0) / (tE - t0)) * (right - left);
    let lo = Math.min(...tous.map((p) => p.valeur));
    let hi = Math.max(...tous.map((p) => p.valeur));
    if (cible != null) {
      lo = Math.min(lo, cible);
      hi = Math.max(hi, cible);
    }
    const pad = Math.max(0.5, (hi - lo) * 0.12);
    lo -= pad;
    hi += pad;
    const Y = (v: number) => top + ((hi - v) / (hi - lo || 1)) * (base - top);
    const pts = passe.map((p) => ({ x: X(p.date), y: Y(p.valeur) }));
    const trait = pts.length > 1 ? brushPath(pts) : '';
    const futur = projection.length > 1 ? `M${projection.map((p) => `${X(p.date).toFixed(1)} ${Y(p.valeur).toFixed(1)}`).join(' L')}` : '';
    return { pts, trait, futur, yCible: cible != null ? Y(cible) : null, right, base, debut: monthShort(tous[0].date), fin: monthShort(tous[tous.length - 1].date), xAuj: projection.length ? X(projection[0].date) : null };
  }, [width, passe, projection, cible, height]);

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ height }} accessibilityLabel={traduire('Tes séances et la suite probable de ta courbe')}>
      {g ? (
        <Svg width={width} height={height}>
          {g.yCible != null ? (
            <>
              <Line x1={8} x2={g.right} y1={g.yCible} y2={g.yCible} stroke={CHART_COLORS.gold} strokeWidth={2} strokeDasharray="6 5" />
              <SvgText x={g.right + 6} y={g.yCible + 4} fontSize={12} fontFamily={fontFamilies.bold} fill={CHART_COLORS.gold}>
                {format(cible as number)}
              </SvgText>
            </>
          ) : null}
          {g.xAuj != null ? <Line x1={g.xAuj} x2={g.xAuj} y1={14} y2={g.base} stroke={ink.grid} strokeWidth={1} /> : null}
          {g.futur ? <Path d={g.futur} stroke={couleur} strokeWidth={2.4} strokeDasharray="3 6" strokeLinecap="round" fill="none" opacity={0.85} /> : null}
          {g.trait ? <Path d={g.trait} stroke={couleur} strokeWidth={3} strokeLinecap="round" fill="none" /> : null}
          {g.pts.map((p, i) => (
            <Circle key={i} cx={p.x} cy={p.y} r={3.2} fill={couleur} />
          ))}
          <Line x1={8} x2={g.right} y1={g.base} y2={g.base} stroke={ink.baseline} strokeWidth={1} />
          <SvgText x={8} y={height - 6} fontSize={11} fontFamily={fontFamilies.medium} fill={ink.axis}>
            {g.debut}
          </SvgText>
          <SvgText x={g.right} y={height - 6} fontSize={11} fontFamily={fontFamilies.medium} fill={ink.axis} textAnchor="end">
            {g.fin}
          </SvgText>
        </Svg>
      ) : null}
    </View>
  );
}
