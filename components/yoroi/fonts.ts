/**
 * Polices YOROI. Noms de familles configurables ici uniquement.
 * Si une police n'est pas chargee (useFonts pas encore branche), on retombe
 * automatiquement sur la police systeme avec la graisse equivalente.
 */
import { isLoaded } from 'expo-font';
import type { TextStyle } from 'react-native';
import type { FontWeightKey } from './tokens';

export const fontFamilies: Record<FontWeightKey | 'kanji', string> = {
  medium: 'Archivo_500Medium',
  bold: 'Archivo_700Bold',
  extraBold: 'Archivo_800ExtraBold',
  black: 'Archivo_900Black',
  kanji: 'ShipporiMincho_800ExtraBold',
};

/**
 * 31 octobre 2026 (cartes de partage v2) : trois polices des cartes, sous licence SIL Open Font License 1.1
 * (assets/fonts/OFL_Anton.txt, OFL_InstrumentSerif.txt, OFL_Archivo.txt). Archivo Condensed Black est
 * l'instance statique (largeur 62, graisse 900) de la police variable Archivo, pour les chiffres geants.
 */
export const policesCartes = {
  anton: 'Anton_400Regular',
  serif: 'InstrumentSerif_400Italic',
  condense: 'ArchivoCondensed_900Black',
} as const;
export type PoliceCarte = keyof typeof policesCartes;

/** A passer a useFonts(yoroiFonts) dans app/_layout.tsx */
export const yoroiFonts = {
  [policesCartes.anton]: require('../../assets/fonts/Anton_400Regular.ttf'),
  [policesCartes.serif]: require('../../assets/fonts/InstrumentSerif_400Italic.ttf'),
  [policesCartes.condense]: require('../../assets/fonts/ArchivoCondensed_900Black.ttf'),
  [fontFamilies.medium]: require('../../assets/fonts/Archivo_500Medium.ttf'),
  [fontFamilies.bold]: require('../../assets/fonts/Archivo_700Bold.ttf'),
  [fontFamilies.extraBold]: require('../../assets/fonts/Archivo_800ExtraBold.ttf'),
  [fontFamilies.black]: require('../../assets/fonts/Archivo_900Black.ttf'),
  [fontFamilies.kanji]: require('../../assets/fonts/ShipporiMincho_800ExtraBold.ttf'),
};

const systemWeights: Record<FontWeightKey | 'kanji', TextStyle['fontWeight']> = {
  medium: '500',
  bold: '700',
  extraBold: '800',
  black: '900',
  kanji: '800',
};

function safeIsLoaded(family: string): boolean {
  try {
    return isLoaded(family);
  } catch {
    return false;
  }
}

/** Style de police pour une graisse logique, avec repli systeme */
export function fontStyle(weight: FontWeightKey | 'kanji'): TextStyle {
  const family = fontFamilies[weight];
  if (safeIsLoaded(family)) {
    return { fontFamily: family };
  }
  return { fontWeight: systemWeights[weight] };
}

/** Police d'une carte de partage, avec repli : Archivo Black pour Anton et le condense, une serif italique systeme */
export function policeCarte(nom: PoliceCarte): TextStyle {
  const family = policesCartes[nom];
  if (safeIsLoaded(family)) return { fontFamily: family };
  if (nom === 'serif') return { fontFamily: 'Georgia', fontStyle: 'italic' };
  return fontStyle('black');
}
