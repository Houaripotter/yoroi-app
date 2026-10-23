/**
 * Radar de performance au pinceau : grille en traits d'encre legers, forme de l'athlete en trait epais
 * arrondi, lavis rouge, valeurs en gros chiffres. Le trace se deploie a l'ouverture.
 */
import React, { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { fontFamilies } from '@/components/yoroi/fonts';
import { P } from '@/components/yoroi/v2/accueil/kit';
import { traduire } from '@/lib/i18n/tr';

export type RadarAxis = { key: string; label: string; value: number; color: string };

function useGrow(deps: unknown[], ms = 800) {
  const [t, setT] = useState(0);
  const raf = useRef<number | null>(null);
  useEffect(() => {
    const start = Date.now();
    const step = () => {
      const k = Math.min(1, (Date.now() - start) / ms);
      setT(1 - Math.pow(1 - k, 3));
      if (k < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, deps);
  return t;
}

export function RadarInk({ axes, size = 320 }: { axes: RadarAxis[]; size?: number }) {
  const t = useGrow([axes.map((a) => a.value).join(',')]);
  const c = size / 2;
  // Rayon limite pour que les libelles de cote (ex. « Technique ») tiennent dans la largeur
  const R = Math.max(40, Math.min(size * 0.3, c - 96));
  const n = axes.length;
  const angle = (i: number) => -Math.PI / 2 + (i * 2 * Math.PI) / n;
  const pt = (i: number, r: number) => [c + r * Math.cos(angle(i)), c + r * Math.sin(angle(i))];
  // Polygone au pinceau : courbes legeres entre les sommets
  const shape = (rs: number[]) => {
    const pts = rs.map((r, i) => pt(i, r));
    let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
    for (let i = 1; i <= n; i++) {
      const p = pts[i % n];
      const q = pts[i - 1];
      const mx = (p[0] + q[0]) / 2 + (c - (p[0] + q[0]) / 2) * -0.04;
      const my = (p[1] + q[1]) / 2 + (c - (p[1] + q[1]) / 2) * -0.04;
      d += ` Q${mx.toFixed(1)} ${my.toFixed(1)} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`;
    }
    return d + ' Z';
  };
  const values = axes.map((a) => (Math.max(0, Math.min(100, a.value)) / 100) * R * t);
  const data = shape(values.map((v) => Math.max(v, 3)));

  return (
    <View style={{ alignItems: 'center' }} accessible accessibilityLabel={axes.map((a) => traduire("{0} {1} pour cent", a.label, Math.round(a.value))).join(', ')}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {[0.25, 0.5, 0.75, 1].map((lv) => (
          <Path key={lv} d={shape(axes.map(() => R * lv))} stroke={lv === 1 ? '#D9D5CC' : P.line2} strokeWidth={lv === 1 ? 2.5 : 1.5} fill="none" strokeLinejoin="round" />
        ))}
        {axes.map((_, i) => {
          const [x, y] = pt(i, R);
          return <Line key={i} x1={c} y1={c} x2={x} y2={y} stroke={P.line2} strokeWidth={1.5} strokeLinecap="round" />;
        })}
        <Path d={data} fill={P.accent} fillOpacity={0.12} stroke="none" />
        <Path d={data} stroke={P.ink} strokeWidth={5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
        {values.map((v, i) => {
          const [x, y] = pt(i, Math.max(v, 3));
          return <Circle key={i} cx={x} cy={y} r={6} fill={axes[i].color} stroke={P.white} strokeWidth={2.5} />;
        })}
        {axes.map((a, i) => {
          const cos = Math.cos(angle(i));
          const side = Math.abs(cos) >= 0.2;
          const [x, y] = pt(i, R + (side ? 22 : 36));
          const anchor = !side ? 'middle' : cos > 0 ? 'start' : 'end';
          const dx = 0;
          return (
            <G key={a.key}>
              <SvgText x={x + dx} y={y - 4} textAnchor={anchor} fontSize={12} fontFamily={fontFamilies.extraBold} fill={P.ink2}>
                {traduire(a.label)}
              </SvgText>
              <SvgText x={x + dx} y={y + 16} textAnchor={anchor} fontSize={19} fontFamily={fontFamilies.black} fill={a.value >= 60 ? a.color : P.ink}>
                {`${Math.round(a.value)}\u00A0%`}
              </SvgText>
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
