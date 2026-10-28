/**
 * Ligne du temps de la coupe de poids jusqu'a la pesee officielle.
 * Trajectoire prevue en pointilles, pesees reelles au pinceau, et au bout,
 * la colonne des zones de securite : rythme sain, coupe d'eau encadree, danger.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { SAFE_WEEKLY_CUT, WATER_CUT_MAX, fmt } from '@/lib/v2/nutrition/formulas';
import { P } from './ui';
import { areaOf, brushPath, CHART, CHART_COLORS, EndDot, Reveal, SeriesLine } from '../charts/core';
import { traduire, LOCALE } from '@/lib/i18n/tr';

export type CutZone = 'safe' | 'water' | 'danger';

export function cutZones(current: number, target: number, daysLeft: number) {
  const fatReach = current - (SAFE_WEEKLY_CUT * Math.max(0, daysLeft)) / 7;
  const waterFloor = fatReach - current * WATER_CUT_MAX;
  const zone: CutZone = target >= fatReach ? 'safe' : target >= waterFloor ? 'water' : 'danger';
  return { fatReach, waterFloor, zone };
}

export const ZONE_TEXT: Record<CutZone, { title: string; text: string; color: string; soft: string }> = {
  safe: { title: traduire('Atteignable à un rythme sain'), text: traduire('Ton objectif tient avec une perte d’environ 1 kg par semaine au maximum.'), color: P.mossText, soft: P.mossSoft },
  water: { title: traduire('Demande une coupe d’eau'), text: traduire('Une partie devra passer par une coupe d’eau en fin de préparation. À faire encadré, jamais seul.'), color: P.goldDark, soft: P.goldSoft },
  danger: { title: traduire('Hors des limites de sécurité'), text: traduire('Cet objectif dépasse ce qu’on peut perdre sans danger d’ici la pesée. Demande conseil à un médecin du sport ou vise la catégorie supérieure.'), color: P.danger, soft: P.dangerSoft },
};

type Pt = { date: string; weight: number };

export function CutTimeline({ startDate, targetDate, startWeight, targetWeight, currentWeight, weights }: { startDate: string; targetDate: string; startWeight: number; targetWeight: number; currentWeight: number; weights: Pt[] }) {
  const [w, setW] = useState(0);
  const H = 210;
  const padL = 8;
  const padR = 74;
  const padT = 16;
  const padB = 30;
  const t0 = new Date(startDate).getTime();
  const t1 = Math.max(new Date(targetDate).getTime(), t0 + 86400000);
  const now = Date.now();
  const daysLeft = Math.max(0, Math.ceil((t1 - now) / 86400000));
  const z = cutZones(currentWeight, targetWeight, daysLeft);

  const pts = weights
    .filter((p) => p.weight > 0)
    .map((p) => ({ t: new Date(p.date).getTime(), v: p.weight }))
    .filter((p) => p.t >= t0 - 86400000 && p.t <= t1 + 86400000)
    .sort((a, b) => a.t - b.t);

  const values = [startWeight, targetWeight, currentWeight, z.waterFloor, ...pts.map((p) => p.v)];
  const maxV = Math.max(...values) + 0.6;
  const minV = Math.min(...values) - 0.6;
  const innerW = Math.max(10, w - padL - padR);
  const x = (t: number) => padL + ((Math.min(Math.max(t, t0), t1) - t0) / (t1 - t0)) * innerW;
  const y = (v: number) => padT + ((maxV - v) / (maxV - minV || 1)) * (H - padT - padB);

  // lissage monotone : la courbe passe par chaque pesee sans escalier
  const xyPts = pts.map((p) => ({ x: x(p.t), y: y(p.v) }));
  const path = xyPts.length > 1 ? brushPath(xyPts) : '';
  const area = areaOf(path, xyPts, H - padB);

  const colX = padL + innerW + 18;
  const colW = 16;
  const top = y(Math.min(currentWeight, maxV));
  const yFat = y(z.fatReach);
  const yWater = y(z.waterFloor);
  const bottom = H - padB;
  const nowX = x(now);
  const fmtD = (t: number) => new Date(t).toLocaleDateString(LOCALE, { day: 'numeric', month: 'short' });

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)} accessible accessibilityLabel={traduire("Ligne du temps de ta coupe : {0} kg aujourd’hui, objectif {1} kg à la pesée dans {2} jours. {3}.", fmt(currentWeight), fmt(targetWeight), daysLeft, ZONE_TEXT[z.zone].title)}>
      {w > 0 ? (
        <Svg width={w} height={H}>
          {/* ligne cible */}
          <Line x1={padL} x2={padL + innerW} y1={y(targetWeight)} y2={y(targetWeight)} stroke={P.accent} strokeOpacity={0.75} strokeWidth={1.6} strokeDasharray="0.1 5" strokeLinecap="round" />
          {/* trajectoire prevue */}
          <Line x1={x(t0)} y1={y(startWeight)} x2={x(t1)} y2={y(targetWeight)} stroke={CHART_COLORS.blue} strokeOpacity={0.45} strokeWidth={2.4} strokeDasharray="0.1 6" strokeLinecap="round" />
          {/* pesees reelles */}
          <Reveal width={w} height={H} replayKey={pts.length}>
            {path ? <SeriesLine line={path} area={area} color={CHART_COLORS.blue} /> : null}
            {pts.length === 1 ? <Circle cx={x(pts[0].t)} cy={y(pts[0].v)} r={4.5} fill={CHART_COLORS.blue} /> : null}
          </Reveal>
          {/* aujourd'hui */}
          {now >= t0 && now <= t1 ? (
            <>
              <Line x1={nowX} x2={nowX} y1={padT - 6} y2={bottom} stroke={P.ink2} strokeOpacity={0.35} strokeWidth={1} />
              <EndDot cx={nowX} cy={y(currentWeight)} color={CHART_COLORS.blue} />
            </>
          ) : null}
          {/* pesee : drapeau */}
          <Line x1={padL + innerW} x2={padL + innerW} y1={padT - 6} y2={bottom} stroke={P.ink} strokeWidth={2} />
          <Path d={`M${padL + innerW} ${padT - 6} h12 l-4 5 l4 5 h-12 z`} fill={P.accent} />
          {/* zones de securite */}
          <Rect x={colX} y={top} width={colW} height={Math.max(2, yFat - top)} rx={5} fill={P.moss} />
          <Rect x={colX} y={yFat + 2} width={colW} height={Math.max(2, yWater - yFat - 2)} rx={5} fill={P.gold} />
          <Rect x={colX} y={yWater + 2} width={colW} height={Math.max(2, bottom - yWater - 2)} rx={5} fill={P.danger} />
          <Circle cx={colX + colW / 2} cy={y(targetWeight)} r={8} fill={P.white} stroke={P.ink} strokeWidth={3} />
          <SvgText x={colX + colW + 6} y={y(targetWeight) + 4} fontSize={CHART.labelSize} fontFamily={CHART.labelFamily} fill={P.ink}>
            {fmt(targetWeight)}
          </SvgText>
          {/* dates */}
          <SvgText x={padL} y={H - 8} fontSize={CHART.axisSize} fontFamily={CHART.axisFamily} fill={P.ink2}>
            {fmtD(t0)}
          </SvgText>
          <SvgText x={padL + innerW} y={H - 8} fontSize={CHART.axisSize} fontFamily={CHART.labelFamily} fill={P.ink} textAnchor="end">
            {traduire("Pesée {0}", fmtD(t1))}
          </SvgText>
        </Svg>
      ) : (
        <View style={{ height: H }} />
      )}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 6 }}>
        <Legend color={P.ink} label={traduire("Tes pesées")} />
        <Legend color={P.accent} label={traduire("Objectif")} dashed />
        <Legend color={P.dashed} label={traduire("Trajectoire prévue")} dashed />
        <Legend color={P.moss} label={traduire("Sain")} />
        <Legend color={P.gold} label={traduire("Coupe d’eau")} />
        <Legend color={P.danger} label={traduire("Danger")} />
      </View>
    </View>
  );
}

function Legend({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
      <View style={{ width: 14, height: dashed ? 3 : 10, borderRadius: 3, backgroundColor: color }} />
      <Ink size={11} weight="bold" color={P.ink2}>
        {label}
      </Ink>
    </View>
  );
}
