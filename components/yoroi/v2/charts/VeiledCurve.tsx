/**
 * Courbe voilee du paywall (vague 30) : ta vraie courbe de poids, moyenne par semaine.
 * Les premieres semaines se lisent nettement, puis la courbe s'estompe sous un voile couleur papier :
 * la suite est dans Premium. Pas d'escalier (lissage monotone), pas de flou grossier.
 * Une seule echelle, aucune valeur inventee : on trace seulement les points recus.
 * Vague 33 : le langage de la courbe de poids (degrade bleu, violet, magenta, halo, aire violette, point final blanc).
 * Vague 49 (Houari : « un pic bizarre et un rond vide », « ajoute le rythme prévu pour donner envie ») :
 *  - une semaine isolee tres loin de ses voisines est attenuee dans le trace (comme la courbe de l'accueil) ;
 *  - ton rythme prevu (lib/v2/pesee/ligneDirectrice.ts) : la bande verte « ton allure » sous le voile, les tirets
 *    verts au-dessus du voile, et le point du jour en couleur (vert dans l'allure, bleu au-dessus, orange trop vite),
 *    visible au-dessus du voile (plus de rond vide).
 */
import React, { useRef } from 'react';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Rect, Stop } from 'react-native-svg';
import { areaOf, brushPath, Reveal, useChartInk } from './core';
import { POIDS, attenuerIsolees, couleurPointStatut } from './CourbePoids';
import type { Ligne } from '@/lib/v2/pesee/ligneDirectrice';
import { TOLERANCE_KG, bornesA, isoDuTemps, jourDe, medianeA, statutLigne } from '@/lib/v2/pesee/ligneDirectrice';
import { paletteSombre } from '@/components/yoroi/livePalette';

let veilSeq = 0;

