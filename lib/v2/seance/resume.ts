/**
 * Reprise d'un brouillon : quel ecran ouvrir et comment le decrire.
 */
import { getSportName } from '@/lib/sports';
import type { SeanceDraft } from './model';
import { traduire } from '@/lib/i18n/tr';

export function draftRoute(d: SeanceDraft): string {
  return d.kind === 'muscu' ? '/seance/muscu' : d.kind === 'combat' ? '/seance/combat' : '/seance/cardio';
}

export function draftTitle(d: SeanceDraft): string {
  return d.label || getSportName(d.sport);
}

export function draftAgo(d: SeanceDraft): string {
  const min = Math.max(0, Math.round((Date.now() - d.startedAt) / 60000));
  if (min < 1) return traduire("à l'instant");
  if (min < 60) return traduire("il y a {0} min", min);
  const h = Math.floor(min / 60);
  return traduire("il y a {0} h{1}", h, min % 60 ? ` ${String(min % 60).padStart(2, '0')}` : '');
}
