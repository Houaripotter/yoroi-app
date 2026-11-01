/**
 * Libelles et stickers des niveaux « Ce que tu suis » et des moments de pesee (1er novembre 2026, AT et AU).
 */
import type { NiveauSuivi } from '@/lib/v2/mesures/niveauSuivi';
import type { MomentPesee } from '@/lib/v2/mesures/contextePesee';
import type { NomSticker } from '@/components/yoroi/v2/stickers';
import { traduire } from '@/lib/i18n/tr';

export const INFO_NIVEAU: Record<NiveauSuivi, { titre: string; pour: string; suit: string; sticker: NomSticker }> = {
  essentiel: { titre: 'Essentiel', pour: 'Pour débuter, sans prise de tête', suit: 'Poids et tendance, IMC, tour de taille, tour de taille sur taille, masse grasse si ta balance la donne', sticker: 'debuter' },
  sportif: { titre: 'Sportif', pour: 'Tu t’entraînes plusieurs fois par semaine', suit: 'L’essentiel, plus la composition détaillée, toutes les mensurations, le FFMI, la forme du matin et plusieurs pesées par jour', sticker: 'force' },
  athlete: { titre: 'Athlète', pour: 'Tu prépares une compétition ou tu suis tout', suit: 'Le niveau sportif, plus les plis cutanés, les biomarqueurs et les segments de ta balance', sticker: 'couronne' },
};

export function libelleNiveau(n: NiveauSuivi): string {
  return traduire(INFO_NIVEAU[n].titre);
}

export const LABEL_MOMENT: Record<MomentPesee, { label: string; sticker: NomSticker }> = {
  reveil: { label: 'Au réveil', sticker: 'soleil' },
  avant_seance: { label: 'Avant séance', sticker: 'musculation' },
  apres_seance: { label: 'Après séance', sticker: 'vague' },
  autre: { label: 'Autre moment', sticker: 'sablier' },
};

