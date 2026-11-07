/**
 * Ton chemin dans Ton plan (7 novembre 2026, audit de l'onboarding valide par Houari : « le graphique est presque vide »).
 * La ligne projetee de ton poids du jour a ton cap (par exemple 82 a 77 kg), et tes paliers poses dessus.
 * Les paliers et leur etat viennent de la meme logique que la carte Ton poids de l'accueil (lib/v2/accueil/lignePaliers.ts,
 * etatsLignePaliers) : au depart, le premier est le prochain, les autres sont a venir. Couleurs : celles des anneaux
 * de Sante (couleurActivite) : rose, vert citron, cyan, puis ton cap en encre. Seulement tes vrais chiffres.
 * Dessin fixe (pas d'animation de revelation) : la ligne se voit tout de suite, partout.
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { Ink } from '@/components/yoroi/v2/Ink';
import { couleurActivite } from '@/components/yoroi/v2/accueil/Visus';
import { etatsLignePaliers } from '@/lib/v2/accueil/lignePaliers';
import { kg, useColors } from './ui';
import { traduire } from '@/lib/i18n/tr';

const CLES = ['pas', 'exercice', 'energie-active'] as const;

/** La couleur d'un palier (0 a 2 : les anneaux de Sante) : le rond vif, et le texte lisible sur fond clair */
export function couleurPalier(i: number): { rond: string; texte: string } {
  const a = couleurActivite(CLES[Math.max(0, Math.min(2, i))]);
  return { rond: a.anneau, texte: a.ombre ?? a.texte };
}

/** Les paliers de ton chemin au depart (meme calcul que l'accueil), ton cap compris en dernier */
export function paliersDuPlan(start: number, target: number) {
  return etatsLignePaliers(start, target, start, 0, false).paliers;
}

type Pt = { x: number; y: number };
const bez = (p0: Pt, p1: Pt, p2: Pt, p3: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
  };
};

export function CheminPaliers({ start, target, width, height = 168, endLabel }: { start: number; target: number; width: number; height?: number; endLabel?: string | null }) {
  const c = useColors();
  const down = target < start;
  const padX = 14;
  const top = 30;
  const bottom = height - 34;
  const p0 = { x: padX, y: down ? top : bottom };
  const p3 = { x: width - padX - 6, y: down ? bottom : top };
  // la meme forme que la courbe de l'onboarding : un depart franc, une arrivee plus douce
  const p1 = { x: p0.x + (p3.x - p0.x) * 0.35, y: p0.y + (p3.y - p0.y) * 0.75 };
  const p2 = { x: p0.x + (p3.x - p0.x) * 0.62, y: p3.y };
  const d = `M${p0.x} ${p0.y} C ${p1.x} ${p1.y}, ${p2.x} ${p2.y}, ${p3.x} ${p3.y}`;
  const area = `${d} L${p3.x} ${bottom + 12} L${p0.x} ${bottom + 12} Z`;
  // le point de la ligne ou le poids atteint chaque palier
  const echantillons = Array.from({ length: 121 }, (_, k) => bez(p0, p1, p2, p3, k / 120));
  /** l'indice de l'echantillon ou le poids atteint un palier */
  const indicePour = (kgPalier: number): number => {
    const f = Math.abs(start - target) < 1e-6 ? 1 : (start - kgPalier) / (start - target);
    if (f >= 1 - 1e-6) return echantillons.length - 1;
    const yVise = p0.y + (p3.y - p0.y) * f;
    const k = echantillons.findIndex((q) => (p3.y - p0.y) * (q.y - yVise) >= 0);
    return k < 0 ? echantillons.length - 1 : k;
  };
  const pointPour = (kgPalier: number): Pt => echantillons[indicePour(kgPalier)];
  const paliers = paliersDuPlan(start, target);
  // chaque troncon prend la couleur franche du palier vers lequel il mene (le dernier, vers ton cap, en indigo)
  const bornes = [0, ...paliers.map((p) => indicePour(p.kg))];
  const troncons = paliers.map((_, i) => {
    const pts = echantillons.slice(bornes[i], Math.max(bornes[i] + 1, bornes[i + 1]) + 1);
    return { d: pts.map((q, k) => `${k ? 'L' : 'M'}${q.x.toFixed(1)} ${q.y.toFixed(1)}`).join(' '), couleur: i < 3 ? couleurPalier(i).rond : c.accent };
  });
  const label = traduire('De {0} kilos aujourd’hui à {1} kilos, paliers à {2}', kg(start), kg(target), paliers.slice(0, -1).map((p) => `${kg(p.kg)} kg`).join(', '));
  return (
    <View style={{ width, height }} accessible accessibilityLabel={label}>
      <Svg width={width} height={height}>
        <Line x1={p0.x} x2={p3.x} y1={p3.y} y2={p3.y} stroke={c.accent} strokeOpacity={0.55} strokeWidth={1.6} strokeDasharray="0.1 5" strokeLinecap="round" />
        <Path d={area} fill={c.accent} fillOpacity={0.08} />
        {troncons.map((t, i) => (
          <Path key={i} d={t.d} stroke={t.couleur} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" fill="none" />
        ))}
        <Circle cx={p0.x} cy={p0.y} r={5.5} fill={c.ink} stroke="#FFFFFF" strokeWidth={2} />
        {paliers.map((p, i) => {
          const q = pointPour(p.kg);
          const dernier = i === paliers.length - 1;
          if (dernier) return <Circle key={i} cx={q.x} cy={q.y} r={7.5} fill={c.ink} stroke="#FFFFFF" strokeWidth={2.5} />;
          const col = couleurPalier(i).rond;
          // le prochain palier porte un anneau autour de son rond, comme a l'accueil
          return (
            <React.Fragment key={i}>
              {p.etat === 'prochain' ? <Circle cx={q.x} cy={q.y} r={11} fill="none" stroke={col} strokeWidth={2.5} /> : null}
              <Circle cx={q.x} cy={q.y} r={6.5} fill={col} stroke="#FFFFFF" strokeWidth={2} />
            </React.Fragment>
          );
        })}
      </Svg>
      <View style={{ position: 'absolute', left: 0, top: p0.y - 28 }}>
        <Ink size={12.5} weight="black" color={c.ink}>{`${kg(start)} kg`}</Ink>
      </View>
      {paliers.map((p, i) => {
        const q = pointPour(p.kg);
        const dernier = i === paliers.length - 1;
        // les chiffres au dessus a droite de chaque rond (la ligne descend : la place y est libre)
        return dernier ? (
          <View key={i} style={{ position: 'absolute', right: 0, top: down ? q.y - 32 : q.y + 12, alignItems: 'flex-end' }}>
            <Ink size={13} weight="black" color={c.accent}>{`${kg(p.kg)} kg`}</Ink>
          </View>
        ) : (
          <View key={i} style={{ position: 'absolute', left: q.x + 8, top: down ? q.y - 26 : q.y + 10 }}>
            <Ink size={12} weight="black" color={couleurPalier(i).texte}>{kg(p.kg)}</Ink>
          </View>
        );
      })}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-between' }}>
        <Ink size={12} weight="bold" color={c.textSecondary}>{traduire('Aujourd’hui')}</Ink>
        {endLabel ? <Ink size={12} weight="bold" color={c.textSecondary}>{endLabel}</Ink> : null}
      </View>
    </View>
  );
}

export default CheminPaliers;
