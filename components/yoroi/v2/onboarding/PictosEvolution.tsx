/**
 * Pictos de l'ecran « Tout au meme endroit » (15 octobre 2026) : l'evolution du suivi, dessinee a l'encre
 * sur papier dans les teintes de l'onboarding. Carnet papier, tableur, trois apps. Ni emoji ni texte.
 * Chaque picto se dessine dans un carre de 64 (viewBox 0 0 64 64), sur sa propre vignette papier.
 */
import React from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { ENCRES } from './couleurs';

const ENCRE = '#1D2029';
const PAPIER = '#FBFAF6';
const GRIS = '#B9BAC0';

type P = { size?: number };

/** Un carnet a spirale, des lignes griffonnees, un crayon pose en travers */
export function PictoCarnet({ size = 64 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <G transform="rotate(-6 32 32)">
        <Rect x={14} y={10} width={34} height={44} rx={4} fill={PAPIER} stroke={ENCRE} strokeWidth={2.2} />
        <Rect x={14} y={10} width={7} height={44} rx={3} fill={ENCRES.or.fond} stroke={ENCRE} strokeWidth={2.2} />
        {[16, 24, 32, 40, 48].map((y) => (
          <Circle key={y} cx={17.5} cy={y} r={1.6} fill={ENCRE} />
        ))}
        <Path d="M25 20 q4 -2 8 0 t8 0 t5 -1" stroke={GRIS} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M25 27 q4 -2 8 0 t8 0" stroke={GRIS} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M25 34 q3 -2 6 0 t6 0 t6 0" stroke={GRIS} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Path d="M25 41 q4 -2 8 0" stroke={GRIS} strokeWidth={2} fill="none" strokeLinecap="round" />
      </G>
      <G transform="rotate(38 44 44)">
        <Rect x={30} y={41} width={24} height={6} rx={1.5} fill={ENCRES.or.ink} stroke={ENCRE} strokeWidth={1.8} />
        <Path d="M54 41 l6 3 -6 3 z" fill={PAPIER} stroke={ENCRE} strokeWidth={1.8} strokeLinejoin="round" />
        <Rect x={27} y={41} width={4} height={6} rx={1} fill={ENCRES.vermillon.ink} stroke={ENCRE} strokeWidth={1.6} />
      </G>
    </Svg>
  );
}

/** Une feuille de tableur : en-tete teinte, grille, quelques cases remplies */
export function PictoTableur({ size = 64 }: P) {
  const cols = [10, 24, 38, 54];
  const rows = [12, 21, 29, 37, 45, 53];
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={10} y={12} width={44} height={41} rx={4} fill={PAPIER} stroke={ENCRE} strokeWidth={2.2} />
      <Rect x={10} y={12} width={44} height={9} rx={3} fill={ENCRES.mousse.fond} stroke={ENCRE} strokeWidth={2.2} />
      {cols.slice(1, -1).map((x) => (
        <Line key={`c${x}`} x1={x} y1={12} x2={x} y2={53} stroke={ENCRE} strokeWidth={1.4} />
      ))}
      {rows.slice(2, -1).map((y) => (
        <Line key={`r${y}`} x1={10} y1={y} x2={54} y2={y} stroke={ENCRE} strokeWidth={1.2} opacity={0.55} />
      ))}
      <Rect x={26} y={23} width={10} height={4} rx={1} fill={ENCRES.mousse.ink} opacity={0.75} />
      <Rect x={40} y={31} width={11} height={4} rx={1} fill={ENCRES.mousse.ink} opacity={0.75} />
      <Rect x={26} y={39} width={7} height={4} rx={1} fill={ENCRES.mousse.ink} opacity={0.75} />
      <Rect x={13} y={23} width={8} height={4} rx={1} fill={GRIS} />
      <Rect x={13} y={31} width={8} height={4} rx={1} fill={GRIS} />
      <Rect x={13} y={39} width={8} height={4} rx={1} fill={GRIS} />
      <Rect x={13} y={47} width={8} height={4} rx={1} fill={GRIS} />
      {/* une case encore vide, entouree : le soir, il reste a remplir */}
      <Rect x={39} y={46} width={13} height={6} rx={1.5} fill="none" stroke={ENCRES.vermillon.ink} strokeWidth={1.8} strokeDasharray="2.5 2" />
    </Svg>
  );
}

/** Trois icones d'apps qui ne se parlent pas : une courbe, une haltere, un chrono */
export function PictoTroisApps({ size = 64 }: P) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      {/* app de poids */}
      <G transform="rotate(-10 18 22)">
        <Rect x={6} y={10} width={24} height={24} rx={7} fill={ENCRES.sarcelle.fond} stroke={ENCRE} strokeWidth={2.2} />
        <Path d="M11 27 l5 -6 4 3 6 -8" stroke={ENCRES.sarcelle.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {/* app de seances */}
      <G transform="rotate(8 46 22)">
        <Rect x={34} y={10} width={24} height={24} rx={7} fill={ENCRES.indigo.fond} stroke={ENCRE} strokeWidth={2.2} />
        <Line x1={40} y1={22} x2={52} y2={22} stroke={ENCRES.indigo.ink} strokeWidth={2.4} strokeLinecap="round" />
        <Rect x={38} y={17.5} width={3.5} height={9} rx={1.2} fill={ENCRES.indigo.ink} />
        <Rect x={50.5} y={17.5} width={3.5} height={9} rx={1.2} fill={ENCRES.indigo.ink} />
      </G>
      {/* app de chrono */}
      <G transform="rotate(-4 32 46)">
        <Rect x={20} y={34} width={24} height={24} rx={7} fill={ENCRES.vermillon.fond} stroke={ENCRE} strokeWidth={2.2} />
        <Circle cx={32} cy={47} r={7} fill="none" stroke={ENCRES.vermillon.ink} strokeWidth={2.2} />
        <Path d="M32 43.5 v3.5 l2.5 2" stroke={ENCRES.vermillon.ink} strokeWidth={2} fill="none" strokeLinecap="round" />
        <Line x1={30} y1={38.5} x2={34} y2={38.5} stroke={ENCRES.vermillon.ink} strokeWidth={2} strokeLinecap="round" />
      </G>
      {/* les fils coupes entre elles : rien ne se parle */}
      <Path d="M30 24 l3 -1" stroke={GRIS} strokeWidth={2} strokeLinecap="round" />
      <Path d="M24 36 l2 -2" stroke={GRIS} strokeWidth={2} strokeLinecap="round" />
      <Path d="M40 36 l-2 -2" stroke={GRIS} strokeWidth={2} strokeLinecap="round" />
    </Svg>
  );
}
