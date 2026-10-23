/**
 * Halloween, repris de l'app INRO de Houari (18 octobre 2026, v5).
 *
 * Sources dans INRO :
 *   components/seasonal/HalloweenDecor.tsx : la toile (WEB), l'araignee (SPIDER_LEGS et son liseré clair),
 *     la chauve souris aux ailes qui battent (Bat, BatWing), la citrouille dont le visage luit, les bonbons,
 *     et le petit cimetiere de la carte du planning (HeroPumpkins) : tombe, chat noir, squelette, zombie ;
 *   components/seasonal/HalloweenGhost.tsx : le fantome.
 *
 * Les dessins sont ceux d'INRO, trait pour trait, avec ses couleurs. Seuls changent : les imports, et les
 * animations, qui suivent l'horloge `temps` des calques YOROI (arret hors ecran) au lieu de withRepeat, avec
 * les memes courbes (./mouvements.ts). Aucun dessin ne capte le toucher.
 */
import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useAnimatedStyle } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { clignement, cycleInro, pasZombie, vaEtVient } from './mouvements';

type Temps = SharedValue<number>;
const APath = Animated.createAnimatedComponent(Path);

// ── Toile ───────────────────────────────────────────────────────────────────

export const WEB =
  'M0 0 L120 0 M0 0 L110.9 45.9 M0 0 L84.9 84.9 M0 0 L45.9 110.9 M0 0 L0 120 ' +
  'M32 0 Q25.7 5.1 29.6 12.2 M29.6 12.2 Q21.8 14.6 22.6 22.6 M22.6 22.6 Q14.6 21.8 12.2 29.6 M12.2 29.6 Q5.1 25.7 0 32 ' +
  'M62 0 Q49.9 9.9 57.3 23.7 M57.3 23.7 Q42.3 28.2 43.8 43.8 M43.8 43.8 Q28.2 42.3 23.7 57.3 M23.7 57.3 Q9.9 49.9 0 62 ' +
  'M92 0 Q74.1 14.7 85 35.2 M85 35.2 Q62.8 41.9 65.1 65.1 M65.1 65.1 Q41.9 62.8 35.2 85 M35.2 85 Q14.7 74.1 0 92';

/**
 * La toile de coin d'INRO (dessinee sur 120, posee a 128). A petite taille, le trait garde son epaisseur
 * a l'ecran (1,2 point a 128, jamais moins de 0,8 point).
 */
export function ToileInro({ taille, couleur, miroir }: { taille: number; couleur: string; miroir?: boolean }) {
  const trait = (Math.max(0.8, (1.2 * taille) / 128) * 120) / taille;
  return (
    <View style={miroir ? { transform: [{ scaleX: -1 }] } : undefined}>
      <Svg width={taille} height={taille} viewBox="0 0 120 120">
        <Path d={WEB} fill="none" stroke={couleur} strokeWidth={trait} strokeLinecap="round" />
      </Svg>
    </View>
  );
}

// ── Araignee ────────────────────────────────────────────────────────────────

export const SPIDER_LEGS =
  'M14 20 C8 16 5 18 2 14 M13 24 C7 23 4 26 1 24 M14 28 C8 30 6 34 3 35 M16 31 C12 35 12 38 10 40 ' +
  'M26 20 C32 16 35 18 38 14 M27 24 C33 23 36 26 39 24 M26 28 C32 30 34 34 37 35 M24 31 C28 35 28 38 30 40';

export function DessinAraigneeInro({ taille, encre, halo }: { taille: number; encre: string; halo: string }) {
  return (
    <Svg width={taille} height={taille} viewBox="-1 -1 42 42">
      {/* Un liseré clair sous l'araignée : elle reste visible sur un fond sombre. */}
      <Path d={SPIDER_LEGS} fill="none" stroke={halo} strokeWidth={3.6} strokeLinecap="round" />
      <Ellipse cx={20} cy={26} rx={8.4} ry={9.4} fill={halo} />
      <Circle cx={20} cy={16} r={6.4} fill={halo} />
      <Path d={SPIDER_LEGS} fill="none" stroke={encre} strokeWidth={1.8} strokeLinecap="round" />
      <Ellipse cx={20} cy={26} rx={7} ry={8} fill={encre} />
      <Circle cx={20} cy={16} r={5} fill={encre} />
      <Circle cx={18} cy={15} r={1.4} fill="#FFFFFF" />
      <Circle cx={22} cy={15} r={1.4} fill="#FFFFFF" />
    </Svg>
  );
}

