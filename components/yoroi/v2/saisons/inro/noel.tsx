/**
 * Noel, repris de l'app INRO de Houari (18 octobre 2026, v5).
 *
 * Source dans INRO : components/seasonal/ChristmasDecor.tsx : l'ampoule de la guirlande (Bulb), le sapin decore
 * dont l'etoile scintille, les etoiles et les flocons qui jaillissent du sapin (Spark), les cadeaux, le Pere Noel
 * sur son traineau tire par trois rennes au galop (SantaSleigh), et le bonhomme de neige qui fait coucou
 * (HeroGifts).
 *
 * Les dessins sont ceux d'INRO, trait pour trait. Seuls changent : les imports, et les animations, qui suivent
 * l'horloge `temps` des calques YOROI au lieu de withRepeat, avec les memes courbes (./mouvements.ts).
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { vaEtVient } from './mouvements';

type Temps = SharedValue<number>;

export const COULEURS_AMPOULES = ['#EF4444', '#22C55E', '#FACC15', '#3B82F6', '#EC4899'];

/** L'ampoule de la guirlande d'INRO (12 x 18), mise a la hauteur h */
export function AmpouleInro({ couleur, h = 18 }: { couleur: string; h?: number }) {
  return (
    <Svg width={(h * 12) / 18} height={h} viewBox="0 0 12 18">
      <Rect x={3.5} y={0} width={5} height={4} rx={1} fill="#4B5563" />
      <Ellipse cx={6} cy={11} rx={5} ry={6.5} fill={couleur} />
      <Ellipse cx={4.2} cy={9} rx={1.4} ry={2.2} fill="rgba(255,255,255,0.6)" />
    </Svg>
  );
}
/** Le fil de la guirlande d'INRO */
export const FIL_GUIRLANDE = { couleur: '#14532D', epaisseur: 1.4 };

const ETOILE = 'M10 1 L12.6 7.2 L19 7.6 L14 11.8 L15.6 18.4 L10 14.8 L4.4 18.4 L6 11.8 L1 7.6 L7.4 7.2 Z';

/** Le grand sapin d'INRO (54 x 70) ; l'etoile du sommet scintille (aller retour de 0,9 s) ; largeur 54 / 70 de h */
export function SapinInro({ h, temps, phase = 0 }: { h: number; temps: Temps; phase?: number }) {
  const k = h / 70;
  const etoile = useAnimatedStyle(() => {
    const g = temps.value > 0 ? vaEtVient(temps.value, 0.9, phase) : 1;
    return { opacity: 0.7 + g * 0.3, transform: [{ scale: 0.9 + g * 0.15 }] };
  });
  return (
    <View style={{ width: 54 * k, height: h }}>
      <Svg width={54 * k} height={h} viewBox="0 0 54 70">
        <Rect x={23} y={58} width={8} height={10} rx={1.5} fill="#78350F" />
        <Path d="M27 8 L46 34 L36 34 L50 52 L4 52 L18 34 L8 34 Z" fill="#15803D" />
        <Path d="M27 8 L46 34 L36 34 L50 52 L27 52 Z" fill="#166534" />
        <Path d="M8 52 L50 52 L50 59 L4 59 Z" fill="#14532D" opacity={0.5} />
        <Path d="M14 40 C22 44 32 44 42 38" stroke="#FACC15" strokeWidth={1.4} fill="none" />
        <Path d="M19 26 C25 29 31 29 36 25" stroke="#FACC15" strokeWidth={1.4} fill="none" />
        <Circle cx={18} cy={45} r={2.6} fill="#EF4444" />
        <Circle cx={33} cy={47} r={2.6} fill="#3B82F6" />
        <Circle cx={26} cy={34} r={2.4} fill="#EC4899" />
        <Circle cx={38} cy={41} r={2.2} fill="#FACC15" />
        <Circle cx={22} cy={22} r={2} fill="#EF4444" />
      </Svg>
      <Animated.View style={[{ position: 'absolute', top: -3 * k, left: 18 * k, width: 18 * k, height: 18 * k }, etoile]}>
        <Svg width={18 * k} height={18 * k} viewBox="0 0 20 20">
          <Path d={ETOILE} fill="#FACC15" stroke="#F59E0B" strokeWidth={0.8} />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** L'etoile qui jaillit du sapin d'INRO */
export function EtoileInro({ taille = 20, couleur = '#FACC15' }: { taille?: number; couleur?: string }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 20 20">
      <Path d={ETOILE} fill={couleur} />
    </Svg>
  );
}

/** Le flocon qui jaillit du sapin d'INRO */
export function FloconInro({ taille = 20 }: { taille?: number }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 20 20">
      <Path d="M10 1 V19 M2 5.5 L18 14.5 M2 14.5 L18 5.5 M7 2.5 L10 5 L13 2.5 M7 17.5 L10 15 L13 17.5" stroke="#93C5FD" strokeWidth={1.8} strokeLinecap="round" fill="none" />
    </Svg>
  );
}

