/**
 * Ton chemin vers ton objectif de poids (vague 18) : un sentier de pierres qui serpente
 * vers un torii. La partie parcourue est tracee a l'encre indigo, un jeton marque ta position.
 * Le pourcentage est le vrai : (depart - aujourd'hui) / (depart - objectif). Sans donnees,
 * le sentier reste en pointille et le texte dit quoi faire.
 */
import React, { useMemo, useState } from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useYoroiTheme } from '@/components/yoroi';
import { Ink } from '@/components/yoroi/v2/Ink';
import { Card } from '@/components/yoroi/v2/espace/ui';
import { ORNEMENTS } from './Ornement';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
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

/** Premier morceau de la courbe, coupe en t (de Casteljau) */
function splitStart(p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): [Pt, Pt, Pt, Pt] {
  const a = lerp(p0, p1, t);
  const b = lerp(p1, p2, t);
  const c = lerp(p2, p3, t);
  const d = lerp(a, b, t);
  const e = lerp(b, c, t);
  return [p0, a, d, lerp(d, e, t)];
}

/** t pour une fraction de longueur (les pas de t ne sont pas reguliers sur une courbe) */
function tForFraction(p0: Pt, p1: Pt, p2: Pt, p3: Pt, f: number): number {
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
    if (lens[i] >= goal) {
      const seg = lens[i] - lens[i - 1] || 1;
      return (i - 1 + (goal - lens[i - 1]) / seg) / N;
    }
  }
  return 1;
}

const d = (p: Pt[]) => `M${p[0].x} ${p[0].y} C${p[1].x} ${p[1].y} ${p[2].x} ${p[2].y} ${p[3].x} ${p[3].y}`;

export function CheminPoids({ start, current, target, progress, fmt }: {
  start?: number;
  current: number | null;
  target?: number;
  /** entre 0 et 1, null si on ne peut pas calculer */
  progress: number | null;
  fmt: (n: number | null | undefined) => string;
}) {
  useIllustrations();
  const { theme } = useYoroiTheme();
  const c = theme.colors;
  const [w, setW] = useState(0);
  const H = 118;
  const TORII = 70;

  const geo = useMemo(() => {
    if (w <= 0) return null;
    const p0 = { x: 14, y: 96 };
    const p3 = { x: w - TORII / 2, y: 72 };
    const p1 = { x: w * 0.32, y: 128 };
    const p2 = { x: w * 0.5, y: 26 };
    const pts: [Pt, Pt, Pt, Pt] = [p0, p1, p2, p3];
    const f = progress === null ? 0 : Math.max(0, Math.min(1, progress));
    const t = tForFraction(p0, p1, p2, p3, f);
    const done = splitStart(p0, p1, p2, p3, t);
    return { pts, done, pos: bez(p0, p1, p2, p3, t), f };
  }, [w, progress]);

  const pct = progress === null ? null : Math.round(Math.max(0, Math.min(1, progress)) * 100);
  const reached = progress !== null && progress >= 1;
  const message = progress === null
    ? current ? traduire('Indique ton poids de départ et ton objectif pour suivre ta progression.') : traduire('Pèse-toi une première fois pour voir ta progression.')
    : reached ? traduire('Objectif atteint. Bravo, fixe-toi le prochain.') : traduire('du chemin parcouru');

  return (
    <Card style={{ padding: 16, gap: 10 }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <View style={{ gap: 2, flexShrink: 1 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Départ")}</Ink>
          <Ink size={20} weight="black" tight numberOfLines={1}>{start ? `${fmt(start)} kg` : traduire('à fixer')}</Ink>
        </View>
        <View style={{ gap: 2, alignItems: 'center', flexShrink: 1 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Aujourd’hui")}</Ink>
          <Ink size={32} weight="black" tight numberOfLines={1}>{current ? fmt(current) : traduire('à peser')}</Ink>
        </View>
        <View style={{ gap: 2, alignItems: 'flex-end', flexShrink: 1 }}>
          <Ink size={13} weight="bold" color={c.textMuted}>{traduire("Objectif")}</Ink>
          <Ink size={20} weight="black" tight color={c.successText} numberOfLines={1}>{target ? `${fmt(target)} kg` : traduire('à fixer')}</Ink>
        </View>
      </View>

      <View
        onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel={pct !== null ? traduire("{0} pour cent du chemin vers ton objectif", pct) : traduire('Progression vers ton objectif')}
        accessibilityValue={{ min: 0, max: 100, now: pct ?? 0 }}
        style={{ height: H, marginHorizontal: -4 }}
      >
        {geo ? (
          <Svg width={w} height={H}>
            {/* le sentier entier : large bande de terre claire, pierres en pointille */}
            <Path d={d(geo.pts)} stroke={c.fillSoft} strokeWidth={16} fill="none" strokeLinecap="round" />
            <Path d={d(geo.pts)} stroke={c.border} strokeWidth={3} fill="none" strokeLinecap="round" strokeDasharray="0.1 8" />
            {/* la partie parcourue, a l'encre */}
            {geo.f > 0.005 ? <Path d={d(geo.done)} stroke={c.accent} strokeWidth={4} fill="none" strokeLinecap="round" /> : null}
            {/* le point de depart */}
            <Circle cx={geo.pts[0].x} cy={geo.pts[0].y} r={6} fill={c.surface} stroke={c.textMuted} strokeWidth={2.5} />
            {/* ta position */}
            {progress !== null ? (
              <>
                <Circle cx={geo.pos.x} cy={geo.pos.y} r={13} fill={c.accent} opacity={0.16} />
                <Circle cx={geo.pos.x} cy={geo.pos.y} r={8} fill={c.accent} stroke="#FFFFFF" strokeWidth={3} />
              </>
            ) : null}
          </Svg>
        ) : null}
        <Image source={ORNEMENTS.torii} style={{ position: 'absolute', right: 0, bottom: H - 82, width: TORII, height: TORII }} resizeMode="contain" />
      </View>

      {pct !== null && !reached ? (
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Ink size={26} weight="black" tight color={c.accent}>{`${pct} %`}</Ink>
          <Ink size={14} weight="bold" color={c.textSecondary}>{message}</Ink>
        </View>
      ) : (
        <Ink size={13} weight="bold" color={reached ? c.successText : c.textSecondary}>{message}</Ink>
      )}
    </Card>
  );
}