/**
 * L'araignee d'INRO au bout de son fil : elle descend (sortie cubique), attend, puis remonte, entre haut et bas
 * (haut de l'araignee). x : centre du fil ; fil : haut du fil. Au repos (Reduire les animations) : en haut.
 */
export function AraigneeInro({
  x, fil, haut, bas, taille, duree, pause, decalage, temps, encre = '#231A2B', halo = 'rgba(255,255,255,0.85)', soie = 'rgba(120,130,140,0.75)',
}: {
  x: number; fil: number; haut: number; bas: number; taille: number; duree: number; pause: number; decalage: number; temps: Temps;
  encre?: string; halo?: string; soie?: string;
}) {
  const corps = useAnimatedStyle(() => {
    const u = temps.value > 0 ? cycleInro(temps.value + decalage, duree, pause) : 0;
    return { transform: [{ translateY: haut + u * (bas - haut) }] };
  });
  const brin = useAnimatedStyle(() => {
    const u = temps.value > 0 ? cycleInro(temps.value + decalage, duree, pause) : 0;
    return { height: Math.max(1, haut + u * (bas - haut) - fil + taille * 0.3) };
  });
  return (
    <>
      <Animated.View style={[{ position: 'absolute', left: x - 0.5, top: fil, width: 1, backgroundColor: soie }, brin]} />
      <Animated.View style={[{ position: 'absolute', left: x - taille / 2, top: 0, width: taille, height: taille }, corps]}>
        <DessinAraigneeInro taille={taille} encre={encre} halo={halo} />
      </Animated.View>
    </>
  );
}

// ── Chauve souris ───────────────────────────────────────────────────────────

/** Aile gauche d'une chauve souris, epaule a droite (32, 14). L'aile droite est son miroir. */
const WING =
  'M32 11 C27 5 18 2 7 5 C4 6 2 8 0 11 C3 11 6 13 7 17 C10 14 14 14 16 18 ' +
  'C18 14 22 14 24 18 C26 15 29 15 32 17 Z';
const WING_VEINS = 'M31 13 L7 16 M31 13 L16 17 M31 13 L24 17 M31 12 L9 6';
const WING_R =
  'M0 11 C5 5 14 2 25 5 C28 6 30 8 32 11 C29 11 26 13 25 17 C22 14 18 14 16 18 ' +
  'C14 14 10 14 8 18 C6 15 3 15 0 17 Z';
const WING_VEINS_R = 'M1 13 L25 16 M1 13 L16 17 M1 13 L8 17 M1 12 L23 6';

/** Taille d'origine d'une chauve souris d'INRO */
export const CHAUVE = { w: 64, h: 40 };

/** Battement d'aile d'INRO : 150 ms vers le bas, 150 ms vers le haut ; 0 a 1 */
export function battementAile(t: number, decalage: number): number {
  'worklet';
  return vaEtVient(t, 0.15, decalage);
}

