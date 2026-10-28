/**
 * Ton chemin (28 octobre 2026, maquette validee « le melange », haut de A) : depart, aujourd'hui en grand,
 * objectif en vert, puis le sentier qui monte vers le torii. La partie parcourue est tracee a l'encre,
 * ton jeton (photo ou personnage) marque ta position. Le pourcentage est le vrai :
 * (depart - aujourd'hui) / (depart - objectif), calcule par goalProgress (meme regle que l'accueil).
 */
import React, { useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Icon } from '@/components/yoroi/v2/espace/ui';
import { ORNEMENTS } from './Ornement';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { Capitales } from './Rubriques';
import { traduire } from '@/lib/i18n/tr';

type Pt = { x: number; y: number };

function bez(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
}
const lerp = (a: Pt, b: Pt, t: number): Pt => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
function debut(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): [Pt, Pt, Pt, Pt] {
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  return [p0, a, d, lerp(d, e, t)];
}
function tPour(p0: Pt, p1: Pt, p2: Pt, p3: Pt, f: number): number {
  const N = 80;
  const lens = [0];
  let prev = p0;
  for (let i = 1; i <= N; i++) {
    const p = bez(p0, p1, p2, p3, i / N);
    lens.push(lens[i - 1] + Math.hypot(p.x - prev.x, p.y - prev.y));
    prev = p;
  }
  const goal = f * lens[N];
  for (let i = 1; i <= N; i++) {
    if (lens[i] >= goal) return (i - 1 + (goal - lens[i - 1]) / (lens[i] - lens[i - 1] || 1)) / N;
  }
  return 1;
}
const chemin = (p: Pt[]) => `M${p[0].x} ${p[0].y} C${p[1].x} ${p[1].y} ${p[2].x} ${p[2].y} ${p[3].x} ${p[3].y}`;

function Colonne({ label, val, align, gros, couleur }: { label: string; val: string | null; align: 'flex-start' | 'center' | 'flex-end'; gros?: boolean; couleur?: string }) {
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  return (
    <View style={{ alignItems: align, gap: 2, flexShrink: 1 }}>
      <Ink size={12} weight="bold" color={c.textSecondary} numberOfLines={1}>{label}</Ink>
      {val ? (
        <Ink size={gros ? 30 : 19} weight="extraBold" color={couleur ?? c.ink} numberOfLines={1} style={{ letterSpacing: gros ? -0.8 : -0.2 }}>
          {val}
          <Ink size={gros ? 14 : 13} weight="bold" color={couleur ?? c.textSecondary}> kg</Ink>
        </Ink>
      ) : (
        <Ink size={gros ? 18 : 15} weight="extraBold" color={c.textMuted} numberOfLines={1}>{gros ? traduire('à peser') : traduire('à fixer')}</Ink>
      )}
    </View>
  );
}

