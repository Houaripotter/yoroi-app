/**
 * Hypnogramme de la nuit : une ligne par phase (Eveil, Paradoxal, Leger, Profond), blocs arrondis
 * relies par des transitions fines, axe des heures. Toucher ou glisser montre l'heure et la phase.
 */
import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import type { GestureResponderEvent } from 'react-native';
import Svg, { Circle, Line, Rect } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '@/components/yoroi/livePalette';
import { useYoroiTheme } from '@/components/yoroi/YoroiThemeProvider';
import type { PhaseNuit, SegmentNuit } from '@/lib/v2/sante/nuit';
import { MARGE_DROITE, NOM_LIGNE, ORDRE_LIGNES, couleursPhases, domaineHeures, heure } from './outils';

const LIGNE = 50;
const BLOC_Y = 21;
const BLOC_H = 23;
const AXE = 22;

const NOM_LONG: Record<PhaseNuit, string> = {
  eveil: 'éveil',
  paradoxal: 'sommeil paradoxal',
  leger: 'sommeil léger',
  profond: 'sommeil profond',
  endormi: 'sommeil sans phase précisée',
};

export function Hypnogramme({ segments, debut, fin }: { segments: SegmentNuit[]; debut: number; fin: number }) {
  const { isDark } = useYoroiTheme();
  const col = couleursPhases(isDark);
  const [w, setW] = useState(0);
  const [x, setX] = useState<number | null>(null);

  const lignes = useMemo(() => {
    const vues = new Set(segments.map((s) => s.phase));
    const etapes = vues.has('profond') || vues.has('leger') || vues.has('paradoxal');
    return ORDRE_LIGNES.filter((p) => vues.has(p) || (etapes && p !== 'endormi') || p === 'eveil');
  }, [segments]);
  const rang = (p: PhaseNuit) => lignes.indexOf(p);

  const { t0, t1, ticks } = domaineHeures(debut, fin);
  const plot = Math.max(1, w - MARGE_DROITE);
  const sx = (t: number) => ((t - t0) / (t1 - t0)) * plot;
  const H = lignes.length * LIGNE;

  const choisi = useMemo(() => {
    if (x === null || !w) return null;
    const t = t0 + (Math.min(Math.max(x, 0), plot) / plot) * (t1 - t0);
    if (t < debut || t > fin) return { t, seg: null as SegmentNuit | null };
    let seg = segments.find((s) => t >= s.debut && t < s.fin) ?? null;
    if (!seg) {
      // entre deux blocs (trou de donnees) : le plus proche
      let best = Infinity;
      for (const s of segments) {
        const d = Math.min(Math.abs(t - s.debut), Math.abs(t - s.fin));
        if (d < best) {
          best = d;
          seg = s;
        }
      }
    }
    return { t, seg };
  }, [x, w, t0, t1, plot, debut, fin, segments]);

  const toucher = (e: GestureResponderEvent) => setX(e.nativeEvent.locationX);

  const resume = `Phases de la nuit, de ${heure(debut)} à ${heure(fin)}. Touche le graphique pour lire l'heure et la phase.`;

  return (
    <View style={{ gap: 10 }}>
      <View style={{ minHeight: 20, justifyContent: 'center' }}>
        {choisi ? (
          <Ink size={14} weight="extraBold" numberOfLines={1}>
            {choisi.seg ? `${heure(choisi.t)}, ${NOM_LONG[choisi.seg.phase]}` : heure(choisi.t)}
            {choisi.seg ? (
              <Ink size={13} weight="bold" color={P.muted}>
                {`  de ${heure(choisi.seg.debut)} à ${heure(choisi.seg.fin)}`}
              </Ink>
            ) : null}
          </Ink>
        ) : (
          <Ink size={13} weight="bold" color={P.muted} numberOfLines={1}>
            Touche le graphique pour lire la phase
          </Ink>
        )}
      </View>
      <View
        onLayout={(e) => setW(Math.round(e.nativeEvent.layout.width))}
        style={{ height: H + AXE }}
        accessible
        accessibilityRole="image"
        accessibilityLabel={resume}
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
            {/* lignes des phases */}
            {lignes.map((_, i) => (
              <Line key={`l${i}`} x1={0} x2={plot} y1={i * LIGNE + 0.5} y2={i * LIGNE + 0.5} stroke={P.line2} strokeWidth={1} />
            ))}
            <Line x1={0} x2={plot} y1={H - 0.5} y2={H - 0.5} stroke={P.line} strokeWidth={1} />
            {/* heures */}
            {ticks.map((t) => (
              <Line key={`t${t}`} x1={Math.round(sx(t)) + 0.5} x2={Math.round(sx(t)) + 0.5} y1={0} y2={H} stroke={P.line} strokeWidth={1} strokeDasharray="2 3" />
            ))}
            {/* transitions fines entre deux phases qui se suivent */}
            {segments.map((s, i) => {
              if (i === 0) return null;
              const p = segments[i - 1];
              if (p.fin !== s.debut || p.phase === s.phase) return null;
              const a = rang(p.phase);
              const b = rang(s.phase);
              if (a < 0 || b < 0) return null;
              const y0 = Math.min(a, b) * LIGNE + BLOC_Y + BLOC_H / 2;
              const y1 = Math.max(a, b) * LIGNE + BLOC_Y + BLOC_H / 2;
              const xx = sx(s.debut);
              return <Line key={`x${i}`} x1={xx} x2={xx} y1={y0} y2={y1} stroke={P.dashed} strokeOpacity={0.55} strokeWidth={1} />;
            })}
            {/* blocs */}
            {segments.map((s, i) => {
              const r = rang(s.phase);
              if (r < 0) return null;
              const x0 = sx(s.debut);
              const ww = Math.max(1.5, sx(s.fin) - x0);
              return <Rect key={`b${i}`} x={x0} y={r * LIGNE + BLOC_Y} width={ww} height={BLOC_H} rx={Math.min(5, ww / 2)} ry={Math.min(5, ww / 2)} fill={col[s.phase]} />;
            })}
            {/* curseur */}
            {choisi ? (
              <>
                <Line x1={Math.min(Math.max(x ?? 0, 0), plot)} x2={Math.min(Math.max(x ?? 0, 0), plot)} y1={0} y2={H} stroke={P.ink} strokeWidth={1.5} />
                {choisi.seg && rang(choisi.seg.phase) >= 0 ? (
                  <Circle cx={Math.min(Math.max(x ?? 0, 0), plot)} cy={rang(choisi.seg.phase) * LIGNE + BLOC_Y + BLOC_H / 2} r={5} fill={col[choisi.seg.phase]} stroke={P.white} strokeWidth={2} />
                ) : null}
              </>
            ) : null}
          </Svg>
        ) : null}
        {/* noms des lignes et heures, en texte de l'app */}
        {w > 0
          ? lignes.map((p, i) => (
              <Ink key={`n${p}`} size={11} weight="bold" color={P.muted} style={{ position: 'absolute', left: 0, top: i * LIGNE + 4 }}>
                {NOM_LIGNE[p]}
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