function AileInro({ temps, decalage, miroir }: { temps: Temps; decalage: number; miroir?: boolean }) {
  // L'aile pivote autour de l'epaule : en haut, puis rabattue vers le bas.
  const style = useAnimatedStyle(() => {
    const f = battementAile(temps.value, decalage);
    return {
      transform: [
        { rotateZ: `${(miroir ? -1 : 1) * (-28 + 62 * f)}deg` },
        { scaleY: f < 0.5 ? 1 - 0.36 * f : 0.82 - 0.4 * (f - 0.5) },
      ],
    };
  });
  return (
    <Animated.View style={[styles.aile, miroir ? { left: 32, transformOrigin: 'left 35%' } : { left: 0, transformOrigin: 'right 35%' }, style]}>
      <Svg width={32} height={24} viewBox="0 0 32 24">
        <Path d={miroir ? WING_R : WING} fill="#2A1A3A" />
        <Path d={miroir ? WING_VEINS_R : WING_VEINS} fill="none" stroke="rgba(214,178,255,0.28)" strokeWidth={0.7} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/** La chauve souris d'INRO, a sa taille d'origine (64 x 40) ; c'est le calque qui la deplace et la met a l'echelle */
export function ChauveSourisInro({ temps, decalage = 0 }: { temps: Temps; decalage?: number }) {
  return (
    <View style={{ width: CHAUVE.w, height: CHAUVE.h }}>
      <AileInro temps={temps} decalage={decalage} />
      <AileInro temps={temps} decalage={decalage} miroir />
      {/* Corps, tete, oreilles et yeux */}
      <Svg width={14} height={26} viewBox="0 0 14 26" style={styles.corpsChauve}>
        <Path d="M2.6 7 L3.6 0.6 L6.4 4.4 Z M11.4 7 L10.4 0.6 L7.6 4.4 Z" fill="#1E1229" />
        <Ellipse cx={7} cy={15.5} rx={4.4} ry={7.2} fill="#1E1229" />
        <Circle cx={7} cy={7.4} r={4.3} fill="#1E1229" />
        <Path d="M4.6 10.2 Q7 11.6 9.4 10.2" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={0.6} />
        <Circle cx={5.4} cy={7} r={1.15} fill="#FFC94D" />
        <Circle cx={8.6} cy={7} r={1.15} fill="#FFC94D" />
        <Circle cx={5.6} cy={6.7} r={0.4} fill="#FFFFFF" />
        <Circle cx={8.8} cy={6.7} r={0.4} fill="#FFFFFF" />
      </Svg>
    </View>
  );
}

// ── Citrouille ──────────────────────────────────────────────────────────────

const VISAGE = 'M33 47 L43 47 L38 38 Z M57 47 L67 47 L62 38 Z M32 60 Q50 76 68 60 L63 61 L59 57 L55 63 L50 58 L45 63 L41 57 L37 61 Z';

/** La citrouille d'INRO (100 x 90), contour, tige, feuille, et le visage qui luit ; hauteur 0,9 w */
export function CitrouilleInro({ w, temps, phase = 0 }: { w: number; temps: Temps; phase?: number }) {
  const visage = useAnimatedProps(() => ({ fillOpacity: 0.6 + (temps.value > 0 ? cycleInro(temps.value + phase, 0.9, 1.4) : 1) * 0.4 }));
  return (
    <Svg width={w} height={w * 0.9} viewBox="0 0 100 90">
      <Ellipse cx={30} cy={54} rx={22} ry={30} fill="#E8791F" stroke="#B85A10" strokeWidth={2} />
      <Ellipse cx={70} cy={54} rx={22} ry={30} fill="#E8791F" stroke="#B85A10" strokeWidth={2} />
      <Ellipse cx={50} cy={54} rx={24} ry={33} fill="#F7962E" stroke="#B85A10" strokeWidth={2} />
      <Path d="M48 24 C48 14 52 9 59 7" fill="none" stroke="#4E7A3E" strokeWidth={6} strokeLinecap="round" />
      <Path d="M54 18 C62 12 70 14 72 20 C64 22 58 22 54 18 Z" fill="#6FA34B" />
      <APath animatedProps={visage} d={VISAGE} fill="#FFD54F" />
    </Svg>
  );
}

// ── Bonbons ─────────────────────────────────────────────────────────────────

export const COULEURS_BONBONS = ['#F97316', '#7C3AED', '#EC4899', '#22C55E', '#FACC15', '#38BDF8'];

/** Le bonbon en papillote d'INRO (26 x 12) */
export function BonbonInro({ couleur }: { couleur: string }) {
  return (
    <Svg width={26} height={12} viewBox="0 0 26 12">
      <Path d="M0 1 L7 6 L0 11 Z M26 1 L19 6 L26 11 Z" fill={couleur} opacity={0.75} />
      <Ellipse cx={13} cy={6} rx={7} ry={5} fill={couleur} />
      <Path d="M9 3.5 Q13 2 17 3.5" fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1.2} />
    </Svg>
  );
}

// ── Fantome ─────────────────────────────────────────────────────────────────

const CORPS_FANTOME =
  'M40 4 C20 4 8 20 8 40 L8 78 C12 72 16 72 20 78 C24 84 28 84 32 78 C36 72 44 72 48 78 ' +
  'C52 84 56 84 60 78 C64 72 68 72 72 78 L72 40 C72 20 60 4 40 4 Z';

/** Le fantome d'INRO (HalloweenGhost), sans l'ombre au sol puisqu'il vole ; hauteur 86 / 80 de w */
export const FANTOME = { w: 40, h: (40 * 86) / 80 };

export function FantomeInro({ w = FANTOME.w }: { w?: number }) {
  return (
    <Svg width={w} height={(w * 86) / 80} viewBox="0 0 80 86">
      <Path d={CORPS_FANTOME} fill="#FFFFFF" stroke="rgba(42,18,32,0.14)" strokeWidth={1.5} />
      <Path d="M18 30 C20 18 30 12 38 12" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth={3} strokeLinecap="round" />
      <Ellipse cx={30} cy={38} rx={5.5} ry={7.5} fill="#24122E" />
      <Ellipse cx={50} cy={38} rx={5.5} ry={7.5} fill="#24122E" />
      <Circle cx={31.5} cy={35} r={1.8} fill="#FFFFFF" />
      <Circle cx={51.5} cy={35} r={1.8} fill="#FFFFFF" />
      <Ellipse cx={40} cy={54} rx={5} ry={6.5} fill="#24122E" />
      <Ellipse cx={24} cy={47} rx={4} ry={2.4} fill="rgba(255,120,160,0.45)" />
      <Ellipse cx={56} cy={47} rx={4} ry={2.4} fill="rgba(255,120,160,0.45)" />
    </Svg>
  );
}

// ── Tombe ───────────────────────────────────────────────────────────────────

/** La grande tombe du cimetiere d'INRO (croix et herbe), recadree seule ; tient dans w x h, posee en bas */
export function TombeInro({ w, h }: { w: number; h: number }) {
  return (
    <Svg width={w} height={h} viewBox="9 2 32 34" preserveAspectRatio="xMidYMax meet">
      <Path d="M14 36 L14 14 Q14 4 25 4 Q36 4 36 14 L36 36 Z" fill="#7C8796" />
      <Path d="M17 36 L17 15 Q17 7 25 7 Q33 7 33 15 L33 36 Z" fill="#94A3B8" />
      <Path d="M21 18 L29 18 M25 13 L25 27" stroke="#5B6573" strokeWidth={2.2} strokeLinecap="round" />
      <Path d="M0 36 Q4 28 6 36 Q9 27 12 36 L40 36 Q43 29 45 36 Q48 30 50 36 L70 36 Q73 28 76 36 Q79 30 84 36 Z" fill="#2F6B3A" />
    </Svg>
  );
}

// ── Chat noir ───────────────────────────────────────────────────────────────

/** Taille d'origine du chat d'INRO */
export const CHAT_INRO = { w: 26, h: 30 };

/**
 * Le chat noir d'INRO, assis : la queue balance a sa base, les yeux jaunes clignent.
 * halo : en mode sombre, un liseré clair autour (comme l'araignee d'INRO), sinon le chat noir disparait.
 */
export function ChatInro({ temps, halo }: { temps: Temps; halo?: string }) {
  const queue = useAnimatedStyle(() => ({ transform: [{ rotate: `${-18 + 36 * vaEtVient(temps.value, 1.4)}deg` }] }));
  const yeux = useAnimatedStyle(() => ({ transform: [{ scaleY: 1 - 0.9 * (temps.value > 0 ? clignement(temps.value, 2.6, 1.1) : 0) }] }));
  return (
    <View style={{ width: CHAT_INRO.w, height: CHAT_INRO.h }}>
      {/* Queue, qui pivote a sa base (centre de cette vue) */}
      <Animated.View style={[{ position: 'absolute', left: 5, top: 12, width: 28, height: 28 }, queue]}>
        <Svg width={28} height={28} viewBox="0 0 28 28">
          {halo ? <Path d="M14 14 Q22 13 22.5 6 Q22.8 3 25 3.4" stroke={halo} strokeWidth={4} fill="none" strokeLinecap="round" /> : null}
          <Path d="M14 14 Q22 13 22.5 6 Q22.8 3 25 3.4" stroke="#14101A" strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </Svg>
      </Animated.View>
      <Svg width={26} height={30} viewBox="0 0 26 30" style={StyleSheet.absoluteFill}>
        {halo ? (
          <>
            <Path d="M5 30 Q3 20 8 15 Q13 12 18 15 Q22 20 20 30 Z" fill={halo} stroke={halo} strokeWidth={1.4} strokeLinejoin="round" />
            <Path d="M5.5 10 L6 2.5 L10 6.4 Q13 5.4 16 6.4 L20 2.5 L20.5 10 Q20.5 15.6 13 15.6 Q5.5 15.6 5.5 10 Z" fill={halo} stroke={halo} strokeWidth={1.4} strokeLinejoin="round" />
          </>
        ) : null}
        <Path d="M5 30 Q3 20 8 15 Q13 12 18 15 Q22 20 20 30 Z" fill="#14101A" />
        <Path d="M5.5 10 L6 2.5 L10 6.4 Q13 5.4 16 6.4 L20 2.5 L20.5 10 Q20.5 15.6 13 15.6 Q5.5 15.6 5.5 10 Z" fill="#14101A" />
        <Path d="M7.4 5 L8.6 7 M18.6 5 L17.4 7" stroke="#3B2F4A" strokeWidth={1} strokeLinecap="round" />
        <Path d="M12.2 12 L13 12.8 L13.8 12" stroke="#F472B6" strokeWidth={0.9} fill="none" strokeLinecap="round" />
        <Path d="M9 13 L4.5 12.4 M9 13.8 L4.8 14.6 M17 13 L21.5 12.4 M17 13.8 L21.2 14.6" stroke="#6B5B7A" strokeWidth={0.5} />
      </Svg>
      {/* Yeux jaunes qui clignent */}
      <Animated.View style={[{ position: 'absolute', left: 7, top: 8, width: 12, height: 4 }, yeux]}>
        <Svg width={12} height={4} viewBox="0 0 12 4">
          <Ellipse cx={2} cy={2} rx={1.9} ry={1.9} fill="#FACC15" />
          <Ellipse cx={10} cy={2} rx={1.9} ry={1.9} fill="#FACC15" />
          <Ellipse cx={2} cy={2} rx={0.5} ry={1.6} fill="#14101A" />
          <Ellipse cx={10} cy={2} rx={0.5} ry={1.6} fill="#14101A" />
        </Svg>
      </Animated.View>
    </View>
  );
}

// ── Squelette qui fait coucou ───────────────────────────────────────────────

const BONE = '#F1F5F9';
/** Taille d'origine du squelette d'INRO */
export const SQUELETTE_INRO = { w: 22, h: 30 };

/**
 * Le squelette d'INRO ; le bras droit pivote a l'epaule et fait coucou (aller retour de 0,42 s).
 * contour : sur le papier clair de YOROI, un trait sombre sous les os (comme le liseré de l'araignee d'INRO),
 * sinon l'os blanc disparait ; en mode sombre, pas de contour.
 */
export function SqueletteInro({ temps, contour }: { temps: Temps; contour?: string }) {
  const bras = useAnimatedStyle(() => ({ transform: [{ rotate: `${-35 + 55 * vaEtVient(temps.value, 0.42)}deg` }] }));
  const os = (c: string, plus: number) => (
    <>
      <Circle cx={11} cy={5.5} r={4.6 + plus / 2} fill={c} />
      <Path d="M8.6 8.6 h4.8 v2 h-4.8 Z" fill={c} stroke={c} strokeWidth={plus} strokeLinejoin="round" />
      <Path d="M11 11 L11 20" stroke={c} strokeWidth={1.6 + plus} strokeLinecap="round" />
      <Path d="M7.4 13 h7.2 M7.8 15.2 h6.4 M8.4 17.4 h5.2" stroke={c} strokeWidth={1.2 + plus} strokeLinecap="round" />
      <Path d="M8 20.5 h6 L13 22 h-4 Z" fill={c} stroke={c} strokeWidth={plus} strokeLinejoin="round" />
      <Path d="M9 22 L7.6 29 M13 22 L14.4 29" stroke={c} strokeWidth={1.6 + plus} strokeLinecap="round" />
      <Path d="M8 12.6 L5.4 18.4" stroke={c} strokeWidth={1.5 + plus} strokeLinecap="round" />
    </>
  );
  const main = (c: string, plus: number) => (
    <>
      <Path d="M8 8 L13 3.6" stroke={c} strokeWidth={1.5 + plus} strokeLinecap="round" />
      <Circle cx={13.6} cy={3} r={1.4 + plus / 2} fill={c} />
    </>
  );
  return (
    <View style={{ width: SQUELETTE_INRO.w, height: SQUELETTE_INRO.h }}>
      <Svg width={22} height={30} viewBox="0 0 22 30" style={StyleSheet.absoluteFill}>
        {contour ? os(contour, 1.3) : null}
        {os(BONE, 0)}
        <Circle cx={9.2} cy={5.2} r={1.2} fill="#1E1229" />
        <Circle cx={12.8} cy={5.2} r={1.2} fill="#1E1229" />
      </Svg>
      {/* Bras droit, qui pivote a l'epaule (centre de cette vue) */}
      <Animated.View style={[{ position: 'absolute', left: 6, top: 4.6, width: 16, height: 16 }, bras]}>
        <Svg width={16} height={16} viewBox="0 0 16 16">
          {contour ? main(contour, 1.3) : null}
          {main(BONE, 0)}
        </Svg>
      </Animated.View>
    </View>
  );
}

// ── Zombie ──────────────────────────────────────────────────────────────────

/** Taille d'origine du zombie d'INRO */
export const ZOMBIE_INRO = { w: 26, h: 30 };

function JambeInro({ temps, signe, couleur }: { temps: Temps; signe: 1 | -1; couleur: string }) {
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${signe * pasZombie(temps.value) * 22}deg` }] }));
  return (
    <Animated.View style={[{ position: 'absolute', left: 1.5, top: 10, width: 20, height: 20 }, style]}>
      <Svg width={20} height={20} viewBox="0 0 20 20">
        <Path d="M10 10 L10 18.5" stroke={couleur} strokeWidth={3} strokeLinecap="round" />
        <Path d="M10 18.5 h2.6" stroke="#2A1F1A" strokeWidth={2.4} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

/** Le zombie d'INRO, bras tendus : les jambes pivotent a la hanche, il titube et rebondit a chaque pas */
export function ZombieInro({ temps }: { temps: Temps }) {
  const corps = useAnimatedStyle(() => {
    const pas = pasZombie(temps.value);
    return { transform: [{ translateY: -Math.abs(pas) * 1.5 }, { rotate: `${4 + pas * 5}deg` }] };
  });
  return (
    <Animated.View style={[{ width: ZOMBIE_INRO.w, height: ZOMBIE_INRO.h }, corps]}>
      <JambeInro temps={temps} signe={1} couleur="#3B3F55" />
      <JambeInro temps={temps} signe={-1} couleur="#4A4F68" />
      <Svg width={26} height={24} viewBox="0 0 26 24" style={StyleSheet.absoluteFill}>
        {/* Bras tendus vers l'avant */}
        <Path d="M14 12 L24 11" stroke="#8DBF6A" strokeWidth={2.6} strokeLinecap="round" />
        {/* Chemise dechiree */}
        <Path d="M7 10 h9 v11 l-1.6 -1.8 l-1.6 2 l-1.8 -2 l-1.6 2 l-1.6 -1.8 l-0.8 1.6 Z" fill="#6B5B95" />
        <Path d="M9 13 l2 2 M13 16 l1.4 -1.4" stroke="#4C3F70" strokeWidth={1} strokeLinecap="round" />
        {/* Tete verte, cheveux en bataille, yeux vides */}
        <Path d="M7.5 3.5 Q7.5 1 10 1 L14 1 Q16.5 1 16.5 3.5 L16.5 8 Q16.5 10 14.5 10 L9.5 10 Q7.5 10 7.5 8 Z" fill="#8DBF6A" />
        <Path d="M7 3 L8.5 0.4 L10 2 L11.6 0 L13 2 L14.8 0.2 L16 2 L17 3 L16.5 4 L7.5 4 Z" fill="#2F2A26" />
        <Circle cx={11.2} cy={5.6} r={1.3} fill="#F8FAFC" />
        <Circle cx={14.4} cy={5.6} r={1} fill="#F8FAFC" />
        <Circle cx={11.4} cy={5.8} r={0.5} fill="#7F1D1D" />
        <Path d="M10.6 8.2 h4.4" stroke="#3F5F2E" strokeWidth={0.9} strokeLinecap="round" />
        <Path d="M11.6 7.6 v1.2 M13 7.6 v1.2 M14.2 7.6 v1.2" stroke="#3F5F2E" strokeWidth={0.6} />
        {/* Deuxieme bras, devant le corps */}
        <Path d="M13 14 L23.5 14.6" stroke="#9ACB76" strokeWidth={2.6} strokeLinecap="round" />
      </Svg>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  aile: { position: 'absolute', top: 2, width: 32, height: 24 },
  corpsChauve: { position: 'absolute', left: 25, top: 4 },
});
