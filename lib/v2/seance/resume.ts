/**
 * Reprise d'un brouillon : quel ecran ouvrir et comment le decrire.
 */
import { getSportName } from '@/lib/sports';
import type { SeanceDraft } from './model';

export function draftRoute(d: SeanceDraft): string {
  return d.kind === 'muscu' ? '/seance/muscu' : d.kind === 'combat' ? '/seance/combat' : '/seance/cardio';
}

export function draftTitle(d: SeanceDraft): string {
  return d.label || getSportName(d.sport);
}

export function draftAgo(d: SeanceDraft): string {
  const min = Math.max(0, Math.round((Date.now() - d.startedAt) / 60000));
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  return `il y a ${h} h${min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : ''}`;
}
