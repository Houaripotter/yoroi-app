/**
 * Style de la tuile « Ta santé aujourd'hui » (17 octobre 2026). Houari : « la couleur de fond, j'aime pas, ça ne
 * donne pas envie ». Trois traitements (components/yoroi/v2/accueil/SanteJour.tsx), au choix dans Personnaliser :
 *   anneaux  : (par defaut, 17 octobre nuit, « trouve-moi un meilleur design ») anneaux concentriques facon activite
 *              pour pas, calories et exercice, la valeur cle au centre ; les autres mesures en lignes fines a cote
 *   clair    : carte claire, 3 colonnes de cellules carrees identiques, tout centre (17 octobre soir :
 *              « le fond noir c'est moche, fais un effort que tout soit bien carré, aligné, centré »)
 *   cadran   : fond nuit facon cadran de montre, mesures en couleurs vives, anneaux vers tes objectifs
 *   nuit     : carte claire, en-tete en degrade indigo nuit avec tes trois premieres mesures en blanc
 *   mosaique : carte claire, chaque mesure dans une mini carte de sa couleur avec une micro jauge
 */
import { useCallback, useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { traduire } from '@/lib/i18n/tr';

export type StyleSante = 'anneaux' | 'clair' | 'cadran' | 'nuit' | 'mosaique';

export const STYLES_SANTE: { id: StyleSante; nom: string }[] = [
  { id: 'anneaux', nom: 'Anneaux' },
  { id: 'clair', nom: 'Clair' },
  { id: 'cadran', nom: 'Cadran' },
  { id: 'nuit', nom: traduire('Nuit') },
  { id: 'mosaique', nom: traduire('Mosaïque') },
];

/**
 * Le Cadran par defaut n'etait jamais ecrit (seul un choix l'est) : sans choix enregistre, tout le monde passe au Clair.
 * Un Cadran choisi a la main reste le Cadran.
 */
export const STYLE_SANTE_DEFAUT: StyleSante = 'anneaux';
export const CLE_STYLE_SANTE = 'yoroi.accueil.sante.style';
const EVENT = 'YOROI_STYLE_SANTE';

export function styleSantePropre(v: unknown): StyleSante {
  return v === 'anneaux' || v === 'clair' || v === 'cadran' || v === 'nuit' || v === 'mosaique' ? v : STYLE_SANTE_DEFAUT;
}

let memo: StyleSante | null = null;

export async function lireStyleSante(): Promise<StyleSante> {
  if (memo) return memo;
  try {
    memo = styleSantePropre(await AsyncStorage.getItem(CLE_STYLE_SANTE));
  } catch {
    memo = STYLE_SANTE_DEFAUT;
  }
  return memo;
}

export function useStyleSante(): { style: StyleSante; changer: (s: StyleSante) => void } {
  const [style, setStyle] = useState<StyleSante>(memo ?? STYLE_SANTE_DEFAUT);
  useEffect(() => {
    let alive = true;
    lireStyleSante().then((s) => alive && setStyle(s));
    const sub = DeviceEventEmitter.addListener(EVENT, (s: StyleSante) => setStyle(s));
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  const changer = useCallback((s: StyleSante) => {
    memo = styleSantePropre(s);
    setStyle(memo);
    DeviceEventEmitter.emit(EVENT, memo);
    AsyncStorage.setItem(CLE_STYLE_SANTE, memo).catch(() => {});
  }, []);
  return { style, changer };
}
