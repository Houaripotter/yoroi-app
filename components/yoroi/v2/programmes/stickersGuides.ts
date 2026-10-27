/**
 * Le sticker de chaque conseil (27 octobre 2026, refonte Pastel des pages Programmes) : un autocollant
 * a la place de la pastille d'icone bleu nuit. Un conseil sans sticker prevu prend le carnet.
 */
import type { NomSticker } from '@/components/yoroi/v2/stickers';

const PAR_GUIDE: Record<string, NomSticker> = {
  'perdre-gras': 'flamme',
  grip: 'grip',
  sac: 'sac',
  force: 'force',
  muscle: 'muscle',
  recuperer: 'recuperation',
  stagner: 'refresh',
  'prendre-du-poids': 'balance',
  fessiers: 'fessiers',
  courir: 'course',
  'voir-resultats': 'trophee',
  'marche-inclinee': 'sport_marche',
  'force-delai': 'sablier',
};

export function stickerDuGuide(id: string): NomSticker {
  return PAR_GUIDE[id] ?? 'carnet';
}
