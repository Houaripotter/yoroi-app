/**
 * Mode grand ecran (30 octobre 2026) : les hooks. Regles et chiffres dans lib/v2/nav/grandEcran.ts.
 * Sur iPhone, useGrandEcran() vaut faux et useLargeurEcran() rend la largeur de la fenetre, comme avant :
 * rien ne change.
 */
import { createContext, useContext } from 'react';
import { useWindowDimensions } from 'react-native';
import { estGrandEcran, largeurPage, margePage } from './grandEcran';

/** En grand ecran, la « largeur d'ecran » vue par les cartes d'une colonne (sa largeur plus 32) ; sinon null */
export const LargeurEcranContext = createContext<number | null>(null);

/** Vrai a partir de 1024 points de large (Mac en grande fenetre, iPad en paysage) */
export function useGrandEcran(): boolean {
  const { width } = useWindowDimensions();
  return estGrandEcran(width);
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

/** La page en grand ecran : sa largeur utile et sa marge de chaque cote (avec ou sans la barre laterale) */
export function usePageLarge(avecBarre = true): { grand: boolean; largeur: number; marge: number; fenetre: number } {
  const { width } = useWindowDimensions();
  const grand = estGrandEcran(width);
  return { grand, largeur: grand ? largeurPage(width, avecBarre) : width - 32, marge: grand ? margePage(width, avecBarre) : 16, fenetre: width };
}
