/**
 * Illustration de n'importe quel sport : la sienne si elle existe, sinon celle de sa
 * famille la plus proche (sportArtMap.ts), et en dernier recours une icone dessinee.
 * Jamais de case vide.
 */
import type { ImageSourcePropType } from 'react-native';
import { SPORT_ART, SPORT_ICONS } from './sportArt.generated';
import { sportArtChoices } from './sportArtMap';

export type SportArtPick = {
  source: ImageSourcePropType;
  /** illustration d'une personne, ou icone ronde dessinee */
  kind: 'illustration' | 'icone';
  /** dossier retenu, ou @nom pour une icone (reutilisable tel quel avec pickSportArt) */
  key: string;
};

const LAST_RESORT: ImageSourcePropType = SPORT_ICONS.medaille ?? SPORT_ICONS[Object.keys(SPORT_ICONS)[0]];

/** Un id propre : premier sport d'une liste « jjb,musculation », sans espaces */
export function cleanSportId(sport: string | null | undefined): string {
  return String(sport ?? '').split(',')[0].trim();
}

function fromFolder(folder: string, femme: boolean, variant: number): ImageSourcePropType | null {
  const set = SPORT_ART[folder];
  if (!set) return null;
  const list = femme ? (set.f.length ? set.f : set.h) : set.h.length ? set.h : set.f;
  if (!list.length) return null;
  const i = ((Math.round(variant) % list.length) + list.length) % list.length;
  return list[i];
}

/** sport : id de lib/sports.ts (ou nom d'un dossier d'illustrations). variant : 0, 1, 2 */
export function pickSportArt(sport: string | null | undefined, femme: boolean, variant = 0): SportArtPick {
  const id = cleanSportId(sport);
  if (id.startsWith('@') && SPORT_ICONS[id.slice(1)]) return { source: SPORT_ICONS[id.slice(1)], kind: 'icone', key: id };
  const direct = id ? fromFolder(id, femme, variant) : null;
  if (direct) return { source: direct, kind: 'illustration', key: id };
  for (const choice of sportArtChoices(id)) {
    if (choice.startsWith('@')) {
      const icon = SPORT_ICONS[choice.slice(1)];
      if (icon) return { source: icon, kind: 'icone', key: choice };
      continue;
    }
    const img = fromFolder(choice, femme, variant);
    if (img) return { source: img, kind: 'illustration', key: choice };
  }
  return { source: LAST_RESORT, kind: 'icone', key: '@medaille' };
}

/** Vrai si le sport a une vraie illustration de personne (pas seulement une icone) */
export function hasSportIllustration(sport: string | null | undefined): boolean {
  return pickSportArt(sport, false).kind === 'illustration';
}