export function VeiledCurve({ points, width, height, color, surface, clearUntil = 0.42, ligne = null, torii = null }: {
  /** t : horodatage, v : valeur */
  points: { t: number; v: number }[];
  width: number;
  height: number;
  color: string;
  /** couleur du fond de la carte (le voile prend cette couleur) */
  surface: string;
  /** part de la largeur laissee nette avant que le voile commence */
  clearUntil?: number;
  /** vague 49 : ton plan (rythme prevu), null sans cap */
  ligne?: Ligne | null;
  torii?: string | null;
}) {
  const k = useChartInk();
  const id = useRef(`veil${++veilSeq}`).current;
  if (points.length < 2 || width <= 0) return null;
  void color;
  const sombre = paletteSombre();
  const vert = sombre ? '#3FB27F' : POIDS.cap;
  const padX = 10;
  const padT = 14;
  const padB = 12;
  const tMin = points[0].t;
  const tMax = points[points.length - 1].t;
  const vals = attenuerIsolees(points.map((p) => p.v), 1.2);
  // ton rythme prevu sur la periode : bornes de ta zone (avec la tolerance) et ligne mediane
  const traj: { t: number; haut: number; bas: number; m: number }[] = [];
  if (ligne) {
    const ta = Math.max(tMin, jourDe(ligne.depart.date));
    if (tMax > ta) {
      const N = 36;
      for (let i = 0; i <= N; i++) {
        const t = ta + ((tMax - ta) * i) / N;
        const iso = isoDuTemps(t);
        const b = bornesA(ligne, iso, torii);
        const m = medianeA(ligne, torii ?? null, iso);
        if (b && m != null) traj.push({ t, haut: b.haut + TOLERANCE_KG, bas: b.bas - TOLERANCE_KG, m });
      }
    }
  }
  let vMin = Math.min(...vals, ...traj.map((p) => p.bas));
  let vMax = Math.max(...vals, ...traj.map((p) => p.haut));
  if (vMax - vMin < 1) {
    const mid = (vMax + vMin) / 2;
    vMin = mid - 0.5;
    vMax = mid + 0.5;
  }
  const x = (t: number) => padX + ((t - tMin) / (tMax - tMin || 1)) * (width - padX * 2);
  const y = (v: number) => padT + (1 - (v - vMin) / (vMax - vMin)) * (height - padT - padB);
  const pts = points.map((p, i) => ({ x: x(p.t), y: y(vals[i]) }));
  const line = brushPath(pts);
  const area = areaOf(line, pts, height);
  const lastP = points[points.length - 1];
  const last = { x: x(lastP.t), y: y(lastP.v) };
  const clearX = width * clearUntil;
  const grid = [0.3, 0.62, 0.94].map((f) => Math.round(padT + f * (height - padT - padB)) + 0.5);
  const band = traj.length > 1 ? `M${traj.map((p) => `${x(p.t).toFixed(1)} ${y(p.haut).toFixed(1)}`).join(' L')} L${[...traj].reverse().map((p) => `${x(p.t).toFixed(1)} ${y(p.bas).toFixed(1)}`).join(' L')} Z` : null;
  const mid = traj.length > 1 ? `M${traj.map((p) => `${x(p.t).toFixed(1)} ${y(p.m).toFixed(1)}`).join(' L')}` : null;
  const ton = ligne ? statutLigne(ligne, isoDuTemps(lastP.t), lastP.v, torii).ton : null;
  const pointCouleur = couleurPointStatut(ton, sombre) ?? POIDS.c3;
  return (
    <Svg width={width} height={height}>
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={surface} stopOpacity={0} />
          <Stop offset={String(clearUntil)} stopColor={surface} stopOpacity={0} />
          <Stop offset={String(Math.min(0.96, clearUntil + 0.34))} stopColor={surface} stopOpacity={0.7} />
          <Stop offset="1" stopColor={surface} stopOpacity={0.82} />
        </LinearGradient>
        <LinearGradient id={`${id}l`} x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={POIDS.c1} />
          <Stop offset="0.55" stopColor={POIDS.c2} />
          <Stop offset="1" stopColor={POIDS.c3} />
        </LinearGradient>
        <LinearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={POIDS.c2} stopOpacity={0.2} />
          <Stop offset="0.6" stopColor={POIDS.c2} stopOpacity={0.06} />
          <Stop offset="1" stopColor={POIDS.c2} stopOpacity={0} />
        </LinearGradient>
      </Defs>
      {grid.map((gy) => (
        <Line key={gy} x1={0} x2={width} y1={gy} y2={gy} stroke={k.grid} strokeWidth={1} />
      ))}
      {band ? <Path d={band} fill={vert} fillOpacity={sombre ? 0.2 : 0.15} stroke={vert} strokeOpacity={sombre ? 0.3 : 0.22} strokeWidth={1} /> : null}
      <Reveal width={width} height={height} replayKey={`${points.length}|${width}`} duration={900}>
        <Path d={area} fill={`url(#${id}a)`} />
        <Path d={line} fill="none" stroke={`url(#${id}l)`} strokeWidth={10} strokeOpacity={0.13} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={line} fill="none" stroke={`url(#${id}l)`} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (p.x <= clearX && i < pts.length - 1 ? <Circle key={i} cx={p.x} cy={p.y} r={2.8} fill={k.card} stroke={POIDS.c2} strokeWidth={1.6} /> : null))}
      </Reveal>
      <Rect x={0} y={0} width={width} height={height} fill={`url(#${id})`} />
      {/* au-dessus du voile : ton rythme prevu en tirets verts, et ton point du jour en couleur */}
      {mid ? <Path d={mid} fill="none" stroke={sombre ? '#12141B' : '#FFFFFF'} strokeWidth={5.6} strokeOpacity={sombre ? 0.6 : 0.9} strokeDasharray="7 5" strokeLinecap="round" /> : null}
      {mid ? <Path d={mid} fill="none" stroke={vert} strokeWidth={2.6} strokeDasharray="7 5" strokeLinecap="round" /> : null}
      <Circle cx={last.x} cy={last.y} r={11} fill={pointCouleur} fillOpacity={0.18} />
      <Circle cx={last.x} cy={last.y} r={5.5} fill={POIDS.pointFond} stroke={pointCouleur} strokeWidth={3.2} />
    </Svg>
  );
}

export default VeiledCurve;
