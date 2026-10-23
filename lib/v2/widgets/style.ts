/**
 * Style des widgets (13 octobre), choisi dans Reglages, Style des widgets (app/settings/widgets.tsx) :
 *  - A Nuit de lanternes, par defaut : ta scene en fond, voile de nuit, or et lueur de lanterne ;
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

export type StyleWidgets = 'A' | 'B' | 'C';

export const STYLES_WIDGETS: { id: StyleWidgets; nom: string; court: string; phrase: string }[] = [
  { id: 'A', nom: 'Nuit de lanternes', court: 'Lanternes', phrase: 'Ta scène en fond, lueur de lanterne' },
  { id: 'B', nom: 'Rouleau et encre', court: 'Rouleau', phrase: 'Papier washi, pinceau et cachets' },
  { id: 'C', nom: 'Armure laquée', court: 'Armure', phrase: 'Laque, filets dorés et ton personnage' },
];

export const STYLE_WIDGETS_PAR_DEFAUT: StyleWidgets = 'A';
export const STYLE_WIDGETS_EVENT = 'YOROI_WIDGETS_STYLE_CHANGED';
const KEY = 'yoroi_widgets_style_v1';

let cache: StyleWidgets | null = null;

const propre = (v: unknown): StyleWidgets => (v === 'B' || v === 'C' ? v : 'A');

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
