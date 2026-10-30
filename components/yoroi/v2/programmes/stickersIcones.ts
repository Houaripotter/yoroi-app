/**
 * Les stickers des pages Programmes (30 octobre 2026, Houari : « pas d'icônes, des stickers partout »).
 * Chaque icône décorative (calendrier, chrono, haltère, études...) a son sticker existant de
 * assets/avatars/app/stickers (components/yoroi/v2/stickers.ts) : aucune image nouvelle.
 * Les icônes de commande (flèches, croix, plus, coche, étoile des favoris) restent des icônes.
 * Une icône sans sticker ici garde son dessin.
 */
import type { IconName } from '@/components/yoroi/v2/seances/Icon';
import type { NomSticker } from '@/components/yoroi/v2/stickers';

export const STICKER_DE_L_ICONE: Partial<Record<IconName, NomSticker>> = {
  calendar: 'calendrier',
  clock: 'chrono',
  timer: 'chrono',
  book: 'recherche',
  target: 'objectifs',
  dumbbell: 'musculation',
  glove: 'gants',
  steps: 'cardio_zone2',
  moon: 'sommeil',
  repeat: 'repeter',
  chart: 'bilan',
  gauge: 'bilan',
  scale: 'balance',
  body: 'corps',
  flame: 'flamme',
  trophy: 'trophee',
  bolt: 'force_eclair',
  heart: 'coeur',
  tape: 'metre_ruban',
};

export function stickerDeLIcone(icone: IconName | undefined | null): NomSticker | null {
  return icone ? STICKER_DE_L_ICONE[icone] ?? null : null;
}
