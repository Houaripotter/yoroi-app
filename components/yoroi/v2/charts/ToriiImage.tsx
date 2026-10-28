/**
 * Le vrai torii (vague 34) : l'illustration rouge et noire des ornements (assets/avatars/app/ornements/torii.webp),
 * recadree sur son contenu dans torii_courbe.webp (rapport 1,15). Remplace le petit dessin vectoriel sur la courbe
 * de poids, sa pastille et le sentier. Cap atteint : un halo dore derriere l'illustration, sans la recolorer.
 */
import React from 'react';
import { Image, View } from 'react-native';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';
import { useIllustrations } from '@/components/yoroi/v2/stickers';
import { paletteSombre } from '@/components/yoroi/livePalette';

export const TORII_IMG = require('@/assets/avatars/app/ornements/torii_courbe.webp');
/**
 * 28 octobre 2026 soir : le meme torii en gris doux (bleu gris, contour blanc garde), pour un objectif pas encore atteint
 * (bout du chemin de pierres, apercu sans cap). Tire des deux illustrations par desaturation, rien n'est redessine.
 */
export const TORII_GRIS = {
  stickers: require('@/assets/avatars/app/stickers/torii_courbe_gris.webp'),
  encre: require('@/assets/avatars/app/ornements/torii_courbe_gris.webp'),
};
/** largeur sur hauteur de l'illustration recadree */
export const TORII_RATIO = 192 / 167;

let seq = 0;

/** Le torii en image, de largeur donnee ; halo dore quand le cap est atteint */
export function ToriiImage({ width = 32, halo = false, eteint = false }: { width?: number; halo?: boolean; eteint?: boolean }) {
  const h = Math.round((width / TORII_RATIO) * 10) / 10;
  // 27 octobre 2026 : le petit torii sticker des courbes, ou celui d'avant (reglage Illustrations)
  const illus = useIllustrations();
  const id = React.useRef(`yth${++seq}`).current;
  const r = width * 0.95;
  return (
    <View style={{ width, height: h }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {halo ? (
        <Svg pointerEvents="none" width={r * 2} height={r * 2} style={{ position: 'absolute', left: width / 2 - r, top: h * 0.55 - r }}>
          <Defs>
            <RadialGradient id={id} cx="50%" cy="50%" r="50%">
              <Stop offset="0" stopColor="#F2C14E" stopOpacity={0.75} />
              <Stop offset="0.55" stopColor="#E9B949" stopOpacity={0.32} />
              <Stop offset="1" stopColor="#E9B949" stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Circle cx={r} cy={r} r={r} fill={`url(#${id})`} />
        </Svg>
      ) : null}
      {/* en sombre, le torii gris passe a 55 % : son contour blanc ne doit pas le faire paraitre allume */}
      <Image source={eteint ? (illus.stickers ? TORII_GRIS.stickers : TORII_GRIS.encre) : illus.img('torii_courbe', TORII_IMG)} style={{ width, height: h, opacity: eteint && paletteSombre() ? 0.55 : 1 }} resizeMode="contain" fadeDuration={0} />
    </View>
  );
}

export default ToriiImage;
