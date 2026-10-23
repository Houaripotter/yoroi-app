/**
 * Style de la citation du jour (17 octobre 2026). Houari : « je veux pouvoir choisir parmi les trois dans la
 * personnalisation, et je préfère la C ». Trois traitements dessines pour YOROI (components/yoroi/v2/accueil/Grille.tsx,
 * CitationDuJour) :
 *   sceau   : la citation en indigo, filets indigo et un petit sceau carre de chaque cote
 *   takeda  : filets or, le losange de Takeda de chaque cote (la variante appliquee le 16 octobre)
 *   pinceau : la citation en capitales douces, un trait de pinceau de chaque cote (par defaut)
 * Personne n'avait encore de reglage : tout le monde part sur le pinceau, puis ton choix est garde.
 * Le meme style sert a la ligne de l'accueil et au grand titre de la feuille du conseil du jour.
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type StyleCitation = 'sceau' | 'takeda' | 'pinceau';

export const STYLES_CITATION: { id: StyleCitation; nom: string }[] = [
  { id: 'pinceau', nom: 'Trait de pinceau' },
  { id: 'takeda', nom: 'Losanges de Takeda' },
  { id: 'sceau', nom: 'Sceau indigo' },
];

export const STYLE_CITATION_DEFAUT: StyleCitation = 'pinceau';

export const CLE_STYLE_CITATION = 'yoroi.accueil.citation.style';
const EVENT = 'YOROI_STYLE_CITATION';

export function styleCitationPropre(v: unknown): StyleCitation {
  return v === 'sceau' || v === 'takeda' || v === 'pinceau' ? v : STYLE_CITATION_DEFAUT;
}

let memo: StyleCitation | null = null;

export async function lireStyleCitation(): Promise<StyleCitation> {
  if (memo) return memo;
  try {
    memo = styleCitationPropre(await AsyncStorage.getItem(CLE_STYLE_CITATION));
  } catch {
    memo = STYLE_CITATION_DEFAUT;
  }
  return memo;
}

export async function ecrireStyleCitation(s: StyleCitation): Promise<void> {
  memo = styleCitationPropre(s);
  DeviceEventEmitter.emit(EVENT, memo);
  try {
    await AsyncStorage.setItem(CLE_STYLE_CITATION, memo);
  } catch {
    // le choix reste valable pour la session
  }
}

export function useStyleCitation(): { style: StyleCitation; changer: (s: StyleCitation) => void } {
  const [style, setStyle] = useState<StyleCitation>(memo ?? STYLE_CITATION_DEFAUT);
  useEffect(() => {
    let alive = true;
    lireStyleCitation().then((s) => alive && setStyle(s));
    const sub = DeviceEventEmitter.addListener(EVENT, (s: StyleCitation) => setStyle(s));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  const changer = useCallback((s: StyleCitation) => {
    setStyle(styleCitationPropre(s));
    ecrireStyleCitation(s);
  }, []);
  return { style, changer };
}
