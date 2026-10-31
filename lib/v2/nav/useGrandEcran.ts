/**
 * Mode grand ecran (30 octobre 2026) : les hooks. Regles et chiffres dans lib/v2/nav/grandEcran.ts.
 * Sur iPhone, useGrandEcran() vaut faux et useLargeurEcran() rend la largeur de la fenetre, comme avant :
 * rien ne change.
 * 31 octobre 2026 : grand ecran des 700 points (barre laterale compacte jusqu'a 1023, large ensuite). Tout se lit
 * avec useWindowDimensions : la rotation de l'iPad, le Split View et la fenetre du Mac sont suivis en direct.
 */
import { createContext, useContext } from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';
import { colonnesGrille, estBarreLarge, estGrandEcran, largeurCase, largeurPage, margePage } from './grandEcran';

/** En grand ecran, la « largeur d'ecran » vue par les cartes d'une colonne (sa largeur plus 32) ; sinon null */
export const LargeurEcranContext = createContext<number | null>(null);

/** Vrai a partir de 700 points de large (iPad, Split View, Mac) : barre laterale et pages en grille */
export function useGrandEcran(): boolean {
  const { width } = useWindowDimensions();
  return estGrandEcran(width);
}

/** 'telephone' sous 700 points, 'compact' de 700 a 1023 (barre de stickers), 'large' a partir de 1024 */
export function useModeEcran(): 'telephone' | 'compact' | 'large' {
  const { width } = useWindowDimensions();
  return !estGrandEcran(width) ? 'telephone' : estBarreLarge(width) ? 'large' : 'compact';
}

/**
 * La largeur d'ecran a utiliser pour dimensionner une carte : celle de la fenetre sur iPhone (comme avant),
 * celle donnee par sa colonne en grand ecran.
 */
export function useLargeurEcran(): number {
  const { width } = useWindowDimensions();
  const colonne = useContext(LargeurEcranContext);
  return colonne ?? width;
}

export type PageLargeInfo = {
  grand: boolean;
  largeur: number;
  marge: number;
  fenetre: number;
  /** le nombre de colonnes de la grille de la page (2, 3 ou 4) */
  colonnes: 2 | 3 | 4;
  /** la largeur d'une carte sur `span` colonnes */
  caseDe: (span?: number) => number;
};

/** La page en grand ecran : sa largeur utile, sa marge de chaque cote (avec ou sans la barre laterale), sa grille */
export function usePageLarge(avecBarre = true): PageLargeInfo {
  const { width } = useWindowDimensions();
  const grand = estGrandEcran(width);
  const largeur = grand ? largeurPage(width, avecBarre) : width - 32;
  const colonnes = colonnesGrille(largeur);
  return { grand, largeur, marge: grand ? margePage(width, avecBarre) : 16, fenetre: width, colonnes, caseDe: (span = 1) => (grand ? largeurCase(largeur, colonnes, span) : largeur) };
}

/**
 * Les feuilles et fenetres qui montent du bas : en grand ecran, une fenetre centree (560 points au plus, coins
 * arrondis partout, fond voile) au lieu d'une feuille sur toute la largeur. Sur iPhone, null : rien ne change.
 */
export function useFeuilleCentree(largeurMax = 560): { fond: ViewStyle; carte: ViewStyle } | null {
  const { width, height } = useWindowDimensions();
  if (!estGrandEcran(width)) return null;
  return {
    fond: { justifyContent: 'center', alignItems: 'center', padding: 24 },
    carte: { width: Math.min(largeurMax, width - 48), maxWidth: Math.min(largeurMax, width - 48), alignSelf: 'center', borderRadius: 30, maxHeight: Math.round(height * 0.84) },
  };
}
