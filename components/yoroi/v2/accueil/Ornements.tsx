/**
 * Ornements japonais dessines (vague 15) : ils remplacent toute ecriture japonaise visible.
 * - Embleme : cercle au pinceau (enso) avec un torii, pour les etats vides et le pied de page.
 * - SceauEtoile : le tampon rouge des records, une etoile dessinee dans le sceau.
 * - Torii : silhouette de portique, en decor discret sur les cartes sombres.
 * Aucun import du kit de l'accueil ici (le kit importe ce fichier).
 */
import React from 'react';
import { View } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import { Tampon } from '@/components/yoroi/v2/tampons/Tampon';
import { traduire } from '@/lib/i18n/tr';
import { useIllustrations } from '@/components/yoroi/v2/stickers';

/** Portique torii seul, dessine sur une grille 24 x 24 */
export function Torii({ size = 24, color = '#1D2029', opacity = 1 }: { size?: number; color?: string; opacity?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" opacity={opacity}>
      <Path d="M2.5 5.2 Q12 7.4 21.5 5.2 L21 7.6 Q12 9.2 3 7.6 Z" fill={color} />
      <Rect x={4.4} y={10} width={15.2} height={1.8} rx={0.6} fill={color} />
      <Rect x={6.2} y={7.6} width={1.9} height={14} rx={0.6} fill={color} />
      <Rect x={15.9} y={7.6} width={1.9} height={14} rx={0.6} fill={color} />
      <Rect x={11.1} y={8.4} width={1.8} height={2.2} fill={color} />
    </Svg>
  );
}

/** Enso au pinceau avec un torii au centre */
export function Embleme({ size = 56, color = '#2C4A84', ring = '#C59D45' }: { size?: number; color?: string; ring?: string }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 56 56" style={{ position: 'absolute' }}>
        <Path d="M40 8.5 C30 3.5 14 6 8.6 18.5 C3.6 30 9.6 45.5 23.5 48.6 C36 51.4 48 43.5 49.4 30.5 C50.2 23.5 47.4 17.6 43.6 13.6" stroke={ring} strokeWidth={4.2} fill="none" strokeLinecap="round" />
      </Svg>
      <Torii size={size * 0.5} color={color} />
    </View>
  );
}

/** Tampon des records (vague 28) : le sceau ancien de la collection. Une encre autre que le rouge (gris d'un record passe) teinte le tampon. */
export function SceauEtoile({ size = 28, color = '#B0282E', rotate = -8 }: { size?: number; color?: string; filled?: boolean; rotate?: number }) {
  const red = color.toUpperCase() === '#B0282E';
  const { stickers } = useIllustrations();
  const vif = red || color.toUpperCase() === '#EC7A70';
  // reglage Stickers : le sticker du record, droit ; un record passe (encre grise) reste en couleurs mais estompe
  if (stickers) {
    return <Tampon name="record" size={size} rotate={0} style={vif ? undefined : { opacity: 0.4 }} accessibilityLabel={traduire("Record")} />;
  }
  return <Tampon name="record" size={size} rotate={rotate} ink={red ? undefined : color} accessibilityLabel={traduire("Record")} />;
}
