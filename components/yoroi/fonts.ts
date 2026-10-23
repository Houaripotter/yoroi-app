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

/** A passer a useFonts(yoroiFonts) dans app/_layout.tsx */
export const yoroiFonts = {
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
