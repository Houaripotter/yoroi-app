/**
 * Le torii (porte japonaise en encre), symbole de la ligne d'arrivee dans l'app (vague 32).
 * Meme dessin que la fonction torii() du labo des courbes (scratchpad charts31/labo.html) :
 * le kasagi courbe, le nuki, le petit montant central et les deux piliers. Dessin vectoriel, aucun texte.
 */
import React from 'react';
import Svg, { Path, Rect } from 'react-native-svg';

export const TORII_ENCRE = '#1D2029';

export function Torii({ size = 28, color = TORII_ENCRE }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={(size * 25) / 28} viewBox="0 0 28 25" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Path d="M0 0Q14 4 28 0L27 3.5Q14 7 1 3.5Z" fill={color} />
      <Rect x={3} y={8.5} width={22} height={2.4} rx={0.8} fill={color} />
      <Rect x={13} y={5.5} width={2} height={4} fill={color} />
      <Rect x={5.4} y={5} width={2.8} height={20} rx={0.6} fill={color} />
      <Rect x={19.8} y={5} width={2.8} height={20} rx={0.6} fill={color} />
    </Svg>
  );
}

export default Torii;
