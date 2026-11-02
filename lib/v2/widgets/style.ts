/**
 * Style des widgets (13 octobre), choisi dans Reglages, Style des widgets (app/settings/widgets.tsx) :
 *  - D Scenes illustrees, par defaut depuis le 28 octobre 2026 (direction B choisie par Houari) : cartes pastel,
 *    ton poids en chemin de pierres jusqu'au torii, ta semaine en 7 lanternes, ta scene et ton personnage ;
 *  - A Nuit de lanternes (par defaut jusqu'au 28 octobre 2026, garde pour qui l'a choisi) : ta scene en fond, voile de nuit, or et lueur de lanterne ;
 *  - B Rouleau et encre : papier washi, courbe au pinceau, cachets vermillon ;
 *  - C Armure laquee : laque et filets dores, ton personnage.
 * Garde dans le telephone (AsyncStorage) et ecrit pour les widgets par le module natif (App Group sur iOS,
 * SharedPreferences sur Android), puis les widgets sont redessines. Sur iOS, chaque widget peut aussi avoir
 * son propre style (appui long, Modifier le widget) ; « Comme dans l'app » suit ce reglage.
 */
import { useEffect, useState } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ecrireStyleNatif, rechargerWidgetsNatif } from './natif';
import { traduire } from '@/lib/i18n/tr';

export type StyleWidgets = 'A' | 'B' | 'C' | 'D';

export const STYLES_WIDGETS: { id: StyleWidgets; nom: string; court: string; phrase: string }[] = [
  { id: 'D', nom: traduire('Scènes illustrées'), court: traduire('Scènes'), phrase: traduire('Pastel, ta scène et ton personnage') },
  { id: 'A', nom: traduire('Nuit de lanternes'), court: traduire('Lanternes'), phrase: traduire('Ta scène en fond, lueur de lanterne') },
  { id: 'B', nom: traduire('Rouleau et encre'), court: traduire('Rouleau'), phrase: traduire('Papier washi, pinceau et cachets') },
  { id: 'C', nom: traduire('Armure laquée'), court: traduire('Armure'), phrase: traduire('Laque, filets dorés et ton personnage') },
];

export const STYLE_WIDGETS_PAR_DEFAUT: StyleWidgets = 'D';
export const STYLE_WIDGETS_EVENT = 'YOROI_WIDGETS_STYLE_CHANGED';
const KEY = 'yoroi_widgets_style_v1';

let cache: StyleWidgets | null = null;

// un choix deja fait (A, B ou C) est garde ; rien de choisi : le style par defaut
const propre = (v: unknown): StyleWidgets => (v === 'A' || v === 'B' || v === 'C' || v === 'D' ? v : STYLE_WIDGETS_PAR_DEFAUT);

export async function getStyleWidgets(): Promise<StyleWidgets> {
  if (cache) return cache;
  try {
    cache = propre(await AsyncStorage.getItem(KEY));
  } catch {
    cache = STYLE_WIDGETS_PAR_DEFAUT;
  }
  return cache;
}

/** Garde le style, le passe aux widgets et les redessine */
export async function setStyleWidgets(style: StyleWidgets): Promise<StyleWidgets> {
  const s = propre(style);
  cache = s;
  DeviceEventEmitter.emit(STYLE_WIDGETS_EVENT, s);
  try {
    await AsyncStorage.setItem(KEY, s);
  } catch {
    // le choix reste pour cette session
  }
  if (await ecrireStyleNatif(s)) await rechargerWidgetsNatif();
  return s;
}

/** Le style choisi, tenu a jour quand il change */
export function useStyleWidgets(): StyleWidgets {
  const [style, setStyle] = useState<StyleWidgets>(cache ?? STYLE_WIDGETS_PAR_DEFAUT);
  useEffect(() => {
    let vivant = true;
    getStyleWidgets().then((s) => {
      if (vivant) setStyle(s);
    });
    const sub = DeviceEventEmitter.addListener(STYLE_WIDGETS_EVENT, (s: StyleWidgets) => setStyle(propre(s)));
    return () => {
      vivant = false;
      sub.remove();
    };
  }, []);
  return style;
}
