/**
 * Courbe du poids de l'onglet Progres (maquette C « Themes en onglets », 28 octobre 2026). Houari : « plus jamais de
 * trait vertical qui plonge ». La courbe trace ta TENDANCE lissee (lib/v2/pesee/tendance.ts, le meme filtre que
 * l'accueil), tes pesees restent de petits points pales, et une pesee tres eloignee de ta tendance devient un point
 * a part, cercle peche, avec l'etiquette « 75,0 le 27, pesée isolée » (lib/v2/progres/peseeIsolee.ts).
 * Dessous, ton rythme prevu en pointilles verts (ta ligne directrice, si ton cap est affiche), ton depart en rond gris
 * avec « 86,4 au départ », ta derniere tendance en rond bleu, le torii au bout quand tu l'as atteint.
 * Au doigt : glisse pour revoir chaque pesee (le haut de la carte l'affiche), un appui court ouvre le detail.
 * Le calcul de la tendance ne change pas : seul l'affichage change. Avant : WeightTrendChart (toujours utilise ailleurs).
 */
import React, { useMemo, useRef } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient as SvgGradient, Path, Stop, Text as SvgText } from 'react-native-svg';
import { Ink } from '../Ink';
import { useChartScrub, reperesCourts } from '../charts/core';
import { ToriiImage } from '../charts/ToriiImage';
import { paletteSombre } from '@/components/yoroi/livePalette';
import type { DayWeight } from '@/lib/v2/weightStats';
import { daysBetween, formatKg, shortMonth } from '@/lib/v2/weightStats';
import { courbeTendance } from '@/lib/v2/progres/peseeIsolee';
import type { PointCourbe } from '@/lib/v2/progres/peseeIsolee';
import { medianeA } from '@/lib/v2/pesee/ligneDirectrice';
import type { Ligne } from '@/lib/v2/pesee/ligneDirectrice';
import { traduire } from '@/lib/i18n/tr';

export type ScrubTendance = { date: string; value: number; trend: number; isolee: boolean };

/** Couleurs de la courbe, clair et sombre (maquette : trait bleu, aire bleu pale, pesees bleu tres pale, rythme vert) */
export function couleursCourbeTendance(sombre = paletteSombre()) {
  return sombre
    ? { trait: '#8FA8DE', halo: '#2A3557', aire: '#5B78E6', pesee: '#3A4670', plan: '#5FC08F', grille: '#242935', repere: '#8F94AC', depart: '#8F94AC', carte: '#1A1E29', isoleeTrait: '#F0A58C', isoleeFond: '#3A2622', isoleeTexte: '#F0A58C', texte2: '#B8BBC6' }
    : { trait: '#3557D9', halo: '#DCE3FF', aire: '#9FB3F7', pesee: '#C9D3F7', plan: '#5FC08F', grille: '#ECEEF5', repere: '#A3A8BE', depart: '#A3A8BE', carte: '#FFFFFF', isoleeTrait: '#F4A38C', isoleeFond: '#FFE1D6', isoleeTexte: '#B4471E', texte2: '#646985' };
}

