/**
 * Note de 1 a 5 de la fin de seance (colonne technique_rating), dite selon le sport (16 octobre 2026) :
 *  - combat : la technique du jour ;
 *  - musculation : l'execution des mouvements ;
 *  - les autres sports : les sensations.
 * Couleurs : l'echelle commune (lib/v2/intensite.ts) lue a l'envers, comme la forme :
 * 1 en braise, 2 en orange, 3 en or, 4 et 5 en vert. Jamais de rouge, toujours un mot a cote.
 */
import { paletteSombre } from '@/components/yoroi/livePalette';
import { intensite } from '@/lib/v2/intensite';
import type { SeanceKind } from './model';
import { seanceKindFor } from './sportVisuals';
import { traduire } from '@/lib/i18n/tr';

export type NoteSeance = {
  /** titre de la question dans la feuille de fin */
  titre: string;
  /** nom court, pour le detail d'une seance (« Technique », « Exécution », « Sensations ») */
  nom: string;
  /** un mot par niveau, de 1 a 5 */
  mots: readonly [string, string, string, string, string];
};

const NOTES: Record<SeanceKind, NoteSeance> = {
  combat: { titre: traduire('Ta technique aujourd’hui'), nom: traduire('Technique'), mots: ['À revoir', 'Moyenne', 'Correcte', 'Propre', 'Au top'] },
  muscu: { titre: traduire('L’exécution de tes mouvements'), nom: traduire('Exécution'), mots: ['À revoir', 'Moyenne', 'Correcte', 'Propre', 'Parfaite'] },
  cardio: { titre: traduire('Tes sensations aujourd’hui'), nom: 'Sensations', mots: ['Difficiles', 'Moyennes', 'Correctes', 'Bonnes', 'Excellentes'] },
};

export function noteSeance(sport: string | undefined | null): NoteSeance {
  const first = (sport ?? '').split(',')[0].trim();
  return NOTES[first ? seanceKindFor(first) : 'cardio'];
}

export type CouleurNote = { fill: string; onFill: string; text: string; tint: string };

/** Couleur du niveau n (1 a 5) : de la braise au vert */
export function couleurNote(n: number): CouleurNote {
  const k = Math.max(1, Math.min(5, Math.round(n || 1)));
  const niveau = [5, 4, 3, 2, 2][k - 1];
  const i = intensite(niveau);
  if (k === 5) {
    // le vert le plus profond pour « au top » : distinct du 4
    const sombre = paletteSombre();
    return { fill: sombre ? i.text : '#17704A', onFill: sombre ? '#1D2029' : '#FFFFFF', text: i.text, tint: i.tint };
  }
  return { fill: i.fill, onFill: i.onFill, text: i.text, tint: i.tint };
}