/** Les cadeaux d'INRO : paquet, ruban, couvercle et noeud ; les trois couleurs d'INRO */
export const CADEAUX_INRO = [
  { corps: '#22C55E', ruban: '#FACC15', couvercle: '#16A34A' },
  { corps: '#EF4444', ruban: '#FFFFFF', couvercle: '#DC2626' },
  { corps: '#3B82F6', ruban: '#FACC15', couvercle: '#2563EB' },
];

export function CadeauInro({ taille, corps, ruban, couvercle }: { taille: number; corps: string; ruban: string; couvercle: string }) {
  return (
    <Svg width={taille} height={taille} viewBox="0 0 20 20">
      <Rect x={1} y={6} width={18} height={13} rx={2} fill={corps} />
      <Rect x={9} y={6} width={2.5} height={13} fill={ruban} />
      <Rect x={0} y={4} width={20} height={4} rx={1.5} fill={couvercle} />
      <Path d="M10 4 C7 0 4 2 7 4 M10.5 4 C13 0 16 2 13 4" stroke={ruban} strokeWidth={1.6} fill="none" />
    </Svg>
  );
}

// ── Pere Noel sur son traineau, tire par trois rennes ───────────────────────

/** Le galop d'INRO : un tour en 0,42 s */
export function galop(t: number): number {
  'worklet';
  return Math.sin((t / 0.42) * Math.PI * 2);
}

/**
 * Le traineau d'INRO (150 x 40) : un Pere Noel qui fait coucou, sa hotte, un traineau rouge et or, trois rennes
 * au galop dont les pattes avant et arriere se croisent.
 */
export function TraineauInro({ w, temps }: { w: number; temps: Temps }) {
  const pattesA = useAnimatedStyle(() => ({ transform: [{ translateX: galop(temps.value) * 1.8 * (w / 150) }] }));
  const pattesB = useAnimatedStyle(() => ({ transform: [{ translateX: -galop(temps.value) * 1.8 * (w / 150) }] }));
  const h = w * (40 / 150);
  const renne = (x: number, key: string) => (
    <G key={key}>
      <Path d={`M${x} 17 C${x + 3} 13 ${x + 13} 13 ${x + 16} 17 L${x + 16} 22 C${x + 13} 24 ${x + 3} 24 ${x} 22 Z`} fill="#8B5A3C" />
      <Path d={`M${x + 15} 17 L${x + 19} 10 L${x + 24} 10 L${x + 25} 13.5 L${x + 20.5} 15 L${x + 17} 19 Z`} fill="#8B5A3C" />
      <Path d={`M${x + 19.5} 10 L${x + 17} 3.5 M${x + 17.8} 6 L${x + 15} 4.4 M${x + 21.5} 10 L${x + 24} 3.5 M${x + 23} 6 L${x + 26} 4.6`} stroke="#5B341E" strokeWidth={1.3} strokeLinecap="round" />
      <Circle cx={x + 25.2} cy={12.6} r={1.2} fill="#3B2416" />
      <Circle cx={x + 21} cy={11.6} r={0.7} fill="#1F2937" />
      <Path d={`M${x + 2} 18.5 Q${x + 8} 21 ${x + 15} 18.5`} stroke="#DC2626" strokeWidth={1.4} fill="none" />
      <Circle cx={x + 8.5} cy={20.4} r={0.9} fill="#FACC15" />
    </G>
  );
  const arriere = (x: number, key: string) => (
    <Path key={key} d={`M${x + 2} 23 L${x + 1} 32 M${x + 5} 23 L${x + 5} 32`} stroke="#5B341E" strokeWidth={1.6} strokeLinecap="round" />
  );
  const avant = (x: number, key: string) => (
    <Path key={key} d={`M${x + 11} 23 L${x + 11} 32 M${x + 14} 23 L${x + 15} 31`} stroke="#5B341E" strokeWidth={1.6} strokeLinecap="round" />
  );
  return (
    <View style={{ width: w, height: h }}>
      <Animated.View style={[StyleSheet.absoluteFill, pattesA]}>
        <Svg width={w} height={h} viewBox="0 0 150 40">
          {arriere(70, 'b1')}{arriere(96, 'b2')}{arriere(122, 'b3')}
        </Svg>
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, pattesB]}>
        <Svg width={w} height={h} viewBox="0 0 150 40">
          {avant(70, 'f1')}{avant(96, 'f2')}{avant(122, 'f3')}
        </Svg>
      </Animated.View>
      <Svg width={w} height={h} viewBox="0 0 150 40" style={StyleSheet.absoluteFill}>
        {/* Renes */}
        <Path d="M56 21 Q64 18 72 20 M86 19 Q92 17 98 19 M112 19 Q118 17 124 19" stroke="#B45309" strokeWidth={1} fill="none" />
        {renne(70, 'd1')}{renne(96, 'd2')}{renne(122, 'd3')}
        {/* Hotte */}
        <Path d="M10 14 Q8 4 16 4 Q24 3 22 14 Z" fill="#7C4A2D" />
        <Rect x={12} y={1.4} width={5} height={5} rx={1} fill="#22C55E" />
        <Rect x={17} y={2.4} width={4} height={4} rx={1} fill="#3B82F6" />
        {/* Pere Noel */}
        <Path d="M26 20 Q26 9 33 9 Q40 9 40 20 Z" fill="#DC2626" />
        <Circle cx={33} cy={7} r={4.2} fill="#FBD5B5" />
        <Path d="M28.6 7.6 Q33 15 37.4 7.6 Q36 12.6 33 12.8 Q30 12.6 28.6 7.6 Z" fill="#FFFFFF" />
        <Path d="M28.4 5.6 Q30 0 36 1.2 L40.5 4.8 L37.6 5.6 Z" fill="#DC2626" />
        <Rect x={28} y={4.6} width={10} height={2.2} rx={1.1} fill="#FFFFFF" />
        <Circle cx={41} cy={5} r={1.6} fill="#FFFFFF" />
        <Path d="M38.5 12 L44 6.5" stroke="#DC2626" strokeWidth={2.4} strokeLinecap="round" />
        <Circle cx={44.4} cy={6} r={1.4} fill="#FFFFFF" />
        {/* Traineau */}
        <Path d="M8 16 L52 16 C56 16 56 28 49 28 L16 28 C10 28 8 22 8 16 Z" fill="#B91C1C" />
        <Path d="M10 16.5 L52 16.5" stroke="#FACC15" strokeWidth={2} />
        <Path d="M6 34 L54 34 C60 34 60 28 56 27" fill="none" stroke="#CA8A04" strokeWidth={2.2} strokeLinecap="round" />
        <Path d="M18 28 L18 34 M44 28 L44 34" stroke="#CA8A04" strokeWidth={1.8} />
      </Svg>
    </View>
  );
}

