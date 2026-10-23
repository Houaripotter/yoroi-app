/**
 * Illustrations de sport (WebP transparents) choisies selon le sport et le personnage.
 * Chaque sport de lib/sports.ts a une image : la sienne, celle de sa famille la plus proche,
 * ou en dernier recours une icone dessinee (lib/v2/seance/sportArt.ts).
 */
import type { ImageSourcePropType } from 'react-native';
import { pickSportArt } from '@/lib/v2/seance/sportArt';
import { firstSport } from './sessionData';

/** Cle d'illustration : un dossier de assets/avatars/app/sports (boxe, jjb, velo...) ou un id de sport */
type Art = string;

/** Le dossier (ou l'icone) retenu pour ce sport */
export function artKey(sport: string | undefined): Art {
  return pickSportArt(firstSport(sport), false).key;
}

export function sportArt(sport: string | undefined, gender: 'homme' | 'femme' | undefined, level: 1 | 2 | 3 = 1): ImageSourcePropType {
  return pickSportArt(firstSport(sport), gender === 'femme', level - 1).source;
}

export function artByKey(key: Art, gender: 'homme' | 'femme' | undefined, level: 1 | 2 | 3 = 1): ImageSourcePropType {
  return pickSportArt(key, gender === 'femme', level - 1).source;
}

export type { Art };
