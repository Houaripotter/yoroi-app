/**
 * Barres min et max par tranche horaire (le coeur pendant la nuit, comme Sante).
 * Meme echelle de temps et meme marge que l'hypnogramme : les heures tombent au meme pixel.
 */
import React, { useState } from 'react';
import { View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/livePalette';
import type { TrancheFC } from '@/lib/v2/sante/nuit';
import { MARGE_DROITE, domaineHeures, heure } from './outils';

const H = 112;
const AXE = 22;
const BARRE = 6;

function echelle(min: number, max: number): number[] {
  const pas = max - min > 30 ? 20 : 10;
  const lo = Math.floor((min - 2) / pas) * pas;
  let hi = Math.ceil((max + 2) / pas) * pas;
  if (hi - lo < pas * 2) hi = lo + pas * 2;
  const out: number[] = [];
  for (let v = lo; v <= hi; v += pas) out.push(v);
  return out;
}

export function BarresMinMax({ tranches, debut, fin, couleur, unite, decimales = 0 }: { tranches: TrancheFC[]; debut: number; fin: number; couleur: string; unite: string; decimales?: number }) {
  const [w, setW] = useState(0);
  const [x, setX] = useState<number | null>(null);
  const { t0, t1, ticks } = domaineHeures(debut, fin);
  const plot = Math.max(1, w - MARGE_DROITE);
  const sx = (t: number) => ((t - t0) / (t1 - t0)) * plot;
  const graduations = echelle(Math.min(...tranches.map((t) => t.min)), Math.max(...tranches.map((t) => t.max)));
  const lo = graduations[0];
  const hi = graduations[graduations.length - 1];
  const sy = (v: number) => 6 + (1 - (v - lo) / (hi - lo)) * (H - 12);
  const fmt = (v: number) => v.toFixed(decimales).replace('.', ',');

  const choisi = x === null ? null : tranches.reduce<TrancheFC | null>((best, t) => {
    const c = sx(Math.max(t.debut, debut) + (Math.min(t.fin, fin) - Math.max(t.debut, debut)) / 2);
    const bc = best ? sx(Math.max(best.debut, debut) + (Math.min(best.fin, fin) - Math.max(best.debut, debut)) / 2) : Infinity;
    return Math.abs(c - x) < Math.abs(bc - x) ? t : best;
  }, null);
  const toucher = (e: GestureResponderEvent) => setX(e.nativeEvent.locationX);

  return (
    <View style={{ gap: 8 }}>
      <View style={{ minHeight: 18, justifyContent: 'center' }}>
        {choisi ? (
          <Ink size={13} weight="extraBold" numberOfLines={1}>
            {`De ${heure(Math.max(choisi.debut, debut))} à ${heure(Math.min(choisi.fin, fin))} : ${choisi.min === choisi.max ? fmt(choisi.min) : `${fmt(choisi.min)} à ${fmt(choisi.max)}`} ${unite}`}
          </Ink>
        ) : null}
      </View>
      <View
        onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
        style={{ height: H + AXE }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={`Par heure, du minimum au maximum, en ${unite}. Touche le graphique pour lire une heure.`}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onResponderGrant={toucher}
        onResponderMove={toucher}
        onResponderRelease={() => setX(null)}
        onResponderTerminate={() => setX(null)}
      >
        {w > 0 ? (
          <Svg width={w} height={H + AXE}>
            {graduations.map((g) => (
              <Line key={`g${g}`} x1={0} x2={plot} y1={Math.round(sy(g)) + 0.5} y2={Math.round(sy(g)) + 0.5} stroke={g === lo ? P.line : P.line2} strokeWidth={1} />
            ))}
            {ticks.map((t) => (
              <Line key={`t${t}`} x1={Math.round(sx(t)) + 0.5} x2={Math.round(sx(t)) + 0.5} y1={0} y2={sy(lo)} stroke={P.line} strokeWidth={1} strokeDasharray="2 3" />
            ))}
            {tranches.map((t) => {
              const a = Math.max(t.debut, debut);
              const b = Math.min(t.fin, fin);
              const cx = sx(a + (b - a) / 2);
              const actif = !choisi || choisi === t;
              if (t.max - t.min < 0.5) return <Circle key={t.debut} cx={cx} cy={sy(t.max)} r={BARRE / 2 + 0.5} fill={couleur} opacity={actif ? 1 : 0.35} />;
              const y0 = sy(t.max);
              const hh = Math.max(BARRE, sy(t.min) - y0);
              return <Rect key={t.debut} x={cx - BARRE / 2} y={y0} width={BARRE} height={hh} rx={BARRE / 2} ry={BARRE / 2} fill={couleur} opacity={actif ? 1 : 0.35} />;
            })}
          </Svg>
        ) : null}
        {w > 0
          ? graduations.map((g) => (
              <Ink key={`v${g}`} size={11} weight="bold" color={P.muted} style={{ position: 'absolute', right: 0, top: sy(g) - 8, width: MARGE_DROITE - 4, textAlign: 'right' }}>
                {fmt(g)}
              </Ink>
            ))
          : null}
        {w > 0
          ? ticks.map((t) => (
              <Ink key={`h${t}`} size={11} weight="bold" color={P.muted} style={{ position: 'absolute', top: H + 5, left: Math.round(sx(t)) - 20, width: 40, textAlign: 'center' }}>
                {`${new Date(t).getHours()} h`}
              </Ink>
            ))
          : null}
      </View>
    </View>
  );
}
