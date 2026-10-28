/**
 * Ceinture nouee dessinee (28 octobre 2026, maquette validee « le melange ») : tour de taille, noeud plat,
 * deux pans qui tombent, surpiqures, et pour le jiu jitsu bresilien la barrette au bout du pan droit
 * (noire, rouge sur la ceinture noire) avec ses degres blancs. Dessin repris de la maquette (pkit.py).
 * Aussi : la petite barrette (bandeau du profil) et la grande barrette a cases touchables.
 */
import React, { useId } from 'react';
import { Pressable, View } from 'react-native';
import Svg, { Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { selectionAsync } from 'expo-haptics';
import { TEINTES, type CeintureId } from '@/lib/v2/profil/gammes';
import { traduire } from '@/lib/i18n/tr';

const TOP = [42, 34, 32, 34];
const BOT = [74, 64, 62, 64];

function bande(side: 'g' | 'd'): string {
  if (side === 'g') return `M4 ${TOP[0]} C40 ${TOP[1]} 74 ${TOP[2]} 106 ${TOP[3]} L106 ${BOT[3]} C74 ${BOT[2]} 40 ${BOT[1]} 4 ${BOT[0]} Z`;
  return `M236 ${TOP[0]} C200 ${TOP[1]} 166 ${TOP[2]} 134 ${TOP[3]} L134 ${BOT[3]} C166 ${BOT[2]} 200 ${BOT[1]} 236 ${BOT[0]} Z`;
}

function surpiqures(side: 'g' | 'd'): string[] {
  return [0.25, 0.5, 0.75].map((t) => {
    const y = [0, 1, 2, 3].map((i) => TOP[i] + t * (BOT[i] - TOP[i]));
    return side === 'g'
      ? `M8 ${(y[0] - 0.6).toFixed(1)} C40 ${y[1].toFixed(1)} 74 ${y[2].toFixed(1)} 104 ${y[3].toFixed(1)}`
      : `M232 ${(y[0] - 0.6).toFixed(1)} C200 ${y[1].toFixed(1)} 166 ${y[2].toFixed(1)} 136 ${y[3].toFixed(1)}`;
  });
}

/** Couleur de la barrette : rouge sur la ceinture noire, noire sinon */
export const couleurBarrette = (c: CeintureId | null | undefined) => (c === 'noire' ? '#B0282E' : '#1D2029');

export function CeintureNouee({ ceinture, degres = 0, barrette = false, width = 200, ombre = true, vide = false }: {
  ceinture: CeintureId;
  degres?: number;
  /** barrette de grade au bout du pan (jiu jitsu bresilien) */
  barrette?: boolean;
  width?: number;
  ombre?: boolean;
  /** pas encore de ceinture choisie : contour pointille */
  vide?: boolean;
}) {
  const u = useId().replace(/[^a-zA-Z0-9]/g, '');
  const c = TEINTES[vide ? 'blanche' : ceinture];
  const h = (width * 132) / 240;
  const dash = vide ? '5 4' : undefined;
  const bar = couleurBarrette(ceinture);
  const n = Math.max(0, Math.round(degres));
  // jusqu'a 4 degres : espaces de 6 ; au dela (ceinture noire, jusqu'a 6) on les resserre dans la barrette
  const pas = n > 4 ? 24 / n : 6;
  const hauteurDegre = n > 4 ? Math.min(3.2, pas - 1) : 3.2;

  const pan = (x: number, y: number, rot: number, avecBarrette: boolean) => (
    <G transform={`translate(${x} ${y}) rotate(${rot})`}>
      <Rect x={-11.5} y={-4} width={23} height={70} rx={2.5} fill={`url(#t${u})`} stroke={c.edge} strokeWidth={1.3} strokeDasharray={dash} />
      {vide ? null : [-5.5, 0, 5.5].map((sx) => <Path key={sx} d={`M${sx} 0V63`} stroke={c.stitch} strokeWidth={0.9} strokeDasharray="3 2.4" />)}
      {avecBarrette && !vide ? (
        <>
          <Rect x={-11.5} y={26} width={23} height={28} fill={bar} stroke={c.edge} strokeWidth={1} />
          <Rect x={-11.5} y={26} width={23} height={2.4} fill="#FFFFFF" opacity={0.18} />
          {Array.from({ length: n }, (_, k) => (
            <Rect key={k} x={-11.5} y={30 + k * pas} width={23} height={hauteurDegre} rx={0.6} fill="#F7F4EC" />
          ))}
        </>
      ) : null}
      {vide ? null : <Rect x={-11.5} y={62} width={23} height={4} fill={c.dark} opacity={0.55} />}
    </G>
  );

  return (
    <View style={{ width, height: h }} accessible={false} importantForAccessibility="no-hide-descendants" pointerEvents="none">
      <Svg width={width} height={h} viewBox="0 0 240 132">
        <Defs>
          <LinearGradient id={`v${u}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={c.light} />
            <Stop offset="0.5" stopColor={c.base} />
            <Stop offset="1" stopColor={c.dark} />
          </LinearGradient>
          <LinearGradient id={`t${u}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={c.light} />
            <Stop offset="0.55" stopColor={c.base} />
            <Stop offset="1" stopColor={c.dark} />
          </LinearGradient>
          <LinearGradient id={`eg${u}`} x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.28} />
            <Stop offset="0.4" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>
          <LinearGradient id={`ed${u}`} x1="1" y1="0" x2="0" y2="0">
            <Stop offset="0" stopColor="#000000" stopOpacity={0.28} />
            <Stop offset="0.4" stopColor="#000000" stopOpacity={0} />
          </LinearGradient>
          <RadialGradient id={`s${u}`} cx="0.5" cy="0.5" r="0.5">
            <Stop offset="0" stopColor="#1D2033" stopOpacity={0.18} />
            <Stop offset="1" stopColor="#1D2033" stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {ombre ? <Ellipse cx={120} cy={124} rx={78} ry={6} fill={`url(#s${u})`} /> : null}
        <Path d={bande('g')} fill={`url(#v${u})`} stroke={c.edge} strokeWidth={1.4} strokeLinejoin="round" strokeDasharray={dash} />
        <Path d={bande('d')} fill={`url(#v${u})`} stroke={c.edge} strokeWidth={1.4} strokeLinejoin="round" strokeDasharray={dash} />
        {vide ? null : (
          <>
            <Path d={bande('g')} fill={`url(#eg${u})`} />
            <Path d={bande('d')} fill={`url(#ed${u})`} />
            {[...surpiqures('g'), ...surpiqures('d')].map((d) => (
              <Path key={d} d={d} fill="none" stroke={c.stitch} strokeWidth={1} strokeDasharray="3 2.4" opacity={0.95} />
            ))}
          </>
        )}
        {pan(111, 60, 27, false)}
        {pan(129, 60, -23, barrette)}
        <Path d="M101 33Q120 27 139 33L136 68Q120 73 104 68Z" fill={`url(#v${u})`} stroke={c.edge} strokeWidth={1.5} strokeLinejoin="round" strokeDasharray={dash} />
        {vide ? null : <Path d="M113 70Q117 58 120 49M127 70Q123 58 120 49" fill="none" stroke={c.dark} strokeWidth={1.6} strokeLinecap="round" opacity={0.75} />}
        <Path d="M97 31Q120 22 143 31L142 49Q120 42 98 49Z" fill={`url(#v${u})`} stroke={c.edge} strokeWidth={1.5} strokeLinejoin="round" strokeDasharray={dash} />
        {vide ? null : (
          <>
            <Path d="M99 32Q120 24 141 32L141 37Q120 30 99 37Z" fill={c.light} opacity={0.7} />
            <Path d="M101 38Q120 31.5 139 38M101 44Q120 37.5 139 44" fill="none" stroke={c.stitch} strokeWidth={0.9} strokeDasharray="3 2.4" />
            <Path d="M100 50Q120 44 140 50" fill="none" stroke={c.dark} strokeWidth={2} strokeLinecap="round" opacity={0.55} />
          </>
        )}
      </Svg>
    </View>
  );
}

/** Petite barrette de grade : n barres blanches sur cases emplacements (4 par defaut) */
export function PetiteBarrette({ n, cases = 4, width = 30, height = 11, rouge = false }: { n: number; cases?: number; width?: number; height?: number; rouge?: boolean }) {
  const pas = 38 / cases;
  return (
    <Svg width={width} height={height} viewBox={`0 0 46 ${height}`}>
      <Rect width={46} height={height} rx={3} fill={rouge ? '#B0282E' : '#1D2029'} />
      {Array.from({ length: cases }, (_, k) => (
        <Rect key={k} x={8 + k * pas} y={2} width={Math.min(4, pas - 2)} height={height - 4} rx={1} fill={k < n ? '#F7F4EC' : '#FFFFFF'} opacity={k < n ? 1 : 0.14} />
      ))}
    </Svg>
  );
}

/** Grande barrette a cases touchables : toucher une case pose ce nombre de degres (retoucher la derniere l'enleve) */
export function GrandeBarrette({ n, max, rouge, onChange, width = 150 }: { n: number; max: number; rouge?: boolean; onChange: (v: number) => void; width?: number }) {
  const h = Math.round((width * 34) / 176);
  // 4 cases comme la maquette (x = 22, 58, 94, 130) ; 6 cases plus etroites sur la ceinture noire
  const cell = max <= 4 ? 20 : 14;
  const pas = max > 1 ? (128 - cell) / (max - 1) : 0;
  const scale = width / 176;
  return (
    <View style={{ width, height: h, borderRadius: 6 * scale, backgroundColor: rouge ? '#B0282E' : '#1D2029', flexDirection: 'row' }}>
      <Svg width={width} height={h} viewBox="0 0 176 34" style={{ position: 'absolute' }}>
        {Array.from({ length: max }, (_, k) => {
          const on = k < n;
          return <Rect key={k} x={22 + k * pas} y={5} width={cell} height={24} rx={3} fill={on ? '#F7F4EC' : 'none'} stroke={on ? 'none' : rouge ? '#E9A3A6' : '#5A5F6E'} strokeWidth={1.6} strokeDasharray={on ? undefined : '3 3'} />;
        })}
      </Svg>
      {Array.from({ length: max }, (_, k) => {
        const v = k + 1;
        return (
          <Pressable
            key={k}
            onPress={() => { selectionAsync().catch(() => {}); onChange(n === v ? v - 1 : v); }}
            accessibilityRole="button"
            accessibilityState={{ selected: k < n }}
            accessibilityLabel={v === 1 ? traduire('1 degré') : traduire('{0} degrés', v)}
            hitSlop={{ top: 8, bottom: 8 }}
            style={{ position: 'absolute', left: (22 + k * pas - (pas - cell) / 2) * scale, width: pas * scale, top: 0, bottom: 0 }}
          />
        );
      })}
    </View>
  );
}
