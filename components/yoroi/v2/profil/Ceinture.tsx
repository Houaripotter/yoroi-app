/**
 * Ceinture dessinee (vague 18) : une vraie ceinture nouee, a la couleur choisie.
 * Pour le jiu-jitsu bresilien, la barre de grade au bout du pan (noire, rouge sur la ceinture noire).
 * L'app ne note pas les barrettes : aucune n'est dessinee.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Defs, G, LinearGradient as SvgGradient, Path, Rect, Stop } from 'react-native-svg';

/** Assombrit ou eclaircit une couleur hexadecimale (#RRGGBB) */
function shade(hex: string, amount: number): string {
  const m = hex.replace('#', '');
  if (m.length !== 6) return hex;
  const n = [0, 2, 4].map((i) => parseInt(m.slice(i, i + 2), 16));
  const out = n.map((v) => {
    const r = amount < 0 ? v * (1 + amount) : v + (255 - v) * amount;
    return Math.max(0, Math.min(255, Math.round(r))).toString(16).padStart(2, '0');
  });
  return `#${out.join('')}`;
}

export function Ceinture({ color, width = 220, bar = false, empty = false }: {
  color: string;
  width?: number;
  /** barre de grade au bout du pan (jiu-jitsu bresilien) */
  bar?: boolean;
  /** pas encore de ceinture choisie : contour pointille */
  empty?: boolean;
}) {
  const H = width * 0.46;
  const isWhite = color.toUpperCase() === '#FFFFFF';
  const isBlack = color.toUpperCase() === '#1D2029';
  const base = empty ? '#F2F1EC' : color;
  const dark = isWhite ? '#DCD7CC' : shade(base, -0.28);
  const light = isWhite ? '#FFFFFF' : shade(base, 0.18);
  const edge = empty ? '#C9C4B8' : isWhite ? '#C9C4B8' : shade(base, -0.4);
  const stitch = isWhite ? '#D5D0C4' : isBlack ? '#3A3F4C' : shade(base, 0.32);
  const barColor = isBlack ? '#B0282E' : '#1D2029';
  const dash = empty ? '5 4' : undefined;

  return (
    <View style={{ width, height: H }} accessible={false} importantForAccessibility="no-hide-descendants">
      <Svg width={width} height={H} viewBox="0 0 220 101">
        <Defs>
          <SvgGradient id="bande" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={light} />
            <Stop offset="0.55" stopColor={base} />
            <Stop offset="1" stopColor={dark} />
          </SvgGradient>
        </Defs>
        {/* le tour de taille : deux pans qui partent du noeud */}
        <Path d="M4 30 C40 24 70 26 92 30 L92 50 C70 46 40 44 4 50 Z" fill="url(#bande)" stroke={edge} strokeWidth={1.4} strokeDasharray={dash} strokeLinejoin="round" />
        <Path d="M128 30 C150 26 180 24 216 30 L216 50 C180 44 150 46 128 50 Z" fill="url(#bande)" stroke={edge} strokeWidth={1.4} strokeDasharray={dash} strokeLinejoin="round" />
        {/* surpiqures */}
        {!empty ? (
          <G stroke={stitch} strokeWidth={1} strokeDasharray="3 3" fill="none" opacity={0.9}>
            <Path d="M8 35 C40 30 70 31 90 35" />
            <Path d="M8 45 C40 40 70 41 90 45" />
            <Path d="M130 35 C150 31 180 30 212 35" />
            <Path d="M130 45 C150 41 180 40 212 45" />
          </G>
        ) : null}
        {/* pan gauche qui tombe */}
        <Path d="M100 48 C92 62 80 78 66 96 L84 100 C96 84 106 66 112 52 Z" fill="url(#bande)" stroke={edge} strokeWidth={1.4} strokeDasharray={dash} strokeLinejoin="round" />
        {/* pan droit qui tombe, avec la barre de grade */}
        <Path d="M120 48 C128 62 140 78 156 94 L140 100 C128 86 116 68 110 52 Z" fill="url(#bande)" stroke={edge} strokeWidth={1.4} strokeDasharray={dash} strokeLinejoin="round" />
        {bar && !empty ? <Path d="M139.5 75.9 L146 83.5 L132.1 90.2 L126.6 82.6 Z" fill={barColor} /> : null}
        {/* le noeud */}
        <Rect x={92} y={24} width={36} height={32} rx={7} fill="url(#bande)" stroke={edge} strokeWidth={1.6} strokeDasharray={dash} />
        <Path d="M96 32 C104 36 116 36 124 32 M96 48 C104 44 116 44 124 48" stroke={dark} strokeWidth={1.4} fill="none" strokeLinecap="round" opacity={empty ? 0 : 0.8} />
      </Svg>
    </View>
  );
}