export function CheminCarte({ start, current, target, progress, fmt, jeton }: {
  start?: number;
  current: number | null;
  target?: number;
  progress: number | null;
  fmt: (n: number | null | undefined) => string;
  /** le contenu de ton jeton : photo ou personnage */
  jeton: React.ReactNode;
}) {
  useIllustrations();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [w, setW] = useState(0);
  const H = 96;

  const geo = useMemo(() => {
    if (w <= 0) return null;
    const p0 = { x: 14, y: H - 18 };
    const p3 = { x: w - 46, y: Math.round(H * 0.5) };
    const p1 = { x: w * 0.34, y: H + 4 };
    const p2 = { x: w * 0.56, y: p3.y - 8 };
    const f = progress === null ? 0 : Math.max(0, Math.min(1, progress));
    const t = tPour(p0, p1, p2, p3, f);
    return { pts: [p0, p1, p2, p3] as [Pt, Pt, Pt, Pt], fait: debut(p0, p1, p2, p3, t), pos: bez(p0, p1, p2, p3, t), f };
  }, [w, progress]);

  const pct = progress === null ? null : Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const atteint = progress !== null && progress >= 1;
  const pierres = w > 0 ? [[40, H - 4], [90, H - 6], [Math.round(w * 0.46), H - 22], [Math.round(w * 0.64), 50]] : [];

  return (
    <View style={{ backgroundColor: c.surface, borderRadius: 26, paddingHorizontal: 16, paddingVertical: 14, shadowColor: c.ink, shadowOpacity: 0.05, shadowRadius: 14, shadowOffset: { width: 0, height: 4 } }}>
      <Capitales color="#B4471E" losange={false}>{traduire('Ton chemin')}</Capitales>
      <View style={{ marginTop: 8, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 6 }}>
        <Colonne label={traduire('Départ')} val={start ? fmt(start) : null} align="flex-start" />
        <Colonne label={traduire('Aujourd’hui')} val={current ? fmt(current) : null} align="center" gros />
        <Colonne label={traduire('Objectif')} val={target ? fmt(target) : null} align="flex-end" couleur={c.successText} />
      </View>
      <View
        onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={pct !== null ? traduire('{0} pour cent du chemin vers ton objectif', pct) : traduire('Progression vers ton objectif')}
        accessibilityValue={{ min: 0, max: 100, now: pct ?? 0 }}
        style={{ marginTop: 10, height: H }}
      >
        {geo ? (
          <Svg width={w} height={H}>
            {pierres.map(([x, y]) => <Circle key={`${x}`} cx={x} cy={y} r={2} fill="#D9DDEB" />)}
            <Path d={chemin(geo.pts)} fill="none" stroke={c.fillSoft} strokeWidth={14} strokeLinecap="round" />
            {progress === null ? <Path d={chemin(geo.pts)} fill="none" stroke={c.border} strokeWidth={3} strokeLinecap="round" strokeDasharray="0.1 8" /> : null}
            {geo.f > 0.005 ? <Path d={chemin(geo.fait)} fill="none" stroke={c.accent} strokeWidth={4.5} strokeLinecap="round" /> : null}
            <Circle cx={geo.pts[0].x} cy={geo.pts[0].y} r={6} fill={c.surface} stroke="#A3A8BE" strokeWidth={3} />
          </Svg>
        ) : null}
        <Image source={ORNEMENTS.torii} style={{ position: 'absolute', right: -2, top: 8, width: 54, height: 54 }} resizeMode="contain" accessibilityIgnoresInvertColors />
        {geo && progress !== null ? (
          <View style={{ position: 'absolute', left: geo.pos.x - 17, top: geo.pos.y - 17, width: 34, height: 34, borderRadius: 17, borderWidth: 3, borderColor: '#FFFFFF', backgroundColor: '#E6ECF8', overflow: 'hidden', shadowColor: c.ink, shadowOpacity: 0.18, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } }}>
            {jeton}
          </View>
        ) : null}
      </View>
      {atteint ? (
        <View style={{ marginTop: 6, minHeight: 34, borderRadius: 17, backgroundColor: '#E3F2EA', flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 6 }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: '#5FC08F', alignItems: 'center', justifyContent: 'center' }}>
            <Icon name="check" size={11} color="#FFFFFF" stroke={3.4} />
          </View>
          <Ink size={12.5} weight="extraBold" color="#1C6B45" numberOfLines={2} style={{ flex: 1 }}>{traduire('Objectif atteint. Bravo, choisis le prochain.')}</Ink>
        </View>
      ) : pct !== null ? (
        <View style={{ marginTop: 6, flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Ink size={24} weight="black" tight color={c.accent}>{`${pct} %`}</Ink>
          <Ink size={13.5} weight="bold" color={c.textSecondary}>{traduire('du chemin parcouru')}</Ink>
        </View>
      ) : (
        <Ink size={13} weight="bold" color={c.textSecondary} style={{ marginTop: 6 }}>
          {current ? traduire('Indique ton poids de départ et ton objectif pour suivre ta progression.') : traduire('Pèse toi une première fois pour voir ta progression.')}
        </Ink>
      )}
    </View>
  );
}
