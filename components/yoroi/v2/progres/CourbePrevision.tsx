/**
 * Petit graphique de la page Prédictions (courbe-pred) : tes 6 dernieres semaines (pesees en points, tendance
 * lissee en trait plein), puis ta prevision « a ton rythme actuel » en pointilles avec sa fourchette, et ta ligne
 * directrice en tirets verts qui finit pile sous le pied du torii (meme regle que la courbe du poids :
 * components/yoroi/v2/charts/CourbePoids.tsx). Torii plus loin que le graphique : une etiquette au bord droit.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line, Path, Text as SvgText } from 'react-native-svg';
import { fontFamilies } from '../../fonts';
import { brushPath } from '../charts/core';
import { ToriiImage, TORII_RATIO } from '../charts/ToriiImage';
import { POIDS } from '../charts/CourbePoids';
import { paletteSombre } from '@/components/yoroi/livePalette';
import { jourCourt, jourDe } from '@/lib/v2/pesee/ligneDirectrice';
import type { Prevision, Unite } from '@/lib/v2/pesee/predictions';
import { poidsTexte, versUnite } from '@/lib/v2/pesee/predictions';

const DAY = 86400000;
const TORII_W = 30;
const TORII_H = TORII_W / TORII_RATIO;
const AXIS = fontFamilies.medium;
const BOLD = fontFamilies.extraBold ?? fontFamilies.bold;
const MOIS_COURT = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

export function CourbePrevision({ passe, prev, unite, height = 230 }: { passe: { date: string; value: number; trend: number }[]; prev: Prevision; unite: Unite; height?: number }) {
  const [width, setWidth] = useState(0);
  const sombre = paletteSombre();
  const vert = sombre ? '#3FB27F' : POIDS.cap;

  const g = useMemo(() => {
    if (width <= 0) return null;
    const W = width;
    const GUT = 40;
    const left = 6;
    const right = W - GUT - 12;
    const top = 26;
    const base = height - 24;
    const today = prev.today;
    const t0 = jourDe(passe.length ? passe[0].date : today);
    const tE = jourDe(prev.courbe[prev.courbe.length - 1].date);
    const X = (iso: string) => left + ((jourDe(iso) - t0) / Math.max(DAY, tE - t0)) * (right - left);
    // la ligne directrice, d'aujourd'hui jusqu'au torii (ou au bord droit)
    const ligne = prev.courbe.filter((p) => p.ligne != null && (!prev.torii || p.date <= prev.torii));
    let lo = Infinity;
    let hi = -Infinity;
    const voir = (v: number) => {
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    };
    passe.forEach((p) => {
      voir(p.value);
      voir(p.trend);
    });
    prev.courbe.forEach((p) => {
      voir(p.bas);
      voir(p.haut);
    });
    ligne.forEach((p) => voir(p.ligne as number));
    if (prev.cap != null) voir(prev.cap);
    const pad = Math.max(0.4, (hi - lo) * 0.08);
    lo -= pad;
    hi += pad;
    const Y = (v: number) => top + ((hi - v) / (hi - lo || 1)) * (base - top);

    const tendance = passe.length > 1 ? brushPath(passe.map((p) => ({ x: X(p.date), y: Y(p.trend) }))) : '';
    const points = passe.map((p) => ({ x: X(p.date), y: Y(p.value) }));
    // un point tous les 2 jours suffit pour le dessin du futur
    const fut = prev.courbe.filter((_, i) => i % 2 === 0 || i === prev.courbe.length - 1);
    const bande = `M${fut.map((p) => `${X(p.date).toFixed(1)} ${Y(p.haut).toFixed(1)}`).join(' L')} L${[...fut].reverse().map((p) => `${X(p.date).toFixed(1)} ${Y(p.bas).toFixed(1)}`).join(' L')} Z`;
    const centre = `M${fut.map((p) => `${X(p.date).toFixed(1)} ${Y(p.valeur).toFixed(1)}`).join(' L')}`;
    let mid: string | null = null;
    let offset = 0;
    let fin: { x: number; y: number } | null = null;
    if (ligne.length > 1) {
      const pts = ligne.map((p) => ({ x: X(p.date), y: Y(p.ligne as number) }));
      mid = `M${pts.map((p) => `${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' L')}`;
      let long = 0;
      for (let k = 1; k < pts.length; k++) long += Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
      offset = ((7.5 - (long % 13)) + 13) % 13;
      const der = ligne[ligne.length - 1];
      if (prev.torii && der.date === prev.torii) fin = pts[pts.length - 1];
    }
    // torii plus loin que le graphique : etiquette au bord droit, au bout de la ligne
    const horsChamp = !!prev.torii && prev.torii > prev.courbe[prev.courbe.length - 1].date;
    const xAuj = X(today);
    const arr = prev.arrivee && prev.arrivee.date <= prev.courbe[prev.courbe.length - 1].date && prev.cap != null ? { x: X(prev.arrivee.date), y: Y(prev.cap) } : null;
    // 3 reperes
    // 3 reperes ronds dans ton unite
    const uLo = versUnite(lo, unite);
    const uHi = versUnite(hi, unite);
    const pasU = [0.5, 1, 2, 5, 10, 20].find((s) => (uHi - uLo) / s <= 4) ?? 50;
    const ticks: number[] = [];
    for (let v = Math.ceil(uLo / pasU) * pasU; v <= uHi; v += pasU) ticks.push(unite === 'lb' ? v / 2.20462 : v);
    const tickTxt = (t: number) => {
      const v = versUnite(t, unite);
      return Math.abs(v - Math.round(v)) < 0.01 ? String(Math.round(v)) : v.toFixed(1).replace('.', ',');
    };
    // mois
    const mois: { x: number; t: string }[] = [];
    const d = new Date(t0);
    const m = new Date(d.getFullYear(), d.getMonth() + 1, 1, 12);
    while (m.getTime() <= tE) {
      const x = left + ((m.getTime() - t0) / Math.max(DAY, tE - t0)) * (right - left);
      if (!mois.length || x - mois[mois.length - 1].x > 34) mois.push({ x, t: MOIS_COURT[m.getMonth()] });
      m.setMonth(m.getMonth() + 1);
    }
    return { W, GUT, base, top, right, Y, tickTxt, tendance, points, bande, centre, mid, offset, fin, horsChamp, xAuj, arr, ticks, mois, yFinLigne: ligne.length ? Y(ligne[ligne.length - 1].ligne as number) : null };
  }, [width, height, passe, prev, unite]);

  const derniere = prev.dates[prev.dates.length - 1];
  const a11y = `Ta prévision : ta tendance des dernières semaines, puis ${poidsTexte(derniere.valeur, unite)} ${derniere.label.toLowerCase()}, entre ${poidsTexte(derniere.bas, unite)} et ${poidsTexte(derniere.haut, unite)}${prev.torii && prev.cap != null ? `. Ta ligne arrive à ${poidsTexte(prev.cap, unite)} au torii, le ${jourCourt(prev.torii)}` : ''}.`;

  return (
    <View onLayout={(e) => setWidth(Math.round(e.nativeEvent.layout.width))} style={{ height }} accessible accessibilityRole="image" accessibilityLabel={a11y}>
      {g ? (
        <>
          <Svg width={g.W} height={height}>
            {g.ticks.map((t) => (
              <G key={`t${t}`}>
                <Line x1={0} x2={g.W - g.GUT + 4} y1={g.Y(t)} y2={g.Y(t)} stroke={POIDS.grille} strokeWidth={1} />
                <SvgText x={g.W} y={g.Y(t) + 4} textAnchor="end" fontSize={11} fontFamily={AXIS} fill={POIDS.axe}>
                  {g.tickTxt(t)}
                </SvgText>
              </G>
            ))}
            {/* aujourd'hui */}
            <Line x1={g.xAuj} x2={g.xAuj} y1={g.top - 8} y2={g.base} stroke={POIDS.encre} strokeOpacity={0.22} strokeWidth={1.2} strokeDasharray="3 4" />
            <SvgText x={g.xAuj} y={g.top - 12} textAnchor="middle" fontSize={10.5} fontFamily={BOLD} fill={POIDS.axe}>
              aujourd’hui
            </SvgText>
            {/* la fourchette, puis ta ligne, puis ta prevision */}
            <Path d={g.bande} fill={POIDS.c2} fillOpacity={sombre ? 0.2 : 0.13} />
            {g.mid ? <Path d={g.mid} fill="none" stroke={sombre ? '#12141B' : '#FFFFFF'} strokeWidth={6} strokeOpacity={0.9} strokeDasharray="8 5" strokeDashoffset={g.offset} strokeLinecap="round" /> : null}
            {g.mid ? <Path d={g.mid} fill="none" stroke={vert} strokeWidth={2.8} strokeDasharray="8 5" strokeDashoffset={g.offset} strokeLinecap="round" /> : null}
            {g.points.map((p, i) => (
              <Circle key={`p${i}`} cx={p.x} cy={p.y} r={2.4} fill={POIDS.c2} fillOpacity={0.35} />
            ))}
            {g.tendance ? <Path d={g.tendance} fill="none" stroke={POIDS.c2} strokeWidth={3.2} strokeLinecap="round" strokeLinejoin="round" /> : null}
            <Path d={g.centre} fill="none" stroke={POIDS.c3} strokeWidth={3} strokeDasharray="0.1 6" strokeLinecap="round" />
            {g.arr ? <Circle cx={g.arr.x} cy={g.arr.y} r={4.5} fill={POIDS.pointFond} stroke={POIDS.c3} strokeWidth={2.6} /> : null}
            {g.fin ? <Circle cx={g.fin.x} cy={g.fin.y} r={4} fill={vert} stroke={sombre ? '#12141B' : '#FFFFFF'} strokeWidth={1.6} /> : null}
            {g.fin && prev.torii ? (
              <SvgText x={Math.min(g.fin.x, g.W - g.GUT - 4)} y={g.fin.y + 16} textAnchor="middle" fontSize={11} fontFamily={BOLD} fill={POIDS.or}>
                {jourCourt(prev.torii)}
              </SvgText>
            ) : null}
            {g.horsChamp && prev.torii && g.yFinLigne != null ? (
              <SvgText x={g.W - g.GUT} y={Math.max(g.top, g.yFinLigne - 8)} textAnchor="end" fontSize={11} fontFamily={BOLD} fill={POIDS.or}>
                {`torii le ${jourCourt(prev.torii)} ›`}
              </SvgText>
            ) : null}
            {g.mois.map((m) => (
              <SvgText key={`m${m.t}${m.x.toFixed(0)}`} x={m.x} y={height - 4} textAnchor="middle" fontSize={11} fontFamily={AXIS} fill={POIDS.axe}>
                {m.t}
              </SvgText>
            ))}
          </Svg>
          {g.fin ? (
            <View pointerEvents="none" style={{ position: 'absolute', left: g.fin.x - TORII_W / 2, top: g.fin.y + 1.5 - TORII_H }}>
              <ToriiImage width={TORII_W} />
            </View>
          ) : null}
        </>
      ) : null}
    </View>
  );
}
