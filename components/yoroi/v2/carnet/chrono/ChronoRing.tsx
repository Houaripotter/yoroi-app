/**
 * Anneau de chrono au pinceau : trait epais arrondi, graduations fines et tres gros chiffres.
 * L'avancee de l'anneau est animee en continu sur le fil d'animation (valeur partagee du moteur),
 * jamais par a-coups. Pas de respiration permanente : seul un battement net et discret
 * marque chacune des 3 dernieres secondes.
 */
import React, { useEffect } from 'react';
import { View } from 'react-native';
import Svg, { Circle, G, Line } from 'react-native-svg';
import Animated, { Easing, useAnimatedProps, useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { Ink } from '@/components/yoroi/v2/Ink';
import { P } from '../ui';
import { Chiffres } from './Chiffres';

const ACircle = Animated.createAnimatedComponent(Circle);

type Props = {
  size: number;
  /** de 0 a 1 : part ecoulee de la phase (valeur fixe ou valeur partagee animee) */
  progress: number | SharedValue<number>;
  color: string;
  soft: string;
  time: string;
  /** petit texte au-dessus des chiffres */
  label?: string;
  /** petit texte sous les chiffres */
  sub?: string;
  /** couleur des chiffres (encre par defaut) */
  digitColor?: string;
  /** change a chaque seconde : si beat est vrai, les chiffres battent une fois */
  beatKey?: number;
  beat?: boolean;
  big?: boolean;
};

export function ChronoRing({ size, progress, color, soft, time, label, sub, digitColor = P.ink, beatKey, beat, big }: Props) {
  const stroke = Math.round(size * 0.06);
  const r = (size - stroke * 2) / 2;
  const cx = size / 2;
  const c = 2 * Math.PI * r;
  const ticks = 60;

  const fixed = useSharedValue(typeof progress === 'number' ? progress : 0);
  useEffect(() => {
    if (typeof progress === 'number') fixed.value = withTiming(Math.max(0, Math.min(1, progress)), { duration: 250 });
  }, [progress, fixed]);
  const pv = typeof progress === 'number' ? fixed : progress;

  const arcProps = useAnimatedProps(() => {
    const v = Math.max(0, Math.min(1, pv.value));
    return { strokeDashoffset: c * (1 - v) };
  });
  const headProps = useAnimatedProps(() => {
    const v = Math.max(0, Math.min(1, pv.value));
    const a = v * Math.PI * 2 - Math.PI / 2;
    return { cx: cx + Math.cos(a) * r, cy: cx + Math.sin(a) * r, opacity: v > 0.002 && v < 0.999 ? 1 : 0 };
  });

  // Battement des 3 dernieres secondes, cale sur le changement de chiffre
  const scale = useSharedValue(1);
  useEffect(() => {
    if (beat) {
      scale.value = withSequence(withTiming(1.08, { duration: 90, easing: Easing.out(Easing.quad) }), withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }));
    }
  }, [beatKey, beat, scale]);
  const beatStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  // chiffres aussi gros que possible dans l'anneau : la taille suit la largeur du texte
  // (un chiffre fait environ 0,62 de sa hauteur, les deux-points 0,3)
  const em = Array.from(time).reduce((w, ch) => w + (ch === ':' ? 0.3 : 0.62), 0) || 1;
  // 14 octobre : meme taille qu'avant, mais dessinee par Chiffres (chaque signe dans sa case) : plus de dernier
  // chiffre coupe a droite sur iPhone. Le garde-fou de largeur ne joue qu'au-dela de ce que l'anneau peut contenir.
  const digits = Math.floor(Math.min(size * (big ? 0.44 : 0.38), (size * 0.68) / em));

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessible accessibilityLabel={`${label ? `${label}, ` : ''}${time}`}>
      <Svg width={size} height={size} style={{ position: 'absolute' }}>
        <Circle cx={cx} cy={cx} r={r + stroke * 0.95} fill={soft} />
        <Circle cx={cx} cy={cx} r={r - stroke * 0.9} fill="rgba(255,255,255,0.86)" />
        <G>
          {Array.from({ length: ticks }).map((_, i) => {
            const a = (i / ticks) * Math.PI * 2 - Math.PI / 2;
            const long = i % 5 === 0;
            const r1 = r - stroke * 0.9 - (long ? 10 : 6);
            const r2 = r - stroke * 0.9 - 2;
            return <Line key={i} x1={cx + Math.cos(a) * r1} y1={cx + Math.sin(a) * r1} x2={cx + Math.cos(a) * r2} y2={cx + Math.sin(a) * r2} stroke={long ? P.ink2 : P.dashed} strokeWidth={long ? 2 : 1} strokeLinecap="round" opacity={long ? 0.45 : 0.4} />;
          })}
        </G>
        <Circle cx={cx} cy={cx} r={r} stroke="rgba(29,32,41,0.07)" strokeWidth={stroke} fill="none" />
        <ACircle cx={cx} cy={cx} r={r} stroke={color} strokeWidth={stroke} fill="none" strokeDasharray={`${c} ${c}`} strokeLinecap="round" transform={`rotate(-90 ${cx} ${cx})`} animatedProps={arcProps} />
        <ACircle r={stroke * 0.36} fill={P.white} animatedProps={headProps} />
      </Svg>
      <Animated.View style={[{ alignItems: 'center', paddingHorizontal: stroke * 1.6, width: size }, beatStyle]}>
        {label ? (
          <Ink size={Math.max(13, Math.round(size * 0.045))} weight="extraBold" color={color} style={{ marginBottom: 2 }} numberOfLines={1}>
            {label}
          </Ink>
        ) : null}
        <Chiffres texte={time} taille={digits} couleur={digitColor} largeurMax={size - stroke * 3.2} interligne={Math.ceil(digits * 1.08)} />
        {sub ? (
          <Ink size={Math.max(13, Math.round(size * 0.042))} weight="bold" color={P.ink2} style={{ marginTop: 2, textAlign: 'center' }} numberOfLines={2}>
            {sub}
          </Ink>
        ) : null}
      </Animated.View>
    </View>
  );
}
