/**
 * Illustrations des messages (15 octobre 2026) : dessinees a l'encre sur papier, dans le style des pictos
 * de l'onboarding (components/yoroi/v2/onboarding/PictosEvolution.tsx). Meme trait (2,2), memes coins
 * arrondis, memes teintes d'encre. Ni emoji ni texte.
 * Chaque illustration se dessine dans un carre de 64 (viewBox 0 0 64 64).
 * Avec `disque`, elle pose sur un disque papier (utile sur fond blanc ou sombre).
 */
import React from 'react';
import Svg, { Circle, G, Line, Path, Rect } from 'react-native-svg';
import { ENCRES } from '@/components/yoroi/v2/onboarding/couleurs';

export const ENCRE = '#1D2029';
export const PAPIER = '#FBFAF6';
export const GRIS = '#B9BAC0';
export const DISQUE = '#EFEDE5';

type Props = { size?: number; disque?: boolean };

function Disque({ on }: { on?: boolean }) {
  return on ? <Circle cx={32} cy={32} r={31} fill={DISQUE} /> : null;
}

/** Nuage arrondi (bas plat), meme dessin partout ; son centre est vers (43, 23) */
function Nuage({ fill = PAPIER, sw = 2.2 }: { fill?: string; sw?: number }) {
  return <Path d="M31 30 H53 A7 7 0 0 0 53 16 A10 10 0 0 0 34 19 A5.6 5.6 0 0 0 31 30 Z" fill={fill} stroke={ENCRE} strokeWidth={sw} strokeLinejoin="round" />;
}

/** Sauvegarde : ton telephone envoie une copie scellee dans ton nuage */
export function IllusSauvegarde({ size = 64, disque }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Disque on={disque} />
      {/* le telephone, un peu penche, avec ta courbe a l'ecran */}
      <G transform="rotate(-8 20 43)">
        <Rect x={10} y={28} width={20} height={31} rx={5} fill={PAPIER} stroke={ENCRE} strokeWidth={2.2} />
        <Rect x={13.5} y={32.5} width={13} height={21} rx={2.5} fill={ENCRES.indigo.fond} />
        <Path d="M15.5 48.5 l3 -4 3 2 4 -6.5" stroke={ENCRES.indigo.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Line x1={17.5} y1={30.3} x2={22.5} y2={30.3} stroke={ENCRE} strokeWidth={1.8} strokeLinecap="round" />
      </G>
      {/* le chemin de la copie */}
      <Path d="M15 23 C14 16 18.5 12.5 24.5 13.5" stroke={ENCRES.indigo.ink} strokeWidth={2} fill="none" strokeLinecap="round" strokeDasharray="2.6 3.2" />
      <Path d="M21.8 10.6 L25.2 13.6 L21.6 16.4" stroke={ENCRES.indigo.ink} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      {/* le nuage et son sceau */}
      <G transform="translate(1 4)">
        <Nuage />
        <Circle cx={43} cy={23.5} r={5.2} fill={ENCRES.vermillon.ink} />
        <Path d="M40.6 23.6 l1.8 1.9 3.3 -3.7" stroke={PAPIER} strokeWidth={1.9} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </G>
      {/* deux petites etincelles */}
      <Path d="M49 44 v5 M46.5 46.5 h5" stroke={ENCRES.or.ink} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={39.5} cy={45} r={1.4} fill={ENCRES.or.ink} />
    </Svg>
  );
}

/** Copie faite : le nuage scelle, une coche */
export function IllusCopieFaite({ size = 64, disque }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Disque on={disque} />
      <G transform="translate(-21.75 3.25) scale(1.25)">
        <Nuage fill={ENCRES.mousse.fond} sw={1.8} />
      </G>
      <Circle cx={32} cy={33} r={6.5} fill={ENCRES.mousse.ink} />
      <Path d="M29 33.1 l2.1 2.3 4.1 -4.6" stroke={PAPIER} strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M50 12 v5 M47.5 14.5 h5" stroke={ENCRES.or.ink} strokeWidth={1.8} strokeLinecap="round" />
      <Circle cx={15} cy={21} r={1.5} fill={ENCRES.or.ink} />
    </Svg>
  );
}

/** Sante : un coeur et son pouls qui file jusqu'a la montre */
export function IllusSante({ size = 64, disque }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Disque on={disque} />
      <G transform="translate(-1 6) scale(2.2)">
        <Path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" fill={ENCRES.vermillon.fond} stroke={ENCRE} strokeWidth={1} strokeLinejoin="round" />
      </G>
      <Path d="M4 32 h8 l3 -5 4 11 4 -15 3 9 h5" stroke={ENCRES.vermillon.ink} strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M37 32 h4" stroke={GRIS} strokeWidth={2} strokeLinecap="round" strokeDasharray="2.2 2.6" />
      {/* la montre */}
      <Rect x={46} y={20} width={9} height={6} rx={1.6} fill={ENCRES.indigo.fond} stroke={ENCRE} strokeWidth={1.8} />
      <Rect x={46} y={38} width={9} height={6} rx={1.6} fill={ENCRES.indigo.fond} stroke={ENCRE} strokeWidth={1.8} />
      <Rect x={42.5} y={24.5} width={16} height={15} rx={4.5} fill={PAPIER} stroke={ENCRE} strokeWidth={2.2} />
      <Path d="M46 32 h2 l1.3 -2.5 1.8 5 1.3 -2.5 h2" stroke={ENCRES.indigo.ink} strokeWidth={1.7} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Rappels : une cloche et une petite horloge, a ton heure */
export function IllusRappels({ size = 64, disque }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Disque on={disque} />
      <G transform="translate(1 3) scale(2.2)">
        <Path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z" fill={ENCRES.or.fond} stroke={ENCRE} strokeWidth={1} strokeLinejoin="round" />
        <Path d="M10 20a2 2 0 0 0 4 0" fill="none" stroke={ENCRE} strokeWidth={1} strokeLinecap="round" />
      </G>
      <Path d="M27 7.5 v3" stroke={ENCRE} strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M8 16 q-3 5 -1.5 11" stroke={GRIS} strokeWidth={2} fill="none" strokeLinecap="round" />
      <Path d="M13 13 q-2 3 -1 7" stroke={GRIS} strokeWidth={2} fill="none" strokeLinecap="round" />
      {/* l'horloge */}
      <Circle cx={47} cy={45} r={11} fill={ENCRES.indigo.fond} stroke={ENCRE} strokeWidth={2.2} />
      <Path d="M47 39 v6 l4 2.4" stroke={ENCRES.indigo.ink} strokeWidth={2.2} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

/** Erreur douce : un rouleau de papier avec un petit noeud, rien n'est perdu */
export function IllusAbri({ size = 64, disque }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Disque on={disque} />
      <Path d="M32 8 l18 6.5 v13 c0 11 -7.5 19.5 -18 23 c-10.5 -3.5 -18 -12 -18 -23 v-13 z" fill={ENCRES.sarcelle.fond} stroke={ENCRE} strokeWidth={2.2} strokeLinejoin="round" />
      <Rect x={23} y={22} width={18} height={20} rx={3} fill={PAPIER} stroke={ENCRE} strokeWidth={2} />
      <Path d="M27 28 h10 M27 32.5 h10 M27 37 h6" stroke={GRIS} strokeWidth={2} strokeLinecap="round" />
      <Circle cx={41} cy={42} r={5} fill={ENCRES.sarcelle.ink} />
      <Path d="M38.8 42.1 l1.6 1.7 3 -3.4" stroke={PAPIER} strokeWidth={1.8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}
