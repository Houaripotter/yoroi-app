/**
 * Pictogrammes dessines en SVG qui remplacent toute ecriture japonaise :
 * etoile et couronne de laurier pour les tampons de record, fleur de cerisier,
 * vagues seigaiha et eventail pour les decors.
 */
import React from 'react';
import { View } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';

export type GlyphKind = 'etoile' | 'laurier' | 'sakura' | 'vague' | 'eventail';

function starPath(r: number, inner = 0.45) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push(`${(Math.cos(a) * rr).toFixed(2)} ${(Math.sin(a) * rr).toFixed(2)}`);
  }
  return `M${pts.join(' L')} Z`;
}

function petalPath(r: number) {
  // petale de cerisier avec son encoche, pointe vers le haut, base au centre
  const w = r * 0.42;
  return `M0 0 C${-w} ${-r * 0.3} ${-w * 1.05} ${-r * 0.82} ${-w * 0.35} ${-r} L0 ${-r * 0.84} L${w * 0.35} ${-r} C${w * 1.05} ${-r * 0.82} ${w} ${-r * 0.3} 0 0 Z`;
}

/** Le pictogramme dans un repere centre en (cx, cy), a placer dans un Svg existant */
export function GlyphG({ kind, cx, cy, size, color }: { kind: GlyphKind; cx: number; cy: number; size: number; color: string }) {
  const r = size / 2;
  if (kind === 'etoile') {
    return <Path d={starPath(r * 0.95)} transform={`translate(${cx} ${cy})`} fill={color} strokeLinejoin="round" stroke={color} strokeWidth={Math.max(0.6, r * 0.08)} />;
  }
  if (kind === 'laurier') {
    const leaves: React.ReactElement[] = [];
    const n = 5;
    for (const side of [-1, 1]) {
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const a = Math.PI / 2 + side * (0.35 + t * 1.85);
        const x = Math.cos(a) * r * 0.78;
        const y = Math.sin(a) * r * 0.78;
        const deg = (a * 180) / Math.PI + (side > 0 ? -25 : 25);
        leaves.push(<Ellipse key={`${side}${i}`} cx={0} cy={0} rx={r * 0.13} ry={r * 0.27} fill={color} transform={`translate(${x.toFixed(2)} ${y.toFixed(2)}) rotate(${deg.toFixed(1)})`} />);
      }
    }
    return (
      <G transform={`translate(${cx} ${cy})`}>
        {leaves}
        <Path d={starPath(r * 0.4)} fill={color} />
      </G>
    );
  }
  if (kind === 'sakura') {
    return (
      <G transform={`translate(${cx} ${cy})`}>
        {[0, 1, 2, 3, 4].map((i) => (
          <Path key={i} d={petalPath(r * 0.98)} fill={color} transform={`rotate(${i * 72})`} />
        ))}
      </G>
    );
  }
  if (kind === 'eventail') {
    const ribs = [0, 1, 2, 3, 4, 5, 6];
    return (
      <G transform={`translate(${cx} ${cy + r * 0.45})`}>
        <Path d={`M${-r * 0.95} ${-r * 0.1} A${r} ${r} 0 0 1 ${r * 0.95} ${-r * 0.1} L${r * 0.32} ${-r * 0.03} A${r * 0.34} ${r * 0.34} 0 0 0 ${-r * 0.32} ${-r * 0.03} Z`} fill={color} opacity={0.9} />
        {ribs.map((i) => {
          const a = Math.PI + 0.1 + (i / 6) * (Math.PI - 0.2);
          return <Path key={i} d={`M0 0 L${(Math.cos(a) * r).toFixed(2)} ${(Math.sin(a) * r).toFixed(2)}`} stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={Math.max(0.6, r * 0.04)} />;
        })}
        <Circle cx={0} cy={0} r={r * 0.08} fill={color} />
      </G>
    );
  }
  // vagues seigaiha : trois arcs concentriques
  const arcs = [1, 0.68, 0.36];
  return (
    <G transform={`translate(${cx} ${cy + r * 0.5})`}>
      {arcs.map((k, i) => (
        <Path key={i} d={`M${-r * k} 0 A${r * k} ${r * k} 0 0 1 ${r * k} 0`} fill="none" stroke={color} strokeWidth={Math.max(1.2, r * 0.13)} strokeLinecap="round" />
      ))}
    </G>
  );
}

/** Le pictogramme seul, dans son propre Svg */
export function Glyph({ kind = 'etoile', size = 24, color = '#B0282E', style }: { kind?: GlyphKind; size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        <GlyphG kind={kind} cx={size / 2} cy={size / 2} size={size} color={color} />
      </Svg>
    </View>
  );
}

/** Ornement doux pour un etat vide ou un emplacement decoratif : fleur de cerisier dans un rond pale */
export function Ornament({ kind = 'sakura', size = 56, color = '#D9D5CB', style }: { kind?: GlyphKind; size?: number; color?: string; style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#F5F6FB', alignItems: 'center', justifyContent: 'center' }, style]} pointerEvents="none">
      <Glyph kind={kind} size={size * 0.58} color={color} />
    </View>
  );
}

/** Pictogramme du tampon selon sa taille : couronne de laurier si assez grand, sinon etoile */
export function sealGlyphFor(size: number): GlyphKind {
  return size >= 40 ? 'laurier' : 'etoile';
}

export default Glyph;