// ── Bonhomme de neige qui fait coucou ───────────────────────────────────────

/** Taille d'origine du bonhomme de neige d'INRO */
export const BONHOMME_INRO = { w: 26, h: 36 };

/**
 * Le bonhomme de neige d'INRO, chapeau et echarpe ; son bras branche fait coucou (aller retour de 0,52 s).
 * contour : sur le papier clair de YOROI, le trait discret du bonhomme d'INRO (HalloweenGhost), sinon la neige
 * disparait sur le fond.
 */
export function BonhommeInro({ temps, contour }: { temps: Temps; contour?: string }) {
  const bras = useAnimatedStyle(() => ({ transform: [{ rotate: `${-30 + 50 * vaEtVient(temps.value, 0.52)}deg` }] }));
  return (
    <View style={{ width: BONHOMME_INRO.w, height: BONHOMME_INRO.h }}>
      <Animated.View style={[{ position: 'absolute', left: 13, top: 8, width: 16, height: 16 }, bras]}>
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <Path d="M8 8 L14 3 M12 4.6 L13.6 6.4" stroke="#78350F" strokeWidth={1.3} strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Svg width={26} height={36} viewBox="0 0 26 36" style={StyleSheet.absoluteFill}>
        <Path d="M8 16 L2 11 M3.8 12.4 L2.4 14" stroke="#78350F" strokeWidth={1.3} strokeLinecap="round" />
        <Circle cx={13} cy={27} r={8.5} fill="#F8FAFC" stroke={contour ?? 'none'} strokeWidth={contour ? 0.9 : 0} />
        <Circle cx={13} cy={15} r={6} fill="#F8FAFC" stroke={contour ?? 'none'} strokeWidth={contour ? 0.9 : 0} />
        <Circle cx={13} cy={23.5} r={0.9} fill="#1F2937" />
        <Circle cx={13} cy={27} r={0.9} fill="#1F2937" />
        <Circle cx={11} cy={13.6} r={0.9} fill="#1F2937" />
        <Circle cx={15} cy={13.6} r={0.9} fill="#1F2937" />
        <Path d="M13 15.4 L17.6 16.4 L13 16.8 Z" fill="#F97316" />
        <Path d="M8 19.4 Q13 21.6 18 19.4 L18 20.8 Q13 23 8 20.8 Z M15 20.6 L16.6 25 L14.6 25 Z" fill="#DC2626" />
        <Rect x={8.4} y={8} width={9.2} height={1.8} rx={0.6} fill="#1F2937" />
        <Rect x={10} y={2.4} width={6} height={6} rx={0.8} fill="#1F2937" />
        <Rect x={10} y={6.4} width={6} height={1.2} fill="#DC2626" />
      </Svg>
    </View>
  );
}