/** catmull rom vers bezier : une courbe douce qui passe par chaque point */
function lisse(pts: { x: number; y: number }[]): string {
  if (!pts.length) return '';
  let d = `M${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let k = 0; k < pts.length - 1; k++) {
    const p0 = pts[Math.max(k - 1, 0)];
    const p1 = pts[k];
    const p2 = pts[k + 1];
    const p3 = pts[Math.min(k + 2, pts.length - 1)];
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)} ${c2x.toFixed(1)} ${c2y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  return d;
}

/** au plus n points, toujours le premier et le dernier (une courbe sur des annees reste legere) */
function echantillon<T>(l: T[], n: number): T[] {
  if (l.length <= n) return l;
  const out: T[] = [];
  for (let i = 0; i < n; i++) out.push(l[Math.round((i * (l.length - 1)) / (n - 1))]);
  return out;
}

const jour = (iso: string) => Date.parse(`${iso.slice(0, 10)}T12:00:00`);

/** « le 27 » dans le mois en cours, « le 27 sept. » sinon */
export function texteJourIsolee(iso: string, today: string): string {
  const j = Number(iso.slice(8, 10));
  return iso.slice(0, 7) === today.slice(0, 7) ? traduire('le {0}', j) : traduire('le {0} {1}', j, shortMonth(iso.slice(0, 10)));
}

export function CourbeTendance({
  series,
  period,
  today,
  height = 150,
  ligne = null,
  torii = null,
  atteint = false,
  onScrub,
  onPress,
}: {
  series: DayWeight[];
  /** jours affiches, 0 : tout */
  period: number;
  today: string;
  height?: number;
  /** ta ligne directrice : ton rythme prevu, en pointilles verts */
  ligne?: Ligne | null;
  torii?: string | null;
  atteint?: boolean;
  onScrub?: (p: ScrubTendance | null) => void;
  onPress?: () => void;
}) {
  const k = couleursCourbeTendance();
  const tous = useMemo(() => courbeTendance(series.map((p) => ({ date: p.date, value: p.value })), today), [series, today]);
  const pts: PointCourbe[] = useMemo(() => {
    if (!period || !tous.length) return tous;
    const fin = tous[tous.length - 1].date;
    return tous.filter((p) => daysBetween(p.date, fin) <= period);
  }, [tous, period]);

  const xsRef = useRef<number[]>([]);
  const scrub = useChartScrub({
    indexAt: (x) => {
      const xs = xsRef.current;
      if (!xs.length) return null;
      let best = 0;
      let bd = Infinity;
      xs.forEach((px, i) => {
        const d = Math.abs(px - x);
        if (d < bd) {
          bd = d;
          best = i;
        }
      });
      return best;
    },
    onChange: (i) => {
      if (!onScrub) return;
      if (i == null) onScrub(null);
      else {
        const p = pts[i];
        if (p) onScrub({ date: p.date, value: p.value, trend: p.tendance, isolee: p.isolee });
      }
    },
    onTap: onPress,
  });
  const W = scrub.width;

  const padL = 4;
  const padR = 34;
  const padT = 26;
  const padB = 22;
  const geo = useMemo(() => {
    if (W <= 0 || pts.length === 0) return null;
    const t0 = jour(pts[0].date);
    const t1 = Math.max(t0 + 86400000, jour(pts[pts.length - 1].date));
    const X = (iso: string) => padL + ((W - padL - padR) * (jour(iso) - t0)) / (t1 - t0);
    const planVals: { date: string; v: number }[] = [];
    if (ligne) {
      for (let i = 0; i <= 8; i++) {
        const t = t0 + ((t1 - t0) * i) / 8;
        const d = new Date(t);
        const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (iso < ligne.depart.date) continue;
        const v = medianeA(ligne, torii, iso);
        if (v != null && Number.isFinite(v)) planVals.push({ date: iso, v });
      }
    }
    const vals = [...pts.map((p) => p.tendance), ...pts.filter((p) => !p.isolee).map((p) => p.value), ...planVals.map((p) => p.v)];
    let lo = Math.min(...vals);
    let hi = Math.max(...vals);
    if (hi - lo < 2) {
      const m = (hi + lo) / 2;
      lo = m - 1;
      hi = m + 1;
    }
    lo -= 0.3;
    hi += 0.3;
    const Y = (v: number) => padT + ((height - padT - padB) * (hi - v)) / (hi - lo);
    const yBas = height - padB - 3;
    const yHaut = padT + 3;
    const xs = pts.map((p) => X(p.date));
    const tr = echantillon(pts, 64).map((p) => ({ x: X(p.date), y: Y(p.tendance) }));
    const d = lisse(tr);
    const aire = tr.length > 1 ? `${d} L${tr[tr.length - 1].x.toFixed(1)} ${height - padB} L${tr[0].x.toFixed(1)} ${height - padB} Z` : '';
    const plan = planVals.length > 1 ? lisse(planVals.map((p) => ({ x: X(p.date), y: Y(p.v) }))) : '';
    const reperes = reperesCourts(lo, hi);
    // les mois (au dela d'un mois affiche), sinon trois dates
    const etiquettes: { x: number; t: string }[] = [];
    const jours = (t1 - t0) / 86400000;
    if (jours > 35) {
      const d0 = new Date(t0);
      let m = new Date(d0.getFullYear(), d0.getMonth() + 1, 1, 12);
      const pas = jours > 400 ? 3 : jours > 200 ? 2 : 1;
      while (m.getTime() <= t1) {
        const iso = `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-01`;
        const x = X(iso);
        if (x < W - padR - 24) etiquettes.push({ x, t: shortMonth(iso) });
        m = new Date(m.getFullYear(), m.getMonth() + pas, 1, 12);
      }
    } else {
      [0, 0.5, 1].forEach((f) => {
        const t = new Date(t0 + (t1 - t0) * f);
        const iso = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
        etiquettes.push({ x: f === 1 ? W - padR - 34 : f === 0.5 ? X(iso) - 16 : padL + 6, t: `${t.getDate()} ${shortMonth(iso)}` });
      });
    }
    const isolees = pts
      .map((p, i) => ({ p, i }))
      .filter(({ p }) => p.isolee)
      .map(({ p, i }) => ({ p, x: xs[i], y: Math.max(yHaut, Math.min(yBas, Y(p.value))) }));
    return { X, Y, xs, d, aire, plan, reperes, etiquettes, isolees, yBas };
  }, [W, pts, ligne, torii, height]);

  xsRef.current = geo?.xs ?? [];
  const premier = pts[0];
  const dernier = pts[pts.length - 1];
  const actif = scrub.active != null ? pts[scrub.active] : null;
  const derniereIsolee = geo?.isolees[geo.isolees.length - 1] ?? null;
  const a11y = premier && dernier ? traduire('Ta tendance de poids, de {0} à {1} kilos', formatKg(premier.tendance), formatKg(dernier.tendance)) : traduire('Ta courbe de poids');

  return (
    <View
      ref={scrub.viewRef}
      onLayout={scrub.onLayout}
      {...scrub.panHandlers}
      accessible
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={a11y}
      accessibilityHint={onPress ? traduire('Ouvre le détail de ton poids') : undefined}
      onAccessibilityTap={onPress}
      style={{ height, opacity: scrub.pressed ? 0.85 : 1 }}
    >
      {geo && premier && dernier ? (
        <>
          <Svg width={W} height={height} style={{ position: 'absolute', left: 0, top: 0, overflow: 'visible' }}>
            <Defs>
              <SvgGradient id="progres-aire" x1="0" y1="0" x2="0" y2="1">
                <Stop offset="0" stopColor={k.aire} stopOpacity={0.42} />
                <Stop offset="1" stopColor={k.aire} stopOpacity={0} />
              </SvgGradient>
            </Defs>
            {geo.reperes.map((v) => (
              <React.Fragment key={v}>
                <Path d={`M${padL} ${geo.Y(v).toFixed(1)}H${W - padR + 4}`} stroke={k.grille} strokeWidth={1.2} />
                <SvgText x={W - 2} y={geo.Y(v) + 4} textAnchor="end" fontSize={10.5} fontWeight="700" fill={k.repere}>
                  {Number.isInteger(v) ? String(v) : formatKg(v)}
                </SvgText>
              </React.Fragment>
            ))}
            {geo.etiquettes.map((e, i) => (
              <SvgText key={i} x={e.x} y={height - 5} fontSize={10.5} fontWeight="700" fill={k.repere}>
                {e.t}
              </SvgText>
            ))}
            {geo.aire ? <Path d={geo.aire} fill="url(#progres-aire)" /> : null}
            {geo.plan ? <Path d={geo.plan} fill="none" stroke={k.plan} strokeWidth={2} strokeDasharray="2 5" strokeLinecap="round" /> : null}
            {pts.map((p, i) => (p.isolee ? null : <Circle key={p.date} cx={geo.xs[i]} cy={geo.Y(p.value)} r={2.6} fill={k.pesee} />))}
            {geo.d && pts.length > 1 ? (
              <>
                <Path d={geo.d} fill="none" stroke={k.halo} strokeWidth={9} strokeLinecap="round" opacity={0.7} />
                <Path d={geo.d} fill="none" stroke={k.trait} strokeWidth={3.6} strokeLinecap="round" />
              </>
            ) : null}
            {geo.isolees.map((q) => (
              <Circle key={q.p.date} cx={q.x} cy={q.y} r={4.2} fill={k.carte} stroke={k.isoleeTrait} strokeWidth={2.4} />
            ))}
            {pts.length > 1 ? <Circle cx={geo.xs[0]} cy={geo.Y(premier.tendance)} r={5} fill={k.carte} stroke={k.depart} strokeWidth={2.6} /> : null}
            <Circle cx={geo.xs[pts.length - 1]} cy={geo.Y(dernier.tendance)} r={8} fill={k.trait} opacity={0.16} />
            <Circle cx={geo.xs[pts.length - 1]} cy={geo.Y(dernier.tendance)} r={5.2} fill={k.carte} stroke={k.trait} strokeWidth={3} />
            {actif && scrub.active != null ? (
              <>
                <Line x1={geo.xs[scrub.active]} x2={geo.xs[scrub.active]} y1={padT - 6} y2={height - padB} stroke={k.trait} strokeOpacity={0.25} strokeWidth={1.5} />
                <Circle cx={geo.xs[scrub.active]} cy={actif.isolee ? Math.max(padT + 3, Math.min(geo.yBas, geo.Y(actif.value))) : geo.Y(actif.value)} r={6} fill={k.carte} stroke={actif.isolee ? k.isoleeTrait : k.trait} strokeWidth={3} />
              </>
            ) : null}
          </Svg>
          {/* ton depart, au-dessus de son rond gris */}
          {pts.length > 1 ? (
            <Ink size={10.5} weight="extraBold" color={k.texte2} numberOfLines={1} style={{ position: 'absolute', left: 2, top: Math.max(0, geo.Y(premier.tendance) - 24), maxWidth: W * 0.6 }}>
              {traduire('{0} au départ', formatKg(premier.tendance))}
            </Ink>
          ) : null}
          {/* la pesee isolee la plus recente : son chiffre, son jour, et le mot qui dit tout */}
          {derniereIsolee ? (
            <View
              pointerEvents="none"
              style={[
                { position: 'absolute', top: derniereIsolee.y - 11, height: 22, paddingHorizontal: 8, borderRadius: 11, backgroundColor: k.isoleeFond, justifyContent: 'center', maxWidth: W - 40 },
                derniereIsolee.x > W * 0.45 ? { right: Math.max(0, W - derniereIsolee.x + 10) } : { left: derniereIsolee.x + 10 },
              ]}
            >
              <Ink size={10.5} weight="extraBold" color={k.isoleeTexte} numberOfLines={1}>
                {traduire('{0} {1}, pesée isolée', formatKg(derniereIsolee.p.value), texteJourIsolee(derniereIsolee.p.date, today))}
              </Ink>
            </View>
          ) : null}
          {atteint ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: geo.xs[pts.length - 1] - 15, top: Math.max(-6, geo.Y(dernier.tendance) - 44) }}>
              <ToriiImage width={30} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
